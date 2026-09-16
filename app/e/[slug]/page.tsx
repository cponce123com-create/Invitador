import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventHero } from "@/components/EventHero";
import { GiftCard } from "@/components/invitation/GiftCard";
import { GiftProofForm } from "@/components/invitation/GiftProofForm";
import { InvitationShell } from "@/components/invitation/InvitationShell";
import { PhotoWall } from "@/components/invitation/PhotoWall";
import { Reveal } from "@/components/invitation/Reveal";
import { VenueCard } from "@/components/invitation/VenueCard";
import { RsvpForm } from "@/components/RsvpForm";
import { getEventTypeLabel } from "@/lib/constants";
import { getPublicEventBySlug } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { socialImageUrl } from "@/lib/images";
import { getInvitationTheme } from "@/lib/invitation-theme";
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

/**
 * Invitación pública. `InvitationShell` aporta la capa animada (partículas,
 * confeti, cortina de apertura) y las secciones se revelan al hacer scroll.
 */
export default async function PublicEventPage({ params }: PageProps) {
  const event = await getPublicEventBySlug(params.slug);
  if (!event) notFound();

  const typeLabel = getEventTypeLabel(event.type, event.customLabel);
  const dateLabel = formatEventDate(event.eventDate);
  const theme = getInvitationTheme(event.type);

  return (
    <InvitationShell theme={theme}>
      <EventHero
        title={event.title}
        type={event.type}
        typeLabel={typeLabel}
        detail={event.ageOrDetail}
        dateLabel={dateLabel}
        location={event.location}
        coverImageUrl={event.coverImageUrl}
        backgroundTemplate={event.backgroundTemplate}
        animate
        greeting={theme.greeting}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {event.locationImageUrl || event.mapUrl ? (
          <Reveal>
            <VenueCard
              eventTitle={event.title}
              location={event.location}
              locationImageUrl={event.locationImageUrl}
              mapUrl={event.mapUrl}
            />
          </Reveal>
        ) : null}

        {event.description ? (
          <Reveal>
            <section className={cardClass}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            </section>
          </Reveal>
        ) : null}

        {event.photos.length > 0 ? (
          <Reveal>
            <section className={`${cardClass} space-y-4`}>
              <h2 className="text-base font-bold text-slate-900">Fotos</h2>
              <PhotoWall photos={event.photos} title={event.title} />
            </section>
          </Reveal>
        ) : null}

        <Reveal delay={80}>
          <RsvpForm
            eventId={event.id}
            maxGuestsPerRsvp={event.maxGuestsPerRsvp}
          />
        </Reveal>

        {event.giftQrUrl ? (
          <Reveal>
            <GiftCard
              eventTitle={event.title}
              giftQrUrl={event.giftQrUrl}
              giftMessage={event.giftMessage}
            />
          </Reveal>
        ) : null}

        {/* El comprobante pertenece a la mesa de regalos: sin regalos no hay nada
            que comprobar, así que el formulario solo aparece con la sección. */}
        {event.giftQrUrl ? (
          <Reveal>
            <GiftProofForm eventId={event.id} />
          </Reveal>
        ) : null}

        <footer className="space-y-1 pt-2 text-center text-xs text-slate-400">
          <p>Invitación creada con Invitador</p>
          <p className="font-medium text-slate-500">
            Desarrollado por Pisanucas Tec
          </p>
        </footer>
      </div>
    </InvitationShell>
  );
}
