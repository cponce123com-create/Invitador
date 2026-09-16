// Codificador de códigos QR propio (ISO/IEC 18004), sin dependencias: modo byte,
// versiones 1–40 y niveles de corrección L/M/Q/H. Devuelve la matriz de módulos
// para que la interfaz la pinte como SVG o la dibuje en un `canvas`.
//
// Utilidad pura: NO importa Prisma, el SDK de Cloudinary ni toca el DOM.

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrMatrix = {
  /** Versión del símbolo (1–40). */
  version: number;
  /** Lado del símbolo en módulos (`version * 4 + 17`). */
  size: number;
  /** Nivel de corrección con el que se generó. */
  level: QrErrorCorrectionLevel;
  /** `modules[fila][columna]`: `true` cuando el módulo es oscuro. */
  modules: boolean[][];
};

export type QrOptions = {
  /** Nivel de corrección. Por defecto `M` (recomendado por la norma). */
  level?: QrErrorCorrectionLevel;
  /** Fuerza la versión en vez de elegir la más pequeña que quepa. */
  version?: number;
  /** Fuerza la máscara (0–7) en vez de elegir la que menos penaliza. */
  mask?: number;
};

/** Módulos de margen (zona de silencio) que exige la norma. */
export const QR_QUIET_ZONE = 4;

const MIN_VERSION = 1;
const MAX_VERSION = 40;

const LEVEL_INDEX: Record<QrErrorCorrectionLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Bits de nivel dentro de la información de formato (tabla 25 de la norma). */
const LEVEL_FORMAT_BITS: Record<QrErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

/** Total de codewords (datos + corrección) de cada versión. */
const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991,
  1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876,
  3034, 3196, 3362, 3532, 3706,
];

/** Cantidad de bloques de corrección por versión y nivel (L, M, Q, H). */
const EC_BLOCKS_TABLE = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6, 2,
  5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10,
  17, 16, 6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34,
  9, 18, 25, 30, 10, 20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42, 14,
  28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48, 57, 19, 37, 51, 60, 19,
  38, 53, 63, 20, 40, 56, 66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];

/** Total de codewords de corrección por versión y nivel (L, M, Q, H). */
const EC_CODEWORDS_TABLE = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88, 36, 64, 96, 112,
  40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264, 96,
  176, 260, 308, 104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480,
  168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700, 224, 442, 644,
  750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588, 870, 1050, 336, 644,
  952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260, 420, 784, 1140, 1350, 450, 812, 1200,
  1440, 480, 868, 1290, 1530, 510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800,
  570, 1064, 1590, 1890, 600, 1120, 1680, 1980, 630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720,
  1316, 1950, 2310, 750, 1372, 2040, 2430,
];

/** Bits sobrantes que se rellenan con ceros al final de cada símbolo. */
const REMAINDER_BITS = [
  0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3,
  3, 3, 0, 0, 0, 0, 0, 0,
];

const MASK_COUNT = 8;
const MODE_BYTE = 0b0100;
const PAD_CODEWORDS = [0xec, 0x11];

// Tablas de logaritmos y antilogaritmos de GF(256) con el polinomio 0x11d.
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
{
  let value = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = value;
    LOG_TABLE[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
}

function multiply(left: number, right: number): number {
  if (left === 0 || right === 0) return 0;
  return EXP_TABLE[LOG_TABLE[left] + LOG_TABLE[right]];
}

/** Lado del símbolo en módulos. */
export function getSymbolSize(version: number): number {
  return version * 4 + 17;
}

function tableIndex(version: number, level: QrErrorCorrectionLevel): number {
  return (version - 1) * 4 + LEVEL_INDEX[level];
}

/** Reparto de codewords de una versión y nivel en bloques de datos y corrección. */
function blockStructure(version: number, level: QrErrorCorrectionLevel) {
  const index = tableIndex(version, level);
  const ecTotal = EC_CODEWORDS_TABLE[index];
  const blockCount = EC_BLOCKS_TABLE[index];
  const dataTotal = TOTAL_CODEWORDS[version] - ecTotal;
  const shortBlockLength = Math.floor(dataTotal / blockCount);
  const longBlockCount = dataTotal % blockCount;
  return {
    ecPerBlock: ecTotal / blockCount,
    shortBlockLength,
    shortBlockCount: blockCount - longBlockCount,
    longBlockCount,
    dataTotal,
  };
}

/** Posiciones centrales de los patrones de alineación (tabla E.1 de la norma). */
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = getSymbolSize(version);
  const interval = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < count - 1; i++) positions[i] = positions[i - 1] - interval;
  positions.push(6);
  return positions.reverse();
}

function generatorPolynomial(degree: number): number[] {
  let polynomial = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j++) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= multiply(polynomial[j], EXP_TABLE[i]);
    }
    polynomial = next;
  }
  return polynomial;
}

function errorCorrectionCodewords(data: number[], generator: number[]): number[] {
  const degree = generator.length - 1;
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor === 0) continue;
    for (let i = 0; i < degree; i++) remainder[i] ^= multiply(generator[i + 1], factor);
  }
  return remainder;
}

function countBitsForVersion(version: number): number {
  return version < 10 ? 8 : 16;
}

function chooseVersion(byteLength: number, level: QrErrorCorrectionLevel): number {
  for (let version = MIN_VERSION; version <= MAX_VERSION; version++) {
    const capacityBits = blockStructure(version, level).dataTotal * 8;
    if (4 + countBitsForVersion(version) + byteLength * 8 <= capacityBits) return version;
  }
  throw new Error(
    `El texto no cabe en un QR de nivel ${level}: ${byteLength} bytes.`,
  );
}

function encodeDataCodewords(
  bytes: number[],
  version: number,
  level: QrErrorCorrectionLevel,
): number[] {
  const capacityBits = blockStructure(version, level).dataTotal * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  push(MODE_BYTE, 4);
  push(bytes.length, countBitsForVersion(version));
  for (const byte of bytes) push(byte, 8);

  if (bits.length > capacityBits) {
    throw new Error(
      `El texto no cabe en la versión ${version} del QR: ${bytes.length} bytes.`,
    );
  }

  for (let i = 0; i < Math.min(4, capacityBits - bits.length); i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  for (let i = 0; bits.length < capacityBits; i++) push(PAD_CODEWORDS[i % 2], 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  return codewords;
}

function interleaveCodewords(
  dataCodewords: number[],
  version: number,
  level: QrErrorCorrectionLevel,
): number[] {
  const { ecPerBlock, shortBlockLength, shortBlockCount, longBlockCount } = blockStructure(
    version,
    level,
  );
  const generator = generatorPolynomial(ecPerBlock);
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];

  let offset = 0;
  for (let i = 0; i < shortBlockCount + longBlockCount; i++) {
    const length = i < shortBlockCount ? shortBlockLength : shortBlockLength + 1;
    const block = dataCodewords.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(errorCorrectionCodewords(block, generator));
  }

  const interleaved: number[] = [];
  for (let i = 0; i < shortBlockLength + 1; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) interleaved.push(block[i]);
  }
  return interleaved;
}

function createEmptyMatrix(size: number): { values: boolean[][]; reserved: boolean[][] } {
  const values = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { values, reserved };
}

function placeFinderPattern(
  values: boolean[][],
  reserved: boolean[][],
  row: number,
  col: number,
): void {
  const size = values.length;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      const inRing = (r === 0 || r === 6) && c >= 0 && c <= 6;
      const inColumn = (c === 0 || c === 6) && r >= 0 && r <= 6;
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      values[y][x] = inRing || inColumn || inCore;
      reserved[y][x] = true;
    }
  }
}

function placeAlignmentPattern(
  values: boolean[][],
  reserved: boolean[][],
  row: number,
  col: number,
): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      values[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      reserved[row + r][col + c] = true;
    }
  }
}

/** Dibuja los patrones fijos y marca las zonas que no llevan datos. */
function createSymbolPatterns(version: number) {
  const size = getSymbolSize(version);
  const { values, reserved } = createEmptyMatrix(size);

  placeFinderPattern(values, reserved, 0, 0);
  placeFinderPattern(values, reserved, 0, size - 7);
  placeFinderPattern(values, reserved, size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    values[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    values[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  const positions = alignmentPositions(version);
  const first = positions[0];
  const last = positions[positions.length - 1];
  for (const row of positions) {
    for (const col of positions) {
      const isFinderCorner =
        (row === first && col === first) ||
        (row === first && col === last) ||
        (row === last && col === first);
      if (isFinderCorner) continue;
      placeAlignmentPattern(values, reserved, row, col);
    }
  }

  values[size - 8][8] = true;
  reserved[size - 8][8] = true;

  for (let i = 0; i <= 8; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = size - 11; j < size - 8; j++) {
        reserved[i][j] = true;
        reserved[j][i] = true;
      }
    }
  }

  return { values, reserved };
}

function placeCodewords(
  values: boolean[][],
  reserved: boolean[][],
  codewords: number[],
  version: number,
): void {
  const size = values.length;
  const dataBits = codewords.length * 8;
  const expected = dataBits + REMAINDER_BITS[version];
  let index = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let offset = 0; offset < 2; offset++) {
        const col = right - offset;
        if (reserved[row][col]) continue;
        values[row][col] =
          index < dataBits ? ((codewords[index >> 3] >> (7 - (index & 7))) & 1) === 1 : false;
        index++;
      }
    }
    upward = !upward;
  }

  if (index !== expected) {
    throw new Error(
      `Símbolo QR inconsistente: ${index} módulos de datos donde la norma define ${expected}.`,
    );
  }
}

function bitLength(value: number): number {
  let length = 0;
  let rest = value;
  while (rest !== 0) {
    length++;
    rest >>>= 1;
  }
  return length;
}

/** Resto de la división polinómica en GF(2), usado por el formato y la versión. */
function bchRemainder(data: number, generator: number, generatorBits: number): number {
  let value = data << (generatorBits - 1);
  while (bitLength(value) >= generatorBits) {
    value ^= generator << (bitLength(value) - generatorBits);
  }
  return value;
}

function formatInfoValue(level: QrErrorCorrectionLevel, mask: number): number {
  const data = (LEVEL_FORMAT_BITS[level] << 3) | mask;
  return ((data << 10) | bchRemainder(data, 0x537, 11)) ^ 0x5412;
}

function versionInfoValue(version: number): number {
  return (version << 12) | bchRemainder(version, 0x1f25, 13);
}

function writeFormatInfo(
  values: boolean[][],
  level: QrErrorCorrectionLevel,
  mask: number,
): void {
  const size = values.length;
  const value = formatInfoValue(level, mask);
  const bit = (position: number) => ((value >> position) & 1) === 1;

  // Copia junto al patrón de posición superior izquierdo.
  for (let i = 0; i <= 5; i++) values[i][8] = bit(i);
  values[7][8] = bit(6);
  values[8][8] = bit(7);
  values[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) values[8][14 - i] = bit(i);

  // Copia partida entre la esquina inferior izquierda y la superior derecha.
  for (let i = 0; i <= 7; i++) values[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) values[size - 15 + i][8] = bit(i);
}

function writeVersionInfo(values: boolean[][], version: number): void {
  const size = values.length;
  const value = versionInfoValue(version);
  for (let i = 0; i < 18; i++) {
    const bit = ((value >> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 11;
    values[row][col] = bit;
    values[col][row] = bit;
  }
}

function maskCondition(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function applyMask(
  values: boolean[][],
  reserved: boolean[][],
  level: QrErrorCorrectionLevel,
  version: number,
  mask: number,
): boolean[][] {
  const size = values.length;
  const masked = values.map((row) => [...row]);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (reserved[row][col]) continue;
      if (maskCondition(mask, row, col)) masked[row][col] = !masked[row][col];
    }
  }
  writeFormatInfo(masked, level, mask);
  if (version >= 7) writeVersionInfo(masked, version);
  return masked;
}

const RATIO_PATTERN = [1, 0, 1, 1, 1, 0, 1];

/** Comprueba el patrón 1:1:3:1:1 que la norma castiga (regla 3). */
function matchesRatioPattern(
  values: boolean[][],
  row: number,
  col: number,
  horizontal: boolean,
): boolean {
  for (let i = 0; i < RATIO_PATTERN.length; i++) {
    const value = horizontal ? values[row][col + i] : values[row + i][col];
    if ((value ? 1 : 0) !== RATIO_PATTERN[i]) return false;
  }
  return true;
}

/** Comprueba que los 4 módulos indicados existan y estén claros. */
function isLightRun(
  values: boolean[][],
  row: number,
  col: number,
  horizontal: boolean,
): boolean {
  const size = values.length;
  for (let i = 0; i < 4; i++) {
    const index = (horizontal ? col : row) + i;
    if (index < 0 || index >= size) return false;
    const value = horizontal ? values[row][index] : values[index][col];
    if (value) return false;
  }
  return true;
}

/** Penalización de la norma: cuanto más baja, mejor se lee el símbolo. */
function penaltyScore(values: boolean[][]): number {
  const size = values.length;
  let score = 0;

  for (let i = 0; i < size; i++) {
    let rowRun = 1;
    let colRun = 1;
    for (let j = 1; j < size; j++) {
      if (values[i][j] === values[i][j - 1]) {
        rowRun++;
      } else {
        if (rowRun >= 5) score += 3 + (rowRun - 5);
        rowRun = 1;
      }
      if (values[j][i] === values[j - 1][i]) {
        colRun++;
      } else {
        if (colRun >= 5) score += 3 + (colRun - 5);
        colRun = 1;
      }
    }
    if (rowRun >= 5) score += 3 + (rowRun - 5);
    if (colRun >= 5) score += 3 + (colRun - 5);
  }

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const value = values[row][col];
      if (
        value === values[row][col + 1] &&
        value === values[row + 1][col] &&
        value === values[row + 1][col + 1]
      ) {
        score += 3;
      }
    }
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (col + RATIO_PATTERN.length <= size && matchesRatioPattern(values, row, col, true)) {
        if (
          isLightRun(values, row, col - 4, true) ||
          isLightRun(values, row, col + RATIO_PATTERN.length, true)
        ) {
          score += 40;
        }
      }
      if (row + RATIO_PATTERN.length <= size && matchesRatioPattern(values, row, col, false)) {
        if (
          isLightRun(values, row - 4, col, false) ||
          isLightRun(values, row + RATIO_PATTERN.length, col, false)
        ) {
          score += 40;
        }
      }
    }
  }

  let dark = 0;
  for (const row of values) {
    for (const value of row) {
      if (value) dark++;
    }
  }
  const percent = (dark * 100) / (size * size);
  return score + 10 * Math.floor(Math.abs(percent - 50) / 5);
}

/** Elige la máscara que menos penaliza de las ocho que define la norma. */
function chooseMask(
  values: boolean[][],
  reserved: boolean[][],
  level: QrErrorCorrectionLevel,
  version: number,
): number {
  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < MASK_COUNT; mask++) {
    const score = penaltyScore(applyMask(values, reserved, level, version, mask));
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
  }
  return bestMask;
}

/**
 * Genera el símbolo QR del texto indicado (UTF-8, modo byte).
 *
 * Elige la versión más pequeña que quepa y la máscara que menos penaliza, salvo
 * que se fuercen. Lanza un error si el texto no cabe en ninguna versión.
 */
export function createQrMatrix(text: string, options: QrOptions = {}): QrMatrix {
  const level = options.level ?? "M";
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = options.version ?? chooseVersion(bytes.length, level);
  if (version < MIN_VERSION || version > MAX_VERSION) {
    throw new Error(`Versión de QR fuera de rango: ${version}.`);
  }
  if (options.mask !== undefined && (options.mask < 0 || options.mask >= MASK_COUNT)) {
    throw new Error(`Máscara de QR fuera de rango: ${options.mask}.`);
  }

  const codewords = interleaveCodewords(encodeDataCodewords(bytes, version, level), version, level);
  const { values, reserved } = createSymbolPatterns(version);
  placeCodewords(values, reserved, codewords, version);

  const mask = options.mask ?? chooseMask(values, reserved, level, version);
  return {
    version,
    size: values.length,
    level,
    modules: applyMask(values, reserved, level, version, mask),
  };
}

/**
 * `d` de un `<path>` SVG con los módulos oscuros, en unidades de módulo y ya
 * desplazados por la zona de silencio. Se agrupan los módulos contiguos de cada
 * fila para que el trazado sea compacto.
 */
export function qrPathData(matrix: QrMatrix, quietZone: number = QR_QUIET_ZONE): string {
  const parts: string[] = [];
  for (let row = 0; row < matrix.size; row++) {
    let col = 0;
    while (col < matrix.size) {
      if (!matrix.modules[row][col]) {
        col++;
        continue;
      }
      let end = col;
      while (end + 1 < matrix.size && matrix.modules[row][end + 1]) end++;
      const length = end - col + 1;
      parts.push(`M${col + quietZone} ${row + quietZone}h${length}v1h-${length}z`);
      col = end + 1;
    }
  }
  return parts.join("");
}

/** Lado del `viewBox` del SVG, incluyendo la zona de silencio. */
export function qrSvgSize(matrix: QrMatrix, quietZone: number = QR_QUIET_ZONE): number {
  return matrix.size + quietZone * 2;
}
