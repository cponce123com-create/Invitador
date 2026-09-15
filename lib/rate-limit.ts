import { RSVP_RATE_LIMIT } from "@/lib/constants";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Marca de tiempo (ms) en la que se libera el cupo. */
  reset: number;
};

/**
 * Limitador de ventana deslizante en memoria.
 *
 * Suficiente para desarrollo o para una única instancia. En producción con
 * varias instancias de Render hay que configurar Upstash (ver
 * `checkRsvpRateLimit`), porque cada instancia tendría su propio contador.
 */
export class InMemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitResult {
    const current = this.now();
    const windowStart = current - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: timestamps[0] + this.windowMs,
      };
    }

    timestamps.push(current);
    this.hits.set(key, timestamps);

    // Limpieza oportunista para que el Map no crezca sin límite.
    if (this.hits.size > 5_000) {
      this.prune(windowStart);
    }

    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - timestamps.length,
      reset: timestamps[0] + this.windowMs,
    };
  }

  private prune(windowStart: number): void {
    for (const [key, timestamps] of this.hits) {
      const kept = timestamps.filter((t) => t > windowStart);
      if (kept.length > 0) {
        this.hits.set(key, kept);
      } else {
        this.hits.delete(key);
      }
    }
  }
}

export const rsvpLimiter = new InMemoryRateLimiter(
  RSVP_RATE_LIMIT.limit,
  RSVP_RATE_LIMIT.windowMs,
);

export const magicLinkLimiter = new InMemoryRateLimiter(5, 60_000);

type UpstashLimiter = {
  limit: (key: string) => Promise<RateLimitResult>;
};

let upstashLimiter: UpstashLimiter | null = null;
let upstashFailed = false;

async function getUpstashLimiter(): Promise<UpstashLimiter | null> {
  if (upstashLimiter) return upstashLimiter;
  if (upstashFailed) return null;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  try {
    // Import dinámico: si no se usa Upstash, el paquete no se carga nunca.
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RSVP_RATE_LIMIT.limit, "1 m"),
      prefix: "invitador:rsvp",
      analytics: false,
    });
    upstashLimiter = {
      limit: async (key) => {
        const { success, limit, remaining, reset } = await limiter.limit(key);
        return { success, limit, remaining, reset };
      },
    };
    return upstashLimiter;
  } catch (error) {
    console.error("[rate-limit] No se pudo inicializar Upstash; se usa el limitador en memoria.", error);
    upstashFailed = true;
    return null;
  }
}

/**
 * Rate limiting del endpoint público de RSVP.
 * Usa Upstash si está configurado; si no, cae al limitador en memoria.
 */
export async function checkRsvpRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter();
  if (limiter) {
    try {
      return await limiter.limit(identifier);
    } catch (error) {
      console.error("[rate-limit] Falló Upstash; se usa el limitador en memoria.", error);
    }
  }
  return rsvpLimiter.check(identifier);
}
