import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { buildCsvFileName, rsvpsToCsv } from "@/lib/csv";
import { getHostEvent } from "@/lib/events";
import { getCurrentHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

/** Descarga la lista de invitados del evento en CSV. */
export async function GET(_request: Request, { params }: RouteContext) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const event = await getHostEvent(host.id, params.id);
  if (!event) return jsonError("Evento no encontrado", 404);

  return new NextResponse(rsvpsToCsv(event.rsvps), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildCsvFileName(event.slug)}"`,
      "Cache-Control": "no-store",
    },
  });
}
