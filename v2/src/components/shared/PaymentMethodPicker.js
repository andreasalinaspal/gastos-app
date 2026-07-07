import { C } from "../../theme";
import { useStore } from "../../state/store";

// Emoji por tipo de medio de pago.
export const pmEmoji = (pm) => (pm?.type === "efectivo" ? "💵" : "💳");

// Medio de pago por defecto: el último usado (si sigue activo), fallback efectivo.
export function getDefaultPaymentMethodId(data) {
  const methods = (data.paymentMethods || []).filter(m => !m.archived);
  const last = methods.find(m => m.id === data.lastPaymentMethodId);
  if (last) return last.id;
  return methods.find(m => m.type === "efectivo")?.id || methods[0]?.id || null;
}

// Chips horizontales con los medios de pago activos. Misma estética que los
// chips de categoría; `dark` para fondos morados (Home).
export function PaymentMethodPicker({ value, onChange, dark }) {
  const data = useStore(s => s.data);
  const methods = (data.paymentMethods || []).filter(m => !m.archived);
  if (methods.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
      {methods.map(m => {
        const sel = value === m.id;
        const accent = m.type === "credito" ? (m.color || C.purple) : C.purple;
        const style = dark ? {
          padding: "5px 10px", borderRadius: 20, border: sel ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)",
          background: sel ? "rgba(255,255,255,0.25)" : "transparent", color: "#fff",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
        } : {
          padding: "6px 12px", borderRadius: 20, border: "2px solid", borderColor: sel ? accent : "#E0DCD4",
          background: sel ? accent + "1A" : "#fff", color: sel ? accent : C.black,
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
        };
        return (
          <button key={m.id} onClick={() => onChange(m.id)} style={style}>
            {pmEmoji(m)} {m.name}
          </button>
        );
      })}
    </div>
  );
}

// Mini-chip de medio de pago para las listas de gastos. `pm` puede ser null
// (gastos históricos sin medio → no se muestra nada).
export function PmChip({ pm, dark }) {
  if (!pm) return null;
  const accent = pm.type === "credito" ? (pm.color || C.purple) : C.muted;
  const style = dark
    ? { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }
    : { background: accent + "1A", color: pm.type === "credito" ? accent : "#6E6E72", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" };
  return <span style={style}>{pmEmoji(pm)} {pm.name}</span>;
}
