import { PrismaClient } from "@prisma/client";
import { BACKGROUND_PRESETS } from "../lib/background-presets";

/**
 * Siembra el catálogo de fondos demo.
 *
 * Es idempotente: usa `upsert` sobre ids estables, así que se puede ejecutar
 * tantas veces como haga falta (local, en cada deploy de Render, etc.) sin
 * duplicar filas. Para agregar un fondo nuevo basta con añadirlo a
 * `BACKGROUND_PRESETS` (`lib/background-presets.ts`).
 *
 * Uso: `npm run db:seed:backgrounds`
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const preset of BACKGROUND_PRESETS) {
    const { id, ...data } = preset;
    await prisma.backgroundTemplate.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  console.log(`✔ ${BACKGROUND_PRESETS.length} fondos demo sincronizados.`);
}

main()
  .catch((error) => {
    console.error("✖ No se pudieron sembrar los fondos demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
