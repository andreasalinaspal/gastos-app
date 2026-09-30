// F25: deudas por cobrar — la plata que a ELLA le deben.
//
// Lo pidió para llevarles la trazabilidad: cuánto le deben, qué le han ido
// pagando y, cuando hay cuotas, cuál vence y cuántas faltan.
//
// Regla que se respeta igual que en el resto de la app: los dólares no se
// convierten solos. Una deuda en dólares se cobra en dólares y se totaliza
// aparte; nunca se suma a los soles.
//
// Lo que NO hace, a propósito: cuando le pagan, eso no se registra como
// ingreso. Que te devuelvan una plata que ya era tuya no es plata nueva, y
// meterla en los ingresos del mes le inflaría el balance.

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const redondea = (n) => Math.round(n * 100) / 100;

export const curOfDeuda = (d) => (d && d.currency === "USD" ? "USD" : "PEN");

// Lo que ya le pagaron de esa deuda.
export function pagado(d) {
  return redondea((d && d.pagos ? d.pagos : []).reduce((s, p) => s + (Number(p && p.amount) || 0), 0));
}

// Lo que todavía le deben. Nunca negativo: si le pagaron de más, la deuda está
// saldada y el exceso no se arrastra como saldo a favor.
export function saldo(d) {
  const total = Number(d && d.amount) || 0;
  return redondea(Math.max(0, total - pagado(d)));
}

export const estaSaldada = (d) => saldo(d) < 0.005 && (Number(d && d.amount) || 0) > 0;

// Cuánto del total ya está cubierto, de 0 a 100.
export function progreso(d) {
  const total = Number(d && d.amount) || 0;
  if (total <= 0) return 0;
  return Math.min(100, redondea((pagado(d) / total) * 100));
}

// ── Cuotas ────────────────────────────────────────────────────────────────
// `d.cuotas = { n, primeraFecha }`: n cuotas iguales, la primera en esa fecha y
// las demás mes a mes. Se deriva todo de ahí para que no haya dos fuentes de
// verdad que puedan contradecirse.

export const tieneCuotas = (d) => {
  const n = Number(d && d.cuotas && d.cuotas.n);
  return Number.isInteger(n) && n > 1 && !!(d.cuotas.primeraFecha);
};

export function montoDeCuota(d) {
  if (!tieneCuotas(d)) return null;
  return redondea((Number(d.amount) || 0) / Number(d.cuotas.n));
}

// Las n fechas, mes a mes desde la primera. Si el mes no tiene ese día (un 31
// en febrero), cae al último del mes, igual que los cortes de tarjeta.
export function fechasDeCuotas(d) {
  if (!tieneCuotas(d)) return [];
  const base = new Date(d.cuotas.primeraFecha);
  if (isNaN(base.getTime())) return [];
  const dia = base.getDate();
  const out = [];
  for (let k = 0; k < Number(d.cuotas.n); k++) {
    const y = base.getFullYear(), m = base.getMonth() + k;
    const ultimo = new Date(y, m + 1, 0).getDate();
    out.push(new Date(y, m, Math.min(dia, ultimo), 12, 0, 0, 0));
  }
  return out;
}

// La próxima cuota que le toca cobrar: la primera que lo pagado todavía no
// cubre. → { numero, total, fecha, monto, vencida, diasParaVencer } o null si ya
// están todas cubiertas (o si la deuda no va por cuotas).
export function proximaCuota(d, hoy = new Date()) {
  if (!tieneCuotas(d)) return null;
  const monto = montoDeCuota(d);
  const fechas = fechasDeCuotas(d);
  const yaPagado = pagado(d);
  for (let k = 0; k < fechas.length; k++) {
    // Una cuota está cubierta cuando lo pagado alcanza su acumulado.
    if (yaPagado + 0.005 >= monto * (k + 1)) continue;
    const fecha = fechas[k];
    const dias = Math.round((startOfDay(fecha) - startOfDay(hoy)) / 86400000);
    return {
      numero: k + 1, total: fechas.length, fecha,
      // La última cuota se lleva el redondeo, para que las cuotas sumen el total.
      monto: k === fechas.length - 1 ? redondea((Number(d.amount) || 0) - monto * k) : monto,
      vencida: dias < 0, diasParaVencer: dias,
    };
  }
  return null;
}

// Cuántas cuotas ya cubrió lo pagado.
export function cuotasPagadas(d) {
  if (!tieneCuotas(d)) return 0;
  const monto = montoDeCuota(d);
  if (monto <= 0) return 0;
  return Math.min(Number(d.cuotas.n), Math.floor((pagado(d) + 0.005) / monto));
}

// ── Totales ───────────────────────────────────────────────────────────────

// Lo que le deben en total, SEPARADO por moneda. Nunca un total mezclado.
// → { PEN: { total, deudas }, USD: { total, deudas }, vencidas }
export function resumenDeudas(lista, hoy = new Date()) {
  const activas = (lista || []).filter(d => d && !d.archivada && !estaSaldada(d));
  const porMoneda = { PEN: { total: 0, deudas: [] }, USD: { total: 0, deudas: [] } };
  for (const d of activas) {
    const cur = curOfDeuda(d);
    porMoneda[cur].total = redondea(porMoneda[cur].total + saldo(d));
    porMoneda[cur].deudas.push(d);
  }
  const vencidas = activas.filter(d => {
    const c = proximaCuota(d, hoy);
    return !!(c && c.vencida);
  });
  return { ...porMoneda, vencidas };
}

// Orden de la lista: primero lo que está vencido, después por fecha de la
// próxima cuota, y al final lo que no tiene cuotas. Lo saldado, hasta abajo.
export function ordenaDeudas(lista, hoy = new Date()) {
  const peso = (d) => {
    if (estaSaldada(d)) return 3;
    const c = proximaCuota(d, hoy);
    if (c && c.vencida) return 0;
    return c ? 1 : 2;
  };
  return (lista || []).map((d, idx) => ({ d, idx })).sort((a, b) => {
    const pa = peso(a.d), pb = peso(b.d);
    if (pa !== pb) return pa - pb;
    const ca = proximaCuota(a.d, hoy), cb = proximaCuota(b.d, hoy);
    if (ca && cb) return ca.fecha - cb.fecha;
    return a.idx - b.idx;
  }).map(x => x.d);
}
