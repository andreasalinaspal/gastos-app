import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { C, FONT_TITLE, FONT_BODY, inputStyle, cardStyle } from "./theme";
import { MicIcon, StopIcon, HomeIcon, CalIcon, PinIcon, WalletIcon, GearIcon, PlusIcon, TrashIcon, CheckIcon, CameraIcon } from "./components/shared/icons";
import { MONTHS_SHORT, MONTHS, DAYS, getToday, getCurrentMonthLabel, getMonthLabel, getMonthShort } from "./lib/dates";
import { genId, fmtWith } from "./lib/format";
import { FIXED_DEFAULTS, DEFAULT_CATS_GASTOS, DEFAULT_CATS_INGRESOS, initData } from "./constants";
import { parseAmount, extractDescription } from "./lib/voice";
import { LOCAL_BACKUP_KEY, hasSignificantData, saveLocalBackup, loadLocalBackup, clearLocalData } from "./lib/sync";
import { useStore } from "./state/store";
import Home from "./components/screens/Home";
import MiMes from "./components/screens/MiMes";
import { catSpend as catSpendSel, budgetAlerts as budgetAlertsSel, getMonthData as getMonthDataSel, buildCatMap } from "./state/selectors";

export default function App() {
  const tab = useStore(s => s.tab);
  const setTab = useStore(s => s.setTab);
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
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
  const [editExtraCategory, setEditExtraCategory] = useState(null);
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
  const authUser = useStore(s => s.authUser);
  const setAuthUser = useStore(s => s.setAuthUser);
  const authPhase = useStore(s => s.authPhase); // loading | onboarding | auth | pin-setup | app
  const setAuthPhase = useStore(s => s.setAuthPhase);
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
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [nameSetupValue, setNameSetupValue] = useState("");
  const [selectedCatDetail, setSelectedCatDetail] = useState(null); // {name,emoji,expenses[]}
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [miMesSubTab, setMiMesSubTab] = useState("balance"); // "balance" | "presupuesto"
  const [showBudgetFeatureModal, setShowBudgetFeatureModal] = useState(() => {
    try { return !localStorage.getItem('qori-budget-feature-seen-v2'); } catch(e) { return false; }
  });
  const [showCarryoverModal, setShowCarryoverModal] = useState(() => {
    try { return !localStorage.getItem('qori-balance-carryover-seen-v1'); } catch(e) { return false; }
  });
  const [carryoverSlide, setCarryoverSlide] = useState(0);

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
    if (authUser && hasSignificantData(data)) saveLocalBackup(authUser.id, data);
  }, [data]);

  // Cloud sync state
  const cloudStatus = useStore(s => s.cloudStatus);
  const setCloudStatus = useStore(s => s.setCloudStatus);
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
          const backup = loadLocalBackup(userId);
          if (hasSignificantData(backup)) {
            loaded = backup;
            await forceUploadToSupabase(userId, backup);
          }
        } else {
          saveLocalBackup(userId, loaded);
        }
        skipNextSync.current = true;
        setData(loaded);
        setCloudStatus("synced");
        return;
      }
      // No cloud data — check local backup
      const backup = loadLocalBackup(userId);
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
            // Detect email confirmation redirect → ask for name
            if (typeof window !== 'undefined' && window.location.hash.includes('type=signup')) {
              window.history.replaceState(null, '', window.location.pathname);
              setTimeout(() => setShowNameSetup(true), 600);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          loadedThisSession.current = false;
          clearLocalData();
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

  // Show name setup if logged in and no name set
  useEffect(() => {
    if (authUser && authPhase === "app" && !isLoadingUserData.current && !data.userName) {
      setShowNameSetup(true);
    }
  }, [authUser, authPhase, data.userName]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);


  const curMonth = getCurrentMonthLabel();
  const todayExp = data.expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);
  const recentExp = [...data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  // Spending per category this month
  const catSpend = useMemo(() => catSpendSel(data, curMonth), [data.expenses, curMonth]);

  // Budget alerts: categories at >=80% of their limit
  const budgetAlerts = useMemo(() => budgetAlertsSel(data, catSpend), [data.budgets, data.categories, catSpend]);

  const getMonthData = (offset) => getMonthDataSel(data, offset);

  const prevMonthBalance = getMonthData(-1).balance;
  const prevMonthLabel = getMonthLabel(-1); // e.g. "Abril 2025"
  const prevMonthName = prevMonthLabel.split(" ")[0]; // e.g. "Abril"
  const curMonthName = curMonth.split(" ")[0]; // e.g. "Mayo"

  // Auto carry-over balance from previous month (from next month onwards,
  // May 2025 is handled manually via the one-time carryover modal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authPhase !== "app") return;
    try { if (!localStorage.getItem('qori-balance-carryover-seen-v1')) return; } catch(e) {}
    const cm = getCurrentMonthLabel();
    const storageKey = 'qori-last-carryover-month';
    let lastMonth; try { lastMonth = localStorage.getItem(storageKey); } catch(e) {}
    if (lastMonth === cm) return;
    const alreadyAdded = data.incomeExtra.some(i => i.month === cm && i.name === "Saldo mes anterior");
    if (alreadyAdded) { try { localStorage.setItem(storageKey, cm); } catch(e) {} return; }
    const prevBal = getMonthData(-1).balance;
    if (prevBal > 0) {
      setData(p => ({ ...p, incomeExtra: [...p.incomeExtra, { id: genId(), name: "Saldo mes anterior", amount: Math.round(prevBal), month: cm }] }));
    }
    try { localStorage.setItem(storageKey, cm); } catch(e) {}
  }, [authPhase]); // month computed inside to avoid TDZ

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
    setData(p => ({ ...p, incomeExtra: p.incomeExtra.map(i => i.id === id ? { ...i, name: editExtraName || i.name, amount: Number(editExtraAmt) || i.amount, category: editExtraCategory !== undefined ? editExtraCategory : i.category } : i) }));
    setEditExtraId(null); setEditExtraName(""); setEditExtraAmt(""); setEditExtraCategory(undefined);
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

      recognition.onresult = (event) => {
        gotResult = true;
        const transcript = event.results[0][0].transcript.toLowerCase().trim();

        const amount = parseAmount(transcript);
        const desc = extractDescription(transcript);

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

  const FijosScreen = (() => {
    const fixedCur = data.fixed.filter(f => f.month === curMonth);
    const totalAll = fixedCur.reduce((s, f) => s + f.amount, 0);
    const totalPaid = fixedCur.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
    return (
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
    );
  })();

  const IngresosScreen = (() => {
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
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{i.name}</div>
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
  })();

  const cfgRowStyle = { display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F0EDE4", cursor: "pointer", gap: 14 };
  const configScreen = (
    <div style={{ flex: 1, background: C.beige, minHeight: "100vh", paddingBottom: 80 }}>
      <div style={{ padding: "32px 24px 0" }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: C.black, margin: 0, fontStyle: "italic", fontFamily: FONT_TITLE }}>Config</h1>
        <div style={{ borderBottom: "3px solid " + C.purple, marginTop: 6, width: 60, marginBottom: 20 }} />
      </div>
      <div style={{ padding: "0 20px" }}>
        {/* Perfil */}
        <div style={{ ...cardStyle, padding: "0 0 0", marginBottom: 12, overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 8px" }}>Perfil</div>
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Tu nombre</div>
            <input placeholder="¿Cómo te llamas?" style={{ ...inputStyle, color: C.black }} value={data.userName} onChange={e => setData(p => ({ ...p, userName: e.target.value }))} />
          </div>
        </div>
        {/* Organización — 3 arrow rows */}
        <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 4px" }}>Organización</div>
          <div onClick={() => setSubScreen("fijos")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>📌</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Gastos Fijos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{fmt(data.fixed.filter(f => f.month === curMonth).reduce((s, f) => s + f.amount, 0))} · {data.fixed.filter(f => f.month === curMonth).length} gastos fijos</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("cats-gasto")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>🏷️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Categorías de gastos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{(data.categories?.gastos?.length || 0)} categorías</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("cats-ingreso")} style={{ ...cfgRowStyle, borderBottom: "none" }}>
            <span style={{ fontSize: 22 }}>💰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Categorías de ingresos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{(data.categories?.ingresos?.length || 0)} categorías</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
        </div>
        {/* Presupuesto — fila de navegación */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 8px" }}>Presupuesto</div>
        <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
          <div onClick={() => setSubScreen("presupuestos")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Presupuestos</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {Object.values(data.budgets || {}).filter(v => v > 0).length} categorías con límite definido
              </div>
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
                <span style={{ fontSize: 22, fontWeight: 600, color: data.currency === c.val ? C.green : C.muted }}>{c.val === "PEN" ? "S/" : "US$"}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: data.currency === c.val ? C.green : C.muted }}>{c.val === "PEN" ? "Soles" : "Dolares"}</span>
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
      <div style={{ fontSize: 26, fontWeight: 900, color: C.black, fontStyle: "italic", fontFamily: FONT_TITLE }}>{title}</div>
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
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <style>{sharedStyle}</style>
      <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2, fontFamily: FONT_TITLE }}>Qori<span style={{ color: "rgba(255,255,255,0.45)" }}>.</span></div>
      <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (authPhase === "onboarding") return (
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: slide.bg, display: "flex", flexDirection: "column", transition: "background 0.4s ease" }}>
      <style>{sharedStyle}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px 20px", gap: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.55)", letterSpacing: -1, alignSelf: "flex-start", fontFamily: FONT_TITLE }}>Qori.</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{slide.icon}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", marginBottom: 12, lineHeight: 1.2, fontFamily: FONT_TITLE }}>{slide.title}</div>
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
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.beige, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <style>{sharedStyle}</style>
      <div style={{ padding: "72px 32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 54, fontWeight: 900, color: C.purple, letterSpacing: -2, marginBottom: 6, fontFamily: FONT_TITLE }}>Qori<span style={{ color: C.orange }}>.</span></div>
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
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );

  if (authPhase === "pin-setup") return (
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.beige, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{sharedStyle}</style>
      <div style={{ padding: "72px 32px 32px", textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.black, marginBottom: 8, fontFamily: FONT_TITLE }}>{pinPhase === "enter" ? "Crea tu clave rápida" : "Confirma tu clave"}</div>
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
    <div style={{ fontFamily: FONT_BODY, maxWidth: 430, margin: "0 auto", position: "relative", background: tab === "home" ? "#6C5CE7" : C.beige }}>
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
                  <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>{r.description}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{r.date || "Sin fecha"}</div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 600, color: C.orange, marginRight: 10 }}>{fmtWith(r.amount, data.currency)}</span>
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
      {tab === "home" && (
        <Home
          fmt={fmt} curMonth={curMonth} todayTotal={todayTotal} recentExp={recentExp} budgetAlerts={budgetAlerts}
          editExpId={editExpId} setEditExpId={setEditExpId} editExpDesc={editExpDesc} setEditExpDesc={setEditExpDesc}
          editExpAmt={editExpAmt} setEditExpAmt={setEditExpAmt} editExpDate={editExpDate} setEditExpDate={setEditExpDate}
          editExpCat={editExpCat} setEditExpCat={setEditExpCat}
          saveExpenseEdit={saveExpenseEdit} deleteExpense={deleteExpense}
          setSelectedCatDetail={setSelectedCatDetail} setShowNotifPanel={setShowNotifPanel} setSubScreen={setSubScreen}
          fileInputRef={fileInputRef} cameraInputRef={cameraInputRef} handleScanImage={handleScanImage}
        />
      )}
      {tab === "month" && (
        <MiMes
          fmt={fmt} getMonthData={getMonthData} catSpend={catSpend} budgetAlerts={budgetAlerts}
          monthTab={monthTab} setMonthTab={setMonthTab} miMesSubTab={miMesSubTab} setMiMesSubTab={setMiMesSubTab}
          editExpId={editExpId} setEditExpId={setEditExpId} editExpDesc={editExpDesc} setEditExpDesc={setEditExpDesc}
          editExpAmt={editExpAmt} setEditExpAmt={setEditExpAmt} editExpDate={editExpDate} setEditExpDate={setEditExpDate}
          editExpCat={editExpCat} setEditExpCat={setEditExpCat}
          saveExpenseEdit={saveExpenseEdit} deleteExpense={deleteExpense}
        />
      )}
      {tab === "income" && IngresosScreen}
      {tab === "config" && configScreen}
      {/* Sub-screens (slide over tabs) */}
      <div style={subStyle("fijos")}>{FijosScreen}</div>
      <CatsSubScreen type="gastos" title="Cats. Gastos" />
      <CatsSubScreen type="ingresos" title="Cats. Ingresos" />
      {/* Presupuestos sub-screen */}
      <div style={subStyle("presupuestos")}>
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
      {/* All categories subscreen */}
      <div style={subStyle("all-cats")}>
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
      {/* Category detail bottom sheet */}
      {selectedCatDetail && (
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
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.orange }}>-{fmt(e.amount)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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

      {/* Name setup screen */}
      {showNameSetup && (
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
      {showNotifPanel && (
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

      {/* ── Balance carry-over announcement modal ── */}
      {showCarryoverModal && authPhase === "app" && (() => {
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
      })()}

      {/* ── Budget feature announcement modal ── */}
      {showBudgetFeatureModal && authPhase === "app" && !showCarryoverModal && (
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
      )}
    </div>
  );
}
