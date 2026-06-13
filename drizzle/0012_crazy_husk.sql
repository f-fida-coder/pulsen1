CREATE TABLE `onboarding_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opUserId` int NOT NULL,
	`opCompletedSteps` json DEFAULT ('[]'),
	`opDismissed` boolean NOT NULL DEFAULT false,
	`opCompletedAt` timestamp,
	`opCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`opUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_progress_opUserId_unique` UNIQUE(`opUserId`)
);
