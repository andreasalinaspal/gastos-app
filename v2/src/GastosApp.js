import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { C, FONT_TITLE, FONT_BODY } from "./theme";
import { HomeIcon, CalIcon, WalletIcon, GearIcon, PlusIcon } from "./components/shared/icons";
import { MONTHS, getCurrentMonthLabel, getMonthLabel, monthLabelOf, toDateInput, parseDateInput, scanDateToInput, normalizaDiaDelMes } from "./lib/dates";
import { genId, fmtWith } from "./lib/format";
import { DEFAULT_CATS_GASTOS, DEFAULT_CATS_INGRESOS, initData } from "./constants";
import { parseAmount, extractDescription } from "./lib/voice";
import { hasSignificantData, saveLocalBackup, loadLocalBackup, clearLocalData } from "./lib/sync";
import { saveLocalSession, loadLocalSession, clearLocalSession, stashRescueCopy, saveLastSyncAt, loadLastSyncAt, CLOUD_RESCUE_KEY } from "./lib/localSession";
import { decideSync } from "./lib/reconcile";
import { fetchPendingInbox, flushInboxMarks, markInboxRowOrQueue } from "./lib/inbox";
import { InboxSheet } from "./components/shared/InboxSheet";
import { downloadBackup } from "./lib/export";
import { buildDemoData } from "./lib/demo";
import { migrateData } from "./lib/migrate";
import { useStore } from "./state/store";
import Home from "./components/screens/Home";
import MiMes from "./components/screens/MiMes";
import Ingresos from "./components/screens/Ingresos";
import { FijosScreen, CatsSubScreen, PresupuestosScreen, AllCatsScreen } from "./components/screens/Fijos";
import { slimCat } from "./components/shared/CategoryPicker";
import Config from "./components/screens/Config";
import { MediosPagoScreen } from "./components/screens/MediosPago";
import { CardCycleScreen } from "./components/screens/CardCycle";
import { ProximosPagosScreen } from "./components/screens/ProximosPagos";
import { AprendeScreen } from "./components/screens/Aprende";
import { SimuladorScreen } from "./components/screens/Simulador";
import Onboarding from "./components/auth/Onboarding";
import Login from "./components/auth/Login";
import Pin from "./components/auth/Pin";
import { sharedStyle } from "./components/shared/globalStyles";
import { Toast, ScanResultsSheet, ConfirmModal, CatDetailSheet, AddExpenseModal, ScanOptionsModal, ManualModal, RecordingOverlay, NameSetupScreen, CatPickerModal, NotifPanel, CarryoverModal, BudgetFeatureModal } from "./components/shared/modals";
import { catSpend as catSpendSel, budgetAlerts as budgetAlertsSel, getMonthData as getMonthDataSel, isPEN, sumUSD } from "./state/selectors";
import { hasLine } from "./lib/cycles";
import { getDefaultPaymentMethodId } from "./components/shared/PaymentMethodPicker";

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
  const [newFixedIncomeDay, setNewFixedIncomeDay] = useState(""); // F14: día opcional
  const [editIncomeDayId, setEditIncomeDayId] = useState(null);
  const [editIncomeDayVal, setEditIncomeDayVal] = useState("");
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [editExpId, setEditExpId] = useState(null);
  const [editExpAmt, setEditExpAmt] = useState("");
  const [editExpDesc, setEditExpDesc] = useState("");
  const [editExpDate, setEditExpDate] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [inboxItems, setInboxItems] = useState([]); // compras de Apple Pay por confirmar
  const [showInbox, setShowInbox] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false); // array of {description, amount, date}
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
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
  const [pendingExpPm, setPendingExpPm] = useState(null); // paymentMethodId en el flujo de registro
  const [pendingExpDate, setPendingExpDate] = useState(toDateInput()); // fecha del gasto al registrar (hoy por defecto)
  const [pendingExpSub, setPendingExpSub] = useState(null); // subcategoria opcional al registrar
  const [pendingExpCur, setPendingExpCur] = useState("PEN"); // moneda del gasto (F10): PEN salvo que elija una TC con linea en dolares
  const [editExpPm, setEditExpPm] = useState(undefined); // paymentMethodId en edición (undefined = sin tocar)
  const [scanPm, setScanPm] = useState(null); // medio de pago global para los gastos escaneados

  // AI categorization state
  const [editExpCat, setEditExpCat] = useState(undefined); // category in edit modal
  const [editExpSub, setEditExpSub] = useState(undefined); // subcategoria en edicion (undefined = sin tocar)
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
  const fxPedido = useRef(false); // el tipo de cambio se pide una sola vez por sesión
  const loadedThisSession = useRef(false);
  const intentionalSignOut = useRef(false); // distingue cierre de sesión real de fallo de red
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
      saveLastSyncAt();
      return true;
    } catch (e) {
      console.error('[Qori] Supabase upload failed:', e);
      setCloudStatus("offline");
      return false;
    }
  };

  // Reconcilia lo local con la nube en vez de dejar que la nube pise a ciegas.
  // Regla de oro: el perdedor nunca se descarta, se guarda en 'qori-rescate'.
  const loadUserData = async (userId) => {
    try {
      // Use array query + limit to handle possible duplicate rows gracefully
      const { data: rows, error } = await supabase.from('app_data')
        .select('data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;

      let cloudBlob = rows?.[0]?.data || null;
      if (cloudBlob && !cloudBlob.categories) {
        cloudBlob = {
          ...cloudBlob,
          categories: {
            gastos: DEFAULT_CATS_GASTOS.map(c => ({ id: genId(), ...c })),
            ingresos: DEFAULT_CATS_INGRESOS.map(c => ({ id: genId(), ...c })),
          },
        };
      }

      // Candidato local: lo que hay en memoria; si está vacío, el backup del usuario.
      const inMemory = dataRef.current;
      const backup = loadLocalBackup(userId);
      const localBlob = hasSignificantData(inMemory) ? inMemory
        : (hasSignificantData(backup) ? backup : inMemory);

      const { action, data: winner, rescueLocal, rescueCloud } = decideSync(localBlob, cloudBlob);

      if (action === 'bajar') {
        // Gana la nube: guardamos el local perdedor antes de pisarlo.
        if (rescueLocal) stashRescueCopy('nube-gano', rescueLocal);
        const migrated = migrateData(cloudBlob); // migración lazy de esquema
        skipNextSync.current = true;
        setData(migrated, { stamp: false });
        saveLocalBackup(userId, migrated);
        if (migrated !== cloudBlob) {
          await forceUploadToSupabase(userId, migrated);
        } else {
          setCloudStatus("synced");
          saveLastSyncAt();
        }
        return;
      }

      // Gana lo local: NO pisamos la data, subimos lo nuestro a la nube.
      if (rescueCloud) {
        // La nube queda pisada por lo local: guardamos su copia en una llave
        // aparte para no tapar el rescate de datos locales.
        stashRescueCopy('local-gano', rescueCloud, CLOUD_RESCUE_KEY);
      }
      const migrated = migrateData(winner);
      if (migrated !== inMemory) {
        skipNextSync.current = true;
        setData(migrated, { stamp: false });
      }
      if (action === 'subir') {
        saveLocalBackup(userId, migrated);
        await forceUploadToSupabase(userId, migrated);
      } else {
        // Nada que subir (usuaria nueva sin datos en ningún lado)
        setCloudStatus("synced");
      }
    } catch (e) {
      // Sin nube: seguimos con los datos locales, que son la fuente de verdad.
      setCloudStatus("offline");
    }
  };

  // Auth: single listener handles initial session + changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setAuthUser(session.user);
          saveLocalSession({ userId: session.user.id, email: session.user.email });
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
          if (!intentionalSignOut.current) {
            // SIGNED_OUT sin que la usuaria lo pidiera: token inválido, proyecto
            // pausado o fallo de red. NO se borra nada — seguimos en modo local.
            setCloudStatus("offline");
            if (loadLocalSession() || hasSignificantData(dataRef.current)) {
              setAuthPhase("app");
              return;
            }
            setAuthUser(null);
            const seenLocal = localStorage.getItem('qori-onboarding');
            setAuthPhase(seenLocal ? "auth" : "onboarding");
            return;
          }
          // Cierre de sesión intencional: siempre dejamos copia antes de borrar.
          intentionalSignOut.current = false;
          stashRescueCopy('cierre-sesion', dataRef.current);
          clearLocalData();
          clearLocalSession();
          setAuthUser(null);
          setData(initData(), { stamp: false });
          const seen = localStorage.getItem('qori-onboarding');
          setAuthPhase(seen ? "auth" : "onboarding");
        }
        // Other no-session events (TOKEN_REFRESHED, etc.) — ignore, stay in current phase
      } catch (e) {
        // Nunca dejar a la usuaria fuera por un error de la nube: si hay sesión
        // local o datos en el dispositivo, se entra igual.
        if (loadLocalSession() || hasSignificantData(dataRef.current)) {
          setCloudStatus("offline");
          setAuthPhase("app");
          return;
        }
        const seen = localStorage.getItem('qori-onboarding');
        setAuthPhase(seen ? "auth" : "onboarding");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Reintento de conexión con la nube: la app ya funciona sin ella, pero
  // cuando vuelve queremos sincronizar sin obligar a recargar.
  const retryCloud = useCallback(async () => {
    try { if (localStorage.getItem('qori-demo')) return false; } catch (e) {}
    setCloudStatus("syncing");
    try {
      const { data: sess, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = sess?.session;
      if (!session?.user) { setCloudStatus("offline"); return false; }
      setAuthUser(session.user);
      saveLocalSession({ userId: session.user.id, email: session.user.email });
      isLoadingUserData.current = true;
      try { await loadUserData(session.user.id); } finally { isLoadingUserData.current = false; }
      return true;
    } catch (e) {
      setCloudStatus("offline");
      return false;
    }
  }, []);

  // Mientras estemos offline: reintentar cada 60s, al volver la red y al
  // recuperar el foco de la pestaña.
  useEffect(() => {
    if (authPhase !== "app") return;
    if (cloudStatus !== "offline") return;
    const id = setInterval(() => { retryCloud(); }, 60000);
    const onOnline = () => { retryCloud(); };
    const onVisible = () => { if (document.visibilityState === "visible") retryCloud(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authPhase, cloudStatus, retryCloud]);

  // Nada de "Conectando..." eterno: si la nube no contesta, lo decimos.
  useEffect(() => {
    if (authPhase !== "app") return;
    if (cloudStatus !== "syncing") return;
    const t = setTimeout(() => {
      setCloudStatus(s => (s === "syncing" ? "offline" : s));
    }, 8000);
    return () => clearTimeout(t);
  }, [authPhase, cloudStatus]);

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

  // Bandeja de gastos por confirmar (F8): compras que el atajo de iOS dejó en
  // `inbox`. Local-first a rajatabla: si Supabase no responde, fetchPendingInbox
  // devuelve [] y acá no pasa nada — ni error en pantalla ni bloqueo.
  useEffect(() => {
    if (authPhase !== "app" || !authUser) { setInboxItems([]); return; }
    let vivo = true;
    (async () => {
      await flushInboxMarks(supabase, authUser.id); // marcas que quedaron debiendo
      const items = await fetchPendingInbox(supabase, authUser.id);
      if (vivo) setInboxItems(items);
    })();
    return () => { vivo = false; };
  }, [authPhase, authUser]);

  // Saca el pendiente de la lista y cierra la hoja cuando ya no queda ninguno.
  const dropInboxItem = (id) => {
    setInboxItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) setShowInbox(false);
      return next;
    });
  };

  // Confirmar un pendiente: el gasto entra al blob local con la fecha correcta
  // (misma forma que registerExpense) y la fila se marca `confirmed` en la nube.
  // Si la marca falla queda en cola de reintentos: el gasto local NO se pierde.
  const registerInboxItem = (item, form) => {
    const a = Number(form.amt);
    if (!a || a <= 0) return;
    const d = (form.desc || "").trim() || "Compra";
    const pm = form.pm || null;
    const when = parseDateInput(form.dateStr) || new Date(item.occurredAt);
    setData(p => ({
      ...p,
      expenses: [...p.expenses, {
        id: genId(), amount: a, description: d,
        date: when.toISOString(), month: monthLabelOf(when),
        category: slimCat(form.cat), subcategory: form.sub || null,
        paymentMethodId: pm,
      }],
      ...(pm ? { lastPaymentMethodId: pm } : {}),
    }));
    dropInboxItem(item.id);
    showToast((form.cat ? form.cat.emoji + " " : "") + d + " " + fmtWith(a, data.currency) + " registrado");
    markInboxRowOrQueue(supabase, item.id, "confirmed");
  };

  const discardInboxItem = (item) => {
    dropInboxItem(item.id);
    showToast("Compra descartada");
    markInboxRowOrQueue(supabase, item.id, "discarded");
  };

  // Show name setup if logged in and no name set
  useEffect(() => {
    if (authUser && authPhase === "app" && !isLoadingUserData.current && !data.userName) {
      setShowNameSetup(true);
    }
  }, [authUser, authPhase, data.userName]);

  // Persistir el quiz de diagnóstico del onboarding: se guarda temporalmente en
  // localStorage 'qori-quiz-result' (en el onboarding aún no hay data cargada) y
  // aquí pasa a data.education.quizResult la primera vez que entramos al app con
  // data lista (cubre login real y modo demo, donde buildDemoData pisa la data).
  useEffect(() => {
    if (authPhase !== "app") return;
    if (isLoadingUserData.current) return; // esperar a que cargue la data de la nube
    let raw; try { raw = localStorage.getItem('qori-quiz-result'); } catch (e) {}
    if (!raw) return;
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {}
    if (parsed && parsed.segment && !data.education?.quizResult) {
      setData(p => ({ ...p, education: { ...(p.education || { completedLessons: [], simulatorState: null }), quizResult: parsed } }));
    }
    try { localStorage.removeItem('qori-quiz-result'); } catch (e) {}
  }, [authPhase, data]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Tipo de cambio referencial (F12): se consulta una sola vez por sesión y se
  // guarda el último conocido en data.fx, para que el equivalente en soles de
  // la deuda en dólares siga apareciendo SIN CONEXIÓN (local-first).
  // Si la API no responde no pasa nada en pantalla: se usa el último conocido
  // y se muestra su fecha; si nunca hubo ninguno, no se muestra el equivalente.
  useEffect(() => {
    if (authPhase !== "app" || fxPedido.current) return;
    if (isLoadingUserData.current) return;
    // Sin una sola línea en dólares no hace falta molestar a nadie.
    if (!(data.paymentMethods || []).some(m => hasLine(m, "USD"))) return;
    // Si el último conocido es de hace menos de 6 horas, ese vale.
    const guardado = data.fx && data.fx.actualizadoEn ? new Date(data.fx.actualizadoEn) : null;
    if (guardado && !isNaN(guardado) && Date.now() - guardado.getTime() < 6 * 60 * 60 * 1000) return;
    fxPedido.current = true;
    fetch("/api/tipo-cambio")
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j || !(Number(j.venta) > 0)) return; // 503 o respuesta rara: se ignora en silencio
        setData(p => ({
          ...p,
          fx: {
            venta: Number(j.venta),
            fecha: j.fecha || new Date().toISOString().slice(0, 10),
            fuente: j.fuente || "referencial",
            actualizadoEn: new Date().toISOString(),
          },
        }));
      })
      .catch(() => {}); // sin conexión: manda el último conocido
  }, [authPhase, data.paymentMethods, data.fx]);


  const curMonth = getCurrentMonthLabel();
  const todayExp = data.expenses.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  // Los dólares no se suman a los soles (F10): van en su propia línea.
  const todayTotal = todayExp.filter(isPEN).reduce((s, e) => s + e.amount, 0);
  const todayTotalUSD = sumUSD(todayExp);
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
      setData(p => ({ ...p, expenses: [...p.expenses, { id: genId(), amount: a, description: d, date: new Date().toISOString(), month: curMonth, paymentMethodId: getDefaultPaymentMethodId(p) }] }));
      showToast(d + " " + fmt(a) + " registrado");
    }});
  };
  const deleteExpense = (id) => setConfirm({ message: "¿Eliminar este gasto?", onConfirm: () => { setData(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) })); showToast("Gasto eliminado"); }});
  const saveExpenseEdit = (id) => {
    setData(p => ({ ...p, expenses: p.expenses.map(e => {
      if (e.id !== id) return e;
      const newDate = editExpDate ? new Date(editExpDate + "T12:00:00").toISOString() : e.date;
      const newMonth = (() => { const d = new Date(newDate); return MONTHS[d.getMonth()] + " " + d.getFullYear(); })();
      return { ...e, description: editExpDesc || e.description, amount: Number(editExpAmt) || e.amount, date: newDate, month: newMonth, category: editExpCat !== undefined ? slimCat(editExpCat) : e.category, subcategory: editExpSub !== undefined ? editExpSub : (e.subcategory ?? null), paymentMethodId: editExpPm !== undefined ? editExpPm : (e.paymentMethodId ?? null) };
    })}));
    if (editExpPm !== undefined && editExpPm) setData(p => ({ ...p, lastPaymentMethodId: editExpPm }));
    setEditExpId(null); setEditExpDesc(""); setEditExpAmt(""); setEditExpDate(""); setEditExpCat(undefined); setEditExpSub(undefined); setEditExpPm(undefined); setShowExpCatPicker(false);
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
  // F14: el día en que entra el ingreso. Opcional — si lo dejó vacío, el ingreso
  // simplemente no tiene fecha y la app no se inventa ninguna.
  const saveIncomeDay = (id) => {
    const raw = editIncomeDayVal.trim();
    const dia = raw === "" ? null : normalizaDiaDelMes(raw);
    if (raw !== "" && dia === null) { showToast("El día tiene que estar entre 1 y 31"); return; }
    setData(p => ({ ...p, incomeFixed: p.incomeFixed.map(i => i.id === id ? { ...i, day: dia } : i) }));
    setEditIncomeDayId(null); setEditIncomeDayVal("");
    showToast(dia ? `Entra el ${dia} de cada mes` : "Ingreso sin fecha");
  };
  const addFixedIncome = () => {
    if (!newFixedIncomeName.trim()) return;
    const n = newFixedIncomeName.trim();
    const raw = newFixedIncomeDay.trim();
    const dia = raw === "" ? null : normalizaDiaDelMes(raw);
    if (raw !== "" && dia === null) { showToast("El día tiene que estar entre 1 y 31"); return; }
    setConfirm({ message: dia ? `¿Agregar "${n}" como ingreso fijo que entra el ${dia}?` : `¿Agregar "${n}" como ingreso fijo?`, onConfirm: () => {
      setData(p => ({ ...p, incomeFixed: [...p.incomeFixed, { id: genId(), name: n, amount: 0, month: curMonth, day: dia }] }));
      setNewFixedIncomeName(""); setNewFixedIncomeDay(""); setShowAddFixedIncome(false);
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
  // --- Subcategorías (solo detalle: no llevan presupuesto propio) ---
  // Siempre leemos `c.subcategories || []` para que los datos viejos, sin el
  // campo, funcionen sin migración.
  const mapCat = (type, catId, fn) => setData(p => ({
    ...p,
    categories: { ...p.categories, [type]: p.categories[type].map(c => c.id === catId ? fn(c) : c) },
  }));
  const addSubcat = (type, catId, name) => {
    const n = (name || "").trim();
    if (!n) return;
    mapCat(type, catId, c => ({ ...c, subcategories: [...(c.subcategories || []), { id: genId(), name: n }] }));
    showToast("Subcategoría agregada");
  };
  const saveSubcatEdit = (type, catId, subId, name) => {
    const n = (name || "").trim();
    if (!n) return;
    mapCat(type, catId, c => ({ ...c, subcategories: (c.subcategories || []).map(s => s.id === subId ? { ...s, name: n } : s) }));
  };
  const deleteSubcat = (type, catId, subId) => {
    setConfirm({ message: "¿Eliminar esta subcategoría? Los gastos que ya la usan conservan el nombre.", onConfirm: () => {
      mapCat(type, catId, c => ({ ...c, subcategories: (c.subcategories || []).filter(s => s.id !== subId) }));
      showToast("Subcategoría eliminada");
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
        setScanPm(getDefaultPaymentMethodId(dataRef.current));
        // La fecha detectada se normaliza a yyyy-mm-dd para que sea editable
        // en la hoja de confirmación antes de registrar.
        setScanResults(result.expenses.map(r => ({ ...r, date: scanDateToInput(r.date) })));
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
      // r.date ya viene normalizada a yyyy-mm-dd y la usuaria pudo corregirla
      // en la hoja, así que se respeta tal cual: nada de forzar el año.
      const when = parseDateInput(r.date) || new Date();
      return {
        id: genId(),
        amount: Number(r.amount) || 0,
        description: r.description || "Gasto escaneado",
        date: when.toISOString(),
        month: monthLabelOf(when),
        paymentMethodId: scanPm || null,
      };
    });
    setData(p => ({ ...p, expenses: [...p.expenses, ...newExpenses], ...(scanPm ? { lastPaymentMethodId: scanPm } : {}) }));
    showToast(newExpenses.length + " gastos registrados");
    setScanResults(null);
  };

  const updateScanItem = (idx, patch) => {
    setScanResults(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
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
  const enterDemo = () => {
    try { localStorage.setItem('qori-demo', '1'); } catch(e) {}
    setData(buildDemoData());
    setAuthPhase("app");
    showToast("Modo demo: los datos no se guardan en la nube");
  };
  // Rescate desde el login: entrar en modo local sin tocar Supabase.
  const enterOffline = () => {
    setCloudStatus("offline");
    setAuthPhase("app");
    showToast("Modo local: tus datos están en este dispositivo");
  };
  const signOut = async () => {
    let isDemo = false;
    try { isDemo = !!localStorage.getItem('qori-demo'); } catch(e) {}
    const lastSync = loadLastSyncAt();
    const current = dataRef.current;
    const pendientes = !isDemo && hasSignificantData(current) &&
      (!lastSync || (current.updatedAt && new Date(current.updatedAt) > new Date(lastSync)));
    const message = isDemo
      ? "¿Salir del modo demo?"
      : pendientes
        ? "Tienes cambios que no se han subido a la nube. Si cierras sesión se borrarán de este dispositivo."
        : "¿Cerrar sesión?";
    setConfirm({
      message,
      secondary: pendientes ? { label: "⬇️ Exportar mis datos antes", onClick: () => { downloadBackup(current); showToast("Backup descargado"); } } : null,
      onConfirm: async () => {
        if (isDemo) {
          try { localStorage.removeItem('qori-demo'); } catch(e) {}
          stashRescueCopy('salida-demo', dataRef.current);
          clearLocalData();
          clearLocalSession();
          setData(initData(), { stamp: false });
          setAuthPhase("auth");
          return;
        }
        intentionalSignOut.current = true;
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // La nube no responde, pero el cierre de sesión sí debe ocurrir:
          // guardamos copia de rescate y limpiamos localmente.
          stashRescueCopy('cierre-sesion', dataRef.current);
          clearLocalData();
          clearLocalSession();
          setAuthUser(null);
          setData(initData(), { stamp: false });
          intentionalSignOut.current = false;
          let seen = null; try { seen = localStorage.getItem('qori-onboarding'); } catch(e2) {}
          setAuthPhase(seen ? "auth" : "onboarding");
        }
      },
    });
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

  // dateStr: value de <input type="date"> (yyyy-mm-dd). Si no llega, usa la del modal.
  const registerExpense = (amt, desc, cat, dateStr, sub) => {
    const a = Number(amt); if (!a || a <= 0) return;
    const d = desc || "Gasto";
    const pm = pendingExpPm || null;
    const when = parseDateInput(dateStr !== undefined ? dateStr : pendingExpDate) || new Date();
    // Solo se guarda `currency` si es en dolares: los soles siguen sin campo,
    // igual que todo lo registrado antes de F10.
    const card = (dataRef.current.paymentMethods || []).find(m => m.id === pm);
    const esUsd = pendingExpCur === "USD" && hasLine(card, "USD");
    setData(p => ({ ...p, expenses: [...p.expenses, { id: genId(), amount: a, description: d, date: when.toISOString(), month: monthLabelOf(when), category: slimCat(cat), subcategory: (sub !== undefined ? sub : pendingExpSub) || null, paymentMethodId: pm, ...(esUsd ? { currency: "USD" } : {}) }], ...(pm ? { lastPaymentMethodId: pm } : {}) }));
    showToast((cat ? cat.emoji + " " : "") + d + " " + fmtWith(a, esUsd ? "USD" : data.currency) + " registrado");
    setShowCatPicker(false); setShowAddModal(false);
    setPendingExpAmt(""); setPendingExpDesc(""); setPendingExpCat(null); setPendingExpPm(null); setPendingExpDate(toDateInput()); setPendingExpSub(null); setPendingExpCur("PEN");
    setManAmt(""); setManDesc("");
  };

  const openCatPicker = (amt, desc) => {
    setPendingExpAmt(String(amt)); setPendingExpDesc(desc || "Gasto");
    setPendingExpCat(null); setPendingExpSub(null); setPendingExpPm(getDefaultPaymentMethodId(dataRef.current)); setPendingExpCur("PEN");
    setPendingExpDate(toDateInput()); // hoy por defecto
    setShowAddModal(false); setShowCatPicker(true);
  };


  const TABS = [{ id: "home", label: "Inicio", Icon: HomeIcon }, { id: "month", label: "Mi Mes", Icon: CalIcon }, { id: "income", label: "Ingresos", Icon: WalletIcon }, { id: "config", label: "Config", Icon: GearIcon }];


  if (authPhase === "loading") return (
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <style>{sharedStyle}</style>
      <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2, fontFamily: FONT_TITLE }}>Qori<span style={{ color: "rgba(255,255,255,0.45)" }}>.</span></div>
      <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (authPhase === "onboarding") return <Onboarding />;

  if (authPhase === "auth") return (
    <Login
      authTab={authTab} setAuthTab={setAuthTab}
      authEmail={authEmail} setAuthEmail={setAuthEmail}
      authPass={authPass} setAuthPass={setAuthPass}
      authPhone={authPhone} setAuthPhone={setAuthPhone}
      authLoading={authLoading} authError={authError} setAuthError={setAuthError}
      signIn={signIn} signUp={signUp} enterDemo={enterDemo} enterOffline={enterOffline}
    />
  );

  if (authPhase === "pin-setup") return (
    <Pin
      pinDigits={pinDigits} setPinDigits={setPinDigits}
      pinVal={pinVal} setPinVal={setPinVal}
      pinPhase={pinPhase} authError={authError} savePinSetup={savePinSetup}
    />
  );

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 430, margin: "0 auto", position: "relative", background: tab === "home" ? "#6C5CE7" : C.beige }}>
      <style>{sharedStyle}</style>
      {toast && <Toast toast={toast} />}
      {scanResults && (
        <ScanResultsSheet scanResults={scanResults} setScanResults={setScanResults} removeScanItem={removeScanItem} updateScanItem={updateScanItem} confirmScanResults={confirmScanResults} scanPm={scanPm} setScanPm={setScanPm} />
      )}
      {showInbox && inboxItems.length > 0 && (
        <InboxSheet items={inboxItems} onRegister={registerInboxItem} onDiscard={discardInboxItem} onClose={() => setShowInbox(false)} />
      )}
      {confirm && <ConfirmModal confirm={confirm} setConfirm={setConfirm} />}
      {tab === "home" && (
        <Home
          fmt={fmt} curMonth={curMonth} todayTotal={todayTotal} todayTotalUSD={todayTotalUSD} recentExp={recentExp} budgetAlerts={budgetAlerts}
          inboxItems={inboxItems} setShowInbox={setShowInbox}
          editExpId={editExpId} setEditExpId={setEditExpId} editExpDesc={editExpDesc} setEditExpDesc={setEditExpDesc}
          editExpAmt={editExpAmt} setEditExpAmt={setEditExpAmt} editExpDate={editExpDate} setEditExpDate={setEditExpDate}
          editExpCat={editExpCat} setEditExpCat={setEditExpCat} editExpSub={editExpSub} setEditExpSub={setEditExpSub} editExpPm={editExpPm} setEditExpPm={setEditExpPm}
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
          editExpCat={editExpCat} setEditExpCat={setEditExpCat} editExpSub={editExpSub} setEditExpSub={setEditExpSub} editExpPm={editExpPm} setEditExpPm={setEditExpPm}
          saveExpenseEdit={saveExpenseEdit} deleteExpense={deleteExpense}
        />
      )}
      {tab === "income" && (
        <Ingresos
          fmt={fmt} curMonth={curMonth}
          editIncomeId={editIncomeId} setEditIncomeId={setEditIncomeId} editIncomeAmt={editIncomeAmt} setEditIncomeAmt={setEditIncomeAmt} saveIncomeAmt={saveIncomeAmt}
          editFixedIncomeName={editFixedIncomeName} setEditFixedIncomeName={setEditFixedIncomeName} editFixedIncomeNameVal={editFixedIncomeNameVal} setEditFixedIncomeNameVal={setEditFixedIncomeNameVal} saveFixedIncomeName={saveFixedIncomeName}
          showAddFixedIncome={showAddFixedIncome} setShowAddFixedIncome={setShowAddFixedIncome} newFixedIncomeName={newFixedIncomeName} setNewFixedIncomeName={setNewFixedIncomeName} addFixedIncome={addFixedIncome} deleteFixedIncome={deleteFixedIncome}
          newFixedIncomeDay={newFixedIncomeDay} setNewFixedIncomeDay={setNewFixedIncomeDay}
          editIncomeDayId={editIncomeDayId} setEditIncomeDayId={setEditIncomeDayId} editIncomeDayVal={editIncomeDayVal} setEditIncomeDayVal={setEditIncomeDayVal} saveIncomeDay={saveIncomeDay}
          showAddExtra={showAddExtra} setShowAddExtra={setShowAddExtra} newExtraName={newExtraName} setNewExtraName={setNewExtraName} newExtraAmt={newExtraAmt} setNewExtraAmt={setNewExtraAmt} addExtra={addExtra} deleteExtra={deleteExtra}
          editExtraId={editExtraId} setEditExtraId={setEditExtraId} editExtraName={editExtraName} setEditExtraName={setEditExtraName} editExtraAmt={editExtraAmt} setEditExtraAmt={setEditExtraAmt}
          editExtraCategory={editExtraCategory} setEditExtraCategory={setEditExtraCategory} saveExtraEdit={saveExtraEdit}
        />
      )}
      {tab === "config" && <Config fmt={fmt} curMonth={curMonth} setSubScreen={setSubScreen} setConfirm={setConfirm} showToast={showToast} signOut={signOut} forceUploadToSupabase={forceUploadToSupabase} retryCloud={retryCloud} />}
      {/* Sub-screens (slide over tabs) */}
      <FijosScreen
        subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} curMonth={curMonth}
        setConfirm={setConfirm} showToast={showToast}
        togglePaid={togglePaid} saveFixedAmt={saveFixedAmt} deleteFixed={deleteFixed}
        editFixed={editFixed} setEditFixed={setEditFixed} editFixedAmt={editFixedAmt} setEditFixedAmt={setEditFixedAmt}
        editFixedExpName={editFixedExpName} setEditFixedExpName={setEditFixedExpName}
        editFixedExpNameVal={editFixedExpNameVal} setEditFixedExpNameVal={setEditFixedExpNameVal} saveFixedExpName={saveFixedExpName}
        editFixedExpType={editFixedExpType} setEditFixedExpType={setEditFixedExpType} saveFixedExpType={saveFixedExpType}
        showAddFixed={showAddFixed} setShowAddFixed={setShowAddFixed}
        newFixedName={newFixedName} setNewFixedName={setNewFixedName} newFixedType={newFixedType} setNewFixedType={setNewFixedType}
      />
      <CatsSubScreen type="gastos" title="Cats. Gastos" subScreen={subScreen} setSubScreen={setSubScreen}
        catEditId={catEditId} setCatEditId={setCatEditId} catEditEmoji={catEditEmoji} setCatEditEmoji={setCatEditEmoji}
        catEditName={catEditName} setCatEditName={setCatEditName} saveCatEdit={saveCatEdit} deleteCat={deleteCat} addCat={addCat}
        addSubcat={addSubcat} saveSubcatEdit={saveSubcatEdit} deleteSubcat={deleteSubcat}
        showAddCat={showAddCat} setShowAddCat={setShowAddCat} newCatEmoji={newCatEmoji} setNewCatEmoji={setNewCatEmoji}
        newCatName={newCatName} setNewCatName={setNewCatName}
      />
      <CatsSubScreen type="ingresos" title="Cats. Ingresos" subScreen={subScreen} setSubScreen={setSubScreen}
        catEditId={catEditId} setCatEditId={setCatEditId} catEditEmoji={catEditEmoji} setCatEditEmoji={setCatEditEmoji}
        catEditName={catEditName} setCatEditName={setCatEditName} saveCatEdit={saveCatEdit} deleteCat={deleteCat} addCat={addCat}
        addSubcat={addSubcat} saveSubcatEdit={saveSubcatEdit} deleteSubcat={deleteSubcat}
        showAddCat={showAddCat} setShowAddCat={setShowAddCat} newCatEmoji={newCatEmoji} setNewCatEmoji={setNewCatEmoji}
        newCatName={newCatName} setNewCatName={setNewCatName}
      />
      {/* Medios de pago sub-screen */}
      <MediosPagoScreen subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} showToast={showToast} setConfirm={setConfirm} />
      {/* Próximos pagos: cuánto vence y si alcanza el mes (key `proximos-pagos`) */}
      <ProximosPagosScreen subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} />
      {/* Pantallas de ciclo por tarjeta de crédito activa (key `card-{id}`) */}
      {(data.paymentMethods || []).filter(m => m.type === "credito" && !m.archived).map(card => (
        <CardCycleScreen key={card.id} card={card} subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} />
      ))}
      {/* Aprende sub-screen (educación crediticia) */}
      <AprendeScreen subScreen={subScreen} setSubScreen={setSubScreen} />
      {/* Simulador de tarjeta (F3): modo práctica, key `simulador` */}
      <SimuladorScreen subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} />
      {/* Presupuestos sub-screen */}
      <PresupuestosScreen subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} catSpend={catSpend} />
      {/* All categories subscreen */}
      <AllCatsScreen subScreen={subScreen} setSubScreen={setSubScreen} fmt={fmt} setSelectedCatDetail={setSelectedCatDetail} />
      {/* Category detail bottom sheet */}
      {selectedCatDetail && (
        <CatDetailSheet selectedCatDetail={selectedCatDetail} setSelectedCatDetail={setSelectedCatDetail} fmt={fmt} />
      )}
      {/* Add expense modal (bottom sheet) */}
      {showAddModal && (
        <AddExpenseModal setShowAddModal={setShowAddModal} handleRecord={handleRecord} setShowManual={setShowManual} setShowScanOptions={setShowScanOptions} scanLoading={scanLoading} />
      )}
      {/* Scan file inputs (triggered from add modal) */}
      {showScanOptions && !showAddModal && (
        <ScanOptionsModal setShowScanOptions={setShowScanOptions} cameraInputRef={cameraInputRef} fileInputRef={fileInputRef} />
      )}
      {/* Manual entry modal */}
      {showManual && (
        <ManualModal manAmt={manAmt} setManAmt={setManAmt} manDesc={manDesc} setManDesc={setManDesc} setShowManual={setShowManual} openCatPicker={openCatPicker} />
      )}
      {/* Voice recording indicator */}
      {recording && (
        <RecordingOverlay recTime={recTime} setRecording={setRecording} recognitionRef={recognitionRef} />
      )}

      {/* Name setup screen */}
      {showNameSetup && (
        <NameSetupScreen nameSetupValue={nameSetupValue} setNameSetupValue={setNameSetupValue} setShowNameSetup={setShowNameSetup} />
      )}

      {/* Category picker modal */}
      {showCatPicker && (
        <CatPickerModal setShowCatPicker={setShowCatPicker} pendingExpAmt={pendingExpAmt} pendingExpDesc={pendingExpDesc} pendingExpCat={pendingExpCat} setPendingExpCat={setPendingExpCat} pendingExpPm={pendingExpPm} setPendingExpPm={setPendingExpPm} pendingExpDate={pendingExpDate} setPendingExpDate={setPendingExpDate} pendingExpSub={pendingExpSub} setPendingExpSub={setPendingExpSub} pendingExpCur={pendingExpCur} setPendingExpCur={setPendingExpCur} registerExpense={registerExpense} />
      )}
      {showNotifPanel && (
        <NotifPanel setShowNotifPanel={setShowNotifPanel} budgetAlerts={budgetAlerts} />
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
      {showCarryoverModal && authPhase === "app" && (
        <CarryoverModal
          prevMonthBalance={prevMonthBalance} prevMonthLabel={prevMonthLabel} prevMonthName={prevMonthName}
          curMonthName={curMonthName} curMonth={curMonth} carryoverSlide={carryoverSlide} setCarryoverSlide={setCarryoverSlide}
          setShowCarryoverModal={setShowCarryoverModal} fmt={fmt} showToast={showToast}
        />
      )}

      {/* ── Budget feature announcement modal ── */}
      {showBudgetFeatureModal && authPhase === "app" && !showCarryoverModal && (
        <BudgetFeatureModal setShowBudgetFeatureModal={setShowBudgetFeatureModal} setSubScreen={setSubScreen} />
      )}
    </div>
  );
}
