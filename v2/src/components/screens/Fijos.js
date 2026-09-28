import { useState } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { CheckIcon, PlusIcon, TrashIcon } from "../shared/icons";
import { subStyle, subHeader } from "../shared/subnav";
import { genId } from "../../lib/format";
import { buildCatMap, getMonthData } from "../../state/selectors";
import { getMonthLabel, getMonthShort } from "../../lib/dates";
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
  addSubcat, saveSubcatEdit, deleteSubcat,
}) {
  const data = useStore(s => s.data);
    const cats = data.categories?.[type] || [];
    // Subcategorías solo en gastos: son el detalle de "en qué exactamente se fue la plata".
    const withSubs = type === "gastos" && addSubcat;
    const [openCat, setOpenCat] = useState(null);
    const [newSubName, setNewSubName] = useState("");
    const [subEditId, setSubEditId] = useState(null);
    const [subEditName, setSubEditName] = useState("");
    const toggleOpen = (id) => { setOpenCat(prev => prev === id ? null : id); setNewSubName(""); setSubEditId(null); };
    // Ojo: subStyle recibe (subScreen, id). Se estaba pasando solo el id, asi que
    // id quedaba undefined, la comparacion nunca daba true y esta pantalla se
    // quedaba fuera de cuadro (translateX(100%)): no se podia abrir.
    return (
      <div style={subStyle(subScreen, `cats-${type === "gastos" ? "gasto" : "ingreso"}`)}>
        {subHeader(title, () => { setSubScreen(null); setCatEditId(null); setShowAddCat(null); setOpenCat(null); })}
        <div style={{ fontSize: 13, color: C.muted, padding: "0 20px 12px" }}>Toca el nombre o emoji para editar.{withSubs ? " Abre una categoría para ver sus subcategorías." : ""}</div>
        <div style={{ margin: "0 16px" }}>
          {cats.map((c, i) => {
            const subs = Array.isArray(c.subcategories) ? c.subcategories : [];
            const isOpen = withSubs && openCat === c.id;
            const isLast = i === cats.length - 1 && showAddCat !== type;
            return (
            <div key={c.id} style={{ background: "#fff", borderRadius: i === 0 ? (isLast ? "14px" : "14px 14px 0 0") : isLast ? "0 0 14px 14px" : 0, borderBottom: isLast ? "none" : "1px solid #F0EDE4" }}>
            <div style={{ ...catRowStyle, borderBottom: "none" }}>
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
                  <div onClick={() => { setCatEditId(c.id); setCatEditEmoji(c.emoji); setCatEditName(c.name); }} style={{ flex: 1, cursor: "pointer" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{c.name}</div>
                    {withSubs && subs.length > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subs.length} subcategoría{subs.length !== 1 ? "s" : ""}</div>}
                  </div>
                  {withSubs && (
                    <button onClick={() => toggleOpen(c.id)} style={{ background: isOpen ? C.purpleSoft : "#F5F2EC", color: C.purple, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{isOpen ? "Listo" : "Detalle"}</button>
                  )}
                  <button onClick={() => deleteCat(type, c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#bbb", fontSize: 18 }}>✕</button>
                </>
              )}
            </div>
            {isOpen && (
              <div style={{ padding: "0 16px 14px 72px" }}>
                {subs.length === 0 && <div style={{ fontSize: 12, color: C.muted, paddingBottom: 8 }}>Sin subcategorías todavía. Son solo detalle: no llevan presupuesto propio.</div>}
                {subs.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                    {subEditId === s.id ? (
                      <>
                        <input value={subEditName} onChange={e => setSubEditName(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 13, color: C.black }} onKeyDown={e => { if (e.key === "Enter") { saveSubcatEdit(type, c.id, s.id, subEditName); setSubEditId(null); } }} />
                        <button onClick={() => { saveSubcatEdit(type, c.id, s.id, subEditName); setSubEditId(null); }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>OK</button>
                        <button onClick={() => setSubEditId(null)} style={{ background: "#E0DCD4", color: "#666", border: "none", borderRadius: 8, padding: "7px 9px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ color: C.muted, fontSize: 13 }}>·</span>
                        <div onClick={() => { setSubEditId(s.id); setSubEditName(s.name); }} style={{ flex: 1, fontSize: 14, color: C.black, cursor: "pointer" }}>{s.name}</div>
                        <button onClick={() => deleteSubcat(type, c.id, s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#bbb", fontSize: 16 }}>✕</button>
                      </>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nueva subcategoría" style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 13, color: C.black }} onKeyDown={e => { if (e.key === "Enter") { addSubcat(type, c.id, newSubName); setNewSubName(""); } }} />
                  <button onClick={() => { addSubcat(type, c.id, newSubName); setNewSubName(""); }} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "7px 13px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                </div>
              </div>
            )}
            </div>
            );
          })}
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
  const [editCat, setEditCat] = useState(null);
  const [editVal, setEditVal] = useState("");

  const budgets = data.budgets || {};
  const { totalInc, totalFijosAll } = getMonthData(data, 0);
  const disponible = totalInc - totalFijosAll;
  const totalAsignado = Object.values(budgets).reduce((s, v) => s + (Number(v) || 0), 0);
  const sinAsignar = disponible - totalAsignado;
  const sliderMax = Math.max(500, Math.ceil(Math.max(disponible, 0) / 100) * 100);

  // Presupuestadas primero, el resto después (sort estable mantiene el orden original dentro de cada grupo)
  const cats = [...(data.categories?.gastos || [])].sort((a, b) => (budgets[b.id] > 0 ? 1 : 0) - (budgets[a.id] > 0 ? 1 : 0));

  const setBudget = (catId, val) => {
    const v = Math.max(0, Number(val) || 0);
    setData(p => {
      const nb = { ...p.budgets };
      if (v > 0) nb[catId] = v; else delete nb[catId];
      return { ...p, budgets: nb };
    });
  };
  const commitEdit = (catId) => {
    setBudget(catId, editVal === "" ? 0 : Number(editVal));
    setEditCat(null);
  };

  return (
      <div style={subStyle(subScreen, "presupuestos")}>
        <style>{`
          .qori-range { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 4px; outline: none; cursor: pointer; margin: 0; accent-color: ${C.purple}; }
          .qori-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: ${C.purple}; border: 3px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.25); cursor: pointer; }
          .qori-range::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: ${C.purple}; border: 3px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,0.25); cursor: pointer; }
        `}</style>
        {subHeader("Presupuestos", () => { setSubScreen(null); setEditCat(null); })}
        {/* Header de contexto: sticky justo debajo del subHeader (102px de alto) */}
        <div style={{ position: "sticky", top: 102, zIndex: 9, background: C.beige, padding: "0 16px 10px" }}>
          <div style={{ ...cardStyle, padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 8, fontSize: 12, color: C.muted, fontWeight: 500 }}>
              <span>Ingresos del mes: {fmt(totalInc)}</span><span>−</span><span>Fijos: {fmt(totalFijosAll)}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 8 }}>Disponible para presupuestar</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE, lineHeight: 1.15 }}>{fmt(disponible)}</div>
            <div style={{ borderTop: "1px solid #F0EDE4", marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Sin asignar:</span>
                <span style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT_TITLE, color: sinAsignar >= 0 ? C.green : C.orange }}>{sinAsignar < 0 ? "−" + fmt(Math.abs(sinAsignar)) : fmt(sinAsignar)}</span>
              </div>
              {sinAsignar < 0 && (
                <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, lineHeight: 1.5, marginTop: 4 }}>
                  Asignaste {fmt(Math.abs(sinAsignar))} más de lo que tienes disponible. Baja algún límite o ajusta tus ingresos.
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: "0 16px 8px" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Mueve el slider o toca el monto para definir cuánto quieres gastar por categoría. Te avisaremos cuando llegues al 80%.
          </div>
          <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
            {cats.map((cat, i, arr) => {
              const budget = budgets[cat.id] || 0;
              const spent = catSpend[cat.id] || 0;
              const pct = sliderMax > 0 ? Math.min(100, (budget / sliderMax) * 100) : 0;
              return (
                <div key={cat.id} style={{ padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid #F0EDE4" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.black }}>{cat.name}</div>
                      {spent > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Este mes: {fmt(spent)}</div>}
                    </div>
                    {editCat === cat.id ? (
                      <input
                        type="number" inputMode="decimal" autoFocus value={editVal} placeholder="0"
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => commitEdit(cat.id)}
                        onKeyDown={e => e.key === "Enter" && commitEdit(cat.id)}
                        style={{ ...inputStyle, width: 90, padding: "6px 10px", fontSize: 15, fontWeight: 700, color: C.purple, fontFamily: FONT_TITLE, textAlign: "right" }}
                      />
                    ) : (
                      <div onClick={() => { setEditCat(cat.id); setEditVal(budget > 0 ? String(budget) : ""); }} style={{ fontSize: 17, fontWeight: 800, fontFamily: FONT_TITLE, color: budget > 0 ? C.purple : C.muted, cursor: "pointer", padding: "4px 2px" }}>
                        {budget > 0 ? fmt(budget) : "Sin límite"}
                      </div>
                    )}
                  </div>
                  <input
                    type="range" className="qori-range" min={0} max={sliderMax} step={10} value={budget}
                    onChange={e => setBudget(cat.id, Number(e.target.value))}
                    style={{ background: `linear-gradient(to right, ${C.purple} 0%, ${C.purple} ${pct}%, #E8E4DA ${pct}%, #E8E4DA 100%)` }}
                  />
                </div>
              );
            })}
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
  // Por mes: el total histórico no dice nada sobre cómo se repartió el gasto.
  const [monthOff, setMonthOff] = useState(0);
  const tabs = [
    { label: "Este mes", val: 0 },
    { label: getMonthShort(-1).split(" ")[0], val: -1 },
    { label: getMonthShort(-2).split(" ")[0], val: -2 },
    { label: "Todo", val: "all" },
  ];
  const exps = monthOff === "all"
    ? data.expenses
    : data.expenses.filter(e => e.month === getMonthLabel(monthOff));
  const cats = buildCatMap(exps);
  const total = cats.reduce((s, c) => s + c.amount, 0);
  const max = cats[0]?.amount || 1;
  const rotulo = monthOff === "all" ? "Todo el histórico" : getMonthLabel(monthOff);

  return (
      <div style={subStyle(subScreen, "all-cats")}>
        {subHeader("Categorías", () => setSubScreen(null))}
        <div style={{ display: "flex", gap: 0, padding: "0 16px", marginBottom: 14, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.label} onClick={() => setMonthOff(t.val)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: monthOff === t.val ? 700 : 500, color: monthOff === t.val ? C.purple : C.muted, background: "none", border: "none", borderBottom: monthOff === t.val ? "2.5px solid " + C.purple : "2.5px solid transparent", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ padding: "0 16px" }}>
          <div style={{ ...cardStyle, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>{rotulo}</div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 30, fontWeight: 900, color: C.black, marginTop: 2 }}>{fmt(total)}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{exps.length} gasto{exps.length !== 1 ? "s" : ""} en {cats.length} categoría{cats.length !== 1 ? "s" : ""}</div>
          </div>
          {cats.map((cat, i) => {
            const pct = Math.round((cat.amount / max) * 100);
            const share = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
            return (
              <div key={cat.name} onClick={() => setSelectedCatDetail(cat)} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{cat.expenses.length} registro{cat.expenses.length !== 1 ? "s" : ""} · {share}% del total</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.orange }}>-{fmt(cat.amount)}</div>
                </div>
                <div style={{ height: 6, background: "#F0EDE4", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? C.purple : C.orange, borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
          {cats.length === 0 && <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: 40 }}>Sin gastos en {rotulo.toLowerCase()}</div>}
          <div style={{ height: "calc(40px + env(safe-area-inset-bottom, 20px))" }} />
        </div>
      </div>
  );
}

