// F21: qué versión de Qori tiene puesta este celular, y si es la última.
//
// Por qué existe: ella preguntó cuatro veces seguidas "¿ya se publicó?" y no
// tenía forma de saberlo sola — la app se ve igual hasta que el celular suelta
// la versión vieja. Esto lo responde dentro de la app.
//
// Cómo se sabe: Next le pone a cada build un `buildId` y lo deja en el HTML.
// Si el del servidor no es el que tiene cargado, es que hay una versión nueva
// esperando y solo falta recargar.

// Lo que se congeló al hacer el build (ver next.config.js).
export const COMMIT = process.env.NEXT_PUBLIC_QORI_COMMIT || "local";
export const FECHA_BUILD = process.env.NEXT_PUBLIC_QORI_FECHA || null;

// "29 set" — para el pie de Config. null si la fecha no sirve.
export function fechaCorta(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

// "Qori · actualizada el 29 set · a9cb729"
export function textoVersion(commit = COMMIT, iso = FECHA_BUILD) {
  const f = fechaCorta(iso);
  const partes = ["Qori"];
  if (f) partes.push("actualizada el " + f);
  if (commit) partes.push(commit);
  return partes.join(" · ");
}

// El buildId que viene dentro de un HTML de Next. null si no está.
export function buildIdDe(html) {
  const m = String(html || "").match(/"buildId":"([^"]+)"/);
  return m ? m[1] : null;
}

// Compara lo cargado con lo que sirve el servidor.
// → "al-dia" | "nueva" | "desconocido"
export function comparaBuild(actual, servidor) {
  if (!actual || !servidor) return "desconocido";
  return actual === servidor ? "al-dia" : "nueva";
}

// Le pregunta al servidor qué versión está sirviendo ahora mismo.
// `fetchImpl` y `buildActual` se inyectan para poder probarlo sin navegador.
// → { estado, servidor, actual }  ·  estado: al-dia | nueva | desconocido | sin-conexion
export async function buscaVersion({ fetchImpl, buildActual, origin } = {}) {
  const f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  const actual = buildActual !== undefined
    ? buildActual
    : (typeof window !== "undefined" && window.__NEXT_DATA__ ? window.__NEXT_DATA__.buildId : null);
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (!f || !actual) return { estado: "desconocido", servidor: null, actual: actual || null };
  try {
    // `no-store` + cache-buster: si se pregunta por la versión, la respuesta no
    // puede venir de la misma caché que se está tratando de saltar.
    const res = await f(base + "/?v=" + Date.now(), { cache: "no-store" });
    const servidor = buildIdDe(await res.text());
    return { estado: comparaBuild(actual, servidor), servidor, actual };
  } catch (e) {
    return { estado: "sin-conexion", servidor: null, actual };
  }
}
