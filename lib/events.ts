import { deleteCloudinaryImage } from "@/lib/cloudinary";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/constants";
import { parseWallClockInput } from "@/lib/format";
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
    location: emptyToNull(values.location),
    locationImageUrl: emptyToNull(values.locationImageUrl),
    mapUrl: emptyToNull(values.mapUrl),
    description: emptyToNull(values.description),
    coverImageUrl: emptyToNull(values.coverImageUrl),
    giftQrUrl: emptyToNull(values.giftQrUrl),
    giftMessage: emptyToNull(values.giftMessage),
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
 * Reconcilia las fotos enviadas por el formulario con las guardadas.
 *
 * - Las fotos que ya no vienen en el payload se borran de la base y de Cloudinary.
 * - Las que se mantienen se reordenan.
 * - Las nuevas se crean.
 *
 * Solo se aceptan ids de fotos que pertenecen a este evento: así un anfitrión no
 * puede "robar" fotos de otro evento enviando su id.
 */
export async function syncEventPhotos(
  eventId: string,
  photos: EventFormValues["photos"],
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
  // y no debe hacer rollback de los cambios ya confirmados en la base.
  if (removed.length > 0) {
    await Promise.all(removed.map((photo) => deleteCloudinaryImage(photo.cloudinaryId)));
  }
}

/** Borra de Cloudinary todas las fotos de un evento (al eliminar el evento). */
export async function deleteEventPhotosFromCloudinary(cloudinaryIds: string[]): Promise<void> {
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
} as const;

/** Evento de un anfitrión concreto (o `null` si no es suyo). */
export async function getHostEvent(hostId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, hostId },
    include: eventDetailInclude,
  });
}

/** Evento público por slug. Solo devuelve eventos activos. */
export async function getPublicEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, isActive: true },
    include: {
      backgroundTemplate: true,
      photos: { orderBy: { order: "asc" } },
      host: { select: { name: true } },
    },
  });
}

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
