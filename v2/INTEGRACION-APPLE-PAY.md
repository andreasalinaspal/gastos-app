# Que cada compra con Apple Pay entre sola a Qori

Esta guía es para configurar, **una sola vez**, que cada vez que pagues con Apple Pay
la compra aparezca en Qori esperando que la confirmes. No necesitas saber programar:
son cuatro pasos, y cada uno dice exactamente dónde hacer clic.

## Cómo funciona (en dos líneas)

Tu iPhone, cada vez que pagas con Apple Pay, le avisa a Qori: monto, comercio, fecha
y con qué tarjeta pagaste. Qori guarda esa compra en una **bandeja de pendientes**.
Cuando abres la app ves "Tienes N gastos por confirmar": eliges la categoría, confirmas
y recién ahí entra a tus gastos. Nada se registra a tus espaldas.

---

## Paso 1 — Crear la tabla `inbox` en Supabase

Entra a [supabase.com](https://supabase.com), abre tu proyecto de Qori, y en el menú
de la izquierda anda a **SQL Editor** → **New query**. Pega todo esto y toca **Run**:

```sql
-- La bandeja: aquí caen las compras de Apple Pay antes de que las confirmes.
create table public.inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,
  merchant text,
  card_hint text,
  occurred_at timestamptz not null default now(),
  source text not null default 'apple-pay',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Índice para que la app encuentre rápido tus pendientes.
create index inbox_user_pending_idx on public.inbox (user_id, status);

-- Candado encendido: sin políticas, nadie ve nada.
alter table public.inbox enable row level security;

-- Tú puedes LEER solo tus propias filas.
create policy "inbox: leo lo mio"
  on public.inbox for select
  using (auth.uid() = user_id);

-- Tú puedes ACTUALIZAR solo tus propias filas (marcarlas confirmadas o descartadas).
create policy "inbox: actualizo lo mio"
  on public.inbox for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tú puedes BORRAR solo tus propias filas.
create policy "inbox: borro lo mio"
  on public.inbox for delete
  using (auth.uid() = user_id);
```

Fíjate que **no hay política de `insert`**. Eso es a propósito: la única que escribe
en la bandeja es la API de Qori, que usa la llave *service role* y por diseño de
Supabase **salta RLS**. Así nadie más puede meterte gastos falsos desde el navegador.

Cuando termine, deberías ver "Success. No rows returned".

---

## Paso 2 — Generar tu token secreto

El token es la contraseña que usa tu iPhone para probarle a Qori que la compra viene
de ti. Abre la app **Terminal** en tu Mac, pega esto y dale Enter:

```bash
openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48
```

Te va a escupir algo como `k3Jf9pQmX2vB8nL4tR7wY1zC6hD0sA5gE...`. **Cópialo y guárdalo**
en tus notas seguras o en tu gestor de contraseñas, porque lo vas a necesitar dos veces
(en el Paso 3 y en el Paso 4).

> ⚠️ **Este token es secreto.** Nunca va dentro del código ni se sube a GitHub.
> Vive solo en dos sitios: las variables de entorno de Vercel y tu atajo del iPhone.
> Si alguna vez crees que se filtró, genera otro y cámbialo en los dos lugares.

---

## Paso 3 — Poner las variables de entorno en Vercel

Entra a [vercel.com](https://vercel.com), abre el proyecto de Qori, y anda a
**Settings** → **Environment Variables**. Agrega estas tres, marcando los tres
entornos (Production, Preview, Development) en cada una:

| Nombre | Qué valor va | De dónde lo saco |
|---|---|---|
| `QORI_INGEST_TOKEN` | El token que generaste | El del Paso 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | La llave *service role* de Supabase | Supabase → **Settings** → **API Keys** → fila **`service_role`** → botón de revelar y copiar |
| `QORI_INGEST_USER_ID` | Tu identificador de usuaria (un UUID) | Supabase → **Authentication** → **Users** → clic en tu correo → copia el campo **User UID** |

> ⚠️ La llave `service_role` es la llave maestra de tu base de datos: puede leer y
> escribir todo. Trátala igual que el token: nunca en el código, nunca en un chat,
> nunca en GitHub. Solo en Vercel.

Después de guardarlas, Vercel necesita volver a desplegar para que la API las vea:
anda a **Deployments**, abre el último y toca **Redeploy**.

---

## Paso 4 — Armar el atajo en el iPhone

Abre la app **Atajos** (la del ícono de dos cuadrados de colores).

1. Toca la pestaña **Automatización** (abajo, en el medio).
2. Toca **+** arriba a la derecha → **Crear automatización personal**.
   (Si es tu primera automatización, verás directamente el botón **Crear automatización personal**.)
3. En la lista de disparadores, baja hasta **Transacción** y tócalo.
4. Elige la tarjeta: puedes dejar **Cualquier tarjeta** para que capture todos tus
   pagos, o tocar una tarjeta específica. Toca **Siguiente**.
5. Toca **Nueva acción vacía** y, en el buscador, escribe **Obtener contenido de URL**.
   Tócala.
6. En **URL** pega exactamente:

   ```
   https://gastos-app-hazel.vercel.app/api/ingest
   ```

7. Toca la flechita **▸** que dice **Mostrar más** para abrir las opciones.
8. En **Método**, cambia `GET` por **POST**.
9. En **Encabezados**, toca **Añadir nuevo campo** y agrega estos dos:

   | Campo (Key) | Valor (Text) |
   |---|---|
   | `Authorization` | `Bearer TU_TOKEN_AQUI` |
   | `Content-Type` | `application/json` |

   Reemplaza `TU_TOKEN_AQUI` por el token del Paso 2. Ojo: la palabra `Bearer`,
   **un espacio**, y luego el token pegado. Sin comillas.

10. En **Cuerpo de la solicitud**, elige **JSON**. Vas a agregar cuatro campos con
    **Añadir nuevo campo** → tipo **Texto** cada uno:

    | Clave | Valor |
    |---|---|
    | `amount` | la variable mágica **Monto** |
    | `merchant` | la variable mágica **Comerciante** |
    | `occurredAt` | la variable mágica **Fecha** |
    | `cardHint` | la variable mágica **Tarjeta** |

    Para poner una variable mágica: toca el campo del valor, aparece una barrita
    arriba del teclado con **Variable mágica** (el ícono de la varita). Tócala y
    elige, de la sección **Transacción**, el dato que corresponde (Monto,
    Comerciante, Fecha, Tarjeta). **No escribas los nombres a mano** — tienen que
    quedar como una burbujita azul, no como texto.

11. Vuelve atrás y, en la pantalla de la automatización, **desactiva "Preguntar
    antes de ejecutar"**. Si no lo haces, te va a pedir permiso en cada compra.
    Confirma con **No preguntar**.
12. Toca **Listo**.

---

## Probarlo

### Desde el Mac, con `curl`

Abre Terminal, reemplaza `TU_TOKEN_AQUI` por tu token y pega esto:

```bash
curl -i -X POST https://gastos-app-hazel.vercel.app/api/ingest \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"amount":"S/ 25,50","merchant":"Prueba Starbucks","occurredAt":"2026-09-27T15:00:00Z","cardHint":"Visa BCP ••1234"}'
```

Si todo está bien, la primera línea dice `HTTP/2 201` y al final ves `{"ok":true}`.
Abre Qori en el celular y deberías ver el banner **"1 gasto por confirmar"**.

### Qué significa cada respuesta si algo falla

| Respuesta | Qué pasó | Qué hacer |
|---|---|---|
| `201` + `{"ok":true}` | Todo bien, ya está en la bandeja | Nada, abre la app |
| `401 No autorizado` | El token no coincide | Revisa que el encabezado sea `Bearer ` + tu token, y que en Vercel esté el mismo valor |
| `400` con un motivo | El monto o la fecha vinieron mal | El motivo lo dice: "Falta el monto", "La fecha no es válida"… |
| `405 Método no permitido` | Se envió como GET | En el atajo, cambia el Método a POST |
| `500 La ingesta no está configurada` | Falta una variable en Vercel | Vuelve al Paso 3 y verifica las tres; luego **Redeploy** |
| `500 No se pudo guardar la transacción` | La tabla `inbox` no existe o Supabase falló | Vuelve al Paso 1; revisa los logs en Vercel → **Logs** |

### Desde el iPhone

Haz una compra chiquita con Apple Pay (un café, un pasaje). A los pocos segundos,
abre Qori: el banner de pendientes debería estar ahí.

---

## Preguntas que te vas a hacer

**¿Y si no tengo internet cuando pago?** El atajo falla en silencio y esa compra no
llega a la bandeja. Regístrala a mano como siempre.

**¿Y si Qori no reconoce la tarjeta?** La app intenta emparejar automáticamente el
nombre que reporta Apple Pay con tus medios de pago de Qori (por nombre o por los
últimos 4 dígitos). Si no acierta, en la pantalla de confirmación puedes cambiar el
medio de pago con un toque antes de registrar. Tip: si nombras tu tarjeta en Qori
parecido a como la ve Apple Pay (por ejemplo "Visa BCP"), el emparejado acierta solo.

**¿Se registra algo sin que yo lo vea?** No. Todo lo que llega queda en la bandeja
como *pendiente*. Nada entra a tus gastos hasta que tú toques **Registrar**.

**¿Qué pasa si descarto una?** Queda marcada como descartada y ya no vuelve a
aparecer. No se borra de la base, pero tampoco cuenta en ningún lado.
