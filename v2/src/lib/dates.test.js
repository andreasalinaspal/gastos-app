import { describe, it, expect } from "vitest";
import { scanDateToInput, parseDateInput, monthLabelOf, toDateInput } from "./dates";

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
