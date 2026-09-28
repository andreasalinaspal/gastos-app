import { C, FONT_TITLE, cardStyle, usageColor } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { getUpcomingTotal } from "../../lib/cycles";
import { getMonthData } from "../../state/selectors";
import { useStore } from "../../state/store";
import { fmtWith } from "../../lib/format";
import { nextPaymentSourceLabel } from "../shared/StatementSheet";
import { EquivalenteSoles } from "../shared/Equivalente";
import { tasaVigente } from "../../lib/fx";

const fmtLong = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "long" });

// Cuánto falta, en criollo. `plazoLabel` lleva el verbo ("vence en 6 días") para
// usarse solo; `faltanLabel` es la versión corta, para cuando la fecha ya se dijo.
export function faltanLabel(days) {
  if (days < -1) return `hace ${Math.abs(days)} días`;
  if (days === -1) return "ayer";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

export function plazoLabel(days) {
  if (days < 0) return "venció " + faltanLabel(days);
  return "vence " + faltanLabel(days);
}

// Una tarjeta dentro de la lista de un bloque de moneda.
function CardRow({ it, fmtC, onOpen, equivData }) {
  const accent = it.card.color || C.purple;
  const pend = it.status === "por-vencer";
  return (
    <div onClick={onOpen} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>💳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{it.card.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {pend ? <>vence el {fmtLong(it.dueDate)} · <strong style={{ color: it.days <= 3 ? C.orange : C.muted }}>{faltanLabel(it.days)}</strong></> : "Sin deuda por vencer"}
          </div>
          {pend && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{nextPaymentSourceLabel(it.source)}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {pend ? (
            <div style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 900, color: C.black, letterSpacing: -0.5 }}>{fmtC(it.amount)}</div>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Al día ✅</div>
          )}
        </div>
      </div>
      {/* Solo en el bloque de dólares: cuánto sería ese pago en soles. Va en su
          propia línea para no apretar el nombre de la tarjeta. Informativo — no
          entra en ningún total. */}
      {equivData && pend && (
        <EquivalenteSoles montoUSD={it.amount} card={it.card} data={equivData} style={{ textAlign: "right", marginTop: 6 }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(Math.round(it.pct), 100)}%`, background: usageColor(it.pct), borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: "nowrap" }}>Te queda {fmtC(it.available)} de línea</div>
      </div>
    </div>
  );
}

// Pantalla "Próximos pagos" (F6 + F10): cuánto hay que pagar, en soles y en
// dólares POR SEPARADO, y si el mes alcanza para cubrir los soles.
export function ProximosPagosScreen({ subScreen, setSubScreen, fmt }) {
  const data = useStore(s => s.data);
  const now = new Date();
  const upcoming = getUpcomingTotal(data.paymentMethods, data.expenses, data.cardPayments, now, data.cardStatements);
  const { total30, items } = upcoming.PEN;
  const usd = upcoming.USD;
  const fmtUsd = (n) => fmtWith(n, "USD");
  const { totalInc, totalFijosAll } = getMonthData(data, 0);
  const sobra = totalInc - totalFijosAll - total30;
  const alcanza = sobra >= 0;
  const proximo = items.find(i => i.status === "por-vencer") || items[0];
  // ¿Hay algún tipo de cambio que mostrar? Sin ninguno no se habla de él.
  const hayTasa = tasaVigente(null, data) !== null;

  return (
    <div style={subStyle(subScreen, "proximos-pagos")}>
      {subHeader("Próximos pagos", () => setSubScreen(null))}

      {items.length === 0 ? (
        <div style={{ padding: "0 16px" }}>
          <div style={{ ...cardStyle, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.black, fontFamily: FONT_TITLE, marginBottom: 6 }}>Todavía no hay tarjetas</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginBottom: 16 }}>
              Registra tu tarjeta de crédito y Qori te dirá, antes de que llegue el estado de cuenta, cuánto vas a tener que pagar el próximo mes.
            </div>
            <button onClick={() => setSubScreen("medios-pago")} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.purple, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar una tarjeta</button>
          </div>
        </div>
      ) : (
        <>
          {/* Total que vence en los próximos 30 días */}
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ background: C.black, borderRadius: 18, padding: "20px 22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.4, textTransform: "uppercase" }}>Vence en los próximos 30 días</div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 44, fontWeight: 900, color: "#fff", letterSpacing: -1.5, lineHeight: 1.1, marginTop: 4 }}>{fmt(total30)}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                {total30 > 0 && proximo
                  ? <>{items.filter(i => i.status === "por-vencer").length === 1 ? "Un estado de cuenta" : `${items.filter(i => i.status === "por-vencer").length} estados de cuenta`} · el más cercano {plazoLabel(proximo.days)}</>
                  : "Ninguna tarjeta tiene deuda por pagar 🎉"}
              </div>
            </div>
          </div>

          {/* ¿Me alcanza? La resta completa del mes */}
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>¿Te alcanza este mes?</div>
              {[
                { label: "Ingresos del mes", value: totalInc, color: C.green, sign: "" },
                { label: "Gastos fijos", value: totalFijosAll, color: C.black, sign: "−" },
                { label: "Tarjetas por pagar", value: total30, color: C.black, sign: "−" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontSize: 14, color: C.muted }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{row.sign}{fmt(row.value)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "#EDE9E0", margin: "10px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.black }}>{alcanza ? "Te quedarían" : "Te faltarían"}</span>
                <span style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 900, color: alcanza ? C.green : C.orange, letterSpacing: -0.5 }}>{fmt(Math.abs(sobra))}</span>
              </div>
              <div style={{ fontSize: 13, color: alcanza ? C.muted : C.orange, lineHeight: 1.5, marginTop: 8, fontWeight: alcanza ? 400 : 600 }}>
                {alcanza
                  ? "Te alcanza para cubrir tus fijos y tus tarjetas este mes."
                  : `Te faltarían ${fmt(Math.abs(sobra))} para cubrir todo este mes. Baja lo que puedas de tus gastos con tarjeta o suma un ingreso extra antes del vencimiento.`}
              </div>
              {usd.total30 > 0 && (
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: "1px solid #EDE9E0" }}>
                  Esta cuenta es solo de soles. Tus <strong style={{ color: C.black }}>{fmtUsd(usd.total30)}</strong> en dólares se pagan aparte y no están incluidos acá.
                </div>
              )}
            </div>
          </div>

          {/* Detalle por tarjeta en soles, la más cercana a vencer primero */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "0 20px 8px" }}>
            Tarjeta por tarjeta{usd.items.length > 0 ? " · soles" : ""}
          </div>
          <div style={{ padding: "0 16px" }}>
            {items.map(it => (
              <CardRow key={it.card.id} it={it} fmtC={fmt} onOpen={() => setSubScreen("card-" + it.card.id)} />
            ))}
          </div>

          {/* Bloque de DÓLARES: aparte, con su propio total. No entra en la cuenta
              de arriba porque se paga por separado y en dólares. */}
          {usd.items.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 8px" }}>Tus dólares, aparte</div>
              <div style={{ padding: "0 16px 14px" }}>
                <div style={{ background: C.green, borderRadius: 18, padding: "18px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 1.4, textTransform: "uppercase" }}>Vence en los próximos 30 días</div>
                  <div style={{ fontFamily: FONT_TITLE, fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: -1.2, lineHeight: 1.1, marginTop: 4 }}>{fmtUsd(usd.total30)}</div>
                  {/* Equivalente del total en dólares: solo para tenerlo. Sigue
                      sin entrar en la cuenta de soles de arriba. */}
                  <EquivalenteSoles
                    montoUSD={usd.total30} card={null} data={data}
                    style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 6 }}
                  />
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 1.5 }}>
                    Esta deuda se paga aparte, en dólares. <strong>No está incluida</strong> en la cuenta de arriba.
                    {hayTasa
                      ? " El equivalente en soles es referencial: tu banco aplica su propio tipo de cambio a las compras con tarjeta."
                      : " Qori no convierte monedas ni se inventa un tipo de cambio."}
                  </div>
                </div>
              </div>
              <div style={{ padding: "0 16px" }}>
                {usd.items.map(it => (
                  <CardRow key={it.card.id} it={it} fmtC={fmtUsd} equivData={data} onOpen={() => setSubScreen("card-" + it.card.id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
      <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />
    </div>
  );
}
