import { initData } from "../constants";
import { genId } from "./format";
import { MONTHS } from "./dates";
import { migrateData } from "./migrate";

// Construye un blob de datos de ejemplo para el modo demo.
// No toca Supabase: en demo authUser queda null, así que el sync y el backup
// local por usuario se saltan solos (guards existentes en GastosApp).
// Sale ya en schema v2: paymentMethods (incluida una TC de ejemplo), cardPayments, education.
export function buildDemoData() {
  const d = initData();
  const now = new Date();
  const monthOf = (date) => MONTHS[date.getMonth()] + " " + date.getFullYear();
  const daysAgo = (n, hour = 13) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - n);
    dt.setHours(hour, 15, 0, 0);
    return dt;
  };
  const cat = (name) => d.categories.gastos.find(c => c.name === name) || null;
  // Copia liviana: el gasto guarda emoji + nombre, no la lista de subcategorias.
  const slimCat = (c) => (c ? { id: c.id, emoji: c.emoji, name: c.name } : null);

  // Subcategorias de ejemplo (F7): son solo detalle, no llevan presupuesto propio.
  const subsOf = { "Comida": ["Almuerzo", "Delivery", "Mercado"], "Transporte": ["Taxi", "Bus"], "Ocio": ["Cine", "Salidas"] };
  d.categories.gastos = d.categories.gastos.map(c => (
    subsOf[c.name] ? { ...c, subcategories: subsOf[c.name].map(n => ({ id: genId(), name: n })) } : c
  ));
  const sub = (catName, subName) => {
    const s = (cat(catName)?.subcategories || []).find(x => x.name === subName);
    return s ? { id: s.id, name: s.name } : null;
  };

  // Medios de pago: efectivo/débito vienen de initData; agregamos una TC de ejemplo
  // openingBalance/openingDate (F6): la deuda que la tarjeta ya traía cuando se registró.
  const card = { id: genId(), type: "credito", name: "Visa BCP", cutoffDay: 25, paymentDay: 15, creditLine: 3000, cycleBudget: 600, color: "#6C5CE7", archived: false, openingBalance: 850, openingDate: daysAgo(40, 9).toISOString() };
  d.paymentMethods = [...d.paymentMethods, card];
  const efectivo = d.paymentMethods.find(m => m.type === "efectivo");
  const debito = d.paymentMethods.find(m => m.type === "debito");

  const exp = (n, description, amount, catName, hour, paymentMethod, subName) => {
    const date = daysAgo(n, hour);
    return {
      id: genId(), amount, description, date: date.toISOString(), month: monthOf(date), category: slimCat(cat(catName)),
      subcategory: subName ? sub(catName, subName) : null,
      paymentMethodId: paymentMethod ? paymentMethod.id : null,
    };
  };

  d.userName = "Demo";
  d.expenses = [
    exp(0, "Menú del día", 15, "Comida", 13, efectivo, "Almuerzo"),
    exp(0, "Metropolitano", 3.2, "Transporte", 8, efectivo, "Bus"),
    exp(1, "Pollo a la brasa", 48, "Comida", 20, card, "Delivery"),
    exp(1, "Farmacia", 22.5, "Salud", 18, debito),
    exp(2, "Cine", 35, "Ocio", 21, card, "Cine"),
    exp(3, "Mercado semanal", 86, "Comida", 10, debito, "Mercado"),
    exp(4, "Taxi", 18, "Transporte", 22, efectivo, "Taxi"),
    exp(5, "Zapatillas", 189, "Compras", 17, card),
    exp(6, "Spotify", 22.9, "Suscripciones", 9, card),
    exp(8, "Gimnasio del mes", 89, "Deporte", 7, debito),
    exp(10, "Cumpleaños amiga", 60, "Ocio", 21, null), // histórico, sin medio
    exp(12, "Corte de pelo", 30, "Estética", 16, null), // histórico, sin medio
  ];

  // Pago de tarjeta del ciclo anterior (liquidación, NO es un gasto — P1).
  // key del ciclo = fecha de corte anterior más reciente ya pasada (día 25).
  const prevCutoff = now.getDate() > card.cutoffDay
    ? new Date(now.getFullYear(), now.getMonth(), card.cutoffDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, card.cutoffDay);
  const pad = (n) => String(n).padStart(2, "0");
  const cycleKey = prevCutoff.getFullYear() + "-" + pad(prevCutoff.getMonth() + 1) + "-" + pad(prevCutoff.getDate());
  d.cardPayments = [
    { id: genId(), cardId: card.id, amount: 240, date: prevCutoff.toISOString(), cycleKey },
  ];

  d.fixed = d.fixed.map(f => ({
    ...f,
    amount: { "Alquiler": 950, "Luz": 85, "Agua": 40, "Internet": 89, "Celular": 39.9, "Gym": 89 }[f.name] || 0,
    paid: ["Luz", "Agua", "Internet"].includes(f.name),
  }));

  d.incomeFixed = d.incomeFixed.map(i => ({ ...i, amount: 2800 }));
  d.incomeExtra = [
    { id: genId(), name: "Freelance logo", amount: 350, month: monthOf(now) },
  ];

  const budgetOf = { "Comida": 400, "Transporte": 120, "Ocio": 150, "Compras": 200 };
  d.budgets = {};
  for (const [name, amount] of Object.entries(budgetOf)) {
    const c = cat(name);
    if (c) d.budgets[c.id] = amount;
  }

  return migrateData(d);
}
