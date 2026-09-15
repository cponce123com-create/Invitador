import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyMagicLink } from "@/components/VerifyMagicLink";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = { title: "Verificando enlace" };

/**
 * El componente de verificación lee el token desde `useSearchParams`, así que
 * debe renderizarse dentro de un boundary de `Suspense`.
 */
export default function VerifyMagicLinkPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className={cardClass}>
        <Suspense
          fallback={
            <div className="space-y-3 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              <p className="text-sm text-slate-500">Cargando…</p>
            </div>
          }
        >
          <VerifyMagicLink />
        </Suspense>
      </div>
    </main>
  );
}
