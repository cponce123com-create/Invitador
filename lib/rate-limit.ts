import {
  GIFT_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  RSVP_RATE_LIMIT,
  SETUP_RATE_LIMIT,
  UPLOAD_RATE_LIMIT,
} from "@/lib/constants";

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
 * `checkRateLimit`), porque cada instancia tendría su propio contador.
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

/** Comprobantes de regalo por IP (subida pública desde la invitación). */
export const giftProofLimiter = new InMemoryRateLimiter(
  GIFT_RATE_LIMIT.limit,
  GIFT_RATE_LIMIT.windowMs,
);

/** Intentos de login por IP + email. Se consulta desde `lib/auth.ts`. */
export const loginLimiter = new InMemoryRateLimiter(
  LOGIN_RATE_LIMIT.limit,
  LOGIN_RATE_LIMIT.windowMs,
);

/** Instalación inicial (`/api/setup`) por IP. */
export const setupLimiter = new InMemoryRateLimiter(
  SETUP_RATE_LIMIT.limit,
  SETUP_RATE_LIMIT.windowMs,
);

/** Firmas de subida por anfitrión. */
export const uploadLimiter = new InMemoryRateLimiter(
  UPLOAD_RATE_LIMIT.limit,
  UPLOAD_RATE_LIMIT.windowMs,
);

type UpstashLimiter = {
  limit: (key: string) => Promise<RateLimitResult>;
};

/** Ventana de Upstash: `1 m`, `10 m`, `1 h`… */
type UpstashWindow = `${number} ${"s" | "m" | "h" | "d"}`;

/** Política de una cuota: límite, ventana y prefijo de las claves en Redis. */
type UpstashPolicy = {
  limit: number;
  window: UpstashWindow;
  prefix: string;
};

const RSVP_POLICY: UpstashPolicy = {
  limit: RSVP_RATE_LIMIT.limit,
  window: "1 m",
  prefix: "invitador:rsvp",
};

const GIFT_POLICY: UpstashPolicy = {
  limit: GIFT_RATE_LIMIT.limit,
  window: "10 m",
  prefix: "invitador:regalos",
};

const LOGIN_POLICY: UpstashPolicy = {
  limit: LOGIN_RATE_LIMIT.limit,
  window: "1 m",
  prefix: "invitador:login",
};

const SETUP_POLICY: UpstashPolicy = {
  limit: SETUP_RATE_LIMIT.limit,
  window: "10 m",
  prefix: "invitador:setup",
};

const UPLOAD_POLICY: UpstashPolicy = {
  limit: UPLOAD_RATE_LIMIT.limit,
  window: "10 m",
  prefix: "invitador:subidas",
};

// Un limitador por prefijo: cada política tiene su propia cuota en Redis.
const upstashLimiters = new Map<string, UpstashLimiter>();
let upstashFailed = false;

async function getUpstashLimiter(
  policy: UpstashPolicy,
): Promise<UpstashLimiter | null> {
  const cached = upstashLimiters.get(policy.prefix);
  if (cached) return cached;
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
      limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
      prefix: policy.prefix,
      analytics: false,
    });
    const wrapped: UpstashLimiter = {
      limit: async (key) => {
        const { success, limit, remaining, reset } = await limiter.limit(key);
        return { success, limit, remaining, reset };
      },
    };
    upstashLimiters.set(policy.prefix, wrapped);
    return wrapped;
  } catch (error) {
    console.error("[rate-limit] No se pudo inicializar Upstash; se usa el limitador en memoria.", error);
    upstashFailed = true;
    return null;
  }
}

/** Consulta Upstash (si está configurado) y cae al limitador en memoria. */
async function checkRateLimit(
  policy: UpstashPolicy,
  fallback: InMemoryRateLimiter,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter(policy);
  if (limiter) {
    try {
      return await limiter.limit(identifier);
    } catch (error) {
      console.error("[rate-limit] Falló Upstash; se usa el limitador en memoria.", error);
    }
  }
  return fallback.check(identifier);
}

/**
 * Rate limiting del endpoint público de RSVP.
 * Usa Upstash si está configurado; si no, cae al limitador en memoria.
 */
export function checkRsvpRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(RSVP_POLICY, rsvpLimiter, identifier);
}

/**
 * Rate limiting de la subida pública de comprobantes de regalo (tanto la firma
 * como el guardado). Mismo mecanismo que el RSVP, con su propia cuota.
 */
export function checkGiftRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(GIFT_POLICY, giftProofLimiter, identifier);
}

/**
 * Rate limiting del login (por IP + email). Antes solo se contaba en memoria y
 * por email, así que varias instancias multiplicaban el cupo y un atacante
 * podía bloquear a un usuario conocido.
 */
export function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(LOGIN_POLICY, loginLimiter, identifier);
}

/** Rate limiting de la instalación inicial (`/api/setup`, por IP). */
export function checkSetupRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(SETUP_POLICY, setupLimiter, identifier);
}

/** Rate limiting de las firmas de subida (por anfitrión). */
export function checkUploadRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(UPLOAD_POLICY, uploadLimiter, identifier);
}
