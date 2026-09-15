import Link from "next/link";
import { primaryButtonClass } from "@/lib/ui";

/** Página 404: cubre links rotos y eventos inexistentes o desactivados. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="text-5xl" aria-hidden>
        🔍
      </span>
      <h1 className="text-2xl font-black text-slate-900">
        No encontramos esta página
      </h1>
      <p className="text-sm text-slate-600">
        Puede que el link haya cambiado o que la invitación ya no esté
        disponible.
      </p>
      <Link href="/" className={primaryButtonClass}>
        Volver al inicio
      </Link>
    </main>
  );
}
