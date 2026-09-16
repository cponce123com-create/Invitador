// Detección de nombres de invitados repetidos o parecidos.
//
// Módulo PURO: sin Prisma, sin DOM y sin dependencias nuevas. Lo usa el endpoint
// público de confirmación para avisar al invitado antes de registrar un posible
// duplicado, y está cubierto por tests.

/** A partir de este parecido se avisa de un posible invitado repetido. */
export const NAME_SIMILARITY_THRESHOLD = 0.85;

/**
 * Normaliza un nombre para compararlo: minúsculas, sin acentos, sin signos y con
 * espacios simples. Así "  María  GONZÁLEZ " y "maria gonzalez" coinciden.
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Tokens del nombre, ordenados: permite comparar sin importar el orden. */
function tokensOf(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean).sort();
}

/** Distancia de Levenshtein: ediciones mínimas para transformar `a` en `b`. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Parecido entre dos nombres: 0 (nada que ver) a 1 (idénticos).
 *
 * Reglas, de más fuerte a más débil:
 *  1. El nombre normalizado es idéntico → 1.
 *  2. Los mismos tokens en otro orden ("González María" ≡ "María González") → 1.
 *  3. Uno contiene todos los tokens del otro ("María González" ⊂ "María
 *     González Rojas", con al menos la mitad de los tokens) → alto.
 *  4. En cualquier otro caso, se mide la distancia de edición de las cadenas,
 *     que atrapa erratas y acentos sueltos.
 */
export function nameSimilarity(a: string, b: string): number {
  const normalizedA = normalizeName(a);
  const normalizedB = normalizeName(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const tokensA = tokensOf(normalizedA);
  const tokensB = tokensOf(normalizedB);
  if (tokensA.join(" ") === tokensB.join(" ")) return 1;

  const ratio =
    1 -
    levenshtein(normalizedA, normalizedB) /
      Math.max(normalizedA.length, normalizedB.length);

  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  // Exigimos al menos dos tokens: un solo nombre de pila no basta para
  // sospechar, porque "Luis" y "Luis Fernando" pueden ser dos personas.
  const contained =
    shorter.length >= 2 &&
    shorter.every((token) => longer.includes(token)) &&
    shorter.length / longer.length >= 0.5;

  return contained ? Math.max(ratio, 0.9) : ratio;
}

/** `true` si el parecido basta para sospechar que es el mismo invitado. */
export function areSimilarNames(a: string, b: string): boolean {
  return nameSimilarity(a, b) >= NAME_SIMILARITY_THRESHOLD;
}

/** Candidatos que se parecen al nombre dado, en su forma original. */
export function findSimilarNames(
  target: string,
  candidates: readonly string[],
): string[] {
  return candidates.filter((candidate) => areSimilarNames(target, candidate));
}
