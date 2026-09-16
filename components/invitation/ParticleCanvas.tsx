"use client";

import { useEffect, useRef } from "react";
import {
  ambientParticleCount,
  createAmbientParticle,
  isOffscreen,
  recycleAmbientParticle,
  stepParticle,
  type Bounds,
  type Particle,
  type ParticleKind,
} from "@/lib/particles";
import { drawParticles, prepareCanvas } from "./canvas";
import { prefersReducedMotion } from "./motion";

export type ParticleCanvasProps = {
  /** Partícula temática del evento. */
  kind: ParticleKind;
  /** Colores de la paleta del tema. */
  palette: readonly string[];
  className?: string;
};

const DEFAULT_CLASSNAME = "pointer-events-none fixed inset-0 z-[20] h-full w-full";

/**
 * Capa de partículas ambientales a pantalla completa (confeti, pétalos,
 * burbujas, estrellas o destellos según el evento).
 *
 * - Se pausa cuando la pestaña no está visible y se reanuda al volver.
 * - No se monta ningún bucle si el sistema pide reducir el movimiento.
 */
export function ParticleCanvas({
  kind,
  palette,
  className = DEFAULT_CLASSNAME,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    let ctx: CanvasRenderingContext2D | null = null;
    let bounds: Bounds = { width: 0, height: 0 };
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      bounds = { width, height };
      ctx = prepareCanvas(canvas, width, height);

      const target = ambientParticleCount(width);
      while (particles.length < target) {
        particles.push(createAmbientParticle(kind, bounds, Math.random, palette));
      }
      particles.length = target;

      // Al cambiar de tamaño, reubica las que quedaron fuera del área.
      for (const particle of particles) {
        if (particle.x > width) particle.x = Math.random() * width;
        if (particle.y > height || particle.y < -particle.size) {
          particle.y = Math.random() * height;
        }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(frame);

      if (!ctx) return;
      ctx.clearRect(0, 0, bounds.width, bounds.height);

      for (const particle of particles) {
        stepParticle(particle, dt, bounds);
        if (isOffscreen(particle, bounds)) {
          recycleAmbientParticle(particle, bounds, Math.random, palette);
        }
      }

      drawParticles(ctx, particles);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    start();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [kind, palette]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
