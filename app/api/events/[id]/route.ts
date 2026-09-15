import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import {
  deleteEventPhotosFromCloudinary,
  getHostEvent,
  syncEventPhotos,
  toEventScalarData,
} from "@/lib/events";
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

  await prisma.event.update({
    where: { id: existing.id },
    data: toEventScalarData(values),
  });

  // Solo se reconcilian las fotos si el cliente las envió: así un PATCH parcial
  // nunca borra la galería por omisión.
  if (values.photos !== undefined) {
    await syncEventPhotos(existing.id, values.photos);
  }

  return NextResponse.json({ event: await getHostEvent(host.id, existing.id) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const existing = await getHostEvent(host.id, params.id);
  if (!existing) return jsonError("Evento no encontrado", 404);

  const cloudinaryIds = existing.photos.map((photo) => photo.cloudinaryId);

  // Primero la base de datos (el borrado en cascada elimina fotos y RSVPs).
  await prisma.event.delete({ where: { id: existing.id } });
  // Después los assets externos, que no deben bloquear ni revertir el borrado.
  await deleteEventPhotosFromCloudinary(cloudinaryIds);

  return NextResponse.json({ ok: true });
}
