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

// ── F14: ¿le llega la plata antes del vencimiento? ───────────────────────────
import { chequeoDeIngresos, diaHeredado } from "./ingresos";

const HOY = new Date(2026, 8, 10); // 10 de setiembre de 2026
const pago = (id, name, dia, amount, mes = 8) => {
  const dueDate = new Date(2026, mes, dia);
  return { card: { id, name }, amount, dueDate, status: "por-vencer", days: Math.round((dueDate - HOY) / 86400000) };
};

describe("chequeoDeIngresos — el pago que vence antes de que entre la plata", () => {
  it("avisa cuando la tarjeta vence antes del sueldo", () => {
    const r = chequeoDeIngresos([ing("sueldo", 30, 3000)], [pago("v", "Visa", 15, 900)], HOY);
    expect(r.enRiesgo).toBe(1);
    const a = r.avisos[0];
    expect(a.alcanza).toBe(false);
    expect(a.recibido).toBe(0);
    expect(a.faltan).toBe(900);
    expect(a.siguiente.day).toBe(30); // el sueldo entra después: se puede decir cuándo
  });

  it("no avisa nada cuando el sueldo entra antes del vencimiento", () => {
    const r = chequeoDeIngresos([ing("sueldo", 5, 3000)], [pago("v", "Visa", 15, 900)], HOY);
    expect(r.enRiesgo).toBe(0);
    expect(r.avisos[0].recibido).toBe(3000);
  });

  it("el ingreso que entra el mismo día del vencimiento cuenta como que llegó", () => {
    const r = chequeoDeIngresos([ing("sueldo", 15, 3000)], [pago("v", "Visa", 15, 900)], HOY);
    expect(r.avisos[0].alcanza).toBe(true);
  });

  it("acumula lo que vence hasta cada fecha: el segundo pago puede no alcanzar", () => {
    const r = chequeoDeIngresos(
      [ing("sueldo", 5, 1000)],
      [pago("a", "Visa", 12, 800), pago("b", "Amex", 20, 500)],
      HOY,
    );
    expect(r.avisos[0].alcanza).toBe(true);
    expect(r.avisos[1].alcanza).toBe(false);
    expect(r.avisos[1].acumulado).toBe(1300);
    expect(r.avisos[1].faltan).toBe(300);
  });

  it("cuenta el ingreso del mes siguiente cuando el pago vence allá", () => {
    const r = chequeoDeIngresos([ing("sueldo", 30, 3000)], [pago("v", "Visa", 2, 900, 9)], HOY);
    expect(r.avisos[0].recibido).toBe(3000); // el sueldo del 30 de setiembre ya entró
    expect(r.avisos[0].alcanza).toBe(true);
  });

  it("suma varios ingresos con día distinto", () => {
    const r = chequeoDeIngresos(
      [ing("quincena", 15, 700), ing("fin", 30, 700)],
      [pago("v", "Visa", 20, 1200)],
      HOY,
    );
    expect(r.avisos[0].recibido).toBe(700);
    expect(r.avisos[0].alcanza).toBe(false);
    expect(r.avisos[0].siguiente.day).toBe(30);
  });

  it("sin ningún día configurado no dice nada (y lo marca para invitar a ponerlo)", () => {
    const r = chequeoDeIngresos([ing("sueldo", null, 3000)], [pago("v", "Visa", 15, 900)], HOY);
    expect(r.hayDias).toBe(false);
    expect(r.avisos).toEqual([]);
    expect(r.enRiesgo).toBe(0);
  });

  it("con día pero sin monto tampoco avisa (todavía no es plata)", () => {
    const r = chequeoDeIngresos([ing("sueldo", 30, 0)], [pago("v", "Visa", 15, 900)], HOY);
    expect(r.hayDias).toBe(true);
    expect(r.hayDatos).toBe(false);
    expect(r.avisos).toEqual([]);
  });

  it("ignora las tarjetas al día, las vencidas y lo que cae más allá de 30 días", () => {
    const alDia = { ...pago("a", "Amex", 12, 0), status: "al-dia" };
    const vencido = { ...pago("b", "Oh", 1, 500), days: -9 };
    const lejano = pago("c", "Cencosud", 20, 400, 10); // el mes subsiguiente
    const r = chequeoDeIngresos([ing("sueldo", 30, 3000)], [alDia, vencido, lejano], HOY);
    expect(r.avisos).toEqual([]);
  });

  it("sin tarjetas por vencer no arma ningún aviso", () => {
    expect(chequeoDeIngresos([ing("sueldo", 30, 3000)], [], HOY).avisos).toEqual([]);
  });
});

describe("diaHeredado — el día no se pierde al cambiar de mes", () => {
  const sep = { id: "s", name: "Sueldo", amount: 3000, month: "Septiembre 2026", day: 30 };
  it("recupera el día del mismo ingreso en otro mes", () => {
    expect(diaHeredado([sep], "Sueldo")).toBe(30);
    expect(diaHeredado([sep], "  sueldo ")).toBe(30);
  });
  it("se queda con el último que sí tenía día", () => {
    const viejo = { ...sep, id: "v", month: "Julio 2026", day: 15 };
    expect(diaHeredado([viejo, sep], "Sueldo")).toBe(30);
    expect(diaHeredado([viejo, { ...sep, day: null }], "Sueldo")).toBe(15);
  });
  it("sin coincidencia devuelve null", () => {
    expect(diaHeredado([sep], "Freelance")).toBe(null);
    expect(diaHeredado([sep], "")).toBe(null);
    expect(diaHeredado([], "Sueldo")).toBe(null);
  });
});
