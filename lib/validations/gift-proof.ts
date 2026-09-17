import { z } from "zod";
import { MAX_GIFT_MESSAGE } from "@/lib/constants";
import { isHttpUrl } from "@/lib/urls";

/**
 * Campos que escribe el invitado en el formulario público del comprobante.
 *
 * El nombre es obligatorio para que el anfitrión sepa de quién es la captura;
 * la nota es un texto libre corto (a qué se destinó el regalo, un saludo…).
 */
export const giftProofFormSchema = z.object({
  senderName: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre")
    .max(80, "Máximo 80 caracteres"),
  note: z
    .string()
    .trim()
    .max(MAX_GIFT_MESSAGE, `Máximo ${MAX_GIFT_MESSAGE} caracteres`)
    .optional(),
});

export type GiftProofFormValues = z.infer<typeof giftProofFormSchema>;

/**
 * Payload completo del endpoint público: los campos del formulario más el
 * evento y el asset que ya se subió a Cloudinary.
 */
export const giftProofRequestSchema = giftProofFormSchema.extend({
  eventId: z.string().trim().min(1, "Falta el evento"),
  /**
   * Artículo del catálogo al que corresponde el comprobante. Opcional: quien da
   * efectivo —o quien sube la captura sin elegir regalo— lo omite. El endpoint
   * comprueba que el artículo pertenezca al evento antes de guardarlo.
   */
  giftItemId: z
    .string()
    .trim()
    .min(1, "El regalo elegido no es válido")
    .optional(),
  url: z
    .string()
    .trim()
    .url("La URL del comprobante no es válida")
    .refine(isHttpUrl, "La URL del comprobante no es válida"),
  cloudinaryId: z
    .string()
    .trim()
    .min(1, "Falta el identificador del comprobante"),
});

export type GiftProofRequestValues = z.infer<typeof giftProofRequestSchema>;
