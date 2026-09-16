/** @type {import('next').NextConfig} */

// Fuera de producción: el runtime de webpack usa `eval` para el HMR y la app se
// sirve por http, así que no se puede forzar https en los subrecursos.
const isProduction = process.env.NODE_ENV === "production";
const scriptSrc = ["'self'", "'unsafe-inline'"];
if (!isProduction) scriptSrc.push("'unsafe-eval'");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // Las fotos se piden directas a Cloudinary y el anfitrión puede pegar
      // cualquier URL https (portada, lugar, QR); los fondos de patrón usan
      // `data:`.
      "img-src 'self' data: https:",
      // Next inyecta el payload de la página y la hidratación como scripts y
      // estilos en línea, así que 'unsafe-inline' es imprescindible (no se usan
      // nonces, que obligarían a tocar todas las páginas).
      `script-src ${scriptSrc.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // La subida se firma en el servidor y el navegador la envía directo a
      // Cloudinary: es la única conexión externa que necesita la aplicación.
      "connect-src 'self' https://api.cloudinary.com",
      "media-src 'self'",
      "manifest-src 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Las fotos se piden tal cual a Cloudinary, que ya entrega WebP/AVIF con
    // calidad automática desde su CDN. El optimizador de Next queda fuera a
    // propósito: sin `sharp` instalado usa su codificador WASM, que es lento y
    // gasta CPU del servidor, y su caché dura 60 s por defecto, así que casi
    // cada visita rehacía un trabajo que Cloudinary ya hace mejor.
    unoptimized: true,
    // Solo hosts conocidos: sigue siendo la red de seguridad para el día que se
    // reactive el optimizador.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  eslint: {
    // El lint corre como paso propio del pipeline (npm run lint).
    ignoreDuringBuilds: true,
  },
  /** Cabeceras de seguridad en todas las respuestas (páginas y API). */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
