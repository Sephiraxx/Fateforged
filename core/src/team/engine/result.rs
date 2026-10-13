//! `result()`: the summary a finished team-4.0 game reports (d22 → d21 → d20 → d19 → d18 → d17 → d16 → d14 → d13
//! → d12 → d11 → d10), as the JSON `JSON.stringify(battle.result())` gives: NaN and ±Infinity become `null`, and
//! `undefined` fields are left out.
use super::Engine;
use crate::jsmath::{max, round};
use serde_json::{json, Map, Value};

/// A number as `JSON.stringify` writes it (−0 is written as 0).
fn n(v: f64) -> Value {
    if v == 0.0 {
        json!(0.0)
    } else if v.is_finite() {
        json!(v)
    } else {
        Value::Null
    }
}
/// `Math.round(v * 10) / 10`
fn tenth(v: f64) -> Value {
    n(round(v * 10.0) / 10.0)
}

impl Engine {
    /// d10 `teamHealth(team)`: the team's share of its total health.
    pub fn team_health(&self, team: f64) -> f64 {
        let mine = self.b.combatants.iter().filter(|&&f| self.f(f).team == team);
        let hp = mine.clone().fold(0.0, |n, &f| n + max(0.0, self.f(f).hp));
        hp / mine.fold(0.0, |n, &f| n + self.f(f).max_hp)
    }

    /// `result()` of a finished game.
    pub fn result(&self) -> Value {
        assert!(self.b.done, "Battle is still running.");
        let b = &self.b;
        let teams: Vec<Value> = (0..2).map(|team| Value::Array(b.combatants.iter().filter(|&&f| self.f(f).team == team as f64).map(|&f| json!(self.f(f).id)).collect())).collect();
        let mut objective = Map::new();
        objective.insert("coreHp".into(), Value::Array(b.cores.iter().map(|&c| {
            let ce = self.f(c);
            if ce.hp <= 0.0 { n(0.0) } else { n(max(0.1, round(ce.hp / ce.max_hp * 1000.0) / 10.0)) }
        }).collect()));
        objective.insert("monsterKills".into(), Value::Array(b.monster_kills.iter().map(|&v| n(v)).collect()));
        objective.insert("steals".into(), Value::Array(b.steals.iter().map(|&v| n(v)).collect()));
        objective.insert("forgefireSeconds".into(), Value::Array(b.forgefire_seconds.iter().map(|&v| tenth(v)).collect()));
        objective.insert("suddenDeath".into(), json!(b.sudden_death));
        // d11
        objective.insert("titanIgnored".into(), json!(!b.titan_ever_damaged));
        objective.insert("titanResets".into(), n(b.titan_resets));
        objective.insert(
            "titanDeaths".into(),
            Value::Array(b.titan_deaths.iter().map(|d| json!({"time": n(d.time), "team": n(d.team), "stolen": d.stolen, "damage": d.damage.iter().map(|&v| n(v)).collect::<Vec<_>>()})).collect()),
        );
        objective.insert("coreAt180".into(), b.core_at180.as_ref().map_or(Value::Null, |v| Value::Array(v.iter().map(|&x| n(x)).collect())));
        // d19
        objective.insert("hurls".into(), n(b.hurls));
        objective.insert("fissures".into(), n(b.fissures));
        objective.insert("fissureStuns".into(), n(b.fissure_stuns));
        objective.insert("dutySeconds".into(), Value::Array(b.duty_seconds.iter().map(|&v| tenth(v)).collect()));
        // d21
        objective.insert("unsticks".into(), n(b.unsticks));
        let fighters: Vec<Value> = b
            .combatants
            .iter()
            .map(|&f| {
                let e = self.f(f);
                let mut m = Map::new();
                m.insert("id".into(), json!(e.id));
                m.insert("team".into(), n(e.team));
                m.insert("role".into(), json!(e.role));
                m.insert("hp".into(), n(round(max(0.0, e.hp) / e.max_hp * 100.0)));
                m.insert("damage".into(), n(round(e.damage_done)));
                m.insert("healing".into(), n(round(e.healing_done)));
                m.insert("kills".into(), n(e.kills));
                m.insert("deaths".into(), n(e.deaths));
                m.insert("ccSeconds".into(), tenth(e.cc_seconds));
                m.insert("objectiveDamage".into(), n(round(e.objective_damage.unwrap_or(f64::NAN))));
                m.insert("downSeconds".into(), tenth(e.down_seconds.unwrap_or(f64::NAN)));
                if let Some(v) = e.monster_last_hits {
                    m.insert("monsterLastHits".into(), n(v));
                }
                Value::Object(m)
            })
            .collect();
        let env = &b.environment;
        let mut out = Map::new();
        out.insert("mode".into(), json!("team"));
        out.insert("size".into(), n(b.size));
        out.insert("seed".into(), n(b.seed));
        out.insert("teams".into(), Value::Array(teams));
        out.insert("winnerTeam".into(), b.winner_team.map_or(Value::Null, n));
        out.insert("seconds".into(), tenth(b.time));
        out.insert("reason".into(), b.reason.as_ref().map_or(Value::Null, |r| json!(r)));
        out.insert("hp".into(), Value::Array((0..2).map(|team| n(round(self.team_health(team as f64) * 100.0))).collect()));
        out.insert("combatVersion".into(), json!("team-4.0"));
        out.insert("balanceId".into(), json!(b.balance.id));
        out.insert("tactics".into(), json!(b.tactics));
        out.insert("environment".into(), json!({"time": env.time, "weather": env.weather, "ground": env.ground, "map": env.map}));
        out.insert("objective".into(), Value::Object(objective));
        out.insert("fighters".into(), Value::Array(fighters));
        // d18
        out.insert("gamePlans".into(), Value::Array(b.game_plans.iter().map(|p| json!({"titan": p.titan, "style": p.style, "siege": p.siege})).collect()));
        Value::Object(out)
    }
}
