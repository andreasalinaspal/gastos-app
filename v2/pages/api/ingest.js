import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { normalizeTransaction } from "../../src/lib/ingest";

// Ruta de ingesta para el atajo de iOS (automatización "Transacción" de Apple Pay).
//
// A propósito NO toca los gastos: escribe una fila en `inbox`. Los datos de la
// app viven en un único blob JSON (`app_data`); si el servidor lo editara
// mientras el celular sincroniza, uno pisaría al otro. La bandeja evita ese
// choque: la usuaria confirma cada compra desde la app y ahí entra a su blob.

const SUPABASE_URL = "https://ewczxeqkwwrugxxiqxar.supabase.co";

// Comparación de tiempo constante. timingSafeEqual explota con longitudes
// distintas, así que comparamos hashes de largo fijo — y además nunca filtramos
// el largo del token real por el tiempo de respuesta.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

function bearerToken(req) {
  const header = req.headers?.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return m ? m[1].trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const expected = process.env.QORI_INGEST_TOKEN;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.QORI_INGEST_USER_ID;

  // Sin configuración no hay forma segura de autenticar: 500 explícito, nunca
  // un valor por defecto que deje la ruta abierta.
  if (!expected || !serviceKey || !userId) {
    console.error("[Qori/ingest] Faltan variables de entorno:", {
      QORI_INGEST_TOKEN: !!expected,
      SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
      QORI_INGEST_USER_ID: !!userId,
    });
    return res.status(500).json({ error: "La ingesta no está configurada en el servidor" });
  }

  // Autenticación primero: un cuerpo inválido no debe revelar nada a quien no
  // tiene el token.
  if (!safeEqual(bearerToken(req), expected)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }

  const parsed = normalizeTransaction(body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { amount, merchant, occurredAt, cardHint } = parsed.value;

  try {
    // Cliente de service role: escribe saltando RLS y no persiste sesión.
    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("inbox").insert({
      user_id: userId,
      amount,
      merchant,
      card_hint: cardHint || null,
      occurred_at: occurredAt,
      source: "apple-pay",
      status: "pending",
    });
    if (error) throw error;
    return res.status(201).json({ ok: true });
  } catch (e) {
    // El detalle se queda en los logs de Vercel; al atajo solo le importa que falló.
    console.error("[Qori/ingest] No se pudo guardar en inbox:", e);
    return res.status(500).json({ error: "No se pudo guardar la transacción" });
  }
}
