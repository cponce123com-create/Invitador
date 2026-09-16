import { describe, expect, it } from "vitest";
import { MAX_GIFT_MESSAGE } from "@/lib/constants";
import { eventFormSchema } from "@/lib/validations/event";
import {
  giftProofFormSchema,
  giftProofRequestSchema,
} from "@/lib/validations/gift-proof";
import { createRsvpSchema, updateRsvpSchema } from "@/lib/validations/rsvp";

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

const rsvpEditBase = {
  mainGuestName: "Ana",
  attendance: "SI" as const,
  additionalGuests: [],
};

describe("updateRsvpSchema", () => {
  it("no exige el evento: el id de la confirmación va en la URL", () => {
    expect(updateRsvpSchema(2).safeParse(rsvpEditBase).success).toBe(true);
  });

  it("respeta el tope de acompañantes del evento", () => {
    const result = updateRsvpSchema(1).safeParse({
      ...rsvpEditBase,
      additionalGuests: [
        { name: "Luis", relation: "ESPOSO" },
        { name: "Marta", relation: "AMIGA" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un nombre demasiado corto", () => {
    expect(
      updateRsvpSchema(3).safeParse({ ...rsvpEditBase, mainGuestName: "A" })
        .success,
    ).toBe(false);
  });

  it("acepta teléfono y mensaje vacíos (se guardan como nulos)", () => {
    const result = updateRsvpSchema(3).safeParse({
      ...rsvpEditBase,
      mainGuestPhone: "",
      message: "",
    });
    expect(result.success).toBe(true);
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

  it("acepta la foto del código de vestimenta", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        dressCodeImageUrl:
          "https://res.cloudinary.com/demo/image/upload/vestimenta.jpg",
      }).success,
    ).toBe(true);
  });

  it("acepta la foto de vestimenta vacía o ausente", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, dressCodeImageUrl: "" })
        .success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("rechaza una foto de vestimenta que no es una URL", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        dressCodeImageUrl: "traje.png",
      }).success,
    ).toBe(false);
  });
});

describe("giftProofFormSchema", () => {
  it("acepta el nombre con una nota opcional", () => {
    expect(giftProofFormSchema.safeParse({ senderName: "Ana" }).success).toBe(true);
    expect(
      giftProofFormSchema.safeParse({ senderName: "Ana", note: "Ahí va mi aporte" })
        .success,
    ).toBe(true);
  });

  it("recorta el nombre y exige al menos dos caracteres", () => {
    const parsed = giftProofFormSchema.safeParse({ senderName: "  Ana  " });
    expect(parsed.success && parsed.data.senderName).toBe("Ana");
    expect(giftProofFormSchema.safeParse({ senderName: " A " }).success).toBe(false);
  });

  it("limita la longitud del nombre y de la nota", () => {
    expect(
      giftProofFormSchema.safeParse({ senderName: "a".repeat(80) }).success,
    ).toBe(true);
    expect(
      giftProofFormSchema.safeParse({ senderName: "a".repeat(81) }).success,
    ).toBe(false);
    expect(
      giftProofFormSchema.safeParse({
        senderName: "Ana",
        note: "a".repeat(MAX_GIFT_MESSAGE + 1),
      }).success,
    ).toBe(false);
  });
});

describe("giftProofRequestSchema", () => {
  const base = {
    senderName: "Ana",
    note: "",
    eventId: "ev1",
    url: "https://res.cloudinary.com/demo/image/upload/v1/recibo.jpg",
    cloudinaryId: "invitador/regalos/ev1/abc123",
  };

  it("acepta el payload completo del invitado", () => {
    expect(giftProofRequestSchema.safeParse(base).success).toBe(true);
  });

  it("exige el evento, la URL y el asset del comprobante", () => {
    expect(
      giftProofRequestSchema.safeParse({ ...base, eventId: "" }).success,
    ).toBe(false);
    expect(
      giftProofRequestSchema.safeParse({ ...base, cloudinaryId: "" }).success,
    ).toBe(false);
    expect(
      giftProofRequestSchema.safeParse({ ...base, url: "recibo.jpg" }).success,
    ).toBe(false);
  });
});

describe("URLs con esquema peligroso", () => {
  const peligrosas = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ];

  it("las rechaza en los enlaces del evento", () => {
    for (const url of peligrosas) {
      expect(
        eventFormSchema.safeParse({ ...eventBase, mapUrl: url }).success,
      ).toBe(false);
      expect(
        eventFormSchema.safeParse({ ...eventBase, locationImageUrl: url })
          .success,
      ).toBe(false);
      expect(
        eventFormSchema.safeParse({ ...eventBase, coverImageUrl: url }).success,
      ).toBe(false);
      expect(
        eventFormSchema.safeParse({ ...eventBase, giftQrUrl: url }).success,
      ).toBe(false);
      expect(
        eventFormSchema.safeParse({ ...eventBase, dressCodeImageUrl: url })
          .success,
      ).toBe(false);
    }
  });

  it("las rechaza en la URL del comprobante de regalo", () => {
    for (const url of peligrosas) {
      expect(
        giftProofRequestSchema.safeParse({
          senderName: "Ana",
          note: "",
          eventId: "ev1",
          url,
          cloudinaryId: "invitador/regalos/ev1/abc123",
        }).success,
      ).toBe(false);
    }
  });
});
