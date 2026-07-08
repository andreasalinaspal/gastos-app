import { C } from "../theme";
import { genId } from "./format";
import { getCycleFor } from "./cycles";

// Simulador de tarjeta de crédito (F3): sandbox educativo para practicar el
// manejo de una TC sin riesgo. Funciones PURAS sobre data.education.simulatorState.
// P1 sagrado: este estado NUNCA toca data.expenses / data.cardPayments reales.

// Tarjeta ficticia constante del simulador.
export const SIM_CARD = {
  id: "sim-card",
  type: "credito",
  name: "Mi primera tarjeta",
  cutoffDay: 25,
  paymentDay: 15,
  creditLine: 1000,
  cycleBudget: 300,
  color: C.orange,
};

// TEA típica de TC peruana: 105% → tasa efectiva mensual ≈ 6.2%.
export const TEA = 1.05;
export const MONTHLY_RATE = Math.pow(1 + TEA, 1 / 12) - 1;

const round2 = (n) => Math.round(n * 100) / 100;

function startOfDay(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ISO estable al mediodía local: el "día" no cambia por zonas horarias cercanas.
function isoNoon(date) {
  const d = startOfDay(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString();
}

function addDays(date, n) {
  const d = startOfDay(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
}

// Saldo vivo del simulador (gastos − pagos), opcionalmente hasta una fecha inclusive.
export function getSimBalance(state, upTo) {
  const limit = upTo ? startOfDay(upTo) : null;
  const within = (iso) => !limit || startOfDay(new Date(iso)) <= limit;
  const spent = (state.expenses || []).reduce((s, e) => within(e.date) ? s + (Number(e.amount) || 0) : s, 0);
  const paid = (state.payments || []).reduce((s, p) => within(p.date) ? s + (Number(p.amount) || 0) : s, 0);
  return Math.max(0, round2(spent - paid));
}

// Pago mínimo típico: 5% del saldo con piso de S/25 (nunca más que el saldo).
export function getMinPayment(statementBalance) {
  return round2(Math.min(statementBalance, Math.max(statementBalance * 0.05, 25)));
}

export function initSimulator(realNow = new Date()) {
  return {
    startedAt: new Date(realNow).toISOString(),
    simNow: isoNoon(realNow),
    expenses: [],
    payments: [],
    interestAccrued: 0,
    score: 50,
    scoreLog: [],
    pendingDecision: null,
    lastClosedCycleKey: null,
  };
}

function applyScore(state, delta, reason, dateIso) {
  return {
    ...state,
    score: Math.max(0, Math.min(100, state.score + delta)),
    scoreLog: [...(state.scoreLog || []), { date: dateIso, delta, reason }].slice(-10),
  };
}

// Registra un gasto de práctica con fecha = simNow.
// → { ok: true, state } | { ok: false, error, state } (rechazo por línea llena: también enseña).
export function addSimExpense(state, { amount, description, category }) {
  const amt = round2(Number(amount) || 0);
  if (amt <= 0) return { ok: false, error: "Ingresa un monto válido", state };
  const balance = getSimBalance(state);
  if (balance + amt > SIM_CARD.creditLine) {
    return { ok: false, error: "Tarjeta rechazada 😬 — tu línea está llena", state };
  }
  const exp = {
    id: genId(),
    amount: amt,
    description: description || "Gasto de práctica",
    category: category || null,
    date: state.simNow,
    paymentMethodId: SIM_CARD.id,
  };
  return { ok: true, state: { ...state, expenses: [...state.expenses, exp] } };
}

// ¿Hay una decisión de pago cuya fecha ya llegó (simNow >= paymentDate)?
export function isDecisionDue(state) {
  if (!state?.pendingDecision) return false;
  return startOfDay(new Date(state.simNow)) >= startOfDay(new Date(state.pendingDecision.paymentDate));
}

// ¿Se puede avanzar? Bloqueado si la fecha de pago llegó y la decisión sigue pendiente.
export function canAdvance(state) {
  if (isDecisionDue(state)) return { ok: false, reason: "Tienes un pago pendiente" };
  return { ok: true, reason: null };
}

// Cierra el ciclo que termina en cycle.end: fija statementBalance (saldo vivo al corte,
// incluye deuda arrastrada) y penaliza utilización > 30% de la línea.
function closeCycle(state, cycle) {
  const statementBalance = getSimBalance(state, cycle.end);
  let out = { ...state, lastClosedCycleKey: cycle.key };
  if (statementBalance > 0) {
    out.pendingDecision = {
      cycleKey: cycle.key,
      statementBalance,
      paymentDate: isoNoon(cycle.paymentDate),
    };
  }
  if (statementBalance / SIM_CARD.creditLine > 0.30) {
    out = applyScore(out, -3, "Cerraste el ciclo usando más del 30% de tu línea", isoNoon(cycle.end));
  }
  return out;
}

// Avanza simNow 7 días procesando eventos EN ORDEN dentro de la ventana:
// 1) fecha de pago pendiente → clampa simNow ahí (la UI fuerza la decisión, nunca auto-resuelve);
// 2) cruce de corte → cierra ciclo y genera pendingDecision.
export function advanceWeek(state) {
  if (isDecisionDue(state)) return state; // bloqueado hasta resolver

  const from = startOfDay(new Date(state.simNow));
  const target = addDays(from, 7);

  // Fecha de pago pendiente dentro de la ventana → detener el tiempo ahí.
  if (state.pendingDecision) {
    const pd = startOfDay(new Date(state.pendingDecision.paymentDate));
    if (startOfDay(target) >= pd) {
      return { ...state, simNow: isoNoon(pd) };
    }
  }

  // Cruce de corte: el ciclo que contiene `from` termina antes de `target`.
  let out = state;
  const cycle = getCycleFor(SIM_CARD, from);
  if (startOfDay(target) > cycle.end) {
    out = closeCycle(out, cycle);
    // Robustez: si la nueva fecha de pago cayera dentro de la ventana, clampar también.
    if (out.pendingDecision) {
      const pd = startOfDay(new Date(out.pendingDecision.paymentDate));
      if (startOfDay(target) >= pd) return { ...out, simNow: isoNoon(pd) };
    }
  }

  return { ...out, simNow: isoNoon(target) };
}

// Resuelve la decisión de pago pendiente. choice = "total" | "minimo" | "nada".
// → { state, paid, interest, scoreDelta } para que la UI muestre las consecuencias.
export function resolvePayment(state, choice) {
  const pd = state.pendingDecision;
  if (!pd) return { state, paid: 0, interest: 0, scoreDelta: 0 };

  const bal = pd.statementBalance;
  let paid = 0, scoreDelta = 0, reason = "";
  if (choice === "total") {
    paid = bal;
    scoreDelta = 8;
    reason = "Pagaste todo: cero intereses";
  } else if (choice === "minimo") {
    paid = getMinPayment(bal);
    scoreDelta = 1;
    reason = "Pagaste el mínimo: sigues al día, pero la deuda genera intereses";
  } else {
    paid = 0;
    scoreDelta = -15;
    reason = "No pagaste: atraso reportado a las centrales de riesgo";
  }

  let out = { ...state, pendingDecision: null };
  if (paid > 0) {
    out.payments = [...out.payments, {
      id: genId(), amount: paid, date: pd.paymentDate, cycleKey: pd.cycleKey, cardId: SIM_CARD.id,
    }];
  }

  // Interés sobre lo no pagado, agregado como "gasto" especial del simulador.
  const unpaid = round2(bal - paid);
  const interest = unpaid > 0 ? round2(unpaid * MONTHLY_RATE) : 0;
  if (interest > 0) {
    out.expenses = [...out.expenses, {
      id: genId(),
      amount: interest,
      description: "Intereses",
      category: { emoji: "🔥", name: "Intereses" },
      date: pd.paymentDate,
      paymentMethodId: SIM_CARD.id,
    }];
    out.interestAccrued = round2((out.interestAccrued || 0) + interest);
  }

  out = applyScore(out, scoreDelta, reason, pd.paymentDate);
  return { state: out, paid, interest, scoreDelta };
}
