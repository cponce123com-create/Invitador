import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/SetupForm";
import { prisma } from "@/lib/prisma";
import { cardClass } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear administrador" };

/**
 * Instalación inicial: crea el primer super admin. En cuanto existe uno, esta
 * página deja de estar disponible y manda al login.
 */
export default async function SetupPage() {
  const superAdmins = await prisma.host.count({ where: { isSuperAdmin: true } });
  if (superAdmins > 0) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-12">
      <Link
        href="/"
        className="text-center text-lg font-black tracking-tight text-brand-700"
      >
        Invitador
      </Link>

      <div className={cardClass}>
        <div className="mb-5 space-y-1">
          <h1 className="text-xl font-bold text-slate-900">
            Crea tu cuenta de administrador
          </h1>
          <p className="text-sm text-slate-500">
            Esta pantalla solo aparece una vez. Con esta cuenta crearás al resto
            de usuarios.
          </p>
        </div>
        <SetupForm />
      </div>

      <p className="text-center text-xs text-slate-500">
        Ya tengo cuenta.{" "}
        <Link href="/login" className="font-semibold text-brand-700">
          Entrar
        </Link>
      </p>
    </main>
  );
}
