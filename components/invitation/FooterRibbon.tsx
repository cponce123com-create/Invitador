import { footerRibbonItems } from "@/lib/constants";

/** Separador entre créditos: le da el aire de cinta de datos. */
const SEPARATOR = "//";

/**
 * Pie de la invitación pública: los créditos en una sola línea que corre como
 * una cinta.
 *
 * El bloque se pinta dos veces (la copia va oculta para lectores de pantalla) y
 * la animación desplaza cada copia justo su propio ancho, así que el bucle
 * encadena sin huecos. Con `prefers-reduced-motion` queda quieto y centrado.
 */
export function FooterRibbon() {
  const items = footerRibbonItems(new Date().getFullYear());

  const credits = (
    <>
      {items.map((item) => (
        <span key={item}>
          {item}{" "}
          <span aria-hidden className="text-brand-400">
            {SEPARATOR}
          </span>
        </span>
      ))}
    </>
  );

  const halfClassName =
    "flex shrink-0 animate-marquee items-center gap-6 pr-6 font-mono text-[11px] uppercase tracking-[0.28em] text-slate-400 motion-reduce:shrink motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0";

  return (
    <footer className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 py-2.5">
      <div className="flex motion-reduce:justify-center">
        <p className={halfClassName}>{credits}</p>
        <p aria-hidden className={halfClassName}>
          {credits}
        </p>
      </div>
    </footer>
  );
}
