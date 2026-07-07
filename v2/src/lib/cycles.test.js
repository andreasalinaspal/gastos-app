import { describe, it, expect } from "vitest";
import { getCycleFor, getCycleSpend, getLineUsage } from "./cycles";

const card = (over = {}) => ({
  id: "card-1", type: "credito", name: "Visa BCP",
  cutoffDay: 25, paymentDay: 15, creditLine: 3000, color: "#6C5CE7", archived: false,
  ...over,
});

const ymd = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};

describe("getCycleFor — corte 25", () => {
  it("un gasto el día 26 cae en el ciclo NUEVO (el ciclo termina el día del corte inclusive)", () => {
    const c = getCycleFor(card(), new Date(2026, 2, 26)); // 26 mar 2026
    expect(ymd(c.start)).toBe("2026-03-26");
    expect(ymd(c.end)).toBe("2026-04-25");
    expect(c.key).toBe("2026-04-25");
    expect(c.dayOfCycle).toBe(1);
  });

  it("el día del corte pertenece al ciclo que cierra ese día", () => {
    const c = getCycleFor(card(), new Date(2026, 2, 25)); // 25 mar 2026
    expect(ymd(c.start)).toBe("2026-02-26");
    expect(ymd(c.end)).toBe("2026-03-25");
    expect(c.key).toBe("2026-03-25");
    expect(c.dayOfCycle).toBe(c.totalDays);
  });

  it("la hora del día no cambia el ciclo (fecha con hora tardía en el día de corte)", () => {
    const c = getCycleFor(card(), new Date(2026, 2, 25, 23, 59));
    expect(c.key).toBe("2026-03-25");
  });

  it("paymentDate = paymentDay del mes siguiente al corte", () => {
    const c = getCycleFor(card(), new Date(2026, 2, 10));
    expect(c.key).toBe("2026-03-25");
    expect(ymd(c.paymentDate)).toBe("2026-04-15");
  });
});

describe("getCycleFor — corte 31 en meses cortos (clamp)", () => {
  it("febrero no bisiesto: corte clampa al 28", () => {
    const c = getCycleFor(card({ cutoffDay: 31 }), new Date(2025, 1, 10)); // 10 feb 2025
    expect(ymd(c.start)).toBe("2025-02-01"); // día siguiente al corte anterior (31 ene)
    expect(ymd(c.end)).toBe("2025-02-28");
    expect(c.key).toBe("2025-02-28");
    expect(c.totalDays).toBe(28);
  });

  it("febrero bisiesto: corte clampa al 29", () => {
    const c = getCycleFor(card({ cutoffDay: 31 }), new Date(2024, 1, 10)); // 10 feb 2024
    expect(ymd(c.end)).toBe("2024-02-29");
    expect(c.totalDays).toBe(29);
  });

  it("el 1 de marzo abre ciclo nuevo tras el corte clampeado de febrero", () => {
    const c = getCycleFor(card({ cutoffDay: 31 }), new Date(2025, 2, 1)); // 1 mar 2025
    expect(ymd(c.start)).toBe("2025-03-01");
    expect(ymd(c.end)).toBe("2025-03-31");
    expect(c.dayOfCycle).toBe(1);
  });

  it("paymentDay 31 también clampa (corte ene → pago feb 28)", () => {
    const c = getCycleFor(card({ cutoffDay: 25, paymentDay: 31 }), new Date(2026, 0, 10)); // 10 ene 2026
    expect(c.key).toBe("2026-01-25");
    expect(ymd(c.paymentDate)).toBe("2026-02-28");
  });
});

describe("getCycleFor — corte día 1", () => {
  it("el día 15 cae en el ciclo que cierra el 1 del mes siguiente", () => {
    const c = getCycleFor(card({ cutoffDay: 1 }), new Date(2026, 0, 15)); // 15 ene 2026
    expect(ymd(c.start)).toBe("2026-01-02");
    expect(ymd(c.end)).toBe("2026-02-01");
    expect(c.key).toBe("2026-02-01");
  });

  it("el día 1 pertenece al ciclo que cierra ese mismo día", () => {
    const c = getCycleFor(card({ cutoffDay: 1 }), new Date(2026, 0, 1)); // 1 ene 2026
    expect(ymd(c.start)).toBe("2025-12-02");
    expect(ymd(c.end)).toBe("2026-01-01");
  });
});

describe("getCycleFor — cruce de año (diciembre → enero)", () => {
  it("gasto el 28 dic cae en el ciclo que cierra el 25 ene del año siguiente", () => {
    const c = getCycleFor(card(), new Date(2025, 11, 28)); // 28 dic 2025
    expect(ymd(c.start)).toBe("2025-12-26");
    expect(ymd(c.end)).toBe("2026-01-25");
    expect(c.key).toBe("2026-01-25");
    expect(ymd(c.paymentDate)).toBe("2026-02-15");
  });

  it("ciclo que cierra el 25 dic paga en enero del año siguiente", () => {
    const c = getCycleFor(card(), new Date(2025, 11, 20)); // 20 dic 2025
    expect(c.key).toBe("2025-12-25");
    expect(ymd(c.paymentDate)).toBe("2026-01-15");
  });
});

describe("getCycleFor — dayOfCycle / totalDays coherentes", () => {
  it("totalDays = días entre start y end inclusive; dayOfCycle avanza de 1 a totalDays", () => {
    const c = card();
    const first = getCycleFor(c, new Date(2026, 2, 26));
    const last = getCycleFor(c, new Date(2026, 3, 25));
    expect(first.key).toBe(last.key);
    expect(first.totalDays).toBe(31); // 26 mar → 25 abr
    expect(first.dayOfCycle).toBe(1);
    expect(last.dayOfCycle).toBe(31);
    const mid = getCycleFor(c, new Date(2026, 3, 10));
    expect(mid.dayOfCycle).toBe(16);
    expect(mid.dayOfCycle).toBeLessThanOrEqual(mid.totalDays);
  });
});

describe("getCycleSpend", () => {
  const c = card();
  const other = card({ id: "card-2" });
  const expenses = [
    { id: "e1", amount: 100, paymentMethodId: "card-1", date: new Date(2026, 2, 26).toISOString() }, // ciclo 2026-04-25
    { id: "e2", amount: 50, paymentMethodId: "card-1", date: new Date(2026, 3, 25, 22, 0).toISOString() }, // mismo ciclo (día de corte)
    { id: "e3", amount: 999, paymentMethodId: "card-1", date: new Date(2026, 2, 25).toISOString() }, // ciclo anterior
    { id: "e4", amount: 999, paymentMethodId: "card-2", date: new Date(2026, 3, 10).toISOString() }, // otra tarjeta
    { id: "e5", amount: 999, paymentMethodId: null, date: new Date(2026, 3, 10).toISOString() }, // sin medio
  ];

  it("suma solo gastos de esa tarjeta cuya fecha cae en el ciclo", () => {
    expect(getCycleSpend(expenses, c, "2026-04-25")).toBe(150);
  });

  it("el ciclo anterior recoge su propio gasto", () => {
    expect(getCycleSpend(expenses, c, "2026-03-25")).toBe(999);
  });

  it("otra tarjeta ve solo lo suyo", () => {
    expect(getCycleSpend(expenses, other, "2026-04-25")).toBe(999);
  });

  it("sin gastos → 0", () => {
    expect(getCycleSpend([], c, "2026-04-25")).toBe(0);
  });
});

describe("getLineUsage", () => {
  const c = card({ creditLine: 1000 });
  const expenses = [
    { id: "e1", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 1, 10).toISOString() },
    { id: "e2", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 2, 10).toISOString() },
    { id: "e3", amount: 500, paymentMethodId: "card-2", date: new Date(2026, 2, 10).toISOString() }, // otra tarjeta
  ];

  it("pago parcial: balance = gastos − pagos", () => {
    const payments = [{ id: "p1", cardId: "card-1", amount: 150 }];
    const u = getLineUsage(c, expenses, payments);
    expect(u.balance).toBe(350);
    expect(u.pct).toBeCloseTo(35);
  });

  it("sin pagos: balance = total de gastos de la tarjeta", () => {
    const u = getLineUsage(c, expenses, []);
    expect(u.balance).toBe(500);
    expect(u.pct).toBeCloseTo(50);
  });

  it("pagos > gastos: balance clampeado a 0 hacia la UI", () => {
    const payments = [{ id: "p1", cardId: "card-1", amount: 800 }];
    const u = getLineUsage(c, expenses, payments);
    expect(u.balance).toBe(0);
    expect(u.pct).toBe(0);
  });

  it("creditLine falsy → pct 0", () => {
    const u = getLineUsage(card({ creditLine: 0 }), expenses, []);
    expect(u.pct).toBe(0);
    expect(u.balance).toBe(500);
  });

  it("ignora pagos de otras tarjetas", () => {
    const payments = [{ id: "p1", cardId: "card-2", amount: 400 }];
    const u = getLineUsage(c, expenses, payments);
    expect(u.balance).toBe(500);
  });
});
