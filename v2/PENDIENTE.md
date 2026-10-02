# Dónde quedamos — 1 oct 2026

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

### Correo — FUNCIONANDO de punta a punta
- Filtro de Gmail (etiqueta `Qori`), script de Apps Script y temporizador cada 5 minutos:
  todo configurado por ella el 1 oct. El token vive en las propiedades del proyecto, no
  en el código.
- **Primera prueba real OK**: una "Constancia de Pago Plin" devolvió `201 registrado:true`,
  salió la franja en Inicio y la confirmó. Falta ver una COMPRA entrando sola.
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

### 2. Correos que faltan
- **Interbank · pago de tarjeta de crédito** — solo el asunto. Ahora mismo lo ignoro
  por asuntos adivinados (`"pago de tu tarjeta"`, `"pago de tarjeta"`). Si el real es
  distinto, caería en "no-reconocido": inofensivo, pero no acierta.
- **BCP, BBVA, Ripley** — un consumo con tarjeta de cada uno (remitente, asunto, cuerpo).

### 3. El selector S/ | US$ de la bandeja
La bandeja se vio funcionando a clics con el Plin (en soles). El selector de moneda
sigue sin probarse: hace falta que entre un pendiente en dólares.

---

## Decisiones tomadas (para no rediscutirlas)

- **El análisis vive en el servidor, no en el script de Gmail.** Los bancos cambian
  plantillas; así el arreglo se despliega desde el repo y ella no toca nada.
- **Ante la duda, NO se registra.** Lo que no se entiende queda fuera. Un gasto que
  falta se nota y se anota a mano; uno inventado envenena las cuentas en silencio.
- **El gasto es cuando SALE la plata** (F33–F36). P1 quedó derogado: ella lo rebatió y
  tenía razón. Una compra con tarjeta cuenta el día que la paga, no el día que la compra,
  y los pagos tienen su propia categoría 💳 Pago de tarjeta.
- **Los correos de pago de tarjeta se siguen ignorando**, pero por otra razón: un abono
  hay que amarrarlo a UNA tarjeta y el correo no siempre dice a cuál. Pendiente de ver.
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
