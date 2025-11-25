-- AlterTable
ALTER TABLE `participant` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `birthPlace` VARCHAR(191) NULL,
    ADD COLUMN `gender` ENUM('MALE', 'FEMALE') NULL,
    ADD COLUMN `nik` VARCHAR(32) NULL,
    ADD COLUMN `roomNumber` VARCHAR(32) NULL;
