import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Hashing de contraseñas con `scrypt`, incluido en `node:crypto`.
 *
 * Se usa el algoritmo nativo en lugar de una librería externa para no añadir
 * dependencias ni compilación nativa (Render ejecuta Node 20 y `scrypt` viene
 * de serie). El valor guardado tiene el formato `scrypt$<sal-hex>$<hash-hex>`,
 * así que el día de mañana se puede migrar a otro algoritmo detectando el
 * prefijo sin tocar la base de datos.
 */

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCHEME = "scrypt";
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** Deriva un hash irreversible. Cada llamada usa una sal aleatoria nueva. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_BYTES);
  return `${SCHEME}$${salt}$${derived.toString("hex")}`;
}

/**
 * Comprueba una contraseña contra el hash guardado. Devuelve `false` (sin
 * lanzar) cuando el hash está vacío o tiene un formato desconocido, para que un
 * dato corrupto en la base de datos no rompa el login.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== SCHEME || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length === 0) return false;

  // Se deriva con la longitud del hash guardado, así `timingSafeEqual` siempre
  // recibe dos buffers del mismo tamaño.
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    expected.length,
  );
  return timingSafeEqual(expected, derived);
}
