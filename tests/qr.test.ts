import { describe, expect, it } from "vitest";
import { QR_REFERENCE_VECTORS } from "./qr-fixtures";
import {
  QR_QUIET_ZONE,
  createQrMatrix,
  getSymbolSize,
  qrPathData,
  qrSvgSize,
  type QrMatrix,
} from "@/lib/qr";

function toRows(matrix: QrMatrix): string[] {
  return matrix.modules.map((row) => row.map((dark) => (dark ? "#" : ".")).join(""));
}

/**
 * Lee la información de formato tal y como lo hace un lector: `bit` es la
 * posición dentro de los 15 bits (el 0 va junto al patrón de sincronización).
 */
function readFormatInfo(rows: string[]): { levelBits: number; mask: number } {
  const dark = (row: number, col: number) => (rows[row][col] === "#" ? 1 : 0);
  const bit = (position: number): number => {
    if (position <= 5) return dark(position, 8);
    if (position === 6) return dark(7, 8);
    if (position === 7) return dark(8, 8);
    if (position === 8) return dark(8, 7);
    return dark(8, 14 - position);
  };

  let value = 0;
  for (let i = 0; i < 15; i++) value |= bit(i) << i;
  const data = (value ^ 0x5412) >> 10;
  return { levelBits: data >> 3, mask: data & 0b111 };
}

const LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 } as const;

const FINDER = [
  "#######",
  "#.....#",
  "#.###.#",
  "#.###.#",
  "#.###.#",
  "#.....#",
  "#######",
];

describe("createQrMatrix", () => {
  it("reproduce exactamente los símbolos de un codificador externo", () => {
    expect(QR_REFERENCE_VECTORS.length).toBeGreaterThan(0);
    for (const vector of QR_REFERENCE_VECTORS) {
      // La máscara es una heurística de legibilidad: se toma la del símbolo de
      // referencia para comparar el resto de la codificación módulo a módulo.
      const { mask } = readFormatInfo(vector.rows);
      const matrix = createQrMatrix(vector.text, { level: vector.level, mask });
      expect(matrix.version, vector.label).toBe(vector.version);
      expect(toRows(matrix), vector.label).toEqual(vector.rows);
    }
  });

  it("escribe una información de formato legible por un lector", () => {
    for (const vector of QR_REFERENCE_VECTORS) {
      const matrix = createQrMatrix(vector.text, { level: vector.level });
      const { levelBits, mask } = readFormatInfo(toRows(matrix));
      expect(levelBits, vector.label).toBe(LEVEL_BITS[vector.level]);
      expect(mask, vector.label).toBeGreaterThanOrEqual(0);
      expect(mask, vector.label).toBeLessThan(8);
    }
  });

  it("dibuja los patrones de posición, de sincronización y el módulo oscuro", () => {
    const matrix = createQrMatrix("https://example.com");
    const { size } = matrix;

    for (const [top, left] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ]) {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          expect(matrix.modules[top + row][left + col]).toBe(FINDER[row][col] === "#");
        }
      }
    }

    for (let i = 8; i < size - 8; i++) {
      expect(matrix.modules[6][i]).toBe(i % 2 === 0);
      expect(matrix.modules[i][6]).toBe(i % 2 === 0);
    }

    expect(matrix.modules[size - 8][8]).toBe(true);
  });

  it("coloca los patrones de alineación donde marca la norma", () => {
    // Versión 7: centros en 6, 22 y 38 (las tres esquinas son de los finder).
    const matrix = createQrMatrix("1", { version: 7 });
    const centers = [
      [6, 22],
      [22, 6],
      [22, 22],
      [22, 38],
      [38, 22],
      [38, 38],
    ];
    for (const [row, col] of centers) {
      expect(matrix.modules[row][col]).toBe(true);
      expect(matrix.modules[row - 1][col]).toBe(false);
      expect(matrix.modules[row - 2][col]).toBe(true);
    }
  });

  it("genera las 40 versiones con los 4 niveles de corrección", () => {
    for (let version = 1; version <= 40; version++) {
      for (const level of ["L", "M", "Q", "H"] as const) {
        const matrix = createQrMatrix("1", { level, version });
        expect(matrix.version).toBe(version);
        expect(matrix.level).toBe(level);
        expect(matrix.size).toBe(getSymbolSize(version));
        expect(matrix.modules).toHaveLength(matrix.size);
        expect(matrix.modules.every((row) => row.length === matrix.size)).toBe(true);
      }
    }
  });

  it("elige la versión más pequeña que quepa", () => {
    expect(createQrMatrix("x".repeat(14)).version).toBe(1);
    expect(createQrMatrix("x".repeat(15)).version).toBe(2);
    expect(createQrMatrix("x".repeat(26)).version).toBe(2);
    expect(createQrMatrix("x".repeat(27)).version).toBe(3);
    expect(createQrMatrix("x".repeat(15), { level: "H" }).version).toBe(3);
  });

  it("rechaza lo que no cabe en ningún símbolo", () => {
    expect(() => createQrMatrix("x".repeat(3000))).toThrow(/no cabe/);
    expect(() => createQrMatrix("x".repeat(15), { version: 1 })).toThrow(/no cabe/);
    expect(() => createQrMatrix("HOLA", { version: 41 })).toThrow(/fuera de rango/);
    expect(() => createQrMatrix("HOLA", { mask: 8 })).toThrow(/fuera de rango/);
  });

  it("es determinista y no comparte estado entre símbolos", () => {
    const first = createQrMatrix("https://invitador.onrender.com/e/fiesta");
    const second = createQrMatrix("https://invitador.onrender.com/e/fiesta");
    expect(toRows(second)).toEqual(toRows(first));

    const other = createQrMatrix("https://invitador.onrender.com/e/otra");
    expect(toRows(other)).not.toEqual(toRows(first));
    expect(toRows(first)).toEqual(toRows(createQrMatrix("https://invitador.onrender.com/e/fiesta")));
  });
});

describe("qrPathData", () => {
  it("traza un rectángulo por cada tramo de módulos oscuros", () => {
    const matrix = createQrMatrix("HOLA");
    const path = qrPathData(matrix);
    const rectangles = path.match(/M\d+ \d+h\d+v1h-\d+z/g) ?? [];
    const runs = matrix.modules.reduce((total, row) => {
      let count = 0;
      for (let col = 0; col < row.length; col++) {
        if (row[col] && !row[col - 1]) count++;
      }
      return total + count;
    }, 0);

    expect(rectangles).toHaveLength(runs);
    expect(path).toContain(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}`);
  });

  it("cubre exactamente los módulos oscuros", () => {
    const matrix = createQrMatrix("https://invitador.onrender.com/e/cumpleanos");
    const path = qrPathData(matrix);
    const area = [...path.matchAll(/h(\d+)v1h-\d+z/g)].reduce(
      (total, match) => total + Number(match[1]),
      0,
    );
    const dark = matrix.modules.flat().filter(Boolean).length;
    expect(area).toBe(dark);
  });
});

describe("qrSvgSize", () => {
  it("suma la zona de silencio al lado del símbolo", () => {
    const matrix = createQrMatrix("HOLA");
    expect(qrSvgSize(matrix)).toBe(matrix.size + QR_QUIET_ZONE * 2);
    expect(qrSvgSize(matrix, 0)).toBe(matrix.size);
  });
});
