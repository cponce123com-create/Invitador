import { describe, expect, it } from "vitest";
import {
  COMPACT_MAX_WIDTH,
  ambientFrameInterval,
  ambientParticleCount,
  burstParticleCount,
  isCompactViewport,
  maxCanvasPixelRatio,
} from "@/lib/render-budget";

describe("isCompactViewport", () => {
  it("considera compacta la pantalla por debajo del límite", () => {
    expect(isCompactViewport(COMPACT_MAX_WIDTH - 1)).toBe(true);
    expect(isCompactViewport(0)).toBe(true);
  });

  it("no considera compacta la pantalla en el límite o por encima", () => {
    expect(isCompactViewport(COMPACT_MAX_WIDTH)).toBe(false);
    expect(isCompactViewport(1440)).toBe(false);
  });
});

describe("maxCanvasPixelRatio", () => {
  it("limita la densidad a 1.5 en móvil y a 2 en el resto", () => {
    expect(maxCanvasPixelRatio(390)).toBe(1.5);
    expect(maxCanvasPixelRatio(COMPACT_MAX_WIDTH)).toBe(2);
    expect(maxCanvasPixelRatio(1440)).toBe(2);
  });
});

describe("ambientFrameInterval", () => {
  it("baja a 30 fps en móvil y mantiene 60 fps en el resto", () => {
    expect(ambientFrameInterval(390)).toBeCloseTo(1000 / 30);
    expect(ambientFrameInterval(1440)).toBeCloseTo(1000 / 60);
  });

  it("deja más tiempo entre fotogramas en móvil que en escritorio", () => {
    expect(ambientFrameInterval(390)).toBeGreaterThan(
      ambientFrameInterval(1440),
    );
  });
});

describe("densidad de partículas", () => {
  it("mantiene más partículas cuanto más ancha es la pantalla", () => {
    expect(ambientParticleCount(360)).toBeLessThan(ambientParticleCount(800));
    expect(ambientParticleCount(800)).toBeLessThan(ambientParticleCount(1440));
    expect(burstParticleCount(360)).toBeLessThan(burstParticleCount(800));
    expect(burstParticleCount(800)).toBeLessThan(burstParticleCount(1440));
  });

  it("devuelve cantidades positivas", () => {
    expect(ambientParticleCount(0)).toBeGreaterThan(0);
    expect(burstParticleCount(0)).toBeGreaterThan(0);
  });

  it("recorta el gasto en móvil respecto a escritorio", () => {
    expect(ambientParticleCount(360)).toBe(12);
    expect(ambientParticleCount(1440)).toBe(38);
    expect(burstParticleCount(360)).toBe(32);
    expect(burstParticleCount(1440)).toBe(110);
  });
});
