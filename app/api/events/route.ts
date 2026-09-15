import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { createUniqueEventSlug, toEventScalarData } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";
import { eventFormSchema } from "@/lib/validations/event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lista los eventos del anfitrión autenticado. */
export async function GET() {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const events = await prisma.event.findMany({
    where: { hostId: host.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { rsvps: true, photos: true } },
    },
  });

  return NextResponse.json({ events });
}

/** Crea un evento y genera su slug público. */
export async function POST(request: Request) {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);

  const parsed = eventFormSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const values = parsed.data;
  const slug = await createUniqueEventSlug(values.title);

  const event = await prisma.event.create({
    data: {
      ...toEventScalarData(values),
      slug,
      hostId: host.id,
      photos: {
        create: (values.photos ?? []).map((photo, index) => ({
          url: photo.url,
          cloudinaryId: photo.cloudinaryId,
          order: index,
        })),
      },
    },
    include: { photos: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ event }, { status: 201 });
}
