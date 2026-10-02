import { C, FONT_TITLE, cardStyle } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { fmtWith } from "../../lib/format";
import { useStore } from "../../state/store";
import { detectaSuscripciones } from "../../lib/suscripciones";

// F43: las suscripciones que Qori encuentra sola en sus gastos.
//
// Ella lo pidió porque se le olvidan. No hay nada que registrar acá a mano: todo
// sale de los cargos que ya entraron por los avisos del banco. Por eso la
// pantalla no tiene botón de "agregar" — si no aparece, es que todavía no hay
// suficientes cobros para afirmarlo, y eso se dice en vez de mostrar un vacío.

const fmtDia = (iso) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

function enCuantoLabel(dias) {
  if (dias === null || dias === undefined) return null;
  if (dias < 0) return "debió cobrarse hace " + Math.abs(dias) + (Math.abs(dias) === 1 ? " día" : " días");
  if (dias === 0) return "te cobran hoy";
  if (dias === 1) return "te cobran mañana";
  return "te cobran en " + dias + " días";
}

function Fila({ s, fmt }) {
  const fmtC = (n) => (s.currency === "USD" ? fmtWith(n, "USD") : fmt(n));
  const cuando = enCuantoLabel(s.diasParaProximo);
  return (
    <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, opacity: s.inactiva ? 0.72 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.black, overflow: "hidden", textOverflow: "ellipsis" }}>{s.comercio}</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>
            {s.cadenciaNombre} · {s.veces} cobros · último {fmtDia(s.ultimoCobro)}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 900, color: C.black, letterSpacing: -0.4 }}>{fmtC(s.monto)}</div>
          {cuando && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 1 }}>{cuando}</div>}
        </div>
      </div>
      {/* El aviso que nadie nota: te subieron el precio y seguiste pagando. */}
      {s.subioDePrecio && (
        <div style={{ marginTop: 10, background: "#FDF1EA", borderLeft: `3px solid ${C.orange}`, borderRadius: 8, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.45, color: C.black, fontWeight: 500 }}>
          <span style={{ marginRight: 5 }}>📈</span>
          Subió de <strong>{fmtC(s.subioDePrecio.antes)}</strong> a <strong>{fmtC(s.subioDePrecio.ahora)}</strong>.
          Son {fmtC(Math.round((s.subioDePrecio.ahora - s.subioDePrecio.antes) * 12 * 100) / 100)} más al año.
        </div>
      )}
      {s.inactiva && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>
          Dejó de cobrarte. Si la cancelaste, perfecto; si no, puede que la tarjeta haya rebotado el cargo.
        </div>
      )}
    </div>
  );
}

export function SuscripcionesScreen({ subScreen, setSubScreen, fmt }) {
  const data = useStore(s => s.data);
  const r = detectaSuscripciones(data.expenses);
  const hayAlgo = r.activas.length > 0 || r.inactivas.length > 0;
  const subieron = r.activas.filter(s => s.subioDePrecio);

  return (
    <div style={subStyle(subScreen, "suscripciones")}>
      {subHeader("Suscripciones", () => setSubScreen(null))}
      <div style={{ padding: "0 20px 40px" }}>
        {r.activas.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #1B6B3A 0%, #2D9F5B 100%)", borderRadius: 20, padding: "22px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Te cuestan al mes</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(26px, 9vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: -1 }}>{fmt(r.totalMensual)}</div>
            {r.totalMensualUSD > 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginTop: 2 }}>+ {fmtWith(r.totalMensualUSD, "USD")} en dólares</div>
            )}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 8, lineHeight: 1.45 }}>
              Son {fmt(Math.round(r.totalMensual * 12 * 100) / 100)} al año. Las anuales están repartidas entre 12 meses.
            </div>
          </div>
        )}

        {subieron.length > 0 && (
          <div style={{ background: "#FDF1EA", borderRadius: 14, padding: "12px 14px", marginBottom: 16, fontSize: 13, lineHeight: 1.5, color: C.black }}>
            <strong>{subieron.length === 1 ? "Una subió de precio" : `${subieron.length} subieron de precio`}</strong> sin que te avisaran. Mira cuáles abajo.
          </div>
        )}

        {!hayAlgo && (
          <div style={{ ...cardStyle, padding: "20px 18px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 8 }}>Todavía no encuentro ninguna</div>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55 }}>
              Qori las busca sola en tus gastos: cuando un mismo comercio te cobra un monto
              parecido cada mes, la reconoce y aparece acá. No tienes que anotar nada.
              <div style={{ marginTop: 8 }}>
                Hacen falta <strong>al menos dos cobros</strong> del mismo sitio para afirmarlo,
                así que esto se llena solo conforme vayan entrando tus compras.
              </div>
            </div>
          </div>
        )}

        {r.activas.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", margin: "4px 0 10px" }}>Activas</div>
            {r.activas.map(s => <Fila key={s.id} s={s} fmt={fmt} />)}
          </>
        )}

        {r.inactivas.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", margin: "18px 0 10px" }}>Dejaron de cobrarte</div>
            {r.inactivas.map(s => <Fila key={s.id} s={s} fmt={fmt} />)}
          </>
        )}

        {hayAlgo && (
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 14 }}>
            Esto sale de tus gastos registrados, así que mientras más historial tengas, mejor
            acierta. Si ves algo que no es una suscripción, es que ese comercio te cobró
            parecido varias veces seguidas.
          </div>
        )}
      </div>
    </div>
  );
}
