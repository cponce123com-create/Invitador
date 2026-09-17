import { z } from "zod";
import {
  MAX_GIFT_ITEM_DESCRIPTION,
  MAX_GIFT_ITEM_TITLE,
} from "@/lib/constants";
import { parsePriceToCents } from "@/lib/format";
import { isHttpUrl } from "@/lib/urls";

/**
 * URL con esquema `http`/`https`.
 *
 * Misma regla que en `lib/validations/event.ts`: `z.string().url()` acepta
 * cualquier esquema (`javascript:`, `data:`…) y un valor así se ejecutaría al
 * pintarse en el `src` de la imagen del regalo.
 */
const httpUrl = (message: string) =>
  z.string().trim().url(message).refine(isHttpUrl, message);

/**
 * Precio opcional tal como lo escribe el anfitrión ("35", "35.5", "35.50").
 *
 * Se valida como texto —no como número— porque es lo que produce un
 * `<input inputMode="decimal">`; la conversión a céntimos la hace
 * `parsePriceToCents` en la capa de persistencia. Vacío = sin precio.
 */
const optionalPrice = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || parsePriceToCents(value) !== null,
    "Escribe un precio como 35 o 35.50",
  )
  .optional();

/**
 * Un artículo del catálogo de regalos.
 *
 * Igual que `eventPhotoInputSchema`, el `id` solo llega en artículos que ya
 * existen en la base: así la capa de persistencia distingue qué crear, qué
 * actualizar y qué borrar.
 */
export const giftItemInputSchema = z.object({
  /** Presente solo en artículos que ya existen en la base de datos. */
  id: z.string().min(1).optional(),
  title: z
    .string()
    .trim()
    .min(2, "El nombre del regalo debe tener al menos 2 caracteres")
    .max(MAX_GIFT_ITEM_TITLE, `Máximo ${MAX_GIFT_ITEM_TITLE} caracteres`),
  description: z
    .string()
    .trim()
    .max(
      MAX_GIFT_ITEM_DESCRIPTION,
      `Máximo ${MAX_GIFT_ITEM_DESCRIPTION} caracteres`,
    )
    .optional(),
  price: optionalPrice,
  imageUrl: httpUrl("La URL de la foto del regalo no es válida"),
  cloudinaryId: z.string().trim().min(1, "Falta el identificador de Cloudinary"),
});

export type GiftItemInputValues = z.infer<typeof giftItemInputSchema>;
