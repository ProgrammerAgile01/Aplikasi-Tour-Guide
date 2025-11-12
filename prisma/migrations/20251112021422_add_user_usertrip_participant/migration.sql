-- CreateTable
CREATE TABLE `UserTrip` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `roleOnTrip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserTrip_userId_idx`(`userId`),
    INDEX `UserTrip_tripId_idx`(`tripId`),
    UNIQUE INDEX `UserTrip_userId_tripId_key`(`userId`, `tripId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserTrip` ADD CONSTRAINT `UserTrip_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserTrip` ADD CONSTRAINT `UserTrip_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
