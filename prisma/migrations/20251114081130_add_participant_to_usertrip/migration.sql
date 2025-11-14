-- AlterTable
ALTER TABLE `usertrip` ADD COLUMN `participantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `UserTrip_participantId_idx` ON `UserTrip`(`participantId`);

-- AddForeignKey
ALTER TABLE `UserTrip` ADD CONSTRAINT `UserTrip_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
