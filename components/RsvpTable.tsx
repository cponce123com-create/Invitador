import { GiftProofButton } from "@/components/GiftProofButton";
import {
  ATTENDANCE_BADGE_CLASSES,
  ATTENDANCE_SHORT_LABELS,
  GUEST_RELATION_LABELS,
  type AttendanceStatusValue,
  type GuestRelationValue,
} from "@/lib/constants";
import { formatShortDateTime } from "@/lib/format";
import type { GiftProofSummary } from "@/lib/gift-proofs";
import { cn } from "@/lib/ui";

export type RsvpRow = {
  id: string;
  mainGuestName: string;
  mainGuestPhone: string | null;
  attendance: AttendanceStatusValue;
  message: string | null;
  createdAt: Date;
  additionalGuests: { id: string; name: string; relation: GuestRelationValue }[];
  /** Comprobante de regalo del invitado, si subió alguno con el mismo nombre. */
  giftProof?: GiftProofSummary | null;
};

function AttendanceBadge({ attendance }: { attendance: AttendanceStatusValue }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        ATTENDANCE_BADGE_CLASSES[attendance],
      )}
    >
      {ATTENDANCE_SHORT_LABELS[attendance]}
    </span>
  );
}

function GuestList({ guests }: { guests: RsvpRow["additionalGuests"] }) {
  if (guests.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {guests.map((guest) => (
        <li
          key={guest.id}
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
        >
          {guest.name}
          <span className="text-slate-400"> · {GUEST_RELATION_LABELS[guest.relation]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tabla de confirmaciones: tarjetas en móvil, tabla en escritorio. */
export function RsvpTable({ rsvps }: { rsvps: RsvpRow[] }) {
  if (rsvps.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        Todavía no hay confirmaciones. Comparte el link para empezar a recibirlas.
      </p>
    );
  }

  return (
    <>
      {/* Móvil */}
      <ul className="space-y-3 sm:hidden">
        {rsvps.map((rsvp) => (
          <li
            key={rsvp.id}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{rsvp.mainGuestName}</p>
                {rsvp.mainGuestPhone ? (
                  <p className="text-xs text-slate-500">{rsvp.mainGuestPhone}</p>
                ) : null}
                {rsvp.giftProof ? (
                  <GiftProofButton
                    proof={rsvp.giftProof}
                    title={`Comprobante de ${rsvp.mainGuestName}`}
                    className="mt-1"
                  />
                ) : null}
              </div>
              <AttendanceBadge attendance={rsvp.attendance} />
            </div>
            <GuestList guests={rsvp.additionalGuests} />
            {rsvp.message ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                “{rsvp.message}”
              </p>
            ) : null}
            <p className="text-xs text-slate-400">
              Confirmado el {formatShortDateTime(rsvp.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      {/* Escritorio */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5 font-semibold">Invitado</th>
              <th className="px-3 py-2.5 font-semibold">Asistencia</th>
              <th className="px-3 py-2.5 font-semibold">Acompañantes</th>
              <th className="px-3 py-2.5 font-semibold">Mensaje</th>
              <th className="px-3 py-2.5 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.map((rsvp) => (
              <tr key={rsvp.id} className="border-b border-slate-100 align-top">
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{rsvp.mainGuestName}</p>
                  {rsvp.mainGuestPhone ? (
                    <p className="text-xs text-slate-500">{rsvp.mainGuestPhone}</p>
                  ) : null}
                  {rsvp.giftProof ? (
                    <GiftProofButton
                      proof={rsvp.giftProof}
                      title={`Comprobante de ${rsvp.mainGuestName}`}
                      className="mt-1"
                    />
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <AttendanceBadge attendance={rsvp.attendance} />
                </td>
                <td className="px-3 py-3">
                  <GuestList guests={rsvp.additionalGuests} />
                </td>
                <td className="max-w-xs px-3 py-3 text-slate-600">
                  {rsvp.message ? `“${rsvp.message}”` : <span className="text-slate-400">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                  {formatShortDateTime(rsvp.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
