-- CreateTable
CREATE TABLE `WhatsAppMessage` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NULL,
    `participantId` VARCHAR(191) NULL,
    `to` VARCHAR(32) NOT NULL,
    `template` VARCHAR(100) NULL,
    `content` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `status` ENUM('PENDING', 'SENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `error` VARCHAR(512) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppMessage_tripId_idx`(`tripId`),
    INDEX `WhatsAppMessage_participantId_idx`(`participantId`),
    INDEX `WhatsAppMessage_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
