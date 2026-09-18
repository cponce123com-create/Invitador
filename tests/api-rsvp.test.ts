// Prueba de regresión del endpoint público de RSVP: al avisar de un posible
// duplicado NO debe devolver los nombres ya registrados (el enlace de la
// invitación es público y eso filtraría la lista de invitados).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_DUPLICATE_SCAN } from "@/lib/constants";

const { prismaMock, rateLimitMock } = vi.hoisted(() => ({
  prismaMock: {
    event: { findUnique: vi.fn() },
    rsvp: { findMany: vi.fn(), create: vi.fn() },
  },
  rateLimitMock: { checkRsvpRateLimit: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/rate-limit", () => rateLimitMock);

import { POST } from "@/app/api/rsvp/route";

const activeEvent = {
  id: "ev1",
  isActive: true,
  maxGuestsPerRsvp: 3,
  rsvpDeadline: null,
};

const validRsvp = {
  eventId: "ev1",
  mainGuestName: "Ana Torres",
  mainGuestPhone: "987654321",
  attendance: "SI",
  additionalGuests: [],
};

function rsvpRequest(body: unknown) {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.checkRsvpRateLimit.mockResolvedValue({
    success: true,
    limit: 8,
    remaining: 7,
    reset: Date.now() + 60_000,
  });
  prismaMock.event.findUnique.mockResolvedValue(activeEvent);
  prismaMock.rsvp.findMany.mockResolvedValue([]);
  prismaMock.rsvp.create.mockResolvedValue({ id: "r1", attendance: "SI" });
});

describe("POST /api/rsvp — privacidad del aviso de duplicado", () => {
  it("avisa del duplicado sin devolver los nombres existentes", async () => {
    prismaMock.rsvp.findMany.mockResolvedValue([
      { mainGuestName: "Ana Torres" },
      { mainGuestName: "Luis Pérez" },
    ]);

    const response = await POST(rsvpRequest(validRsvp));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.duplicate).toBe(true);
    expect(payload).not.toHaveProperty("duplicates");
    // El cuerpo no debe filtrar NINGÚN nombre de la lista de invitados.
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("Ana Torres");
    expect(serialized).not.toContain("Luis Pérez");
    expect(prismaMock.rsvp.create).not.toHaveBeenCalled();
  });

  it("acota la consulta de nombres al tope MAX_DUPLICATE_SCAN", async () => {
    await POST(rsvpRequest(validRsvp));

    expect(prismaMock.rsvp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_DUPLICATE_SCAN }),
    );
  });

  it("crea la confirmación cuando no hay nombres parecidos", async () => {
    const response = await POST(rsvpRequest(validRsvp));

    expect(response.status).toBe(201);
    expect(prismaMock.rsvp.create).toHaveBeenCalled();
  });

  it("omite la búsqueda si el invitado ya confirmó el aviso", async () => {
    const response = await POST(
      rsvpRequest({ ...validRsvp, confirmDuplicate: true }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.rsvp.findMany).not.toHaveBeenCalled();
  });
});
