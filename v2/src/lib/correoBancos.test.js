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
