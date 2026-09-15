import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MAGIC_LINK_PROVIDER_ID } from "@/lib/constants";
import { consumeMagicLinkToken } from "@/lib/magic-link";

/**
 * Autenticación de anfitriones con Auth.js.
 *
 * Se usa un proveedor de credenciales cuyo "secreto" es el token de un solo uso
 * que viaja en el magic link (`/login/verify?token=...`). Con esto:
 *  - no hay passwords que guardar ni hashear (el modelo `Host` queda intacto);
 *  - la sesión es un JWT firmado (no hace falta tabla de sesiones ni adapter);
 *  - el token se consume una sola vez y caduca a los 15 minutos.
 *
 * Este módulo importa Prisma, así que solo debe usarse desde el servidor.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: MAGIC_LINK_PROVIDER_ID,
      name: "Enlace mágico",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token) return null;

        const host = await consumeMagicLinkToken(token);
        if (!host) return null;

        return {
          id: host.id,
          email: host.email,
          name: host.name ?? host.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.hostId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.hostId === "string" ? token.hostId : "";
      }
      return session;
    },
  },
};
