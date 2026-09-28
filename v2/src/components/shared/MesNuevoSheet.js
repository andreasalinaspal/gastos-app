import { useState } from "react";
import { C, FONT_TITLE, inputStyle } from "../../theme";
import { useKeyboardInset, sheetStyle } from "../../lib/useKeyboardInset";
import { parseEtiqueta } from "../../lib/mesNuevo";
import { toDateInput, diasEnMes, fechaDelDiaEnMes } from "../../lib/dates";

// F15: la hoja que pregunta, al empezar el mes, cuáles fijos siguen.
//
// Por qué se pregunta y no se copia solo: un fijo se termina, un sueldo cambia,
// un ingreso se acaba. Copiar en silencio le dejaría números que no son suyos;
// dejar el mes en cero (lo que pasaba antes) le rompe la cuenta de "¿me alcanza?".
// Acá ella ve la lista del mes anterior, apaga lo que ya no va y ajusta montos.

const soloMes = (etiqueta) => String(etiqueta || "").split(" ")[0];

// Interruptor de incluir/no incluir. Encendido por defecto.
function Switch({ on, onToggle, label }) {
  return (
    <button
      onClick={onToggle} role="switch" aria-checked={on} aria-label={label}
      style={{
        width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? C.green : "#D8D4CC", padding: 3, display: "flex", alignItems: "center",
        justifyContent: on ? "flex-end" : "flex-start", transition: "background 0.18s", fontFamily: "inherit",
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "block" }} />
    </button>
  );
}

const labelCss = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 };

function Fila({ fila, onToggle, onMonto, onDia, conDia, rango }) {
  const on = fila.on;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid #F0EDE4", opacity: on ? 1 : 0.5 }}>
      <Switch on={on} onToggle={onToggle} label={fila.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fila.name}</div>
        {conDia && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
            <span style={{ fontSize: 11.5, color: C.muted }}>Entra el</span>
            <input
              type="date"
              value={fila.day} onChange={e => onDia(e.target.value)} disabled={!on}
              {...(rango ? { min: rango.min, max: rango.max } : {})}
              style={{ ...inputStyle, flex: 1, minWidth: 0, padding: "4px 8px", fontSize: 13, color: C.black }}
            />
          </div>
        )}
      </div>
      <input
        type="number" inputMode="decimal" placeholder="0"
        value={fila.amount} onChange={e => onMonto(e.target.value)} disabled={!on}
        style={{ ...inputStyle, width: 96, padding: "8px 10px", fontSize: 15, fontWeight: 700, fontFamily: FONT_TITLE, color: C.black, textAlign: "right", flexShrink: 0 }}
      />
    </div>
  );
}

// `plantilla` viene de plantillaDelMes(); `onConfirm` recibe la selección ya
// editada ({ ingresos, gastos }) y `onDismiss` es el "Ahora no". Los dos cierran
// la hoja y marcan el mes como preguntado: no se insiste.
export function MesNuevoSheet({ mesActual, mesOrigen, plantilla, fmt, onConfirm, onDismiss }) {
  const kb = useKeyboardInset();
  // El día venía del mes anterior; acá se propone como fecha real del mes nuevo.
  const rangoMes = (() => {
    const p = parseEtiqueta(mesActual);
    if (!p) return null;
    const primero = new Date(p.anio, p.mes, 1, 12, 0, 0, 0);
    const ultimo = new Date(p.anio, p.mes, diasEnMes(p.anio, p.mes), 12, 0, 0, 0);
    return { min: toDateInput(primero), max: toDateInput(ultimo), ref: primero };
  })();
  const fechaPropuesta = (dia) => {
    if (dia === null || dia === undefined || dia === "" || !rangoMes) return "";
    const f = fechaDelDiaEnMes(dia, rangoMes.ref);
    return f ? toDateInput(f) : "";
  };
  const [ingresos, setIngresos] = useState(() =>
    (plantilla.ingresos || []).map((i, k) => ({ key: "i" + k, on: true, name: i.name, amount: i.amount > 0 ? String(i.amount) : "", day: fechaPropuesta(i.day) }))
  );
  const [gastos, setGastos] = useState(() =>
    (plantilla.gastos || []).map((g, k) => ({ key: "g" + k, on: true, name: g.name, type: g.type, amount: g.amount > 0 ? String(g.amount) : "" }))
  );

  const patch = (setter) => (key, cambio) => setter(prev => prev.map(f => (f.key === key ? { ...f, ...cambio } : f)));
  const patchIng = patch(setIngresos);
  const patchGas = patch(setGastos);

  const marcados = [...ingresos, ...gastos].filter(f => f.on).length;
  const totalIng = ingresos.filter(f => f.on).reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const confirmar = () => onConfirm({
    ingresos: ingresos.filter(f => f.on).map(f => {
      const fecha = f.day ? new Date(f.day + "T12:00:00") : null;
      const valida = fecha && !isNaN(fecha.getTime());
      return { name: f.name, amount: Number(f.amount) || 0, day: valida ? fecha.getDate() : null, date: valida ? fecha.toISOString() : null };
    }),
    gastos: gastos.filter(f => f.on).map(f => ({ name: f.name, type: f.type, amount: Number(f.amount) || 0 })),
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,18,24,0.45)", display: "flex", justifyContent: "center" }}>
      <div style={sheetStyle(kb)}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "#E0DCD4", margin: "0 auto 14px" }} />
        <div style={{ fontSize: 22, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE, lineHeight: 1.25, fontStyle: "italic" }}>
          Empezó {soloMes(mesActual)}. ¿Cuáles de tus fijos siguen?
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginTop: 8, marginBottom: 16 }}>
          Estos son los que tenías en {mesOrigen}. Apaga los que ya no van y ajusta el monto si cambió. Qori no copia nada sin que tú lo digas.
        </div>

        {ingresos.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={labelCss}>Ingresos fijos</div>
            {ingresos.map(f => (
              <Fila key={f.key} fila={f} conDia rango={rangoMes}
                onToggle={() => patchIng(f.key, { on: !f.on })}
                onMonto={v => patchIng(f.key, { amount: v })}
                onDia={v => patchIng(f.key, { day: v })}
              />
            ))}
            {totalIng > 0 && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>
                Sumarían <strong style={{ color: C.green }}>{fmt(totalIng)}</strong> de ingresos este mes.
              </div>
            )}
          </div>
        )}

        {gastos.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={labelCss}>Gastos fijos</div>
            {gastos.map(f => (
              <Fila key={f.key} fila={f}
                onToggle={() => patchGas(f.key, { on: !f.on })}
                onMonto={v => patchGas(f.key, { amount: v })}
              />
            ))}
          </div>
        )}

        <button
          onClick={confirmar}
          style={{ width: "100%", padding: 15, borderRadius: 14, background: marcados > 0 ? C.green : "#C8C4BC", color: "#fff", border: "none", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          {marcados > 0 ? `Confirmar ${marcados === 1 ? "el que marqué" : "los " + marcados + " que marqué"}` : "No traer ninguno"}
        </button>
        <button
          onClick={onDismiss}
          style={{ width: "100%", padding: 13, borderRadius: 14, background: "none", color: C.muted, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}
        >
          Ahora no
        </button>
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", lineHeight: 1.5, marginTop: 8 }}>
          Si lo dejas para después, lo encuentras en Ingresos y en Gastos fijos.
        </div>
      </div>
    </div>
  );
}

// El botón discreto para traerlos después: solo cuando ese mes está vacío y hay
// de dónde copiar. Sin esto, "Ahora no" sería un callejón sin salida.
export function TraerFijosButton({ mesOrigen, onClick, style }) {
  if (!mesOrigen) return null;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "12px 14px", borderRadius: 12, background: "#fff",
        border: `1.5px dashed ${C.purple}`, cursor: "pointer", fontFamily: "inherit",
        fontSize: 13.5, fontWeight: 700, color: C.purple, textAlign: "left",
        display: "flex", alignItems: "center", gap: 8, ...style,
      }}
    >
      <span>↺</span><span>Traer mis fijos de {mesOrigen}</span>
    </button>
  );
}
