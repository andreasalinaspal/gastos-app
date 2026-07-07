import { initData } from "../constants";
import { genId } from "./format";
import { MONTHS } from "./dates";

// Construye un blob de datos de ejemplo para el modo demo.
// No toca Supabase: en demo authUser queda null, así que el sync y el backup
// local por usuario se saltan solos (guards existentes en GastosApp).
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

  const exp = (n, description, amount, catName, hour) => {
    const date = daysAgo(n, hour);
    return { id: genId(), amount, description, date: date.toISOString(), month: monthOf(date), category: cat(catName) };
  };

  d.userName = "Demo";
  d.expenses = [
    exp(0, "Menú del día", 15, "Comida", 13),
    exp(0, "Metropolitano", 3.2, "Transporte", 8),
    exp(1, "Pollo a la brasa", 48, "Comida", 20),
    exp(1, "Farmacia", 22.5, "Salud", 18),
    exp(2, "Cine", 35, "Ocio", 21),
    exp(3, "Mercado semanal", 86, "Comida", 10),
    exp(4, "Taxi", 18, "Transporte", 22),
    exp(5, "Zapatillas", 189, "Compras", 17),
    exp(6, "Spotify", 22.9, "Suscripciones", 9),
    exp(8, "Gimnasio del mes", 89, "Deporte", 7),
    exp(10, "Cumpleaños amiga", 60, "Ocio", 21),
    exp(12, "Corte de pelo", 30, "Estética", 16),
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

  return d;
}
