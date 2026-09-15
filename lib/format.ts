import type {
  AttendanceStatusValue,
  GuestRelationValue,
} from "@/lib/constants";

// Las fechas de evento se guardan como "hora de pared" (wall clock) codificada
// en UTC: el anfitrión escribe "5:00 p.m." y queremos que todos los invitados
// vean exactamente "5:00 p.m.", sin importar la zona horaria del servidor
// (Render corre en UTC). Por eso parseamos y formateamos siempre con `timeZone: "UTC"`.

const WALL_CLOCK_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const FULL_DATE_TIME = new Intl.DateTimeFormat("es-419", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const LONG_DATE = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE_TIME = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Convierte el valor de un `<input type="datetime-local">` a Date (UTC). */
export function parseWallClockInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!WALL_CLOCK_PATTERN.test(trimmed)) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const parsed = new Date(`${normalized}.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Inverso de `parseWallClockInput`: valor para `<input type="datetime-local">`. */
export function toWallClockInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

/** ej: "Sábado 5 de julio de 2026, 5:00 p.m." */
export function formatEventDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  return capitalize(FULL_DATE_TIME.format(parsed));
}

/** ej: "5 de julio de 2026" */
export function formatLongDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  return LONG_DATE.format(parsed);
}

/** ej: "05/07/2026, 17:00" — usado en tablas del dashboard. */
export function formatShortDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "—";
  return SHORT_DATE_TIME.format(parsed);
}

/** Texto relativo simple para saber si un evento ya pasó. */
export function isPastEvent(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export function formatGuestSummary(
  attendance: AttendanceStatusValue,
  additionalGuests: { relation: GuestRelationValue }[],
): string {
  if (attendance !== "SI") return "—";
  return additionalGuests.length > 0
    ? `+${additionalGuests.length}`
    : "Solo";
}
