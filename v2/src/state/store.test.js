import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { initData } from "../constants";

beforeEach(() => {
  useStore.getState().setData(initData(), { stamp: false });
});

describe("setData", () => {
  it("estampa updatedAt por defecto (mutación del usuario)", () => {
    useStore.getState().setData(p => ({ ...p, userName: "Andrea" }));
    const d = useStore.getState().data;
    expect(d.userName).toBe("Andrea");
    expect(d.updatedAt).toBeTruthy();
    expect(Number.isNaN(new Date(d.updatedAt).getTime())).toBe(false);
  });

  it("acepta un valor directo además de una función (firma retrocompatible)", () => {
    useStore.getState().setData({ ...initData(), currency: "USD" });
    expect(useStore.getState().data.currency).toBe("USD");
    expect(useStore.getState().data.updatedAt).toBeTruthy();
  });

  it("con { stamp: false } respeta el updatedAt que traiga el blob (data de la nube)", () => {
    const nube = { ...initData(), updatedAt: "2026-01-01T00:00:00.000Z" };
    useStore.getState().setData(nube, { stamp: false });
    expect(useStore.getState().data.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("actualiza la marca en cada cambio sucesivo", () => {
    useStore.getState().setData(p => ({ ...p, userName: "A" }));
    const t1 = useStore.getState().data.updatedAt;
    useStore.getState().setData(p => ({ ...p, userName: "B" }));
    const t2 = useStore.getState().data.updatedAt;
    expect(new Date(t2).getTime()).toBeGreaterThanOrEqual(new Date(t1).getTime());
  });
});
