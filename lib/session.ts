import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export type SessionHost = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
};

/** Devuelve el anfitrión autenticado o `null`. Para usar en Server Components y route handlers. */
export async function getCurrentHost(): Promise<SessionHost | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    isSuperAdmin: user.isSuperAdmin === true,
  };
}

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
