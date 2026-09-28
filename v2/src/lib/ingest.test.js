import { describe, it, expect } from "vitest";
import { parseMoney, normalizeTransaction, normalizeName, matchPaymentMethod } from "./ingest";

describe("parseMoney", () => {
  it("acepta números tal cual", () => {
    expect(parseMoney(25.5)).toBe(25.5);
    expect(parseMoney(0)).toBe(0);
  });
  it("acepta punto decimal", () => {
    expect(parseMoney("25.50")).toBe(25.5);
    expect(parseMoney("0.99")).toBe(0.99);
  });
  it("acepta coma decimal", () => {
    expect(parseMoney("25,50")).toBe(25.5);
  });
  it("acepta símbolo de moneda y espacios", () => {
    expect(parseMoney("S/ 25,50")).toBe(25.5);
    expect(parseMoney("S/25.50")).toBe(25.5);
    expect(parseMoney("US$ 12.00")).toBe(12);
    expect(parseMoney("  PEN 8  ")).toBe(8);
  });
  it("acepta miles con coma y decimal con punto", () => {
    expect(parseMoney("1,234.50")).toBe(1234.5);
    expect(parseMoney("S/ 12,345.67")).toBe(12345.67);
  });
  it("acepta miles con punto y decimal con coma", () => {
    expect(parseMoney("1.234,50")).toBe(1234.5);
    expect(parseMoney("1.234.567,89")).toBe(1234567.89);
  });
  it("trata un separador con 3 dígitos detrás como miles", () => {
    expect(parseMoney("1,500")).toBe(1500);
    expect(parseMoney("1.500")).toBe(1500);
  });
  it("conserva el signo negativo", () => {
    expect(parseMoney("-25.50")).toBe(-25.5);
  });
  it("devuelve null con basura", () => {
    expect(parseMoney("")).toBe(null);
    expect(parseMoney("abc")).toBe(null);
    expect(parseMoney("S/")).toBe(null);
    expect(parseMoney(null)).toBe(null);
    expect(parseMoney(undefined)).toBe(null);
    expect(parseMoney({})).toBe(null);
    expect(parseMoney(NaN)).toBe(null);
  });
});

describe("normalizeTransaction", () => {
  it("normaliza un cuerpo completo", () => {
    const r = normalizeTransaction({
      amount: "S/ 25,50",
      merchant: "  Starbucks Larcomar  ",
      occurredAt: "2026-09-20T15:04:00.000Z",
      cardHint: " Visa BCP ••1234 ",
    });
    expect(r.ok).toBe(true);
    expect(r.value.amount).toBe(25.5);
    expect(r.value.merchant).toBe("Starbucks Larcomar");
    expect(r.value.occurredAt).toBe("2026-09-20T15:04:00.000Z");
    expect(r.value.cardHint).toBe("Visa BCP ••1234");
  });

  it("acepta también las llaves en español del atajo", () => {
    const r = normalizeTransaction({ monto: "12.90", comercio: "Wong", fecha: "2026-09-01T12:00:00Z", tarjeta: "Amex" });
    expect(r.ok).toBe(true);
    expect(r.value.amount).toBe(12.9);
    expect(r.value.merchant).toBe("Wong");
    expect(r.value.cardHint).toBe("Amex");
  });

  it("toma un cargo negativo como gasto positivo", () => {
    expect(normalizeTransaction({ amount: "-30" }).value.amount).toBe(30);
  });

  it("rechaza monto ausente", () => {
    expect(normalizeTransaction({}).ok).toBe(false);
    expect(normalizeTransaction({ amount: null }).ok).toBe(false);
    expect(normalizeTransaction({ amount: "" }).ok).toBe(false);
    expect(normalizeTransaction({}).error).toMatch(/monto/i);
  });

  it("rechaza monto no numérico", () => {
    const r = normalizeTransaction({ amount: "no es plata" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/número/i);
  });

  it("rechaza monto cero o negativo-cero", () => {
    expect(normalizeTransaction({ amount: 0 }).ok).toBe(false);
    expect(normalizeTransaction({ amount: "0,00" }).ok).toBe(false);
  });

  it("rechaza montos absurdos", () => {
    expect(normalizeTransaction({ amount: 1000001 }).ok).toBe(false);
    expect(normalizeTransaction({ amount: 1000000 }).ok).toBe(true);
    expect(normalizeTransaction({ amount: 1000001 }).error).toMatch(/grande/i);
  });

  it("rechaza cuerpos que no son objeto", () => {
    expect(normalizeTransaction(null).ok).toBe(false);
    expect(normalizeTransaction("hola").ok).toBe(false);
    expect(normalizeTransaction([]).ok).toBe(false);
  });

  it("pone 'Compra' si no hay comercio", () => {
    expect(normalizeTransaction({ amount: 10 }).value.merchant).toBe("Compra");
    expect(normalizeTransaction({ amount: 10, merchant: "   " }).value.merchant).toBe("Compra");
  });

  it("recorta el comercio a 120 caracteres", () => {
    const r = normalizeTransaction({ amount: 10, merchant: "x".repeat(300) });
    expect(r.value.merchant.length).toBe(120);
  });

  it("usa ahora si no viene fecha", () => {
    const before = Date.now();
    const r = normalizeTransaction({ amount: 10 });
    const t = new Date(r.value.occurredAt).getTime();
    expect(t).toBeGreaterThanOrEqual(before - 1000);
    expect(t).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("rechaza fecha inválida", () => {
    const r = normalizeTransaction({ amount: 10, occurredAt: "no-es-fecha" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/fecha/i);
  });

  it("cardHint queda vacío si no viene", () => {
    expect(normalizeTransaction({ amount: 10 }).value.cardHint).toBe("");
  });

  it("recorta el cardHint largo", () => {
    expect(normalizeTransaction({ amount: 10, cardHint: "y".repeat(400) }).value.cardHint.length).toBe(120);
  });
});

describe("normalizeName", () => {
  it("baja, saca tildes, espacios y signos", () => {
    expect(normalizeName("Visa BCP ••1234")).toBe("visabcp1234");
    expect(normalizeName("Crédito Interbank")).toBe("creditointerbank");
    expect(normalizeName(null)).toBe("");
  });
});

describe("matchPaymentMethod", () => {
  const methods = [
    { id: "pm-cash", name: "Efectivo", type: "efectivo" },
    { id: "pm-visa", name: "Visa BCP", type: "credito" },
    { id: "pm-amex", name: "Amex Interbank", type: "credito" },
  ];

  it("empareja por nombre contenido en el hint", () => {
    expect(matchPaymentMethod("Visa BCP ••1234", methods)).toBe("pm-visa");
    expect(matchPaymentMethod("VISA BCP", methods)).toBe("pm-visa");
    expect(matchPaymentMethod("amex interbank (Apple Pay)", methods)).toBe("pm-amex");
  });

  it("empareja al revés: el hint contenido en el nombre", () => {
    expect(matchPaymentMethod("Amex", methods)).toBe("pm-amex");
  });

  it("gana el match por últimos 4 dígitos", () => {
    const conDigitos = [
      { id: "pm-a", name: "Tarjeta 1234", type: "credito" },
      { id: "pm-b", name: "Tarjeta 9999", type: "credito" },
    ];
    expect(matchPaymentMethod("Mastercard •••• 9999", conDigitos)).toBe("pm-b");
    expect(matchPaymentMethod("Mastercard ...1234", conDigitos)).toBe("pm-a");
  });

  it("los dígitos mandan por encima de la coincidencia de nombre", () => {
    const mixto = [
      { id: "pm-nombre", name: "Visa BCP", type: "credito" },
      { id: "pm-digitos", name: "Otra 4321", type: "credito" },
    ];
    expect(matchPaymentMethod("Visa BCP 4321", mixto)).toBe("pm-digitos");
  });

  it("prefiere el nombre más específico", () => {
    const parecidos = [
      { id: "pm-corto", name: "Visa", type: "credito" },
      { id: "pm-largo", name: "Visa Signature BCP", type: "credito" },
    ];
    expect(matchPaymentMethod("Visa Signature BCP", parecidos)).toBe("pm-largo");
  });

  it("nunca empareja con medios archivados", () => {
    const archivados = [{ id: "pm-old", name: "Visa BCP", type: "credito", archived: true }];
    expect(matchPaymentMethod("Visa BCP ••1234", archivados)).toBe(null);
  });

  it("elige el activo cuando hay un archivado con el mismo nombre", () => {
    const mix = [
      { id: "pm-old", name: "Visa BCP", type: "credito", archived: true },
      { id: "pm-new", name: "Visa BCP", type: "credito" },
    ];
    expect(matchPaymentMethod("Visa BCP", mix)).toBe("pm-new");
  });

  it("hint vacío o ausente → null", () => {
    expect(matchPaymentMethod("", methods)).toBe(null);
    expect(matchPaymentMethod(null, methods)).toBe(null);
    expect(matchPaymentMethod(undefined, methods)).toBe(null);
    expect(matchPaymentMethod("   ", methods)).toBe(null);
  });

  it("sin coincidencia → null", () => {
    expect(matchPaymentMethod("Diners Club", methods)).toBe(null);
  });

  it("tolera lista vacía, null o entradas rotas", () => {
    expect(matchPaymentMethod("Visa BCP", [])).toBe(null);
    expect(matchPaymentMethod("Visa BCP", null)).toBe(null);
    expect(matchPaymentMethod("Visa BCP", [null, {}, { name: "Visa BCP" }])).toBe(null);
  });

  it("no empareja por nombres de menos de 3 letras", () => {
    expect(matchPaymentMethod("Visa BCP ••1234", [{ id: "pm-tc", name: "TC", type: "credito" }])).toBe(null);
  });

  it("ignora tildes al emparejar", () => {
    expect(matchPaymentMethod("credito interbank", [{ id: "pm-x", name: "Crédito Interbank" }])).toBe("pm-x");
  });
});
