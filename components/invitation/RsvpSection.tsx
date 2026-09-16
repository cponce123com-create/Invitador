"use client";

import { useEffect, useState } from "react";
import { RsvpForm } from "@/components/RsvpForm";
import { CountdownCard } from "./CountdownCard";

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

  return (
    <div className="space-y-6">
      {deadlineIso ? (
        <CountdownCard
          remainingMs={remainingMs}
          deadlineLabel={deadlineLabel}
        />
      ) : null}

      {closed ? null : (
        <RsvpForm eventId={eventId} maxGuestsPerRsvp={maxGuestsPerRsvp} />
      )}
    </div>
  );
}
