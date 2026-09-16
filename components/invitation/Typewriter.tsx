"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui";
import { prefersReducedMotion } from "./motion";

export type TypewriterProps = {
  text: string;
  /** Milisegundos entre caracteres. */
  speed?: number;
  /** Retardo inicial en milisegundos. */
  startDelay?: number;
  className?: string;
};

/**
 * Escribe el texto carácter a carácter con un cursor parpadeante.
 *
 * El texto completo se renderiza aparte para lectores de pantalla, así que la
 * animación no interfiere con la accesibilidad ni repite el contenido.
 */
export function Typewriter({
  text,
  speed = 45,
  startDelay = 350,
  className,
}: TypewriterProps) {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisibleChars(text.length);
      return;
    }

    setVisibleChars(0);
    let typed = 0;
    let timer = 0;

    const tick = () => {
      typed += 1;
      setVisibleChars(typed);
      if (typed < text.length) {
        timer = window.setTimeout(tick, speed);
      }
    };

    timer = window.setTimeout(tick, startDelay);
    return () => window.clearTimeout(timer);
  }, [text, speed, startDelay]);

  return (
    <p className={cn("min-h-[1.5em]", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, visibleChars)}
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-blink bg-current align-baseline" />
      </span>
    </p>
  );
}
