import type { Metadata } from "next";
import Link from "next/link";
import {
  EVENT_TYPE_EMOJI,
  getEventTypeLabel,
} from "@/lib/constants";
import { formatEventDate, isPastEvent } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireHost } from "@/lib/session";
import {
  cardClass,
  ghostButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis eventos" };

export default async function DashboardPage() {
  const host = await requireHost();

  const events = await prisma.event.findMany({
    where: { hostId: host.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rsvps: true, photos: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Mis eventos</h1>
          <p className="text-sm text-slate-500">
            Crea, comparte y revisa las confirmaciones de tus invitaciones.
          </p>
        </div>
        <Link href="/dashboard/eventos/nuevo" className={primaryButtonClass}>
          + Nuevo evento
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="text-4xl" aria-hidden>
            🎈
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            Todavía no tienes eventos
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Crea tu primera invitación y comparte el link con tus invitados.
          </p>
          <Link
            href="/dashboard/eventos/nuevo"
            className={`${primaryButtonClass} mt-5`}
          >
            Crear mi primer evento
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => {
            const typeLabel = getEventTypeLabel(event.type, event.customLabel);
            const dateLabel = formatEventDate(event.eventDate);
            const past = isPastEvent(event.eventDate);

            return (
              <li key={event.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span aria-hidden>{EVENT_TYPE_EMOJI[event.type]}</span>
                      <span className="truncate">{typeLabel}</span>
                    </div>
                    <h2 className="mt-1 truncate text-lg font-bold text-slate-900">
                      {event.title}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {dateLabel ?? "Sin fecha definida"}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        event.isActive
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                          : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {event.isActive ? "Publicado" : "Desactivado"}
                    </span>
                    {past ? (
                      <span className="text-xs text-slate-400">
                        Evento pasado
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <dt className="text-slate-400">Confirmaciones</dt>
                    <dd className="font-semibold text-slate-900">
                      {event._count.rsvps}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="text-slate-400">Fotos</dt>
                    <dd className="font-semibold text-slate-900">
                      {event._count.photos}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/eventos/${event.id}`}
                    className={primaryButtonClass}
                  >
                    Ver panel
                  </Link>
                  <Link
                    href={`/e/${event.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={secondaryButtonClass}
                  >
                    Ver invitación
                  </Link>
                  <Link
                    href={`/dashboard/eventos/${event.id}/editar`}
                    className={ghostButtonClass}
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
