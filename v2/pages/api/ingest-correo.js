import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { leeAvisoBancario } from "../../src/lib/correoBancos";
import { normalizeTransaction } from "../../src/lib/ingest";

// F28: ingesta de avisos bancarios por correo.
//
// El script de Gmail es tonto a propósito: manda el correo crudo (remitente,
// asunto, cuerpo, id) y acá se decide qué hacer. Los bancos cambian sus
// plantillas sin avisar, y así el arreglo se despliega desde el repo sin que
// ella tenga que volver a editar nada en Google.
//
// Igual que /api/ingest, esto NO toca los gastos: escribe en la bandeja y ella
// confirma cada uno desde la app.

const SUPABASE_URL = "https://ewczxeqkwwrugxxiqxar.supabase.co";
const MAX_CUERPO = 20000; // un aviso de banco no pasa de unos pocos KB

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
  if (!expected || !serviceKey || !userId) {
    return res.status(500).json({ error: "La ingesta no está configurada en el servidor" });
  }
  if (!safeEqual(bearerToken(req), expected)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Falta el cuerpo del correo" });
  }

  const remitente = String(body.from || body.remitente || "").slice(0, 300);
  const asunto = String(body.subject || body.asunto || "").slice(0, 500);
  const cuerpo = String(body.body || body.cuerpo || "").slice(0, MAX_CUERPO);
  const messageId = String(body.messageId || body.id || "").slice(0, 200);
  if (!asunto && !cuerpo) return res.status(400).json({ error: "El correo vino vacío" });

  const lectura = leeAvisoBancario({ remitente, asunto, cuerpo });

  // Reconocido pero no es un gasto (pago de tarjeta, ingreso, estado de cuenta).
  // Se responde 200: el script hizo su trabajo, no hay nada que arreglar.
  if (lectura.accion === "ignorar") {
    return res.status(200).json({ ok: true, registrado: false, motivo: lectura.motivo });
  }
  // No se entendió. Tampoco es error del script: se deja constancia y ya.
  // Ante la duda NO se registra — un gasto inventado es peor que uno que falta.
  if (lectura.accion !== "registrar") {
    console.warn("[Qori/correo] Aviso no reconocido:", { remitente, asunto, motivo: lectura.motivo });
    return res.status(200).json({ ok: true, registrado: false, motivo: lectura.motivo });
  }

  // El id del mensaje de Gmail es el ancla contra duplicados: si el script
  // relee el mismo correo, el banco puede no traer código de operación pero
  // Gmail siempre tiene su id.
  const payload = { ...lectura.payload, externalId: lectura.payload.externalId || messageId || undefined };
  const parsed = normalizeTransaction(payload);
  if (!parsed.ok) {
    console.warn("[Qori/correo] No se pudo normalizar:", { asunto, error: parsed.error });
    return res.status(200).json({ ok: true, registrado: false, motivo: parsed.error });
  }
  const { amount, merchant, occurredAt, cardHint, source, externalId, currency } = parsed.value;

  try {
    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (externalId) {
      const { data: yaEsta } = await admin.from("inbox")
        .select("id").eq("user_id", userId).eq("external_id", externalId).limit(1);
      if (yaEsta && yaEsta.length > 0) {
        return res.status(200).json({ ok: true, registrado: false, motivo: "ya estaba" });
      }
    }

    // La misma compra avisada por Apple Pay y por el correo del banco.
    const ventana = 15 * 60 * 1000;
    const desde = new Date(new Date(occurredAt).getTime() - ventana).toISOString();
    const hasta = new Date(new Date(occurredAt).getTime() + ventana).toISOString();
    const { data: gemelas } = await admin.from("inbox")
      .select("id, source")
      .eq("user_id", userId).eq("amount", amount).eq("currency", currency)
      .neq("source", source)
      .gte("occurred_at", desde).lte("occurred_at", hasta)
      .limit(1);
    if (gemelas && gemelas.length > 0) {
      return res.status(200).json({ ok: true, registrado: false, motivo: "ya llegó por " + gemelas[0].source });
    }

    const { error } = await admin.from("inbox").insert({
      user_id: userId,
      amount, merchant, currency, source,
      card_hint: cardHint || null,
      occurred_at: occurredAt,
      external_id: externalId || null,
      status: "pending",
    });
    if (error) throw error;
    return res.status(201).json({ ok: true, registrado: true, tipo: lectura.tipo, banco: lectura.banco });
  } catch (e) {
    console.error("[Qori/correo] No se pudo guardar en inbox:", e);
    return res.status(500).json({ error: "No se pudo guardar el aviso" });
  }
}
