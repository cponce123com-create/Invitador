import { v2 as cloudinary } from "cloudinary";
import { logError } from "@/lib/logger";

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

/** Configura el SDK con las credenciales del entorno y las devuelve. */
function configureCloudinary(): CloudinaryCredentials {
  const credentials = getCloudinaryCredentials();
  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  });
  return credentials;
}

/**
 * Genera la firma para una subida directa desde el navegador.
 * El `api_secret` NUNCA sale del servidor: solo viaja la firma resultante.
 *
 * Solo se firma lo que Cloudinary puede hacer cumplir: la carpeta, el timestamp
 * y `allowed_formats`. NO se firma un límite de tamaño porque el Upload API no
 * tiene un parámetro para eso; el tope de bytes se comprueba después, contra el
 * asset real, con `fetchUploadedImageInfo` + `uploadedAssetError`.
 */
export function createUploadSignature(params: {
  folder: string;
  timestamp: number;
  /** Formatos permitidos separados por coma, como espera Cloudinary. */
  allowedFormats: string;
}): string {
  const { apiSecret } = getCloudinaryCredentials();
  return cloudinary.utils.api_sign_request(
    {
      folder: params.folder,
      timestamp: params.timestamp,
      allowed_formats: params.allowedFormats,
    },
    apiSecret,
  );
}

/** URL del endpoint de subida al que el navegador debe hacer POST. */
export function buildUploadEndpoint(cloudName: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

/** Datos que Cloudinary reporta de un asset ya subido. */
export type UploadedImageInfo = {
  bytes: number;
  format: string;
};

/**
 * Consulta en Cloudinary un asset ya subido.
 *
 * Es la única forma de comprobar en el servidor lo que la firma no puede
 * imponer: el tamaño real del archivo. Se consulta como `image`, así que un
 * asset de otro tipo simplemente no aparece. Devuelve `null` si el asset no
 * existe o si la consulta falla (el llamador debe tratarlo como no válido).
 */
export async function fetchUploadedImageInfo(
  publicId: string,
): Promise<UploadedImageInfo | null> {
  try {
    configureCloudinary();
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: "image",
    });
    return { bytes: resource.bytes, format: resource.format };
  } catch (error) {
    logError("cloudinary", "No se pudo consultar el asset", { publicId, error });
    return null;
  }
}

/**
 * Borra una imagen de Cloudinary a partir de su `public_id`.
 * Se llama al eliminar fotos, el evento completo o un comprobante rechazado.
 * Nunca lanza: si falla, se registra el error para no bloquear la operación en
 * base de datos.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    configureCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return result.result === "ok" || result.result === "not found";
  } catch (error) {
    logError("cloudinary", "No se pudo borrar la imagen", { publicId, error });
    return false;
  }
}
