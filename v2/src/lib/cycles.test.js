import { describe, it, expect } from "vitest";
import { getCycleFor, getCycleSpend, getLineUsage, getSharedUsage, getBalanceBreakdown, getNextPayment, getUpcomingTotal, getCardLine, cardCurrencies, hasLine, getStatementPrompt, findStatement, getClosedCycle, curOf, buildStatementEntry } from "./cycles";

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
    const up = getUpcomingTotal([bcp, ripley, archivada, efectivo], expenses, [], NOW).PEN;
    expect(up.items).toHaveLength(2); // ignora archivadas y medios que no son TC
    expect(up.items.map(i => i.card.name)).toEqual(["Ripley", "BCP"]);
    expect(ymd(up.items[0].dueDate)).toBe("2026-10-02");
    expect(ymd(up.items[1].dueDate)).toBe("2026-10-15");
    expect(up.total).toBe(420);
    expect(up.total30).toBe(420);
  });

  it("incluye días restantes y el disponible de cada tarjeta", () => {
    const up = getUpcomingTotal([bcp, ripley], expenses, [], NOW).PEN;
    expect(up.items[0].days).toBe(5); // 27 sep → 2 oct
    expect(up.items[0].available).toBe(880); // 1000 − 120
    expect(up.items[1].days).toBe(18);
    expect(up.items[1].available).toBe(2700);
  });

  it("total30 excluye lo que vence más allá de 30 días", () => {
    const lejana = card({ id: "card-4", name: "Lejana", cutoffDay: 25, paymentDay: 30, creditLine: 2000 });
    const exps = [{ id: "e9", amount: 700, paymentMethodId: "card-4", date: new Date(2026, 8, 10).toISOString() }];
    const up = getUpcomingTotal([lejana], exps, [], NOW).PEN;
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
    const up = getUpcomingTotal([bcp, ripley], expenses, pagos, NOW).PEN;
    expect(up.total).toBe(0);
    expect(up.items.every(i => i.status === "al-dia")).toBe(true);
  });

  it("sin tarjetas → total 0 y lista vacía", () => {
    const up = getUpcomingTotal([], expenses, [], NOW).PEN;
    expect(up.total).toBe(0);
    expect(up.items).toEqual([]);
  });
});

// ── F10: dos monedas por tarjeta (soles y dólares, nunca sumadas) ──

describe("getCardLine / cardCurrencies", () => {
  const dosMonedas = card({ lines: { PEN: { creditLine: 3000, openingBalance: 500 }, USD: { creditLine: 1000, openingBalance: 100 } } });

  it("lee la línea de cada moneda", () => {
    expect(getCardLine(dosMonedas, "PEN")).toMatchObject({ creditLine: 3000, openingBalance: 500 });
    expect(getCardLine(dosMonedas, "USD")).toMatchObject({ creditLine: 1000, openingBalance: 100 });
  });

  it("sin `lines` cae a los campos planos como soles (tarjeta pre-v4 / simulador)", () => {
    const plana = card({ creditLine: 2000, openingBalance: 300 });
    expect(getCardLine(plana, "PEN")).toMatchObject({ creditLine: 2000, openingBalance: 300 });
    expect(getCardLine(plana, "USD")).toBe(null);
  });

  it("sin moneda pedida asume soles", () => {
    expect(getCardLine(dosMonedas)).toMatchObject({ creditLine: 3000, openingBalance: 500 });
  });

  it("cardCurrencies: soles primero, dólares solo si está configurado", () => {
    expect(cardCurrencies(dosMonedas)).toEqual(["PEN", "USD"]);
    expect(cardCurrencies(card({ creditLine: 2000 }))).toEqual(["PEN"]);
    expect(hasLine(dosMonedas, "USD")).toBe(true);
    expect(hasLine(card({ creditLine: 2000 }), "USD")).toBe(false);
  });
});

describe("getLineUsage por moneda", () => {
  const c = card({ openingDate: new Date(2026, 8, 1).toISOString(), lines: { PEN: { creditLine: 3000, openingBalance: 1000 }, USD: { creditLine: 1000, openingBalance: 200 } } });
  const expenses = [
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() }, // sin currency → soles
    { id: "e2", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 8, 12).toISOString(), currency: "PEN" },
    { id: "e3", amount: 140, paymentMethodId: "card-1", date: new Date(2026, 8, 13).toISOString(), currency: "USD" },
  ];
  const payments = [
    { id: "p1", cardId: "card-1", amount: 100 }, // sin currency → soles
    { id: "p2", cardId: "card-1", amount: 40, currency: "USD" },
  ];

  it("los soles no ven los gastos en dólares", () => {
    const u = getLineUsage(c, expenses, payments, "PEN");
    expect(u.balance).toBe(1400); // 1000 + 200 + 300 − 100
    expect(u.available).toBe(1600);
    expect(u.creditLine).toBe(3000);
  });

  it("los dólares no ven los gastos en soles", () => {
    const u = getLineUsage(c, expenses, payments, "USD");
    expect(u.balance).toBe(300); // 200 + 140 − 40
    expect(u.available).toBe(700);
    expect(u.currency).toBe("USD");
  });

  it("los dos saldos son independientes: pagar en dólares no mueve los soles", () => {
    const antes = getLineUsage(c, expenses, [], "PEN").balance;
    const despues = getLineUsage(c, expenses, [{ id: "px", cardId: "card-1", amount: 500, currency: "USD" }], "PEN").balance;
    expect(despues).toBe(antes);
  });

  it("gasto en dólares sobre una tarjeta sin línea en dólares no altera nada", () => {
    const soloSoles = card({ creditLine: 3000 });
    const usd = getLineUsage(soloSoles, expenses, payments, "USD");
    expect(usd).toEqual({ balance: 0, pct: 0, available: 0, creditLine: 0, currency: "USD" });
    expect(getLineUsage(soloSoles, expenses, payments, "PEN").balance).toBe(400); // 200 + 300 − 100
  });

  it("sin moneda explícita se comporta como antes (soles)", () => {
    expect(getLineUsage(c, expenses, payments)).toEqual(getLineUsage(c, expenses, payments, "PEN"));
  });
});

// ── F18: la línea es UNA, compartida entre monedas ──
//
// Cómo funciona de verdad: el banco da una sola línea en soles (IBK, S/6,000) y
// las compras en dólares salen de ahí, convertidas a su tipo de cambio. Antes esto
// estaba mal modelado como dos cupos independientes.

describe("getSharedUsage", () => {
  // Línea única de S/6,000, sin cupo propio en dólares (creditLine 0 a propósito).
  const c = card({
    openingDate: new Date(2026, 8, 1).toISOString(),
    lines: { PEN: { creditLine: 6000, openingBalance: 1000 }, USD: { creditLine: 0, openingBalance: 200 } },
  });
  const expenses = [
    { id: "e1", amount: 500, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 100, paymentMethodId: "card-1", date: new Date(2026, 8, 12).toISOString(), currency: "USD" },
  ];

  it("lo consumido en dólares ocupa la misma línea, convertido a soles", () => {
    const u = getSharedUsage(c, expenses, [], 4);
    expect(u.balancePEN).toBe(1500); // 1000 + 500
    expect(u.balanceUSD).toBe(300);  // 200 + 100
    expect(u.usdEnSoles).toBe(1200); // 300 × 4
    expect(u.usado).toBe(2700);
    expect(u.available).toBe(3300);  // 6000 − 2700
    expect(u.creditLine).toBe(6000);
    expect(u.pct).toBeCloseTo(45);
  });

  it("marca el disponible como aproximado cuando hay deuda en dólares", () => {
    expect(getSharedUsage(c, expenses, [], 4).aproximado).toBe(true);
    expect(getSharedUsage(c, expenses, [], 4).tieneUsd).toBe(true);
  });

  it("sin dólares se comporta como la línea en soles de siempre", () => {
    const soloSoles = card({ creditLine: 6000, openingBalance: 1000 });
    const u = getSharedUsage(soloSoles, [expenses[0]], [], 4);
    expect(u.usado).toBe(1500);
    expect(u.available).toBe(4500);
    expect(u.tieneUsd).toBe(false);
    expect(u.aproximado).toBe(false);
    expect(u.faltaTasa).toBe(false);
  });

  it("sin tipo de cambio no inventa la conversión: avisa con faltaTasa", () => {
    const u = getSharedUsage(c, expenses, [], null);
    expect(u.faltaTasa).toBe(true);
    expect(u.usdEnSoles).toBe(0);
    expect(u.usado).toBe(1500);   // solo los soles
    expect(u.balanceUSD).toBe(300); // la deuda en dólares sigue reportada
  });

  it("una tasa inválida se trata como si no hubiera", () => {
    for (const t of [0, -3, "x", NaN, undefined]) {
      expect(getSharedUsage(c, expenses, [], t).faltaTasa).toBe(true);
    }
  });

  it("pagar en dólares libera línea", () => {
    const antes = getSharedUsage(c, expenses, [], 4).available;
    const despues = getSharedUsage(c, expenses, [{ id: "p1", cardId: "card-1", amount: 300, currency: "USD" }], 4).available;
    expect(despues).toBe(antes + 1200); // 300 × 4
  });

  it("no da disponible negativo aunque se pase de la línea", () => {
    const chica = card({ lines: { PEN: { creditLine: 1000, openingBalance: 0 }, USD: { creditLine: 0, openingBalance: 500 } } });
    const u = getSharedUsage(chica, [], [], 4);
    expect(u.usado).toBe(2000);
    expect(u.available).toBe(0);
    expect(u.pct).toBe(200);
  });

  it("sin línea declarada no divide por cero", () => {
    const u = getSharedUsage(card({ creditLine: 0 }), expenses, [], 4);
    expect(u.pct).toBe(0);
    expect(u.available).toBe(0);
  });
});

// ── F19: por qué el saldo no cuadra con lo que hay que pagar ──
//
// Su pregunta textual: "no cuadra el total de mi tarjeta y el disponible porque
// estoy dentro de mi ciclo de facturación y estoy gastando". El desglose tiene
// que SUMAR el saldo exacto siempre.

describe("getBalanceBreakdown", () => {
  // Corte 11, pago 5. "Hoy" = 28 set → el ciclo cerrado es el del 11 set y el
  // abierto va del 12 set al 11 oct.
  const c = card({
    cutoffDay: 11, paymentDay: 5,
    openingDate: new Date(2026, 7, 12).toISOString(),
    lines: { PEN: { creditLine: 6000, openingBalance: 3735 } },
  });
  const hoy = new Date(2026, 8, 28);
  const enCurso = [
    { id: "e1", amount: 400, paymentMethodId: "card-1", date: new Date(2026, 8, 20).toISOString() },
    { id: "e2", amount: 222.36, paymentMethodId: "card-1", date: new Date(2026, 8, 26).toISOString() },
  ];
  // El banco ya facturó S/3,735 del ciclo que cerró el 11 set.
  const statements = [{ id: "s1", cardId: "card-1", cycleKey: "2026-09-11", currency: "PEN", amount: 3735, dueDate: new Date(2026, 9, 5).toISOString() }];

  it("parte el saldo en lo ya facturado y lo del ciclo abierto", () => {
    const d = getBalanceBreakdown(c, enCurso, [], hoy, "PEN", statements);
    expect(d.saldo).toBeCloseTo(4357.36);
    expect(d.facturado).toBe(3735);           // lo que vence el 5 oct
    expect(d.delCiclo).toBeCloseTo(622.36);   // saldo − facturado
    expect(d.registrado).toBeCloseTo(622.36); // lo que ella anotó
    expect(d.sinRegistrar).toBe(0);           // cuadran
    expect(d.source).toBe("banco");
  });

  // Lo que ella pidió: actualizar el saldo del banco y que Qori saque sola
  // cuánto lleva gastado en el ciclo, sin haber anotado ni una compra.
  it("calcula el gasto del ciclo solo con el saldo, sin gastos registrados", () => {
    const soloSaldo = card({
      cutoffDay: 11, paymentDay: 5,
      openingDate: hoy.toISOString(), // la foto del saldo es de hoy
      lines: { PEN: { creditLine: 6000, openingBalance: 4357.36 } },
    });
    const d = getBalanceBreakdown(soloSaldo, [], [], hoy, "PEN", statements);
    expect(d.saldo).toBeCloseTo(4357.36);
    expect(d.delCiclo).toBeCloseTo(622.36);
    expect(d.registrado).toBe(0);
    expect(d.sinRegistrar).toBeCloseTo(622.36); // todo eso le falta anotar
  });

  it("lo registrado solo cuenta los gastos posteriores al último corte", () => {
    // El del 5 set cae en el ciclo que YA cerró: está dentro del estado de cuenta.
    const conViejo = [...enCurso, { id: "e0", amount: 1000, paymentMethodId: "card-1", date: new Date(2026, 8, 5).toISOString() }];
    const d = getBalanceBreakdown(c, conViejo, [], hoy, "PEN", statements);
    expect(d.registrado).toBeCloseTo(622.36);
  });

  it("pagar el estado de cuenta deja solo lo del ciclo abierto", () => {
    const pagos = [{ id: "p1", cardId: "card-1", amount: 3735, date: new Date(2026, 9, 1).toISOString() }];
    const d = getBalanceBreakdown(c, enCurso, pagos, new Date(2026, 9, 2), "PEN", statements);
    expect(d.facturado).toBe(0);
    expect(d.status).toBe("al-dia");
    expect(d.delCiclo).toBeCloseTo(622.36);
    expect(d.sinRegistrar).toBe(0);
  });

  it("avisa cuando el estado de cuenta pide más de lo que dice el saldo", () => {
    // El banco facturó S/5,000 sobre un saldo de S/4,357.36 (intereses, membresía).
    const infladas = [{ id: "s2", cardId: "card-1", cycleKey: "2026-09-11", currency: "PEN", amount: 5000 }];
    const d = getBalanceBreakdown(c, enCurso, [], hoy, "PEN", infladas);
    expect(d.facturado).toBe(5000);
    expect(d.excedeSaldo).toBe(true);
    expect(d.delCiclo).toBe(0); // nunca negativo
  });

  // Actualizar el saldo NO debe borrar de la vista lo que ya tenía anotado en el
  // ciclo: si no, la app le diría "te falta anotar" algo que ya anotó.
  it("lo anotado del ciclo sobrevive a actualizar el saldo", () => {
    const recienActualizada = card({
      cutoffDay: 11, paymentDay: 5,
      openingDate: hoy.toISOString(), // foto del saldo tomada HOY
      lines: { PEN: { creditLine: 6000, openingBalance: 4357.36 } },
    });
    const d = getBalanceBreakdown(recienActualizada, enCurso, [], hoy, "PEN", statements);
    expect(d.delCiclo).toBeCloseTo(622.36);
    expect(d.registrado).toBeCloseTo(622.36); // los gastos del 20 y 26, aunque sean previos a la foto
    expect(d.sinRegistrar).toBe(0);           // cuadra: no le falta anotar nada
  });

  it("marca lo anotado de más cuando pasa lo que dice el saldo", () => {
    // Anotó S/900 pero su saldo solo da para S/622.36 de ciclo abierto.
    const deMas = [{ id: "x1", amount: 900, paymentMethodId: "card-1", date: new Date(2026, 8, 20).toISOString() }];
    const conSaldoFijo = card({
      cutoffDay: 11, paymentDay: 5,
      openingDate: hoy.toISOString(),
      lines: { PEN: { creditLine: 6000, openingBalance: 4357.36 } },
    });
    const d = getBalanceBreakdown(conSaldoFijo, deMas, [], hoy, "PEN", statements);
    expect(d.delCiclo).toBeCloseTo(622.36);
    expect(d.registrado).toBe(900);
    expect(d.sinRegistrar).toBeCloseTo(-277.64);
  });

  it("sin estado de cuenta usa el estimado", () => {
    const d = getBalanceBreakdown(c, enCurso, [], hoy, "PEN", null);
    expect(d.source).toBe("estimado");
    expect(d.facturado + d.delCiclo).toBeCloseTo(d.saldo);
  });

  it("cada moneda se desglosa por su lado", () => {
    const bi = card({
      cutoffDay: 11, paymentDay: 5, openingDate: new Date(2026, 7, 12).toISOString(),
      lines: { PEN: { creditLine: 6000, openingBalance: 100 }, USD: { creditLine: 0, openingBalance: 50 } },
    });
    const gastos = [{ id: "u1", amount: 20, paymentMethodId: "card-1", currency: "USD", date: new Date(2026, 8, 20).toISOString() }];
    expect(getBalanceBreakdown(bi, gastos, [], hoy, "PEN", null).saldo).toBe(100);
    expect(getBalanceBreakdown(bi, gastos, [], hoy, "USD", null).saldo).toBe(70);
  });
});

describe("getCycleSpend por moneda", () => {
  const c = card({ lines: { PEN: { creditLine: 3000, openingBalance: 0 }, USD: { creditLine: 1000, openingBalance: 0 } } });
  const expenses = [
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 50, paymentMethodId: "card-1", date: new Date(2026, 8, 11).toISOString(), currency: "USD" },
  ];

  it("cada moneda suma solo lo suyo dentro del ciclo", () => {
    expect(getCycleSpend(expenses, c, "2026-09-25", "PEN")).toBe(200);
    expect(getCycleSpend(expenses, c, "2026-09-25", "USD")).toBe(50);
    expect(getCycleSpend(expenses, c, "2026-09-25")).toBe(200); // default soles
  });
});

describe("getNextPayment — el estado de cuenta del banco le gana al estimado", () => {
  const c = card({ openingDate: new Date(2026, 8, 1).toISOString(), lines: { PEN: { creditLine: 3000, openingBalance: 1000 }, USD: { creditLine: 1000, openingBalance: 0 } } });
  const expenses = [
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 80, paymentMethodId: "card-1", date: new Date(2026, 8, 11).toISOString(), currency: "USD" },
  ];
  const statement = (over = {}) => ({ id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 1275.4, dueDate: new Date(2026, 9, 16).toISOString(), registeredAt: new Date(2026, 8, 26).toISOString(), ...over });

  it("sin estatement devuelve el estimado y lo dice", () => {
    const n = getNextPayment(c, expenses, [], NOW, "PEN", []);
    expect(n.amount).toBe(1200);
    expect(n.source).toBe("estimado");
    expect(n.statementAmount).toBe(null);
    expect(n.estimateGross).toBe(1200);
  });

  it("con estatement manda el monto del banco y su fecha de vencimiento", () => {
    const n = getNextPayment(c, expenses, [], NOW, "PEN", [statement()]);
    expect(n.amount).toBe(1275.4);
    expect(n.source).toBe("banco");
    expect(n.statementAmount).toBe(1275.4);
    expect(n.estimateGross).toBe(1200); // el estimado queda para comparar
    expect(ymd(n.dueDate)).toBe("2026-10-16");
  });

  it("el estatement de otra moneda no se cruza", () => {
    const n = getNextPayment(c, expenses, [], NOW, "USD", [statement()]);
    expect(n.source).toBe("estimado");
    expect(n.amount).toBe(80);
  });

  it("estatement en dólares: manda en dólares y no toca los soles", () => {
    const sts = [statement({ id: "s2", currency: "USD", amount: 95, dueDate: undefined })];
    const usd = getNextPayment(c, expenses, [], NOW, "USD", sts);
    expect(usd.amount).toBe(95);
    expect(usd.source).toBe("banco");
    expect(ymd(usd.dueDate)).toBe("2026-10-15"); // sin dueDate propia usa la calculada
    expect(getNextPayment(c, expenses, [], NOW, "PEN", sts).amount).toBe(1200);
  });

  it("el estatement de otro ciclo no aplica", () => {
    const n = getNextPayment(c, expenses, [], NOW, "PEN", [statement({ cycleKey: "2026-08-25" })]);
    expect(n.source).toBe("estimado");
  });

  it("los pagos descuentan del monto oficial y dejan al día", () => {
    const pagos = [{ id: "p1", cardId: "card-1", amount: 1275.4, date: new Date(2026, 8, 27).toISOString() }];
    const n = getNextPayment(c, expenses, pagos, NOW, "PEN", [statement()]);
    expect(n.amount).toBe(0);
    expect(n.status).toBe("al-dia");
  });

  it("un pago en dólares no liquida la deuda en soles", () => {
    const pagos = [{ id: "p1", cardId: "card-1", amount: 2000, currency: "USD" }];
    expect(getNextPayment(c, expenses, pagos, NOW, "PEN", []).amount).toBe(1200);
  });

  it("compatibilidad: llamado sin moneda ni statements se comporta como antes", () => {
    const n = getNextPayment(c, expenses, [], NOW);
    expect(n.amount).toBe(1200);
    expect(n.currency).toBe("PEN");
    expect(n.source).toBe("estimado");
  });
});

describe("getUpcomingTotal — totales SEPARADOS por moneda", () => {
  const bcp = card({ id: "card-1", name: "BCP", cutoffDay: 25, paymentDay: 15, lines: { PEN: { creditLine: 3000, openingBalance: 0 }, USD: { creditLine: 1000, openingBalance: 0 } } });
  const ripley = card({ id: "card-2", name: "Ripley", cutoffDay: 5, paymentDay: 2, creditLine: 1000 }); // solo soles
  const expenses = [
    { id: "e1", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 340, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString(), currency: "USD" },
    { id: "e3", amount: 120, paymentMethodId: "card-2", date: new Date(2026, 8, 5).toISOString() },
  ];

  it("devuelve un bloque por moneda, nunca un total mezclado", () => {
    const up = getUpcomingTotal([bcp, ripley], expenses, [], NOW);
    expect(Object.keys(up).sort()).toEqual(["PEN", "USD"]);
    expect(up.PEN.total).toBe(420); // 300 + 120
    expect(up.USD.total).toBe(340);
    expect(up.total).toBeUndefined();
  });

  it("solo las tarjetas con línea en dólares entran al bloque de dólares", () => {
    const up = getUpcomingTotal([bcp, ripley], expenses, [], NOW);
    expect(up.PEN.items.map(i => i.card.name)).toEqual(["Ripley", "BCP"]);
    expect(up.USD.items.map(i => i.card.name)).toEqual(["BCP"]);
  });

  it("el estatement oficial manda en cada bloque", () => {
    const sts = [{ id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 355, dueDate: new Date(2026, 9, 15).toISOString() }];
    const up = getUpcomingTotal([bcp, ripley], expenses, [], NOW, sts);
    expect(up.PEN.total).toBe(475); // 355 del banco + 120 estimado de Ripley
    expect(up.PEN.items.find(i => i.card.id === "card-1").source).toBe("banco");
    expect(up.USD.total).toBe(340); // los dólares siguen estimados
    expect(up.USD.items[0].source).toBe("estimado");
  });

  it("un gasto en dólares no infla el total en soles", () => {
    const sinUsd = expenses.filter(e => e.currency !== "USD");
    expect(getUpcomingTotal([bcp, ripley], sinUsd, [], NOW).PEN.total).toBe(getUpcomingTotal([bcp, ripley], expenses, [], NOW).PEN.total);
  });

  // F12: una fecha de vencimiento POR MONEDA. El statement de dólares puede
  // vencer otro día que el de soles y eso tiene que verse en el orden y en los días.
  it("una fecha distinta en dólares cambia el orden y los días de ese bloque", () => {
    const otra = card({ id: "card-3", name: "Amex", cutoffDay: 25, paymentDay: 20, lines: { PEN: { creditLine: 4000, openingBalance: 0 }, USD: { creditLine: 800, openingBalance: 0 } } });
    const exps = [
      ...expenses,
      { id: "e4", amount: 150, paymentMethodId: "card-3", date: new Date(2026, 8, 10).toISOString() },
      { id: "e5", amount: 90, paymentMethodId: "card-3", date: new Date(2026, 8, 10).toISOString(), currency: "USD" },
    ];
    const sts = [
      // BCP: soles el 15, dólares el 28 (más tarde)
      { id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 300, dueDate: new Date(2026, 9, 15).toISOString() },
      { id: "s2", cardId: "card-1", cycleKey: "2026-09-25", currency: "USD", amount: 340, dueDate: new Date(2026, 9, 28).toISOString() },
      // Amex: soles el 20, dólares el 5 (mucho antes)
      { id: "s3", cardId: "card-3", cycleKey: "2026-09-25", currency: "PEN", amount: 150, dueDate: new Date(2026, 9, 20).toISOString() },
      { id: "s4", cardId: "card-3", cycleKey: "2026-09-25", currency: "USD", amount: 90, dueDate: new Date(2026, 9, 5).toISOString() },
    ];
    const up = getUpcomingTotal([bcp, otra], exps, [], NOW, sts);
    // En soles BCP vence primero; en dólares el orden se invierte.
    expect(up.PEN.items.map(i => i.card.name)).toEqual(["BCP", "Amex"]);
    expect(up.USD.items.map(i => i.card.name)).toEqual(["Amex", "BCP"]);
    // Y los "vence en N días" salen de la fecha de ESA moneda.
    const bcpUsd = up.USD.items.find(i => i.card.id === "card-1");
    const bcpPen = up.PEN.items.find(i => i.card.id === "card-1");
    expect(ymd(bcpUsd.dueDate)).toBe("2026-10-28");
    expect(ymd(bcpPen.dueDate)).toBe("2026-10-15");
    expect(bcpUsd.days).toBe(31); // 27 sep → 28 oct
    expect(bcpPen.days).toBe(18); // 27 sep → 15 oct
  });

  it("sin tarjetas ambos bloques quedan en 0", () => {
    const up = getUpcomingTotal([], expenses, [], NOW);
    expect(up.PEN).toEqual({ total: 0, total30: 0, items: [] });
    expect(up.USD).toEqual({ total: 0, total30: 0, items: [] });
  });
});

describe("getStatementPrompt", () => {
  const c = card({ openingDate: new Date(2026, 7, 1).toISOString(), lines: { PEN: { creditLine: 3000, openingBalance: 0 }, USD: { creditLine: 1000, openingBalance: 0 } } });
  const expenses = [
    { id: "e1", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 340, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString(), currency: "USD" },
  ];

  it("pide el ciclo cerrado y las monedas que le faltan", () => {
    const p = getStatementPrompt(c, expenses, [], NOW);
    expect(p.cycle.key).toBe("2026-09-25");
    expect(p.missing.map(m => m.currency)).toEqual(["PEN", "USD"]);
    expect(p.missing[0].estimateGross).toBe(300);
  });

  it("ya no pide la moneda registrada", () => {
    const sts = [{ id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 310 }];
    expect(getStatementPrompt(c, expenses, sts, NOW).missing.map(m => m.currency)).toEqual(["USD"]);
  });

  it("con todo registrado no molesta", () => {
    const sts = [
      { id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 310 },
      { id: "s2", cardId: "card-1", cycleKey: "2026-09-25", currency: "USD", amount: 350 },
    ];
    expect(getStatementPrompt(c, expenses, sts, NOW)).toBe(null);
  });

  it("un ciclo cerrado sin consumo no se pide", () => {
    expect(getStatementPrompt(c, [], [], NOW)).toBe(null);
  });

  it("una tarjeta registrada después del corte no se pide", () => {
    const nueva = card({ openingDate: new Date(2026, 8, 26).toISOString(), lines: { PEN: { creditLine: 3000, openingBalance: 0 } } });
    expect(getStatementPrompt(nueva, expenses, [], NOW)).toBe(null);
  });

  it("una tarjeta archivada no se pide", () => {
    expect(getStatementPrompt(card({ archived: true, openingDate: new Date(2026, 7, 1).toISOString() }), expenses, [], NOW)).toBe(null);
  });
});

describe("openingDate por línea", () => {
  // Activar la línea en dólares HOY no puede borrar el historial en soles.
  const c = card({
    openingDate: new Date(2026, 7, 1).toISOString(),
    lines: {
      PEN: { creditLine: 3000, openingBalance: 850, openingDate: new Date(2026, 7, 1).toISOString() },
      USD: { creditLine: 800, openingBalance: 200, openingDate: new Date(2026, 8, 27).toISOString() },
    },
  });
  const expenses = [
    { id: "e1", amount: 300, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 90, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString(), currency: "USD" }, // anterior a la foto en dólares
  ];

  it("los soles siguen contando desde SU fecha", () => {
    expect(getLineUsage(c, expenses, [], "PEN").balance).toBe(1150); // 850 + 300
  });

  it("los dólares parten de su propia foto e ignoran lo anterior a ella", () => {
    expect(getLineUsage(c, expenses, [], "USD").balance).toBe(200); // el gasto del 10 sep ya está dentro
  });

  it("sin fecha propia, la línea usa la fecha de la tarjeta", () => {
    const vieja = card({ openingDate: new Date(2026, 8, 20).toISOString(), lines: { PEN: { creditLine: 3000, openingBalance: 100 } } });
    expect(getLineUsage(vieja, expenses, [], "PEN").balance).toBe(100); // el gasto del 10 sep queda antes de la foto
  });
});

// F12: al reabrir "Lo que debo" para corregir un monto, la fecha que ella puso
// para ESA moneda no se pierde.
describe("buildStatementEntry — fecha ya registrada por moneda", () => {
  const c = card({ lines: { PEN: { creditLine: 3000, openingBalance: 0 }, USD: { creditLine: 1000, openingBalance: 0 } } });
  const expenses = [
    { id: "e1", amount: 200, paymentMethodId: "card-1", date: new Date(2026, 8, 10).toISOString() },
    { id: "e2", amount: 80, paymentMethodId: "card-1", date: new Date(2026, 8, 11).toISOString(), currency: "USD" },
  ];

  it("devuelve la dueDate de cada moneda por separado", () => {
    const sts = [
      { id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 210, dueDate: new Date(2026, 9, 15).toISOString() },
      { id: "s2", cardId: "card-1", cycleKey: "2026-09-25", currency: "USD", amount: 85, dueDate: new Date(2026, 9, 28).toISOString() },
    ];
    const entry = buildStatementEntry(c, expenses, sts, NOW);
    const pen = entry.missing.find(m => m.currency === "PEN");
    const usd = entry.missing.find(m => m.currency === "USD");
    expect(ymd(pen.dueDate)).toBe("2026-10-15");
    expect(ymd(usd.dueDate)).toBe("2026-10-28");
    expect(pen.registrado).toBe(210);
    expect(usd.registrado).toBe(85);
  });

  it("sin nada registrado la fecha viene null y la hoja usa la calculada", () => {
    const entry = buildStatementEntry(c, expenses, [], NOW);
    expect(entry.missing.every(m => m.dueDate === null)).toBe(true);
    expect(entry.missing.every(m => m.registrado === null)).toBe(true);
  });

  it("una dueDate ilegible no rompe nada", () => {
    const sts = [{ id: "s1", cardId: "card-1", cycleKey: "2026-09-25", currency: "PEN", amount: 210, dueDate: "qué fecha" }];
    expect(buildStatementEntry(c, expenses, sts, NOW).missing.find(m => m.currency === "PEN").dueDate).toBe(null);
  });
});

describe("buildStatementEntry — registrar sin línea declarada", () => {
  const soloSoles = {
    id: "c1", type: "credito", name: "Visa BCP", cutoffDay: 25, paymentDay: 15,
    lines: { PEN: { creditLine: 3000, openingBalance: 0, openingDate: "2026-01-01T00:00:00.000Z" } },
  };

  it("ofrece dólares aunque la tarjeta no tenga esa línea", () => {
    const entry = buildStatementEntry(soloSoles, [], [], new Date(2026, 8, 28));
    const monedas = entry.missing.map(m => m.currency);
    expect(monedas).toContain("USD");
    const usd = entry.missing.find(m => m.currency === "USD");
    expect(usd.sinLinea).toBe(true);
    expect(usd.estimateGross).toBe(0);
  });

  it("la moneda que sí tiene línea no se marca como sin línea", () => {
    const entry = buildStatementEntry(soloSoles, [], [], new Date(2026, 8, 28));
    const pen = entry.missing.find(m => m.currency === "PEN");
    expect(pen.sinLinea).toBe(false);
  });
});
