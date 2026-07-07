import { C, FONT_BODY, FONT_TITLE } from "../../theme";
import { sharedStyle } from "../shared/globalStyles";
import { useStore } from "../../state/store";

export default function Pin({ pinDigits, setPinDigits, pinVal, setPinVal, pinPhase, authError, savePinSetup }) {
  const setAuthPhase = useStore(s => s.setAuthPhase);
  return (
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
}
