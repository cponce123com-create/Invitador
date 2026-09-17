import { cache } from "react";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/constants";
import { parsePriceToCents, parseWallClockInput } from "@/lib/format";
import { isGiftAssetId, isHostAssetId } from "@/lib/images";
import { prisma } from "@/lib/prisma";
import { buildEventSlug } from "@/lib/slug";
import type { EventFormValues } from "@/lib/validations/event";

/** Convierte "" (campo vacío de un formulario) en `null` para la base de datos. */
export function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Convierte el valor de fecha del formulario en `Date`.
 * El valor se interpreta como "hora de pared" en UTC (ver `lib/format.ts`).
 */
export function toEventDate(value?: string | null): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const wallClock = parseWallClockInput(trimmed);
  if (wallClock) return wallClock;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Campos escalares de `Event` derivados del formulario validado. */
export function toEventScalarData(values: EventFormValues) {
  return {
    title: values.title.trim(),
    type: values.type,
    customLabel: emptyToNull(values.customLabel),
    ageOrDetail: emptyToNull(values.ageOrDetail),
    eventDate: toEventDate(values.eventDate),
    rsvpDeadline: toEventDate(values.rsvpDeadline),
    location: emptyToNull(values.location),
    locationImageUrl: emptyToNull(values.locationImageUrl),
    mapUrl: emptyToNull(values.mapUrl),
    description: emptyToNull(values.description),
    coverImageUrl: emptyToNull(values.coverImageUrl),
    giftQrUrl: emptyToNull(values.giftQrUrl),
    giftMessage: emptyToNull(values.giftMessage),
    dressCodeImageUrl: emptyToNull(values.dressCodeImageUrl),
    musicTrack: emptyToNull(values.musicTrack),
    backgroundTemplateId: emptyToNull(values.backgroundTemplateId),
    maxGuestsPerRsvp: values.maxGuestsPerRsvp,
    ...(values.isActive === undefined ? {} : { isActive: values.isActive }),
  };
}

/**
 * Genera un slug único comprobando contra la base de datos.
 * Si los primeros intentos chocan, alarga el sufijo aleatorio.
 */
export async function createUniqueEventSlug(title: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = buildEventSlug(title, attempt < 3 ? 4 : 6);
    const existing = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  return buildEventSlug(title, 10);
}

/**
 * `true` si TODAS las fotos apuntan a un asset de la carpeta de Cloudinary de
 * este anfitrión.
 *
 * El `cloudinaryId` viaja en el formulario, así que hay que comprobar que el
 * asset es suyo antes de guardarlo: si no, un anfitrión podría guardar el
 * `public_id` de otro y borrárselo después.
 */
export function photosBelongToHost(
  hostId: string,
  photos: EventFormValues["photos"],
): boolean {
  return (photos ?? []).every((photo) =>
    isHostAssetId(hostId, photo.cloudinaryId),
  );
}

/**
 * Reconcilia las fotos enviadas por el formulario con las guardadas.
 *
 * - Las fotos que ya no vienen en el payload se borran de la base y de Cloudinary.
 * - Las que se mantienen se reordenan.
 * - Las nuevas se crean.
 *
 * Solo se aceptan ids de fotos que pertenecen a este evento: así un anfitrión no
 * puede "robar" fotos de otro evento enviando su id. Y solo se destruyen assets
 * que estén dentro de su propia carpeta de Cloudinary.
 */
export async function syncEventPhotos(
  eventId: string,
  photos: EventFormValues["photos"],
  hostId: string,
): Promise<void> {
  const incoming = photos ?? [];
  const existing = await prisma.eventPhoto.findMany({
    where: { eventId },
    select: { id: true, cloudinaryId: true },
  });
  const existingIds = new Set(existing.map((photo) => photo.id));
  const incomingIds = new Set(
    incoming.map((photo) => photo.id).filter((id): id is string => Boolean(id)),
  );

  const removed = existing.filter((photo) => !incomingIds.has(photo.id));

  await prisma.$transaction([
    ...removed.map((photo) =>
      prisma.eventPhoto.delete({ where: { id: photo.id } }),
    ),
    ...incoming.map((photo, index) => {
      const data = {
        url: photo.url,
        cloudinaryId: photo.cloudinaryId,
        order: index,
      };
      if (photo.id && existingIds.has(photo.id)) {
        return prisma.eventPhoto.update({ where: { id: photo.id }, data });
      }
      return prisma.eventPhoto.create({ data: { ...data, eventId } });
    }),
  ]);

  // El borrado en Cloudinary va fuera de la transacción: es un servicio externo
  // y no debe hacer rollback de los cambios ya confirmados en la base. Solo se
  // destruyen assets de la carpeta de este anfitrión.
  const removable = removed.filter((photo) =>
    isHostAssetId(hostId, photo.cloudinaryId),
  );
  if (removable.length > 0) {
    await Promise.all(
      removable.map((photo) => deleteCloudinaryImage(photo.cloudinaryId)),
    );
  }
}

/** Un artículo del catálogo tal como lo envía el formulario. */
type GiftItemInput = NonNullable<EventFormValues["giftItems"]>[number];

/** Campos de `GiftItem` derivados del formulario validado. */
export function toGiftItemData(item: GiftItemInput) {
  return {
    title: item.title.trim(),
    description: emptyToNull(item.description),
    priceCents: parsePriceToCents(item.price),
    imageUrl: item.imageUrl,
    cloudinaryId: item.cloudinaryId,
  };
}

/**
 * `true` si TODAS las fotos del catálogo apuntan a un asset de la carpeta de
 * Cloudinary de este anfitrión.
 *
 * La foto de un artículo la sube el anfitrión (no es un comprobante de
 * invitado), así que se valida con `isHostAssetId`: si no, un anfitrión podría
 * guardar el `public_id` de otro y borrárselo después.
 */
export function giftItemsBelongToHost(
  hostId: string,
  items: EventFormValues["giftItems"],
): boolean {
  return (items ?? []).every((item) =>
    isHostAssetId(hostId, item.cloudinaryId),
  );
}

/**
 * Reconcilia el catálogo de regalos enviado por el formulario con el guardado.
 *
 * - Los artículos que ya no vienen en el payload se borran de la base y su foto
 *   de Cloudinary.
 * - Los que se mantienen se reordenan según el orden del formulario.
 * - Los nuevos se crean.
 *
 * Solo se aceptan ids de artículos de este evento: así un anfitrión no puede
 * "robar" el artículo de otro evento enviando su id. Los comprobantes ya
 * recibidos no se pierden: la relación es `onDelete: SetNull`, así que quedan
 * sin artículo asignado.
 */
export async function syncGiftItems(
  eventId: string,
  items: EventFormValues["giftItems"],
  hostId: string,
): Promise<void> {
  const incoming = items ?? [];
  const existing = await prisma.giftItem.findMany({
    where: { eventId },
    select: { id: true, cloudinaryId: true },
  });
  const existingIds = new Set(existing.map((item) => item.id));
  const incomingIds = new Set(
    incoming.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );

  const removed = existing.filter((item) => !incomingIds.has(item.id));

  await prisma.$transaction([
    ...removed.map((item) =>
      prisma.giftItem.delete({ where: { id: item.id } }),
    ),
    ...incoming.map((item, index) => {
      const data = { ...toGiftItemData(item), order: index };
      if (item.id && existingIds.has(item.id)) {
        return prisma.giftItem.update({ where: { id: item.id }, data });
      }
      return prisma.giftItem.create({ data: { ...data, eventId } });
    }),
  ]);

  // Igual que con las fotos: el borrado en Cloudinary va fuera de la transacción
  // (servicio externo) y solo toca assets de la carpeta de este anfitrión.
  const removable = removed.filter((item) =>
    isHostAssetId(hostId, item.cloudinaryId),
  );
  if (removable.length > 0) {
    await Promise.all(
      removable.map((item) => deleteCloudinaryImage(item.cloudinaryId)),
    );
  }
}

/**
 * Borra de Cloudinary una lista de assets del evento (fotos de la galería,
 * comprobantes de regalo…). Nunca lanza: el asset externo no debe bloquear ni
 * revertir un borrado ya confirmado en la base de datos.
 */
export async function deleteCloudinaryAssets(cloudinaryIds: string[]): Promise<void> {
  if (cloudinaryIds.length === 0) return;
  await Promise.all(cloudinaryIds.map((id) => deleteCloudinaryImage(id)));
}

export const eventDetailInclude = {
  backgroundTemplate: true,
  photos: { orderBy: { order: "asc" } },
  rsvps: {
    orderBy: { createdAt: "desc" },
    include: { additionalGuests: { orderBy: { createdAt: "asc" } } },
  },
  // El panel muestra a qué regalo corresponde cada comprobante, así que el
  // listado del anfitrión trae el título del artículo.
  giftProofs: {
    orderBy: { createdAt: "desc" },
    include: { giftItem: { select: { id: true, title: true } } },
  },
  giftItems: { orderBy: { order: "asc" } },
} as const;

/**
 * `cache` de React existe en el React con el que Next sirve las páginas, pero no
 * en el paquete `react` que Vitest importa en node puro (ahí llega `undefined`).
 * Se degrada a una función sin caché: memorizar por petición es una
 * optimización, no un requisito de corrección.
 */
const requestCache: typeof cache =
  typeof cache === "function" ? cache : (fn) => fn;

/**
 * Evento de un anfitrión concreto (o `null` si no es suyo).
 *
 * Va envuelto en `requestCache`: en una misma petición la página y sus
 * metadatos piden el mismo evento, así que se consulta una sola vez.
 */
export const getHostEvent = requestCache(
  async (hostId: string, eventId: string) => {
    return prisma.event.findFirst({
      where: { id: eventId, hostId },
      include: eventDetailInclude,
    });
  },
);

/** Evento público por slug. Solo devuelve eventos activos. */
export const getPublicEventBySlug = requestCache(async (slug: string) => {
  return prisma.event.findFirst({
    where: { slug, isActive: true },
    include: {
      backgroundTemplate: true,
      photos: { orderBy: { order: "asc" } },
      host: { select: { name: true } },
      // El catálogo necesita saber cuántos comprobantes tiene cada artículo para
      // mostrar «Ya lo apartó N persona(s)» sin traerse los comprobantes.
      giftItems: {
        orderBy: { order: "asc" },
        include: { _count: { select: { proofs: true } } },
      },
    },
  });
});

export type EventStats = {
  yes: number;
  no: number;
  maybe: number;
  totalRsvps: number;
  /** Personas confirmadas = invitados principales con "Sí" + sus acompañantes. */
  totalPeople: number;
};

type StatsRsvp = {
  attendance: AttendanceStatusValue;
  additionalGuests: { id: string }[];
};

/** Resumen de confirmaciones para el dashboard del anfitrión. */
export function computeEventStats(rsvps: readonly StatsRsvp[]): EventStats {
  const stats: EventStats = {
    yes: 0,
    no: 0,
    maybe: 0,
    totalRsvps: rsvps.length,
    totalPeople: 0,
  };

  for (const rsvp of rsvps) {
    if (rsvp.attendance === "SI") {
      stats.yes += 1;
      stats.totalPeople += 1 + rsvp.additionalGuests.length;
    } else if (rsvp.attendance === "NO") {
      stats.no += 1;
    } else {
      stats.maybe += 1;
    }
  }

  return stats;
}

/** Cuenta de confirmaciones por estado, para las tarjetas del dashboard. */
export function emptyAttendanceCounters(): Record<AttendanceStatusValue, number> {
  return ATTENDANCE_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<AttendanceStatusValue, number>,
  );
}
