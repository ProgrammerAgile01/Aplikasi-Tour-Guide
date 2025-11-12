-- AlterTable
ALTER TABLE `participant` ADD COLUMN `initialPassword` VARCHAR(191) NULL,
    ADD COLUMN `initialPasswordAt` DATETIME(3) NULL,
    ADD COLUMN `loginEmail` VARCHAR(191) NULL;
