import { getMonthLabel } from "../lib/dates";

// Funciones puras extraídas del monolito GastosApp.js (misma lógica, firmas puras).

// Gasto por categoría del mes indicado — antes useMemo `catSpend`.
export const catSpend = (data, curMonth) => {
  const m = {};
  data.expenses
    .filter(e => e.month === curMonth)
    .forEach(e => {
      if (e.category?.id) {
        m[e.category.id] = (m[e.category.id] || 0) + e.amount;
      }
    });
  return m;
};

// Alertas de presupuesto: categorías con >=80% de su límite — antes useMemo `budgetAlerts`.
export const budgetAlerts = (data, catSpendMap) => {
  return (data.categories?.gastos || [])
    .filter(cat => data.budgets?.[cat.id] > 0)
    .map(cat => {
      const limit = data.budgets[cat.id];
      const spent = catSpendMap[cat.id] || 0;
      const pct = Math.round((spent / limit) * 100);
      return { cat, limit, spent, pct };
    })
    .filter(a => a.pct >= 80)
    .sort((a, b) => b.pct - a.pct);
};

// Totales de un mes con offset relativo al actual — antes función inline `getMonthData`.
export const getMonthData = (data, offset) => {
  const mk = getMonthLabel(offset);
  const exps = data.expenses.filter(e => e.month === mk);
  const fixd = data.fixed.filter(f => f.month === mk);
  const incF = data.incomeFixed.filter(i => i.month === mk);
  const incE = data.incomeExtra.filter(i => i.month === mk);
  const totalDiarios = exps.reduce((s, e) => s + e.amount, 0);
  const totalFijos = fixd.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
  const totalFijosAll = fixd.reduce((s, f) => s + f.amount, 0);
  const totalInc = incF.reduce((s, i) => s + i.amount, 0) + incE.reduce((s, i) => s + i.amount, 0);
  const balance = totalInc - totalFijos - totalDiarios;
  return { exps, totalDiarios, totalFijos, totalFijosAll, totalInc, balance };
};

// Agrupa gastos por categoría ordenado por monto — antes función inline `buildCatMap`.
export const buildCatMap = (exps) => {
  const m = {};
  exps.forEach(e => {
    const key = e.category?.name || "Otros";
    const emoji = e.category?.emoji || "📦";
    if (!m[key]) m[key] = { name: key, emoji, amount: 0, expenses: [] };
    m[key].amount += e.amount;
    m[key].expenses.push(e);
  });
  return Object.values(m).sort((a, b) => b.amount - a.amount);
};
