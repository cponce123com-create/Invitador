import { describe, expect, it } from "vitest";
import {
  DEFAULT_HERO_BACKGROUND_STYLE,
  backgroundStyleFor,
  patternImageUrl,
} from "@/lib/backgrounds";
import { BACKGROUND_PRESETS } from "@/lib/background-presets";
import { EVENT_TYPES } from "@/lib/constants";

describe("backgroundStyleFor", () => {
  it("construye el degradado con los colores del template GRADIENT", () => {
    const style = backgroundStyleFor({
      kind: "GRADIENT",
      colors: ["#111111", "#222222", "#333333"],
    });
    expect(style.backgroundImage).toBe(
      "linear-gradient(to bottom right, #111111, #222222, #333333)",
    );
  });

  it("referencia el patrón SVG para un template PATTERN", () => {
    const style = backgroundStyleFor({
      kind: "PATTERN",
      colors: ["#000000", "#ffffff"],
      patternName: "dots",
    });
    expect(style.backgroundImage).toBe(patternImageUrl("dots", "#ffffff"));
    expect(String(style.backgroundImage)).toContain("data:image/svg+xml");
    expect(style.backgroundColor).toBe("#000000");
  });

  it("mantiene el degradado por defecto sin fondo elegido (eventos existentes)", () => {
    expect(backgroundStyleFor(null)).toEqual(DEFAULT_HERO_BACKGROUND_STYLE);
    expect(backgroundStyleFor(undefined)).toEqual(DEFAULT_HERO_BACKGROUND_STYLE);
  });

  it("cae al degradado por defecto si el patrón es desconocido", () => {
    expect(
      backgroundStyleFor({
        kind: "PATTERN",
        colors: ["#000000", "#ffffff"],
        patternName: "no-existe",
      }),
    ).toEqual(DEFAULT_HERO_BACKGROUND_STYLE);
  });

  it("cae al degradado por defecto si el GRADIENT trae menos de dos colores", () => {
    expect(
      backgroundStyleFor({ kind: "GRADIENT", colors: ["#111111"] }),
    ).toEqual(DEFAULT_HERO_BACKGROUND_STYLE);
  });
});

describe("patternImageUrl", () => {
  it("devuelve null para patrones desconocidos", () => {
    expect(patternImageUrl("no-existe")).toBeNull();
    expect(patternImageUrl(null)).toBeNull();
  });

  it("codifica el SVG como data URI escapando el color", () => {
    const url = patternImageUrl("waves", "#123456");
    expect(url).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(url).toContain("%23123456");
  });
});

describe("BACKGROUND_PRESETS", () => {
  it("cubre cada tipo de evento con al menos un fondo", () => {
    for (const type of EVENT_TYPES) {
      expect(BACKGROUND_PRESETS.some((preset) => preset.eventType === type)).toBe(
        true,
      );
    }
  });

  it("no repite ids (el seed es idempotente)", () => {
    const ids = BACKGROUND_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("usa patrones conocidos en los templates PATTERN", () => {
    const patterns = BACKGROUND_PRESETS.filter(
      (preset) => preset.kind === "PATTERN",
    );
    expect(patterns.length).toBeGreaterThan(0);
    for (const preset of patterns) {
      expect(patternImageUrl(preset.patternName)).not.toBeNull();
    }
  });
});
