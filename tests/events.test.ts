import { describe, expect, it } from "vitest";
import { computeEventStats, emptyToNull, toEventDate } from "@/lib/events";

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
