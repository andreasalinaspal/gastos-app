import { describe, it, expect } from "vitest";
import {
  claveComercio, montoParecido, cadenciaDe,
  detectaSuscripciones, resumenSuscripciones,
  proximoCobroDe, diasParaCobro, ordenaPorCancelar, costaNoCancelar,
  costoNeto, bonoEnSuMoneda, faltaTasaBono, costoMensual, totalMensualDeLista,
} from "./suscripciones";

const HOY = new Date(2026, 9, 2); // 2 oct 2026
const dia = (y, m, d) => new Date(y, m, d).toISOString();
const g = (id, description, amount, date, extra = {}) => ({ id, description, amount, date, ...extra });

// Netflix puntual, cinco meses seguidos.
const netflix = [
  g("n1", "NETFLIX.COM", 44.9, dia(2026, 4, 15)),
  g("n2", "NETFLIX.COM", 44.9, dia(2026, 5, 15)),
  g("n3", "NETFLIX.COM", 44.9, dia(2026, 6, 15)),
  g("n4", "NETFLIX.COM", 44.9, dia(2026, 7, 15)),
  g("n5", "NETFLIX.COM", 44.9, dia(2026, 8, 15)),
];

describe("claveComercio", () => {
  it("junta el mismo comercio escrito de distintas formas", () => {
    const k = claveComercio("NETFLIX.COM");
    expect(claveComercio("Netflix.com")).toBe(k);
    expect(claveComercio("NETFLIX*MEMBRESIA")).toBe("NETFLIX MEMBRESIA");
    expect(claveComercio("NETFLIX 987654")).toBe(k); // el código de operación se cae
  });

  it("no pierde las tildes ni se queda vacía con nombres raros", () => {
    expect(claveComercio("Café París")).toBe("CAFE PARIS");
    expect(claveComercio("")).toBe("");
    expect(claveComercio(null)).toBe("");
  });
});

describe("montoParecido", () => {
  it("tolera el movimiento del tipo de cambio y los impuestos", () => {
    expect(montoParecido(44.9, 44.9)).toBe(true);
    expect(montoParecido(44.9, 47)).toBe(true);
  });
  it("una subida fuerte no es ruido", () => {
    expect(montoParecido(44.9, 59.9)).toBe(false);
  });
  it("un monto en cero nunca se parece a nada", () => {
    expect(montoParecido(0, 0)).toBe(false);
  });
});

describe("cadenciaDe", () => {
  it("reconoce lo mensual aunque los meses no midan igual", () => {
    expect(cadenciaDe([31, 28, 31, 30]).id).toBe("mensual");
  });
  it("aguanta un cobro que se atrasó, si los demás van bien", () => {
    expect(cadenciaDe([30, 31, 52, 30, 30]).id).toBe("mensual");
  });
  it("reconoce lo anual", () => {
    expect(cadenciaDe([365]).id).toBe("anual");
  });
  it("compras sueltas no son una cadencia", () => {
    expect(cadenciaDe([3, 11, 2])).toBe(null);
    expect(cadenciaDe([])).toBe(null);
  });
});

describe("detectaSuscripciones", () => {
  it("encuentra una mensual y calcula cuándo toca la próxima", () => {
    const r = detectaSuscripciones(netflix, HOY);
    expect(r.activas).toHaveLength(1);
    const s = r.activas[0];
    expect(s.comercio).toBe("NETFLIX.COM");
    expect(s.monto).toBe(44.9);
    expect(s.cadencia).toBe("mensual");
    expect(s.veces).toBe(5);
    expect(new Date(s.proximoCobro).getMonth()).toBe(9); // 14 set + 30 → oct
    expect(s.subioDePrecio).toBe(null);
  });

  it("NO inventa una suscripción con dos compras casuales en el mismo sitio", () => {
    const r = detectaSuscripciones([
      g("a1", "Cineplanet", 38, dia(2026, 8, 3)),
      g("a2", "Cineplanet", 38, dia(2026, 8, 9)),
    ], HOY);
    expect(r.activas).toHaveLength(0);
  });

  it("con un solo cobro no afirma nada: eso es una compra", () => {
    expect(detectaSuscripciones([netflix[0]], HOY).activas).toHaveLength(0);
  });

  it("avisa cuando le subieron el precio", () => {
    const r = detectaSuscripciones([...netflix, g("n6", "NETFLIX.COM", 59.9, dia(2026, 9, 1))], HOY);
    const s = r.activas[0];
    expect(s.subioDePrecio).toEqual({ antes: 44.9, ahora: 59.9 });
    expect(s.monto).toBe(59.9); // manda el precio nuevo
  });

  it("marca como inactiva la que dejó de cobrar", () => {
    const viejas = netflix.map((e, i) => g("v" + i, "SPOTIFY", 26.9, dia(2026, i, 10)));
    const r = detectaSuscripciones(viejas, HOY); // el último fue en mayo
    expect(r.activas).toHaveLength(0);
    expect(r.inactivas).toHaveLength(1);
    expect(r.inactivas[0].proximoCobro).toBe(null);
  });

  it("los dólares van aparte y nunca se convierten", () => {
    const usd = [1, 2, 3].map(i => g("u" + i, "ICLOUD", 2.99, dia(2026, 5 + i, 8), { currency: "USD" }));
    const r = detectaSuscripciones([...netflix, ...usd], HOY);
    expect(r.totalMensual).toBe(44.9);
    expect(r.totalMensualUSD).toBe(2.99);
  });

  it("el mismo comercio en dos monedas no se mezcla", () => {
    const soles = [1, 2, 3].map(i => g("s" + i, "APPLE", 30, dia(2026, 5 + i, 8)));
    const dolares = [1, 2, 3].map(i => g("d" + i, "APPLE", 9.99, dia(2026, 5 + i, 8), { currency: "USD" }));
    const r = detectaSuscripciones([...soles, ...dolares], HOY);
    expect(r.activas).toHaveLength(2);
  });

  it("una anual cuenta por su doceava parte al mes", () => {
    const anual = [
      g("y1", "DOMINIO WEB", 120, dia(2024, 9, 1)),
      g("y2", "DOMINIO WEB", 120, dia(2025, 9, 1)),
      g("y3", "DOMINIO WEB", 120, dia(2026, 8, 28)),
    ];
    const r = detectaSuscripciones(anual, HOY);
    expect(r.activas[0].cadencia).toBe("anual");
    expect(r.totalMensual).toBe(10);
  });

  it("aguanta datos rotos sin romperse", () => {
    const r = detectaSuscripciones([
      null, {}, g("x", "", 10, dia(2026, 8, 1)), g("y", "ALGO", 0, dia(2026, 8, 1)),
      g("z", "ALGO", 10, "no-es-fecha"), ...netflix,
    ], HOY);
    expect(r.activas).toHaveLength(1);
  });

  it("sin gastos devuelve todo en cero", () => {
    const r = detectaSuscripciones([], HOY);
    expect(r).toEqual({ activas: [], inactivas: [], totalMensual: 0, totalMensualUSD: 0 });
    expect(detectaSuscripciones(null, HOY).activas).toEqual([]);
  });
});

describe("resumenSuscripciones", () => {
  const fmt = (n) => "S/" + n;
  it("sin nada detectado explica qué va a pasar, no dice 'cero'", () => {
    expect(resumenSuscripciones([], fmt, HOY)).toBe("Qori las busca solas en tus gastos");
  });
  it("cuenta las activas y lo que suman al mes", () => {
    expect(resumenSuscripciones(netflix, fmt, HOY)).toBe("1 activa · S/44.9 al mes");
  });
  it("saca a relucir las que subieron de precio", () => {
    const con = [...netflix, g("n6", "NETFLIX.COM", 59.9, dia(2026, 9, 1))];
    expect(resumenSuscripciones(con, fmt, HOY)).toContain("1 subió de precio");
  });
});

// F44: el aviso de lo que decidió cancelar y todavía no cancela.
describe("por cancelar", () => {
  const hoy = new Date(2026, 9, 2); // 2 oct 2026

  it("con fecha fija calcula los días que faltan", () => {
    const i = { id: "a", nombre: "Paramount+", monto: 21.5, cobra: "2026-10-27" };
    expect(diasParaCobro(i, hoy)).toBe(25);
  });

  it("con día del mes busca el próximo que todavía no pasa", () => {
    expect(diasParaCobro({ cobra: 14 }, hoy)).toBe(12);          // 14 de este mes
    expect(diasParaCobro({ cobra: 1 }, hoy)).toBe(30);           // ya pasó → el del mes que viene
  });

  it("el día 31 cae al último del mes cuando el mes es más corto", () => {
    const d = proximoCobroDe({ cobra: 31 }, new Date(2026, 10, 1)); // noviembre tiene 30
    expect(d.getDate()).toBe(30);
  });

  it("sin fecha no inventa un plazo", () => {
    expect(diasParaCobro({ nombre: "algo" }, hoy)).toBe(null);
    expect(diasParaCobro(null, hoy)).toBe(null);
  });

  it("ordena por urgencia y deja al final las que no tienen fecha", () => {
    const r = ordenaPorCancelar([
      { id: "sin", nombre: "Sin fecha" },
      { id: "lejos", cobra: "2026-10-27" },
      { id: "cerca", cobra: "2026-10-05" },
    ], hoy);
    expect(r.map(i => i.id)).toEqual(["cerca", "lejos", "sin"]);
  });

  it("suma lo que cuesta no haberlas cancelado, sin mezclar monedas", () => {
    const r = costaNoCancelar([
      { monto: 26.9 }, { monto: 21.5 }, { monto: 95.2, currency: "USD" },
    ]);
    expect(r).toEqual({ PEN: 48.4, USD: 95.2 });
  });

  it("sin nada pendiente devuelve ceros", () => {
    expect(costaNoCancelar([])).toEqual({ PEN: 0, USD: 0 });
    expect(ordenaPorCancelar(null)).toEqual([]);
  });
});

// F51: un bono que le rebaja la suscripción (su empresa le paga parte del gym).
describe("bono o descuento", () => {
  const gym = { id: "g", nombre: "Smart Fit", monto: 112, currency: "PEN", cadencia: "mensual", cobra: 20 };

  it("sin bono, el neto es el monto", () => {
    expect(costoNeto(gym)).toBe(112);
    expect(faltaTasaBono(gym)).toBe(false);
  });

  it("con bono en dólares y tipo de cambio, descuenta lo que vale", () => {
    const con = { ...gym, bono: 20, bonoCurrency: "USD", bonoTasa: 3.78 };
    expect(bonoEnSuMoneda(con)).toBe(75.6);
    expect(costoNeto(con)).toBe(36.4);
    expect(faltaTasaBono(con)).toBe(false);
  });

  it("el tipo de cambio lo pone ella: si cambia, el neto cambia", () => {
    expect(costoNeto({ ...gym, bono: 20, bonoCurrency: "USD", bonoTasa: 3.9 })).toBe(34);
  });

  it("sin tipo de cambio NO se inventa: el bono no descuenta y se avisa", () => {
    const sinTasa = { ...gym, bono: 20, bonoCurrency: "USD" };
    expect(bonoEnSuMoneda(sinTasa)).toBe(0);
    expect(costoNeto(sinTasa)).toBe(112);
    expect(faltaTasaBono(sinTasa)).toBe(true);
  });

  it("un bono en la misma moneda no necesita tasa", () => {
    const mismo = { ...gym, bono: 30, bonoCurrency: "PEN" };
    expect(costoNeto(mismo)).toBe(82);
    expect(faltaTasaBono(mismo)).toBe(false);
  });

  it("si el bono cubre de más, el neto es 0 y no queda saldo a favor", () => {
    expect(costoNeto({ ...gym, bono: 200, bonoCurrency: "PEN" })).toBe(0);
  });

  it("el total al mes usa el neto, y una anual con bono se reparte entre 12", () => {
    const con = { ...gym, bono: 20, bonoCurrency: "USD", bonoTasa: 3.78 };
    expect(totalMensualDeLista([con])).toEqual({ PEN: 36.4, USD: 0 });
    expect(costoMensual({ ...con, cadencia: "anual", monto: 1200, bono: 0 })).toBe(100);
  });
});
