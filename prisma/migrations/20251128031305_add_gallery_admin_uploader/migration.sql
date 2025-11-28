-- DropForeignKey
ALTER TABLE `gallery` DROP FOREIGN KEY `Gallery_participantId_fkey`;

-- AlterTable
ALTER TABLE `gallery` ADD COLUMN `uploaderName` VARCHAR(191) NULL,
    ADD COLUMN `uploaderUserId` VARCHAR(191) NULL,
    MODIFY `participantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Gallery_uploaderUserId_idx` ON `Gallery`(`uploaderUserId`);

-- AddForeignKey
ALTER TABLE `Gallery` ADD CONSTRAINT `Gallery_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
