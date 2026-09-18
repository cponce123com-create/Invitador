"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { RsvpFormProps } from "@/components/RsvpForm";
import { cardClass } from "@/lib/ui";
import { CountdownCard } from "./CountdownCard";

/** Margen con el que se adelanta la carga antes de que la sección se vea. */
const RSVP_PREFETCH_MARGIN = "600px 0px";

/**
 * Silueta del formulario mientras baja su chunk: misma tarjeta y alturas
 * parecidas para que la sustitución no mueva el resto de la página.
 */
function RsvpFormSkeleton() {
  return (
    <div className={`${cardClass} space-y-6`} aria-hidden>
      <div className="space-y-2">
        <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

/**
 * El formulario de RSVP arrastra `react-hook-form` + `zod`, el grueso del JS de
 * la invitación. Vive en su propio chunk y solo se descarga cuando la sección
 * ronda el viewport: quien no baja hasta el formulario no paga ese peso.
 */
const RsvpForm = dynamic<RsvpFormProps>(
  () => import("@/components/RsvpForm").then((mod) => mod.RsvpForm),
  { ssr: false, loading: () => <RsvpFormSkeleton /> },
);

type Props = {
  eventId: string;
  maxGuestsPerRsvp: number;
  /** Instante de cierre en ISO (hora real), o `null` si el evento no cierra. */
  deadlineIso: string | null;
  /** Fecha de cierre ya formateada para el texto de la tarjeta. */
  deadlineLabel: string | null;
  /** Restante calculado en el servidor: el primer render coincide con el HTML. */
  initialRemainingMs: number;
};

/**
 * Bloque de confirmación de la invitación: la cuenta regresiva (si el evento
 * define un cierre) y el formulario. Cuando el contador llega a cero el
 * formulario desaparece y solo queda el aviso de que la lista cerró.
 *
 * Es un Client Component porque lleva el reloj; el servidor le pasa el restante
 * inicial para que la hidratación no muestre números distintos.
 */
export function RsvpSection({
  eventId,
  maxGuestsPerRsvp,
  deadlineIso,
  deadlineLabel,
  initialRemainingMs,
}: Props) {
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);
  // El formulario no se monta hasta que su sección ronda la pantalla.
  const [formReady, setFormReady] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!deadlineIso) return;
    const target = new Date(deadlineIso).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineIso]);

  const closed = deadlineIso !== null && remainingMs <= 0;

  useEffect(() => {
    if (formReady || closed) return;
    const node = anchorRef.current;
    if (!node) return;

    // Sin IntersectionObserver (navegadores muy viejos) se carga sin esperar.
    if (typeof IntersectionObserver === "undefined") {
      setFormReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setFormReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: RSVP_PREFETCH_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [formReady, closed]);

  return (
    <div className="space-y-6">
      {deadlineIso ? (
        <CountdownCard
          remainingMs={remainingMs}
          deadlineLabel={deadlineLabel}
        />
      ) : null}

      {closed ? null : (
        <div ref={anchorRef}>
          {formReady ? (
            <RsvpForm eventId={eventId} maxGuestsPerRsvp={maxGuestsPerRsvp} />
          ) : (
            <RsvpFormSkeleton />
          )}
        </div>
      )}
    </div>
  );
}
