// F48: cuánto puede abonar a sus tarjetas este mes sin quedarse corta.
//
// Ella lo planteó así: "no sé cómo pagar mis tc, están un toque sobregiradas y
// quiero ir abonando de a pocos, no necesariamente el pago del mes que me piden,
// pero que me alcance también para mis gastos".
//
// O sea que la pregunta no es "cuánto debo" —eso ya lo sabe— sino **cuánto me
// puedo dar el lujo de abonar**. Es una resta, pero una que nadie hace a tiempo
// porque el dato que falta siempre es el mismo: cuánto le queda por gastar del
// mes que todavía no gastó.
//
// La regla de la casa sigue: los dólares no se convierten ni se suman a los
// soles. Esta cuenta es en soles, y la deuda en dólares se mira aparte.

const redondea = (n) => Math.round(n * 100) / 100;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Días del mes de `hoy`, y cuántos van y cuántos faltan (hoy cuenta como ida:
// lo de hoy ya está gastado o se va a gastar igual).
export function tramoDelMes(hoy = new Date()) {
  const d = startOfDay(hoy);
  const total = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const vanConHoy = d.getDate();
  return { total, van: vanConHoy, faltan: Math.max(0, total - vanConHoy) };
}

// La ventana sobre la que se mide el ritmo. 30 días: lo que lleva del mes NO
// sirve.
//
// F50: con 2 días de mes, un gasto grande (un pasaje, una compra) se convierte
// en "gastas S/2,382 por día" y la proyección se dispara a decenas de miles. Le
// pasó: la pantalla le dijo que le faltaban S/55,583. Una ventana fija de 30
// días aguanta los picos y siempre tiene suficientes datos detrás.
export const VENTANA_DIAS = 30;

// Cuánto sale de su bolsillo por día, medido sobre los últimos 30 días.
// `gastoVentana` ya viene filtrado: solo gastos de cuenta, sin pagos de tarjeta,
// que son grandes y esporádicos e inflarían el promedio.
export function ritmoDiario(gastoVentana, dias = VENTANA_DIAS) {
  const d = Number(dias) || VENTANA_DIAS;
  if (d <= 0) return 0;
  return redondea((Number(gastoVentana) || 0) / d);
}

// Lo que le queda por gastar del mes, a ese ritmo.
export function proyectaResto(gastoVentana, hoy = new Date(), dias = VENTANA_DIAS) {
  const { faltan } = tramoDelMes(hoy);
  return redondea(ritmoDiario(gastoVentana, dias) * faltan);
}

// F53: un gasto que en realidad es un pago de tarjeta.
//
// Qori registra los pagos en `cardPayments` y los deja fuera del ritmo porque
// son montos grandes y esporádicos. Pero ella también los anota a mano como
// gastos normales ("TC BCP", "Pago TC Ripley"), con una categoría suya llamada
// "Pago Tarjeta". Por ese camino se colaban al promedio: S/1,953 de una ventana
// de S/10,228 eran pagos de tarjeta, y la proyección del mes salía inflada.
//
// Se reconoce por la categoría —que es lo que ella controla— y se acepta
// cualquier variante del nombre ("Pago de tarjeta", "Pago Tarjeta", "Pago TC").
const sinTildes = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function esPagoDeTarjeta(gasto) {
  const n = sinTildes(gasto && gasto.category && gasto.category.name);
  if (!n) return false;
  return n.includes("pago") && (n.includes("tarjeta") || /\btc\b/.test(n));
}

// Suma lo que salió de su bolsillo en los últimos `dias` días: efectivo y
// débito. Las compras con tarjeta no cuentan —esas salen el día que paga la
// tarjeta— y los pagos de tarjeta tampoco, por lo mismo del promedio.
export function gastoDeLaVentana(expenses, idsCredito, hoy = new Date(), dias = VENTANA_DIAS) {
  const desde = startOfDay(hoy).getTime() - (Number(dias) || VENTANA_DIAS) * 24 * 60 * 60 * 1000;
  const credito = idsCredito instanceof Set ? idsCredito : new Set(idsCredito || []);
  return redondea((expenses || []).reduce((t, e) => {
    if (!e || !e.date) return t;
    if (e.currency === "USD") return t;              // los dólares van aparte
    if (credito.has(e.paymentMethodId)) return t;    // no salió de su cuenta
    if (esPagoDeTarjeta(e)) return t;                // es un abono, no su ritmo
    const d = startOfDay(new Date(e.date)).getTime();
    if (isNaN(d) || d < desde || d > startOfDay(hoy).getTime()) return t;
    return t + (Number(e.amount) || 0);
  }, 0));
}

/**
 * Cuánto puede abonar, a partir de los totales del mes.
 *
 * `ingresos`      — todo lo que entra este mes (recibido + por entrar)
 * `fijosPagados`  — fijos que ya salieron
 * `fijosTotales`  — todos los fijos del mes
 * `gastoDiario`   — lo gastado de su cuenta este mes (sin pagos de tarjeta)
 * `gastoVentana`  — lo gastado de su cuenta en los últimos 30 días, para el ritmo
 * `abonosHechos`  — lo que ya abonó a tarjetas este mes
 * `colchon`       — lo que quiere dejarse aparte, por si acaso (opcional)
 *
 * → { disponible, estimadoResto, fijosPorPagar, yaSalio, alcanza }
 * `disponible` nunca se devuelve negativo maquillado: si sale en rojo, se dice.
 */
export function cuantoAbonar({
  ingresos = 0, fijosPagados = 0, fijosTotales = 0,
  gastoDiario = 0, gastoVentana = null, abonosHechos = 0, colchon = 0,
} = {}, hoy = new Date()) {
  const fijosPorPagar = redondea(Math.max(0, (Number(fijosTotales) || 0) - (Number(fijosPagados) || 0)));
  // Sin ventana todavía (datos recién migrados), se cae al gasto del mes: es
  // peor, pero nunca peor que no decir nada.
  const estimadoResto = proyectaResto(gastoVentana === null ? gastoDiario : gastoVentana, hoy);
  const yaSalio = redondea((Number(fijosPagados) || 0) + (Number(gastoDiario) || 0) + (Number(abonosHechos) || 0));
  const disponible = redondea(
    (Number(ingresos) || 0) - yaSalio - fijosPorPagar - estimadoResto - (Number(colchon) || 0)
  );
  return { disponible, estimadoResto, fijosPorPagar, yaSalio, alcanza: disponible > 0 };
}

/**
 * A qué tarjeta conviene mandarlo.
 *
 * Sin saber las tasas, el mejor criterio disponible es la SATURACIÓN: una
 * tarjeta al 98% no deja margen para un imprevisto y es la que más aprieta.
 * Pero la tasa manda sobre esto, y eso Qori no lo sabe — por eso `porTasa`
 * reordena cuando ella la pone (`card.tcea`).
 *
 * `usos` = [{ card, pct, balance, available }]
 * → la misma lista, ordenada por prioridad, con `motivo`.
 */
export function prioridadDeAbono(usos) {
  const lista = (usos || []).filter(u => u && u.balance > 0);
  const conTasa = lista.filter(u => Number(u.card && u.card.tcea) > 0);
  const porTasa = conTasa.length === lista.length && lista.length > 0;
  return [...lista]
    .sort((a, b) => porTasa
      ? Number(b.card.tcea) - Number(a.card.tcea)
      : (b.pct || 0) - (a.pct || 0))
    .map((u, i) => ({
      ...u,
      prioridad: i + 1,
      motivo: porTasa
        ? "la tasa más alta: " + Number(u.card.tcea) + "% TCEA"
        : (u.pct >= 90 ? "casi sin línea: " + Math.round(u.pct) + "% usado"
          : Math.round(u.pct) + "% usado"),
    }));
}

// Todo a una sola tarjeta, la primera de la prioridad: repartir de a poquito
// entre varias hace que ninguna baje de verdad.
export function repartoSugerido(usos, monto) {
  const orden = prioridadDeAbono(usos);
  const m = Number(monto) || 0;
  if (orden.length === 0 || m <= 0) return [];
  const primera = orden[0];
  // No tiene sentido abonar más de lo que debe en esa tarjeta: el resto pasa a
  // la siguiente.
  const aEsta = Math.min(m, primera.balance);
  const sobra = redondea(m - aEsta);
  const out = [{ ...primera, abono: redondea(aEsta) }];
  if (sobra > 0 && orden[1]) out.push({ ...orden[1], abono: Math.min(sobra, orden[1].balance) });
  return out;
}

// ── F49: el piso, la agenda y la escalera ────────────────────────────────
//
// Los mínimos y el pago del mes los pone el banco, no Qori: son el dato que
// ella copia de la app de cada banco. Van en la tarjeta como `minimoPEN`,
// `minimoUSD`, `pagoMesPEN`, `pagoMesUSD` y `venceEl` (fecha ISO del último día
// de pago, que no siempre coincide con el `paymentDay` del ciclo).

const num = (x) => { const n = Number(x); return Number.isFinite(n) && n > 0 ? n : 0; };

// Una fecha sola ("2026-10-05") la lee el navegador como UTC, y en Perú eso la
// corre un día para atrás. Se arma a mano, al mediodía local.
export function parseFecha(crudo) {
  if (!crudo) return null;
  const sola = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(crudo).trim());
  const d = sola
    ? new Date(Number(sola[1]), Number(sola[2]) - 1, Number(sola[3]), 12, 0, 0, 0)
    : new Date(crudo);
  return isNaN(d.getTime()) ? null : d;
}

// Días que faltan para el último día de pago. null si no hay fecha.
export function diasParaVencer(card, hoy = new Date()) {
  if (!card || !card.venceEl) return null;
  const d = parseFecha(card.venceEl);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(hoy)) / (24 * 60 * 60 * 1000));
}

// Lo que el banco le pide este mes, ordenado por urgencia. Las que no tienen
// fecha van al final: no se puede decir que urgen.
export function agendaDePagos(cards, hoy = new Date()) {
  return (cards || [])
    .filter(c => c && c.type === "credito" && !c.archived)
    .map(c => ({
      card: c,
      dias: diasParaVencer(c, hoy),
      minimoPEN: num(c.minimoPEN), minimoUSD: num(c.minimoUSD),
      pagoMesPEN: num(c.pagoMesPEN), pagoMesUSD: num(c.pagoMesUSD),
    }))
    .filter(x => x.minimoPEN > 0 || x.minimoUSD > 0 || x.pagoMesPEN > 0 || x.pagoMesUSD > 0)
    .sort((a, b) => {
      if (a.dias === null && b.dias === null) return 0;
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;
    });
}

// La suma de los mínimos: por debajo de esto hay mora y reporte.
export function pisoDelMes(cards) {
  const a = agendaDePagos(cards);
  return {
    PEN: redondea(a.reduce((t, x) => t + x.minimoPEN, 0)),
    USD: redondea(a.reduce((t, x) => t + x.minimoUSD, 0)),
  };
}

/**
 * La escalera: hasta dónde llega según cuánto pueda poner.
 *
 * El primer escalón es el piso (todos los mínimos). Después, de la tarjeta MÁS
 * CARA a la más barata, se suma lo que falta para dejar su pago del mes en cero.
 * Así cada sol extra va siempre al interés más alto.
 *
 * → [{ nivel, etiqueta, acumuladoPEN, acumuladoUSD, detalle }]
 */
export function escaleraDePago(cards, hoy = new Date()) {
  const agenda = agendaDePagos(cards, hoy);
  if (agenda.length === 0) return [];
  const piso = pisoDelMes(cards);
  const pasos = [{
    nivel: 0,
    etiqueta: "Los mínimos de todas",
    acumuladoPEN: piso.PEN, acumuladoUSD: piso.USD,
    detalle: "Por debajo de esto hay mora y te reportan.",
  }];

  // De la más cara a la más barata. Sin tasa va al final: no se puede afirmar
  // que urge más que una que sí la tiene.
  const porTasa = [...agenda].sort((a, b) => (Number(b.card.tcea) || -1) - (Number(a.card.tcea) || -1));
  let accPEN = piso.PEN, accUSD = piso.USD;
  let nivel = 1;
  for (const x of porTasa) {
    const faltaPEN = Math.max(0, x.pagoMesPEN - x.minimoPEN);
    const faltaUSD = Math.max(0, x.pagoMesUSD - x.minimoUSD);
    if (faltaPEN <= 0 && faltaUSD <= 0) continue;
    accPEN = redondea(accPEN + faltaPEN);
    accUSD = redondea(accUSD + faltaUSD);
    const tasa = Number(x.card.tcea) > 0 ? " (" + x.card.tcea + "%)" : "";
    pasos.push({
      nivel,
      etiqueta: "+ " + x.card.name + " al día" + tasa,
      acumuladoPEN: accPEN, acumuladoUSD: accUSD,
      detalle: "Deja su pago del mes en cero.",
      card: x.card,
    });
    nivel++;
  }
  return pasos;
}
