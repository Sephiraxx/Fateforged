CREATE TABLE `team_operations` (
	`owner_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`request_json` text NOT NULL,
	PRIMARY KEY(`owner_id`, `operation_id`)
);
--> statement-breakpoint
CREATE TABLE `team_worlds` (
	`owner_id` text NOT NULL,
	`format` integer NOT NULL,
	`revision` integer NOT NULL,
	`last_operation` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `format`)
);
