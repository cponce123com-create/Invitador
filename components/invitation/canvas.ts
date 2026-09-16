// Utilidades de dibujo en canvas compartidas por el fondo de partículas y las
// ráfagas de confeti. No dependen de React.

import type { Particle } from "@/lib/particles";

/**
 * Ajusta el bitmap del canvas al tamaño CSS y a la densidad de píxeles de la
 * pantalla, limitada por `maxPixelRatio` (el presupuesto lo decide
 * `lib/render-budget.ts`: 1.5 en móvil, 2 en el resto).
 * Devuelve el contexto ya escalado, o `null` si el canvas no es 2D.
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  maxPixelRatio = 2,
): CanvasRenderingContext2D | null {
  const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

/** Dibuja todas las partículas de un tirón. */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly Particle[],
): void {
  for (const particle of particles) {
    drawParticle(ctx, particle);
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  ctx.save();
  ctx.globalAlpha = particle.opacity;
  ctx.fillStyle = particle.color;
  ctx.strokeStyle = particle.color;
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);

  const size = particle.size;

  switch (particle.kind) {
    case "confetti": {
      // Rectángulo girando: el confeti clásico.
      const height = size * 0.6;
      ctx.fillRect(-size / 2, -height / 2, size, height);
      break;
    }
    case "petals": {
      // Pétalo: elipse achatada.
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.7, size * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bubbles": {
      // Burbuja: contorno translúcido con relleno tenue.
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = particle.opacity * 0.25;
      ctx.fill();
      break;
    }
    case "stars": {
      // Estrella de cuatro puntas.
      const tip = size;
      const waist = size * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -tip);
      ctx.quadraticCurveTo(waist, -waist, tip, 0);
      ctx.quadraticCurveTo(waist, waist, 0, tip);
      ctx.quadraticCurveTo(-waist, waist, -tip, 0);
      ctx.quadraticCurveTo(-waist, -waist, 0, -tip);
      ctx.fill();
      break;
    }
    case "sparkles": {
      // Destello: punto con un cruce luminoso.
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = particle.opacity * 0.5;
      ctx.fillRect(-size * 2, -size * 0.25, size * 4, size * 0.5);
      ctx.fillRect(-size * 0.25, -size * 2, size * 0.5, size * 4);
      break;
    }
  }

  ctx.restore();
}
