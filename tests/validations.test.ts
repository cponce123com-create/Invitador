import { describe, expect, it } from "vitest";
import {
  MAX_GIFT_ITEMS,
  MAX_GIFT_ITEM_DESCRIPTION,
  MAX_GIFT_ITEM_TITLE,
  MAX_GIFT_MESSAGE,
} from "@/lib/constants";
import { eventFormSchema } from "@/lib/validations/event";
import {
  giftProofFormSchema,
  giftProofRequestSchema,
} from "@/lib/validations/gift-proof";
import { createRsvpSchema, updateRsvpSchema } from "@/lib/validations/rsvp";

const rsvpBase = {
  eventId: "evt_1",
  mainGuestName: "Ana",
  mainGuestPhone: "987654321",
  attendance: "SI" as const,
  additionalGuests: [],
};

describe("createRsvpSchema", () => {
  it("exige el celular del invitado principal", () => {
    expect(
      createRsvpSchema(3).safeParse({ ...rsvpBase, mainGuestPhone: "" }).success,
    ).toBe(false);
    expect(
      createRsvpSchema(3).safeParse({ ...rsvpBase, mainGuestPhone: "12345" })
        .success,
    ).toBe(false);
    expect(
      createRsvpSchema(3).safeParse({
        eventId: "evt_1",
        mainGuestName: "Ana",
        attendance: "SI",
        additionalGuests: [],
      }).success,
    ).toBe(false);
  });

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
  mainGuestPhone: "987654321",
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

  it("mantiene el celular obligatorio y el mensaje opcional", () => {
    expect(
      updateRsvpSchema(3).safeParse({ ...rsvpEditBase, mainGuestPhone: "" })
        .success,
    ).toBe(false);
    expect(
      updateRsvpSchema(3).safeParse({ ...rsvpEditBase, message: "" }).success,
    ).toBe(true);
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

  it("acepta el cierre de la lista con el formato del selector", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        rsvpDeadline: "2026-09-25T22:00",
      }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({ ...eventBase, rsvpDeadline: "" }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        rsvpDeadline: "2026-09-25T22:00:00Z",
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

  it("acepta una melodía del catálogo, la cadena vacía o la ausencia", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, musicTrack: "CUMPLEANOS" })
        .success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({ ...eventBase, musicTrack: "" }).success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("rechaza una melodía que no está en el catálogo", () => {
    expect(
      eventFormSchema.safeParse({ ...eventBase, musicTrack: "SILENCIO" }).success,
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

describe("catálogo de regalos", () => {
  const regalo = {
    title: "Juego de sábanas",
    price: "120",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/regalo.jpg",
    cloudinaryId: "invitador/host-1/regalo",
  };

  it("acepta un catálogo con precio y descripción", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, description: "Talla queen" }],
      }).success,
    ).toBe(true);
  });

  it("acepta un regalo sin precio ni descripción", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, price: "", description: "" }],
      }).success,
    ).toBe(true);
    expect(eventFormSchema.safeParse(eventBase).success).toBe(true);
  });

  it("exige nombre y foto en cada regalo", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, title: "A" }],
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, imageUrl: "" }],
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, cloudinaryId: "" }],
      }).success,
    ).toBe(false);
  });

  it("rechaza un precio que no es un número", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, price: "gratis" }],
      }).success,
    ).toBe(false);
  });

  it("rechaza un precio por encima del tope con un mensaje claro", () => {
    const parsed = eventFormSchema.safeParse({
      ...eventBase,
      giftItems: [{ ...regalo, price: "10000000" }],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues
        .map((issue) => issue.message)
        .join(" | ");
      expect(messages).toContain("El precio no puede pasar de");
    }
  });

  it("limita el nombre, la descripción y el número de regalos", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, title: "a".repeat(MAX_GIFT_ITEM_TITLE) }],
      }).success,
    ).toBe(true);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, title: "a".repeat(MAX_GIFT_ITEM_TITLE + 1) }],
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [
          { ...regalo, description: "a".repeat(MAX_GIFT_ITEM_DESCRIPTION + 1) },
        ],
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: Array.from({ length: MAX_GIFT_ITEMS + 1 }, () => regalo),
      }).success,
    ).toBe(false);
  });

  it("rechaza una foto de regalo con esquema peligroso", () => {
    expect(
      eventFormSchema.safeParse({
        ...eventBase,
        giftItems: [{ ...regalo, imageUrl: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });

  it("acepta el comprobante con o sin regalo elegido", () => {
    const comprobante = {
      senderName: "Ana",
      note: "",
      eventId: "ev1",
      url: "https://res.cloudinary.com/demo/image/upload/v1/recibo.jpg",
      cloudinaryId: "invitador/regalos/ev1/abc123",
    };

    expect(giftProofRequestSchema.safeParse(comprobante).success).toBe(true);
    expect(
      giftProofRequestSchema.safeParse({
        ...comprobante,
        giftItemId: "item_1",
      }).success,
    ).toBe(true);
    expect(
      giftProofRequestSchema.safeParse({ ...comprobante, giftItemId: "" })
        .success,
    ).toBe(false);
  });
});
