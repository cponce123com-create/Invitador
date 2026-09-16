-- Melodía de fondo del evento. La columna es NULL por defecto, así que la
-- migración es aditiva: no toca ni reescribe ninguna fila existente.
--
-- Guarda el id de una pista de `lib/music.ts`. Las melodías se sintetizan en el
-- navegador con la Web Audio API, así que no hay ningún archivo que subir ni
-- assets que limpiar al borrar el evento.
--
-- Generado con:
--   npx prisma migrate diff \
--     --from-schema-datamodel <schema sin el campo> \
--     --to-schema-datamodel prisma/schema.prisma --script

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "musicTrack" TEXT;
