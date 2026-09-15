import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Error JSON uniforme para todos los endpoints. */
export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** 422 con el detalle de los campos inválidos (útil para depurar desde el cliente). */
export function zodErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Revisa los datos del formulario",
      issues: error.flatten().fieldErrors,
    },
    { status: 422 },
  );
}

/** Lee el cuerpo JSON sin lanzar si viene vacío o mal formado. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
