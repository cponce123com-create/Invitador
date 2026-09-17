"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MAX_GIFT_ITEM_DESCRIPTION, MAX_GIFT_ITEM_TITLE } from "@/lib/constants";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizedImageUrl,
} from "@/lib/images";
import {
  cn,
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "@/lib/ui";
import {
  requestUploadSignature,
  uploadImageFile,
  validateImageFile,
} from "@/lib/upload";
import { giftItemInputSchema } from "@/lib/validations/gift-item";

/**
 * Un artículo del catálogo mientras se edita: todo texto, como en el resto del
 * formulario. `id` solo está presente si el artículo ya existe en la base.
 */
export type GiftItemDraft = {
  id?: string;
  title: string;
  description?: string;
  price?: string;
  imageUrl: string;
  cloudinaryId: string;
};

type Props = {
  value: GiftItemDraft[];
  onChange: (items: GiftItemDraft[]) => void;
  /** Tope del catálogo: el formulario ya lo valida, aquí solo se informa. */
  maxItems: number;
  /**
   * Se activa tras un intento de envío fallido: solo entonces se muestran los
   * mensajes por artículo, para no regañar a quien todavía está escribiendo.
   */
  showErrors: boolean;
};

const emptyItem = (): GiftItemDraft => ({
  title: "",
  description: "",
  price: "",
  imageUrl: "",
  cloudinaryId: "",
});

/** Mensajes por campo de un artículo, o `{}` si todavía no hay ninguno. */
function itemMessages(item: GiftItemDraft): Record<string, string> {
  const parsed = giftItemInputSchema.safeParse(item);
  if (parsed.success) return {};

  const messages: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !messages[field]) {
      messages[field] = issue.message;
    }
  }
  return messages;
}

/**
 * Editor del catálogo de regalos del evento.
 *
 * Cada artículo se sube a la carpeta del anfitrión con la misma firma del
 * dashboard (`/api/upload`), así que la foto se limpia con `isHostAssetId` igual
 * que las de la galería. La lista es controlada (`value` / `onChange`): el
 * formulario es la única fuente de verdad, como en `PhotoUploader`.
 */
export function GiftItemEditor({
  value,
  onChange,
  maxItems,
  showErrors,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Índice del artículo al que pertenece la próxima foto elegida. */
  const targetIndex = useRef<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isFull = value.length >= maxItems;

  function updateItem(index: number, patch: Partial<GiftItemDraft>) {
    onChange(
      value.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    const index = targetIndex.current;
    targetIndex.current = null;
    if (!file || index === null) return;

    setUploadError(null);
    setUploadingIndex(index);

    try {
      const invalidFile = validateImageFile(file, MAX_UPLOAD_BYTES);
      if (invalidFile) throw new Error(invalidFile);

      // El backend firma la subida: el api_secret nunca llega al navegador.
      const signature = await requestUploadSignature();
      const uploaded = await uploadImageFile(file, signature);
      updateItem(index, {
        imageUrl: uploaded.url,
        cloudinaryId: uploaded.cloudinaryId,
      });
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "No pudimos subir la foto del regalo.",
      );
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const pickerClass = cn(
    secondaryButtonClass,
    "cursor-pointer",
    uploadingIndex !== null && "pointer-events-none opacity-60",
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={cn(secondaryButtonClass, isFull && "opacity-60")}
          disabled={isFull}
          onClick={() => onChange([...value, emptyItem()])}
        >
          + Agregar regalo
        </button>
        <p className={helpClass}>
          {value.length} de {maxItems} · la foto puede ser del producto o una
          referencia.
        </p>
      </div>

      {uploadError ? (
        <p role="alert" className={errorClass}>{uploadError}</p>
      ) : null}

      {value.length > 0 ? (
        <ul className="space-y-4">
          {value.map((item, index) => {
            const messages = showErrors ? itemMessages(item) : {};
            const isUploading = uploadingIndex === index;

            return (
              <li
                key={item.id ?? `nuevo-${index}`}
                className="space-y-4 rounded-2xl border border-slate-200 p-3"
              >
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <Image
                        src={optimizedImageUrl(item.imageUrl, 400)}
                        alt={item.title || `Foto del regalo ${index + 1}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden
                      className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-2xl text-slate-300"
                    >
                      🎁
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <label
                        htmlFor={`gift-item-title-${index}`}
                        className={labelClass}
                      >
                        Nombre del regalo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id={`gift-item-title-${index}`}
                        className={inputClass}
                        maxLength={MAX_GIFT_ITEM_TITLE}
                        placeholder="Ej: Juego de sábanas queen"
                        value={item.title}
                        onChange={(event) =>
                          updateItem(index, { title: event.target.value })
                        }
                      />
                      {messages.title ? (
                        <p role="alert" className={errorClass}>
                          {messages.title}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`gift-item-price-${index}`}
                        className={labelClass}
                      >
                        Precio{" "}
                        <span className="font-normal text-slate-400">
                          (opcional)
                        </span>
                      </label>
                      <input
                        id={`gift-item-price-${index}`}
                        inputMode="decimal"
                        className={inputClass}
                        placeholder="Ej: 120"
                        value={item.price ?? ""}
                        onChange={(event) =>
                          updateItem(index, { price: event.target.value })
                        }
                      />
                      <p className={helpClass}>
                        Solo el número, en soles. Si lo dejas vacío, el regalo se
                        muestra sin precio.
                      </p>
                      {messages.price ? (
                        <p role="alert" className={errorClass}>
                          {messages.price}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`gift-item-description-${index}`}
                    className={labelClass}
                  >
                    Descripción{" "}
                    <span className="font-normal text-slate-400">
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    id={`gift-item-description-${index}`}
                    rows={2}
                    maxLength={MAX_GIFT_ITEM_DESCRIPTION}
                    className={inputClass}
                    placeholder="Ej: Talla queen, color beige. La vimos en Ripley."
                    value={item.description ?? ""}
                    onChange={(event) =>
                      updateItem(index, { description: event.target.value })
                    }
                  />
                  {messages.description ? (
                    <p role="alert" className={errorClass}>
                      {messages.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="gift-item-photo"
                    className={pickerClass}
                    onClick={() => {
                      targetIndex.current = index;
                    }}
                  >
                    {isUploading
                      ? "Subiendo…"
                      : item.imageUrl
                        ? "Reemplazar foto"
                        : "+ Subir foto"}
                  </label>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    onClick={() =>
                      onChange(value.filter((_, position) => position !== index))
                    }
                  >
                    Quitar
                  </button>
                  {messages.imageUrl || messages.cloudinaryId ? (
                    <p role="alert" className={errorClass}>
                      Sube una foto del regalo.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Todavía no has publicado regalos. Agrega el primero con su foto.
        </p>
      )}

      <input
        ref={fileInputRef}
        id="gift-item-photo"
        type="file"
        accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files)}
      />
    </div>
  );
}
