import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Flotación suave: polaroids, insignias y el sobre de apertura.
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        // Zoom lento de la portada (Ken Burns), en vaivén infinito.
        "ken-burns": {
          "0%": { transform: "scale(1) translate3d(0, 0, 0)" },
          "100%": { transform: "scale(1.14) translate3d(0, -2%, 0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Cursor del efecto máquina de escribir.
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        // Brillo que recorre un texto o borde.
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Desplazamiento del degradado del fondo temático.
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Entrada de las secciones al aparecer en pantalla.
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        float: "float 6s ease-in-out infinite",
        "ken-burns": "ken-burns 22s ease-in-out infinite alternate",
        "pop-in": "pop-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        blink: "blink 1s step-end infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "gradient-pan": "gradient-pan 16s ease-in-out infinite",
        "reveal-up": "reveal-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
