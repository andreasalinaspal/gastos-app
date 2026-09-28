import { describe, it, expect } from "vitest";
import { getCycleFor, getCycleSpend, getLineUsage, getNextPayment, getUpcomingTotal } from "./cycles";

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

// ── F6: deuda previa (openingBalance/openingDate), disponible y próximos pagos ──

const NOW = new Date(2026, 8, 27); // 27 sep 2026
// Para una tarjeta de corte 25: ciclo actual 26 sep → 25 oct; ciclo cerrado 26 ago → 25 sep
// (key 2026-09-25) y su pago vence el 15 oct 2026.

describe("getLineUsage — deuda previa y disponible", () => {
  const c = card({ creditLine: 3000, openingBalance: 1000, openingDate: new Date(2026, 8, 1).toISOString() });
  const expenses = [
    { id: "e0", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 7, 20).toISOString() }, // antes de openingDate
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 100, paymentMethodId: "card-1", date: new Date(2026, 8, 26).toISOString() },
  ];

  it("suma la deuda previa e ignora los gastos anteriores a openingDate", () => {
    const u = getLineUsage(c, expenses, [{ id: "p1", cardId: "card-1", amount: 150 }]);
    expect(u.balance).toBe(1150); // 1000 + 200 + 100 − 150
    expect(u.available).toBe(1850);
    expect(u.pct).toBeCloseTo(38.33, 1);
  });

  it("available = creditLine − balance y nunca es negativo", () => {
    const chico = card({ creditLine: 500, openingBalance: 900, openingDate: new Date(2026, 8, 1).toISOString() });
    const u = getLineUsage(chico, [], []);
    expect(u.balance).toBe(900);
    expect(u.available).toBe(0);
  });

  it("pagos mayores a la deuda dejan balance 0 y línea completa disponible", () => {
    const u = getLineUsage(c, expenses, [{ id: "p1", cardId: "card-1", amount: 5000 }]);
    expect(u.balance).toBe(0);
    expect(u.available).toBe(3000);
  });

  it("sin openingBalance/openingDate se comporta como antes (todo el historial cuenta)", () => {
    const u = getLineUsage(card({ creditLine: 1000 }), expenses, []);
    expect(u.balance).toBe(600); // 300 + 200 + 100
    expect(u.available).toBe(400);
  });

  it("creditLine 0 → pct y available en 0", () => {
    const u = getLineUsage(card({ creditLine: 0 }), expenses, []);
    expect(u.pct).toBe(0);
    expect(u.available).toBe(0);
  });
});

describe("getNextPayment", () => {
  const c = card({ creditLine: 3000, openingBalance: 1000, openingDate: new Date(2026, 8, 1).toISOString() });
  const expenses = [
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() }, // ciclo cerrado
    { id: "e2", amount: 100, paymentMethodId: "card-1", date: new Date(2026, 8, 26).toISOString() }, // ciclo actual
    { id: "e3", amount: 999, paymentMethodId: "card-2", date: new Date(2026, 8, 10).toISOString() }, // otra tarjeta
  ];

  it("cobra el estado de cuenta ya cerrado: deuda previa + gastos de ese ciclo", () => {
    const n = getNextPayment(c, expenses, [], NOW);
    expect(n.cycleKey).toBe("2026-09-25");
    expect(ymd(n.dueDate)).toBe("2026-10-15");
    expect(n.amount).toBe(1200); // 1000 previa + 200 del ciclo cerrado
    expect(n.status).toBe("por-vencer");
  });

  it("no incluye los gastos del ciclo actual (aún no cierra)", () => {
    const n = getNextPayment(c, expenses, [], NOW);
    expect(n.amount).toBe(1200); // el gasto del 26 sep queda para el siguiente estado de cuenta
  });

  it("pago parcial deja el resto por vencer", () => {
    const n = getNextPayment(c, expenses, [{ id: "p1", cardId: "card-1", amount: 500, cycleKey: "2026-09-25" }], NOW);
    expect(n.amount).toBe(700);
    expect(n.status).toBe("por-vencer");
  });

  it("pago total → al día con monto 0", () => {
    const n = getNextPayment(c, expenses, [{ id: "p1", cardId: "card-1", amount: 1200, cycleKey: "2026-09-25" }], NOW);
    expect(n.amount).toBe(0);
    expect(n.status).toBe("al-dia");
  });

  it("descuenta todo pago ya hecho, sin importar a qué ciclo quedó etiquetado", () => {
    // Un pago registrado hoy lleva el cycleKey del ciclo ABIERTO, pero en la vida real
    // liquida el estado de cuenta que está por vencer: tiene que descontar igual.
    const pagos = [
      { id: "p1", cardId: "card-1", amount: 400, cycleKey: "2026-08-25", date: new Date(2026, 7, 20).toISOString() },
      { id: "p2", cardId: "card-1", amount: 300, cycleKey: "2026-10-25", date: new Date(2026, 8, 27).toISOString() },
    ];
    expect(getNextPayment(c, expenses, pagos, NOW).amount).toBe(500); // 1200 − 400 − 300
  });

  it("un pago con fecha futura todavía no descuenta", () => {
    const pagos = [{ id: "p1", cardId: "card-1", amount: 500, date: new Date(2026, 9, 5).toISOString() }];
    expect(getNextPayment(c, expenses, pagos, NOW).amount).toBe(1200);
  });

  it("nunca devuelve monto negativo", () => {
    const n = getNextPayment(c, expenses, [{ id: "p1", cardId: "card-1", amount: 9000, cycleKey: "2026-09-25" }], NOW);
    expect(n.amount).toBe(0);
  });

  it("sin gastos ni deuda previa → al día", () => {
    const n = getNextPayment(card({ openingBalance: 0, openingDate: new Date(2026, 8, 1).toISOString() }), [], [], NOW);
    expect(n.status).toBe("al-dia");
    expect(n.amount).toBe(0);
    expect(ymd(n.dueDate)).toBe("2026-10-15");
  });

  it("una deuda previa declarada DESPUÉS del corte cerrado no se cobra todavía", () => {
    const reciente = card({ openingBalance: 500, openingDate: new Date(2026, 8, 26).toISOString() });
    const n = getNextPayment(reciente, expenses, [], NOW);
    expect(n.amount).toBe(0);
    expect(n.status).toBe("al-dia");
  });

  it("ignora los pagos de otras tarjetas", () => {
    const n = getNextPayment(c, expenses, [{ id: "p1", cardId: "card-2", amount: 9000, cycleKey: "2026-09-25" }], NOW);
    expect(n.amount).toBe(1200);
  });
});

describe("getUpcomingTotal", () => {
  // Corte 25 / pago 15 → corte 25 sep, vence 15 oct.
  // Corte 5 / pago 2 → corte 5 sep, vence 2 oct (el más cercano).
  const bcp = card({ id: "card-1", name: "BCP", cutoffDay: 25, paymentDay: 15, creditLine: 3000 });
  const ripley = card({ id: "card-2", name: "Ripley", cutoffDay: 5, paymentDay: 2, creditLine: 1000 });
  const archivada = card({ id: "card-3", name: "Vieja", archived: true });
  const efectivo = { id: "pm1", type: "efectivo", name: "Efectivo" };
  const expenses = [
    { id: "e1", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 120, paymentMethodId: "card-2", date: new Date(2026, 8, 5).toISOString() },
    { id: "e3", amount: 500, paymentMethodId: "card-3", date: new Date(2026, 8, 5).toISOString() },
  ];

  it("ordena por fecha de vencimiento y suma el total", () => {
    const up = getUpcomingTotal([bcp, ripley, archivada, efectivo], expenses, [], NOW);
    expect(up.items).toHaveLength(2); // ignora archivadas y medios que no son TC
    expect(up.items.map(i => i.card.name)).toEqual(["Ripley", "BCP"]);
    expect(ymd(up.items[0].dueDate)).toBe("2026-10-02");
    expect(ymd(up.items[1].dueDate)).toBe("2026-10-15");
    expect(up.total).toBe(420);
    expect(up.total30).toBe(420);
  });

  it("incluye días restantes y el disponible de cada tarjeta", () => {
    const up = getUpcomingTotal([bcp, ripley], expenses, [], NOW);
    expect(up.items[0].days).toBe(5); // 27 sep → 2 oct
    expect(up.items[0].available).toBe(880); // 1000 − 120
    expect(up.items[1].days).toBe(18);
    expect(up.items[1].available).toBe(2700);
  });

  it("total30 excluye lo que vence más allá de 30 días", () => {
    const lejana = card({ id: "card-4", name: "Lejana", cutoffDay: 25, paymentDay: 30, creditLine: 2000 });
    const exps = [{ id: "e9", amount: 700, paymentMethodId: "card-4", date: new Date(2026, 8, 10).toISOString() }];
    const up = getUpcomingTotal([lejana], exps, [], NOW);
    expect(ymd(up.items[0].dueDate)).toBe("2026-10-30"); // 33 días
    expect(up.items[0].days).toBe(33);
    expect(up.total).toBe(700);
    expect(up.total30).toBe(0);
  });

  it("todas al día → total 0 pero con su detalle", () => {
    const pagos = [
      { id: "p1", cardId: "card-1", amount: 300, cycleKey: "2026-09-25" },
      { id: "p2", cardId: "card-2", amount: 120, cycleKey: "2026-09-05" },
    ];
    const up = getUpcomingTotal([bcp, ripley], expenses, pagos, NOW);
    expect(up.total).toBe(0);
    expect(up.items.every(i => i.status === "al-dia")).toBe(true);
  });

  it("sin tarjetas → total 0 y lista vacía", () => {
    const up = getUpcomingTotal([], expenses, [], NOW);
    expect(up.total).toBe(0);
    expect(up.items).toEqual([]);
  });
});
