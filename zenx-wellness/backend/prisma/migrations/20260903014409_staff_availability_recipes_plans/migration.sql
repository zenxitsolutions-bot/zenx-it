-- AlterTable
ALTER TABLE `clients` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `dietitians` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `specialization` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `bio` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dietitians_userId_key`(`userId`),
    INDEX `dietitians_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trainers` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `specialization` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `bio` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trainers_userId_key`(`userId`),
    INDEX `trainers_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_dietitian_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `dietitianUserId` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `assignedById` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_dietitian_assignments_companyId_dietitianUserId_idx`(`companyId`, `dietitianUserId`),
    UNIQUE INDEX `client_dietitian_assignments_clientId_dietitianUserId_key`(`clientId`, `dietitianUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_trainer_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `trainerUserId` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `assignedById` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_trainer_assignments_companyId_trainerUserId_idx`(`companyId`, `trainerUserId`),
    UNIQUE INDEX `client_trainer_assignments_clientId_trainerUserId_key`(`clientId`, `trainerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `availability` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dayOfWeek` TINYINT NOT NULL,
    `startTime` VARCHAR(5) NOT NULL,
    `endTime` VARCHAR(5) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `availability_companyId_userId_dayOfWeek_idx`(`companyId`, `userId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `availability_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `isFullDay` BOOLEAN NOT NULL DEFAULT true,
    `startTime` VARCHAR(5) NULL,
    `endTime` VARCHAR(5) NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `availability_blocks_companyId_userId_startDate_endDate_idx`(`companyId`, `userId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipes` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `ingredients` JSON NULL,
    `prepInstructions` TEXT NULL,
    `mealType` ENUM('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `calories` DOUBLE NULL,
    `protein` DOUBLE NULL,
    `carbs` DOUBLE NULL,
    `fat` DOUBLE NULL,
    `prepTimeMinutes` INTEGER NULL,
    `servingSize` VARCHAR(100) NULL,
    `mediaUrl` VARCHAR(500) NULL,
    `createdById` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recipes_companyId_mealType_idx`(`companyId`, `mealType`),
    INDEX `recipes_companyId_isActive_idx`(`companyId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diet_plans` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `diet_plans_companyId_isActive_idx`(`companyId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diet_plan_items` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `dietPlanId` VARCHAR(191) NOT NULL,
    `dayOfWeek` TINYINT NOT NULL,
    `mealType` ENUM('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'CUSTOM') NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `recipeId` VARCHAR(191) NULL,
    `customTitle` VARCHAR(200) NULL,
    `customInstructions` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `diet_plan_items_companyId_dietPlanId_idx`(`companyId`, `dietPlanId`),
    INDEX `diet_plan_items_dietPlanId_dayOfWeek_mealType_idx`(`dietPlanId`, `dayOfWeek`, `mealType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diet_plan_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `dietPlanId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `assignedById` VARCHAR(191) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `diet_plan_assignments_companyId_clientId_idx`(`companyId`, `clientId`),
    UNIQUE INDEX `diet_plan_assignments_dietPlanId_clientId_key`(`dietPlanId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercises` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `instructions` TEXT NULL,
    `targetMuscleGroup` VARCHAR(100) NULL,
    `equipment` VARCHAR(150) NULL,
    `difficulty` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NULL,
    `mediaUrl` VARCHAR(500) NULL,
    `exerciseType` VARCHAR(100) NULL,
    `durationSeconds` INTEGER NULL,
    `defaultSets` INTEGER NULL,
    `defaultRepetitions` INTEGER NULL,
    `restTimeSeconds` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exercises_companyId_isActive_idx`(`companyId`, `isActive`),
    INDEX `exercises_companyId_targetMuscleGroup_idx`(`companyId`, `targetMuscleGroup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_plans` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `planType` ENUM('DAILY', 'WEEKLY') NOT NULL DEFAULT 'WEEKLY',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_plans_companyId_isActive_idx`(`companyId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_plan_items` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `workoutPlanId` VARCHAR(191) NOT NULL,
    `dayOfWeek` TINYINT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `exerciseId` VARCHAR(191) NOT NULL,
    `sets` INTEGER NULL,
    `repetitions` INTEGER NULL,
    `durationSeconds` INTEGER NULL,
    `restTimeSeconds` INTEGER NULL,
    `instructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_plan_items_companyId_workoutPlanId_idx`(`companyId`, `workoutPlanId`),
    INDEX `workout_plan_items_workoutPlanId_dayOfWeek_idx`(`workoutPlanId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_plan_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `workoutPlanId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `assignedById` VARCHAR(191) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `workout_plan_assignments_companyId_clientId_idx`(`companyId`, `clientId`),
    UNIQUE INDEX `workout_plan_assignments_workoutPlanId_clientId_key`(`workoutPlanId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `clients_userId_key` ON `clients`(`userId`);

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dietitians` ADD CONSTRAINT `dietitians_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dietitians` ADD CONSTRAINT `dietitians_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainers` ADD CONSTRAINT `trainers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trainers` ADD CONSTRAINT `trainers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dietitian_assignments` ADD CONSTRAINT `client_dietitian_assignments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_dietitian_assignments` ADD CONSTRAINT `client_dietitian_assignments_dietitianUserId_fkey` FOREIGN KEY (`dietitianUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_trainer_assignments` ADD CONSTRAINT `client_trainer_assignments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_trainer_assignments` ADD CONSTRAINT `client_trainer_assignments_trainerUserId_fkey` FOREIGN KEY (`trainerUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `availability` ADD CONSTRAINT `availability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `availability_blocks` ADD CONSTRAINT `availability_blocks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plans` ADD CONSTRAINT `diet_plans_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plans` ADD CONSTRAINT `diet_plans_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plan_items` ADD CONSTRAINT `diet_plan_items_dietPlanId_fkey` FOREIGN KEY (`dietPlanId`) REFERENCES `diet_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plan_items` ADD CONSTRAINT `diet_plan_items_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plan_assignments` ADD CONSTRAINT `diet_plan_assignments_dietPlanId_fkey` FOREIGN KEY (`dietPlanId`) REFERENCES `diet_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diet_plan_assignments` ADD CONSTRAINT `diet_plan_assignments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plans` ADD CONSTRAINT `workout_plans_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plans` ADD CONSTRAINT `workout_plans_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plan_items` ADD CONSTRAINT `workout_plan_items_workoutPlanId_fkey` FOREIGN KEY (`workoutPlanId`) REFERENCES `workout_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plan_items` ADD CONSTRAINT `workout_plan_items_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plan_assignments` ADD CONSTRAINT `workout_plan_assignments_workoutPlanId_fkey` FOREIGN KEY (`workoutPlanId`) REFERENCES `workout_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plan_assignments` ADD CONSTRAINT `workout_plan_assignments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

