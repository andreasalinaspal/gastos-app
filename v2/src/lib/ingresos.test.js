import { describe, it, expect } from "vitest";
import { ordenaPorDia, hayDiasConfigurados, entradasDeIngreso, ingresoPrincipal, esRecibido, separaIngresos, fechaEfectiva, montoEnSoles, montoEnDolaresSinCambiar, monedaYTasa } from "./ingresos";

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

// ── F22: lo que ya entró vs. lo que está por entrar ──
//
// Su caso, textual: hoy es 29 de setiembre y registra un pago que le hacen el 1
// de octubre. Eso NO es plata que ya tiene; recién cuenta el 1.

describe("esRecibido / separaIngresos", () => {
  const hoy = new Date(2026, 8, 29); // 29 set
  const con = (fecha, amount = 100, extra = {}) => ({
    id: "i" + amount, name: "x", amount,
    date: fecha ? new Date(fecha).toISOString() : null, ...extra,
  });

  it("un ingreso de mañana está por entrar", () => {
    expect(esRecibido(con(new Date(2026, 9, 1)), hoy)).toBe(false);
  });

  it("uno de ayer ya entró", () => {
    expect(esRecibido(con(new Date(2026, 8, 28)), hoy)).toBe(true);
  });

  it("el del mismo día ya cuenta", () => {
    expect(esRecibido(con(new Date(2026, 8, 29)), hoy)).toBe(true);
    // y no importa la hora que traiga la fecha
    expect(esRecibido(con(new Date(2026, 8, 29, 23, 59)), hoy)).toBe(true);
  });

  it("sin fecha se da por recibido: no se le esconde su plata", () => {
    expect(esRecibido({ id: "x", amount: 500 }, hoy)).toBe(true);
    expect(esRecibido(con(null), hoy)).toBe(true);
  });

  it("separa y suma cada lado", () => {
    const lista = [
      con(new Date(2026, 8, 15), 5700),  // ya entró
      con(new Date(2026, 9, 1), 4193),   // por entrar
      { id: "sinfecha", name: "Extra", amount: 300 }, // sin fecha → recibido
    ];
    const r = separaIngresos(lista, hoy);
    expect(r.totalRecibido).toBe(6000);   // 5700 + 300
    expect(r.totalPendiente).toBe(4193);
    expect(r.recibidos).toHaveLength(2);
    expect(r.pendientes).toHaveLength(1);
  });

  it("al día siguiente el pendiente pasa a contar solo", () => {
    const lista = [con(new Date(2026, 9, 1), 4193)];
    expect(separaIngresos(lista, hoy).totalPendiente).toBe(4193);
    expect(separaIngresos(lista, new Date(2026, 9, 1)).totalRecibido).toBe(4193);
  });

  it("aguanta listas vacías y filas rotas", () => {
    expect(separaIngresos(null, hoy)).toMatchObject({ totalRecibido: 0, totalPendiente: 0 });
    expect(separaIngresos([null, undefined], hoy).recibidos).toHaveLength(0);
  });
});

describe("fechaEfectiva — los registros viejos solo tienen día", () => {
  const hoy = new Date(2026, 8, 29); // 29 set

  it("un 'entra el 30' de este mes todavía no entró", () => {
    const i = { id: "x", name: "Sueldo", amount: 5700, month: "Septiembre 2026", day: 30 };
    expect(fechaEfectiva(i).getDate()).toBe(30);
    expect(esRecibido(i, hoy)).toBe(false);
  });

  it("un 'entra el 15' de este mes ya entró", () => {
    expect(esRecibido({ id: "y", amount: 100, month: "Septiembre 2026", day: 15 }, hoy)).toBe(true);
  });

  it("el mismo día 30 pero de un mes ya pasado, entró", () => {
    expect(esRecibido({ id: "z", amount: 100, month: "Agosto 2026", day: 30 }, hoy)).toBe(true);
  });

  it("la fecha exacta manda sobre el día suelto", () => {
    const i = { id: "w", amount: 100, month: "Septiembre 2026", day: 30, date: new Date(2026, 8, 2).toISOString() };
    expect(fechaEfectiva(i).getDate()).toBe(2);
    expect(esRecibido(i, hoy)).toBe(true);
  });

  it("sin día ni fecha no se puede ubicar: se da por recibido", () => {
    expect(fechaEfectiva({ id: "v", amount: 100, month: "Septiembre 2026" })).toBe(null);
    expect(esRecibido({ id: "v", amount: 100, month: "Septiembre 2026" }, hoy)).toBe(true);
  });

  it("un día que no existe en ese mes se clampa al último", () => {
    expect(fechaEfectiva({ id: "u", amount: 100, month: "Febrero 2026", day: 31 }).getDate()).toBe(28);
  });
});

// ── F24: ingresos en soles o en dólares ────────────────────────────────────
//
// Su pedido: registrar un ingreso en dólares y, opcional, decir a cuánto se lo
// cambiaron. Con tipo de cambio entra a los soles; sin él, se queda en dólares.

describe("montoEnSoles / montoEnDolaresSinCambiar", () => {
  const usd = (amount, rate) => ({ id: "u", name: "Freelance", amount, currency: "USD", ...(rate !== undefined ? { rate } : {}) });

  it("un ingreso en soles suma tal cual", () => {
    expect(montoEnSoles({ id: "p", amount: 3500 })).toBe(3500);
    expect(montoEnSoles({ id: "p", amount: 3500, currency: "PEN" })).toBe(3500);
    expect(montoEnDolaresSinCambiar({ id: "p", amount: 3500 })).toBe(0);
  });

  it("en dólares con el tipo de cambio que le dieron, suma en soles", () => {
    expect(montoEnSoles(usd(500, 3.72))).toBe(1860);
    expect(montoEnDolaresSinCambiar(usd(500, 3.72))).toBe(0); // ya no es dólares sueltos
  });

  it("en dólares SIN tipo de cambio no se convierte: queda aparte", () => {
    expect(montoEnSoles(usd(500))).toBe(0);
    expect(montoEnDolaresSinCambiar(usd(500))).toBe(500);
  });

  it("una tasa inválida se trata como si no hubiera", () => {
    for (const t of [0, -3, "abc", null]) {
      expect(montoEnSoles(usd(500, t))).toBe(0);
      expect(montoEnDolaresSinCambiar(usd(500, t))).toBe(500);
    }
  });

  it("redondea los soles a céntimos", () => {
    expect(montoEnSoles(usd(100, 3.725))).toBe(372.5);
    expect(montoEnSoles(usd(33.33, 3.721))).toBe(124.02);
  });
});

describe("separaIngresos con dos monedas", () => {
  const hoy = new Date(2026, 8, 29);
  const lista = [
    { id: "a", amount: 3500, date: new Date(2026, 8, 15).toISOString() },                                  // soles, ya entró
    { id: "b", amount: 500, currency: "USD", rate: 3.72, date: new Date(2026, 8, 20).toISOString() },      // dólares cambiados
    { id: "c", amount: 200, currency: "USD", date: new Date(2026, 8, 25).toISOString() },                  // dólares sin cambiar
    { id: "d", amount: 1000, date: new Date(2026, 9, 2).toISOString() },                                   // soles, por entrar
    { id: "e", amount: 300, currency: "USD", date: new Date(2026, 9, 3).toISOString() },                   // dólares por entrar
  ];

  it("los dólares cambiados entran a los soles, los otros van aparte", () => {
    const r = separaIngresos(lista, hoy);
    expect(r.totalRecibido).toBe(5360);      // 3500 + 500×3.72
    expect(r.totalRecibidoUSD).toBe(200);    // los que no cambió
    expect(r.totalPendiente).toBe(1000);
    expect(r.totalPendienteUSD).toBe(300);
  });

  it("nunca mezcla: los dólares sin cambiar no tocan el total en soles", () => {
    const soloUsd = separaIngresos([{ id: "x", amount: 999, currency: "USD" }], hoy);
    expect(soloUsd.totalRecibido).toBe(0);
    expect(soloUsd.totalRecibidoUSD).toBe(999);
  });
});

describe("monedaYTasa — qué se guarda del formulario", () => {
  it("soles no guarda nada: los registros viejos siguen valiendo", () => {
    expect(monedaYTasa("PEN", "")).toEqual({});
    expect(monedaYTasa("PEN", "3.72")).toEqual({});
  });
  it("dólares sin tasa guarda solo la moneda", () => {
    expect(monedaYTasa("USD", "")).toEqual({ currency: "USD" });
    expect(monedaYTasa("USD", "   ")).toEqual({ currency: "USD" });
    expect(monedaYTasa("USD", null)).toEqual({ currency: "USD" });
  });
  it("dólares con tasa guarda las dos", () => {
    expect(monedaYTasa("USD", "3.72")).toEqual({ currency: "USD", rate: 3.72 });
  });
  it("una tasa escrita mal se rechaza en vez de guardarse en silencio", () => {
    expect(monedaYTasa("USD", "0")).toBe(null);
    expect(monedaYTasa("USD", "-2")).toBe(null);
    expect(monedaYTasa("USD", "hola")).toBe(null);
  });
});

describe("la prueba de ¿me alcanza? es solo en soles", () => {
  const hoy = new Date(2026, 8, 1);
  it("un ingreso en dólares sin cambiar no sirve para pagar una tarjeta en soles", () => {
    const soloUsd = [{ id: "u", name: "Freelance", amount: 1000, currency: "USD", day: 5, month: "Septiembre 2026" }];
    expect(entradasDeIngreso(soloUsd, hoy)).toHaveLength(0);
    expect(ingresoPrincipal(soloUsd)).toBe(null);
  });
  it("con el tipo de cambio puesto sí cuenta, y por su valor en soles", () => {
    const cambiado = [{ id: "u", name: "Freelance", amount: 1000, currency: "USD", rate: 3.7, day: 5, month: "Septiembre 2026" }];
    const e = entradasDeIngreso(cambiado, hoy);
    expect(e.length).toBeGreaterThan(0);
    expect(e[0].amount).toBe(3700);
    expect(ingresoPrincipal(cambiado).id).toBe("u");
  });
});
