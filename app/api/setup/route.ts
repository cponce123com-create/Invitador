import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { getClientIp, isCrossOriginRequest } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import {
  isSerializationError,
  isUniqueConstraintError,
  prisma,
} from "@/lib/prisma";
import { checkSetupRateLimit } from "@/lib/rate-limit";
import { setupSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Indica si todavía hay que crear el primer super admin. */
export async function GET() {
  const superAdmins = await prisma.host.count({ where: { isSuperAdmin: true } });
  return NextResponse.json({ needsSetup: superAdmins === 0 });
}

/**
 * Crea el primer super admin.
 *
 * Solo funciona mientras no exista ningún administrador y nadie pueda iniciar
 * sesión todavía, así que la ventana de instalación se cierra sola en cuanto se
 * usa una vez. El recuento y la creación van dentro de la misma transacción
 * serializable: dos peticiones simultáneas no pueden crear dos superadmins.
 */
export async function POST(request: Request) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  // El endpoint es público: se corta la fuerza bruta por IP.
  const gate = await checkSetupRateLimit(`setup:${getClientIp(request)}`);
  if (!gate.success) {
    return jsonError(
      "Demasiados intentos. Prueba de nuevo en unos minutos.",
      429,
    );
  }

  const parsed = setupSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { email, password } = parsed.data;
  const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null;
  const passwordHash = await hashPassword(password);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ¿Hay ya alguien que pueda entrar como administrador? Basta con que
        // exista un super admin o una cuenta con contraseña para cerrar la
        // puerta: si no, cualquiera se autoproclamaría administrador.
        const installed = await tx.host.count({
          where: {
            OR: [{ isSuperAdmin: true }, { passwordHash: { not: null } }],
          },
        });
        if (installed > 0) return { status: "taken" as const };

        const existing = await tx.host.findUnique({ where: { email } });
        // Una cuenta creada antes sin contraseña se adopta en lugar de fallar:
        // así el primer arranque no se bloquea si ese email ya existía.
        const host = await tx.host.upsert({
          where: { email },
          update: {
            passwordHash,
            isSuperAdmin: true,
            name: name ?? existing?.name ?? null,
          },
          create: { email, name, passwordHash, isSuperAdmin: true },
        });

        return { status: "created" as const, host };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.status === "taken") {
      return jsonError("Ya existe un administrador. Inicia sesión.", 409);
    }

    return NextResponse.json(
      { host: { id: result.host.id, email: result.host.email } },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError("Ese email ya está registrado.", 409);
    }
    // Dos instalaciones a la vez: la transacción serializable aborta una.
    if (isSerializationError(error)) {
      return jsonError("Ya existe un administrador. Inicia sesión.", 409);
    }
    console.error("[setup] No se pudo crear el super admin", error);
    return jsonError("No pudimos crear la cuenta. Intenta de nuevo.", 500);
  }
}
