import { describe, expect, it } from "vitest";
import {
  computeEventStats,
  emptyToNull,
  photosBelongToHost,
  toEventDate,
  toEventScalarData,
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
