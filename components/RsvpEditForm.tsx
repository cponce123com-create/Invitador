"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { AttendanceSelector } from "@/components/AttendanceSelector";
import { GuestRow } from "@/components/GuestRow";
import { GuestSlots } from "@/components/GuestSlots";
import type { AttendanceStatusValue, GuestRelationValue } from "@/lib/constants";
import {
  addGuestButtonClass,
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { createRsvpSchema, type RsvpFormValues } from "@/lib/validations/rsvp";

/** Datos de una confirmación que el anfitrión puede corregir. */
export type EditableRsvp = {
  id: string;
  mainGuestName: string;
  mainGuestPhone: string | null;
  attendance: AttendanceStatusValue;
  message: string | null;
  additionalGuests: { name: string; relation: GuestRelationValue }[];
};

type Props = {
  rsvp: EditableRsvp;
  eventId: string;
  maxGuestsPerRsvp: number;
  onCancel: () => void;
  onSaved: () => void;
};

/**
 * Edición de una confirmación desde el panel del anfitrión.
 *
 * Reutiliza el formulario de la invitación (mismos campos, selector de
 * asistencia y filas de acompañantes) y guarda con `PATCH /api/rsvps/[id]`, que
 * vuelve a validar y comprueba que el evento es del anfitrión. Se usa el esquema
 * de creación para compartir el tipo con `GuestRow`; el `eventId` que viaja en el
 * cuerpo lo ignora el endpoint, porque manda el id de la URL.
 */
export function RsvpEditForm({
  rsvp,
  eventId,
  maxGuestsPerRsvp,
  onCancel,
  onSaved,
}: Props) {
  // El esquema depende del tope de acompañantes configurado en el evento.
  const schema = useMemo(() => createRsvpSchema(maxGuestsPerRsvp), [maxGuestsPerRsvp]);
  // El panel pinta la lista de móvil y la tabla de escritorio a la vez (una se
  // oculta con CSS), así que los `id` de los campos deben ser únicos por copia.
  const uid = useId();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RsvpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventId,
      mainGuestName: rsvp.mainGuestName,
      mainGuestPhone: rsvp.mainGuestPhone ?? "",
      attendance: rsvp.attendance,
      message: rsvp.message ?? "",
      additionalGuests: rsvp.additionalGuests.map((guest) => ({
        name: guest.name,
        relation: guest.relation,
      })),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "additionalGuests",
  });
  const attendance = watch("attendance");
  const canAddGuest = fields.length < maxGuestsPerRsvp;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch(`/api/rsvps/${rsvp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Si no asiste, los acompañantes no se guardan.
          additionalGuests: values.attendance === "SI" ? values.additionalGuests : [],
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(payload?.error ?? "No pudimos guardar los cambios.");
        return;
      }

      onSaved();
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${uid}-name`}
            className={inputClass}
            aria-invalid={Boolean(errors.mainGuestName)}
            {...register("mainGuestName")}
          />
          {errors.mainGuestName ? (
            <p role="alert" className={errorClass}>{errors.mainGuestName.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${uid}-phone`} className={labelClass}>
            Teléfono <span className="text-rose-500">*</span>
          </label>
          <input
            id={`${uid}-phone`}
            className={inputClass}
            inputMode="tel"
            aria-invalid={Boolean(errors.mainGuestPhone)}
            {...register("mainGuestPhone")}
          />
          {errors.mainGuestPhone ? (
            <p role="alert" className={errorClass}>{errors.mainGuestPhone.message}</p>
          ) : null}
        </div>
      </div>

      <div>
        <span className={labelClass}>¿Podrá asistir?</span>
        <Controller
          control={control}
          name="attendance"
          render={({ field }) => (
            <AttendanceSelector
              value={field.value}
              disabled={isSubmitting}
              onChange={(next) => {
                field.onChange(next);
                // Al no asistir se limpian los acompañantes: no tiene sentido
                // arrastrar filas que no se van a guardar.
                if (next !== "SI" && fields.length > 0) {
                  replace([]);
                }
              }}
            />
          )}
        />
        {errors.attendance ? <p role="alert" className={errorClass}>{errors.attendance.message}</p> : null}
      </div>

      {attendance === "SI" ? (
        <div className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Acompañantes</h3>
            <p className={helpClass}>
              Agrega o quita acompañantes de esta confirmación.
            </p>
          </div>

          <GuestSlots used={fields.length} total={maxGuestsPerRsvp} />

          {fields.length > 0 ? (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <GuestRow
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  onRemove={() => remove(index)}
                />
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className={addGuestButtonClass}
            disabled={!canAddGuest}
            onClick={() => append({ name: "", relation: "FAMILIAR" })}
          >
            <span aria-hidden className="text-base leading-none">+</span>
            {canAddGuest ? "Agregar acompañante" : "Llegaste al máximo de acompañantes"}
          </button>

          {errors.additionalGuests?.message ? (
            <p role="alert" className={errorClass}>{errors.additionalGuests.message}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor={`${uid}-message`} className={labelClass}>
          Mensaje <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id={`${uid}-message`}
          rows={3}
          className={inputClass}
          {...register("message")}
        />
        {errors.message ? <p role="alert" className={errorClass}>{errors.message.message}</p> : null}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
