import { describe, it, expect } from "vitest";
import { rowToInboxItem, fetchPendingInbox, markInboxRow } from "./inbox";

describe("rowToInboxItem", () => {
  it("mapea una fila completa", () => {
    const item = rowToInboxItem({
      id: "row-1", amount: "25.50", merchant: " Starbucks ",
      card_hint: "Visa BCP ••1234", occurred_at: "2026-09-20T15:04:00.000Z",
    });
    expect(item).toEqual({
      id: "row-1", amount: 25.5, merchant: "Starbucks",
      cardHint: "Visa BCP ••1234", occurredAt: "2026-09-20T15:04:00.000Z",
    });
  });

  it("toma el valor absoluto del monto", () => {
    expect(rowToInboxItem({ id: "r", amount: -30 }).amount).toBe(30);
  });

  it("cae en 'Compra' y hint vacío si faltan", () => {
    const item = rowToInboxItem({ id: "r", amount: 10 });
    expect(item.merchant).toBe("Compra");
    expect(item.cardHint).toBe("");
    expect(isNaN(new Date(item.occurredAt).getTime())).toBe(false);
  });

  it("descarta filas inservibles", () => {
    expect(rowToInboxItem(null)).toBe(null);
    expect(rowToInboxItem({ amount: 10 })).toBe(null);          // sin id
    expect(rowToInboxItem({ id: "r", amount: 0 })).toBe(null);
    expect(rowToInboxItem({ id: "r", amount: "hola" })).toBe(null);
  });

  it("repara una fecha inválida en vez de propagarla", () => {
    const item = rowToInboxItem({ id: "r", amount: 10, occurred_at: "no-es-fecha" });
    expect(isNaN(new Date(item.occurredAt).getTime())).toBe(false);
  });
});

// Cliente de Supabase de mentira: encadena igual que el real.
const fakeClient = (respuesta) => ({
  from: () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => respuesta,
      update: () => chain,
    };
    // update(...).eq(...) se resuelve como promesa
    chain.then = (fn) => Promise.resolve(respuesta).then(fn);
    return chain;
  },
});

describe("fetchPendingInbox (local-first)", () => {
  it("devuelve los items mapeados", async () => {
    const client = fakeClient({ data: [{ id: "a", amount: 5, merchant: "Wong" }], error: null });
    expect(await fetchPendingInbox(client, "u1")).toEqual([
      { id: "a", amount: 5, merchant: "Wong", cardHint: "", occurredAt: expect.any(String) },
    ]);
  });

  it("devuelve [] si Supabase responde con error — nunca lanza", async () => {
    const client = fakeClient({ data: null, error: { message: "boom" } });
    expect(await fetchPendingInbox(client, "u1")).toEqual([]);
  });

  it("devuelve [] sin cliente o sin usuario", async () => {
    expect(await fetchPendingInbox(null, "u1")).toEqual([]);
    expect(await fetchPendingInbox(fakeClient({ data: [], error: null }), null)).toEqual([]);
  });
});

describe("markInboxRow", () => {
  it("true cuando Supabase acepta", async () => {
    expect(await markInboxRow(fakeClient({ error: null }), "a", "confirmed")).toBe(true);
  });
  it("false cuando falla — nunca lanza", async () => {
    expect(await markInboxRow(fakeClient({ error: { message: "boom" } }), "a", "confirmed")).toBe(false);
    expect(await markInboxRow(null, "a", "confirmed")).toBe(false);
  });
});
