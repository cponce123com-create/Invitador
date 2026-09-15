"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  BackgroundPicker,
  useBackgroundTemplates,
} from "@/components/BackgroundPicker";
import { EventHero } from "@/components/EventHero";
import { PhotoUploader } from "@/components/PhotoUploader";
import {
  EVENT_DETAIL_PLACEHOLDER,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  getEventTypeLabel,
  MAX_EVENT_PHOTOS,
  MAX_GUESTS_PER_RSVP_LIMIT,
} from "@/lib/constants";
import { formatEventDate, parseWallClockInput } from "@/lib/format";
import {
  cardClass,
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { eventFormSchema, type EventFormValues } from "@/lib/validations/event";

type Props = {
  mode: "create" | "edit";
  defaultValues: EventFormValues;
  /** Requerido cuando `mode === "edit"`. */
  eventId?: string;
};

type ApiResult = {
  event?: { id: string };
  error?: string;
  issues?: Record<string, string[]>;
};

/**
 * Formulario de creación y edición de eventos.
 *
 * Es un Client Component porque necesita React Hook Form, la subida de fotos a
 * Cloudinary y la redirección tras guardar. La validación con Zod es la misma
 * que corre en el servidor (`lib/validations/event.ts`).
 */
export function EventForm({ mode, defaultValues, eventId }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const { templates, isLoading: backgroundsLoading, error: backgroundsError } =
    useBackgroundTemplates();

  const selectedType = watch("type");
  const coverImageUrl = watch("coverImageUrl") ?? "";
  const isEdit = mode === "edit";

  // Vista previa en vivo del Hero público, alimentada con los valores actuales
  // del formulario (sin guardar).
  const backgroundTemplateId = watch("backgroundTemplateId") ?? "";
  const selectedTemplate =
    templates.find((template) => template.id === backgroundTemplateId) ?? null;
  const previewTitle = (watch("title") ?? "").trim();
  const previewCustomLabel = watch("customLabel") ?? "";
  const previewDateLabel = formatEventDate(
    parseWallClockInput(watch("eventDate") ?? ""),
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    const payload: EventFormValues = {
      ...values,
      customLabel: values.customLabel ?? "",
      ageOrDetail: values.ageOrDetail ?? "",
      eventDate: values.eventDate ?? "",
      location: values.location ?? "",
      description: values.description ?? "",
      coverImageUrl: values.coverImageUrl ?? "",
      backgroundTemplateId: values.backgroundTemplateId ?? "",
      photos: values.photos ?? [],
    };

    try {
      const response = await fetch(
        isEdit ? `/api/events/${eventId}` : "/api/events",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json().catch(() => null)) as ApiResult | null;

      if (!response.ok || !result?.event) {
        const firstIssue = result?.issues
          ? Object.values(result.issues).flat()[0]
          : undefined;
        setServerError(
          result?.error ?? firstIssue ?? "No pudimos guardar el evento.",
        );
        return;
      }

      router.push(`/dashboard/eventos/${result.event.id}`);
      router.refresh();
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className={`${cardClass} space-y-5`}>
        <h2 className="text-base font-bold text-slate-900">Datos del evento</h2>

        <div>
          <label htmlFor="title" className={labelClass}>
            Título <span className="text-rose-500">*</span>
          </label>
          <input
            id="title"
            className={inputClass}
            placeholder="Ej: Cumpleaños de Sofía"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          {errors.title ? (
            <p className={errorClass}>{errors.title.message}</p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className={labelClass}>
              Tipo de evento <span className="text-rose-500">*</span>
            </label>
            <select id="type" className={inputClass} {...register("type")}>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {errors.type ? (
              <p className={errorClass}>{errors.type.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="customLabel" className={labelClass}>
              Etiqueta personalizada{" "}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="customLabel"
              className={inputClass}
              placeholder="Ej: Baby Shower de Sofía"
              {...register("customLabel")}
            />
            <p className={helpClass}>
              Si la dejas vacía se usa el nombre del tipo de evento.
            </p>
            {errors.customLabel ? (
              <p className={errorClass}>{errors.customLabel.message}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ageOrDetail" className={labelClass}>
              Detalle <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="ageOrDetail"
              className={inputClass}
              placeholder={EVENT_DETAIL_PLACEHOLDER[selectedType]}
              {...register("ageOrDetail")}
            />
            {errors.ageOrDetail ? (
              <p className={errorClass}>{errors.ageOrDetail.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="eventDate" className={labelClass}>
              Fecha y hora{" "}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              className={inputClass}
              aria-invalid={Boolean(errors.eventDate)}
              {...register("eventDate")}
            />
            {errors.eventDate ? (
              <p className={errorClass}>{errors.eventDate.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>
            Ubicación <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="location"
            className={inputClass}
            placeholder="Ej: Salón Los Jardines, Calle 10 #5-20"
            {...register("location")}
          />
          {errors.location ? (
            <p className={errorClass}>{errors.location.message}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Descripción / mensaje{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            className={inputClass}
            placeholder="Escribe el mensaje que verán tus invitados."
            {...register("description")}
          />
          {errors.description ? (
            <p className={errorClass}>{errors.description.message}</p>
          ) : null}
        </div>
      </section>

      <section className={`${cardClass} space-y-3`}>
        <div>
          <h2 className="text-base font-bold text-slate-900">Fotos</h2>
          <p className={helpClass}>
            La foto marcada como portada es la que se verá al compartir el link.
          </p>
        </div>

        <Controller
          control={control}
          name="photos"
          render={({ field }) => (
            <PhotoUploader
              value={field.value ?? []}
              onChange={field.onChange}
              coverUrl={coverImageUrl}
              onPickCover={(url) =>
                setValue("coverImageUrl", url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              maxPhotos={MAX_EVENT_PHOTOS}
            />
          )}
        />

        {errors.photos ? (
          <p className={errorClass}>{errors.photos.message}</p>
        ) : null}
      </section>

      <section className={`${cardClass} space-y-4`}>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Fondo de la portada
          </h2>
          <p className={helpClass}>
            Elige una plantilla para cuando el evento no tenga foto de portada.
            Son fondos generados: no subes ninguna imagen.
          </p>
        </div>

        <Controller
          control={control}
          name="backgroundTemplateId"
          render={({ field }) => (
            <BackgroundPicker
              eventType={selectedType}
              value={field.value ?? ""}
              onChange={field.onChange}
              templates={templates}
              isLoading={backgroundsLoading}
              error={backgroundsError}
            />
          )}
        />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Vista previa</h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <EventHero
              title={previewTitle || "Título del evento"}
              type={selectedType}
              typeLabel={getEventTypeLabel(selectedType, previewCustomLabel)}
              detail={watch("ageOrDetail") ?? ""}
              dateLabel={previewDateLabel}
              location={watch("location") ?? ""}
              coverImageUrl={coverImageUrl}
              backgroundTemplate={selectedTemplate}
            />
          </div>
        </div>
      </section>

      <section className={`${cardClass} space-y-5`}>
        <h2 className="text-base font-bold text-slate-900">Invitados</h2>

        <div className="sm:max-w-xs">
          <label htmlFor="maxGuestsPerRsvp" className={labelClass}>
            Acompañantes por confirmación
          </label>
          <input
            id="maxGuestsPerRsvp"
            type="number"
            min={0}
            max={MAX_GUESTS_PER_RSVP_LIMIT}
            className={inputClass}
            {...register("maxGuestsPerRsvp", { valueAsNumber: true })}
          />
          <p className={helpClass}>
            Cuántos invitados adicionales puede agregar cada persona (0 a{" "}
            {MAX_GUESTS_PER_RSVP_LIMIT}).
          </p>
          {errors.maxGuestsPerRsvp ? (
            <p className={errorClass}>{errors.maxGuestsPerRsvp.message}</p>
          ) : null}
        </div>

        {isEdit ? (
          <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              {...register("isActive")}
            />
            <span>
              Invitación publicada
              <span className="mt-0.5 block text-xs text-slate-500">
                Si la desactivas, el link público deja de funcionar hasta que la
                reactives.
              </span>
            </span>
          </label>
        ) : null}
      </section>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={primaryButtonClass}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear evento"}
        </button>
        <Link
          href={isEdit && eventId ? `/dashboard/eventos/${eventId}` : "/dashboard"}
          className={secondaryButtonClass}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
