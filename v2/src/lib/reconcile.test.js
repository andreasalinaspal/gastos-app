import { describe, it, expect } from "vitest";
import { reconcileData, countContent, decideSync } from "./reconcile";

const blob = (over = {}) => ({
  expenses: [{ id: "e1", amount: 10, description: "Menú", date: "2026-06-01T12:00:00.000Z", month: "Junio 2026" }],
  fixed: [],
  incomeFixed: [],
  incomeExtra: [],
  cardPayments: [],
  ...over,
});
const exps = (n) => Array.from({ length: n }, (_, i) => ({ id: "e" + i, amount: 1, description: "g" + i, date: "2026-06-01T12:00:00.000Z", month: "Junio 2026" }));
const vacio = () => ({ expenses: [], fixed: [], incomeFixed: [], incomeExtra: [], cardPayments: [] });

describe("countContent", () => {
  it("cuenta gastos y movimientos (cardPayments + incomeExtra)", () => {
    expect(countContent(blob({ expenses: exps(3), cardPayments: [{ id: "p1" }], incomeExtra: [{ id: "x1" }, { id: "x2" }] })))
      .toEqual({ expenses: 3, movimientos: 3 });
  });
  it("es tolerante con null y campos ausentes", () => {
    expect(countContent(null)).toEqual({ expenses: 0, movimientos: 0 });
    expect(countContent({})).toEqual({ expenses: 0, movimientos: 0 });
  });
});

describe("reconcileData", () => {
  it("gana el local cuando es más nuevo", () => {
    const local = blob({ updatedAt: "2026-06-10T10:00:00.000Z" });
    const cloud = blob({ updatedAt: "2026-06-01T10:00:00.000Z" });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("local-mas-nuevo");
    expect(r.winner).toBe(local);
    expect(r.loser).toBe(cloud);
  });

  it("gana la nube cuando es más nueva", () => {
    const local = blob({ updatedAt: "2026-06-01T10:00:00.000Z" });
    const cloud = blob({ updatedAt: "2026-06-10T10:00:00.000Z" });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("nube-mas-nueva");
    expect(r.winner).toBe(cloud);
    expect(r.loser).toBe(local);
  });

  it("sin updatedAt gana el que tenga más gastos", () => {
    const local = blob({ expenses: exps(2) });
    const cloud = blob({ expenses: exps(7) });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("empate-mas-contenido");
    expect(r.winner).toBe(cloud);
    expect(r.loser).toBe(local);
  });

  it("con updatedAt idéntico desempata por contenido", () => {
    const stamp = "2026-06-10T10:00:00.000Z";
    const local = blob({ updatedAt: stamp, expenses: exps(5) });
    const cloud = blob({ updatedAt: stamp, expenses: exps(1) });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("empate-mas-contenido");
    expect(r.winner).toBe(local);
  });

  it("si un lado no tiene updatedAt, desempata por contenido (no asume nada)", () => {
    const local = blob({ expenses: exps(9) });
    const cloud = blob({ updatedAt: "2030-01-01T00:00:00.000Z", expenses: exps(1) });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("empate-mas-contenido");
    expect(r.winner).toBe(local);
  });

  it("con mismos gastos desempata por cardPayments + incomeExtra", () => {
    const local = blob({ cardPayments: [{ id: "p1" }] });
    const cloud = blob({ incomeExtra: [{ id: "x1" }, { id: "x2" }] });
    const r = reconcileData(local, cloud);
    expect(r.winner).toBe(cloud);
    expect(r.reason).toBe("empate-mas-contenido");
  });

  it("local vacío → gana la nube", () => {
    const local = vacio();
    const cloud = blob({ expenses: exps(3) });
    const r = reconcileData(local, cloud);
    expect(r.reason).toBe("sin-local");
    expect(r.winner).toBe(cloud);
    expect(r.loser).toBe(local);
  });

  it("nube vacía o inexistente → gana el local", () => {
    const local = blob({ expenses: exps(3) });
    expect(reconcileData(local, vacio()).reason).toBe("sin-nube");
    expect(reconcileData(local, vacio()).winner).toBe(local);
    expect(reconcileData(local, null).winner).toBe(local);
    expect(reconcileData(local, null).reason).toBe("sin-nube");
  });

  it("siempre devuelve loser cuando ambos blobs existen y tienen datos", () => {
    const casos = [
      [blob({ updatedAt: "2026-06-10T10:00:00.000Z" }), blob({ updatedAt: "2026-06-01T10:00:00.000Z" })],
      [blob({ updatedAt: "2026-06-01T10:00:00.000Z" }), blob({ updatedAt: "2026-06-10T10:00:00.000Z" })],
      [blob({ expenses: exps(2) }), blob({ expenses: exps(3) })],
      [blob(), blob()],
      [vacio(), blob()],
    ];
    for (const [l, c] of casos) {
      const r = reconcileData(l, c);
      expect(r.loser).toBeTruthy();
      expect(r.loser).not.toBe(r.winner);
    }
  });

  it("empate absoluto se queda con lo local (es lo que la usuaria ve)", () => {
    const local = blob();
    const cloud = blob();
    const r = reconcileData(local, cloud);
    expect(r.winner).toBe(local);
    expect(r.loser).toBe(cloud);
  });

  it("ignora updatedAt corrupto y cae al desempate por contenido", () => {
    const local = blob({ updatedAt: "no-es-fecha", expenses: exps(4) });
    const cloud = blob({ updatedAt: "2026-06-10T10:00:00.000Z", expenses: exps(1) });
    const r = reconcileData(local, cloud);
    expect(r.winner).toBe(local);
    expect(r.reason).toBe("empate-mas-contenido");
  });
});

describe("decideSync", () => {
  it("nube más nueva → bajar, con rescate del local", () => {
    const local = blob({ updatedAt: "2026-06-01T10:00:00.000Z" });
    const cloud = blob({ updatedAt: "2026-06-10T10:00:00.000Z" });
    const d = decideSync(local, cloud);
    expect(d.action).toBe("bajar");
    expect(d.data).toBe(cloud);
    expect(d.rescueLocal).toBe(local);
    expect(d.rescueCloud).toBeNull();
  });

  it("local más nuevo → subir, con rescate de la nube pisada", () => {
    const local = blob({ updatedAt: "2026-06-10T10:00:00.000Z" });
    const cloud = blob({ updatedAt: "2026-06-01T10:00:00.000Z" });
    const d = decideSync(local, cloud);
    expect(d.action).toBe("subir");
    expect(d.data).toBe(local);
    expect(d.rescueCloud).toBe(cloud);
    expect(d.rescueLocal).toBeNull();
  });

  it("sin nube → subir lo local, sin rescate de nube (no hay nada que pisar)", () => {
    const local = blob({ expenses: exps(2) });
    const d = decideSync(local, null);
    expect(d.action).toBe("subir");
    expect(d.rescueCloud).toBeNull();
  });

  it("local vacío y nube con datos → bajar sin rescate (no se pierde nada)", () => {
    const d = decideSync(vacio(), blob({ expenses: exps(2) }));
    expect(d.action).toBe("bajar");
    expect(d.rescueLocal).toBeNull();
  });

  it("todo vacío → nada que hacer", () => {
    const d = decideSync(vacio(), null);
    expect(d.action).toBe("nada");
    expect(d.rescueLocal).toBeNull();
    expect(d.rescueCloud).toBeNull();
  });

  it("nunca pisa un blob con datos sin devolver su copia de rescate", () => {
    const casos = [
      [blob({ updatedAt: "2026-06-10T10:00:00.000Z" }), blob({ updatedAt: "2026-06-01T10:00:00.000Z" })],
      [blob({ updatedAt: "2026-06-01T10:00:00.000Z" }), blob({ updatedAt: "2026-06-10T10:00:00.000Z" })],
      [blob({ expenses: exps(2) }), blob({ expenses: exps(5) })],
    ];
    for (const [l, c] of casos) {
      const d = decideSync(l, c);
      const perdedor = d.data === l ? c : l;
      expect(d.rescueLocal || d.rescueCloud).toBe(perdedor);
    }
  });
});
