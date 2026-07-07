export const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
export const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const DAYS = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];

export function getToday() { const d = new Date(); return DAYS[d.getDay()].toUpperCase() + ", " + d.getDate() + " DE " + MONTHS[d.getMonth()].toUpperCase(); }
export function getCurrentMonthLabel() { const d = new Date(); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
export function getMonthLabel(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
export function getMonthShort(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear(); }
