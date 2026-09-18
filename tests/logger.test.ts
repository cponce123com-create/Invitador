// Pruebas del logger estructurado: cada llamada debe emitir UNA línea JSON con
// el nivel, el scope, el mensaje y, si existe, el `requestId` y el error.
import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, serializeError } from "@/lib/logger";

describe("serializeError", () => {
  it("extrae nombre, mensaje y traza de un Error", () => {
    const serialized = serializeError(new Error("boom"));

    expect(serialized).toMatchObject({ name: "Error", message: "boom" });
    expect(typeof serialized.stack).toBe("string");
  });

  it("convierte un valor que no es Error en texto", () => {
    expect(serializeError("vaya")).toEqual({ value: "vaya" });
    expect(serializeError(42)).toEqual({ value: "42" });
  });
});

describe("logError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escribe una línea JSON con scope, requestId y el error serializado", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("events", "No se pudo crear el evento", {
      requestId: "req-123",
      error: new Error("boom"),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      level: "error",
      scope: "events",
      message: "No se pudo crear el evento",
      requestId: "req-123",
    });
    expect(entry.error).toMatchObject({ name: "Error", message: "boom" });
  });

  it("omite la clave error cuando no se pasa contexto", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logError("health", "sin contexto");

    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).not.toHaveProperty("error");
    expect(entry).not.toHaveProperty("requestId");
  });
});
