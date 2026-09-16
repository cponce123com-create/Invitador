// Modelo de partículas del motor de animación de la invitación.
//
// Este módulo es "puro": no toca el DOM ni el canvas, no importa Prisma ni el SDK
// de Cloudinary. Solo describe el estado de una partícula y cómo evoluciona con
// el tiempo. El componente `ParticleCanvas` se encarga de dibujarlas; aquí vive
// la física y la aleatoriedad, que se inyecta (`Rng`) para poder testear con un
// generador determinista.

/** Tipos de partícula temática. Cada uno cambia forma, dirección y física. */
export const PARTICLE_KINDS = [
  "confetti",
  "petals",
  "bubbles",
  "stars",
  "sparkles",
] as const;

export type ParticleKind = (typeof PARTICLE_KINDS)[number];

export function isParticleKind(value: unknown): value is ParticleKind {
  return (
    typeof value === "string" &&
    (PARTICLE_KINDS as readonly string[]).includes(value)
  );
}

/** Generador de números en [0, 1). Se inyecta para que los tests sean deterministas. */
export type Rng = () => number;

/** Área de dibujo en píxeles CSS (el canvas escala por `devicePixelRatio` aparte). */
export type Bounds = { width: number; height: number };

/** Punto de origen de una ráfaga (celebración puntual). */
export type Origin = { x: number; y: number };

/**
 * `ambient` = partícula continua que cae/sube y se recicla al salir del área.
 * `burst`   = partícula de una celebración puntual que muere al acabarse su vida.
 */
export type ParticleMode = "ambient" | "burst";

export type Particle = {
  kind: ParticleKind;
  mode: ParticleMode;
  x: number;
  y: number;
  /** Velocidad base en px/s (antes de la oscilación lateral). */
  vx: number;
  vy: number;
  /** Tamaño en px (radio o medio lado, según la forma). */
  size: number;
  /** Rotación actual en radianes. */
  rotation: number;
  /** Velocidad de giro en rad/s. */
  spin: number;
  color: string;
  /** Opacidad actual (en `burst` decae con la vida). */
  opacity: number;
  /** Opacidad de reposo; `opacity` vuelve a este valor al reciclarse. */
  baseOpacity: number;
  /** Fase de la oscilación lateral. */
  phase: number;
  /** Amplitud de la oscilación lateral en px/s. */
  sway: number;
  /** Velocidad de la oscilación lateral en rad/s. */
  swaySpeed: number;
  /** Segundos de vida restantes (solo `burst`). */
  life: number;
  /** Vida total (solo `burst`); se usa para el desvanecido final. */
  maxLife: number;
};

/** Aceleración vertical por tipo (px/s²). Negativa = flota hacia arriba. */
const GRAVITY: Record<ParticleKind, number> = {
  confetti: 70,
  petals: 32,
  stars: 22,
  bubbles: -26,
  sparkles: -16,
};

type KindProfile = {
  size: [number, number];
  vy: [number, number];
  sway: [number, number];
  swaySpeed: [number, number];
  spin: [number, number];
  opacity: number;
};

const PROFILES: Record<ParticleKind, KindProfile> = {
  confetti: { size: [5, 9], vy: [40, 110], sway: [20, 60], swaySpeed: [1.2, 2.6], spin: [-3.2, 3.2], opacity: 1 },
  petals: { size: [8, 14], vy: [24, 60], sway: [30, 70], swaySpeed: [0.8, 1.8], spin: [-1.2, 1.2], opacity: 0.9 },
  stars: { size: [4, 8], vy: [14, 40], sway: [10, 30], swaySpeed: [0.6, 1.6], spin: [-0.6, 0.6], opacity: 0.9 },
  bubbles: { size: [6, 16], vy: [22, 52], sway: [15, 40], swaySpeed: [0.8, 1.8], spin: [0, 0], opacity: 0.35 },
  sparkles: { size: [2, 4], vy: [10, 30], sway: [10, 25], swaySpeed: [1, 2.4], spin: [0, 0], opacity: 0.8 },
};

function lerp([min, max]: [number, number], t: number): number {
  return min + (max - min) * t;
}

function pickColor(palette: readonly string[], rng: Rng, fallback = "#ffffff"): string {
  if (palette.length === 0) return fallback;
  const index = Math.min(palette.length - 1, Math.floor(rng() * palette.length));
  return palette[index] ?? fallback;
}

/** Campos comunes a cualquier partícula, derivados del perfil de su tipo. */
function baseParticle(kind: ParticleKind, palette: readonly string[], rng: Rng): Particle {
  const profile = PROFILES[kind];
  const rising = GRAVITY[kind] < 0;
  const speed = lerp(profile.vy, rng());
  return {
    kind,
    mode: "ambient",
    x: 0,
    y: 0,
    vx: (rng() - 0.5) * 30,
    vy: rising ? -speed : speed,
    size: lerp(profile.size, rng()),
    rotation: rng() * Math.PI * 2,
    spin: lerp(profile.spin, rng()),
    color: pickColor(palette, rng),
    opacity: profile.opacity,
    baseOpacity: profile.opacity,
    phase: rng() * Math.PI * 2,
    sway: lerp(profile.sway, rng()),
    swaySpeed: lerp(profile.swaySpeed, rng()),
    life: 0,
    maxLife: 0,
  };
}

/**
 * Partícula ambiental: se reparte por toda el área para que la escena no arranque
 * vacía y cae/sube según su tipo.
 */
export function createAmbientParticle(
  kind: ParticleKind,
  bounds: Bounds,
  rng: Rng,
  palette: readonly string[],
): Particle {
  const particle = baseParticle(kind, palette, rng);
  particle.mode = "ambient";
  particle.x = rng() * Math.max(1, bounds.width);
  particle.y = rng() * Math.max(1, bounds.height);
  return particle;
}

/**
 * Partícula de ráfaga: sale disparada desde un origen hacia arriba y en abanico,
 * y muere al acabarse su vida (con desvanecido).
 */
export function createBurstParticle(
  kind: ParticleKind,
  origin: Origin,
  rng: Rng,
  palette: readonly string[],
): Particle {
  const particle = baseParticle(kind, palette, rng);
  particle.mode = "burst";
  particle.x = origin.x;
  particle.y = origin.y;
  // Abanico mayormente hacia arriba: el ángulo base es -90° (±54°).
  const angle = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 0.6;
  const speed = 160 + rng() * 320;
  particle.vx = Math.cos(angle) * speed;
  particle.vy = Math.sin(angle) * speed;
  particle.maxLife = 1.2 + rng() * 1.2;
  particle.life = particle.maxLife;
  return particle;
}

/**
 * Avanza una partícula `dt` segundos. Muta y devuelve la misma instancia: el
 * bucle de dibujo a 60 fps no debe generar basura.
 */
export function stepParticle(particle: Particle, dt: number, bounds: Bounds): Particle {
  particle.vy += GRAVITY[particle.kind] * dt;
  particle.phase += particle.swaySpeed * dt;
  particle.x += (particle.vx + Math.cos(particle.phase) * particle.sway) * dt;
  particle.y += particle.vy * dt;
  particle.rotation += particle.spin * dt;

  if (particle.mode === "burst") {
    particle.life -= dt;
    const ratio = particle.maxLife > 0 ? particle.life / particle.maxLife : 0;
    particle.opacity = Math.max(0, Math.min(particle.baseOpacity, ratio * particle.baseOpacity));
  }

  // Se envuelve horizontalmente para que no se acumulen a un lado.
  const margin = particle.size;
  if (particle.x < -margin) {
    particle.x = bounds.width + margin;
  } else if (particle.x > bounds.width + margin) {
    particle.x = -margin;
  }

  return particle;
}

/** ¿La partícula salió del área de dibujo (con margen para su tamaño)? */
export function isOffscreen(particle: Particle, bounds: Bounds): boolean {
  const margin = particle.size * 2;
  return (
    particle.y > bounds.height + margin ||
    particle.y < -margin ||
    particle.x < -margin ||
    particle.x > bounds.width + margin
  );
}

/** ¿La partícula de ráfaga ya agotó su vida? */
export function isParticleDead(particle: Particle): boolean {
  return particle.mode === "burst" && particle.life <= 0;
}

/** Devuelve una partícula ambiental fuera del área al punto de entrada contrario. */
export function recycleAmbientParticle(
  particle: Particle,
  bounds: Bounds,
  rng: Rng,
  palette: readonly string[],
): Particle {
  const profile = PROFILES[particle.kind];
  const rising = GRAVITY[particle.kind] < 0;
  const speed = lerp(profile.vy, rng());

  particle.x = rng() * Math.max(1, bounds.width);
  particle.y = rising ? bounds.height + particle.size : -particle.size;
  particle.vx = (rng() - 0.5) * 30;
  particle.vy = rising ? -speed : speed;
  particle.rotation = rng() * Math.PI * 2;
  particle.phase = rng() * Math.PI * 2;
  particle.sway = lerp(profile.sway, rng());
  particle.swaySpeed = lerp(profile.swaySpeed, rng());
  particle.color = pickColor(palette, rng, particle.color);
  particle.opacity = particle.baseOpacity;
  return particle;
}
