import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentHost } from "@/lib/session";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  // Si ya hay sesión, no tiene sentido volver a pedir el enlace.
  const host = await getCurrentHost();
  if (host) redirect("/dashboard");

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
          <h1 className="text-xl font-bold text-slate-900">Entra a tu panel</h1>
          <p className="text-sm text-slate-500">
            Te enviamos un enlace de acceso por email. Sin contraseñas.
          </p>
        </div>
        <LoginForm />
      </div>

      <p className="text-center text-xs text-slate-500">
        Al entrar podrás crear y gestionar tus eventos.
      </p>
    </main>
  );
}
