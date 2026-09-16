// Utilidad de URLs segura para cliente y servidor: NO importa Prisma, el SDK de
// Cloudinary ni toca el DOM.

/**
 * Comprueba que un valor sea una URL `http` o `https`.
 *
 * `z.string().url()` (y `new URL()` sin mirar el protocolo) acepta cualquier
 * esquema, incluidos `javascript:`, `data:` o `vbscript:`. Todo enlace que se
 * pinte en un `href` debe pasar antes por aquí.
 */
export function isHttpUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
