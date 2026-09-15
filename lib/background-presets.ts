import type { BackgroundKindValue } from "@/lib/backgrounds";
import type { EventTypeValue } from "@/lib/constants";

// Catálogo de fondos demo que se siembra en la tabla `BackgroundTemplate`.
//
// Vive en `lib/` (no en el script de seed) por dos motivos:
//  1. el seed queda "tonto": solo hace upsert de estos datos;
//  2. los tests pueden verificar que hay al menos un fondo por tipo de evento
//     sin necesitar una base de datos.
//
// Los ids son estables y legibles para que el seed sea idempotente (upsert).

export type BackgroundPreset = {
  id: string;
  name: string;
  /** `null` = el fondo sirve para cualquier tipo de evento. */
  eventType: EventTypeValue | null;
  kind: BackgroundKindValue;
  /** GRADIENT: colores hex. PATTERN: [color base, color del trazo]. */
  colors: string[];
  patternName: string | null;
  isPremium: boolean;
  order: number;
};

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  // --- Gradientes de marca (sirven para cualquier evento) ---
  {
    id: "bg-brand-aurora",
    name: "Aurora",
    eventType: null,
    kind: "GRADIENT",
    colors: ["#4f46e5", "#6366f1", "#d946ef"],
    patternName: null,
    isPremium: false,
    order: 0,
  },
  {
    id: "bg-brand-atardecer",
    name: "Atardecer",
    eventType: null,
    kind: "GRADIENT",
    colors: ["#f97316", "#db2777", "#7c3aed"],
    patternName: null,
    isPremium: false,
    order: 1,
  },
  {
    id: "bg-brand-oceano",
    name: "Océano",
    eventType: null,
    kind: "GRADIENT",
    colors: ["#0ea5e9", "#4f46e5", "#312e81"],
    patternName: null,
    isPremium: false,
    order: 2,
  },

  // --- Cumpleaños: colores vivos ---
  {
    id: "bg-cumple-fiesta",
    name: "Fiesta",
    eventType: "CUMPLEANOS",
    kind: "GRADIENT",
    colors: ["#f59e0b", "#ef4444", "#ec4899"],
    patternName: null,
    isPremium: false,
    order: 10,
  },
  {
    id: "bg-cumple-confeti",
    name: "Confeti",
    eventType: "CUMPLEANOS",
    kind: "PATTERN",
    colors: ["#7c3aed", "#fde047"],
    patternName: "confetti",
    isPremium: false,
    order: 11,
  },

  // --- Baby shower: pasteles ---
  {
    id: "bg-baby-menta",
    name: "Menta",
    eventType: "BABY_SHOWER",
    kind: "GRADIENT",
    colors: ["#5eead4", "#7dd3fc", "#f9a8d4"],
    patternName: null,
    isPremium: false,
    order: 20,
  },
  {
    id: "bg-baby-nubes",
    name: "Nubes",
    eventType: "BABY_SHOWER",
    kind: "PATTERN",
    colors: ["#c7d2fe", "#4f46e5"],
    patternName: "dots",
    isPremium: false,
    order: 21,
  },

  // --- Boda: dorados y blancos ---
  {
    id: "bg-boda-marfil",
    name: "Marfil",
    eventType: "BODA",
    kind: "GRADIENT",
    colors: ["#fde68a", "#e7e5e4", "#a8a29e"],
    patternName: null,
    isPremium: false,
    order: 30,
  },
  {
    id: "bg-boda-oro",
    name: "Ondas doradas",
    eventType: "BODA",
    kind: "PATTERN",
    colors: ["#1f2937", "#d4af37"],
    patternName: "waves",
    isPremium: false,
    order: 31,
  },

  // --- Bautizo: celestes y blancos ---
  {
    id: "bg-bautizo-cielo",
    name: "Cielo",
    eventType: "BAUTIZO",
    kind: "GRADIENT",
    colors: ["#bae6fd", "#7dd3fc", "#38bdf8"],
    patternName: null,
    isPremium: false,
    order: 40,
  },
  {
    id: "bg-bautizo-perla",
    name: "Perla",
    eventType: "BAUTIZO",
    kind: "PATTERN",
    colors: ["#0f172a", "#bae6fd"],
    patternName: "dots",
    isPremium: false,
    order: 41,
  },

  // --- Graduación: azul noche y dorado ---
  {
    id: "bg-grado-noche",
    name: "Noche",
    eventType: "GRADUACION",
    kind: "GRADIENT",
    colors: ["#0f172a", "#1e3a8a", "#334155"],
    patternName: null,
    isPremium: false,
    order: 50,
  },
  {
    id: "bg-grado-honor",
    name: "Honor",
    eventType: "GRADUACION",
    kind: "PATTERN",
    colors: ["#1e293b", "#fbbf24"],
    patternName: "stripes",
    isPremium: false,
    order: 51,
  },

  // --- Otro: fiesta neutra ---
  {
    id: "bg-otro-celebracion",
    name: "Celebración",
    eventType: "OTRO",
    kind: "GRADIENT",
    colors: ["#8b5cf6", "#ec4899", "#f59e0b"],
    patternName: null,
    isPremium: false,
    order: 60,
  },
  {
    id: "bg-otro-brillo",
    name: "Brillo",
    eventType: "OTRO",
    kind: "PATTERN",
    colors: ["#312e81", "#a5b4fc"],
    patternName: "dots",
    isPremium: false,
    order: 61,
  },
];
