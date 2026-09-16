import { z } from "zod";
import { ATTENDANCE_STATUSES, GUEST_RELATIONS } from "@/lib/constants";

export const additionalGuestInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe el nombre del acompañante")
    .max(80, "Máximo 80 caracteres"),
  relation: z.enum(GUEST_RELATIONS, {
    errorMap: () => ({ message: "Selecciona la relación" }),
  }),
});

/**
 * Esquema del formulario público de confirmación.
 *
 * Es una fábrica porque el tope de acompañantes es un dato del evento
 * (`Event.maxGuestsPerRsvp`) y no un valor hardcodeado: la misma validación
 * corre en el cliente y en el servidor con el límite real del evento.
 */
export function createRsvpSchema(maxGuests: number) {
  const limit = Math.max(0, Math.trunc(maxGuests));

  return z.object({
    eventId: z.string().trim().min(1, "Falta el evento"),
    mainGuestName: z
      .string()
      .trim()
      .min(2, "Escribe tu nombre")
      .max(80, "Máximo 80 caracteres"),
    mainGuestPhone: z
      .string()
      .trim()
      .min(6, "Escribe tu celular")
      .max(30, "Máximo 30 caracteres"),
    attendance: z.enum(ATTENDANCE_STATUSES, {
      errorMap: () => ({ message: "Indica si podrás asistir" }),
    }),
    message: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
    additionalGuests: z
      .array(additionalGuestInputSchema)
      .max(limit, `Puedes agregar hasta ${limit} acompañante(s)`),
  });
}

export type RsvpFormValues = z.infer<ReturnType<typeof createRsvpSchema>>;

/**
 * Esquema de edición desde el panel del anfitrión: los mismos campos que el
 * formulario público (el tope de acompañantes sigue saliendo del evento) salvo
 * el `eventId`, que va en la URL y no puede cambiarse desde el cuerpo.
 */
export function updateRsvpSchema(maxGuests: number) {
  return createRsvpSchema(maxGuests).omit({ eventId: true });
}

export type RsvpEditValues = z.infer<ReturnType<typeof updateRsvpSchema>>;
