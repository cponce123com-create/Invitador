import { cardClass } from "@/lib/ui";
import { ZoomableImage } from "./ZoomableImage";

type Props = {
  /** Título del evento: se usa como texto alternativo del QR y del visor. */
  eventTitle: string;
  giftQrUrl: string | null;
  giftMessage: string | null;
};

/**
 * Tarjeta «Mesa de regalos»: un único QR ampliable y el texto que lo acompaña
 * (llave, número de cuenta…).
 *
 * Es un Server Component y solo se renderiza cuando el anfitrión subió un QR,
 * así que los eventos sin mesa de regalos no cambian.
 */
export function GiftCard({ eventTitle, giftQrUrl, giftMessage }: Props) {
  return (
    <section className={`${cardClass} space-y-4`}>
      <h2 className="text-base font-bold text-slate-900">Mesa de regalos</h2>

      {giftMessage ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {giftMessage}
        </p>
      ) : null}

      {giftQrUrl ? (
        <div className="space-y-2">
          <ZoomableImage
            src={giftQrUrl}
            alt={`Código QR de la mesa de regalos de ${eventTitle}`}
            optimizedWidth={600}
            sizes="224px"
            wrapperClassName="mx-auto aspect-square w-56 bg-white p-3"
            imageClassName="object-contain"
          />
          <p className="text-center text-xs text-slate-500">
            Toca el código para verlo más grande.
          </p>
        </div>
      ) : null}
    </section>
  );
}
