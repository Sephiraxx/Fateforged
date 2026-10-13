//! Replays method calls recorded by `scripts/rust-calls.mjs`: for each case, load the battle state from before the
//! call, make the same call in Rust, and compare the return value and the state digest afterwards.
//! Usage: `team-calls <method>.jsonl`. Prints a JSON summary; exits with status 1 on any mismatch.
use fateforge_core::team::engine::combat::{HitContext, Tags};
use fateforge_core::team::engine::movement::Kind;
use fateforge_core::team::engine::queries::Pt;
use fateforge_core::team::engine::{Engine, Tgt};
use fateforge_core::team::jsnum::{value_f64, Ent, JsDe};
use fateforge_core::team::state::EntityPowers;
use fateforge_core::team::Snapshot;
use serde_json::{json, Map, Value};
use std::io::{BufRead, BufReader};

fn num(v: f64) -> Value {
    if v.is_finite() && !(v == 0.0 && v.is_sign_negative()) {
        json!(v)
    } else {
        json!({"$f": format!("{:016x}", v.to_bits())})
    }
}
fn ent(e: Ent) -> Value {
    json!({"$e": e.0})
}
fn opt_ent(e: Option<Ent>) -> Value {
    e.map(ent).unwrap_or(Value::Null)
}
fn pt(p: Pt) -> Value {
    json!({"$pt": [num(p.x), num(p.y)]})
}
fn ents(list: Vec<Ent>) -> Value {
    Value::Array(list.into_iter().map(ent).collect())
}
fn obj(fields: Vec<(&str, Value)>) -> Value {
    let mut m: Vec<(&str, Value)> = fields;
    m.sort_by(|a, b| a.0.cmp(b.0));
    let mut out = Map::new();
    for (k, v) in m {
        out.insert(k.to_string(), v);
    }
    json!({ "$obj": Value::Object(out) })
}
const UNDEFINED: fn() -> Value = || json!({"$u": 1});

/// Equality with numbers compared as f64 bits (JSON may write 3 as an integer on one side and 3.0 on the other).
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => x.as_f64().map(f64::to_bits) == y.as_f64().map(f64::to_bits),
        (Value::Array(x), Value::Array(y)) => x.len() == y.len() && x.iter().zip(y).all(|(p, q)| same(p, q)),
        // A returned power is compared by id.
        (Value::Object(x), Value::Object(y)) if x.contains_key("$power") && y.contains_key("$power") => x["$power"]["id"] == y["$power"]["id"],
        (Value::Object(x), Value::Object(y)) => x.len() == y.len() && x.iter().all(|(k, v)| y.get(k).is_some_and(|w| same(v, w))),
        _ => a == b,
    }
}

struct Call<'a> {
    eng: &'a mut Engine,
    args: &'a [Value],
}

impl<'a> Call<'a> {
    fn arg(&self, i: usize) -> Option<&Value> {
        self.args.get(i).filter(|v| v.get("$u").is_none())
    }
    fn f64(&self, i: usize) -> f64 {
        value_f64(self.arg(i).expect("a number argument")).expect("a number")
    }
    fn bool(&self, i: usize) -> bool {
        self.arg(i).and_then(Value::as_bool).unwrap_or(false)
    }
    fn str(&self, i: usize) -> Option<&str> {
        self.arg(i).and_then(Value::as_str)
    }
    fn string(&self, i: usize) -> String {
        self.str(i).expect("a string argument").to_string()
    }
    fn ent(&self, i: usize) -> Ent {
        self.opt_ent(i).expect("an entity argument")
    }
    fn opt_ent(&self, i: usize) -> Option<Ent> {
        let v = self.arg(i)?;
        v.get("$e").and_then(Value::as_u64).map(|n| Ent(n as u32))
    }
    /// An entity or a stand-in for one.
    fn tgt(&self, i: usize) -> Tgt {
        let v = self.arg(i).expect("a target argument");
        if let Some(e) = v.get("$e") {
            return Tgt::of(Ent(e.as_u64().unwrap() as u32));
        }
        let base = Ent(v["$view"].as_u64().expect("an entity or a stand-in") as u32);
        let e = self.eng.f(base);
        let n = |k: &str| value_f64(&v[k]).unwrap();
        let (x, y, vx, vy, hp, illusion) = (n("x"), n("y"), n("vx"), n("vy"), n("hp"), n("illusion"));
        let decoy = v["decoy"].as_bool().unwrap();
        let objective = v["objective"].as_bool().unwrap();
        let has_action = v["action"].as_bool().unwrap();
        let melee = v["melee"].as_bool().unwrap();
        let (base_objective, base_action, base_melee, base_illusion) = (e.is_objective == Some(true), e.action.is_some(), e.weapon.type_ == "melee", e.illusion_time);
        Tgt::of(base).with(|o| {
            o.x = Some(x);
            o.y = Some(y);
            o.vx = Some(vx);
            o.vy = Some(vy);
            o.hp = Some(hp);
            o.decoy = decoy;
            if objective != base_objective {
                o.is_objective = Some(objective);
            }
            o.no_action = base_action && !has_action;
            o.melee = melee && !base_melee;
            o.no_illusion = illusion == 0.0 && base_illusion != 0.0;
        })
    }
    /// The (x, y) of an entity, stand-in, point or record argument.
    fn xy(&self, i: usize) -> (f64, f64) {
        let v = self.arg(i).expect("a positioned argument");
        if v.get("$e").is_some() || v.get("$view").is_some() {
            let t = self.tgt(i);
            return (self.eng.tx(&t), self.eng.ty(&t));
        }
        if let Some(p) = v.get("$pt") {
            return (value_f64(&p[0]).unwrap(), value_f64(&p[1]).unwrap());
        }
        let o = &v["$obj"];
        (value_f64(&o["x"]).unwrap(), value_f64(&o["y"]).unwrap())
    }
    /// An entity, a stand-in, or nothing (undefined or null).
    fn opt_tgt(&self, i: usize) -> Option<Tgt> {
        self.arg(i).filter(|v| !v.is_null()).map(|_| self.tgt(i))
    }
    fn power(&self, i: usize) -> EntityPowers {
        EntityPowers::from_value(self.arg(i).expect("a power argument")["$power"].clone()).expect("a power")
    }
    fn ent_list(&self, i: usize) -> Vec<Ent> {
        self.arg(i).and_then(Value::as_array).expect("a list").iter().map(|v| Ent(v["$e"].as_u64().unwrap() as u32)).collect()
    }
    /// An obstacle argument, found by its position.
    fn obstacle(&self, i: usize) -> usize {
        let (x, y) = self.xy(i);
        self.eng.b.obstacles.iter().position(|o| o.x.to_bits() == x.to_bits() && o.y.to_bits() == y.to_bits()).expect("a known obstacle")
    }
}

/// Encodes a target the way scripts/rust-calls.mjs encodes a returned entity or stand-in.
fn tgt_value(eng: &Engine, t: &Tgt) -> Value {
    if t.is_plain() {
        return ent(t.ent);
    }
    let o = t.over.as_ref().unwrap();
    json!({"$view": t.ent.0, "x": num(eng.tx(t)), "y": num(eng.ty(t)), "vx": num(eng.tvx(t)), "vy": num(eng.tvy(t)), "hp": num(eng.thp(t)),
        "decoy": o.decoy, "objective": eng.t_is_objective(t), "action": eng.t_has_action(t), "melee": eng.t_weapon_type(t) == "melee", "illusion": num(eng.t_illusion(t))})
}

fn tags(v: &Value) -> Tags {
    let b = |k: &str| v.get(k).and_then(Value::as_bool).unwrap_or(false);
    Tags { metal: b("metal"), silver: b("silver"), cold_iron: b("coldIron"), poison: b("poison"), holy: b("holy"), loud: b("loud"), blunt: b("blunt"), heavy: b("heavy"), sunlight: b("sunlight") }
}

/// The recorded `this.hitContext` (scripts/rust-calls.mjs `hitContext()`).
fn hit_context(v: &Value) -> Option<HitContext> {
    if v.is_null() {
        return None;
    }
    let s = |k: &str| v[k].as_str().map(str::to_string);
    let b = |k: &str| v[k].as_bool().unwrap_or(false);
    Some(HitContext {
        payload: s("payload"),
        tags: v.get("tags").filter(|t| !t.is_null()).map(tags),
        duration: value_f64(&v["duration"]),
        periodic: b("periodic"),
        technique: b("technique"),
        weapon_hit: b("weaponHit"),
        sprite: value_f64(&v["sprite"]),
        ordinary_arcane: b("ordinaryArcane"),
        balance_ability: s("balanceAbility"),
    })
}

/// `hurt`'s result: `true`, `false` or `undefined`.
fn hit_result(r: Option<bool>) -> Value {
    r.map(Value::Bool).unwrap_or_else(UNDEFINED)
}

fn dispatch(method: &str, c: &mut Call) -> Value {
    match method {
        // actorFor(index): undefined when nothing has that index (including a null index).
        "actorFor" => match c.arg(0).filter(|v| !v.is_null()) {
            None => UNDEFINED(),
            Some(_) => c.eng.actor_for(c.f64(0)).map(ent).unwrap_or_else(UNDEFINED),
        },
        "alliesOf" => ents(c.eng.allies_of(c.ent(0), c.bool(1))),
        "enemiesOf" => ents(c.eng.enemies_of(c.ent(0))),
        "ownerTeam" => {
            let owner = value_f64(&c.arg(0).unwrap()["$obj"]["owner"]).unwrap();
            c.eng.owner_team(owner).map(num).unwrap_or_else(UNDEFINED)
        }
        "centroid" => pt(c.eng.centroid(&c.ent_list(0))),
        "empowered" => json!(c.eng.empowered(c.ent(0))),
        "hasForgefire" => json!(c.eng.has_forgefire(c.f64(0))),
        "clampX" => num(c.eng.clamp_x(c.f64(0))),
        "clampY" => num(c.eng.clamp_y(c.f64(0))),
        "clearShot" => {
            let ((ax, ay), (bx, by)) = (c.xy(0), c.xy(1));
            json!(c.eng.clear_shot(ax, ay, bx, by))
        }
        "isSkirmisher" => json!(c.eng.is_skirmisher(&c.tgt(0))),
        "guardCount" => num(c.eng.guard_count(c.ent(0))),
        "intruders" => ents(c.eng.intruders(c.f64(0))),
        "touching" => match c.eng.touching(c.ent(0)) {
            None => Value::Null,
            Some(k) => {
                let o = &c.eng.b.obstacles[k];
                pt(Pt { x: o.x, y: o.y })
            }
        },
        "respawnDelay" => num(c.eng.respawn_delay()),
        "preferredRange" => num(c.eng.preferred_range(c.ent(0))),
        "posture" => {
            let p = c.eng.posture(c.f64(0));
            let mut f = vec![("leash", num(p.leash)), ("pull", num(p.pull)), ("strafe", num(p.strafe)), ("dive", json!(p.dive)), ("peel", num(p.peel))];
            if let Some(call) = p.call {
                f.push(("call", json!(call)));
            }
            if let Some(h) = p.hold {
                f.push(("hold", num(h)));
            }
            obj(f)
        }
        "aim" => {
            let f = c.tgt(0);
            let (fx, fy) = (c.eng.tx(&f), c.eng.ty(&f));
            let t = c.tgt(1);
            let speed = c.f64(2);
            num(c.eng.aim(fx, fy, f.ent, &t, speed))
        }
        "powerCost" => {
            let p = &c.arg(0).unwrap()["$power"];
            num(c.eng.power_cost(p["id"].as_str().unwrap(), p.get("cost").and_then(value_f64), p["rarity"].as_str().unwrap_or("")))
        }
        "pushOutOfTerrain" => {
            let f = c.tgt(0);
            if f.is_plain() {
                c.eng.push_out_of_terrain(f.ent);
            }
            UNDEFINED()
        }
        "creditDown" => {
            c.eng.credit_down(c.ent(0), c.ent(1));
            UNDEFINED()
        }
        "dropFallen" => {
            c.eng.drop_fallen();
            UNDEFINED()
        }
        "onDuty" => json!(c.eng.on_duty(c.ent(0))),
        "nearestEnemy" => {
            let point = if c.arg(1).is_some() {
                let (x, y) = c.xy(1);
                Some(Pt { x, y })
            } else {
                None
            };
            opt_ent(c.eng.nearest_enemy(c.ent(0), point))
        }
        "threatened" => json!(c.eng.threatened(c.ent(0))),
        "placeAtBase" => {
            c.eng.place_at_base(c.ent(0));
            UNDEFINED()
        }
        "detour" => {
            let (x, y) = c.xy(1);
            c.eng.detour(c.ent(0), x, y).map(pt).unwrap_or(Value::Null)
        }
        "warn" => {
            let key = c.str(1).unwrap().to_string();
            c.eng.warn(c.ent(0), &key);
            UNDEFINED()
        }
        "incomingThreat" => {
            let kind = Kind::parse(c.str(2).unwrap_or("any"));
            let at = if c.arg(3).is_some() { Some(Pt { x: c.f64(3), y: c.f64(4) }) } else { None };
            json!(c.eng.incoming_threat(c.ent(0), kind, at))
        }
        "underFire" => {
            let kind = Kind::parse(c.str(1).unwrap_or("any"));
            json!(c.eng.under_fire(c.ent(0), kind))
        }
        "dodgeThreat" => {
            c.eng.dodge_threat(c.ent(0));
            UNDEFINED()
        }
        "steer" => {
            let t = c.tgt(1);
            let dt = c.f64(2);
            c.eng.steer(c.ent(0), &t, dt);
            UNDEFINED()
        }
        "targetFor" => {
            let t = c.tgt(1);
            let r = c.eng.target_for(c.ent(0), &t);
            tgt_value(c.eng, &r)
        }
        "moveFighter" => {
            let t = c.tgt(1);
            let dt = c.f64(2);
            c.eng.move_fighter(c.ent(0), &t, dt);
            UNDEFINED()
        }
        "moveTeamFighter" => {
            let t = c.tgt(1);
            let dt = c.f64(2);
            c.eng.move_team_fighter(c.ent(0), &t, dt);
            UNDEFINED()
        }
        "healerAnchor" => {
            let t = c.tgt(1);
            pt(c.eng.healer_anchor(c.ent(0), &t))
        }
        "escapeFrom" => {
            let t = if c.arg(1).is_some_and(|v| !v.is_null()) { Some(c.tgt(1)) } else { None };
            let rock = c.obstacle(2);
            pt(c.eng.escape_from(c.ent(0), t.as_ref(), rock))
        }
        "supportAllies" => ents(c.eng.support_allies(c.ent(0), c.bool(1))),
        "supportEnemies" => ents(c.eng.support_enemies(c.ent(0))),
        "planLeash" => match c.eng.plan_leash(c.ent(0)) {
            None => Value::Null,
            Some(l) => obj(vec![
                ("max", num(l.max)),
                (
                    "ref",
                    match l.r {
                        fateforge_core::team::engine::movement::LeashRef::Ent(e) => ent(e),
                        fateforge_core::team::engine::movement::LeashRef::Pt(p) => pt(p),
                    },
                ),
            ]),
        },
        "holdPoint" => pt(c.eng.hold_point(c.f64(0))),
        "titanStun" => {
            let t = c.opt_ent(0);
            json!(c.eng.titan_stun(t, c.f64(1)))
        }
        "titanAttackers" => ents(c.eng.titan_attackers()),
        "openFissure" => json!(c.eng.open_fissure()),
        "moltenHurl" => json!(c.eng.molten_hurl()),
        "defendTarget" => opt_ent(c.eng.defend_target(c.ent(0))),
        "updateDuty" => {
            c.eng.update_duty();
            UNDEFINED()
        }
        "situation" => {
            let s = c.eng.situation(c.f64(0));
            obj(vec![
                ("alive", num(s.alive)),
                ("foesAlive", num(s.foes_alive)),
                ("hp", num(s.hp)),
                ("foeHp", num(s.foe_hp)),
                ("titanUp", json!(s.titan_up)),
                ("titanPct", num(s.titan_pct)),
                ("titanSoon", json!(s.titan_soon)),
                ("ownCore", num(s.own_core)),
                ("foeCore", num(s.foe_core)),
                ("forgefire", json!(s.forgefire)),
                ("foeForgefire", json!(s.foe_forgefire)),
                ("nearOurCore", num(s.near_our_core)),
                ("coreHit", json!(s.core_hit)),
                ("foesInPit", num(s.foes_in_pit)),
                ("foesOnTitan", json!(s.foes_on_titan)),
                ("stealer", json!(s.stealer)),
            ])
        }
        "planScores" => {
            let s = c.eng.plan_scores(c.f64(0));
            let names = fateforge_core::team::engine::consts::TEAM_PLANS;
            obj(names.iter().zip(s.iter()).filter_map(|(n, v)| v.map(|v| (*n, num(v)))).collect())
        }
        "updateBrain" => {
            c.eng.update_brain();
            UNDEFINED()
        }
        "teleportDestination" => {
            let t = c.tgt(1);
            c.eng.teleport_destination(c.ent(0), &t).map(pt).unwrap_or(Value::Null)
        }
        "respawn" => {
            c.eng.respawn(c.ent(0));
            UNDEFINED()
        }
        "settleShield" => {
            let (t, f, before, dealt) = (c.ent(0), c.opt_ent(1), c.f64(2), c.f64(3));
            c.eng.settle_shield(t, f, before, dealt);
            UNDEFINED()
        }
        "updatePlans" => {
            c.eng.update_plans();
            UNDEFINED()
        }
        "usefulPortal" => {
            let t = c.tgt(1);
            json!(c.eng.useful_portal(c.ent(0), &t))
        }
        "abilityFactor" => num(c.eng.ability_factor(c.ent(0), c.str(1).unwrap(), c.str(2).unwrap())),
        "duration" => {
            let t = c.opt_tgt(1);
            num(c.eng.duration(c.ent(0), t.as_ref(), c.f64(2)))
        }
        "heal" => num(c.eng.heal(c.ent(0), c.f64(1))),
        "kitControl" => json!(c.eng.kit_control(c.ent(0), c.opt_ent(1), &c.string(2), c.f64(3))),
        "fortified" => num(c.eng.fortified(c.ent(0))),
        "rebirth" => json!(c.eng.rebirth(c.ent(0))),
        "zone" => {
            let damage = if c.arg(6).is_some() { c.f64(6) } else { 0.0 };
            c.eng.zone(c.ent(0), &c.string(1), c.f64(2), c.f64(3), c.f64(4), c.f64(5), damage);
            UNDEFINED()
        }
        "emitSound" => {
            c.eng.emit_sound(c.opt_ent(0), c.f64(1), c.f64(2), c.f64(3));
            UNDEFINED()
        }
        "push" => {
            let (fx, fy) = c.xy(1);
            c.eng.push(c.ent(0), fx, fy, c.f64(2));
            UNDEFINED()
        }
        "wideKnockback" => {
            c.eng.wide_knockback(c.ent(0), c.opt_ent(1), &c.arg(2).and_then(Value::as_str).unwrap_or("").to_string(), c.f64(3), c.f64(4));
            UNDEFINED()
        }
        "pathClear" => {
            let v = c.arg(0).unwrap();
            let tactics = if let Some(b) = v.get("$e").or_else(|| v.get("$view")) {
                Some(c.eng.f(Ent(b.as_u64().unwrap() as u32)).tactics)
            } else {
                v.get("$obj").and_then(|o| o.get("tactics")).and_then(value_f64)
            };
            let (fx, fy) = c.xy(0);
            let t = c.tgt(1);
            let radius = if c.arg(3).is_some() { c.f64(3) } else { 3.0 };
            let speed = if c.arg(4).is_some() { c.f64(4) } else { 290.0 };
            json!(c.eng.path_clear(fx, fy, tactics, &t, c.f64(2), radius, speed))
        }
        "shotClear" => {
            let t = c.tgt(1);
            json!(c.eng.shot_clear(c.ent(0), &t, c.f64(2)))
        }
        "projectileClear" => {
            let t = c.tgt(1);
            json!(c.eng.projectile_clear(c.ent(0), &t, &c.power(2).id))
        }
        "launch" => {
            let t = c.tgt(1);
            let p = c.power(2);
            let spread = if c.arg(3).is_some() { c.f64(3) } else { 0.0 };
            c.eng.launch(c.ent(0), &t, &p, spread);
            UNDEFINED()
        }
        "supportLine" => json!(c.eng.support_line(c.ent(0), c.ent(1))),
        "supportControl" => json!(c.eng.support_control(c.ent(0), c.opt_ent(1), &c.string(2), c.f64(3))),
        "supportChoice" => {
            let p = c.power(1);
            match c.eng.support_choice(c.ent(0), &p) {
                None => Value::Null,
                Some((ally, value)) => obj(vec![("ally", ent(ally)), ("value", num(value))]),
            }
        }
        "supportTargets" => {
            let p = c.power(1);
            let t = c.opt_tgt(2);
            ents(c.eng.support_targets(c.ent(0), &p, t.as_ref(), c.bool(3)))
        }
        "lifeSpot" => match c.eng.life_spot(c.ent(0)) {
            None => Value::Null,
            Some((p, _count)) => pt(p),
        },
        "hit" => {
            let t = c.tgt(1);
            let payload = c.arg(4).and_then(Value::as_str).map(str::to_string);
            let tg = c.arg(5).map(|v| tags(v.get("$obj").unwrap_or(v))).unwrap_or_default();
            let kind = c.string(3);
            c.eng.hit(c.ent(0), &t, c.f64(2), &kind, payload, tg);
            UNDEFINED()
        }
        "periodicHit" => {
            let t = c.tgt(1);
            let kind = c.string(3);
            hit_result(c.eng.periodic_hit(c.ent(0), &t, c.f64(2), &kind))
        }
        "connectControl" => json!(c.eng.connect_control(c.ent(0), c.ent(1))),
        "applyImpact" => {
            let id = c.arg(0).and_then(Value::as_str).map(str::to_string);
            hit_result(c.eng.apply_impact(id.as_deref(), c.ent(1), c.ent(2), c.f64(3), c.f64(4)))
        }
        "hurt" | "fighterHit" => {
            let t = c.tgt(0);
            let f = c.opt_ent(1);
            let kind = c.arg(3).and_then(Value::as_str).unwrap_or("physical").to_string();
            let can_dodge = c.arg(4).and_then(Value::as_bool).unwrap_or(true);
            let amount = c.f64(2);
            hit_result(if method == "hurt" { c.eng.hurt(&t, f, amount, &kind, can_dodge) } else { c.eng.fighter_hit(&t, f, amount, &kind, can_dodge) })
        }
        "updateAttack" => {
            let t = c.tgt(1);
            c.eng.update_attack(c.ent(0), &t, c.f64(2));
            UNDEFINED()
        }
        "applySupportAbility" => {
            let p = c.power(1);
            let targets = c.ent_list(2);
            c.eng.apply_support_ability(c.ent(0), &p, &targets);
            UNDEFINED()
        }
        "powerUtility" => {
            let t = c.tgt(1);
            let p = c.power(2);
            let copied = c.bool(3);
            num(c.eng.power_utility(c.ent(0), &t, &p, copied))
        }
        "powerPriority" => {
            let t = c.tgt(1);
            let p = c.power(2);
            num(c.eng.power_priority(c.ent(0), &t, &p))
        }
        "copyChoice" => {
            let t = c.tgt(1);
            match c.eng.copy_choice(c.ent(0), &t) {
                None => Value::Null,
                Some(ch) => match ch.power {
                    Some(p) => obj(vec![("power", json!({"$power": {"id": p.id}})), ("priority", num(ch.priority))]),
                    None => obj(vec![("priority", num(ch.priority)), ("weapon", json!(true))]),
                },
            }
        }
        "castPower" => {
            let t = c.tgt(1);
            c.eng.cast_power(c.ent(0), &t);
            UNDEFINED()
        }
        "startAttack" => {
            let t = c.tgt(1);
            c.eng.start_attack(c.ent(0), &t);
            UNDEFINED()
        }
        "usePower" => {
            let t = c.tgt(1);
            let p = c.power(2);
            let copied = c.bool(3);
            hit_result(c.eng.use_power(c.ent(0), &t, &p, copied))
        }
        "chooseTarget" => opt_ent(c.eng.choose_target(c.ent(0))),
        // fight(f) without a filter (calls with one pass a function and are not recorded).
        "fight" => opt_ent(c.eng.fight(c.ent(0), None)),
        "step" => {
            let dt = if c.arg(0).is_some() { c.f64(0) } else { 1.0 / 60.0 };
            c.eng.step(dt);
            UNDEFINED()
        }
        "upkeep" => {
            c.eng.upkeep(c.ent(0), c.f64(1));
            UNDEFINED()
        }
        "objectiveStep" => {
            c.eng.objective_step(c.f64(0));
            UNDEFINED()
        }
        "releaseFissure" => {
            c.eng.release_fissure();
            UNDEFINED()
        }
        "finishAtLimit" => {
            c.eng.finish_at_limit();
            UNDEFINED()
        }
        other => panic!("method {other} is not ported"),
    }
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: team-calls <method>.jsonl");
    let file = std::fs::File::open(&path).expect("readable cases");
    let (mut cases, mut ok) = (0usize, 0usize);
    let mut failures: Vec<Value> = Vec::new();
    for line in BufReader::new(file).lines() {
        let line = line.expect("a line");
        if line.trim().is_empty() {
            continue;
        }
        let case: Value = serde_json::from_str(&line).expect("a JSON case");
        cases += 1;
        let snapshot: Snapshot = match serde_json::from_value(case["state"].clone()) {
            Ok(s) => s,
            Err(e) => {
                failures.push(json!({"call": case["call"], "game": case["game"], "error": format!("state: {e}")}));
                continue;
            }
        };
        let mut eng = Engine::from_snapshot(snapshot);
        let tr = &case["tr"];
        eng.tr.heal_source = tr["healSource"].as_u64().map(|i| Ent(i as u32));
        eng.tr.balance_cast = tr["balanceCast"].as_object().map(|o| (Ent(o["fighter"].as_u64().unwrap() as u32), o["id"].as_str().unwrap().to_string()));
        eng.tr.balance_environment = tr["balanceEnvironment"].as_bool().unwrap_or(false);
        eng.tr.selecting_fight = tr["selectingFight"].as_bool().unwrap_or(false);
        eng.tr.hit_context = hit_context(&tr["hitContext"]);
        let method = case["method"].as_str().unwrap().to_string();
        let args = case["args"].as_array().cloned().unwrap_or_default();
        let ret = {
            let mut call = Call { eng: &mut eng, args: &args };
            dispatch(&method, &mut call)
        };
        let after = eng.digest();
        let ret_ok = same(&ret, &case["ret"]);
        if ret_ok && after == case["after"].as_str().unwrap_or("") {
            ok += 1;
        } else if failures.len() < 8 {
            failures.push(json!({"game": case["game"], "call": case["call"], "want": case["ret"], "got": ret, "digest": after == case["after"].as_str().unwrap_or("")}));
        }
    }
    println!("{}", json!({"cases": cases, "matching": ok, "failures": failures}));
    if ok != cases {
        std::process::exit(1);
    }
}
