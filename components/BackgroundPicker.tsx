"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  backgroundStyleFor,
  type BackgroundKindValue,
} from "@/lib/backgrounds";
import type { EventTypeValue } from "@/lib/constants";
import { cn, errorClass, helpClass, labelClass } from "@/lib/ui";

/** Fondo tal como lo devuelve `GET /api/backgrounds`. */
export type BackgroundOption = {
  id: string;
  name: string;
  eventType: EventTypeValue | null;
  kind: BackgroundKindValue;
  colors: string[];
  patternName: string | null;
  isPremium: boolean;
  order: number;
};

/**
 * Carga el catálogo de fondos una sola vez. Vive aquí (y no dentro del picker)
 * para que el formulario pueda resolver el fondo seleccionado y mostrarlo en la
 * vista previa del `EventHero`.
 */
export function useBackgroundTemplates() {
  const [templates, setTemplates] = useState<BackgroundOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/backgrounds");
        const data = (await response.json().catch(() => null)) as
          | { backgrounds?: BackgroundOption[] }
          | null;

        if (!active) return;
        if (!response.ok || !data?.backgrounds) {
          setError("No pudimos cargar los fondos.");
          return;
        }
        setTemplates(data.backgrounds);
      } catch {
        if (active) setError("Revisa tu conexión e intenta de nuevo.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { templates, isLoading, error };
}

type Props = {
  /** Tipo de evento actual del formulario: filtra qué fondos se muestran. */
  eventType: EventTypeValue;
  /** id del fondo elegido. Cadena vacía = sin fondo (degradado por defecto). */
  value: string;
  onChange: (id: string) => void;
  templates: BackgroundOption[];
  isLoading?: boolean;
  error?: string | null;
};

/**
 * Galería de fondos demo: miniaturas generadas en CSS (sin imágenes), con
 * selección accesible por teclado (`aria-pressed`) y responsive mobile-first.
 */
export function BackgroundPicker({
  eventType,
  value,
  onChange,
  templates,
  isLoading = false,
  error = null,
}: Props) {
  // Se filtran en el cliente para que al cambiar el tipo de evento la galería
  // se actualice al instante, sin volver a pedir datos al servidor.
  const visible = templates.filter(
    (template) =>
      template.eventType === null || template.eventType === eventType,
  );

  return (
    <div className="space-y-3">
      <div>
        <span className={labelClass}>Fondo</span>
        <p className={helpClass}>
          Se muestra cuando el evento no tiene foto de portada. No requiere subir
          ninguna imagen.
        </p>
      </div>

      {error ? <p className={errorClass}>{error}</p> : null}

      <div
        role="group"
        aria-label="Fondos disponibles"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <BackgroundThumb
          label="Sin fondo"
          selected={value === ""}
          onSelect={() => onChange("")}
          style={backgroundStyleFor(null)}
        />

        {isLoading && templates.length === 0 ? (
          <p className={cn(helpClass, "col-span-2 self-center")}>
            Cargando fondos…
          </p>
        ) : (
          visible.map((template) => (
            <BackgroundThumb
              key={template.id}
              label={template.name}
              selected={value === template.id}
              onSelect={() => onChange(template.id)}
              style={backgroundStyleFor(template)}
              premium={template.isPremium}
            />
          ))
        )}
      </div>
    </div>
  );
}

type ThumbProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  style: CSSProperties;
  premium?: boolean;
};

function BackgroundThumb({
  label,
  selected,
  onSelect,
  style,
  premium = false,
}: ThumbProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        selected
          ? "border-brand-600 ring-2 ring-brand-500"
          : "border-slate-200 hover:border-slate-300",
      )}
    >
      <span className="relative block h-16 w-full" style={style}>
        {selected ? (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-lg text-white drop-shadow"
          >
            ✓
          </span>
        ) : null}
      </span>
      <span className="flex items-center justify-between gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700">
        <span className="truncate">{label}</span>
        {premium ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
            Premium
          </span>
        ) : null}
      </span>
    </button>
  );
}
