/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Las imágenes se sirven optimizadas desde Cloudinary (f_auto,q_auto).
    // Solo se permiten hosts conocidos para evitar usos abusivos del optimizador.
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
