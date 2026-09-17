"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MAX_GIFT_MESSAGE } from "@/lib/constants";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizedImageUrl,
} from "@/lib/images";
import {
  cn,
  cardClass,
  errorClass,
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import {
  requestGiftUploadSignature,
  uploadImageFile,
  validateImageFile,
  type UploadedImage,
} from "@/lib/upload";
import {
  giftProofFormSchema,
  type GiftProofFormValues,
} from "@/lib/validations/gift-proof";

type Props = {
  eventId: string;
  /**
   * Artículo del catálogo que el invitado eligió, cuando el formulario llega
   * desde la ventana de compra. Sin él, el comprobante se guarda sin regalo
   * asignado: el caso de quien da efectivo o sube la captura por su cuenta.
   */
  giftItemId?: string;
};

const emptyValues = (): GiftProofFormValues => ({ senderName: "", note: "" });

/**
 * Formulario público para que un invitado adjunte el comprobante de su regalo.
 *
 * No hay sesión: la imagen se sube a Cloudinary con la firma acotada del evento
 * (`/api/upload/gift`) y los datos se guardan en `/api/gift-proofs`. La captura
 * se sube al elegirla, así que el envío es una sola petición corta y el invitado
 * ve de inmediato qué adjuntó.
 */
export function GiftProofForm({ eventId, giftItemId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GiftProofFormValues>({
    resolver: zodResolver(giftProofFormSchema),
    defaultValues: emptyValues(),
  });

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setServerError(null);
    setIsUploading(true);

    try {
      const invalidFile = validateImageFile(file, MAX_UPLOAD_BYTES);
      if (invalidFile) throw new Error(invalidFile);

      const signature = await requestGiftUploadSignature(eventId);
      setUploaded(await uploadImageFile(file, signature));
    } catch (error) {
      setUploaded(null);
      setServerError(
        error instanceof Error ? error.message : "No pudimos subir el comprobante.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    if (!uploaded) {
      setServerError("Adjunta la captura de tu comprobante.");
      return;
    }

    try {
      const response = await fetch("/api/gift-proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          eventId,
          // Solo viaja cuando el formulario viene de la ventana de compra: así el
          // comprobante queda asociado al regalo que el invitado eligió.
          ...(giftItemId ? { giftItemId } : {}),
          url: uploaded.url,
          cloudinaryId: uploaded.cloudinaryId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setServerError(
          response.status === 429
            ? "Ya enviaste varios comprobantes hace poco. Espera unos minutos e intenta de nuevo."
            : payload?.error ?? "No pudimos guardar tu comprobante.",
        );
        return;
      }

      setUploaded(null);
      reset(emptyValues());
      setSent(true);
    } catch {
      setServerError("Revisa tu conexión e intenta de nuevo.");
    }
  });

  if (sent) {
    return (
      <div className={`${cardClass} space-y-4 text-center`}>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-3xl">
          🎁
        </div>
        <h2 className="text-xl font-bold text-slate-900">¡Gracias por tu regalo!</h2>
        <p className="text-sm text-slate-600">
          El anfitrión ya tiene tu comprobante registrado.
        </p>
      </div>
    );
  }

  const pickerClass = cn(
    secondaryButtonClass,
    "cursor-pointer",
    isUploading && "pointer-events-none opacity-60",
  );

  return (
    <form onSubmit={onSubmit} className={`${cardClass} space-y-6`} noValidate>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">Sube tu comprobante</h2>
        <p className="text-sm text-slate-500">
          Si ya enviaste tu regalo, adjunta la captura para que el anfitrión lo tenga
          registrado.
        </p>
      </div>

      <div>
        <label htmlFor="senderName" className={labelClass}>
          Tu nombre <span className="text-rose-500">*</span>
        </label>
        <input
          id="senderName"
          className={inputClass}
          placeholder="Ej: María González"
          autoComplete="name"
          aria-invalid={Boolean(errors.senderName)}
          {...register("senderName")}
        />
        {errors.senderName ? (
          <p role="alert" className={errorClass}>{errors.senderName.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="giftProofFile" className={labelClass}>
          Captura del comprobante <span className="text-rose-500">*</span>
        </label>
        <p className={helpClass}>
          JPG, PNG o WebP, hasta {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
        </p>

        {uploaded ? (
          <div className="mt-3 space-y-3">
            <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <Image
                src={optimizedImageUrl(uploaded.url, 800)}
                alt="Comprobante adjunto"
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                className="object-cover"
              />
            </div>
            <label htmlFor="giftProofFile" className={pickerClass}>
              {isUploading ? "Subiendo…" : "Reemplazar"}
            </label>
          </div>
        ) : (
          <label htmlFor="giftProofFile" className={cn(pickerClass, "mt-3")}>
            {isUploading ? "Subiendo…" : "+ Adjuntar captura"}
          </label>
        )}

        <input
          ref={fileInputRef}
          id="giftProofFile"
          type="file"
          accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files)}
        />
      </div>

      <div>
        <label htmlFor="note" className={labelClass}>
          Nota <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={MAX_GIFT_MESSAGE}
          className={inputClass}
          placeholder="Ej: Un abrazo grande, ahí va nuestro aporte."
          {...register("note")}
        />
        {errors.note ? <p role="alert" className={errorClass}>{errors.note.message}</p> : null}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
      ) : null}

      <button
        type="submit"
        className={`${primaryButtonClass} w-full`}
        disabled={isSubmitting || isUploading}
      >
        {isSubmitting ? "Enviando…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
