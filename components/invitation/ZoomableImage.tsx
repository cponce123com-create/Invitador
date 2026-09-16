"use client";

import Image from "next/image";
import { useState } from "react";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/ui";
import { Lightbox } from "./Lightbox";

/** El visor de una sola foto no navega: no hay índice al que saltar. */
const noop = () => {};

/** Recuadro por defecto: ancho completo con proporción 4:3 (foto del lugar). */
const defaultWrapperClass = "w-full aspect-[4/3] bg-slate-100";

/** Aspecto por defecto de la imagen ampliable: cubre el recuadro con un zoom suave. */
const defaultImageClass = "object-cover transition duration-500 group-hover:scale-[1.03]";

type Props = {
  src: string;
  /** Texto alternativo de la imagen y título del visor. */
  alt: string;
  /** Ancho de la variante optimizada que se muestra en la tarjeta. */
  optimizedWidth?: number;
  sizes?: string;
  /** Clases del recuadro. Por defecto: ancho completo, proporción 4:3. */
  wrapperClassName?: string;
  /** Clases de la imagen. Por defecto: `object-cover` con zoom al pasar el dedo. */
  imageClassName?: string;
};

/**
 * Imagen que se amplía a pantalla completa con el visor de la invitación.
 *
 * Se usa con una sola foto: las flechas y el swipe quedan deshabilitados solos,
 * y `useFullScreenLayer` degrada a no-op cuando no hay `FullScreenLayerProvider`
 * (el caso de la tarjeta del lugar, que se renderiza fuera de `InvitationShell`).
 */
export function ZoomableImage({
  src,
  alt,
  optimizedWidth = 1200,
  sizes = "(max-width: 768px) 100vw, 768px",
  wrapperClassName,
  imageClassName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Ampliar: ${alt}`}
        className={cn(
          "group relative block overflow-hidden rounded-2xl border border-slate-200",
          wrapperClassName ?? defaultWrapperClass,
        )}
      >
        <Image
          src={optimizedImageUrl(src, optimizedWidth)}
          alt={alt}
          fill
          sizes={sizes}
          className={imageClassName ?? defaultImageClass}
        />
        <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          Ampliar
        </span>
      </button>

      {isOpen ? (
        <Lightbox
          photos={[{ id: "unica", url: src }]}
          index={0}
          title={alt}
          onClose={() => setIsOpen(false)}
          onIndexChange={noop}
        />
      ) : null}
    </>
  );
}
