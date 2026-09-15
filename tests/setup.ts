// Variables de entorno mínimas para poder importar módulos que instancian
// Prisma (por ejemplo `lib/events.ts`) sin depender de un `.env` real.
process.env.DATABASE_URL ??=
  "postgresql://user:password@localhost:5432/invitador";
process.env.DIRECT_URL ??=
  "postgresql://user:password@localhost:5432/invitador";
