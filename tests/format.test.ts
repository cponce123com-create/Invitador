import { describe, expect, it } from "vitest";
import {
  centsToPriceInput,
  formatGuestSummary,
  formatPrice,
  formatShortDateTime,
  isPastEvent,
  isWallClockPast,
  parsePriceToCents,
  parseWallClockInput,
  toWallClockInputValue,
  wallClockToInstant,
} from "@/lib/format";

describe("parseWallClockInput", () => {
  it("interpreta el valor como hora de pared en UTC", () => {
    expect(parseWallClockInput("2026-07-05T17:00")?.toISOString()).toBe(
      "2026-07-05T17:00:00.000Z",
    );
  });

  it("acepta segundos", () => {
    expect(parseWallClockInput("2026-07-05T17:00:30")?.toISOString()).toBe(
      "2026-07-05T17:00:30.000Z",
    );
  });

  it("rechaza formatos con offset o texto libre", () => {
    expect(parseWallClockInput("2026-07-05T17:00:00Z")).toBeNull();
    expect(parseWallClockInput("mañana")).toBeNull();
    expect(parseWallClockInput("")).toBeNull();
  });
});

describe("toWallClockInputValue", () => {
  it("hace round-trip con parseWallClockInput", () => {
    expect(toWallClockInputValue(new Date("2026-07-05T17:00:00.000Z"))).toBe(
      "2026-07-05T17:00",
    );
  });

  it("devuelve cadena vacía para valores nulos o inválidos", () => {
    expect(toWallClockInputValue(null)).toBe("");
    expect(toWallClockInputValue("no-es-fecha")).toBe("");
  });
});

describe("isPastEvent", () => {
  it("distingue eventos pasados y futuros", () => {
    expect(isPastEvent(new Date(Date.now() - 60_000))).toBe(true);
    expect(isPastEvent(new Date(Date.now() + 60_000))).toBe(false);
    expect(isPastEvent(null)).toBe(false);
  });
});

describe("wallClockToInstant", () => {
  it("interpreta la hora de pared como hora de Perú (UTC-5)", () => {
    expect(
      wallClockToInstant(new Date("2026-09-25T22:00:00.000Z"))?.toISOString(),
    ).toBe("2026-09-26T03:00:00.000Z");
  });

  it("acepta el valor en texto y devuelve null si no es una fecha", () => {
    expect(wallClockToInstant("2026-07-05T17:00:00.000Z")?.toISOString()).toBe(
      "2026-07-05T22:00:00.000Z",
    );
    expect(wallClockToInstant(null)).toBeNull();
    expect(wallClockToInstant("no-es-fecha")).toBeNull();
  });
});

describe("isWallClockPast", () => {
  it("compara contra la hora de Perú, no contra UTC", () => {
    // 2026-09-25T22:00Z es "hora de pared": son las 10 p.m. en Perú, es decir
    // las 03:00 UTC del 26. A las 02:30 UTC todavía no cierra; a las 03:30 sí.
    const deadline = new Date("2026-09-25T22:00:00.000Z");
    expect(
      isWallClockPast(deadline, new Date("2026-09-26T02:30:00.000Z")),
    ).toBe(false);
    expect(
      isWallClockPast(deadline, new Date("2026-09-26T03:30:00.000Z")),
    ).toBe(true);
  });

  it("devuelve false sin fecha", () => {
    expect(isWallClockPast(null)).toBe(false);
  });
});

describe("formatShortDateTime", () => {
  it("pinta los instantes en la hora de Perú", () => {
    // 17:00 UTC son las 12:00 del mediodía en Perú.
    expect(formatShortDateTime(new Date("2026-07-01T17:00:00.000Z"))).toBe(
      "01/07/2026, 12:00",
    );
  });

  it("devuelve un guion para valores nulos o inválidos", () => {
    expect(formatShortDateTime(null)).toBe("—");
    expect(formatShortDateTime("no-es-fecha")).toBe("—");
  });
});

describe("formatGuestSummary", () => {
  it("no muestra acompañantes si no asiste", () => {
    expect(formatGuestSummary("NO", [])).toBe("—");
  });

  it("muestra 'Solo' cuando asiste sin acompañantes", () => {
    expect(formatGuestSummary("SI", [])).toBe("Solo");
  });

  it("cuenta los acompañantes cuando asiste", () => {
    expect(
      formatGuestSummary("SI", [{ relation: "AMIGO" }, { relation: "FAMILIAR" }]),
    ).toBe("+2");
  });
});

describe("parsePriceToCents", () => {
  it("convierte el texto del formulario en céntimos", () => {
    expect(parsePriceToCents("35")).toBe(3500);
    expect(parsePriceToCents("35.5")).toBe(3550);
    expect(parsePriceToCents("35.50")).toBe(3550);
    expect(parsePriceToCents(" 120 ")).toBe(12000);
  });

  it("no arrastra el error de coma flotante", () => {
    expect(parsePriceToCents("19.99")).toBe(1999);
    expect(parsePriceToCents("0.1")).toBe(10);
  });

  it("devuelve null sin precio o con un formato que no es un número", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("   ")).toBeNull();
    expect(parsePriceToCents(null)).toBeNull();
    expect(parsePriceToCents(undefined)).toBeNull();
    // Coma decimal, más de dos decimales, negativos y texto con símbolo.
    expect(parsePriceToCents("35,50")).toBeNull();
    expect(parsePriceToCents("35.555")).toBeNull();
    expect(parsePriceToCents("-10")).toBeNull();
    expect(parsePriceToCents("S/ 35")).toBeNull();
  });
});

describe("centsToPriceInput", () => {
  it("hace round-trip con parsePriceToCents", () => {
    expect(centsToPriceInput(3550)).toBe("35.50");
    expect(parsePriceToCents(centsToPriceInput(3550))).toBe(3550);
  });

  it("devuelve cadena vacía sin precio", () => {
    expect(centsToPriceInput(null)).toBe("");
    expect(centsToPriceInput(undefined)).toBe("");
  });
});

describe("formatPrice", () => {
  it("pinta el monto en soles", () => {
    expect(formatPrice(3550)).toContain("35.50");
  });

  it("usa la moneda guardada y cae a la de la plataforma si es inválida", () => {
    expect(formatPrice(3550, "USD")).toContain("35.50");
    // Una moneda corrupta en la base no debe romper la invitación.
    expect(formatPrice(3550, "no-existe")).toContain("35.50");
  });
});
