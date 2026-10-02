import { describe, it, expect } from "vitest";
import {
  tramoDelMes, ritmoDiario, proyectaResto,
  cuantoAbonar, prioridadDeAbono, repartoSugerido,
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
  it("promedia lo gastado entre los días que van", () => {
    expect(ritmoDiario(1000, HOY)).toBe(100);
  });
  it("proyecta el resto del mes a ese ritmo", () => {
    expect(proyectaResto(1000, HOY)).toBe(2100); // 100 × 21 días
  });
  it("sin gasto no proyecta nada", () => {
    expect(proyectaResto(0, HOY)).toBe(0);
  });
  it("el último día del mes no proyecta nada más", () => {
    expect(proyectaResto(3000, new Date(2026, 9, 31))).toBe(0);
  });
});

describe("cuantoAbonar", () => {
  // Su caso real: entra 7,774; fijos 1,293 (214 pagados); lleva 1,000 de gastos
  // diarios y ya abonó 175 a la tarjeta.
  const suyo = { ingresos: 7774, fijosPagados: 214, fijosTotales: 1293, gastoDiario: 1000, abonosHechos: 175 };

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
