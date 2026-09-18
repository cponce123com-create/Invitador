import { NextResponse } from "next/server";
import { jsonError, jsonServerError, readJson, zodErrorResponse } from "@/lib/api";
import {
  createUniqueEventSlug,
  giftItemsBelongToHost,
  photosBelongToHost,
  toEventScalarData,
  toGiftItemData,
} from "@/lib/events";
import { isCrossOriginRequest } from "@/lib/http";
import { isForeignKeyConstraintError, prisma } from "@/lib/prisma";
import { getHostUsage, hostQuotaError } from "@/lib/quotas";
import { getCurrentHost } from "@/lib/session";
import { eventFormSchema } from "@/lib/validations/event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lista los eventos del anfitrión autenticado. */
export async function GET() {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const events = await prisma.event.findMany({
    where: { hostId: host.id },
    orderBy: { createdAt: "desc" },
    // Solo los campos de la tarjeta + los contadores: la descripción, el fondo
    // o el QR no se usan en un listado.
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      customLabel: true,
      eventDate: true,
      location: true,
      isActive: true,
      _count: { select: { rsvps: true, photos: true } },
    },
  });

  return NextResponse.json({ events });
}

/** Crea un evento y genera su slug público. */
export async function POST(request: Request) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const parsed = eventFormSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;

  // El `cloudinaryId` lo envía el cliente: solo se aceptan fotos de su carpeta.
  if (!photosBelongToHost(host.id, values.photos ?? [])) {
    return jsonError("Alguna de las fotos no pertenece a tu cuenta", 400);
  }

  // La foto de un regalo también la sube el anfitrión, así que se comprueba
  // contra su carpeta igual que las de la galería.
  if (!giftItemsBelongToHost(host.id, values.giftItems ?? [])) {
    return jsonError("Alguna foto del catálogo no pertenece a tu cuenta", 400);
  }

  // Cuota por anfitrión: los topes por evento no evitan que una sola cuenta
  // acumule eventos, fotos y regalos sin límite.
  const usage = await getHostUsage(host.id);
  const quotaError = hostQuotaError(usage, {
    events: 1,
    photos: (values.photos ?? []).length,
    giftItems: (values.giftItems ?? []).length,
  });
  if (quotaError) return jsonError(quotaError, 403);

  const slug = await createUniqueEventSlug(values.title);

  try {
    const event = await prisma.event.create({
      data: {
        ...toEventScalarData(values),
        slug,
        hostId: host.id,
        photos: {
          create: (values.photos ?? []).map((photo, index) => ({
            url: photo.url,
            cloudinaryId: photo.cloudinaryId,
            order: index,
          })),
        },
        giftItems: {
          create: (values.giftItems ?? []).map((item, index) => ({
            ...toGiftItemData(item),
            order: index,
          })),
        },
      },
      include: { photos: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    // Un `backgroundTemplateId` inexistente viola la clave foránea: es un dato
    // del formulario, no un fallo del servidor.
    if (isForeignKeyConstraintError(error)) {
      return jsonError("El fondo seleccionado no es válido.", 400);
    }
    return jsonServerError(request, "events", "No se pudo crear el evento", error);
  }
}
