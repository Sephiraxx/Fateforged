CREATE TABLE `saved_tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`state_json` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tournaments_owner_updated` ON `saved_tournaments` (`owner_id`,`updated_at`);