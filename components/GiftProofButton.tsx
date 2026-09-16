"use client";

import { useState } from "react";
import { Lightbox } from "@/components/invitation/Lightbox";
import type { GiftProofSummary } from "@/lib/gift-proofs";
import { cn, ghostButtonClass } from "@/lib/ui";

type Props = {
  proof: GiftProofSummary;
  /** Texto que describe el visor (por ejemplo, el nombre del invitado). */
  title: string;
  className?: string;
};

/**
 * «Ver comprobante» de la tabla de confirmaciones: abre el mismo visor de la
 * invitación con la captura que subió ese invitado.
 */
export function GiftProofButton({ proof, title, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(ghostButtonClass, className)}
        onClick={() => setOpen(true)}
      >
        Ver comprobante
      </button>

      {open ? (
        <Lightbox
          photos={[{ id: proof.id, url: proof.url }]}
          index={0}
          title={title}
          onClose={() => setOpen(false)}
          onIndexChange={() => {}}
        />
      ) : null}
    </>
  );
}
