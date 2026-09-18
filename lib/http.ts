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

/**
 * `true` si la petición viene de otro sitio (posible CSRF).
 *
 * Los navegadores mandan `Sec-Fetch-Site` en todas las peticiones y `Origin` en
 * las que no son GET/HEAD del mismo origen. Si no llega ninguna de las dos se
 * deja pasar: son clientes que no son un navegador (curl, pruebas) y no llevan
 * las cookies de nadie.
 */
export function isCrossOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("host");
  if (!host) return true;

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** Cabecera que transporta el identificador de correlación de la petición. */
export const REQUEST_ID_HEADER = "x-request-id";

/** Un id de correlación seguro para logs: sin saltos ni caracteres raros. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Identificador de correlación de la petición.
 *
 * Si un proxy ya lo añadió (`x-request-id`) y tiene un formato seguro, se
 * reutiliza para no romper la cadena; si no, se genera uno nuevo. Se usa en los
 * logs y en las respuestas de error para poder cruzar lo que reporta el usuario
 * con la línea del servidor.
 */
export function getRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming && SAFE_REQUEST_ID.test(incoming)) return incoming;
  return crypto.randomUUID();
}
