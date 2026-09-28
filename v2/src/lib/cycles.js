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

// Fecha desde la que cuentan los gastos de la tarjeta (F6).
// `openingDate` marca el momento en que la usuaria declaró su deuda previa
// (`openingBalance`), así que los gastos ANTERIORES a esa fecha ya están dentro
// de ese saldo y no se vuelven a sumar. Sin openingDate → cuenta todo el historial.
function openingCutoff(card) {
  if (!card || !card.openingDate) return null;
  const d = new Date(card.openingDate);
  return isNaN(d) ? null : startOfDay(d);
}

// Σ gastos de la tarjeta desde `openingDate` (inclusive) hasta `until` (inclusive, opcional).
function spentSince(card, expenses, until) {
  const from = openingCutoff(card);
  const to = until ? startOfDay(until) : null;
  return (expenses || []).reduce((sum, e) => {
    if (!e || e.paymentMethodId !== card.id) return sum;
    const amount = Number(e.amount) || 0;
    if (!e.date) return sum + amount; // sin fecha: se cuenta igual, no se puede ubicar en el tiempo
    const d = startOfDay(new Date(e.date));
    if (from && d < from) return sum;
    if (to && d > to) return sum;
    return sum + amount;
  }, 0);
}

// La deuda previa aplica si `openingDate` ya había ocurrido en la fecha de corte dada.
function openingAt(card, until) {
  const opening = Number(card && card.openingBalance) || 0;
  if (!opening) return 0;
  const from = openingCutoff(card);
  if (from && until && from > startOfDay(until)) return 0;
  return opening;
}

// Uso de línea de crédito (F6): saldo vivo = deuda previa + Σ gastos desde openingDate − Σ pagos.
// → { balance, pct, available }. balance clampeado a 0 hacia la UI; pct = 0 si no hay creditLine.
export function getLineUsage(card, expenses, cardPayments) {
  const spent = spentSince(card, expenses, null);
  const paid = (cardPayments || []).reduce((sum, p) =>
    p && p.cardId === card.id ? sum + (Number(p.amount) || 0) : sum, 0);
  const balance = Math.max(0, (Number(card.openingBalance) || 0) + spent - paid);
  const pct = card.creditLine ? (balance / card.creditLine) * 100 : 0;
  const available = card.creditLine ? Math.max(0, card.creditLine - balance) : 0;
  return { balance, pct, available };
}

// Próximo pago de una tarjeta (F6): lo que exige el ÚLTIMO estado de cuenta ya cerrado.
// El ciclo cerrado es el anterior al que contiene `now`; su corte es el día previo al
// inicio del ciclo actual, y su vencimiento es el paymentDate de ese ciclo.
// → { amount, dueDate, cycleKey, status }
//   - amount = deuda previa (si ya corría) + gastos hasta ese corte − pagos aplicados a ese
//     ciclo o a ciclos anteriores. Clampeado a 0.
//   - status = 'por-vencer' si queda algo por pagar; 'al-dia' si no.
export function getNextPayment(card, expenses, cardPayments, now = new Date()) {
  const current = getCycleFor(card, now);
  // Día anterior al inicio del ciclo actual = fecha de corte del ciclo ya cerrado.
  const closedEnd = new Date(current.start.getFullYear(), current.start.getMonth(), current.start.getDate() - 1);
  const closed = getCycleFor(card, closedEnd);

  const spent = spentSince(card, expenses, closed.end);
  const opening = openingAt(card, closed.end);
  // Pagos aplicados a este estado de cuenta o a cualquiera anterior (las claves
  // "YYYY-MM-DD" ordenan bien como texto). Un pago sin cycleKey se ubica por su fecha.
  const paid = (cardPayments || []).reduce((sum, p) => {
    if (!p || p.cardId !== card.id) return sum;
    const amount = Number(p.amount) || 0;
    if (p.cycleKey) return p.cycleKey <= closed.key ? sum + amount : sum;
    if (!p.date) return sum + amount;
    return startOfDay(new Date(p.date)) <= closed.end ? sum + amount : sum;
  }, 0);

  const amount = Math.max(0, opening + spent - paid);
  return {
    amount,
    dueDate: closed.paymentDate,
    cycleKey: closed.key,
    status: amount > 0 ? "por-vencer" : "al-dia",
  };
}

// Panorama de próximos pagos (F6): total por vencer + detalle por tarjeta activa,
// ordenado por fecha de vencimiento (la más cercana primero).
// → { total, total30, items: [{ card, amount, dueDate, cycleKey, status, days, balance, available, pct }] }
//   - total  = suma de todo lo que exigen los estados de cuenta cerrados.
//   - total30 = solo lo que vence dentro de los próximos 30 días (incluye lo ya vencido).
export function getUpcomingTotal(cards, expenses, cardPayments, now = new Date()) {
  const active = (cards || []).filter(c => c && c.type === "credito" && !c.archived);
  const items = active.map(card => {
    const next = getNextPayment(card, expenses, cardPayments, now);
    const usage = getLineUsage(card, expenses, cardPayments);
    return {
      card,
      ...next,
      days: daysBetween(now, next.dueDate),
      balance: usage.balance,
      available: usage.available,
      pct: usage.pct,
    };
  }).sort((a, b) => a.dueDate - b.dueDate);

  const total = items.reduce((s, it) => s + it.amount, 0);
  const total30 = items.reduce((s, it) => (it.days <= 30 ? s + it.amount : s), 0);
  return { total, total30, items };
}
