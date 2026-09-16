import { describe, expect, it } from "vitest";
import { findGiftProofForGuest, normalizeGuestName } from "@/lib/gift-proofs";

const proofs = [
  { id: "p1", senderName: "María González", url: "https://x/1.jpg" },
  { id: "p2", senderName: "José Muñoz", url: "https://x/2.jpg" },
];

describe("normalizeGuestName", () => {
  it("quita espacios de sobra y pasa a minúsculas", () => {
    expect(normalizeGuestName("  Ana  ")).toBe("ana");
    expect(normalizeGuestName("María   González")).toBe("maria gonzalez");
  });

  it("quita tildes y la tilde de la eñe", () => {
    expect(normalizeGuestName("José Ángel")).toBe("jose angel");
    expect(normalizeGuestName("Muñoz")).toBe("munoz");
  });

  it("devuelve cadena vacía si no hay nombre", () => {
    expect(normalizeGuestName("   ")).toBe("");
  });
});

describe("findGiftProofForGuest", () => {
  it("encuentra el comprobante aunque cambien mayúsculas, tildes o espacios", () => {
    expect(findGiftProofForGuest("maria gonzalez", proofs)?.id).toBe("p1");
    expect(findGiftProofForGuest("MARÍA  GONZÁLEZ", proofs)?.id).toBe("p1");
    expect(findGiftProofForGuest("Jose Munoz", proofs)?.id).toBe("p2");
  });

  it("devuelve el primero que coincide (los comprobantes llegan del más reciente)", () => {
    const repetidos = [
      { id: "nuevo", senderName: "Ana López" },
      { id: "viejo", senderName: "ANA LOPEZ" },
    ];
    expect(findGiftProofForGuest("Ana López", repetidos)?.id).toBe("nuevo");
  });

  it("no devuelve nada si nadie con ese nombre subió comprobante", () => {
    expect(findGiftProofForGuest("Pedro", proofs)).toBeUndefined();
  });

  it("no cruza nombres parciales", () => {
    expect(findGiftProofForGuest("María", proofs)).toBeUndefined();
  });

  it("no devuelve nada si el invitado no tiene nombre", () => {
    expect(findGiftProofForGuest("   ", proofs)).toBeUndefined();
  });
});
