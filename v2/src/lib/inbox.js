// Bandeja de gastos por confirmar (compras que llegan de Apple Pay vía /api/ingest).
//
// Regla local-first: TODO acá falla en silencio. Si Supabase no responde, la
// bandeja simplemente no carga y la app sigue igual — nada de errores en
// pantalla ni pantallas bloqueadas.

const PENDING_MARKS_KEY = "qori-inbox-marcas";
const MAX_ROWS = 50;

// Fila de Supabase → item de la bandeja. Devuelve null si la fila no sirve.
export function rowToInboxItem(row) {
  if (!row || !row.id) return null;
  const amount = Math.abs(Number(row.amount));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const when = row.occurred_at ? new Date(row.occurred_at) : new Date();
  return {
    id: row.id,
    amount,
    merchant: (row.merchant || "Compra").trim() || "Compra",
    cardHint: row.card_hint || "",
    occurredAt: isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
  };
}

// Pendientes del usuario. Nunca lanza: ante cualquier problema devuelve [].
export async function fetchPendingInbox(supabase, userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("inbox")
      .select("id, amount, merchant, card_hint, occurred_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("occurred_at", { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw error;
    return (data || []).map(rowToInboxItem).filter(Boolean);
  } catch (e) {
    console.warn("[Qori] No se pudo leer la bandeja:", e?.message || e);
    return [];
  }
}

// Marca una fila como confirmed | discarded. Devuelve true/false, no lanza.
export async function markInboxRow(supabase, id, status) {
  if (!supabase || !id) return false;
  try {
    const { error } = await supabase.from("inbox").update({ status }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[Qori] No se pudo marcar la fila de la bandeja:", e?.message || e);
    return false;
  }
}

// --- Cola de reintentos -----------------------------------------------------
// Si el gasto ya entró al blob local pero Supabase no aceptó la marca, la
// dejamos anotada y la reintentamos en el próximo arranque. El gasto de la
// usuaria nunca se pierde por una marca que falló.

const readMarks = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_MARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(m => m && m.id && m.status) : [];
  } catch (e) {
    return [];
  }
};

const writeMarks = (marks) => {
  if (typeof window === "undefined") return;
  try {
    if (marks.length === 0) localStorage.removeItem(PENDING_MARKS_KEY);
    else localStorage.setItem(PENDING_MARKS_KEY, JSON.stringify(marks.slice(-MAX_ROWS)));
  } catch (e) {}
};

export function queueInboxMark(id, status) {
  if (!id || !status) return;
  const marks = readMarks().filter(m => m.id !== id);
  marks.push({ id, status });
  writeMarks(marks);
}

// Reintenta las marcas pendientes; las que vuelven a fallar se quedan en la cola.
export async function flushInboxMarks(supabase, userId) {
  const marks = readMarks();
  if (marks.length === 0 || !supabase || !userId) return;
  const quedan = [];
  for (const m of marks) {
    const ok = await markInboxRow(supabase, m.id, m.status);
    if (!ok) quedan.push(m);
  }
  writeMarks(quedan);
}

// Marca la fila y, si falla, la deja en la cola de reintentos.
export async function markInboxRowOrQueue(supabase, id, status) {
  const ok = await markInboxRow(supabase, id, status);
  if (!ok) queueInboxMark(id, status);
  return ok;
}
