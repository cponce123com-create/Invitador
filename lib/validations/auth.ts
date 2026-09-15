import { z } from "zod";

export const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Escribe un email válido")
    .max(200, "Máximo 200 caracteres"),
});

export type RequestMagicLinkValues = z.infer<typeof requestMagicLinkSchema>;
