-- AlterTable
ALTER TABLE "Note" ADD COLUMN "eventId" TEXT;

-- CreateIndex
CREATE INDEX "Note_eventId_idx" ON "Note"("eventId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
