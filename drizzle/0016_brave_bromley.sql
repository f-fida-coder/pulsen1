ALTER TABLE `tickets` ADD `ticketSource` enum('portal','email','sms','api') DEFAULT 'portal' NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `ticketSenderEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `tickets` ADD `ticketEmailMessageId` varchar(500);