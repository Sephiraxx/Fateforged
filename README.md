# Fateforge Character Wheel

Fantasy character generator, saved roster, top-down combat arena and multi-stage tournaments.

**Team battles:** 3v3 and 5v5 battles put every fighter on the field, with tank, healer, controller and damage roles. Teams fight in formation on a wide 960×600 field (tanks in front, mostly ranged damage dealers behind them, healers at the back), and each coach's tactic sets how disciplined or risky they play. Some maps add mirrored terrain (pillars, ruined walls, rock clusters) that blocks movement, projectiles and line of sight. Fighters carry a class icon (plus for healers, hat for casters, bow for rangers, shield for melee).

**Next: objective mode.** Cores to destroy, respawns and a contested monster replace the current team mode. The design is in [OBJECTIVE-MODE.md](OBJECTIVE-MODE.md), and the sprite prompts for ChatGPT are in [ART-PROMPTS.md](ART-PROMPTS.md). They run on a team engine that reuses combat 12's rules, and combat 12 itself stays frozen. The rail's 3v3 and 5v5 screens run exhibition battles with saved or generated S/A fighters. See [TEAM-BATTLES.md](TEAM-BATTLES.md).

**Team leagues:** found an 8, 16 or 32-team 3v3 or 5v5 league from the League tab. The league scouts a fresh S/A pool (rare SS) and rates every fighter (OVR, calibrated on team-battle results) with a matching salary. AI head coaches with their own personalities then snake-draft under a shared salary cap. After the draft, teams play an NFL-style season: 10, 14 or 17 weeks with conference and division standings. Then come the playoffs (re-seeded Bo3 rounds and a Bo5 Forgefire Crown final), a champion and an MVP. Between seasons, ratings move with performance and contracts are repriced. Coaches keep or release fighters and make trades, then draft a new rookie class (worst record first). You can watch as a spectator or coach one team yourself: draft picks, lineups, tactics, releases and trade offers.

The interface uses one app shell across both pages: a navigation rail (a bottom tab bar on phones) for Forge, Roster, Fight, Cups, Leagues and Champions, with the Arena screens addressable as `arena.html#fight`, `#cups`, `#leagues` and `#champions`. Rules and reference text live in the **How it works** drawer (the `?` and ⓘ buttons). Styles are `style.css` (shared design system and shell) plus `forge.css`, `arena.css`, `leagues.css` and `roster.css`.

The class-identity release adds class/subclass-aware equipment, 54 spells and 10 stamina techniques. See [the release report](CLASS-ABILITIES.md) for rules, validation, compatibility and reproducible evaluations. New worlds use combat 12 and generation 3; existing competitions finish on their pinned engine before season rollover adopts the release.

The frozen [v11 balance report](BALANCE-V11.md) remains the comparison baseline. Saved careers, historical results and earned stat bonuses are preserved.

Crownfire Convergence and Emberveil Challenge use [double elimination](INTERLEAGUE-CUPS.md): Bo3 brackets, Bo5 grand finals, and a Bo5 reset when needed.

Fighter championship totals expand into counts for each league, division cup, interleague cup and custom tournament category in both collections, arena profiles and league tables. Each stat's details include its original roll and bonus; the five separate roll entries are removed from the detail picker and character reveal. Fixture lists omit entrant and first-round bye paragraphs.

At rollover, complete fighters saved from the wheel or bulk generator fill roster openings before automatic recruits. They enter Dawnrise oldest saved first, keeping their names, rolls, equipment and earned bonuses; excess fighters wait for later seasons. Older 140-fighter worlds also use waiting fighters for their expansion openings. Previously admitted fighters, incomplete builds and fighters retained from closed worlds are excluded. Automatic recruits still follow the seeded rarity recipe for any unfilled slots. No reset or new roster is required.
