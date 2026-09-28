import { describe, it, expect } from "vitest";
import { parseEtiqueta, etiquetaAtras, mesOrigen, plantillaDelMes, necesitaConfirmar, aplicarPlantilla } from "./mesNuevo";

const ACTUAL = "Septiembre 2026";

const ing = (name, month, amount = 1000, day = null) => ({ id: name + month, name, amount, month, day });
const fij = (name, month, amount = 100, type = "manual", paid = false) => ({ id: name + month, name, amount, paid, type, month });
const base = (over = {}) => ({ fixed: [], incomeFixed: [], expenses: [], incomeExtra: [], ...over });

describe("etiquetaAtras — el mes anterior se calcula desde la etiqueta, no desde hoy", () => {
  it("resta meses dentro del mismo año", () => {
    expect(etiquetaAtras(ACTUAL, 1)).toBe("Agosto 2026");
    expect(etiquetaAtras(ACTUAL, 3)).toBe("Junio 2026");
  });

  it("cruza el año hacia atrás", () => {
    expect(etiquetaAtras("Enero 2026", 1)).toBe("Diciembre 2025");
    expect(etiquetaAtras("Febrero 2026", 3)).toBe("Noviembre 2025");
  });

  it("una etiqueta que no se entiende no inventa nada", () => {
    expect(parseEtiqueta("septiembre 2026")).toBe(null); // ojo: va con mayúscula
    expect(parseEtiqueta("")).toBe(null);
    expect(etiquetaAtras("cualquier cosa", 1)).toBe(null);
  });
});

describe("mesOrigen — de dónde copiar", () => {
  it("es null cuando no hay nada en ningún mes", () => {
    expect(mesOrigen(base(), ACTUAL)).toBe(null);
  });

  it("toma el mes anterior cuando tiene ingresos fijos", () => {
    const data = base({ incomeFixed: [ing("Sueldo", "Agosto 2026", 5700, 30)] });
    expect(mesOrigen(data, ACTUAL)).toBe("Agosto 2026");
  });

  it("toma el mes anterior cuando solo tiene gastos fijos", () => {
    const data = base({ fixed: [fij("Netflix", "Agosto 2026", 44)] });
    expect(mesOrigen(data, ACTUAL)).toBe("Agosto 2026");
  });

  it("mira a 2 meses cuando el anterior está vacío", () => {
    const data = base({ incomeFixed: [ing("Sueldo", "Julio 2026")] });
    expect(mesOrigen(data, ACTUAL)).toBe("Julio 2026");
  });

  it("mira hasta 3 meses atrás", () => {
    const data = base({ incomeFixed: [ing("Sueldo", "Junio 2026")] });
    expect(mesOrigen(data, ACTUAL)).toBe("Junio 2026");
  });

  it("a 4 meses ya no: el caso de la usuaria (sus ingresos de Abril no se arrastran)", () => {
    const data = base({ incomeFixed: [ing("LSG Sueldo", "Abril 2026", 5700, 30)] });
    expect(mesOrigen(data, ACTUAL)).toBe(null);
  });

  it("elige el más reciente cuando hay varios meses con datos", () => {
    const data = base({
      incomeFixed: [ing("Sueldo", "Junio 2026"), ing("Sueldo", "Agosto 2026")],
      fixed: [fij("Netflix", "Julio 2026")],
    });
    expect(mesOrigen(data, ACTUAL)).toBe("Agosto 2026");
  });

  it("nunca devuelve el mes actual, aunque tenga datos", () => {
    const data = base({ incomeFixed: [ing("Sueldo", ACTUAL)] });
    expect(mesOrigen(data, ACTUAL)).toBe(null);
  });

  it("respeta un maxAtras distinto", () => {
    const data = base({ incomeFixed: [ing("Sueldo", "Julio 2026")] });
    expect(mesOrigen(data, ACTUAL, 1)).toBe(null);
    expect(mesOrigen(data, ACTUAL, 2)).toBe("Julio 2026");
  });
});

describe("plantillaDelMes — lo del mes anterior, sin ids", () => {
  const data = base({
    incomeFixed: [ing("LSG Sueldo", "Agosto 2026", 5700, 30), ing("Dólares", "Agosto 2026", 3500, null), ing("Viejo", "Mayo 2026", 1, 1)],
    fixed: [fij("Netflix", "Agosto 2026", 44, "debito"), fij("EPS", "Agosto 2026", 220, "sueldo"), fij("Otro mes", "Mayo 2026")],
  });

  it("trae solo las filas de ese mes", () => {
    const p = plantillaDelMes(data, "Agosto 2026");
    expect(p.ingresos.map(i => i.name)).toEqual(["LSG Sueldo", "Dólares"]);
    expect(p.gastos.map(g => g.name)).toEqual(["Netflix", "EPS"]);
  });

  it("conserva el día del ingreso (F14) y el tipo del gasto", () => {
    const p = plantillaDelMes(data, "Agosto 2026");
    expect(p.ingresos[0]).toEqual({ name: "LSG Sueldo", amount: 5700, day: 30 });
    expect(p.ingresos[1].day).toBe(null);
    expect(p.gastos.map(g => g.type)).toEqual(["debito", "sueldo"]);
  });

  it("no lleva ids: son plantillas, no filas", () => {
    const p = plantillaDelMes(data, "Agosto 2026");
    for (const fila of [...p.ingresos, ...p.gastos]) expect(fila.id).toBeUndefined();
  });

  it("sin mes de origen devuelve listas vacías", () => {
    expect(plantillaDelMes(data, null)).toEqual({ ingresos: [], gastos: [] });
  });

  it("un tipo raro cae en manual", () => {
    const d = base({ fixed: [{ id: "x", name: "Raro", type: "loquesea", amount: 10, month: "Agosto 2026" }] });
    expect(plantillaDelMes(d, "Agosto 2026").gastos[0].type).toBe("manual");
  });
});

describe("necesitaConfirmar", () => {
  const conOrigen = base({ incomeFixed: [ing("Sueldo", "Agosto 2026", 5700, 30)] });

  it("pregunta cuando el mes actual está vacío y hay de dónde copiar", () => {
    expect(necesitaConfirmar(conOrigen, ACTUAL, null)).toBe(true);
  });

  it("no pregunta si el mes actual ya tiene ingresos fijos", () => {
    const data = base({ incomeFixed: [...conOrigen.incomeFixed, ing("Sueldo", ACTUAL)] });
    expect(necesitaConfirmar(data, ACTUAL, null)).toBe(false);
  });

  it("no pregunta si el mes actual ya tiene gastos fijos", () => {
    const data = base({ ...conOrigen, fixed: [fij("Netflix", ACTUAL)] });
    expect(necesitaConfirmar(data, ACTUAL, null)).toBe(false);
  });

  it("no pregunta si no hay mes de origen a menos de 3 meses", () => {
    const data = base({ incomeFixed: [ing("Sueldo", "Abril 2026")] });
    expect(necesitaConfirmar(data, ACTUAL, null)).toBe(false);
  });

  it("no vuelve a preguntar por un mes ya visto, venga el flag como sea", () => {
    expect(necesitaConfirmar(conOrigen, ACTUAL, [ACTUAL])).toBe(false);
    expect(necesitaConfirmar(conOrigen, ACTUAL, new Set([ACTUAL]))).toBe(false);
    expect(necesitaConfirmar(conOrigen, ACTUAL, { [ACTUAL]: true })).toBe(false);
    expect(necesitaConfirmar(conOrigen, ACTUAL, true)).toBe(false);
  });

  it("un flag de OTRO mes no bloquea el mes actual", () => {
    expect(necesitaConfirmar(conOrigen, ACTUAL, ["Agosto 2026"])).toBe(true);
  });
});

describe("aplicarPlantilla", () => {
  const previo = base({
    incomeFixed: [ing("LSG Sueldo", "Agosto 2026", 5700, 30)],
    fixed: [fij("Netflix", "Agosto 2026", 44, "debito", true)],
  });

  it("crea las filas confirmadas en el mes actual, con id nuevo", () => {
    const out = aplicarPlantilla(previo, ACTUAL, {
      ingresos: [{ name: "LSG Sueldo", amount: 6000, day: 30 }],
      gastos: [{ name: "Netflix", type: "debito", amount: 44 }],
    });
    const nuevoIng = out.incomeFixed.filter(i => i.month === ACTUAL);
    const nuevoFij = out.fixed.filter(f => f.month === ACTUAL);
    expect(nuevoIng).toHaveLength(1);
    expect(nuevoIng[0]).toMatchObject({ name: "LSG Sueldo", amount: 6000, day: 30, month: ACTUAL });
    expect(nuevoIng[0].id).toBeTruthy();
    expect(nuevoIng[0].id).not.toBe(previo.incomeFixed[0].id);
    expect(nuevoFij[0]).toMatchObject({ name: "Netflix", type: "debito", amount: 44, month: ACTUAL, paid: false });
  });

  it("los gastos nacen sin pagar aunque el del mes anterior estuviera pagado", () => {
    const out = aplicarPlantilla(previo, ACTUAL, { gastos: [{ name: "Netflix", type: "debito", amount: 44 }] });
    expect(out.fixed.find(f => f.month === ACTUAL).paid).toBe(false);
  });

  it("no toca los meses anteriores", () => {
    const out = aplicarPlantilla(previo, ACTUAL, {
      ingresos: [{ name: "LSG Sueldo", amount: 6000, day: 30 }],
      gastos: [{ name: "Netflix", type: "debito", amount: 44 }],
    });
    expect(out.incomeFixed.filter(i => i.month === "Agosto 2026")).toEqual(previo.incomeFixed);
    expect(out.fixed.filter(f => f.month === "Agosto 2026")).toEqual(previo.fixed);
    expect(previo.incomeFixed).toHaveLength(1);
    expect(previo.fixed).toHaveLength(1);
  });

  it("no duplica lo que ya existe en el mes actual", () => {
    const data = base({ ...previo, incomeFixed: [...previo.incomeFixed, ing("LSG Sueldo", ACTUAL, 5700, 30)] });
    const out = aplicarPlantilla(data, ACTUAL, { ingresos: [{ name: "lsg sueldo", amount: 9999, day: 1 }] });
    expect(out.incomeFixed.filter(i => i.month === ACTUAL)).toHaveLength(1);
    expect(out.incomeFixed.filter(i => i.month === ACTUAL)[0].amount).toBe(5700);
  });

  it("no duplica dentro de la misma selección", () => {
    const out = aplicarPlantilla(previo, ACTUAL, { ingresos: [{ name: "Sueldo", amount: 1 }, { name: "Sueldo", amount: 2 }] });
    expect(out.incomeFixed.filter(i => i.month === ACTUAL)).toHaveLength(1);
  });

  it("si no se confirmó nada, la data queda igual", () => {
    expect(aplicarPlantilla(previo, ACTUAL, { ingresos: [], gastos: [] })).toBe(previo);
    expect(aplicarPlantilla(previo, ACTUAL, null)).toBe(previo);
  });

  it("ignora filas sin nombre y limpia el monto y el día", () => {
    const out = aplicarPlantilla(previo, ACTUAL, {
      ingresos: [{ name: "   ", amount: 100 }, { name: " Cuenta Millonaria ", amount: "4193", day: "99" }],
      gastos: [{ name: "Luz", amount: "" }],
    });
    const nuevos = out.incomeFixed.filter(i => i.month === ACTUAL);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({ name: "Cuenta Millonaria", amount: 4193, day: null });
    expect(out.fixed.find(f => f.month === ACTUAL)).toMatchObject({ name: "Luz", amount: 0, type: "manual" });
  });

  it("el caso completo de la usuaria: sus cuatro ingresos vuelven al mes nuevo", () => {
    const agosto = "Agosto 2026";
    const data = base({
      incomeFixed: [
        ing("LSG Sueldo", agosto, 5700, 30), ing("Cuenta Millonaria", agosto, 4193, 15),
        ing("Dólares", agosto, 3500, null), ing("Saldo", agosto, 1800, 1),
      ],
    });
    const plantilla = plantillaDelMes(data, mesOrigen(data, ACTUAL));
    const out = aplicarPlantilla(data, ACTUAL, plantilla);
    const delMes = out.incomeFixed.filter(i => i.month === ACTUAL);
    expect(delMes.map(i => i.name)).toEqual(["LSG Sueldo", "Cuenta Millonaria", "Dólares", "Saldo"]);
    expect(delMes.reduce((s, i) => s + i.amount, 0)).toBe(15193);
    expect(delMes.map(i => i.day)).toEqual([30, 15, null, 1]);
    expect(necesitaConfirmar(out, ACTUAL, null)).toBe(false);
  });
});
