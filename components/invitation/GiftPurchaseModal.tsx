"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/format";
import { optimizedImageUrl } from "@/lib/images";
import { GiftProofForm } from "./GiftProofForm";
import { useFullScreenLayer } from "./overlay-layer";

/** Lo mínimo que necesita la ventana de compra para presentar el regalo. */
export type PurchaseGift = {
  id: string;
  title: string;
  priceCents: number | null;
  currency: string;
  imageUrl: string;
};

type Props = {
  item: PurchaseGift;
  eventId: string;
  giftQrUrl: string | null;
  giftMessage: string | null;
  onClose: () => void;
};

/**
 * Ventana de compra de un regalo del catálogo.
 *
 * Reúne en un solo sitio las tres cosas que el invitado necesita: el QR de la
 * mesa de regalos (el mismo que subió el anfitrión), los datos de pago y el
 * formulario del comprobante, ya asociado a este artículo.
 *
 * Se monta en `document.body` mediante un portal, igual que el visor de fotos:
 * dentro del `Reveal` que envuelve la sección, el `transform` de su animación
 * convierte ese div en bloque contenedor y el `fixed` mediría la tarjeta en vez
 * de la pantalla.
 */
export function GiftPurchaseModal({
  item,
  eventId,
  giftQrUrl,
  giftMessage,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Mientras la ventana tapa la invitación, el fondo ambiental se detiene.
  useFullScreenLayer();

  // Al cerrar, el foco vuelve al botón que la abrió.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => previouslyFocused?.focus();
  }, []);

  useEffect(() => {
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comprar ${item.title}`}
      className="fixed inset-0 z-[70] flex items-end justify-center overscroll-contain bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      {/* Solo se cierra con el botón: un toque fuera no debe borrar lo que el
          invitado ya escribió en el formulario. */}
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-50 p-4 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={optimizedImageUrl(item.imageUrl, 200)}
                alt={item.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                {item.title}
              </h2>
              {item.priceCents !== null ? (
                <p className="text-sm font-semibold text-brand-700">
                  {formatPrice(item.priceCents, item.currency)}
                </p>
              ) : null}
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xl leading-none text-slate-500 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="mt-3 space-y-3 rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">¿Cómo pagarlo?</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
            <li>
              Escanea el QR y paga
              {item.priceCents !== null
                ? ` ${formatPrice(item.priceCents, item.currency)}`
                : " el monto que quieras"}
              .
            </li>
            <li>Guarda la captura del comprobante.</li>
            <li>Adjúntala abajo con tu nombre y el anfitrión la verá.</li>
          </ol>

          {giftQrUrl ? (
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
              <Image
                src={optimizedImageUrl(giftQrUrl, 600)}
                alt="Código QR de la mesa de regalos"
                fill
                sizes="224px"
                className="object-contain"
              />
            </div>
          ) : null}

          {giftMessage ? (
            <p className="whitespace-pre-line text-center text-xs text-slate-600">
              {giftMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <GiftProofForm eventId={eventId} giftItemId={item.id} />
        </div>
      </div>
    </div>
  );

  // `document` no existe durante el renderizado en servidor, y la ventana solo
  // se abre tras un toque del visitante, así que nunca llega a hidratarse.
  if (typeof document === "undefined") return null;

  return createPortal(overlay, document.body);
}
