/*
  Warnings:

  - A unique constraint covering the columns `[checkinToken]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - Made the column `checkinToken` on table `participant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `participant` MODIFY `checkinToken` VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Participant_checkinToken_key` ON `Participant`(`checkinToken`);
