import type { Metadata, Viewport } from "next";
import "./globals.css";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Invitador — Invitaciones de eventos con confirmación",
    template: "%s · Invitador",
  },
  description:
    "Crea la invitación de tu evento, comparte un link único y recibe las confirmaciones de asistencia con sus acompañantes.",
  applicationName: "Invitador",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
