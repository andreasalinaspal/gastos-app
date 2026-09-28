import { genId } from "./format";

// Migración lazy del blob de datos al schema v2 (Fase 1: medios de pago y TC).
// - Pura e idempotente: si no hay nada que migrar devuelve el MISMO objeto
//   (comparar por referencia sirve para detectar si hubo cambios y re-subir a Supabase).
// - Sin pérdida de datos: nunca elimina campos existentes, solo agrega faltantes.
// - Los expenses históricos quedan SIN paymentMethodId (la UI los muestra como "sin medio").

// Fecha de arranque para las TC que existían antes de v3: anterior a cualquier gasto,
// así el saldo vivo sigue sumando todo el historial (no se pierde nada).
export const LEGACY_OPENING_DATE = "1970-01-01T00:00:00.000Z";

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
  // v3: deuda previa por tarjeta (F6). Las TC que ya existían nunca declararon deuda
  // anterior, así que parten en 0 y su openingDate es LEGACY_OPENING_DATE (anterior a
  // cualquier dato) para que todo su historial de gastos siga contando igual que antes.
  const cardsNeedOpening = out.paymentMethods.some(
    m => m && m.type === "credito" && (m.openingBalance === undefined || m.openingDate === undefined)
  );
  if (cardsNeedOpening) {
    out.paymentMethods = out.paymentMethods.map(m => {
      if (!m || m.type !== "credito") return m;
      if (m.openingBalance !== undefined && m.openingDate !== undefined) return m;
      return {
        ...m,
        openingBalance: m.openingBalance === undefined ? 0 : m.openingBalance,
        openingDate: m.openingDate === undefined ? LEGACY_OPENING_DATE : m.openingDate,
      };
    });
    changed = true;
  }

  if (!(typeof out.schemaVersion === "number" && out.schemaVersion >= 3)) {
    out.schemaVersion = 3;
    changed = true;
  }

  return changed ? out : data;
}
