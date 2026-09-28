import { describe, it, expect } from "vitest";
import { catSpend, getMonthData, isPEN, sumUSD, buildCatMap } from "./selectors";
import { getMonthLabel } from "../lib/dates";

// F10: los gastos en dólares NUNCA entran a los totales en soles.
const mes = getMonthLabel(0);
const data = () => ({
  expenses: [
    { id: "e1", amount: 100, month: mes, category: { id: "c1", name: "Comida", emoji: "🍽️" } },
    { id: "e2", amount: 50, month: mes, currency: "PEN", category: { id: "c1", name: "Comida", emoji: "🍽️" } },
    { id: "e3", amount: 30, month: mes, currency: "USD", category: { id: "c1", name: "Comida", emoji: "🍽️" } },
    { id: "e4", amount: 999, month: "Enero 1999", currency: "USD", category: null },
  ],
  fixed: [{ id: "f1", amount: 200, paid: true, month: mes }],
  incomeFixed: [{ id: "i1", amount: 1000, month: mes }],
  incomeExtra: [],
  categories: { gastos: [{ id: "c1", name: "Comida", emoji: "🍽️" }] },
  budgets: { c1: 300 },
});

describe("selectores por moneda", () => {
  it("isPEN trata el gasto sin currency como soles", () => {
    expect(isPEN({ amount: 10 })).toBe(true);
    expect(isPEN({ amount: 10, currency: "PEN" })).toBe(true);
    expect(isPEN({ amount: 10, currency: "USD" })).toBe(false);
  });

  it("catSpend ignora los gastos en dólares", () => {
    expect(catSpend(data(), mes)).toEqual({ c1: 150 });
  });

  it("getMonthData separa los dólares del total en soles", () => {
    const d = getMonthData(data(), 0);
    expect(d.totalDiarios).toBe(150);
    expect(d.totalDiariosUSD).toBe(30);
    expect(d.balance).toBe(650); // 1000 − 200 fijos pagados − 150 soles
  });

  it("el balance del mes no se mueve por un gasto en dólares", () => {
    const sinUsd = data();
    sinUsd.expenses = sinUsd.expenses.filter(e => e.currency !== "USD");
    expect(getMonthData(sinUsd, 0).balance).toBe(getMonthData(data(), 0).balance);
  });

  it("la lista del mes sí incluye los gastos en dólares (para poder verlos)", () => {
    expect(getMonthData(data(), 0).exps).toHaveLength(3);
  });

  it("sumUSD suma solo los dólares de lo que le pasen", () => {
    expect(sumUSD(data().expenses)).toBe(1029);
    expect(sumUSD([])).toBe(0);
  });

  it("buildCatMap no filtra moneda: agrupa lo que le pasen (lo usa el ciclo por moneda)", () => {
    const grupos = buildCatMap(data().expenses.filter(e => e.currency === "USD"));
    expect(grupos.reduce((s, g) => s + g.amount, 0)).toBe(1029);
  });
});
