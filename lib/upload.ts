// Utilidades de subida de imágenes a Cloudinary desde el navegador.
//
// NO importan el SDK de Cloudinary ni Prisma: el `api_secret` nunca sale del
// servidor, el cliente solo recibe la firma que emite `/api/upload`. Mismo
// criterio que `lib/images.ts`, para poder usar el módulo desde componentes de
// cliente sin arrastrar dependencias de servidor al bundle.

import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/images";

/** Respuesta del endpoint que firma la subida. */
export type UploadSignature = {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
  /** Formatos permitidos separados por coma (parámetro firmado `allowed_formats`). */
  allowedFormats: string;
};

/** Imagen recién subida a Cloudinary. */
export type UploadedImage = {
  url: string;
  cloudinaryId: string;
};

/** Forma mínima de un archivo: permite validar sin DOM (tests). */
export type ImageCandidate = {
  name: string;
  type: string;
  size: number;
};

type CloudinaryUploadResult = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

/**
 * Mensaje de error si el archivo no sirve como imagen del evento, o `null` si
 * pasa la validación.
 *
 * Es solo la primera barrera (evita subir lo que ya sabemos que Cloudinary va a
 * rechazar o lo que pasa del tope). El servidor vuelve a comprobar formato y
 * tamaño contra el asset real antes de guardarlo.
 */
export function validateImageFile(
  file: ImageCandidate,
  maxBytes: number = MAX_UPLOAD_BYTES,
): string | null {
  if (
    !ALLOWED_UPLOAD_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
    )
  ) {
    return `"${file.name}" no es JPG, PNG o WebP.`;
  }

  if (file.size > maxBytes) {
    return `"${file.name}" pesa más de ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }

  return null;
}

async function postSignatureRequest(
  endpoint: string,
  fallbackMessage: string,
  body?: Record<string, unknown>,
): Promise<UploadSignature> {
  const response = await fetch(endpoint, {
    method: "POST",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = (await response.json().catch(() => null)) as
    | (UploadSignature & { error?: string })
    | null;

  if (!response.ok || !data) {
    throw new Error(data?.error ?? fallbackMessage);
  }

  return data;
}

/** Firma para el anfitrión (formulario del evento en el dashboard). */
export function requestUploadSignature(): Promise<UploadSignature> {
  return postSignatureRequest(
    "/api/upload",
    "No pudimos preparar la subida de fotos.",
  );
}

/**
 * Firma para un invitado que sube el comprobante de su regalo. No hay sesión:
 * la firma queda acotada a la carpeta de ese evento.
 */
export function requestGiftUploadSignature(
  eventId: string,
): Promise<UploadSignature> {
  return postSignatureRequest(
    "/api/upload/gift",
    "No pudimos preparar la subida del comprobante.",
    { eventId },
  );
}

/**
 * Sube una imagen directamente a Cloudinary (navegador → Cloudinary, no pasa
 * por React) y devuelve su URL pública y su identificador.
 */
export async function uploadImageFile(
  file: File,
  signature: UploadSignature,
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  // Parámetro firmado: debe viajar con el mismo valor con el que se firmó, o
  // Cloudinary rechaza la petición por firma inválida. Aquí es donde Cloudinary
  // hace cumplir el formato de la imagen.
  formData.append("allowed_formats", signature.allowedFormats);

  const response = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => null)) as
    | CloudinaryUploadResult
    | null;

  if (!response.ok || !result?.secure_url || !result.public_id) {
    throw new Error(result?.error?.message ?? `No pudimos subir "${file.name}".`);
  }

  return { url: result.secure_url, cloudinaryId: result.public_id };
}
