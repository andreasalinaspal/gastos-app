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
    // Gmail, al pasar el HTML a texto, a veces deja la etiqueta y el valor en la
    // misma línea separados por espacios en vez de por un salto. Se exige una
    // separación de 2+ espacios para no confundir "Monto" con "Monto y moneda",
    // donde después de la etiqueta viene un solo espacio y sigue el nombre.
    if (l.startsWith(objetivo)) {
      const resto = lineas[i].slice(etiqueta.length);
      if (/^[ \t ]{2,}\S/.test(resto)) return limpia(resto);
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
//
// BBVA la manda en 24 horas y sin AM/PM ("19:09:47"), así que si no hay AM/PM se
// intenta leerla así. El orden importa: primero AM/PM, porque "07:52 PM" también
// calza con el patrón de 24 horas y daría las 7 de la mañana.
export function horaAMPM(raw) {
  const txt = limpia(raw);
  const m = /(\d{1,2}):(\d{2})\s*([AP])\.?M\.?/i.exec(txt);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "P") h += 12;
    return { h, min: Number(m[2]) };
  }
  const m24 = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(txt);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h <= 23 && min <= 59) return { h, min };
  }
  return { h: 12, min: 0 };
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

// F47: transferencia enviada. Es plata que sale de su cuenta, así que es un
// gasto — pero el destinatario puede ser cualquiera (un colegio, una persona,
// incluso otra cuenta suya), así que el nombre va tal cual y ella decide en la
// bandeja. El monto que importa es el TOTAL: la comisión también salió.
function interbankTransferencia(cuerpo) {
  const monto = campo(cuerpo, "Monto total") || campo(cuerpo, "Monto y moneda") || campo(cuerpo, "Monto");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const fecha = fechaTextual(campo(cuerpo, "Fecha y hora"));
  const destino = campo(cuerpo, "Cuenta destino");
  return {
    accion: "registrar",
    tipo: "transferencia",
    payload: {
      amount: monto,
      merchant: destino ? "Transferencia a " + destino : "Transferencia",
      // De qué cuenta salió: "Ahorro Sueldo". El banco la escribe de las dos
      // formas según la plantilla.
      cardHint: campo(cuerpo, "Cuenta a cargo") || campo(cuerpo, "Cuenta cargo"),
      occurredAt: fecha ? fecha.toISOString() : null,
      source: "correo",
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
  if (a.includes("constancia de transferencia")) return interbankTransferencia(cuerpo);
  return { accion: "no-reconocido", motivo: "asunto no reconocido" };
}

// ── BBVA ──────────────────────────────────────────────────────────────────
// Plantilla distinta a la de Interbank: la moneda viene en su propio campo
// ("PEN"/"USD"), el monto va pelado y sin símbolo ("21.50"), y la hora en 24h.

const SIMBOLO = { PEN: "S/", USD: "US$" };

// "PEN" | "Soles" | "S/" → "PEN". Lo que no se reconozca devuelve null: sin
// moneda no se inventa nada.
function monedaBBVA(raw) {
  const m = plano(raw);
  if (!m) return null;
  if (m.includes("usd") || m.includes("dolar") || m.includes("us$")) return "USD";
  if (m.includes("pen") || m.includes("sol") || m.includes("s/")) return "PEN";
  return null;
}

function bbvaConsumo(cuerpo) {
  const monto = campo(cuerpo, "Monto");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const moneda = monedaBBVA(campo(cuerpo, "Moneda"));
  if (!moneda) return { accion: "no-reconocido", motivo: "no encontré la moneda" };

  const fecha = fechaDMY(campo(cuerpo, "Fecha"), campo(cuerpo, "Hora"));
  // "Este se cargará a tu tarjeta terminada en *1849" — los últimos 4 son lo
  // único que distingue una tarjeta de otra en este correo.
  const mt = /terminada en\s*\*?\s*(\d{4})/i.exec(limpia(cuerpo));

  return {
    accion: "registrar",
    tipo: "consumo",
    payload: {
      // El monto viaja con símbolo para que la ingesta deduzca la moneda por el
      // mismo camino que los demás bancos, ya probado.
      amount: SIMBOLO[moneda] + " " + monto,
      merchant: campo(cuerpo, "Comercio") || "Compra",
      cardHint: mt ? "BBVA ••" + mt[1] : "BBVA",
      occurredAt: fecha ? fecha.toISOString() : null,
      source: "correo",
    },
  };
}

// Pago de tarjeta propia. Con el modelo de caja SÍ es un gasto —la plata sale de
// su cuenta ese día— pero la bandeja de pendientes solo sabe crear gastos
// sueltos, y un pago además tiene que bajar el saldo de UNA tarjeta.
// Registrarlo acá como gasto a secas dejaría la deuda intacta, y si después lo
// anota desde la tarjeta quedaría contado dos veces.
// Por eso se reconoce y se descarta con su motivo, hasta que la bandeja aprenda
// a crear pagos. El motivo lleva los últimos 4 para que se sepa cuál era.
function bbvaPagoTarjeta(cuerpo) {
  const mt = /n[uú]mero de tarjeta\s*\n+\s*[•*]?\s*(\d{4})/i.exec(String(cuerpo || ""));
  const cual = mt ? " (la ••" + mt[1] + ")" : "";
  return {
    accion: "ignorar",
    motivo: "es un pago de tarjeta" + cual + ": anótalo desde la tarjeta, así baja tu saldo y cuenta como gasto",
  };
}

const IGNORAR_BBVA = [
  { clave: "estado de cuenta", motivo: "es el resumen del mes, no un movimiento" },
  { clave: "recibiste", motivo: "es un ingreso, no un gasto" },
  { clave: "abono", motivo: "es un ingreso, no un gasto" },
  { clave: "clave", motivo: "no es un movimiento" },
];

export function leeBBVA({ asunto, cuerpo }) {
  const a = plano(asunto);
  if (a.includes("pago de tarjeta") || a.includes("pagar tarjetas propias") || a.includes("pago de tarjetas")) {
    return bbvaPagoTarjeta(cuerpo);
  }
  for (const r of IGNORAR_BBVA) {
    if (a.includes(r.clave)) return { accion: "ignorar", motivo: r.motivo };
  }
  if (a.includes("realizado un consumo")) return bbvaConsumo(cuerpo);
  return { accion: "no-reconocido", motivo: "asunto no reconocido" };
}

// ── BCP ───────────────────────────────────────────────────────────────────
// Tercera plantilla, tercer formato: BCP escribe la etiqueta y el valor en la
// MISMA línea separados por un solo espacio ("Empresa RIPLEY MIRAFLORES"), así
// que `campo` —que exige dos espacios o un salto— no sirve acá.

// "Empresa RIPLEY MIRAFLORES" → "RIPLEY MIRAFLORES".
// Se compara sobre la línea sin tildes para que "Número"/"Numero" den igual, y
// se exige que la etiqueta ocupe el inicio exacto: así "Número de operación" no
// se come lo de "Número de Tarjeta de Crédito".
export function campoBCP(cuerpo, etiqueta) {
  const objetivo = plano(etiqueta);
  for (const cruda of String(cuerpo || "").split(/\r?\n/)) {
    const linea = limpia(cruda);
    const l = plano(linea);
    if (!l.startsWith(objetivo)) continue;
    const resto = linea.slice(etiqueta.length);
    if (!/^\s/.test(resto)) continue; // "Empresas" no es "Empresa"
    const valor = limpia(resto);
    if (valor) return valor;
  }
  return "";
}

// "03 de octubre de 2026 - 01:34 PM" → Date
export function fechaLarga(raw) {
  const m = /^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+de\s+(\d{4})(?:\s*[-–]\s*(.+))?$/.exec(limpia(raw));
  if (!m) return null;
  const mes = MESES[plano(m[2]).slice(0, 3)];
  if (mes === undefined) return null;
  const t = horaAMPM(m[4] || "");
  const out = new Date(Number(m[3]), mes, Number(m[1]), t.h, t.min, 0, 0);
  return isNaN(out.getTime()) ? null : out;
}

function bcpConsumo(cuerpo) {
  const monto = campoBCP(cuerpo, "Total del consumo") || campoBCP(cuerpo, "Monto");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const fecha = fechaLarga(campoBCP(cuerpo, "Fecha y hora"));
  // "************6957" — los últimos 4 son lo único que identifica la tarjeta.
  const tarjeta = campoBCP(cuerpo, "Número de Tarjeta de Crédito") || campoBCP(cuerpo, "Número de Tarjeta");
  const ult4 = /(\d{4})\s*$/.exec(tarjeta || "");
  return {
    accion: "registrar",
    tipo: "consumo",
    payload: {
      amount: monto,
      merchant: campoBCP(cuerpo, "Empresa") || "Compra",
      cardHint: ult4 ? "BCP ••" + ult4[1] : "BCP",
      occurredAt: fecha ? fecha.toISOString() : null,
      source: "correo",
      externalId: campoBCP(cuerpo, "Número de operación") || undefined,
    },
  };
}

const IGNORAR_BCP = [
  { clave: "estado de cuenta", motivo: "es el resumen del mes, no un movimiento" },
  { clave: "recibiste", motivo: "es un ingreso, no un gasto" },
  { clave: "abono", motivo: "es un ingreso, no un gasto" },
  { clave: "clave", motivo: "no es un movimiento" },
];

export function leeBCP({ asunto, cuerpo }) {
  const a = plano(asunto);
  if (a.includes("pago de tarjeta") || a.includes("pagaste tu tarjeta")) {
    return { accion: "ignorar", motivo: "es un pago de tarjeta: anótalo desde la tarjeta, así baja tu saldo y cuenta como gasto" };
  }
  for (const r of IGNORAR_BCP) {
    if (a.includes(r.clave)) return { accion: "ignorar", motivo: r.motivo };
  }
  if (a.includes("realizaste un consumo")) return bcpConsumo(cuerpo);
  return { accion: "no-reconocido", motivo: "asunto no reconocido" };
}

// ── Yape ──────────────────────────────────────────────────────────────────
// OJO con el alcance: Yape NO manda correo por los yapeos normales (de persona
// a persona ni los QR en comercios). Solo por **pagos de servicios** y por
// compras en Yape Promos. Lo demás vive únicamente dentro de la app, así que
// esos gastos se siguen anotando a mano.
//
// Mezcla los dos formatos según el correo: el de servicios pone la etiqueta en
// su propia línea, el de Yape Promos la pone pegada al valor con un solo
// espacio. Se prueban los dos extractores.
const campoYape = (cuerpo, etiqueta) => campo(cuerpo, etiqueta) || campoBCP(cuerpo, etiqueta);

function yapeServicio(cuerpo) {
  const monto = campoYape(cuerpo, "Monto total");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  const empresa = campoYape(cuerpo, "Empresa");
  const servicio = campoYape(cuerpo, "Servicio");
  return {
    accion: "registrar",
    tipo: "yape-servicio",
    payload: {
      amount: monto,
      merchant: empresa ? (servicio ? empresa + " · " + servicio : empresa) : "Pago de servicio por Yape",
      cardHint: "Yape",
      occurredAt: (fechaTextual(campoYape(cuerpo, "Fecha y hora")) || {}).toISOString?.() || null,
      source: "correo",
      externalId: campoYape(cuerpo, "Nº de operación Yape") || campoYape(cuerpo, "Número de operación Yape") || undefined,
    },
  };
}

function yapePago(cuerpo, queEs) {
  const monto = campoYape(cuerpo, "Monto total");
  if (!monto) return { accion: "no-reconocido", motivo: "no encontré el monto" };
  return {
    accion: "registrar",
    tipo: "yape-pago",
    payload: {
      amount: monto,
      merchant: campoYape(cuerpo, "Comercio") || queEs,
      cardHint: "Yape",
      occurredAt: (fechaTextual(campoYape(cuerpo, "Fecha y hora")) || {}).toISOString?.() || null,
      source: "correo",
      externalId: campoYape(cuerpo, "Número de operación Yape") || campoYape(cuerpo, "Nº de operación Yape") || undefined,
    },
  };
}

const IGNORAR_YAPE = [
  { clave: "biometria", motivo: "no es un movimiento" },
  { clave: "clave", motivo: "no es un movimiento" },
  { clave: "ingresaste a yape", motivo: "no es un movimiento" },
  { clave: "bienvenida", motivo: "no es un movimiento" },
  { clave: "terminos y condiciones", motivo: "no es un movimiento" },
  { clave: "encuesta", motivo: "no es un movimiento" },
  { clave: "recibiste", motivo: "es un ingreso, no un gasto" },
];

export function leeYape({ asunto, cuerpo }) {
  const a = plano(asunto);
  for (const r of IGNORAR_YAPE) {
    if (a.includes(r.clave)) return { accion: "ignorar", motivo: r.motivo };
  }
  if (a.includes("yapeo de servicio")) return yapeServicio(cuerpo);
  if (a.includes("constancia de transferencia")) return yapePago(cuerpo, "Pago por Yape");
  if (a.includes("tu compra de") && a.includes("exitosa")) return yapePago(cuerpo, "Compra por Yape");
  return { accion: "no-reconocido", motivo: "asunto no reconocido" };
}

// ── Punto de entrada ──────────────────────────────────────────────────────

const BANCOS = [
  { nombre: "Interbank", dominios: ["netinterbank.com.pe", "interbank.pe", "interbank.com.pe"], lee: leeInterbank },
  { nombre: "BBVA", dominios: ["bbva.com.pe", "bbva.pe", "bbvacontinental.pe"], lee: leeBBVA },
  { nombre: "BCP", dominios: ["notificacionesbcp.com.pe", "viabcp.com", "bcp.com.pe"], lee: leeBCP },
  { nombre: "Yape", dominios: ["yape.pe", "yape.com.pe"], lee: leeYape },
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
