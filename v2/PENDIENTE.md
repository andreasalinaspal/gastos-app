# Dónde quedamos — 29 set 2026

Registro automático de gastos, por dos vías: Apple Pay y correos del banco.

---

## ✅ Lo que ya está hecho y publicado

### Infraestructura (lista, no hay que volver a tocarla)
- Tabla `inbox` en Supabase, con RLS verificado: nadie puede inyectar gastos falsos.
- Las tres variables en Vercel (`QORI_INGEST_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `QORI_INGEST_USER_ID`). Comprobado: el endpoint responde `401` a un token inválido.
- Migraciones aplicadas: `external_id` (con índice único) y `currency`.

### Apple Pay
- Automatización de Atajos armada sobre el disparador **Wallet** ("cuando se use sin contacto"), reutilizando la que había quedado de la app anterior.
- Configurada con: cualquier tarjeta, notificar al ejecutar, sin confirmar antes.
- **Nunca se probó con una compra real.**

### Correo
- `lib/correoBancos.js` — lector de Interbank, con 18 pruebas sobre correos reales.
- `/api/ingest-correo` — recibe el correo crudo y decide.
- Protección contra duplicados: por id del mensaje y entre canales (Apple Pay vs correo, ventana de 15 min, misma moneda).
- Moneda de punta a punta: API → bandeja → pantalla de confirmación → gasto.

---

## ⏳ Lo que falta

### 1. Probar Apple Pay con una compra real
Hacer una compra chiquita y ver si llega el banner **"1 gasto por confirmar"**.
Si no llega, diagnosticar en este orden:
1. ¿Llegó la notificación de la automatización? → si no, el disparador está apagado.
2. ¿Llegó pero no hay banner? → token mal pegado (espacio de más, o falta `Bearer `).
3. ¿Hay banner pero sin comercio? → las variables quedaron como texto, no como burbujita azul.

### 2. El script de Gmail
Falta escribirlo. Son ~20 líneas de Google Apps Script que corren en la cuenta de ella:
lee los correos con la etiqueta que ponga un filtro, los manda a `/api/ingest-correo`,
y los marca como leídos. El análisis ya está del lado del servidor, así que el script
no hay que volver a tocarlo cuando un banco cambie su plantilla.

### 3. Correos que faltan
- **Interbank · pago de tarjeta de crédito** — solo el asunto. Ahora mismo lo ignoro
  por asuntos adivinados (`"pago de tu tarjeta"`, `"pago de tarjeta"`). Si el real es
  distinto, caería en "no-reconocido": inofensivo, pero no acierta.
- **BCP, BBVA, Ripley** — un consumo con tarjeta de cada uno (remitente, asunto, cuerpo).

### 4. Verificación pendiente
La pantalla de confirmación con el selector **S/ | US$** está cubierta por pruebas
pero **no se ha visto funcionando a clics**: necesita un pendiente real en la bandeja.
Se verifica con el primer aviso que entre, venga de donde venga.

---

## Decisiones tomadas (para no rediscutirlas)

- **El análisis vive en el servidor, no en el script de Gmail.** Los bancos cambian
  plantillas; así el arreglo se despliega desde el repo y ella no toca nada.
- **Ante la duda, NO se registra.** Lo que no se entiende queda fuera. Un gasto que
  falta se nota y se anota a mano; uno inventado envenena las cuentas en silencio.
- **Pagar la tarjeta NO es un gasto** (P1). Se ignora a propósito: liquida compras ya
  registradas. Contarlo sería duplicar — el hábito que estamos dejando atrás.
- **Los Plin/abonos recibidos se ignoran.** Son ingresos, no gastos. Si más adelante
  se quieren registrar, van por el camino de ingresos (que ya maneja fecha y moneda).
- **Nada entra sin confirmación.** Todo cae en la bandeja y ella decide categoría y
  medio de pago antes de que sea un gasto.

## Formatos reales de Interbank (verificados)

- Remitente único para todo: `servicioalcliente@netinterbank.com.pe`
- El tipo se decide por el **asunto**.
- Soles: `Monto: S/. 38.00` — con punto. **Ese punto rompía el lector**; ya está arreglado.
- Dólares: `Monto: $ 4.86`
- La tarjeta sale del asunto: `"...realizaste un consumo con tu Tarjeta Amex"`.
- Plin trae `Código de operación`, que sirve de id contra duplicados.
