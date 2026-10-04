// Lógica pura de la ingesta de transacciones (Atajos de iOS y avisos de correo).
//
// Vive aparte de la ruta /api/ingest a propósito: así se puede probar sin red,
// sin Supabase y sin Next. La ruta solo valida, guarda y responde.

const MAX_AMOUNT = 1000000; // más que eso es un error de formato, no una compra
const MAX_MERCHANT = 120;
const MAX_CARD_HINT = 120;
const MAX_EXTERNAL_ID = 200;

// F26: de dónde vino el aviso. Importa para dos cosas: mostrárselo a ella y no
// contar dos veces la misma compra cuando llega por los dos canales.
export const FUENTES = ["apple-pay", "correo"];
// F27: en qué moneda vino la compra. Los avisos de banco traen el símbolo
// pegado al monto ("S/ 25.50", "$ 4.86"), así que se deduce de ahí cuando quien
// llama no la manda explícita. Sin señal se asume soles, que es lo habitual.
export function monedaDeTexto(raw) {
  const t = String(raw === undefined || raw === null ? "" : raw).toUpperCase();
  if (/S\/|\bPEN\b|SOLES/.test(t)) return "PEN";
  if (/US\$|\bUSD\b|D[OÓ]LAR/.test(t)) return "USD";
  if (t.includes("$")) return "USD";
  return "PEN";
}

export const normalizaMoneda = (raw) => (String(raw === undefined || raw === null ? "" : raw).trim().toUpperCase() === "USD" ? "USD" : "PEN");

export const normalizaFuente = (raw) => {
  const v = String(raw === undefined || raw === null ? "" : raw).trim().toLowerCase();
  if (v === "correo" || v === "email" || v === "gmail") return "correo";
  return "apple-pay";
};

// "S/ 1,234.50" / "1.234,50" / "25,50" / "25.50" / 25.5 → 25.5
// Regla: el ÚLTIMO separador es el decimal si le siguen 1 o 2 dígitos; el resto
// son separadores de miles. Apple Pay puede mandar cualquiera de los dos estilos.
export function parseMoney(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  // F27: primero fuera el símbolo de moneda, con su punto y todo. Interbank
  // escribe "S/. 38.00", y si solo se filtran los caracteres válidos queda
  // ".38.00" — un separador suelto al inicio que no parsea. Cada compra en
  // soles se habría rechazado por eso.
  const sinMoneda = raw.replace(/(S\/\.?|US\$|\$|\bPEN\b|\bUSD\b|SOLES|D[OÓ]LARES?)/gi, " ");

  // Nos quedamos solo con dígitos, separadores y el signo menos inicial.
  const cleaned = sinMoneda.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const negative = cleaned.startsWith("-");
  // Un separador colgando al final es puntuación de la frase, no del número:
  // "por S/ 219.90," llegaba con la coma y 219.90 se leía como 21,990.
  const body = cleaned.replace(/-/g, "").replace(/[.,]+$/, "");
  if (!/\d/.test(body)) return null;
  // Un separador suelto sin dígitos alrededor no es un monto.
  if (!/^\d[\d.,]*$/.test(body)) return null;

  const lastDot = body.lastIndexOf(".");
  const lastComma = body.lastIndexOf(",");
  const lastSep = Math.max(lastDot, lastComma);

  let intPart = body;
  let decPart = "";
  if (lastSep !== -1) {
    const tail = body.slice(lastSep + 1);
    if (/^\d{1,2}$/.test(tail) && body.slice(0, lastSep).replace(/[.,]/g, "").length > 0) {
      intPart = body.slice(0, lastSep);
      decPart = tail;
    }
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (!intPart) return null;

  const n = Number(decPart ? intPart + "." + decPart : intPart);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const trimTo = (raw, max) => {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim().slice(0, max).trim();
};

/**
 * Valida y normaliza el cuerpo que manda el atajo de iOS.
 * → { ok: true, value: { amount, merchant, occurredAt, cardHint, source, externalId, currency } }
 * → { ok: false, error: "motivo en español" }
 */
export function normalizeTransaction(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Falta el cuerpo de la transacción" };
  }

  const rawAmount = body.amount !== undefined ? body.amount : body.monto;
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    return { ok: false, error: "Falta el monto" };
  }
  const amount = parseMoney(rawAmount);
  if (amount === null) return { ok: false, error: "El monto no es un número válido" };
  // Apple Pay puede reportar el cargo en negativo: lo tomamos como gasto.
  const abs = Math.abs(amount);
  if (abs <= 0) return { ok: false, error: "El monto debe ser mayor a 0" };
  if (abs > MAX_AMOUNT) return { ok: false, error: "El monto es demasiado grande" };

  const merchant = trimTo(body.merchant !== undefined ? body.merchant : body.comercio, MAX_MERCHANT) || "Compra";

  const rawDate = body.occurredAt !== undefined ? body.occurredAt : body.fecha;
  let occurredAt;
  if (rawDate === undefined || rawDate === null || String(rawDate).trim() === "") {
    occurredAt = new Date().toISOString();
  } else {
    const d = new Date(String(rawDate).trim());
    if (isNaN(d.getTime())) return { ok: false, error: "La fecha no es válida" };
    occurredAt = d.toISOString();
  }

  const cardHint = trimTo(body.cardHint !== undefined ? body.cardHint : body.tarjeta, MAX_CARD_HINT);

  // F26: el id del correo que originó el aviso. Sirve para que, si el script de
  // Gmail corre dos veces sobre el mismo mensaje, la compra no entre duplicada.
  const externalId = trimTo(body.externalId !== undefined ? body.externalId : body.idExterno, MAX_EXTERNAL_ID);
  const source = normalizaFuente(body.source !== undefined ? body.source : body.fuente);

  // Si no viene explícita, se lee del propio texto del monto: "S/ 25.50" → soles,
  // "$ 4.86" → dólares. Registrar dólares como soles sería un error enorme y mudo.
  const rawCur = body.currency !== undefined ? body.currency : body.moneda;
  const currency = rawCur !== undefined && rawCur !== null && String(rawCur).trim() !== ""
    ? normalizaMoneda(rawCur)
    : monedaDeTexto(rawAmount);

  return { ok: true, value: { amount: abs, merchant, occurredAt, cardHint, source, externalId, currency } };
}

// minúsculas, sin tildes, sin espacios ni signos: "Visa BCP ••1234" → "visabcp1234"
export function normalizeName(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Últimos-4 que aparecen en un texto ("•• 1234", "...1234", "x-1234").
const digitGroups = (raw) => {
  const norm = String(raw ?? "").replace(/[^\d]/g, " ");
  return norm.split(/\s+/).filter(g => g.length >= 4).map(g => g.slice(-4));
};

/**
 * Empareja el nombre de tarjeta que reporta Apple Pay con un medio de pago de
 * Qori. Devuelve el id o null. Nunca empareja con medios archivados.
 *
 * Orden de preferencia:
 *  1. Coinciden los últimos 4 dígitos (lo más confiable).
 *  2. El nombre del medio aparece dentro del hint, o al revés. Gana el nombre
 *     más largo que coincida (más específico).
 */
export function matchPaymentMethod(cardHint, paymentMethods) {
  const hint = normalizeName(cardHint);
  if (!hint) return null;
  const methods = (Array.isArray(paymentMethods) ? paymentMethods : []).filter(m => m && m.id && !m.archived);
  if (methods.length === 0) return null;

  // 1) Últimos 4 dígitos.
  const hintDigits = digitGroups(cardHint);
  if (hintDigits.length > 0) {
    for (const m of methods) {
      const mDigits = digitGroups(m.name);
      if (mDigits.some(d => hintDigits.includes(d))) return m.id;
    }
  }

  // 2) Contención de nombres; el match más largo gana.
  let best = null;
  let bestLen = 0;
  for (const m of methods) {
    const name = normalizeName(m.name);
    if (name.length < 3) continue; // "TC" solo generaría falsos positivos
    if (hint.includes(name) || name.includes(hint)) {
      const len = Math.min(name.length, hint.length);
      if (len > bestLen) { best = m.id; bestLen = len; }
    }
  }
  return best;
}
