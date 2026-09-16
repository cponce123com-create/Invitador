"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";
import { prefersReducedMotion } from "./motion";

export type RevealProps = {
  children: ReactNode;
  /** Retardo de la animación, para escalonar secciones hermanas. */
  delay?: number;
  className?: string;
};

/**
 * Revela su contenido con un desplazamiento ascendente la primera vez que entra
 * en pantalla.
 *
 * El HTML del servidor sale visible: solo si hay JavaScript y el bloque aún no
 * está en pantalla se oculta para animarlo. Así el contenido nunca queda
 * invisible si algo falla.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    const rect = node.getBoundingClientRect();
    const alreadyVisible =
      rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (alreadyVisible) return;

    setHidden(true);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(shown ? "animate-reveal-up" : hidden && "opacity-0", className)}
      style={shown && delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
