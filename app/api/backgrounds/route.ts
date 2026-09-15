import { NextResponse } from "next/server";
import { EVENT_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lista pública de fondos/plantillas, ordenada por `order`.
 *
 * Acepta `?eventType=BODA`: en ese caso devuelve los fondos de ese tipo más los
 * genéricos (`eventType: null`). Un valor desconocido se ignora y se devuelven
 * todos, en vez de fallar: es un endpoint de solo lectura y sin datos privados.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("eventType");
  const eventType = EVENT_TYPES.find((type) => type === requested);

  const backgrounds = await prisma.backgroundTemplate.findMany({
    where: eventType
      ? { OR: [{ eventType }, { eventType: null }] }
      : undefined,
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      eventType: true,
      kind: true,
      colors: true,
      patternName: true,
      isPremium: true,
      order: true,
    },
  });

  return NextResponse.json({ backgrounds });
}
