import { describe, expect, it } from "vitest";
import { MAX_GIFT_MESSAGE } from "@/lib/constants";
import { eventFormSchema } from "@/lib/validations/event";
import { createRsvpSchema } from "@/lib/validations/rsvp";

const rsvpBase = {
  eventId: "evt_1",
  mainGuestName: "Ana",
  attendance: "SI" as const,
  additionalGuests: [],
};

describe("createRsvpSchema", () => {
  it("respeta el tope de acompañantes del evento", () => {
    const result = createRsvpSchema(1).safeParse({
      ...rsvpBase,
      additionalGuests: [
        { name: "Luis", relation: "ESPOSO" },
        { name: "Marta", relation: "AMIGA" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("acepta acompañantes dentro del tope", () => {
    const result = createRsvpSchema(2).safeParse({
      ...rsvpBase,
      additionalGuests: [{ name: "Luis", relation: "ESPOSO" }],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una asistencia inválida", () => {
    expect(
      createRsvpSchema(3).safeParse({ ...rsvpBase, attendance: "QUIZAS" })
        .success,
    ).toBe(false);
  });
});

const eventBase = {
  title: "Cumple de Sofía",
  type: "CUMPLEANOS" as const,
  maxGuestsPerRsvp: 3,
};

describe("eventFormSchema", () => {
  it("valida un evento mínimo", () => {
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("exige una fecha del selector (hora de pared, sin offset)", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, eventDate: "2026-07-05T17:00" })
        .success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        eventDate: "2026-07-05T17:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("limita el número de acompañantes", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, maxGuestsPerRsvp: 999 }).success,
    ).toBe(false);
  });

  it("acepta un id de fondo", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        backgroundTemplateId: "bg-brand-aurora",
      }).success,
    ).toBe(true);
  });

  it("acepta la cadena vacía y la ausencia del fondo", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, backgroundTemplateId: "" })
        .success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("rechaza un id de fondo en blanco", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, backgroundTemplateId: "   " })
        .success,
    ).toBe(false);
  });

  it("acepta la URL de portada y su cadena vacía", () => {
    const coverImageUrl =
      "https://res.cloudinary.com/demo/image/upload/portada.jpg";

    expect(
      eventFormSchema.safeParse({ ...eventBase, coverImageUrl }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({ ...eventBase, coverImageUrl: "" }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({ ...eventBase, coverImageUrl: "no-es-url" })
        .success,
    ).toBe(false);
  });

  it("acepta la foto del lugar y el link de Google Maps", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        locationImageUrl:
          "https://res.cloudinary.com/demo/image/upload/lugar.jpg",
        mapUrl: "https://maps.app.goo.gl/abc123",
      }).success,
    ).toBe(true);
  });

  it("acepta los campos del lugar vacíos o ausentes", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        locationImageUrl: "",
        mapUrl: "",
      }).success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("rechaza un link de Maps que no es una URL", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, mapUrl: "maps.google.com/aqui" })
        .success,
    ).toBe(false);
  });

  it("acepta el QR de regalos con su texto", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftQrUrl: "https://res.cloudinary.com/demo/image/upload/qr.png",
        giftMessage: "Llave Bre-B 300 123 4567",
      }).success,
    ).toBe(true);
  });

  it("acepta la mesa de regalos vacía o ausente", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftQrUrl: "",
        giftMessage: "",
      }).success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("limita la longitud del texto de la mesa de regalos", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftMessage: "a".repeat(MAX_GIFT_MESSAGE),
      }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftMessage: "a".repeat(MAX_GIFT_MESSAGE + 1),
      }).success,
    ).toBe(false);
  });

  it("rechaza un QR de regalos que no es una URL", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, giftQrUrl: "qr.png" }).success,
    ).toBe(false);
  });
});
