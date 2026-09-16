"use client";

import { cardClass } from "@/lib/ui";

type Props = {
  /** Milisegundos que faltan para el cierre (0 o menos = ya cerró). */
  remainingMs: number;
  /** Fecha de cierre en "hora de pared", ya formateada (o `null`). */
  deadlineLabel: string | null;
};

const UNIT_LABELS = ["Días", "Horas", "Min", "Seg"] as const;

/** Reparte los milisegundos restantes en días, horas, minutos y segundos. */
function splitRemaining(remainingMs: number): number[] {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  return [
    Math.floor(totalSeconds / 86_400),
    Math.floor((totalSeconds % 86_400) / 3_600),
    Math.floor((totalSeconds % 3_600) / 60),
    totalSeconds % 60,
  ];
}

/**
 * Tarjeta «Cierre de la lista»: cuenta regresiva hasta la fecha límite de
 * confirmaciones.
 *
 * Es un Client Component presentacional: recibe los milisegundos restantes ya
 * calculados (el padre lleva el reloj) para que el primer render coincida con el
 * del servidor y no haya desajuste de hidratación.
 */
export function CountdownCard({ remainingMs, deadlineLabel }: Props) {
  const closed = remainingMs <= 0;

  return (
    <section className={`${cardClass} space-y-4 text-center`}>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">
          {closed ? "La lista está cerrada" : "Cierre de la lista"}
        </h2>
        <p className="text-sm text-slate-500">
          {closed
            ? "Ya no se aceptan nuevas confirmaciones."
            : deadlineLabel
              ? `Confirma antes del ${deadlineLabel}.`
              : "Confirma antes de que se acabe el tiempo."}
        </p>
      </div>

      {closed ? null : (
        <ul className="grid grid-cols-4 gap-2">
          {splitRemaining(remainingMs).map((value, index) => (
            <li
              key={UNIT_LABELS[index]}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3"
            >
              <span className="block text-2xl font-black tabular-nums text-slate-900">
                {String(value).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {UNIT_LABELS[index]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
