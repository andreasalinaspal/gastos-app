import { C, FONT_TITLE, cardStyle } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { fmtWith } from "../../lib/format";
import { useStore } from "../../state/store";
import { useState } from "react";
import { createPortal } from "react-dom";
import { inputStyle } from "../../theme";
import { genId } from "../../lib/format";
import { useKeyboardInset, sheetStyle } from "../../lib/useKeyboardInset";
import {
  detectaSuscripciones, ordenaPorCancelar, costaNoCancelar,
  ordenaSuscripciones, totalMensualDeLista, costoMensual, esAnual, detectadasNoAnotadas,
  costoNeto, bonoEnSuMoneda, faltaTasaBono, tieneBono, monedaDeBono,
} from "../../lib/suscripciones";

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

// F44: lo que decidió cancelar y todavía no cancela. Va ARRIBA de todo, porque
// es lo único de esta pantalla donde el tiempo cuesta plata.
function PorCancelar({ items, fmt, onHecho }) {
  if (!items || items.length === 0) return null;
  const costo = costaNoCancelar(items);
  const plazo = (d) => {
    if (d === null) return null;
    if (d < 0) return { txt: "ya te cobraron hace " + Math.abs(d) + (Math.abs(d) === 1 ? " día" : " días"), urge: true };
    if (d === 0) return { txt: "te cobran HOY", urge: true };
    if (d === 1) return { txt: "te cobran mañana", urge: true };
    return { txt: "te cobran en " + d + " días", urge: d <= 5 };
  };
  return (
    <div style={{ background: "#FFF4EE", border: `1.5px solid ${C.orange}`, borderRadius: 18, padding: "16px 16px 10px", marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>Tienes que cancelar</div>
      <div style={{ fontSize: 13, color: C.black, lineHeight: 1.5, marginBottom: 12 }}>
        Mientras no lo hagas te siguen cobrando <strong>{fmt(costo.PEN)}{costo.USD > 0 ? " + " + fmtWith(costo.USD, "USD") : ""}</strong> al mes.
      </div>
      {items.map(i => {
        const p = plazo(i.dias);
        return (
          <div key={i.id} style={{ background: "#fff", borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C.black }}>{i.nombre}</div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 15, fontWeight: 900, color: C.black, flexShrink: 0 }}>
                {i.currency === "USD" ? fmtWith(i.monto, "USD") : fmt(i.monto)}
              </div>
            </div>
            {p && <div style={{ fontSize: 12, fontWeight: 700, color: p.urge ? C.red : C.orange, marginTop: 2 }}>{p.txt}</div>}
            {i.nota && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.45, marginTop: 5 }}>{i.nota}</div>}
            <button onClick={() => onHecho(i.id)}
              style={{ marginTop: 9, padding: "7px 12px", borderRadius: 9, background: "#F0EDE4", color: C.black, border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Ya la cancelé
            </button>
          </div>
        );
      })}
    </div>
  );
}

const CADENCIAS_UI = [["mensual", "Cada mes"], ["anual", "Cada año"]];
const vacia = { nombre: "", monto: "", currency: "PEN", cobra: "", cadencia: "mensual", nota: "", bono: "", bonoCurrency: "USD", bonoTasa: "" };

// Una suscripción de SU lista. Acá sí se puede editar y dar de baja, porque es
// un dato suyo y no una deducción de Qori.
function FilaMia({ s, fmt, onEditar, onCancelar }) {
  const fmtC = (n) => (s.currency === "USD" ? fmtWith(n, "USD") : fmt(n));
  const cuando = enCuantoLabel(s.dias);
  const urge = s.dias !== null && s.dias <= 5;
  return (
    <div style={{ ...cardStyle, padding: "13px 15px", marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{s.nombre}</div>
          <div style={{ fontSize: 12, color: urge ? C.orange : C.muted, fontWeight: urge ? 700 : 600, marginTop: 2 }}>
            {esAnual(s) ? "cada año" : "cada mes"}{cuando ? " · " + cuando : ""}
          </div>
          {esAnual(s) && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>son {fmtC(costoMensual(s))} al mes</div>
          )}
          {s.nota && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.45, marginTop: 5 }}>{s.nota}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 18, fontWeight: 900, color: C.black, letterSpacing: -0.4 }}>{fmtC(costoNeto(s))}</div>
          {tieneBono(s) && bonoEnSuMoneda(s) > 0 && (
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textDecoration: "line-through" }}>{fmtC(s.monto)}</div>
          )}
        </div>
      </div>
      {/* F51: de dónde sale el descuento, y el aviso si falta el tipo de cambio. */}
      {tieneBono(s) && bonoEnSuMoneda(s) > 0 && (
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600, marginTop: 5 }}>
          − {monedaDeBono(s) === "USD" ? fmtWith(s.bono, "USD") : fmt(s.bono)} de bono
          {monedaDeBono(s) !== (s.currency === "USD" ? "USD" : "PEN") ? " (a " + s.bonoTasa + ")" : ""}
        </div>
      )}
      {faltaTasaBono(s) && (
        <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginTop: 5, lineHeight: 1.4 }}>
          Tienes un bono de {fmtWith(s.bono, "USD")} sin descontar: ponle el tipo de cambio del mes al editarla.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => onEditar(s)} style={{ padding: "7px 12px", borderRadius: 9, background: "#F0EDE4", color: C.black, border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
        <button onClick={() => onCancelar(s)} style={{ padding: "7px 12px", borderRadius: 9, background: "transparent", color: C.orange, border: `1px solid ${C.orange}`, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Quiero cancelarla</button>
      </div>
    </div>
  );
}

// Va en una hoja aparte, no empotrada en la lista: metida arriba, al editar algo
// del fondo el formulario quedaba fuera de pantalla y parecía que el botón no
// hacía nada.
function FormSuscripcion({ form, setForm, onGuardar, onBorrar, onCerrar }) {
  const kb = useKeyboardInset();
  const lbl = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 };
  const valido = String(form.nombre).trim() && Number(form.monto) > 0;
  // Va por portal al body a propósito: el contenedor de la sub-pantalla tiene un
  // `transform` para la animación de entrada, y un ancestro con transform hace
  // que `position: fixed` se posicione contra ÉL y no contra la ventana. Sin
  // esto la hoja salía cortada a un costado.
  if (typeof document === "undefined") return null;
  return createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 420 }} onClick={onCerrar}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
      <div onClick={e => e.stopPropagation()} style={sheetStyle(kb)}>
      <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 18px" }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 16 }}>{form.id ? "Editar suscripción" : "Nueva suscripción"}</div>
      <div style={lbl}>Nombre</div>
      <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Netflix" style={{ ...inputStyle, color: C.black, marginBottom: 12 }} />

      <div style={lbl}>Monto</div>
      <input type="number" inputMode="decimal" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" style={{ ...inputStyle, color: C.black, marginBottom: 8 }} />
      <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: 12 }}>
        {[["PEN", "S/ Soles"], ["USD", "US$ Dólares"]].map(([v, l]) => (
          <button key={v} onClick={() => setForm(f => ({ ...f, currency: v }))}
            style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: form.currency === v ? 800 : 600, color: form.currency === v ? C.black : C.muted, background: form.currency === v ? "#fff" : "transparent" }}>{l}</button>
        ))}
      </div>

      <div style={lbl}>Cada cuánto</div>
      <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: 12 }}>
        {CADENCIAS_UI.map(([v, l]) => (
          <button key={v} onClick={() => setForm(f => ({ ...f, cadencia: v }))}
            style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: form.cadencia === v ? 800 : 600, color: form.cadencia === v ? C.black : C.muted, background: form.cadencia === v ? "#fff" : "transparent" }}>{l}</button>
        ))}
      </div>

      <div style={lbl}>{form.cadencia === "anual" ? "Fecha del próximo cobro" : "Qué día del mes te cobran"}</div>
      <input
        type={form.cadencia === "anual" ? "date" : "number"}
        inputMode={form.cadencia === "anual" ? undefined : "numeric"}
        value={form.cobra}
        onChange={e => setForm(f => ({ ...f, cobra: e.target.value }))}
        placeholder={form.cadencia === "anual" ? "" : "Ej: 18"}
        style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 }}>
        Opcional, pero con esto Qori te avisa cuántos días faltan.
      </div>

      {/* F51: lo que le rebaja la suscripción. El tipo de cambio lo pone ella
          cada mes, porque se mueve — Qori no lo inventa. */}
      <div style={lbl}>Bono o descuento (opcional)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input type="number" inputMode="decimal" value={form.bono} onChange={e => setForm(f => ({ ...f, bono: e.target.value }))} placeholder="0" style={{ ...inputStyle, color: C.black, flex: 1 }} />
        <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, flex: 1 }}>
          {[["PEN", "S/"], ["USD", "US$"]].map(([v, l]) => (
            <button key={v} onClick={() => setForm(f => ({ ...f, bonoCurrency: v }))}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: form.bonoCurrency === v ? 800 : 600, color: form.bonoCurrency === v ? C.black : C.muted, background: form.bonoCurrency === v ? "#fff" : "transparent" }}>{l}</button>
          ))}
        </div>
      </div>
      {Number(form.bono) > 0 && form.bonoCurrency !== form.currency && (
        <>
          <div style={lbl}>Tipo de cambio de este mes</div>
          <input type="number" inputMode="decimal" step="0.001" value={form.bonoTasa} onChange={e => setForm(f => ({ ...f, bonoTasa: e.target.value }))} placeholder="Ej: 3.78" style={{ ...inputStyle, color: C.black, marginBottom: 6 }} />
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 }}>
            El bono está en otra moneda. Sin este dato Qori no lo descuenta — no inventa tipos de cambio.
            Actualízalo cuando se mueva.
          </div>
        </>
      )}
      {Number(form.bono) > 0 && form.bonoCurrency === form.currency && <div style={{ marginBottom: 12 }} />}

      <div style={lbl}>Nota (opcional)</div>
      <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ej: dónde se cancela" style={{ ...inputStyle, color: C.black, marginBottom: 14 }} />

      <button onClick={onGuardar} disabled={!valido}
        style={{ width: "100%", padding: 14, borderRadius: 13, background: valido ? C.green : "#D4D0C8", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: valido ? "pointer" : "default", fontFamily: "inherit", marginBottom: 8 }}>Guardar</button>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCerrar} style={{ flex: 1, padding: 12, borderRadius: 13, background: "#F0EDE4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        {onBorrar && <button onClick={onBorrar} style={{ flex: 1, padding: 12, borderRadius: 13, background: "transparent", color: C.orange, border: `1px solid ${C.orange}`, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Eliminar</button>}
      </div>
      </div>
    </div>
  ), document.body);
}

export function SuscripcionesScreen({ subScreen, setSubScreen, fmt, showToast }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [form, setForm] = useState(null);   // null | {…vacia, id?}
  const pendientes = ordenaPorCancelar(data.porCancelar);
  const marcarHecha = (id) => setData(p => ({ ...p, porCancelar: (p.porCancelar || []).filter(i => i && i.id !== id) }));

  // F45: SU lista manda. La detección queda como ayuda, abajo.
  const mias = ordenaSuscripciones(data.suscripciones);
  const total = totalMensualDeLista(data.suscripciones);
  const sugeridas = detectadasNoAnotadas(data.expenses, data.suscripciones);

  const guardar = () => {
    const limpio = {
      id: form.id || genId(),
      nombre: String(form.nombre).trim(),
      monto: Number(form.monto) || 0,
      currency: form.currency === "USD" ? "USD" : "PEN",
      cadencia: form.cadencia === "anual" ? "anual" : "mensual",
      cobra: form.cadencia === "anual" ? (form.cobra || null) : (Number(form.cobra) || null),
      nota: String(form.nota || "").trim() || null,
      bono: Number(form.bono) || 0,
      bonoCurrency: form.bonoCurrency === "PEN" ? "PEN" : "USD",
      bonoTasa: Number(form.bonoTasa) || null,
    };
    setData(p => {
      const lista = p.suscripciones || [];
      return { ...p, suscripciones: form.id ? lista.map(x => x.id === form.id ? limpio : x) : [...lista, limpio] };
    });
    setForm(null);
  };
  const borrar = () => {
    setData(p => ({ ...p, suscripciones: (p.suscripciones || []).filter(x => x.id !== form.id) }));
    setForm(null);
  };
  // Pasarla a "tienes que cancelar" sin sacarla de la lista: sigue cobrando
  // hasta que de verdad la cancele, y eso es justo lo que hay que ver.
  const quieroCancelar = (s) => {
    const ya = (data.porCancelar || []).some(i => i && i.nombre === s.nombre);
    if (ya) { if (showToast) showToast(s.nombre + " ya estaba en la lista de arriba"); return; }
    setData(p => ({ ...p, porCancelar: [...(p.porCancelar || []), {
      id: genId(), nombre: s.nombre, monto: s.monto, currency: s.currency, cobra: s.cobra || null, nota: s.nota || null,
    }] }));
    if (showToast) showToast(s.nombre + " anotada arriba, para que no se te pase");
  };

  const r = detectaSuscripciones(data.expenses);
  const hayAlgo = mias.length > 0 || r.inactivas.length > 0;
  const subieron = r.activas.filter(s => s.subioDePrecio);

  return (
    <div style={subStyle(subScreen, "suscripciones")}>
      {subHeader("Suscripciones", () => setSubScreen(null))}
      {form && (
        <FormSuscripcion form={form} setForm={setForm} onGuardar={guardar}
          onBorrar={form.id ? borrar : null} onCerrar={() => setForm(null)} />
      )}
      <div style={{ padding: "0 20px 40px" }}>
        <PorCancelar items={pendientes} fmt={fmt} onHecho={marcarHecha} />
        {mias.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #1B6B3A 0%, #2D9F5B 100%)", borderRadius: 20, padding: "22px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Te cuestan al mes</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: "clamp(26px, 9vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: -1 }}>{fmt(total.PEN)}</div>
            {total.USD > 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginTop: 2 }}>+ {fmtWith(total.USD, "USD")} en dólares</div>
            )}
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 8, lineHeight: 1.45 }}>
              Son {fmt(Math.round(total.PEN * 12 * 100) / 100)} al año. Las anuales están repartidas entre 12 meses.
            </div>
          </div>
        )}

        {subieron.length > 0 && (
          <div style={{ background: "#FDF1EA", borderRadius: 14, padding: "12px 14px", marginBottom: 16, fontSize: 13, lineHeight: 1.5, color: C.black }}>
            <strong>{subieron.length === 1 ? "Una subió de precio" : `${subieron.length} subieron de precio`}</strong> sin que te avisaran. Mira cuáles abajo.
          </div>
        )}

        {!hayAlgo && pendientes.length === 0 && (
          <div style={{ ...cardStyle, padding: "20px 18px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 8 }}>Todavía no tienes ninguna anotada</div>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55 }}>
              Dale a <strong>+ Agregar</strong> y anota las que pagas: cuánto, cada cuánto y
              qué día te cobran. Qori te va avisando cuáles se vienen.
              <div style={{ marginTop: 8 }}>
                De paso las busca sola en tus gastos, y cuando vea un cobro repetido te la
                propone acá para que la agregues de un toque.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>Activas</div>
          {!form && (
            <button onClick={() => setForm({ ...vacia })}
              style={{ padding: "7px 13px", borderRadius: 10, background: C.purple, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Agregar</button>
          )}
        </div>
        {mias.map(s => (
          <FilaMia key={s.id} s={s} fmt={fmt}
            onEditar={(x) => setForm({ ...x, monto: String(x.monto), cobra: x.cobra == null ? "" : String(x.cobra), nota: x.nota || "",
              bono: x.bono ? String(x.bono) : "", bonoCurrency: x.bonoCurrency || "USD", bonoTasa: x.bonoTasa ? String(x.bonoTasa) : "" })}
            onCancelar={quieroCancelar} />
        ))}

        {/* Lo que Qori vio en sus gastos y ella no tiene anotado. Se ofrece, no
            se mete solo: la lista es suya. */}
        {sugeridas.length > 0 && (
          <div style={{ background: "#F0EDE4", borderRadius: 14, padding: "13px 15px", marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.black, marginBottom: 6 }}>Vi estos cobros repetidos en tus gastos</div>
            {sugeridas.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0" }}>
                <div style={{ fontSize: 13, color: C.black, overflow: "hidden", textOverflow: "ellipsis" }}>{d.comercio}</div>
                <button onClick={() => setForm({ ...vacia, nombre: d.comercio, monto: String(d.monto), currency: d.currency, cadencia: d.cadencia })}
                  style={{ padding: "5px 10px", borderRadius: 8, background: "#fff", color: C.purple, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Agregar</button>
              </div>
            ))}
          </div>
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
