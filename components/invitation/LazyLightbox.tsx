"use client";

import dynamic from "next/dynamic";
import type { LightboxProps } from "./Lightbox";

/** Fondo opaco mientras baja el chunk del visor: evita el destello en blanco. */
function LightboxFallback() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm"
    />
  );
}

/**
 * Visor de fotos cargado bajo demanda.
 *
 * Se abre solo al pulsar una foto del muro o una imagen ampliable, así que su
 * código vive en un chunk aparte: la invitación no lo descarga hasta que hace
 * falta. Se centraliza aquí para que el muro de fotos y las imágenes ampliables
 * compartan el mismo chunk en lugar de duplicarlo.
 */
export const Lightbox = dynamic<LightboxProps>(
  () => import("./Lightbox").then((mod) => mod.Lightbox),
  { ssr: false, loading: () => <LightboxFallback /> },
);
