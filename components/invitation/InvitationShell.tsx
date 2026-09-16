"use client";

import { useState, type ReactNode } from "react";
import type { InvitationTheme } from "@/lib/invitation-theme";
import { BackgroundMusic } from "./BackgroundMusic";
import { ConfettiProvider } from "./ConfettiProvider";
import { FullScreenLayerProvider } from "./overlay-layer";
import { OpeningOverlay } from "./OpeningOverlay";
import { ParticleCanvas } from "./ParticleCanvas";

export type InvitationShellProps = {
  theme: InvitationTheme;
  /** Melodía de fondo elegida por el anfitrión. `null` = sin música. */
  musicTrack?: string | null;
  children: ReactNode;
};

/**
 * Envoltorio de la experiencia animada de la invitación pública.
 *
 * Aporta la capa temática: el degradado de fondo, las partículas ambientales del
 * evento, la música de fondo, la cortina de apertura y el lanzador de confeti
 * que consumen el resto de secciones (por ejemplo, al confirmar el RSVP).
 */
export function InvitationShell({
  theme,
  musicTrack = null,
  children,
}: InvitationShellProps) {
  const [opened, setOpened] = useState(false);

  return (
    <ConfettiProvider kind={theme.particleKind} palette={theme.palette}>
      <FullScreenLayerProvider>
        <div className="relative min-h-dvh">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.16]"
          >
            {/* Capa sobredimensionada: el barrido se anima con `transform` sobre
                ella, de modo que la GPU compone y el degradado no se repinta. */}
            <div
              className="absolute inset-[-25%] animate-gradient-pan will-change-transform"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.palette.join(", ")})`,
              }}
            />
          </div>

          <ParticleCanvas kind={theme.particleKind} palette={theme.palette} />

          <div className="relative z-10 pb-16">{children}</div>

          {/* La música arranca con el clic de la cortina: sin ese gesto, los
              navegadores bloquearían el audio. */}
          <BackgroundMusic track={musicTrack} playing={opened} />

          {opened ? null : (
            <OpeningOverlay theme={theme} onOpen={() => setOpened(true)} />
          )}
        </div>
      </FullScreenLayerProvider>
    </ConfettiProvider>
  );
}
