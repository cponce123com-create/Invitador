import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders } from "@/lib/http";

describe("getClientIpFromHeaders", () => {
  it("toma el último hop de x-forwarded-for (el que añade el proxy)", () => {
    expect(
      getClientIpFromHeaders({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
      }),
    ).toBe("9.10.11.12");
  });

  it("ignora los hops que el cliente puede falsificar", () => {
    // El cliente inventa su IP; el proxy de confianza añade la real al final.
    expect(
      getClientIpFromHeaders({ "x-forwarded-for": "10.0.0.1, 203.0.113.7" }),
    ).toBe("203.0.113.7");
  });

  it("recorta los espacios de cada hop", () => {
    expect(
      getClientIpFromHeaders({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8 " }),
    ).toBe("5.6.7.8");
  });

  it("usa cf-connecting-ip y x-real-ip como alternativa", () => {
    expect(getClientIpFromHeaders({ "cf-connecting-ip": "203.0.113.9" })).toBe(
      "203.0.113.9",
    );
    expect(getClientIpFromHeaders({ "x-real-ip": "203.0.113.10" })).toBe(
      "203.0.113.10",
    );
  });

  it("devuelve 'desconocida' si no hay cabeceras de proxy", () => {
    expect(getClientIpFromHeaders({})).toBe("desconocida");
    expect(getClientIpFromHeaders({ "x-forwarded-for": "" })).toBe(
      "desconocida",
    );
  });

  it("lee también un objeto Headers (request del navegador)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(getClientIpFromHeaders(headers)).toBe("2.2.2.2");
  });
});
