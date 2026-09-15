/**
 * Extrae la IP del cliente a partir de las cabeceras que añaden los proxies
 * (Render y Cloudflare las incluyen). Se usa como clave del rate limiter.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    "desconocida"
  );
}
