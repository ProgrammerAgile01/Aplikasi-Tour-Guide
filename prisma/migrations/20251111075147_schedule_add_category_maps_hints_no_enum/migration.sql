-- AlterTable
ALTER TABLE `schedule` ADD COLUMN `category` VARCHAR(120) NULL,
    ADD COLUMN `hints` JSON NULL,
    ADD COLUMN `locationMapUrl` VARCHAR(512) NULL;

-- CreateIndex
CREATE INDEX `Schedule_category_idx` ON `Schedule`(`category`);
