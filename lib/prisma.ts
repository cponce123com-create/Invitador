import { Prisma, PrismaClient } from "@prisma/client";

// En desarrollo, Next.js recarga los módulos en cada cambio (HMR) y crearía
// una conexión nueva por recarga. Cacheamos la instancia en `globalThis` para
// no agotar el pool de conexiones de Neon.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** `true` si el error es una violación de índice único (código P2002). */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * `true` si la transacción se abortó por conflicto de escritura o interbloqueo
 * (código P2034). Ocurre con el aislamiento `Serializable`, que es justo lo que
 * impide crear dos administradores a la vez en `/api/setup`.
 */
export function isSerializationError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

/**
 * `true` si el error es una violación de clave foránea (código P2003).
 * Ocurre, por ejemplo, cuando el formulario de evento manda un
 * `backgroundTemplateId` que ya no existe: sin esto, un id ajeno o caducado
 * terminaría en un 500 en vez de en un 400.
 */
export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}
