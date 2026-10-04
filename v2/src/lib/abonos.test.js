import { describe, it, expect } from "vitest";
import {
  tramoDelMes, ritmoDiario, proyectaResto,
  cuantoAbonar, prioridadDeAbono, repartoSugerido,
  agendaDePagos, pisoDelMes, escaleraDePago, diasParaVencer, gastoDeLaVentana, esPagoDeTarjeta,
} from "./abonos";

const HOY = new Date(2026, 9, 10); // 10 oct 2026 — octubre tiene 31 días

describe("tramoDelMes", () => {
  it("cuenta hoy como día ido", () => {
    expect(tramoDelMes(HOY)).toEqual({ total: 31, van: 10, faltan: 21 });
  });
  it("el último día no deja días por delante", () => {
    expect(tramoDelMes(new Date(2026, 9, 31)).faltan).toBe(0);
  });
  it("febrero no se asume de 30", () => {
    expect(tramoDelMes(new Date(2026, 1, 5)).total).toBe(28);
  });
});

describe("ritmo y proyección", () => {
  it("promedia sobre la ventana de 30 días, no sobre lo que va del mes", () => {
    expect(ritmoDiario(3000)).toBe(100);
  });
  it("proyecta el resto del mes a ese ritmo", () => {
    expect(proyectaResto(3000, HOY)).toBe(2100); // 100 × 21 días
  });
  it("sin gasto no proyecta nada", () => {
    expect(proyectaResto(0, HOY)).toBe(0);
  });
  it("el último día del mes no proyecta nada más", () => {
    expect(proyectaResto(9000, new Date(2026, 9, 31))).toBe(0);
  });

  // El caso real que la rompió: dos días de mes y un gasto grande.
  it("un gasto fuerte el día 2 ya no dispara la proyección", () => {
    const expl = proyectaResto(4763.9, new Date(2026, 9, 2));
    expect(expl).toBeLessThan(5000);   // antes daba 69,076
  });
});

describe("gastoDeLaVentana", () => {
  const credito = new Set(["tc"]);
  const g = (id, amount, date, pm, extra = {}) => ({ id, amount, date: new Date(date).toISOString(), paymentMethodId: pm, ...extra });

  it("suma solo lo que salió de su cuenta en los últimos 30 días", () => {
    const exps = [
      g("a", 100, new Date(2026, 9, 9), "debito"),
      g("b", 50, new Date(2026, 8, 20), "debito"),   // dentro de los 30
      g("c", 999, new Date(2026, 7, 1), "debito"),   // fuera
      g("d", 300, new Date(2026, 9, 8), "tc"),       // tarjeta: no salió de su cuenta
      g("e", 40, new Date(2026, 9, 9), "debito", { currency: "USD" }), // dólares aparte
    ];
    expect(gastoDeLaVentana(exps, credito, HOY)).toBe(150);
  });

  it("un gasto futuro no cuenta", () => {
    expect(gastoDeLaVentana([g("f", 500, new Date(2026, 9, 20), "debito")], credito, HOY)).toBe(0);
  });

  it("aguanta datos rotos", () => {
    expect(gastoDeLaVentana([null, {}, { amount: 10 }], credito, HOY)).toBe(0);
    expect(gastoDeLaVentana(null, credito, HOY)).toBe(0);
  });
});

describe("cuantoAbonar", () => {
  // Su caso real: entra 7,774; fijos 1,293 (214 pagados); lleva 1,000 de gastos
  // diarios y ya abonó 175 a la tarjeta.
  const suyo = { ingresos: 7774, fijosPagados: 214, fijosTotales: 1293, gastoDiario: 1000, gastoVentana: 3000, abonosHechos: 175 };

  it("descuenta lo que ya salió, lo que falta de fijos y lo que le queda por gastar", () => {
    const r = cuantoAbonar(suyo, HOY);
    expect(r.yaSalio).toBe(1389);          // 214 + 1000 + 175
    expect(r.fijosPorPagar).toBe(1079);    // 1293 − 214
    expect(r.estimadoResto).toBe(2100);    // ritmo 100 × 21 días
    expect(r.disponible).toBe(3206);       // 7774 − 1389 − 1079 − 2100
    expect(r.alcanza).toBe(true);
  });

  it("el colchón que ella se deja sale del disponible, no de otro lado", () => {
    expect(cuantoAbonar({ ...suyo, colchon: 500 }, HOY).disponible).toBe(2706);
  });

  it("si no alcanza lo dice, no lo maquilla en cero", () => {
    const r = cuantoAbonar({ ...suyo, ingresos: 2000 }, HOY);
    expect(r.disponible).toBeLessThan(0);
    expect(r.alcanza).toBe(false);
  });

  it("sin datos no se cae ni inventa", () => {
    expect(cuantoAbonar(undefined, HOY).disponible).toBe(0);
    expect(cuantoAbonar({}, HOY).alcanza).toBe(false);
  });
});

describe("prioridadDeAbono", () => {
  const usos = [
    { card: { id: "a", name: "BCP" }, pct: 70, balance: 1800 },
    { card: { id: "b", name: "AMEX" }, pct: 98, balance: 4229.63 },
    { card: { id: "c", name: "BBVA" }, pct: 81, balance: 2400 },
  ];

  it("sin tasas, manda la saturación", () => {
    const r = prioridadDeAbono(usos);
    expect(r.map(u => u.card.name)).toEqual(["AMEX", "BBVA", "BCP"]);
    expect(r[0].motivo).toContain("casi sin línea");
  });

  it("con TODAS las tasas puestas, manda la tasa", () => {
    const conTasa = [
      { ...usos[0], card: { ...usos[0].card, tcea: 95 } },
      { ...usos[1], card: { ...usos[1].card, tcea: 55 } },
      { ...usos[2], card: { ...usos[2].card, tcea: 80 } },
    ];
    const r = prioridadDeAbono(conTasa);
    expect(r.map(u => u.card.name)).toEqual(["BCP", "BBVA", "AMEX"]);
    expect(r[0].motivo).toContain("95% TCEA");
  });

  it("con tasas a medias no se mezcla: se queda con la saturación", () => {
    const aMedias = [usos[0], { ...usos[1], card: { ...usos[1].card, tcea: 55 } }, usos[2]];
    expect(prioridadDeAbono(aMedias).map(u => u.card.name)).toEqual(["AMEX", "BBVA", "BCP"]);
  });

  it("una tarjeta sin deuda no entra a la cola", () => {
    expect(prioridadDeAbono([{ card: { id: "z" }, pct: 0, balance: 0 }])).toEqual([]);
    expect(prioridadDeAbono(null)).toEqual([]);
  });
});

describe("repartoSugerido", () => {
  const usos = [
    { card: { id: "a", name: "BCP" }, pct: 70, balance: 1800 },
    { card: { id: "b", name: "AMEX" }, pct: 98, balance: 500 },
  ];

  it("manda todo a una sola, no lo reparte de a poquito", () => {
    const r = repartoSugerido(usos, 400);
    expect(r).toHaveLength(1);
    expect(r[0].card.name).toBe("AMEX");
    expect(r[0].abono).toBe(400);
  });

  it("no abona más de lo que debe esa tarjeta: el resto pasa a la siguiente", () => {
    const r = repartoSugerido(usos, 900);
    expect(r.map(x => [x.card.name, x.abono])).toEqual([["AMEX", 500], ["BCP", 400]]);
  });

  it("sin plata o sin deudas no sugiere nada", () => {
    expect(repartoSugerido(usos, 0)).toEqual([]);
    expect(repartoSugerido([], 500)).toEqual([]);
  });
});

// F49: el piso, la agenda y la escalera, con sus tarjetas reales de octubre.
describe("piso, agenda y escalera", () => {
  const hoy = new Date(2026, 9, 2); // 2 oct 2026
  const tc = (over) => ({ type: "credito", ...over });
  const cards = [
    tc({ id: "amex", name: "AMEX", tcea: 19.42, venceEl: "2026-10-05", minimoPEN: 0, minimoUSD: 12.02, pagoMesPEN: 3559.67, pagoMesUSD: 284.54 }),
    tc({ id: "bbva", name: "BBVA", tcea: 99.99, venceEl: "2026-10-16", minimoPEN: 215.52, minimoUSD: 16.24, pagoMesPEN: 993.42, pagoMesUSD: 132.63 }),
    tc({ id: "bcp", name: "BCP", tcea: 95.89, venceEl: "2026-10-20", minimoPEN: 37.16, pagoMesPEN: 1217.33 }),
    tc({ id: "ripley", name: "Ripley", tcea: 109.83, venceEl: "2026-10-20", minimoPEN: 48.90, pagoMesPEN: 253.67 }),
    tc({ id: "vacia", name: "Sin datos", archived: false }),
  ];

  it("la agenda ordena por fecha y deja fuera la que no tiene datos", () => {
    const a = agendaDePagos(cards, hoy);
    expect(a.map(x => x.card.name)).toEqual(["AMEX", "BBVA", "BCP", "Ripley"]);
    expect(a[0].dias).toBe(3);
  });

  it("el piso suma los mínimos sin mezclar monedas", () => {
    expect(pisoDelMes(cards)).toEqual({ PEN: 301.58, USD: 28.26 });
  });

  it("la escalera sube de la tarjeta más cara a la más barata", () => {
    const e = escaleraDePago(cards, hoy);
    expect(e[0].acumuladoPEN).toBe(301.58);
    expect(e.slice(1).map(p => p.card.name)).toEqual(["Ripley", "BBVA", "BCP", "AMEX"]);
  });

  it("cada escalón acumula lo que falta para dejar esa tarjeta al día", () => {
    const e = escaleraDePago(cards, hoy);
    expect(e[1].acumuladoPEN).toBe(506.35);   // + Ripley (253.67 − 48.90)
    expect(e[2].acumuladoPEN).toBe(1284.25);  // + BBVA   (993.42 − 215.52)
    expect(e[3].acumuladoPEN).toBe(2464.42);  // + BCP    (1217.33 − 37.16)
  });

  it("una tarjeta archivada no entra", () => {
    const con = [...cards, tc({ id: "x", name: "Vieja", archived: true, minimoPEN: 500 })];
    expect(pisoDelMes(con).PEN).toBe(301.58);
  });

  it("sin tarjetas con datos no hay escalera", () => {
    expect(escaleraDePago([], hoy)).toEqual([]);
    expect(pisoDelMes(null)).toEqual({ PEN: 0, USD: 0 });
  });
});

// F53: los pagos de tarjeta anotados a mano no son su ritmo de gasto.
describe("esPagoDeTarjeta y el ritmo", () => {
  const cat = (name) => ({ category: { name } });

  it("reconoce las variantes del nombre que ella usa", () => {
    expect(esPagoDeTarjeta(cat("Pago de tarjeta"))).toBe(true);
    expect(esPagoDeTarjeta(cat("Pago Tarjeta"))).toBe(true);
    expect(esPagoDeTarjeta(cat("pago tc"))).toBe(true);
    expect(esPagoDeTarjeta(cat("Pago TC"))).toBe(true);
  });

  it("no se lleva por delante categorías parecidas", () => {
    expect(esPagoDeTarjeta(cat("Comida"))).toBe(false);
    expect(esPagoDeTarjeta(cat("Tarjetas de regalo"))).toBe(false);
    expect(esPagoDeTarjeta(cat("Pago de servicios"))).toBe(false);
    expect(esPagoDeTarjeta({})).toBe(false);
    expect(esPagoDeTarjeta(null)).toBe(false);
  });

  it("quedan fuera del ritmo, aunque se hayan anotado como gasto normal", () => {
    const g = (id, amount, date, extra = {}) => ({ id, amount, date: new Date(date).toISOString(), paymentMethodId: "debito", ...extra });
    const exps = [
      g("a", 200, new Date(2026, 9, 1)),
      g("b", 1366, new Date(2026, 9, 1), cat("Pago Tarjeta")),
      g("c", 587, new Date(2026, 9, 2), cat("Pago de tarjeta")),
    ];
    expect(gastoDeLaVentana(exps, new Set(["tc"]), HOY)).toBe(200);
  });
});
