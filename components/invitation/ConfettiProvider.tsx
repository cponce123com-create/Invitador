"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  burstParticleCount,
  createBurstParticle,
  isOffscreen,
  isParticleDead,
  stepParticle,
  type Bounds,
  type Origin,
  type Particle,
  type ParticleKind,
} from "@/lib/particles";
import { drawParticles, prepareCanvas } from "./canvas";
import { prefersReducedMotion } from "./motion";

export type ConfettiApi = {
  /** Lanza una ráfaga temática. Sin origen, sale desde el centro-bajo de la pantalla. */
  burst: (origin?: Origin) => void;
  /** Lanza la ráfaga desde el centro del elemento dado (por ejemplo, la tarjeta de éxito). */
  burstFrom: (element: HTMLElement | null) => void;
};

/** Sin proveedor, las ráfagas no hacen nada: los consumidores no necesitan comprobaciones. */
const NOOP_CONFETTI: ConfettiApi = { burst: () => {}, burstFrom: () => {} };

const ConfettiContext = createContext<ConfettiApi>(NOOP_CONFETTI);

export function useConfetti(): ConfettiApi {
  return useContext(ConfettiContext);
}

export type ConfettiProviderProps = {
  kind: ParticleKind;
  palette: readonly string[];
  children: ReactNode;
};

/**
 * Provee el lanzamiento de confeti bajo demanda y mantiene su propio canvas
 * superpuesto. El bucle de dibujo solo corre mientras haya partículas vivas.
 */
export function ConfettiProvider({
  kind,
  palette,
  children,
}: ConfettiProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstRef = useRef<ConfettiApi["burst"]>(() => {});
  const configRef = useRef({ kind, palette });

  useEffect(() => {
    configRef.current = { kind, palette };
  }, [kind, palette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    let bounds: Bounds = { width: 0, height: 0 };
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;

    const measure = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      bounds = { width, height };
      ctx = prepareCanvas(canvas, width, height);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      ctx?.clearRect(0, 0, bounds.width, bounds.height);

      const alive: Particle[] = [];
      for (const particle of particles) {
        stepParticle(particle, dt, bounds);
        if (!isParticleDead(particle) && !isOffscreen(particle, bounds)) {
          alive.push(particle);
        }
      }
      particles = alive;

      if (ctx) drawParticles(ctx, alive);

      if (alive.length > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
        ctx?.clearRect(0, 0, bounds.width, bounds.height);
      }
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    measure();

    burstRef.current = (origin) => {
      if (prefersReducedMotion()) return;

      const { kind: currentKind, palette: currentPalette } = configRef.current;
      const source = origin ?? {
        x: bounds.width / 2,
        y: bounds.height * 0.65,
      };
      const count = burstParticleCount(bounds.width);

      for (let index = 0; index < count; index += 1) {
        particles.push(
          createBurstParticle(currentKind, source, Math.random, currentPalette),
        );
      }

      start();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (particles.length > 0) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      burstRef.current = () => {};
      particles = [];
    };
  }, []);

  const api = useMemo<ConfettiApi>(
    () => ({
      burst: (origin) => burstRef.current(origin),
      burstFrom: (element) => {
        const rect = element?.getBoundingClientRect();
        if (!rect) {
          burstRef.current();
          return;
        }
        burstRef.current({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      },
    }),
    [],
  );

  return (
    <ConfettiContext.Provider value={api}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
      />
    </ConfettiContext.Provider>
  );
}
