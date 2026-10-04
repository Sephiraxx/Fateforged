CREATE TABLE `champion_history` (
	`owner_id` text NOT NULL,
	`tournament_id` text NOT NULL,
	`tournament_name` text NOT NULL,
	`division_key` text NOT NULL,
	`label` text NOT NULL,
	`character_id` text NOT NULL,
	`character_name` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `tournament_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_history_owner_completed` ON `champion_history` (`owner_id`,`completed_at`);