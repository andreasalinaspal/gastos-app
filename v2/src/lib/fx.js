// Tipo de cambio referencial (F12): lógica pura, sin red y sin React.
//
// Regla de oro: el equivalente en soles de una deuda en dólares es INFORMATIVO.
// Nunca se suma a un total en soles. La prueba de "si me alcanza" sigue siendo
// solo con soles, porque los dólares se pagan aparte y en dólares.
//
// De dónde sale la tasa, en orden:
//   1. El override manual de la tarjeta (`card.usdRate`): el que la usuaria leyó
//      en su estado de cuenta. Ese es el real para ESA tarjeta.
//   2. El último tipo de cambio conocido guardado en `data.fx` (SUNAT o fallback).
//   3. Nada: no se muestra el equivalente. Nunca se inventa un número.

// Días que puede tener una tasa antes de considerarse vieja.
export const DIAS_FRESCA = 7;

// Convierte un monto en dólares a soles con una tasa dada, redondeado a 2 decimales.
// → null si el monto o la tasa no sirven (así quien llama simplemente no muestra nada).
export function convertirAPEN(montoUSD, tasa) {
  const m = Number(montoUSD);
  const t = Number(tasa);
  if (!Number.isFinite(m) || !Number.isFinite(t) || t <= 0) return null;
  return Math.round(m * t * 100) / 100;
}

// Tasa que se le aplica a una tarjeta. → { tasa, fuente, fecha } o null.
//   - fuente "tu banco" cuando la usuaria puso el tipo de cambio de su estado de cuenta.
//   - fuente "SUNAT" / "referencial" cuando viene de `data.fx`.
// `data` puede ser el blob completo (con `data.fx`) o el propio objeto fx.
export function tasaVigente(card, data) {
  const manual = card && Number(card.usdRate);
  if (Number.isFinite(manual) && manual > 0) {
    return { tasa: manual, fuente: "tu banco", fecha: null };
  }
  const fx = data && (data.fx || (data.venta !== undefined ? data : null));
  const guardada = fx && Number(fx.venta);
  if (Number.isFinite(guardada) && guardada > 0) {
    return { tasa: guardada, fuente: fx.fuente || "referencial", fecha: fx.fecha || null };
  }
  return null;
}

// ¿La tasa tiene más de una semana? → true si está vieja.
// Sin fecha no se puede saber: se trata como NO vieja para no gritar de más
// (el override manual de la tarjeta no lleva fecha, por ejemplo).
export function esTasaVieja(fecha, hoy = new Date()) {
  if (!fecha) return false;
  const d = fecha instanceof Date ? fecha : new Date(String(fecha).length === 10 ? fecha + "T12:00:00" : fecha);
  if (isNaN(d)) return false;
  const dias = (startOfDay(hoy) - startOfDay(d)) / 86400000;
  return dias > DIAS_FRESCA;
}

// Número de la tasa en texto, sin ceros de relleno: 3.425, 3.4, 3.
const tasaTexto = (t) => String(Math.round(Number(t) * 1000) / 1000);

const fechaCorta = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(String(fecha).length === 10 ? fecha + "T12:00:00" : fecha);
  return isNaN(d) ? null : d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
};

// La parte que explica de dónde sale el número, siempre fechada y etiquetada.
// Ej: "tipo de cambio 3.425 (SUNAT, 28 set.)" — con "(desactualizado)" si ya
// pasó una semana.
export function textoTasa(vigente, hoy = new Date()) {
  if (!vigente || !(Number(vigente.tasa) > 0)) return "";
  const origen = vigente.fuente === "tu banco" ? "el de tu banco" : (vigente.fuente || "referencial");
  const fecha = vigente.fecha ? fechaCorta(vigente.fecha) : null;
  const detalle = fecha ? origen + ", " + fecha : origen;
  const base = "tipo de cambio " + tasaTexto(vigente.tasa) + " (" + detalle + ")";
  return esTasaVieja(vigente.fecha, hoy) ? base + " (desactualizado)" : base;
}

function startOfDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
