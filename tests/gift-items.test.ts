// Pruebas de la reconciliación del catálogo de regalos con Prisma y Cloudinary
// simulados: qué se crea, qué se actualiza, qué se borra y qué assets se
// destruyen al guardar el formulario del evento.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, cloudinaryMock } = vi.hoisted(() => ({
  prismaMock: {
    giftItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  cloudinaryMock: { deleteCloudinaryImage: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  isUniqueConstraintError: () => false,
  isSerializationError: () => false,
}));
vi.mock("@/lib/cloudinary", () => cloudinaryMock);

import { syncGiftItems } from "@/lib/events";

const HOST = "host-1";

/** Un artículo tal como lo envía el formulario validado. */
function regalo(cloudinaryId: string, extra: Record<string, unknown> = {}) {
  return {
    title: "Juego de sábanas",
    description: "",
    price: "120",
    imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/${cloudinaryId}.jpg`,
    cloudinaryId,
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (operations: Promise<unknown>[]) => Promise.all(operations),
  );
  prismaMock.giftItem.delete.mockResolvedValue({});
  prismaMock.giftItem.update.mockResolvedValue({});
  prismaMock.giftItem.create.mockResolvedValue({});
  cloudinaryMock.deleteCloudinaryImage.mockResolvedValue({ result: "ok" });
});

describe("syncGiftItems", () => {
  it("borra los artículos que ya no vienen y destruye su foto", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([
      { id: "id-1", cloudinaryId: "invitador/host-1/uno" },
      { id: "id-2", cloudinaryId: "invitador/host-1/dos" },
    ]);

    await syncGiftItems(
      "evt-1",
      [regalo("invitador/host-1/uno", { id: "id-1" })],
      HOST,
    );

    expect(prismaMock.giftItem.findMany).toHaveBeenCalledWith({
      where: { eventId: "evt-1" },
      select: { id: true, cloudinaryId: true },
    });
    expect(prismaMock.giftItem.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.giftItem.delete).toHaveBeenCalledWith({
      where: { id: "id-2" },
    });
    expect(prismaMock.giftItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "id-1" } }),
    );
    // La foto del artículo borrado sale de la carpeta del anfitrión: se limpia.
    expect(cloudinaryMock.deleteCloudinaryImage).toHaveBeenCalledWith(
      "invitador/host-1/dos",
    );
  });

  it("crea los artículos nuevos con el orden del formulario", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([]);

    await syncGiftItems(
      "evt-1",
      [regalo("invitador/host-1/a"), regalo("invitador/host-1/b")],
      HOST,
    );

    expect(prismaMock.giftItem.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.giftItem.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        eventId: "evt-1",
        order: 0,
        cloudinaryId: "invitador/host-1/a",
        priceCents: 12000,
      }),
    });
    expect(prismaMock.giftItem.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        eventId: "evt-1",
        order: 1,
        cloudinaryId: "invitador/host-1/b",
      }),
    });
    expect(prismaMock.giftItem.update).not.toHaveBeenCalled();
  });

  it("reordena los artículos que se mantienen", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([
      { id: "id-1", cloudinaryId: "invitador/host-1/uno" },
      { id: "id-2", cloudinaryId: "invitador/host-1/dos" },
    ]);

    await syncGiftItems(
      "evt-1",
      [
        regalo("invitador/host-1/dos", { id: "id-2" }),
        regalo("invitador/host-1/uno", { id: "id-1" }),
      ],
      HOST,
    );

    expect(prismaMock.giftItem.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "id-2" },
        data: expect.objectContaining({ order: 0 }),
      }),
    );
    expect(prismaMock.giftItem.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "id-1" },
        data: expect.objectContaining({ order: 1 }),
      }),
    );
    expect(prismaMock.giftItem.delete).not.toHaveBeenCalled();
  });

  it("trata un id ajeno como artículo nuevo, nunca lo actualiza", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([
      { id: "id-1", cloudinaryId: "invitador/host-1/uno" },
    ]);

    await syncGiftItems(
      "evt-1",
      [regalo("invitador/host-1/nuevo", { id: "id-de-otro-evento" })],
      HOST,
    );

    // El id no pertenece a este evento: se crea uno nuevo en vez de "robar" la
    // fila de otro evento, y el artículo que ya no viene se borra.
    expect(prismaMock.giftItem.update).not.toHaveBeenCalled();
    expect(prismaMock.giftItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: "evt-1" }),
    });
    expect(prismaMock.giftItem.delete).toHaveBeenCalledWith({
      where: { id: "id-1" },
    });
  });

  it("no destruye assets que no son de la carpeta del anfitrión", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([
      { id: "id-1", cloudinaryId: "invitador/otro-host/ajena" },
    ]);

    await syncGiftItems("evt-1", [], HOST);

    expect(prismaMock.giftItem.delete).toHaveBeenCalledWith({
      where: { id: "id-1" },
    });
    expect(cloudinaryMock.deleteCloudinaryImage).not.toHaveBeenCalled();
  });

  it("no toca nada con un catálogo vacío o ausente", async () => {
    prismaMock.giftItem.findMany.mockResolvedValue([]);

    await syncGiftItems("evt-1", undefined, HOST);
    await syncGiftItems("evt-1", [], HOST);

    expect(prismaMock.giftItem.delete).not.toHaveBeenCalled();
    expect(prismaMock.giftItem.update).not.toHaveBeenCalled();
    expect(prismaMock.giftItem.create).not.toHaveBeenCalled();
    expect(cloudinaryMock.deleteCloudinaryImage).not.toHaveBeenCalled();
  });
});
