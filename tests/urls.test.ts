import { describe, expect, it } from "vitest";
import { isHttpUrl } from "@/lib/urls";

describe("isHttpUrl", () => {
  it("acepta enlaces http y https", () => {
    expect(isHttpUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isHttpUrl("http://example.com/lugar")).toBe(true);
  });

  it("acepta espacios alrededor y el esquema en mayúsculas", () => {
    expect(isHttpUrl("  https://example.com  ")).toBe(true);
    expect(isHttpUrl("HTTPS://example.com")).toBe(true);
  });

  it("rechaza esquemas que ejecutan código o abren archivos", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
  });

  it("rechaza lo que no es una URL absoluta", () => {
    expect(isHttpUrl("maps.google.com/aqui")).toBe(false);
    expect(isHttpUrl("/relativa")).toBe(false);
  });

  it("rechaza valores vacíos o ausentes", () => {
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("   ")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});
