import Link from "next/link";
import { getCurrentHost } from "@/lib/session";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

const FEATURES = [
  {
    emoji: "💌",
    title: "Un link único por evento",
    text: "Comparte la invitación por WhatsApp y que cada invitado abra su propia página.",
  },
  {
    emoji: "📸",
    title: "Portada y galería",
    text: "Sube las fotos del evento y elige la portada que se verá al compartir el link.",
  },
  {
    emoji: "✅",
    title: "Confirmación con acompañantes",
    text: "Sí, no o tal vez, con el nombre y la relación de cada acompañante.",
  },
  {
    emoji: "📊",
    title: "Panel y export a CSV",
    text: "Revisa cuántas personas asistirán y descarga la lista para tu proveedor.",
  },
];

export default async function HomePage() {
  const host = await getCurrentHost();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <span className="text-lg font-black tracking-tight text-brand-700">
            Invitador
          </span>
          <Link
            href={host ? "/dashboard" : "/login"}
            className={secondaryButtonClass}
          >
            {host ? "Ir a mi panel" : "Entrar"}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            🎉 Invitaciones con confirmación
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Crea la invitación, comparte un link y entérate quién va
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Cumpleaños, baby showers, bodas y más. Publica el evento en minutos
            y recibe las confirmaciones con sus acompañantes, sin grupos de
            WhatsApp caóticos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/eventos/nuevo"
              className={`${primaryButtonClass} w-full sm:w-auto`}
            >
              Crear mi invitación
            </Link>
            {!host ? (
              <Link
                href="/login"
                className={`${secondaryButtonClass} w-full sm:w-auto`}
              >
                Ya tengo cuenta
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {feature.emoji}
              </span>
              <h2 className="mt-3 text-base font-bold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Hecho con Next.js, Prisma y Cloudinary.
      </footer>
    </div>
  );
}
