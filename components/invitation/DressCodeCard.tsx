import { cardClass } from "@/lib/ui";
import { ZoomableImage } from "./ZoomableImage";

type Props = {
  /** Título del evento: se usa como texto alternativo de la foto y del visor. */
  eventTitle: string;
  dressCodeImageUrl: string | null;
};

/**
 * Tarjeta «Código de vestimenta»: la foto con la que el anfitrión indica cómo
 * se deben vestir los invitados.
 *
 * Es un Server Component: la foto se amplía con el visor de cliente
 * (`ZoomableImage`). Solo se renderiza si hay foto, así que las invitaciones
 * que no la suben se ven igual que antes.
 */
export function DressCodeCard({ eventTitle, dressCodeImageUrl }: Props) {
  return (
    <section className={`${cardClass} space-y-4`}>
      <h2 className="text-base font-bold text-slate-900">
        Código de vestimenta
      </h2>

      {dressCodeImageUrl ? (
        // Mismo ancho de variante que la foto del lugar: 800 px cubren el
        // recuadro y Cloudinary añade la densidad de pantalla con `dpr_auto`.
        <ZoomableImage
          src={dressCodeImageUrl}
          alt={`Código de vestimenta de ${eventTitle}`}
          optimizedWidth={800}
        />
      ) : null}
    </section>
  );
}
