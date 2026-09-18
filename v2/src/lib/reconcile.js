import { hasSignificantData } from "./sync";

// Cuenta el contenido "real" de un blob para desempatar cuando no hay fechas fiables.
export function countContent(data) {
  if (!data) return { expenses: 0, movimientos: 0 };
  return {
    expenses: data.expenses?.length || 0,
    movimientos: (data.cardPayments?.length || 0) + (data.incomeExtra?.length || 0),
  };
}

const ts = (d) => {
  const raw = d?.updatedAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
};

// Decide entre el blob local y el de la nube SIN descartar nada:
// siempre devuelve el perdedor cuando ambos existen, para que el llamador
// pueda guardarlo en la llave de rescate antes de pisar datos.
export function reconcileData(local, cloud) {
  const cloudOk = hasSignificantData(cloud);
  const localOk = hasSignificantData(local);

  if (!cloudOk) return { winner: local, loser: cloud || null, reason: 'sin-nube' };
  if (!localOk) return { winner: cloud, loser: local || null, reason: 'sin-local' };

  const tLocal = ts(local);
  const tCloud = ts(cloud);

  if (tLocal !== null && tCloud !== null && tLocal !== tCloud) {
    return tLocal > tCloud
      ? { winner: local, loser: cloud, reason: 'local-mas-nuevo' }
      : { winner: cloud, loser: local, reason: 'nube-mas-nueva' };
  }

  // Falta algún updatedAt o son iguales → desempate por contenido.
  const cl = countContent(local);
  const cc = countContent(cloud);
  if (cl.expenses !== cc.expenses) {
    return cl.expenses > cc.expenses
      ? { winner: local, loser: cloud, reason: 'empate-mas-contenido' }
      : { winner: cloud, loser: local, reason: 'empate-mas-contenido' };
  }
  if (cl.movimientos !== cc.movimientos) {
    return cl.movimientos > cc.movimientos
      ? { winner: local, loser: cloud, reason: 'empate-mas-contenido' }
      : { winner: cloud, loser: local, reason: 'empate-mas-contenido' };
  }
  // Empate total: preferimos lo local (es lo que la usuaria está viendo ahora).
  return { winner: local, loser: cloud, reason: 'empate-mas-contenido' };
}
