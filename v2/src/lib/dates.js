export const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const DAYS = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];

export function getToday() { const d = new Date(); return DAYS[d.getDay()].toUpperCase() + ", " + d.getDate() + " DE " + MONTHS[d.getMonth()].toUpperCase(); }
export function getCurrentMonthLabel() { const d = new Date(); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
export function getMonthLabel(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
export function getMonthShort(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear(); }

// Etiqueta de mes ("Marzo 2026") a partir de una fecha concreta — la misma forma
// que usa `month` en los gastos, para que un gasto con fecha de otro mes caiga en ESE mes.
export function monthLabelOf(date) { return MONTHS[date.getMonth()] + " " + date.getFullYear(); }

// yyyy-mm-dd en hora LOCAL (toISOString se corre de día con UTC-5 por la tarde).
export function toDateInput(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + p(date.getMonth() + 1) + "-" + p(date.getDate());
}

// Parsea un value de <input type="date"> al mediodía local para no correrse de día.
export function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// Normaliza la fecha que detecta el escaneo a un value de <input type="date">.
// El recibo puede traer la fecha sin año ("14 mar"), en cuyo caso se asume el
// año actual — pero la usuaria la ve en el input y puede corregirla antes de
// registrar, en vez de que la app decida en silencio.
export function scanDateToInput(raw, hoy = new Date()) {
  if (!raw) return toDateInput(hoy);
  const intentos = [String(raw) + "T12:00:00", String(raw)];
  for (const intento of intentos) {
    const d = new Date(intento);
    if (!isNaN(d.getTime())) {
      if (!/\d{4}/.test(String(raw))) d.setFullYear(hoy.getFullYear());
      return toDateInput(d);
    }
  }
  return toDateInput(hoy);
}
