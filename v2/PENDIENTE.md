# Dónde quedamos — 4 oct 2026

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
- `lib/correoBancos.js` — lectores de **Interbank, BBVA, BCP, Yape y Banco Ripley**, con
  56 pruebas sobre correos reales. El filtro de Gmail ya tiene los cinco remitentes.
- Interbank lee: consumo, Constancia de Pago Plin y **Constancia de transferencia** (F47).
- Cuatro formatos distintos: Interbank y BBVA usan salto de línea o `Etiqueta: valor`;
  **BCP usa un solo espacio en la misma línea** (`campoBCP`); Yape mezcla los dos;
  **Ripley no tiene etiquetas** — frase corrida leída con regex, y su hora viene en UTC.
- **Yape NO manda correo por los yapeos normales** (persona a persona ni QR en
  comercios). Solo pagos de servicio y Yape Promos. Eso se anota a mano, siempre.
- Cada asunto nuevo del banco hay que enseñarlo: lo que no reconoce NO se registra.
- BBVA (F37): plantilla distinta — moneda en campo propio (`PEN`/`USD`), monto pelado, hora 24h.
  Sin moneda reconocible NO se registra. El filtro de Gmail ya tiene los dos remitentes.
- `/api/ingest-correo` — recibe el correo crudo y decide.
- Protección contra duplicados: por id del mensaje y entre canales (Apple Pay vs correo, ventana de 15 min, misma moneda).
- Moneda de punta a punta: API → bandeja → pantalla de confirmación → gasto.

---

## ⏳ Lo que falta

### 1. Probar Apple Pay con una compra real
El token del atajo ya se actualizó (1 oct). Falta la compra.
Hacer una compra chiquita y ver si llega el banner **"1 gasto por confirmar"**.
Si no llega, diagnosticar en este orden:
1. ¿Llegó la notificación de la automatización? → si no, el disparador está apagado.
2. ¿Llegó pero no hay banner? → token mal pegado (espacio de más, o falta `Bearer `).
3. ¿Hay banner pero sin comercio? → las variables quedaron como texto, no como burbujita azul.

### 2. Suscripciones (F43-F46)
Ella lleva su propia lista en Config → Suscripciones: agregar/editar/eliminar, con
monto, moneda, cadencia y día de cobro. La detección automática quedó como ayuda
(propone lo que ve repetido en los gastos). "Por cancelar" avisa lo que decidió dar
de baja y todavía no da, con los días que faltan.
Cargadas sus 12 activas y 3 avisos (HBO Max, Paramount+, Claude Max→Pro).

### 3. Correos que faltan
- **Interbank · pago de tarjeta de crédito** — solo el asunto. Ahora mismo lo ignoro
  por asuntos adivinados. Si el real es distinto, cae en "no-reconocido": inofensivo.
- **Estados de cuenta**: el de Ripley viene en PDF cifrado y no se puede leer. El mínimo,
  el pago del mes y la fecha de cada tarjeta se copian a mano (campos de Medios de pago).

### 4. Que la bandeja sepa crear PAGOS de tarjeta, no solo gastos
El correo de BBVA "Constancia Pago de Tarjetas propias" trae todo lo necesario:
importe, fecha y los últimos 4 (`Número de tarjeta • 1849`). Hoy se reconoce y se
descarta, porque un pago tiene que hacer DOS cosas —contar como gasto y bajar el
saldo de esa tarjeta— y la bandeja solo sabe crear gastos sueltos. Meterlo como
gasto a secas dejaría la deuda intacta, y si después lo anota desde la tarjeta
quedaría contado dos veces.
Trabajo: tipo nuevo en `inbox`, variante en la pantalla de confirmación, y emparejar
los 4 dígitos con una tarjeta de `paymentMethods`.

### 5. El selector S/ | US$ de la bandeja
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

### 6. Datos de ella que faltan
- Saldo actual + línea de las otras tres tarjetas (la Amex BBVA ••1849 ya cuadra con su banco).
- Ingresos fijos de setiembre con sus fechas.

---

## Formatos reales de Interbank (verificados)

- Remitente único para todo: `servicioalcliente@netinterbank.com.pe`
- El tipo se decide por el **asunto**.
- Soles: `Monto: S/. 38.00` — con punto. **Ese punto rompía el lector**; ya está arreglado.
- Dólares: `Monto: $ 4.86`
- La tarjeta sale del asunto: `"...realizaste un consumo con tu Tarjeta Amex"`.
- Plin trae `Código de operación`, que sirve de id contra duplicados.

## Formato real de BBVA (verificado)

- Remitente: `procesos@bbva.com.pe`
- Consumo — asunto: `Has realizado un consumo con tu tarjeta BBVA`
  Campos en líneas separadas: `Comercio:` / `Monto:` (sin símbolo) / `Moneda:` (`PEN`)
  / `Fecha:` (`29/09/2026`) / `Hora:` (`19:09:47`, 24h).
  La tarjeta al final: `Este se cargará a tu tarjeta terminada en *1849`.
- Pago de tarjeta — asunto: `BBVA - Constancia Pago de Tarjetas propias`
  Trae `Importe transferido S/ 73.87`, `Número de operación` y `Número de tarjeta • 1849`.
