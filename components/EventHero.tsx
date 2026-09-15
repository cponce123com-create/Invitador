import Image from "next/image";
import {
  backgroundStyleFor,
  type BackgroundTemplateLike,
} from "@/lib/backgrounds";
import { EVENT_TYPE_EMOJI, type EventTypeValue } from "@/lib/constants";
import { optimizedImageUrl } from "@/lib/images";

type Props = {
  title: string;
  type: EventTypeValue;
  typeLabel: string;
  detail?: string | null;
  dateLabel?: string | null;
  location?: string | null;
  coverImageUrl?: string | null;
  /** Fondo demo elegido por el anfitrión. Se ignora si hay foto de portada. */
  backgroundTemplate?: BackgroundTemplateLike | null;
};

/**
 * Portada de la invitación pública: foto, tipo de evento, fecha y lugar.
 *
 * Prioridad del fondo:
 *  1. foto de portada (`coverImageUrl`) + overlay oscuro (comportamiento previo);
 *  2. fondo demo (`backgroundTemplate`) + un overlay suave, para que el texto
 *     blanco siga siendo legible sobre paletas claras (baby shower, boda…);
 *  3. degradado por defecto, para no romper los eventos ya existentes.
 */
export function EventHero({
  title,
  type,
  typeLabel,
  detail,
  dateLabel,
  location,
  coverImageUrl,
  backgroundTemplate,
}: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-900">
      {coverImageUrl ? (
        <>
          <Image
            src={optimizedImageUrl(coverImageUrl, 1200)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-900/25" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={backgroundStyleFor(backgroundTemplate)}
          />
          {backgroundTemplate ? (
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/35 to-slate-950/10" />
          ) : null}
        </>
      )}

      <div className="relative mx-auto flex min-h-[21rem] max-w-3xl flex-col justify-end gap-3 px-5 py-10 text-white sm:min-h-[26rem] sm:py-14">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
          <span aria-hidden>{EVENT_TYPE_EMOJI[type]}</span>
          {typeLabel}
        </span>

        <h1 className="text-3xl font-black leading-tight drop-shadow-sm sm:text-5xl">
          {title}
        </h1>

        {detail ? <p className="text-lg font-medium text-white/90">{detail}</p> : null}

        <dl className="mt-1 flex flex-col gap-2 text-sm text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {dateLabel ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Fecha</dt>
              <span aria-hidden>📅</span>
              <dd>{dateLabel}</dd>
            </div>
          ) : null}
          {location ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Lugar</dt>
              <span aria-hidden>📍</span>
              <dd>{location}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
