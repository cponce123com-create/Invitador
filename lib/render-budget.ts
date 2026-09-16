// Presupuesto de render de la experiencia animada de la invitación.
//
// Módulo "puro": no toca el DOM, no importa Prisma ni el SDK de Cloudinary. Aquí
// vive la política de cuánto puede gastar la animación continua según el ancho
// de pantalla (densidad de partículas, densidad de píxeles del canvas y ritmo de
// fotogramas), para poder testearla en entorno `node` como el resto de `lib/`.
//
// El móvil es el destino real de esta página (el enlace se comparte por
// WhatsApp), así que el presupuesto se recorta ahí y se mantiene completo en
// pantallas grandes.

/** Por debajo de este ancho la pantalla se considera compacta (móvil). */
export const COMPACT_MAX_WIDTH = 640;

/** ¿Es una pantalla compacta? */
export function isCompactViewport(width: number): boolean {
  return width < COMPACT_MAX_WIDTH;
}

/**
 * Densidad de píxeles máxima del canvas. Los móviles con pantalla 3x
 * cuadruplicarían el área a redibujar sin ganancia visible: se limita a 1.5.
 */
export function maxCanvasPixelRatio(width: number): number {
  return isCompactViewport(width) ? 1.5 : 2;
}

/**
 * Milisegundos entre fotogramas del fondo ambiental: 30 fps en móvil (el doble
 * de tiempo por fotograma y la mitad de trabajo) y 60 fps en el resto.
 */
export function ambientFrameInterval(width: number): number {
  return isCompactViewport(width) ? 1000 / 30 : 1000 / 60;
}

/** Cuántas partículas ambientales mantener según el ancho. */
export function ambientParticleCount(width: number): number {
  if (isCompactViewport(width)) return 12;
  if (width < 1024) return 26;
  return 38;
}

/** Tamaño de una ráfaga de celebración según el ancho. */
export function burstParticleCount(width: number): number {
  if (isCompactViewport(width)) return 32;
  if (width < 1024) return 70;
  return 110;
}
