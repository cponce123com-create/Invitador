import { z } from "zod";
import {
  EVENT_TYPES,
  MAX_EVENT_PHOTOS,
  MAX_GIFT_MESSAGE,
  MAX_GUESTS_PER_RSVP_LIMIT,
} from "@/lib/constants";
import { parseWallClockInput } from "@/lib/format";
import { MUSIC_TRACK_IDS } from "@/lib/music";
import { isHttpUrl } from "@/lib/urls";

/**
 * URL con esquema `http`/`https`.
 *
 * `z.string().url()` acepta cualquier esquema (`javascript:`, `data:`…), y un
 * valor así se ejecutaría al pintarse en un `href`; por eso se restringe.
 */
const httpUrl = (message: string) =>
  z.string().trim().url(message).refine(isHttpUrl, message);

export const eventPhotoInputSchema = z.object({
  /** Presente solo en fotos que ya existen en la base de datos. */
  id: z.string().min(1).optional(),
  url: httpUrl("La URL de la foto no es válida"),
  cloudinaryId: z.string().trim().min(1, "Falta el identificador de Cloudinary"),
});

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

/**
 * URL opcional. Acepta la cadena vacía porque es lo que envía el formulario
 * cuando el anfitrión deja el campo en blanco (se guarda como `null`).
 */
const optionalUrl = (message: string) =>
  z.union([httpUrl(message), z.literal("")]).optional();

/**
 * Fecha-hora del selector del formulario. Acepta la cadena vacía (campo
 * opcional) y exige el formato de "hora de pared" que produce
 * `<input type="datetime-local">`: así nadie envía una fecha con offset y se
 * muestra una hora distinta a la que el anfitrión escribió.
 */
const wallClockInput = () =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || parseWallClockInput(value) !== null,
      "Usa el selector de fecha y hora del formulario",
    );

/**
 * Formulario de creación/edición de evento.
 *
 * Los campos se validan como strings porque es lo que produce un formulario
 * HTML. La conversión a los tipos de Prisma (Date, null, etc.) se hace en la
 * capa de persistencia (`lib/events.ts`).
 */
export const eventFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "El título debe tener al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  type: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: "Selecciona un tipo de evento" }),
  }),
  customLabel: optionalText(120, "Máximo 120 caracteres"),
  ageOrDetail: optionalText(120, "Máximo 120 caracteres"),
  eventDate: wallClockInput(),
  // Cierre de la lista de invitados: la invitación muestra una cuenta regresiva
  // y, al cumplirse, deja de aceptar confirmaciones. Vacío = no se cierra sola.
  rsvpDeadline: wallClockInput(),
  location: optionalText(200, "Máximo 200 caracteres"),
  // Foto del lugar y link de Google Maps: opcionales. Si ambos están vacíos, la
  // invitación no muestra la tarjeta «El lugar».
  locationImageUrl: optionalUrl("La URL de la foto del lugar no es válida"),
  mapUrl: optionalUrl("El link de Google Maps no es válido"),
  description: optionalText(4000, "Máximo 4000 caracteres"),
  coverImageUrl: optionalUrl("La URL de la portada no es válida"),
  // Mesa de regalos: un único QR y el texto que lo acompaña (llave, cuenta…).
  giftQrUrl: optionalUrl("La URL del QR de regalos no es válida"),
  giftMessage: optionalText(
    MAX_GIFT_MESSAGE,
    `Máximo ${MAX_GIFT_MESSAGE} caracteres`,
  ),
  // Foto del código de vestimenta: si queda vacía, la invitación no muestra la
  // tarjeta.
  dressCodeImageUrl: optionalUrl(
    "La URL de la foto del código de vestimenta no es válida",
  ),
  // Melodía de fondo (`lib/music.ts`). Cadena vacía = sin música. La invitación
  // sintetiza la melodía en el navegador, así que no hay ningún archivo que
  // subir ni URL que validar.
  musicTrack: z.union([z.enum(MUSIC_TRACK_IDS), z.literal("")]).optional(),
  // Fondo demo elegido (`BackgroundTemplate.id`). Cadena vacía = sin fondo.
  backgroundTemplateId: z
    .union([
      z.string().trim().min(1, "El fondo seleccionado no es válido"),
      z.literal(""),
    ])
    .optional(),
  maxGuestsPerRsvp: z
    .number({ invalid_type_error: "Ingresa un número" })
    .int("Debe ser un número entero")
    .min(0, "El mínimo es 0")
    .max(MAX_GUESTS_PER_RSVP_LIMIT, `El máximo es ${MAX_GUESTS_PER_RSVP_LIMIT}`),
  isActive: z.boolean().optional(),
  photos: z
    .array(eventPhotoInputSchema)
    .max(MAX_EVENT_PHOTOS, `Puedes subir hasta ${MAX_EVENT_PHOTOS} fotos`)
    .optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const eventStatusSchema = z.object({
  isActive: z.boolean(),
});

export type EventStatusValues = z.infer<typeof eventStatusSchema>;
