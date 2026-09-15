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
