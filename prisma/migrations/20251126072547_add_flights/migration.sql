-- CreateTable
CREATE TABLE `Flight` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NULL,
    `passengerName` VARCHAR(191) NOT NULL,
    `role` ENUM('PESERTA', 'TL_AGENT') NOT NULL,
    `orderId` VARCHAR(100) NULL,
    `flightNumber1` VARCHAR(50) NOT NULL,
    `flightNumber2` VARCHAR(50) NULL,
    `airline1` VARCHAR(100) NOT NULL,
    `airline2` VARCHAR(100) NULL,
    `ticketNumber` VARCHAR(100) NOT NULL,
    `direction` ENUM('DEPARTURE', 'RETURN') NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Flight_tripId_idx`(`tripId`),
    INDEX `Flight_participantId_idx`(`participantId`),
    INDEX `Flight_direction_idx`(`direction`),
    INDEX `Flight_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Flight` ADD CONSTRAINT `Flight_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
