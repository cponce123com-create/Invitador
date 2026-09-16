import {
  ATTENDANCE_LABELS,
  GUEST_RELATION_LABELS,
  type AttendanceStatusValue,
  type GuestRelationValue,
} from "@/lib/constants";
import { formatShortDateTime } from "@/lib/format";

/** Excel (y LibreOffice) interpretan bien el UTF-8 si el archivo empieza con BOM. */
export const CSV_BOM = "\uFEFF";

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Se entrecomilla si contiene separador, comillas o saltos de línea.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export type CsvRsvp = {
  mainGuestName: string;
  mainGuestPhone: string | null;
  attendance: AttendanceStatusValue;
  message: string | null;
  createdAt: Date;
  additionalGuests: { name: string; relation: GuestRelationValue }[];
};

export const RSVP_CSV_HEADERS = [
  "Invitado principal",
  "Teléfono",
  "Asistencia",
  "Acompañantes",
  "Detalle de acompañantes",
  "Mensaje",
  "Confirmado el",
] as const;

/** Serializa los RSVPs de un evento a CSV (listo para Excel / Google Sheets). */
export function rsvpsToCsv(rsvps: readonly CsvRsvp[]): string {
  const rows: unknown[][] = [Array.from(RSVP_CSV_HEADERS)];
  for (const rsvp of rsvps) {
    rows.push([
      rsvp.mainGuestName,
      rsvp.mainGuestPhone ?? "",
      ATTENDANCE_LABELS[rsvp.attendance],
      rsvp.additionalGuests.length,
      rsvp.additionalGuests
        .map((guest) => `${guest.name} (${GUEST_RELATION_LABELS[guest.relation]})`)
        .join("; "),
      rsvp.message ?? "",
      formatShortDateTime(rsvp.createdAt),
    ]);
  }
  return `${CSV_BOM}${toCsv(rows)}`;
}

export type CsvGiftProof = {
  senderName: string;
  note: string | null;
  url: string;
  createdAt: Date;
};

export const GIFT_PROOF_CSV_HEADERS = [
  "Nombre",
  "Nota",
  "Comprobante",
  "Subido el",
] as const;

/** Serializa los comprobantes de regalo de un evento a CSV. */
export function giftProofsToCsv(proofs: readonly CsvGiftProof[]): string {
  const rows: unknown[][] = [Array.from(GIFT_PROOF_CSV_HEADERS)];
  for (const proof of proofs) {
    rows.push([
      proof.senderName,
      proof.note ?? "",
      proof.url,
      formatShortDateTime(proof.createdAt),
    ]);
  }
  return `${CSV_BOM}${toCsv(rows)}`;
}

/**
 * Nombre de archivo seguro para la descarga del CSV.
 * El prefijo distingue las listas de un mismo evento (invitados o regalos).
 */
export function buildCsvFileName(slug: string, prefix = "invitados"): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${safeSlug}-${stamp}.csv`;
}
