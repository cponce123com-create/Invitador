"use client";

import { useState, type ReactNode } from "react";
import type { InvitationTheme } from "@/lib/invitation-theme";
import { ConfettiProvider } from "./ConfettiProvider";
import { OpeningOverlay } from "./OpeningOverlay";
import { ParticleCanvas } from "./ParticleCanvas";

export type InvitationShellProps = {
  theme: InvitationTheme;
  children: ReactNode;
};

/**
 * Envoltorio de la experiencia animada de la invitación pública.
 *
 * Aporta la capa temática: el degradado de fondo, las partículas ambientales del
 * evento, la cortina de apertura y el lanzador de confeti que consumen el resto
 * de secciones (por ejemplo, al confirmar el RSVP).
 */
export function InvitationShell({ theme, children }: InvitationShellProps) {
  const [opened, setOpened] = useState(false);

  return (
    <ConfettiProvider kind={theme.particleKind} palette={theme.palette}>
      <div className="relative min-h-dvh">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 animate-gradient-pan opacity-[0.16]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.palette.join(", ")})`,
            backgroundSize: "200% 200%",
          }}
        />

        <ParticleCanvas kind={theme.particleKind} palette={theme.palette} />

        <div className="relative z-10 pb-16">{children}</div>

        {opened ? null : (
          <OpeningOverlay theme={theme} onOpen={() => setOpened(true)} />
        )}
      </div>
    </ConfettiProvider>
  );
}
