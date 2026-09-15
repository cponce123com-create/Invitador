import { createHash, randomBytes } from "node:crypto";
import type { Host } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** El enlace caduca a los 15 minutos. */
const TOKEN_TTL_MS = 15 * 60 * 1000;

export function hashMagicLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea un token de un solo uso. En la base de datos solo se guarda su hash
 * SHA-256: si alguien obtiene el contenido de la tabla, no puede usarlo para
 * iniciar sesión.
 */
export async function issueMagicLinkToken(
  email: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.magicLinkToken.create({
    data: {
      tokenHash: hashMagicLinkToken(token),
      email: email.trim().toLowerCase(),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Valida y consume un token. Devuelve el anfitrión si el token es válido,
 * no fue usado y no expiró; en cualquier otro caso devuelve `null`.
 */
export async function consumeMagicLinkToken(token: string): Promise<Host | null> {
  if (!token || token.length < 16) return null;

  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash: hashMagicLinkToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const host = await prisma.host.findUnique({ where: { email: record.email } });
  if (!host) return null;

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return host;
}

/**
 * Alta automática del anfitrión en el primer login.
 * No hay registro separado: pedir el enlace es registrarse.
 */
export async function findOrCreateHostByEmail(email: string): Promise<Host> {
  const normalized = email.trim().toLowerCase();
  return prisma.host.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized },
  });
}

export function buildMagicLinkUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/login/verify?token=${encodeURIComponent(token)}`;
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const subject = "Tu enlace de acceso a Invitador";
  const text = [
    "Hola,",
    "",
    "Usa este enlace para entrar a tu panel de Invitador:",
    url,
    "",
    "El enlace caduca en 15 minutos y solo se puede usar una vez.",
    "Si no solicitaste este acceso, ignora este mensaje.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1f2937">
      <h2 style="color:#4f46e5;margin-bottom:8px">Tu enlace de acceso</h2>
      <p>Usa el siguiente botón para entrar a tu panel de Invitador:</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
          Entrar a Invitador
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px">El enlace caduca en 15 minutos y solo se puede usar una vez.</p>
      <p style="color:#6b7280;font-size:14px">Si no solicitaste este acceso, ignora este mensaje.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}
