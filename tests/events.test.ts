import { describe, expect, it } from "vitest";
import {
  computeEventStats,
  emptyToNull,
  giftItemsBelongToHost,
  photosBelongToHost,
  toEventDate,
  toEventScalarData,
  toGiftItemData,
} from "@/lib/events";
import type { EventFormValues } from "@/lib/validations/event";

describe("emptyToNull", () => {
  it("convierte vacío o espacios en null", () => {
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
  });

  it("recorta un valor válido", () => {
    expect(emptyToNull("  hola ")).toBe("hola");
  });
});

describe("toEventDate", () => {
  it("interpreta la hora de pared como UTC", () => {
    expect(toEventDate("2026-07-05T17:00")?.toISOString()).toBe(
      "2026-07-05T17:00:00.000Z",
    );
  });

  it("devuelve null para un valor vacío", () => {
    expect(toEventDate("")).toBeNull();
    expect(toEventDate(null)).toBeNull();
  });
});

const formValues: EventFormValues = {
  title: "  Cumple de Sofía  ",
  type: "CUMPLEANOS",
  customLabel: "",
  ageOrDetail: "",
  eventDate: "",
  rsvpDeadline: "",
  location: "Salón Los Jardines",
  locationImageUrl: "",
  mapUrl: "",
  description: "",
  coverImageUrl: "",
  backgroundTemplateId: "",
  maxGuestsPerRsvp: 3,
  photos: [],
};

describe("toEventScalarData", () => {
  it("convierte en null los campos de lugar vacíos", () => {
    const data = toEventScalarData(formValues);

    expect(data.location).toBe("Salón Los Jardines");
    expect(data.locationImageUrl).toBeNull();
    expect(data.mapUrl).toBeNull();
  });

  it("conserva la foto del lugar y el link de Maps", () => {
    const data = toEventScalarData({
      ...formValues,
      locationImageUrl: " https://res.cloudinary.com/demo/image/upload/lugar.jpg ",
      mapUrl: "https://maps.app.goo.gl/abc123",
    });

    expect(data.locationImageUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/lugar.jpg",
    );
    expect(data.mapUrl).toBe("https://maps.app.goo.gl/abc123");
  });

  it("guarda null sin mesa de regalos y conserva el QR con su texto", () => {
    expect(toEventScalarData(formValues).giftQrUrl).toBeNull();
    expect(toEventScalarData(formValues).giftMessage).toBeNull();

    const data = toEventScalarData({
      ...formValues,
      giftQrUrl: "https://res.cloudinary.com/demo/image/upload/qr.png",
      giftMessage: "  Llave Bre-B 300 123 4567  ",
    });

    expect(data.giftQrUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/qr.png",
    );
    expect(data.giftMessage).toBe("Llave Bre-B 300 123 4567");
  });

  it("guarda null sin foto de vestimenta y la conserva cuando se sube", () => {
    expect(toEventScalarData(formValues).dressCodeImageUrl).toBeNull();

    const data = toEventScalarData({
      ...formValues,
      dressCodeImageUrl:
        " https://res.cloudinary.com/demo/image/upload/vestimenta.jpg ",
    });

    expect(data.dressCodeImageUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/vestimenta.jpg",
    );
  });

  it("guarda null sin melodía de fondo y conserva la elegida", () => {
    // Ausente y vacío son las dos formas de decir «Sin música».
    expect(toEventScalarData(formValues).musicTrack).toBeNull();
    expect(
      toEventScalarData({ ...formValues, musicTrack: "" }).musicTrack,
    ).toBeNull();

    const data = toEventScalarData({ ...formValues, musicTrack: "CUMPLEANOS" });

    expect(data.musicTrack).toBe("CUMPLEANOS");
  });

  it("guarda null sin cierre de lista y lo convierte cuando se define", () => {
    expect(toEventScalarData(formValues).rsvpDeadline).toBeNull();

    const data = toEventScalarData({
      ...formValues,
      rsvpDeadline: "2026-09-25T22:00",
    });

    expect(data.rsvpDeadline?.toISOString()).toBe("2026-09-25T22:00:00.000Z");
  });
});

describe("computeEventStats", () => {
  it("cuenta personas incluyendo acompañantes solo de quienes asisten", () => {
    const stats = computeEventStats([
      { attendance: "SI", additionalGuests: [{ id: "a" }, { id: "b" }] },
      { attendance: "SI", additionalGuests: [] },
      { attendance: "NO", additionalGuests: [{ id: "c" }] },
      { attendance: "TAL_VEZ", additionalGuests: [] },
    ]);

    expect(stats).toEqual({
      yes: 2,
      no: 1,
      maybe: 1,
      totalRsvps: 4,
      totalPeople: 4,
    });
  });

  it("devuelve contadores en cero sin confirmaciones", () => {
    expect(computeEventStats([])).toEqual({
      yes: 0,
      no: 0,
      maybe: 0,
      totalRsvps: 0,
      totalPeople: 0,
    });
  });
});

const foto = (cloudinaryId: string) => ({
  url: `https://res.cloudinary.com/demo/image/upload/v1/${cloudinaryId}.jpg`,
  cloudinaryId,
});

describe("photosBelongToHost", () => {
  it("acepta las fotos de la carpeta del anfitrión", () => {
    expect(
      photosBelongToHost("host-1", [foto("invitador/host-1/una")]),
    ).toBe(true);
  });

  it("rechaza la lista si una sola foto es de otro anfitrión", () => {
    expect(
      photosBelongToHost("host-1", [
        foto("invitador/host-1/una"),
        foto("invitador/host-2/ajena"),
      ]),
    ).toBe(false);
  });

  it("acepta una galería vacía o ausente", () => {
    expect(photosBelongToHost("host-1", [])).toBe(true);
    expect(photosBelongToHost("host-1", undefined)).toBe(true);
  });
});

const regalo = (cloudinaryId: string) => ({
  title: "Juego de sábanas",
  description: "",
  price: "120",
  imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/${cloudinaryId}.jpg`,
  cloudinaryId,
});

describe("toGiftItemData", () => {
  it("recorta el nombre y convierte el precio a céntimos", () => {
    const data = toGiftItemData({
      ...regalo("invitador/host-1/regalo"),
      title: "  Vajilla  ",
    });

    expect(data.title).toBe("Vajilla");
    expect(data.priceCents).toBe(12000);
    expect(data.imageUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/invitador/host-1/regalo.jpg",
    );
  });

  it("guarda null sin precio ni descripción", () => {
    const data = toGiftItemData({
      ...regalo("invitador/host-1/regalo"),
      price: "",
      description: "   ",
    });

    expect(data.priceCents).toBeNull();
    expect(data.description).toBeNull();
  });
});

describe("giftItemsBelongToHost", () => {
  it("acepta las fotos del catálogo de la carpeta del anfitrión", () => {
    expect(
      giftItemsBelongToHost("host-1", [regalo("invitador/host-1/una")]),
    ).toBe(true);
  });

  it("rechaza la lista si un solo regalo es de otro anfitrión", () => {
    expect(
      giftItemsBelongToHost("host-1", [
        regalo("invitador/host-1/una"),
        regalo("invitador/host-2/ajena"),
      ]),
    ).toBe(false);
  });

  it("rechaza la carpeta de comprobantes de regalo", () => {
    // `invitador/regalos/{eventId}` es de los invitados: no sirve como foto de
    // un artículo del catálogo, que la sube el anfitrión.
    expect(
      giftItemsBelongToHost("host-1", [regalo("invitador/regalos/ev1/recibo")]),
    ).toBe(false);
  });

  it("acepta un catálogo vacío o ausente", () => {
    expect(giftItemsBelongToHost("host-1", [])).toBe(true);
    expect(giftItemsBelongToHost("host-1", undefined)).toBe(true);
  });
});
