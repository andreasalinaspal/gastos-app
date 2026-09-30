import { getCurrentMonthLabel } from "./lib/dates";
import { genId } from "./lib/format";
import { defaultPaymentMethods, defaultEducation } from "./lib/migrate";

export const FIXED_DEFAULTS = [
  { name: "Alquiler", type: "manual" },
  { name: "Luz", type: "debito" },
  { name: "Agua", type: "debito" },
  { name: "Internet", type: "debito" },
  { name: "Celular", type: "debito" },
  { name: "Gym", type: "debito" },
];

export const DEFAULT_CATS_GASTOS = [
  { emoji: "🍽️", name: "Comida" }, { emoji: "🚌", name: "Transporte" }, { emoji: "🏠", name: "Hogar" },
  { emoji: "💊", name: "Salud" }, { emoji: "🏋️", name: "Deporte" }, { emoji: "🎉", name: "Ocio" },
  { emoji: "🛍️", name: "Compras" }, { emoji: "💄", name: "Estética" }, { emoji: "📚", name: "Educación" },
  { emoji: "📱", name: "Suscripciones" }, { emoji: "✈️", name: "Viajes" }, { emoji: "⚡", name: "Imprevistos" },
];
export const DEFAULT_CATS_INGRESOS = [
  { emoji: "💼", name: "Sueldo" }, { emoji: "💻", name: "Freelance" }, { emoji: "📈", name: "Inversión" },
  { emoji: "🏠", name: "Alquiler" }, { emoji: "🎯", name: "Bono" }, { emoji: "🛒", name: "Ventas" },
];

export function initData() {
  return {
    expenses: [],
    fixed: FIXED_DEFAULTS.map(f => ({ id: genId(), name: f.name, type: f.type, amount: 0, paid: false, month: getCurrentMonthLabel() })),
    incomeFixed: [
      { id: genId(), name: "Sueldo", amount: 0, month: getCurrentMonthLabel() },
    ],
    incomeExtra: [],
    // F25: la plata que a ella le deben, con sus pagos y cuotas.
    deudas: [],
    categories: {
      gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
      ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
    },
    userName: "",
    currency: "PEN",
    budgets: {},
    // Schema v2 (Fase 1): medios de pago y tarjetas de crédito
    schemaVersion: 2,
    paymentMethods: defaultPaymentMethods(),
    cardPayments: [],
    education: defaultEducation(),
  };
}
