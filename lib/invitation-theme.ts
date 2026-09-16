// Tema visual de la invitación pública según el tipo de evento.
//
// Este módulo es "puro": no toca el DOM, no importa Prisma ni el SDK de
// Cloudinary. Lo consumen tanto el shell de la invitación (cliente) como los
// tests. Mismo criterio que `lib/backgrounds.ts`.

import { EVENT_TYPE_EMOJI, type EventTypeValue } from "@/lib/constants";
import type { ParticleKind } from "@/lib/particles";

export type InvitationTheme = {
  /** Saludo corto que se escribe a máquina en la portada. */
  greeting: string;
  /** Emoji del tipo de evento (coincide con el de la portada). */
  emoji: string;
  /** Partícula ambiental que acompaña la escena. */
  particleKind: ParticleKind;
  /** Colores (hex) para el confeti y las partículas. */
  palette: readonly string[];
  /** Color de acento para brillos y realces. */
  accent: string;
};

/** Tema de reserva: tipos desconocidos o ausentes nunca deben romper la página. */
export const DEFAULT_INVITATION_THEME: InvitationTheme = {
  greeting: "¡Tienes una invitación!",
  emoji: "🎉",
  particleKind: "confetti",
  palette: ["#8b5cf6", "#ec4899", "#f59e0b", "#6366f1"],
  accent: "#8b5cf6",
};

const THEMES: Record<EventTypeValue, Omit<InvitationTheme, "emoji">> = {
  CUMPLEANOS: {
    greeting: "¡Estás invitado a celebrar!",
    particleKind: "confetti",
    palette: ["#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"],
    accent: "#f59e0b",
  },
  BABY_SHOWER: {
    greeting: "¡Un pequeñín está en camino!",
    particleKind: "bubbles",
    palette: ["#5eead4", "#7dd3fc", "#f9a8d4", "#c7d2fe"],
    accent: "#7dd3fc",
  },
  BODA: {
    greeting: "¡Nos casamos y queremos celebrarlo contigo!",
    particleKind: "petals",
    palette: ["#d4af37", "#f5e6c8", "#faf3e3", "#e8c39e"],
    accent: "#d4af37",
  },
  BAUTIZO: {
    greeting: "Acompáñanos a dar la bienvenida",
    particleKind: "sparkles",
    palette: ["#bae6fd", "#7dd3fc", "#38bdf8", "#f8fafc"],
    accent: "#38bdf8",
  },
  GRADUACION: {
    greeting: "¡Lo logramos! Celebra conmigo",
    particleKind: "stars",
    palette: ["#fbbf24", "#1e3a8a", "#334155", "#e2e8f0"],
    accent: "#fbbf24",
  },
  OTRO: {
    greeting: "¡Tienes una invitación!",
    particleKind: "confetti",
    palette: ["#8b5cf6", "#ec4899", "#f59e0b", "#6366f1"],
    accent: "#8b5cf6",
  },
};

function isKnownType(type: string | null | undefined): type is EventTypeValue {
  return typeof type === "string" && type in THEMES;
}

/**
 * Devuelve el tema del evento. Acepta `string` a propósito: si llega un tipo
 * desconocido (dato viejo o corrupto) cae al tema de reserva en vez de lanzar.
 */
export function getInvitationTheme(type: string | null | undefined): InvitationTheme {
  if (!isKnownType(type)) return { ...DEFAULT_INVITATION_THEME };
  return { ...THEMES[type], emoji: EVENT_TYPE_EMOJI[type] };
}
