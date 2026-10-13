//! Module-level constants of the team-4.0 JavaScript layers (values copied verbatim).

/// `TEAM_RULES` (combat-team-v2.js)
pub mod team_rules {
    pub const PROVOKE_RANGE: f64 = 110.0;
    pub const PROVOKE_SCORE: f64 = 3.5;
    pub const FORTIFIED: f64 = 0.35;
    pub const BULWARK_RANGE: f64 = 80.0;
    pub const BULWARK_SHARE: f64 = 0.25;
    pub const EXPOSED_TIME: f64 = 3.0;
    pub const EXPOSED_BONUS: f64 = 0.15;
    pub const OVERTIME: f64 = 75.0;
    pub const OVERTIME_HEALING: f64 = 0.5;
    pub const OVERTIME_DAMAGE: f64 = 1.2;
}
pub const CC_IMMUNITY: f64 = 2.5;
pub const SUPPORT_RANGE: f64 = 240.0;
pub const FORTIFIED_BONUS: f64 = 1.3;
/// `MOBILITY` (combat-team-v2.js)
pub const MOBILITY: [&str; 4] = ["charge", "teleport", "portal", "space"];

/// A formation posture (`TEAM_POSTURES` / `SIEGE_POSTURES`).
#[derive(Clone, Copy, Debug)]
pub struct Posture {
    pub leash: f64,
    pub pull: f64,
    pub strafe: f64,
    pub dive: &'static str,
    pub peel: f64,
    pub call: Option<&'static str>,
    pub hold: Option<f64>,
}

/// `TEAM_POSTURES[tactic]`
pub fn team_posture(tactic: &str) -> Option<Posture> {
    Some(match tactic {
        "balanced" => Posture { leash: 130.0, pull: 1.0, strafe: 0.2, dive: "exposed", peel: 1.0, call: None, hold: None },
        "protect-carry" => Posture { leash: 100.0, pull: 1.25, strafe: 0.16, dive: "none", peel: 1.6, call: None, hold: None },
        "focus-healer" => Posture { leash: 140.0, pull: 0.9, strafe: 0.2, dive: "flank", peel: 1.0, call: Some("healer"), hold: None },
        "aggressive" => Posture { leash: 210.0, pull: 0.6, strafe: 0.3, dive: "all", peel: 0.6, call: None, hold: None },
        "defensive" => Posture { leash: 90.0, pull: 1.5, strafe: 0.14, dive: "none", peel: 1.3, call: None, hold: Some(12.0) },
        _ => return None,
    })
}

/// `SIEGE_POSTURES[tactic]` (combat-team-v3-6.js): the team postures with the siege adjustments.
pub fn siege_posture(tactic: &str) -> Option<Posture> {
    let mut p = team_posture(tactic)?;
    match tactic {
        "defensive" => {
            p.leash = 120.0;
            p.pull = 1.2;
        }
        "protect-carry" => {
            p.leash = 120.0;
            p.dive = "exposed";
        }
        _ => {}
    }
    Some(p)
}

/// `BRAIN_RULES` (combat-team-v3-5.js)
pub mod brain_rules {
    pub const INTERVAL: f64 = 1.5;
    pub const COMMIT: f64 = 3.0;
    pub const SWITCH_MARGIN: f64 = 5.0;
    pub const DEFEND_RANGE: f64 = 380.0;
    pub const FIGHT_RANGE: f64 = 170.0;
    pub const STEAL_HP: f64 = 0.2;
    pub const STEAL_REACH: f64 = 300.0;
    pub const PIT_RADIUS: f64 = 200.0;
    pub const PRESSURE_START: f64 = 150.0;
    pub const PRESSURE_RATE: f64 = 4.0;
}
/// `TEAM_PLANS`, in order.
pub const TEAM_PLANS: [&str; 7] = ["contest", "hold", "flank", "steal", "siege", "defend", "regroup"];

/// `PLAN_STYLES[tactic][plan]` (combat-team-v3-5.js); `None` when the style has no entry.
pub fn plan_style(tactic: &str, plan: &str) -> Option<f64> {
    let style: &[(&str, f64)] = match tactic {
        "defensive" => &[("hold", 4.0), ("defend", 10.0), ("siege", -4.0)],
        "aggressive" => &[("contest", 6.0), ("siege", 8.0), ("hold", -10.0), ("regroup", -6.0)],
        "focus-healer" => &[("flank", 15.0), ("steal", 12.0)],
        "protect-carry" => &[("contest", 8.0), ("regroup", 4.0)],
        _ => &[],
    };
    style.iter().find(|(p, _)| *p == plan).map(|(_, v)| *v)
}

pub const SIEGE_FORGEFIRE_LATE: f64 = 210.0;
pub const SIEGE_LATE: f64 = 180.0;

/// `BACKDOOR_RULES` (combat-team-v3-7.js); the battle carries its own copy in `backdoorRules`.
pub const BACKDOOR_NO_BLINK: f64 = 420.0;

/// `UNSTICK_RULES` (combat-team-v3-9.js)
pub mod unstick {
    pub const STILL: f64 = 4.0;
    pub const AFTER: f64 = 1.0;
    pub const ESCAPE: f64 = 1.2;
    pub const TOUCH: f64 = 4.0;
    pub const STEP: f64 = 40.0;
}

/// `CONTROLLER_RULES.duration` (role-tuning.js), used when the battle has no `controllerRules`.
pub const CONTROLLER_DURATION: f64 = 1.25;
