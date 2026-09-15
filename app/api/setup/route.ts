import { NextResponse } from "next/server";
import { jsonError, readJson, zodErrorResponse } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";
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
 * Solo funciona mientras no exista ninguno, así que la ventana de instalación
 * se cierra sola en cuanto se usa una vez.
 */
export async function POST(request: Request) {
  const superAdmins = await prisma.host.count({ where: { isSuperAdmin: true } });
  if (superAdmins > 0) {
    return jsonError("Ya existe un administrador. Inicia sesión.", 409);
  }

  const parsed = setupSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { email, password } = parsed.data;
  const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null;

  const existing = await prisma.host.findUnique({ where: { email } });
  // Una cuenta creada antes sin contraseña se adopta en lugar de fallar: así el
  // primer arranque no se bloquea si ese email ya existía.
  if (existing?.passwordHash) {
    return jsonError("Ese email ya está registrado.", 409);
  }

  const passwordHash = await hashPassword(password);

  try {
    const host = await prisma.host.upsert({
      where: { email },
      update: {
        passwordHash,
        isSuperAdmin: true,
        name: name ?? existing?.name ?? null,
      },
      create: { email, name, passwordHash, isSuperAdmin: true },
    });

    return NextResponse.json(
      { host: { id: host.id, email: host.email } },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError("Ese email ya está registrado.", 409);
    }
    console.error("[setup] No se pudo crear el super admin", error);
    return jsonError("No pudimos crear la cuenta. Intenta de nuevo.", 500);
  }
}
