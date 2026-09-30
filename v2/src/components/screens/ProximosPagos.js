import { C, FONT_TITLE, cardStyle, usageColor } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { getUpcomingTotal } from "../../lib/cycles";
import { getMonthData } from "../../state/selectors";
import { useStore } from "../../state/store";
import { fmtWith } from "../../lib/format";
import { nextPaymentSourceLabel } from "../shared/StatementSheet";
import { EquivalenteSoles } from "../shared/Equivalente";
import { tasaVigente } from "../../lib/fx";
import { chequeoDeIngresos } from "../../lib/ingresos";
import { getCurrentMonthLabel } from "../../lib/dates";

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

// ── F14: ¿le llega la plata antes del vencimiento? ───────────────────────────
// No basta con que el mes cuadre: si la tarjeta vence ANTES de que le entre el
// sueldo, el problema es de fecha, no de monto. Tono útil, nunca alarmista.
const enMinuscula = (s) => { const t = String(s || "").trim(); return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; };

export function textoAviso(aviso, fmt) {
  const dia = aviso.dueDate.getDate();
  // Solo se nombra el próximo ingreso cuando cae en OTRO día del mes: si entra
  // justo el día del vencimiento, decir "vence el 15 pero entra el 15" confunde.
  if (aviso.siguiente && aviso.siguiente.day !== dia) {
    const recibido = aviso.recibido > 0
      ? `solo habrás recibido ${fmt(aviso.recibido)}`
      : "todavía no habrás recibido ningún ingreso fijo";
    return `Tu ${aviso.cardName} vence el ${dia} pero tu ${enMinuscula(aviso.siguiente.name)} entra el ${aviso.siguiente.day}. Para esa fecha ${recibido}.`;
  }
  return `Tu ${aviso.cardName} vence el ${dia} y para esa fecha habrás recibido ${fmt(aviso.recibido)} de los ${fmt(aviso.acumulado)} que vencen hasta ahí: te faltarían ${fmt(aviso.faltan)}.`;
}

export function textoResumen(chequeo) {
  const n = chequeo.enRiesgo;
  if (n === 0) return null;
  const cuantos = n === 1 ? "Un pago vence" : `${n} pagos vencen`;
  const principal = chequeo.principal;
  return principal
    ? `${cuantos} antes de que entre tu ${enMinuscula(principal.name)}.`
    : `${cuantos} antes de que te entre la plata del mes.`;
}

function AvisoIngreso({ texto }) {
  return (
    <div style={{ marginTop: 10, background: "#FDF1EA", borderLeft: `3px solid ${C.orange}`, borderRadius: 8, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.45, color: C.black, fontWeight: 500 }}>
      <span style={{ marginRight: 5 }}>⏱</span>{texto}
    </div>
  );
}

// Una tarjeta dentro de la lista de un bloque de moneda.
function CardRow({ it, fmtC, onOpen, equivData, aviso }) {
  const accent = it.card.color || C.purple;
  const pend = it.status === "por-vencer";
  // F23: hay deuda viva pero falta el estado de cuenta para saber cuánto vence.
  const sinDato = it.status === "sin-dato";
  return (
    <div onClick={onOpen} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>💳</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{it.card.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {pend
              ? <>vence el {fmtLong(it.dueDate)} · <strong style={{ color: it.days <= 3 ? C.orange : C.muted }}>{faltanLabel(it.days)}</strong></>
              : sinDato
                ? <>vence el {fmtLong(it.dueDate)} · no sé cuánto todavía</>
                : "Sin deuda por vencer"}
          </div>
          {(pend || sinDato) && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{nextPaymentSourceLabel(it.source)}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {pend ? (
            <div style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 900, color: C.black, letterSpacing: -0.5 }}>{fmtC(it.amount)}</div>
          ) : sinDato ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, whiteSpace: "nowrap" }}>Falta el dato</div>
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
      {aviso && <AvisoIngreso texto={aviso} />}
    </div>
  );
}

// Pantalla "Próximos pagos" (F6 + F10): cuánto hay que pagar, en soles y en
// dólares POR SEPARADO, y si el mes alcanza para cubrir los soles.
export function ProximosPagosScreen({ subScreen, setSubScreen, fmt, traerFijosDe, onTraerFijos, irAIngresos }) {
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
  // F23: tarjetas con deuda viva cuyo monto a pagar todavía no se sabe.
  const sinDato = items.filter(i => i.status === "sin-dato");
  // F14: el cruce entre el día en que entra su plata y el día en que vence cada
  // tarjeta. Solo soles, igual que la cuenta de "¿te alcanza?".
  const ingresosDelMes = (data.incomeFixed || []).filter(i => i.month === getCurrentMonthLabel());
  const chequeo = chequeoDeIngresos(ingresosDelMes, items, now);
  // F15: sin ingresos fijos del mes, la resta de arriba da un número que parece
  // una respuesta y no lo es (restar contra CERO siempre "no alcanza"). Mejor
  // decírselo y darle cómo arreglarlo que mostrarle un resultado inventado.
  const sinIngresos = ingresosDelMes.length === 0;
  const avisoDe = (cardId) => {
    const a = chequeo.avisos.find(x => x.cardId === cardId && !x.alcanza);
    return a ? textoAviso(a, fmt) : null;
  };
  const resumen = textoResumen(chequeo);
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
                  : sinDato.length > 0
                    ? "Todavía no sé cuánto vence"
                    : "Ninguna tarjeta tiene deuda por pagar 🎉"}
              </div>
              {/* F23: si falta el estado de cuenta de alguna tarjeta, este total
                  se queda corto. Decirlo, o la prueba de "¿me alcanza?" miente. */}
              {sinDato.length > 0 && (
                <div style={{ fontSize: 12.5, color: "#FFD9B8", marginTop: 8, lineHeight: 1.45 }}>
                  Este total no incluye {sinDato.length === 1 ? sinDato[0].card.name : sinDato.length + " tarjetas"}: tienen deuda pero todavía no registraste su estado de cuenta.
                </div>
              )}
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
              {sinIngresos ? (
                /* F15: en vez del número, la verdad y un botón para arreglarlo. */
                <div style={{ background: "#F5F2EC", borderRadius: 12, padding: "13px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.black, lineHeight: 1.45 }}>
                    No tienes ingresos registrados este mes, así que no puedo decirte si te alcanza.
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>
                    {totalInc > 0
                      ? "Tienes ingresos extra, pero tus ingresos fijos del mes están vacíos: la resta todavía no cuadra."
                      : "Tus ingresos fijos se guardan mes a mes y este todavía está vacío."}
                  </div>
                  <button
                    onClick={traerFijosDe && onTraerFijos ? onTraerFijos : irAIngresos}
                    style={{ width: "100%", marginTop: 11, padding: 12, borderRadius: 11, background: C.purple, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {traerFijosDe && onTraerFijos ? `Traer mis fijos de ${traerFijosDe}` : "Registrar mis ingresos"}
                  </button>
                </div>
              ) : (
              <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.black }}>{alcanza ? "Te quedarían" : "Te faltarían"}</span>
                <span style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 900, color: alcanza ? C.green : C.orange, letterSpacing: -0.5 }}>{fmt(Math.abs(sobra))}</span>
              </div>
              <div style={{ fontSize: 13, color: alcanza ? C.muted : C.orange, lineHeight: 1.5, marginTop: 8, fontWeight: alcanza ? 400 : 600 }}>
                {alcanza
                  ? "Te alcanza para cubrir tus fijos y tus tarjetas este mes."
                  : `Te faltarían ${fmt(Math.abs(sobra))} para cubrir todo este mes. Baja lo que puedas de tus gastos con tarjeta o suma un ingreso extra antes del vencimiento.`}
              </div>
              </>
              )}
              {usd.total30 > 0 && (
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: "1px solid #EDE9E0" }}>
                  Esta cuenta es solo de soles. Tus <strong style={{ color: C.black }}>{fmtUsd(usd.total30)}</strong> en dólares se pagan aparte y no están incluidos acá.
                </div>
              )}
            </div>
          </div>

          {/* F14: el resumen del cruce fecha de ingreso ↔ fecha de vencimiento.
              Si todavía no le puso día a ningún ingreso no se inventa nada: se
              le cuenta, una sola vez, para qué sirve ponerlo. */}
          {resumen && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ ...cardStyle, padding: "14px 16px", borderLeft: `4px solid ${C.orange}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.black, lineHeight: 1.4 }}>⏱ {resumen}</div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 5 }}>
                  No es que no te alcance: es que la plata te entra después. Abajo te marco cuáles.
                </div>
              </div>
            </div>
          )}
          {!chequeo.hayDias && items.some(i => i.status === "por-vencer") && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, padding: "0 2px" }}>
                📅 Ponle fecha a tus ingresos fijos en la pantalla <strong style={{ color: C.black }}>Ingresos</strong> y Qori te avisa si un pago vence antes de que te entre la plata.
              </div>
            </div>
          )}

          {/* Detalle por tarjeta en soles, la más cercana a vencer primero */}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "0 20px 8px" }}>
            Tarjeta por tarjeta{usd.items.length > 0 ? " · soles" : ""}
          </div>
          <div style={{ padding: "0 16px" }}>
            {items.map(it => (
              <CardRow key={it.card.id} it={it} fmtC={fmt} aviso={avisoDe(it.card.id)} onOpen={() => setSubScreen("card-" + it.card.id)} />
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
