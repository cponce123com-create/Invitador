import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getRequestId, REQUEST_ID_HEADER } from "@/lib/http";
import { logError } from "@/lib/logger";

/** Error JSON uniforme para todos los endpoints. */
export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Respuesta de error inesperado (5xx).
 *
 * Registra el fallo con un `requestId` y lo devuelve tanto en el cuerpo como en
 * la cabecera `x-request-id`, para poder cruzar el error que reporta el usuario
 * con la línea del servidor. El detalle técnico se queda solo en el log.
 */
export function jsonServerError(
  request: Request,
  scope: string,
  logMessage: string,
  error: unknown,
  options?: { status?: number; userMessage?: string },
): NextResponse {
  const requestId = getRequestId(request);
  logError(scope, logMessage, { requestId, error });

  return NextResponse.json(
    {
      error:
        options?.userMessage ??
        "No pudimos completar la operación. Intenta de nuevo.",
      requestId,
    },
    {
      status: options?.status ?? 500,
      headers: { [REQUEST_ID_HEADER]: requestId },
    },
  );
}

/** 422 con el detalle de los campos inválidos (útil para depurar desde el cliente). */
export function zodErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Revisa los datos del formulario",
      issues: error.flatten().fieldErrors,
    },
    { status: 422 },
  );
}

/**
 * Cuerpo máximo aceptado en una petición JSON (256 KB).
 *
 * Los formularios más grandes del proyecto son el de evento (fotos + catálogo)
 * y el de RSVP; 256 KB deja margen de sobra y evita que un cuerpo enorme se
 * cargue entero en memoria.
 */
export const MAX_JSON_BODY_BYTES = 256 * 1024;

/**
 * Lee el cuerpo como texto sin superar `limit` bytes.
 * Devuelve `null` en cuanto se pasa del límite y corta la lectura, de modo que
 * un cuerpo enorme no llega a cargarse completo en memoria.
 */
async function readBodyWithLimit(
  request: Request,
  limit: number,
): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(contentLength) && contentLength > limit) return null;

  const stream = request.body;
  if (!stream) return "";

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}

/**
 * Lee el cuerpo JSON sin lanzar si viene vacío, mal formado o demasiado grande
 * (en todos esos casos devuelve `null`).
 */
export async function readJson(request: Request): Promise<unknown> {
  const text = await readBodyWithLimit(request, MAX_JSON_BODY_BYTES);
  if (text === null || text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
