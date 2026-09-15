import type { CSSProperties } from "react";

// Fondos demo generados en código (gradientes CSS y patrones SVG), sin subir
// nada a Cloudinary y sin depender de imágenes externas con licencia.
//
// Este módulo es "puro": no importa Prisma ni el SDK de Cloudinary, así que lo
// pueden usar tanto el servidor (`EventHero`) como el cliente
// (`BackgroundPicker`) y los tests.

export type BackgroundKindValue = "GRADIENT" | "PATTERN";

/** Forma mínima de un fondo que necesitan el render y los tests. */
export type BackgroundTemplateLike = {
  kind: BackgroundKindValue;
  colors: readonly string[];
  patternName?: string | null;
};

/**
 * Degradado por defecto. Coincide exactamente con el que tenía `EventHero`
 * (`bg-gradient-to-br from-brand-600 via-brand-500 to-fuchsia-500`) para que los
 * eventos existentes sin fondo elegido se sigan viendo igual.
 */
export const DEFAULT_GRADIENT_COLORS = ["#4f46e5", "#6366f1", "#d946ef"] as const;

export const DEFAULT_HERO_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `linear-gradient(to bottom right, ${DEFAULT_GRADIENT_COLORS.join(
    ", ",
  )})`,
};

export const PATTERN_NAMES = ["dots", "waves", "confetti", "stripes"] as const;

export type PatternName = (typeof PATTERN_NAMES)[number];

/**
 * Cada patrón es un tile SVG cuadrado. `body` recibe el color del trazo para
 * poder teñir el patrón con los colores del fondo elegido.
 */
const PATTERN_TILES: Record<
  PatternName,
  { size: number; body: (ink: string) => string }
> = {
  dots: {
    size: 24,
    body: (ink) =>
      `<circle cx='6' cy='6' r='1.8' fill='${ink}'/>` +
      `<circle cx='18' cy='18' r='1.8' fill='${ink}'/>`,
  },
  waves: {
    size: 32,
    body: (ink) =>
      `<path d='M0 22 Q8 14 16 22 T32 22' fill='none' stroke='${ink}' stroke-width='2'/>`,
  },
  confetti: {
    size: 32,
    body: (ink) =>
      `<rect x='4' y='6' width='4' height='4' rx='1' fill='${ink}'/>` +
      `<circle cx='22' cy='10' r='2' fill='${ink}'/>` +
      `<rect x='14' y='22' width='4' height='4' rx='1' fill='${ink}'/>`,
  },
  stripes: {
    size: 20,
    body: (ink) =>
      `<path d='M-5 5 L5 -5 M0 20 L20 0 M15 25 L25 15' fill='none' stroke='${ink}' stroke-width='2'/>`,
  },
};

export function isPatternName(value: string | null | undefined): value is PatternName {
  return (
    typeof value === "string" &&
    (PATTERN_NAMES as readonly string[]).includes(value)
  );
}

/**
 * Devuelve el `background-image` CSS (un data URI SVG) para un patrón, o `null`
 * si el nombre no corresponde a ningún patrón conocido.
 */
export function patternImageUrl(
  name: string | null | undefined,
  ink = "#ffffff",
): string | null {
  if (!isPatternName(name)) return null;
  const tile = PATTERN_TILES[name];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tile.size}' height='${tile.size}' ` +
    `viewBox='0 0 ${tile.size} ${tile.size}'>${tile.body(ink)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Traduce un fondo a un `style` de React. Lo comparten `EventHero` (público y
 * preview) y `BackgroundPicker` (miniaturas) para no duplicar la lógica.
 *
 * Devuelve el degradado por defecto cuando no hay fondo, cuando el patrón es
 * desconocido o cuando un degradado no trae suficientes colores.
 */
export function backgroundStyleFor(
  template?: BackgroundTemplateLike | null,
): CSSProperties {
  if (!template) return { ...DEFAULT_HERO_BACKGROUND_STYLE };

  if (template.kind === "PATTERN") {
    const [base = DEFAULT_GRADIENT_COLORS[0], ink = "#ffffff"] =
      template.colors ?? [];
    const image = patternImageUrl(template.patternName, ink);
    if (!image) return { ...DEFAULT_HERO_BACKGROUND_STYLE };
    return { backgroundColor: base, backgroundImage: image };
  }

  const colors = (template.colors ?? []).filter(
    (color) => typeof color === "string" && color.trim().length > 0,
  );
  if (colors.length < 2) return { ...DEFAULT_HERO_BACKGROUND_STYLE };

  return {
    backgroundImage: `linear-gradient(to bottom right, ${colors.join(", ")})`,
  };
}
