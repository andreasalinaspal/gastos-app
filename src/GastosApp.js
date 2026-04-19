import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

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
const CameraIcon = ({ size = 22, color = "#fff" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>);

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

const DEFAULT_CATS_GASTOS = [
  { emoji: "🍽️", name: "Comida" }, { emoji: "🚌", name: "Transporte" }, { emoji: "🏠", name: "Hogar" },
  { emoji: "💊", name: "Salud" }, { emoji: "🏋️", name: "Deporte" }, { emoji: "🎉", name: "Ocio" },
  { emoji: "🛍️", name: "Compras" }, { emoji: "💄", name: "Estética" }, { emoji: "📚", name: "Educación" },
  { emoji: "📱", name: "Suscripciones" }, { emoji: "✈️", name: "Viajes" }, { emoji: "⚡", name: "Imprevistos" },
];
const DEFAULT_CATS_INGRESOS = [
  { emoji: "💼", name: "Sueldo" }, { emoji: "💻", name: "Freelance" }, { emoji: "📈", name: "Inversión" },
  { emoji: "🏠", name: "Alquiler" }, { emoji: "🎯", name: "Bono" }, { emoji: "🛒", name: "Ventas" },
];

const LOCAL_BACKUP_KEY = 'qori-backup';
function hasSignificantData(d) {
  if (!d) return false;
  return (d.expenses?.length > 0) || (d.fixed?.some(f => f.amount > 0)) ||
    (d.incomeFixed?.some(i => i.amount > 0)) || (d.incomeExtra?.length > 0);
}
function saveLocalBackup(d) { try { localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(d)); } catch(e) {} }
function loadLocalBackup() { try { const b = localStorage.getItem(LOCAL_BACKUP_KEY); return b ? JSON.parse(b) : null; } catch(e) { return null; } }

function initData() {
  return {
    expenses: [],
    fixed: FIXED_DEFAULTS.map(f => ({ id: genId(), name: f.name, type: f.type, amount: 0, paid: false, month: getCurrentMonthLabel() })),
    incomeFixed: [
      { id: genId(), name: "Sueldo del Diario", amount: 0, month: getCurrentMonthLabel() },
      { id: genId(), name: "Sueldo de Facultad", amount: 0, month: getCurrentMonthLabel() },
    ],
    incomeExtra: [],
    categories: {
      gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
      ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
    },
    userName: "Andrea",
    currency: "PEN",
  };
}

const C = { green: "#1B6B3A", greenLight: "#2D9F5B", orange: "#E8561E", orangeLight: "#FF7A45", purple: "#6C5CE7", purpleLight: "#8B7FF0", purpleSoft: "#E0DBFF", beige: "#F5F2EC", black: "#141218", muted: "#8A8A8E" };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #D4D0C8", fontSize: 15, fontFamily: "inherit", background: "#FAFAF5", boxSizing: "border-box" };
const cardStyle = { background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };

export default function App() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gastos-data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!parsed.categories) {
            parsed.categories = {
              gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
              ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
            };
          }
          return parsed;
        }
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
  const [editExpId, setEditExpId] = useState(null);
  const [editExpAmt, setEditExpAmt] = useState("");
  const [editExpDesc, setEditExpDesc] = useState("");
  const [editExpDate, setEditExpDate] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showScanOptions, setShowScanOptions] = useState(false); // array of {description, amount, date}
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const backupInputRef = useRef(null);
  const [subScreen, setSubScreen] = useState(null); // 'fijos' | 'cats-gasto' | 'cats-ingreso'
  const [catEditId, setCatEditId] = useState(null);
  const [catEditEmoji, setCatEditEmoji] = useState("");
  const [catEditName, setCatEditName] = useState("");
  const [showAddCat, setShowAddCat] = useState(null); // 'gasto' | 'ingreso'
  const [newCatEmoji, setNewCatEmoji] = useState("");
  const [newCatName, setNewCatName] = useState("");

  // Auth state — start immediately in the right screen, no loading screen delay
  const [authUser, setAuthUser] = useState(null);
  const [authPhase, setAuthPhase] = useState(() => {
    if (typeof window === 'undefined') return "loading";
    return localStorage.getItem('qori-onboarding') ? "auth" : "onboarding";
  }); // loading | onboarding | auth | pin-setup | app
  const [authTab, setAuthTab] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [obSlide, setObSlide] = useState(0);
  const [pinDigits, setPinDigits] = useState(4);
  const [pinVal, setPinVal] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [pinPhase, setPinPhase] = useState("enter");

  // Add expense UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [pendingExpAmt, setPendingExpAmt] = useState("");
  const [pendingExpDesc, setPendingExpDesc] = useState("");
  const [pendingExpCat, setPendingExpCat] = useState(null);

  // AI categorization state
  const [editExpCat, setEditExpCat] = useState(undefined); // category in edit modal
  const [showExpCatPicker, setShowExpCatPicker] = useState(false);

  const exportData = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gastos-backup-" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup descargado");
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported && imported.expenses) {
          setConfirm({ message: "¿Restaurar backup? Esto reemplaza todos tus datos actuales.", onConfirm: () => {
            setData(imported);
            showToast("Datos restaurados");
          }});
        } else {
          showToast("Archivo inválido");
        }
      } catch (err) {
        showToast("Error al leer el archivo");
      }
    };
    reader.readAsText(file);
    if (backupInputRef.current) backupInputRef.current.value = "";
  };
  const fmt = useCallback((n) => fmtWith(n, data.currency), [data.currency]);
  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(null), 2000); }, []);

  useEffect(() => {
    if (recording) { setRecTime(0); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // Save data to localStorage on every change; maintain separate backup for recovery
  useEffect(() => {
    try { localStorage.setItem('gastos-data', JSON.stringify(data)); } catch (e) {}
    if (hasSignificantData(data)) saveLocalBackup(data);
  }, [data]);

  // Cloud sync state
  const [cloudStatus, setCloudStatus] = useState("loading");
  const skipNextSync = useRef(false);
  const isLoadingUserData = useRef(false);
  const loadedThisSession = useRef(false);
  const dataRef = useRef(data); // mirrors data state for use in async callbacks
  useEffect(() => { dataRef.current = data; }, [data]);

  const forceUploadToSupabase = async (userId, dataToUpload) => {
    try {
      const { data: rows, error: selErr } = await supabase.from('app_data')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (selErr) throw selErr;
      const rowId = rows?.[0]?.id;
      if (rowId) {
        const { error } = await supabase.from('app_data')
          .update({ data: dataToUpload, updated_at: new Date().toISOString() })
          .eq('id', rowId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_data')
          .insert({ user_id: userId, data: dataToUpload, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      setCloudStatus("synced");
    } catch (e) {
      console.error('[Qori] Supabase upload failed:', e);
      setCloudStatus("offline");
    }
  };

  const loadUserData = async (userId) => {
    try {
      // Use array query + limit to handle possible duplicate rows gracefully
      const { data: rows } = await supabase.from('app_data')
        .select('data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      const row = rows?.[0];

      if (row?.data) {
        let loaded = row.data;
        if (!loaded.categories) {
          loaded.categories = {
            gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
            ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
          };
        }
        if (!hasSignificantData(loaded)) {
          const backup = loadLocalBackup();
          if (hasSignificantData(backup)) {
            loaded = backup;
            await forceUploadToSupabase(userId, backup);
          }
        } else {
          saveLocalBackup(loaded);
        }
        skipNextSync.current = true;
        setData(loaded);
        setCloudStatus("synced");
        return;
      }
      // Migration: claim unclaimed legacy row (id=1, user_id IS NULL)
      const { data: legacyRows } = await supabase.from('app_data').select('data').eq('id', 1).is('user_id', null).limit(1);
      const legacy = legacyRows?.[0];
      if (legacy?.data) {
        await supabase.from('app_data').update({ user_id: userId }).eq('id', 1);
        skipNextSync.current = true;
        const loaded = legacy.data;
        if (!loaded.categories) {
          loaded.categories = {
            gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
            ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
          };
        }
        if (hasSignificantData(loaded)) saveLocalBackup(loaded);
        setData(loaded);
        setCloudStatus("synced");
        return;
      }
      // No cloud data — check local backup
      const backup = loadLocalBackup();
      if (hasSignificantData(backup)) {
        await forceUploadToSupabase(userId, backup);
        skipNextSync.current = true;
        setData(backup);
      }
      setCloudStatus("synced");
    } catch (e) {
      setCloudStatus("offline");
    }
  };

  // Auth: single listener handles initial session + changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setAuthUser(session.user);
          setAuthPhase("app");
          if (!loadedThisSession.current) {
            loadedThisSession.current = true;
            skipNextSync.current = true;
            isLoadingUserData.current = true;
            const uid = session.user.id;
            loadUserData(uid).finally(() => {
              isLoadingUserData.current = false;
            });
            // Detect email confirmation redirect
            if (typeof window !== 'undefined' && window.location.hash.includes('type=signup')) {
              setTimeout(() => showToast("✅ ¡Cuenta confirmada! Bienvenido a Qori"), 800);
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          loadedThisSession.current = false;
          setAuthUser(null);
          setData(initData());
          const seen = localStorage.getItem('qori-onboarding');
          setAuthPhase(seen ? "auth" : "onboarding");
        }
        // Other no-session events (TOKEN_REFRESHED, etc.) — ignore, stay in current phase
      } catch (e) {
        const seen = localStorage.getItem('qori-onboarding');
        setAuthPhase(seen ? "auth" : "onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync data to Supabase on every change (debounced)
  const syncTimer = useRef(null);
  useEffect(() => {
    if (!authUser) return;
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    if (isLoadingUserData.current) return; // Don't sync while cloud data is loading
    if (!hasSignificantData(data)) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      forceUploadToSupabase(authUser.id, data);
    }, 1500);
    return () => clearTimeout(syncTimer.current);
  }, [data, authUser]);

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
    setConfirm({ message: `¿Registrar: ${d} ${fmt(a)}?`, onConfirm: () => {
      setData(p => ({ ...p, expenses: [...p.expenses, { id: genId(), amount: a, description: d, date: new Date().toISOString(), month: curMonth }] }));
      showToast(d + " " + fmt(a) + " registrado");
    }});
  };
  const deleteExpense = (id) => setConfirm({ message: "¿Eliminar este gasto?", onConfirm: () => { setData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) })); showToast("Gasto eliminado"); }});
  const saveExpenseEdit = (id) => {
    setData(p => ({ ...p, expenses: p.expenses.map(e => {
      if (e.id !== id) return e;
      const newDate = editExpDate ? new Date(editExpDate + "T12:00:00").toISOString() : e.date;
      const newMonth = (() => { const d = new Date(newDate); return MONTHS[d.getMonth()] + " " + d.getFullYear(); })();
      return { ...e, description: editExpDesc || e.description, amount: Number(editExpAmt) || e.amount, date: newDate, month: newMonth, category: editExpCat !== undefined ? editExpCat : e.category };
    })}));
    setEditExpId(null); setEditExpDesc(""); setEditExpAmt(""); setEditExpDate(""); setEditExpCat(undefined); setShowExpCatPicker(false);
  };
  const togglePaid = (id) => setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, paid: !f.paid } : f) }));
  const saveFixedAmt = (id) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, amount: Number(editFixedAmt) || 0 } : f) })); setEditFixed(null); setEditFixedAmt(""); };
  const saveIncomeAmt = (id) => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.map(i => i.id === id ? { ...i, amount: Number(editIncomeAmt) || 0 } : i) })); setEditIncomeId(null); setEditIncomeAmt(""); };
  const addExtra = () => {
    if (!newExtraAmt || !newExtraName) return;
    const n = newExtraName; const a = Number(newExtraAmt);
    setConfirm({ message: `¿Agregar ingreso "${n}" por ${fmt(a)}?`, onConfirm: () => {
      setData(p => ({ ...p, incomeExtra: [...p.incomeExtra, { id: genId(), name: n, amount: a, month: curMonth }] }));
      setNewExtraName(""); setNewExtraAmt(""); setShowAddExtra(false);
      showToast("Ingreso extra agregado");
    }});
  };
  const deleteExtra = (id) => setConfirm({ message: "¿Eliminar este ingreso?", onConfirm: () => { setData(p => ({ ...p, incomeExtra: p.incomeExtra.filter(i => i.id !== id) })); showToast("Ingreso eliminado"); }});
  const deleteFixed = (id) => setConfirm({ message: "¿Eliminar este gasto fijo?", onConfirm: () => { setData(p => ({ ...p, fixed: p.fixed.filter(f => f.id !== id) })); showToast("Gasto fijo eliminado"); }});
  const saveFixedExpName = (id) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, name: editFixedExpNameVal } : f) })); setEditFixedExpName(null); setEditFixedExpNameVal(""); };
  const saveFixedExpType = (id, type) => { setData(p => ({ ...p, fixed: p.fixed.map(f => f.id === id ? { ...f, type } : f) })); setEditFixedExpType(null); };
  const deleteFixedIncome = (id) => setConfirm({ message: "¿Eliminar este ingreso fijo?", onConfirm: () => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.filter(i => i.id !== id) })); showToast("Ingreso fijo eliminado"); }});
  const saveFixedIncomeName = (id) => { setData(p => ({ ...p, incomeFixed: p.incomeFixed.map(i => i.id === id ? { ...i, name: editFixedIncomeNameVal } : i) })); setEditFixedIncomeName(null); setEditFixedIncomeNameVal(""); };
  const addFixedIncome = () => {
    if (!newFixedIncomeName.trim()) return;
    const n = newFixedIncomeName.trim();
    setConfirm({ message: `¿Agregar "${n}" como ingreso fijo?`, onConfirm: () => {
      setData(p => ({ ...p, incomeFixed: [...p.incomeFixed, { id: genId(), name: n, amount: 0, month: curMonth }] }));
      setNewFixedIncomeName(""); setShowAddFixedIncome(false);
      showToast("Ingreso fijo agregado");
    }});
  };
  const saveExtraEdit = (id) => {
    setData(p => ({ ...p, incomeExtra: p.incomeExtra.map(i => i.id === id ? { ...i, name: editExtraName || i.name, amount: Number(editExtraAmt) || i.amount } : i) }));
    setEditExtraId(null); setEditExtraName(""); setEditExtraAmt("");
  };
  const saveCatEdit = (type) => {
    if (!catEditName.trim()) return;
    setData(p => ({ ...p, categories: { ...p.categories, [type]: p.categories[type].map(c => c.id === catEditId ? { ...c, emoji: catEditEmoji, name: catEditName.trim() } : c) } }));
    setCatEditId(null); setCatEditEmoji(""); setCatEditName("");
  };
  const deleteCat = (type, id) => {
    setConfirm({ message: "¿Eliminar esta categoría?", onConfirm: () => {
      setData(p => ({ ...p, categories: { ...p.categories, [type]: p.categories[type].filter(c => c.id !== id) } }));
      showToast("Categoría eliminada");
    }});
  };
  const addCat = (type) => {
    if (!newCatName.trim()) return;
    const emoji = newCatEmoji.trim() || "📌";
    const name = newCatName.trim();
    setData(p => ({ ...p, categories: { ...p.categories, [type]: [...p.categories[type], { id: genId(), emoji, name }] } }));
    setNewCatEmoji(""); setNewCatName(""); setShowAddCat(null);
    showToast("Categoría agregada");
  };
  const handleScanImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Error leyendo archivo"));
        r.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      const result = await response.json();
      if (result.expenses && result.expenses.length > 0) {
        setScanResults(result.expenses);
      } else {
        showToast("No se encontraron gastos en la imagen");
      }
    } catch (err) {
      showToast("Error al analizar la imagen");
    }
    setScanLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmScanResults = () => {
    if (!scanResults) return;
    const newExpenses = scanResults.map(r => {
      let parsedDate = null;
      if (r.date) {
        try {
          const d = new Date(r.date + "T12:00:00");
          if (!isNaN(d.getTime())) parsedDate = d;
        } catch (e) {}
        if (!parsedDate) {
          try {
            const d = new Date(r.date);
            if (!isNaN(d.getTime())) parsedDate = d;
          } catch (e) {}
        }
        // Force current year for dates parsed without year
        if (parsedDate) {
          parsedDate.setFullYear(new Date().getFullYear());
        }
      }
      return {
        id: genId(),
        amount: Number(r.amount) || 0,
        description: r.description || "Gasto escaneado",
        date: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
        month: parsedDate ? MONTHS[parsedDate.getMonth()] + " " + parsedDate.getFullYear() : curMonth,
      };
    });
    setData(p => ({ ...p, expenses: [...p.expenses, ...newExpenses] }));
    showToast(newExpenses.length + " gastos registrados");
    setScanResults(null);
  };

  const removeScanItem = (idx) => {
    setScanResults(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRecord = () => {
    if (!recording) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast("Tu navegador no soporta grabación de voz. Usa el ingreso manual.");
        return;
      }
      setRecording(true);
      const recognition = new SpeechRecognition();
      recognition.lang = "es-PE";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;
      recognitionRef.current = recognition;

      let gotResult = false;
      let gotError = false;

      const wordNums = {
        "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
        "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
        "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
        "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
        "veinte": 20, "veintiuno": 21, "veintiuna": 21, "veintidos": 22, "veintitres": 23,
        "veinticuatro": 24, "veinticinco": 25, "veintiseis": 26, "veintisiete": 27,
        "veintiocho": 28, "veintinueve": 29,
        "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60,
        "setenta": 70, "ochenta": 80, "noventa": 90,
        "cien": 100, "ciento": 100,
        "doscientos": 200, "doscientas": 200,
        "trescientos": 300, "trescientas": 300,
        "cuatrocientos": 400, "cuatrocientas": 400,
        "quinientos": 500, "quinientas": 500,
        "seiscientos": 600, "seiscientas": 600,
        "setecientos": 700, "setecientas": 700,
        "ochocientos": 800, "ochocientas": 800,
        "novecientos": 900, "novecientas": 900,
      };

      const parseAmount = (transcript) => {
        // First try digit match
        const digitMatch = transcript.match(/(\d[\d.,]*)/);
        if (digitMatch) return parseFloat(digitMatch[1].replace(",", "."));

        // Handle "X mil" with digits
        const digitMilMatch = transcript.match(/(\d+)\s*mil/);
        if (digitMilMatch) {
          let base = parseFloat(digitMilMatch[1]) * 1000;
          const rest = transcript.replace(digitMilMatch[0], "");
          // Add any hundreds/tens/units after "mil"
          let extra = 0;
          for (const [word, val] of Object.entries(wordNums)) {
            if (new RegExp(`\\b${word}\\b`).test(rest)) extra += val;
          }
          return base + extra;
        }

        // Parse word numbers additively: sum hundreds + tens + units
        let hasMil = /\bmil\b/.test(transcript);
        let beforeMil = hasMil ? transcript.split(/\bmil\b/)[0] : "";
        let afterMil = hasMil ? transcript.split(/\bmil\b/).slice(1).join(" ") : transcript;

        const sumWords = (text) => {
          let hundreds = 0, rest = 0;
          for (const [word, val] of Object.entries(wordNums)) {
            if (new RegExp(`\\b${word}\\b`).test(text)) {
              if (val >= 100) hundreds += val;
              else rest += val;
            }
          }
          return hundreds + rest;
        };

        if (hasMil) {
          const milMultiplier = sumWords(beforeMil) || 1;
          return milMultiplier * 1000 + sumWords(afterMil);
        }
        return sumWords(transcript);
      };

      recognition.onresult = (event) => {
        gotResult = true;
        const transcript = event.results[0][0].transcript.toLowerCase().trim();

        const amount = parseAmount(transcript);

        // Extract description: remove digits, currency words, and matched word numbers
        const wordNumPattern = Object.keys(wordNums).join("|");
        let desc = transcript
          .replace(/(\d[\d.,]*)/g, "")
          .replace(new RegExp(`\\b(${wordNumPattern}|soles?|dolares?|pesos?|mil|con|por|de|y)\\b`, "gi"), "")
          .replace(/\s+/g, " ")
          .trim();
        if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);

        if (amount > 0) {
          openCatPicker(amount, desc || "Gasto por voz");
        } else {
          showToast(`No entendí el monto. Dijiste: "${transcript}"`);
        }
        setRecording(false);
      };

      recognition.onerror = (event) => {
        gotError = true;
        if (event.error === "no-speech") {
          showToast("No se detectó voz, intenta de nuevo");
        } else if (event.error === "not-allowed") {
          showToast("Permiso de micrófono denegado. Activa el micrófono en ajustes.");
        } else {
          showToast("Error de grabación: " + event.error);
        }
        setRecording(false);
      };

      recognition.onend = () => {
        // Only show "no voice" if neither a result nor an error was already handled
        if (!gotResult && !gotError) {
          showToast("No se detectó voz, intenta de nuevo");
        }
        setRecording(false);
      };

      try {
        recognition.start();
      } catch (e) {
        showToast("Error al iniciar grabación");
        setRecording(false);
      }
    } else {
      // User manually stopped — silence the onend handler to avoid spurious toast
      if (recognitionRef.current) {
        recognitionRef.current.onend = () => { setRecording(false); };
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      setRecording(false);
    }
  };
  const handleManual = () => { addExpense(Number(manAmt), manDesc); setManAmt(""); setManDesc(""); setShowManual(false); };

  const signIn = async () => {
    if (!authEmail || !authPass) { setAuthError("Completa todos los campos"); return; }
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) setAuthError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
    setAuthLoading(false);
  };
  const signUp = async () => {
    if (!authEmail || !authPass) { setAuthError("Completa todos los campos"); return; }
    if (authPass.length < 6) { setAuthError("La contraseña debe tener al menos 6 caracteres"); return; }
    setAuthLoading(true); setAuthError("");
    const { data: signUpData, error } = await supabase.auth.signUp({ email: authEmail, password: authPass, options: { data: { phone: authPhone } } });
    if (error) {
      setAuthError(error.message);
    } else if (signUpData?.session) {
      setAuthUser(signUpData.session.user);
      await loadUserData(signUpData.session.user.id);
      setAuthPhase("pin-setup");
    } else {
      setAuthError("✓ Revisa tu correo para confirmar tu cuenta");
      setAuthTab("login");
    }
    setAuthLoading(false);
  };
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };
  const signOut = async () => {
    setConfirm({ message: "¿Cerrar sesión?", onConfirm: async () => {
      await supabase.auth.signOut();
    }});
  };
  const savePinSetup = () => {
    if (pinPhase === "enter") {
      if (pinVal.length !== pinDigits) return;
      setPinFirst(pinVal); setPinVal(""); setPinPhase("confirm");
    } else {
      if (pinVal !== pinFirst) {
        setAuthError("Las claves no coinciden, intenta de nuevo");
        setPinVal(""); setPinPhase("enter");
        return;
      }
      localStorage.setItem('qori-pin', pinVal);
      setAuthPhase("app");
    }
  };

  const registerExpense = (amt, desc, cat) => {
    const a = Number(amt); if (!a || a <= 0) return;
    const d = desc || "Gasto";
    setData(p => ({ ...p, expenses: [...p.expenses, { id: genId(), amount: a, description: d, date: new Date().toISOString(), month: curMonth, category: cat || null }] }));
    showToast((cat ? cat.emoji + " " : "") + d + " " + fmtWith(a, data.currency) + " registrado");
    setShowCatPicker(false); setShowAddModal(false);
    setPendingExpAmt(""); setPendingExpDesc(""); setPendingExpCat(null);
    setManAmt(""); setManDesc("");
  };

  const openCatPicker = (amt, desc) => {
    setPendingExpAmt(String(amt)); setPendingExpDesc(desc || "Gasto");
    setPendingExpCat(null); setShowAddModal(false); setShowCatPicker(true);
  };


  const typeLabel = (t) => t === "manual" ? "Lo pago yo" : t === "debito" ? "Debito automatico" : "Descuento sueldo";
  const typeBg = (t) => t === "manual" ? C.orange : t === "debito" ? C.purple : C.green;

  const homeScreen = (() => {
    // Bar chart: top 5 categories this month
    const monthExps = data.expenses.filter(e => e.month === curMonth);
    const catMap = {};
    monthExps.forEach(e => {
      const key = e.category?.name || "Otros";
      const emoji = e.category?.emoji || "📦";
      if (!catMap[key]) catMap[key] = { name: key, emoji, amount: 0 };
      catMap[key].amount += e.amount;
    });
    const topCats = Object.values(catMap).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const maxCat = topCats[0]?.amount || 1;

    return (
      <div style={{ flex: 1, background: "linear-gradient(160deg, #6C5CE7 0%, #5A4BD1 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 88 }}>
        {/* Header */}
        <div style={{ padding: "52px 28px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginBottom: 6 }}>{getToday()}</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: 0, fontStyle: "italic", letterSpacing: -1 }}>Hola, {data.userName}.</h1>
        </div>
        {/* Today total */}
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>HOY GASTASTE</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>{fmt(todayTotal)}</div>
        </div>
        {/* Bar chart */}
        {topCats.length > 0 ? (
          <div style={{ padding: "8px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 4px" }}>
              {topCats.map((cat, i) => {
                const h = Math.max(Math.round((cat.amount / maxCat) * 120), 8);
                return (
                  <div key={cat.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>{fmt(cat.amount)}</div>
                    <div style={{ width: "100%", maxWidth: 44, height: h, background: i === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)", borderRadius: "8px 8px 4px 4px", transition: "height 0.4s ease" }} />
                    <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 28px 0" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Toca <strong style={{ color: "#fff" }}>+</strong> para registrar tu primer gasto</div>
          </div>
        )}
        {/* Today's expenses */}
        <div style={{ padding: "16px 20px 0", flex: 1 }}>
          {todayExp.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, marginBottom: 10 }}>HOY · {fmt(todayTotal)}</div>
              {todayExp.map(e => (
                <div key={e.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
                  {editExpId === e.id ? (
                    <div>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} placeholder="Descripción" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Fecha</div>
                        <input type="date" value={editExpDate} onChange={ev => setEditExpDate(ev.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 14, padding: "8px 12px" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Categoría</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(data.categories?.gastos || []).map(cat => { const sel = (editExpCat !== undefined ? editExpCat : e.category)?.id === cat.id; return (
                            <button key={cat.id} onClick={() => setEditExpCat(sel ? null : cat)} style={{ padding: "5px 10px", borderRadius: 20, border: sel ? "2px solid #fff" : "2px solid rgba(255,255,255,0.25)", background: sel ? "rgba(255,255,255,0.25)" : "transparent", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{cat.emoji} {cat.name}</button>
                          );})}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveExpenseEdit(e.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#fff", color: C.green, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                        <button onClick={() => { setEditExpId(null); setEditExpDesc(""); setEditExpAmt(""); setEditExpDate(""); setEditExpCat(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExpId(e.id); setEditExpDesc(e.description); setEditExpAmt(String(e.amount)); setEditExpDate(new Date(e.date).toISOString().split("T")[0]); }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{e.description}</div>
                        {e.category && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{e.category.emoji} {e.category.name}</div>}
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginRight: 10 }}>-{fmt(e.amount)}</span>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><TrashIcon size={16} color="rgba(255,255,255,0.7)" /></button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        {/* Hidden file inputs for scan */}
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.heic,.webp" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
      </div>
    );
  })();

  const MiMesScreen = (() => {
    const mtabs = [{ label: "Este mes", val: 0 }, { label: getMonthShort(-1), val: -1 }, { label: getMonthShort(-2), val: -2 }, { label: "Historico", val: "hist" }];
    const d = monthTab === "hist" ? getMonthData(0) : getMonthData(monthTab);
    const isNeg = d.balance < 0;
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Mi Mes</h1>
          </div>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 70, marginBottom: 16 }} />
        </div>
        <div style={{ display: "flex", gap: 0, padding: "0 24px", marginBottom: 20, overflowX: "auto" }}>
          {mtabs.map(t => (
            <button key={t.label} onClick={() => setMonthTab(t.val)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: monthTab === t.val ? 700 : 500, color: monthTab === t.val ? C.purple : C.muted, background: "none", border: "none", borderBottom: monthTab === t.val ? "2.5px solid " + C.purple : "2.5px solid transparent", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>
        {monthTab === "hist" ? (
          <div style={{ padding: "0 24px" }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Gastos por mes</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
                {[-5,-4,-3,-2,-1,0].map(off => { const m = getMonthData(off); const total = m.totalDiarios + m.totalFijos; const max = 80000; const h = total > 0 ? Math.max((total / max) * 120, 6) : 4; return (
                  <div key={off} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{total > 0 ? fmt(total) : ""}</div>
                    <div style={{ width: "100%", maxWidth: 32, height: h, background: off === 0 ? C.purple : C.orange, borderRadius: "4px 4px 2px 2px", opacity: total > 0 ? 1 : 0.2 }} />
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{getMonthShort(off).split(" ")[0]}</span>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "0 24px", marginBottom: 16 }}>
              <div style={{ background: isNeg ? C.orange : "linear-gradient(135deg, #1B6B3A 0%, #2D9F5B 100%)", borderRadius: 20, padding: "28px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Balance del mes</div>
                <div style={{ fontSize: "clamp(22px, 9vw, 46px)", fontWeight: 900, color: "#fff", letterSpacing: -1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(Math.abs(d.balance))}</div>
                {isNeg && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>estás en rojo</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "0 24px", marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: 110, background: C.green, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Ingresos</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap" }}>{fmt(d.totalInc)}</div>
              </div>
              <div style={{ minWidth: 110, background: C.orange, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Gastos Fijos</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap" }}>{fmt(d.totalFijosAll)}</div>
              </div>
              <div style={{ minWidth: 110, background: C.purple, borderRadius: 14, padding: "14px 12px", color: "#fff", flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Diarios</div>
                <div style={{ fontSize: "clamp(14px, 4vw, 20px)", fontWeight: 900, marginTop: 4, whiteSpace: "nowrap" }}>{fmt(d.totalDiarios)}</div>
              </div>
            </div>
            <div style={{ padding: "0 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Registros del mes</div>
              {d.exps.length === 0 && <div style={{ ...cardStyle, textAlign: "center", color: C.muted, fontSize: 14, padding: 24 }}>Sin gastos registrados</div>}
              {d.exps.map(e => { const dt = new Date(e.date); return (
                <div key={e.id} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10 }}>
                  {editExpId === e.id ? (
                    <div>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} placeholder="Descripcion" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Fecha</div>
                        <input type="date" value={editExpDate} onChange={ev => setEditExpDate(ev.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 14, padding: "8px 12px" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Categoría</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(data.categories?.gastos || []).map(cat => { const sel = (editExpCat !== undefined ? editExpCat : e.category)?.id === cat.id; return (
                            <button key={cat.id} onClick={() => setEditExpCat(sel ? null : cat)} style={{ padding: "5px 10px", borderRadius: 20, border: `2px solid ${sel ? C.purple : "#D4D0C8"}`, background: sel ? C.purpleSoft : "#fff", color: sel ? C.purple : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{cat.emoji} {cat.name}</button>
                          );})}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveExpenseEdit(e.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                        <button onClick={() => { setEditExpId(null); setEditExpDate(""); setEditExpCat(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#E0DCD4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.purple, marginRight: 14, flexShrink: 0 }}>{dt.getDate()}</div>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExpId(e.id); setEditExpDesc(e.description); setEditExpAmt(String(e.amount)); setEditExpDate(new Date(e.date).toISOString().split("T")[0]); }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{DAYS[dt.getDay()].toLowerCase().slice(0,3)}, {dt.getDate()} {MONTHS_SHORT[dt.getMonth()].toLowerCase()}.</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.orange, marginRight: 8 }}>-{fmt(e.amount)}</div>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon /></button>
                    </div>
                  )}
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
        <div style={{ padding: "52px 24px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <button onClick={() => setSubScreen(null)} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", fontSize: 22, color: C.black, flexShrink: 0 }}>‹</button>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Fijos</h1>
          </div>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 0, width: 50, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 8 }}>Mensual</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: C.black }}>{fmt(totalAll)}</div>
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
                    <div onClick={() => { setEditFixedExpName(f.id); setEditFixedExpNameVal(f.name); }} style={{ fontSize: 15, fontWeight: 700, color: C.black, textDecoration: f.paid ? "line-through" : "none", textDecorationColor: C.muted, cursor: "pointer" }}>{f.name}</div>
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
                    <div onClick={() => { setEditFixed(f.id); setEditFixedAmt(f.amount > 0 ? String(f.amount) : ""); }} style={{ fontSize: 17, fontWeight: 800, color: f.amount > 0 ? C.black : C.muted, cursor: "pointer" }}>{f.amount > 0 ? fmt(f.amount) : "$0"}</div>
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
    );
  })();

  const IngresosScreen = (() => {
    const totalInc = data.incomeFixed.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0) + data.incomeExtra.filter(i => i.month === curMonth).reduce((s, i) => s + i.amount, 0);
    return (
      <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
        <div style={{ padding: "32px 24px 0" }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Ingresos</h1>
          <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 80, marginBottom: 4 }} />
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 4 }}>Total mensual</div>
          <div style={{ fontSize: 40, fontWeight: 900, color: C.green }}>{fmt(totalInc)}</div>
        </div>
        <div style={{ padding: "24px 24px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Ingresos fijos</div>
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
                      <div style={{ fontSize: 12, color: C.muted }}>Mensual fijo · toca para editar</div>
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => saveExtraEdit(i.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                    <button onClick={() => { setEditExtraId(null); setEditExtraName(""); setEditExtraAmt(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#E0DCD4", color: "#666", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FFE8D6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.orange, marginRight: 14, flexShrink: 0 }}>{i.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExtraId(i.id); setEditExtraName(i.name); setEditExtraAmt(String(i.amount)); }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Extra · toca para editar</div>
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
  })();

  const cfgRowStyle = { display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F0EDE4", cursor: "pointer", gap: 14 };
  const configScreen = (
    <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
      <div style={{ padding: "32px 24px 0" }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic" }}>Config</h1>
        <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 60, marginBottom: 20 }} />
      </div>
      <div style={{ padding: "0 20px" }}>
        {/* Perfil */}
        <div style={{ ...cardStyle, padding: "0 0 0", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 8px" }}>Perfil</div>
          <div style={{ padding: "0 20px 16px" }}>
            <input style={{ ...inputStyle, color: C.black }} value={data.userName} onChange={e => setData(p => ({ ...p, userName: e.target.value }))} />
          </div>
        </div>
        {/* Organización — 3 arrow rows */}
        <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 4px" }}>Organización</div>
          <div onClick={() => setSubScreen("fijos")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>📌</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Gastos Fijos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{fmt(data.fixed.filter(f => f.month === curMonth).reduce((s, f) => s + f.amount, 0))} · {data.fixed.filter(f => f.month === curMonth).length} gastos fijos</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("cats-gasto")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>🏷️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Categorías de gastos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{(data.categories?.gastos?.length || 0)} categorías</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("cats-ingreso")} style={{ ...cfgRowStyle, borderBottom: "none" }}>
            <span style={{ fontSize: 22 }}>💰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Categorías de ingresos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{(data.categories?.ingresos?.length || 0)} categorías</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
        </div>
        {/* Moneda */}
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Moneda</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ val: "PEN" }, { val: "USD" }].map(c => (
              <button key={c.val} onClick={() => setData(p => ({ ...p, currency: c.val }))} style={{
                flex: 1, padding: "14px 12px", borderRadius: 12, border: "2.5px solid",
                borderColor: data.currency === c.val ? C.green : "#D4D0C8",
                background: data.currency === c.val ? C.green + "12" : "#fff",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: data.currency === c.val ? C.green : C.muted }}>{c.val === "PEN" ? "S/" : "US$"}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: data.currency === c.val ? C.green : C.muted }}>{c.val === "PEN" ? "Soles" : "Dolares"}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Backup */}
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Backup</div>
          <button onClick={exportData} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Exportar datos</button>
          <input ref={backupInputRef} type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
          <button onClick={() => backupInputRef.current?.click()} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#fff", color: C.black, border: "2px solid #D4D0C8", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Importar backup</button>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>Exporta tus datos para tener un respaldo. Si pierdes tus datos, puedes restaurarlos importando el archivo.</div>
        </div>
        {/* Nube */}
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Nube</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cloudStatus === "synced" ? C.green : C.orange }} />
            <span style={{ fontSize: 14, color: C.black, fontWeight: 600 }}>
              {cloudStatus === "synced" ? "Sincronizado con la nube" : cloudStatus === "loading" ? "Conectando..." : "Sin conexión a la nube"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>Tus datos se guardan automáticamente en la nube. Aunque borres el historial del navegador, tus datos están seguros.</div>
          <button onClick={async () => { if (!authUser) return; setCloudStatus("loading"); await forceUploadToSupabase(authUser.id, data); setCloudStatus(s => { if (s === "synced") showToast("✅ Datos sincronizados con la nube"); else showToast("❌ Error al sincronizar — revisa conexión"); return s; }); }} style={{ width: "100%", marginTop: 14, padding: 13, borderRadius: 12, background: C.purpleSoft, color: C.purple, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ☁️ Sincronizar ahora
          </button>
        </div>
        {/* Cuenta */}
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Cuenta</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{authUser?.email}</div>
          <button onClick={signOut} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#fff", color: C.orange, border: "2px solid " + C.orange, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cerrar sesión</button>
        </div>
        <button onClick={() => setConfirm({ message: "¿Resetear todos los datos? Esta acción no se puede deshacer.", onConfirm: () => { setData(initData()); showToast("Datos reseteados"); }})} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.orange, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 24 }}>Resetear datos</button>
      </div>
    </div>
  );

  const TABS = [{ id: "home", label: "Inicio", Icon: HomeIcon }, { id: "month", label: "Mi Mes", Icon: CalIcon }, { id: "income", label: "Ingresos", Icon: WalletIcon }, { id: "config", label: "Config", Icon: GearIcon }];

  const subStyle = (id) => ({
    position: "fixed", inset: 0, zIndex: 200,
    background: C.beige, display: "flex", flexDirection: "column",
    overflowY: "auto", overflowX: "hidden",
    transform: subScreen === id ? "translateX(0)" : "translateX(100%)",
    transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
  });
  const subHeader = (title, onBack) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 12px", position: "sticky", top: 0, background: C.beige, zIndex: 10 }}>
      <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", fontSize: 22, color: C.black, flexShrink: 0 }}>‹</button>
      <div style={{ fontSize: 26, fontWeight: 900, color: C.black, fontStyle: "italic" }}>{title}</div>
    </div>
  );

  const catRowStyle = { display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #F0EDE4", gap: 12 };

  const CatsSubScreen = ({ type, title }) => {
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
                  <div onClick={() => { setCatEditId(c.id); setCatEditEmoji(c.emoji); setCatEditName(c.name); }} style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.black, cursor: "pointer" }}>{c.name}</div>
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
  };

  const obSlides = [
    {
      bg: C.purple,
      title: "Registra al instante",
      desc: "Di el monto y listo. Qori entiende tu voz y registra tus gastos en segundos.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)", animation: "ripple 2s ease-out infinite" }} />
          <div style={{ position: "absolute", width: 175, height: 175, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.22)", animation: "ripple 2s ease-out infinite 0.6s" }} />
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
            <MicIcon size={44} color="#fff" />
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#fff", animation: "float 3s ease-in-out infinite" }}>🍽️ S/ 25</div>
          <div style={{ position: "absolute", bottom: 22, left: 8, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#fff", animation: "float 3s ease-in-out infinite 1s" }}>🚌 S/ 4.50</div>
          <div style={{ position: "absolute", top: 58, right: 0, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", animation: "float 3s ease-in-out infinite 0.5s" }}>✅ Guardado</div>
        </div>
      )
    },
    {
      bg: C.green,
      title: "Controla tu mes",
      desc: "Ve tus gastos fijos, ingresos y balance de un vistazo. Sin complicaciones.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 14px", animation: "float 3s ease-in-out infinite" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Balance</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>S/ 1,240</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-end", gap: 12, padding: "0 16px 4px" }}>
            {[
              { h: 105, emoji: "🍽️", amt: "S/320", op: 0.25 },
              { h: 68, emoji: "🚌", amt: "S/180", op: 0.32 },
              { h: 88, emoji: "🏠", amt: "S/240", op: 1, white: true },
              { h: 40, emoji: "💊", amt: "S/90", op: 0.25 },
              { h: 28, emoji: "🎉", amt: "S/60", op: 0.2 },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{b.amt}</div>
                <div style={{ width: 34, height: b.h, background: b.white ? "#fff" : `rgba(255,255,255,${b.op})`, borderRadius: "7px 7px 0 0" }} />
                <div style={{ fontSize: 11 }}>{b.emoji}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      bg: C.orange,
      title: "Tu data, segura",
      desc: "Sincronización automática en la nube. Cambia de dispositivo sin perder nada.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2.5s ease-in-out infinite", position: "relative", zIndex: 2 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
          </div>
          <div style={{ position: "absolute", left: 10, top: 28, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 12px", animation: "float 3s ease-in-out infinite", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>📱</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, marginTop: 4 }}>iPhone</div>
          </div>
          <div style={{ position: "absolute", right: 10, top: 28, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 12px", animation: "float 3s ease-in-out infinite 1s", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>💻</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, marginTop: 4 }}>Mac</div>
          </div>
          <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "8px 16px", animation: "float 3s ease-in-out infinite 0.5s", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>🔒 Cifrado seguro</span>
          </div>
        </div>
      )
    },
  ];
  const slide = obSlides[obSlide];

  const sharedStyle = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes ripple { 0%{opacity:0.6;transform:scale(0.85)} 100%{opacity:0;transform:scale(1.15)} }
    input:focus { border-color: #6C5CE7 !important; outline: none; }
    input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type="number"] { -moz-appearance: textfield; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; margin: 0; }
    ::-webkit-scrollbar { width: 0; }
  `;

  if (authPhase === "loading") return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", position: "fixed", inset: 0, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <style>{sharedStyle}</style>
      <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>Qori<span style={{ color: "rgba(255,255,255,0.45)" }}>.</span></div>
      <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (authPhase === "onboarding") return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", position: "fixed", inset: 0, background: slide.bg, display: "flex", flexDirection: "column", transition: "background 0.4s ease" }}>
      <style>{sharedStyle}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px 20px", gap: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.55)", letterSpacing: -1, alignSelf: "flex-start" }}>Qori.</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{slide.icon}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>{slide.title}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{slide.desc}</div>
        </div>
      </div>
      <div style={{ padding: "0 32px 52px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: i === obSlide ? 24 : 8, height: 8, borderRadius: 4, background: i === obSlide ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.3s" }} />)}
        </div>
        {obSlide < 2 ? (
          <button onClick={() => setObSlide(obSlide + 1)} style={{ width: "100%", padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Siguiente</button>
        ) : (
          <button onClick={() => { localStorage.setItem('qori-onboarding','1'); setAuthPhase("auth"); }} style={{ width: "100%", padding: 18, borderRadius: 16, background: "#fff", border: "none", color: C.purple, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>Comenzar →</button>
        )}
        <button onClick={() => { localStorage.setItem('qori-onboarding','1'); setAuthPhase("auth"); }} style={{ padding: "10px 0", background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Omitir</button>
      </div>
    </div>
  );

  if (authPhase === "auth") return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", position: "fixed", inset: 0, background: C.beige, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <style>{sharedStyle}</style>
      <div style={{ padding: "72px 32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 54, fontWeight: 900, color: C.purple, letterSpacing: -2, marginBottom: 6 }}>Qori<span style={{ color: C.orange }}>.</span></div>
        <div style={{ fontSize: 15, color: C.muted }}>Controla tus gastos, sin complicaciones.</div>
      </div>
      <div style={{ padding: "0 28px", flex: 1 }}>
        <div style={{ display: "flex", background: "#E8E4DA", borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => { setAuthTab(t); setAuthError(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, background: authTab === t ? "#fff" : "transparent", border: "none", fontSize: 14, fontWeight: 700, color: authTab === t ? C.black : C.muted, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{t === "login" ? "Iniciar sesión" : "Registrarme"}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="Correo electrónico" value={authEmail} onChange={e => { setAuthEmail(e.target.value); setAuthError(""); }} style={{ ...inputStyle, color: C.black }} />
          <input type="password" placeholder="Contraseña" value={authPass} onChange={e => { setAuthPass(e.target.value); setAuthError(""); }} onKeyDown={e => e.key === "Enter" && (authTab === "login" ? signIn() : signUp())} style={{ ...inputStyle, color: C.black }} />
          {authTab === "register" && <input type="tel" placeholder="Celular (opcional)" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ ...inputStyle, color: C.black }} />}
          {authError && <div style={{ fontSize: 13, fontWeight: 600, textAlign: "center", color: authError.startsWith("✓") ? C.green : C.orange }}>{authError}</div>}
          <button onClick={authTab === "login" ? signIn : signUp} disabled={authLoading} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.purple, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: authLoading ? 0.7 : 1, marginTop: 4 }}>
            {authLoading ? "Cargando..." : authTab === "login" ? "Entrar" : "Crear cuenta"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#D4D0C8" }} /><span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>o</span><div style={{ flex: 1, height: 1, background: "#D4D0C8" }} />
          </div>
          <button onClick={signInWithGoogle} disabled={authLoading} style={{ width: "100%", padding: 15, borderRadius: 14, background: "#fff", color: C.black, border: "2px solid #D4D0C8", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );

  if (authPhase === "pin-setup") return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", position: "fixed", inset: 0, background: C.beige, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{sharedStyle}</style>
      <div style={{ padding: "72px 32px 32px", textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.black, marginBottom: 8 }}>{pinPhase === "enter" ? "Crea tu clave rápida" : "Confirma tu clave"}</div>
        <div style={{ fontSize: 15, color: C.muted }}>{pinPhase === "enter" ? "Elige tu PIN de acceso rápido" : "Vuelve a ingresar el PIN"}</div>
      </div>
      {pinPhase === "enter" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          {[4,6].map(n => <button key={n} onClick={() => { setPinDigits(n); setPinVal(""); }} style={{ padding: "8px 22px", borderRadius: 10, border: "2px solid", borderColor: pinDigits === n ? C.purple : "#D4D0C8", background: pinDigits === n ? C.purpleSoft : "#fff", color: pinDigits === n ? C.purple : C.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{n} dígitos</button>)}
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginBottom: 32 }}>
        {Array.from({ length: pinDigits }).map((_, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: i < pinVal.length ? C.purple : "transparent", border: "2.5px solid", borderColor: i < pinVal.length ? C.purple : "#C8C4BC", transition: "all 0.15s" }} />)}
      </div>
      {authError && <div style={{ fontSize: 13, color: C.orange, fontWeight: 600, marginBottom: 16 }}>{authError}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 300, padding: "0 20px" }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => k === "" ? <div key={i} /> : (
          <button key={i} onClick={() => {
            if (k === "⌫") { setPinVal(v => v.slice(0,-1)); return; }
            const next = pinVal + String(k);
            if (next.length <= pinDigits) { setPinVal(next); if (next.length === pinDigits) setTimeout(() => savePinSetup(), 200); }
          }} style={{ aspectRatio: "1", borderRadius: 16, background: k === "⌫" ? "transparent" : "#fff", border: k === "⌫" ? "none" : "2px solid #E0DCD4", fontSize: k === "⌫" ? 26 : 22, fontWeight: 700, color: C.black, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>{k}</button>
        ))}
      </div>
      <button onClick={() => setAuthPhase("app")} style={{ marginTop: 28, padding: "10px 24px", background: "transparent", border: "none", color: C.muted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Omitir por ahora</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Syne', system-ui, sans-serif", maxWidth: 430, margin: "0 auto", position: "relative", background: tab === "home" ? "#6C5CE7" : C.beige }}>
      <style>{sharedStyle}</style>
      {toast && <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: C.black, color: "#fff", padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, animation: "slideUp 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>{toast}</div>}
      {scanResults && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", flexDirection: "column", background: C.beige, overflow: "auto" }}>
          <div style={{ padding: "48px 24px 16px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: C.black, fontStyle: "italic", margin: 0 }}>Gastos detectados</h2>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{scanResults.length} movimientos encontrados. Elimina los que no quieras registrar.</p>
          </div>
          <div style={{ flex: 1, padding: "0 20px", overflowY: "auto" }}>
            {scanResults.map((r, i) => (
              <div key={i} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>{r.description}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{r.date || "Sin fecha"}</div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.orange, marginRight: 10 }}>{fmtWith(r.amount, data.currency)}</span>
                <button onClick={() => removeScanItem(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><TrashIcon color="#ccc" /></button>
              </div>
            ))}
          </div>
          <div style={{ padding: "16px 20px 32px", display: "flex", gap: 10 }}>
            <button onClick={() => setScanResults(null)} style={{ flex: 1, padding: 16, borderRadius: 14, background: "#E0DCD4", color: "#666", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={confirmScanResults} style={{ flex: 1, padding: 16, borderRadius: 14, background: C.green, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar todos</button>
          </div>
        </div>
      )}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }} onClick={() => setConfirm(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 20, padding: "28px 24px 20px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease", fontFamily: "inherit" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.black, lineHeight: 1.5, marginBottom: 20, textAlign: "center" }}>{confirm.message}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={() => { confirm.onConfirm(); setConfirm(null); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: C.purple, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {tab === "home" && homeScreen}
      {tab === "month" && MiMesScreen}
      {tab === "income" && IngresosScreen}
      {tab === "config" && configScreen}
      {/* Sub-screens (slide over tabs) */}
      <div style={subStyle("fijos")}>{FijosScreen}</div>
      <CatsSubScreen type="gastos" title="Cats. Gastos" />
      <CatsSubScreen type="ingresos" title="Cats. Ingresos" />
      {/* Add expense modal (bottom sheet) */}
      {showAddModal && (
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
                <div><div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Grabar por voz</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Di el monto y descripción</div></div>
              </button>
              {/* Manual */}
              <button onClick={() => { setShowAddModal(false); setShowManual(true); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, background: C.beige, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>⌨️</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Escribir manualmente</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Ingresa monto y descripción</div></div>
              </button>
              {/* Cámara */}
              <button onClick={() => { setShowAddModal(false); setShowScanOptions(true); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 16, background: C.beige, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📷</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: C.black }}>Subir captura</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{scanLoading ? "Analizando imagen..." : "Escanea un comprobante con IA"}</div></div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Scan file inputs (triggered from add modal) */}
      {showScanOptions && !showAddModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowScanOptions(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.black, marginBottom: 16 }}>Seleccionar imagen</div>
            <button onClick={() => { cameraInputRef.current?.click(); setShowScanOptions(false); }} style={{ width: "100%", padding: "15px 20px", background: C.beige, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, color: C.black, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 10 }}>📸 Tomar foto</button>
            <button onClick={() => { fileInputRef.current?.click(); setShowScanOptions(false); }} style={{ width: "100%", padding: "15px 20px", background: C.beige, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600, color: C.black, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>🖼️ Elegir de galería</button>
          </div>
        </div>
      )}
      {/* Manual entry modal */}
      {showManual && (
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
      )}
      {/* Voice recording indicator */}
      {recording && (
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
      )}

      {/* Category picker modal */}
      {showCatPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 310 }} onClick={() => setShowCatPicker(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderRadius: "28px 28px 0 0", padding: "16px 24px 40px", maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <div style={{ width: 40, height: 4, background: "#E0DCD4", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: C.black, marginBottom: 4 }}>¿En qué categoría?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{pendingExpDesc} · {fmtWith(pendingExpAmt, data.currency)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {(data.categories?.gastos || []).map(cat => (
                <button key={cat.id} onClick={() => setPendingExpCat(pendingExpCat?.id === cat.id ? null : cat)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: "2px solid", borderColor: pendingExpCat?.id === cat.id ? C.purple : "#E0DCD4", background: pendingExpCat?.id === cat.id ? C.purpleSoft : "#fff", color: pendingExpCat?.id === cat.id ? C.purple : C.black, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
            <button onClick={() => registerExpense(pendingExpAmt, pendingExpDesc, pendingExpCat)} disabled={!pendingExpCat} style={{ width: "100%", padding: 16, borderRadius: 14, background: pendingExpCat ? C.purple : "#D4D0C8", color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: pendingExpCat ? "pointer" : "default", fontFamily: "inherit", marginBottom: 10, transition: "background 0.2s" }}>Confirmar gasto</button>
            <button onClick={() => registerExpense(pendingExpAmt, pendingExpDesc, null)} style={{ width: "100%", padding: 14, borderRadius: 14, background: "#F0EDE4", color: "#666", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sin categoría</button>
          </div>
        </div>
      )}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: tab === "home" ? "rgba(90,75,209,0.96)" : "#fff", borderTop: tab === "home" ? "1px solid rgba(255,255,255,0.12)" : "1px solid #E0DCD4", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 8px 14px", zIndex: 100, backdropFilter: "blur(12px)", height: 80 }}>
        {[TABS[0], TABS[1]].map(t => { const active = tab === t.id; const color = tab === "home" ? (active ? "#fff" : "rgba(255,255,255,0.45)") : (active ? C.purple : C.muted); return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 10px", color, fontSize: 10, fontWeight: active ? 700 : 500, fontFamily: "inherit", letterSpacing: 0.3 }}>
            <t.Icon size={22} color={color} />{t.label}
          </button>
        ); })}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -20 }}>
          <button onClick={() => setShowAddModal(true)} style={{ width: 58, height: 58, borderRadius: "50%", background: C.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(232,86,30,0.45)", transition: "transform 0.15s" }}>
            <PlusIcon size={26} color="#fff" />
          </button>
        </div>
        {[TABS[2], TABS[3]].map(t => { const active = tab === t.id; const color = tab === "home" ? (active ? "#fff" : "rgba(255,255,255,0.45)") : (active ? C.purple : C.muted); return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 10px", color, fontSize: 10, fontWeight: active ? 700 : 500, fontFamily: "inherit", letterSpacing: 0.3 }}>
            <t.Icon size={22} color={color} />{t.label}
          </button>
        ); })}
      </nav>
    </div>
  );
}
