import { useState } from "react";
import { C, FONT_TITLE, inputStyle } from "../../theme";
import { genId, fmtWith } from "../../lib/format";
import { getStatementPrompt } from "../../lib/cycles";
import { useStore } from "../../state/store";

// Registro del estado de cuenta del banco (F10).
//
// Por qué se registra y no se calcula: el banco cobra intereses, membresía,
// seguros y aplica su propio tipo de cambio. Qori no puede saber nada de eso.
// Antes del corte Qori muestra su ESTIMADO (para que ella no se sature); cuando
// el ciclo cierra, ella registra el monto OFICIAL y ese manda.

const CUR_LABEL = { PEN: "soles", USD: "dólares" };
const CUR_SYMBOL = { PEN: "S/", USD: "US$" };

export const fmtCurWith = (n, cur, fmt) => (cur === "USD" ? fmtWith(n, "USD") : fmt(n));

const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
const toDateInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};

// De dónde sale el número del próximo pago, dicho en criollo.
export function SourceNote({ source, style }) {
  return (
    <span style={{ fontSize: 11, color: C.muted, ...style }}>
      {source === "banco" ? "según tu estado de cuenta" : "estimado con tus gastos"}
    </span>
  );
}

// Aviso cuando el banco cobró bastante más (o menos) de lo que ella registró.
// Útil, nunca alarmista: la explicación más probable es una compra que se escapó.
export function StatementDiffNote({ next, fmt, currency }) {
  if (!next || next.source !== "banco" || !next.estimateGross) return null;
  const diff = next.statementAmount - next.estimateGross;
  const ratio = Math.abs(diff) / next.estimateGross;
  if (ratio <= 0.05) return null;
  const monto = fmtCurWith(Math.abs(Math.round(diff * 100) / 100), currency, fmt);
  return (
    <div style={{ background: "#FDEDE0", borderRadius: 12, padding: "10px 12px", marginTop: 8, fontSize: 12, color: "#8A4A38", lineHeight: 1.5 }}>
      {diff > 0
        ? <>El banco cobró <strong>{monto} más</strong> de lo que registraste — puede que se te hayan escapado compras, o que sean intereses y membresía.</>
        : <>El banco cobró <strong>{monto} menos</strong> de lo que registraste. Revisa si algún gasto quedó repetido.</>}
    </div>
  );
}

// Banner accionable: aparece solo si hay un ciclo cerrado sin estado de cuenta.
export function StatementBanner({ card, expenses, statements, now, onOpen, compact }) {
  const prompt = getStatementPrompt(card, expenses, statements, now || new Date());
  if (!prompt) return null;
  return (
    <div
      onClick={() => onOpen(prompt)}
      style={{ background: C.purpleSoft, border: "1.5px solid " + C.purple + "40", borderRadius: 14, padding: compact ? "10px 12px" : "12px 14px", marginTop: 10, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
    >
      <div style={{ fontSize: 20, flexShrink: 0 }}>🧾</div>
      <div style={{ flex: 1, fontSize: 12.5, color: "#4A3FA0", lineHeight: 1.45 }}>
        Cerró tu ciclo del <strong>{fmtDay(prompt.cycle.end)}</strong>. ¿Cuánto te cobró el banco?
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.purple, whiteSpace: "nowrap" }}>Registrar ›</div>
    </div>
  );
}

// Hoja para registrar el monto oficial (una casilla por moneda que falte) y la
// fecha de vencimiento, prellenada con la calculada.
export function StatementSheet({ card, prompt, fmt, onClose, showToast }) {
  const setData = useStore(s => s.setData);
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(prompt.missing.map(m => [m.currency, ""]))
  );
  const [due, setDue] = useState(() => toDateInput(prompt.cycle.paymentDate));
  const [error, setError] = useState("");

  const guardar = () => {
    const filled = prompt.missing
      .map(m => ({ ...m, amount: Number(amounts[m.currency]) }))
      .filter(m => amounts[m.currency] !== "");
    if (filled.length === 0) { setError("Escribe al menos un monto"); return; }
    if (filled.some(m => !Number.isFinite(m.amount) || m.amount < 0)) { setError("Los montos no pueden ser negativos"); return; }
    const dueISO = due ? new Date(due + "T12:00:00").toISOString() : prompt.cycle.paymentDate.toISOString();
    const nuevos = filled.map(m => ({
      id: genId(), cardId: card.id, cycleKey: prompt.cycle.key, currency: m.currency,
      amount: m.amount, dueDate: dueISO, registeredAt: new Date().toISOString(),
    }));
    setData(p => ({ ...p, cardStatements: [...(p.cardStatements || []), ...nuevos] }));
    if (showToast) showToast("Estado de cuenta registrado");
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 420 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "88vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
        <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: C.black, marginBottom: 4 }}>Tu estado de cuenta</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          {card.name} cerró su ciclo el {fmtDay(prompt.cycle.end)}. Copia el monto que dice tu estado de cuenta: ese es el que manda, porque incluye intereses, membresía y seguros que Qori no puede saber.
        </div>

        {prompt.missing.map(m => (
          <div key={m.currency} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              Monto en {CUR_LABEL[m.currency]} ({CUR_SYMBOL[m.currency]})
            </div>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={amounts[m.currency]}
              onChange={e => setAmounts(a => ({ ...a, [m.currency]: e.target.value }))}
              style={{ ...inputStyle, color: C.black, fontSize: 22, fontWeight: 800, textAlign: "center", padding: 14 }}
            />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>
              Qori estimaba {fmtCurWith(Math.round(m.estimateGross * 100) / 100, m.currency, fmt)} con los gastos que registraste.
            </div>
          </div>
        ))}

        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Fecha de vencimiento</div>
        <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Ya la pusimos según tu día de pago. Cámbiala si tu estado de cuenta dice otra.</div>

        {error && <div style={{ fontSize: 13, color: C.orange, fontWeight: 600, marginBottom: 10 }}>{error}</div>}
        <button onClick={guardar} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.green, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Guardar estado de cuenta</button>
        <button onClick={onClose} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Ahora no</button>
      </div>
    </div>
  );
}

// De dónde sale el número, para textos sueltos.
export function nextPaymentSourceLabel(source) {
  return source === "banco" ? "según tu estado de cuenta" : "estimado con tus gastos";
}
