"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { secondaryButtonClass } from "@/lib/ui";

/**
 * Publica o despublica la invitación.
 * Al desactivarla, `/e/[slug]` deja de existir sin borrar los datos.
 */
export function EventStatusToggle({
  eventId,
  isActive,
}: {
  eventId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !active;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "No pudimos actualizar el evento.");
        return;
      }

      setActive(next);
      router.refresh();
    } catch {
      setError("Revisa tu conexión e intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className={`${secondaryButtonClass} w-full`}
        disabled={isSaving}
        onClick={() => void toggle()}
      >
        {isSaving ? "Guardando…" : active ? "Desactivar invitación" : "Reactivar invitación"}
      </button>
      <p className="text-xs text-slate-500">
        {active
          ? "La invitación está publicada y acepta confirmaciones."
          : "La invitación no es accesible: el link responde 404."}
      </p>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
