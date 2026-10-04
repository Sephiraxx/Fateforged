CREATE TABLE `match_record_sync` (
	`owner_id` text NOT NULL,
	`tournament_id` text NOT NULL,
	`matches` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `tournament_id`)
);
--> statement-breakpoint
CREATE TABLE `match_records` (
	`owner_id` text NOT NULL,
	`event_id` text NOT NULL,
	`tournament_id` text,
	`character_a` text NOT NULL,
	`character_b` text NOT NULL,
	`winner` text,
	`score_json` text NOT NULL,
	`recorded_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_match_records_owner_tournament` ON `match_records` (`owner_id`,`tournament_id`);