-- AlterTable
ALTER TABLE `setting` ADD COLUMN `attendanceGraceMinutes` INTEGER NULL DEFAULT 15;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
