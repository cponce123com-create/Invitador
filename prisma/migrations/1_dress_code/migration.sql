-- Foto del código de vestimenta del evento. La columna es NULL por defecto, así
-- que la migración es aditiva: no toca ni reescribe ninguna fila existente.
--
-- Generado con:
--   npx prisma migrate diff \
--     --from-schema-datamodel <schema sin el campo> \
--     --to-schema-datamodel prisma/schema.prisma --script

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "dressCodeImageUrl" TEXT;
