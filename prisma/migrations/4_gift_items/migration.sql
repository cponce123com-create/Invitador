-- Catálogo de regalos del evento: los artículos que el anfitrión publica en su
-- invitación para que el invitado elija uno y pague por fuera (Yape, Plin,
-- transferencia…) contra el QR de la mesa de regalos.
--
-- Migración aditiva: la tabla es nueva y `GiftProof.giftItemId` es NULL por
-- defecto, así que no toca ni reescribe ninguna fila existente. Los
-- comprobantes que ya existen quedan sin artículo asignado y siguen valiendo.
--
-- La foto de cada artículo la sube el anfitrión, así que vive en su carpeta de
-- Cloudinary y se limpia con `isHostAssetId` (no con `isGiftAssetId`, que es la
-- carpeta de comprobantes de los invitados).
--
-- `priceCents` guarda el precio en céntimos (`null` = sin precio publicado) y
-- `currency` el ISO 4217 para no migrar el schema si algún día se publica en
-- otra moneda.
--
-- Generado con:
--   npx prisma migrate diff \
--     --from-schema-datamodel <schema sin GiftItem> \
--     --to-schema-datamodel prisma/schema.prisma --script

-- CreateTable
CREATE TABLE "GiftItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "imageUrl" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GiftProof" ADD COLUMN "giftItemId" TEXT;

-- CreateIndex
CREATE INDEX "GiftItem_eventId_idx" ON "GiftItem"("eventId");

-- CreateIndex
CREATE INDEX "GiftProof_giftItemId_idx" ON "GiftProof"("giftItemId");

-- AddForeignKey
ALTER TABLE "GiftItem" ADD CONSTRAINT "GiftItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftProof" ADD CONSTRAINT "GiftProof_giftItemId_fkey" FOREIGN KEY ("giftItemId") REFERENCES "GiftItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
