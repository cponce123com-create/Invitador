"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightbox } from "@/components/invitation/Lightbox";
import { formatShortDateTime } from "@/lib/format";
import { optimizedImageUrl } from "@/lib/images";
import { dangerButtonClass, ghostButtonClass } from "@/lib/ui";

/** Comprobante tal como lo necesita la tarjeta del panel. */
export type GiftProofItem = {
  id: string;
  senderName: string;
  note: string | null;
  url: string;
  createdAt: Date;
};

/**
 * Lista de comprobantes recibidos en el panel del anfitrión: miniatura y enlace
 * «Ver comprobante» que abren el visor (el mismo del muro de fotos), quién lo
 * envió, su nota y la fecha de subida, con un botón para quitarlo.
 *
 * El borrado pasa por la API (solo el dueño del evento puede hacerlo) y después
 * se refresca la ruta para que el contador y la lista vuelvan a leer de la base.
 */
export function GiftProofList({ proofs }: { proofs: GiftProofItem[] }) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(proof: GiftProofItem) {
    const confirmed = window.confirm(
      `¿Quitar el comprobante de ${proof.senderName}? Se borrará también la imagen. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeletingId(proof.id);
    setError(null);

    try {
      const response = await fetch(`/api/gift-proofs/${proof.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "No pudimos quitar el comprobante.");
        return;
      }
      router.refresh();
    } catch {
      setError("Revisa tu conexión e intenta de nuevo.");
    } finally {
      setDeletingId(null);
    }
  }

  if (proofs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
        Todavía no hay comprobantes. Cuando un invitado suba el suyo, aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {proofs.map((proof, index) => (
          <li
            key={proof.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 p-3"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Ampliar el comprobante de ${proof.senderName}`}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"
            >
              <Image
                src={optimizedImageUrl(proof.url, 400)}
                alt={`Comprobante de ${proof.senderName}`}
                fill
                sizes="80px"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {proof.senderName}
              </p>
              {proof.note ? (
                <p className="text-xs text-slate-600">{proof.note}</p>
              ) : null}
              <p className="text-xs text-slate-400">
                {formatShortDateTime(proof.createdAt)}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setOpenIndex(index)}
                >
                  Ver comprobante
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  disabled={deletingId === proof.id}
                  onClick={() => void handleDelete(proof)}
                >
                  {deletingId === proof.id ? "Quitando…" : "Quitar"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {openIndex !== null ? (
        <Lightbox
          photos={proofs.map((proof) => ({ id: proof.id, url: proof.url }))}
          index={openIndex}
          title="Comprobantes de regalo"
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </div>
  );
}
