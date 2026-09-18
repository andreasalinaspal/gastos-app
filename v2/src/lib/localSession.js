// Sesión local: permite entrar a la app sin depender de Supabase.
// La nube es respaldo; los datos locales son la fuente de verdad operativa.

export const LOCAL_SESSION_KEY = 'qori-local-session';
export const RESCUE_KEY = 'qori-rescate';
// Copia aparte del blob de la nube cuando lo local gana: así el rescate
// principal (datos locales a punto de perderse) nunca queda pisado.
export const CLOUD_RESCUE_KEY = 'qori-rescate-nube';
export const LAST_SYNC_KEY = 'qori-last-sync';

const store = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch (e) { return null; }
};

export function saveLocalSession({ userId, email } = {}) {
  const ls = store();
  if (!ls || !userId) return null;
  const session = { userId, email: email || null, savedAt: new Date().toISOString() };
  try { ls.setItem(LOCAL_SESSION_KEY, JSON.stringify(session)); } catch (e) { return null; }
  return session;
}

export function loadLocalSession() {
  const ls = store();
  if (!ls) return null;
  try {
    const raw = ls.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.userId) return null;
    return parsed;
  } catch (e) { return null; }
}

export function clearLocalSession() {
  const ls = store();
  if (!ls) return;
  try { ls.removeItem(LOCAL_SESSION_KEY); } catch (e) {}
}

// Red de seguridad: guarda el blob que estaría a punto de perderse.
// Pisa la copia anterior a propósito (no es historial, es último recurso).
export function stashRescueCopy(reason, data, key = RESCUE_KEY) {
  const ls = store();
  if (!ls || !data) return null;
  const copy = { reason: reason || 'desconocido', date: new Date().toISOString(), data };
  try { ls.setItem(key, JSON.stringify(copy)); } catch (e) { return null; }
  return copy;
}

export function loadRescueCopy(key = RESCUE_KEY) {
  const ls = store();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function saveLastSyncAt(iso) {
  const ls = store();
  if (!ls) return null;
  const value = iso || new Date().toISOString();
  try { ls.setItem(LAST_SYNC_KEY, value); } catch (e) { return null; }
  return value;
}

export function loadLastSyncAt() {
  const ls = store();
  if (!ls) return null;
  try { return ls.getItem(LAST_SYNC_KEY); } catch (e) { return null; }
}
