"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizedImageUrl,
} from "@/lib/images";
import {
  requestUploadSignature,
  uploadImageFile,
  validateImageFile,
} from "@/lib/upload";
import { cn, errorClass, helpClass, labelClass, secondaryButtonClass } from "@/lib/ui";

type Props = {
  /** Id del input: también asocia la etiqueta con el selector de archivos. */
  id: string;
  label: string;
  help?: string;
  /** URL de la imagen guardada, o "" si todavía no hay ninguna. */
  value: string;
  onChange: (url: string) => void;
  /**
   * "photo": vista previa 4:3 a lo ancho (foto del lugar).
   * "qr": cuadro pequeño sobre fondo blanco (código QR de regalos).
   */
  variant?: "photo" | "qr";
};

/**
 * Subida de UNA imagen con su propia casilla, independiente de la galería de
 * fotos del evento: no gasta el cupo de fotos y no se borra al editar la
 * galería. Se sube a Cloudinary con la misma firma del dashboard
 * (`/api/upload`).
 */
export function SingleImageUploader({
  id,
  label,
  help,
  value,
  onChange,
  variant = "photo",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isQr = variant === "qr";

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const invalidFile = validateImageFile(file, MAX_UPLOAD_BYTES);
      if (invalidFile) throw new Error(invalidFile);

      // El backend firma la subida: el api_secret nunca llega al navegador.
      const signature = await requestUploadSignature();
      const uploaded = await uploadImageFile(file, signature);
      onChange(uploaded.url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "No pudimos subir la imagen.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const pickerClass = cn(
    secondaryButtonClass,
    "cursor-pointer",
    isUploading && "pointer-events-none opacity-60",
  );

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {help ? <p className={helpClass}>{help}</p> : null}
      </div>

      {value ? (
        <div className="space-y-3">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-slate-200",
              isQr
                ? "mx-auto aspect-square w-40 bg-white p-3"
                : "aspect-[4/3] w-full max-w-sm bg-slate-100",
            )}
          >
            <Image
              src={optimizedImageUrl(value, isQr ? 400 : 800)}
              alt={label}
              fill
              sizes={isQr ? "160px" : "(max-width: 640px) 100vw, 384px"}
              className={isQr ? "object-contain" : "object-cover"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className={pickerClass}>
              {isUploading ? "Subiendo…" : "Reemplazar"}
            </label>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onChange("")}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className={pickerClass}>
          {isUploading ? "Subiendo…" : "+ Subir imagen"}
        </label>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files)}
      />

      {uploadError ? <p className={errorClass}>{uploadError}</p> : null}
    </div>
  );
}
