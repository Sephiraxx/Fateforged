CREATE TABLE `fighter_growth` (
	`owner_id` text NOT NULL,
	`event_id` text NOT NULL,
	`character_id` text NOT NULL,
	`opponent_id` text NOT NULL,
	`axis` text NOT NULL,
	`amount` integer NOT NULL,
	`earned_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_growth_owner_character` ON `fighter_growth` (`owner_id`,`character_id`);