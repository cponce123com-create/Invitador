"use client";

import Image from "next/image";
import { useState } from "react";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/ui";
import { Lightbox } from "./LazyLightbox";
import { Reveal } from "./Reveal";

type Photo = { id: string; url: string };

export type PhotoWallProps = {
  photos: Photo[];
  title: string;
};

/** Inclinaciones alternas: le dan el aire de polaroid pegada a mano. */
const ROTATIONS = [-2.6, 1.8, -1.4, 2.4, -2, 1.2];
/** A partir de aquí se deja de flotar: demasiadas animaciones a la vez en móvil. */
const FLOAT_LIMIT = 6;
/** Tope del escalonado de entrada: con muchas fotos, la última no debe esperar. */
const MAX_STAGGER_STEPS = 5;

/**
 * Muro de polaroids: se adapta a cualquier cantidad de fotos con columnas CSS,
 * cada una entra al hacer scroll con un pequeño retardo y se amplía al pulsarla.
 */
export function PhotoWall({ photos, title }: PhotoWallProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const shouldFloat = photos.length <= FLOAT_LIMIT;

  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3">
        {photos.map((photo, index) => (
          <Reveal
            key={photo.id}
            delay={Math.min(index, MAX_STAGGER_STEPS) * 70}
            className="mb-4 break-inside-avoid"
          >
            <div
              style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]}deg)` }}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
                className={cn("group block w-full", shouldFloat && "animate-float")}
                style={shouldFloat ? { animationDelay: `${index * 350}ms` } : undefined}
              >
                <span className="polaroid block">
                  <span className="relative block aspect-[4/5] w-full overflow-hidden bg-slate-100">
                    <Image
                      src={optimizedImageUrl(photo.url, 600)}
                      alt={`${title} — foto ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 45vw, 30vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </span>
                </span>
              </button>
            </div>
          </Reveal>
        ))}
      </div>

      {activeIndex === null ? null : (
        <Lightbox
          photos={photos}
          index={activeIndex}
          title={title}
          onClose={() => setActiveIndex(null)}
          onIndexChange={setActiveIndex}
        />
      )}
    </>
  );
}
