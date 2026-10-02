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

// ── Monedas (F10) ────────────────────────────────────────────────────────────
// Las tarjetas peruanas manejan DOS líneas independientes: una en soles y otra
// en dólares. Son dos deudas y dos pagos distintos: acá NUNCA se suman ni se
// convierten. Todo helper trabaja sobre UNA moneda a la vez.
export const CURRENCIES = ["PEN", "USD"];

// Moneda de un gasto / pago / estado de cuenta. Sin `currency` → soles (todo lo
// registrado antes de F10 era en soles).
export const curOf = (x) => (x && x.currency === "USD" ? "USD" : "PEN");
const normCur = (c) => (c === "USD" ? "USD" : "PEN");

// Configuración de la línea de una moneda: { creditLine, openingBalance }.
// - Soles: siempre existe (fallback a los campos planos pre-v4 de la tarjeta).
// - Dólares: solo si la usuaria la configuró → si no, null (la tarjeta no maneja dólares).
export function getCardLine(card, currency = "PEN") {
  if (!card) return null;
  const cur = normCur(currency);
  const line = card.lines && card.lines[cur];
  if (line) {
    return {
      creditLine: Number(line.creditLine) || 0,
      openingBalance: Number(line.openingBalance) || 0,
      // Cada línea puede tener su propia foto de la deuda: activar la línea en
      // dólares hoy no debe borrar el historial en soles. Sin fecha propia, vale
      // la de la tarjeta.
      openingDate: line.openingDate || card.openingDate || null,
    };
  }
  if (cur === "USD") return null;
  return {
    creditLine: Number(card.creditLine) || 0,
    openingBalance: Number(card.openingBalance) || 0,
    openingDate: card.openingDate || null,
  };
}

export const hasLine = (card, currency) => getCardLine(card, currency) !== null;

// Monedas que la tarjeta tiene configuradas, en orden (soles primero).
export const cardCurrencies = (card) => CURRENCIES.filter(c => hasLine(card, c));

// Suma de gastos de la tarjeta (en `currency`) cuya fecha cae dentro del ciclo `cycleKey`.
export function getCycleSpend(expenses, card, cycleKey, currency = "PEN") {
  const cur = normCur(currency);
  const cycle = getCycleFor(card, parseKey(cycleKey)); // la fecha de corte pertenece a su propio ciclo
  return (expenses || []).reduce((sum, e) => {
    if (!e || e.paymentMethodId !== card.id || !e.date) return sum;
    if (curOf(e) !== cur) return sum;
    const d = startOfDay(new Date(e.date));
    if (d >= cycle.start && d <= cycle.end) return sum + (Number(e.amount) || 0);
    return sum;
  }, 0);
}

// Fecha desde la que cuentan los gastos de la tarjeta (F6).
// `openingDate` marca el momento en que la usuaria declaró su deuda previa
// (`openingBalance`), así que los gastos ANTERIORES a esa fecha ya están dentro
// de ese saldo y no se vuelven a sumar. Sin openingDate → cuenta todo el historial.
function openingCutoff(card, currency = "PEN") {
  const line = getCardLine(card, currency);
  const raw = line ? line.openingDate : card && card.openingDate;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d) ? null : startOfDay(d);
}

// Σ gastos de la tarjeta EN UNA MONEDA desde `openingDate` (inclusive) hasta
// `until` (inclusive, opcional).
function spentSince(card, expenses, until, currency = "PEN") {
  const cur = normCur(currency);
  const from = openingCutoff(card, cur);
  const to = until ? startOfDay(until) : null;
  return (expenses || []).reduce((sum, e) => {
    if (!e || e.paymentMethodId !== card.id) return sum;
    if (curOf(e) !== cur) return sum;
    const amount = Number(e.amount) || 0;
    if (!e.date) return sum + amount; // sin fecha: se cuenta igual, no se puede ubicar en el tiempo
    const d = startOfDay(new Date(e.date));
    if (from && d < from) return sum;
    if (to && d > to) return sum;
    return sum + amount;
  }, 0);
}

// La deuda previa de una moneda aplica si `openingDate` ya había ocurrido en la
// fecha de corte dada.
function openingAt(card, until, currency = "PEN") {
  const line = getCardLine(card, currency);
  const opening = line ? line.openingBalance : 0;
  if (!opening) return 0;
  const from = openingCutoff(card, currency);
  if (from && until && from > startOfDay(until)) return 0;
  return opening;
}

// Σ pagos de la tarjeta en una moneda, entre `from` y `until` (ambos inclusive,
// ambos opcionales). Un pago sin fecha se cuenta siempre: no se puede ubicar.
function paidTotal(card, cardPayments, currency = "PEN", until = null, from = null) {
  const cur = normCur(currency);
  const to = until ? startOfDay(until) : null;
  const desde = from ? startOfDay(from) : null;
  return (cardPayments || []).reduce((sum, p) => {
    if (!p || p.cardId !== card.id) return sum;
    if (curOf(p) !== cur) return sum;
    if (p.date) {
      const d = startOfDay(new Date(p.date));
      if (to && d > to) return sum;      // pago futuro
      if (desde && d < desde) return sum; // ya está dentro de la foto del saldo
    }
    return sum + (Number(p.amount) || 0);
  }, 0);
}

// Uso de línea de crédito en UNA moneda (F10): saldo vivo = deuda previa +
// Σ gastos desde openingDate − Σ pagos desde openingDate, todo en esa misma moneda.
//
// F36: los pagos se cortan en `openingDate` igual que los gastos, y por la misma
// razón. `openingBalance` es una FOTO del saldo que le muestra el banco, y el
// banco ya le descontó los abonos que hizo antes de esa foto. Restarlos de nuevo
// hacía que el disponible de Qori saliera más alto que el del banco, justo por
// el monto abonado.
// → { balance, pct, available, creditLine, currency }. Sin línea en esa moneda → todo 0.
export function getLineUsage(card, expenses, cardPayments, currency = "PEN") {
  const cur = normCur(currency);
  const line = getCardLine(card, cur);
  if (!line) return { balance: 0, pct: 0, available: 0, creditLine: 0, currency: cur };
  const spent = spentSince(card, expenses, null, cur);
  const paid = paidTotal(card, cardPayments, cur, null, openingCutoff(card, cur));
  const balance = Math.max(0, line.openingBalance + spent - paid);
  const pct = line.creditLine ? (balance / line.creditLine) * 100 : 0;
  const available = line.creditLine ? Math.max(0, line.creditLine - balance) : 0;
  return { balance, pct, available, creditLine: line.creditLine, currency: cur };
}

// Uso de la LÍNEA COMPARTIDA (F18).
//
// Cómo funciona de verdad una tarjeta acá: el banco da UNA sola línea, en soles
// (ej. IBK, S/6,000). Dentro de esa línea ella puede comprar en dólares, y el
// banco convierte con SU tipo de cambio y le descuenta los soles equivalentes.
// No hay un cupo aparte en dólares.
//
// Lo que sí queda separado es la DEUDA: el estado de cuenta trae dos montos y
// ella paga los soles en soles y los dólares en dólares. Por eso `getLineUsage`
// sigue existiendo por moneda — pero el DISPONIBLE es uno solo y sale de acá.
//
// `tasa` es el tipo de cambio con que se estima lo consumido en dólares (el de
// su banco si lo puso, si no el referencial). Sin tasa y con deuda en dólares no
// se inventa nada: `faltaTasa` avisa que el disponible está incompleto.
// → { creditLine, balancePEN, balanceUSD, usdEnSoles, usado, available, pct,
//     tieneUsd, faltaTasa, aproximado }
export function getSharedUsage(card, expenses, cardPayments, tasa = null) {
  const pen = getLineUsage(card, expenses, cardPayments, "PEN");
  const usd = hasLine(card, "USD")
    ? getLineUsage(card, expenses, cardPayments, "USD")
    : { balance: 0 };
  const creditLine = pen.creditLine;
  const t = Number(tasa);
  const tasaOk = Number.isFinite(t) && t > 0;
  const balanceUSD = usd.balance;
  const tieneUsd = balanceUSD > 0;
  const usdEnSoles = tieneUsd && tasaOk ? Math.round(balanceUSD * t * 100) / 100 : 0;
  const usado = pen.balance + usdEnSoles;
  return {
    creditLine,
    balancePEN: pen.balance,
    balanceUSD,
    usdEnSoles,
    usado,
    available: creditLine ? Math.max(0, creditLine - usado) : 0,
    pct: creditLine ? (usado / creditLine) * 100 : 0,
    tieneUsd,
    faltaTasa: tieneUsd && !tasaOk,
    // El banco aplica su propio tipo de cambio a cada compra, en la fecha de cada
    // compra: mientras haya deuda en dólares, el disponible es una estimación.
    aproximado: tieneUsd,
  };
}

// ── Estados de cuenta oficiales (F10) ────────────────────────────────────────
// `cardStatements` = [{ id, cardId, cycleKey, currency, amount, dueDate, registeredAt }].
// El monto del banco se REGISTRA, no se calcula: el banco cobra intereses,
// membresía, seguros y aplica su propio tipo de cambio. Cuando existe, MANDA.
export function findStatement(statements, cardId, cycleKey, currency = "PEN") {
  const cur = normCur(currency);
  return (statements || []).find(
    s => s && s.cardId === cardId && s.cycleKey === cycleKey && curOf(s) === cur
  ) || null;
}

// Ciclo ya CERRADO respecto a `now`: el anterior al que contiene `now`.
export function getClosedCycle(card, now = new Date()) {
  const current = getCycleFor(card, now);
  const closedEnd = new Date(current.start.getFullYear(), current.start.getMonth(), current.start.getDate() - 1);
  return getCycleFor(card, closedEnd);
}

// Próximo pago de una tarjeta EN UNA MONEDA (F10): lo que exige el ÚLTIMO estado
// de cuenta ya cerrado. El ciclo cerrado es el anterior al que contiene `now`.
// → { amount, dueDate, cycleKey, status, source, currency, estimateGross, statementAmount }
//   - Si hay estado de cuenta REGISTRADO de ese ciclo, ese monto MANDA (source 'banco').
//   - Si no, Qori devuelve su estimado (source 'estimado'): deuda previa (si ya corría)
//     + gastos hasta ese corte, menos los pagos ya hechos. Clampeado a 0.
//   - estimateGross = el estimado ANTES de restar pagos, para comparar con el banco.
//   - status = 'por-vencer' si queda algo por pagar; 'al-dia' si no.
export function getNextPayment(card, expenses, cardPayments, now = new Date(), currency = "PEN", statements = null) {
  const cur = normCur(currency);
  const closed = getClosedCycle(card, now);

  const spent = spentSince(card, expenses, closed.end, cur);
  const opening = openingAt(card, closed.end, cur);
  const estimateGross = opening + spent;
  const st = findStatement(statements, card.id, closed.key, cur);

  // Qué pagos descuentan de este estado de cuenta. El `cycleKey` del pago no
  // manda —solo dice en qué ciclo se registró, y el banco aplica los abonos a la
  // deuda más antigua primero—; manda la FECHA, porque cada punto de partida ya
  // trae pagos adentro (F36):
  //   - con estado de cuenta: el banco ya le descontó lo que abonó antes del
  //     corte, así que solo cuentan los pagos posteriores al corte.
  //   - sin estado de cuenta: el estimado parte de la foto del saldo, así que
  //     cuentan los pagos posteriores a esa foto.
  const desde = st ? closed.end : openingCutoff(card, cur);
  const paid = paidTotal(card, cardPayments, cur, now, desde);
  const gross = st ? Number(st.amount) || 0 : estimateGross;
  const amount = Math.max(0, gross - paid);
  const dueDate = st && st.dueDate ? startOfDay(new Date(st.dueDate)) : closed.paymentDate;

  // F23: cuando la foto del saldo se tomó DESPUÉS del corte, ese número junta
  // dos cosas que Qori no puede separar sola: lo que el banco ya facturó y lo
  // que ella lleva gastado en el ciclo abierto. El estimado de arriba da 0 —
  // `openingAt` descarta una foto posterior al corte — y decir "al día" con
  // deuda viva es mentir. Se dice que falta el dato y se pide el estado de
  // cuenta, que es el único lugar donde ese corte existe de verdad.
  const foto = openingCutoff(card, cur);
  const saldoVivo = getLineUsage(card, expenses, cardPayments, cur).balance;
  const sinDato = !st && !!foto && foto > closed.end && saldoVivo > 0;
  if (sinDato) {
    return {
      amount: 0, dueDate, cycleKey: closed.key,
      status: "sin-dato", currency: cur, source: "sin-dato",
      estimateGross: 0, statementAmount: null, saldoVivo,
    };
  }

  return {
    amount,
    dueDate,
    cycleKey: closed.key,
    status: amount > 0 ? "por-vencer" : "al-dia",
    currency: cur,
    source: st ? "banco" : "estimado",
    estimateGross,
    statementAmount: st ? Number(st.amount) || 0 : null,
    // F30: cuánto lleva abonado contra esta deuda. El monto de arriba ya lo
    // descuenta, pero sin este dato ella ve bajar el número sin saber por qué.
    pagado: paid,
    bruto: gross,
  };
}

// F30: los abonos que le hizo a una tarjeta, del más reciente al más viejo.
// Abonar de a pocos es su forma de pagar, y hasta ahora los pagos se usaban
// para la cuenta pero no se veían en ninguna pantalla.
export function getCardPayments(card, cardPayments, currency = "PEN") {
  if (!card) return [];
  const cur = normCur(currency);
  return (cardPayments || [])
    .filter(p => p && p.cardId === card.id && curOf(p) === cur && (Number(p.amount) || 0) > 0)
    .map(p => ({ ...p, amount: Number(p.amount) || 0, fecha: p.date ? new Date(p.date) : null }))
    .sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0;
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return b.fecha - a.fecha;
    });
}

// En qué está partido el saldo de una tarjeta, en UNA moneda (F19).
//
// La pregunta que responde, textual de la usuaria: "no cuadra el total de mi
// tarjeta y el disponible porque estoy dentro de mi ciclo de facturación y estoy
// gastando". Y tiene razón en que no cuadra, porque son dos cosas distintas:
//
//   saldo vivo  =  lo que el banco YA te facturó y aún no pagas
//               +  lo que llevas gastado desde el último corte
//
// Lo primero es lo que vence en la fecha de pago. Lo segundo todavía no te lo
// cobran: entra en el estado de cuenta del próximo corte. Pero las DOS cosas
// ocupan tu línea desde el momento en que compras, que es justo lo que hace que
// el disponible baje sin que suba lo que tienes que pagar este mes.
//
// De dónde sale cada número (F20). Esto importa, porque son DOS fuentes:
//
//   `delCiclo`    = saldo − facturado. Es la resta que ella hace de cabeza
//                   mirando su banco, y por eso es la que manda: sirve aunque no
//                   haya registrado ni una compra, con solo actualizar el saldo.
//   `registrado`  = lo que Qori tiene anotado desde el corte. Es el contraste.
//   `sinRegistrar`= la diferencia entre los dos. Positiva = gastó y no lo anotó
//                   (o el banco cobró intereses); negativa = anotó de más.
//
// No se fuerza que cuadren ni se esconde la diferencia: cada uno viene de donde
// viene y la app dice cuánto se separan.
// → { saldo, facturado, delCiclo, registrado, sinRegistrar, excedeSaldo,
//     dueDate, source, status, currency }
export function getBalanceBreakdown(card, expenses, cardPayments, now = new Date(), currency = "PEN", statements = null) {
  const cur = normCur(currency);
  const saldo = getLineUsage(card, expenses, cardPayments, cur).balance;
  const next = getNextPayment(card, expenses, cardPayments, now, cur, statements);
  const facturado = next.amount;

  // Gastos anotados en el ciclo abierto. Se cuentan desde el CORTE y nada más,
  // sin mirar la fecha de la foto del saldo: este número no suma en ninguna
  // cuenta, solo sirve para contrastar con `delCiclo`. Si se recortara por la
  // foto, actualizar el saldo borraría de la vista lo que ella ya había anotado
  // y la app le diría que le falta anotar algo que ya anotó.
  const cycle = getCycleFor(card, now);
  const from = cycle.start;
  const hasta = startOfDay(now);
  const registrado = (expenses || []).reduce((sum, e) => {
    if (!e || e.paymentMethodId !== card.id || !e.date) return sum;
    if (curOf(e) !== cur) return sum;
    const d = startOfDay(new Date(e.date));
    if (d < from || d > hasta) return sum;
    return sum + (Number(e.amount) || 0);
  }, 0);

  // F23: sin estado de cuenta y con la foto del saldo posterior al corte no hay
  // forma de partir el saldo. No se inventa el reparto: se dice qué falta.
  const faltaEstadoDeCuenta = next.status === "sin-dato";
  const delCiclo = faltaEstadoDeCuenta ? null : Math.max(0, Math.round((saldo - facturado) * 100) / 100);
  return {
    saldo,
    facturado,
    // F30: lo abonado contra lo ya facturado, para explicar por qué bajó.
    pagado: next.pagado || 0,
    brutoFacturado: next.bruto || 0,
    faltaEstadoDeCuenta,
    delCiclo,
    registrado,
    sinRegistrar: faltaEstadoDeCuenta ? null : Math.round((delCiclo - registrado) * 100) / 100 + 0, // +0: evita el -0
    // El estado de cuenta pide más de lo que dice el saldo: pasa cuando el banco
    // cobró intereses o membresía que ella todavía no reflejó en su saldo.
    excedeSaldo: facturado > saldo,
    dueDate: next.dueDate,
    source: next.source,
    status: next.status,
    currency: cur,
  };
}

// Panorama de próximos pagos (F10): SEPARADO por moneda. NUNCA un total mezclado
// — son dos deudas distintas que se pagan aparte.
// → { PEN: { total, total30, items }, USD: { ... } }
//   items = [{ card, amount, dueDate, cycleKey, status, source, days, balance, available, pct }]
//   ordenado por fecha de vencimiento (la más cercana primero).
//   - total  = suma de todo lo que exigen los estados de cuenta cerrados de esa moneda.
//   - total30 = solo lo que vence dentro de los próximos 30 días (incluye lo ya vencido).
export function getUpcomingTotal(cards, expenses, cardPayments, now = new Date(), statements = null) {
  const active = (cards || []).filter(c => c && c.type === "credito" && !c.archived);
  const out = {};
  for (const cur of CURRENCIES) {
    const items = active
      .filter(card => hasLine(card, cur))
      .map(card => {
        const next = getNextPayment(card, expenses, cardPayments, now, cur, statements);
        const usage = getLineUsage(card, expenses, cardPayments, cur);
        return {
          card,
          ...next,
          days: daysBetween(now, next.dueDate),
          balance: usage.balance,
          available: usage.available,
          pct: usage.pct,
        };
      })
      .sort((a, b) => a.dueDate - b.dueDate);
    out[cur] = {
      total: items.reduce((s, it) => s + it.amount, 0),
      total30: items.reduce((s, it) => (it.days <= 30 ? s + it.amount : s), 0),
      items,
    };
  }
  return out;
}

// Lo que Qori tiene que PEDIRLE a la usuaria (F10): el ciclo cerrado más reciente
// sin estado de cuenta registrado. → null si no hay nada que pedir.
// → { cycle, missing: [{ currency, estimateGross }] }
// Solo pide si la tarjeta ya existía en ese corte y ese ciclo tiene algo que
// cobrar en esa moneda (estimado > 0): con un ciclo vacío no molesta.
export function getStatementPrompt(card, expenses, statements, now = new Date()) {
  if (!card || card.type !== "credito" || card.archived) return null;
  const closed = getClosedCycle(card, now);
  const missing = [];
  for (const cur of cardCurrencies(card)) {
    const opening = openingCutoff(card, cur);
    if (opening && opening > closed.end) continue; // esa línea se declaró después del corte
    if (findStatement(statements, card.id, closed.key, cur)) continue;
    const estimateGross = openingAt(card, closed.end, cur) + spentSince(card, expenses, closed.end, cur);
    if (estimateGross > 0) missing.push({ currency: cur, estimateGross });
  }
  if (missing.length === 0) return null;
  return { cycle: closed, missing };
}

// Prompt para cuando la usuaria ENTRA ELLA a registrar lo que debe, sin esperar
// a que Qori se lo pida. A diferencia de getStatementPrompt, aquí no se filtra
// nada: ofrece todas las monedas de la tarjeta, aunque el ciclo esté vacío o ya
// tenga un monto registrado (en ese caso viene prellenado para corregirlo).
// → { cycle, missing: [{ currency, estimateGross, registrado, dueDate }] }
// `dueDate` (F12) es la fecha que ella ya había registrado para ESA moneda, si
// la hubo: al entrar a corregir el monto no se le pierde la fecha que puso.
// Ofrece SIEMPRE las dos monedas, tenga o no declarada la línea: ella sabe lo
// que debe aunque no sepa (o no haya puesto) su cupo en dólares. Las monedas sin
// línea vienen marcadas con `sinLinea` para que la hoja lo explique y, al
// guardar, se le cree una línea mínima y la deuda aparezca donde corresponde.
export function buildStatementEntry(card, expenses, statements, now = new Date()) {
  if (!card || card.type !== "credito") return null;
  const closed = getClosedCycle(card, now);
  const missing = CURRENCIES.map(cur => {
    const previo = findStatement(statements, card.id, closed.key, cur);
    const dueDate = previo && previo.dueDate ? new Date(previo.dueDate) : null;
    const sinLinea = !hasLine(card, cur);
    return {
      currency: cur,
      sinLinea,
      estimateGross: sinLinea ? 0 : openingAt(card, closed.end, cur) + spentSince(card, expenses, closed.end, cur),
      registrado: previo ? previo.amount : null,
      dueDate: dueDate && !isNaN(dueDate) ? dueDate : null,
    };
  });
  return missing.length ? { cycle: closed, missing } : null;
}
