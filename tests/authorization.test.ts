// Pruebas de las rutas de eventos con Prisma, la sesión y Cloudinary simulados:
// comprueban que un anfitrión no puede tocar nada que no sea suyo y que las
// cuotas por cuenta se respetan.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_EVENTS_PER_HOST, MAX_PHOTOS_PER_HOST } from "@/lib/constants";

const { prismaMock, sessionMock, cloudinaryMock } = vi.hoisted(() => ({
  prismaMock: {
    event: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    eventPhoto: { count: vi.fn() },
    giftItem: { count: vi.fn() },
  },
  sessionMock: { getCurrentHost: vi.fn() },
  cloudinaryMock: { deleteCloudinaryImage: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  isUniqueConstraintError: () => false,
  isSerializationError: () => false,
  isForeignKeyConstraintError: (error: unknown) =>
    (error as { code?: string }).code === "P2003",
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
  // Sin uso previo: las cuotas por anfitrión parten de cero en cada test.
  prismaMock.event.count.mockResolvedValue(0);
  prismaMock.eventPhoto.count.mockResolvedValue(0);
  prismaMock.giftItem.count.mockResolvedValue(0);
});

describe("DELETE /api/events/[id]", () => {
  it("solo destruye en Cloudinary los assets de su propia carpeta", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [
        { cloudinaryId: "invitador/host-a/uno.jpg" },
        { cloudinaryId: "invitador/host-b/ajena.jpg" },
      ],
      // Las fotos del catálogo las sube el anfitrión, así que también se filtran
      // por su carpeta (no por la de comprobantes, que es de los invitados).
      giftItems: [
        { cloudinaryId: "invitador/host-a/regalo.jpg" },
        { cloudinaryId: "invitador/host-b/regalo-ajeno.jpg" },
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
      "invitador/host-a/regalo.jpg",
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

  it("rechaza crear un evento cuando se alcanzó la cuota por anfitrión", async () => {
    prismaMock.event.count.mockResolvedValue(MAX_EVENTS_PER_HOST);

    const response = await POST(jsonRequest("POST", { ...eventBase, photos: [] }));

    expect(response.status).toBe(403);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it("rechaza el evento si sus fotos pasan la cuota total del anfitrión", async () => {
    prismaMock.eventPhoto.count.mockResolvedValue(MAX_PHOTOS_PER_HOST);

    const response = await POST(
      jsonRequest("POST", {
        ...eventBase,
        photos: [photo("invitador/host-a/propia")],
      }),
    );

    expect(response.status).toBe(403);
    expect(prismaMock.event.create).not.toHaveBeenCalled();
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

  it("deja editar un evento aunque el anfitrión ya esté por encima de la cuota", async () => {
    // El evento ya tiene más fotos que el tope acumulado: el delta es 0 (no se
    // envía `photos`), así que la edición no debe bloquearse.
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [{ id: "foto-1" }],
      giftItems: [],
    });
    prismaMock.eventPhoto.count.mockResolvedValue(MAX_PHOTOS_PER_HOST + 5);
    prismaMock.event.update.mockResolvedValue({ id: "evt-1" });

    const response = await PATCH(jsonRequest("PATCH", { ...eventBase }), {
      params: { id: "evt-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.event.update).toHaveBeenCalled();
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

describe("limpieza de assets huérfanos de las imágenes únicas", () => {
  it("el DELETE borra las imágenes únicas de su carpeta y descarta lo ajeno", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [],
      giftItems: [],
      giftProofs: [],
      coverImageUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/invitador/host-a/portada.jpg",
      // Un enlace externo pegado a mano no es un asset de Cloudinary.
      locationImageUrl: "https://maps.app.goo.gl/abc",
      // Un asset de otro anfitrión nunca se toca.
      giftQrUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/invitador/host-b/qr.png",
      dressCodeImageUrl: null,
    });
    prismaMock.event.delete.mockResolvedValue({ id: "evt-1" });

    const response = await DELETE(jsonRequest("DELETE"), {
      params: { id: "evt-1" },
    });

    expect(response.status).toBe(200);
    const destroyed = cloudinaryMock.deleteCloudinaryImage.mock.calls.map(
      ([cloudinaryId]) => cloudinaryId,
    );
    expect(destroyed).toEqual(["invitador/host-a/portada"]);
  });

  it("el PATCH borra la imagen única que se reemplazó", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [],
      giftItems: [],
      coverImageUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/invitador/host-a/vieja.jpg",
      locationImageUrl: null,
      giftQrUrl: null,
      dressCodeImageUrl: null,
    });
    prismaMock.event.update.mockResolvedValue({ id: "evt-1" });

    const response = await PATCH(
      jsonRequest("PATCH", { ...eventBase, coverImageUrl: "" }),
      { params: { id: "evt-1" } },
    );

    expect(response.status).toBe(200);
    expect(cloudinaryMock.deleteCloudinaryImage).toHaveBeenCalledWith(
      "invitador/host-a/vieja",
    );
  });

  it("el PATCH no borra la imagen única que sigue usándose", async () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/v1/invitador/host-a/portada.jpg";
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [],
      giftItems: [],
      coverImageUrl: url,
      locationImageUrl: null,
      giftQrUrl: null,
      dressCodeImageUrl: null,
    });
    prismaMock.event.update.mockResolvedValue({ id: "evt-1" });

    await PATCH(jsonRequest("PATCH", { ...eventBase, coverImageUrl: url }), {
      params: { id: "evt-1" },
    });

    expect(cloudinaryMock.deleteCloudinaryImage).not.toHaveBeenCalled();
  });
});

describe("fondo inexistente (clave foránea)", () => {
  it("el POST responde 400 y no 500", async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    prismaMock.event.create.mockRejectedValue({ code: "P2003" });

    const response = await POST(
      jsonRequest("POST", {
        ...eventBase,
        photos: [],
        backgroundTemplateId: "bg-fantasma",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("el PATCH responde 400 y no 500", async () => {
    prismaMock.event.findFirst.mockResolvedValue({
      id: "evt-1",
      photos: [],
      giftItems: [],
      coverImageUrl: null,
      locationImageUrl: null,
      giftQrUrl: null,
      dressCodeImageUrl: null,
    });
    prismaMock.event.update.mockRejectedValue({ code: "P2003" });

    const response = await PATCH(
      jsonRequest("PATCH", {
        ...eventBase,
        backgroundTemplateId: "bg-fantasma",
      }),
      { params: { id: "evt-1" } },
    );

    expect(response.status).toBe(400);
  });
});
