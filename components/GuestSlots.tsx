"use client";

import { cn, helpClass } from "@/lib/ui";

type Props = {
  /** Acompañantes ya agregados. */
  used: number;
  /** Tope configurado en el evento. */
  total: number;
};

/**
 * Indicador de cupos de acompañantes: pastilla con "usados / total", barra de
 * progreso y una frase con los espacios que quedan.
 *
 * Se pinta encima de las filas para que el invitado entienda de un vistazo
 * cuántos lugares tiene y cuántos le restan, en lugar de tener que deducirlo
 * del texto de ayuda.
 */
export function GuestSlots({ used, total }: Props) {
  const remaining = Math.max(0, total - used);
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const full = remaining === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">Espacios disponibles</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            full ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-700",
          )}
        >
          {used} de {total}
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        aria-label="Acompañantes agregados"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            full ? "bg-amber-500" : "bg-brand-500",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className={helpClass}>
        {full
          ? `Ya agregaste el máximo de ${total} acompañante${total === 1 ? "" : "s"}.`
          : `Te queda${remaining === 1 ? "" : "n"} ${remaining} espacio${
              remaining === 1 ? "" : "s"
            } para acompañantes.`}
      </p>
    </div>
  );
}
