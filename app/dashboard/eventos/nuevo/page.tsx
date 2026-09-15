import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/EventForm";
import { DEFAULT_MAX_GUESTS_PER_RSVP } from "@/lib/constants";
import { requireHost } from "@/lib/session";
import { ghostButtonClass } from "@/lib/ui";
import type { EventFormValues } from "@/lib/validations/event";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nuevo evento" };

const initialValues: EventFormValues = {
  title: "",
  type: "CUMPLEANOS",
  customLabel: "",
  ageOrDetail: "",
  eventDate: "",
  location: "",
  description: "",
  coverImageUrl: "",
  maxGuestsPerRsvp: DEFAULT_MAX_GUESTS_PER_RSVP,
  isActive: true,
  photos: [],
};

export default async function NewEventPage() {
  await requireHost();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className={ghostButtonClass}>
          ← Mis eventos
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-900">
          Nuevo evento
        </h1>
        <p className="text-sm text-slate-500">
          Completa los datos, sube unas fotos y comparte el link con tus
          invitados.
        </p>
      </div>

      <EventForm mode="create" defaultValues={initialValues} />
    </div>
  );
}
