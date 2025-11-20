/*
  Warnings:

  - A unique constraint covering the columns `[tripId,participantId,sessionId]` on the table `Feedback` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `feedback` DROP FOREIGN KEY `Feedback_tripId_fkey`;

-- DropIndex
DROP INDEX `Feedback_tripId_participantId_key` ON `feedback`;

-- AlterTable
ALTER TABLE `feedback` ADD COLUMN `sessionId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Feedback_tripId_sessionId_idx` ON `Feedback`(`tripId`, `sessionId`);

-- CreateIndex
CREATE UNIQUE INDEX `Feedback_tripId_participantId_sessionId_key` ON `Feedback`(`tripId`, `participantId`, `sessionId`);

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Schedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
