# Que los correos de tu banco entren solos a Qori

Configuración de una sola vez. Cuatro pasos, unos 15 minutos.

## Cómo funciona

Un **filtro de Gmail** marca los correos de tus bancos con la etiqueta `Qori`.
Un **script tuyo**, que corre en tu cuenta de Google, revisa cada 5 minutos si hay
alguno nuevo y lo manda a Qori. La app lo lee, entiende de qué banco es y cuánto
fue, y lo deja en la **bandeja de pendientes**. Tú confirmas y recién ahí es un gasto.

**Yo nunca toco tu correo.** El script es tuyo, corre bajo tu cuenta, y lo borras
cuando quieras.

---

## Paso 1 — El filtro de Gmail

En Gmail (desde la computadora), pega esto en el buscador de arriba:

```
from:(servicioalcliente@netinterbank.com.pe)
```

Dale a **Buscar**, y después al ícono de opciones (la flechita o el ⚙ a la derecha
del buscador) → **Crear filtro**.

Marca **"Aplicar la etiqueta"** → **Elegir etiqueta** → **Nueva etiqueta** → escribe
`Qori` → **Crear**.

Marca también **"Aplicar también a las conversaciones que cumplan…"** para que
agarre los correos que ya tienes. Dale a **Crear filtro**.

> Cuando sumemos BCP, BBVA y Ripley, editas ese mismo filtro y agregas sus
> remitentes separados por `OR`.

---

## Paso 2 — El script

1. Entra a [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Arriba a la izquierda, ponle de nombre **Qori**.
3. Borra todo lo que venga escrito y pega el contenido de `gmail-qori.gs`.
4. Guarda (💾).

---

## Paso 3 — Tu token

En el código, busca la función `guardarToken()` y reemplaza `PEGA_AQUI_TU_TOKEN`
por el token que generaste con `openssl` (el mismo de Vercel y del atajo).

Arriba, en el selector de funciones, elige **guardarToken** y dale **Ejecutar**.

Google te va a pedir permisos la primera vez: **Revisar permisos** → tu cuenta →
"Google no verificó esta aplicación" → **Configuración avanzada** → **Ir a Qori
(no seguro)** → **Permitir**.

> Ese aviso sale porque el script es tuyo y no está publicado en ningún lado.
> Es normal: le estás dando permiso a tu propio código.

**Cuando termine, borra el token del código** y vuelve a guardar. Queda guardado
aparte, en las propiedades del proyecto — ya no hace falta que esté escrito ahí.

---

## Paso 4 — Probar antes de soltarlo

En el selector de funciones elige **probar** → **Ejecutar**.

Abajo, en el registro de ejecución, vas a ver el correo que leyó y qué respondió Qori:

| Respuesta | Qué significa |
|---|---|
| `201 {"ok":true,"registrado":true,...}` | Entró a la bandeja. Ábre Qori y confírmalo. |
| `200 {"registrado":false,"motivo":"pagar la tarjeta no es un gasto..."}` | Lo entendió y lo ignoró a propósito. Correcto. |
| `200 {"registrado":false,"motivo":"asunto no reconocido"}` | No supo qué era. Pásame ese asunto. |
| `401` | El token no coincide. Revisa el Paso 3. |

Si te responde `201`, **prende el temporizador**: elige la función
**activarTemporizador** → **Ejecutar**. A partir de ahí trabaja solo cada 5 minutos.

---

## Preguntas que te vas a hacer

**¿Lee todos mis correos?** No. Solo los que tengan la etiqueta `Qori`, que la pone
tu filtro. Los demás ni los mira.

**¿Se puede colar algo que no sea un gasto?** El servidor ignora a propósito los
pagos de tarjeta, los Plin recibidos, los abonos y los estados de cuenta. Y lo que
no entiende, no lo registra. Además nada entra a tus gastos sin que lo confirmes.

**¿Y si hago una compra con Apple Pay y además me llega el correo?** Qori descarta
la segunda: si la misma cantidad llega por dos canales distintos con menos de 15
minutos de diferencia, se queda con la primera.

**¿Y si el banco cambia su plantilla?** Deja de reconocer esos correos y te van a
salir como "asunto no reconocido" en el registro. Me lo dices y lo arreglo del lado
del servidor — este script no se toca.

**¿Cómo lo apago?** En script.google.com → tu proyecto → ⏰ **Activadores** →
borra el que está. O borra el proyecto entero.
