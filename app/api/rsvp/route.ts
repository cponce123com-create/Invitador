import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { MAX_DUPLICATE_SCAN } from "@/lib/constants";
import { emptyToNull } from "@/lib/events";
import { isWallClockPast } from "@/lib/format";
import { getClientIp } from "@/lib/http";
import { findSimilarNames } from "@/lib/names";
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
 *  - el tope de acompañantes sale del propio evento, no del cliente;
 *  - si la lista tiene fecha de cierre y ya pasó, rechaza la confirmación;
 *  - avisa de un posible duplicado antes de crear la fila (el invitado decide).
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
    select: {
      id: true,
      isActive: true,
      maxGuestsPerRsvp: true,
      rsvpDeadline: true,
    },
  });

  if (!event || !event.isActive) {
    return jsonError("El evento no existe o ya no acepta confirmaciones", 404);
  }

  if (isWallClockPast(event.rsvpDeadline)) {
    return jsonError("La lista de invitados ya cerró.", 403);
  }

  // Normalizamos antes de validar para no fallar si el cliente omite el arreglo.
  const parsed = createRsvpSchema(event.maxGuestsPerRsvp).safeParse({
    ...raw,
    additionalGuests: Array.isArray(raw.additionalGuests) ? raw.additionalGuests : [],
  });
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;

  // Aviso de duplicado: si ya hay un invitado principal con un nombre muy
  // parecido, se pide confirmación antes de registrar. `confirmDuplicate` lo
  // envía el formulario solo cuando la persona ya vio el aviso.
  if (raw.confirmDuplicate !== true) {
    const existing = await prisma.rsvp.findMany({
      where: { eventId: event.id },
      select: { mainGuestName: true },
      orderBy: { createdAt: "asc" },
      take: MAX_DUPLICATE_SCAN,
    });
    const hasDuplicate =
      findSimilarNames(
        values.mainGuestName,
        existing.map((rsvp) => rsvp.mainGuestName),
      ).length > 0;
    if (hasDuplicate) {
      // Se avisa de que HAY un parecido, nunca de a quién pertenece: el enlace
      // es público y devolver nombres filtraría la lista de invitados a
      // cualquiera que pruebe nombres distintos.
      return NextResponse.json(
        {
          error: "Ya existe una confirmación con un nombre muy parecido.",
          duplicate: true,
        },
        { status: 409 },
      );
    }
  }

  // Si la persona no asiste, sus acompañantes no cuentan para nada.
  const additionalGuests =
    values.attendance === "SI" ? values.additionalGuests : [];

  const rsvp = await prisma.rsvp.create({
    data: {
      eventId: event.id,
      mainGuestName: values.mainGuestName.trim(),
      mainGuestPhone: values.mainGuestPhone,
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
