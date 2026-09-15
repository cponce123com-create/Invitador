export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const DEFAULT_FROM = "Invitador <no-reply@invitador.app>";

/**
 * Envía un email por SMTP (nodemailer) usando `EMAIL_SERVER`.
 *
 * Si `EMAIL_SERVER` no está configurado (típico en desarrollo local), el email
 * se imprime en la consola del servidor en lugar de fallar. Así se puede probar
 * el flujo de magic link sin proveedor de correo.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const server = process.env.EMAIL_SERVER;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!server) {
    console.info(
      [
        "",
        "──────── EMAIL (modo consola: EMAIL_SERVER sin configurar) ────────",
        `Para: ${to}`,
        `Asunto: ${subject}`,
        "",
        text,
        "──────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(server);
  await transport.sendMail({ from, to, subject, text, html });
}
