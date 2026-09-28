import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle, usageColor } from "../../theme";
import { PlusIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId, fmtWith } from "../../lib/format";
import { getCycleFor, getLineUsage, getNextPayment, cardCurrencies, hasLine } from "../../lib/cycles";
import { useStore } from "../../state/store";
import { pmEmoji } from "../shared/PaymentMethodPicker";

const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
const fmtLong = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "long" });

// Etiqueta del campo del formulario: mismo estilo en toda la pantalla.
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
// Ayuda debajo de un campo, en criollo.
const hintStyle = { fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 };

// 6 colores de la paleta para identificar tarjetas.
const CARD_COLORS = [C.purple, C.purpleLight, C.orange, C.green, C.greenLight, C.black];

const emptyCardForm = { id: null, name: "", cutoffDay: "", paymentDay: "", creditLine: "", openingBalance: "", usdOn: false, usdCreditLine: "", usdOpeningBalance: "", cycleBudget: "", color: CARD_COLORS[0] };

// Nombre en criollo de cada moneda, para etiquetas y avisos.
export const CUR_LABEL = { PEN: "soles", USD: "dólares" };
export const CUR_SYMBOL = { PEN: "S/", USD: "US$" };

export function MediosPagoScreen({ subScreen, setSubScreen, fmt, showToast, setConfirm }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [editNameId, setEditNameId] = useState(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [cardForm, setCardForm] = useState(null); // null | {id, name, cutoffDay, paymentDay, creditLine, color}
  const [formError, setFormError] = useState("");
  const [payCardId, setPayCardId] = useState(null); // TC que se está pagando
  const [payAmt, setPayAmt] = useState("");
  const [payCur, setPayCur] = useState("PEN"); // moneda del pago (F10): son dos deudas distintas

  // Formatea según la moneda del dato: los dólares SIEMPRE con US$, nunca con el
  // símbolo de la moneda global.
  const fmtCur = (n, cur) => (cur === "USD" ? fmtWith(n, "USD") : fmt(n));

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

  // Sin límite de tarjetas: esta versión no tiene planes de pago.
  // El color por defecto es el primero que no esté en uso, para distinguirlas de un vistazo.
  const openNewCard = () => {
    const usados = new Set(cards.map(c => c.color));
    const color = CARD_COLORS.find(c => !usados.has(c)) || CARD_COLORS[cards.length % CARD_COLORS.length];
    setFormError(""); setCardForm({ ...emptyCardForm, color });
  };
  const openEditCard = (card) => {
    setFormError("");
    const pen = (card.lines && card.lines.PEN) || { creditLine: card.creditLine, openingBalance: card.openingBalance };
    const usd = card.lines && card.lines.USD;
    setCardForm({
      id: card.id, name: card.name, cutoffDay: String(card.cutoffDay), paymentDay: String(card.paymentDay),
      creditLine: String(pen.creditLine || ""), openingBalance: pen.openingBalance ? String(pen.openingBalance) : "",
      usdOn: !!usd,
      usdCreditLine: usd ? String(usd.creditLine || "") : "",
      usdOpeningBalance: usd && usd.openingBalance ? String(usd.openingBalance) : "",
      cycleBudget: card.cycleBudget ? String(card.cycleBudget) : "", color: card.color || CARD_COLORS[0],
    });
  };
  const reactivateCard = (card) => {
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
    const openingBalance = cardForm.openingBalance === "" ? 0 : Number(cardForm.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) { setFormError("Lo consumido hoy no puede ser negativo"); return; }
    if (openingBalance > creditLine) { setFormError("Lo consumido hoy no puede pasar la línea de crédito"); return; }
    // Línea en dólares (F10): opcional y totalmente aparte de la de soles.
    let usdLine = null;
    if (cardForm.usdOn) {
      const usdCredit = Number(cardForm.usdCreditLine);
      if (!usdCredit || usdCredit <= 0) { setFormError("Ingresa tu línea en dólares, o apaga esa sección"); return; }
      const usdOpening = cardForm.usdOpeningBalance === "" ? 0 : Number(cardForm.usdOpeningBalance);
      if (!Number.isFinite(usdOpening) || usdOpening < 0) { setFormError("Lo consumido en dólares no puede ser negativo"); return; }
      if (usdOpening > usdCredit) { setFormError("Lo consumido en dólares no puede pasar tu línea en dólares"); return; }
      usdLine = { creditLine: usdCredit, openingBalance: usdOpening };
    }
    if (cardForm.id) {
      // Si cambia lo consumido, es una foto NUEVA de la deuda: desde hoy Qori suma
      // encima de ese número, así que la fecha de corte del saldo se mueve a hoy.
      const prev = methods.find(m => m.id === cardForm.id) || {};
      const prevPen = (prev.lines && prev.lines.PEN) || { openingBalance: prev.openingBalance, openingDate: prev.openingDate };
      const prevUsd = (prev.lines && prev.lines.USD) || null;
      const ahora = new Date().toISOString();
      // Si cambia lo consumido de UNA línea, es una foto NUEVA de ESA deuda: desde
      // hoy Qori suma encima de ese número. Cada línea lleva su propia fecha, así
      // que activar los dólares no borra el historial en soles.
      const penCambio = openingBalance !== (Number(prevPen.openingBalance) || 0);
      const usdCambio = usdLine && usdLine.openingBalance !== (prevUsd ? Number(prevUsd.openingBalance) || 0 : 0);
      const lines = {
        PEN: { creditLine, openingBalance, openingDate: penCambio ? ahora : (prevPen.openingDate || prev.openingDate || ahora) },
        ...(usdLine ? { USD: { ...usdLine, openingDate: usdCambio || !prevUsd ? ahora : (prevUsd.openingDate || prev.openingDate || ahora) } } : {}),
      };
      const patch = { name, cutoffDay, paymentDay, creditLine, cycleBudget, color: cardForm.color, lines };
      if (penCambio) {
        patch.openingBalance = openingBalance; // campos planos: se mantienen por compatibilidad
        patch.openingDate = ahora;
      }
      updateMethod(cardForm.id, patch);
      showToast("Tarjeta actualizada");
    } else {
      const ahora = new Date().toISOString();
      const lines = {
        PEN: { creditLine, openingBalance, openingDate: ahora },
        ...(usdLine ? { USD: { ...usdLine, openingDate: ahora } } : {}),
      };
      setData(p => ({ ...p, paymentMethods: [...p.paymentMethods, { id: genId(), type: "credito", name, cutoffDay, paymentDay, creditLine, openingBalance, lines, openingDate: ahora, cycleBudget, color: cardForm.color, archived: false }] }));
      showToast("Tarjeta " + name + " agregada");
    }
    setCardForm(null); setFormError("");
  };

  return (
    <div style={subStyle(subScreen, "medios-pago")}>
      {subHeader("Medios de pago", () => { setSubScreen(null); setCardForm(null); setEditNameId(null); })}

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
          const curs = cardCurrencies(card); // soles siempre; dólares solo si la configuró
          const usos = curs.map(cur => ({
            cur,
            usage: getLineUsage(card, data.expenses, data.cardPayments, cur),
            next: getNextPayment(card, data.expenses, data.cardPayments, new Date(), cur, data.cardStatements),
          }));
          const conDeuda = usos.filter(u => u.usage.balance > 0);
          return (
          <div key={card.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: card.color || C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.black }}>{card.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  corte {card.cutoffDay} · pago {card.paymentDay} · línea {usos.map(u => fmtCur(u.usage.creditLine, u.cur)).join(" y ")}
                </div>
              </div>
              <button onClick={() => openEditCard(card)} style={{ background: C.purpleSoft, color: C.purple, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
              <button onClick={() => archiveCard(card)} style={{ background: "#F0EDE4", color: "#666", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Archivar</button>
            </div>
            {/* Disponible: el número que mira antes de gastar. Una línea por moneda,
                cada una con su semáforo. Nunca se suman ni se convierten. */}
            {usos.map(({ cur, usage, next }) => {
              const barColor = usageColor(usage.pct);
              return (
                <div key={cur} style={{ background: C.beige, borderRadius: 12, padding: "10px 14px", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>
                        Disponible{curs.length > 1 ? " en " + CUR_LABEL[cur] : ""}
                      </div>
                      <div style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 900, color: C.black, letterSpacing: -0.5, lineHeight: 1.15 }}>
                        {fmtCur(usage.available, cur)} <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>de {fmtCur(usage.creditLine, cur)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: barColor, whiteSpace: "nowrap" }}>{Math.round(usage.pct)}% usado</div>
                  </div>
                  <div style={{ height: 6, background: "#E4E0D6", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${Math.min(Math.round(usage.pct), 100)}%`, background: barColor, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                    {next.status === "por-vencer"
                      ? <>Próximo pago: <strong style={{ color: C.black }}>{fmtCur(next.amount, cur)}</strong> el {fmtLong(next.dueDate)}</>
                      : <>Próximo pago: <strong style={{ color: C.green }}>al día ✅</strong></>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Saldo vivo: <strong style={{ color: usage.balance > 0 ? C.orange : C.green }}>{fmtCur(usage.balance, cur)}</strong>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }} />
              {conDeuda.length > 0 ? (
                <button onClick={() => {
                  const first = conDeuda[0];
                  setPayCardId(card.id); setPayCur(first.cur); setPayAmt(String(Math.round(first.usage.balance * 100) / 100));
                }} style={{ background: card.color || C.purple, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Pagar tarjeta</button>
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
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Día de corte</div>
                <input type="number" inputMode="numeric" min={1} max={31} placeholder="1-31" value={cardForm.cutoffDay} onChange={e => setCardForm(f => ({ ...f, cutoffDay: e.target.value }))} style={{ ...inputStyle, color: C.black }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>Día de pago</div>
                <input type="number" inputMode="numeric" min={1} max={31} placeholder="1-31" value={cardForm.paymentDay} onChange={e => setCardForm(f => ({ ...f, paymentDay: e.target.value }))} style={{ ...inputStyle, color: C.black }} />
              </div>
            </div>
            {/* Traducción en vivo de los dos días: se actualiza mientras escribe */}
            <div style={hintStyle}>
              {cardForm.cutoffDay && cardForm.paymentDay
                ? <>Cierra el <strong style={{ color: C.black }}>{cardForm.cutoffDay}</strong> y lo pagas el <strong style={{ color: C.black }}>{cardForm.paymentDay}</strong> del mes siguiente.</>
                : "El corte es cuando el banco cierra tu cuenta del mes; el pago, la fecha límite para pagarla."}
            </div>
            <div style={labelStyle}>Línea de crédito en soles (S/)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 3000" value={cardForm.creditLine} onChange={e => setCardForm(f => ({ ...f, creditLine: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>El máximo que el banco te deja gastar en soles con esta tarjeta.</div>
            <div style={labelStyle}>Cuánto tienes consumido hoy (S/)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 0" value={cardForm.openingBalance} onChange={e => setCardForm(f => ({ ...f, openingBalance: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>Lo que ya debes en soles ahora mismo. Qori parte de ahí y le suma lo que registres.</div>

            {/* Línea en dólares: opcional y claramente aparte. Si no la llena, la
                tarjeta funciona exactamente como antes. */}
            <div style={{ background: C.beige, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.black }}>¿Tu tarjeta también maneja dólares?</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>Es una línea aparte, con su propia deuda y su propio pago. Si no la usas, déjalo apagado.</div>
                </div>
                <button
                  onClick={() => setCardForm(f => ({ ...f, usdOn: !f.usdOn }))}
                  aria-pressed={cardForm.usdOn}
                  style={{ width: 52, height: 30, borderRadius: 99, border: "none", cursor: "pointer", background: cardForm.usdOn ? C.green : "#D4D0C8", position: "relative", flexShrink: 0, transition: "background 0.2s", fontFamily: "inherit" }}
                >
                  <span style={{ position: "absolute", top: 3, left: cardForm.usdOn ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
              {cardForm.usdOn && (
                <div style={{ marginTop: 12 }}>
                  <div style={labelStyle}>Línea de crédito en dólares (US$)</div>
                  <input type="number" inputMode="decimal" placeholder="Ej: 1000" value={cardForm.usdCreditLine} onChange={e => setCardForm(f => ({ ...f, usdCreditLine: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 10, background: "#fff" }} />
                  <div style={labelStyle}>Cuánto tienes consumido hoy en dólares (US$)</div>
                  <input type="number" inputMode="decimal" placeholder="Ej: 0" value={cardForm.usdOpeningBalance} onChange={e => setCardForm(f => ({ ...f, usdOpeningBalance: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6, background: "#fff" }} />
                  <div style={{ ...hintStyle, marginBottom: 0 }}>Qori nunca suma ni convierte tus soles y tus dólares: te los muestra lado a lado.</div>
                </div>
              )}
            </div>
            <div style={labelStyle}>Presupuesto por ciclo (opcional)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 600" value={cardForm.cycleBudget} onChange={e => setCardForm(f => ({ ...f, cycleBudget: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>Cuánto quieres gastar como máximo entre corte y corte.</div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Color</div>
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
        const curs = cardCurrencies(card);
        const cur = curs.includes(payCur) ? payCur : "PEN";
        const { balance } = getLineUsage(card, data.expenses, data.cardPayments, cur);
        const cycleExps = (data.expenses || []).filter(e => {
          if (e.paymentMethodId !== card.id || !e.date) return false;
          if ((e.currency === "USD" ? "USD" : "PEN") !== cur) return false; // cada deuda por su lado
          const d = new Date(e.date);
          const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return day >= cycle.start && day <= cycle.end;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
        const amtNum = Number(payAmt);
        const valid = amtNum > 0;
        const closePay = () => { setPayCardId(null); setPayAmt(""); setPayCur("PEN"); };
        const confirmPay = () => {
          if (!valid) return;
          setData(p => ({ ...p, cardPayments: [...(p.cardPayments || []), { id: genId(), cardId: card.id, amount: amtNum, currency: cur, date: new Date().toISOString(), cycleKey: cycle.key }] }));
          closePay();
          showToast("Pago de " + card.name + " registrado");
        };
        const pickCur = (next) => {
          setPayCur(next);
          setPayAmt(String(Math.round(getLineUsage(card, data.expenses, data.cardPayments, next).balance * 100) / 100));
        };
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 410 }} onClick={closePay}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
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
                      <button key={c} onClick={() => pickCur(c)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: cur === c ? 800 : 600, color: cur === c ? C.black : C.muted, background: cur === c ? "#fff" : "transparent", boxShadow: cur === c ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                        {CUR_SYMBOL[c]} {CUR_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {/* Saldo vivo de la moneda elegida */}
              <div style={{ background: card.color || C.purple, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>Saldo vivo en {CUR_LABEL[cur]}</div>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{fmtCur(balance, cur)}</div>
              </div>
              {/* Gastos del ciclo que se liquidan */}
              {cycleExps.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Gastos del ciclo en {CUR_LABEL[cur]}</div>
                  <div style={{ background: C.beige, borderRadius: 12, padding: "4px 14px", marginBottom: 16 }}>
                    {cycleExps.map((e, i) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < cycleExps.length - 1 ? "1px solid #E8E4DA" : "none" }}>
                        <span style={{ fontSize: 13, color: C.black, fontWeight: 500 }}>{e.description}</span>
                        <span style={{ fontSize: 13, color: C.orange, fontWeight: 600 }}>{fmtCur(e.amount, cur)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {/* Monto a pagar */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Monto a pagar ({CUR_SYMBOL[cur]})</div>
              <input type="number" inputMode="decimal" value={payAmt} onChange={e => setPayAmt(e.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 6, padding: 14 }} />
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>Este pago liquida gastos ya registrados: no se crea ningún gasto nuevo.</div>
              <button onClick={confirmPay} disabled={!valid} style={{ width: "100%", padding: 16, borderRadius: 14, background: valid ? C.green : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: valid ? "pointer" : "default", fontFamily: "inherit", marginBottom: 10 }}>Confirmar pago</button>
              <button onClick={closePay} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
