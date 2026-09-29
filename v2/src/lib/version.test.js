import { describe, it, expect } from "vitest";
import { fechaCorta, textoVersion, buildIdDe, comparaBuild, buscaVersion } from "./version";

describe("textoVersion", () => {
  it("arma el pie con fecha y commit", () => {
    expect(textoVersion("a9cb729", "2026-09-29T12:00:00.000Z")).toMatch(/^Qori · actualizada el .+ · a9cb729$/);
  });

  it("sin fecha válida no inventa una", () => {
    expect(textoVersion("a9cb729", null)).toBe("Qori · a9cb729");
    expect(textoVersion("a9cb729", "no es fecha")).toBe("Qori · a9cb729");
  });

  it("fechaCorta devuelve null con basura", () => {
    expect(fechaCorta(null)).toBe(null);
    expect(fechaCorta("x")).toBe(null);
  });
});

describe("buildIdDe", () => {
  it("saca el buildId del HTML de Next", () => {
    expect(buildIdDe('<script>{"props":{},"buildId":"dSutGVPeXgH4MUG-uiAg9"}</script>')).toBe("dSutGVPeXgH4MUG-uiAg9");
  });

  it("devuelve null si no está", () => {
    expect(buildIdDe("<html>nada</html>")).toBe(null);
    expect(buildIdDe(null)).toBe(null);
  });
});

describe("comparaBuild", () => {
  it("igual es al día, distinto es versión nueva", () => {
    expect(comparaBuild("abc", "abc")).toBe("al-dia");
    expect(comparaBuild("abc", "xyz")).toBe("nueva");
  });

  it("sin alguno de los dos no se pronuncia", () => {
    expect(comparaBuild(null, "xyz")).toBe("desconocido");
    expect(comparaBuild("abc", null)).toBe("desconocido");
  });
});

describe("buscaVersion", () => {
  const htmlCon = (id) => ({ text: async () => `{"buildId":"${id}"}` });

  it("dice al-dia cuando el servidor sirve lo mismo", async () => {
    const r = await buscaVersion({ fetchImpl: async () => htmlCon("v1"), buildActual: "v1", origin: "https://x" });
    expect(r.estado).toBe("al-dia");
  });

  it("dice nueva cuando el servidor cambió", async () => {
    const r = await buscaVersion({ fetchImpl: async () => htmlCon("v2"), buildActual: "v1", origin: "https://x" });
    expect(r).toMatchObject({ estado: "nueva", servidor: "v2", actual: "v1" });
  });

  it("sin red avisa en vez de romperse", async () => {
    const r = await buscaVersion({ fetchImpl: async () => { throw new Error("offline"); }, buildActual: "v1", origin: "https://x" });
    expect(r.estado).toBe("sin-conexion");
  });

  it("si la respuesta no trae buildId no se inventa nada", async () => {
    const r = await buscaVersion({ fetchImpl: async () => ({ text: async () => "<html></html>" }), buildActual: "v1", origin: "https://x" });
    expect(r.estado).toBe("desconocido");
  });

  it("sin saber la versión cargada no se pronuncia", async () => {
    const r = await buscaVersion({ fetchImpl: async () => htmlCon("v2"), buildActual: null, origin: "https://x" });
    expect(r.estado).toBe("desconocido");
  });

  it("le pide al servidor sin caché y con cache-buster", async () => {
    let url = null, opts = null;
    await buscaVersion({
      fetchImpl: async (u, o) => { url = u; opts = o; return htmlCon("v1"); },
      buildActual: "v1", origin: "https://x",
    });
    expect(url).toMatch(/^https:\/\/x\/\?v=\d+$/);
    expect(opts).toMatchObject({ cache: "no-store" });
  });
});
