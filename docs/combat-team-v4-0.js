// Core siege, team-4.0: team-3.9's rules with fighters that fight back (siege-ai-combat.js) and portable sin/cos, so a
// game plays out the same everywhere (browsers, the app, node and the Rust core). See portable-combat.js.
import {TeamBattle as Previous} from './combat-team-v3-9.js';
import {withPortableMath} from './portable-combat.js';
import {withSiegeAi} from './siege-ai-combat.js';
export * from './combat-team-v3-9.js';
export const TEAM_ENGINE_VERSION='team-4.0';
export const TeamBattle=withPortableMath(withSiegeAi(Previous),TEAM_ENGINE_VERSION);
