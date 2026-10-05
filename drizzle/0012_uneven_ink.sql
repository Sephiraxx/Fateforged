CREATE TABLE character_pools (id TEXT PRIMARY KEY, pools_json TEXT NOT NULL);
ALTER TABLE saved_characters ADD COLUMN pool_id TEXT;
-- Deduplicate old catalogs verbatim, including player-edited pools. Traits,
-- scores, bonuses, timestamps and all historical tables remain unchanged.
INSERT INTO character_pools(id,pools_json)
SELECT 'legacy:' || MIN(id), json_extract(state_json,'$.pools')
FROM saved_characters WHERE json_type(state_json,'$.pools')='object'
GROUP BY json_extract(state_json,'$.pools');
UPDATE saved_characters SET
pool_id=(SELECT id FROM character_pools WHERE pools_json=json_extract(saved_characters.state_json,'$.pools')),
state_json=json_remove(state_json,'$.pools')
WHERE json_type(state_json,'$.pools')='object';
CREATE TABLE league_worlds (owner_id TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL, last_operation TEXT NOT NULL, state_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE league_members (owner_id TEXT NOT NULL, character_id TEXT NOT NULL, division INTEGER NOT NULL, PRIMARY KEY(owner_id, character_id));
CREATE TABLE league_seasons (owner_id TEXT NOT NULL, world_id TEXT NOT NULL, season INTEGER NOT NULL, state_json TEXT NOT NULL, completed_at INTEGER NOT NULL, PRIMARY KEY(owner_id,world_id,season));
CREATE TABLE league_operations (owner_id TEXT NOT NULL, operation_id TEXT NOT NULL, request_json TEXT NOT NULL, PRIMARY KEY(owner_id,operation_id));
