import { describe, expect, it } from "vitest";
import {
  areSimilarNames,
  findSimilarNames,
  nameSimilarity,
  normalizeName,
} from "@/lib/names";

describe("normalizeName", () => {
  it("quita acentos, mayúsculas y espacios sobrantes", () => {
    expect(normalizeName("  María   GONZÁLEZ ")).toBe("maria gonzalez");
  });

  it("convierte los signos en separadores", () => {
    expect(normalizeName("O'Brien")).toBe("o brien");
    expect(normalizeName("Ana-María")).toBe("ana maria");
  });

  it("devuelve cadena vacía si no hay letras ni números", () => {
    expect(normalizeName("  *** ")).toBe("");
  });
});

describe("nameSimilarity", () => {
  it("da 1 a nombres idénticos salvo acentos y mayúsculas", () => {
    expect(nameSimilarity("Sofía Ramírez", "sofia ramirez")).toBe(1);
  });

  it("da 1 a los mismos tokens en distinto orden", () => {
    expect(nameSimilarity("González María", "María González")).toBe(1);
  });

  it("puntúa alto el nombre contenido en otro más largo", () => {
    expect(
      nameSimilarity("María González", "María González Rojas"),
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("detecta una errata en el apellido", () => {
    expect(areSimilarNames("Maria Gonzales", "María González")).toBe(true);
  });

  it("no confunde apellidos distintos", () => {
    expect(areSimilarNames("Juan Perez", "Juan Gomez")).toBe(false);
  });

  it("no marca un solo nombre de pila", () => {
    expect(areSimilarNames("Luis", "Luis Fernando")).toBe(false);
  });

  it("devuelve 0 con entradas vacías", () => {
    expect(nameSimilarity("", "Ana")).toBe(0);
    expect(nameSimilarity("***", "Ana")).toBe(0);
  });
});

describe("findSimilarNames", () => {
  it("devuelve solo los parecidos, en su forma original", () => {
    expect(
      findSimilarNames("Maria Gonzalez", [
        "María González",
        "Luis Perez",
        "González Maria",
      ]),
    ).toEqual(["María González", "González Maria"]);
  });

  it("devuelve una lista vacía si no hay parecidos", () => {
    expect(findSimilarNames("Ana Torres", ["Luis Perez"])).toEqual([]);
  });
});
