import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check usado por Render.
 *
 * Siempre responde 200 mientras el proceso esté vivo: si devolviera 503 cuando
 * Neon tiene un hipo puntual, Render reiniciaría el servicio sin necesidad. El
 * estado real de la base de datos se expone en el campo `database`.
 */
export async function GET() {
  const startedAt = Date.now();
  let database: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "error";
    console.error("[health] La base de datos no responde", error);
  }

  return NextResponse.json({
    status: "ok",
    database,
    uptimeSeconds: Math.round(process.uptime()),
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
