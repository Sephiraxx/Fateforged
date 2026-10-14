//! Team abilities built from effect primitives (`public/cast-ability-combat.js`, the layer just under the siege AI in
//! team-4.0 and the top layer of team-2.9). The abilities are data on each power (`effects`, `target`, `range`, ...),
//! exported with the battle, so this file holds no ability table of its own.
use super::combat::Tags;
use super::movement::js_cmp;
use super::queries::{de, js_index};
use super::{Engine, Tgt};
use crate::jsmath::{self, max, min};
use crate::team::jsnum::Ent;
use crate::team::state::{Entity, EntityAction, EntityPowers, EntityPowersEffectsStatus, EntityStatuses, NumOrStr};

/// `mod(f, key)`: the product of 1 + every status's value for `key` (zero and NaN skipped).
fn status_mod(e: &Entity, key: fn(&EntityStatuses) -> f64) -> f64 {
    let mut n = 1.0;
    for s in e.statuses.iter().flatten() {
        let v = key(s);
        if v != 0.0 && !v.is_nan() {
            n *= 1.0 + v;
        }
    }
    n
}
fn is_buff(s: &EntityStatuses) -> bool {
    s.dmg_out > 0.0 || s.atk > 0.0 || s.move_ > 0.0 || s.acc > 0.0 || s.heal_in > 0.0 || s.dmg_in < 0.0
}
pub(super) fn is_cast(p: &EntityPowers) -> bool {
    p.group.as_deref() == Some("cast")
}
fn base(e: &Entity, base: &str) -> f64 {
    if base == "spell" {
        e.spell
    } else {
        e.damage
    }
}

impl Engine {
    pub(super) fn cast_mod(&self, f: Ent, key: fn(&EntityStatuses) -> f64) -> f64 {
        status_mod(self.f(f), key)
    }
    fn cast_allies(&self, f: Ent) -> Vec<Ent> {
        let team = self.f(f).team;
        self.combatants().iter().copied().filter(|&a| self.f(a).is_objective != Some(true) && self.f(a).team == team && self.f(a).hp > 0.0).collect()
    }
    fn cast_enemies(&self, f: Ent) -> Vec<Ent> {
        let team = self.f(f).team;
        self.combatants().iter().copied().filter(|&a| self.f(a).is_objective != Some(true) && self.f(a).team != team && self.f(a).hp > 0.0).collect()
    }
    fn in_fight(&self, f: Ent, reach: f64) -> bool {
        self.cast_enemies(f).into_iter().any(|e| de(self.f(e), self.f(f)) <= reach)
    }
    fn clear(&self, a: Ent, b: Ent) -> bool {
        let (ae, be) = (self.f(a), self.f(b));
        self.clear_shot(ae.x, ae.y, be.x, be.y)
    }

    /// `castTargets(f, p, t)`: who the ability would affect now (empty: it can't be used).
    fn cast_targets(&self, f: Ent, p: &EntityPowers, t: Option<Ent>) -> Vec<Ent> {
        let range = p.range.unwrap_or(f64::NAN);
        let fe = self.f(f);
        match p.target.as_deref().unwrap_or("enemy") {
            "self" => return if self.in_fight(f, range) { vec![f] } else { vec![] },
            "allies" => return if self.in_fight(f, 320.0) { self.cast_allies(f).into_iter().filter(|&a| de(self.f(a), fe) <= range).collect() } else { vec![] },
            "enemies" => return self.cast_enemies(f).into_iter().filter(|&e| de(self.f(e), fe) <= range).collect(),
            "ally" => {
                let allies: Vec<Ent> = self.cast_allies(f).into_iter().filter(|&a| de(self.f(a), fe) <= range && self.clear(f, a)).collect();
                let mut pick: Vec<Ent> = if p.pick.as_deref() == Some("damage") {
                    let mut l: Vec<Ent> = allies.into_iter().filter(|&a| a != f && self.in_fight(a, self.f(a).weapon.range + 60.0)).collect();
                    l.sort_by(|&a, &b| js_cmp(self.f(b).damage - self.f(a).damage).then(js_cmp(self.f(a).index - self.f(b).index)));
                    l
                } else {
                    let mut l: Vec<Ent> = allies.into_iter().filter(|&a| self.f(a).ward_time <= 0.5 && self.under_fire(a, super::movement::Kind::Any)).collect();
                    l.sort_by(|&a, &b| {
                        let (ae, be) = (self.f(a), self.f(b));
                        js_cmp(ae.hp / ae.max_hp - be.hp / be.max_hp).then(js_cmp(ae.index - be.index))
                    });
                    l
                };
                pick.truncate(1);
                return pick;
            }
            _ => {}
        }
        let Some(t) = t else { return vec![] };
        let te = self.f(t);
        if te.is_objective == Some(true) || te.hp <= 0.0 || te.team == fe.team || de(fe, te) > range || !self.clear(f, t) {
            return vec![];
        }
        let effects = p.effects.as_deref().unwrap_or(&[]);
        if effects.iter().any(|e| e.control.is_some()) && te.cc_immune > 0.0 {
            return vec![];
        }
        if p.id == "soulLink" && !self.combatants().iter().any(|&a| a != t && self.f(a).is_objective != Some(true) && self.f(a).team == te.team && self.f(a).hp > 0.0 && de(self.f(a), te) <= 200.0) {
            return vec![];
        }
        if p.id == "dispel" && !(te.statuses.iter().flatten().any(is_buff) || te.ward_time > 0.0) {
            return vec![];
        }
        vec![t]
    }

    fn cast_utility(&self, f: Ent, t: Option<Ent>, p: &EntityPowers) -> f64 {
        let effects = p.effects.as_deref().unwrap_or(&[]);
        if p.id == "execute" {
            let te = self.f(t.expect("Execute has a target"));
            return if te.hp < te.max_hp * 0.35 { 85.0 } else { 40.0 };
        }
        if p.id == "backstab" {
            let te = self.f(t.expect("Backstab has a target"));
            return if self.f(f).invisible > 0.0 || !looks_at(te, self.f(f).index) { 75.0 } else { 55.0 };
        }
        if effects.iter().any(|e| e.control.is_some()) {
            return 66.0;
        }
        if effects.iter().any(|e| e.hit.is_some() || e.dot.is_some()) {
            return 62.0;
        }
        match p.target.as_deref() {
            Some("enemy") | Some("enemies") => 60.0,
            _ => 58.0,
        }
    }

    /// d23 `powerUtility` for a cast ability.
    pub(super) fn cast_power_utility(&self, f: Ent, t: &Tgt, p: &EntityPowers, copied: bool) -> f64 {
        let fe = self.f(f);
        if copied || self.b.time - fe.power_used.get(&p.id).copied().unwrap_or(f64::NEG_INFINITY) < p.cooldown.unwrap_or(f64::NAN) {
            return -1.0;
        }
        if p.kind == "technique" {
            if fe.energy < p.cost + 12.0 || p.weapon.as_ref().is_some_and(|w| fe.weapon.type_ != *w || fe.disarmed > 0.0) {
                return -1.0;
            }
        } else if fe.mana < p.cost || fe.suppressed > 0.0 || self.weak_blocks(f, p) {
            return -1.0;
        }
        let t = Some(t.ent);
        if self.cast_targets(f, p, t).is_empty() {
            -1.0
        } else {
            self.cast_utility(f, t, p)
        }
    }

    /// d23 `usePower` for a cast ability: start the cast.
    pub(super) fn cast_use_power(&mut self, f: Ent, t: &Tgt, p: &EntityPowers) -> Option<bool> {
        let targets = self.cast_targets(f, p, Some(t.ent));
        if targets.is_empty() {
            return Some(false);
        }
        let sides: Vec<f64> = targets.iter().map(|&a| self.f(a).side).collect();
        let e = self.fm(f);
        e.action = Some(EntityAction {
            type_: "castAbility".into(),
            power: Some(p.clone()),
            targets: Some(sides),
            elapsed: 0.0,
            windup: p.windup.unwrap_or(f64::NAN),
            cost: Some(p.cost),
            angle: None,
            heavy: None,
            origin: None,
            recovery: None,
            refund_energy: None,
            refund_mana: None,
            released: None,
            target_index: None,
            travel: None,
        });
        e.action_label = p.name.clone();
        Some(true)
    }

    /// d23 `updateAttack` for a cast: resolve it when the windup ends.
    pub(super) fn cast_update_attack(&mut self, f: Ent, t: &Tgt, dt: f64) {
        let a = self.f(f).action.clone().expect("a cast in progress");
        let p = a.power.clone().expect("a cast has a power");
        let spell = p.kind == "spell";
        let fe = self.f(f);
        if fe.hp <= 0.0 || fe.sleep > 0.0 || fe.amnesia > 0.0 || spell && fe.suppressed > 0.0 || !spell && p.weapon.is_some() && fe.disarmed > 0.0 || fe.stagger > 0.0 || fe.roll > 0.0 {
            self.fm(f).action = None;
            return;
        }
        {
            let e = self.fm(f);
            let act = e.action.as_mut().unwrap();
            act.elapsed += dt;
            let done = act.elapsed >= act.windup;
            e.action_label = p.name.clone();
            if !done {
                return;
            }
            e.action = None;
        }
        let first_side = a.targets.as_ref().and_then(|l| l.first().copied());
        let first = first_side.and_then(|s| self.combatants().iter().copied().find(|&x| self.f(x).side == s));
        let area = matches!(p.target.as_deref(), Some("allies") | Some("enemies"));
        let legal = self.cast_targets(f, &p, if area { Some(t.ent) } else { first });
        let lost = if area { legal.is_empty() } else { first.is_none() || legal.first() != first.as_ref() };
        if lost {
            let cost = a.cost.unwrap_or(f64::NAN);
            let e = self.fm(f);
            if spell {
                e.mana = min(e.max_mana, e.mana + cost);
            } else {
                e.energy = min(e.max_energy, e.energy + cost);
            }
            e.power_used.0.retain(|(k, _)| *k != p.id);
            e.cast = min(e.cast, 0.2);
            return;
        }
        self.apply_cast(f, &p, &legal);
    }

    fn add_status(&mut self, t: Ent, id: &str, src: f64, s: &EntityPowersEffectsStatus) {
        let until = self.b.time + s.for_;
        self.push_status(t, EntityStatuses {
            id: id.into(),
            src,
            until,
            dmg_out: s.dmg_out.unwrap_or(0.0),
            dmg_in: s.dmg_in.unwrap_or(0.0),
            atk: s.atk.unwrap_or(0.0),
            move_: s.move_.unwrap_or(0.0),
            acc: s.acc.unwrap_or(0.0),
            heal_in: s.heal_in.unwrap_or(0.0),
            link: s.link.unwrap_or(0.0),
            dot: 0.0,
            type_: "arcane".into(),
            self_heal: 0.0,
            tick: 0.0,
        });
    }
    fn push_status(&mut self, t: Ent, s: EntityStatuses) {
        self.fm(t).statuses.get_or_insert_with(Vec::new).push(s);
    }

    /// `applyCast(f, p, targets)`
    fn apply_cast(&mut self, f: Ent, p: &EntityPowers, targets: &[Ent]) {
        let first = targets[0];
        let mut dealt = 0.0;
        let mut kind = String::from("physical");
        let src = self.f(f).index;
        for e in p.effects.as_deref().unwrap_or(&[]) {
            if let Some(h) = &e.hit {
                let (fe, te) = (self.f(f), self.f(first));
                let mut amount = base(fe, &h.base) * h.mult;
                if let Some(x) = h.ambush {
                    if fe.invisible > 0.0 || !looks_at(te, fe.index) {
                        amount *= x;
                    }
                }
                if let Some(x) = &h.execute {
                    if te.hp < te.max_hp * x.below {
                        amount *= x.mult;
                    }
                }
                self.fm(f).invisible = 0.0;
                dealt = amount;
                kind = h.type_.clone();
                self.hit(f, &Tgt::of(first), amount, &kind, None, Tags::default());
            }
            if let Some(b) = &e.bounce {
                let mut done = vec![first];
                let mut from = first;
                let mut i = 0.0;
                while i < b.count {
                    let fr = self.f(from);
                    let mut next: Vec<Ent> = self.cast_enemies(f).into_iter().filter(|x| !done.contains(x) && de(self.f(*x), fr) <= b.radius).collect();
                    next.sort_by(|&x, &y| js_cmp(de(self.f(x), self.f(from)) - de(self.f(y), self.f(from))).then(js_cmp(self.f(x).index - self.f(y).index)));
                    let Some(&n) = next.first() else { break };
                    self.hit(f, &Tgt::of(n), dealt * b.mult, &kind, None, Tags::default());
                    done.push(n);
                    from = n;
                    i += 1.0;
                }
            }
            if let Some(d) = &e.dot {
                let until = self.b.time + d.for_;
                let dot = base(self.f(f), &d.base) * d.per;
                self.push_status(first, EntityStatuses {
                    id: p.id.clone(),
                    src,
                    until,
                    dmg_out: 0.0,
                    dmg_in: 0.0,
                    atk: 0.0,
                    move_: 0.0,
                    acc: 0.0,
                    heal_in: 0.0,
                    link: 0.0,
                    dot,
                    type_: d.type_.clone(),
                    self_heal: d.self_heal.unwrap_or(0.0),
                    tick: 0.0,
                });
            }
            if let Some(s) = &e.status {
                let radius = s.radius.unwrap_or(f64::NAN);
                let on: Vec<Ent> = match s.on.as_str() {
                    "self" => vec![f],
                    "allies" => self.cast_allies(f).into_iter().filter(|&a| de(self.f(a), self.f(f)) <= radius).collect(),
                    "enemies" => self.cast_enemies(f).into_iter().filter(|&x| de(self.f(x), self.f(f)) <= radius).collect(),
                    "around" => self.cast_enemies(f).into_iter().filter(|&x| de(self.f(x), self.f(first)) <= radius).collect(),
                    _ => vec![first],
                };
                for x in on {
                    self.add_status(x, &p.id, src, s);
                }
            }
            if let Some(c) = &e.control {
                if self.f(first).hp > 0.0 {
                    let duration = self.duration(f, Some(&Tgt::of(first)), c.for_);
                    if self.kit_control(f, Some(first), "stunBolt", duration) && c.pull != 0.0 && !c.pull.is_nan() {
                        let (fe, te) = (self.f(f), self.f(first));
                        let angle = jsmath::atan2(fe.y - te.y, fe.x - te.x);
                        let (x, y) = (self.clamp_x(te.x + jsmath::cos(angle) * c.pull), self.clamp_y(te.y + jsmath::sin(angle) * c.pull));
                        let t = self.fm(first);
                        t.x = x;
                        t.y = y;
                        self.push_out_of_terrain(first);
                    }
                }
            }
            if let Some(w) = &e.ward {
                let t = self.fm(first);
                t.ward_hits = max(t.ward_hits, w.hits);
                t.ward_time = max(t.ward_time, w.for_);
            }
            if e.blink.as_deref() == Some("behind") {
                let (fe, te) = (self.f(f), self.f(first));
                let angle = jsmath::atan2(te.y - fe.y, te.x - fe.x);
                let gap = te.radius + fe.radius + 4.0;
                let (x, y) = (self.clamp_x(te.x + jsmath::cos(angle) * gap), self.clamp_y(te.y + jsmath::sin(angle) * gap));
                {
                    let e = self.fm(f);
                    e.x = x;
                    e.y = y;
                }
                self.push_out_of_terrain(f);
                let (fe, te) = (self.f(f), self.f(first));
                let facing = jsmath::atan2(te.y - fe.y, te.x - fe.x);
                self.fm(f).angle = facing;
            }
            if let Some(v) = e.evade {
                let fe = self.fm(f);
                fe.evade = max(fe.evade, v);
            }
            if e.dispel == Some(true) {
                let t = self.fm(first);
                if let Some(l) = t.statuses.as_mut() {
                    l.retain(|s| !is_buff(s));
                }
                t.ward_hits = 0.0;
                t.ward_time = 0.0;
            }
        }
    }

    /// d23 `upkeep`, after the rest of the chain: statuses run out, damage over time ticks, stat changes apply.
    pub(super) fn cast_upkeep(&mut self, f: Ent, dt: f64) {
        if self.f(f).statuses.as_ref().map_or(true, |l| l.is_empty()) {
            return;
        }
        let time = self.b.time;
        self.fm(f).statuses.as_mut().unwrap().retain(|s| s.until > time);
        let mut i = 0;
        while i < self.f(f).statuses.as_ref().map_or(0, |l| l.len()) {
            let s = &mut self.fm(f).statuses.as_mut().unwrap()[i];
            i += 1;
            if !(s.dot > 0.0) {
                continue;
            }
            s.tick += dt;
            if s.tick < 0.5 {
                continue;
            }
            let (period, dot, kind, self_heal, src_index) = (s.tick, s.dot, s.type_.clone(), s.self_heal, s.src);
            s.tick = 0.0;
            let src = js_index(src_index, self.combatants().len()).map(|k| self.combatants()[k]).unwrap_or(f);
            let before = self.f(f).hp;
            self.periodic_hit(src, &Tgt::of(f), dot * period, &kind);
            if self_heal > 0.0 && self.f(src).hp > 0.0 && self.f(f).hp < before {
                let amount = (before - self.f(f).hp) * self_heal;
                self.tr.heal_source = Some(src);
                self.heal(src, amount);
                self.tr.heal_source = None;
            }
        }
        let (mv, atk, acc) = (self.cast_mod(f, |s| s.move_), self.cast_mod(f, |s| s.atk), self.cast_mod(f, |s| s.acc));
        let e = self.fm(f);
        e.move_ *= mv;
        e.interval /= atk;
        e.accuracy *= acc;
    }

    /// d23 `hurt`: statuses scale the damage; a soul link passes part of it to the target's nearest ally.
    pub(super) fn cast_hurt(&mut self, t: &Tgt, f: Option<Ent>, mut amount: f64, kind: &str, can_dodge: bool) -> Option<bool> {
        let fighters = f.is_some_and(|fi| {
            let (fe, te) = (self.f(fi), self.f(t.ent));
            !(t.is_plain() && t.ent == fi) && fe.is_objective != Some(true) && te.is_objective != Some(true) && fe.team != te.team
        });
        if fighters {
            let factor = self.cast_mod(f.unwrap(), |s| s.dmg_out) * self.cast_mod(t.ent, |s| s.dmg_in);
            amount *= factor;
        }
        let before = self.thp(t);
        let result = self.hurt_d20(t, f, amount, kind, can_dodge);
        if fighters && t.is_plain() {
            let link = self.f(t.ent).statuses.iter().flatten().find(|s| s.link > 0.0).map(|s| s.link);
            if let Some(link) = link.filter(|_| self.f(t.ent).hp < before) {
                let te = self.f(t.ent);
                let mut partners: Vec<Ent> = self
                    .combatants()
                    .iter()
                    .copied()
                    .filter(|&a| {
                        let ae = self.f(a);
                        a != t.ent && ae.is_objective != Some(true) && ae.team == te.team && ae.hp > 0.0 && de(ae, te) <= 200.0 && !ae.statuses.iter().flatten().any(|s| s.link > 0.0)
                    })
                    .collect();
                partners.sort_by(|&a, &b| js_cmp(de(self.f(a), self.f(t.ent)) - de(self.f(b), self.f(t.ent))).then(js_cmp(self.f(a).index - self.f(b).index)));
                if let Some(&partner) = partners.first() {
                    let amount = (before - self.f(t.ent).hp) * link;
                    self.hurt_d20(&Tgt::of(partner), f, amount, kind, false);
                }
            }
        }
        result
    }
}

/// `t.target === index`
fn looks_at(t: &Entity, index: f64) -> bool {
    matches!(&t.target, Some(NumOrStr::Num(i)) if *i == index)
}
