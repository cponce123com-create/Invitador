import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { CREDENTIALS_PROVIDER_ID } from "@/lib/constants";
import { getClientIpFromHeaders } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Autenticación de anfitriones con Auth.js usando email + contraseña.
 *
 * - Las contraseñas se guardan hasheadas con scrypt (ver `lib/password.ts`);
 *   nunca se almacena la contraseña en claro.
 * - La sesión es un JWT firmado, así que no hace falta tabla de sesiones ni
 *   adapter de base de datos. Los permisos se releen de la base de datos en
 *   `getCurrentHost` (ver `lib/session.ts`), no se confían al token.
 * - El alta de cuentas es cerrada: solo un super admin puede crear usuarios.
 *   El primer super admin se crea desde `/setup`.
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
      id: CREDENTIALS_PROVIDER_ID,
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Frena la fuerza bruta por IP + email. Usa Upstash cuando está
        // configurado, así que el cupo se comparte entre instancias; sin
        // Upstash cae al limitador en memoria de esta instancia.
        const clientIp = getClientIpFromHeaders(request.headers ?? {});
        const gate = await checkLoginRateLimit(`${clientIp}:${email}`);
        if (!gate.success) return null;

        const host = await prisma.host.findUnique({ where: { email } });
        if (!host) return null;

        const valid = await verifyPassword(password, host.passwordHash);
        if (!valid) return null;

        return {
          id: host.id,
          email: host.email,
          name: host.name ?? host.email,
          isSuperAdmin: host.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.hostId = user.id;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.hostId === "string" ? token.hostId : "";
        session.user.isSuperAdmin = token.isSuperAdmin === true;
      }
      return session;
    },
  },
};
