CREATE TABLE `knowledge_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kaAuthorId` int NOT NULL,
	`kaTitle` varchar(255) NOT NULL,
	`kaSlug` varchar(255) NOT NULL,
	`kaExcerpt` text,
	`kaContent` text NOT NULL,
	`kaCategory` enum('products','regulations','apps_services','technology','news','other') NOT NULL DEFAULT 'other',
	`kaTags` varchar(500),
	`kaImageUrl` varchar(1000),
	`kaPublished` boolean NOT NULL DEFAULT false,
	`kaPublishedAt` timestamp,
	`kaCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`kaUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_articles_kaSlug_unique` UNIQUE(`kaSlug`)
);
