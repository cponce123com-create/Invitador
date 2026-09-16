"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/ui";

type Photo = { id: string; url: string };

export type LightboxProps = {
  photos: Photo[];
  index: number;
  title: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const navButtonClass =
  "grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30";

/**
 * Visor a pantalla completa del muro de fotos: navegación con flechas y teclado
 * (← → Esc), foco en el botón de cierre y bloqueo del scroll de fondo.
 */
export function Lightbox({
  photos,
  index,
  title,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && index > 0) {
        onIndexChange(index - 1);
      } else if (event.key === "ArrowRight" && index < photos.length - 1) {
        onIndexChange(index + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, photos.length, onClose, onIndexChange]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${title}`}
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950/90 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white/70">
          {index + 1} / {photos.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className={navButtonClass}
        >
          ×
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        {/* Capa de fondo: al pulsarla se cierra el visor. */}
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute inset-0 cursor-zoom-out"
        />

        <div className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
          <Image
            src={optimizedImageUrl(photo.url, 1400)}
            alt={`${title} — foto ${index + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="animate-pop-in object-contain"
          />
        </div>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              disabled={!hasPrev}
              onClick={() => onIndexChange(index - 1)}
              className={cn(navButtonClass, "absolute left-3 top-1/2 -translate-y-1/2")}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              disabled={!hasNext}
              onClick={() => onIndexChange(index + 1)}
              className={cn(navButtonClass, "absolute right-3 top-1/2 -translate-y-1/2")}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
