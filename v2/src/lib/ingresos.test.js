import { describe, it, expect } from "vitest";
import { ordenaPorDia, hayDiasConfigurados, entradasDeIngreso, ingresoPrincipal } from "./ingresos";

const ing = (id, day, amount = 1000, name = id) => ({ id, name, amount, month: "Septiembre 2026", day });

describe("ordenaPorDia — la lista se lee como un calendario del mes", () => {
  it("ordena por día y deja los sin día al final", () => {
    const lista = [ing("c", 28), ing("sinDia", null), ing("a", 5), ing("b", 15)];
    expect(ordenaPorDia(lista).map(i => i.id)).toEqual(["a", "b", "c", "sinDia"]);
  });

  it("mantiene el orden original entre los que no tienen día", () => {
    const lista = [ing("x", null), ing("y", null), ing("conDia", 10)];
    expect(ordenaPorDia(lista).map(i => i.id)).toEqual(["conDia", "x", "y"]);
  });

  it("un día basura cuenta como sin día", () => {
    const lista = [ing("malo", 99), ing("bueno", 3)];
    expect(ordenaPorDia(lista).map(i => i.id)).toEqual(["bueno", "malo"]);
  });

  it("no muta la lista original", () => {
    const lista = [ing("b", 20), ing("a", 2)];
    ordenaPorDia(lista);
    expect(lista.map(i => i.id)).toEqual(["b", "a"]);
  });
});

describe("hayDiasConfigurados", () => {
  it("es falso mientras ningún ingreso tenga día", () => {
    expect(hayDiasConfigurados([ing("a", null), ing("b", null)])).toBe(false);
    expect(hayDiasConfigurados([])).toBe(false);
    expect(hayDiasConfigurados(undefined)).toBe(false);
  });
  it("es verdadero con uno solo que lo tenga", () => {
    expect(hayDiasConfigurados([ing("a", null), ing("b", 30)])).toBe(true);
  });
});

describe("entradasDeIngreso", () => {
  const HOY = new Date(2026, 8, 10); // 10 de setiembre de 2026

  it("proyecta el mismo día en los meses siguientes", () => {
    const es = entradasDeIngreso([ing("sueldo", 30, 3000)], HOY);
    expect(es.map(e => [e.fecha.getMonth(), e.fecha.getDate()])).toEqual([[8, 30], [9, 30], [10, 30]]);
  });

  it("recorta el día al fin de cada mes", () => {
    const es = entradasDeIngreso([ing("sueldo", 31, 3000)], new Date(2026, 0, 5));
    expect(es.map(e => e.fecha.getDate())).toEqual([31, 28, 31]); // ene, feb, mar
  });

  it("ignora los ingresos sin día y los que están en cero", () => {
    expect(entradasDeIngreso([ing("sinDia", null), ing("enCero", 15, 0)], HOY)).toEqual([]);
  });

  it("ordena las entradas por fecha", () => {
    const es = entradasDeIngreso([ing("quincena", 15, 1000), ing("fin", 30, 2000)], HOY);
    expect(es.slice(0, 2).map(e => e.day)).toEqual([15, 30]);
  });
});

describe("ingresoPrincipal", () => {
  it("es el ingreso con día más grande — el que ella llamaría su sueldo", () => {
    expect(ingresoPrincipal([ing("chico", 5, 400), ing("sueldo", 30, 3000)]).id).toBe("sueldo");
  });
  it("no considera los que no tienen día", () => {
    expect(ingresoPrincipal([ing("grandeSinDia", null, 9000), ing("sueldo", 30, 3000)]).id).toBe("sueldo");
  });
  it("sin ingresos útiles devuelve null", () => {
    expect(ingresoPrincipal([ing("sinDia", null)])).toBe(null);
  });
});
