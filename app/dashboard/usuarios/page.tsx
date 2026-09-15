import type { Metadata } from "next";
import { CreateUserForm } from "@/components/CreateUserForm";
import { formatShortDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { cardClass } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usuarios" };

/** Gestión de cuentas: solo accesible para super admins. */
export default async function UsersPage() {
  const admin = await requireSuperAdmin();

  const users = await prisma.host.findMany({
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { events: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Crea las cuentas que podrán entrar a armar sus propias invitaciones.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className={cardClass}>
          <h2 className="text-base font-bold text-slate-900">
            Cuentas ({users.length})
          </h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.name ?? user.email}
                    {user.id === admin.id ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (tú)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {user.isSuperAdmin ? (
                    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      Admin
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-500">
                    {user._count.events} evento{user._count.events === 1 ? "" : "s"}
                  </span>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    {formatShortDateTime(user.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-bold text-slate-900">Nuevo usuario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Se crea con la contraseña que escribas aquí; no se envía ningún correo.
          </p>
          <div className="mt-4">
            <CreateUserForm />
          </div>
        </section>
      </div>
    </div>
  );
}
