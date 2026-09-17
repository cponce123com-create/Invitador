import { v2 as cloudinary } from "cloudinary";

// Módulo de servidor: aquí vive el SDK de Cloudinary y el `api_secret`.
// Las utilidades de imagen aptas para el cliente están en `lib/images.ts`.

export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryCredentials(): CloudinaryCredentials {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary no está configurado: faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Genera la firma para una subida directa desde el navegador.
 * El `api_secret` NUNCA sale del servidor: solo viaja la firma resultante.
 *
 * Además de la carpeta y el timestamp se firman `allowed_formats` y
 * `max_bytes`. Cloudinary valida la firma contra los parámetros que recibe, así
 * que estos dos solo se hacen cumplir si viajan en la petición: los mismos
 * valores que se firman aquí deben enviarse en el `FormData` de `lib/upload.ts`.
 */
export function createUploadSignature(params: {
  folder: string;
  timestamp: number;
  /** Formatos permitidos separados por coma, como espera Cloudinary. */
  allowedFormats: string;
  /** Tamaño máximo del archivo en bytes. */
  maxBytes: number;
}): string {
  const { apiSecret } = getCloudinaryCredentials();
  return cloudinary.utils.api_sign_request(
    {
      folder: params.folder,
      timestamp: params.timestamp,
      allowed_formats: params.allowedFormats,
      max_bytes: params.maxBytes,
    },
    apiSecret,
  );
}

/** URL del endpoint de subida al que el navegador debe hacer POST. */
export function buildUploadEndpoint(cloudName: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

/**
 * Borra una imagen de Cloudinary a partir de su `public_id`.
 * Se llama al eliminar fotos o el evento completo. Nunca lanza: si falla, se
 * registra el error para no bloquear la operación en base de datos.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return result.result === "ok" || result.result === "not found";
  } catch (error) {
    console.error(`[cloudinary] No se pudo borrar la imagen ${publicId}`, error);
    return false;
  }
}
