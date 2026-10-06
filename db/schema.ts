import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
export const characters=sqliteTable('saved_characters',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),
 stateJson:text('state_json').notNull(),summaryJson:text('summary_json').notNull(),
 createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),catalogRevision:text('catalog_revision'),poolId:text('pool_id')
},table=>[index('idx_characters_owner_updated').on(table.ownerId,table.updatedAt)]);
export const tournaments=sqliteTable('saved_tournaments',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),
 stateJson:text('state_json').notNull(),summaryJson:text('summary_json').notNull(),
 completedAt:integer('completed_at'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},table=>[index('idx_tournaments_owner_updated').on(table.ownerId,table.updatedAt)]);

export const champions=sqliteTable('current_champions',{
 ownerId:text('owner_id').notNull(),divisionKey:text('division_key').notNull(),label:text('label').notNull(),
 characterId:text('character_id').notNull(),characterName:text('character_name').notNull(),
 tournamentId:text('tournament_id').notNull(),tournamentName:text('tournament_name').notNull(),completedAt:integer('completed_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.divisionKey]}),index('idx_champions_owner_completed').on(table.ownerId,table.completedAt)]);

export const tournamentNames=sqliteTable('tournament_name_claims',{
 ownerId:text('owner_id').notNull(),name:text('name').notNull(),tournamentId:text('tournament_id'),displayName:text('display_name')
},table=>[primaryKey({columns:[table.ownerId,table.name]}),uniqueIndex('idx_name_claim_owner_tournament').on(table.ownerId,table.tournamentId)]);

export const championHistory=sqliteTable('champion_history',{
 ownerId:text('owner_id').notNull(),tournamentId:text('tournament_id').notNull(),
 tournamentName:text('tournament_name').notNull(),divisionKey:text('division_key').notNull(),label:text('label').notNull(),
 characterId:text('character_id').notNull(),characterName:text('character_name').notNull(),completedAt:integer('completed_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.tournamentId]}),index('idx_history_owner_completed').on(table.ownerId,table.completedAt)]);

// The previous roster is retained when the requested one-time refresh is performed.
export const rosterArchives=sqliteTable('roster_archives',{
 ownerId:text('owner_id').notNull(),batchKey:text('batch_key').notNull(),characterId:text('character_id').notNull(),
 name:text('name').notNull(),stateJson:text('state_json').notNull(),summaryJson:text('summary_json').notNull(),
 createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),archivedAt:integer('archived_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.batchKey,table.characterId]})]);
export const rosterRefreshes=sqliteTable('roster_refreshes',{
 ownerId:text('owner_id').notNull(),batchKey:text('batch_key').notNull(),nonce:text('nonce').notNull(),
 templateJson:text('template_json').notNull(),resultJson:text('result_json').notNull(),createdAt:integer('created_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.batchKey]})]);

export const matchRecords=sqliteTable('match_records',{
 ownerId:text('owner_id').notNull(),eventId:text('event_id').notNull(),tournamentId:text('tournament_id'),
 characterA:text('character_a').notNull(),characterB:text('character_b').notNull(),winner:text('winner'),
 scoreJson:text('score_json').notNull(),recordedAt:integer('recorded_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.eventId]}),index('idx_match_records_owner_tournament').on(table.ownerId,table.tournamentId)]);
export const matchRecordSync=sqliteTable('match_record_sync',{
 ownerId:text('owner_id').notNull(),tournamentId:text('tournament_id').notNull(),matches:integer('matches').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.tournamentId]})]);

export const fighterGrowth=sqliteTable('fighter_growth',{
 ownerId:text('owner_id').notNull(),eventId:text('event_id').notNull(),characterId:text('character_id').notNull(),
 opponentId:text('opponent_id').notNull(),axis:text('axis').notNull(),amount:integer('amount').notNull(),earnedAt:integer('earned_at').notNull()
},table=>[primaryKey({columns:[table.ownerId,table.eventId]}),index('idx_growth_owner_character').on(table.ownerId,table.characterId)]);

export const fighterGrowthSync=sqliteTable('fighter_growth_sync',{ownerId:text('owner_id').notNull(),tournamentId:text('tournament_id').notNull(),matches:integer('matches').notNull()},table=>[primaryKey({columns:[table.ownerId,table.tournamentId]})]);

export const characterPools=sqliteTable('character_pools',{id:text('id').primaryKey(),poolsJson:text('pools_json').notNull()});
export const leagueWorlds=sqliteTable('league_worlds',{ownerId:text('owner_id').primaryKey(),id:text('id').notNull().unique(),revision:integer('revision').notNull(),lastOperation:text('last_operation').notNull(),stateJson:text('state_json').notNull(),updatedAt:integer('updated_at').notNull()});
export const leagueMembers=sqliteTable('league_members',{ownerId:text('owner_id').notNull(),characterId:text('character_id').notNull(),division:integer('division').notNull()},t=>[primaryKey({columns:[t.ownerId,t.characterId]})]);
export const leagueSeasons=sqliteTable('league_seasons',{ownerId:text('owner_id').notNull(),worldId:text('world_id').notNull(),season:integer('season').notNull(),stateJson:text('state_json').notNull(),completedAt:integer('completed_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.worldId,t.season]})]);
export const leagueOperations=sqliteTable('league_operations',{ownerId:text('owner_id').notNull(),operationId:text('operation_id').notNull(),requestJson:text('request_json').notNull()},t=>[primaryKey({columns:[t.ownerId,t.operationId]})]);
export const teamWorlds=sqliteTable('team_worlds',{ownerId:text('owner_id').notNull(),format:integer('format').notNull(),revision:integer('revision').notNull(),lastOperation:text('last_operation').notNull(),stateJson:text('state_json').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.ownerId,t.format]})]);
export const teamOperations=sqliteTable('team_operations',{ownerId:text('owner_id').notNull(),operationId:text('operation_id').notNull(),requestJson:text('request_json').notNull()},t=>[primaryKey({columns:[t.ownerId,t.operationId]})]);
