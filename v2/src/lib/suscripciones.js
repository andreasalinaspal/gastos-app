// F43: encontrar sola las suscripciones, a partir de los gastos que ya tiene.
//
// Ella lo pidió así: "necesito que me ayudes con algo para analizar bien, ya que
// yo me olvido". Las suscripciones son plata que sale todos los meses sin que
// nadie la mire: la que subió de precio, la del trial que nunca canceló.
//
// No hace falta que las registre a mano. Un cargo del MISMO comercio, por un
// monto parecido, cada ~30 días, es una suscripción. Los avisos del banco ya
// traen comercio, monto y fecha (ver [[correoBancos]]), así que el dato está.
//
// Regla de siempre: ante la duda, no se afirma. Lo que no calza claro se queda
// fuera, porque decirle "tienes una suscripción" sobre dos compras casuales en
// el mismo sitio la haría desconfiar de toda la pantalla.

const DIA = 24 * 60 * 60 * 1000;
const redondea = (n) => Math.round(n * 100) / 100;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Cadencias que se reconocen, con la holgura de cada una. Un cobro mensual no
// cae el mismo número todos los meses (meses de 28 a 31 días, fines de semana,
// reintentos del banco), así que la ventana es ancha a propósito.
export const CADENCIAS = [
  { id: "mensual", nombre: "cada mes", dias: 30, min: 24, max: 38 },
  { id: "anual", nombre: "cada año", dias: 365, min: 330, max: 400 },
];

// Cuántos cobros hacen falta para afirmar que es una suscripción. Con uno solo
// no hay periodicidad que medir: es una compra.
export const MIN_COBROS = 2;

// Un comercio llega escrito distinto en cada cargo: "NETFLIX.COM", "Netflix
// 1234", "NETFLIX*MEMBRESIA". Se normaliza para poder agruparlos.
export function claveComercio(nombre) {
  return String(nombre || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[*#]/g, " ")
    .replace(/\.(COM|PE|NET|IO|CO|ORG)\b/g, " ")  // NETFLIX.COM → NETFLIX
    .replace(/\b\d{3,}\b/g, " ")                   // códigos de operación
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const curOfGasto = (e) => (e && e.currency === "USD" ? "USD" : "PEN");

// ¿Dos montos son "el mismo cobro"? Se tolera un 15%: los cargos en dólares se
// mueven con el tipo de cambio, y algunos servicios cobran impuestos aparte.
// Una subida mayor a eso no es ruido — es que subieron el precio, y eso se
// detecta aparte, no se esconde acá.
export const TOLERANCIA = 0.15;
export function montoParecido(a, b) {
  const x = Number(a) || 0, y = Number(b) || 0;
  if (x <= 0 || y <= 0) return false;
  return Math.abs(x - y) <= Math.max(x, y) * TOLERANCIA;
}

// La cadencia que explica una lista de huecos entre cobros, o null.
// Se exige que la MAYORÍA de los huecos calce: un cobro que se atrasó no debe
// tumbar una suscripción que lleva seis meses puntual.
export function cadenciaDe(huecos) {
  if (!huecos || huecos.length === 0) return null;
  for (const c of CADENCIAS) {
    const calzan = huecos.filter(h => h >= c.min && h <= c.max).length;
    if (calzan > huecos.length / 2) return c;
  }
  return null;
}

// Agrupa los gastos por comercio y moneda. Los de distinta moneda no se mezclan:
// un cargo en dólares y uno en soles del mismo comercio son cobros distintos.
function agrupa(gastos) {
  const m = new Map();
  for (const e of gastos || []) {
    if (!e || !e.date) continue;
    const monto = Number(e.amount) || 0;
    if (monto <= 0) continue;
    const nombre = String(e.description || "").trim();
    const clave = claveComercio(nombre);
    if (!clave) continue;
    const k = clave + "|" + curOfGasto(e);
    if (!m.has(k)) m.set(k, { clave, nombre, currency: curOfGasto(e), cobros: [] });
    m.get(k).cobros.push({ id: e.id, amount: monto, date: e.date, fecha: startOfDay(new Date(e.date)) });
  }
  return [...m.values()];
}

// Una suscripción, ya analizada. → null si el grupo no califica.
function analiza(grupo, hoy) {
  const cobros = grupo.cobros
    .filter(c => !isNaN(c.fecha.getTime()))
    .sort((a, b) => a.fecha - b.fecha);
  if (cobros.length < MIN_COBROS) return null;

  const huecos = [];
  for (let i = 1; i < cobros.length; i++) {
    huecos.push(Math.round((cobros[i].fecha - cobros[i - 1].fecha) / DIA));
  }
  const cadencia = cadenciaDe(huecos);
  if (!cadencia) return null;

  // Los montos tienen que parecerse entre sí. Si el último se despegó del
  // anterior, sigue siendo la misma suscripción: subió de precio.
  const ultimo = cobros[cobros.length - 1];
  const previo = cobros[cobros.length - 2];
  const consistentes = cobros.filter(c => montoParecido(c.amount, ultimo.amount)).length;
  const subio = !montoParecido(ultimo.amount, previo.amount) && ultimo.amount > previo.amount;
  if (consistentes < 2 && !subio) return null;

  const proxima = new Date(ultimo.fecha.getTime() + cadencia.dias * DIA);
  const diasDesdeUltimo = Math.round((startOfDay(hoy) - ultimo.fecha) / DIA);
  // Si ya pasó un ciclo y medio sin cobrar, probablemente se dio de baja. No se
  // borra: se marca, porque también sirve saber qué dejó de pagar.
  const inactiva = diasDesdeUltimo > cadencia.dias * 1.5;

  return {
    id: grupo.clave + "|" + grupo.currency,
    comercio: grupo.nombre,
    currency: grupo.currency,
    monto: redondea(ultimo.amount),
    cadencia: cadencia.id,
    cadenciaNombre: cadencia.nombre,
    cobros,
    veces: cobros.length,
    ultimoCobro: ultimo.date,
    proximoCobro: inactiva ? null : proxima.toISOString(),
    diasParaProximo: inactiva ? null : Math.round((proxima - startOfDay(hoy)) / DIA),
    inactiva,
    // El aviso que nadie nota: te subieron el precio y nunca te enteraste.
    subioDePrecio: subio ? { antes: redondea(previo.amount), ahora: redondea(ultimo.amount) } : null,
  };
}

/**
 * Las suscripciones que se detectan en sus gastos.
 * → { activas, inactivas, totalMensual, totalMensualUSD }
 * `totalMensual` lleva TODO a su costo por mes (una anual se divide entre 12)
 * para poder decir "esto te cuesta X al mes". Los dólares van aparte, nunca
 * convertidos, igual que en el resto de la app.
 */
export function detectaSuscripciones(gastos, hoy = new Date()) {
  const todas = agrupa(gastos)
    .map(g => analiza(g, hoy))
    .filter(Boolean)
    .sort((a, b) => b.monto - a.monto);

  const activas = todas.filter(s => !s.inactiva);
  const alMes = (s) => (s.cadencia === "anual" ? s.monto / 12 : s.monto);
  const suma = (cur) => redondea(activas.filter(s => s.currency === cur).reduce((t, s) => t + alMes(s), 0));

  return {
    activas,
    inactivas: todas.filter(s => s.inactiva),
    totalMensual: suma("PEN"),
    totalMensualUSD: suma("USD"),
  };
}

// Lo que se muestra en Config sin abrir la pantalla.
export function resumenSuscripciones(gastos, fmt, hoy = new Date()) {
  const r = detectaSuscripciones(gastos, hoy);
  const n = r.activas.length;
  if (n === 0) return "Qori las busca solas en tus gastos";
  const subieron = r.activas.filter(s => s.subioDePrecio).length;
  const base = n === 1 ? "1 activa" : n + " activas";
  const plata = r.totalMensual > 0 ? " · " + fmt(r.totalMensual) + " al mes" : "";
  const ojo = subieron > 0 ? (subieron === 1 ? " · 1 subió de precio" : ` · ${subieron} subieron de precio`) : "";
  return base + plata + ojo;
}

// ── F44: las que decidió cancelar y todavía no canceló ────────────────────
//
// Decidir cancelar algo y cancelarlo son dos cosas distintas, y en el medio se
// pierde plata. Lo que manda acá es la FECHA del próximo cobro: una suscripción
// "por cancelar" sin fecha es un buen propósito; con fecha es un plazo.
//
// `porCancelar = [{ id, nombre, monto, currency, cobra, nota }]`
//   `cobra`: ISO del próximo cobro, o el día del mes (1-31) si se repite.

const DIA_MS = 24 * 60 * 60 * 1000;

// El próximo cobro de una entrada, como Date. Con `cobra` numérico se calcula
// el siguiente día de ese número que todavía no pasó.
export function proximoCobroDe(item, hoy = new Date()) {
  if (!item) return null;
  const crudo = item.cobra;
  if (typeof crudo === "number" && crudo >= 1 && crudo <= 31) {
    const h = startOfDay(hoy);
    const enMes = (y, m) => {
      const ultimo = new Date(y, m + 1, 0).getDate();
      return new Date(y, m, Math.min(crudo, ultimo), 12, 0, 0, 0);
    };
    let d = enMes(h.getFullYear(), h.getMonth());
    if (startOfDay(d) < h) d = enMes(h.getFullYear(), h.getMonth() + 1);
    return d;
  }
  if (!crudo) return null;
  // Una fecha sola ("2026-10-27") la lee el navegador como UTC, y en Perú eso
  // la corre un día para atrás. Se arma a mano, al mediodía local.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(crudo).trim());
  const d = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]), 12, 0, 0, 0)
    : new Date(crudo);
  return isNaN(d.getTime()) ? null : d;
}

// Días que faltan para el próximo cobro. null si no hay fecha.
export function diasParaCobro(item, hoy = new Date()) {
  const d = proximoCobroDe(item, hoy);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(hoy)) / DIA_MS);
}

// Las pendientes, lo que urge primero. Las que no tienen fecha van al final.
export function ordenaPorCancelar(lista, hoy = new Date()) {
  return [...(lista || [])]
    .filter(Boolean)
    .map(i => ({ ...i, proximoCobro: proximoCobroDe(i, hoy), dias: diasParaCobro(i, hoy) }))
    .sort((a, b) => {
      if (a.dias === null && b.dias === null) return 0;
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    });
}

// Lo que le sigue costando al mes no haberlas cancelado todavía.
export function costaNoCancelar(lista) {
  const suma = (cur) => redondea((lista || [])
    .filter(i => i && (i.currency === "USD") === (cur === "USD"))
    .reduce((t, i) => t + (Number(i.monto) || 0), 0));
  return { PEN: suma("PEN"), USD: suma("USD") };
}

// ── F45: la lista que ella lleva ──────────────────────────────────────────
//
// La detección automática (arriba) es una ayuda, no la fuente de verdad: pide
// dos cobros para afirmar algo, y una suscripción recién puesta o anual tarda
// meses en aparecer. Ella quiere VER y mantener su lista. Esto es esa lista.
//
// `suscripciones = [{ id, nombre, monto, currency, cobra, cadencia, nota }]`
//   `cobra`: día del mes (1-31) o fecha ISO. `cadencia`: "mensual" | "anual".

export const esAnual = (s) => s && s.cadencia === "anual";

// Lo que cuesta al mes: una anual se reparte entre 12 para poder compararla.
export const costoMensual = (s) => {
  const m = Number(s && s.monto) || 0;
  return esAnual(s) ? redondea(m / 12) : m;
};

// La lista lista para pintar: con su próximo cobro y ordenada por urgencia.
export function ordenaSuscripciones(lista, hoy = new Date()) {
  return [...(lista || [])]
    .filter(Boolean)
    .map(s => ({ ...s, proximoCobro: proximoCobroDe(s, hoy), dias: diasParaCobro(s, hoy) }))
    .sort((a, b) => {
      if (a.dias === null && b.dias === null) return (Number(b.monto) || 0) - (Number(a.monto) || 0);
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    });
}

// Lo que suman al mes, por moneda. Los dólares nunca se convierten.
export function totalMensualDeLista(lista) {
  const suma = (usd) => redondea((lista || [])
    .filter(s => s && (s.currency === "USD") === usd)
    .reduce((t, s) => t + costoMensual(s), 0));
  return { PEN: suma(false), USD: suma(true) };
}

// Lo que Qori detectó en sus gastos y ella todavía no tiene anotado. Sirve para
// ofrecerle agregarlas, en vez de mostrarlas como si ya fueran parte de la lista.
export function detectadasNoAnotadas(gastos, lista, hoy = new Date()) {
  const anotadas = new Set((lista || []).map(s => claveComercio(s && s.nombre)).filter(Boolean));
  return detectaSuscripciones(gastos, hoy).activas
    .filter(d => !anotadas.has(claveComercio(d.comercio)));
}

// Para Config, sin abrir la pantalla.
export function resumenLista(lista, fmt) {
  const n = (lista || []).length;
  if (n === 0) return null;
  const t = totalMensualDeLista(lista);
  const partes = [n === 1 ? "1 activa" : n + " activas"];
  if (t.PEN > 0) partes.push(fmt(t.PEN) + " al mes");
  return partes.join(" · ");
}
