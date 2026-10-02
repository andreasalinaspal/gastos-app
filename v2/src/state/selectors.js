import { getMonthLabel, monthLabelOf } from "../lib/dates";
import { curOf } from "../lib/cycles";
import { separaIngresos, montoEnSoles, montoEnDolaresSinCambiar } from "../lib/ingresos";
import { CAT_PAGO_TC } from "../constants";

const redondea = (n) => Math.round(n * 100) / 100;

// Los gastos en dólares NO entran a los totales en soles (F10): se muestran
// siempre como una línea aparte. Nada de tipos de cambio inventados.
export const isPEN = (e) => curOf(e) !== "USD";
export const sumUSD = (exps) => (exps || []).reduce((s, e) => (curOf(e) === "USD" ? s + (Number(e.amount) || 0) : s), 0);

// F35: la categoría donde caen los pagos de tarjeta. Si ella ya tiene una con
// ese nombre se usa la suya (conserva su emoji y su presupuesto); si no, una
// sintética que no hace falta guardar en sus datos.
export const categoriaPagoTC = (data) => {
  const propia = (data?.categories?.gastos || []).find(c => c && String(c.name || "").trim().toLowerCase() === CAT_PAGO_TC.name.toLowerCase());
  return propia || { id: "__pago-tc", ...CAT_PAGO_TC };
};

// Un pago de tarjeta visto como un gasto más, para los gráficos por categoría.
// No se guarda así en ningún lado: se arma al vuelo.
export const pagoComoGasto = (p, cat) => ({
  id: "pago-" + p.id,
  amount: Number(p.amount) || 0,
  description: "Pago de tarjeta",
  date: p.date,
  category: cat,
  ...(p.currency === "USD" ? { currency: "USD" } : {}),
  esPagoTC: true,
});

// Los pagos de un mes, ya convertidos. `mes` es la etiqueta ("Octubre 2026") o
// null para traerlos todos (la vista "Todo el histórico").
export const pagosComoGastos = (data, mes) => {
  const cat = categoriaPagoTC(data);
  return (data?.cardPayments || [])
    .filter(p => p && p.date && (Number(p.amount) || 0) > 0)
    .filter(p => !mes || monthLabelOf(new Date(p.date)) === mes)
    .map(p => pagoComoGasto(p, cat));
};

// Funciones puras extraídas del monolito GastosApp.js (misma lógica, firmas puras).

// Gasto por categoría del mes indicado — antes useMemo `catSpend`.
export const catSpend = (data, curMonth) => {
  const m = {};
  [...data.expenses.filter(e => e.month === curMonth), ...pagosComoGastos(data, curMonth)]
    .filter(isPEN)
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


  // F33: el gasto es cuando SALE la plata, no cuando se compra.
  //
  // Ella lo explicó así: "lo que gasté con la tarjeta no fue un gasto real
  // porque la tarjeta no es dinero real; yo lo estoy pagando. Si gasté en
  // setiembre y lo pago en octubre, esa plata sale de mi bolsillo en octubre".
  //
  // Es un modelo completo y sin doble conteo: una compra con tarjeta no cuenta
  // al comprarla, cuenta cuando se paga la tarjeta. Las de efectivo y débito
  // cuentan el mismo día, porque ahí la plata sale al toque.
  //
  // `totalCompras` (todo lo consumido, se haya pagado o no) se mantiene aparte:
  // es lo que miran los presupuestos por categoría, que sí son de consumo.
  const totalConTarjeta = redondea(totalCompras - diariosDeCuenta);
  const totalDiarios = redondea(diariosDeCuenta + totalPagosTC);

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

  // F39: lo que tiene HOY de verdad. Igual que `balance`, pero contando solo los
  // ingresos que ya entraron.
  //
  // Ella lo pidió así: "no quiero que salga la suma de lo que tengo y lo que me
  // va a entrar, porque recién se hará visible en sus días correspondientes".
  // Un sueldo que entra el 29 no es plata que pueda gastar el 1.
  //
  // En un mes pasado los dos números coinciden: ya entró todo.
  const balanceHoy = redondea(totalRecibido - totalFijos - totalDiarios);
  return {
    exps, ingresos: todosInc, totalDiarios, totalCompras, totalConTarjeta, totalDiariosUSD, totalFijos, totalFijosAll,
    totalInc, totalIncUSD, balance, balanceHoy,
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
