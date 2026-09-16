import { describe, expect, it } from "vitest";
import { LIGHTBOX_PREFETCH_RADIUS, visiblePhotoRange } from "@/lib/lightbox";

describe("visiblePhotoRange", () => {
  it("monta la foto actual y una vecina a cada lado", () => {
    expect(visiblePhotoRange(3, 10)).toEqual({ start: 2, end: 4 });
  });

  it("usa el radio de precarga por defecto", () => {
    const { start, end } = visiblePhotoRange(5, 30);
    expect(5 - start).toBe(LIGHTBOX_PREFETCH_RADIUS);
    expect(end - 5).toBe(LIGHTBOX_PREFETCH_RADIUS);
  });

  it("no se sale del muro en la primera ni en la última foto", () => {
    expect(visiblePhotoRange(0, 10)).toEqual({ start: 0, end: 1 });
    expect(visiblePhotoRange(9, 10)).toEqual({ start: 8, end: 9 });
  });

  it("con una o dos fotos devuelve solo las que existen", () => {
    expect(visiblePhotoRange(0, 1)).toEqual({ start: 0, end: 0 });
    expect(visiblePhotoRange(0, 2)).toEqual({ start: 0, end: 1 });
    expect(visiblePhotoRange(1, 2)).toEqual({ start: 0, end: 1 });
  });

  it("sin fotos devuelve un rango vacío", () => {
    expect(visiblePhotoRange(0, 0)).toEqual({ start: 0, end: -1 });
  });

  it("con radio 0 monta solo la foto actual", () => {
    expect(visiblePhotoRange(4, 10, 0)).toEqual({ start: 4, end: 4 });
  });

  it("con radio mayor que el muro monta todo el muro", () => {
    expect(visiblePhotoRange(1, 3, 10)).toEqual({ start: 0, end: 2 });
  });

  it("acota un índice fuera del muro", () => {
    expect(visiblePhotoRange(-5, 10)).toEqual({ start: 0, end: 1 });
    expect(visiblePhotoRange(42, 10)).toEqual({ start: 8, end: 9 });
  });

  it("siempre contiene la foto actual y nunca se sale del muro", () => {
    for (let total = 1; total <= 8; total += 1) {
      for (let index = 0; index < total; index += 1) {
        const { start, end } = visiblePhotoRange(index, total);
        expect(start).toBeLessThanOrEqual(index);
        expect(end).toBeGreaterThanOrEqual(index);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(total - 1);
      }
    }
  });
});
