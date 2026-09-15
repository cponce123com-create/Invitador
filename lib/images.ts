// Utilidades de imagen seguras para el cliente: NO importan el SDK de Cloudinary
// ni Prisma, así que pueden usarse desde componentes de navegador sin arrastrar
// dependencias de servidor al bundle.

/** Carpeta raíz dentro de la cuenta de Cloudinary. */
export const CLOUDINARY_FOLDER_ROOT = "invitador";

/** 5 MB: suficiente para fotos de celular y mantiene la página liviana. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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
