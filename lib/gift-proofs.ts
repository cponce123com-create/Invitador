// Vínculo entre las confirmaciones y los comprobantes de regalo.
//
// No hay una relación en la base de datos: quien confirma y quien sube el
// comprobante escriben su nombre por separado, así que el cruce se hace por
// nombre normalizado. Módulo puro (sin Prisma ni DOM) para poder probarlo.

/** Comprobante tal como lo necesita la UI del panel. */
export type GiftProofSummary = {
  id: string;
  senderName: string;
  note: string | null;
  url: string;
  createdAt: Date;
};

/**
 * Deja el nombre comparable: sin espacios de sobra, en minúsculas y sin tildes,
 * así "María  González" y "maria gonzalez" son la misma persona.
 */
export function normalizeGuestName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Busca el comprobante que corresponde a un invitado: el primero que coincida
 * (los comprobantes llegan del más reciente al más antiguo) o `undefined` si
 * nadie con ese nombre subió nada.
 */
export function findGiftProofForGuest<T extends { senderName: string }>(
  guestName: string,
  proofs: readonly T[],
): T | undefined {
  const target = normalizeGuestName(guestName);
  if (!target) return undefined;

  return proofs.find((proof) => normalizeGuestName(proof.senderName) === target);
}
