// Pruebas del alta del primer super admin con Prisma y el rate limiter simulados.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, rateLimitMock } = vi.hoisted(() => {
  const txMock = {
    host: {
      count: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };

  return {
    txMock,
    prismaMock: {
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback(txMock),
      ),
    },
    rateLimitMock: { checkSetupRateLimit: vi.fn() },
  };
});

function knownRequestError(code: string) {
  return Object.assign(new Error(code), { code });
}

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  isUniqueConstraintError: (error: unknown) =>
    (error as { code?: string }).code === "P2002",
  isSerializationError: (error: unknown) =>
    (error as { code?: string }).code === "P2034",
}));
vi.mock("@/lib/rate-limit", () => rateLimitMock);

import { POST } from "@/app/api/setup/route";

const body = { email: "jefa@mail.com", password: "12345678" };

function jsonRequest(payload: unknown) {
  return new Request("http://localhost/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.checkSetupRateLimit.mockResolvedValue({ success: true });
  txMock.host.count.mockResolvedValue(0);
  txMock.host.findUnique.mockResolvedValue(null);
  txMock.host.upsert.mockResolvedValue({
    id: "host-1",
    email: "jefa@mail.com",
  });
});

describe("POST /api/setup", () => {
  it("crea el super admin dentro de una transacción serializable", async () => {
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      host: { id: "host-1", email: "jefa@mail.com" },
    });
    expect(txMock.host.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: "jefa@mail.com",
          isSuperAdmin: true,
        }),
      }),
    );
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("no deja crear un segundo administrador", async () => {
    txMock.host.count.mockResolvedValue(1);

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(409);
    expect(txMock.host.upsert).not.toHaveBeenCalled();
  });

  it("corta la fuerza bruta por IP antes de tocar la base", async () => {
    rateLimitMock.checkSetupRateLimit.mockResolvedValue({ success: false });

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(429);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza un payload inválido", async () => {
    const response = await POST(
      jsonRequest({ email: "no-es-email", password: "12345678" }),
    );

    expect(response.status).toBe(422);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("responde 409 si dos instalaciones chocan (P2034)", async () => {
    prismaMock.$transaction.mockRejectedValueOnce(
      knownRequestError("P2034"),
    );

    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(409);
  });
});
