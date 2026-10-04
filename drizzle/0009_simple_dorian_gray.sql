CREATE TABLE `fighter_growth_sync` (
	`owner_id` text NOT NULL,
	`tournament_id` text NOT NULL,
	`matches` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `tournament_id`)
);
