CREATE TABLE `ai_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightArticleId` int NOT NULL,
	`insightText` text NOT NULL,
	`impactType` enum('price','savings','risk','opportunity') NOT NULL DEFAULT 'savings',
	`insightRecommendation` text,
	`confidenceScore` int NOT NULL DEFAULT 70,
	`insightCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleTitle` varchar(500) NOT NULL,
	`articleSource` varchar(255) NOT NULL,
	`articleUrl` varchar(1000) NOT NULL,
	`articleImageUrl` varchar(1000),
	`articlePublishedAt` timestamp,
	`rawContent` text,
	`cleanContent` text,
	`articleSummary` text,
	`articleTags` json,
	`articleRegion` enum('SE','EU','GLOBAL') NOT NULL DEFAULT 'GLOBAL',
	`relevanceScore` int NOT NULL DEFAULT 50,
	`articleProcessed` boolean NOT NULL DEFAULT false,
	`articleCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_articles_articleUrl_unique` UNIQUE(`articleUrl`)
);
