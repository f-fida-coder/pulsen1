ALTER TABLE `news_articles` MODIFY COLUMN `articleRegion` enum('SE','NORDICS','EU','GLOBAL') NOT NULL DEFAULT 'GLOBAL';--> statement-breakpoint
ALTER TABLE `ai_insights` ADD `insightActionType` enum('optimize_battery','schedule_charging','view_forecast','monitor_risk','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_insights` ADD `insightActionText` text;--> statement-breakpoint
ALTER TABLE `ai_insights` ADD `insightPersonalizedInsight` text;--> statement-breakpoint
ALTER TABLE `ai_insights` ADD `insightUserRegion` varchar(10);--> statement-breakpoint
ALTER TABLE `news_articles` ADD `actionType` enum('optimize_battery','schedule_charging','view_forecast','monitor_risk','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `news_articles` ADD `actionText` text;--> statement-breakpoint
ALTER TABLE `news_articles` ADD `personalizedInsight` text;