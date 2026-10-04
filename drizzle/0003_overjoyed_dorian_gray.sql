CREATE TABLE `tournament_name_claims` (
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`owner_id`, `name`)
);
