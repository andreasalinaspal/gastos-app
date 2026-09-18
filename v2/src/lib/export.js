// Descarga el blob de datos como JSON. Compartido por Config, el cierre de
// sesión y el rescate desde el login: es la última red de seguridad de la
// usuaria cuando la nube no responde.
export function downloadBackup(data, prefix = "gastos-backup") {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = prefix + "-" + new Date().toISOString().split("T")[0] + ".json";
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Lee el blob local crudo de localStorage ('gastos-data') sin pasar por el store.
// Lo usa el login, donde todavía no hay sesión.
export function readLocalBlob() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('gastos-data');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
