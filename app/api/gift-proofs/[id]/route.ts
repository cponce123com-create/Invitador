import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { deleteCloudinaryAssets } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

/**
 * Borra un comprobante de regalo.
 *
 * Solo puede hacerlo el anfitrión dueño del evento: la consulta filtra por la
 * relación con el evento, así que el id de otro anfitrión da 404.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const proof = await prisma.giftProof.findFirst({
    where: { id: params.id, event: { hostId: host.id } },
    select: { id: true, cloudinaryId: true },
  });
  if (!proof) return jsonError("Comprobante no encontrado", 404);

  // Primero la base de datos; el asset externo no debe bloquear ni revertir el
  // borrado ya confirmado.
  await prisma.giftProof.delete({ where: { id: proof.id } });
  await deleteCloudinaryAssets([proof.cloudinaryId]);

  return NextResponse.json({ ok: true });
}
