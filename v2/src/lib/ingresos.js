import { fechaDelDiaEnMes, normalizaDiaDelMes } from "./dates";

// F14: el día en que entra cada ingreso fijo.
// Sirve para lo que de verdad le importa: no basta con que el mes cuadre si la
// tarjeta vence ANTES de que le entre la plata. Todo acá es puro y trabaja solo
// en soles (los dólares se pagan aparte, igual que en el resto de la app).

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export const diaDeIngreso = (i) => normalizaDiaDelMes(i && i.day);

// Ordena los ingresos fijos como un calendario del mes: por día, y los que no
// tienen día al final (sin reordenar entre ellos).
export function ordenaPorDia(lista) {
  return (lista || []).map((i, idx) => ({ i, idx })).sort((a, b) => {
    const da = diaDeIngreso(a.i), db = diaDeIngreso(b.i);
    if (da === db) return a.idx - b.idx;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  }).map(x => x.i);
}

export const hayDiasConfigurados = (lista) => (lista || []).some(i => diaDeIngreso(i) !== null);

// Ingresos que sirven para la cuenta: con día Y con monto. Un ingreso con día
// pero en 0 todavía no es plata, así que no se usa para avisar nada.
const utiles = (lista) => (lista || []).filter(i => diaDeIngreso(i) !== null && (Number(i.amount) || 0) > 0);

// Todas las entradas de plata de esos ingresos, desde el 1 del mes de `now` y
// proyectadas a los dos meses siguientes (un vencimiento a 30 días puede caer en
// el mes que viene, y el ingreso fijo se repite igual).
export function entradasDeIngreso(ingresos, now = new Date()) {
  const out = [];
  for (const off of [0, 1, 2]) {
    const ref = new Date(now.getFullYear(), now.getMonth() + off, 1, 12, 0, 0, 0);
    for (const i of utiles(ingresos)) {
      const fecha = fechaDelDiaEnMes(i.day, ref);
      if (!fecha) continue;
      out.push({ id: i.id, name: i.name, day: diaDeIngreso(i), amount: Number(i.amount) || 0, fecha });
    }
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}

// El ingreso fijo más grande con día: el que la usuaria llamaría "su sueldo".
export function ingresoPrincipal(ingresos) {
  return utiles(ingresos).reduce((mejor, i) => (!mejor || (Number(i.amount) || 0) > (Number(mejor.amount) || 0) ? i : mejor), null);
}

// ¿Le llega la plata antes de cada vencimiento?
// `pagos` son los items de getUpcomingTotal(...).PEN.items (ya ordenados por
// dueDate y con `days`). Se acumula lo que vence hasta cada fecha y se compara
// con lo que habrá entrado hasta ese día inclusive.
// → { hayDias, hayDatos, principal, avisos: [...], enRiesgo }
export function chequeoDeIngresos(ingresosFijos, pagos, now = new Date()) {
  const hayDias = hayDiasConfigurados(ingresosFijos);
  const conMonto = utiles(ingresosFijos);
  const porVencer = (pagos || [])
    .filter(p => p && p.status === "por-vencer" && p.dueDate && p.days >= 0 && p.days <= 30)
    .sort((a, b) => a.dueDate - b.dueDate);
  const vacio = { hayDias, hayDatos: conMonto.length > 0, principal: ingresoPrincipal(ingresosFijos), avisos: [], enRiesgo: 0 };
  if (conMonto.length === 0 || porVencer.length === 0) return vacio;

  const entradas = entradasDeIngreso(conMonto, now);
  const avisos = [];
  let acumulado = 0;
  for (const p of porVencer) {
    const monto = Number(p.amount) || 0;
    acumulado += monto;
    const corte = startOfDay(p.dueDate);
    // El ingreso que entra EL MISMO día del vencimiento cuenta como que llegó.
    const recibido = entradas.reduce((s, e) => (startOfDay(e.fecha) <= corte ? s + e.amount : s), 0);
    const siguiente = entradas.find(e => startOfDay(e.fecha) > corte) || null;
    const alcanza = recibido + 0.005 >= acumulado;
    avisos.push({
      cardId: p.card ? p.card.id : null,
      cardName: p.card ? p.card.name : "",
      dueDate: p.dueDate,
      monto, acumulado, recibido, alcanza,
      faltan: alcanza ? 0 : acumulado - recibido,
      siguiente,
    });
  }
  return { hayDias, hayDatos: true, principal: ingresoPrincipal(ingresosFijos), avisos, enRiesgo: avisos.filter(a => !a.alcanza).length };
}

// El día que la usuaria ya le puso a ESE mismo ingreso en otro mes. Los ingresos
// fijos se registran una fila por mes: cuando vuelve a crear "Sueldo" en el mes
// nuevo, el día que ya había puesto no se le pierde.
export function diaHeredado(incomeFixed, nombre) {
  const clave = String(nombre || "").trim().toLowerCase();
  if (!clave) return null;
  for (let k = (incomeFixed || []).length - 1; k >= 0; k--) {
    const i = incomeFixed[k];
    if (!i || String(i.name || "").trim().toLowerCase() !== clave) continue;
    const dia = diaDeIngreso(i);
    if (dia !== null) return dia;
  }
  return null;
}
