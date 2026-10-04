ALTER TABLE `tournament_name_claims` ADD `tournament_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_name_claim_owner_tournament` ON `tournament_name_claims` (`owner_id`,`tournament_id`);