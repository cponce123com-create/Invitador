import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** id del `Host` autenticado (viene del callback `jwt`). */
      id: string;
      /** `true` si la cuenta puede crear y gestionar usuarios. */
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    isSuperAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    hostId?: string;
    isSuperAdmin?: boolean;
  }
}
