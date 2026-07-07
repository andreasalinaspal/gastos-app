import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { PlusIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId } from "../../lib/format";
import { getCycleFor, getLineUsage } from "../../lib/cycles";
import { useStore } from "../../state/store";
import { pmEmoji } from "../shared/PaymentMethodPicker";

const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });

// 6 colores de la paleta para identificar tarjetas.
const CARD_COLORS = [C.purple, C.purpleLight, C.orange, C.green, C.greenLight, C.black];

const emptyCardForm = { id: null, name: "", cutoffDay: "", paymentDay: "", creditLine: "", cycleBudget: "", color: CARD_COLORS[0] };

export function MediosPagoScreen({ subScreen, setSubScreen, fmt, showToast, setConfirm }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [editNameId, setEditNameId] = useState(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [cardForm, setCardForm] = useState(null); // null | {id, name, cutoffDay, paymentDay, creditLine, color}
  const [formError, setFormError] = useState("");
  const [showPro, setShowPro] = useState(false);
  const [payCardId, setPayCardId] = useState(null); // TC que se está pagando
  const [payAmt, setPayAmt] = useState("");

  const methods = data.paymentMethods || [];
  const basics = methods.filter(m => m.type !== "credito");
  const cards = methods.filter(m => m.type === "credito" && !m.archived);
  const archivedCards = methods.filter(m => m.type === "credito" && m.archived);

  const updateMethod = (id, patch) =>
    setData(p => ({ ...p, paymentMethods: p.paymentMethods.map(m => m.id === id ? { ...m, ...patch } : m) }));

  const saveName = (id) => {
    if (!editNameVal.trim()) return;
    updateMethod(id, { name: editNameVal.trim() });
    setEditNameId(null); setEditNameVal("");
  };

  // Gate freemium: gratis = 1 TC activa. Crear o reactivar por encima del límite → Qori Pro.
  const openNewCard = () => {
    if (cards.length >= 1) { setShowPro(true); return; }
    setFormError(""); setCardForm({ ...emptyCardForm });
  };
  const openEditCard = (card) => {
    setFormError("");
    setCardForm({ id: card.id, name: card.name, cutoffDay: String(card.cutoffDay), paymentDay: String(card.paymentDay), creditLine: String(card.creditLine || ""), cycleBudget: card.cycleBudget ? String(card.cycleBudget) : "", color: card.color || CARD_COLORS[0] });
  };
  const reactivateCard = (card) => {
    if (cards.length >= 1) { setShowPro(true); return; }
    updateMethod(card.id, { archived: false });
    showToast(card.name + " reactivada");
  };
  const archiveCard = (card) => {
    setConfirm({ message: `¿Archivar ${card.name}? Sus gastos históricos se mantienen.`, onConfirm: () => {
      updateMethod(card.id, { archived: true });
      showToast(card.name + " archivada");
    }});
  };

  const saveCard = () => {
    const name = cardForm.name.trim();
    const cutoffDay = Number(cardForm.cutoffDay);
    const paymentDay = Number(cardForm.paymentDay);
    const creditLine = Number(cardForm.creditLine);
    if (!name) { setFormError("Ponle un nombre a la tarjeta"); return; }
    if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 31) { setFormError("El día de corte debe estar entre 1 y 31"); return; }
    if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) { setFormError("El día de pago debe estar entre 1 y 31"); return; }
    if (!creditLine || creditLine <= 0) { setFormError("Ingresa una línea de crédito mayor a 0"); return; }
    const cycleBudget = cardForm.cycleBudget === "" ? null : Number(cardForm.cycleBudget);
    if (cycleBudget !== null && (!Number.isFinite(cycleBudget) || cycleBudget <= 0)) { setFormError("El presupuesto por ciclo debe ser mayor a 0"); return; }
    if (cardForm.id) {
      updateMethod(cardForm.id, { name, cutoffDay, paymentDay, creditLine, cycleBudget, color: cardForm.color });
      showToast("Tarjeta actualizada");
    } else {
      setData(p => ({ ...p, paymentMethods: [...p.paymentMethods, { id: genId(), type: "credito", name, cutoffDay, paymentDay, creditLine, cycleBudget, color: cardForm.color, archived: false }] }));
      showToast("Tarjeta " + name + " agregada");
    }
    setCardForm(null); setFormError("");
  };

  return (
    <div style={subStyle(subScreen, "medios-pago")}>
      {subHeader("Medios de pago", () => { setSubScreen(null); setCardForm(null); setEditNameId(null); setShowPro(false); })}

      {/* Efectivo y débito */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "4px 20px 8px" }}>Básicos</div>
      <div style={{ ...cardStyle, margin: "0 16px 16px", overflow: "hidden" }}>
        {basics.map((m, i) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < basics.length - 1 ? "1px solid #F0EDE4" : "none" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.beige, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{pmEmoji(m)}</div>
            {editNameId === m.id ? (
              <>
                <input value={editNameVal} onChange={e => setEditNameVal(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && saveName(m.id)} style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 14, color: C.black }} />
                <button onClick={() => saveName(m.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
              </>
            ) : (
              <>
                <div onClick={() => { setEditNameId(m.id); setEditNameVal(m.name); }} style={{ flex: 1, cursor: "pointer" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Toca para editar el nombre</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Tarjetas de crédito */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "0 20px 8px" }}>Tarjetas de crédito</div>
      <div style={{ padding: "0 16px" }}>
        {cards.length === 0 && !cardForm && (
          <div style={{ ...cardStyle, padding: 20, marginBottom: 10, textAlign: "center", color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
            Agrega tu tarjeta para seguir tu ciclo de facturación y tu línea de crédito.
          </div>
        )}
        {cards.map(card => {
          const { balance } = getLineUsage(card, data.expenses, data.cardPayments);
          return (
          <div key={card.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: card.color || C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.black }}>{card.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>corte {card.cutoffDay} · pago {card.paymentDay} · línea {fmt(card.creditLine)}</div>
              </div>
              <button onClick={() => openEditCard(card)} style={{ background: C.purpleSoft, color: C.purple, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
              <button onClick={() => archiveCard(card)} style={{ background: "#F0EDE4", color: "#666", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Archivar</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1, fontSize: 12, color: C.muted }}>Saldo vivo: <strong style={{ color: balance > 0 ? C.orange : C.green }}>{fmt(balance)}</strong></div>
              {balance > 0 ? (
                <button onClick={() => { setPayCardId(card.id); setPayAmt(String(Math.round(balance * 100) / 100)); }} style={{ background: card.color || C.purple, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Pagar tarjeta</button>
              ) : (
                <button disabled style={{ background: "#F0EDE4", color: C.muted, border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "default", fontFamily: "inherit" }}>Sin deuda 🎉</button>
              )}
            </div>
          </div>
          );
        })}

        {/* Formulario crear/editar tarjeta */}
        {cardForm ? (
          <div style={{ ...cardStyle, padding: 18, marginBottom: 10, animation: "slideUp 0.25s ease" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.black, marginBottom: 12 }}>{cardForm.id ? "Editar tarjeta" : "Nueva tarjeta"}</div>
            <input type="text" placeholder="Nombre (ej: Visa BCP)" value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Día de corte</div>
                <input type="number" inputMode="numeric" min={1} max={31} placeholder="1-31" value={cardForm.cutoffDay} onChange={e => setCardForm(f => ({ ...f, cutoffDay: e.target.value }))} style={{ ...inputStyle, color: C.black }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Día de pago</div>
                <input type="number" inputMode="numeric" min={1} max={31} placeholder="1-31" value={cardForm.paymentDay} onChange={e => setCardForm(f => ({ ...f, paymentDay: e.target.value }))} style={{ ...inputStyle, color: C.black }} />
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Línea de crédito ({data.currency === "USD" ? "US$" : "S/"})</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 3000" value={cardForm.creditLine} onChange={e => setCardForm(f => ({ ...f, creditLine: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Presupuesto por ciclo (opcional)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 600" value={cardForm.cycleBudget} onChange={e => setCardForm(f => ({ ...f, cycleBudget: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Color</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {CARD_COLORS.map(col => (
                <button key={col} onClick={() => setCardForm(f => ({ ...f, color: col }))} style={{ width: 34, height: 34, borderRadius: "50%", background: col, border: cardForm.color === col ? "3px solid " + C.black : "3px solid transparent", boxShadow: cardForm.color === col ? "0 0 0 2px #fff inset" : "none", cursor: "pointer" }} />
              ))}
            </div>
            {formError && <div style={{ fontSize: 13, color: C.orange, fontWeight: 600, marginBottom: 10 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveCard} style={{ flex: 1, padding: 13, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{cardForm.id ? "Guardar" : "Agregar"}</button>
              <button onClick={() => { setCardForm(null); setFormError(""); }} style={{ flex: 1, padding: 13, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={openNewCard} style={{ width: "100%", padding: 16, borderRadius: 14, background: "transparent", border: "2px dashed #C8C4BC", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 }}>
            <PlusIcon size={18} color={C.muted} /> Agregar tarjeta
          </button>
        )}
      </div>

      {/* Archivadas */}
      {archivedCards.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "20px 20px 8px" }}>Archivadas</div>
          <div style={{ padding: "0 16px" }}>
            {archivedCards.map(card => (
              <div key={card.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: 8, opacity: 0.7, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: card.color || C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, filter: "grayscale(0.6)" }}>💳</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.black }}>{card.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>corte {card.cutoffDay} · pago {card.paymentDay}</div>
                </div>
                <button onClick={() => reactivateCard(card)} style={{ background: C.purpleSoft, color: C.purple, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Reactivar</button>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />

      {/* Modal pagar tarjeta: liquidación de gastos ya registrados, NO crea gastos (P1) */}
      {payCardId && (() => {
        const card = methods.find(m => m.id === payCardId);
        if (!card) return null;
        const cycle = getCycleFor(card, new Date());
        const { balance } = getLineUsage(card, data.expenses, data.cardPayments);
        const cycleExps = (data.expenses || []).filter(e => {
          if (e.paymentMethodId !== card.id || !e.date) return false;
          const d = new Date(e.date);
          const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return day >= cycle.start && day <= cycle.end;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        const amtNum = Number(payAmt);
        const valid = amtNum > 0;
        const closePay = () => { setPayCardId(null); setPayAmt(""); };
        const confirmPay = () => {
          if (!valid) return;
          setData(p => ({ ...p, cardPayments: [...(p.cardPayments || []), { id: genId(), cardId: card.id, amount: amtNum, date: new Date().toISOString(), cycleKey: cycle.key }] }));
          closePay();
          showToast("Pago de " + card.name + " registrado");
        };
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 410 }} onClick={closePay}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
              <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 2 }}>Pagar {card.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Ciclo actual: {fmtDay(cycle.start)} – {fmtDay(cycle.end)} · vence {fmtDay(cycle.paymentDate)}</div>
              {/* Saldo vivo */}
              <div style={{ background: card.color || C.purple, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>Saldo vivo</div>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{fmt(balance)}</div>
              </div>
              {/* Gastos del ciclo que se liquidan */}
              {cycleExps.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Gastos del ciclo</div>
                  <div style={{ background: C.beige, borderRadius: 12, padding: "4px 14px", marginBottom: 16 }}>
                    {cycleExps.map((e, i) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < cycleExps.length - 1 ? "1px solid #E8E4DA" : "none" }}>
                        <span style={{ fontSize: 13, color: C.black, fontWeight: 500 }}>{e.description}</span>
                        <span style={{ fontSize: 13, color: C.orange, fontWeight: 600 }}>{fmt(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {/* Monto a pagar */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Monto a pagar</div>
              <input type="number" inputMode="decimal" value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 6, padding: 14 }} />
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>Este pago liquida gastos ya registrados: no se crea ningún gasto nuevo.</div>
              <button onClick={confirmPay} disabled={!valid} style={{ width: "100%", padding: 16, borderRadius: 14, background: valid ? C.green : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: valid ? "pointer" : "default", fontFamily: "inherit", marginBottom: 10 }}>Confirmar pago</button>
              <button onClick={closePay} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        );
      })()}

      {/* Gate freemium: Qori Pro — próximamente */}
      {showPro && (
        <div style={{ position: "fixed", inset: 0, zIndex: 420, background: C.purple, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center", animation: "slideUp 0.3s ease" }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>✨</div>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>Próximamente</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.1, marginBottom: 14 }}>Qori Pro</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 8, maxWidth: 300 }}>
            En el plan gratis puedes tener <strong style={{ color: "#fff" }}>1 tarjeta activa</strong>.
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 32, maxWidth: 300 }}>
            Con Qori Pro: gestiona varias tarjetas, vista consolidada de pagos y más.
          </div>
          <button onClick={() => setShowPro(false)} style={{ width: "100%", maxWidth: 320, padding: 16, borderRadius: 16, background: "#fff", color: C.purple, border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Entendido</button>
        </div>
      )}
    </div>
  );
}
