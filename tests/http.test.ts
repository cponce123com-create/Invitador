import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders, isCrossOriginRequest } from "@/lib/http";

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

describe("isCrossOriginRequest", () => {
  function request(headers: Record<string, string>) {
    return new Request("http://localhost/api/events", {
      method: "POST",
      headers,
    });
  }

  it("deja pasar una petición del mismo origen", () => {
    expect(
      isCrossOriginRequest(
        request({
          "sec-fetch-site": "same-origin",
          origin: "http://localhost",
          host: "localhost",
        }),
      ),
    ).toBe(false);
  });

  it("rechaza una petición de otro sitio", () => {
    expect(
      isCrossOriginRequest(
        request({
          "sec-fetch-site": "cross-site",
          origin: "https://malo.example",
        }),
      ),
    ).toBe(true);
  });

  it("rechaza un subdominio hermano (same-site no es same-origin)", () => {
    expect(isCrossOriginRequest(request({ "sec-fetch-site": "same-site" }))).toBe(
      true,
    );
  });

  it("sin Sec-Fetch-Site compara el Origin con el host", () => {
    expect(
      isCrossOriginRequest(
        request({ origin: "https://malo.example", host: "invitador.com" }),
      ),
    ).toBe(true);
    expect(
      isCrossOriginRequest(
        request({ origin: "https://invitador.com", host: "invitador.com" }),
      ),
    ).toBe(false);
  });

  it("rechaza un Origin ilegible y deja pasar a quien no manda cabeceras", () => {
    expect(
      isCrossOriginRequest(request({ origin: "null", host: "invitador.com" })),
    ).toBe(true);
    expect(isCrossOriginRequest(request({}))).toBe(false);
  });
});
