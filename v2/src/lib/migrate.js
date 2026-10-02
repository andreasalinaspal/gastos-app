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

  // v4: dos líneas por tarjeta (soles y dólares). La línea plana `creditLine`/
  // `openingBalance` que ya existía SIEMPRE fue en soles, así que se copia a
  // `lines.PEN` sin borrar los campos viejos (quedan como estaban por compatibilidad).
  // El bloque de dólares NO se inventa: aparece solo si la usuaria lo activa.
  // (F18: ese bloque guarda la DEUDA en dólares, no un cupo aparte — la línea
  // de crédito es una sola y vive en `lines.PEN`.)
  const cardsNeedLines = out.paymentMethods.some(
    m => m && m.type === "credito" && !(m.lines && m.lines.PEN)
  );
  if (cardsNeedLines) {
    out.paymentMethods = out.paymentMethods.map(m => {
      if (!m || m.type !== "credito") return m;
      if (m.lines && m.lines.PEN) return m;
      return {
        ...m,
        lines: {
          ...(m.lines || {}),
          PEN: {
            creditLine: Number(m.creditLine) || 0,
            openingBalance: Number(m.openingBalance) || 0,
          },
        },
      };
    });
    changed = true;
  }

  // v4: montos OFICIALES del estado de cuenta del banco. Qori estima antes del
  // corte, pero cuando el banco cobra manda su número (intereses, membresía,
  // seguros y su propio tipo de cambio son cosas que Qori no puede saber).
  if (!Array.isArray(out.cardStatements)) {
    out.cardStatements = [];
    changed = true;
  }

  // v5: deudas por cobrar (F25). Solo se agrega el array vacío; nada existente
  // se toca, así que los blobs viejos siguen siendo válidos.
  if (!Array.isArray(out.deudas)) {
    out.deudas = [];
    changed = true;
  }

  // v6: suscripciones que decidió dar de baja y todavía no da de baja (F44).
  // Una suscripción que "hay que cancelar" se olvida en dos días; la fecha del
  // próximo cobro es la que manda.
  if (!Array.isArray(out.porCancelar)) {
    out.porCancelar = [];
    changed = true;
  }

  // v7: la lista de suscripciones que ella misma lleva (F45). La detección
  // automática sigue existiendo, pero como ayuda: lo que manda es esta lista.
  if (!Array.isArray(out.suscripciones)) {
    out.suscripciones = [];
    changed = true;
  }

  if (!(typeof out.schemaVersion === "number" && out.schemaVersion >= 7)) {
    out.schemaVersion = 7;
    changed = true;
  }

  return changed ? out : data;
}
