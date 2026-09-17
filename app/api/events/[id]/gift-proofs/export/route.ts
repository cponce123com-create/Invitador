import { jsonError } from "@/lib/api";
import { buildCsvFileName, giftProofsToCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

/** Descarga en CSV los comprobantes de regalo de un evento (solo el anfitrión). */
export async function GET(_request: Request, { params }: RouteContext) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const event = await prisma.event.findFirst({
    where: { id: params.id, hostId: host.id },
    select: {
      slug: true,
      giftProofs: {
        orderBy: { createdAt: "desc" },
        // El CSV indica a qué regalo del catálogo corresponde cada comprobante.
        include: { giftItem: { select: { title: true } } },
      },
    },
  });
  if (!event) return jsonError("Evento no encontrado", 404);

  const csv = giftProofsToCsv(event.giftProofs);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildCsvFileName(event.slug, "regalos")}"`,
      "Cache-Control": "no-store",
    },
  });
}
