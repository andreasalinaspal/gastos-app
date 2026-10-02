import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { TrashIcon } from "../shared/icons";
import { MONTHS_SHORT, DAYS, getMonthShort } from "../../lib/dates";
import { useStore } from "../../state/store";
import { curOf } from "../../lib/cycles";
import { fechaEfectiva, esRecibido, curOfIngreso, tasaDeIngreso, montoEnSoles } from "../../lib/ingresos";
import { sumUSD } from "../../state/selectors";
import { fmtWith } from "../../lib/format";
import { PaymentMethodPicker, PmChip } from "../shared/PaymentMethodPicker";
import { CategoryPicker } from "../shared/CategoryPicker";

export default function MiMes({
  fmt, getMonthData, catSpend, budgetAlerts,
  monthTab, setMonthTab, miMesSubTab, setMiMesSubTab,
  editExpId, setEditExpId, editExpDesc, setEditExpDesc, editExpAmt, setEditExpAmt,
  editExpDate, setEditExpDate, editExpCat, setEditExpCat, editExpSub, setEditExpSub, editExpPm, setEditExpPm,
  saveExpenseEdit, deleteExpense,
}) {
  const data = useStore(s => s.data);
  // Los registros se leen de lo más nuevo a lo más viejo, que es lo que se
  // quiere ver primero; el orden inverso queda a un toque.
  const [ordenRegistros, setOrdenRegistros] = useState("nuevo");
    // F22: el mes que viene solo aparece si ya hay algo ahí. Pasa cuando anota
    // un pago que le hacen el mes siguiente: tiene que poder verlo antes de que
    // llegue, no descubrirlo cuando cambie el mes.
    const haySiguiente = getMonthData(1).ingresos.some(i => (Number(i.amount) || 0) > 0) || getMonthData(1).exps.length > 0;
    const mtabs = [
      ...(haySiguiente ? [{ label: getMonthShort(1), val: 1 }] : []),
      { label: "Este mes", val: 0 }, { label: getMonthShort(-1), val: -1 }, { label: getMonthShort(-2), val: -2 }, { label: "Historico", val: "hist" },
    ];
    const d = monthTab === "hist" ? getMonthData(0) : getMonthData(monthTab);
    const isNeg = d.balance < 0;
    // F22: gastos e ingresos en UNA sola lista cronológica. Los ingresos en cero
    // no entran: son plantillas a las que todavía no les puso monto, no
    // movimientos. Los que no tienen fecha van al final, como en Ingresos.
    const movimientos = [
      ...d.exps.map(e => ({ tipo: "gasto", id: e.id, fecha: new Date(e.date), e })),
      ...d.ingresos
        .filter(i => (Number(i.amount) || 0) > 0)
        .map(i => ({ tipo: "ingreso", id: i.id, fecha: fechaEfectiva(i), pendiente: !esRecibido(i), i })),
      // F31: los pagos a la tarjeta se VEN, pero no suman a los gastos: saldan
      // compras que ya están registradas. Van marcados para que se note.
      ...d.pagosTC.map(p => ({ tipo: "pago-tc", id: p.id, fecha: new Date(p.date), p })),
    ].sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0;
      if (!a.fecha) return 1;   // sin fecha, siempre al final
      if (!b.fecha) return -1;
      const diff = b.fecha - a.fecha;
      return ordenRegistros === "nuevo" ? diff : -diff;
    });
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic", fontFamily: FONT_TITLE }}>Mi Mes</h1>
          </div>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 70, marginBottom: 16 }} />
        </div>
        <div style={{ display: "flex", gap: 0, padding: "0 24px", marginBottom: 20, overflowX: "auto" }}>
          {mtabs.map(t => (
            <button key={t.label} onClick={() => { setMonthTab(t.val); setMiMesSubTab("balance"); }} style={{ padding: "8px 14px", fontSize: 13, fontWeight: monthTab === t.val ? 700 : 500, color: monthTab === t.val ? C.purple : C.muted, background: "none", border: "none", borderBottom: monthTab === t.val ? "2.5px solid " + C.purple : "2.5px solid transparent", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        {/* Sub-tabs */}
        {monthTab !== "hist" && (
          <div style={{ display: "flex", background: "#E8E4DA", borderRadius: 12, padding: 4, margin: "0 16px 16px" }}>
            {[{id:"balance",label:"Balance"},{id:"presupuesto",label:"Presupuesto"}].map(t => (
              <button key={t.id} onClick={() => setMiMesSubTab(t.id)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: miMesSubTab === t.id ? 700 : 500, color: miMesSubTab === t.id ? C.black : C.muted, background: miMesSubTab === t.id ? "#fff" : "transparent", boxShadow: miMesSubTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>{t.label}</button>
            ))}
          </div>
        )}
        {monthTab === "hist" ? (
          <div style={{ padding: "0 24px" }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Gastos por mes</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
                {[-5,-4,-3,-2,-1,0].map(off => { const m = getMonthData(off); const total = m.totalDiarios + m.totalFijos; const max = 80000; const h = total > 0 ? Math.max((total / max) * 120, 6) : 4; return (
                  <div key={off} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{total > 0 ? fmt(total) : ""}</div>
                    <div style={{ width: "100%", maxWidth: 32, height: h, background: off === 0 ? C.purple : C.orange, borderRadius: "4px 4px 2px 2px", opacity: total > 0 ? 1 : 0.2 }} />
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{getMonthShort(off).split(" ")[0]}</span>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {miMesSubTab === "balance" && (
            <>
            <div style={{ padding: "0 24px", marginBottom: 16 }}>
              <div style={{ background: isNeg ? C.orange : "linear-gradient(135deg, #1B6B3A 0%, #2D9F5B 100%)", borderRadius: 20, padding: "28px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Balance del mes</div>
                <div style={{ fontSize: "clamp(22px, 9vw, 46px)", fontWeight: 900, color: "#fff", letterSpacing: -1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT_TITLE }}>{fmt(Math.abs(d.balance))}</div>
                {isNeg && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>estás en rojo</div>}
                {/* F15: con los ingresos en cero este balance es solo lo que
                    gastó, no un balance. Se dice, sin dramatizar. */}
                {monthTab === 0 && d.totalInc === 0 && (d.totalDiarios + d.totalFijosAll) > 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.45 }}>
                    No tienes ingresos registrados este mes: esto es solo lo que llevas gastado, no un balance. Regístralos en Ingresos.
                  </div>
                )}
                {/* F22: el balance del mes cuenta TODO el mes, incluido lo que
                    todavía no entra. Se dice, para que no confunda con lo que
                    tiene hoy en la mano. */}
                {d.totalIncPendiente > 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.45 }}>
                    Cuenta {fmt(d.totalIncPendiente)} de ingresos que todavía no entran. Hoy tienes {fmt(d.totalIncRecibido)} recibidos.
                  </div>
                )}
                {d.totalDiariosUSD > 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6, lineHeight: 1.45 }}>
                    Gastaste además {fmtWith(d.totalDiariosUSD, "USD")} en dólares. No se suman acá: esa deuda se paga aparte, en dólares.
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 24px", marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: 110, background: C.green, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Ingresos</div>
                {/* F22: el número grande es lo que YA entró. Lo que falta entrar
                    va debajo, visible pero aparte. */}
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap", fontFamily: FONT_TITLE }}>{fmt(d.totalIncRecibido)}</div>
                {d.totalIncPendiente > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", opacity: 0.85 }}>+ {fmt(d.totalIncPendiente)} por entrar</div>
                )}
                {/* F24: dólares que no cambió a soles — nunca sumados al total */}
                {d.totalIncUSD > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", opacity: 0.85 }}>+ {fmtWith(d.totalIncUSD, "USD")} en dólares</div>
                )}
              </div>
              <div style={{ minWidth: 110, background: C.orange, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Gastos Fijos</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap", fontFamily: FONT_TITLE }}>{fmt(d.totalFijosAll)}</div>
              </div>
              <div style={{ minWidth: 110, background: C.purple, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Diarios</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap", fontFamily: FONT_TITLE }}>{fmt(d.totalDiarios)}</div>
                {/* F32: de dónde sale ese número, para que no parezca inflado sin motivo */}
                {d.totalPagosTC > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, lineHeight: 1.3, opacity: 0.85 }}>incluye {fmt(d.totalPagosTC)} de pagos TC</div>
                )}
                {/* Los gastos en dólares no entran al total en soles (F10) */}
                {d.totalDiariosUSD > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", opacity: 0.85 }}>+ {fmtWith(d.totalDiariosUSD, "USD")}</div>
                )}
              </div>
              {/* F31: la otra pregunta — cuánta plata salió de verdad de su
                  cuenta. Acá el pago de tarjeta SÍ cuenta, y una compra hecha
                  CON la tarjeta no: esa sale el día que paga la tarjeta. */}
              <div style={{ minWidth: 118, background: C.black, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.75 }}>Salió de tu cuenta</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap", fontFamily: FONT_TITLE }}>{fmt(d.salioDeTuCuenta)}</div>
                {d.totalPagosTC > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", opacity: 0.8 }}>incluye {fmt(d.totalPagosTC)} de tarjetas</div>
                )}
              </div>
            </div>
            <div style={{ padding: "0 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Registros del mes</div>
                {movimientos.length > 1 && (
                  <button
                    onClick={() => setOrdenRegistros(o => (o === "nuevo" ? "antiguo" : "nuevo"))}
                    title={ordenRegistros === "nuevo" ? "Mostrando primero los más nuevos" : "Mostrando primero los más antiguos"}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px solid #E0DCD4", borderRadius: 20, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, color: C.purple, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {ordenRegistros === "nuevo" ? "↓ Recientes" : "↑ Antiguos"}
                  </button>
                )}
              </div>
              {movimientos.length === 0 && <div style={{ ...cardStyle, textAlign: "center", color: C.muted, fontSize: 14, padding: 24 }}>Sin movimientos registrados</div>}
              {/* F22: los ingresos van en la misma lista que los gastos. Los que
                  todavía no entran salen marcados como pendientes, no como plata
                  que ya tiene. */}
              {movimientos.map(mov => mov.tipo === "pago-tc" ? (() => {
                const p = mov.p;
                const tc = (data.paymentMethods || []).find(m => m.id === p.cardId);
                const esUsd = (p.currency === "USD");
                return (
                <div key={"pago-" + p.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, background: "#F7F5FF" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 14, flexShrink: 0 }}>💳</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Pago a {tc ? tc.name : "tu tarjeta"}</div>
                      <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <span>{DAYS[mov.fecha.getDay()].toLowerCase().slice(0,3)}, {mov.fecha.getDate()} {MONTHS_SHORT[mov.fecha.getMonth()].toLowerCase()}.</span>
                        <span style={{ background: C.purpleSoft, color: C.purple, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>💳 Pago de tarjeta</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.purple, marginRight: 8, whiteSpace: "nowrap" }}>
                      −{esUsd ? fmtWith(p.amount, "USD") : fmt(p.amount)}
                    </div>
                  </div>
                </div>
                ); })() : mov.tipo === "ingreso" ? (() => { const { i, pendiente, fecha } = mov; return (
                <div key={"inc-" + i.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, opacity: pendiente ? 0.75 : 1, border: pendiente ? "1.5px dashed #CFCABF" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: pendiente ? "#F2F0EA" : "#E8F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: pendiente ? C.muted : C.green, marginRight: 14, flexShrink: 0 }}>
                      {fecha ? fecha.getDate() : "–"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{i.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <span>
                          {fecha
                            ? <>{DAYS[fecha.getDay()].toLowerCase().slice(0,3)}, {fecha.getDate()} {MONTHS_SHORT[fecha.getMonth()].toLowerCase()}.</>
                            : "sin fecha"}
                        </span>
                        <span style={{ background: pendiente ? "#F2F0EA" : "#E8F5EE", color: pendiente ? C.muted : C.green, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                          {pendiente ? "⏳ Por entrar" : "💰 Ingreso"}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: pendiente ? C.muted : C.green, whiteSpace: "nowrap" }}>
                        +{curOfIngreso(i) === "USD" ? fmtWith(i.amount, "USD") : fmt(i.amount)}
                      </div>
                      {/* F24: si vino en dólares, a cuánto lo cambió (o que sigue en dólares) */}
                      {curOfIngreso(i) === "USD" && (
                        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, whiteSpace: "nowrap" }}>
                          {tasaDeIngreso(i) ? "TC " + tasaDeIngreso(i) + " = " + fmt(montoEnSoles(i)) : "sin cambiar"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ); })() : (() => { const e = mov.e; const dt = new Date(e.date); return (
                <div key={e.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10 }}>
                  {editExpId === e.id ? (
                    <div>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} placeholder="Descripcion" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Fecha</div>
                        <input type="date" value={editExpDate} onChange={ev => setEditExpDate(ev.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 14, padding: "8px 12px" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <CategoryPicker
                          value={editExpCat !== undefined ? editExpCat : e.category}
                          onChange={setEditExpCat}
                          subValue={editExpSub !== undefined ? editExpSub : (e.subcategory || null)}
                          onSubChange={setEditExpSub}
                        />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Medio de pago</div>
                        <PaymentMethodPicker value={editExpPm !== undefined ? editExpPm : (e.paymentMethodId ?? null)} onChange={setEditExpPm} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveExpenseEdit(e.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                        <button onClick={() => { setEditExpId(null); setEditExpDate(""); setEditExpCat(undefined); setEditExpSub(undefined); setEditExpPm(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#E0DCD4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.purple, marginRight: 14, flexShrink: 0 }}>{dt.getDate()}</div>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExpId(e.id); setEditExpDesc(e.description); setEditExpAmt(String(e.amount)); setEditExpDate(new Date(e.date).toISOString().split("T")[0]); }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                          <span>{DAYS[dt.getDay()].toLowerCase().slice(0,3)}, {dt.getDate()} {MONTHS_SHORT[dt.getMonth()].toLowerCase()}.</span>
                          {e.category && <span style={{ background: C.purpleSoft, color: C.purple, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{e.category.emoji} {e.category.name}{e.subcategory ? " · " + e.subcategory.name : ""}</span>}
                          <PmChip pm={(data.paymentMethods || []).find(m => m.id === e.paymentMethodId)} />
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.orange, marginRight: 8 }}>-{curOf(e) === "USD" ? fmtWith(e.amount, "USD") : fmt(e.amount)}</div>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                    </div>
                  )}
                </div>
              ); })())}
              {movimientos.some(m => m.tipo === "pago-tc") && (
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, padding: "2px 2px 6px" }}>
                  Los pagos de tarjeta <strong style={{ color: C.black }}>suman a tus gastos del mes</strong>. Ten en cuenta que la compra ya sumó el día que la hiciste, así que esa plata aparece dos veces: una al comprar y otra al pagar. Tus presupuestos por categoría no la cuentan dos veces — ahí solo van las compras.
                </div>
              )}
              {movimientos.some(m => m.tipo === "ingreso" && m.pendiente) && (
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, padding: "2px 2px 6px" }}>
                  Los ingresos con línea punteada todavía no entran: aparecen para que los tengas en cuenta, pero no se cuentan como plata que ya tienes. El día que les toca pasan a contar solos.
                </div>
              )}
            </div>
            </>
            )}
            {miMesSubTab === "presupuesto" && (() => {
              const budgetCats = (data.categories?.gastos || []).filter(cat => data.budgets?.[cat.id] > 0);
              const totalBudget = budgetCats.reduce((s, cat) => s + (data.budgets[cat.id] || 0), 0);
              const totalSpent = budgetCats.reduce((s, cat) => s + (catSpend[cat.id] || 0), 0);
              const alertCount = budgetAlerts.length;
              const usdMes = sumUSD(d.exps); // los dólares no cuentan contra los presupuestos en soles
              return (
                <div>
                  {/* Overall summary */}
                  <div style={{ background: C.purple, borderRadius: 16, padding: "16px 18px", margin: "0 16px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 34 }}>🎯</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Total presupuestado</div>
                      <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: "#fff" }}>{fmt(totalSpent)} <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.6 }}>/ {fmt(totalBudget)}</span></div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{alertCount > 0 ? `${alertCount} categoría${alertCount > 1 ? "s" : ""} necesita${alertCount > 1 ? "n" : ""} atención` : "Todo dentro del presupuesto ✅"}</div>
                      {usdMes > 0 && (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>+ {fmtWith(usdMes, "USD")} en dólares, fuera de estos límites</div>
                      )}
                    </div>
                  </div>

                  {budgetCats.length === 0 ? (
                    <div style={{ ...cardStyle, margin: "0 16px", padding: 24, textAlign: "center", color: C.muted, fontSize: 14 }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
                      Define límites en Config → Presupuesto para ver el seguimiento aquí.
                    </div>
                  ) : (
                    [...budgetCats]
                      .map(cat => ({ cat, limit: data.budgets[cat.id], spent: catSpend[cat.id] || 0 }))
                      .map(({ cat, limit, spent }) => {
                        const pct = Math.round((spent / limit) * 100);
                        const isDanger = pct >= 100;
                        const isWarn = pct >= 80 && pct < 100;
                        const barClass = isDanger ? "linear-gradient(90deg,#C2410C,#E8561E)" : isWarn ? "linear-gradient(90deg,#D97706,#F59E0B)" : `linear-gradient(90deg,${C.green},${C.greenLight})`;
                        const pctColor = isDanger ? C.orange : isWarn ? "#D97706" : C.greenLight;
                        const chipBg = isDanger ? "#FEE2E2" : isWarn ? "#FEF3C7" : "#E8F5EE";
                        const chipColor = isDanger ? "#991B1B" : isWarn ? "#92400E" : C.green;
                        const chipLabel = isDanger ? "🚨 Te pasaste" : isWarn ? "⚠️ Casi al límite" : "✅ Vas bien";
                        const remText = isDanger ? `Excediste ${fmt(spent - limit)}` : `Te quedan ${fmt(limit - spent)}`;
                        const remColor = isDanger ? C.orange : isWarn ? "#D97706" : C.greenLight;
                        return (
                          <div key={cat.id} style={{ ...cardStyle, padding: "14px 16px", margin: "0 16px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <div style={{ fontSize: 22 }}>{cat.emoji}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: C.black }}>{cat.name}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}><strong style={{ color: isDanger ? C.orange : C.black }}>{fmt(spent)}</strong> de {fmt(limit)}</div>
                              </div>
                              <div style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 900, color: pctColor }}>{pct}%</div>
                            </div>
                            <div style={{ height: 8, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barClass, borderRadius: 99 }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11 }}>
                              <span style={{ background: chipBg, color: chipColor, borderRadius: 20, padding: "3px 9px", fontWeight: 600 }}>{chipLabel}</span>
                              <span style={{ color: remColor, fontWeight: isDanger ? 700 : 600 }}>{remText}</span>
                            </div>
                          </div>
                        );
                      })
                  )}

                  {/* Categories without budget */}
                  {(data.categories?.gastos || []).filter(cat => !(data.budgets?.[cat.id] > 0) && (catSpend[cat.id] || 0) > 0).length > 0 && (
                    <div style={{ padding: "4px 20px 8px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Sin límite definido</div>
                      {(data.categories?.gastos || []).filter(cat => !(data.budgets?.[cat.id] > 0) && (catSpend[cat.id] || 0) > 0).map(cat => (
                        <div key={cat.id} style={{ ...cardStyle, padding: "12px 16px", margin: "0 0 8px", opacity: 0.6, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.black }}>{cat.name}</div>
                          <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{fmt(catSpend[cat.id])}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
}
