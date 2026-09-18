import { useState, useEffect } from "react";
import { C, FONT_BODY, FONT_TITLE, inputStyle } from "../../theme";
import { sharedStyle } from "../shared/globalStyles";
import { hasSignificantData } from "../../lib/sync";
import { downloadBackup, readLocalBlob } from "../../lib/export";

const fmtFecha = (iso) => {
  if (!iso) return "desconocida";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "desconocida";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Último cambio conocido: el updatedAt del blob o, si es un blob viejo sin
// marca, la fecha del gasto más reciente.
const ultimoCambio = (blob) => {
  if (!blob) return null;
  if (blob.updatedAt) return blob.updatedAt;
  const fechas = (blob.expenses || []).map(e => new Date(e.date).getTime()).filter(t => !Number.isNaN(t));
  if (!fechas.length) return null;
  return new Date(Math.max(...fechas)).toISOString();
};

export default function Login({
  authTab, setAuthTab, authEmail, setAuthEmail, authPass, setAuthPass,
  authPhone, setAuthPhone, authLoading, authError, setAuthError, signIn, signUp, enterDemo, enterOffline,
}) {
  // Rescate local: si hay datos en este dispositivo, la usuaria SIEMPRE debe
  // poder llegar a ellos aunque la nube no responda.
  const [localBlob, setLocalBlob] = useState(null);
  const [showRescate, setShowRescate] = useState(false);
  useEffect(() => {
    const b = readLocalBlob();
    if (hasSignificantData(b)) setLocalBlob(b);
  }, []);

  if (showRescate && localBlob) {
    const nGastos = localBlob.expenses?.length || 0;
    return (
      <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.beige, display: "flex", flexDirection: "column", overflowY: "auto", padding: "56px 28px 40px" }}>
        <style>{sharedStyle}</style>
        <button onClick={() => setShowRescate(false)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.muted, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 20, padding: 0 }}>‹ Volver</button>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE, marginBottom: 10 }}>Tus datos están aquí</div>
        <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, marginBottom: 22 }}>
          Encontramos datos guardados en este dispositivo. No dependen de la nube: puedes descargarlos o seguir usándolos ahora mismo.
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 22, border: "1px solid #E8E4DA" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>Gastos registrados</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.purple, fontFamily: FONT_TITLE, marginBottom: 12 }}>{nGastos}</div>
          <div style={{ fontSize: 13, color: C.muted }}>Último cambio</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.black }}>{fmtFecha(ultimoCambio(localBlob))}</div>
        </div>
        <button onClick={() => downloadBackup(localBlob)} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.green, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>
          ⬇️ Descargar mis datos
        </button>
        <button onClick={() => enterOffline && enterOffline()} style={{ width: "100%", padding: 16, borderRadius: 14, background: C.purple, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Entrar sin conexión
        </button>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.5 }}>
          En modo sin conexión puedes ver y registrar gastos con normalidad. Cuando la nube vuelva a responder, se sincroniza sola.
        </div>
      </div>
    );
  }

  return (
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
          <button onClick={enterDemo} style={{ padding: "12px 0", background: "transparent", border: "none", color: C.purple, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Probar con datos de ejemplo →
          </button>
          {localBlob && (
            <button onClick={() => setShowRescate(true)} style={{ padding: "2px 0 10px", background: "transparent", border: "none", color: C.muted, fontSize: 13, fontWeight: 600, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>
              Tengo datos guardados en este dispositivo
            </button>
          )}
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
