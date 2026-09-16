import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import {
  deleteCloudinaryAssets,
  getHostEvent,
  photosBelongToHost,
  syncEventPhotos,
  toEventScalarData,
} from "@/lib/events";
import { isGiftAssetId, isHostAssetId } from "@/lib/images";
import { prisma } from "@/lib/prisma";
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

  await prisma.event.update({
    where: { id: existing.id },
    data: toEventScalarData(values),
  });

  // Solo se reconcilian las fotos si el cliente las envió: así un PATCH parcial
  // nunca borra la galería por omisión.
  if (values.photos !== undefined) {
    await syncEventPhotos(existing.id, values.photos, host.id);
  }

  return NextResponse.json({ event: await getHostEvent(host.id, existing.id) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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
    ...existing.giftProofs
      .map((proof) => proof.cloudinaryId)
      .filter((cloudinaryId) => isGiftAssetId(existing.id, cloudinaryId)),
  ];

  // Primero la base de datos (el borrado en cascada elimina fotos, RSVPs y comprobantes).
  await prisma.event.delete({ where: { id: existing.id } });
  // Después los assets externos, que no deben bloquear ni revertir el borrado.
  await deleteCloudinaryAssets(cloudinaryIds);

  return NextResponse.json({ ok: true });
}
