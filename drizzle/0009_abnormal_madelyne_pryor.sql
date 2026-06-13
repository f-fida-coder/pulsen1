CREATE TABLE `alert_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arUserId` int NOT NULL,
	`arDeviceConfigId` int,
	`arName` varchar(100) NOT NULL,
	`arMetricKey` varchar(100) NOT NULL,
	`arOperator` enum('lt','gt','lte','gte','eq','neq') NOT NULL,
	`arThreshold` varchar(50) NOT NULL,
	`arSeverity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`arMessage` varchar(500),
	`arIsActive` boolean NOT NULL DEFAULT true,
	`arCooldownMinutes` int DEFAULT 60,
	`arLastTriggeredAt` timestamp,
	`arCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`arUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_health_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sheUserId` int NOT NULL,
	`sheDeviceConfigId` int,
	`sheEventType` enum('heartbeat','offline','online','anomaly','alert_triggered','alert_resolved','threshold_breach') NOT NULL,
	`sheSeverity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`sheTitle` varchar(255) NOT NULL,
	`sheMessage` varchar(1000),
	`sheMetricKey` varchar(100),
	`sheMetricValue` varchar(100),
	`sheMetricUnit` varchar(30),
	`sheResolved` boolean NOT NULL DEFAULT false,
	`sheResolvedAt` timestamp,
	`sheCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_health_events_id` PRIMARY KEY(`id`)
);
