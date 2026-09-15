import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "@/lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  it("permite hasta el límite y luego bloquea", () => {
    let now = 0;
    const limiter = new InMemoryRateLimiter(2, 1000, () => now);

    expect(limiter.check("ip").success).toBe(true);
    expect(limiter.check("ip").success).toBe(true);

    const blocked = limiter.check("ip");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("libera cupo al pasar la ventana", () => {
    let now = 0;
    const limiter = new InMemoryRateLimiter(1, 1000, () => now);

    expect(limiter.check("ip").success).toBe(true);
    expect(limiter.check("ip").success).toBe(false);

    now = 1500;
    expect(limiter.check("ip").success).toBe(true);
  });

  it("aísla el conteo por clave", () => {
    let now = 0;
    const limiter = new InMemoryRateLimiter(1, 1000, () => now);

    expect(limiter.check("a").success).toBe(true);
    expect(limiter.check("b").success).toBe(true);
  });
});
