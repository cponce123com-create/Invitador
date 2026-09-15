import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventHero } from "@/components/EventHero";
import { PhotoGallery } from "@/components/PhotoGallery";
import { RsvpForm } from "@/components/RsvpForm";
import { getEventTypeLabel } from "@/lib/constants";
import { getPublicEventBySlug } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { socialImageUrl } from "@/lib/images";
import { cardClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

/**
 * Meta tags dinámicos: al compartir el link por WhatsApp se muestra la foto de
 * portada, el título y la descripción del evento.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const event = await getPublicEventBySlug(params.slug);
  if (!event) return { title: "Invitación no encontrada" };

  const description =
    event.description?.trim().slice(0, 160) ||
    `Te invitamos a ${event.title}. Confirma tu asistencia.`;
  const images = event.coverImageUrl
    ? [socialImageUrl(event.coverImageUrl)]
    : undefined;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images,
    },
  };
}

export default async function PublicEventPage({ params }: PageProps) {
  const event = await getPublicEventBySlug(params.slug);
  if (!event) notFound();

  const typeLabel = getEventTypeLabel(event.type, event.customLabel);
  const dateLabel = formatEventDate(event.eventDate);

  return (
    <div className="min-h-dvh bg-slate-50 pb-16">
      <EventHero
        title={event.title}
        type={event.type}
        typeLabel={typeLabel}
        detail={event.ageOrDetail}
        dateLabel={dateLabel}
        location={event.location}
        coverImageUrl={event.coverImageUrl}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {event.description ? (
          <section className={cardClass}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {event.description}
            </p>
          </section>
        ) : null}

        {event.photos.length > 0 ? (
          <section className={`${cardClass} space-y-3`}>
            <h2 className="text-base font-bold text-slate-900">Fotos</h2>
            <PhotoGallery photos={event.photos} title={event.title} />
          </section>
        ) : null}

        <RsvpForm
          eventId={event.id}
          maxGuestsPerRsvp={event.maxGuestsPerRsvp}
        />

        <footer className="pt-2 text-center text-xs text-slate-400">
          Invitación creada con Invitador
        </footer>
      </div>
    </div>
  );
}
