import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { PlusIcon, TrashIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId, fmtWith } from "../../lib/format";
import { toDateInput, parseDateInput } from "../../lib/dates";
import { useStore } from "../../state/store";
import { useKeyboardInset, sheetStyle } from "../../lib/useKeyboardInset";
import {
  curOfDeuda, pagado, saldo, estaSaldada, progreso,
  tieneCuotas, montoDeCuota, proximaCuota, cuotasPagadas,
  resumenDeudas, ordenaDeudas,
} from "../../lib/deudas";

// F25: deudas por cobrar — la plata que a ELLA le deben.
//
// Lo pidió para llevarles la trazabilidad: cuánto le deben, qué le han ido
// pagando, y cuando hay cuotas, cuál vence y cuántas faltan.

const fmtDia = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const hintStyle = { fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 };

const vacio = { name: "", amount: "", currency: "PEN", conCuotas: false, n: "", primeraFecha: "", nota: "" };

// "vence en 4 días" / "venció hace 15 días" / "vence hoy"
function plazo(c) {
  if (c.diasParaVencer === 0) return "vence hoy";
  if (c.diasParaVencer > 0) return "vence en " + c.diasParaVencer + (c.diasParaVencer === 1 ? " día" : " días");
  const d = Math.abs(c.diasParaVencer);
  return "venció hace " + d + (d === 1 ? " día" : " días");
}

export function DeudasScreen({ subScreen, setSubScreen, fmt, showToast, setConfirm }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const kb = useKeyboardInset();
  const [form, setForm] = useState(null);       // null | {…vacio}
  const [error, setError] = useState("");
  const [cobrando, setCobrando] = useState(null); // deuda a la que se le registra un pago
  const [montoPago, setMontoPago] = useState("");
  const [verSaldadas, setVerSaldadas] = useState(false);

  const deudas = data.deudas || [];
  const fmtCur = (n, cur) => (cur === "USD" ? fmtWith(n, "USD") : fmt(n));
  const resumen = resumenDeudas(deudas);
  const activas = ordenaDeudas(deudas.filter(d => !d.archivada && !estaSaldada(d)));
  const saldadas = deudas.filter(d => !d.archivada && estaSaldada(d));

  const guardar = () => {
    const name = (form.name || "").trim();
    if (!name) { setError("¿Quién te debe?"); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("El monto tiene que ser mayor a 0"); return; }
    let cuotas = null;
    if (form.conCuotas) {
      const n = Number(form.n);
      if (!Number.isInteger(n) || n < 2) { setError("Si va en cuotas, tienen que ser 2 o más"); return; }
      const f = parseDateInput((form.primeraFecha || "").trim());
      if (!f) { setError("Pon la fecha de la primera cuota"); return; }
      cuotas = { n, primeraFecha: f.toISOString() };
    }
    const nota = (form.nota || "").trim();
    setData(p => ({
      ...p,
      deudas: [...(p.deudas || []), {
        id: genId(), name, amount,
        currency: form.currency === "USD" ? "USD" : "PEN",
        desde: new Date().toISOString(),
        cuotas, nota: nota || null, pagos: [], archivada: false,
      }],
    }));
    setForm(null); setError("");
    showToast(name + " te debe " + fmtCur(amount, form.currency));
  };

  const registrarPago = () => {
    const monto = Number(montoPago);
    if (!Number.isFinite(monto) || monto <= 0) { showToast("Ese monto no es válido"); return; }
    const d = cobrando;
    setData(p => ({
      ...p,
      deudas: (p.deudas || []).map(x => x.id === d.id
        ? { ...x, pagos: [...(x.pagos || []), { id: genId(), amount: monto, date: new Date().toISOString() }] }
        : x),
    }));
    setCobrando(null); setMontoPago("");
    showToast("Te pagaron " + fmtCur(monto, curOfDeuda(d)));
  };

  const deshacerUltimoPago = (d) => {
    const ultimo = (d.pagos || [])[d.pagos.length - 1];
    if (!ultimo) return;
    setConfirm({ message: `¿Borrar el último pago de ${fmtCur(ultimo.amount, curOfDeuda(d))}?`, onConfirm: () => {
      setData(p => ({ ...p, deudas: (p.deudas || []).map(x => x.id === d.id ? { ...x, pagos: x.pagos.slice(0, -1) } : x) }));
      showToast("Pago borrado");
    }});
  };

  const borrar = (d) => setConfirm({
    message: `¿Eliminar la deuda de ${d.name}? Se pierde también el historial de pagos.`,
    onConfirm: () => { setData(p => ({ ...p, deudas: (p.deudas || []).filter(x => x.id !== d.id) })); showToast("Deuda eliminada"); },
  });

  const Fila = ({ d }) => {
    const cur = curOfDeuda(d);
    const c = proximaCuota(d);
    const pct = progreso(d);
    const saldada = estaSaldada(d);
    return (
      <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, opacity: saldada ? 0.7 : 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: C.black }}>{d.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {saldada ? "Ya te pagó todo 🎉" : <>de {fmtCur(d.amount, cur)} · te pagó {fmtCur(pagado(d), cur)}</>}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>Te debe</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 900, color: saldada ? C.green : C.black, letterSpacing: -0.4 }}>
              {fmtCur(saldo(d), cur)}
            </div>
          </div>
        </div>
        <div style={{ height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden", marginTop: 9 }}>
          <div style={{ height: "100%", width: `${Math.round(pct)}%`, background: saldada ? C.green : C.purple, borderRadius: 99 }} />
        </div>
        {/* La cuota que le toca cobrar, y si ya se pasó la fecha */}
        {c && (
          <div style={{ fontSize: 12, color: c.vencida ? C.orange : C.muted, marginTop: 8, fontWeight: c.vencida ? 700 : 500, lineHeight: 1.45 }}>
            {c.vencida ? "⚠️ " : "📅 "}
            Cuota {c.numero} de {c.total} · {fmtCur(c.monto, cur)} · {plazo(c)} ({fmtDia(c.fecha)})
          </div>
        )}
        {tieneCuotas(d) && !c && !saldada && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Ya cubrió sus {d.cuotas.n} cuotas.</div>
        )}
        {tieneCuotas(d) && c && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {cuotasPagadas(d)} de {d.cuotas.n} cuotas cubiertas · {fmtCur(montoDeCuota(d), cur)} cada una
          </div>
        )}
        {d.nota && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, fontStyle: "italic" }}>{d.nota}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
          {!saldada && (
            <button onClick={() => { setCobrando(d); setMontoPago(c ? String(c.monto) : String(saldo(d))); }}
              style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              Me pagó
            </button>
          )}
          {(d.pagos || []).length > 0 && (
            <button onClick={() => deshacerUltimoPago(d)}
              style={{ background: "#F0EDE4", color: "#666", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              Deshacer último
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => borrar(d)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
        </div>
      </div>
    );
  };

  return (
    <div style={subStyle(subScreen, "deudas")}>
      {subHeader("Te deben", () => { setSubScreen(null); setForm(null); setCobrando(null); })}

      <div style={{ padding: "0 16px" }}>
        {/* Total por cobrar, separado por moneda: nunca se suman ni se convierten */}
        {(resumen.PEN.total > 0 || resumen.USD.total > 0) && (
          <div style={{ ...cardStyle, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Te deben en total</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 30, fontWeight: 900, color: C.black, letterSpacing: -0.8, lineHeight: 1.15, marginTop: 2 }}>
              {fmt(resumen.PEN.total)}
            </div>
            {resumen.USD.total > 0 && (
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                + <strong style={{ color: C.black }}>{fmtWith(resumen.USD.total, "USD")}</strong> en dólares · se cobran aparte
              </div>
            )}
            {resumen.vencidas.length > 0 && (
              <div style={{ fontSize: 12.5, color: C.orange, fontWeight: 700, marginTop: 8, lineHeight: 1.45 }}>
                ⚠️ {resumen.vencidas.length === 1
                  ? "Una cuota ya venció: " + resumen.vencidas[0].name
                  : resumen.vencidas.length + " cuotas ya vencieron"}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45, paddingTop: 8, borderTop: "1px solid #F0EDE4" }}>
              Esto no entra en tus ingresos del mes: es plata que ya era tuya y te están devolviendo.
            </div>
          </div>
        )}

        {deudas.length === 0 && !form && (
          <div style={{ ...cardStyle, padding: 20, marginBottom: 10, textAlign: "center", color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
            Anota acá la plata que prestaste, para no perderle el rastro.
          </div>
        )}

        {activas.map(d => <Fila key={d.id} d={d} />)}

        {saldadas.length > 0 && (
          <>
            <button onClick={() => setVerSaldadas(v => !v)}
              style={{ width: "100%", background: "none", border: "none", color: C.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "10px 0", textAlign: "left" }}>
              {verSaldadas ? "▾" : "▸"} Ya te pagaron ({saldadas.length})
            </button>
            {verSaldadas && saldadas.map(d => <Fila key={d.id} d={d} />)}
          </>
        )}

        {/* Formulario */}
        {form ? (
          <div style={{ ...cardStyle, padding: 18, marginTop: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.black, marginBottom: 14 }}>Nueva deuda por cobrar</div>
            <div style={labelStyle}>¿Quién te debe?</div>
            <input type="text" placeholder="Ej: Ana" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />

            <div style={labelStyle}>¿Cuánto te debe?</div>
            <input type="number" inputMode="decimal" placeholder="Ej: 1200" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 10 }} />
            <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: 12 }}>
              {[["PEN", "S/ Soles"], ["USD", "US$ Dólares"]].map(([v, l]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, currency: v }))}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: form.currency === v ? 800 : 600, color: form.currency === v ? C.black : C.muted, background: form.currency === v ? "#fff" : "transparent", boxShadow: form.currency === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Cuotas: opcional */}
            <div style={{ background: C.beige, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.black }}>¿Te va a pagar en cuotas?</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>Qori te avisa cuál toca y si ya se pasó la fecha. Si te paga cuando pueda, déjalo apagado.</div>
                </div>
                <button onClick={() => setForm(f => ({ ...f, conCuotas: !f.conCuotas }))} aria-pressed={form.conCuotas}
                  style={{ width: 52, height: 30, borderRadius: 99, border: "none", cursor: "pointer", background: form.conCuotas ? C.green : "#D4D0C8", position: "relative", flexShrink: 0, transition: "background 0.2s", fontFamily: "inherit" }}>
                  <span style={{ position: "absolute", top: 3, left: form.conCuotas ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
              {form.conCuotas && (
                <div style={{ marginTop: 12 }}>
                  <div style={labelStyle}>¿Cuántas cuotas?</div>
                  <input type="number" inputMode="numeric" placeholder="Ej: 3" value={form.n} onChange={e => setForm(f => ({ ...f, n: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 10, background: "#fff" }} />
                  <div style={labelStyle}>¿Cuándo te paga la primera?</div>
                  <input type="date" value={form.primeraFecha} onChange={e => setForm(f => ({ ...f, primeraFecha: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6, background: "#fff" }} />
                  <div style={{ ...hintStyle, marginBottom: 0 }}>
                    Las demás se cuentan mes a mes desde esa fecha.
                    {Number(form.n) >= 2 && Number(form.amount) > 0 && (
                      <> Serían <strong style={{ color: C.black }}>{fmtCur(Math.round((Number(form.amount) / Number(form.n)) * 100) / 100, form.currency)}</strong> cada una.</>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={labelStyle}>Nota (opcional)</div>
            <input type="text" placeholder="Ej: para el viaje" value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
            <div style={hintStyle}>Para que dentro de tres meses te acuerdes de qué era.</div>

            {error && <div style={{ fontSize: 13, color: C.orange, fontWeight: 600, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={guardar} style={{ flex: 1, padding: 13, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
              <button onClick={() => { setForm(null); setError(""); }} style={{ flex: 1, padding: 13, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setForm({ ...vacio }); setError(""); }}
            style={{ width: "100%", padding: 16, borderRadius: 14, background: "none", border: "2px dashed #D4D0C8", color: C.muted, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
            <PlusIcon size={18} color={C.muted} /> Agregar deuda
          </button>
        )}
      </div>
      <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />

      {/* Hoja para registrar un pago recibido */}
      {cobrando && (() => {
        const cur = curOfDeuda(cobrando);
        const c = proximaCuota(cobrando);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 410 }} onClick={() => { setCobrando(null); setMontoPago(""); }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div onClick={e => e.stopPropagation()} style={sheetStyle(kb)}>
              <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 2 }}>{cobrando.name} te pagó</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Te debe {fmtCur(saldo(cobrando), cur)}{c ? " · toca la cuota " + c.numero + " de " + c.total : ""}
              </div>
              <div style={labelStyle}>¿Cuánto te pagó?</div>
              <input type="number" inputMode="decimal" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                style={{ ...inputStyle, color: C.black, fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 6, padding: 14 }} />
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
                Puede ser menos de una cuota: Qori descuenta lo que sea y te dice cuánto falta.
              </div>
              <button onClick={registrarPago} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.green, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Registrar pago</button>
              <button onClick={() => { setCobrando(null); setMontoPago(""); }} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
