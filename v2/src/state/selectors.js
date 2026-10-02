import { getMonthLabel, monthLabelOf } from "../lib/dates";
import { curOf } from "../lib/cycles";
import { separaIngresos, montoEnSoles, montoEnDolaresSinCambiar } from "../lib/ingresos";

const redondea = (n) => Math.round(n * 100) / 100;

// Los gastos en dólares NO entran a los totales en soles (F10): se muestran
// siempre como una línea aparte. Nada de tipos de cambio inventados.
export const isPEN = (e) => curOf(e) !== "USD";
export const sumUSD = (exps) => (exps || []).reduce((s, e) => (curOf(e) === "USD" ? s + (Number(e.amount) || 0) : s), 0);

// Funciones puras extraídas del monolito GastosApp.js (misma lógica, firmas puras).

// Gasto por categoría del mes indicado — antes useMemo `catSpend`.
export const catSpend = (data, curMonth) => {
  const m = {};
  data.expenses
    .filter(e => e.month === curMonth && isPEN(e))
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
export const getMonthData = (data, offset, hoy = new Date()) => {
  const mk = getMonthLabel(offset);
  const exps = data.expenses.filter(e => e.month === mk);
  const fixd = data.fixed.filter(f => f.month === mk);
  const incF = data.incomeFixed.filter(i => i.month === mk);
  const incE = data.incomeExtra.filter(i => i.month === mk);
  const totalCompras = exps.filter(isPEN).reduce((s, e) => s + e.amount, 0);
  const totalDiariosUSD = sumUSD(exps); // aparte, nunca sumado a los soles
  const totalFijos = fixd.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
  const totalFijosAll = fixd.reduce((s, f) => s + f.amount, 0);

  // F31: los pagos que le hizo a sus tarjetas ESE mes.
  //
  // `salioDeTuCuenta` responde "cuánta plata se fue de mi banco": ahí el pago
  // cuenta, y una compra hecha CON la tarjeta no —esa sale recién el día que la
  // paga.
  const pagosTC = (data.cardPayments || []).filter(p => p && p.date && monthLabelOf(new Date(p.date)) === mk);
  const totalPagosTC = redondea(pagosTC.filter(p => curOf(p) !== "USD").reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const totalPagosTCUSD = redondea(pagosTC.filter(p => curOf(p) === "USD").reduce((s, p) => s + (Number(p.amount) || 0), 0));

  const idsCredito = new Set((data.paymentMethods || []).filter(m => m && m.type === "credito").map(m => m.id));
  const diariosDeCuenta = exps.filter(isPEN).filter(e => !idsCredito.has(e.paymentMethodId)).reduce((s, e) => s + e.amount, 0);
  const salioDeTuCuenta = redondea(diariosDeCuenta + totalFijos + totalPagosTC);

  // F32: los pagos de tarjeta SÍ cuentan como gasto. Decisión de ella, dicha
  // tres veces: "pero debe contar como gasto porque estoy pagando una deuda".
  //
  // Lo que eso implica, y está dicho en pantalla: la compra ya sumó el día que
  // la hizo, así que esa plata aparece dos veces en el mes — una al comprar y
  // otra al pagar. `totalCompras` queda aparte para poder mostrar el desglose.
  //
  // Los presupuestos por categoría NO se ven afectados: `catSpend` lee los
  // gastos directamente, y un pago de tarjeta no tiene categoría.
  const totalDiarios = redondea(totalCompras + totalPagosTC);

  // F24: los ingresos en dólares solo entran al total en soles si ella declaró
  // el tipo de cambio que le dieron. Los que no, van aparte (`totalIncUSD`).
  const todosInc = [...incF, ...incE];
  const totalInc = Math.round(todosInc.reduce((s, i) => s + montoEnSoles(i), 0) * 100) / 100;
  const totalIncUSD = Math.round(todosInc.reduce((s, i) => s + montoEnDolaresSinCambiar(i), 0) * 100) / 100;
  const balance = totalInc - totalFijos - totalDiarios;
  // F22: de ese total, cuánto ya entró y cuánto está por entrar.
  // `totalInc` y `balance` siguen contando TODO el mes a propósito: son las
  // cuentas de planificación ("¿me alcanza este mes?"), y ahí un sueldo que
  // entra el 30 sí cuenta. Lo recibido es la otra pregunta —"¿cuánto tengo
  // hoy?"— y va aparte, nunca mezclado.
  const { recibidos, pendientes, totalRecibido, totalPendiente, totalRecibidoUSD, totalPendienteUSD } = separaIngresos(todosInc, hoy);
  return {
    exps, ingresos: todosInc, totalDiarios, totalCompras, totalDiariosUSD, totalFijos, totalFijosAll,
    totalInc, totalIncUSD, balance,
    pagosTC, totalPagosTC, totalPagosTCUSD, salioDeTuCuenta,
    ingresosRecibidos: recibidos, ingresosPendientes: pendientes,
    totalIncRecibido: totalRecibido, totalIncPendiente: totalPendiente,
    totalIncRecibidoUSD: totalRecibidoUSD, totalIncPendienteUSD: totalPendienteUSD,
  };
};

// Agrupa por categoría los gastos que le pasen. OJO: no filtra moneda a propósito
// — el detalle de ciclo la usa con gastos ya filtrados por moneda.
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
