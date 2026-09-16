// Lógica pura del visor de fotos de la invitación: qué fotos mantiene montadas
// a la vez.
//
// Módulo "puro": no toca el DOM ni importa el SDK de Cloudinary, así que puede
// probarse en entorno `node` como el resto de `lib/`.
//
// Cada foto nueva del visor cuesta más de un segundo la primera vez que se pide
// (Cloudinary genera la transformación y Next la recodifica) y el navegador solo
// la guarda en caché 30 días. Si el visor monta únicamente la foto actual, la
// petición arranca *después* del clic y el visitante paga ese segundo en cada
// flecha; montando también las vecinas, pasar de foto es una lectura de caché.

/** Cuántas fotos se adelantan a cada lado de la actual. */
export const LIGHTBOX_PREFETCH_RADIUS = 1;

/**
 * Rango de fotos que el visor debe mantener montadas: la actual y `radius`
 * vecinas a cada lado, acotado a los límites del muro.
 *
 * Los índices son absolutos e inclusivos, listos para
 * `photos.slice(start, end + 1)`. Sin fotos devuelve un rango vacío.
 */
export function visiblePhotoRange(
  index: number,
  total: number,
  radius = LIGHTBOX_PREFETCH_RADIUS,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: -1 };

  const current = Math.min(Math.max(index, 0), total - 1);
  const reach = Math.max(radius, 0);

  return {
    start: Math.max(current - reach, 0),
    end: Math.min(current + reach, total - 1),
  };
}
