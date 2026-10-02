export const C = { green: "#1B6B3A", greenLight: "#2D9F5B", orange: "#E8561E", orangeLight: "#FF7A45", purple: "#6C5CE7", purpleLight: "#8B7FF0", purpleSoft: "#E0DBFF", beige: "#F5F2EC", black: "#141218", muted: "#8A8A8E", red: "#C1121F" };
// Font constants — Syne for headings/numbers, ClashGrotesk (body default) for everything else
export const FONT_TITLE = "'Syne', system-ui, sans-serif";
export const FONT_BODY  = "'ClashGrotesk', system-ui, sans-serif";
export const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #D4D0C8", fontSize: 15, fontFamily: FONT_BODY, background: "#FAFAF5", boxSizing: "border-box" };
export const cardStyle = { background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };
// Semáforo de uso de línea de crédito: verde <30%, naranja claro 30-60%,
// naranja 60-90%, ROJO desde 90%.
//
// F42: antes 61% y 98% se pintaban igual. Una tarjeta al 98% está a nada de
// sobregirarse y tiene que verse distinta de uso alto pero bajo control.
export const CASI_AL_TOPE = 90;
export const usageColor = (pct) => (pct >= CASI_AL_TOPE ? C.red : pct > 60 ? C.orange : pct >= 30 ? C.orangeLight : C.green);
export const alTope = (pct) => Number(pct) >= CASI_AL_TOPE;
