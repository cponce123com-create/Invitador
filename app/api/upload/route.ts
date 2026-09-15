import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import {
  buildUploadEndpoint,
  createUploadSignature,
  getCloudinaryCredentials,
} from "@/lib/cloudinary";
import {
  ALLOWED_UPLOAD_FORMATS,
  CLOUDINARY_FOLDER_ROOT,
  MAX_UPLOAD_BYTES,
} from "@/lib/images";
import { getCurrentHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Devuelve la firma para subir una imagen directamente a Cloudinary desde el
 * navegador. El `api_secret` nunca sale del servidor: el cliente solo recibe la
 * firma, válida únicamente para esta carpeta y este timestamp.
 */
export async function POST() {
  const host = await getCurrentHost();
  if (!host) {
    return jsonError("Inicia sesión para subir fotos", 401);
  }

  try {
    const { cloudName, apiKey } = getCloudinaryCredentials();
    const timestamp = Math.round(Date.now() / 1000);
    // Carpeta por anfitrión: facilita auditar y limpiar assets en Cloudinary.
    const folder = `${CLOUDINARY_FOLDER_ROOT}/${host.id}`;

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature: createUploadSignature({ folder, timestamp }),
      uploadUrl: buildUploadEndpoint(cloudName),
      allowedFormats: ALLOWED_UPLOAD_FORMATS,
      maxFileBytes: MAX_UPLOAD_BYTES,
    });
  } catch (error) {
    console.error("[upload] Cloudinary no está configurado", error);
    return jsonError("La subida de imágenes no está configurada en el servidor.", 503);
  }
}
