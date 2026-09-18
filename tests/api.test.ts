// Pruebas del límite de tamaño del cuerpo JSON: un payload enorme debe
// rechazarse sin cargarse entero en memoria.
import { describe, expect, it } from "vitest";
import { MAX_JSON_BODY_BYTES, readJson } from "@/lib/api";

function jsonRequest(body: string) {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

/** Cuerpo enviado como stream: undici no añade `Content-Length`, así que se
 * ejercita la lectura acotada en streaming. */
function streamRequest(body: string) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });

  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit);
}

const oversizedBody = JSON.stringify({ data: "a".repeat(MAX_JSON_BODY_BYTES) });

describe("readJson", () => {
  it("lee un cuerpo JSON válido", async () => {
    await expect(readJson(jsonRequest('{"a":1}'))).resolves.toEqual({ a: 1 });
  });

  it("devuelve null si el cuerpo está vacío o mal formado", async () => {
    await expect(readJson(jsonRequest(""))).resolves.toBeNull();
    await expect(readJson(jsonRequest("no-es-json"))).resolves.toBeNull();
  });

  it("rechaza por Content-Length un cuerpo que pasa del límite", async () => {
    await expect(readJson(jsonRequest(oversizedBody))).resolves.toBeNull();
  });

  it("corta la lectura en streaming aunque no haya Content-Length", async () => {
    await expect(readJson(streamRequest(oversizedBody))).resolves.toBeNull();
  });

  it("acepta un cuerpo justo por debajo del límite", async () => {
    const body = JSON.stringify({ data: "a".repeat(1024) });
    await expect(readJson(jsonRequest(body))).resolves.toEqual({
      data: "a".repeat(1024),
    });
  });
});
