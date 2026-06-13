CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invToken` varchar(64) NOT NULL,
	`invName` varchar(255) NOT NULL,
	`invEmail` varchar(320) NOT NULL,
	`invPhone` varchar(30),
	`invCareTier` enum('basic','plus','platinum') NOT NULL DEFAULT 'basic',
	`invTempPassword` varchar(255) NOT NULL,
	`invStatus` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`invSmsSent` boolean NOT NULL DEFAULT false,
	`invExpiresAt` timestamp NOT NULL,
	`invAcceptedAt` timestamp,
	`invCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_invToken_unique` UNIQUE(`invToken`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prtUserId` int NOT NULL,
	`prtToken` varchar(64) NOT NULL,
	`prtExpiresAt` timestamp NOT NULL,
	`prtUsedAt` timestamp,
	`prtCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_prtToken_unique` UNIQUE(`prtToken`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `userCareTier` enum('basic','plus','platinum') DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);