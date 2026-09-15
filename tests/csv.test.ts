import { describe, expect, it } from "vitest";
import {
  CSV_BOM,
  buildCsvFileName,
  escapeCsvCell,
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

describe("buildCsvFileName", () => {
  it("genera un nombre seguro con la fecha", () => {
    expect(buildCsvFileName("sofia-cumple-30")).toMatch(
      /^invitados-sofia-cumple-30-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});
