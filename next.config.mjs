/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
