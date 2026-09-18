"use client";

import { useEffect, useRef } from "react";
import {
  createAmbientParticle,
  isOffscreen,
  recycleAmbientParticle,
  stepParticle,
  type Bounds,
  type Particle,
  type ParticleKind,
} from "@/lib/particles";
import {
  ambientFrameInterval,
  ambientParticleCount,
  maxCanvasPixelRatio,
} from "@/lib/render-budget";
import { drawParticles, prepareCanvas } from "./canvas";
import { prefersReducedMotion } from "./motion";
import { useFullScreenLayerCount } from "./overlay-layer";

export type ParticleCanvasProps = {
  /** Partícula temática del evento. */
  kind: ParticleKind;
  /** Colores de la paleta del tema. */
  palette: readonly string[];
  className?: string;
};

const DEFAULT_CLASSNAME = "pointer-events-none fixed inset-0 z-[20] h-full w-full";

/**
 * Tolerancia sobre el intervalo entre fotogramas: `requestAnimationFrame` no cae
 * exactamente en los múltiplos esperados y sin este margen se perderían frames.
 */
const FRAME_TOLERANCE = 0.9;

/**
 * Cambio mínimo de altura (px) que obliga a reasignar el bitmap del canvas. La
 * barra de URL de iOS cambia la altura en unas decenas de píxeles al hacer
 * scroll; reasignar el bitmap por eso cuesta memoria y provoca parpadeos.
 */
const BITMAP_HEIGHT_EPSILON = 64;

type Controls = {
  /** Detiene el bucle conservando el campo de partículas. */
  pause: () => void;
  /** Reanuda el bucle donde se quedó. */
  resume: () => void;
};

/**
 * Capa de partículas ambientales a pantalla completa (confeti, pétalos,
 * burbujas, estrellas o destellos según el evento).
 *
 * - Se detiene cuando la pestaña no está visible y cuando una capa opaca la tapa.
 * - Ajusta su gasto al ancho de pantalla (densidad, DPR y ritmo de fotogramas).
 * - No se monta ningún bucle si el sistema pide reducir el movimiento.
 */
export function ParticleCanvas({
  kind,
  palette,
  className = DEFAULT_CLASSNAME,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullScreenLayers = useFullScreenLayerCount();
  const pausedRef = useRef(false);
  const controlsRef = useRef<Controls | null>(null);

  // Se declara antes del efecto del motor para que, al montar, el bucle ya sepa
  // si hay una capa opaca encima (la cortina o el visor de fotos).
  useEffect(() => {
    pausedRef.current = fullScreenLayers > 0;
    if (pausedRef.current) controlsRef.current?.pause();
    else controlsRef.current?.resume();
  }, [fullScreenLayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    let ctx: CanvasRenderingContext2D | null = null;
    let bounds: Bounds = { width: 0, height: 0 };
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;
    let interval = ambientFrameInterval(0);
    /** Tamaño con el que se asignó el bitmap (no el CSS actual). */
    let bitmapWidth = 0;
    let bitmapHeight = 0;

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      bounds = { width, height };
      interval = ambientFrameInterval(width);

      // Solo se reasigna el bitmap si cambia el ancho o si la altura cambia de
      // verdad; los vaivenes de la barra de URL de iOS no lo merecen.
      const staleBitmap =
        !ctx ||
        width !== bitmapWidth ||
        Math.abs(height - bitmapHeight) >= BITMAP_HEIGHT_EPSILON;

      if (staleBitmap) {
        bitmapWidth = width;
        bitmapHeight = height;
        ctx = prepareCanvas(canvas, width, height, maxCanvasPixelRatio(width));
      }

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
      raf = requestAnimationFrame(frame);
      if (now - last < interval * FRAME_TOLERANCE) return;

      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

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

    controlsRef.current = {
      pause: stop,
      resume: () => {
        if (!document.hidden) start();
      },
    };

    resize();

    // El primer arranque se difiere dos fotogramas: así el hilo principal
    // atiende primero el render inicial (y el LCP) y solo después empieza a
    // animar. Con movimiento reducido el efecto ya retornó antes.
    let startRaf = 0;
    if (!pausedRef.current) {
      startRaf = requestAnimationFrame(() => {
        startRaf = requestAnimationFrame(start);
      });
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (!pausedRef.current) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(startRaf);
      stop();
      controlsRef.current = null;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [kind, palette]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
