"use client";

import { useEffect, useMemo, useState } from "react";
import { QR_QUIET_ZONE, createQrMatrix, qrPathData, qrSvgSize, type QrMatrix } from "@/lib/qr";
import { cn, errorClass, helpClass, secondaryButtonClass } from "@/lib/ui";

type Props = {
  slug: string;
  title: string;
  className?: string;
};

const DOWNLOAD_WIDTH = 1080;
const DOWNLOAD_PADDING = 72;
const NAME_FONT =
  '600 46px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const NAME_LINE_HEIGHT = 62;
const NAME_MAX_LINES = 2;

/** Parte el nombre del evento en líneas que quepan en el ancho indicado. */
function wrapTitle(
  context: CanvasRenderingContext2D,
  title: string,
  maxWidth: number,
): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= NAME_MAX_LINES) return lines;

  const kept = lines.slice(0, NAME_MAX_LINES);
  let last = kept[NAME_MAX_LINES - 1];
  while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[NAME_MAX_LINES - 1] = `${last}…`;
  return kept;
}

/** Dibuja el QR y el nombre del evento en un lienzo listo para descargar. */
function buildQrImage(matrix: QrMatrix, title: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no permite dibujar el QR.");

  context.font = NAME_FONT;
  const lines = wrapTitle(context, title, DOWNLOAD_WIDTH - DOWNLOAD_PADDING * 2);

  const modules = matrix.size + QR_QUIET_ZONE * 2;
  const moduleSize = Math.floor((DOWNLOAD_WIDTH - DOWNLOAD_PADDING * 2) / modules);
  const symbolSize = moduleSize * modules;
  const symbolX = Math.round((DOWNLOAD_WIDTH - symbolSize) / 2);
  const nameHeight = lines.length > 0 ? 48 + lines.length * NAME_LINE_HEIGHT : 0;

  canvas.width = DOWNLOAD_WIDTH;
  canvas.height = DOWNLOAD_PADDING * 2 + symbolSize + nameHeight;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#0f172a";
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.modules[row][col]) continue;
      context.fillRect(
        symbolX + (col + QR_QUIET_ZONE) * moduleSize,
        DOWNLOAD_PADDING + (row + QR_QUIET_ZONE) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }

  if (lines.length > 0) {
    context.font = NAME_FONT;
    context.textAlign = "center";
    lines.forEach((line, index) => {
      context.fillText(
        line,
        DOWNLOAD_WIDTH / 2,
        DOWNLOAD_PADDING + symbolSize + 48 + index * NAME_LINE_HEIGHT,
      );
    });
  }

  return canvas;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** QR del enlace público del evento, con el nombre debajo y descarga en PNG. */
export function EventQr({ slug, title, className }: Props) {
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // El enlace absoluto solo existe en el navegador. Mientras no se conozca se
  // deja el hueco del símbolo: un QR del enlace relativo llevaría a otro sitio.
  const url = origin ? `${origin}/e/${slug}` : "";
  const matrix = useMemo(() => (url ? createQrMatrix(url) : null), [url]);
  const path = useMemo(() => (matrix ? qrPathData(matrix) : ""), [matrix]);
  const viewBox = matrix ? qrSvgSize(matrix) : 0;

  async function downloadQr() {
    if (!matrix) return;
    setBusy(true);
    setFailed(false);
    try {
      const blob = await canvasToPng(buildQrImage(matrix, title));
      if (!blob) throw new Error("No se pudo generar la imagen.");

      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `qr-${slug}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start", className)}>
      <div className="w-fit rounded-xl border border-slate-200 bg-white p-3">
        {matrix ? (
          <svg
            viewBox={`0 0 ${viewBox} ${viewBox}`}
            role="img"
            aria-label={`Código QR de la invitación de ${title}`}
            shapeRendering="crispEdges"
            className="h-40 w-40 text-slate-900"
          >
            <path d={path} fill="currentColor" />
          </svg>
        ) : (
          <div className="h-40 w-40 animate-pulse rounded-lg bg-slate-100" aria-hidden />
        )}
        <p className="mt-2 line-clamp-2 max-w-40 text-center text-xs font-semibold leading-snug text-slate-700">
          {title}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void downloadQr()}
          className={secondaryButtonClass}
          disabled={busy || !matrix}
        >
          {busy ? "Preparando…" : "Descargar QR"}
        </button>
        <p className={helpClass}>
          Guárdalo como imagen para compartirlo en Facebook, TikTok o donde quieras.
        </p>
        {failed ? (
          <p className={errorClass} role="alert">
            No se pudo descargar el QR. Vuelve a intentarlo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
