import { NextResponse } from "next/server";
import { getRequestId } from "@/lib/http";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check usado por Render.
 *
 * Responde 200 mientras el proceso esté vivo: si devolviera 503 cuando Neon
 * tiene un hipo puntual, Render reiniciaría el servicio sin necesidad. El
 * sondeo de la base queda en los logs del servidor, pero no se publica: es una
 * ruta abierta a cualquiera.
 */
export async function GET(request: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    logError("health", "La base de datos no responde", {
      requestId: getRequestId(request),
      error,
    });
  }

  return NextResponse.json({ status: "ok" });
}
