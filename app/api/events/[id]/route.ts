import { NextResponse } from "next/server";
import { jsonError, jsonServerError, readJson, zodErrorResponse } from "@/lib/api";
import {
  deleteCloudinaryAssets,
  getHostEvent,
  giftItemsBelongToHost,
  photosBelongToHost,
  replacedSingleImageAssetIds,
  singleImageAssetIds,
  syncEventPhotos,
  syncGiftItems,
  toEventScalarData,
} from "@/lib/events";
import { isGiftAssetId, isHostAssetId } from "@/lib/images";
import { isCrossOriginRequest } from "@/lib/http";
import { isForeignKeyConstraintError, prisma } from "@/lib/prisma";
import { getHostUsage, hostQuotaError } from "@/lib/quotas";
import { getCurrentHost } from "@/lib/session";
import { eventFormSchema } from "@/lib/validations/event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const event = await getHostEvent(host.id, params.id);
  if (!event) return jsonError("Evento no encontrado", 404);

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const existing = await getHostEvent(host.id, params.id);
  if (!existing) return jsonError("Evento no encontrado", 404);

  const parsed = eventFormSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;

  // El `cloudinaryId` lo envía el cliente: solo se aceptan fotos de su carpeta.
  if (
    values.photos !== undefined &&
    !photosBelongToHost(host.id, values.photos)
  ) {
    return jsonError("Alguna de las fotos no pertenece a tu cuenta", 400);
  }

  // Las fotos del catálogo son fotos del anfitrión (no comprobantes), así que
  // se validan contra su misma carpeta.
  if (
    values.giftItems !== undefined &&
    !giftItemsBelongToHost(host.id, values.giftItems)
  ) {
    return jsonError("Alguna foto del catálogo no pertenece a tu cuenta", 400);
  }

  // Cuota por anfitrión: solo cuenta lo que cambia, así quitar fotos o regalos
  // libera cupo. Si el cliente no envía `photos`/`giftItems`, no se tocan.
  const usage = await getHostUsage(host.id);
  const quotaError = hostQuotaError(usage, {
    photos:
      values.photos === undefined
        ? 0
        : values.photos.length - existing.photos.length,
    giftItems:
      values.giftItems === undefined
        ? 0
        : values.giftItems.length - existing.giftItems.length,
  });
  if (quotaError) return jsonError(quotaError, 403);

  const scalarData = toEventScalarData(values);

  try {
    await prisma.event.update({
      where: { id: existing.id },
      data: scalarData,
    });
  } catch (error) {
    // Un `backgroundTemplateId` inexistente viola la clave foránea: es un dato
    // del formulario, no un fallo del servidor.
    if (isForeignKeyConstraintError(error)) {
      return jsonError("El fondo seleccionado no es válido.", 400);
    }
    return jsonServerError(
      request,
      "events",
      "No se pudo actualizar el evento",
      error,
    );
  }

  // Solo se reconcilian las fotos y el catálogo si el cliente los envió: así un
  // PATCH parcial nunca borra la galería ni los regalos por omisión.
  if (values.photos !== undefined) {
    await syncEventPhotos(existing.id, values.photos, host.id);
  }

  if (values.giftItems !== undefined) {
    await syncGiftItems(existing.id, values.giftItems, host.id);
  }

  // Las imágenes únicas (portada, lugar, QR, vestimenta) guardan la URL, no el
  // `public_id`: si el anfitrión las reemplazó o las quitó, el asset anterior
  // quedaría huérfano en Cloudinary, así que se borra aquí.
  await deleteCloudinaryAssets(
    replacedSingleImageAssetIds(host.id, existing, scalarData),
  );

  return NextResponse.json({ event: await getHostEvent(host.id, existing.id) });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const existing = await getHostEvent(host.id, params.id);
  if (!existing) return jsonError("Evento no encontrado", 404);

  // Los ids salen de la base, pero se filtran por carpeta igualmente: así nunca
  // se destruye un asset ajeno aunque una fila quedara manipulada.
  const cloudinaryIds = [
    ...existing.photos
      .map((photo) => photo.cloudinaryId)
      .filter((cloudinaryId) => isHostAssetId(host.id, cloudinaryId)),
    ...existing.giftItems
      .map((item) => item.cloudinaryId)
      .filter((cloudinaryId) => isHostAssetId(host.id, cloudinaryId)),
    ...existing.giftProofs
      .map((proof) => proof.cloudinaryId)
      .filter((cloudinaryId) => isGiftAssetId(existing.id, cloudinaryId)),
    // Las imágenes únicas (portada, lugar, QR, vestimenta) guardan la URL, no el
    // `public_id`: se deriva de la URL para borrar también esos assets.
    ...singleImageAssetIds(host.id, existing),
  ];

  // Primero la base de datos (el borrado en cascada elimina fotos, regalos,
  // RSVPs y comprobantes).
  await prisma.event.delete({ where: { id: existing.id } });
  // Después los assets externos, que no deben bloquear ni revertir el borrado.
  await deleteCloudinaryAssets(cloudinaryIds);

  return NextResponse.json({ ok: true });
}
