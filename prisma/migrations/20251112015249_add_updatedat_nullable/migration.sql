/*
  Warnings:

  - You are about to alter the column `dateText` on the `schedule` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(64)`.
  - You are about to alter the column `timeText` on the `schedule` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(16)`.

*/
-- AlterTable
ALTER TABLE `schedule` ADD COLUMN `locationLat` DECIMAL(10, 7) NULL,
    ADD COLUMN `locationLon` DECIMAL(10, 7) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    MODIFY `dateText` VARCHAR(64) NOT NULL,
    MODIFY `timeText` VARCHAR(16) NOT NULL,
    MODIFY `location` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `Schedule_tripId_day_timeText_idx` ON `Schedule`(`tripId`, `day`, `timeText`);

-- CreateIndex
CREATE INDEX `Schedule_locationLat_locationLon_idx` ON `Schedule`(`locationLat`, `locationLon`);
