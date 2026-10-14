// Core siege, team-4.0: team-3.9's rules with team abilities built from effect primitives (cast-ability-combat.js),
// fighters that fight back (siege-ai-combat.js), levels and Ember Wisp camps (level-combat.js) and portable sin/cos, so a game plays out the same everywhere
// (browsers, the app, node and the Rust core). See portable-combat.js.
import {TeamBattle as Previous} from './combat-team-v3-9.js';
import {withPortableMath} from './portable-combat.js';
import {withSiegeAi} from './siege-ai-combat.js';
import {withCastAbilities} from './cast-ability-combat.js';
import {withLevels} from './level-combat.js';
export * from './combat-team-v3-9.js';
export const TEAM_ENGINE_VERSION='team-4.0';
export const TeamBattle=withPortableMath(withLevels(withSiegeAi(withCastAbilities(Previous))),TEAM_ENGINE_VERSION);
