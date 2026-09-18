import { NextResponse } from "next/server";
import { jsonError, jsonServerError, readJson } from "@/lib/api";
import {
  buildUploadEndpoint,
  createUploadSignature,
  getCloudinaryCredentials,
} from "@/lib/cloudinary";
import { getClientIp } from "@/lib/http";
import { ALLOWED_UPLOAD_FORMATS, giftAssetFolder } from "@/lib/images";
import { prisma } from "@/lib/prisma";
import { checkGiftRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Firma la subida del comprobante de regalo de un invitado.
 *
 * Es un endpoint PÚBLICO (no hay sesión: cualquiera con el link puede subir su
 * comprobante), así que se limita por IP, solo firma para eventos activos y
 * acota la carpeta al evento. El endpoint que guarda el comprobante rechaza
 * cualquier asset que no venga de esa carpeta y vuelve a comprobar su formato y
 * tamaño contra Cloudinary.
 */
export async function POST(request: Request) {
  const limit = await checkGiftRateLimit(`upload:${getClientIp(request)}`);
  if (!limit.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Demasiadas subidas desde esta conexión. Intenta en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const body = await readJson(request);
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const eventId = typeof raw.eventId === "string" ? raw.eventId.trim() : "";
  if (!eventId) return jsonError("Falta el evento", 400);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, isActive: true },
  });

  if (!event || !event.isActive) {
    return jsonError("El evento no existe o ya no acepta regalos", 404);
  }

  try {
    const { cloudName, apiKey } = getCloudinaryCredentials();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = giftAssetFolder(event.id);
    const allowedFormats = ALLOWED_UPLOAD_FORMATS.join(",");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature: createUploadSignature({ folder, timestamp, allowedFormats }),
      uploadUrl: buildUploadEndpoint(cloudName),
      allowedFormats,
    });
  } catch (error) {
    return jsonServerError(
      request,
      "upload/gift",
      "Cloudinary no está configurado",
      error,
      {
        status: 503,
        userMessage:
          "La subida de comprobantes no está configurada en el servidor.",
      },
    );
  }
}
