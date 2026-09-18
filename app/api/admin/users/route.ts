import { NextResponse } from "next/server";
import { jsonError, jsonServerError, readJson, zodErrorResponse } from "@/lib/api";
import { isCrossOriginRequest } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { isUniqueConstraintError, prisma } from "@/lib/prisma";
import { getCurrentHost } from "@/lib/session";
import { createUserSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  isSuperAdmin: true,
  createdAt: true,
} as const;

/** Lista las cuentas. Solo para super admins. */
export async function GET() {
  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);
  if (!host.isSuperAdmin) return jsonError("No tienes permisos para ver los usuarios", 403);

  const users = await prisma.host.findMany({
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
    select: { ...USER_SELECT, _count: { select: { events: true } } },
  });

  return NextResponse.json({ users });
}

/** Crea una cuenta con la contraseña indicada. Solo para super admins. */
export async function POST(request: Request) {
  if (isCrossOriginRequest(request)) {
    return jsonError("Origen no permitido", 403);
  }

  const host = await getCurrentHost();
  if (!host) return jsonError("No autorizado", 401);
  if (!host.isSuperAdmin) return jsonError("No tienes permisos para crear usuarios", 403);

  const parsed = createUserSchema.safeParse(await readJson(request));
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const { email, password } = parsed.data;
  const name = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null;
  const isSuperAdmin = parsed.data.isSuperAdmin === true;

  const existing = await prisma.host.findUnique({ where: { email } });
  if (existing) return jsonError("Ese email ya está registrado.", 409);

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.host.create({
      data: { email, name, passwordHash, isSuperAdmin },
      select: USER_SELECT,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError("Ese email ya está registrado.", 409);
    }
    return jsonServerError(
      request,
      "admin/users",
      "No se pudo crear el usuario",
      error,
      { userMessage: "No pudimos crear el usuario. Intenta de nuevo." },
    );
  }
}
