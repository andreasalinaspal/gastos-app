import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { CheckIcon, PlusIcon, TrashIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId } from "../../lib/format";
import { buildCatMap } from "../../state/selectors";
import { useStore } from "../../state/store";

const typeLabel = (t) => t === "manual" ? "Lo pago yo" : t === "debito" ? "Debito automatico" : "Descuento sueldo";
const typeBg = (t) => t === "manual" ? C.orange : t === "debito" ? C.purple : C.green;

const catRowStyle = { display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #F0EDE4", gap: 12 };

export function FijosScreen({
  subScreen, setSubScreen, fmt, curMonth, setConfirm, showToast,
  togglePaid, saveFixedAmt, deleteFixed,
  editFixed, setEditFixed, editFixedAmt, setEditFixedAmt,
  editFixedExpName, setEditFixedExpName, editFixedExpNameVal, setEditFixedExpNameVal, saveFixedExpName,
  editFixedExpType, setEditFixedExpType, saveFixedExpType,
  showAddFixed, setShowAddFixed, newFixedName, setNewFixedName, newFixedType, setNewFixedType,
}) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
    const fixedCur = data.fixed.filter(f => f.month === curMonth);
    const totalAll = fixedCur.reduce((s, f) => s + f.amount, 0);
    const totalPaid = fixedCur.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
    return (
    <div style={subStyle(subScreen, "fijos")}>
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "52px 24px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={() => setSubScreen(null)} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", fontSize: 22, color: C.black, flexShrink: 0 }}>‹</button>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic", fontFamily: FONT_TITLE }}>Fijos</h1>
          </div>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 0, width: 50, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 8 }}>Mensual</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE }}>{fmt(totalAll)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 20, fontSize: 12, color: C.muted }}><span>Pagado: {fmt(totalPaid)}</span><span>|</span><span>Pendiente: {fmt(totalAll - totalPaid)}</span></div>
        </div>
        <div style={{ padding: "0 20px" }}>
          {fixedCur.map(f => (
            <div key={f.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, opacity: f.paid ? 0.65 : 1 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button onClick={() => togglePaid(f.id)} style={{ width: 36, height: 36, borderRadius: "50%", background: f.paid ? C.green : "#E8E4DA", border: "none", cursor: "pointer", marginRight: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.paid && <CheckIcon size={18} />}</button>
                <div style={{ flex: 1 }}>
                  {editFixedExpName === f.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                      <input type="text" value={editFixedExpNameVal} onChange={e => setEditFixedExpNameVal(e.target.value)} autoFocus style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, color: C.black, flex: 1 }} />
                      <button onClick={() => saveFixedExpName(f.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditFixedExpName(f.id); setEditFixedExpNameVal(f.name); }} style={{ fontSize: 15, fontWeight: 500, color: C.black, textDecoration: f.paid ? "line-through" : "none", textDecorationColor: C.muted, cursor: "pointer" }}>{f.name}</div>
                  )}
                  {editFixedExpType === f.id ? (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      {["manual", "debito", "sueldo"].map(t => (
                        <button key={t} onClick={() => saveFixedExpType(f.id, t)} style={{
                          padding: "4px 8px", borderRadius: 6, border: "none",
                          background: f.type === t ? typeBg(t) : "#E8E4DA",
                          color: f.type === t ? "#fff" : C.muted,
                          fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        }}>{typeLabel(t)}</button>
                      ))}
                    </div>
                  ) : (
                    <span onClick={() => setEditFixedExpType(f.id)} style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#fff", background: typeBg(f.type), borderRadius: 6, padding: "2px 10px", marginTop: 4, cursor: "pointer" }}>{typeLabel(f.type)}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {editFixed === f.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" value={editFixedAmt} onChange={e => setEditFixedAmt(e.target.value)} inputMode="decimal" autoFocus style={{ ...inputStyle, width: 80, padding: "6px 10px", fontSize: 14, color: C.black }} />
                      <button onClick={() => saveFixedAmt(f.id)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>OK</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditFixed(f.id); setEditFixedAmt(f.amount > 0 ? String(f.amount) : ""); }} style={{ fontSize: 17, fontWeight: 600, color: f.amount > 0 ? C.black : C.muted, cursor: "pointer" }}>{f.amount > 0 ? fmt(f.amount) : "$0"}</div>
                  )}
                  <button onClick={() => deleteFixed(f.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
          {/* Add new fixed expense */}
          {!showAddFixed ? (
            <button onClick={() => setShowAddFixed(true)} style={{ width: "100%", padding: 16, borderRadius: 14, background: "transparent", border: "2px dashed #C8C4BC", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.muted, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
              <PlusIcon size={18} color={C.muted} /> Agregar gasto fijo
            </button>
          ) : (
            <div style={{ ...cardStyle, padding: 18, marginTop: 4, animation: "slideUp 0.25s ease" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.black, marginBottom: 12 }}>Nuevo gasto fijo</div>
              <input type="text" placeholder="Nombre (ej: Netflix)" value={newFixedName} onChange={e => setNewFixedName(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 10 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tipo de pago</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["manual", "debito", "sueldo"].map(t => (
                  <button key={t} onClick={() => setNewFixedType(t)} style={{
                    flex: 1, padding: "9px 4px", borderRadius: 8, border: "2px solid",
                    borderColor: newFixedType === t ? typeBg(t) : "#E0DCD4",
                    background: newFixedType === t ? typeBg(t) : "transparent",
                    color: newFixedType === t ? "#fff" : C.muted,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}>{typeLabel(t)}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => {
                  if (!newFixedName.trim()) return;
                  const n = newFixedName.trim(); const t = newFixedType;
                  setConfirm({ message: `¿Agregar "${n}" como gasto fijo?`, onConfirm: () => {
                    setData(p => ({ ...p, fixed: [...p.fixed, { id: genId(), name: n, type: t, amount: 0, paid: false, month: curMonth }] }));
                    setNewFixedName(""); setNewFixedType("manual"); setShowAddFixed(false);
                    showToast("Gasto fijo agregado");
                  }});
                }} style={{ flex: 1, padding: 13, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                <button onClick={() => { setShowAddFixed(false); setNewFixedName(""); }} style={{ flex: 1, padding: 13, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
}

export function CatsSubScreen({
  type, title, subScreen, setSubScreen,
  catEditId, setCatEditId, catEditEmoji, setCatEditEmoji, catEditName, setCatEditName,
  saveCatEdit, deleteCat, addCat,
  showAddCat, setShowAddCat, newCatEmoji, setNewCatEmoji, newCatName, setNewCatName,
}) {
  const data = useStore(s => s.data);
    const cats = data.categories?.[type] || [];
    return (
      <div style={subStyle(`cats-${type === "gastos" ? "gasto" : "ingreso"}`)}>
        {subHeader(title, () => { setSubScreen(null); setCatEditId(null); setShowAddCat(null); })}
        <div style={{ fontSize: 13, color: C.muted, padding: "0 20px 12px" }}>Toca el nombre o emoji para editar.</div>
        <div style={{ margin: "0 16px" }}>
          {cats.map((c, i) => (
            <div key={c.id} style={{ ...catRowStyle, background: "#fff", borderRadius: i === 0 ? "14px 14px 0 0" : i === cats.length - 1 && showAddCat !== type ? "0 0 14px 14px" : 0, borderBottom: i === cats.length - 1 && showAddCat !== type ? "none" : "1px solid #F0EDE4" }}>
              {catEditId === c.id ? (
                <>
                  <input value={catEditEmoji} onChange={e => setCatEditEmoji(e.target.value)} placeholder="🏷️" style={{ ...inputStyle, width: 52, textAlign: "center", padding: "8px 6px", fontSize: 20, color: C.black, flex: "none" }} />
                  <input value={catEditName} onChange={e => setCatEditName(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 14, color: C.black }} onKeyDown={e => e.key === "Enter" && saveCatEdit(type)} />
                  <button onClick={() => saveCatEdit(type)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
                  <button onClick={() => { setCatEditId(null); }} style={{ background: "#E0DCD4", color: "#666", border: "none", borderRadius: 8, padding: "8px 10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✕</button>
                </>
              ) : (
                <>
                  <div onClick={() => { setCatEditId(c.id); setCatEditEmoji(c.emoji); setCatEditName(c.name); }} style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer", flexShrink: 0 }}>{c.emoji}</div>
                  <div onClick={() => { setCatEditId(c.id); setCatEditEmoji(c.emoji); setCatEditName(c.name); }} style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.black, cursor: "pointer" }}>{c.name}</div>
                  <button onClick={() => deleteCat(type, c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#bbb", fontSize: 18 }}>✕</button>
                </>
              )}
            </div>
          ))}
          {/* Add row */}
          {showAddCat === type ? (
            <div style={{ ...catRowStyle, background: "#fff", borderRadius: "0 0 14px 14px", borderBottom: "none" }}>
              <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} placeholder="🏷️" style={{ ...inputStyle, width: 52, textAlign: "center", padding: "8px 6px", fontSize: 20, color: C.black, flex: "none" }} />
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus placeholder="Nombre" style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 14, color: C.black }} onKeyDown={e => e.key === "Enter" && addCat(type)} />
              <button onClick={() => addCat(type)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
              <button onClick={() => setShowAddCat(null)} style={{ background: "#E0DCD4", color: "#666", border: "none", borderRadius: 8, padding: "8px 10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowAddCat(type)} style={{ width: "100%", padding: "14px 16px", background: "#fff", border: "none", borderTop: "1px solid #F0EDE4", borderRadius: "0 0 14px 14px", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.purple, fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              <PlusIcon size={16} color={C.purple} /> Agregar categoría
            </button>
          )}
        </div>
        <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />
      </div>
    );
}

export function PresupuestosScreen({ subScreen, setSubScreen, fmt, catSpend }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  return (
      <div style={subStyle(subScreen, "presupuestos")}>
        {subHeader("Presupuestos", () => setSubScreen(null))}
        <div style={{ padding: "0 16px 8px" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Define cuánto quieres gastar por categoría este mes. Te avisaremos cuando llegues al 80%.
          </div>
          <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
            {(data.categories?.gastos || []).map((cat, i, arr) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F0EDE4" : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.black }}>{cat.name}</div>
                  {data.budgets?.[cat.id] > 0 && (
                    <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginTop: 2 }}>
                      Gastado: {fmt(catSpend[cat.id] || 0)} de {fmt(data.budgets[cat.id])}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: data.budgets?.[cat.id] > 0 ? C.purpleSoft : C.beige, border: `1.5px solid ${data.budgets?.[cat.id] > 0 ? C.purple : "#D4D0C8"}`, borderRadius: 10, padding: "6px 10px", minWidth: 88 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: data.budgets?.[cat.id] > 0 ? C.purple : C.muted }}>{data.currency === "USD" ? "US$" : "S/"}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={data.budgets?.[cat.id] || ""}
                    placeholder="0"
                    onChange={e => {
                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                      setData(p => ({ ...p, budgets: { ...p.budgets, [cat.id]: val } }));
                    }}
                    style={{ border: "none", background: "transparent", width: 58, fontSize: 14, fontWeight: 600, color: data.budgets?.[cat.id] > 0 ? C.purple : C.black, fontFamily: "inherit", textAlign: "right", outline: "none" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, padding: "0 4px" }}>
            Deja en 0 las categorías que no quieres controlar.
          </div>
          <div style={{ height: "calc(32px + env(safe-area-inset-bottom, 20px))" }} />
        </div>
      </div>
  );
}

export function AllCatsScreen({ subScreen, setSubScreen, fmt, setSelectedCatDetail }) {
  const data = useStore(s => s.data);
  return (
      <div style={subStyle(subScreen, "all-cats")}>
        {subHeader("Categorías", () => setSubScreen(null))}
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Total histórico por categoría</div>
          {buildCatMap(data.expenses).map((cat, i) => {
            const max = buildCatMap(data.expenses)[0]?.amount || 1;
            const pct = Math.round((cat.amount / max) * 100);
            return (
              <div key={cat.name} onClick={() => setSelectedCatDetail(cat)} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{cat.expenses.length} registro{cat.expenses.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.orange }}>-{fmt(cat.amount)}</div>
                </div>
                <div style={{ height: 6, background: "#F0EDE4", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? C.purple : C.orange, borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
          {buildCatMap(data.expenses).length === 0 && <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: 40 }}>Sin registros aún</div>}
          <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />
        </div>
      </div>
  );
}
