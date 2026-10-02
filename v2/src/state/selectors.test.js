import { describe, it, expect } from "vitest";
import { catSpend, getMonthData, isPEN, sumUSD, buildCatMap, categoriaPagoTC, pagosComoGastos } from "./selectors";
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

// ── F31: los pagos de tarjeta se ven, pero no inflan los gastos ──
//
// Ella pidió verlos ("ese pago debe verse reflejado"). Contarlos como gasto le
// infló un mes real en S/6,404: las compras ya estaban registradas una por una.

describe("pagos de tarjeta y salida de caja", () => {
  const mes = getMonthLabel(0);
  const diaDelMes = (d) => { const x = new Date(); x.setDate(d); return x.toISOString(); };
  const base = () => ({
    paymentMethods: [
      { id: "tc", type: "credito", name: "Visa" },
      { id: "efe", type: "efectivo", name: "Efectivo" },
    ],
    expenses: [
      { id: "e1", amount: 100, month: mes, paymentMethodId: "tc" },   // con tarjeta
      { id: "e2", amount: 40, month: mes, paymentMethodId: "efe" },   // en efectivo
    ],
    fixed: [{ id: "f1", amount: 950, month: mes, paid: true }],
    incomeFixed: [], incomeExtra: [],
    cardPayments: [{ id: "p1", cardId: "tc", amount: 200, date: diaDelMes(5) }],
  });

  // F33: el gasto es cuando SALE la plata. Sus palabras: "lo que gasté con la
  // tarjeta no fue un gasto real porque la tarjeta no es dinero real; si gasté
  // en setiembre y lo pago en octubre, esa plata sale de mi bolsillo en octubre".
  it("una compra con tarjeta no cuenta como gasto hasta que se paga", () => {
    const d = getMonthData(base(), 0);
    expect(d.totalCompras).toBe(140);     // todo lo consumido: 100 con TC + 40 efectivo
    expect(d.totalConTarjeta).toBe(100);  // eso todavía no sale del bolsillo
    expect(d.totalPagosTC).toBe(200);     // lo que sí pagó este mes
    expect(d.totalDiarios).toBe(240);     // 40 en efectivo + 200 de pago
  });

  it("no hay doble conteo: la misma plata no suma al comprar y al pagar", () => {
    // Un solo movimiento: compra de 100 con tarjeta, sin pagos.
    const solo = { ...base(), cardPayments: [], fixed: [] };
    solo.expenses = [{ id: "e1", amount: 100, month: mes, paymentMethodId: "tc" }];
    expect(getMonthData(solo, 0).totalDiarios).toBe(0); // todavía no sale plata

    // El mes que la paga, ahí sí.
    const pagado = { ...solo, cardPayments: [{ id: "p", cardId: "tc", amount: 100, date: diaDelMes(5) }] };
    expect(getMonthData(pagado, 0).totalDiarios).toBe(100);
  });

  it("el balance del mes usa lo que salió del bolsillo", () => {
    const d2 = base();
    d2.incomeFixed = [{ id: "i", amount: 5000, month: mes }];
    // 5000 ingresos − 950 fijos pagados − 240 (efectivo + pago) = 3810
    expect(getMonthData(d2, 0).balance).toBe(3810);
  });

  it("los presupuestos por categoría NO lo cuentan: un pago no tiene categoría", () => {
    const d2 = base();
    d2.expenses[0].category = { id: "comida", name: "Comida" };
    d2.budgets = { comida: 500 };
    expect(catSpend(d2, mes).comida).toBe(100); // solo la compra, no el pago
  });

  it("lo que salió de la cuenta sí lo incluye, y no cuenta lo pagado con tarjeta", () => {
    // 40 en efectivo + 950 de fijos pagados + 200 de pago de tarjeta = 1190.
    // Los 100 de la compra con tarjeta NO salieron de la cuenta todavía.
    expect(getMonthData(base(), 0).salioDeTuCuenta).toBe(1190);
  });

  it("separa los pagos en dólares", () => {
    const d2 = base();
    d2.cardPayments.push({ id: "p2", cardId: "tc", amount: 50, currency: "USD", date: diaDelMes(6) });
    const d = getMonthData(d2, 0);
    expect(d.totalPagosTC).toBe(200);
    expect(d.totalPagosTCUSD).toBe(50);
    expect(d.salioDeTuCuenta).toBe(1190); // los dólares no se suman a los soles
  });

  it("solo cuenta los pagos de ESE mes", () => {
    const d2 = base();
    d2.cardPayments.push({ id: "viejo", cardId: "tc", amount: 5000, date: new Date(2020, 0, 5).toISOString() });
    expect(getMonthData(d2, 0).totalPagosTC).toBe(200);
  });

  it("sin pagos ni tarjetas no rompe", () => {
    const vacio = { paymentMethods: [], expenses: [], fixed: [], incomeFixed: [], incomeExtra: [] };
    expect(getMonthData(vacio, 0).salioDeTuCuenta).toBe(0);
    expect(getMonthData(vacio, 0).pagosTC).toEqual([]);
  });
});

// ── F35: los pagos de tarjeta son su propia categoría ──
//
// Su razonamiento, y es correcto: si compra el cine en octubre y lo paga en
// noviembre, el cine sale en el gráfico de octubre y el pago en el de
// noviembre. No se pisan, porque viven en meses distintos.

describe("categoría de los pagos de tarjeta", () => {
  const mes = getMonthLabel(0);
  const hoyISO = () => { const d = new Date(); d.setDate(Math.min(d.getDate(), 28)); return d.toISOString(); };

  it("usa la categoría de ella si ya la tiene, con su emoji", () => {
    const data = { categories: { gastos: [{ id: "mia", emoji: "🏦", name: "Pago de tarjeta" }] } };
    expect(categoriaPagoTC(data)).toMatchObject({ id: "mia", emoji: "🏦" });
  });

  it("no distingue mayúsculas ni espacios al buscarla", () => {
    const data = { categories: { gastos: [{ id: "mia", name: "  PAGO DE TARJETA " }] } };
    expect(categoriaPagoTC(data).id).toBe("mia");
  });

  it("sin ninguna propia usa una sintética, sin tocar sus datos", () => {
    expect(categoriaPagoTC({ categories: { gastos: [] } })).toMatchObject({ id: "__pago-tc", name: "Pago de tarjeta" });
    expect(categoriaPagoTC({})).toMatchObject({ id: "__pago-tc" });
  });

  it("convierte los pagos del mes en gastos para el gráfico", () => {
    const data = { cardPayments: [{ id: "p1", cardId: "tc", amount: 175, date: hoyISO() }], categories: { gastos: [] } };
    const r = pagosComoGastos(data, mes);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ amount: 175, description: "Pago de tarjeta", esPagoTC: true });
    expect(r[0].category.name).toBe("Pago de tarjeta");
  });

  it("sin mes trae todos (la vista de todo el histórico)", () => {
    const data = { cardPayments: [
      { id: "p1", cardId: "tc", amount: 175, date: hoyISO() },
      { id: "p2", cardId: "tc", amount: 50, date: new Date(2020, 0, 5).toISOString() },
    ], categories: { gastos: [] } };
    expect(pagosComoGastos(data, mes)).toHaveLength(1);
    expect(pagosComoGastos(data, null)).toHaveLength(2);
  });

  it("los dólares se marcan como tales, para que no entren a los totales en soles", () => {
    const data = { cardPayments: [{ id: "p", cardId: "tc", amount: 50, currency: "USD", date: hoyISO() }], categories: { gastos: [] } };
    expect(pagosComoGastos(data, mes)[0].currency).toBe("USD");
    expect(pagosComoGastos(data, mes).filter(isPEN)).toHaveLength(0);
  });

  it("el presupuesto de esa categoría cuenta los pagos", () => {
    const data = {
      expenses: [], cardPayments: [{ id: "p", cardId: "tc", amount: 175, date: hoyISO() }],
      categories: { gastos: [{ id: "mia", name: "Pago de tarjeta" }] },
    };
    expect(catSpend(data, mes).mia).toBe(175);
  });
});
