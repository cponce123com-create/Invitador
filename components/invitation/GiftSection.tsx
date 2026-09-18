"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { optimizedImageUrl } from "@/lib/images";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import type { GiftPurchaseModalProps } from "./GiftPurchaseModal";
import { ZoomableImage } from "./ZoomableImage";

/** Fondo opaco mientras baja el chunk de la ventana de compra. */
function GiftModalFallback() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm"
    />
  );
}

/**
 * La ventana de compra trae consigo el formulario del comprobante (y con él
 * `react-hook-form` + `zod`), así que se carga solo al pulsar «Comprar el
 * regalo» o «Aportar un monto».
 */
const GiftPurchaseModal = dynamic<GiftPurchaseModalProps>(
  () => import("./GiftPurchaseModal").then((mod) => mod.GiftPurchaseModal),
  { ssr: false, loading: () => <GiftModalFallback /> },
);

/** Un regalo del catálogo tal como lo pinta la invitación pública. */
export type GiftSectionItem = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  imageUrl: string;
  /** Cuántos comprobantes ya recibió: alimenta la insignia informativa. */
  proofCount: number;
};

type Props = {
  items: GiftSectionItem[];
  eventId: string;
  eventTitle: string;
  giftQrUrl: string | null;
  giftMessage: string | null;
};

/** Qué abrió la ventana de compra: un artículo del catálogo o el aporte libre. */
type Selection = { kind: "item"; id: string } | { kind: "free" };

/**
 * Sección «Mesa de regalos» de la invitación.
 *
 * Reúne en un solo bloque el QR del anfitrión y el catálogo: el invitado puede
 * elegir un artículo o aportar un monto libre, y las dos vías abren la misma
 * ventana de compra. No es un carrito: cada regalo se resuelve solo y el pago
 * ocurre fuera (Yape, Plin, transferencia…), así que no hay pasarela ni estado
 * que mantener.
 *
 * Se renderiza cuando el anfitrión subió un QR o publicó artículos; sin ninguno
 * de los dos no hay mesa de regalos que mostrar.
 */
export function GiftSection({
  items,
  eventId,
  eventTitle,
  giftQrUrl,
  giftMessage,
}: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);
  // Solo se busca el artículo al abrir la ventana: el catálogo entero ya está
  // en `items`, así que no hace falta duplicarlo en el estado.
  const openItem =
    selection?.kind === "item"
      ? (items.find((item) => item.id === selection.id) ?? null)
      : null;

  return (
    <>
      <section className={`${cardClass} space-y-5`}>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            Mesa de regalos
          </h2>
          {giftMessage ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {giftMessage}
            </p>
          ) : null}
        </div>

        {giftQrUrl ? (
          <div className="space-y-2">
            <ZoomableImage
              src={giftQrUrl}
              alt={`Código QR de la mesa de regalos de ${eventTitle}`}
              optimizedWidth={600}
              sizes="224px"
              wrapperClassName="mx-auto aspect-square w-56 bg-white p-3"
              imageClassName="object-contain"
            />
            <p className="text-center text-xs text-slate-500">
              Toca el código para verlo más grande.
            </p>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Elige tu regalo
              </h3>
              <p className="text-xs text-slate-500">
                Toca «Comprar el regalo» y te mostramos cómo pagarlo y dónde
                adjuntar tu comprobante.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={optimizedImageUrl(item.imageUrl, 600)}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover"
                    />
                    {item.proofCount > 0 ? (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                        Ya lo apartó {item.proofCount}{" "}
                        {item.proofCount === 1 ? "persona" : "personas"}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </h4>
                    {item.description ? (
                      <p className="text-xs text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                    {item.priceCents !== null ? (
                      <p className="text-sm font-bold text-brand-700">
                        {formatPrice(item.priceCents, item.currency)}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className={`${primaryButtonClass} mt-auto w-full`}
                      onClick={() => setSelection({ kind: "item", id: item.id })}
                    >
                      Comprar el regalo
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {giftQrUrl ? (
          <div className="space-y-2 border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setSelection({ kind: "free" })}
            >
              Aportar un monto
            </button>
            <p className="text-xs text-slate-500">
              Escanea el QR y sube tu comprobante sin elegir un regalo.
            </p>
          </div>
        ) : null}
      </section>

      {selection ? (
        <GiftPurchaseModal
          item={openItem}
          eventId={eventId}
          giftQrUrl={giftQrUrl}
          giftMessage={giftMessage}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </>
  );
}
