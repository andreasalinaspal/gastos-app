import { describe, it, expect, beforeEach } from "vitest";
import {
  saveLocalSession, loadLocalSession, clearLocalSession,
  stashRescueCopy, loadRescueCopy, saveLastSyncAt, loadLastSyncAt,
  LOCAL_SESSION_KEY, RESCUE_KEY,
} from "./localSession";

// localStorage falso (vitest corre en node por defecto)
class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

beforeEach(() => {
  globalThis.localStorage = new FakeStorage();
});

describe("sesión local", () => {
  it("guarda y lee userId, email y savedAt", () => {
    const saved = saveLocalSession({ userId: "u1", email: "andrea@example.com" });
    expect(saved.savedAt).toBeTruthy();
    const loaded = loadLocalSession();
    expect(loaded.userId).toBe("u1");
    expect(loaded.email).toBe("andrea@example.com");
    expect(loaded.savedAt).toBe(saved.savedAt);
  });

  it("devuelve null si no hay sesión guardada", () => {
    expect(loadLocalSession()).toBeNull();
  });

  it("clearLocalSession la borra", () => {
    saveLocalSession({ userId: "u1", email: "a@b.c" });
    clearLocalSession();
    expect(loadLocalSession()).toBeNull();
  });

  it("no guarda sin userId", () => {
    expect(saveLocalSession({ email: "a@b.c" })).toBeNull();
    expect(loadLocalSession()).toBeNull();
  });

  it("es tolerante a JSON corrupto", () => {
    localStorage.setItem(LOCAL_SESSION_KEY, "{no-json");
    expect(loadLocalSession()).toBeNull();
  });
});

describe("copia de rescate", () => {
  it("guarda reason, date y data, y la relee", () => {
    const data = { expenses: [{ id: "e1", amount: 10 }] };
    const stashed = stashRescueCopy("nube-gano", data);
    expect(stashed.reason).toBe("nube-gano");
    const loaded = loadRescueCopy();
    expect(loaded.reason).toBe("nube-gano");
    expect(loaded.data).toEqual(data);
    expect(loaded.date).toBeTruthy();
  });

  it("pisa la copia anterior (red de seguridad, no historial)", () => {
    stashRescueCopy("uno", { expenses: [{ id: "a" }] });
    stashRescueCopy("dos", { expenses: [{ id: "b" }] });
    const loaded = loadRescueCopy();
    expect(loaded.reason).toBe("dos");
    expect(loaded.data.expenses[0].id).toBe("b");
  });

  it("no guarda nada si no hay data", () => {
    expect(stashRescueCopy("cierre-sesion", null)).toBeNull();
    expect(loadRescueCopy()).toBeNull();
  });

  it("devuelve null con rescate corrupto", () => {
    localStorage.setItem(RESCUE_KEY, "{roto");
    expect(loadRescueCopy()).toBeNull();
  });
});

describe("última sincronización", () => {
  it("guarda y lee lastSyncAt", () => {
    const iso = "2026-06-10T10:00:00.000Z";
    saveLastSyncAt(iso);
    expect(loadLastSyncAt()).toBe(iso);
  });
  it("sin valor guardado devuelve null", () => {
    expect(loadLastSyncAt()).toBeNull();
  });
});
