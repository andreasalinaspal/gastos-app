import { C, FONT_TITLE, inputStyle } from "../../theme";
import { TrashIcon } from "../shared/icons";
import { getToday } from "../../lib/dates";
import { buildCatMap } from "../../state/selectors";
import { getCycleFor, getCycleSpend } from "../../lib/cycles";
import { useStore } from "../../state/store";
import { PaymentMethodPicker, PmChip } from "../shared/PaymentMethodPicker";
import { LESSONS } from "../../content/lessons";

export default function Home({
  fmt, curMonth, todayTotal, recentExp, budgetAlerts,
  editExpId, setEditExpId, editExpDesc, setEditExpDesc, editExpAmt, setEditExpAmt,
  editExpDate, setEditExpDate, editExpCat, setEditExpCat, editExpPm, setEditExpPm,
  saveExpenseEdit, deleteExpense,
  setSelectedCatDetail, setShowNotifPanel, setSubScreen,
  fileInputRef, cameraInputRef, handleScanImage,
}) {
  const data = useStore(s => s.data);
  const setTab = useStore(s => s.setTab);
    const monthExps = data.expenses.filter(e => e.month === curMonth);
    const topCats = buildCatMap(monthExps).slice(0, 5);
    const maxCat = topCats[0]?.amount || 1;
    const creditCards = (data.paymentMethods || []).filter(m => m.type === "credito" && !m.archived);

    return (
      <div style={{ flex: 1, background: "linear-gradient(160deg, #6C5CE7 0%, #5A4BD1 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 88 }}>
        {/* Header */}
        <div style={{ padding: "52px 28px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginBottom: 6 }}>{getToday()}</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: 0, fontStyle: "italic", letterSpacing: -1, fontFamily: FONT_TITLE }}>Hola, {data.userName || "👋"}.</h1>
          </div>
          <button onClick={() => setShowNotifPanel(true)} style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 6 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {budgetAlerts.length > 0 && (
              <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: C.orange, border: "2px solid #5A4BD1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#fff" }}>{budgetAlerts.length}</div>
            )}
          </button>
        </div>
        {/* Today total */}
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>HOY GASTASTE</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2, fontFamily: FONT_TITLE }}>{fmt(todayTotal)}</div>
        </div>
        {/* Bar chart */}
        {topCats.length > 0 ? (
          <div style={{ padding: "8px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 4px" }}>
              {topCats.map((cat, i) => {
                const h = Math.max(Math.round((cat.amount / maxCat) * 120), 8);
                return (
                  <div key={cat.name} onClick={() => setSelectedCatDetail(cat)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>{fmt(cat.amount)}</div>
                    <div style={{ width: "100%", maxWidth: 44, height: h, background: i === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)", borderRadius: "8px 8px 4px 4px", transition: "height 0.4s ease" }} />
                    <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button onClick={() => setSubScreen("all-cats")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}>Ver todas las categorías →</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 28px 0" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Toca <strong style={{ color: "#fff" }}>+</strong> para registrar tu primer gasto</div>
          </div>
        )}
        {/* Tarjetas de crédito: saldo del ciclo + progreso → abre pantalla de ciclo */}
        {creditCards.length > 0 && (
          <div style={{ padding: "18px 20px 0" }}>
            {creditCards.map(card => {
              const cycle = getCycleFor(card, new Date());
              const spend = getCycleSpend(data.expenses, card, cycle.key);
              const accent = card.color || C.purple;
              return (
                <div key={card.id} onClick={() => setSubScreen("card-" + card.id)} style={{ background: "rgba(255,255,255,0.94)", borderRadius: 16, padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>💳</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                      <div style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 900, color: C.black, whiteSpace: "nowrap" }}>{fmt(spend)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                      <div style={{ flex: 1, height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(Math.round((cycle.dayOfCycle / cycle.totalDays) * 100), 100)}%`, background: accent, borderRadius: 99 }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>Día {cycle.dayOfCycle} de {cycle.totalDays}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Simulador (F3): entrada para quienes aún no tienen TC (o el quiz dijo "sin-tarjeta") */}
        {(creditCards.length === 0 || data.education?.quizResult?.segment === "sin-tarjeta") && (
          <div style={{ padding: "10px 20px 0" }}>
            <div onClick={() => setSubScreen("simulador")} style={{ background: "rgba(255,255,255,0.94)", borderRadius: 16, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FDEDE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎮</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.black }}>Practica con una tarjeta</div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>
                  {data.education?.simulatorState ? `Score simulado: ${data.education.simulatorState.score}/100` : "Aprende a manejar una TC sin riesgo"}
                </div>
              </div>
              <div style={{ fontSize: 20, color: C.muted, flexShrink: 0 }}>›</div>
            </div>
          </div>
        )}
        {/* Aprende: entrada compacta a la educación crediticia */}
        {(() => {
          const doneCount = (data.education?.completedLessons || []).length;
          return (
            <div style={{ padding: "10px 20px 0" }}>
              <div onClick={() => setSubScreen("aprende")} style={{ background: "rgba(255,255,255,0.94)", borderRadius: 16, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📚</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.black }}>Aprende</div>
                    <div style={{ fontFamily: FONT_TITLE, fontSize: 14, fontWeight: 900, color: C.black, whiteSpace: "nowrap" }}>{doneCount} de {LESSONS.length}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <div style={{ flex: 1, height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((doneCount / LESSONS.length) * 100)}%`, background: C.purple, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>Historial crediticio sin floro</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {/* Recent expenses */}
        <div style={{ padding: "20px 20px 0", flex: 1 }}>
          {recentExp.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, marginBottom: 10 }}>ÚLTIMOS MOVIMIENTOS</div>
              {recentExp.map(e => (
                <div key={e.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
                  {editExpId === e.id ? (
                    <div>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} placeholder="Descripción" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Fecha</div>
                        <input type="date" value={editExpDate} onChange={ev => setEditExpDate(ev.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 14, padding: "8px 12px" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Categoría</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(data.categories?.gastos || []).map(cat => { const sel = (editExpCat !== undefined ? editExpCat : e.category)?.id === cat.id; return (
                            <button key={cat.id} onClick={() => setEditExpCat(sel ? null : cat)} style={{ padding: "5px 10px", borderRadius: 20, border: sel ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)", background: sel ? "rgba(255,255,255,0.25)" : "transparent", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{cat.emoji} {cat.name}</button>
                          );})}
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Medio de pago</div>
                        <PaymentMethodPicker dark value={editExpPm !== undefined ? editExpPm : (e.paymentMethodId ?? null)} onChange={setEditExpPm} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveExpenseEdit(e.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#fff", color: C.green, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                        <button onClick={() => { setEditExpId(null); setEditExpDesc(""); setEditExpAmt(""); setEditExpDate(""); setEditExpCat(undefined); setEditExpPm(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExpId(e.id); setEditExpDesc(e.description); setEditExpAmt(String(e.amount)); setEditExpDate(new Date(e.date).toISOString().split("T")[0]); }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>{e.category ? `${e.category.emoji} ${e.category.name} · ` : ""}{new Date(e.date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span>
                          <PmChip dark pm={(data.paymentMethods || []).find(m => m.id === e.paymentMethodId)} />
                        </div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginRight: 10 }}>-{fmt(e.amount)}</span>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><TrashIcon size={16} color="rgba(255,255,255,0.7)" /></button>
                    </div>
                  )}
                </div>
              ))}
              {data.expenses.length > 10 && (
                <button onClick={() => setTab("month")} style={{ width: "100%", padding: "12px 0", marginTop: 4, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.2 }}>Ver más →</button>
              )}
            </>
          )}
        </div>
        {/* Hidden file inputs for scan */}
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.heic,.webp" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
      </div>
    );
}
