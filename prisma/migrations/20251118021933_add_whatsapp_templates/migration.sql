-- CreateTable
CREATE TABLE `WhatsAppTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `type` ENUM('SCHEDULE', 'PARTICIPANT_REGISTERED_NEW', 'PARTICIPANT_REGISTERED_EXISTING', 'ANNOUNCEMENT') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppTemplate_tripId_idx`(`tripId`),
    INDEX `WhatsAppTemplate_type_idx`(`type`),
    UNIQUE INDEX `WhatsAppTemplate_tripId_type_key`(`tripId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WhatsAppTemplate` ADD CONSTRAINT `WhatsAppTemplate_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
