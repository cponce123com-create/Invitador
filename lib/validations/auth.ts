import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

/** Email normalizado: se guarda y se compara siempre en minúsculas. */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Escribe un email válido")
  .max(200, "Máximo 200 caracteres");

const passwordField = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .max(200, "Máximo 200 caracteres");

/** El nombre es opcional: si se deja vacío se usa el email como identificador. */
const nameField = z
  .string()
  .trim()
  .max(120, "Máximo 120 caracteres")
  .optional();

export const loginSchema = z.object({
  email: emailField,
  // En el login no se exige longitud mínima: si la contraseña es corta, el
  // propio `verifyPassword` fallará. Exigirla aquí solo daría pistas.
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

export const setupSchema = z.object({
  email: emailField,
  name: nameField,
  password: passwordField,
});

export const createUserSchema = setupSchema.extend({
  isSuperAdmin: z.boolean().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SetupValues = z.infer<typeof setupSchema>;
export type CreateUserValues = z.infer<typeof createUserSchema>;
