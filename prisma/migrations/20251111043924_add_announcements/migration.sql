/*
  Warnings:

  - Added the required column `tripId` to the `Announcement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `announcement` ADD COLUMN `tripId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Announcement_tripId_idx` ON `Announcement`(`tripId`);

-- CreateIndex
CREATE INDEX `Announcement_priority_isPinned_idx` ON `Announcement`(`priority`, `isPinned`);

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
