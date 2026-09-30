import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { fmtWith } from "../../lib/format";
import { toDateInput } from "../../lib/dates";
import { useStore } from "../../state/store";
import { CategoryPicker } from "./CategoryPicker";
import { PaymentMethodPicker, getDefaultPaymentMethodId } from "./PaymentMethodPicker";
import { matchPaymentMethod } from "../../lib/ingest";

// Banner compacto en Inicio. Solo existe cuando hay pendientes: si la bandeja
// está vacía no ocupa ni un pixel ni cambia nada de lo que ya ve la usuaria.
export function InboxBanner({ items, total, onOpen, fmt }) {
  if (!items || items.length === 0) return null;
  const n = items.length;
  return (
    <div style={{ padding: "18px 20px 0" }}>
      <div onClick={onOpen} style={{ background: "rgba(255,255,255,0.94)", borderRadius: 16, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 3px 14px rgba(0,0,0,0.14)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>📥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.black, lineHeight: 1.3 }}>
            {n} {n === 1 ? "gasto por confirmar" : "gastos por confirmar"}
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 1 }}>
            <span style={{ fontFamily: FONT_TITLE, fontWeight: 900, color: C.orange }}>{fmt(total)}</span> de tus compras con la tarjeta
          </div>
        </div>
        <div style={{ fontSize: 20, color: C.muted, flexShrink: 0 }}>›</div>
      </div>
    </div>
  );
}

// Formulario de UN pendiente. Va con key={item.id} desde la hoja para que el
// estado se reinicie limpio al pasar al siguiente.
function InboxItemForm({ item, data, onRegister, onDiscard }) {
  const [amt, setAmt] = useState(String(item.amount));
  const [desc, setDesc] = useState(item.merchant);
  const [dateStr, setDateStr] = useState(toDateInput(new Date(item.occurredAt)));
  const [cat, setCat] = useState(null);
  const [sub, setSub] = useState(null);
  // Apple Pay dice con qué tarjeta se pagó → preseleccionamos ese medio para
  // que el gasto actualice el disponible y el próximo pago de ESA tarjeta.
  // Si no hay match, el default de siempre.
  const matched = matchPaymentMethod(item.cardHint, data.paymentMethods);
  const [pm, setPm] = useState(matched || getDefaultPaymentMethodId(data));
  // F27: la moneda viene del aviso del banco, pero se puede corregir acá. Un
  // consumo en dólares registrado como soles sería un error enorme y mudo.
  const [cur, setCur] = useState(item.currency === "USD" ? "USD" : "PEN");
  const puedeRegistrar = Number(amt) > 0;
  const matchedName = matched ? (data.paymentMethods || []).find(m => m.id === matched)?.name : null;

  return (
    <div style={{ ...cardStyle, padding: "16px 16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Comercio</div>
      <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Comercio" style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Monto</div>
      <input type="number" value={amt} onChange={e => setAmt(e.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8 }} />
      <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: 12 }}>
        {[["PEN", "S/ Soles"], ["USD", "US$ Dólares"]].map(([v, l]) => (
          <button key={v} onClick={() => setCur(v)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: cur === v ? 800 : 600, color: cur === v ? C.black : C.muted, background: cur === v ? "#fff" : "transparent", boxShadow: cur === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Fecha</div>
      <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />

      <div style={{ marginBottom: 12 }}>
        <CategoryPicker value={cat} onChange={setCat} subValue={sub} onSubChange={setSub} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Medio de pago</div>
      <PaymentMethodPicker value={pm} onChange={setPm} />
      {matchedName && (
        <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 6 }}>
          Reconocimos “{item.cardHint}” como {matchedName}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={() => onDiscard(item)} style={{ flex: 1, padding: 15, borderRadius: 14, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Descartar</button>
        <button
          onClick={() => puedeRegistrar && onRegister(item, { amt, desc, dateStr, cat, sub, pm, cur })}
          disabled={!puedeRegistrar}
          style={{ flex: 1, padding: 15, borderRadius: 14, background: puedeRegistrar ? C.green : "#C8C4BC", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: puedeRegistrar ? "pointer" : "default", fontFamily: "inherit" }}
        >Registrar</button>
      </div>
    </div>
  );
}

/**
 * Hoja de confirmación de la bandeja. Va de uno en uno: siempre muestra el
 * primero de `items`; el padre lo saca de la lista al registrar o descartar, y
 * cierra la hoja cuando ya no queda ninguno. Mismo flujo que confirmar un
 * escaneo, pero con categoría por compra (cada tienda es una categoría distinta).
 */
export function InboxSheet({ items, onRegister, onDiscard, onClose }) {
  const data = useStore(s => s.data);
  const item = items?.[0];
  if (!item) return null;
  const fmt = (n) => fmtWith(n, data.currency);
  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", background: C.beige, overflow: "auto" }}>
      <div style={{ padding: "48px 24px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: C.black, fontStyle: "italic", margin: 0, fontFamily: FONT_TITLE }}>Gastos por confirmar</h2>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 6, marginBottom: 0 }}>
            {items.length === 1 ? "Queda 1 compra" : `Quedan ${items.length} compras`} · {fmt(total)}. Elige la categoría y registra.
          </p>
        </div>
        <button onClick={onClose} style={{ background: "#E0DCD4", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 17, fontWeight: 700, color: "#666", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, padding: "8px 20px 40px" }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.orange, fontFamily: FONT_TITLE, letterSpacing: -1, marginBottom: 12 }}>{fmt(item.amount)}</div>
        <InboxItemForm key={item.id} item={item} data={data} onRegister={onRegister} onDiscard={onDiscard} />
      </div>
    </div>
  );
}
