import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle, usageColor, alTope } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { fmtWith } from "../../lib/format";
import { useStore } from "../../state/store";
import { getMonthData } from "../../state/selectors";
import { getSharedUsage } from "../../lib/cycles";
import { tasaVigente } from "../../lib/fx";
import { cuantoAbonar, prioridadDeAbono, tramoDelMes } from "../../lib/abonos";

// F48: cuánto puede abonar a sus tarjetas sin quedarse corta.
//
// Ella no pregunta cuánto debe —eso ya lo sabe y le pesa—. Pregunta cuánto se
// puede dar el lujo de abonar. El dato que siempre falta es el mismo: cuánto le
// queda por gastar del mes que todavía no gastó.

const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase" };

function Linea({ texto, monto, fmt, resta, fuerte }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "7px 0" }}>
      <div style={{ fontSize: 13.5, color: fuerte ? C.black : C.muted, fontWeight: fuerte ? 700 : 500 }}>{texto}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: fuerte ? C.black : C.muted, whiteSpace: "nowrap" }}>
        {resta ? "− " : ""}{fmt(monto)}
      </div>
    </div>
  );
}

export function AbonosScreen({ subScreen, setSubScreen, fmt }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [editaColchon, setEditaColchon] = useState(false);
  const colchon = Number(data.colchonAbono) || 0;

  const hoy = new Date();
  const d = getMonthData(data, 0, hoy);
  const tramo = tramoDelMes(hoy);

  // `totalDiarios` ya incluye los pagos de tarjeta (F33). Para el ritmo de gasto
  // hay que sacarlos: son montos grandes y esporádicos, y meterlos inflaría el
  // promedio hasta decirle que no le alcanza para nada.
  const gastoDiario = Math.max(0, Math.round((d.totalDiarios - d.totalPagosTC) * 100) / 100);

  const r = cuantoAbonar({
    ingresos: d.totalInc,
    fijosPagados: d.totalFijos,
    fijosTotales: d.totalFijosAll,
    gastoDiario,
    abonosHechos: d.totalPagosTC,
    colchon,
  }, hoy);

  const tarjetas = (data.paymentMethods || []).filter(m => m && m.type === "credito" && !m.archived);
  const usos = tarjetas.map(card => {
    const vig = tasaVigente(card, data);
    const u = getSharedUsage(card, data.expenses, data.cardPayments, vig && vig.tasa);
    return { card, pct: u.pct, balance: u.usado, available: u.available };
  });
  const orden = prioridadDeAbono(usos);
  const hayTasas = orden.length > 0 && orden.every(u => Number(u.card.tcea) > 0);

  return (
    <div style={subStyle(subScreen, "abonos")}>
      {subHeader("¿Cuánto abonar?", () => setSubScreen(null))}
      <div style={{ padding: "0 20px 40px" }}>

        <div style={{ background: r.alcanza ? "linear-gradient(135deg, #1B6B3A 0%, #2D9F5B 100%)" : C.orange, borderRadius: 20, padding: "24px 20px", marginBottom: 16 }}>
          <div style={{ ...lbl, color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
            {r.alcanza ? "Puedes abonar este mes" : "Este mes no te alcanza"}
          </div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(26px, 10vw, 46px)", fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
            {fmt(Math.abs(r.disponible))}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 8, lineHeight: 1.5 }}>
            {r.alcanza
              ? <>Después de tus fijos y de lo que te queda por gastar en los {tramo.faltan} días que faltan del mes.</>
              : <>Te faltan {fmt(Math.abs(r.disponible))} para cubrir tus fijos y tu ritmo de gasto. Paga al menos el mínimo de cada tarjeta y no sumes consumos nuevos.</>}
          </div>
        </div>

        {/* La resta completa, para que el número grande no sea un acto de fe. */}
        <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ ...lbl, marginBottom: 6 }}>De dónde sale</div>
          <Linea texto="Ingresos del mes" monto={d.totalInc} fmt={fmt} fuerte />
          <Linea texto="Ya salió (fijos pagados, gastos y abonos)" monto={r.yaSalio} fmt={fmt} resta />
          <Linea texto="Fijos que faltan pagar" monto={r.fijosPorPagar} fmt={fmt} resta />
          <Linea texto={`Lo que te queda por gastar (${tramo.faltan} días a tu ritmo)`} monto={r.estimadoResto} fmt={fmt} resta />
          {colchon > 0 && <Linea texto="Tu colchón" monto={colchon} fmt={fmt} resta />}
          <div style={{ borderTop: "1px solid #EDE9E0", marginTop: 6, paddingTop: 2 }}>
            <Linea texto="Te queda para abonar" monto={r.disponible} fmt={fmt} fuerte />
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginTop: 8 }}>
            Lo que te queda por gastar sale de tu propio ritmo: llevas {fmt(gastoDiario)} en {tramo.van} días.
          </div>
        </div>

        {/* El colchón: lo que quiere dejarse aparte por si acaso. */}
        <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
          {editaColchon ? (
            <>
              <div style={{ ...lbl, marginBottom: 6 }}>Cuánto quieres dejarte aparte</div>
              <input type="number" inputMode="decimal" autoFocus defaultValue={colchon || ""}
                onBlur={e => { setData(p => ({ ...p, colchonAbono: Number(e.target.value) || 0 })); setEditaColchon(false); }}
                placeholder="0" style={{ ...inputStyle, color: C.black }} />
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginTop: 6 }}>
                Por si sale algo que no estaba en los planes. Toca fuera para guardar.
              </div>
            </>
          ) : (
            <div onClick={() => setEditaColchon(true)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.black }}>Tu colchón</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  {colchon > 0 ? "Lo estás dejando fuera de la cuenta" : "Toca para apartar algo por si acaso"}
                </div>
              </div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 900, color: colchon > 0 ? C.black : C.muted }}>{fmt(colchon)}</div>
            </div>
          )}
        </div>

        {orden.length > 0 && (
          <>
            <div style={{ ...lbl, margin: "4px 0 10px" }}>A cuál abonar primero</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
              Todo a una sola. Repartirlo de a poquito entre varias hace que ninguna baje de verdad.
            </div>
            {orden.map(u => (
              <div key={u.card.id} onClick={() => setSubScreen("card-" + u.card.id)}
                style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer", border: u.prioridad === 1 ? `1.5px solid ${C.purple}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: u.prioridad === 1 ? C.purple : "#E0DCD4", color: u.prioridad === 1 ? "#fff" : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{u.prioridad}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: C.black }}>{u.card.name}</div>
                    <div style={{ fontSize: 12, color: alTope(u.pct) ? C.red : C.muted, fontWeight: alTope(u.pct) ? 700 : 600, marginTop: 1 }}>{u.motivo}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 900, color: C.black }}>{fmt(u.balance)}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>debes</div>
                  </div>
                </div>
                <div style={{ height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden", marginTop: 9 }}>
                  <div style={{ height: "100%", width: `${Math.min(Math.round(u.pct), 100)}%`, background: usageColor(u.pct), borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Lo que no se puede callar: el mínimo es el piso, no el plan. */}
        <div style={{ background: "#FFF4EE", border: `1.5px solid ${C.orange}`, borderRadius: 16, padding: "14px 16px", marginTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.black, marginBottom: 6 }}>Antes de decidir</div>
          <div style={{ fontSize: 13, color: C.black, lineHeight: 1.55 }}>
            <strong>Paga siempre al menos el mínimo de cada tarjeta</strong>, antes de la fecha. No por la
            deuda: por la mora y el reporte a la central de riesgo, que te sale más caro después.
            <div style={{ marginTop: 8 }}>
              Pero el mínimo <strong>no es un plan</strong>: cubre los intereses y una tajada chica del
              capital. Pagando solo el mínimo, una deuda tarda años y termina costando casi el doble.
            </div>
            {!hayTasas && (
              <div style={{ marginTop: 8 }}>
                Mientras no sepa las tasas de tus tarjetas, el orden de arriba va por saturación.
                Pon la <strong>TCEA</strong> de cada una al editarla y el orden se recalcula por tasa,
                que es lo que de verdad manda.
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              Y lo más importante: <strong>deja de usar la que estás bajando.</strong> Si abonas y
              consumes lo mismo, no avanzaste — solo moviste la plata.
            </div>
          </div>
        </div>

        {d.totalPagosTCUSD > 0 || usos.some(u => u.card && u.card.lines && u.card.lines.USD && u.card.lines.USD.openingBalance > 0) ? (
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 14 }}>
            Esta cuenta es en soles. Si tienes deuda en dólares, esa se paga aparte y en dólares —
            la ves en el detalle de cada tarjeta.
          </div>
        ) : null}
      </div>
    </div>
  );
}
