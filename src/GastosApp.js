import { useState, useEffect, useRef, useCallback } from "react";

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS = ["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];

function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function fmtWith(n, currency) { const sym = currency === "USD" ? "US$" : "S/"; return sym + Number(n).toLocaleString("es-PE"); }
function getToday() { const d = new Date(); return DAYS[d.getDay()].toUpperCase() + ", " + d.getDate() + " DE " + MONTHS[d.getMonth()].toUpperCase(); }
function getCurrentMonthLabel() { const d = new Date(); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
function getMonthLabel(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS[d.getMonth()] + " " + d.getFullYear(); }
function getMonthShort(offset) { const d = new Date(); d.setMonth(d.getMonth() + offset); return MONTHS_SHORT[d.getMonth()] + " " + d.getFullYear(); }

const MicIcon = ({ size = 48, color = "#fff" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const StopIcon = ({ size = 36, color = "#fff" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="5" y="5" width="14" height="14" rx="2"/></svg>);
const HomeIcon = ({ size = 24, color }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const CalIcon = ({ size = 24, color }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const PinIcon = ({ size = 24, color }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>);
const WalletIcon = ({ size = 24, color }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>);
const GearIcon = ({ size = 24, color }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const PlusIcon = ({ size = 22, color = "#fff" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const TrashIcon = ({ size = 18, color = "#bbb" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
const CheckIcon = ({ size = 22, color = "#fff" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);

const FIXED_DEFAULTS = [
  { name: "Gastos Comunes", type: "manual" },
  { name: "Antel", type: "debito" },
  { name: "UTE", type: "debito" },
  { name: "Impuesto de Puerta (c/2 meses)", type: "manual" },
  { name: "Tarjeta", type: "manual" },
  { name: "Psicologa", type: "manual" },
  { name: "Gym", type: "debito" },
  { name: "Seguro medico", type: "sueldo" },
  { name: "Alquiler", type: "manual" },
];

function initData() {
  return {
    expenses: [],
    fixed: FIXED_DEFAULTS.map(f => ({ id: genId(), name: f.name, type: f.type, amount: 0, paid: false, month: getCurrentMonthLabel() })),
    incomeFixed: [
      { id: genId(), name: "Sueldo del Diario", amount: 0, month: getCurrentMonthLabel() },
      { id: genId(), name: "Sueldo de Facultad", amount: 0, month: getCurrentMonthLabel() },
    ],
    incomeExtra: [],
    userName: "Andrea",
    currency: "PEN",
  };
}

const C = { red: "#E8461E", beige: "#F0EDE4", black: "#1A1A1A", green: "#2D8C46", yellow: "#F0A818", pink: "#E8308C", pinkBadge: "#E8308C", yellowBadge: "#D4950F", textMuted: "#8A8A80" };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #D4D0C8", fontSize: 15, fontFamily: "inherit", background: "#FAFAF5", boxSizing: "border-box" };
const cardStyle = { background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };

export default function App() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gastos-data');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return initData();
  });
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manAmt, setManAmt] = useState("");
  const [manDesc, setManDesc] = useState("");
  const [monthTab, setMonthTab] = useState(0);
  const [editFixed, setEditFixed] = useState(null);
  const [editFixedAmt, setEditFixedAmt] = useState("");
  const [editIncomeId, setEditIncomeId] = useState(null);
  const [editIncomeAmt, setEditIncomeAmt] = useState("");
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraAmt, setNewExtraAmt] = useState("");
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [newFixedName, setNewFixedName] = useState("");
  const [newFixedType, setNewFixedType] = useState("manual");
  const [editExtraId, setEditExtraId] = useState(null);
  const [editExtraName, setEditExtraName] = useState("");
  const [editExtraAmt, setEditExtraAmt] = useState("");
  const [editFixedIncomeName, setEditFixedIncomeName] = useState(null);
  const [editFixedIncomeNameVal, setEditFixedIncomeNameVal] = useState("");
  const [editFixedExpName, setEditFixedExpName] = useState(null);
  const [editFixedExpNameVal, setEditFixedExpNameVal] = useState("");
  const [editFixedExpType, setEditFixedExpType] = useState(null);
  const [editFixedExpTypeVal, setEditFixedExpTypeVal] = useState("");
  const [showAddFixedIncome, setShowAddFixedIncome] = useState(false);
  const [newFixedIncomeName, setNewFixedIncomeName] = useState("");
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const fmt = useCallback((n) => fmtWith(n, data.currency), [data.currency]);
  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2000); }, []);

  useEffect(() => {
    if (recording) { setRecTime(0); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // Save data to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('gastos-data', JSON.stringify(data)); } catch (e) {}
  }, [data]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const curMonth = getCurrentMonthLabel();
  const todayExp = data.expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);

  const getMonthData = (offset) => {
    const mk = getMonthLabel(offset);
    const exps = data.expenses.filter(e => e.month === mk);
    const fixd = data.fixed.filter(f => f.month === mk);
    const incF = data.incomeFixed.filter(i => i.month === mk);
    const incE = data.incomeExtra.filter(i => i.month === mk);
    const totalDiarios = exps.reduce((s, e) => s + e.amount, 0);
    const totalFijos = fixd.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
    const totalFijosAll = fixd.reduce((s, f) => s + f.amount, 0);
    const totalInc = incF.reduce((s, i) => s + i.amount, 0) + incE.reduce((s, i) => s + i.amount, 0);
    const balance = totalInc - totalFijos - totalDiarios;
    return { exps, totalDiarios, totalFijos, totalFijosAll, totalInc, balance };
  };

  const addExpense = (amt, desc) => {
    if (!amt || amt <= 0) return;
    const a = Number(amt); const d = desc || "Gasto diario";
    setConfirm({ message: `Registrar gasto de ${fmt(a)}?`, onConfirm: () => {
      setData(p => ({ ...p, expenses: [...p.expenses, { id: genId(), amount: a, description: d, date: new Date().toISOString(), month: curMonth }] }));
      showToast("Gasto registrado: " + fmt(a));
    }});
  };
  const deleteExpense = (id) => setConfirm({ message: "Eliminar este gasto?", onConfirm: () => { setData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) })); showToast("Gasto eliminado"); }});
  const togglePaid = (id) => setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, paid: !f.paid } : f) }));
  const saveFixedAmt = (id) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, amount: Number(editFixedAmt) || 0 } : f) })); setEditFixed(null); setEditFixedAmt(""); };
  const saveIncomeAmt = (id) => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.map(i => i.id === id ? { ...i, amount: Number(editIncomeAmt) || 0 } : i) })); setEditIncomeId(null); setEditIncomeAmt(""); };
  const addExtra = () => {
    if (!newExtraAmt || !newExtraName) return;
    const n = newExtraName; const a = Number(newExtraAmt);
    setConfirm({ message: `Agregar ingreso "${n}" por ${fmt(a)}?`, onConfirm: () => {
      setData(p => ({ ...p, incomeExtra: [...p.incomeExtra, { id: genId(), name: n, amount: a, month: curMonth }] }));
      setNewExtraName(""); setNewExtraAmt(""); setShowAddExtra(false);
      showToast("Ingreso extra agregado");
    }});
  };
  const deleteExtra = (id) => setConfirm({ message: "Eliminar este ingreso?", onConfirm: () => { setData(p => ({ ...p, incomeExtra: p.incomeExtra.filter(i => i.id !== id) })); showToast("Ingreso eliminado"); }});
  const deleteFixed = (id) => setConfirm({ message: "Eliminar este gasto fijo?", onConfirm: () => { setData(p => ({ ...p, fixed: p.fixed.filter(f => f.id !== id) })); showToast("Gasto fijo eliminado"); }});
  const saveFixedExpName = (id) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, name: editFixedExpNameVal } : f) })); setEditFixedExpName(null); setEditFixedExpNameVal(""); };
  const saveFixedExpType = (id, type) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, type } : f) })); setEditFixedExpType(null); };
  const deleteFixedIncome = (id) => setConfirm({ message: "Eliminar este ingreso fijo?", onConfirm: () => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.filter(i => i.id !== id) })); showToast("Ingreso fijo eliminado"); }});
  const saveFixedIncomeName = (id) => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.map(i => i.id === id ? { ...i, name: editFixedIncomeNameVal } : i) })); setEditFixedIncomeName(null); setEditFixedIncomeNameVal(""); };
  const addFixedIncome = () => {
    if (!newFixedIncomeName.trim()) return;
    const n = newFixedIncomeName.trim();
    setConfirm({ message: `Agregar "${n}" como ingreso fijo?`, onConfirm: () => {
      setData(p => ({ ...p, incomeFixed: [...p.incomeFixed, { id: genId(), name: n, amount: 0, month: curMonth }] }));
      setNewFixedIncomeName(""); setShowAddFixedIncome(false);
      showToast("Ingreso fijo agregado");
    }});
  };
  const saveExtraEdit = (id) => {
    setData(p => ({ ...p, incomeExtra: p.incomeExtra.map(i => i.id === id ? { ...i, name: editExtraName || i.name, amount: Number(editExtraAmt) || i.amount } : i) }));
    setEditExtraId(null); setEditExtraName(""); setEditExtraAmt("");
  };
  const handleRecord = () => {
    if (!recording) {
      setRecording(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast("Tu navegador no soporta grabacion de voz");
        setRecording(false);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        // Try to extract amount from speech
        const numMatch = transcript.match(/(\d[\d.,]*)/);
        let amount = 0;
        if (numMatch) {
          amount = parseFloat(numMatch[1].replace(",", "."));
        }
        // Extract description (remove numbers and currency words)
        let desc = transcript
          .replace(/(\d[\d.,]*)/g, "")
          .replace(/\b(soles?|dolares?|pesos?|mil|cien|ciento)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        // Handle "mil" multiplier
        if (/mil/i.test(transcript) && amount > 0 && amount < 1000) {
          amount = amount * 1000;
        }
        if (amount > 0) {
          addExpense(amount, desc || "Gasto por voz");
        } else {
          showToast("No entendi el monto. Dijiste: \"" + transcript + "\"");
        }
        setRecording(false);
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          showToast("No se detecto voz, intenta de nuevo");
        } else {
          showToast("Error de grabacion: " + event.error);
        }
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.start();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setRecording(false);
    }
  };
  const handleManual = () => { addExpense(Number(manAmt), manDesc); setManAmt(""); setManDesc(""); setShowManual(false); };
  const typeLabel = (t) => t === "manual" ? "Lo pago yo" : t === "debito" ? "Debito automatico" : "Descuento sueldo";
  const typeBg = (t) => t === "manual" ? C.yellowBadge : t === "debito" ? C.pinkBadge : "#7B68EE";

  const homeScreen = (
    <div style={{ flex: 1, background: C.red, minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 80 }}>
      <div style={{ padding: "48px 28px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, marginBottom: 6 }}>{getToday()}</div>
        <h1 style={{ fontSize: 42, fontWeight: 900, color: "#fff", margin: "0 0 4px", fontStyle: "italic", letterSpacing: -1 }}>Hola, {data.userName}.</h1>
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.8)", fontWeight: 400 }}>Que compraste ahora?</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "16px 0" }}>
        <button onClick={handleRecord} style={{ width: 140, height: 140, borderRadius: "50%", background: recording ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", boxShadow: recording ? "0 0 0 24px rgba(255,255,255,0.06)" : "none", animation: recording ? "pulse 1.4s ease-in-out infinite" : "none" }}>
          {recording ? <StopIcon size={44} /> : <MicIcon size={52} />}
        </button>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{recording ? "Grabando... " + recTime + "s" : "Toca para grabar"}</div>
      </div>
      <div style={{ padding: "0 28px 14px" }}>
        <button onClick={() => setShowManual(!showManual)} style={{ width: "100%", padding: "14px", borderRadius: 28, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.28)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{showManual ? "Cancelar" : "Ingresar manualmente"}</button>
      </div>
      {showManual && (
        <div style={{ padding: "0 28px 14px", animation: "slideUp 0.25s ease" }}>
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: 20 }}>
            <input type="number" placeholder="Monto" value={manAmt} onChange={e => setManAmt(e.target.value)} inputMode="decimal" style={{ ...inputStyle, color: C.black, marginBottom: 10 }} />
            <input type="text" placeholder="Descripcion (opcional)" value={manDesc} onChange={e => setManDesc(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 14 }} />
            <button onClick={handleManual} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.black, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar</button>
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", padding: "6px 0 24px" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: 1.5, marginBottom: 4 }}>HOY GASTASTE</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#fff" }}>{fmt(todayTotal)}</div>
      </div>
    </div>
  );

  const MiMesScreen = (() => {
    const mtabs = [{ label: "Este mes", val: 0 }, { label: getMonthShort(-1), val: -1 }, { label: getMonthShort(-2), val: -2 }, { label: "Historico", val: "hist" }];
    const d = monthTab === "hist" ? getMonthData(0) : getMonthData(monthTab);
    const isNeg = d.balance < 0;
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 12px" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Mi Mes</h1>
          <div style={{ borderBottom: "3px solid " + C.black, marginTop: 6, width: 70, marginBottom: 16 }} />
        </div>
        <div style={{ display: "flex", gap: 0, padding: "0 24px", marginBottom: 20, overflowX: "auto" }}>
          {mtabs.map(t => (
            <button key={t.label} onClick={() => setMonthTab(t.val)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: monthTab === t.val ? 700 : 500, color: monthTab === t.val ? C.black : C.textMuted, background: "none", border: "none", borderBottom: monthTab === t.val ? "2.5px solid " + C.black : "2.5px solid transparent", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        {monthTab === "hist" ? (
          <div style={{ padding: "0 24px" }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Gastos por mes</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
                {[-5,-4,-3,-2,-1,0].map(off => { const m = getMonthData(off); const total = m.totalDiarios + m.totalFijos; const max = 80000; const h = total > 0 ? Math.max((total / max) * 120, 6) : 4; return (
                  <div key={off} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600 }}>{total > 0 ? fmt(total) : ""}</div>
                    <div style={{ width: "100%", maxWidth: 32, height: h, background: off === 0 ? C.red : C.yellow, borderRadius: "4px 4px 2px 2px", opacity: total > 0 ? 1 : 0.2 }} />
                    <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{getMonthShort(off).split(" ")[0]}</span>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "0 24px", marginBottom: 16 }}>
              <div style={{ background: isNeg ? C.red : C.green, borderRadius: 20, padding: "28px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Balance del mes</div>
                <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>{fmt(Math.abs(d.balance))}</div>
                {isNeg && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>estas en rojo</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 24px", marginBottom: 20 }}>
              <div style={{ flex: 1, background: C.green, borderRadius: 14, padding: "14px 12px", color: "#fff" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Ingresos</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{fmt(d.totalInc)}</div>
              </div>
              <div style={{ flex: 1, background: C.yellow, borderRadius: 14, padding: "14px 12px", color: "#fff" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Gastos Fijos</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{fmt(d.totalFijosAll)}</div>
              </div>
              <div style={{ flex: 1, background: C.pink, borderRadius: 14, padding: "14px 12px", color: "#fff" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Diarios</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{fmt(d.totalDiarios)}</div>
              </div>
            </div>
            <div style={{ padding: "0 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Registros del mes</div>
              {d.exps.length === 0 && <div style={{ ...cardStyle, textAlign: "center", color: C.textMuted, fontSize: 14, padding: 24 }}>Sin gastos registrados</div>}
              {d.exps.map(e => { const dt = new Date(e.date); return (
                <div key={e.id} style={{ ...cardStyle, display: "flex", alignItems: "center", padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E8E4DA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.textMuted, marginRight: 14, flexShrink: 0 }}>{dt.getDate()}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{e.description}</div><div style={{ fontSize: 12, color: C.textMuted }}>{DAYS[dt.getDay()].toLowerCase().slice(0,3)}, {dt.getDate()} {MONTHS_SHORT[dt.getMonth()].toLowerCase()}.</div></div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>-{fmt(e.amount)}</div>
                </div>
              ); })}
            </div>
          </>
        )}
      </div>
    );
  })();

  const FijosScreen = (() => {
    const fixedCur = data.fixed.filter(f => f.month === curMonth);
    const totalAll = fixedCur.reduce((s, f) => s + f.amount, 0);
    const totalPaid = fixedCur.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Fijos</h1>
          <div style={{ borderBottom: "3px solid " + C.black, marginTop: 6, width: 50, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginBottom: 8 }}>Mensual</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: C.black }}>{fmt(totalAll)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 20, fontSize: 12, color: C.textMuted }}><span>Pagado: {fmt(totalPaid)}</span><span>|</span><span>Pendiente: {fmt(totalAll - totalPaid)}</span></div>
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
                    <div onClick={() => { setEditFixedExpName(f.id); setEditFixedExpNameVal(f.name); }} style={{ fontSize: 15, fontWeight: 700, color: C.black, textDecoration: f.paid ? "line-through" : "none", textDecorationColor: C.textMuted, cursor: "pointer" }}>{f.name}</div>
                  )}
                  {editFixedExpType === f.id ? (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      {["manual", "debito", "sueldo"].map(t => (
                        <button key={t} onClick={() => saveFixedExpType(f.id, t)} style={{
                          padding: "4px 8px", borderRadius: 6, border: "none",
                          background: f.type === t ? typeBg(t) : "#E8E4DA",
                          color: f.type === t ? "#fff" : C.textMuted,
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
                    <div onClick={() => { setEditFixed(f.id); setEditFixedAmt(f.amount > 0 ? String(f.amount) : ""); }} style={{ fontSize: 17, fontWeight: 800, color: f.amount > 0 ? C.black : C.textMuted, cursor: "pointer" }}>{f.amount > 0 ? fmt(f.amount) : "$0"}</div>
                  )}
                  <button onClick={() => deleteFixed(f.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
          {/* Add new fixed expense */}
          {!showAddFixed ? (
            <button onClick={() => setShowAddFixed(true)} style={{ width: "100%", padding: 16, borderRadius: 14, background: "transparent", border: "2px dashed #C8C4BC", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.textMuted, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
              <PlusIcon size={18} color={C.textMuted} /> Agregar gasto fijo
            </button>
          ) : (
            <div style={{ ...cardStyle, padding: 18, marginTop: 4, animation: "slideUp 0.25s ease" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.black, marginBottom: 12 }}>Nuevo gasto fijo</div>
              <input type="text" placeholder="Nombre (ej: Netflix)" value={newFixedName} onChange={e => setNewFixedName(e.target.value)} style={{ ...inputStyle, color: C.black, marginBottom: 10 }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tipo de pago</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["manual", "debito", "sueldo"].map(t => (
                  <button key={t} onClick={() => setNewFixedType(t)} style={{
                    flex: 1, padding: "9px 4px", borderRadius: 8, border: "2px solid",
                    borderColor: newFixedType === t ? typeBg(t) : "#E0DCD4",
                    background: newFixedType === t ? typeBg(t) : "transparent",
                    color: newFixedType === t ? "#fff" : C.textMuted,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}>{typeLabel(t)}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => {
                  if (!newFixedName.trim()) return;
                  const n = newFixedName.trim(); const t = newFixedType;
                  setConfirm({ message: `Agregar "${n}" como gasto fijo?`, onConfirm: () => {
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
    );
  })();

  const IngresosScreen = (() => {
    const totalInc = data.incomeFixed.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0) + data.incomeExtra.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0);
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Ingresos</h1>
          <div style={{ borderBottom: "3px solid " + C.black, marginTop: 6, width: 80, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginBottom: 4 }}>Total mensual</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.green }}>{fmt(totalInc)}</div>
        </div>
        <div style={{ padding: "24px 24px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos fijos</div>
            <button onClick={() => setShowAddFixedIncome(!showAddFixedIncome)} style={{ width: 34, height: 34, borderRadius: "50%", background: C.green, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon size={18} /></button>
          </div>
          {showAddFixedIncome && (
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12, animation: "slideUp 0.2s ease" }}>
              <input type="text" placeholder="Nombre (ej: Sueldo empresa)" value={newFixedIncomeName} onChange={e => setNewFixedIncomeName(e.target.value)} style={{ ...inputStyle, marginBottom: 12, color: C.black }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addFixedIncome} style={{ flex: 1, padding: 12, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Agregar</button>
                <button onClick={() => { setShowAddFixedIncome(false); setNewFixedIncomeName(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#E0DCD4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              </div>
            </div>
          )}
          {data.incomeFixed.filter(i => i.month === curMonth).map(i => (
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
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{i.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Mensual fijo - toca para editar nombre</div>
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
                    <button onClick={() => { setEditIncomeId(i.id); setEditIncomeAmt(i.amount > 0 ? String(i.amount) : ""); }} style={{ background: "none", border: "1.5px solid #D4D0C8", borderRadius: 10, padding: "8px 14px", fontSize: 14, fontWeight: 600, color: C.textMuted, cursor: "pointer", fontFamily: "inherit" }}>{i.amount > 0 ? fmt(i.amount) : "Agregar >"}</button>
                  )}
                  <button onClick={() => deleteFixedIncome(i.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos extra</div>
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveExtraEdit(i.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                    <button onClick={() => { setEditExtraId(null); setEditExtraName(""); setEditExtraAmt(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#E0DCD4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5E6A3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.yellow, marginRight: 14, flexShrink: 0 }}>{i.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExtraId(i.id); setEditExtraName(i.name); setEditExtraAmt(String(i.amount)); }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>Extra - toca para editar</div>
                  </div>
                  <span style={{ fontSize: 17, fontWeight: 800, color: C.green, marginRight: 8 }}>{fmt(i.amount)}</span>
                  <button onClick={() => deleteExtra(i.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                </div>
              )}
            </div>
          ))}
          {data.incomeExtra.filter(i => i.month === curMonth).length === 0 && !showAddExtra && <div style={{ ...cardStyle, textAlign: "center", color: C.textMuted, fontSize: 13, padding: 20 }}>Sin ingresos extra</div>}
        </div>
      </div>
    );
  })();

  const configScreen = (
    <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
      <div style={{ padding: "32px 24px 0" }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Config</h1>
        <div style={{ borderBottom: "3px solid " + C.black, marginTop: 6, width: 60, marginBottom: 20 }} />
      </div>
      <div style={{ padding: "0 24px" }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Nombre</div>
          <input style={{ ...inputStyle, color: C.black }} value={data.userName} onChange={e => setData(p => ({ ...p, userName: e.target.value }))} />
        </div>
        <div style={{ ...cardStyle, padding: 20, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Moneda</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ val: "PEN", label: "S/ Soles", flag: "PEN" }, { val: "USD", label: "US$ Dolares", flag: "USD" }].map(c => (
              <button key={c.val} onClick={() => setData(p => ({ ...p, currency: c.val }))} style={{
                flex: 1, padding: "14px 12px", borderRadius: 12, border: "2.5px solid",
                borderColor: data.currency === c.val ? C.green : "#D4D0C8",
                background: data.currency === c.val ? C.green + "12" : "#fff",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: data.currency === c.val ? C.green : C.textMuted }}>
                  {c.val === "PEN" ? "S/" : "US$"}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: data.currency === c.val ? C.green : C.textMuted }}>
                  {c.val === "PEN" ? "Soles" : "Dolares"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 20, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Datos</div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 2 }}>Gastos diarios: {data.expenses.length}<br/>Gastos fijos: {data.fixed.length}<br/>Ingresos: {data.incomeFixed.length + data.incomeExtra.length}</div>
        </div>
        <button onClick={() => setConfirm({ message: "Resetear todos los datos? Esta accion no se puede deshacer.", onConfirm: () => { setData(initData()); showToast("Datos reseteados"); }})} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.red, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 16 }}>Resetear datos</button>
      </div>
    </div>
  );

  const TABS = [{ id: "home", label: "Inicio", Icon: HomeIcon }, { id: "month", label: "Mi Mes", Icon: CalIcon }, { id: "fixed", label: "Fijos", Icon: PinIcon }, { id: "income", label: "Ingresos", Icon: WalletIcon }, { id: "config", label: "Config", Icon: GearIcon }];

  return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", maxWidth: 430, margin: "0 auto", position: "relative", background: tab === "home" ? C.red : C.beige }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input:focus { border-color: #E8461E !important; outline: none; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type="number"] { -moz-appearance: textfield; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: C.black, color: "#fff", padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, animation: "slideUp 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>{toast}</div>}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }} onClick={() => setConfirm(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 20, padding: "28px 24px 20px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease", fontFamily: "inherit" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.black, lineHeight: 1.5, marginBottom: 20, textAlign: "center" }}>{confirm.message}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={() => { confirm.onConfirm(); setConfirm(null); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: C.red, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {tab === "home" && homeScreen}
      {tab === "month" && MiMesScreen}
      {tab === "fixed" && FijosScreen}
      {tab === "income" && IngresosScreen}
      {tab === "config" && configScreen}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: tab === "home" ? "rgba(180,40,10,0.95)" : "#fff", borderTop: tab === "home" ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E0DCD4", display: "flex", justifyContent: "space-around", padding: "8px 0 14px", zIndex: 100, backdropFilter: "blur(12px)" }}>
        {TABS.map(t => { const active = tab === t.id; const color = tab === "home" ? (active ? "#fff" : "rgba(255,255,255,0.45)") : (active ? C.red : C.textMuted); return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 10px", color, fontSize: 10, fontWeight: active ? 700 : 500, fontFamily: "inherit", letterSpacing: 0.3 }}>
            <t.Icon size={22} color={color} />{t.label}
          </button>
        ); })}
      </nav>
    </div>
  );
}
