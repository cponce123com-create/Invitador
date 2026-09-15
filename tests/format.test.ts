import { describe, expect, it } from "vitest";
import {
  formatGuestSummary,
  isPastEvent,
  parseWallClockInput,
  toWallClockInputValue,
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
