import { describe, expect, it } from "vitest";
import {
  CSV_BOM,
  GIFT_PROOF_CSV_HEADERS,
  buildCsvFileName,
  escapeCsvCell,
  giftProofsToCsv,
  rsvpsToCsv,
  toCsv,
} from "@/lib/csv";

describe("escapeCsvCell", () => {
  it("entrecomilla y duplica comillas cuando hace falta", () => {
    expect(escapeCsvCell('Hola, "mundo"')).toBe('"Hola, ""mundo"""');
  });

  it("no entrecomilla texto simple", () => {
    expect(escapeCsvCell("Ana")).toBe("Ana");
  });

  it("convierte null/undefined en cadena vacía", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("une las filas con CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d");
  });
});

describe("rsvpsToCsv", () => {
  it("incluye BOM, encabezados y traduce las etiquetas", () => {
    const csv = rsvpsToCsv([
      {
        mainGuestName: "Ana",
        mainGuestPhone: null,
        attendance: "SI",
        message: "¡Ahí estaremos!",
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        additionalGuests: [{ name: "Luis", relation: "ESPOSO" }],
      },
    ]);

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain("Invitado principal");
    expect(csv).toContain("Sí asistiré");
    expect(csv).toContain("Luis (Esposo)");
  });
});

describe("giftProofsToCsv", () => {
  it("incluye BOM, encabezados y una fila por comprobante", () => {
    const csv = giftProofsToCsv([
      {
        senderName: "Ana",
        note: "Para el regalo",
        url: "https://res.cloudinary.com/demo/image/upload/v1/recibo.jpg",
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
      },
    ]);

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain(GIFT_PROOF_CSV_HEADERS.join(","));
    expect(csv).toContain(
      "Ana,Para el regalo,https://res.cloudinary.com/demo/image/upload/v1/recibo.jpg",
    );
  });

  it("deja la nota vacía y entrecomilla el texto con separadores", () => {
    const csv = giftProofsToCsv([
      {
        senderName: "Luis",
        note: null,
        url: "https://res.cloudinary.com/demo/image/upload/v1/otro.jpg",
        createdAt: new Date("2026-07-02T12:00:00.000Z"),
      },
      {
        senderName: "Marta",
        note: "Ramo, tarjeta y vino",
        url: "https://res.cloudinary.com/demo/image/upload/v1/tercero.jpg",
        createdAt: new Date("2026-07-03T12:00:00.000Z"),
      },
    ]);

    expect(csv).toContain("Luis,,https://res.cloudinary.com/demo/image/upload/v1/otro.jpg");
    expect(csv).toContain('"Ramo, tarjeta y vino"');
  });
});

describe("buildCsvFileName", () => {
  it("genera un nombre seguro con la fecha", () => {
    expect(buildCsvFileName("sofia-cumple-30")).toMatch(
      /^invitados-sofia-cumple-30-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  it("usa el prefijo recibido para distinguir la lista", () => {
    expect(buildCsvFileName("sofia-cumple-30", "regalos")).toMatch(
      /^regalos-sofia-cumple-30-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});
