import { genId } from "./format";

// Migración lazy del blob de datos al schema v2 (Fase 1: medios de pago y TC).
// - Pura e idempotente: si no hay nada que migrar devuelve el MISMO objeto
//   (comparar por referencia sirve para detectar si hubo cambios y re-subir a Supabase).
// - Sin pérdida de datos: nunca elimina campos existentes, solo agrega faltantes.
// - Los expenses históricos quedan SIN paymentMethodId (la UI los muestra como "sin medio").

export function defaultPaymentMethods() {
  return [
    { id: genId(), type: "efectivo", name: "Efectivo" },
    { id: genId(), type: "debito", name: "Débito" },
  ];
}

export function defaultEducation() {
  return { completedLessons: [], quizResult: null, simulatorState: null };
}

export function migrateData(data) {
  if (!data || typeof data !== "object") return data;

  let changed = false;
  const out = { ...data };

  // Relleno defensivo: aplica tanto a blobs v1 como a blobs v2 con campos faltantes.
  if (!Array.isArray(out.paymentMethods)) {
    out.paymentMethods = defaultPaymentMethods();
    changed = true;
  }
  if (!Array.isArray(out.cardPayments)) {
    out.cardPayments = [];
    changed = true;
  }
  if (!out.education || typeof out.education !== "object") {
    out.education = defaultEducation();
    changed = true;
  }
  if (!(typeof out.schemaVersion === "number" && out.schemaVersion >= 2)) {
    out.schemaVersion = 2;
    changed = true;
  }

  return changed ? out : data;
}
