CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` enum('SE1','SE2','SE3','SE4') NOT NULL,
	`priceHour` timestamp NOT NULL,
	`priceOre` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int,
	`userId` int NOT NULL,
	`reportType` enum('wind_potential','roi_summary','monthly_savings') NOT NULL,
	`title` varchar(255) NOT NULL,
	`fileUrl` text,
	`fileKey` varchar(255),
	`parameters` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savings_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`solarSavings` int DEFAULT 0,
	`windSavings` int DEFAULT 0,
	`batterySavings` int DEFAULT 0,
	`priceSavings` int DEFAULT 0,
	`totalDecisions` int DEFAULT 0,
	`correctedDecisions` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savings_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`isDefault` boolean DEFAULT false,
	`batteryCapacity` decimal(10,2) DEFAULT '0',
	`batteryDoD` int DEFAULT 80,
	`batteryEfficiency` int DEFAULT 92,
	`solarCapacity` decimal(10,2) DEFAULT '0',
	`roofTilt` int DEFAULT 30,
	`roofOrientation` int DEFAULT 180,
	`shading` int DEFAULT 0,
	`hasWind` boolean DEFAULT false,
	`windCapacity` decimal(10,2) DEFAULT '0',
	`hubHeight` int DEFAULT 30,
	`annualConsumption` int DEFAULT 20000,
	`hasEV` boolean DEFAULT false,
	`evConsumption` int DEFAULT 0,
	`heatingType` enum('heatpump','direct','district','other') DEFAULT 'heatpump',
	`electricityArea` enum('SE1','SE2','SE3','SE4') DEFAULT 'SE3',
	`latitude` decimal(10,6),
	`longitude` decimal(10,6),
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weather_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`recordedAt` timestamp NOT NULL,
	`windSpeed` decimal(5,2),
	`windDirection` int,
	`windGust` decimal(5,2),
	`temperature` decimal(5,2),
	`cloudCover` int,
	`humidity` int,
	`apiWindSpeed` decimal(5,2),
	`source` enum('local_station','smhi','manual') DEFAULT 'smhi',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weather_history_id` PRIMARY KEY(`id`)
);
