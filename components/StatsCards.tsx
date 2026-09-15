import { ATTENDANCE_BADGE_CLASSES } from "@/lib/constants";
import type { EventStats } from "@/lib/events";
import { cardClass, cn } from "@/lib/ui";

/** Resumen de confirmaciones del evento. */
export function StatsCards({ stats }: { stats: EventStats }) {
  const items = [
    {
      label: "Confirmados",
      value: stats.yes,
      hint: "dijeron que sí",
      badge: ATTENDANCE_BADGE_CLASSES.SI,
    },
    {
      label: "No asistirán",
      value: stats.no,
      hint: "avisaron que no",
      badge: ATTENDANCE_BADGE_CLASSES.NO,
    },
    {
      label: "Tal vez",
      value: stats.maybe,
      hint: "por confirmar",
      badge: ATTENDANCE_BADGE_CLASSES.TAL_VEZ,
    },
    {
      label: "Total de personas",
      value: stats.totalPeople,
      hint: "contando acompañantes",
      badge: "bg-brand-100 text-brand-800",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={cardClass}>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
              item.badge,
            )}
          >
            {item.label}
          </span>
          <p className="mt-3 text-3xl font-black text-slate-900">{item.value}</p>
          <p className="text-xs text-slate-500">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
