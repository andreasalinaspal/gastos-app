import { describe, it, expect } from "vitest";
import {
  curOfDeuda, pagado, saldo, estaSaldada, progreso,
  tieneCuotas, montoDeCuota, fechasDeCuotas, proximaCuota, cuotasPagadas,
  resumenDeudas, ordenaDeudas,
} from "./deudas";

const deuda = (over = {}) => ({ id: "d1", name: "Ana", amount: 1200, pagos: [], ...over });
const ymd = (d) => d.toISOString().slice(0, 10);

describe("saldo y pagos", () => {
  it("sin pagos debe todo", () => {
    expect(pagado(deuda())).toBe(0);
    expect(saldo(deuda())).toBe(1200);
    expect(progreso(deuda())).toBe(0);
  });

  it("descuenta lo que le fueron pagando", () => {
    const d = deuda({ pagos: [{ id: "p1", amount: 300 }, { id: "p2", amount: 200 }] });
    expect(pagado(d)).toBe(500);
    expect(saldo(d)).toBe(700);
    expect(progreso(d)).toBeCloseTo(41.67);
  });

  it("pagada del todo queda saldada y sin saldo negativo", () => {
    const d = deuda({ pagos: [{ id: "p", amount: 1500 }] });
    expect(saldo(d)).toBe(0);
    expect(estaSaldada(d)).toBe(true);
    expect(progreso(d)).toBe(100);
  });

  it("aguanta pagos rotos sin romperse", () => {
    const d = deuda({ pagos: [{ id: "a", amount: "x" }, null, { id: "b", amount: 100 }] });
    expect(pagado(d)).toBe(100);
  });

  it("una deuda en dólares se marca como tal", () => {
    expect(curOfDeuda(deuda())).toBe("PEN");
    expect(curOfDeuda(deuda({ currency: "USD" }))).toBe("USD");
  });
});

describe("cuotas", () => {
  // 3 cuotas de S/400, la primera el 5 de octubre.
  const conCuotas = deuda({ amount: 1200, cuotas: { n: 3, primeraFecha: new Date(2026, 9, 5).toISOString() } });

  it("reconoce cuándo va por cuotas", () => {
    expect(tieneCuotas(conCuotas)).toBe(true);
    expect(tieneCuotas(deuda())).toBe(false);
    expect(tieneCuotas(deuda({ cuotas: { n: 1, primeraFecha: "2026-10-05" } }))).toBe(false); // una sola no son cuotas
    expect(tieneCuotas(deuda({ cuotas: { n: 3 } }))).toBe(false); // sin fecha no hay calendario
  });

  it("parte el total en cuotas iguales, mes a mes", () => {
    expect(montoDeCuota(conCuotas)).toBe(400);
    expect(fechasDeCuotas(conCuotas).map(ymd)).toEqual(["2026-10-05", "2026-11-05", "2026-12-05"]);
  });

  it("un día que no existe en el mes cae al último", () => {
    const d = deuda({ amount: 900, cuotas: { n: 3, primeraFecha: new Date(2025, 11, 31).toISOString() } });
    expect(fechasDeCuotas(d).map(ymd)).toEqual(["2025-12-31", "2026-01-31", "2026-02-28"]);
  });

  it("la próxima cuota es la primera que lo pagado no cubre", () => {
    const hoy = new Date(2026, 9, 1);
    expect(proximaCuota(conCuotas, hoy)).toMatchObject({ numero: 1, total: 3, monto: 400, vencida: false });

    const unaPagada = { ...conCuotas, pagos: [{ id: "p", amount: 400 }] };
    expect(proximaCuota(unaPagada, hoy)).toMatchObject({ numero: 2, monto: 400 });
    expect(cuotasPagadas(unaPagada)).toBe(1);
  });

  it("marca la cuota vencida y cuántos días faltan", () => {
    const antes = proximaCuota(conCuotas, new Date(2026, 9, 1));
    expect(antes.vencida).toBe(false);
    expect(antes.diasParaVencer).toBe(4);
    const despues = proximaCuota(conCuotas, new Date(2026, 9, 20));
    expect(despues.vencida).toBe(true);
    expect(despues.diasParaVencer).toBe(-15);
  });

  it("con todas cubiertas ya no hay próxima", () => {
    const todas = { ...conCuotas, pagos: [{ id: "p", amount: 1200 }] };
    expect(proximaCuota(todas, new Date(2026, 9, 1))).toBe(null);
    expect(cuotasPagadas(todas)).toBe(3);
  });

  it("la última cuota se lleva el redondeo para que sumen el total", () => {
    const d = deuda({ amount: 1000, cuotas: { n: 3, primeraFecha: new Date(2026, 9, 5).toISOString() } });
    expect(montoDeCuota(d)).toBe(333.33);
    const ultima = proximaCuota({ ...d, pagos: [{ id: "p", amount: 666.66 }] }, new Date(2026, 9, 1));
    expect(ultima.numero).toBe(3);
    expect(ultima.monto).toBe(333.34); // 333.33 + 333.33 + 333.34 = 1000
  });

  it("sin cuotas no inventa un calendario", () => {
    expect(proximaCuota(deuda(), new Date())).toBe(null);
    expect(montoDeCuota(deuda())).toBe(null);
    expect(fechasDeCuotas(deuda())).toEqual([]);
  });
});

describe("resumenDeudas", () => {
  const hoy = new Date(2026, 9, 20);
  const lista = [
    deuda({ id: "a", name: "Ana", amount: 1200, pagos: [{ id: "p", amount: 200 }] }),
    deuda({ id: "b", name: "Beto", amount: 500, currency: "USD" }),
    deuda({ id: "c", name: "Saldada", amount: 300, pagos: [{ id: "p", amount: 300 }] }),
    deuda({ id: "d", name: "Archivada", amount: 900, archivada: true }),
    deuda({ id: "e", name: "Atrasada", amount: 600, cuotas: { n: 2, primeraFecha: new Date(2026, 9, 5).toISOString() } }),
  ];

  it("separa por moneda y nunca mezcla", () => {
    const r = resumenDeudas(lista, hoy);
    expect(r.PEN.total).toBe(1600); // 1000 de Ana + 600 de la atrasada
    expect(r.USD.total).toBe(500);
    expect(r.PEN.deudas.map(d => d.id)).toEqual(["a", "e"]);
  });

  it("deja fuera lo saldado y lo archivado", () => {
    const ids = resumenDeudas(lista, hoy).PEN.deudas.map(d => d.id);
    expect(ids).not.toContain("c");
    expect(ids).not.toContain("d");
  });

  it("señala las que tienen una cuota vencida", () => {
    expect(resumenDeudas(lista, hoy).vencidas.map(d => d.id)).toEqual(["e"]);
  });

  it("lista vacía no rompe", () => {
    expect(resumenDeudas(null).PEN.total).toBe(0);
  });
});

describe("ordenaDeudas", () => {
  const hoy = new Date(2026, 9, 20);
  it("primero lo vencido, luego por fecha, y lo saldado al final", () => {
    const lista = [
      deuda({ id: "saldada", amount: 100, pagos: [{ id: "p", amount: 100 }] }),
      deuda({ id: "sin-cuotas", amount: 500 }),
      deuda({ id: "futura", amount: 600, cuotas: { n: 2, primeraFecha: new Date(2026, 10, 5).toISOString() } }),
      deuda({ id: "vencida", amount: 600, cuotas: { n: 2, primeraFecha: new Date(2026, 9, 5).toISOString() } }),
    ];
    expect(ordenaDeudas(lista, hoy).map(d => d.id)).toEqual(["vencida", "futura", "sin-cuotas", "saldada"]);
  });
});
