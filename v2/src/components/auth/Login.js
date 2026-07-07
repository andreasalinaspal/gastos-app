import { C, FONT_BODY, FONT_TITLE, inputStyle } from "../../theme";
import { sharedStyle } from "../shared/globalStyles";

export default function Login({
  authTab, setAuthTab, authEmail, setAuthEmail, authPass, setAuthPass,
  authPhone, setAuthPhone, authLoading, authError, setAuthError, signIn, signUp,
}) {
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
        </div>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
