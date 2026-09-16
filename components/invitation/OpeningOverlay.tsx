"use client";

import { useEffect, useRef, useState } from "react";
import type { InvitationTheme } from "@/lib/invitation-theme";
import { cn } from "@/lib/ui";
import { useConfetti } from "./ConfettiProvider";
import { prefersReducedMotion } from "./motion";
import { useFullScreenLayer } from "./overlay-layer";

export type OpeningOverlayProps = {
  theme: InvitationTheme;
  /** Se llama cuando la cortina ya terminó de desvanecerse. */
  onOpen: () => void;
};

/** Duración del desvanecido, en milisegundos (debe acompañar a `duration-500`). */
const FADE_MS = 500;

/**
 * Cortina de apertura: cubre la invitación hasta que la persona la abre, con un
 * sello flotante, el saludo del evento y una ráfaga de confeti al pulsar.
 */
export function OpeningOverlay({ theme, onOpen }: OpeningOverlayProps) {
  const confetti = useConfetti();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [closing, setClosing] = useState(false);

  // Mientras la cortina está puesta, el fondo ambiental no tiene nada que pintar.
  useFullScreenLayer();

  useEffect(() => {
    buttonRef.current?.focus();

    // Refuerzo para el escritorio; en iOS Safari el scroll de fondo se bloquea
    // de verdad con `touch-none` en la raíz, no con `overflow: hidden`.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleOpen = () => {
    if (closing) return;
    setClosing(true);
    confetti.burst();
    window.setTimeout(onOpen, prefersReducedMotion() ? 0 : FADE_MS);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Abrir la invitación"
      className={cn(
        "fixed inset-0 z-[60] grid touch-none place-items-center overflow-hidden overscroll-contain px-6 text-center transition-opacity duration-500",
        closing ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Halo estático: un `blur` grande sobre esta área obligaba a recomponer el
          filtro en cada fotograma; el degradado radial da la misma presencia sin
          filtrar nada. */}
      <div
        aria-hidden
        className="absolute h-80 w-80 rounded-full opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Sin `backdrop-blur`: el sello flota y el filtro se recompondría en cada
            fotograma de la animación. */}
        <div className="grid h-24 w-24 animate-float place-items-center rounded-full border border-white/20 bg-white/10 text-5xl shadow-lg">
          <span aria-hidden>{theme.emoji}</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
            Tienes una invitación
          </p>
          <p className="max-w-xs text-lg font-semibold text-white/95">
            {theme.greeting}
          </p>
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          className="rounded-full bg-white px-7 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-105 hover:bg-white/90 active:scale-95"
        >
          Abrir invitación
        </button>
      </div>
    </div>
  );
}
