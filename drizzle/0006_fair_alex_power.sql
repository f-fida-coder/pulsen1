CREATE TABLE `device_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dcUserId` int NOT NULL,
	`dcDeviceType` enum('battery','inverter','charger','meter') NOT NULL,
	`dcDeviceName` varchar(255) NOT NULL,
	`dcProtocol` enum('solarman','modbus_tcp','modbus_rtu','http','mqtt') NOT NULL,
	`dcSolarmanToken` text,
	`dcSolarmanAppId` varchar(100),
	`dcSolarmanAppSecret` varchar(255),
	`dcDeviceSn` varchar(100),
	`dcLoggerId` varchar(100),
	`dcModbusHost` varchar(255),
	`dcModbusPort` int DEFAULT 502,
	`dcModbusUnitId` int DEFAULT 1,
	`dcMaxChargePower` int DEFAULT 5000,
	`dcMaxDischargePower` int DEFAULT 5000,
	`dcMaxSocPercent` int DEFAULT 95,
	`dcMinSocPercent` int DEFAULT 10,
	`dcIsActive` boolean NOT NULL DEFAULT true,
	`dcCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`dcUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dlDeviceConfigId` int,
	`dlActionId` int,
	`dlDeviceType` enum('battery','inverter','charger','meter') NOT NULL,
	`dlCommand` varchar(100) NOT NULL,
	`dlRequestPayload` json,
	`dlDeviceResponse` json,
	`dlSuccess` boolean NOT NULL,
	`dlErrorMessage` text,
	`dlExecutionTimeMs` int,
	`dlCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_logs_id` PRIMARY KEY(`id`)
);
