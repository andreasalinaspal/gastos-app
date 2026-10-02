import { useState } from "react";
import { C, FONT_TITLE, inputStyle } from "../../theme";
import { genId, fmtWith } from "../../lib/format";
import { getCycleFor, getLineUsage, cardCurrencies, curOf } from "../../lib/cycles";
import { useStore } from "../../state/store";
import { CAT_PAGO_TC } from "../../constants";
import { useKeyboardInset, sheetStyle } from "../../lib/useKeyboardInset";

// Hoja para pagar una tarjeta (F19: vive acá para que la use la pantalla de
// detalle de la tarjeta, que es donde ella entra a mirarla).
//
// P1: pagar la tarjeta NO es un gasto. Es liquidar gastos que ya se registraron
// cuando ocurrieron. Por eso escribe en `cardPayments` y nunca en `expenses`.

const CUR_LABEL = { PEN: "soles", USD: "dólares" };
const CUR_SYMBOL = { PEN: "S/", USD: "US$" };
const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });

const saldoDe = (card, data, cur) => getLineUsage(card, data.expenses, data.cardPayments, cur).balance;
const redondea = (n) => String(Math.round(n * 100) / 100);

// Moneda con la que abrir: la primera que tenga deuda, si no soles.
const monedaInicial = (card, data) =>
  cardCurrencies(card).find(c => saldoDe(card, data, c) > 0) || "PEN";

export function PayCardSheet({ card, fmt, showToast, onClose }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const kb = useKeyboardInset();
  const [cur, setCur] = useState(() => monedaInicial(card, data));
  const [amt, setAmt] = useState(() => redondea(saldoDe(card, data, monedaInicial(card, data))));

  if (!card) return null;
  const fmtCur = (n, c) => (c === "USD" ? fmtWith(n, "USD") : fmt(n));
  const cycle = getCycleFor(card, new Date());
  const curs = cardCurrencies(card);
  const activa = curs.includes(cur) ? cur : "PEN";
  const balance = saldoDe(card, data, activa);
  const cycleExps = (data.expenses || []).filter(e => {
    if (e.paymentMethodId !== card.id || !e.date) return false;
    if (curOf(e) !== activa) return false; // cada deuda por su lado
    const d = new Date(e.date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return day >= cycle.start && day <= cycle.end;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const amtNum = Number(amt);
  const valid = amtNum > 0;
  const confirmar = () => {
    if (!valid) return;
    setData(p => {
      // F35: los pagos se agrupan en su propia categoría. Si ella todavía no la
      // tiene, se crea una vez — así puede ponerle presupuesto y verla en los
      // gráficos como cualquier otra.
      const gastos = p.categories?.gastos || [];
      const existe = gastos.some(c => c && String(c.name || "").trim().toLowerCase() === CAT_PAGO_TC.name.toLowerCase());
      return {
        ...p,
        ...(existe ? {} : { categories: { ...p.categories, gastos: [...gastos, { id: genId(), ...CAT_PAGO_TC }] } }),
        cardPayments: [...(p.cardPayments || []), { id: genId(), cardId: card.id, amount: amtNum, currency: activa, date: new Date().toISOString(), cycleKey: cycle.key }],
      };
    });
    onClose();
    if (showToast) showToast("Pago de " + card.name + " registrado");
  };
  const pickCur = (next) => { setCur(next); setAmt(redondea(saldoDe(card, data, next))); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 410 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div onClick={e => e.stopPropagation()} style={sheetStyle(kb)}>
        <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 2 }}>Pagar {card.name}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Ciclo actual: {fmtDay(cycle.start)} – {fmtDay(cycle.end)} · vence {fmtDay(cycle.paymentDate)}</div>
        {/* Moneda del pago: solo si la tarjeta maneja las dos. El saldo en
            dólares se paga aparte, en dólares. */}
        {curs.length > 1 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>¿En qué moneda estás pagando?</div>
            <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: 14 }}>
              {curs.map(c => (
                <button key={c} onClick={() => pickCur(c)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: activa === c ? 800 : 600, color: activa === c ? C.black : C.muted, background: activa === c ? "#fff" : "transparent", boxShadow: activa === c ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                  {CUR_SYMBOL[c]} {CUR_LABEL[c]}
                </button>
              ))}
            </div>
          </>
        )}
        {/* Saldo vivo de la moneda elegida */}
        <div style={{ background: card.color || C.purple, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>Saldo vivo en {CUR_LABEL[activa]}</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{fmtCur(balance, activa)}</div>
        </div>
        {/* Gastos del ciclo que se liquidan */}
        {cycleExps.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Gastos del ciclo en {CUR_LABEL[activa]}</div>
            <div style={{ background: C.beige, borderRadius: 12, padding: "4px 14px", marginBottom: 16 }}>
              {cycleExps.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < cycleExps.length - 1 ? "1px solid #E8E4DA" : "none" }}>
                  <span style={{ fontSize: 13, color: C.black, fontWeight: 500 }}>{e.description}</span>
                  <span style={{ fontSize: 13, color: C.orange, fontWeight: 600 }}>{fmtCur(e.amount, activa)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {/* Monto a pagar */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Monto a pagar ({CUR_SYMBOL[activa]})</div>
        <input type="number" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 6, padding: 14 }} />
        {/* F30: abonar de a pocos es su forma de pagar. El monto viene lleno con
            el saldo entero, y sin decirlo parece que hay que pagar todo. */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setAmt(redondea(balance))}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: "#F0EDE4", color: C.black, border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Todo ({fmtCur(balance, activa)})
          </button>
          <button onClick={() => setAmt("")}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: "#F0EDE4", color: C.black, border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Otro monto
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          <strong style={{ color: C.black }}>Puedes abonar menos del total.</strong> Lo que pongas se descuenta de tu saldo y de lo que te toca pagar, y queda anotado en la tarjeta.
          <div style={{ marginTop: 4 }}>Esto no crea ningún gasto nuevo: liquida compras que ya registraste.</div>
        </div>
        <button onClick={confirmar} disabled={!valid} style={{ width: "100%", padding: 16, borderRadius: 14, background: valid ? C.green : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: valid ? "pointer" : "default", fontFamily: "inherit", marginBottom: 10 }}>Confirmar pago</button>
        <button onClick={onClose} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
      </div>
    </div>
  );
}
