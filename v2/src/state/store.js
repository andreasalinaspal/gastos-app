import { create } from "zustand";
import { DEFAULT_CATS_GASTOS, DEFAULT_CATS_INGRESOS, initData } from "../constants";
import { genId } from "../lib/format";
import { migrateData } from "../lib/migrate";

// Replica la inicialización original del useState de `data` en GastosApp:
// lee localStorage 'gastos-data', repara categories faltantes, fallback initData().
const loadInitialData = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('gastos-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.categories) {
          parsed.categories = {
            gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
            ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
          };
        }
        return migrateData(parsed);
      }
    } catch (e) {}
  }
  return migrateData(initData());
};

// Replica la inicialización original del useState de `authPhase`.
const loadInitialAuthPhase = () => {
  if (typeof window === 'undefined') return "loading";
  if (localStorage.getItem('qori-demo')) return "app"; // sesión demo activa sobrevive recargas
  return localStorage.getItem('qori-onboarding') ? "auth" : "onboarding";
};

// Todos los setters aceptan valor o función (estilo setState) para migración mecánica.
const settable = (key, set) => (updaterOrValue) =>
  set((state) => ({
    [key]: typeof updaterOrValue === 'function' ? updaterOrValue(state[key]) : updaterOrValue,
  }));

// setData estampa `updatedAt` por defecto: casi todos los call sites son
// mutaciones del usuario y esa marca es la que permite reconciliar con la nube
// sin perder cambios. Con { stamp: false } NO estampa — sólo para data que
// viene de la nube (loadUserData), que ya trae su propia marca.
const setDataWith = (set) => (updaterOrValue, opts) =>
  set((state) => {
    const next = typeof updaterOrValue === 'function' ? updaterOrValue(state.data) : updaterOrValue;
    if (opts && opts.stamp === false) return { data: next };
    if (!next || typeof next !== 'object') return { data: next };
    return { data: { ...next, updatedAt: new Date().toISOString() } };
  });

export const useStore = create((set) => ({
  // Datos (blob completo de la app)
  data: loadInitialData(),
  setData: setDataWith(set),
  // Auth
  authUser: null,
  setAuthUser: settable('authUser', set),
  authPhase: loadInitialAuthPhase(), // loading | onboarding | auth | pin-setup | app
  setAuthPhase: settable('authPhase', set),
  // Nube
  cloudStatus: "loading", // loading | synced | offline
  setCloudStatus: settable('cloudStatus', set),
  // Navegación top-level
  tab: "home",
  setTab: settable('tab', set),
}));
