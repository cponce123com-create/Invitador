"use client";

import { signOut } from "next-auth/react";
import { ghostButtonClass } from "@/lib/ui";

export function SignOutButton() {
  return (
    <button
      type="button"
      className={ghostButtonClass}
      onClick={() => {
        void signOut({ callbackUrl: "/" });
      }}
    >
      Salir
    </button>
  );
}
