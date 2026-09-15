import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getClientIp } from "@/lib/http";
import {
  buildMagicLinkUrl,
  findOrCreateHostByEmail,
  issueMagicLinkToken,
  sendMagicLinkEmail,
} from "@/lib/magic-link";
import { magicLinkLimiter } from "@/lib/rate-limit";
import { requestMagicLinkSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Solicita un magic link. Si el email no tiene cuenta, se crea el `Host`
 * automáticamente: pedir el enlace es la única forma de registrarse.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = magicLinkLimiter.check(`magic-link:${ip}`);
  if (!limit.success) {
    return jsonError(
      "Demasiadas solicitudes. Espera un minuto antes de intentar de nuevo.",
      429,
    );
  }

  const parsed = requestMagicLinkSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Escribe un email válido", 422);
  }

  const { email } = parsed.data;

  try {
    await findOrCreateHostByEmail(email);
    const { token } = await issueMagicLinkToken(email);
    await sendMagicLinkEmail(email, buildMagicLinkUrl(token));
  } catch (error) {
    console.error("[auth] No se pudo generar o enviar el magic link", error);
    return jsonError("No pudimos enviar el enlace. Intenta de nuevo.", 500);
  }

  // Respuesta genérica a propósito: no se revela si el email ya tenía cuenta.
  return NextResponse.json({
    ok: true,
    message: "Si el email es válido, te enviamos un enlace de acceso.",
  });
}
