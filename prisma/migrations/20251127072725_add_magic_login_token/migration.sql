-- CreateTable
CREATE TABLE `MagicLoginToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NULL,
    `tripId` VARCHAR(191) NULL,
    `token` VARCHAR(128) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `MagicLoginToken_token_key`(`token`),
    INDEX `MagicLoginToken_userId_idx`(`userId`),
    INDEX `MagicLoginToken_participantId_idx`(`participantId`),
    INDEX `MagicLoginToken_tripId_idx`(`tripId`),
    INDEX `MagicLoginToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MagicLoginToken` ADD CONSTRAINT `MagicLoginToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MagicLoginToken` ADD CONSTRAINT `MagicLoginToken_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MagicLoginToken` ADD CONSTRAINT `MagicLoginToken_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
