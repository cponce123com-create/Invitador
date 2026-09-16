import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionHost = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
};

/**
 * Devuelve el anfitrión autenticado o `null`. Para usar en Server Components y
 * route handlers.
 *
 * La cuenta se relee de la base de datos en lugar de confiar en el JWT: así un
 * anfitrión borrado (o al que se le quitó `isSuperAdmin`) pierde el acceso en la
 * siguiente petición, en vez de conservarlo hasta que caduque el token (30
 * días). `cache` evita repetir la consulta dentro de la misma petición.
 */
export const getCurrentHost = cache(async (): Promise<SessionHost | null> => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const host = await prisma.host.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });
  if (!host) return null;

  return {
    id: host.id,
    email: host.email,
    name: host.name,
    isSuperAdmin: host.isSuperAdmin,
  };
});

/** Igual que `getCurrentHost`, pero redirige a /login si no hay sesión. */
export async function requireHost(): Promise<SessionHost> {
  const host = await getCurrentHost();
  if (!host) {
    redirect("/login");
  }
  return host;
}

/**
 * Solo para páginas: exige sesión y permisos de super admin. Los route
 * handlers no la usan porque `redirect()` no tiene sentido en una respuesta
 * JSON; allí se comprueba `getCurrentHost()` y se devuelve 401/403.
 */
export async function requireSuperAdmin(): Promise<SessionHost> {
  const host = await requireHost();
  if (!host.isSuperAdmin) {
    redirect("/dashboard");
  }
  return host;
}
