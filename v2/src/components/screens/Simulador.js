import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { CardCycleScreen } from "./CardCycle";
import { useStore } from "../../state/store";
import {
  SIM_CARD, initSimulator, addSimExpense, advanceWeek, resolvePayment,
  canAdvance, isDecisionDue, getMinPayment, MONTHLY_RATE,
} from "../../lib/simulator";

const RED = "#C0392B";
const fmtSimDay = (iso) => new Date(iso).toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
const scoreColor = (score) => score >= 70 ? C.green : score >= 40 ? C.orange : RED;

// Pantalla Simulador (F3): sandbox de tarjeta de crédito para practicar sin riesgo.
// Todo vive en data.education.simulatorState — NUNCA toca expenses/cardPayments reales (P1).
// Reusa CardCycleScreen con la sim-card y datos inyectados + panel de práctica arriba.
export function SimuladorScreen({ subScreen, setSubScreen, fmt }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const sim = data.education?.simulatorState || null;

  const [showAdd, setShowAdd] = useState(false);
  const [addAmt, setAddAmt] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addCat, setAddCat] = useState(null);
  const [addError, setAddError] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null); // resultado tras elegir pago
  const [confirmReset, setConfirmReset] = useState(false);

  const setSim = (next) => setData(p => ({
    ...p,
    education: { ...(p.education || { completedLessons: [], quizResult: null }), simulatorState: next },
  }));

  const closeAdd = () => { setShowAdd(false); setAddAmt(""); setAddDesc(""); setAddCat(null); setAddError(null); };

  const saveAdd = () => {
    const r = addSimExpense(sim, { amount: addAmt, description: addDesc.trim(), category: addCat });
    if (!r.ok) { setAddError(r.error); return; }
    setSim(r.state);
    closeAdd();
  };

  const choosePayment = (choice) => {
    const r = resolvePayment(sim, choice);
    setSim(r.state);
    setDecisionResult({ choice, paid: r.paid, interest: r.interest, scoreDelta: r.scoreDelta });
  };

  // ---------- Intro: simulador aún no iniciado ----------
  if (!sim) {
    return (
      <div style={subStyle(subScreen, "simulador")}>
        {subHeader("Simulador", () => setSubScreen(null))}
        <div style={{ padding: "8px 20px 40px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ ...cardStyle, padding: "28px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎮</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: C.black, fontStyle: "italic", lineHeight: 1.25, marginBottom: 12 }}>
              Una tarjeta de mentira para aprender de verdad
            </div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, textAlign: "left" }}>
              Te damos <strong>“Mi primera tarjeta”</strong>: línea de {fmt(SIM_CARD.creditLine)}, corte el {SIM_CARD.cutoffDay} y pago el {SIM_CARD.paymentDay}. Registra gastos de práctica, avanza el tiempo semana a semana y decide cómo pagar cuando llegue la fecha.
            </div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, textAlign: "left", marginTop: 10 }}>
              Vas a ver en carne propia (pero sin riesgo) cómo funcionan el corte, los intereses y tu score. Nada de esto toca tus gastos reales.
            </div>
          </div>
          <div style={{ marginTop: "auto", paddingTop: 20 }}>
            <button onClick={() => setSim(initSimulator(new Date()))} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.orange, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Empezar a practicar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Activo: CardCycle reusada + panel de práctica ----------
  const advance = canAdvance(sim);
  const decisionDue = isDecisionDue(sim) && !decisionResult;
  const lastLog = (sim.scoreLog || []).at?.(-1) || (sim.scoreLog || [])[sim.scoreLog.length - 1];
  const sc = scoreColor(sim.score);
  const pd = sim.pendingDecision;
  const minPay = pd ? getMinPayment(pd.statementBalance) : 0;

  const panel = (
    <>
      {/* Banner modo práctica */}
      <div style={{ margin: "0 16px 10px", padding: "10px 14px", borderRadius: 12, background: C.orange, color: "#fff", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
        🎮 Modo práctica — nada de esto es real
      </div>

      {/* Panel: fecha simulada + score + intereses + acciones */}
      <div style={{ ...cardStyle, margin: "0 16px 12px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Hoy (simulado)</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 900, color: C.black }}>{fmtSimDay(sim.simNow)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Score simulado</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: sc }}>{sim.score}<span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}> /100</span></div>
          </div>
        </div>
        {lastLog && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: lastLog.delta >= 0 ? C.green : RED, lineHeight: 1.4 }}>
            {lastLog.delta >= 0 ? "▲" : "▼"} {lastLog.delta > 0 ? "+" : ""}{lastLog.delta} · {lastLog.reason}
          </div>
        )}
        {sim.interestAccrued > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: RED }}>
            🔥 Intereses acumulados: {fmt(sim.interestAccrued)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => { setAddError(null); setShowAdd(true); }} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, background: C.purple, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ＋ Gasto de práctica
          </button>
          <button disabled={!advance.ok} onClick={() => setSim(advanceWeek(sim))} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, background: advance.ok ? C.green : "#D4D0C8", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: advance.ok ? "pointer" : "default", fontFamily: "inherit" }}>
            ⏩ Avanzar 1 semana
          </button>
        </div>
        {!advance.ok && (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: C.orange, textAlign: "center" }}>{advance.reason}</div>
        )}
        <button onClick={() => setConfirmReset(true)} style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10, background: "transparent", border: "none", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
          Reiniciar simulador
        </button>
      </div>
    </>
  );

  return (
    <>
      <CardCycleScreen
        card={SIM_CARD}
        screenId="simulador"
        subScreen={subScreen}
        setSubScreen={setSubScreen}
        fmt={fmt}
        expenses={sim.expenses}
        cardPayments={sim.payments}
        now={sim.simNow}
        budgets={{}}
        topSlot={panel}
      />

      {/* Solo montar overlays cuando la sub-pantalla está visible */}
      {subScreen === "simulador" && (
        <>
          {/* Modal: gasto de práctica */}
          {showAdd && (
            <div style={{ position: "fixed", inset: 0, zIndex: 420 }} onClick={closeAdd}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
                <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
                <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: C.black, fontStyle: "italic", marginBottom: 4 }}>Gasto de práctica</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Se registra con fecha simulada: {fmtSimDay(sim.simNow)}</div>
                <input type="number" inputMode="decimal" value={addAmt} onChange={e => { setAddAmt(e.target.value); setAddError(null); }} placeholder="Monto (S/)" style={{ ...inputStyle, marginBottom: 10 }} />
                <input type="text" value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="Descripción (ej. zapatillas)" style={{ ...inputStyle, marginBottom: 12 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Categoría</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {(data.categories?.gastos || []).map(cat => {
                    const sel = addCat?.id === cat.id;
                    return (
                      <button key={cat.id} onClick={() => setAddCat(sel ? null : cat)} style={{ padding: "6px 11px", borderRadius: 20, border: sel ? `2px solid ${C.purple}` : "1.5px solid #D4D0C8", background: sel ? C.purpleSoft : "#FAFAF5", color: C.black, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        {cat.emoji} {cat.name}
                      </button>
                    );
                  })}
                </div>
                {addError && (
                  <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: "#FDEEE7", border: `1.5px solid ${C.orange}`, fontSize: 13, fontWeight: 700, color: "#9A3B12" }}>
                    {addError}
                  </div>
                )}
                <button onClick={saveAdd} style={{ width: "100%", padding: 15, borderRadius: 14, background: C.orange, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar</button>
              </div>
            </div>
          )}

          {/* Modal bloqueante: llegó la fecha de pago */}
          {decisionDue && pd && (
            <div style={{ position: "fixed", inset: 0, zIndex: 430 }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "24px 24px 40px", maxHeight: "88vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>📅</div>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 900, color: C.black, fontStyle: "italic", textAlign: "center" }}>Llegó la fecha de pago</div>
                <div style={{ fontSize: 15, color: C.black, textAlign: "center", marginTop: 6, marginBottom: 18 }}>
                  Debes <strong style={{ fontFamily: FONT_TITLE, fontSize: 18 }}>{fmt(pd.statementBalance)}</strong> · ¿Qué haces?
                </div>

                {[{
                  key: "total", title: `Pagar todo — ${fmt(pd.statementBalance)}`, color: C.green,
                  desc: "Cero intereses. Es la jugada que más sube tu score.",
                }, {
                  key: "minimo", title: `Pagar el mínimo — ${fmt(minPay)}`, color: C.orange,
                  desc: `Sigues al día, pero lo que no pagas genera ~${(MONTHLY_RATE * 100).toFixed(1)}% de interés al mes. La deuda se arrastra al siguiente ciclo.`,
                }, {
                  key: "nada", title: "No pagar nada", color: RED,
                  desc: "Atraso reportado a las centrales de riesgo: tu score cae fuerte y toda la deuda genera intereses.",
                }].map(opt => (
                  <button key={opt.key} onClick={() => choosePayment(opt.key)} style={{ display: "block", width: "100%", textAlign: "left", padding: "13px 15px", borderRadius: 14, border: `1.5px solid ${opt.color}55`, background: "#FAFAF5", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: opt.color, marginBottom: 3 }}>{opt.title}</div>
                    <div style={{ fontSize: 12.5, color: C.black, lineHeight: 1.45 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultado de la decisión */}
          {decisionResult && (
            <div style={{ position: "fixed", inset: 0, zIndex: 430 }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "24px 24px 40px", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>
                  {decisionResult.choice === "total" ? "🎉" : decisionResult.choice === "minimo" ? "😬" : "🚨"}
                </div>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 900, color: C.black, fontStyle: "italic", textAlign: "center", marginBottom: 14 }}>
                  {decisionResult.choice === "total" ? "Pagaste todo" : decisionResult.choice === "minimo" ? "Pagaste el mínimo" : "No pagaste"}
                </div>
                <div style={{ ...cardStyle, background: "#FAFAF5", padding: "14px 16px", marginBottom: 16 }}>
                  {decisionResult.paid > 0 && (
                    <div style={{ fontSize: 14, color: C.black, marginBottom: 6 }}>Pago registrado: <strong>{fmt(decisionResult.paid)}</strong></div>
                  )}
                  <div style={{ fontSize: 14, color: decisionResult.interest > 0 ? RED : C.green, marginBottom: 6 }}>
                    {decisionResult.interest > 0 ? <>🔥 Interés generado: <strong>{fmt(decisionResult.interest)}</strong> (se suma a tu deuda)</> : "✓ Cero intereses generados"}
                  </div>
                  <div style={{ fontSize: 14, color: decisionResult.scoreDelta >= 0 ? C.green : RED }}>
                    Score: {decisionResult.scoreDelta > 0 ? "+" : ""}{decisionResult.scoreDelta} → <strong style={{ fontFamily: FONT_TITLE }}>{sim.score}</strong>
                  </div>
                </div>
                <button onClick={() => setDecisionResult(null)} style={{ width: "100%", padding: 15, borderRadius: 14, background: C.purple, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Seguir practicando</button>
              </div>
            </div>
          )}

          {/* Confirmación de reinicio */}
          {confirmReset && (
            <div style={{ position: "fixed", inset: 0, zIndex: 440, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setConfirmReset(false)}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
              <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 20, padding: "22px 20px", width: "100%", maxWidth: 320 }}>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 900, color: C.black, marginBottom: 8 }}>¿Reiniciar el simulador?</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 16 }}>Se borra todo el progreso de práctica (gastos, score e intereses simulados). Tus datos reales no se tocan.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#FAFAF5", border: "1.5px solid #D4D0C8", color: C.black, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  <button onClick={() => { setSim(null); setDecisionResult(null); setConfirmReset(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: RED, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Reiniciar</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
