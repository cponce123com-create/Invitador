// Pruebas de las rutas de eventos con Prisma, la sesión y Cloudinary simulados:
// comprueban que un anfitrión no puede tocar nada que no sea suyo.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, sessionMock, cloudinaryMock } = vi.hoisted(() => ({
  prismaMock: {
    event: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  sessionMock: { getCurrentHost: vi.fn() },
  cloudinaryMock: { deleteCloudinaryImage: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  isUniqueConstraintError: () => false,
  isSerializationError: () => false,
}));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/cloudinary", () => cloudinaryMock);

import { DELETE, PATCH } from "@/app/api/events/[id]/route";
import { POST } from "@/app/api/events/route";

const hostA = {
  id: "host-a",
  email: "a@mail.com",
  name: null,
  isSuperAdmin: false,
};

function jsonRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/events", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const eventBase = {
  title: "Cumple de Sofía",
  type: "CUMPLEANOS" as const,
  maxGuestsPerRsvp: 3,
};

function photo(cloudinaryId: string) {
  return {
    url: `https://res.cloudinary.com/demo/image/upload/v1/${cloudinaryId}.jpg`,
    cloudinaryId,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getCurrentHost.mockResolvedValue(hostA);
  cloudinaryMock.deleteCloudinaryImage.mockResolvedValue({ result: "ok" });
});

describe("DELETE /api/events/[id]", () => {
  it("solo destruye en Cloudinary los assets de su propia carpeta", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [
        { cloudinaryId: "invitador/host-a/uno.jpg" },
        { cloudinaryId: "invitador/host-b/ajena.jpg" },
      ],
      giftProofs: [
        { cloudinaryId: "invitador/regalos/evt-1/recibo.jpg" },
        { cloudinaryId: "invitador/regalos/otro-evento/recibo.jpg" },
      ],
    });
    prismaMock.event.delete.mockResolvedValue({ id: "evt-1" });

    const response = await DELETE(jsonRequest("DELETE"), { params: { id: "evt-1" } });

    expect(response.status).toBe(200);
    expect(prismaMock.event.delete).toHaveBeenCalledWith({
      where: { id: "evt-1" },
    });

    const destroyed = cloudinaryMock.deleteCloudinaryImage.mock.calls.map(
      ([cloudinaryId]) => cloudinaryId,
    );
    expect(destroyed).toEqual([
      "invitador/host-a/uno.jpg",
      "invitador/regalos/evt-1/recibo.jpg",
    ]);
  });

  it("no borra el evento de otro anfitrión", async () => {
    prismaMock.event.findFirst.mockResolvedValue(null);

    const response = await DELETE(jsonRequest("DELETE"), {
      params: { id: "evt-de-host-b" },
    });

    expect(response.status).toBe(404);
    expect(prismaMock.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt-de-host-b", hostId: "host-a" },
      }),
    );
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
    expect(cloudinaryMock.deleteCloudinaryImage).not.toHaveBeenCalled();
  });
});

describe("POST /api/events", () => {
  it("rechaza una foto que no está en su carpeta", async () => {
    const response = await POST(
      jsonRequest("POST", {
        ...eventBase,
        photos: [photo("invitador/host-b/ajena")],
      }),
    );

    expect(response.status).toBe(400);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("acepta las fotos de su carpeta y crea el evento", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    prismaMock.event.create.mockResolvedValue({ id: "evt-1" });

    const response = await POST(
      jsonRequest("POST", {
        ...eventBase,
        photos: [photo("invitador/host-a/propia")],
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hostId: "host-a" }),
      }),
    );
  });
});

describe("PATCH /api/events/[id]", () => {
  it("rechaza cambiar la galería por un asset ajeno", async () => {
    prismaMock.event.findFirst.mockResolvedValue({ id: "evt-1" });

    const response = await PATCH(
      jsonRequest("PATCH", {
        ...eventBase,
        photos: [photo("invitador/host-b/ajena")],
      }),
      { params: { id: "evt-1" } },
    );

    expect(response.status).toBe(400);
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });
});

describe("guarda CSRF", () => {
  function crossOriginRequest(method: string, body?: unknown) {
    return new Request("http://localhost/api/events", {
      method,
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
        origin: "https://malo.example",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it("corta un POST de otro sitio antes de tocar la base", async () => {
    const response = await POST(
      crossOriginRequest("POST", { ...eventBase, photos: [] }),
    );

    expect(response.status).toBe(403);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("corta un DELETE de otro sitio", async () => {
    const response = await DELETE(crossOriginRequest("DELETE"), {
      params: { id: "evt-1" },
    });

    expect(response.status).toBe(403);
    expect(prismaMock.event.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.event.delete).not.toHaveBeenCalled();
  });
});
