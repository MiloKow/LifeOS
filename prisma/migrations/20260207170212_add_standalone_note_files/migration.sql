/*
  Warnings:

  - You are about to drop the `NoteAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NoteAttachment" DROP CONSTRAINT "NoteAttachment_noteId_fkey";

-- DropTable
DROP TABLE "NoteAttachment";

-- CreateTable
CREATE TABLE "NoteFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteFile_userId_idx" ON "NoteFile"("userId");

-- CreateIndex
CREATE INDEX "NoteFile_folderId_idx" ON "NoteFile"("folderId");

-- AddForeignKey
ALTER TABLE "NoteFile" ADD CONSTRAINT "NoteFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteFile" ADD CONSTRAINT "NoteFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "NoteFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
