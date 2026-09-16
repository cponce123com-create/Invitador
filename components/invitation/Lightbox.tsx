"use client";

import Image from "next/image";
import { useEffect, useRef, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { optimizedImageUrl } from "@/lib/images";
import { visiblePhotoRange } from "@/lib/lightbox";
import { cn } from "@/lib/ui";
import { useFullScreenLayer } from "./overlay-layer";

type Photo = { id: string; url: string };

export type LightboxProps = {
  photos: Photo[];
  index: number;
  title: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/** Botón de navegación: 44 px de lado, el mínimo cómodo para el dedo. */
const navButtonClass =
  "grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl leading-none text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30";

/** Desplazamiento mínimo (px) para reconocer un swipe horizontal. */
const SWIPE_THRESHOLD = 44;

/**
 * Visor a pantalla completa del muro de fotos: navegación con swipe, flechas y
 * teclado (← → Esc), foco en el botón de cierre y bloqueo del scroll de fondo.
 *
 * Se monta en `document.body` mediante un portal: dentro del `Reveal` que
 * envuelve la tarjeta de fotos, el `transform` que deja su animación (que usa
 * `fill-mode: both`) convierte ese div en bloque contenedor y el `fixed` pasaría
 * a medir la tarjeta en vez de la pantalla; además quedaría por debajo de las
 * capas de partículas y confeti, que se pintan fuera del contenido (`z-10`).
 */
export function Lightbox({
  photos,
  index,
  title,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  // Mientras el visor tapa la invitación, el fondo ambiental se detiene.
  useFullScreenLayer();

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

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch
      ? { x: touch.clientX, y: touch.clientY }
      : null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Solo cuenta como swipe si el gesto es claramente horizontal: un toque con
    // temblor, o un intento de desplazamiento vertical, no cambian de foto.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;

    if (dx < 0 && hasNext) onIndexChange(index + 1);
    else if (dx > 0 && hasPrev) onIndexChange(index - 1);
  };

  if (!photo) return null;

  // La foto actual y sus vecinas se montan a la vez: al estar todas en el DOM
  // con la misma maquetación, el navegador elige la misma variante del `srcset`
  // y las descarga por adelantado, así que pasar de foto es una lectura de caché
  // y no una petición que arranca después del clic.
  const { start, end } = visiblePhotoRange(index, photos.length);
  const slides = photos.slice(start, end + 1);

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${title}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[80] flex touch-none flex-col overscroll-contain bg-slate-950/90 backdrop-blur-sm"
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

        {/* En móvil la caja usa la altura disponible (las fotos verticales
            aprovechan la pantalla); en escritorio recupera el 4:3. */}
        <div className="relative h-[70dvh] w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl sm:aspect-[4/3] sm:h-auto">
          {slides.map((slide, offset) => {
            const isActive = start + offset === index;
            return (
              <Image
                key={slide.id}
                src={optimizedImageUrl(slide.url, 1400)}
                alt={isActive ? `${title} — foto ${index + 1}` : ""}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                loading="eager"
                className={cn(
                  "object-contain transition-opacity duration-300",
                  isActive
                    ? "animate-pop-in opacity-100"
                    : "pointer-events-none opacity-0",
                )}
              />
            );
          })}
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

  // `document` no existe durante el renderizado en servidor, y el visor solo se
  // abre tras un toque del visitante, así que nunca llega a hidratarse.
  if (typeof document === "undefined") return null;

  return createPortal(overlay, document.body);
}
