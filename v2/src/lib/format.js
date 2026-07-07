export function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
export function fmtWith(n, currency) { const sym = currency === "USD" ? "US$" : "S/"; return sym + Number(n).toLocaleString("es-PE"); }
