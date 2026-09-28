import { describe, it, expect } from "vitest";
import { convertirAPEN, tasaVigente, esTasaVieja, textoTasa, DIAS_FRESCA } from "./fx";

const HOY = new Date(2026, 8, 28); // 28 set 2026

describe("convertirAPEN", () => {
  it("convierte y redondea a 2 decimales", () => {
    expect(convertirAPEN(100, 3.425)).toBe(342.5);
    expect(convertirAPEN(120, 3.4167)).toBe(410);
    expect(convertirAPEN(12.99, 3.425)).toBe(44.49);
  });

  it("el 0 es 0, no null", () => {
    expect(convertirAPEN(0, 3.425)).toBe(0);
  });

  it("sin tasa usable devuelve null en vez de inventar un número", () => {
    expect(convertirAPEN(100, 0)).toBe(null);
    expect(convertirAPEN(100, null)).toBe(null);
    expect(convertirAPEN(100, undefined)).toBe(null);
    expect(convertirAPEN(100, -3)).toBe(null);
    expect(convertirAPEN(100, "no")).toBe(null);
  });

  it("sin monto usable devuelve null", () => {
    expect(convertirAPEN(undefined, 3.4)).toBe(null);
    expect(convertirAPEN("abc", 3.4)).toBe(null);
  });
});

describe("tasaVigente", () => {
  const data = { fx: { venta: 3.425, fecha: "2026-09-28", fuente: "SUNAT", actualizadoEn: "2026-09-28T10:00:00.000Z" } };

  it("usa el guardado global cuando la tarjeta no tiene override", () => {
    expect(tasaVigente({ id: "c1" }, data)).toEqual({ tasa: 3.425, fuente: "SUNAT", fecha: "2026-09-28" });
  });

  it("el override manual de la tarjeta le gana al guardado", () => {
    const v = tasaVigente({ id: "c1", usdRate: 3.78 }, data);
    expect(v.tasa).toBe(3.78);
    expect(v.fuente).toBe("tu banco");
    expect(v.fecha).toBe(null); // el de ella no lleva fecha: es el que le aplicaron
  });

  it("un override basura no pisa el guardado", () => {
    expect(tasaVigente({ usdRate: 0 }, data).tasa).toBe(3.425);
    expect(tasaVigente({ usdRate: -1 }, data).tasa).toBe(3.425);
    expect(tasaVigente({ usdRate: "" }, data).tasa).toBe(3.425);
    expect(tasaVigente({ usdRate: "abc" }, data).tasa).toBe(3.425);
  });

  it("sin nada devuelve null: simplemente no se muestra el equivalente", () => {
    expect(tasaVigente({ id: "c1" }, {})).toBe(null);
    expect(tasaVigente({ id: "c1" }, null)).toBe(null);
    expect(tasaVigente(null, null)).toBe(null);
    expect(tasaVigente({ id: "c1" }, { fx: { venta: 0 } })).toBe(null);
  });

  it("acepta el objeto fx suelto, no solo el blob completo", () => {
    expect(tasaVigente({}, { venta: 3.3, fecha: "2026-09-20", fuente: "referencial" }).tasa).toBe(3.3);
  });

  it("sin fuente guardada la llama referencial", () => {
    expect(tasaVigente({}, { fx: { venta: 3.3 } }).fuente).toBe("referencial");
  });
});

describe("esTasaVieja", () => {
  it("de hoy o de esta semana está fresca", () => {
    expect(esTasaVieja("2026-09-28", HOY)).toBe(false);
    expect(esTasaVieja("2026-09-22", HOY)).toBe(false); // 6 días
    expect(esTasaVieja("2026-09-21", HOY)).toBe(false); // exactamente 7
  });

  it("con más de 7 días está vieja", () => {
    expect(esTasaVieja("2026-09-20", HOY)).toBe(true); // 8 días
    expect(esTasaVieja("2026-08-01", HOY)).toBe(true);
    expect(DIAS_FRESCA).toBe(7);
  });

  it("sin fecha o con fecha ilegible no grita", () => {
    expect(esTasaVieja(null, HOY)).toBe(false);
    expect(esTasaVieja(undefined, HOY)).toBe(false);
    expect(esTasaVieja("qué fecha", HOY)).toBe(false);
  });

  it("acepta Date y fecha ISO completa", () => {
    expect(esTasaVieja(new Date(2026, 8, 20), HOY)).toBe(true);
    expect(esTasaVieja("2026-09-28T10:00:00.000Z", HOY)).toBe(false);
  });
});

describe("textoTasa — siempre etiquetado y fechado", () => {
  it("dice la fuente y la fecha", () => {
    expect(textoTasa({ tasa: 3.425, fuente: "SUNAT", fecha: "2026-09-28" }, HOY))
      .toBe("tipo de cambio 3.425 (SUNAT, 28 set.)");
  });

  it("avisa cuando ya pasó una semana", () => {
    expect(textoTasa({ tasa: 3.3, fuente: "SUNAT", fecha: "2026-09-10" }, HOY))
      .toContain("(desactualizado)");
  });

  it("el override manual se nombra como de ella", () => {
    expect(textoTasa({ tasa: 3.78, fuente: "tu banco", fecha: null }, HOY))
      .toBe("tipo de cambio 3.78 (el de tu banco)");
  });

  it("sin tasa no dice nada", () => {
    expect(textoTasa(null, HOY)).toBe("");
    expect(textoTasa({ tasa: null }, HOY)).toBe("");
  });
});
