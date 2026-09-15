import { describe, expect, it } from "vitest";
import { buildEventSlug, randomSuffix, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("quita acentos y símbolos", () => {
    expect(slugify("Cumpleaños de Sofía 🎂")).toBe("cumpleanos-de-sofia");
  });

  it("colapsa separadores repetidos", () => {
    expect(slugify("  Boda   de  Ana & Luis ")).toBe("boda-de-ana-luis");
  });

  it("devuelve cadena vacía si no queda nada útil", () => {
    expect(slugify("¡¡¡!!!")).toBe("");
  });
});

describe("randomSuffix", () => {
  it("respeta la longitud y evita caracteres ambiguos", () => {
    const suffix = randomSuffix(6);
    expect(suffix).toHaveLength(6);
    expect(suffix).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]+$/);
  });
});

describe("buildEventSlug", () => {
  it("usa 'evento' cuando el título no produce slug", () => {
    expect(buildEventSlug("🎉🎉")).toMatch(/^evento-[a-z0-9]{4}$/);
  });

  it("combina el título con un sufijo aleatorio", () => {
    expect(buildEventSlug("Cumple de Sofía")).toMatch(
      /^cumple-de-sofia-[a-z0-9]{4}$/,
    );
  });
});
