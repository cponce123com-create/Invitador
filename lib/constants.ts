// Constantes y etiquetas de dominio.
//
// IMPORTANTE: este módulo NO importa valores de `@prisma/client` ni el SDK de
// Cloudinary a propósito. Se usa desde componentes de cliente, y un import de
// valor arrastraría esos runtimes al bundle del navegador. La paridad con los
// enums del schema queda garantizada por TypeScript en los sitios donde estos
// valores se pasan a Prisma (si divergen, el build falla).

export const EVENT_TYPES = [
  "CUMPLEANOS",
  "BABY_SHOWER",
  "BODA",
  "BAUTIZO",
  "GRADUACION",
  "OTRO",
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventTypeValue, string> = {
  CUMPLEANOS: "Cumpleaños",
  BABY_SHOWER: "Baby Shower",
  BODA: "Boda",
  BAUTIZO: "Bautizo",
  GRADUACION: "Graduación",
  OTRO: "Otro",
};

export const EVENT_TYPE_EMOJI: Record<EventTypeValue, string> = {
  CUMPLEANOS: "🎂",
  BABY_SHOWER: "🍼",
  BODA: "💍",
  BAUTIZO: "🕊️",
  GRADUACION: "🎓",
  OTRO: "🎉",
};

/** Placeholder del campo `ageOrDetail` según el tipo de evento. */
export const EVENT_DETAIL_PLACEHOLDER: Record<EventTypeValue, string> = {
  CUMPLEANOS: "Cumple 30 años",
  BABY_SHOWER: "Baby Shower de Sofía",
  BODA: "Boda de Ana y Luis",
  BAUTIZO: "Bautizo de Mateo",
  GRADUACION: "Grado de Ingeniería",
  OTRO: "Detalle adicional",
};

export const GUEST_RELATIONS = [
  "FAMILIAR",
  "AMIGO",
  "AMIGA",
  "NOVIO",
  "NOVIA",
  "ESPOSO",
  "ESPOSA",
  "COMPANERO_TRABAJO",
  "OTRO",
] as const;

export type GuestRelationValue = (typeof GUEST_RELATIONS)[number];

export const GUEST_RELATION_LABELS: Record<GuestRelationValue, string> = {
  FAMILIAR: "Familiar",
  AMIGO: "Amigo",
  AMIGA: "Amiga",
  NOVIO: "Novio",
  NOVIA: "Novia",
  ESPOSO: "Esposo",
  ESPOSA: "Esposa",
  COMPANERO_TRABAJO: "Compañero de trabajo",
  OTRO: "Otro",
};

export const ATTENDANCE_STATUSES = ["SI", "NO", "TAL_VEZ"] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS: Record<AttendanceStatusValue, string> = {
  SI: "Sí asistiré",
  NO: "No podré ir",
  TAL_VEZ: "Tal vez",
};

export const ATTENDANCE_SHORT_LABELS: Record<AttendanceStatusValue, string> = {
  SI: "Sí",
  NO: "No",
  TAL_VEZ: "Tal vez",
};

export const ATTENDANCE_EMOJI: Record<AttendanceStatusValue, string> = {
  SI: "🎉",
  NO: "😔",
  TAL_VEZ: "🤔",
};

// Clases estáticas (Tailwind las detecta porque viven en el código fuente).
export const ATTENDANCE_BUTTON_CLASSES: Record<AttendanceStatusValue, string> = {
  SI: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-emerald-500",
  NO: "border-rose-500 bg-rose-50 text-rose-700 ring-rose-500",
  TAL_VEZ: "border-amber-500 bg-amber-50 text-amber-700 ring-amber-500",
};

export const ATTENDANCE_BADGE_CLASSES: Record<AttendanceStatusValue, string> = {
  SI: "bg-emerald-100 text-emerald-800",
  NO: "bg-rose-100 text-rose-800",
  TAL_VEZ: "bg-amber-100 text-amber-800",
};

export const DEFAULT_MAX_GUESTS_PER_RSVP = 3;
export const MAX_GUESTS_PER_RSVP_LIMIT = 20;
export const MAX_EVENT_PHOTOS = 30;

/**
 * Tope de nombres que el endpoint público de RSVP compara al buscar un posible
 * duplicado. Acota la memoria y el trabajo por petición en eventos con
 * muchísimos invitados; por encima de este número el aviso puede no dispararse.
 */
export const MAX_DUPLICATE_SCAN = 2000;

/** Longitud máxima del texto que acompaña al QR de la mesa de regalos. */
export const MAX_GIFT_MESSAGE = 300;

/** Cuántos artículos puede publicar el anfitrión en el catálogo de regalos. */
export const MAX_GIFT_ITEMS = 30;

/** Longitud máxima del nombre de un artículo del catálogo de regalos. */
export const MAX_GIFT_ITEM_TITLE = 120;

/** Longitud máxima de la descripción de un artículo del catálogo. */
export const MAX_GIFT_ITEM_DESCRIPTION = 400;

/**
 * Precio máximo publicable en el catálogo, en céntimos.
 *
 * Deja margen dentro del rango `Int` de Postgres (2 147 483 647) y evita que un
 * precio absurdo reviente el `create` con un error de base de datos (500) en
 * lugar de rechazarse con un 422 limpio.
 */
export const MAX_GIFT_PRICE_CENTS = 999_999_999;

/** Cuántos eventos puede tener un mismo anfitrión. */
export const MAX_EVENTS_PER_HOST = 50;

/** Cuántas fotos de galería puede acumular un anfitrión entre todos sus eventos. */
export const MAX_PHOTOS_PER_HOST = 500;

/** Cuántos artículos de catálogo puede acumular un anfitrión entre sus eventos. */
export const MAX_GIFT_ITEMS_PER_HOST = 300;

/**
 * Moneda con la que se publican los precios del catálogo (ISO 4217).
 * Coincide con la zona de referencia de la plataforma (hora de Perú).
 */
export const DEFAULT_CURRENCY = "PEN";

/**
 * Zona horaria de referencia de la plataforma (hora de Perú, UTC-5).
 *
 * Las fechas del evento se guardan como "hora de pared" y se muestran iguales
 * para todos los invitados. En cambio los INSTANTES reales —cuándo se registró
 * una confirmación, cuándo cierra la lista de invitados— se calculan y se
 * muestran en esta zona.
 */
export const EVENT_TIME_ZONE = "America/Lima";

/** id del proveedor de Auth.js basado en email + contraseña. */
export const CREDENTIALS_PROVIDER_ID = "credentials";

/** Longitud mínima exigida a las contraseñas. */
export const PASSWORD_MIN_LENGTH = 8;

/** Límite del endpoint público de RSVP (por IP). */
export const RSVP_RATE_LIMIT = { limit: 8, windowMs: 60_000 } as const;

/**
 * Límite de la subida pública de comprobantes de regalo (por IP). Es más
 * holgado que el de RSVP porque un invitado puede equivocarse de captura y
 * reintentar, pero corta el abuso desde una sola conexión.
 */
export const GIFT_RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 } as const;

/** Límite de intentos de login (por IP + email). */
export const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 60_000 } as const;

/**
 * Límite del endpoint público de instalación inicial (`/api/setup`, por IP).
 * Solo puede consumirse mientras no exista ningún administrador.
 */
export const SETUP_RATE_LIMIT = { limit: 5, windowMs: 10 * 60_000 } as const;

/**
 * Límite de firmas de subida por anfitrión. Es holgado a propósito: crear un
 * evento con 30 fotos, portada, foto del lugar y QR gasta unas 33 firmas
 * seguidas, y un anfitrión activo puede crear varios eventos en una sesión.
 */
export const UPLOAD_RATE_LIMIT = { limit: 120, windowMs: 10 * 60_000 } as const;

export function getEventTypeLabel(
  type: EventTypeValue,
  customLabel?: string | null,
): string {
  const custom = customLabel?.trim();
  return custom && custom.length > 0 ? custom : EVENT_TYPE_LABELS[type];
}

/**
 * Créditos del pie de la invitación pública. Se pintan en una sola línea que
 * corre como una cinta (ver `components/invitation/FooterRibbon.tsx`); el año
 * entra como dato para poder probarlos sin depender del reloj.
 */
export function footerRibbonItems(year: number): string[] {
  return [
    "Invitación creada con Invitador",
    "Desarrollado por Pisanucas Tec",
    `Todos los derechos reservados © ${year}`,
  ];
}
