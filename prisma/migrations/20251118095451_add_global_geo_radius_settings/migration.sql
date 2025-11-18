-- AlterTable
ALTER TABLE `setting` ADD COLUMN `geoAttendanceRadiusMeters` INTEGER NULL DEFAULT 200,
    ADD COLUMN `geoReminderRadiusMeters` INTEGER NULL DEFAULT 1000;
