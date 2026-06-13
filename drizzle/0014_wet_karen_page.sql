CREATE TABLE `bill_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brBillId` int NOT NULL,
	`brUserId` int NOT NULL,
	`brReminderDate` timestamp NOT NULL,
	`brReminderType` enum('email','sms') NOT NULL DEFAULT 'email',
	`brSent` boolean NOT NULL DEFAULT false,
	`brSentAt` timestamp,
	`brCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bill_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `electricity_bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ebUserId` int NOT NULL,
	`ebFilename` varchar(255) NOT NULL,
	`ebFileKey` varchar(500) NOT NULL,
	`ebFileUrl` text NOT NULL,
	`ebBillMonth` int NOT NULL,
	`ebBillYear` int NOT NULL,
	`ebAmount` decimal(10,2),
	`ebDueDate` timestamp,
	`ebNotes` text,
	`ebCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `electricity_bills_id` PRIMARY KEY(`id`)
);
