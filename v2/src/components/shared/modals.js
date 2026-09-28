import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { TrashIcon } from "./icons";
import { MONTHS_SHORT, DAYS } from "../../lib/dates";
import { genId, fmtWith } from "../../lib/format";
import { useStore } from "../../state/store";
import { PaymentMethodPicker } from "./PaymentMethodPicker";
import { hasLine, curOf } from "../../lib/cycles";
import { CategoryPicker } from "./CategoryPicker";

// Toast global — antes inline en GastosApp.
export function Toast({ toast }) {
  return <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: C.black, color: "#fff", padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, animation: "slideUp 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>{toast}</div>;
}

export function ScanResultsSheet({ scanResults, setScanResults, removeScanItem, updateScanItem, confirmScanResults, scanPm, setScanPm }) {
  const data = useStore(s => s.data);
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", background: C.beige, overflow: "auto" }}>
          <div style={{ padding: "48px 24px 16px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: C.black, fontStyle: "italic", margin: 0 }}>Gastos detectados</h2>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{scanResults.length} movimientos encontrados. Corrige la fecha si hace falta y elimina los que no quieras registrar.</p>
          </div>
          <div style={{ flex: 1, padding: "0 20px", overflowY: "auto" }}>
            {scanResults.map((r, i) => (
              <div key={i} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{r.description}</div>
                  <input
                    type="date"
                    value={r.date || ""}
                    onChange={e => updateScanItem(i, { date: e.target.value })}
                    style={{ ...inputStyle, width: "auto", marginTop: 4, padding: "5px 8px", fontSize: 12, color: C.black, background: "#fff" }}
                  />
                </div>
                <span style={{ fontSize: 17, fontWeight: 600, color: C.orange, marginRight: 10 }}>{fmtWith(r.amount, data.currency)}</span>
                <button onClick={() => removeScanItem(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon color="#ccc" /></button>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 20px 0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Medio de pago (aplica a todos)</div>
            <PaymentMethodPicker value={scanPm} onChange={setScanPm} />
          </div>
          <div style={{ padding: "16px 20px 32px", display: "flex", gap: 10 }}>
            <button onClick={() => setScanResults(null)} style={{ flex: 1, padding: 16, borderRadius: 14, background: "#E0DCD4", color: "#666", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={confirmScanResults} style={{ flex: 1, padding: 16, borderRadius: 14, background: C.green, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar todos</button>
          </div>
        </div>
  );
}

export function ConfirmModal({ confirm, setConfirm }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }} onClick={() => setConfirm(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 20, padding: "28px 24px 20px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease", fontFamily: "inherit" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.black, lineHeight: 1.5, marginBottom: 20, textAlign: "center" }}>{confirm.message}</div>
            {confirm.secondary && (
              <button onClick={() => confirm.secondary.onClick()} style={{ width: "100%", marginBottom: 10, padding: 13, borderRadius: 12, background: C.purpleSoft, color: C.purple, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{confirm.secondary.label}</button>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={() => { confirm.onConfirm(); setConfirm(null); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: C.purple, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
            </div>
          </div>
        </div>
  );
}

export function CatDetailSheet({ selectedCatDetail, setSelectedCatDetail, fmt }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 350 }} onClick={() => setSelectedCatDetail(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.beige, borderRadius: "24px 24px 0 0", maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#D4D0C8", borderRadius: 2, margin: "12px auto 0" }} />
            <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{selectedCatDetail.emoji}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE }}>{selectedCatDetail.name}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{selectedCatDetail.expenses.length} registros · {fmt(selectedCatDetail.amount)}</div>
              </div>
            </div>
            <div style={{ padding: "8px 16px 32px" }}>
              {[...selectedCatDetail.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                const dt = new Date(e.date);
                return (
                  <div key={e.id} style={{ ...cardStyle, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.purple, flexShrink: 0 }}>{dt.getDate()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.black }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{DAYS[dt.getDay()].toLowerCase().slice(0,3)}, {dt.getDate()} {MONTHS_SHORT[dt.getMonth()].toLowerCase()}. {dt.getFullYear()}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>-{curOf(e) === "USD" ? fmtWith(e.amount, "USD") : fmt(e.amount)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
  );
}

export function AddExpenseModal({ setShowAddModal, handleRecord, setShowManual, setShowScanOptions, scanLoading }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowAddModal(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", animation: "slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 4 }}>¿Cómo registras?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Elige una opción para agregar un gasto</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Voz */}
              <button onClick={() => { setShowAddModal(false); handleRecord(); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, background: C.beige, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎙️</div>
                <div><div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Grabar por voz</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Di el monto y descripción</div></div>
              </button>
              {/* Manual */}
              <button onClick={() => { setShowAddModal(false); setShowManual(true); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, background: C.beige, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⌨️</div>
                <div><div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Escribir manualmente</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Ingresa monto y descripción</div></div>
              </button>
              {/* Cámara */}
              <button onClick={() => { setShowAddModal(false); setShowScanOptions(true); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, background: C.beige, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📷</div>
                <div><div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Subir captura</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{scanLoading ? "Analizando imagen..." : "Escanea un comprobante con IA"}</div></div>
              </button>
            </div>
          </div>
        </div>
  );
}

export function ScanOptionsModal({ setShowScanOptions, cameraInputRef, fileInputRef }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowScanOptions(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.black, marginBottom: 16 }}>Seleccionar imagen</div>
            <button onClick={() => { cameraInputRef.current?.click(); setShowScanOptions(false); }} style={{ width: "100%", padding: "15px 20px", background: C.beige, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, color: C.black, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 10 }}>📸 Tomar foto</button>
            <button onClick={() => { fileInputRef.current?.click(); setShowScanOptions(false); }} style={{ width: "100%", padding: "15px 20px", background: C.beige, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, color: C.black, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>🖼️ Elegir de galería</button>
          </div>
        </div>
  );
}

export function ManualModal({ manAmt, setManAmt, manDesc, setManDesc, setShowManual, openCatPicker }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowManual(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 20 }}>Nuevo gasto</div>
            <input type="number" placeholder="0.00" value={manAmt} onChange={e => setManAmt(e.target.value)} inputMode="decimal" autoFocus style={{ ...inputStyle, color: C.black, fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 12, padding: "16px" }} />
            <input type="text" placeholder="Descripción (ej: Almuerzo)" value={manDesc} onChange={e => setManDesc(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 16 }} />
            <button onClick={() => { if (!manAmt || Number(manAmt) <= 0) return; openCatPicker(Number(manAmt), manDesc || "Gasto"); setShowManual(false); }} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.purple, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Elegir categoría →</button>
            <button onClick={() => setShowManual(false)} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </div>
  );
}

export function RecordingOverlay({ recTime, setRecording, recognitionRef }) {
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => { if (recognitionRef.current) { recognitionRef.current.onend = () => setRecording(false); try { recognitionRef.current.stop(); } catch(e) {} } setRecording(false); }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 24, padding: "32px 28px", textAlign: "center", width: 280, animation: "slideUp 0.25s ease" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.black, marginBottom: 4 }}>Grabando...</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Ej: "Almuerzo cuarenta soles"</div>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.purpleSoft, border: "3px solid " + C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 16px", animation: "pulse 1.4s ease-in-out infinite" }}>🎙️</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.purple, marginBottom: 20 }}>{recTime}s</div>
            <button onClick={() => { if (recognitionRef.current) { recognitionRef.current.onend = () => setRecording(false); try { recognitionRef.current.stop(); } catch(e) {} } setRecording(false); }} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </div>
  );
}

export function NameSetupScreen({ nameSetupValue, setNameSetupValue, setShowNameSetup }) {
  const setData = useStore(s => s.setData);
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 450, background: C.beige, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>👋</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.black, fontStyle: "italic", marginBottom: 8, textAlign: "center", fontFamily: FONT_TITLE }}>¿Cómo te llamas?</div>
          <div style={{ fontSize: 15, color: C.muted, marginBottom: 36, textAlign: "center", lineHeight: 1.5 }}>Tu nombre aparecerá en el inicio del app.</div>
          <input
            autoFocus
            value={nameSetupValue}
            onChange={e => setNameSetupValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && nameSetupValue.trim()) { setData(p => ({ ...p, userName: nameSetupValue.trim() })); setShowNameSetup(false); } }}
            placeholder="Tu nombre"
            style={{ ...inputStyle, width: "100%", maxWidth: 320, fontSize: 20, padding: "16px 20px", textAlign: "center", color: C.black, marginBottom: 20, borderRadius: 16 }}
          />
          <button
            onClick={() => { if (nameSetupValue.trim()) { setData(p => ({ ...p, userName: nameSetupValue.trim() })); setShowNameSetup(false); } }}
            disabled={!nameSetupValue.trim()}
            style={{ width: "100%", maxWidth: 320, padding: 16, borderRadius: 16, background: nameSetupValue.trim() ? C.purple : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: nameSetupValue.trim() ? "pointer" : "default", fontFamily: "inherit" }}
          >
            Continuar →
          </button>
        </div>
  );
}

export function CatPickerModal({ setShowCatPicker, pendingExpAmt, pendingExpDesc, pendingExpCat, setPendingExpCat, pendingExpPm, setPendingExpPm, pendingExpDate, setPendingExpDate, pendingExpSub, setPendingExpSub, pendingExpCur, setPendingExpCur, registerExpense }) {
  const data = useStore(s => s.data);
  // Selector de moneda (F10): solo tiene sentido si el medio de pago elegido es
  // una tarjeta con línea en dólares. Por defecto, soles.
  const pmSel = (data.paymentMethods || []).find(m => m.id === pendingExpPm);
  const puedeUsd = hasLine(pmSel, "USD");
  const cur = puedeUsd && pendingExpCur === "USD" ? "USD" : "PEN";
  // Si cambia a un medio sin dólares, el gasto vuelve a soles solo.
  const elegirPm = (id) => {
    setPendingExpPm(id);
    const nuevo = (data.paymentMethods || []).find(m => m.id === id);
    if (!hasLine(nuevo, "USD") && setPendingExpCur) setPendingExpCur("PEN");
  };
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 310 }} onClick={() => setShowCatPicker(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 4 }}>¿En qué categoría?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: puedeUsd ? 12 : 20 }}>{pendingExpDesc} · {fmtWith(pendingExpAmt, cur === "USD" ? "USD" : data.currency)}</div>
            {/* Moneda del gasto: aparece solo si la tarjeta elegida maneja dólares */}
            {puedeUsd && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", flex: 1 }}>Moneda del gasto</div>
                {[{ id: "PEN", label: "S/" }, { id: "USD", label: "US$" }].map(o => {
                  const sel = cur === o.id;
                  return (
                    <button key={o.id} onClick={() => setPendingExpCur(o.id)} style={{ padding: "7px 16px", borderRadius: 20, border: "2px solid", borderColor: sel ? C.purple : "#E0DCD4", background: sel ? C.purple + "1A" : "#fff", color: sel ? C.purple : C.black, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{o.label}</button>
                  );
                })}
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <CategoryPicker
                value={pendingExpCat}
                onChange={setPendingExpCat}
                subValue={pendingExpSub}
                onSubChange={setPendingExpSub}
              />
            </div>
            {/* Fecha — compacta, en la misma tira que el medio de pago */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Fecha</div>
              <input
                type="date"
                value={pendingExpDate}
                onChange={e => setPendingExpDate(e.target.value)}
                style={{ ...inputStyle, width: "auto", flex: "0 1 auto", padding: "8px 12px", fontSize: 14, color: C.black }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Medio de pago</div>
            <div style={{ marginBottom: 22 }}>
              <PaymentMethodPicker value={pendingExpPm} onChange={elegirPm} />
            </div>
            <button onClick={() => registerExpense(pendingExpAmt, pendingExpDesc, pendingExpCat, pendingExpDate, pendingExpSub)} disabled={!pendingExpCat} style={{ width: "100%", padding: 16, borderRadius: 14, background: pendingExpCat ? C.purple : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: pendingExpCat ? "pointer" : "default", fontFamily: "inherit", marginBottom: 10, transition: "background 0.2s" }}>Confirmar gasto</button>
            <button onClick={() => registerExpense(pendingExpAmt, pendingExpDesc, null, pendingExpDate, null)} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sin categoría</button>
          </div>
        </div>
  );
}

export function NotifPanel({ setShowNotifPanel, budgetAlerts }) {
  return (
        <div onClick={() => setShowNotifPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(60,45,180,0.5)", backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "24px 24px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)", animation: "slideUp 0.3s ease", paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ width: 40, height: 4, background: "#D4D0C8", borderRadius: 2, margin: "12px auto 0" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid #F0EDE4" }}>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 900, color: C.black }}>Notificaciones</div>
              {budgetAlerts.length > 0 && <button onClick={() => setShowNotifPanel(false)} style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>}
            </div>
            <div style={{ padding: "12px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
              {budgetAlerts.length === 0 ? (
                <>
                  <div style={{ background: "#F0FAF4", border: "1.5px solid rgba(27,107,58,0.25)", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>✅</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Todo bajo control</div>
                      <div style={{ fontSize: 12, color: C.greenLight, marginTop: 3 }}>Tus categorías están dentro del presupuesto este mes.</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "20px 16px", color: C.muted, fontSize: 13 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
                    Te avisaremos cuando alguna categoría supere el 80% de tu límite mensual.
                  </div>
                </>
              ) : (
                budgetAlerts.map(({ cat, limit, spent, pct }) => {
                  const isDanger = pct >= 100;
                  const bg = isDanger ? "#FFF1EE" : "#FFFBEB";
                  const border = isDanger ? "rgba(232,86,30,0.3)" : "rgba(217,119,6,0.3)";
                  const titleColor = isDanger ? "#9A3412" : "#92400E";
                  const subColor = isDanger ? "#C2410C" : "#B45309";
                  const barColor = isDanger ? "linear-gradient(90deg,#C2410C,#E8561E)" : "linear-gradient(90deg,#D97706,#F59E0B)";
                  const badgeBg = isDanger ? "rgba(232,86,30,0.14)" : "rgba(217,119,6,0.14)";
                  return (
                    <div key={cat.id} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{isDanger ? "🚨" : "⚠️"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: titleColor }}>{cat.emoji} {cat.name} — {isDanger ? "te pasaste" : "casi al límite"}</div>
                        <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>
                          {isDanger ? `Gastaste S/ ${spent.toLocaleString("es-PE")} de S/ ${limit.toLocaleString("es-PE")}. Excediste S/ ${(spent - limit).toLocaleString("es-PE")}.` : `S/ ${spent.toLocaleString("es-PE")} de S/ ${limit.toLocaleString("es-PE")}. Te quedan S/ ${(limit - spent).toLocaleString("es-PE")}.`}
                        </div>
                        <div style={{ marginTop: 8, height: 5, background: "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, background: badgeBg, borderRadius: 8, padding: "4px 9px", fontFamily: FONT_TITLE, fontSize: 13, fontWeight: 900, color: titleColor, alignSelf: "center" }}>{pct}%</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
  );
}

export function CarryoverModal({
  prevMonthBalance, prevMonthLabel, prevMonthName, curMonthName, curMonth,
  carryoverSlide, setCarryoverSlide, setShowCarryoverModal, fmt, showToast,
}) {
  const setData = useStore(s => s.setData);
        const hasPrevBal = prevMonthBalance > 0;
        const dismissCarryover = () => {
          try {
            localStorage.setItem('qori-balance-carryover-seen-v1', '1');
            localStorage.setItem('qori-last-carryover-month', curMonth);
          } catch(e) {}
          setShowCarryoverModal(false);
        };
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 510, background: "rgba(20,18,40,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))", animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
              <div style={{ width: 40, height: 4, background: "#D4D0C8", borderRadius: 2, margin: "14px auto 0" }} />
              {/* dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 14 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ height: 6, borderRadius: 3, background: carryoverSlide === i ? C.purple : "#D4D0C8", width: carryoverSlide === i ? 20 : 6, transition: "all 0.25s" }} />
                ))}
              </div>

              {/* SLIDE 0 — el aviso */}
              {carryoverSlide === 0 && (
                <div style={{ padding: "0 24px 8px" }}>
                  <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "20px auto 18px", boxShadow: `0 8px 24px rgba(108,92,231,0.3)` }}>🔧</div>
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <span style={{ background: C.beige, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: 0.5, textTransform: "uppercase" }}>✅ Mejora</span>
                  </div>
                  <div style={{ fontFamily: FONT_TITLE, fontSize: 26, fontWeight: 900, color: C.black, letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 12, textAlign: "center" }}>Corregimos algo<br/>importante</div>
                  <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.65, textAlign: "center", marginBottom: 18 }}>
                    Si cambiaste de mes y notaste que tu <strong style={{ color: C.black }}>balance quedó en cero</strong>, era un error nuestro. Ya lo corregimos.
                  </div>
                  <div style={{ background: "#FFF4F0", border: "1.5px solid #FFD8CC", borderRadius: 14, padding: "13px 15px", display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 22 }}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>⚠️</span>
                    <div style={{ fontSize: 13, color: "#8A4A38", lineHeight: 1.5 }}>
                      <strong style={{ color: "#5C2D1E" }}>Lo que pasaba:</strong> al iniciar un mes nuevo, Qori no traía tu saldo anterior — empezaba desde cero como si nada hubiera pasado.
                    </div>
                  </div>
                  <button onClick={() => setCarryoverSlide(1)} style={{ width: "100%", padding: 16, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px rgba(108,92,231,0.3)` }}>
                    Entendido, ¿y ahora? →
                  </button>
                </div>
              )}

              {/* SLIDE 1 — con balance previo positivo */}
              {carryoverSlide === 1 && hasPrevBal && (
                <div style={{ padding: "0 24px 8px" }}>
                  <div style={{ fontSize: 52, textAlign: "center", margin: "16px 0 4px" }}>💰</div>
                  <div style={{ fontFamily: FONT_TITLE, fontSize: 26, fontWeight: 900, color: C.black, letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 10 }}>Tu saldo de {prevMonthName},<br/>en {curMonthName}</div>
                  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
                    De ahora en adelante esto ocurre automático. Pero como este mes fue el primero con la corrección, <strong style={{ color: C.black }}>¿quieres que traigamos tu saldo de {prevMonthName} a {curMonthName}?</strong> Este sería el monto:
                  </div>
                  {/* tarjeta balance */}
                  <div style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📅</div>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginBottom: 3 }}>Tu balance de</div>
                      <div style={{ fontFamily: FONT_TITLE, fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{fmt(prevMonthBalance)}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{prevMonthLabel}</div>
                    </div>
                  </div>
                  {/* CTAs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={() => {
                      setData(p => ({ ...p, incomeExtra: [...p.incomeExtra, { id: genId(), name: "Saldo mes anterior", amount: Math.round(prevMonthBalance), month: curMonth }] }));
                      dismissCarryover();
                      showToast("Saldo de " + prevMonthLabel + " agregado ✓");
                    }} style={{ width: "100%", padding: 16, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px rgba(108,92,231,0.3)` }}>
                      💸 Agregar mi saldo de {prevMonthName}
                    </button>
                    <button onClick={dismissCarryover} style={{ width: "100%", padding: 14, background: "transparent", border: "2px solid #D4D0C8", borderRadius: 16, fontSize: 14, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                      Ya lo tengo registrado
                    </button>
                  </div>
                </div>
              )}

              {/* SLIDE 1 — sin balance previo */}
              {carryoverSlide === 1 && !hasPrevBal && (
                <div style={{ padding: "0 24px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 52, margin: "16px 0 6px" }}>🎉</div>
                  <div style={{ fontFamily: FONT_TITLE, fontSize: 26, fontWeight: 900, color: C.black, letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 12 }}>Ya está corregido</div>
                  <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.65, marginBottom: 18, textAlign: "center" }}>
                    De ahora en adelante, al iniciar un mes nuevo tu saldo se suma automáticamente. No tienes que hacer nada.
                  </div>
                  <div style={{ background: C.purpleSoft, borderRadius: 12, padding: "12px 14px", marginBottom: 22, textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
                    <div style={{ fontSize: 12, color: "#4A3FA0", lineHeight: 1.5 }}>
                      Desde el próximo mes verás un ingreso llamado <strong style={{ color: C.purple }}>"Saldo mes anterior"</strong> que se agrega solo al inicio de cada mes.
                    </div>
                  </div>
                  <button onClick={dismissCarryover} style={{ width: "100%", padding: 16, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, border: "none", borderRadius: 16, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px rgba(108,92,231,0.3)` }}>
                    Entendido 👍
                  </button>
                </div>
              )}
            </div>
          </div>
        );
}

export function BudgetFeatureModal({ setShowBudgetFeatureModal, setSubScreen }) {
  const setTab = useStore(s => s.setTab);
  return (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(40,30,120,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))", animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
            <div style={{ width: 40, height: 4, background: "#D4D0C8", borderRadius: 2, margin: "14px auto 0" }} />
            {/* Hero banner */}
            <div style={{ margin: "20px 20px 0", background: `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`, borderRadius: 20, padding: "24px 22px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ position: "absolute", bottom: -20, left: 40, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14 }}>✨ Nuevo en Qori</div>
              <div style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 10 }}>Controla tu<br/>presupuesto</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>Define cuánto quieres gastar por categoría y Qori te avisa cuando te estás pasando.</div>
            </div>
            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 20px 0" }}>
              {[
                { icon: "🎯", bg: C.purpleSoft, title: "Límites por categoría", desc: "Comida S/300 · Transporte S/200 · lo que tú quieras." },
                { icon: "🔔", bg: "#FEE8E0", title: "Alertas antes de pasarte", desc: "Te notificamos cuando llegás al 80% y cuando superás el límite." },
                { icon: "📊", bg: "#E8F5EE", title: "Seguimiento en tiempo real", desc: "Barras de progreso en Mi Mes para ver de un vistazo cómo vas." },
              ].map(f => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 14, background: C.beige, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.black }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* CTAs */}
            <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => {
                try { localStorage.setItem('qori-budget-feature-seen-v2', '1'); } catch(e) {}
                setShowBudgetFeatureModal(false);
                setTab("config");
                setTimeout(() => setSubScreen("presupuestos"), 300);
              }} style={{ width: "100%", padding: 16, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 20px rgba(108,92,231,0.35)` }}>
                Configurar presupuesto →
              </button>
              <button onClick={() => {
                try { localStorage.setItem('qori-budget-feature-seen-v2', '1'); } catch(e) {}
                setShowBudgetFeatureModal(false);
              }} style={{ width: "100%", padding: 14, background: "transparent", border: "none", fontSize: 14, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                Ahora no
              </button>
            </div>
          </div>
        </div>
  );
}
