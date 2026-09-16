"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

export type HeroCoverProps = {
  /** URL ya optimizada de la foto de portada. */
  src: string;
  /** La portada es la imagen principal: conviene precargarla. */
  priority?: boolean;
};

/** Cuánto se desplaza el fondo respecto al scroll (parallax suave). */
const PARALLAX_FACTOR = 0.18;
/** Tope del desplazamiento, en píxeles. */
const MAX_OFFSET = 48;
/** Margen extra para que el desplazamiento nunca deje ver el borde. */
const HEADROOM_SCALE = 1.12;

/**
 * Capa de fondo animada de la portada: zoom lento (Ken Burns) más un parallax
 * suave atado al scroll.
 *
 * El zoom se hace con una animación CSS (se neutraliza sola con
 * `prefers-reduced-motion`); el parallax se desactiva por completo en ese caso.
 */
export function HeroCover({ src, priority = false }: HeroCoverProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || prefersReducedMotion()) return;

    let raf = 0;

    const apply = () => {
      raf = 0;
      const offset = Math.min(window.scrollY * PARALLAX_FACTOR, MAX_OFFSET);
      layer.style.transform = `translate3d(0, ${offset}px, 0) scale(${HEADROOM_SCALE})`;
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={layerRef} className="absolute inset-0 will-change-transform">
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="animate-ken-burns object-cover opacity-75"
      />
    </div>
  );
}
