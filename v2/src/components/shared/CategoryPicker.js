import { C, FONT_BODY } from "../../theme";
import { useStore } from "../../state/store";

// Copia liviana de la categoria para guardar dentro de un gasto: nos quedamos
// con lo que se pinta (emoji + nombre) y NO arrastramos la lista de
// subcategorias adentro de cada gasto.
export const slimCat = (cat) => (cat ? { id: cat.id, emoji: cat.emoji, name: cat.name } : null);

// Subcategorias de una categoria, tolerando datos viejos (sin migracion).
export const subsOf = (cat) => (cat && Array.isArray(cat.subcategories) ? cat.subcategories : []);

const chevron = (color) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`;

// Ojo: nada de shorthand `background` aca — pisaria el chevron.
const selectStyle = (dark) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 38px 12px 14px",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: FONT_BODY,
  cursor: "pointer",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  backgroundImage: chevron(dark ? "#ffffff" : C.muted),
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "16px 16px",
  backgroundColor: dark ? "rgba(255,255,255,0.16)" : "#FAFAF5",
  color: dark ? "#fff" : C.black,
  border: dark ? "2px solid rgba(255,255,255,0.28)" : "1.5px solid #D4D0C8",
});

const labelStyle = (dark) => ({
  fontSize: 12,
  fontWeight: 700,
  color: dark ? "rgba(255,255,255,0.5)" : C.muted,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 6,
});

/**
 * Selector compacto de categoria (+ subcategoria opcional).
 *
 * Usa un <select> nativo a proposito: con 15 categorias una nube de chips ocupa
 * media pantalla, y un desplegable propio dentro de un bottom-sheet con scroll
 * quedaria recortado. El nativo abre la rueda de iOS (lo mas comodo en movil),
 * trae su propio scroll y nunca empuja el contenido de abajo.
 *
 * value / onChange       -> categoria (objeto liviano o null)
 * subValue / onSubChange -> subcategoria ({id, name} o null). El segundo select
 *                           solo aparece si la categoria elegida tiene subcategorias.
 */
export function CategoryPicker({ value, onChange, subValue, onSubChange, dark, showLabels = true }) {
  const data = useStore(s => s.data);
  const cats = data.categories?.gastos || [];
  // Buscamos por id para leer las subcategorias vigentes (el gasto guarda una copia liviana).
  const selected = value ? cats.find(c => c.id === value.id) || value : null;
  const subs = subsOf(selected);
  const style = selectStyle(dark);
  // Si la subcategoria guardada ya no existe (la borraron), la mostramos igual
  // para no perderla al guardar una edicion.
  const orphanSub = subValue && !subs.some(s => s.id === subValue.id) ? subValue : null;

  const pickCat = (id) => {
    const cat = cats.find(c => c.id === id) || null;
    onChange(slimCat(cat));
    // Al cambiar de categoria la subcategoria anterior ya no aplica.
    if (onSubChange) onSubChange(null);
  };

  return (
    <div>
      {showLabels && <div style={labelStyle(dark)}>Categoría</div>}
      <select value={selected?.id || ""} onChange={e => pickCat(e.target.value)} style={style}>
        <option value="">Elegir categoría…</option>
        {cats.map(c => (
          <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
        ))}
      </select>
      {onSubChange && (subs.length > 0 || orphanSub) && (
        <div style={{ marginTop: 10 }}>
          {showLabels && <div style={labelStyle(dark)}>Subcategoría (opcional)</div>}
          <select
            value={subValue?.id || ""}
            onChange={e => {
              const all = orphanSub ? [...subs, orphanSub] : subs;
              const s = all.find(x => x.id === e.target.value);
              onSubChange(s ? { id: s.id, name: s.name } : null);
            }}
            style={style}
          >
            <option value="">Sin especificar</option>
            {subs.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {orphanSub && <option value={orphanSub.id}>{orphanSub.name}</option>}
          </select>
        </div>
      )}
    </div>
  );
}
