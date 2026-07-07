import { create } from "zustand";
import { DEFAULT_CATS_GASTOS, DEFAULT_CATS_INGRESOS, initData } from "../constants";
import { genId } from "../lib/format";

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
        return parsed;
      }
    } catch (e) {}
  }
  return initData();
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

export const useStore = create((set) => ({
  // Datos (blob completo de la app)
  data: loadInitialData(),
  setData: settable('data', set),
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
