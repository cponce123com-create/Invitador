import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { emptyToNull } from "@/lib/events";
import { getClientIp } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRsvpRateLimit } from "@/lib/rate-limit";
import { createRsvpSchema } from "@/lib/validations/rsvp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint PÚBLICO de confirmación de asistencia.
 *
 * No requiere sesión (cualquiera con el link puede confirmar), así que:
 *  - se limita por IP para evitar spam;
 *  - solo acepta eventos activos;
 *  - el tope de acompañantes sale del propio evento, no del cliente.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await checkRsvpRateLimit(`rsvp:${ip}`);

  if (!limit.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Demasiadas confirmaciones desde esta conexión. Intenta en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos", 400);
  }

  const raw = body as Record<string, unknown>;
  const eventId = typeof raw.eventId === "string" ? raw.eventId.trim() : "";
  if (!eventId) return jsonError("Falta el evento", 400);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, isActive: true, maxGuestsPerRsvp: true },
  });

  if (!event || !event.isActive) {
    return jsonError("El evento no existe o ya no acepta confirmaciones", 404);
  }

  // Normalizamos antes de validar para no fallar si el cliente omite el arreglo.
  const parsed = createRsvpSchema(event.maxGuestsPerRsvp).safeParse({
    ...raw,
    additionalGuests: Array.isArray(raw.additionalGuests) ? raw.additionalGuests : [],
  });
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;
  // Si la persona no asiste, sus acompañantes no cuentan para nada.
  const additionalGuests =
    values.attendance === "SI" ? values.additionalGuests : [];

  const rsvp = await prisma.rsvp.create({
    data: {
      eventId: event.id,
      mainGuestName: values.mainGuestName.trim(),
      mainGuestPhone: emptyToNull(values.mainGuestPhone),
      attendance: values.attendance,
      message: emptyToNull(values.message),
      additionalGuests: {
        create: additionalGuests.map((guest) => ({
          name: guest.name.trim(),
          relation: guest.relation,
        })),
      },
    },
    select: { id: true, attendance: true },
  });

  return NextResponse.json({ rsvp }, { status: 201 });
}
