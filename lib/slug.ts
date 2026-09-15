import { randomInt } from "node:crypto";

// Alfabeto sin caracteres ambiguos (l, 1, 0, o) para que el slug se pueda
// dictar por teléfono sin errores.
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

const MAX_BASE_LENGTH = 48;

/** Convierte un texto libre en un slug URL-safe (sin acentos ni símbolos). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LENGTH);
}

/** Sufijo aleatorio corto para garantizar unicidad del slug. */
export function randomSuffix(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }
  return out;
}

/**
 * Genera el slug público de un evento, ej: `sofia-cumple-30-x7f2`.
 * La unicidad final la garantiza la restricción `@unique` de la base de datos
 * (ver `createUniqueEventSlug` en el route handler de eventos).
 */
export function buildEventSlug(title: string, suffixLength = 4): string {
  const base = slugify(title) || "evento";
  return `${base}-${randomSuffix(suffixLength)}`;
}
