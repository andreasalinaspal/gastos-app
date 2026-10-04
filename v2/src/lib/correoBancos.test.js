import { describe, it, expect } from "vitest";
import { leeAvisoBancario, leeInterbank, campo, fechaDMY, fechaTextual, horaAMPM, bancoDe } from "./correoBancos";
import { normalizeTransaction } from "./ingest";

// Los cuerpos están copiados TAL CUAL de sus correos reales. Si un banco cambia
// la plantilla, estas pruebas son las que avisan.

const IBK = "servicioalcliente@netinterbank.com.pe";

const CONSUMO_SOLES = {
  remitente: IBK,
  asunto: "Andrea Carolina, realizaste un consumo con tu Tarjeta Amex",
  cuerpo: `Interbank
Andrea Carolina, realizaste un consumo con tu Tarjeta Amex
Conoce el detalle:
Tarjeta: ****709
Comercio: Cineplanet
Monto: S/. 38.00
Fecha: 25/08/2026
Hora: 02:14 PM`,
};

const CONSUMO_DOLARES = {
  remitente: IBK,
  asunto: "Andrea Carolina, realizaste un consumo con tu Tarjeta Amex",
  cuerpo: `Interbank
Andrea Carolina, realizaste un consumo con tu Tarjeta Amex
Conoce el detalle:
Tarjeta: ****709
Comercio: UBER BV USD-USD PERU
Monto: $ 4.86
Fecha: 27/09/2026
Hora: 03:30 PM`,
};

const CONSUMO_DEBITO = {
  remitente: IBK,
  asunto: "Andrea Carolina, realizaste un consumo con tu Tarjeta Interbank Visa Débito Benefit",
  cuerpo: `Interbank
Andrea Carolina, realizaste un consumo con tu Tarjeta Interbank Visa Débito Benefit
Conoce el detalle:
Tarjeta: ****XXXX
Comercio: Ltd
Monto: $ 2012.00
Fecha: 29/09/2026
Hora: 07:52 PM`,
};

const PLIN = {
  remitente: IBK,
  asunto: "Constancia de Pago Plin",
  cuerpo: `Interbank
Hola, ANDREA, te enviamos tu

Constancia de Pago Plin

Te enviamos el detalle de tu operación

Código de operación

02240792

Fecha y hora

28 Sep 2026 10:41 AM

Cuenta cargo

Ahorro Sueldo

Soles

200 3269087426

Destinatario

MANUEL SALINAS

Destino

Plin

Monto y moneda

S/ 20.00`,
};

describe("Interbank · consumo con tarjeta", () => {
  it("lee el de soles entero", () => {
    const r = leeAvisoBancario(CONSUMO_SOLES);
    expect(r.accion).toBe("registrar");
    expect(r.tipo).toBe("consumo");
    expect(r.payload.merchant).toBe("Cineplanet");
    expect(r.payload.amount).toBe("S/. 38.00");
    expect(r.payload.cardHint).toBe("Tarjeta Amex");
    expect(r.payload.occurredAt.slice(0, 10)).toBe("2026-08-25");
    expect(r.banco).toBe("Interbank");
  });

  it("lee el de dólares", () => {
    const r = leeAvisoBancario(CONSUMO_DOLARES);
    expect(r.payload.merchant).toBe("UBER BV USD-USD PERU");
    expect(r.payload.amount).toBe("$ 4.86");
  });

  it("distingue la tarjeta de débito de la de crédito por el asunto", () => {
    expect(leeAvisoBancario(CONSUMO_DEBITO).payload.cardHint).toBe("Tarjeta Interbank Visa Débito Benefit");
    expect(leeAvisoBancario(CONSUMO_SOLES).payload.cardHint).toBe("Tarjeta Amex");
  });

  // Lo que de verdad importa: que el monto y la moneda lleguen bien al gasto.
  it("el monto y la moneda sobreviven a la ingesta", () => {
    const soles = normalizeTransaction(leeAvisoBancario(CONSUMO_SOLES).payload).value;
    expect(soles.amount).toBe(38);
    expect(soles.currency).toBe("PEN");

    const dolares = normalizeTransaction(leeAvisoBancario(CONSUMO_DOLARES).payload).value;
    expect(dolares.amount).toBe(4.86);
    expect(dolares.currency).toBe("USD");

    const grande = normalizeTransaction(leeAvisoBancario(CONSUMO_DEBITO).payload).value;
    expect(grande.amount).toBe(2012);
    expect(grande.currency).toBe("USD"); // NO 2012 soles
  });
});

describe("Interbank · Plin enviado", () => {
  it("lo lee con destinatario, monto y código de operación", () => {
    const r = leeAvisoBancario(PLIN);
    expect(r.accion).toBe("registrar");
    expect(r.tipo).toBe("plin-enviado");
    expect(r.payload.merchant).toBe("Plin a MANUEL SALINAS");
    expect(r.payload.amount).toBe("S/ 20.00");
    expect(r.payload.externalId).toBe("02240792");
    expect(r.payload.cardHint).toBe("Ahorro Sueldo");
    expect(r.payload.occurredAt.slice(0, 10)).toBe("2026-09-28");
  });

  it("entra como 20 soles", () => {
    const v = normalizeTransaction(leeAvisoBancario(PLIN).payload).value;
    expect(v.amount).toBe(20);
    expect(v.currency).toBe("PEN");
    expect(v.source).toBe("correo");
  });
});

describe("lo que NO se registra", () => {
  const ibk = (asunto) => leeAvisoBancario({ remitente: IBK, asunto, cuerpo: "" });

  // P1: pagar la tarjeta no es un gasto. Si entrara, contaría dos veces lo que
  // ya se registró compra por compra.
  it("el pago de la tarjeta se ignora a propósito", () => {
    const r = ibk("Constancia de Pago de tu Tarjeta de Crédito");
    expect(r.accion).toBe("ignorar");
    expect(r.motivo).toContain("no es un gasto");
  });

  it("un Plin recibido es ingreso, no gasto", () => {
    expect(ibk("Recibiste un Plin de MANUEL").accion).toBe("ignorar");
  });

  it("estados de cuenta y claves no son movimientos", () => {
    expect(ibk("Tu estado de cuenta de setiembre").accion).toBe("ignorar");
    expect(ibk("Tu clave temporal").accion).toBe("ignorar");
  });

  it("un asunto desconocido NO se registra: ante la duda, fuera", () => {
    expect(ibk("Promoción: 2x1 en cines").accion).toBe("no-reconocido");
  });

  it("un remitente que no es un banco conocido no se toca", () => {
    const r = leeAvisoBancario({ remitente: "spam@cualquiercosa.com", asunto: "realizaste un consumo", cuerpo: "Monto: S/ 999" });
    expect(r.accion).toBe("no-reconocido");
    expect(r.motivo).toBe("remitente desconocido");
  });

  it("un consumo sin monto no se inventa", () => {
    const r = leeInterbank({ asunto: "realizaste un consumo con tu Tarjeta Amex", cuerpo: "Comercio: Wong" });
    expect(r.accion).toBe("no-reconocido");
  });
});

describe("piezas sueltas", () => {
  it("campo lee tanto 'Etiqueta: valor' como valor en la línea siguiente", () => {
    expect(campo("Comercio: Wong\nMonto: S/ 10", "Comercio")).toBe("Wong");
    expect(campo("Destinatario\n\nMANUEL SALINAS\n", "Destinatario")).toBe("MANUEL SALINAS");
    expect(campo("Monto: S/ 10", "Comercio")).toBe("");
  });

  it("no confunde una etiqueta con otra que la contiene", () => {
    // "Monto" no debe agarrar el valor de "Monto y moneda".
    expect(campo("Monto y moneda\nS/ 20.00", "Monto")).toBe("");
  });

  it("fechaDMY junta fecha y hora", () => {
    const d = fechaDMY("25/08/2026", "02:14 PM");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(14);
  });

  it("fechaTextual entiende los meses en español", () => {
    expect(fechaTextual("28 Sep 2026 10:41 AM").getMonth()).toBe(8);
    expect(fechaTextual("1 Ene 2027").getMonth()).toBe(0);
    expect(fechaTextual("15 Set 2026").getMonth()).toBe(8); // "set", como se escribe en Perú
    expect(fechaTextual("cualquier cosa")).toBe(null);
  });

  it("sin hora reconocible usa mediodía, para que la fecha no se corra de día", () => {
    expect(horaAMPM("")).toEqual({ h: 12, min: 0 });
    expect(horaAMPM("12:30 AM")).toEqual({ h: 0, min: 30 });
    expect(horaAMPM("12:30 PM")).toEqual({ h: 12, min: 30 });
  });

  it("reconoce el dominio del banco", () => {
    expect(bancoDe(IBK).nombre).toBe("Interbank");
    expect(bancoDe("Interbank <servicioalcliente@netinterbank.com.pe>").nombre).toBe("Interbank");
    expect(bancoDe("alguien@gmail.com")).toBe(null);
  });
});

// Gmail convierte el HTML a texto y no siempre respeta los saltos de línea.
// Estas son las formas en que puede llegar el MISMO correo.
describe("aguanta cómo Gmail arma el texto plano", () => {
  it("etiqueta y valor separados por varios espacios", () => {
    expect(campo("Código de operación    02240792", "Código de operación")).toBe("02240792");
    expect(campo("Comercio\t\tCineplanet", "Comercio")).toBe("Cineplanet");
  });

  it("aun así no confunde 'Monto' con 'Monto y moneda'", () => {
    // Un solo espacio después de la etiqueta = es otra etiqueta, no un valor.
    expect(campo("Monto y moneda    S/ 20.00", "Monto")).toBe("");
    expect(campo("Monto y moneda    S/ 20.00", "Monto y moneda")).toBe("S/ 20.00");
  });

  it("aguanta espacios duros (&nbsp;) y líneas con tabulaciones", () => {
    const cuerpo = "Interbank\t\nComercio: Cineplanet\nMonto: S/. 38.00";
    expect(campo(cuerpo, "Comercio")).toBe("Cineplanet");
    expect(campo(cuerpo, "Monto")).toBe("S/. 38.00");
  });

  it("lee el consumo aunque venga todo apretado en una línea por campo", () => {
    const r = leeInterbank({
      asunto: "Andrea Carolina, realizaste un consumo con tu Tarjeta Amex",
      cuerpo: "Tarjeta   ****709\nComercio   Cineplanet\nMonto   S/. 38.00\nFecha   25/08/2026\nHora   02:14 PM",
    });
    expect(r.accion).toBe("registrar");
    expect(r.payload.merchant).toBe("Cineplanet");
    expect(r.payload.amount).toBe("S/. 38.00");
  });
});

// ── BBVA ──────────────────────────────────────────────────────────────────
// Cuerpos copiados tal cual de sus correos (29 set y 15 set 2026).

const BBVA = "procesos@bbva.com.pe";

const BBVA_CONSUMO = {
  remitente: "BBVA <" + BBVA + ">",
  asunto: "Has realizado un consumo con tu tarjeta BBVA",
  cuerpo: `BBVA
Hola, ANDREA
BBVA
Has realizado el siguiente consumo:
Comercio:

APPLE.COM/BILL

Monto:

21.50

Moneda:

PEN

Fecha:

29/09/2026

Hora:

19:09:47

alerta\t
Este se cargará a tu tarjeta terminada en *1849`,
};

const BBVA_PAGO_TC = {
  remitente: BBVA,
  asunto: "BBVA - Constancia Pago de Tarjetas propias",
  cuerpo: `Hola, Andrea
Has realizado con éxito la operación:

Pagar tarjetas propias

Importe transferido

S/ 73.87

DETALLES DE LA OPERACIÓN
Tipo de operación

Pagar tarjetas propias

Número de operación

000000047

Fecha y hora de la operación

15 setiembre, 2026 08:37

Cuenta de origen

• 7155

Número de tarjeta

• 1849`,
};

describe("BBVA", () => {
  it("reconoce el remitente", () => {
    expect(bancoDe("BBVA <procesos@bbva.com.pe>").nombre).toBe("BBVA");
  });

  it("lee un consumo en soles con su comercio, monto y fecha", () => {
    const r = leeAvisoBancario(BBVA_CONSUMO);
    expect(r.accion).toBe("registrar");
    expect(r.banco).toBe("BBVA");
    expect(r.payload.merchant).toBe("APPLE.COM/BILL");
    expect(r.payload.cardHint).toBe("BBVA ••1849");
    const d = new Date(r.payload.occurredAt);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 29]);
    expect(d.getHours()).toBe(19); // 19:09:47, hora de 24h sin AM/PM
  });

  it("el monto sale en soles de punta a punta", () => {
    const r = leeAvisoBancario(BBVA_CONSUMO);
    const t = normalizeTransaction(r.payload).value;
    expect(t.amount).toBe(21.5);
    expect(t.currency).toBe("PEN");
  });

  it("un consumo en dólares no se convierte ni se confunde con soles", () => {
    const r = leeAvisoBancario({ ...BBVA_CONSUMO, cuerpo: BBVA_CONSUMO.cuerpo.replace("PEN", "USD") });
    const t = normalizeTransaction(r.payload).value;
    expect(t.amount).toBe(21.5);
    expect(t.currency).toBe("USD");
  });

  it("sin moneda no se registra: no se asume soles", () => {
    const r = leeAvisoBancario({ ...BBVA_CONSUMO, cuerpo: BBVA_CONSUMO.cuerpo.replace("Moneda:", "Divisa:") });
    expect(r.accion).toBe("no-reconocido");
  });

  it("el pago de tarjeta se descarta y dice cuál era", () => {
    const r = leeAvisoBancario(BBVA_PAGO_TC);
    expect(r.accion).toBe("ignorar");
    expect(r.motivo).toContain("1849");
  });

  it("un asunto que no conoce no se registra", () => {
    const r = leeAvisoBancario({ ...BBVA_CONSUMO, asunto: "BBVA te informa sobre tu seguro" });
    expect(r.accion).toBe("no-reconocido");
  });
});

// F47: transferencia enviada. Cuerpo copiado tal cual de su correo del 2 oct 2026.
const TRANSFERENCIA = {
  remitente: "Interbank Servicio al Cliente <" + IBK + ">",
  asunto: "Constancia de transferencia",
  cuerpo: `Hola ANDREA, te enviamos tu

Constancia de transferencia

Código de operación

00379847

Fecha y hora

02 Oct 2026 10:59 AM

Cuenta a cargo

Ahorro Sueldo

200 3269087426

Cuenta destino

Colegio De Enfermeros Del Peru

01128500010005629244

Tipo de operación

Transferencia inmediata

Monto y moneda

S/ 341.00

Comisión

S/ 0.00

Monto total

S/ 341.00`,
};

describe("Interbank — transferencia enviada", () => {
  it("la registra con el destinatario y el monto total", () => {
    const r = leeAvisoBancario(TRANSFERENCIA);
    expect(r.accion).toBe("registrar");
    expect(r.tipo).toBe("transferencia");
    expect(r.payload.merchant).toBe("Transferencia a Colegio De Enfermeros Del Peru");
    expect(r.payload.cardHint).toBe("Ahorro Sueldo");
    expect(r.payload.externalId).toBe("00379847");
    expect(normalizeTransaction(r.payload).value.amount).toBe(341);
  });

  it("usa la fecha del correo, no la de hoy", () => {
    const d = new Date(leeAvisoBancario(TRANSFERENCIA).payload.occurredAt);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 2]);
    expect(d.getHours()).toBe(10);
  });

  it("cobra el TOTAL, que incluye la comisión", () => {
    const conComision = { ...TRANSFERENCIA, cuerpo: TRANSFERENCIA.cuerpo
      .replace("Comisión\n\nS/ 0.00", "Comisión\n\nS/ 3.50")
      .replace(/Monto total\n\nS\/ 341\.00$/, "Monto total\n\nS/ 344.50") };
    expect(normalizeTransaction(leeAvisoBancario(conComision).payload).value.amount).toBe(344.5);
  });

  it("aguanta la plantilla que dice 'Cuenta cargo' sin la 'a'", () => {
    const otra = { ...TRANSFERENCIA, cuerpo: TRANSFERENCIA.cuerpo.replace("Cuenta a cargo", "Cuenta cargo") };
    expect(leeAvisoBancario(otra).payload.cardHint).toBe("Ahorro Sueldo");
  });

  it("sin monto no se registra", () => {
    const rota = { ...TRANSFERENCIA, cuerpo: TRANSFERENCIA.cuerpo.replace(/Monto/g, "Importe") };
    expect(leeAvisoBancario(rota).accion).toBe("no-reconocido");
  });
});

// ── BCP ───────────────────────────────────────────────────────────────────
// Cuerpo copiado tal cual de su correo del 3 oct 2026.
const BCP = "notificaciones@notificacionesbcp.com.pe";

const BCP_CONSUMO = {
  remitente: "BCP Notificaciones <" + BCP + ">",
  asunto: "Realizaste un consumo con tu Tarjeta de Crédito BCP - Servicio de Notificaciones BCP",
  cuerpo: `Hola Andrea Carolina,

Realizaste un consumo de S/ 380.86 con tu Tarjeta de Crédito BCP en RIPLEY MIRAFLORES.

Por tu seguridad, te enviamos los datos de tu operación.

Monto

Total del consumo S/ 380.86

Datos de la operación

Operación realizada Consumo Tarjeta de Crédito
Fecha y hora 03 de octubre de 2026 - 01:34 PM
Número de Tarjeta de Crédito ************6957
Empresa RIPLEY MIRAFLORES
Número de operación 0000035979`,
};

describe("BCP", () => {
  it("reconoce el remitente", () => {
    expect(bancoDe("BCP Notificaciones <" + BCP + ">").nombre).toBe("BCP");
  });

  it("lee el consumo con su comercio, monto, tarjeta y número de operación", () => {
    const r = leeAvisoBancario(BCP_CONSUMO);
    expect(r.accion).toBe("registrar");
    expect(r.banco).toBe("BCP");
    expect(r.payload.merchant).toBe("RIPLEY MIRAFLORES");
    expect(r.payload.cardHint).toBe("BCP ••6957");
    expect(r.payload.externalId).toBe("0000035979");
    expect(normalizeTransaction(r.payload).value.amount).toBe(380.86);
  });

  it("lee la fecha larga con su hora", () => {
    const d = new Date(leeAvisoBancario(BCP_CONSUMO).payload.occurredAt);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 3]);
    expect(d.getHours()).toBe(13); // 01:34 PM
  });

  it("un consumo en dólares no se confunde con soles", () => {
    const usd = { ...BCP_CONSUMO, cuerpo: BCP_CONSUMO.cuerpo.replace("Total del consumo S/ 380.86", "Total del consumo $ 58.40") };
    const t = normalizeTransaction(leeAvisoBancario(usd).payload).value;
    expect(t.amount).toBe(58.4);
    expect(t.currency).toBe("USD");
  });

  it("'Número de operación' no se come el número de la tarjeta", () => {
    const r = leeAvisoBancario(BCP_CONSUMO);
    expect(r.payload.externalId).not.toContain("6957");
    expect(r.payload.cardHint).toContain("6957");
  });

  it("sin monto no se registra", () => {
    const rota = { ...BCP_CONSUMO, cuerpo: BCP_CONSUMO.cuerpo.replace(/Total del consumo|Monto/g, "Importe") };
    expect(leeAvisoBancario(rota).accion).toBe("no-reconocido");
  });

  it("un asunto que no conoce no se registra", () => {
    expect(leeAvisoBancario({ ...BCP_CONSUMO, asunto: "BCP te informa de una promoción" }).accion).toBe("no-reconocido");
  });
});

// ── Yape ──────────────────────────────────────────────────────────────────
// Cuerpos copiados tal cual de sus correos (25 jul 2026 y 4 set 2025).
const YAPE = "notificaciones@yape.pe";

const YAPE_SERVICIO = {
  remitente: "YAPE Notificaciones <" + YAPE + ">",
  asunto: "Tu yapeo de servicio ha sido confirmado",
  cuerpo: `Hola ANDREA,
¡Tu servicio fue yapeado con éxito!
Monto total

S/ 39.95

Yapero(a): ANDREA CAROLINA SALINAS PALMA
Número de celular: *** *** 935
Fecha y hora: 25 Jul. 2026 - 07:05 am
Nº de operación Yape: 00807810
Detalle del servicio:
Empresa: Bitel
Servicio: Postpago Bitel Soles`,
};

const YAPE_PAGO = {
  remitente: YAPE,
  asunto: "Envío Automático - Constancia de Transferencia - Yape",
  cuerpo: `Hola ANDREA, ¡Tu pago en Yape Promos fue exitoso!
Monto total S/ 18.90
Fecha y hora: 04 sept. 2025 - 07:20 pm
Titular: ANDREA CAROLINA SALINAS PALMA
Celular: *** *** 935
Número de operación Yape: 00123456`,
};

describe("Yape", () => {
  it("reconoce el remitente y no lo confunde con BCP", () => {
    expect(bancoDe("YAPE Notificaciones <" + YAPE + ">").nombre).toBe("Yape");
  });

  it("lee un pago de servicio con la empresa y el servicio", () => {
    const r = leeAvisoBancario(YAPE_SERVICIO);
    expect(r.accion).toBe("registrar");
    expect(r.payload.merchant).toBe("Bitel · Postpago Bitel Soles");
    expect(r.payload.cardHint).toBe("Yape");
    expect(r.payload.externalId).toBe("00807810");
    expect(normalizeTransaction(r.payload).value.amount).toBe(39.95);
  });

  it("lee la fecha con su hora en minúscula", () => {
    const d = new Date(leeAvisoBancario(YAPE_SERVICIO).payload.occurredAt);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 6, 25]);
    expect(d.getHours()).toBe(7); // 07:05 am
  });

  it("lee un pago de Yape Promos", () => {
    const r = leeAvisoBancario(YAPE_PAGO);
    expect(r.accion).toBe("registrar");
    expect(r.payload.merchant).toBe("Pago por Yape");
    expect(normalizeTransaction(r.payload).value.amount).toBe(18.9);
    // "sept." con cuatro letras y punto también se entiende
    expect(new Date(r.payload.occurredAt).getMonth()).toBe(8);
  });

  it("lo que no es un movimiento se descarta con su motivo", () => {
    for (const asunto of ["¡Listo, activaste tu biometría digital en Yape!", "Ingresaste a Yape de forma segura", "Te hemos elegido para ayudarnos a mejorar — encuesta"]) {
      expect(leeAvisoBancario({ ...YAPE_SERVICIO, asunto }).accion).toBe("ignorar");
    }
  });

  it("una promo publicitaria no se registra", () => {
    expect(leeAvisoBancario({ ...YAPE_SERVICIO, asunto: "¡Tienes hasta S/200 DSCTO. en iShop!" }).accion).toBe("no-reconocido");
  });

  it("sin monto no se registra", () => {
    const rota = { ...YAPE_SERVICIO, cuerpo: YAPE_SERVICIO.cuerpo.replace("Monto total", "Importe") };
    expect(leeAvisoBancario(rota).accion).toBe("no-reconocido");
  });
});

// ── Banco Ripley ──────────────────────────────────────────────────────────
// Frase corrida, sin etiquetas. Copiada tal cual de su correo del 5 set 2026.
const RIPLEY = "alerta-autorizaciones@notificaciones.bancoripley.com.pe";

const RIPLEY_CONSUMO = {
  remitente: "Banco Ripley <" + RIPLEY + ">",
  asunto: "Notificaciones consumos Banco Ripley",
  cuerpo: "BANCO RIPLEY - Te informamos que el día 05/09/2026 a las 21:08:10 has realizado un consumo con tu tarjeta Ripley MASTERCARD SILVER (Titular) número 525435******1862 por S/ 219.90, en TIENDA VIRTUAL/FONO COMPRAS RIPLEY. El número de la operación es 435865.\nSi tienes alguna consulta, comunícate de inmediato con nosotros llamando al 611-5757.",
};

describe("Banco Ripley", () => {
  it("reconoce el remitente", () => {
    expect(bancoDe(RIPLEY_CONSUMO.remitente).nombre).toBe("Banco Ripley");
  });

  it("saca monto, comercio, tarjeta y operación de una frase sin etiquetas", () => {
    const r = leeAvisoBancario(RIPLEY_CONSUMO);
    expect(r.accion).toBe("registrar");
    expect(r.payload.merchant).toBe("TIENDA VIRTUAL/FONO COMPRAS RIPLEY");
    expect(r.payload.cardHint).toBe("Ripley ••1862");
    expect(r.payload.externalId).toBe("435865");
    expect(normalizeTransaction(r.payload).value.amount).toBe(219.9);
  });

  it("la hora del cuerpo es UTC: una compra de noche no se corre de día", () => {
    // 05/09 21:08 UTC = 05/09 16:08 en Lima — el mismo día.
    const d = new Date(leeAvisoBancario(RIPLEY_CONSUMO).payload.occurredAt);
    expect(d.toISOString()).toBe("2026-09-05T21:08:10.000Z");
    // Y una de 01:00 UTC pertenece al día ANTERIOR en Lima.
    const tarde = { ...RIPLEY_CONSUMO, cuerpo: RIPLEY_CONSUMO.cuerpo.replace("05/09/2026 a las 21:08:10", "06/09/2026 a las 01:30:00") };
    const d2 = new Date(leeAvisoBancario(tarde).payload.occurredAt);
    expect(d2.toISOString()).toBe("2026-09-06T01:30:00.000Z");
  });

  it("entiende un retiro de efectivo", () => {
    const retiro = { ...RIPLEY_CONSUMO, cuerpo: "BANCO RIPLEY - Te informamos que el día 05/08/2026 a las 14:52:24 has realizado un retiro de efectivo con tu tarjeta de Débito número 525435******1862 por S/ 300.00. El número de la operación es 111222." };
    const r = leeAvisoBancario(retiro);
    expect(r.tipo).toBe("retiro");
    expect(r.payload.merchant).toBe("Retiro de efectivo");
    expect(normalizeTransaction(r.payload).value.amount).toBe(300);
  });

  it("un consumo en dólares no se confunde con soles", () => {
    const usd = { ...RIPLEY_CONSUMO, cuerpo: RIPLEY_CONSUMO.cuerpo.replace("por S/ 219.90", "por US$ 45.00") };
    const t = normalizeTransaction(leeAvisoBancario(usd).payload).value;
    expect(t.amount).toBe(45);
    expect(t.currency).toBe("USD");
  });

  it("el estado de cuenta se descarta: viene en un PDF", () => {
    const ec = { ...RIPLEY_CONSUMO, asunto: "Estado de Cuenta Banco Ripley", cuerpo: "Te enviamos adjunto tu estado de cuenta" };
    expect(leeAvisoBancario(ec).accion).toBe("ignorar");
  });

  it("una promoción no se registra", () => {
    expect(leeAvisoBancario({ ...RIPLEY_CONSUMO, asunto: "¡Octubre llega con descuentos exclusivos!" }).accion).toBe("no-reconocido");
  });

  it("sin monto no se registra", () => {
    const rota = { ...RIPLEY_CONSUMO, cuerpo: RIPLEY_CONSUMO.cuerpo.replace("por S/ 219.90", "sin monto") };
    expect(leeAvisoBancario(rota).accion).toBe("no-reconocido");
  });
});
