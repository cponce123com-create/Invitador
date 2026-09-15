"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAGIC_LINK_PROVIDER_ID } from "@/lib/constants";
import { primaryButtonClass } from "@/lib/ui";

export function VerifyMagicLink() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  // React 18 monta los efectos dos veces en desarrollo: evitamos canjear el
  // token (de un solo uso) dos veces.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setError("El enlace no incluye un token válido.");
      return;
    }

    void (async () => {
      try {
        const result = await signIn(MAGIC_LINK_PROVIDER_ID, {
          token,
          redirect: false,
        });

        if (!result || result.error) {
          setError("El enlace es inválido o ya expiró. Pide uno nuevo.");
          return;
        }

        router.replace("/dashboard");
        router.refresh();
      } catch {
        setError("No pudimos verificar el enlace. Intenta de nuevo.");
      }
    })();
  }, [router, token]);

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-3xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-slate-900">No pudimos entrar</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <Link href="/login" className={primaryButtonClass}>
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <h1 className="text-lg font-semibold text-slate-900">Verificando tu enlace…</h1>
      <p className="text-sm text-slate-500">Un momento, te estamos llevando a tu panel.</p>
    </div>
  );
}
