import { useState } from "react";
import { C, FONT_TITLE, cardStyle } from "../../theme";
import { subStyle } from "../shared/subnav";
import { getCycleFor, getLineUsage } from "../../lib/cycles";
import { buildCatMap } from "../../state/selectors";
import { useStore } from "../../state/store";

const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });

// Pantalla de ciclo de facturación de una TC (P2): el ciclo como unidad de tiempo.
// Solo lectura — no muta expenses ni cardPayments; MiMes no se ve afectado.
// Fuente de datos inyectable (F3): expenses/cardPayments/now/budgets llegan por props
// para reusar la pantalla en el simulador; sin props se comporta igual que siempre
// (lee del store y usa la fecha real). `screenId` y `topSlot` permiten montarla como
// otra sub-pantalla con un banner/panel extra arriba.
export function CardCycleScreen({ card, subScreen, setSubScreen, fmt, expenses, cardPayments, now, budgets, screenId, topSlot }) {
  const data = useStore(s => s.data);
  const [showRule30, setShowRule30] = useState(false);

  const allExps = expenses ?? data.expenses ?? [];
  const allPayments = cardPayments ?? data.cardPayments ?? [];
  const catBudgets = budgets ?? data.budgets;
  const cycle = getCycleFor(card, now ? new Date(now) : new Date());
  const accent = card.color || C.purple;

  // Gastos de la tarjeta dentro del ciclo actual
  const cycleExps = allExps.filter(e => {
    if (!e || e.paymentMethodId !== card.id || !e.date) return false;
    const d = new Date(e.date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return day >= cycle.start && day <= cycle.end;
  });
  const cycleSpend = cycleExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const cyclePct = Math.round((cycle.dayOfCycle / cycle.totalDays) * 100); // B: % del ciclo transcurrido
  const daysLeft = cycle.totalDays - cycle.dayOfCycle;

  // Presupuesto del ciclo (opcional en la tarjeta)
  const budget = Number(card.cycleBudget) || 0;
  const budgetPct = budget > 0 ? Math.round((cycleSpend / budget) * 100) : 0; // A: % del presupuesto usado
  const onPace = budgetPct <= cyclePct + 5;

  // Desglose por categoría dentro del ciclo
  const catMap = buildCatMap(cycleExps);
  const maxCat = catMap[0]?.amount || 1;

  // Alertas proyectivas: categorías con presupuesto mensual cuyo ritmo proyecta sobrepaso antes del corte
  const cycleCatSpend = {};
  cycleExps.forEach(e => { if (e.category?.id) cycleCatSpend[e.category.id] = (cycleCatSpend[e.category.id] || 0) + (Number(e.amount) || 0); });
  const projAlerts = (data.categories?.gastos || [])
    .filter(cat => catBudgets?.[cat.id] > 0 && cycleCatSpend[cat.id] > 0)
    .map(cat => {
      const limit = catBudgets[cat.id];
      const spent = cycleCatSpend[cat.id];
      const projected = (spent / cycle.dayOfCycle) * cycle.totalDays;
      return { cat, limit, spent, projected, ratio: projected / limit, pct: Math.round((spent / limit) * 100) };
    })
    .filter(a => a.projected > a.limit)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2);

  // Uso de línea (footer educativo)
  const { pct: linePct } = getLineUsage(card, allExps, allPayments);
  const linePctRound = Math.round(linePct);
  const lineColor = linePct < 30 ? C.green : linePct <= 60 ? C.orange : "#C0392B";
  const lineZone = linePct < 30 ? "zona saludable (<30%)" : linePct <= 60 ? "zona media (30–60%)" : "zona de riesgo (>60%)";

  return (
    <div style={subStyle(subScreen, screenId || "card-" + card.id)}>
      {/* Header: nombre de tarjeta + rango del ciclo actual */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 12px", position: "sticky", top: 0, background: C.beige, zIndex: 10 }}>
        <button onClick={() => { setSubScreen(null); setShowRule30(false); }} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", fontSize: 22, color: C.black, flexShrink: 0 }}>‹</button>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.black, fontStyle: "italic", fontFamily: FONT_TITLE, lineHeight: 1.1 }}>{card.name}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginTop: 2 }}>{fmtDay(cycle.start)} – {fmtDay(cycle.end)}</div>
        </div>
      </div>

      {/* Slot extra (F3): banner/panel del simulador; null para tarjetas reales */}
      {topSlot}

      {/* Barra de progreso del ciclo */}
      <div style={{ ...cardStyle, margin: "8px 16px 12px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.black }}>Día <span style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 900 }}>{cycle.dayOfCycle}</span> de {cycle.totalDays}</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{cyclePct}% del ciclo</div>
        </div>
        <div style={{ height: 8, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(cyclePct, 100)}%`, background: accent, borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Corte: {fmtDay(cycle.end)} · Pago: {fmtDay(cycle.paymentDate)}</div>
      </div>

      {/* Gasto acumulado del ciclo vs presupuesto del ciclo */}
      <div style={{ background: accent, borderRadius: 16, margin: "0 16px 12px", padding: "18px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Gasto del ciclo</div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
          {fmt(cycleSpend)}{budget > 0 && <span style={{ fontSize: 17, fontWeight: 600, opacity: 0.65 }}> / {fmt(budget)}</span>}
        </div>
        {budget > 0 ? (
          <>
            <div style={{ height: 7, background: "rgba(255,255,255,0.25)", borderRadius: 99, overflow: "hidden", marginTop: 10 }}>
              <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: "#fff", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
            {/* Línea de ritmo */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "rgba(255,255,255,0.92)", borderRadius: 20, padding: "5px 12px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: onPace ? C.green : C.orange }}>
                {onPace ? "✓" : "⚠"} Vas al {budgetPct}% del presupuesto con el {cyclePct}% del ciclo
              </span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 1.5 }}>Define un presupuesto por ciclo en Config → Medios de pago</div>
        )}
      </div>

      {/* Alertas proyectivas */}
      {projAlerts.map(a => (
        <div key={a.cat.id} style={{ background: "#FDEDE0", border: "1.5px solid " + C.orange + "55", borderRadius: 14, margin: "0 16px 10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20 }}>{a.cat.emoji}</div>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#9A3B12", lineHeight: 1.4 }}>
            {a.cat.name} al {a.pct}% de su presupuesto y quedan {daysLeft} día{daysLeft !== 1 ? "s" : ""} de ciclo
          </div>
        </div>
      ))}

      {/* Desglose por categoría dentro del ciclo */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 20px 8px" }}>Gastos del ciclo por categoría</div>
      <div style={{ padding: "0 16px", flex: 1 }}>
        {catMap.length === 0 && (
          <div style={{ ...cardStyle, textAlign: "center", color: C.muted, fontSize: 13, padding: 24 }}>Aún no hay gastos con esta tarjeta en el ciclo actual</div>
        )}
        {catMap.map((cat, i) => {
          const pct = Math.round((cat.amount / maxCat) * 100);
          return (
            <div key={cat.name} style={{ ...cardStyle, padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.black }}>{cat.name}</div>
                <div style={{ fontFamily: FONT_TITLE, fontSize: 15, fontWeight: 900, color: C.black }}>{fmt(cat.amount)}</div>
              </div>
              <div style={{ height: 6, background: "#F0EDE4", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? accent : C.orange, borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: uso de línea → abre sheet educativo de la regla del 30% */}
      <div onClick={() => setShowRule30(true)} style={{ ...cardStyle, margin: "10px 16px", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: lineColor, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.black }}>
          Uso de tu línea: <span style={{ fontFamily: FONT_TITLE, fontWeight: 900, color: lineColor }}>{linePctRound}%</span> <span style={{ color: C.muted, fontWeight: 500 }}>· {lineZone}</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>¿Por qué? ›</div>
      </div>
      <div style={{ height: "calc(30px + env(safe-area-inset-bottom, 20px))" }} />

      {/* Sheet educativo: la regla del 30% */}
      {showRule30 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 410 }} onClick={() => setShowRule30(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 900, color: C.black, fontStyle: "italic", marginBottom: 14 }}>La regla del 30%</div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, marginBottom: 12 }}>
              Usar tu tarjeta está bien, pero cuánto usas de tu línea importa. Si tu línea es de {fmt(card.creditLine)} y debes {fmt(Math.round((card.creditLine || 0) / 2))}, estás usando el 50% — aunque pagues todo puntual.
            </div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, marginBottom: 12 }}>
              Los bancos y las centrales de riesgo revisan ese porcentaje cada mes. Andar siempre cerca del tope da la señal de que dependes de la tarjeta para llegar a fin de mes, y eso baja tu score crediticio aunque nunca te atrases.
            </div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, marginBottom: 12 }}>
              La zona saludable es usar menos del 30% de tu línea. Ahí demuestras que la tarjeta es una herramienta que controlas, no un salvavidas. Con el tiempo eso te abre puertas: mejores tasas, más línea, créditos más baratos.
            </div>
            <div style={{ fontSize: 14, color: C.black, lineHeight: 1.65, marginBottom: 20 }}>
              ¿Un mes te pasaste? No es grave: amortiza antes de la fecha de corte para que el banco reporte un saldo más bajo. Pagos chicos durante el mes también ayudan un montón.
            </div>
            <button onClick={() => setShowRule30(false)} style={{ width: "100%", padding: 15, borderRadius: 14, background: accent, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
