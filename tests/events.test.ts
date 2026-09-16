import { describe, expect, it } from "vitest";
import {
  computeEventStats,
  emptyToNull,
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
