"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { GUEST_RELATIONS, GUEST_RELATION_LABELS } from "@/lib/constants";
import { errorClass, inputClass } from "@/lib/ui";
import type { RsvpFormValues } from "@/lib/validations/rsvp";

type Props = {
  index: number;
  register: UseFormRegister<RsvpFormValues>;
  errors: FieldErrors<RsvpFormValues>;
  onRemove: () => void;
};

/** Fila de un acompañante: nombre + relación. */
export function GuestRow({ index, register, errors, onRemove }: Props) {
  const nameError = errors.additionalGuests?.[index]?.name?.message;
  const relationError = errors.additionalGuests?.[index]?.relation?.message;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
        <div>
          <label htmlFor={`guest-name-${index}`} className="sr-only">
            Nombre del acompañante {index + 1}
          </label>
          <input
            id={`guest-name-${index}`}
            className={inputClass}
            placeholder={`Nombre del acompañante ${index + 1}`}
            aria-invalid={Boolean(nameError)}
            {...register(`additionalGuests.${index}.name`)}
          />
          {nameError ? <p className={errorClass}>{nameError}</p> : null}
        </div>

        <div>
          <label htmlFor={`guest-relation-${index}`} className="sr-only">
            Relación con el invitado principal
          </label>
          <select
            id={`guest-relation-${index}`}
            className={inputClass}
            aria-invalid={Boolean(relationError)}
            {...register(`additionalGuests.${index}.relation`)}
          >
            {GUEST_RELATIONS.map((relation) => (
              <option key={relation} value={relation}>
                {GUEST_RELATION_LABELS[relation]}
              </option>
            ))}
          </select>
          {relationError ? <p className={errorClass}>{relationError}</p> : null}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="justify-self-start rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 sm:justify-self-end"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}
