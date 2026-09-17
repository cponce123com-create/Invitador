"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { optimizedImageUrl } from "@/lib/images";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import { GiftPurchaseModal } from "./GiftPurchaseModal";

/** Un regalo del catálogo tal como lo pinta la invitación pública. */
export type GiftCatalogItem = {
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
  items: GiftCatalogItem[];
  eventId: string;
  giftQrUrl: string | null;
  giftMessage: string | null;
};

/**
 * Catálogo de regalos de la invitación.
 *
 * No es un carrito: cada artículo se resuelve solo. Al pulsar «Comprar el
 * regalo» se abre `GiftPurchaseModal` con el QR del anfitrión y el formulario
 * del comprobante, así que no hay pasarela de pago ni estado que mantener.
 */
export function GiftCatalog({
  items,
  eventId,
  giftQrUrl,
  giftMessage,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = items.find((item) => item.id === openId) ?? null;

  return (
    <>
      <section className={`${cardClass} space-y-4`}>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Elige tu regalo</h2>
          <p className="text-sm text-slate-500">
            Toca «Comprar el regalo» y te mostramos cómo pagarlo y dónde adjuntar
            tu comprobante.
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
                <h3 className="text-sm font-semibold text-slate-900">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="text-xs text-slate-600">{item.description}</p>
                ) : null}
                {item.priceCents !== null ? (
                  <p className="text-sm font-bold text-brand-700">
                    {formatPrice(item.priceCents, item.currency)}
                  </p>
                ) : null}
                <button
                  type="button"
                  className={`${primaryButtonClass} mt-auto w-full`}
                  onClick={() => setOpenId(item.id)}
                >
                  Comprar el regalo
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {openItem ? (
        <GiftPurchaseModal
          item={openItem}
          eventId={eventId}
          giftQrUrl={giftQrUrl}
          giftMessage={giftMessage}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </>
  );
}
