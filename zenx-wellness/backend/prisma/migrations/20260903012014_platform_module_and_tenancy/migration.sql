-- DropIndex
DROP INDEX `users_email_key` ON `users`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phone` VARCHAR(30) NULL,
    ADD COLUMN `timezone` VARCHAR(64) NULL,
    ADD COLUMN `username` VARCHAR(100) NULL,
    MODIFY `role` ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'DIETITIAN', 'TRAINER', 'RECEPTIONIST', 'CLIENT') NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE `platform_admins` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(120) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_admins_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `logoUrl` VARCHAR(500) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `address` TEXT NULL,
    `country` VARCHAR(100) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `accountStatus` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_slug_key`(`slug`),
    INDEX `companies_accountStatus_idx`(`accountStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_domains` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `subdomain` VARCHAR(100) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_domains_subdomain_key`(`subdomain`),
    INDEX `company_domains_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `features` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_plans_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `subscriptions_companyId_idx`(`companyId`),
    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_status_endDate_idx`(`status`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_enquiries` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(150) NOT NULL,
    `contactName` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `source` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `status` ENUM('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'NOT_INTERESTED', 'FUTURE_FOLLOW_UP') NOT NULL DEFAULT 'NEW',
    `assignedToId` VARCHAR(191) NULL,
    `convertedCompanyId` VARCHAR(191) NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_enquiries_convertedCompanyId_key`(`convertedCompanyId`),
    INDEX `platform_enquiries_status_idx`(`status`),
    INDEX `platform_enquiries_assignedToId_idx`(`assignedToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_followups` (
    `id` VARCHAR(191) NOT NULL,
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

    INDEX `platform_followups_enquiryId_idx`(`enquiryId`),
    INDEX `platform_followups_status_dueAt_idx`(`status`, `dueAt`),
    INDEX `platform_followups_remindAt_idx`(`remindAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_enquiry_comments` (
    `id` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_enquiry_comments_enquiryId_idx`(`enquiryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- CreateIndex
CREATE UNIQUE INDEX `users_companyId_email_key` ON `users`(`companyId`, `email`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_admins` ADD CONSTRAINT `platform_admins_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_domains` ADD CONSTRAINT `company_domains_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_enquiries` ADD CONSTRAINT `platform_enquiries_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `platform_admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_enquiries` ADD CONSTRAINT `platform_enquiries_convertedCompanyId_fkey` FOREIGN KEY (`convertedCompanyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_followups` ADD CONSTRAINT `platform_followups_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `platform_enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_followups` ADD CONSTRAINT `platform_followups_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `platform_admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_enquiry_comments` ADD CONSTRAINT `platform_enquiry_comments_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `platform_enquiries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_enquiry_comments` ADD CONSTRAINT `platform_enquiry_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `platform_admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

