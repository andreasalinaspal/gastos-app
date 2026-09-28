import { describe, it, expect } from "vitest";
import { scanDateToInput, parseDateInput, monthLabelOf, toDateInput, fechaDelDiaEnMes, normalizaDiaDelMes } from "./dates";

const HOY = new Date(2026, 8, 28); // 28 de setiembre de 2026

describe("scanDateToInput — fecha detectada al escanear", () => {
  it("normaliza una fecha completa del recibo", () => {
    expect(scanDateToInput("2026-07-04", HOY)).toBe("2026-07-04");
  });

  it("respeta el año del recibo cuando lo trae", () => {
    expect(scanDateToInput("2025-12-31", HOY)).toBe("2025-12-31");
  });

  it("sin fecha cae en hoy", () => {
    expect(scanDateToInput(null, HOY)).toBe("2026-09-28");
    expect(scanDateToInput("", HOY)).toBe("2026-09-28");
  });

  it("una fecha ilegible cae en hoy en vez de romper", () => {
    expect(scanDateToInput("no es una fecha", HOY)).toBe("2026-09-28");
  });
});

describe("la fecha elegida manda", () => {
  it("el gasto cae en el mes de su fecha, sin correrse de día", () => {
    const when = parseDateInput("2026-07-04");
    expect(monthLabelOf(when)).toBe("Julio 2026");
    expect(when.getDate()).toBe(4);
  });

  it("una fecha de otro año ya no se fuerza al año actual", () => {
    const when = parseDateInput(scanDateToInput("2024-03-15", HOY));
    expect(when.getFullYear()).toBe(2024);
  });

  it("toDateInput usa hora local", () => {
    expect(toDateInput(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("fechaDelDiaEnMes — el día en que entra un ingreso fijo (F14)", () => {
  it("devuelve ese día en el mes de referencia", () => {
    const f = fechaDelDiaEnMes(15, new Date(2026, 8, 1));
    expect(f.getFullYear()).toBe(2026);
    expect(f.getMonth()).toBe(8);
    expect(f.getDate()).toBe(15);
  });

  it("recorta el 31 al último día del mes", () => {
    expect(fechaDelDiaEnMes(31, new Date(2026, 1, 10)).getDate()).toBe(28); // febrero 2026
    expect(fechaDelDiaEnMes(31, new Date(2024, 1, 10)).getDate()).toBe(29); // bisiesto
    expect(fechaDelDiaEnMes(31, new Date(2026, 3, 10)).getDate()).toBe(30); // abril
    expect(fechaDelDiaEnMes(31, new Date(2026, 0, 10)).getDate()).toBe(31); // enero, sin recorte
  });

  it("no se corre de día (queda al mediodía local)", () => {
    expect(fechaDelDiaEnMes(1, new Date(2026, 8, 20)).getHours()).toBe(12);
  });

  it("sin día devuelve null en vez de inventar una fecha", () => {
    expect(fechaDelDiaEnMes(null, HOY)).toBe(null);
    expect(fechaDelDiaEnMes(undefined, HOY)).toBe(null);
    expect(fechaDelDiaEnMes("", HOY)).toBe(null);
    expect(fechaDelDiaEnMes(0, HOY)).toBe(null);
    expect(fechaDelDiaEnMes(32, HOY)).toBe(null);
    expect(fechaDelDiaEnMes("ni idea", HOY)).toBe(null);
  });

  it("acepta el día como texto (viene de un input)", () => {
    expect(fechaDelDiaEnMes("7", new Date(2026, 8, 1)).getDate()).toBe(7);
  });
});

describe("normalizaDiaDelMes", () => {
  it("acepta 1 a 31 y rechaza el resto", () => {
    expect(normalizaDiaDelMes("1")).toBe(1);
    expect(normalizaDiaDelMes(31)).toBe(31);
    expect(normalizaDiaDelMes(15.7)).toBe(15);
    expect(normalizaDiaDelMes(0)).toBe(null);
    expect(normalizaDiaDelMes(-3)).toBe(null);
    expect(normalizaDiaDelMes(32)).toBe(null);
    expect(normalizaDiaDelMes("")).toBe(null);
  });
});
