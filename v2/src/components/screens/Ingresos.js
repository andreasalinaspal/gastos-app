import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { PlusIcon, TrashIcon } from "../shared/icons";
import { useStore } from "../../state/store";
import { ordenaPorDia, diaDeIngreso, fechaDeIngreso, esRecibido, separaIngresos } from "../../lib/ingresos";
import { parseEtiqueta } from "../../lib/mesNuevo";
import { toDateInput, diasEnMes, fechaDelDiaEnMes } from "../../lib/dates";
import { TraerFijosButton } from "../shared/MesNuevoSheet";

// El selector se acota al mes de esa fila: un ingreso de septiembre entra en
// septiembre. Si ya tenía día pero no fecha (registros viejos), se propone ese
// mismo día dentro del mes.
const rangoDelMes = (curMonth) => {
  const p = parseEtiqueta(curMonth);
  if (!p) return null;
  const primero = new Date(p.anio, p.mes, 1, 12, 0, 0, 0);
  const ultimo = new Date(p.anio, p.mes, diasEnMes(p.anio, p.mes), 12, 0, 0, 0);
  return { min: toDateInput(primero), max: toDateInput(ultimo), ref: primero };
};

// F22: al CREAR se puede mirar más allá del mes. Su caso: el 29 de setiembre
// registra un pago que le hacen el 1 de octubre. El ingreso se archiva en el mes
// al que pertenece su fecha, no en el mes en que lo escribió.
// (Al editar una fila existente el rango sigue siendo su propio mes: cambiarle
// la fecha no debería mudarla de mes por accidente.)
const rangoCreacion = (curMonth) => {
  const p = parseEtiqueta(curMonth);
  if (!p) return null;
  const primero = new Date(p.anio, p.mes, 1, 12, 0, 0, 0);
  const finSiguiente = new Date(p.anio, p.mes + 1, diasEnMes(p.anio, p.mes + 1), 12, 0, 0, 0);
  return { min: toDateInput(primero), max: toDateInput(finSiguiente) };
};

const valorInicialFecha = (i, curMonth) => {
  const exacta = fechaDeIngreso(i);
  if (exacta) return toDateInput(exacta);
  const r = rangoDelMes(curMonth);
  const dia = diaDeIngreso(i);
  if (!r || dia === null) return "";
  const proyectada = fechaDelDiaEnMes(dia, r.ref);
  return proyectada ? toDateInput(proyectada) : "";
};

const etiquetaFecha = (i, curMonth) => {
  const exacta = fechaDeIngreso(i);
  if (exacta) return "📅 Entra el " + exacta.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  const dia = diaDeIngreso(i);
  return dia !== null ? "📅 Entra el " + dia : "📅 Sin fecha";
};

export default function Ingresos({
  fmt, curMonth, traerFijosDe, onTraerFijos,
  editIncomeId, setEditIncomeId, editIncomeAmt, setEditIncomeAmt, saveIncomeAmt,
  editFixedIncomeName, setEditFixedIncomeName, editFixedIncomeNameVal, setEditFixedIncomeNameVal, saveFixedIncomeName,
  showAddFixedIncome, setShowAddFixedIncome, newFixedIncomeName, setNewFixedIncomeName, addFixedIncome, deleteFixedIncome,
  newFixedIncomeDay, setNewFixedIncomeDay, newFixedIncomeAmt, setNewFixedIncomeAmt,
  editIncomeDayId, setEditIncomeDayId, editIncomeDayVal, setEditIncomeDayVal, saveIncomeDay,
  showAddExtra, setShowAddExtra, newExtraName, setNewExtraName, newExtraAmt, setNewExtraAmt, addExtra, deleteExtra,
  editExtraId, setEditExtraId, editExtraName, setEditExtraName, editExtraAmt, setEditExtraAmt,
  editExtraCategory, setEditExtraCategory, saveExtraEdit,
}) {
  const data = useStore(s => s.data);
    const delMes = [...data.incomeFixed, ...data.incomeExtra].filter(i => i.month === curMonth);
    const totalInc = delMes.reduce((s, i) => s + i.amount, 0);
    // F22: lo que ya entró vs. lo que falta. El número grande es lo recibido.
    const { totalRecibido, totalPendiente } = separaIngresos(delMes);
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic", fontFamily: FONT_TITLE }}>Ingresos</h1>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 80, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 4 }}>{totalPendiente > 0 ? "Ya te entró" : "Total mensual"}</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.green, fontFamily: FONT_TITLE }}>{fmt(totalRecibido)}</div>
          {totalPendiente > 0 && (
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.45, marginTop: 2 }}>
              + <strong style={{ color: C.black }}>{fmt(totalPendiente)}</strong> por entrar · {fmt(totalInc)} en todo el mes
            </div>
          )}
        </div>
        <div style={{ padding: "24px 24px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos fijos</div>
            <button onClick={() => setShowAddFixedIncome(!showAddFixedIncome)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={18} /></button>
          </div>
          {showAddFixedIncome && (
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12, animation: "slideUp 0.2s ease" }}>
              <input type="text" placeholder="Nombre (ej: Sueldo empresa)" value={newFixedIncomeName} onChange={e => setNewFixedIncomeName(e.target.value)} style={{ ...inputStyle, marginBottom: 10, color: C.black }} />
              {/* F22: el monto, acá mismo. Antes el ingreso nacía en cero y había
                  que entrar a editarlo aparte para ponerle la cifra. */}
              <input type="number" inputMode="decimal" placeholder="Monto (ej: 3500)" value={newFixedIncomeAmt} onChange={e => setNewFixedIncomeAmt(e.target.value)} style={{ ...inputStyle, marginBottom: 10, color: C.black }} />
              {/* F14: día en que entra. Opcional a propósito: puede registrar hoy
                  un ingreso que entra en otra fecha, o no saber todavía cuándo. */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>¿Qué día entra? (opcional)</div>
                <input type="date" value={newFixedIncomeDay} onChange={e => setNewFixedIncomeDay(e.target.value)} {...(rangoCreacion(curMonth) ? { min: rangoCreacion(curMonth).min, max: rangoCreacion(curMonth).max } : {})} style={{ ...inputStyle, color: C.black }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 }}>La fecha en que te entra. Si todavía no llega, queda marcada como <strong style={{ color: C.black }}>por entrar</strong> y pasa a contar sola el día que le toca. Puedes poner una fecha del próximo mes: el ingreso se guarda en ese mes. Si no la sabes, déjala vacía.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addFixedIncome} style={{ flex: 1, padding: 12, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                <button onClick={() => { setShowAddFixedIncome(false); setNewFixedIncomeName(""); setNewFixedIncomeDay(""); setNewFixedIncomeAmt(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              </div>
            </div>
          )}
          {/* F15: el mes empieza vacío y sus fijos quedaron en el mes anterior.
              Este atajo existe para que "Ahora no" no sea un callejón sin salida. */}
          {traerFijosDe && (
            <div style={{ marginBottom: 12 }}>
              <TraerFijosButton mesOrigen={traerFijosDe} onClick={onTraerFijos} />
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginTop: 6, padding: "0 2px" }}>
                Este mes todavía no tienes ingresos fijos, así que Qori no puede decirte si te alcanza.
              </div>
            </div>
          )}
          {/* Ordenados por día (F14): la lista se lee como el calendario del mes.
              Los que todavía no tienen fecha quedan al final. */}
          {ordenaPorDia(data.incomeFixed.filter(i => i.month === curMonth)).map(i => (
            <div key={i.id} style={{ ...cardStyle, padding: "16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  {editFixedIncomeName === i.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="text" value={editFixedIncomeNameVal} onChange={e => setEditFixedIncomeNameVal(e.target.value)} autoFocus style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, color: C.black, flex: 1 }} />
                      <button onClick={() => saveFixedIncomeName(i.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditFixedIncomeName(i.id); setEditFixedIncomeNameVal(i.name); }} style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{i.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>Mensual fijo · toca para editar</div>
                    </div>
                  )}
                  {/* F14: el día en que entra, con el mismo patrón de edición en línea */}
                  {editIncomeDayId === i.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                      <input type="date" value={editIncomeDayVal} onChange={e => setEditIncomeDayVal(e.target.value)} autoFocus {...(rangoDelMes(curMonth) ? { min: rangoDelMes(curMonth).min, max: rangoDelMes(curMonth).max } : {})} style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, color: C.black, width: "auto", flex: 1, minWidth: 0 }} />
                      <button onClick={() => saveIncomeDay(i.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
                      <button onClick={() => { setEditIncomeDayId(null); setEditIncomeDayVal(""); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditIncomeDayId(i.id); setEditIncomeDayVal(valorInicialFecha(i, curMonth)); }} style={{ cursor: "pointer", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: diaDeIngreso(i) !== null ? "#E8F5EE" : "#F2F0EA", borderRadius: 20, padding: "3px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: diaDeIngreso(i) !== null ? C.green : C.muted }}>
                        {etiquetaFecha(i, curMonth)}
                      </span>
                    </div>
                  )}
                  {/* F22: si todavía no entra, se dice. No es plata que ya tiene. */}
                  {!esRecibido(i) && (
                    <div style={{ display: "inline-flex", alignItems: "center", marginTop: 6, marginLeft: 6, background: "#F2F0EA", borderRadius: 20, padding: "3px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>⏳ Por entrar</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
                  {editIncomeId === i.id ? (
                    <>
                      <input type="number" value={editIncomeAmt} onChange={e => setEditIncomeAmt(e.target.value)} inputMode="decimal" autoFocus style={{ ...inputStyle, width: 90, padding: "6px 10px", fontSize: 14, color: C.black }} />
                      <button onClick={() => saveIncomeAmt(i.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
                    </>
                  ) : (
                    <button onClick={() => { setEditIncomeId(i.id); setEditIncomeAmt(i.amount > 0 ? String(i.amount) : ""); }} style={{ background: "none", border: "1.5px solid #D4D0C8", borderRadius: 10, padding: "8px 14px", fontSize: 14, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>{i.amount > 0 ? fmt(i.amount) : "Agregar >"}</button>
                  )}
                  <button onClick={() => deleteFixedIncome(i.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos extra</div>
            <button onClick={() => setShowAddExtra(!showAddExtra)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={18} /></button>
          </div>
          {showAddExtra && (
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12, animation: "slideUp 0.2s ease" }}>
              <input type="text" placeholder="Nombre (ej: Freelance)" value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ ...inputStyle, marginBottom: 10, color: C.black }} />
              <input type="number" placeholder="Monto" value={newExtraAmt} inputMode="decimal" onChange={e => setNewExtraAmt(e.target.value)} style={{ ...inputStyle, marginBottom: 12, color: C.black }} />
              <button onClick={addExtra} style={{ width: "100%", padding: 12, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
            </div>
          )}
          {data.incomeExtra.filter(i => i.month === curMonth).map(i => (
            <div key={i.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10 }}>
              {editExtraId === i.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input type="text" value={editExtraName} onChange={e => setEditExtraName(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, padding: "8px 12px", fontSize: 14, color: C.black }} />
                  <input type="number" value={editExtraAmt} onChange={e => setEditExtraAmt(e.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, padding: "8px 12px", fontSize: 14, color: C.black }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Categoría</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(data.categories?.ingresos || []).map(cat => { const cur = editExtraCategory !== undefined ? editExtraCategory : i.category; const sel = cur?.id === cat.id; return (
                        <button key={cat.id} onClick={() => setEditExtraCategory(sel ? null : cat)} style={{ padding: "5px 10px", borderRadius: 20, border: `2px solid ${sel ? C.green : "#D4D0C8"}`, background: sel ? "#E8F5EE" : "#fff", color: sel ? C.green : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{cat.emoji} {cat.name}</button>
                      );})}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveExtraEdit(i.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                    <button onClick={() => { setEditExtraId(null); setEditExtraName(""); setEditExtraAmt(""); setEditExtraCategory(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#E0DCD4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#E8F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginRight: 14, flexShrink: 0 }}>{i.category?.emoji || i.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExtraId(i.id); setEditExtraName(i.name); setEditExtraAmt(String(i.amount)); setEditExtraCategory(undefined); }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      {i.category ? <span style={{ background: "#E8F5EE", color: C.green, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{i.category.emoji} {i.category.name}</span> : <span>Toca para editar</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: C.green, marginRight: 8 }}>{fmt(i.amount)}</span>
                  <button onClick={() => deleteExtra(i.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              )}
            </div>
          ))}
          {data.incomeExtra.filter(i => i.month === curMonth).length === 0 && !showAddExtra && <div style={{ ...cardStyle, textAlign: "center", color: C.muted, fontSize: 13, padding: 20 }}>Sin ingresos extra</div>}
        </div>
      </div>
    );
}
