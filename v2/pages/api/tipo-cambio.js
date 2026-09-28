// Tipo de cambio REFERENCIAL para mostrar el equivalente en soles de una deuda
// en dólares (F12).
//
// Por qué SUNAT y no el del banco: no se puede traer el tipo de cambio por banco
// (el agregador público bloquea el acceso y la SBS solo publica una página que
// habría que raspar, lo cual se rompe en silencio). Y además el tipo de cambio
// de ventanilla NO es el que el banco le aplica a una compra con tarjeta: eso lo
// convierte la red (Visa/Mastercard/Amex) con su tasa más el margen del banco.
// Por eso el número que devuelve esta ruta es una REFERENCIA, y la usuaria puede
// pisarlo con el que vea en su estado de cuenta (card.usdRate).
//
// Nunca se inventa un número: si las dos fuentes fallan, responde 503 y la app
// se queda con el último conocido (data.fx) o simplemente no muestra nada.

const SUNAT_URL = process.env.QORI_FX_SUNAT_URL || "https://api.apis.net.pe/v1/tipo-cambio-sunat";
const FALLBACK_URL = process.env.QORI_FX_FALLBACK_URL || "https://open.er-api.com/v6/latest/USD";

const TIMEOUT_MS = 6000;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 horas: el de SUNAT cambia una vez al día

// Caché en memoria del módulo. No es persistente ni se comparte entre instancias,
// y no hace falta que lo sea: solo evita golpear la API en cada carga.
let cache = null; // { body, at }

const hoyISO = () => new Date().toISOString().slice(0, 10);

// fetch con corte de tiempo: una fuente lenta no puede colgar la carga de la app.
async function fetchConTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(t);
  }
}

// SUNAT vía apis.net.pe → { origen, compra, venta, moneda, fecha }
async function desdeSunat() {
  const r = await fetchConTimeout(SUNAT_URL, TIMEOUT_MS);
  if (!r.ok) throw new Error("SUNAT respondió " + r.status);
  const j = await r.json();
  const venta = Number(j && j.venta);
  if (!Number.isFinite(venta) || venta <= 0) throw new Error("SUNAT sin venta válida");
  const compra = Number(j && j.compra);
  return {
    venta,
    compra: Number.isFinite(compra) && compra > 0 ? compra : venta,
    fecha: (j && j.fecha) || hoyISO(),
    fuente: "SUNAT",
  };
}

// Fallback abierto → { rates: { PEN }, time_last_update_utc }
async function desdeFallback() {
  const r = await fetchConTimeout(FALLBACK_URL, TIMEOUT_MS);
  if (!r.ok) throw new Error("Fallback respondió " + r.status);
  const j = await r.json();
  const venta = Number(j && j.rates && j.rates.PEN);
  if (!Number.isFinite(venta) || venta <= 0) throw new Error("Fallback sin PEN válido");
  const cruda = j.time_last_update_utc ? new Date(j.time_last_update_utc) : null;
  return {
    venta,
    compra: venta,
    fecha: cruda && !isNaN(cruda) ? cruda.toISOString().slice(0, 10) : hoyISO(),
    fuente: "referencial",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json(cache.body);
  }

  let body = null;
  try {
    body = await desdeSunat();
  } catch (e) {
    try {
      body = await desdeFallback();
    } catch (e2) {
      // Las dos fuentes fallaron: se dice claro y no se inventa nada.
      return res.status(503).json({
        error: "No pudimos traer el tipo de cambio ahora. Intenta más tarde.",
      });
    }
  }

  cache = { body, at: Date.now() };
  return res.status(200).json(body);
}
