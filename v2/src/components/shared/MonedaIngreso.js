import { C, inputStyle } from "../../theme";
import { fmtWith } from "../../lib/format";

// F24: moneda de un ingreso, y el tipo de cambio que le dieron al cambiarlo.
//
// Su pedido: poder registrar un ingreso en dólares y, opcionalmente, decir a
// cuánto se lo cambiaron. Ese tipo de cambio es dato suyo, no una referencia
// inventada — por eso cuando lo pone, el ingreso entra a los totales en soles
// con ESA tasa. Si no lo pone, se queda en dólares y va como línea aparte.

const SYM = { PEN: "S/", USD: "US$" };
const LABEL = { PEN: "Soles", USD: "Dólares" };

export const enSolesConTasa = (monto, tasa) => {
  const m = Number(monto), t = Number(tasa);
  if (!Number.isFinite(m) || !Number.isFinite(t) || t <= 0) return null;
  return Math.round(m * t * 100) / 100;
};

export function MonedaIngreso({ moneda, setMoneda, tasa, setTasa, monto, compacto }) {
  const equiv = moneda === "USD" ? enSolesConTasa(monto, tasa) : null;
  return (
    <div style={{ marginBottom: compacto ? 8 : 10 }}>
      <div style={{ display: "flex", background: "#F0EDE4", borderRadius: 12, padding: 4, marginBottom: moneda === "USD" ? 10 : 0 }}>
        {["PEN", "USD"].map(c => (
          <button
            key={c}
            onClick={() => { setMoneda(c); if (c === "PEN") setTasa(""); }}
            style={{ flex: 1, padding: compacto ? "7px 0" : "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: moneda === c ? 800 : 600, color: moneda === c ? C.black : C.muted, background: moneda === c ? "#fff" : "transparent", boxShadow: moneda === c ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}
          >
            {SYM[c]} {LABEL[c]}
          </button>
        ))}
      </div>
      {moneda === "USD" && (
        <>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>¿A cuánto te lo cambiaron? (opcional)</div>
          <input
            type="number" inputMode="decimal" step="0.001" placeholder="Ej: 3.72"
            value={tasa} onChange={e => setTasa(e.target.value)}
            style={{ ...inputStyle, color: C.black, marginBottom: 6 }}
          />
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            {equiv !== null && Number(monto) > 0
              ? <>Son <strong style={{ color: C.black }}>{fmtWith(equiv, "PEN")}</strong>. Con el tipo de cambio puesto, este ingreso cuenta en tus soles.</>
              : "Si lo cambiaste a soles, pon el tipo de cambio que te dieron y el ingreso cuenta en tus soles. Si lo dejaste en dólares, déjalo vacío: va aparte y no se convierte."}
          </div>
        </>
      )}
    </div>
  );
}
