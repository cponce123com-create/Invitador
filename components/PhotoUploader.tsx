"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizedImageUrl,
} from "@/lib/images";
import { errorClass, helpClass, secondaryButtonClass } from "@/lib/ui";

/** Foto ya subida a Cloudinary. `id` solo existe cuando viene de la base de datos. */
export type UploadedPhoto = {
  id?: string;
  url: string;
  cloudinaryId: string;
};

type Props = {
  value: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  coverUrl: string;
  onPickCover: (url: string) => void;
  maxPhotos: number;
};

type UploadSignature = {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
  maxFileBytes: number;
};

type CloudinaryUploadResult = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

export function PhotoUploader({ value, onChange, coverUrl, onPickCover, maxPhotos }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const remaining = maxPhotos - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. El backend firma la subida: el api_secret nunca llega al navegador.
      const signatureResponse = await fetch("/api/upload", { method: "POST" });
      const signature = (await signatureResponse.json().catch(() => null)) as
        | (UploadSignature & { error?: string })
        | null;

      if (!signatureResponse.ok || !signature) {
        throw new Error(signature?.error ?? "No pudimos preparar la subida de fotos.");
      }

      const maxBytes = signature.maxFileBytes || MAX_UPLOAD_BYTES;
      const uploaded: UploadedPhoto[] = [];

      for (const file of Array.from(files)) {
        if (uploaded.length >= remaining) {
          setUploadError(`Solo puedes subir ${maxPhotos} fotos por evento.`);
          break;
        }

        if (
          !ALLOWED_UPLOAD_MIME_TYPES.includes(
            file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
          )
        ) {
          setUploadError(`"${file.name}" no es JPG, PNG o WebP.`);
          continue;
        }

        if (file.size > maxBytes) {
          setUploadError(
            `"${file.name}" pesa más de ${Math.round(maxBytes / (1024 * 1024))} MB.`,
          );
          continue;
        }

        // 2. Subida directa navegador → Cloudinary (no pasa por Render).
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signature.apiKey);
        formData.append("timestamp", String(signature.timestamp));
        formData.append("signature", signature.signature);
        formData.append("folder", signature.folder);

        const uploadResponse = await fetch(signature.uploadUrl, {
          method: "POST",
          body: formData,
        });
        const result = (await uploadResponse.json().catch(() => null)) as
          | CloudinaryUploadResult
          | null;

        if (!uploadResponse.ok || !result?.secure_url || !result.public_id) {
          throw new Error(result?.error?.message ?? `No pudimos subir "${file.name}".`);
        }

        uploaded.push({
          url: result.secure_url,
          cloudinaryId: result.public_id,
        });
      }

      if (uploaded.length > 0) {
        const next = [...value, ...uploaded];
        onChange(next);
        // La primera foto del evento sirve de portada por defecto.
        if (!coverUrl) onPickCover(next[0].url);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "No pudimos subir las fotos.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id="event-photos"
          type="file"
          accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <label
          htmlFor="event-photos"
          className={`${secondaryButtonClass} cursor-pointer ${
            isUploading || remaining <= 0 ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {isUploading ? "Subiendo…" : "+ Agregar fotos"}
        </label>
        <p className={helpClass}>
          JPG, PNG o WebP · máx {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB ·{" "}
          {remaining} de {maxPhotos} disponibles
        </p>
      </div>

      {uploadError ? <p className={errorClass}>{uploadError}</p> : null}

      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((photo, index) => {
            const isCover = photo.url === coverUrl;
            return (
              <li
                key={photo.id ?? photo.cloudinaryId}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={optimizedImageUrl(photo.url, 400)}
                    alt={`Foto ${index + 1} del evento`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                  {isCover ? (
                    <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                      Portada
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
                    disabled={isCover}
                    onClick={() => onPickCover(photo.url)}
                  >
                    {isCover ? "Es portada" : "Usar de portada"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => {
                      const next = value.filter(
                        (item) => item.cloudinaryId !== photo.cloudinaryId,
                      );
                      onChange(next);
                      if (isCover) onPickCover(next[0]?.url ?? "");
                    }}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Todavía no has subido fotos.
        </p>
      )}
    </div>
  );
}
