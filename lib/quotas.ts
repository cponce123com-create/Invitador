import {
  MAX_EVENTS_PER_HOST,
  MAX_GIFT_ITEMS_PER_HOST,
  MAX_PHOTOS_PER_HOST,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Cuotas por anfitrión.
 *
 * Los topes por evento (`MAX_EVENT_PHOTOS`, `MAX_GIFT_ITEMS`…) acotan lo que
 * cabe en UN evento, pero no lo que un anfitrión acumula creando muchos: sin
 * una cuota por cuenta, un solo usuario podría llenar la base de datos y la
 * cuenta de Cloudinary. Aquí se cuenta lo que tiene el anfitrión y se decide si
 * el cambio propuesto cabe.
 */

/** Uso actual de un anfitrión. */
export type HostUsage = {
  events: number;
  photos: number;
  giftItems: number;
};

/** Cambio propuesto sobre el uso (puede ser negativo al quitar fotos o regalos). */
export type HostUsageDelta = Partial<HostUsage>;

/** Cuenta los eventos, fotos de galería y artículos de catálogo del anfitrión. */
export async function getHostUsage(hostId: string): Promise<HostUsage> {
  const [events, photos, giftItems] = await Promise.all([
    prisma.event.count({ where: { hostId } }),
    prisma.eventPhoto.count({ where: { event: { hostId } } }),
    prisma.giftItem.count({ where: { event: { hostId } } }),
  ]);

  return { events, photos, giftItems };
}

/**
 * Mensaje si el uso tras aplicar `delta` supera alguna cuota y además supone un
 * AUMENTO respecto al uso actual; `null` si el cambio cabe.
 *
 * El requisito de que aumente permite que un anfitrión que ya esté por encima
 * (por ejemplo, con datos anteriores a la cuota) siga editando y reduciendo,
 * pero no seguir creciendo.
 */
export function hostQuotaError(
  current: HostUsage,
  delta: HostUsageDelta,
): string | null {
  const exceeds = (key: keyof HostUsage, cap: number) => {
    const next = current[key] + (delta[key] ?? 0);
    return next > cap && next > current[key];
  };

  if (exceeds("events", MAX_EVENTS_PER_HOST)) {
    return `Llegaste al máximo de ${MAX_EVENTS_PER_HOST} eventos.`;
  }
  if (exceeds("photos", MAX_PHOTOS_PER_HOST)) {
    return `Llegaste al máximo de ${MAX_PHOTOS_PER_HOST} fotos en total.`;
  }
  if (exceeds("giftItems", MAX_GIFT_ITEMS_PER_HOST)) {
    return `Llegaste al máximo de ${MAX_GIFT_ITEMS_PER_HOST} regalos en total.`;
  }

  return null;
}
