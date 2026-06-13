CREATE TABLE `actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionUserId` int NOT NULL,
	`actionInsightId` int,
	`actionArticleId` int,
	`engActionType` enum('optimize_battery','schedule_charging','view_forecast','monitor_risk','adjust_load','sell_excess','custom') NOT NULL,
	`actionPayload` json,
	`actionDescription` text,
	`engActionStatus` enum('pending','approved','executed','failed','dismissed') NOT NULL DEFAULT 'pending',
	`autoTriggered` boolean NOT NULL DEFAULT false,
	`triggerReason` text,
	`actionExecutedAt` timestamp,
	`executionResult` json,
	`actionCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`actionUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actions_id` PRIMARY KEY(`id`)
);
