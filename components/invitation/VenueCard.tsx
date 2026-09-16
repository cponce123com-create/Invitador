import { cardClass, secondaryButtonClass } from "@/lib/ui";
import { ZoomableImage } from "./ZoomableImage";

type Props = {
  /** Título del evento: se usa como texto alternativo de la foto y del visor. */
  eventTitle: string;
  location: string | null;
  locationImageUrl: string | null;
  mapUrl: string | null;
};

/**
 * Tarjeta «El lugar»: la foto del sitio (ampliable), la dirección y el enlace a
 * Google Maps que pega el anfitrión.
 *
 * Es un Server Component: la foto se amplía con el visor de cliente
 * (`ZoomableImage`). Solo se renderiza si hay foto o link de Maps, así que las
 * invitaciones que no los tengan se ven igual que antes.
 */
export function VenueCard({
  eventTitle,
  location,
  locationImageUrl,
  mapUrl,
}: Props) {
  return (
    <section className={`${cardClass} space-y-4`}>
      <h2 className="text-base font-bold text-slate-900">El lugar</h2>

      {locationImageUrl ? (
        <ZoomableImage
          src={locationImageUrl}
          alt={`Lugar de ${eventTitle}`}
          optimizedWidth={1200}
        />
      ) : null}

      {location ? (
        <p className="flex items-start gap-1.5 text-sm text-slate-600">
          <span aria-hidden>📍</span>
          <span className="whitespace-pre-line">{location}</span>
        </p>
      ) : null}

      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButtonClass}
        >
          Ver en Google Maps
        </a>
      ) : null}
    </section>
  );
}
