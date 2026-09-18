import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api";
import {
  buildUploadEndpoint,
  createUploadSignature,
  getCloudinaryCredentials,
} from "@/lib/cloudinary";
import { ALLOWED_UPLOAD_FORMATS, CLOUDINARY_FOLDER_ROOT } from "@/lib/images";
import { checkUploadRateLimit } from "@/lib/rate-limit";
import { getCurrentHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Devuelve la firma para subir una imagen directamente a Cloudinary desde el
 * navegador. El `api_secret` nunca sale del servidor: el cliente solo recibe la
 * firma, válida únicamente para esta carpeta y este timestamp.
 *
 * La firma impone el formato (`allowed_formats`), pero no el tamaño: el Upload
 * API de Cloudinary no tiene un parámetro para eso, así que el tope de bytes se
 * comprueba después, contra el asset real, en los endpoints que lo guardan.
 */
export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) {
    return jsonError("Inicia sesión para subir fotos", 401);
  }

  // Tope por anfitrión: corta la petición masiva de firmas sin molestar a quien
  // crea un evento normal (30 fotos + portada + foto del lugar + QR ≈ 33).
  const gate = await checkUploadRateLimit(host.id);
  if (!gate.success) {
    return jsonError("Demasiadas subidas seguidas. Espera unos minutos.", 429);
  }

  try {
    const { cloudName, apiKey } = getCloudinaryCredentials();
    const timestamp = Math.round(Date.now() / 1000);
    // Carpeta por anfitrión: facilita auditar y limpiar assets en Cloudinary.
    const folder = `${CLOUDINARY_FOLDER_ROOT}/${host.id}`;
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
      "upload",
      "Cloudinary no está configurado",
      error,
      {
        status: 503,
        userMessage: "La subida de imágenes no está configurada en el servidor.",
      },
    );
  }
}
