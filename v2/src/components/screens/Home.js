import { C, FONT_TITLE, inputStyle, usageColor, alTope } from "../../theme";
import { TrashIcon } from "../shared/icons";
import { getToday } from "../../lib/dates";
import { buildCatMap, isPEN, sumUSD, pagosComoGastos } from "../../state/selectors";
import { getCycleFor, getCycleSpend, getUpcomingTotal, getSharedUsage, curOf } from "../../lib/cycles";
import { tasaVigente } from "../../lib/fx";
import { fmtWith } from "../../lib/format";
import { plazoLabel } from "./ProximosPagos";
import { useStore } from "../../state/store";
import { PaymentMethodPicker, PmChip } from "../shared/PaymentMethodPicker";
import { CategoryPicker } from "../shared/CategoryPicker";
import { InboxBanner } from "../shared/InboxSheet";

export default function Home({
  fmt, curMonth, todayTotal, todayTotalUSD, recentExp, budgetAlerts,
  inboxItems, setShowInbox,
  editExpId, setEditExpId, editExpDesc, setEditExpDesc, editExpAmt, setEditExpAmt,
  editExpDate, setEditExpDate, editExpCat, setEditExpCat, editExpSub, setEditExpSub, editExpPm, setEditExpPm,
  saveExpenseEdit, deleteExpense,
  setSelectedCatDetail, setShowNotifPanel, setSubScreen,
  fileInputRef, cameraInputRef, handleScanImage,
}) {
  const data = useStore(s => s.data);
  const setTab = useStore(s => s.setTab);
    const monthExps = data.expenses.filter(e => e.month === curMonth);
    // F35: los pagos de tarjeta entran al gráfico como su propia categoría.
    const topCats = buildCatMap([...monthExps, ...pagosComoGastos(data, curMonth)].filter(isPEN)).slice(0, 5);
    const monthUSD = sumUSD(monthExps); // los dólares no se suman a los soles
    const maxCat = topCats[0]?.amount || 1;
    const creditCards = (data.paymentMethods || []).filter(m => m.type === "credito" && !m.archived);

    return (
      <div style={{ flex: 1, background: "linear-gradient(160deg, #6C5CE7 0%, #5A4BD1 100%)", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 88 }}>
        {/* Header */}
        <div style={{ padding: "52px 28px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginBottom: 6 }}>{getToday()}</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: 0, fontStyle: "italic", letterSpacing: -1, fontFamily: FONT_TITLE }}>Hola, {data.userName || "👋"}.</h1>
          </div>
          <button onClick={() => setShowNotifPanel(true)} style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 6 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {budgetAlerts.length > 0 && (
              <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: C.orange, border: "2px solid #5A4BD1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, color: "#fff" }}>{budgetAlerts.length}</div>
            )}
          </button>
        </div>
        {/* Today total */}
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>HOY GASTASTE</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -2, fontFamily: FONT_TITLE }}>{fmt(todayTotal)}</div>
          {/* Los dólares no se suman a los soles: van como línea aparte (F10) */}
          {todayTotalUSD > 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>+ {fmtWith(todayTotalUSD, "USD")} en dólares</div>
          )}
        </div>
        {/* Bar chart */}
        {topCats.length > 0 ? (
          <div style={{ padding: "8px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 4px" }}>
              {topCats.map((cat, i) => {
                const h = Math.max(Math.round((cat.amount / maxCat) * 120), 8);
                return (
                  <div key={cat.name} onClick={() => setSelectedCatDetail(cat)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>{fmt(cat.amount)}</div>
                    <div style={{ width: "100%", maxWidth: 44, height: h, background: i === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)", borderRadius: "8px 8px 4px 4px", transition: "height 0.4s ease" }} />
                    <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button onClick={() => setSubScreen("all-cats")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}>Ver todas las categorías →</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 28px 0" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>Toca <strong style={{ color: "#fff" }}>+</strong> para registrar tu primer gasto</div>
          </div>
        )}
        {/* Bandeja (F8): compras de Apple Pay esperando categoría. Solo aparece
            si hay pendientes — con la bandeja vacía Inicio queda igual que antes. */}
        <InboxBanner
          items={inboxItems}
          total={(inboxItems || []).reduce((s, i) => s + i.amount, 0)}
          onOpen={() => setShowInbox(true)}
          fmt={fmt}
        />
        {/* Próximos pagos (F6): lo primero que ve si tiene TC — cuánto vence y cuándo */}
        {creditCards.length > 0 && (() => {
          // Soles y dólares van separados (F10): el resumen de Inicio muestra los soles
          // y, si hay deuda en dólares, la agrega como línea aparte (nunca sumada).
          const upcoming = getUpcomingTotal(data.paymentMethods, data.expenses, data.cardPayments, new Date(), data.cardStatements);
          const { total30, items } = upcoming.PEN;
          const usd30 = upcoming.USD.total30;
          // F41: "el más cercano vence en 4 días" no responde la pregunta que ella
          // se hace, que es CUÁL pagar primero. Se busca entre las dos monedas
          // —la que vence antes puede ser la deuda en dólares— y se nombra.
          const todos = [...items, ...upcoming.USD.items];
          const proximo = todos
            .filter(i => i.status === "por-vencer")
            .sort((a, b) => a.dueDate - b.dueDate)[0];
          // F23: con deuda viva pero sin estado de cuenta no se sabe cuánto vence.
          // Decir "estás al día" ahí sería mentir.
          const sinDato = !proximo && todos.some(i => i.status === "sin-dato");
          return (
            <div style={{ padding: "18px 20px 0" }}>
              <div onClick={() => setSubScreen("proximos-pagos")} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 18px rgba(0,0,0,0.18)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: proximo ? "#FDEDE0" : (sinDato ? "#FDEDE0" : C.purpleSoft), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{proximo ? "📅" : (sinDato ? "🧾" : "✅")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>Próximos pagos</div>
                  <div style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 900, color: C.black, letterSpacing: -0.8, lineHeight: 1.2 }}>{fmt(total30)}</div>
                  {usd30 > 0 && (
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 1 }}>+ {fmtWith(usd30, "USD")} en dólares</div>
                  )}
                  {/* Primero la tarjeta que toca pagar, con su nombre: es la
                      pregunta real ("¿cuál pago primero?"). El monto va con su
                      propia moneda, que puede no ser la del total de arriba. */}
                  <div style={{ fontSize: 12, color: proximo || sinDato ? C.orange : C.green, fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>
                    {proximo
                      ? <>Paga primero <strong style={{ color: C.black }}>{proximo.card.name}</strong>: {fmtWith(proximo.amount, proximo.currency)}, {plazoLabel(proximo.days)}</>
                      : sinDato
                        ? "Falta tu estado de cuenta para saber cuánto vence"
                        : "Estás al día con tus tarjetas"}
                  </div>
                </div>
                <div style={{ fontSize: 22, color: C.muted, flexShrink: 0 }}>›</div>
              </div>
            </div>
          );
        })()}
        {/* Tarjetas de crédito: tira horizontal para no empujar los movimientos.
            El número grande es el DISPONIBLE, que es lo que se mira antes de gastar. */}
        {creditCards.length > 0 && (
          <div style={{ padding: "10px 0 0" }}>
            {/* `scrollPaddingLeft` hace que al soltar el deslizamiento la tarjeta
                quede a los mismos 20px que la card de arriba, en vez de pegada al
                borde. Sin esto arrancan alineadas pero se desalinean al deslizar. */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 20px 4px", scrollPaddingLeft: 20, WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}>
              {creditCards.map(card => {
                const cycle = getCycleFor(card, new Date());
                // F18: la línea es una sola. Lo consumido en dólares ocupa esa misma
                // línea, convertido a soles, así que el disponible los cuenta juntos.
                const vigente = tasaVigente(card, data);
                const uso = getSharedUsage(card, data.expenses, data.cardPayments, vigente && vigente.tasa);
                const { available, pct } = uso;
                const accent = card.color || C.purple;
                // F42: al 90% o más la tarjeta está a nada de sobregirarse. Tiene
                // que verse distinta —no igual que un uso alto pero tranquilo—
                // porque es la diferencia entre "ojo" y "no pases esta".
                const critica = alTope(pct);
                return (
                  <div key={card.id} onClick={() => setSubScreen("card-" + card.id)} style={{ flex: "0 0 auto", width: 152, scrollSnapAlign: "start", background: "rgba(255,255,255,0.94)", borderRadius: 16, padding: "12px 14px", cursor: "pointer", boxShadow: critica ? "0 0 0 2px " + C.red + ", 0 2px 10px rgba(0,0,0,0.12)" : "0 2px 10px rgba(0,0,0,0.12)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>💳</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: critica ? C.red : C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{critica ? "Te queda" : "Disponible"}</div>
                    <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 900, color: critica ? C.red : C.black, letterSpacing: -0.5, lineHeight: 1.2 }}>{fmt(available)}</div>
                    <div style={{ height: 5, background: "#F0EDE4", borderRadius: 99, overflow: "hidden", marginTop: 7 }}>
                      <div style={{ height: "100%", width: `${Math.min(Math.round(pct), 100)}%`, background: usageColor(pct), borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: critica ? 800 : 600, color: critica ? C.red : C.muted, marginTop: 5, whiteSpace: "nowrap" }}>{Math.round(pct)}% usado · día {cycle.dayOfCycle}/{cycle.totalDays}</div>
                    {critica && (
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: C.red, marginTop: 2, lineHeight: 1.3 }}>⚠️ Casi sin línea</div>
                    )}
                    {/* Deuda en dólares (F18): no es un cupo aparte — ya está contada
                        arriba dentro del disponible. Se muestra porque se paga aparte
                        y en dólares. */}
                    {uso.tieneUsd && (
                      <div style={{ marginTop: 7, paddingTop: 6, borderTop: "1px solid #EDE9E0" }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>Debes en dólares</div>
                        <div style={{ fontFamily: FONT_TITLE, fontSize: 14, fontWeight: 900, color: C.black, letterSpacing: -0.3 }}>{fmtWith(uso.balanceUSD, "USD")}</div>
                        <div style={{ fontSize: 9.5, color: C.muted, marginTop: 3, lineHeight: 1.35 }}>
                          {uso.faltaTasa ? "sin tipo de cambio" : "≈" + fmt(uso.usdEnSoles) + " de tu línea"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Recent expenses */}
        <div style={{ padding: "20px 20px 0", flex: 1 }}>
          {recentExp.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, marginBottom: 10 }}>ÚLTIMOS MOVIMIENTOS</div>
              {recentExp.map(mov => mov.tipo === "pago-tc" ? (() => {
                const p = mov.p;
                const tc = (data.paymentMethods || []).find(m => m.id === p.cardId);
                return (
                  <div key={"pago-" + p.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>Pago a {tc ? tc.name : "tu tarjeta"}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                          💳 Pago de tarjeta · {mov.fecha.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginRight: 10, whiteSpace: "nowrap" }}>
                        −{p.currency === "USD" ? fmtWith(p.amount, "USD") : fmt(p.amount)}
                      </span>
                    </div>
                  </div>
                );
              })() : (() => { const e = mov.e; return (
                <div key={e.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
                  {editExpId === e.id ? (
                    <div>
                      <input type="text" value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} placeholder="Descripción" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} inputMode="decimal" placeholder="Monto" style={{ ...inputStyle, color: C.black, marginBottom: 8, fontSize: 14, padding: "8px 12px" }} />
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Fecha</div>
                        <input type="date" value={editExpDate} onChange={ev => setEditExpDate(ev.target.value)} style={{ ...inputStyle, color: C.black, fontSize: 14, padding: "8px 12px" }} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <CategoryPicker
                          dark
                          value={editExpCat !== undefined ? editExpCat : e.category}
                          onChange={setEditExpCat}
                          subValue={editExpSub !== undefined ? editExpSub : (e.subcategory || null)}
                          onSubChange={setEditExpSub}
                        />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Medio de pago</div>
                        <PaymentMethodPicker dark value={editExpPm !== undefined ? editExpPm : (e.paymentMethodId ?? null)} onChange={setEditExpPm} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveExpenseEdit(e.id)} style={{ flex: 1, padding: 10, borderRadius: 10, background: "#fff", color: C.green, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
                        <button onClick={() => { setEditExpId(null); setEditExpDesc(""); setEditExpAmt(""); setEditExpDate(""); setEditExpCat(undefined); setEditExpSub(undefined); setEditExpPm(undefined); }} style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditExpId(e.id); setEditExpDesc(e.description); setEditExpAmt(String(e.amount)); setEditExpDate(new Date(e.date).toISOString().split("T")[0]); }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>{e.category ? `${e.category.emoji} ${e.category.name}${e.subcategory ? " · " + e.subcategory.name : ""} · ` : ""}{new Date(e.date).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span>
                          <PmChip dark pm={(data.paymentMethods || []).find(m => m.id === e.paymentMethodId)} />
                        </div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginRight: 10 }}>-{curOf(e) === "USD" ? fmtWith(e.amount, "USD") : fmt(e.amount)}</span>
                      <button onClick={() => deleteExpense(e.id)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><TrashIcon size={16} color="rgba(255,255,255,0.7)" /></button>
                    </div>
                  )}
                </div>
              ); })())}
              {data.expenses.length > 10 && (
                <button onClick={() => setTab("month")} style={{ width: "100%", padding: "12px 0", marginTop: 4, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.2 }}>Ver más →</button>
              )}
            </>
          )}
        </div>
        {/* Hidden file inputs for scan */}
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.heic,.webp" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { handleScanImage(e); }} style={{ display: "none" }} />
      </div>
    );
}
