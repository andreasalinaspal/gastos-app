import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { PlusIcon, TrashIcon } from "../shared/icons";
import { useStore } from "../../state/store";
import { ordenaPorDia, diaDeIngreso } from "../../lib/ingresos";

export default function Ingresos({
  fmt, curMonth,
  editIncomeId, setEditIncomeId, editIncomeAmt, setEditIncomeAmt, saveIncomeAmt,
  editFixedIncomeName, setEditFixedIncomeName, editFixedIncomeNameVal, setEditFixedIncomeNameVal, saveFixedIncomeName,
  showAddFixedIncome, setShowAddFixedIncome, newFixedIncomeName, setNewFixedIncomeName, addFixedIncome, deleteFixedIncome,
  newFixedIncomeDay, setNewFixedIncomeDay,
  editIncomeDayId, setEditIncomeDayId, editIncomeDayVal, setEditIncomeDayVal, saveIncomeDay,
  showAddExtra, setShowAddExtra, newExtraName, setNewExtraName, newExtraAmt, setNewExtraAmt, addExtra, deleteExtra,
  editExtraId, setEditExtraId, editExtraName, setEditExtraName, editExtraAmt, setEditExtraAmt,
  editExtraCategory, setEditExtraCategory, saveExtraEdit,
}) {
  const data = useStore(s => s.data);
    const totalInc = data.incomeFixed.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0) + data.incomeExtra.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0);
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic", fontFamily: FONT_TITLE }}>Ingresos</h1>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 80, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 4 }}>Total mensual</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.green, fontFamily: FONT_TITLE }}>{fmt(totalInc)}</div>
        </div>
        <div style={{ padding: "24px 24px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos fijos</div>
            <button onClick={() => setShowAddFixedIncome(!showAddFixedIncome)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={18} /></button>
          </div>
          {showAddFixedIncome && (
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12, animation: "slideUp 0.2s ease" }}>
              <input type="text" placeholder="Nombre (ej: Sueldo empresa)" value={newFixedIncomeName} onChange={e => setNewFixedIncomeName(e.target.value)} style={{ ...inputStyle, marginBottom: 10, color: C.black }} />
              {/* F14: día en que entra. Opcional a propósito: puede registrar hoy
                  un ingreso que entra en otra fecha, o no saber todavía cuándo. */}
              <input type="number" inputMode="numeric" min={1} max={31} placeholder="¿Qué día entra? (opcional)" value={newFixedIncomeDay} onChange={e => setNewFixedIncomeDay(e.target.value)} style={{ ...inputStyle, marginBottom: 6, color: C.black }} />
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 12 }}>Día del mes, del 1 al 31. Si todavía no lo sabes, déjalo vacío y se lo pones después.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addFixedIncome} style={{ flex: 1, padding: 12, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                <button onClick={() => { setShowAddFixedIncome(false); setNewFixedIncomeName(""); setNewFixedIncomeDay(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
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
                      <input type="number" inputMode="numeric" min={1} max={31} value={editIncomeDayVal} onChange={e => setEditIncomeDayVal(e.target.value)} placeholder="Día" autoFocus style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, color: C.black, width: 80 }} />
                      <button onClick={() => saveIncomeDay(i.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
                      <button onClick={() => { setEditIncomeDayId(null); setEditIncomeDayVal(""); }} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditIncomeDayId(i.id); setEditIncomeDayVal(diaDeIngreso(i) !== null ? String(diaDeIngreso(i)) : ""); }} style={{ cursor: "pointer", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: diaDeIngreso(i) !== null ? "#E8F5EE" : "#F2F0EA", borderRadius: 20, padding: "3px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: diaDeIngreso(i) !== null ? C.green : C.muted }}>
                        {diaDeIngreso(i) !== null ? `📅 Entra el ${diaDeIngreso(i)}` : "📅 Sin fecha"}
                      </span>
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
