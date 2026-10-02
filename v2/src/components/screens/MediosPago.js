import { useState, useRef, useEffect } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle, usageColor } from "../../theme";
import { PlusIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId } from "../../lib/format";
import { getSharedUsage, hasLine } from "../../lib/cycles";
import { tasaVigente } from "../../lib/fx";
import { useStore } from "../../state/store";
import { pmEmoji } from "../shared/PaymentMethodPicker";


// Etiqueta del campo del formulario: mismo estilo en toda la pantalla.
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
// Ayuda debajo de un campo, en criollo.
const hintStyle = { fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 };

// 6 colores de la paleta para identificar tarjetas.
const CARD_COLORS = [C.purple, C.purpleLight, C.orange, C.green, C.greenLight, C.black];

const emptyCardForm = { id: null, name: "", cutoffDay: "", paymentDay: "", creditLine: "", openingBalance: "", usdOn: false, usdOpeningBalance: "", usdRate: "", cycleBudget: "", tcea: "", color: CARD_COLORS[0] };

export function MediosPagoScreen({ subScreen, setSubScreen, fmt, showToast, setConfirm }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [editNameId, setEditNameId] = useState(null);
  const [editNameVal, setEditNameVal] = useState("");
  const [cardForm, setCardForm] = useState(null); // null | {id, name, cutoffDay, paymentDay, creditLine, color}
  const [formError, setFormError] = useState("");
  // El formulario se dibuja DEBAJO de la lista de tarjetas: con varias tarjetas
  // queda fuera de pantalla y parece que el botón no hiciera nada. Al abrirlo,
  // la pantalla baja sola hasta él.
  const formRef = useRef(null);
  useEffect(() => {
    if (!cardForm || !formRef.current) return;
    formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [cardForm && cardForm.id, cardForm === null]);
  // F19: pagar la tarjeta y registrar el estado de cuenta se hacen desde el
  // detalle de cada tarjeta, no desde esta lista.

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
      usdOpeningBalance: usd && usd.openingBalance ? String(usd.openingBalance) : "",
      usdRate: card.usdRate ? String(card.usdRate) : "",
      cycleBudget: card.cycleBudget ? String(card.cycleBudget) : "",
      tcea: card.tcea ? String(card.tcea) : "",
      color: card.color || CARD_COLORS[0],
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
    const tcea = cardForm.tcea === "" ? null : Number(cardForm.tcea);
    if (tcea !== null && (!Number.isFinite(tcea) || tcea <= 0 || tcea > 500)) { setFormError("La TCEA debe ser un porcentaje entre 0 y 500"); return; }
    const openingBalance = cardForm.openingBalance === "" ? 0 : Number(cardForm.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) { setFormError("El saldo actual no puede ser negativo"); return; }
    if (openingBalance > creditLine) { setFormError("El saldo actual no puede pasar la línea de crédito"); return; }
    // Dólares (F18): NO es una línea aparte. El banco da una sola línea en soles
    // y las compras en dólares se descuentan de ahí a su tipo de cambio. Acá solo
    // se guarda la DEUDA en dólares, que es lo que se paga por separado.
    let usdLine = null;
    // Tipo de cambio de su banco (F12): opcional. Pisa al de SUNAT solo para
    // esta tarjeta, y solo sirve si la tarjeta maneja dólares.
    let usdRate = null;
    if (cardForm.usdOn && cardForm.usdRate !== "") {
      const r = Number(cardForm.usdRate);
      if (!Number.isFinite(r) || r <= 0) { setFormError("El tipo de cambio de tu banco tiene que ser mayor a 0"); return; }
      usdRate = r;
    }
    if (cardForm.usdOn) {
      const usdOpening = cardForm.usdOpeningBalance === "" ? 0 : Number(cardForm.usdOpeningBalance);
      if (!Number.isFinite(usdOpening) || usdOpening < 0) { setFormError("Lo consumido en dólares no puede ser negativo"); return; }
      // creditLine 0 a propósito: los dólares no tienen cupo propio. Si una tarjeta
      // vieja lo tenía guardado, acá queda en cero y el disponible pasa a salir de
      // la línea única, que es como funciona de verdad.
      usdLine = { creditLine: 0, openingBalance: usdOpening };
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
      const patch = { name, cutoffDay, paymentDay, creditLine, cycleBudget, tcea, color: cardForm.color, lines, usdRate };
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
      setData(p => ({ ...p, paymentMethods: [...p.paymentMethods, { id: genId(), type: "credito", name, cutoffDay, paymentDay, creditLine, openingBalance, lines, usdRate, openingDate: ahora, cycleBudget, tcea, color: cardForm.color, archived: false }] }));
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
        {/* F19: LISTA, no fichas gigantes. Antes cada tarjeta ocupaba una pantalla
            entera y con cuatro tarjetas esto era un scroll eterno. Cada fila da
            lo único que se mira de pasada — cuánto te queda — y toda la vida de
            la tarjeta (pagos, estado de cuenta, saldo) vive en su detalle. */}
        {cards.map(card => {
          // F18: el disponible es UNO, de la línea única. Lo consumido en dólares
          // ocupa esa misma línea convertido a soles.
          const vigente = tasaVigente(card, data);
          const compartido = getSharedUsage(card, data.expenses, data.cardPayments, vigente && vigente.tasa);
          const barColor = usageColor(compartido.pct);
          const sinCupo = !compartido.creditLine;
          return (
            <div key={card.id} style={{ ...cardStyle, padding: 0, marginBottom: 8, overflow: "hidden" }}>
              <div
                onClick={() => setSubScreen("card-" + card.id)}
                style={{ padding: "12px 14px 10px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: card.color || C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>💳</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      corte {card.cutoffDay} · pago {card.paymentDay} · línea {fmt(compartido.creditLine)}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, color: C.muted, flexShrink: 0 }}>›</div>
                </div>
                {/* El número que mira antes de gastar, a lo ancho para que quepa */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 9 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>
                    {sinCupo ? "Deuda" : "Disponible"}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 900, color: C.black, letterSpacing: -0.4, lineHeight: 1.15, whiteSpace: "nowrap" }}>
                      {fmt(sinCupo ? compartido.usado : compartido.available)}
                    </div>
                    {!sinCupo && <div style={{ fontSize: 11, fontWeight: 700, color: barColor, whiteSpace: "nowrap" }}>{Math.round(compartido.pct)}%</div>}
                  </div>
                </div>
                <div style={{ height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden", marginTop: 6 }}>
                  <div style={{ height: "100%", width: `${Math.min(Math.round(compartido.pct), 100)}%`, background: barColor, borderRadius: 99 }} />
                </div>
              </div>
              {/* Editar y archivar se quedan acá: esta es la pantalla de
                  configuración. `stopPropagation` para no abrir el detalle. */}
              <div style={{ display: "flex", gap: 8, padding: "0 14px 11px" }}>
                <button onClick={e => { e.stopPropagation(); openEditCard(card); }} style={{ background: C.purpleSoft, color: C.purple, border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
                <button onClick={e => { e.stopPropagation(); archiveCard(card); }} style={{ background: "#F0EDE4", color: "#666", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Archivar</button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setSubScreen("card-" + card.id)} style={{ background: "transparent", color: C.purple, border: "none", padding: "6px 2px", fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Ver detalle ›</button>
              </div>
            </div>
          );
        })}

        {/* Formulario crear/editar tarjeta */}
        {cardForm ? (
          <div ref={formRef} style={{ ...cardStyle, padding: 18, marginBottom: 10, animation: "slideUp 0.25s ease" }}>
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
            <div style={labelStyle}>Línea de crédito (S/)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 6000" value={cardForm.creditLine} onChange={e => setCardForm(f => ({ ...f, creditLine: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>El máximo que el banco te deja gastar con esta tarjeta, tal como te lo dice: una sola línea en soles. Si compras en dólares, sale de esta misma línea.</div>
            <div style={labelStyle}>Saldo actual en soles (S/)</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 0" value={cardForm.openingBalance} onChange={e => setCardForm(f => ({ ...f, openingBalance: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>Lo que debes hoy en total, tal cual lo ves en tu banco. <strong style={{ color: C.black }}>Puedes actualizarlo cuando quieras</strong>: Qori lo toma como la foto de hoy y le suma lo que registres después. Con esto y tu estado de cuenta ya sabe cuánto llevas gastado en el ciclo abierto.</div>

            {/* Dólares (F18): no es un cupo aparte, es la MISMA línea usada en otra
                moneda. Acá solo se declara la deuda en dólares, porque esa sí se
                paga por separado. */}
            <div style={{ background: C.beige, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.black }}>¿Compras en dólares con esta tarjeta?</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>Sale de la misma línea de arriba: el banco lo convierte a soles y te lo descuenta de ahí. Lo que sí es aparte es el pago, porque los dólares los pagas en dólares.</div>
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
                  <div style={labelStyle}>Saldo actual en dólares (US$)</div>
                  <input type="number" inputMode="decimal" placeholder="Ej: 0" value={cardForm.usdOpeningBalance} onChange={e => setCardForm(f => ({ ...f, usdOpeningBalance: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6, background: "#fff" }} />
                  <div style={hintStyle}>Lo que debes hoy en dólares, tal cual lo ves en tu banco. También lo puedes actualizar cuando quieras. Para pagarlo se queda en dólares; para el disponible se convierte a soles, porque ocupa tu línea.</div>
                  {/* Override del tipo de cambio (F12): el de SUNAT es solo una
                      referencia; el que manda es el que el banco le aplicó a ella. */}
                  <div style={labelStyle}>Tipo de cambio de tu banco (opcional)</div>
                  <input type="number" inputMode="decimal" step="0.001" placeholder="Ej: 3.78" value={cardForm.usdRate} onChange={e => setCardForm(f => ({ ...f, usdRate: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6, background: "#fff" }} />
                  <div style={{ ...hintStyle, marginBottom: 0 }}>Si tu estado de cuenta muestra el tipo de cambio que te aplicaron, ponlo acá y Qori lo usa en vez del de SUNAT.</div>
                </div>
              )}
            </div>
            {/* F48: con la TCEA de TODAS sus tarjetas, "¿Cuánto abonar?" ordena
                por tasa en vez de por saturación — que es lo que de verdad manda. */}
            <div style={labelStyle}>TCEA (opcional)</div>
            <input type="number" inputMode="decimal" step="0.01" placeholder="Ej: 89.9" value={cardForm.tcea} onChange={e => setCardForm(f => ({ ...f, tcea: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 14 }}>
              La tasa anual que te cobran, de tu estado de cuenta. Con la de todas tus tarjetas, Qori te dice a cuál abonar primero.
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


    </div>
  );
}
