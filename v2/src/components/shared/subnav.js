import { C, FONT_TITLE } from "../../theme";

// Estilo de sub-pantallas deslizantes — antes closure `subStyle(id)` en GastosApp.
export const subStyle = (subScreen, id) => ({
  position: "fixed", inset: 0, zIndex: 200,
  background: C.beige, display: "flex", flexDirection: "column",
  overflowY: "auto", overflowX: "hidden",
  transform: subScreen === id ? "translateX(0)" : "translateX(100%)",
  transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
});

// Cabecera de sub-pantalla con botón de volver — antes `subHeader(title, onBack)`.
export const subHeader = (title, onBack) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "52px 20px 12px", position: "sticky", top: 0, background: C.beige, zIndex: 10 }}>
    <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", fontSize: 22, color: C.black, flexShrink: 0 }}>‹</button>
    <div style={{ fontSize: 26, fontWeight: 900, color: C.black, fontStyle: "italic", fontFamily: FONT_TITLE }}>{title}</div>
  </div>
);
