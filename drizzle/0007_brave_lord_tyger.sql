CREATE TABLE `energy_timeseries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`etTimestamp` timestamp NOT NULL,
	`etUserId` int NOT NULL,
	`etConfigId` int,
	`etConsumptionWh` int DEFAULT 0,
	`etProductionWh` int DEFAULT 0,
	`etBatteryChargeWh` int DEFAULT 0,
	`etBatteryDischargeWh` int DEFAULT 0,
	`etGridImportWh` int DEFAULT 0,
	`etGridExportWh` int DEFAULT 0,
	`etBatterySocPercent` int,
	`etSource` enum('solarman','modbus','manual','simulated') DEFAULT 'simulated',
	`etCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `energy_timeseries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_timeseries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ptTimestamp` timestamp NOT NULL,
	`ptRegion` enum('SE1','SE2','SE3','SE4') NOT NULL,
	`ptPriceSekPerKwh` int NOT NULL,
	`ptSource` varchar(50) DEFAULT 'elprisetjustnu',
	`ptCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_timeseries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `actions` ADD `baselineCostSek` int;--> statement-breakpoint
ALTER TABLE `actions` ADD `actualCostSek` int;--> statement-breakpoint
ALTER TABLE `actions` ADD `savingsSek` int;--> statement-breakpoint
ALTER TABLE `actions` ADD `savingsKwh` int;--> statement-breakpoint
ALTER TABLE `actions` ADD `roiConfidence` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `actions` ADD `roiEstimated` boolean DEFAULT true;