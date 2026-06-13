CREATE TABLE `customer_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cdUploadedBy` int NOT NULL,
	`cdTargetUserId` int NOT NULL,
	`cdFilename` varchar(255) NOT NULL,
	`cdFileKey` varchar(500) NOT NULL,
	`cdFileUrl` varchar(1000) NOT NULL,
	`cdDocType` enum('contract','warranty','invoice','service_report','installation_report','certificate','other') NOT NULL DEFAULT 'other',
	`cdDescription` varchar(500),
	`cdFileSizeBytes` int DEFAULT 0,
	`cdCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`cdUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_documents_id` PRIMARY KEY(`id`)
);
