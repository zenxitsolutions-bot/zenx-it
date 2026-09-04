-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `label` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `permissions_key_key`(`key`),
    INDEX `permissions_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `roles_companyId_idx`(`companyId`),
    UNIQUE INDEX `roles_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(30) NULL,
    `dob` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    `address` TEXT NULL,
    `country` VARCHAR(100) NULL,
    `timezone` VARCHAR(64) NULL,
    `dietType` ENUM('VEGETARIAN', 'NON_VEGETARIAN') NULL,
    `foodPreferences` JSON NULL,
    `foodAllergies` JSON NULL,
    `mealsPerDay` INTEGER NULL,
    `preferredMealTimes` JSON NULL,
    `heightCm` DOUBLE NULL,
    `weightKg` DOUBLE NULL,
    `bmi` DOUBLE NULL,
    `targetWeightKg` DOUBLE NULL,
    `waistCm` DOUBLE NULL,
    `hipCm` DOUBLE NULL,
    `extraMeasurements` JSON NULL,
    `callingFrequency` ENUM('DAILY', 'EVERY_2_DAYS', 'EVERY_3_DAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM') NULL,
    `everyXDays` INTEGER NULL,
    `specificDaysOfWeek` JSON NULL,
    `specificDayOfMonth` INTEGER NULL,
    `preferredCallingDays` JSON NULL,
    `preferredCallingTime` VARCHAR(5) NULL,
    `callingTimezone` VARCHAR(64) NULL,
    `callDurationMinutes` INTEGER NULL,
    `assignedDietitianId` VARCHAR(191) NULL,
    `assignedTrainerId` VARCHAR(191) NULL,
    `callStartDate` DATE NULL,
    `callEndDate` DATE NULL,
    `numberOfScheduledCalls` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `clients_companyId_status_idx`(`companyId`, `status`),
    INDEX `clients_companyId_assignedDietitianId_idx`(`companyId`, `assignedDietitianId`),
    INDEX `clients_companyId_assignedTrainerId_idx`(`companyId`, `assignedTrainerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_enquiries` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(30) NULL,
    `source` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `status` ENUM('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'NOT_INTERESTED') NOT NULL DEFAULT 'NEW',
    `assignedToId` VARCHAR(191) NULL,
    `convertedClientId` VARCHAR(191) NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_enquiries_convertedClientId_key`(`convertedClientId`),
    INDEX `customer_enquiries_companyId_status_idx`(`companyId`, `status`),
    INDEX `customer_enquiries_companyId_assignedToId_idx`(`companyId`, `assignedToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enquiry_followups` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `remindAt` DATETIME(3) NULL,
    `reminderSentAt` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `outcome` TEXT NULL,
    `notes` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `enquiry_followups_companyId_status_dueAt_idx`(`companyId`, `status`, `dueAt`),
    INDEX `enquiry_followups_enquiryId_idx`(`enquiryId`),
    INDEX `enquiry_followups_remindAt_idx`(`remindAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_enquiry_comments` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_enquiry_comments_companyId_enquiryId_idx`(`companyId`, `enquiryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_assignedDietitianId_fkey` FOREIGN KEY (`assignedDietitianId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_assignedTrainerId_fkey` FOREIGN KEY (`assignedTrainerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_enquiries` ADD CONSTRAINT `customer_enquiries_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_enquiries` ADD CONSTRAINT `customer_enquiries_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_enquiries` ADD CONSTRAINT `customer_enquiries_convertedClientId_fkey` FOREIGN KEY (`convertedClientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry_followups` ADD CONSTRAINT `enquiry_followups_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `customer_enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enquiry_followups` ADD CONSTRAINT `enquiry_followups_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_enquiry_comments` ADD CONSTRAINT `customer_enquiry_comments_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `customer_enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_enquiry_comments` ADD CONSTRAINT `customer_enquiry_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

