import clsx, { type ClassValue } from "clsx";

/** Une clases condicionales (equivalente a `clsx`). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100";

export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export const helpClass = "mt-1.5 text-xs text-slate-500";

export const errorClass = "mt-1.5 text-xs font-medium text-rose-600";

export const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

/**
 * Botón de "agregar" a pantalla completa, con borde discontinuo y color de
 * marca. Es una llamada a la acción deliberadamente llamativa: en el formulario
 * de RSVP el alta de acompañantes es fácil de pasar por alto, así que el botón
 * ocupa todo el ancho y contrasta con el resto de campos.
 */
export const addGuestButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-3.5 text-sm font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400";
