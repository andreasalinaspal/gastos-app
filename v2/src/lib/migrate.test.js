import { describe, it, expect } from "vitest";
import { migrateData, LEGACY_OPENING_DATE } from "./migrate";

// Blob v1 realista (shape previo a schemaVersion), con un campo desconocido extra.
const v1Blob = () => ({
  expenses: [
    { id: "e1", amount: 15, description: "Menú", date: "2026-06-01T13:15:00.000Z", month: "Junio 2026", category: { id: "c1", emoji: "🍽️", name: "Comida" } },
    { id: "e2", amount: 48, description: "Pollo", date: "2026-06-02T20:15:00.000Z", month: "Junio 2026", category: null },
  ],
  fixed: [{ id: "f1", name: "Alquiler", type: "manual", amount: 950, paid: false, month: "Junio 2026" }],
  incomeFixed: [{ id: "i1", name: "Sueldo", amount: 2800, month: "Junio 2026" }],
  incomeExtra: [],
  categories: { gastos: [{ id: "c1", emoji: "🍽️", name: "Comida" }], ingresos: [] },
  userName: "Andrea",
  currency: "PEN",
  budgets: { c1: 400 },
  campoDesconocido: { foo: "bar" }, // debe sobrevivir la migración
});

describe("migrateData — blob v1", () => {
  it("agrega paymentMethods default (efectivo y débito), cardPayments, education, deudas y schemaVersion 7", () => {
    const m = migrateData(v1Blob());
    expect(m.schemaVersion).toBe(7);
    expect(m.paymentMethods).toHaveLength(2);
    expect(m.paymentMethods.map(p => p.type).sort()).toEqual(["debito", "efectivo"]);
    expect(m.paymentMethods.every(p => p.id && p.name)).toBe(true);
    expect(m.cardPayments).toEqual([]);
    expect(m.education).toEqual({ completedLessons: [], quizResult: null, simulatorState: null });
  });

  it("los expenses históricos quedan SIN paymentMethodId", () => {
    const m = migrateData(v1Blob());
    for (const e of m.expenses) {
      expect(e.paymentMethodId == null).toBe(true); // null o undefined
    }
  });

  it("no pierde ningún campo existente (incluidos desconocidos)", () => {
    const original = v1Blob();
    const m = migrateData(original);
    for (const key of Object.keys(original)) {
      expect(m[key]).toEqual(original[key]);
    }
    expect(m.campoDesconocido).toEqual({ foo: "bar" });
    expect(m.budgets).toEqual({ c1: 400 });
    expect(m.expenses).toHaveLength(2);
    expect(m.fixed).toHaveLength(1);
  });
});

describe("migrateData — idempotencia", () => {
  it("un blob ya v2 completo se devuelve tal cual (misma referencia)", () => {
    const once = migrateData(v1Blob());
    const twice = migrateData(once);
    expect(twice).toBe(once); // sin cambios → mismo objeto (sirve para detectar re-upload)
  });

  it("no regenera paymentMethods existentes (ids estables)", () => {
    const once = migrateData(v1Blob());
    const ids = once.paymentMethods.map(p => p.id);
    expect(migrateData(once).paymentMethods.map(p => p.id)).toEqual(ids);
  });

  it("blob v2 con campos faltantes se rellena defensivamente sin tocar el resto", () => {
    const partial = { ...v1Blob(), schemaVersion: 2, paymentMethods: [{ id: "pm1", type: "efectivo", name: "Efectivo" }] };
    delete partial.cardPayments;
    const m = migrateData(partial);
    expect(m.schemaVersion).toBe(7);
    expect(m.paymentMethods).toEqual([{ id: "pm1", type: "efectivo", name: "Efectivo" }]); // no se pisa
    expect(m.cardPayments).toEqual([]);
    expect(m.education).toEqual({ completedLessons: [], quizResult: null, simulatorState: null });
  });

  it("schemaVersion mayor al actual se respeta", () => {
    const future = { ...migrateData(v1Blob()), schemaVersion: 9 };
    expect(migrateData(future).schemaVersion).toBe(9);
  });
});

describe("migrateData — v3: deuda previa en tarjetas", () => {
  const withCard = (cardOver = {}) => ({
    ...v1Blob(),
    schemaVersion: 2,
    cardPayments: [],
    education: { completedLessons: [], quizResult: null, simulatorState: null },
    paymentMethods: [
      { id: "pm1", type: "efectivo", name: "Efectivo" },
      { id: "c1", type: "credito", name: "Visa BCP", cutoffDay: 25, paymentDay: 15, creditLine: 3000, color: "#6C5CE7", archived: false, ...cardOver },
    ],
  });

  it("rellena openingBalance 0 y openingDate legacy en TCs existentes", () => {
    const m = migrateData(withCard());
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(card.openingBalance).toBe(0);
    expect(card.openingDate).toBe(LEGACY_OPENING_DATE);
    expect(m.schemaVersion).toBe(7);
  });

  it("no toca ningún otro campo de la tarjeta", () => {
    const original = withCard();
    const before = original.paymentMethods.find(p => p.id === "c1");
    const card = migrateData(original).paymentMethods.find(p => p.id === "c1");
    for (const key of Object.keys(before)) expect(card[key]).toEqual(before[key]);
  });

  it("no toca medios que no son de crédito", () => {
    const m = migrateData(withCard());
    const efectivo = m.paymentMethods.find(p => p.id === "pm1");
    expect(efectivo).toEqual({ id: "pm1", type: "efectivo", name: "Efectivo" });
    expect("openingBalance" in efectivo).toBe(false);
  });

  it("respeta una deuda previa ya declarada (no la pisa con 0)", () => {
    const m = migrateData(withCard({ openingBalance: 1200, openingDate: "2026-09-01T00:00:00.000Z" }));
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(card.openingBalance).toBe(1200);
    expect(card.openingDate).toBe("2026-09-01T00:00:00.000Z");
  });

  it("idempotente: segunda pasada devuelve la misma referencia", () => {
    const once = migrateData(withCard());
    expect(migrateData(once)).toBe(once);
  });

  it("openingBalance 0 explícito sin openingDate se completa igual", () => {
    const m = migrateData(withCard({ openingBalance: 0 }));
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(card.openingBalance).toBe(0);
    expect(card.openingDate).toBe(LEGACY_OPENING_DATE);
  });
});

describe("migrateData — entradas inválidas", () => {
  it("null/undefined pasan sin explotar", () => {
    expect(migrateData(null)).toBe(null);
    expect(migrateData(undefined)).toBe(undefined);
  });
});

// ── F10: dos líneas por tarjeta (soles y dólares) ──

describe("migrateData — v4: lines.PEN / lines.USD", () => {
  const withCard = (cardOver = {}) => ({
    ...v1Blob(),
    schemaVersion: 3,
    cardPayments: [],
    education: { completedLessons: [], quizResult: null, simulatorState: null },
    paymentMethods: [
      { id: "pm1", type: "efectivo", name: "Efectivo" },
      { id: "c1", type: "credito", name: "Visa BCP", cutoffDay: 25, paymentDay: 15, creditLine: 3000, openingBalance: 850, openingDate: "2026-08-01T00:00:00.000Z", color: "#6C5CE7", archived: false, ...cardOver },
    ],
  });

  it("mueve la línea plana a lines.PEN y sube a schemaVersion 7", () => {
    const m = migrateData(withCard());
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(m.schemaVersion).toBe(7);
    expect(card.lines.PEN).toEqual({ creditLine: 3000, openingBalance: 850 });
  });

  it("NO borra los campos planos viejos (compatibilidad)", () => {
    const card = migrateData(withCard()).paymentMethods.find(p => p.id === "c1");
    expect(card.creditLine).toBe(3000);
    expect(card.openingBalance).toBe(850);
    expect(card.openingDate).toBe("2026-08-01T00:00:00.000Z");
  });

  it("no inventa línea en dólares", () => {
    const card = migrateData(withCard()).paymentMethods.find(p => p.id === "c1");
    expect(card.lines.USD).toBeUndefined();
    expect(Object.keys(card.lines)).toEqual(["PEN"]);
  });

  it("respeta una línea en dólares ya configurada", () => {
    const m = migrateData(withCard({ lines: { PEN: { creditLine: 3000, openingBalance: 850 }, USD: { creditLine: 1000, openingBalance: 120 } } }));
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(card.lines.USD).toEqual({ creditLine: 1000, openingBalance: 120 });
  });

  it("completa lines.PEN aunque ya exista lines.USD suelto", () => {
    const m = migrateData(withCard({ lines: { USD: { creditLine: 1000, openingBalance: 0 } } }));
    const card = m.paymentMethods.find(p => p.id === "c1");
    expect(card.lines.PEN).toEqual({ creditLine: 3000, openingBalance: 850 });
    expect(card.lines.USD).toEqual({ creditLine: 1000, openingBalance: 0 });
  });

  it("agrega cardStatements vacío y no lo pisa si ya existe", () => {
    expect(migrateData(withCard()).cardStatements).toEqual([]);
    const conStatement = { ...withCard(), cardStatements: [{ id: "s1", cardId: "c1", cycleKey: "2026-09-25", currency: "PEN", amount: 1234, dueDate: "2026-10-15", registeredAt: "2026-09-26T10:00:00.000Z" }] };
    expect(migrateData(conStatement).cardStatements).toHaveLength(1);
  });

  it("no toca medios que no son de crédito", () => {
    const efectivo = migrateData(withCard()).paymentMethods.find(p => p.id === "pm1");
    expect(efectivo).toEqual({ id: "pm1", type: "efectivo", name: "Efectivo" });
  });

  it("idempotente: segunda pasada devuelve la misma referencia", () => {
    const once = migrateData(withCard());
    expect(migrateData(once)).toBe(once);
    expect(migrateData(migrateData(once))).toBe(once);
  });

  it("sin pérdida: v1 → v4 conserva gastos, fijos, budgets y campos desconocidos", () => {
    const original = v1Blob();
    const m = migrateData(original);
    expect(m.expenses).toEqual(original.expenses);
    expect(m.fixed).toEqual(original.fixed);
    expect(m.budgets).toEqual(original.budgets);
    expect(m.campoDesconocido).toEqual({ foo: "bar" });
  });

  it("una tarjeta sin creditLine declarado queda con lines.PEN en 0 (no undefined)", () => {
    const sinLinea = withCard();
    delete sinLinea.paymentMethods[1].creditLine;
    const card = migrateData(sinLinea).paymentMethods.find(p => p.id === "c1");
    expect(card.lines.PEN.creditLine).toBe(0);
  });
});

// F25: deudas por cobrar. La migración solo AGREGA el array; nada existente se toca.
describe("v5 · deudas por cobrar", () => {
  it("agrega deudas vacío a un blob que no lo tenía", () => {
    const m = migrateData(v1Blob());
    expect(m.deudas).toEqual([]);
    expect(m.schemaVersion).toBe(7);
  });

  it("respeta las deudas que ya estaban", () => {
    const con = { ...migrateData(v1Blob()), deudas: [{ id: "d", name: "Ana", amount: 500, pagos: [] }] };
    const m = migrateData(con);
    expect(m.deudas).toHaveLength(1);
    expect(m.deudas[0].name).toBe("Ana");
  });

  it("es idempotente: migrar dos veces devuelve el MISMO objeto", () => {
    const una = migrateData(v1Blob());
    expect(migrateData(una)).toBe(una);
  });
});

// v6: la lista de suscripciones que decidió cancelar (F44).
describe("migrateData — v6 porCancelar", () => {
  it("agrega porCancelar vacío a un blob que no lo tenía", () => {
    const out = migrateData({ expenses: [], fixed: [], incomeFixed: [], incomeExtra: [] });
    expect(out.porCancelar).toEqual([]);
    expect(out.schemaVersion).toBe(7);
  });

  it("no pisa lo que ya estaba anotado", () => {
    const mio = [{ id: "a", nombre: "HBO Max", monto: 26.9, cobra: 14 }];
    expect(migrateData({ expenses: [], porCancelar: mio }).porCancelar).toEqual(mio);
  });

  it("es idempotente: correrla dos veces no cambia nada", () => {
    const una = migrateData({ expenses: [] });
    expect(migrateData(una)).toEqual(una);
  });
});

// v7: la lista de suscripciones que ella lleva (F45).
describe("migrateData — v7 suscripciones", () => {
  it("agrega suscripciones vacío a un blob que no lo tenía", () => {
    const out = migrateData({ expenses: [] });
    expect(out.suscripciones).toEqual([]);
    expect(out.schemaVersion).toBe(7);
  });

  it("no pisa la lista que ya tenía anotada", () => {
    const mia = [{ id: "a", nombre: "Netflix", monto: 44.9, cadencia: "mensual", cobra: 7 }];
    expect(migrateData({ expenses: [], suscripciones: mia }).suscripciones).toEqual(mia);
  });
});
