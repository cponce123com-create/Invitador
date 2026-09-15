"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dangerButtonClass } from "@/lib/ui";

/** Elimina el evento (y sus fotos en Cloudinary) tras confirmación explícita. */
export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      "¿Eliminar el evento? Se borrarán también sus fotos y todas las confirmaciones. Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "No pudimos eliminar el evento.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Revisa tu conexión e intenta de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className={dangerButtonClass}
        disabled={isDeleting}
        onClick={() => void handleDelete()}
      >
        {isDeleting ? "Eliminando…" : "Eliminar evento"}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
