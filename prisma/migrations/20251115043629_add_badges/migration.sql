-- CreateTable
CREATE TABLE `BadgeDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(32) NOT NULL,
    `location` VARCHAR(191) NULL,
    `conditionType` ENUM('CHECKIN_SESSION', 'GALLERY_UPLOAD_SESSION', 'COMPLETE_ALL_SESSIONS') NOT NULL,
    `targetValue` INTEGER NULL,
    `sessionId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BadgeDefinition_tripId_idx`(`tripId`),
    INDEX `BadgeDefinition_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParticipantBadge` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `badgeId` VARCHAR(191) NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ParticipantBadge_tripId_participantId_idx`(`tripId`, `participantId`),
    UNIQUE INDEX `ParticipantBadge_participantId_badgeId_key`(`participantId`, `badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BadgeDefinition` ADD CONSTRAINT `BadgeDefinition_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BadgeDefinition` ADD CONSTRAINT `BadgeDefinition_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Schedule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParticipantBadge` ADD CONSTRAINT `ParticipantBadge_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParticipantBadge` ADD CONSTRAINT `ParticipantBadge_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParticipantBadge` ADD CONSTRAINT `ParticipantBadge_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `BadgeDefinition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
