//! Targets that are not plain entities. The JavaScript engine sometimes moves towards a stand-in: a copy of a
//! fighter with a few fields replaced (`{...t, x, y}`), or an object whose prototype is the fighter
//! (`Object.create(t)` with fields replaced, "lookAlike"). Every read of a field that is not replaced falls through
//! to the real entity. These are the only fields any stand-in replaces in team-4.0.
use super::Engine;
use crate::team::jsnum::Ent;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Over {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub vx: Option<f64>,
    pub vy: Option<f64>,
    pub hp: Option<f64>,
    /// `illusionTime: 0`
    pub no_illusion: bool,
    /// `action: null`
    pub no_action: bool,
    /// `weapon: {...t.weapon, type: 'melee'}`
    pub melee: bool,
    pub is_objective: Option<bool>,
    /// The decoy copy made by `targetFor` (`isDecoy: true`, `id: 'decoy-' + id`, `parent: t`).
    pub decoy: bool,
}

/// A target: an entity, possibly seen through replaced fields.
#[derive(Clone, Debug, PartialEq)]
pub struct Tgt {
    pub ent: Ent,
    pub over: Option<Box<Over>>,
}

impl Tgt {
    pub fn of(ent: Ent) -> Tgt {
        Tgt { ent, over: None }
    }
    /// A stand-in for `ent` with the given replacements (applied on top of any this target already has).
    pub fn with(&self, f: impl FnOnce(&mut Over)) -> Tgt {
        let mut over = self.over.as_deref().cloned().unwrap_or_default();
        f(&mut over);
        Tgt { ent: self.ent, over: Some(Box::new(over)) }
    }
    /// The plain entity (`t === entity` in JavaScript holds only for these).
    pub fn is_plain(&self) -> bool {
        self.over.is_none()
    }
}

impl Engine {
    #[inline]
    pub fn tx(&self, t: &Tgt) -> f64 {
        t.over.as_ref().and_then(|o| o.x).unwrap_or_else(|| self.f(t.ent).x)
    }
    #[inline]
    pub fn ty(&self, t: &Tgt) -> f64 {
        t.over.as_ref().and_then(|o| o.y).unwrap_or_else(|| self.f(t.ent).y)
    }
    #[inline]
    pub fn tvx(&self, t: &Tgt) -> f64 {
        t.over.as_ref().and_then(|o| o.vx).unwrap_or_else(|| self.f(t.ent).vx)
    }
    #[inline]
    pub fn tvy(&self, t: &Tgt) -> f64 {
        t.over.as_ref().and_then(|o| o.vy).unwrap_or_else(|| self.f(t.ent).vy)
    }
    #[inline]
    pub fn thp(&self, t: &Tgt) -> f64 {
        t.over.as_ref().and_then(|o| o.hp).unwrap_or_else(|| self.f(t.ent).hp)
    }
    #[inline]
    pub fn t_illusion(&self, t: &Tgt) -> f64 {
        if t.over.as_ref().is_some_and(|o| o.no_illusion) {
            0.0
        } else {
            self.f(t.ent).illusion_time
        }
    }
    /// Whether the target has an action (`t.action` truthy).
    #[inline]
    pub fn t_has_action(&self, t: &Tgt) -> bool {
        !t.over.as_ref().is_some_and(|o| o.no_action) && self.f(t.ent).action.is_some()
    }
    /// The action seen through the target (none when a stand-in clears it).
    #[inline]
    pub fn t_action(&self, t: &Tgt) -> Option<&crate::team::state::EntityAction> {
        if t.over.as_ref().is_some_and(|o| o.no_action) {
            None
        } else {
            self.f(t.ent).action.as_ref()
        }
    }
    #[inline]
    pub fn t_weapon_type<'a>(&'a self, t: &Tgt) -> &'a str {
        if t.over.as_ref().is_some_and(|o| o.melee) {
            "melee"
        } else {
            &self.f(t.ent).weapon.type_
        }
    }
    #[inline]
    pub fn t_is_objective(&self, t: &Tgt) -> bool {
        t.over.as_ref().and_then(|o| o.is_objective).unwrap_or_else(|| self.f(t.ent).is_objective == Some(true))
    }
}
