CREATE TABLE `current_champions` (
	`owner_id` text NOT NULL,
	`division_key` text NOT NULL,
	`label` text NOT NULL,
	`character_id` text NOT NULL,
	`character_name` text NOT NULL,
	`tournament_id` text NOT NULL,
	`tournament_name` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `division_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_champions_owner_completed` ON `current_champions` (`owner_id`,`completed_at`);--> statement-breakpoint
ALTER TABLE `saved_tournaments` ADD `completed_at` integer;
--> statement-breakpoint
UPDATE saved_tournaments SET completed_at = updated_at WHERE json_extract(summary_json, '$.done') = 1;
