import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { isCrossOriginRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";
import { eventStatusSchema } from "@/lib/validations/event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

/**
 * Activa o desactiva un evento sin tocar el resto de sus datos.
 * Desactivarlo hace que la URL pública deje de existir (404).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const owned = await prisma.event.findFirst({
    where: { id: params.id, hostId: host.id },
    select: { id: true },
  });
  if (!owned) return jsonError("Evento no encontrado", 404);

  const parsed = eventStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const event = await prisma.event.update({
    where: { id: owned.id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ event });
}
