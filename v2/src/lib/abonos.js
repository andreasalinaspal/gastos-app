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

// Cuánto gasta por día, en promedio, de su propio bolsillo.
//
// Solo cuenta los gastos diarios de cuenta: los pagos de tarjeta son montos
// grandes y esporádicos, y meterlos acá inflaría el promedio y le diría que no
// le alcanza para nada.
export function ritmoDiario(gastoDiarioDelMes, hoy = new Date()) {
  const { van } = tramoDelMes(hoy);
  if (van <= 0) return 0;
  return redondea((Number(gastoDiarioDelMes) || 0) / van);
}

// Lo que le queda por gastar del mes, al ritmo que lleva.
export function proyectaResto(gastoDiarioDelMes, hoy = new Date()) {
  const { faltan } = tramoDelMes(hoy);
  return redondea(ritmoDiario(gastoDiarioDelMes, hoy) * faltan);
}

/**
 * Cuánto puede abonar, a partir de los totales del mes.
 *
 * `ingresos`      — todo lo que entra este mes (recibido + por entrar)
 * `fijosPagados`  — fijos que ya salieron
 * `fijosTotales`  — todos los fijos del mes
 * `gastoDiario`   — lo gastado de su cuenta (sin pagos de tarjeta)
 * `abonosHechos`  — lo que ya abonó a tarjetas este mes
 * `colchon`       — lo que quiere dejarse aparte, por si acaso (opcional)
 *
 * → { disponible, estimadoResto, fijosPorPagar, yaSalio, alcanza }
 * `disponible` nunca se devuelve negativo maquillado: si sale en rojo, se dice.
 */
export function cuantoAbonar({
  ingresos = 0, fijosPagados = 0, fijosTotales = 0,
  gastoDiario = 0, abonosHechos = 0, colchon = 0,
} = {}, hoy = new Date()) {
  const fijosPorPagar = redondea(Math.max(0, (Number(fijosTotales) || 0) - (Number(fijosPagados) || 0)));
  const estimadoResto = proyectaResto(gastoDiario, hoy);
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
