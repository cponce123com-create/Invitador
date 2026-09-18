// Utilidades de imagen seguras para el cliente: NO importan el SDK de Cloudinary
// ni Prisma, así que pueden usarse desde componentes de navegador sin arrastrar
// dependencias de servidor al bundle.

/** Carpeta raíz dentro de la cuenta de Cloudinary. */
export const CLOUDINARY_FOLDER_ROOT = "invitador";

/** Carpeta donde se guardan los comprobantes de regalo de un evento. */
export function giftAssetFolder(eventId: string): string {
  return `${CLOUDINARY_FOLDER_ROOT}/regalos/${eventId}`;
}

/**
 * Comprueba que un `public_id` de Cloudinary venga de la carpeta de regalos del
 * evento: así nadie puede enlazar el asset de otro evento (o de otra cuenta)
 * como si fuera su comprobante.
 */
export function isGiftAssetId(eventId: string, cloudinaryId: string): boolean {
  const prefix = `${giftAssetFolder(eventId)}/`;
  return cloudinaryId.startsWith(prefix) && cloudinaryId.length > prefix.length;
}

/** Carpeta donde se guardan las fotos de un anfitrión (portada, galería, QR…). */
export function hostAssetFolder(hostId: string): string {
  return `${CLOUDINARY_FOLDER_ROOT}/${hostId}`;
}

/**
 * Comprueba que un `public_id` de Cloudinary venga de la carpeta del anfitrión.
 *
 * El `cloudinaryId` lo envía el navegador, así que no es de fiar: sin esta
 * comprobación un anfitrión podría guardar el `public_id` de otro (que se
 * publica en la invitación) y hacer que el borrado posterior destruyera un asset
 * ajeno.
 */
export function isHostAssetId(hostId: string, cloudinaryId: string): boolean {
  const prefix = `${hostAssetFolder(hostId)}/`;
  return cloudinaryId.startsWith(prefix) && cloudinaryId.length > prefix.length;
}

/** Host de entrega de Cloudinary (de donde cuelgan las URLs guardadas). */
const CLOUDINARY_DELIVERY_HOST = "res.cloudinary.com";
/** Marca del tipo de recurso y del endpoint de subida dentro de la URL. */
const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/**
 * Extrae el `public_id` de una URL de entrega de Cloudinary, o `null` si la URL
 * no es de Cloudinary o no tiene el formato esperado (por ejemplo, un enlace
 * externo que el anfitrión pegó a mano).
 *
 * Hace falta porque las imágenes únicas del evento (portada, lugar, QR,
 * vestimenta) guardan la URL, no el `public_id`: para poder borrar el asset
 * cuando se reemplaza o se elimina el evento hay que recuperarlo de la URL.
 */
export function cloudinaryPublicIdFromUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.hostname !== CLOUDINARY_DELIVERY_HOST) return null;

  const markerIndex = parsed.pathname.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (markerIndex === -1) return null;

  const segments = parsed.pathname
    .slice(markerIndex + CLOUDINARY_UPLOAD_MARKER.length)
    .split("/")
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;

  // Descarta transformaciones y el segmento de versión (`v123`): el `public_id`
  // empieza justo después.
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const assetSegments =
    versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  if (assetSegments.length === 0) return null;

  // El último segmento incluye la extensión del archivo.
  const lastIndex = assetSegments.length - 1;
  const dotIndex = assetSegments[lastIndex].lastIndexOf(".");
  if (dotIndex > 0) {
    assetSegments[lastIndex] = assetSegments[lastIndex].slice(0, dotIndex);
  }

  const publicId = assetSegments.join("/");
  return publicId.length > 0 ? publicId : null;
}

/** 5 MB: suficiente para fotos de celular y mantiene la página liviana. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Datos mínimos que Cloudinary reporta de un asset ya subido. */
export type UploadedAssetInfo = {
  bytes: number;
  format: string;
};

/**
 * Mensaje de error si el asset subido no tiene un formato permitido o pasa del
 * tamaño máximo; `null` si es correcto.
 *
 * La firma solo hace cumplir `allowed_formats`: Cloudinary no tiene un
 * parámetro de tamaño, así que el tope de bytes se comprueba aquí, contra lo
 * que Cloudinary reporta del asset real, no contra lo que diga el navegador.
 */
export function uploadedAssetError(info: UploadedAssetInfo): string | null {
  if (
    !ALLOWED_UPLOAD_FORMATS.includes(
      info.format.toLowerCase() as (typeof ALLOWED_UPLOAD_FORMATS)[number],
    )
  ) {
    return "El formato de la imagen no está permitido.";
  }

  if (info.bytes > MAX_UPLOAD_BYTES) {
    return `La imagen pesa más de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`;
  }

  return null;
}

/**
 * Inserta transformaciones de Cloudinary en una URL ya subida.
 * `f_auto` sirve WebP/AVIF según el navegador y `q_auto` optimiza el peso:
 * clave para que la invitación cargue rápido con datos móviles.
 */
export function optimizedImageUrl(url: string, width = 800): string {
  if (!url.includes("/image/upload/")) return url;
  return url.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,dpr_auto,c_limit,w_${width}/`,
  );
}

/** Variante recortada 1200x630 para las meta tags Open Graph (WhatsApp). */
export function socialImageUrl(url: string): string {
  if (!url.includes("/image/upload/")) return url;
  return url.replace(
    "/image/upload/",
    "/image/upload/f_auto,q_auto,c_fill,g_auto,w_1200,h_630/",
  );
}
