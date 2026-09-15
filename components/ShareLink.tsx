"use client";

import { useEffect, useState } from "react";
import { cn, ghostButtonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

type Props = {
  slug: string;
  title: string;
  className?: string;
};

/** Link público del evento, con copiado rápido y compartir por WhatsApp. */
export function ShareLink({ slug, title, className }: Props) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = `/e/${slug}`;
  const url = origin ? `${origin}${path}` : path;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Te invito a ${title} 💌\nConfirma tu asistencia aquí: ${url}`,
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Link público del evento"
          className={cn(inputClass, "text-sm")}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" onClick={() => void copyLink()} className={secondaryButtonClass}>
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButtonClass}
        >
          Compartir por WhatsApp
        </a>
        <a href={path} target="_blank" rel="noopener noreferrer" className={ghostButtonClass}>
          Ver invitación
        </a>
      </div>
    </div>
  );
}
