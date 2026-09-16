"use client";

import { useState, type ReactNode } from "react";
import type { InvitationTheme } from "@/lib/invitation-theme";
import { optimizedImageUrl } from "@/lib/images";
import { BackgroundMusic } from "./BackgroundMusic";
import { ConfettiProvider } from "./ConfettiProvider";
import { FullScreenLayerProvider } from "./overlay-layer";
import { OpeningOverlay } from "./OpeningOverlay";
import { ParticleCanvas } from "./ParticleCanvas";

/**
 * Máscara horizontal del fondo de los costados: deja la foto visible en los
 * bordes y la desvanece en el centro, de modo que la columna de contenido siga
 * apoyada sobre el fondo limpio. Si el navegador no soporta `mask-image`, la
 * capa se ve uniforme y atenuada, que también es un resultado aceptable.
 */
const SIDE_BACKDROP_MASK =
  "linear-gradient(to right, #000 0%, transparent 34%, transparent 66%, #000 100%)";

/**
 * Ancho al que se pide la portada para el fondo lateral. Va desenfocada, así que
 * no necesita la resolución de la portada real: es ancho para que no se pixele.
 */
const SIDE_BACKDROP_WIDTH = 600;

export type InvitationShellProps = {
  theme: InvitationTheme;
  /** Melodía de fondo elegida por el anfitrión. `null` = sin música. */
  musicTrack?: string | null;
  /**
   * Foto de portada del evento. En pantallas grandes se reutiliza, desenfocada,
   * como fondo de los costados: la columna de contenido es más estrecha que la
   * ventana y sin ella los laterales quedan vacíos.
   */
  coverImageUrl?: string | null;
  children: ReactNode;
};

/**
 * Envoltorio de la experiencia animada de la invitación pública.
 *
 * Aporta la capa temática: el degradado de fondo, el fondo de los costados, las
 * partículas ambientales del evento, la música de fondo, la cortina de apertura
 * y el lanzador de confeti que consumen el resto de secciones (por ejemplo, al
 * confirmar el RSVP).
 */
export function InvitationShell({
  theme,
  musicTrack = null,
  coverImageUrl = null,
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

          {/* Costados de pantallas grandes: la propia portada del evento,
              desenfocada y atenuada. No añade ninguna imagen nueva (es la que ya
              carga la portada) y queda por debajo del hero, que es opaco. */}
          {coverImageUrl ? (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 hidden overflow-hidden xl:block"
            >
              <div
                className="absolute inset-[-6%] bg-cover bg-center opacity-[0.16] blur-2xl"
                style={{
                  backgroundImage: `url("${optimizedImageUrl(
                    coverImageUrl,
                    SIDE_BACKDROP_WIDTH,
                  )}")`,
                  maskImage: SIDE_BACKDROP_MASK,
                  WebkitMaskImage: SIDE_BACKDROP_MASK,
                }}
              />
            </div>
          ) : null}

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
