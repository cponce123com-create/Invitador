import { describe, expect, it } from "vitest";
import {
  PARTICLE_KINDS,
  ambientParticleCount,
  burstParticleCount,
  createAmbientParticle,
  createBurstParticle,
  isOffscreen,
  isParticleDead,
  recycleAmbientParticle,
  stepParticle,
  type Bounds,
  type Rng,
} from "@/lib/particles";

const BOUNDS: Bounds = { width: 400, height: 800 };
const PALETTE = ["#111111", "#222222", "#333333"];

/** LCG determinista: mismo resultado en cada corrida y sin dependencias. */
function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function expectFiniteNumbers(particle: Record<string, unknown>) {
  for (const value of Object.values(particle)) {
    if (typeof value === "number") {
      expect(Number.isFinite(value)).toBe(true);
    }
  }
}

describe("PARTICLE_KINDS", () => {
  it("incluye los cinco tipos temáticos", () => {
    expect([...PARTICLE_KINDS]).toEqual([
      "confetti",
      "petals",
      "bubbles",
      "stars",
      "sparkles",
    ]);
  });
});

describe("createAmbientParticle", () => {
  it("crea partículas ambientales dentro del área y con color de la paleta", () => {
    const rng = seededRng(1);
    for (const kind of PARTICLE_KINDS) {
      const particle = createAmbientParticle(kind, BOUNDS, rng, PALETTE);
      expect(particle.kind).toBe(kind);
      expect(particle.mode).toBe("ambient");
      expect(particle.x).toBeGreaterThanOrEqual(0);
      expect(particle.x).toBeLessThanOrEqual(BOUNDS.width);
      expect(particle.y).toBeGreaterThanOrEqual(0);
      expect(particle.y).toBeLessThanOrEqual(BOUNDS.height);
      expect(PALETTE).toContain(particle.color);
      expectFiniteNumbers(particle);
    }
  });

  it("usa un color de reserva si la paleta está vacía", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(2), []);
    expect(particle.color).toBe("#ffffff");
  });

  it("hace subir burbujas y bajar el confeti", () => {
    const rng = seededRng(3);
    const bubble = createAmbientParticle("bubbles", BOUNDS, rng, PALETTE);
    const confetti = createAmbientParticle("confetti", BOUNDS, rng, PALETTE);
    expect(bubble.vy).toBeLessThan(0);
    expect(confetti.vy).toBeGreaterThan(0);
  });
});

describe("stepParticle", () => {
  it("avanza la posición y mantiene números finitos", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(4), PALETTE);
    const startY = particle.y;
    stepParticle(particle, 1 / 60, BOUNDS);
    expect(particle.y).toBeGreaterThan(startY);
    expectFiniteNumbers(particle);
  });

  it("no produce NaN ni valores no finitos tras muchos pasos", () => {
    const rng = seededRng(5);
    const particles = PARTICLE_KINDS.map((kind) =>
      createAmbientParticle(kind, BOUNDS, rng, PALETTE),
    );
    for (let frame = 0; frame < 600; frame += 1) {
      for (const particle of particles) stepParticle(particle, 1 / 60, BOUNDS);
    }
    for (const particle of particles) expectFiniteNumbers(particle);
  });

  it("envuelve horizontalmente a la partícula que se sale por un lado", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(6), PALETTE);
    particle.x = BOUNDS.width + particle.size * 3;
    particle.vx = 0;
    particle.sway = 0;
    stepParticle(particle, 1 / 60, BOUNDS);
    expect(particle.x).toBeLessThan(0);
  });

  it("desvanece y agota la vida de una partícula de ráfaga", () => {
    const particle = createBurstParticle(
      "confetti",
      { x: 200, y: 400 },
      seededRng(7),
      PALETTE,
    );
    const startLife = particle.life;
    for (let frame = 0; frame < 200; frame += 1) stepParticle(particle, 1 / 60, BOUNDS);
    expect(particle.life).toBeLessThan(startLife);
    expect(particle.opacity).toBeGreaterThanOrEqual(0);
    expect(isParticleDead(particle)).toBe(true);
  });
});

describe("createBurstParticle", () => {
  it("sale hacia arriba en abanico desde el origen", () => {
    const particle = createBurstParticle(
      "confetti",
      { x: 123, y: 456 },
      seededRng(8),
      PALETTE,
    );
    expect(particle.mode).toBe("burst");
    expect(particle.x).toBe(123);
    expect(particle.y).toBe(456);
    expect(particle.vy).toBeLessThan(0);
    expect(particle.life).toBeGreaterThan(0);
    expectFiniteNumbers(particle);
  });

  it("no marca como muerta una partícula ambiental", () => {
    const particle = createAmbientParticle("stars", BOUNDS, seededRng(9), PALETTE);
    expect(isParticleDead(particle)).toBe(false);
  });
});

describe("isOffscreen", () => {
  it("detecta la partícula por debajo del área", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(10), PALETTE);
    particle.y = BOUNDS.height + particle.size * 10;
    expect(isOffscreen(particle, BOUNDS)).toBe(true);
  });

  it("no marca como fuera a una partícula dentro del área", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(11), PALETTE);
    particle.x = BOUNDS.width / 2;
    particle.y = BOUNDS.height / 2;
    expect(isOffscreen(particle, BOUNDS)).toBe(false);
  });
});

describe("recycleAmbientParticle", () => {
  it("reingresa la partícula que cae por arriba del área", () => {
    const particle = createAmbientParticle("confetti", BOUNDS, seededRng(12), PALETTE);
    particle.y = BOUNDS.height + 100;
    recycleAmbientParticle(particle, BOUNDS, seededRng(13), PALETTE);
    expect(particle.y).toBeLessThan(0);
    expect(particle.opacity).toBe(particle.baseOpacity);
  });

  it("reingresa las burbujas por abajo (flotan hacia arriba)", () => {
    const particle = createAmbientParticle("bubbles", BOUNDS, seededRng(14), PALETTE);
    particle.y = -100;
    recycleAmbientParticle(particle, BOUNDS, seededRng(15), PALETTE);
    expect(particle.y).toBeGreaterThan(BOUNDS.height);
  });
});

describe("densidad de partículas", () => {
  it("mantiene más partículas cuanto más ancha es la pantalla", () => {
    expect(ambientParticleCount(360)).toBeLessThan(ambientParticleCount(800));
    expect(ambientParticleCount(800)).toBeLessThan(ambientParticleCount(1440));
    expect(burstParticleCount(360)).toBeLessThan(burstParticleCount(800));
    expect(burstParticleCount(800)).toBeLessThan(burstParticleCount(1440));
  });

  it("devuelve cantidades positivas", () => {
    expect(ambientParticleCount(0)).toBeGreaterThan(0);
    expect(burstParticleCount(0)).toBeGreaterThan(0);
  });
});
