import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { getHostEvent } from "@/lib/events";
import { toWallClockInputValue } from "@/lib/format";
import { requireHost } from "@/lib/session";
import { ghostButtonClass } from "@/lib/ui";
import type { EventFormValues } from "@/lib/validations/event";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditEventPage({ params }: PageProps) {
  const host = await requireHost();
  const event = await getHostEvent(host.id, params.id);
  if (!event) notFound();

  // Se rehidrata el formulario con los valores ya guardados. La fecha se
  // convierte al formato de `<input type="datetime-local">` (hora de pared).
  const defaultValues: EventFormValues = {
    title: event.title,
    type: event.type,
    customLabel: event.customLabel ?? "",
    ageOrDetail: event.ageOrDetail ?? "",
    eventDate: toWallClockInputValue(event.eventDate),
    location: event.location ?? "",
    description: event.description ?? "",
    coverImageUrl: event.coverImageUrl ?? "",
    maxGuestsPerRsvp: event.maxGuestsPerRsvp,
    isActive: event.isActive,
    photos: event.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      cloudinaryId: photo.cloudinaryId,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/eventos/${event.id}`}
          className={ghostButtonClass}
        >
          ← Volver al panel
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-900">
          Editar evento
        </h1>
        <p className="text-sm text-slate-500">
          Los cambios se reflejan de inmediato en la invitación pública.
        </p>
      </div>

      <EventForm mode="edit" eventId={event.id} defaultValues={defaultValues} />
    </div>
  );
}
