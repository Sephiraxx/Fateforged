// Classic teamfight, team-2.9: team-2.8's rules with team abilities built from effect primitives
// (cast-ability-combat.js) and portable sin/cos, so a game plays out the same everywhere (browsers, the app, node and
// the Rust core). See portable-combat.js.
import {TeamBattle as Previous} from './combat-team-v2-8.js';
import {withPortableMath} from './portable-combat.js';
import {withCastAbilities} from './cast-ability-combat.js';
export * from './combat-team-v2-8.js';
export const TEAM_ENGINE_VERSION='team-2.9';
export const TeamBattle=withPortableMath(withCastAbilities(Previous),TEAM_ENGINE_VERSION);
