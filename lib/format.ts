import {
  DEFAULT_CURRENCY,
  EVENT_TIME_ZONE,
  MAX_GIFT_PRICE_CENTS,
  type AttendanceStatusValue,
  type GuestRelationValue,
} from "@/lib/constants";

// En la app conviven dos clases de fechas y se tratan distinto:
//
// 1. FECHAS DE PARED (fecha y hora del evento, cierre de la lista). El anfitrión
//    escribe "5:00 p.m." y queremos que TODOS los invitados vean exactamente
//    "5:00 p.m.", sin importar su zona horaria. Por eso se guardan codificadas en
//    UTC (componentes de pared) y se parsean/formatean con `timeZone: "UTC"`.
//
// 2. INSTANTES REALES (cuándo se registró una confirmación, cuándo se subió un
//    comprobante). Son momentos absolutos y se muestran en la zona de referencia
//    de la plataforma (`EVENT_TIME_ZONE`, hora de Perú). Para saber en qué
//    momento ocurre una fecha de pared se usa `wallClockToInstant`.

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

/** Instantes reales: se pintan en la zona de referencia de la plataforma. */
const SHORT_DATE_TIME = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

/** Componentes de pared de la zona de referencia, para calcular su desfase. */
const WALL_CLOCK_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: EVENT_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
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

/**
 * ej: "05/07/2026, 12:00" — instantes reales (confirmaciones, comprobantes) en la
 * hora de la zona de referencia; se usa en las tablas del dashboard y los CSV.
 */
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

/**
 * Desfase de la zona de referencia respecto a UTC (en ms) para un instante.
 * Se obtiene restando los componentes que ve la zona a los del mismo instante en
 * UTC. Para "America/Lima" (sin horario de verano) es -5 h.
 */
function timeZoneOffsetMs(date: Date): number {
  const fields: Record<string, string> = {};
  for (const part of WALL_CLOCK_PARTS.formatToParts(date)) {
    if (part.type !== "literal") fields[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(fields.year),
    Number(fields.month) - 1,
    Number(fields.day),
    Number(fields.hour === "24" ? "00" : fields.hour),
    Number(fields.minute),
    Number(fields.second),
  );
  return asUtc - date.getTime();
}

/**
 * Convierte una fecha guardada como "hora de pared" (componentes en UTC) en el
 * instante real que representa esa hora en la zona de referencia.
 *
 * Ej: `2026-09-25T22:00:00Z` → `2026-09-26T03:00:00Z`, las 10 de la noche del 25
 * en Perú.
 */
export function wallClockToInstant(
  value: Date | string | null | undefined,
): Date | null {
  if (!value) return null;
  const wallClock = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(wallClock.getTime())) return null;
  return new Date(wallClock.getTime() - timeZoneOffsetMs(wallClock));
}

/**
 * `true` si una fecha de pared ya pasó. Se usa para cerrar la lista de
 * invitados; acepta `now` para poder probarlo sin depender del reloj real.
 */
export function isWallClockPast(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const instant = wallClockToInstant(value);
  return instant !== null && instant.getTime() <= now.getTime();
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

/**
 * Precio del catálogo de regalos.
 *
 * Se guarda en céntimos (`Int`) para no arrastrar errores de coma flotante,
 * pero el anfitrión escribe texto libre ("35", "35.5", "35.50"): la conversión
 * vive aquí, junto al resto de parseos del proyecto, para que el formulario y
 * los tests usen exactamente la misma regla.
 */

/** Acepta enteros o hasta dos decimales. Rechaza negativos, comas y basura. */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Un formateador por moneda: construir `Intl` es caro para cada tarjeta. */
const priceFormatters = new Map<string, Intl.NumberFormat>();

function priceFormatter(currency: string): Intl.NumberFormat {
  const cached = priceFormatters.get(currency);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
    });
  } catch {
    // Una moneda corrupta en la base no debe romper la invitación.
    formatter = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    });
  }

  priceFormatters.set(currency, formatter);
  return formatter;
}

/**
 * Convierte el texto del formulario en céntimos.
 * Vacío o con formato inválido devuelve `null` (el precio es opcional).
 */
export function parsePriceToCents(
  value: string | null | undefined,
): number | null {
  const trimmed = value?.trim();
  if (!trimmed || !PRICE_PATTERN.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  // El precio ya se valida al entrar; este tope es la última red para que un
  // valor fuera de rango nunca llegue a un `Int` de Postgres.
  return cents > MAX_GIFT_PRICE_CENTS ? null : cents;
}

/**
 * Motivo por el que un precio escrito a mano no es válido, o `null` si lo es
 * (incluido el campo vacío: el precio es opcional).
 *
 * Devuelve el mensaje concreto, y no un booleano, para poder distinguir un
 * formato mal escrito de un precio fuera de rango.
 */
export function priceInputError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!PRICE_PATTERN.test(trimmed)) return "Escribe un precio como 35 o 35.50";
  if (Math.round(Number(trimmed) * 100) > MAX_GIFT_PRICE_CENTS) {
    return `El precio no puede pasar de ${formatPrice(MAX_GIFT_PRICE_CENTS)}`;
  }
  return null;
}

/** Céntimos → precio listo para mostrar, ej: `S/ 35.50`. */
export function formatPrice(
  cents: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return priceFormatter(currency).format(cents / 100);
}

/**
 * Céntimos → texto del formulario (`3550` → `"35.50"`).
 *
 * Es el camino de vuelta de `parsePriceToCents`: al reabrir el evento, el
 * anfitrión tiene que ver el mismo número que escribió. Sin precio → `""`.
 */
export function centsToPriceInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}
