import { useRef, useState, useEffect } from "react";
import { C, FONT_TITLE, cardStyle, inputStyle } from "../../theme";
import { initData } from "../../constants";
import { migrateData } from "../../lib/migrate";
import { loadLastSyncAt } from "../../lib/localSession";
import { LESSONS } from "../../content/lessons";
import { useStore } from "../../state/store";
import { textoVersion, buscaVersion } from "../../lib/version";
import { resumenDeudas } from "../../lib/deudas";
import { resumenSuscripciones } from "../../lib/suscripciones";

// F25: resumen de una línea para la fila de Config.
const resumenDeudasTexto = (deudas, fmt) => {
  const r = resumenDeudas(deudas || []);
  const n = r.PEN.deudas.length + r.USD.deudas.length;
  if (n === 0) return "Nadie te debe ahora mismo";
  const partes = [];
  if (r.PEN.total > 0) partes.push(fmt(r.PEN.total));
  if (r.USD.total > 0) partes.push("US$" + r.USD.total);
  const quien = n === 1 ? "1 persona" : n + " personas";
  return partes.join(" + ") + " · " + quien + (r.vencidas.length > 0 ? " · ⚠️ hay cuotas vencidas" : "");
};

const cfgRowStyle = { display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #F0EDE4", cursor: "pointer", gap: 14 };

const fmtSync = (iso) => {
  if (!iso) return "nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "nunca";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// F21: qué versión tiene este celular, y un botón para saber si hay una nueva.
//
// Existe porque ella no tenía cómo comprobarlo sola: la app se ve igual hasta
// que el celular suelta la versión vieja, y terminaba preguntando "¿ya se
// publicó?". Acá lo ve y, si hay algo nuevo, lo trae con un toque.
function VersionApp({ showToast }) {
  const [estado, setEstado] = useState(null); // null | buscando | al-dia | nueva | sin-conexion | desconocido

  const revisar = async () => {
    setEstado("buscando");
    const r = await buscaVersion();
    setEstado(r.estado);
    if (r.estado === "al-dia") showToast("✅ Ya tienes la última versión");
    if (r.estado === "sin-conexion") showToast("Sin conexión — no se pudo revisar");
    if (r.estado === "desconocido") showToast("No se pudo saber qué versión hay");
  };

  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>{textoVersion()}</div>
      {estado === "nueva" ? (
        <>
          <div style={{ fontSize: 12.5, color: C.black, fontWeight: 700, marginBottom: 8 }}>Hay una versión nueva 🎉</div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 18px", borderRadius: 10, background: C.purple, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Actualizar ahora
          </button>
        </>
      ) : (
        <button
          onClick={revisar}
          disabled={estado === "buscando"}
          style={{ padding: "9px 16px", borderRadius: 10, background: "transparent", color: C.muted, border: "1.5px solid #E0DCD4", fontSize: 12.5, fontWeight: 700, cursor: estado === "buscando" ? "default" : "pointer", fontFamily: "inherit" }}
        >
          {estado === "buscando" ? "Revisando…" : estado === "al-dia" ? "Estás al día ✅" : "¿Hay versión nueva?"}
        </button>
      )}
    </div>
  );
}

export default function Config({ fmt, curMonth, setSubScreen, setConfirm, showToast, signOut, forceUploadToSupabase, retryCloud }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const cloudStatus = useStore(s => s.cloudStatus);
  const setCloudStatus = useStore(s => s.setCloudStatus);
  const authUser = useStore(s => s.authUser);
  const backupInputRef = useRef(null);
  const [lastSync, setLastSync] = useState(null);
  useEffect(() => { setLastSync(loadLastSyncAt()); }, [cloudStatus]);
  const lastSyncLabel = fmtSync(lastSync);

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
            setData(migrateData(imported));
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
  return (
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
          <div onClick={() => setSubScreen("cats-ingreso")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>💰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Categorías de ingresos</div>
              <div style={{ fontSize: 12, color: C.muted }}>{(data.categories?.ingresos?.length || 0)} categorías</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("medios-pago")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>💳</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Medios de pago</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {(() => { const n = (data.paymentMethods || []).filter(m => m.type === "credito" && !m.archived).length; return n === 1 ? "1 tarjeta de crédito activa" : `${n} tarjetas de crédito activas`; })()}
              </div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          {/* F25: la plata que a ella le deben, con sus pagos y cuotas */}
          <div onClick={() => setSubScreen("deudas")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>🤝</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Te deben</div>
              <div style={{ fontSize: 12, color: C.muted }}>{resumenDeudasTexto(data.deudas, fmt)}</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          {/* F43: no se registran a mano — salen de sus propios gastos */}
          <div onClick={() => setSubScreen("suscripciones")} style={{ ...cfgRowStyle, borderBottom: "none" }}>
            <span style={{ fontSize: 22 }}>🔁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Suscripciones</div>
              <div style={{ fontSize: 12, color: C.muted }}>{resumenSuscripciones(data.expenses, fmt)}</div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
        </div>
        {/* Aprender — educación crediticia y simulador, fuera del Inicio para no recargarlo */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "14px 20px 8px" }}>Aprender</div>
        <div style={{ ...cardStyle, marginBottom: 12, overflow: "hidden", padding: 0 }}>
          <div onClick={() => setSubScreen("aprende")} style={cfgRowStyle}>
            <span style={{ fontSize: 22 }}>📚</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Aprende</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {(data.education?.completedLessons || []).length} de {LESSONS.length} lecciones · historial crediticio sin floro
              </div>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>›</span>
          </div>
          <div onClick={() => setSubScreen("simulador")} style={{ ...cfgRowStyle, borderBottom: "none" }}>
            <span style={{ fontSize: 22 }}>🎮</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.black }}>Practica con una tarjeta</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {data.education?.simulatorState ? `Score simulado: ${data.education.simulatorState.score}/100` : "Una tarjeta de mentira para aprender sin riesgo"}
              </div>
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
              {cloudStatus === "synced" ? "Sincronizado con la nube" : cloudStatus === "syncing" ? "Sincronizando..." : "Sin conexión a la nube"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            {cloudStatus === "offline"
              ? "Sin conexión a la nube — tus datos se guardan en este dispositivo. Puedes seguir usando Qori con normalidad; cuando la nube vuelva, se sincroniza sola."
              : "Tus datos se guardan en este dispositivo y se respaldan en la nube automáticamente."}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontWeight: 600 }}>
            Última sincronización: {lastSyncLabel}
          </div>
          <button
            onClick={async () => {
              setCloudStatus("syncing");
              if (cloudStatus === "offline" || !authUser) {
                const ok = retryCloud ? await retryCloud() : false;
                setLastSync(loadLastSyncAt());
                showToast(ok ? "✅ Conexión recuperada y datos sincronizados" : "❌ La nube sigue sin responder — tus datos siguen seguros aquí");
                return;
              }
              const ok = await forceUploadToSupabase(authUser.id, data);
              setLastSync(loadLastSyncAt());
              showToast(ok ? "✅ Datos sincronizados con la nube" : "❌ Error al sincronizar — revisa conexión");
            }}
            style={{ width: "100%", marginTop: 14, padding: 13, borderRadius: 12, background: C.purpleSoft, color: C.purple, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {cloudStatus === "offline" ? "🔄 Reintentar ahora" : "☁️ Sincronizar ahora"}
          </button>
        </div>
        {/* Cuenta */}
        <div style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>Cuenta</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{authUser?.email}</div>
          <button onClick={signOut} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#fff", color: C.orange, border: "2px solid " + C.orange, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cerrar sesión</button>
        </div>
        <button onClick={() => setConfirm({ message: "¿Resetear todos los datos? Esta acción no se puede deshacer.", onConfirm: () => { setData(initData()); showToast("Datos reseteados"); }})} style={{ width: "100%", padding: 14, borderRadius: 12, background: C.orange, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>Resetear datos</button>
        <VersionApp showToast={showToast} />
      </div>
    </div>
  );
}
