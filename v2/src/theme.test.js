import { describe, it, expect } from "vitest";
import { C, usageColor, alTope, CASI_AL_TOPE } from "./theme";

// F42: una tarjeta al 98% estaba pintada igual que una al 61%. La diferencia
// entre "ojo con esta" y "no pases esta" tiene que verse.
describe("semáforo de uso de línea", () => {
  it("verde mientras va holgada", () => {
    expect(usageColor(0)).toBe(C.green);
    expect(usageColor(29.9)).toBe(C.green);
  });

  it("naranja claro de 30 a 60", () => {
    expect(usageColor(30)).toBe(C.orangeLight);
    expect(usageColor(60)).toBe(C.orangeLight);
  });

  it("naranja de 60 a 90", () => {
    expect(usageColor(60.1)).toBe(C.orange);
    expect(usageColor(89.9)).toBe(C.orange);
  });

  it("rojo desde 90: está a nada de sobregirarse", () => {
    expect(usageColor(CASI_AL_TOPE)).toBe(C.red);
    expect(usageColor(98)).toBe(C.red);
    expect(usageColor(100)).toBe(C.red);
    expect(usageColor(120)).toBe(C.red);
  });

  it("98% y 61% ya no se ven igual", () => {
    expect(usageColor(98)).not.toBe(usageColor(61));
  });

  it("alTope marca el caso crítico, y aguanta un porcentaje que llega como texto", () => {
    expect(alTope(89.9)).toBe(false);
    expect(alTope(90)).toBe(true);
    expect(alTope("98")).toBe(true);
    expect(alTope(undefined)).toBe(false);
  });
});
