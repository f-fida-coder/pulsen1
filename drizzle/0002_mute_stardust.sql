CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`contractType` enum('care_basic','care_plus','care_platinum','installation','maintenance','lease','other') NOT NULL DEFAULT 'other',
	`contractStartDate` timestamp NOT NULL,
	`contractEndDate` timestamp,
	`monthlyCost` int,
	`contractStatus` enum('active','pending','expired','cancelled') NOT NULL DEFAULT 'active',
	`contractDocumentUrl` varchar(500),
	`signedAt` timestamp,
	`contractNotes` text,
	`contractCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`contractUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`deviceType` enum('solar','battery','inverter','heat_pump','ev_charger','wind') NOT NULL,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`serialNumber` varchar(100),
	`deviceStatus` enum('online','offline','warning','error') NOT NULL DEFAULT 'online',
	`capacityKw` decimal(10,2),
	`lastReading` json,
	`lastSeenAt` timestamp,
	`installedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`notifType` enum('ai','energy','system','alert','ticket','info') NOT NULL DEFAULT 'info',
	`notifTitle` varchar(255) NOT NULL,
	`notifMessage` text NOT NULL,
	`notifPriority` enum('normal','high') NOT NULL DEFAULT 'normal',
	`isRead` boolean NOT NULL DEFAULT false,
	`notifLink` varchar(500),
	`notifCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optimizationRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`zone` varchar(10) NOT NULL,
	`optDate` varchar(10) NOT NULL,
	`totalHours` int NOT NULL,
	`tomorrowIncluded` boolean NOT NULL DEFAULT false,
	`batteryCapacityKwh` int NOT NULL,
	`batteryMaxPowerKw` int NOT NULL,
	`panelKwp` int NOT NULL,
	`netSavingsSek` int NOT NULL,
	`arbitrageProfitSek` int NOT NULL,
	`peakShavingValueSek` int NOT NULL,
	`selfConsumptionPct` int NOT NULL,
	`baselineCostSek` int NOT NULL,
	`optTotalCostSek` int NOT NULL,
	`avgChargePriceSek` int NOT NULL,
	`avgDischargePriceSek` int NOT NULL,
	`scheduleJson` text NOT NULL,
	`actualNetSavingsSek` int,
	`actualTotalCostSek` int,
	`actualNotes` text,
	`optCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`optUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `optimizationRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`referredEmail` varchar(320),
	`referredUserId` int,
	`referralStatus` enum('pending','registered','converted','rewarded') NOT NULL DEFAULT 'pending',
	`rewardAmount` int DEFAULT 0,
	`rewardPaid` boolean NOT NULL DEFAULT false,
	`referralCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`referralUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `schedulerConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`schedulerZone` varchar(10) NOT NULL DEFAULT 'SE3',
	`schedulerLat` int NOT NULL DEFAULT 5933,
	`schedulerLon` int NOT NULL DEFAULT 1807,
	`schedulerBatteryCapacityKwh` int NOT NULL DEFAULT 15,
	`schedulerBatteryMaxPowerKw` int NOT NULL DEFAULT 5,
	`schedulerPanelKwp` int NOT NULL DEFAULT 10,
	`schedulerHasHeatPump` boolean NOT NULL DEFAULT true,
	`schedulerHasEv` boolean NOT NULL DEFAULT false,
	`schedulerPeakShaving` boolean NOT NULL DEFAULT true,
	`schedulerPeakLimitKw` int NOT NULL DEFAULT 11,
	`schedulerLastRunAt` timestamp,
	`schedulerLastRunStatus` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
	`schedulerLastRunError` text,
	`schedulerCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`schedulerUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedulerConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticketComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`authorId` int,
	`authorName` varchar(255),
	`content` text NOT NULL,
	`isInternal` boolean NOT NULL DEFAULT false,
	`commentCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(20) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`description` text,
	`ticketStatus` enum('open','in_progress','waiting','resolved','closed') NOT NULL DEFAULT 'open',
	`ticketPriority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`ticketCategory` enum('technical','billing','installation','general','warranty') NOT NULL DEFAULT 'general',
	`customerId` int,
	`assignedToId` int,
	`resolution` text,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`ticketCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`ticketUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
CREATE TABLE `warranties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productType` enum('solar_panel','inverter','battery','ev_charger','heat_pump','installation','other') NOT NULL DEFAULT 'other',
	`warrantySerialNumber` varchar(100),
	`warrantyStartDate` timestamp NOT NULL,
	`warrantyEndDate` timestamp NOT NULL,
	`provider` varchar(255),
	`warrantyDocumentUrl` varchar(500),
	`warrantyStatus` enum('active','expired','claimed') NOT NULL DEFAULT 'active',
	`warrantyNotes` text,
	`warrantyCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`warrantyUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warranties_id` PRIMARY KEY(`id`)
);
