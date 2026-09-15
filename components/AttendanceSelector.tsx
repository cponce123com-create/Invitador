"use client";

import {
  ATTENDANCE_BUTTON_CLASSES,
  ATTENDANCE_EMOJI,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/constants";
import { cn } from "@/lib/ui";

type Props = {
  value: AttendanceStatusValue | undefined;
  onChange: (value: AttendanceStatusValue) => void;
  disabled?: boolean;
};

/**
 * Selector de asistencia con botones grandes en lugar de un `<select>`:
 * es la decisión más importante de la pantalla y así se toca bien en el móvil.
 */
export function AttendanceSelector({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="¿Podrás asistir?" className="grid gap-3 sm:grid-cols-3">
      {ATTENDANCE_STATUSES.map((status) => {
        const selected = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? `${ATTENDANCE_BUTTON_CLASSES[status]} shadow-sm ring-2`
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <span className="text-2xl" aria-hidden>
              {ATTENDANCE_EMOJI[status]}
            </span>
            {ATTENDANCE_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
