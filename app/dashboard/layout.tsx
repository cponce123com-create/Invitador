import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { requireHost } from "@/lib/session";

/**
 * Layout del área privada del anfitrión.
 *
 * `requireHost` es la fuente de verdad de la autenticación (comprueba la sesión
 * contra la base de datos). El `middleware.ts` hace una primera barrera antes
 * de llegar aquí, pero esta comprobación se repite por seguridad.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = await requireHost();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-lg font-black tracking-tight text-brand-700"
          >
            Invitador
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[16rem] truncate text-sm text-slate-500 sm:inline">
              {host.name ?? host.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
