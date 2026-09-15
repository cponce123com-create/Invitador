import { describe, expect, it } from "vitest";
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
});
