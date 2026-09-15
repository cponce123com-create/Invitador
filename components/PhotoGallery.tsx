"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/ui";

type Photo = { id: string; url: string };

type Props = {
  photos: Photo[];
  title: string;
};

/** Carrusel simple basado en scroll-snap: nativo, fluido y sin dependencias. */
export function PhotoGallery({ photos, title }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(index, photos.length - 1));
      track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
      setActive(clamped);
    },
    [photos.length],
  );

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        >
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative aspect-[4/3] w-full shrink-0 snap-center"
            >
              <Image
                src={optimizedImageUrl(photo.url, 900)}
                alt={`${title} — foto ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => scrollToIndex(active - 1)}
              disabled={active === 0}
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow transition hover:bg-white disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => scrollToIndex(active + 1)}
              disabled={active === photos.length - 1}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow transition hover:bg-white disabled:opacity-40"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Ir a la foto ${index + 1}`}
              aria-current={index === active}
              onClick={() => scrollToIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === active ? "w-6 bg-brand-600" : "w-2 bg-slate-300 hover:bg-slate-400",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
