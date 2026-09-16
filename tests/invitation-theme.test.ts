import { describe, expect, it } from "vitest";
import { EVENT_TYPES, EVENT_TYPE_EMOJI } from "@/lib/constants";
import {
  DEFAULT_INVITATION_THEME,
  getInvitationTheme,
} from "@/lib/invitation-theme";
import { PARTICLE_KINDS } from "@/lib/particles";

const HEX = /^#[0-9a-fA-F]{6}$/;

describe("getInvitationTheme", () => {
  it("define un tema completo para cada tipo de evento", () => {
    for (const type of EVENT_TYPES) {
      const theme = getInvitationTheme(type);
      expect(theme.greeting.trim().length).toBeGreaterThan(0);
      expect(theme.emoji).toBe(EVENT_TYPE_EMOJI[type]);
      expect(PARTICLE_KINDS).toContain(theme.particleKind);
      expect(theme.palette.length).toBeGreaterThanOrEqual(3);
      expect(theme.accent).toMatch(HEX);
    }
  });

  it("usa colores hex válidos en todas las paletas", () => {
    for (const type of EVENT_TYPES) {
      for (const color of getInvitationTheme(type).palette) {
        expect(color).toMatch(HEX);
      }
    }
  });

  it("cae al tema de reserva para tipos desconocidos o ausentes", () => {
    expect(getInvitationTheme("NO_EXISTE")).toEqual(DEFAULT_INVITATION_THEME);
    expect(getInvitationTheme(null)).toEqual(DEFAULT_INVITATION_THEME);
    expect(getInvitationTheme(undefined)).toEqual(DEFAULT_INVITATION_THEME);
    expect(getInvitationTheme("")).toEqual(DEFAULT_INVITATION_THEME);
  });

  it("devuelve un objeto nuevo en cada llamada (sin estado compartido)", () => {
    const first = getInvitationTheme("BODA");
    const second = getInvitationTheme("BODA");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("tematiza cada tipo con su partícula esperada", () => {
    expect(getInvitationTheme("CUMPLEANOS").particleKind).toBe("confetti");
    expect(getInvitationTheme("BABY_SHOWER").particleKind).toBe("bubbles");
    expect(getInvitationTheme("BODA").particleKind).toBe("petals");
    expect(getInvitationTheme("BAUTIZO").particleKind).toBe("sparkles");
    expect(getInvitationTheme("GRADUACION").particleKind).toBe("stars");
  });
});
