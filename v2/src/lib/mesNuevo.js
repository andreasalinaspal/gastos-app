import { MONTHS, normalizaDiaDelMes } from "./dates";
import { genId } from "./format";

// F15: los fijos del mes nuevo.
//
// El problema: `data.fixed` y `data.incomeFixed` se guardan POR MES
// ("Septiembre 2026") y nada los arrastra al mes siguiente, así que cada mes
// nace vacío. A la usuaria sus cuatro ingresos fijos le quedaron atrapados en un
// mes viejo y desde entonces su pantalla de Ingresos marcaba S/0.
//
// La solución que eligió ella: que Qori le PREGUNTE al abrir el mes. No se copian
// solos (un fijo puede haberse terminado o cambiado de monto) ni se dejan en cero
// en silencio. Todo acá es puro: quién pregunta y cuándo lo decide el llamador.

const TIPOS = ["manual", "debito", "sueldo"];

// "Septiembre 2026" → { mes: 8, anio: 2026 }, o null si no se parece a una etiqueta.
export function parseEtiqueta(label) {
  const partes = String(label || "").trim().split(/\s+/);
  if (partes.length !== 2) return null;
  const mes = MONTHS.indexOf(partes[0]);
  const anio = Number(partes[1]);
  if (mes < 0 || !Number.isInteger(anio)) return null;
  return { mes, anio };
}

export function armaEtiqueta(mes, anio) { return MONTHS[mes] + " " + anio; }

// La etiqueta de `n` meses antes de `label`. Se calcula desde la etiqueta misma
// (no desde hoy) para que la lógica sea pura y se pueda probar sin tocar el reloj.
export function etiquetaAtras(label, n) {
  const p = parseEtiqueta(label);
  if (!p) return null;
  const total = p.anio * 12 + p.mes - n;
  return armaEtiqueta(((total % 12) + 12) % 12, Math.floor(total / 12));
}

const filasDelMes = (lista, mes) => (lista || []).filter(x => x && x.month === mes);
const tieneAlgo = (data, mes) =>
  filasDelMes(data && data.fixed, mes).length > 0 || filasDelMes(data && data.incomeFixed, mes).length > 0;

// El mes más reciente con fijos o ingresos fijos, mirando hasta `maxAtras` meses
// atrás. Nunca devuelve el mes actual.
//
// Por qué 3 y no "el último mes que tenga algo": la usuaria pidió NO arrastrar
// sus datos viejos. Mirar 3 meses atrás deja fuera lo que quedó atrapado hace
// medio año y a la vez cubre que no abra la app durante un mes.
export function mesOrigen(data, mesActual, maxAtras = 3) {
  if (!data || !parseEtiqueta(mesActual)) return null;
  for (let n = 1; n <= maxAtras; n++) {
    const mes = etiquetaAtras(mesActual, n);
    if (mes && tieneAlgo(data, mes)) return mes;
  }
  return null;
}

// Lo que había en ese mes, sin ids: son plantillas para que ella confirme, no
// filas todavía. El `day` del ingreso (F14) y el `type` del gasto se conservan.
export function plantillaDelMes(data, mes) {
  if (!data || !mes) return { ingresos: [], gastos: [] };
  return {
    ingresos: filasDelMes(data.incomeFixed, mes).map(i => ({
      name: String(i.name || ""),
      amount: Number(i.amount) || 0,
      day: normalizaDiaDelMes(i.day),
    })),
    gastos: filasDelMes(data.fixed, mes).map(f => ({
      name: String(f.name || ""),
      type: TIPOS.includes(f.type) ? f.type : "manual",
      amount: Number(f.amount) || 0,
    })),
  };
}

// ¿Ya se preguntó (o descartó) por este mes? El flag lo guarda el llamador
// (localStorage); acá solo se acepta la forma en que venga.
function yaVisto(flagsVistos, mesActual) {
  if (!flagsVistos) return false;
  if (flagsVistos === true) return true;
  if (typeof flagsVistos.has === "function") return flagsVistos.has(mesActual);
  if (Array.isArray(flagsVistos)) return flagsVistos.includes(mesActual);
  if (typeof flagsVistos === "object") return !!flagsVistos[mesActual];
  return false;
}

// Solo se pregunta si el mes actual está vacío de fijos, hay de dónde copiar, y
// no se preguntó ya por este mes.
export function necesitaConfirmar(data, mesActual, flagsVistos) {
  if (!data || !parseEtiqueta(mesActual)) return false;
  if (tieneAlgo(data, mesActual)) return false;
  if (yaVisto(flagsVistos, mesActual)) return false;
  return mesOrigen(data, mesActual) !== null;
}

const clave = (n) => String(n || "").trim().toLowerCase();

// Crea en el mes actual solo lo que ella confirmó, con los montos que ya editó.
// Los meses anteriores no se tocan, y un nombre que ya existe en el mes actual no
// se duplica.
export function aplicarPlantilla(data, mesActual, seleccion) {
  if (!data || !parseEtiqueta(mesActual)) return data;
  const sel = seleccion || {};

  const yaIng = new Set(filasDelMes(data.incomeFixed, mesActual).map(i => clave(i.name)));
  const nuevosIng = [];
  for (const i of sel.ingresos || []) {
    const name = String((i && i.name) || "").trim();
    if (!name || yaIng.has(clave(name))) continue;
    yaIng.add(clave(name));
    nuevosIng.push({ id: genId(), name, amount: Number(i.amount) || 0, month: mesActual, day: normalizaDiaDelMes(i.day) });
  }

  const yaFij = new Set(filasDelMes(data.fixed, mesActual).map(f => clave(f.name)));
  const nuevosFij = [];
  for (const f of sel.gastos || []) {
    const name = String((f && f.name) || "").trim();
    if (!name || yaFij.has(clave(name))) continue;
    yaFij.add(clave(name));
    nuevosFij.push({
      id: genId(), name,
      type: TIPOS.includes(f && f.type) ? f.type : "manual",
      amount: Number(f.amount) || 0,
      paid: false, month: mesActual,
    });
  }

  if (nuevosIng.length === 0 && nuevosFij.length === 0) return data;
  return {
    ...data,
    incomeFixed: [...(data.incomeFixed || []), ...nuevosIng],
    fixed: [...(data.fixed || []), ...nuevosFij],
  };
}
