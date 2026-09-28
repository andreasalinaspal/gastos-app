import { C } from "../../theme";
import { fmtWith } from "../../lib/format";
import { convertirAPEN, tasaVigente, textoTasa } from "../../lib/fx";

// Equivalente en soles de un monto en DÓLARES (F12).
//
// Es informativo y nada más: "just para tenerlo". NUNCA se suma a un total en
// soles — la prueba de "si me alcanza" sigue siendo solo con soles, porque los
// dólares se pagan aparte y en dólares. Por eso va siempre chico, gris y debajo
// del número de verdad.
//
// Si no hay tasa (nunca se pudo traer y la tarjeta no tiene la suya), no
// devuelve nada: no se inventa un número ni se muestra un error.

// Redondeado a soles enteros: es una referencia, los céntimos sobran.
const fmtSoles = (n) => fmtWith(Math.round(n), "PEN");

export function EquivalenteSoles({ montoUSD, card, data, nota, style, hoy }) {
  const vigente = tasaVigente(card, data);
  if (!vigente) return null;
  const enSoles = convertirAPEN(montoUSD, vigente.tasa);
  if (enSoles === null) return null;
  return (
    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45, marginTop: 4, ...style }}>
      ≈ {fmtSoles(enSoles)} · {textoTasa(vigente, hoy || new Date())}
      {nota && (
        <div style={{ marginTop: 2 }}>
          Referencial. Tu banco aplica su propio tipo de cambio a las compras con tarjeta.
        </div>
      )}
    </div>
  );
}
