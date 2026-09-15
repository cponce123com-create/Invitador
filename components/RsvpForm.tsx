"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { AttendanceSelector } from "@/components/AttendanceSelector";
import { GuestRow } from "@/components/GuestRow";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import {
  cardClass,
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { createRsvpSchema, type RsvpFormValues } from "@/lib/validations/rsvp";

type Props = {
  eventId: string;
  maxGuestsPerRsvp: number;
};

const emptyValues = (eventId: string): RsvpFormValues => ({
  eventId,
  mainGuestName: "",
  mainGuestPhone: "",
  attendance: "SI",
  message: "",
  additionalGuests: [],
});

export function RsvpForm({ eventId, maxGuestsPerRsvp }: Props) {
  // El esquema depende del tope de acompañantes configurado en el evento.
  const schema = useMemo(() => createRsvpSchema(maxGuestsPerRsvp), [maxGuestsPerRsvp]);

  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<RsvpFormValues["attendance"] | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RsvpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(eventId),
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
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          eventId,
          // Si no asiste, los acompañantes no se guardan.
          additionalGuests: values.attendance === "SI" ? values.additionalGuests : [],
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(payload?.error ?? "No pudimos guardar tu confirmación.");
        return;
      }

      setConfirmed(values.attendance);
      reset(emptyValues(eventId));
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  if (confirmed) {
    return (
      <div className={`${cardClass} space-y-4 text-center`}>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-3xl">
          ✅
        </div>
        <h2 className="text-xl font-bold text-slate-900">¡Gracias por confirmar!</h2>
        <p className="text-sm text-slate-600">
          Registramos tu respuesta:{" "}
          <strong className="text-slate-900">{ATTENDANCE_LABELS[confirmed]}</strong>.
        </p>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setConfirmed(null)}
        >
          Confirmar otra persona
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-6`} noValidate>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">Confirma tu asistencia</h2>
        <p className="text-sm text-slate-500">
          Nos ayuda a organizar todo para que no falte nada.
        </p>
      </div>

      <div>
        <label htmlFor="mainGuestName" className={labelClass}>
          Tu nombre <span className="text-rose-500">*</span>
        </label>
        <input
          id="mainGuestName"
          className={inputClass}
          placeholder="Ej: María González"
          autoComplete="name"
          aria-invalid={Boolean(errors.mainGuestName)}
          {...register("mainGuestName")}
        />
        {errors.mainGuestName ? (
          <p className={errorClass}>{errors.mainGuestName.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="mainGuestPhone" className={labelClass}>
          Teléfono <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          id="mainGuestPhone"
          className={inputClass}
          placeholder="Ej: +57 300 123 4567"
          inputMode="tel"
          autoComplete="tel"
          {...register("mainGuestPhone")}
        />
        {errors.mainGuestPhone ? (
          <p className={errorClass}>{errors.mainGuestPhone.message}</p>
        ) : null}
      </div>

      <div>
        <span className={labelClass}>¿Podrás asistir?</span>
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
                // arrastrar filas a medio llenar que no se van a guardar.
                if (next !== "SI" && fields.length > 0) {
                  replace([]);
                }
              }}
            />
          )}
        />
        {errors.attendance ? <p className={errorClass}>{errors.attendance.message}</p> : null}
      </div>

      {attendance === "SI" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                ¿Vienes con alguien más?
              </h3>
              <p className={helpClass}>
                Puedes agregar hasta {maxGuestsPerRsvp} acompañante
                {maxGuestsPerRsvp === 1 ? "" : "s"}.
              </p>
            </div>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={!canAddGuest}
              onClick={() => append({ name: "", relation: "FAMILIAR" })}
            >
              + Agregar acompañante
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Sin acompañantes por ahora.
            </p>
          ) : (
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
          )}

          {errors.additionalGuests?.message ? (
            <p className={errorClass}>{errors.additionalGuests.message}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="message" className={labelClass}>
          Mensaje para el anfitrión <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="message"
          rows={3}
          className={inputClass}
          placeholder="Ej: ¡Qué emoción! Ahí estaremos."
          {...register("message")}
        />
        {errors.message ? <p className={errorClass}>{errors.message.message}</p> : null}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      ) : null}

      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar confirmación"}
      </button>
    </form>
  );
}
