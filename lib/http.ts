/**
 * Cabeceras de una `Request` del navegador o el objeto plano que recibe
 * `authorize()` de NextAuth (`RequestInternal.headers`).
 */
export type HeaderSource = Headers | Record<string, string | undefined>;

function readHeader(headers: HeaderSource, name: string): string | null {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const record = headers as Record<string, string | undefined>;
  return record[name] ?? record[name.toLowerCase()] ?? null;
}

/**
 * Extrae la IP del cliente a partir de las cabeceras que añaden los proxies
 * (Render y Cloudflare las incluyen). Se usa como clave del rate limiter.
 *
 * De `x-forwarded-for` se toma el **último** valor: el cliente puede falsificar
 * los anteriores, pero el proxy de confianza (el que está pegado a la app)
 * añade el suyo al final. Si ese proxy reescribe la cabecera en lugar de
 * añadirla, el último valor sigue siendo el correcto.
 */
export function getClientIpFromHeaders(headers: HeaderSource): string {
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",");
    const last = hops[hops.length - 1]?.trim();
    if (last) return last;
  }
  return (
    readHeader(headers, "cf-connecting-ip") ??
    readHeader(headers, "x-real-ip") ??
    "desconocida"
  );
}

/** Igual que `getClientIpFromHeaders`, a partir de la request completa. */
export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}
