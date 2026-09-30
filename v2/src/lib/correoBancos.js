// F28: leer los avisos que mandan los bancos al correo.
//
// Por qué vive acá y no en el script de Gmail: los bancos cambian sus plantillas
// sin avisar. Si el análisis estuviera en el script de Google, ella tendría que
// volver a editarlo cada vez. Así el script solo reenvía el correo crudo y el
// arreglo se despliega desde acá.
//
// Regla de oro: ante la duda, NO se registra. Cada aviso que no se entiende del
// todo se devuelve como "no-reconocido" y se queda fuera. Un gasto que falta se
// nota y se anota a mano; uno inventado envenena las cuentas sin que se vea.

const MESES = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, set: 8, sep: 8, oct: 9, nov: 10, dic: 11,
};

const limpia = (s) => String(s === undefined || s === null ? "" : s).replace(/\s+/g, " ").trim();

// Texto sin tildes y en minúsculas, para comparar sin sufrir.
const plano = (s) => limpia(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Busca "Etiqueta: valor" o la etiqueta en una línea y el valor en la siguiente
// (los correos en HTML suelen partirlo así al pasarlos a texto).
export function campo(cuerpo, etiqueta) {
  const lineas = String(cuerpo || "").split(/\r?\n/).map(l => l.trim());
  const objetivo = plano(etiqueta);
  for (let i = 0; i < lineas.length; i++) {
    const l = plano(lineas[i]);
    if (l === objetivo || l === objetivo + ":") {
      // Valor en las líneas siguientes: se salta lo vacío.
      for (let k = i + 1; k < lineas.length; k++) {
        if (lineas[k]) return limpia(lineas[k]);
      }
      return "";
    }
    if (l.startsWith(objetivo + ":")) {
      return limpia(lineas[i].slice(lineas[i].indexOf(":") + 1));
    }
  }
  return "";
}

// "29/09/2026" + "07:52 PM" → Date
export function fechaDMY(fecha, hora) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(limpia(fecha));
  if (!m) return null;
  const [, d, mes, a] = m;
  const t = horaAMPM(hora);
  const out = new Date(Number(a), Number(mes) - 1, Number(d), t.h, t.min, 0, 0);
  return isNaN(out.getTime()) ? null : out;
}

// "28 Sep 2026 10:41 AM" → Date
export function fechaTextual(raw) {
  const m = /^(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3,})\.?\s+(\d{4})(?:\s+(.+))?$/.exec(limpia(raw));
  if (!m) return null;
  const mes = MESES[plano(m[2]).slice(0, 3)];
  if (mes === undefined) return null;
  const t = horaAMPM(m[4] || "");
  const out = new Date(Number(m[3]), mes, Number(m[1]), t.h, t.min, 0, 0);
  return isNaN(out.getTime()) ? null : out;
}

// "07:52 PM" → { h: 19, min: 52 }. Sin hora reconocible, mediodía: así la fecha
// no se corre de día por la zona horaria.
export function horaAMPM(raw) {
  const m = /(\d{1,2}):(\d{2})\s*([AP])\.?M\.?/i.exec(limpia(raw));
  if (!m) return { h: 12, min: 0 };
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "P") h += 12;
  return { h, min: Number(m[2]) };
}

// ── Interbank ─────────────────────────────────────────────────────────────
// Un solo remitente para todo (servicioalcliente@netinterbank.com.pe), así que
// el tipo se decide por el asunto.

function interbankConsumo(asunto, cuerpo) {
  const monto = campo(cuerpo, "Monto");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const fecha = fechaDMY(campo(cuerpo, "Fecha"), campo(cuerpo, "Hora"));
  // El asunto trae la tarjeta: "...realizaste un consumo con tu Tarjeta Amex".
  const mt = /con tu\s+(.+?)\s*$/i.exec(limpia(asunto));
  return {
    accion: "registrar",
    tipo: "consumo",
    payload: {
      amount: monto,                                   // "S/. 38.00" — el monto se normaliza en la ingesta
      merchant: campo(cuerpo, "Comercio") || "Compra",
      cardHint: mt ? mt[1] : campo(cuerpo, "Tarjeta"),
      occurredAt: fecha ? fecha.toISOString() : null,
      source: "correo",
    },
  };
}

function interbankPlin(cuerpo) {
  const monto = campo(cuerpo, "Monto y moneda") || campo(cuerpo, "Monto");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const fecha = fechaTextual(campo(cuerpo, "Fecha y hora"));
  const quien = campo(cuerpo, "Destinatario");
  return {
    accion: "registrar",
    tipo: "plin-enviado",
    payload: {
      amount: monto,
      merchant: quien ? "Plin a " + quien : "Plin",
      // De qué cuenta salió: "Ahorro Sueldo". Si no empareja, ella elige el medio.
      cardHint: campo(cuerpo, "Cuenta cargo"),
      occurredAt: fecha ? fecha.toISOString() : null,
      source: "correo",
      // El código del banco identifica la operación aunque el correo se relea.
      externalId: campo(cuerpo, "Código de operación") || undefined,
    },
  };
}

// Asuntos que NO son un gasto. Se reconocen a propósito para descartarlos con
// motivo, en vez de dejarlos caer en "no-reconocido" y no saber nunca por qué.
const IGNORAR_INTERBANK = [
  { clave: "pago de tu tarjeta", motivo: "pagar la tarjeta no es un gasto: liquida compras ya registradas" },
  { clave: "pago de tarjeta", motivo: "pagar la tarjeta no es un gasto: liquida compras ya registradas" },
  { clave: "estado de cuenta", motivo: "es el resumen del mes, no un movimiento" },
  { clave: "recibiste un plin", motivo: "es un ingreso, no un gasto" },
  { clave: "abono", motivo: "es un ingreso, no un gasto" },
  { clave: "clave", motivo: "no es un movimiento" },
];

export function leeInterbank({ asunto, cuerpo }) {
  const a = plano(asunto);
  for (const r of IGNORAR_INTERBANK) {
    if (a.includes(r.clave)) return { accion: "ignorar", motivo: r.motivo };
  }
  if (a.includes("realizaste un consumo")) return interbankConsumo(asunto, cuerpo);
  if (a.includes("constancia de pago plin")) return interbankPlin(cuerpo);
  return { accion: "no-reconocido", motivo: "asunto no reconocido" };
}

// ── Punto de entrada ──────────────────────────────────────────────────────

const BANCOS = [
  { nombre: "Interbank", dominios: ["netinterbank.com.pe", "interbank.pe", "interbank.com.pe"], lee: leeInterbank },
];

export function bancoDe(remitente) {
  const r = plano(remitente);
  return BANCOS.find(b => b.dominios.some(d => r.includes(d))) || null;
}

/**
 * Lee un aviso de banco.
 * → { accion: "registrar", tipo, payload }
 * → { accion: "ignorar", motivo }        — reconocido, pero no es un gasto
 * → { accion: "no-reconocido", motivo }  — no se entendió; NO se registra
 */
export function leeAvisoBancario({ remitente, asunto, cuerpo }) {
  const banco = bancoDe(remitente);
  if (!banco) return { accion: "no-reconocido", motivo: "remitente desconocido" };
  const r = banco.lee({ asunto, cuerpo });
  return r.accion === "registrar" ? { ...r, banco: banco.nombre } : r;
}
