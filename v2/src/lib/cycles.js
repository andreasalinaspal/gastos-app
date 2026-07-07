// Helpers de ciclo de facturación de tarjetas de crédito (P2: todo se agrupa
// por ciclo, de corte a corte). Solo Date nativo, sin librerías.
//
// Convención de límites: el ciclo va desde el DÍA SIGUIENTE al corte anterior
// hasta el día del corte INCLUSIVE. Ej. corte 25: ciclo = 26 del mes pasado → 25 de este mes.
// Si el mes no tiene el día de corte (corte 31 en febrero), se clampa al último día del mes.

// Fecha del corte en un (year, month) dado, clampando al último día si el mes es corto.
// `month` puede estar fuera de 0-11: Date lo normaliza (cruce de año incluido).
function cutoffDateFor(year, month, cutoffDay) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(cutoffDay, lastDay));
}

function startOfDay(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Diferencia en días calendario (a nivel de fecha, robusta ante DST).
function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);
}

function toKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

// Ciclo de facturación que CONTIENE `date` para una tarjeta dada.
// → { start, end, paymentDate, key, dayOfCycle, totalDays }
//   - end = fecha de corte del ciclo (inclusive); key = "YYYY-MM-DD" de end.
//   - start = día siguiente al corte anterior.
//   - paymentDate = card.paymentDay del mes SIGUIENTE al mes del corte (clamp si el mes es corto).
export function getCycleFor(card, date) {
  const day = startOfDay(date);
  const y = day.getFullYear();
  const m = day.getMonth();

  // Corte de este mes; si la fecha ya lo pasó, el ciclo termina en el corte del mes siguiente.
  let end = cutoffDateFor(y, m, card.cutoffDay);
  if (day > end) end = cutoffDateFor(y, m + 1, card.cutoffDay);

  // Corte anterior → el ciclo empieza al día siguiente.
  const prevCutoff = cutoffDateFor(end.getFullYear(), end.getMonth() - 1, card.cutoffDay);
  const start = new Date(prevCutoff.getFullYear(), prevCutoff.getMonth(), prevCutoff.getDate() + 1);

  const paymentDate = cutoffDateFor(end.getFullYear(), end.getMonth() + 1, card.paymentDay);

  return {
    start,
    end,
    paymentDate,
    key: toKey(end),
    dayOfCycle: daysBetween(start, day) + 1,
    totalDays: daysBetween(start, end) + 1,
  };
}

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d); // local, no UTC
}

// Suma de gastos de la tarjeta cuya fecha cae dentro del ciclo identificado por `cycleKey`.
export function getCycleSpend(expenses, card, cycleKey) {
  const cycle = getCycleFor(card, parseKey(cycleKey)); // la fecha de corte pertenece a su propio ciclo
  return (expenses || []).reduce((sum, e) => {
    if (!e || e.paymentMethodId !== card.id || !e.date) return sum;
    const d = startOfDay(new Date(e.date));
    if (d >= cycle.start && d <= cycle.end) return sum + (Number(e.amount) || 0);
    return sum;
  }, 0);
}

// Uso de línea de crédito: saldo vivo = Σ gastos históricos con la tarjeta − Σ pagos de la tarjeta.
// → { balance, pct }. balance clampeado a 0 hacia la UI; pct = 0 si no hay creditLine.
export function getLineUsage(card, expenses, cardPayments) {
  const spent = (expenses || []).reduce((sum, e) =>
    e && e.paymentMethodId === card.id ? sum + (Number(e.amount) || 0) : sum, 0);
  const paid = (cardPayments || []).reduce((sum, p) =>
    p && p.cardId === card.id ? sum + (Number(p.amount) || 0) : sum, 0);
  const balance = Math.max(0, spent - paid);
  const pct = card.creditLine ? (balance / card.creditLine) * 100 : 0;
  return { balance, pct };
}
