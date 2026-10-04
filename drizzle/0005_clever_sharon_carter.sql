CREATE TABLE `roster_archives` (
	`owner_id` text NOT NULL,
	`batch_key` text NOT NULL,
	`character_id` text NOT NULL,
	`name` text NOT NULL,
	`state_json` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `batch_key`, `character_id`)
);
--> statement-breakpoint
CREATE TABLE `roster_refreshes` (
	`owner_id` text NOT NULL,
	`batch_key` text NOT NULL,
	`nonce` text NOT NULL,
	`template_json` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `batch_key`)
);
