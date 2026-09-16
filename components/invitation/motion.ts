"use client";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * ¿El sistema pide reducir el movimiento?
 *
 * Se consulta fuera de React (y de forma síncrona) para poder cortar un bucle de
 * animación antes de arrancarlo, en lugar de montarlo y desmontarlo después.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}
