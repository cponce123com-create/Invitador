import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { EventStatusToggle } from "@/components/EventStatusToggle";
import { GiftProofList } from "@/components/GiftProofList";
import { RsvpTable } from "@/components/RsvpTable";
import { ShareLink } from "@/components/ShareLink";
import { StatsCards } from "@/components/StatsCards";
import { EVENT_TYPE_EMOJI, getEventTypeLabel } from "@/lib/constants";
import { computeEventStats, getHostEvent } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { getCurrentHost, requireHost } from "@/lib/session";
import {
  cardClass,
  ghostButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const host = await getCurrentHost();
  if (!host) return { title: "Panel del evento" };

  const event = await getHostEvent(host.id, params.id);
  return { title: event?.title ?? "Evento no encontrado" };
}

export default async function EventDashboardPage({ params }: PageProps) {
  const host = await requireHost();
  const event = await getHostEvent(host.id, params.id);
  if (!event) notFound();

  const stats = computeEventStats(event.rsvps);
  const typeLabel = getEventTypeLabel(event.type, event.customLabel);
  const dateLabel = formatEventDate(event.eventDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className={ghostButtonClass}>
            ← Mis eventos
          </Link>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span aria-hidden>{EVENT_TYPE_EMOJI[event.type]}</span>
            {typeLabel}
          </div>
          <h1 className="text-2xl font-black text-slate-900">{event.title}</h1>
          <p className="text-sm text-slate-600">
            {dateLabel ?? "Sin fecha definida"}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <Link
          href={`/dashboard/eventos/${event.id}/editar`}
          className={primaryButtonClass}
        >
          Editar evento
        </Link>
      </div>

      <StatsCards stats={stats} />

      <section className={cardClass}>
        <h2 className="text-base font-bold text-slate-900">Link público</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Compártelo por WhatsApp para recibir confirmaciones.
        </p>
        <ShareLink slug={event.slug} title={event.title} />
      </section>

      <section className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Confirmaciones{" "}
            <span className="text-slate-400">({event.rsvps.length})</span>
          </h2>
          <a
            href={`/api/events/${event.id}/rsvps/export`}
            className={secondaryButtonClass}
          >
            Exportar CSV
          </a>
        </div>
        <RsvpTable rsvps={event.rsvps} />
      </section>

      <section className={`${cardClass} space-y-4`}>
        <h2 className="text-base font-bold text-slate-900">
          Estado y acciones
        </h2>
        <EventStatusToggle eventId={event.id} isActive={event.isActive} />
        <div className="border-t border-slate-100 pt-4">
          <DeleteEventButton eventId={event.id} />
        </div>
      </section>
    </div>
  );
}
