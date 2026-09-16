-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CUMPLEANOS', 'BABY_SHOWER', 'BODA', 'BAUTIZO', 'GRADUACION', 'OTRO');

-- CreateEnum
CREATE TYPE "BackgroundKind" AS ENUM ('GRADIENT', 'PATTERN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('SI', 'NO', 'TAL_VEZ');

-- CreateEnum
CREATE TYPE "GuestRelation" AS ENUM ('FAMILIAR', 'AMIGO', 'AMIGA', 'NOVIO', 'NOVIA', 'ESPOSO', 'ESPOSA', 'COMPANERO_TRABAJO', 'OTRO');

-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" "EventType",
    "kind" "BackgroundKind" NOT NULL,
    "colors" TEXT[],
    "patternName" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackgroundTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "customLabel" TEXT,
    "ageOrDetail" TEXT,
    "eventDate" TIMESTAMP(3),
    "location" TEXT,
    "locationImageUrl" TEXT,
    "mapUrl" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "giftQrUrl" TEXT,
    "giftMessage" TEXT,
    "backgroundTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxGuestsPerRsvp" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftProof" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "note" TEXT,
    "cloudinaryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mainGuestName" TEXT NOT NULL,
    "mainGuestPhone" TEXT,
    "attendance" "AttendanceStatus" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalGuest" (
    "id" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" "GuestRelation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Host_email_key" ON "Host"("email");

-- CreateIndex
CREATE INDEX "BackgroundTemplate_eventType_order_idx" ON "BackgroundTemplate"("eventType", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_hostId_idx" ON "Event"("hostId");

-- CreateIndex
CREATE INDEX "Event_backgroundTemplateId_idx" ON "Event"("backgroundTemplateId");

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_idx" ON "EventPhoto"("eventId");

-- CreateIndex
CREATE INDEX "GiftProof_eventId_idx" ON "GiftProof"("eventId");

-- CreateIndex
CREATE INDEX "Rsvp_eventId_idx" ON "Rsvp"("eventId");

-- CreateIndex
CREATE INDEX "AdditionalGuest_rsvpId_idx" ON "AdditionalGuest"("rsvpId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_backgroundTemplateId_fkey" FOREIGN KEY ("backgroundTemplateId") REFERENCES "BackgroundTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftProof" ADD CONSTRAINT "GiftProof_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalGuest" ADD CONSTRAINT "AdditionalGuest_rsvpId_fkey" FOREIGN KEY ("rsvpId") REFERENCES "Rsvp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

