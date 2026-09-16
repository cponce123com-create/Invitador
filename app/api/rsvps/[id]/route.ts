import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { emptyToNull } from "@/lib/events";
import { isCrossOriginRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";
import { updateRsvpSchema } from "@/lib/validations/rsvp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoints PRIVADOS del anfitrión para corregir una confirmación recibida.
 *
 * La confirmación pública no se puede editar desde la invitación (no hay sesión
 * de invitado), así que el anfitrión arregla desde su panel lo que llegó mal
 * escrito: el nombre, el teléfono, la asistencia, el mensaje y los acompañantes.
 */

/** Busca la confirmación comprobando que su evento es de este anfitrión. */
async function findOwnedRsvp(rsvpId: string, hostId: string) {
  return prisma.rsvp.findFirst({
    where: { id: rsvpId, event: { hostId } },
    select: { id: true, event: { select: { maxGuestsPerRsvp: true } } },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const rsvp = await findOwnedRsvp(params.id, host.id);
  if (!rsvp) return jsonError("La confirmación no existe", 404);

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return jsonError("Datos inválidos", 400);
  }

  // Normalizamos antes de validar para no fallar si el cliente omite el arreglo.
  const raw = body as Record<string, unknown>;
  const parsed = updateRsvpSchema(rsvp.event.maxGuestsPerRsvp).safeParse({
    ...raw,
    additionalGuests: Array.isArray(raw.additionalGuests) ? raw.additionalGuests : [],
  });
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;
  // Si la persona no asiste, sus acompañantes no cuentan para nada.
  const additionalGuests = values.attendance === "SI" ? values.additionalGuests : [];

  const updated = await prisma.rsvp.update({
    where: { id: rsvp.id },
    data: {
      mainGuestName: values.mainGuestName.trim(),
      mainGuestPhone: emptyToNull(values.mainGuestPhone),
      attendance: values.attendance,
      message: emptyToNull(values.message),
      // Lo que se ve en el panel manda: se reemplazan los acompañantes guardados
      // por los de la lista enviada (los que se quitaron desaparecen).
      additionalGuests: {
        deleteMany: {},
        create: additionalGuests.map((guest) => ({
          name: guest.name.trim(),
          relation: guest.relation,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ rsvp: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const rsvp = await findOwnedRsvp(params.id, host.id);
  if (!rsvp) return jsonError("La confirmación no existe", 404);

  // Los acompañantes se van con la confirmación (onDelete: Cascade).
  await prisma.rsvp.delete({ where: { id: rsvp.id } });

  return NextResponse.json({ ok: true });
}
