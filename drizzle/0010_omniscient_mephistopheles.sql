ALTER TABLE `tickets` ADD `slaDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `tickets` ADD `ticketCareTier` enum('basic','plus','platinum') DEFAULT 'basic';