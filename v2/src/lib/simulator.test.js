import { describe, it, expect } from "vitest";
import {
  SIM_CARD, MONTHLY_RATE, initSimulator, addSimExpense, advanceWeek,
  resolvePayment, canAdvance, isDecisionDue, getSimBalance, getMinPayment,
} from "./simulator";

// Fecha base determinística: 1 jul 2026 → corte 25 jul, pago 15 ago.
const START = new Date(2026, 6, 1);

const ymd = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};

const withExpense = (state, amount) => {
  const r = addSimExpense(state, { amount, description: "test", category: null });
  expect(r.ok).toBe(true);
  return r.state;
};

// Avanza semanas hasta que la decisión esté en fecha (o se acaben los intentos).
const advanceUntilDue = (state, max = 10) => {
  let s = state;
  for (let i = 0; i < max && !isDecisionDue(s); i++) s = advanceWeek(s);
  return s;
};

describe("initSimulator", () => {
  it("arranca con score 50, sin gastos y simNow en la fecha real", () => {
    const s = initSimulator(START);
    expect(s.score).toBe(50);
    expect(s.expenses).toEqual([]);
    expect(s.payments).toEqual([]);
    expect(s.pendingDecision).toBeNull();
    expect(ymd(s.simNow)).toBe("2026-07-01");
  });
});

describe("addSimExpense — línea de crédito", () => {
  it("rechaza un gasto que excede la línea (línea llena)", () => {
    let s = withExpense(initSimulator(START), 900);
    const r = addSimExpense(s, { amount: 200, description: "tele", category: null });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/línea/);
    expect(r.state.expenses).toHaveLength(1); // no se agregó nada
  });

  it("acepta un gasto que llena exactamente la línea", () => {
    let s = withExpense(initSimulator(START), 900);
    const r = addSimExpense(s, { amount: 100, description: "justo", category: null });
    expect(r.ok).toBe(true);
    expect(getSimBalance(r.state)).toBe(1000);
  });
});

describe("advanceWeek — cruce de corte", () => {
  it("al cruzar el corte cierra el ciclo y genera la decisión de pago", () => {
    let s = withExpense(initSimulator(START), 200);
    // 1 jul → 8 → 15 → 22 → 29 (cruza el corte del 25)
    s = advanceWeek(advanceWeek(advanceWeek(s)));
    expect(s.pendingDecision).toBeNull();
    s = advanceWeek(s);
    expect(ymd(s.simNow)).toBe("2026-07-29");
    expect(s.lastClosedCycleKey).toBe("2026-07-25");
    expect(s.pendingDecision).not.toBeNull();
    expect(s.pendingDecision.statementBalance).toBe(200);
    expect(ymd(s.pendingDecision.paymentDate)).toBe("2026-08-15");
  });

  it("utilización ≤30% al corte NO penaliza el score", () => {
    let s = withExpense(initSimulator(START), 200); // 20% de 1000
    s = advanceUntilDue(s, 4);
    expect(s.score).toBe(50);
  });

  it("utilización >30% al corte penaliza −3 con su razón", () => {
    let s = withExpense(initSimulator(START), 400); // 40% de 1000
    for (let i = 0; i < 4; i++) s = advanceWeek(s);
    expect(s.score).toBe(47);
    expect(s.scoreLog.at(-1).reason).toMatch(/30% de tu línea/);
  });
});

describe("advanceWeek — fecha de pago bloquea", () => {
  it("clampa simNow en la fecha de pago y no avanza más hasta resolver", () => {
    let s = withExpense(initSimulator(START), 200);
    s = advanceUntilDue(s);
    expect(ymd(s.simNow)).toBe("2026-08-15"); // clampeado, no 19 ago
    expect(isDecisionDue(s)).toBe(true);
    expect(canAdvance(s)).toEqual({ ok: false, reason: "Tienes un pago pendiente" });
    const stuck = advanceWeek(s);
    expect(stuck.simNow).toBe(s.simNow); // no auto-resuelve ni avanza
    expect(stuck.pendingDecision).toEqual(s.pendingDecision);
  });
});

describe("resolvePayment", () => {
  const dueState = (amount) => advanceUntilDue(withExpense(initSimulator(START), amount));

  it("total: paga todo, cero intereses, score +8", () => {
    const s = dueState(200);
    const r = resolvePayment(s, "total");
    expect(r.paid).toBe(200);
    expect(r.interest).toBe(0);
    expect(r.state.score).toBe(58);
    expect(r.state.pendingDecision).toBeNull();
    expect(r.state.payments).toHaveLength(1);
    expect(r.state.payments[0].amount).toBe(200);
    expect(getSimBalance(r.state)).toBe(0);
    expect(r.state.expenses.filter(e => e.description === "Intereses")).toHaveLength(0);
  });

  it("mínimo: paga max(5%, 25) y el resto genera interés mensual (TEA 105%)", () => {
    const s = dueState(200);
    const min = getMinPayment(200); // max(10, 25) = 25
    expect(min).toBe(25);
    const r = resolvePayment(s, "minimo");
    expect(r.paid).toBe(25);
    const expectedInterest = Math.round((200 - 25) * MONTHLY_RATE * 100) / 100;
    expect(r.interest).toBe(expectedInterest);
    expect(r.state.interestAccrued).toBe(expectedInterest);
    expect(r.state.score).toBe(51);
    const intExp = r.state.expenses.at(-1);
    expect(intExp.description).toBe("Intereses");
    expect(intExp.category).toEqual({ emoji: "🔥", name: "Intereses" });
    expect(ymd(intExp.date)).toBe("2026-08-15");
  });

  it("mínimo con saldo alto usa el 5% (no el piso de 25)", () => {
    expect(getMinPayment(800)).toBe(40);
  });

  it("nada: score −15, interés sobre todo el saldo, atraso en scoreLog", () => {
    const s = dueState(200);
    const r = resolvePayment(s, "nada");
    expect(r.paid).toBe(0);
    expect(r.interest).toBe(Math.round(200 * MONTHLY_RATE * 100) / 100);
    expect(r.state.score).toBe(35);
    expect(r.state.scoreLog.at(-1).reason).toMatch(/centrales de riesgo/);
    expect(r.state.payments).toHaveLength(0);
  });

  it("la deuda arrastrada + intereses entra al statement del ciclo siguiente", () => {
    let s = dueState(200);
    s = resolvePayment(s, "minimo").state; // quedan 175 + intereses
    // avanzar hasta el próximo corte (25 ago)
    for (let i = 0; i < 3; i++) s = advanceWeek(s);
    expect(s.lastClosedCycleKey).toBe("2026-08-25");
    const carried = 200 - 25 + Math.round(175 * MONTHLY_RATE * 100) / 100;
    expect(s.pendingDecision.statementBalance).toBeCloseTo(carried, 2);
  });
});
