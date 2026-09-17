import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { emptyToNull } from "@/lib/events";
import { getClientIp } from "@/lib/http";
import { isGiftAssetId } from "@/lib/images";
import { prisma } from "@/lib/prisma";
import { checkGiftRateLimit } from "@/lib/rate-limit";
import { giftProofRequestSchema } from "@/lib/validations/gift-proof";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint PÚBLICO: guarda el comprobante de regalo que sube un invitado.
 *
 * La imagen ya está en Cloudinary (la subió el navegador con la firma de
 * `/api/upload/gift`); aquí solo se guardan los datos. No requiere sesión, así
 * que se limita por IP, solo acepta eventos activos y comprueba que el asset
 * venga de la carpeta de regalos de ESE evento.
 */
export async function POST(request: Request) {
  const limit = await checkGiftRateLimit(`proof:${getClientIp(request)}`);
  if (!limit.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Demasiados comprobantes desde esta conexión. Intenta en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const parsed = giftProofRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: values.eventId },
    select: { id: true, isActive: true },
  });

  if (!event || !event.isActive) {
    return jsonError("El evento no existe o ya no acepta regalos", 404);
  }

  // El comprobante tiene que venir de la carpeta de este evento: así nadie
  // enlaza el asset de otro evento (o de otra cuenta) como si fuera suyo.
  if (!isGiftAssetId(event.id, values.cloudinaryId)) {
    return jsonError("El comprobante no es válido", 400);
  }

  // Si el invitado eligió un regalo del catálogo, se comprueba que sea de ESTE
  // evento: el id lo envía el navegador, así que nadie puede colgar su
  // comprobante del artículo de otro evento.
  if (values.giftItemId) {
    const giftItem = await prisma.giftItem.findFirst({
      where: { id: values.giftItemId, eventId: event.id },
      select: { id: true },
    });
    if (!giftItem) {
      return jsonError("El regalo elegido no es válido", 400);
    }
  }

  const giftProof = await prisma.giftProof.create({
    data: {
      eventId: event.id,
      // `null` cuando el invitado no eligió regalo (sigue valiendo para quien da
      // efectivo): la columna es opcional a propósito.
      giftItemId: values.giftItemId ?? null,
      senderName: values.senderName.trim(),
      note: emptyToNull(values.note),
      cloudinaryId: values.cloudinaryId,
      url: values.url,
    },
    select: { id: true, senderName: true },
  });

  return NextResponse.json({ giftProof }, { status: 201 });
}
