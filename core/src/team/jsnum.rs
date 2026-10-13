//! How JavaScript values arrive in the exported JSON (`scripts/lib/team-state.mjs`):
//! numbers are JSON numbers, except −0, NaN and ±Infinity, which come as `{"$f": "<16 hex digits of the bits>"}`;
//! entity links come as `{"$e": index}`; object keys keep JavaScript's order.
use serde::de::{DeserializeOwned, Error};
use serde::{Deserialize, Deserializer};
use serde_json::Value;

/// A link to a fighter, Core or the Titan, by its `index`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Ent(pub u32);

impl<'de> Deserialize<'de> for Ent {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let v = Value::deserialize(d)?;
        value_ent(&v).ok_or_else(|| D::Error::custom(format!("expected an entity link, got {v}")))
    }
}

/// A value the schema has never seen (always empty or always null in recorded games). Loading one fails, which
/// points at a schema gap rather than silently dropping state.
#[derive(Debug, Clone, Deserialize)]
pub enum Never {}

pub fn value_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        Value::Object(o) if o.len() == 1 => {
            let hex = o.get("$f")?.as_str()?;
            u64::from_str_radix(hex, 16).ok().map(f64::from_bits)
        }
        _ => None,
    }
}

pub fn value_ent(v: &Value) -> Option<Ent> {
    match v {
        Value::Object(o) if o.len() == 1 => o.get("$e")?.as_u64().map(|i| Ent(i as u32)),
        _ => None,
    }
}

fn num<E: Error>(v: &Value) -> Result<f64, E> {
    value_f64(v).ok_or_else(|| E::custom(format!("expected a number, got {v}")))
}

pub fn f64<'de, D: Deserializer<'de>>(d: D) -> Result<f64, D::Error> {
    num(&Value::deserialize(d)?)
}

pub fn opt_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Option<f64>, D::Error> {
    match Value::deserialize(d)? {
        Value::Null => Ok(None),
        v => num(&v).map(Some),
    }
}

pub fn vec_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<f64>, D::Error> {
    match Value::deserialize(d)? {
        Value::Array(items) => items.iter().map(num).collect(),
        v => Err(D::Error::custom(format!("expected a list of numbers, got {v}"))),
    }
}

pub fn opt_vec_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Option<Vec<f64>>, D::Error> {
    match Value::deserialize(d)? {
        Value::Null => Ok(None),
        Value::Array(items) => items.iter().map(num).collect::<Result<_, _>>().map(Some),
        v => Err(D::Error::custom(format!("expected a list of numbers, got {v}"))),
    }
}

pub fn vec_vec_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<Vec<f64>>, D::Error> {
    match Value::deserialize(d)? {
        Value::Array(rows) => rows
            .iter()
            .map(|row| match row {
                Value::Array(items) => items.iter().map(num).collect(),
                v => Err(D::Error::custom(format!("expected a list of numbers, got {v}"))),
            })
            .collect(),
        v => Err(D::Error::custom(format!("expected a list of lists, got {v}"))),
    }
}

/// Values a `JsMap` can hold: numbers through `jsnum`, generated structs through serde.
pub trait JsDe: Sized {
    fn from_value(v: Value) -> Result<Self, String>
    where
        Self: DeserializeOwned,
    {
        serde_json::from_value(v).map_err(|e| e.to_string())
    }
}

impl JsDe for f64 {
    fn from_value(v: Value) -> Result<Self, String> {
        value_f64(&v).ok_or_else(|| format!("expected a number, got {v}"))
    }
}

/// A JavaScript object used as a map (keys are data: ability ids, team sizes, slot numbers). Keeps the key order
/// JavaScript iterates in, which is the order the export wrote them.
#[derive(Debug, Clone, Default)]
pub struct JsMap<V>(pub Vec<(String, V)>);

impl<V> JsMap<V> {
    pub fn len(&self) -> usize {
        self.0.len()
    }
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
    pub fn iter(&self) -> impl Iterator<Item = (&String, &V)> {
        self.0.iter().map(|(k, v)| (k, v))
    }
    pub fn get(&self, key: &str) -> Option<&V> {
        self.0.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }
}

impl<'de, V: JsDe + DeserializeOwned> Deserialize<'de> for JsMap<V> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        match Value::deserialize(d)? {
            // serde_json's preserve_order keeps the document order of the keys.
            Value::Object(o) => o
                .into_iter()
                .map(|(k, v)| V::from_value(v).map(|v| (k, v)).map_err(D::Error::custom))
                .collect::<Result<_, _>>()
                .map(JsMap),
            v => Err(D::Error::custom(format!("expected an object, got {v}"))),
        }
    }
}

/// A field only some engines have (a Core siege field in a classic teamfight battle): present in the engines the
/// schema lists for it, missing in the others. Reading a missing one is a bug in the engine port, so it panics;
/// a missing field digests as null, like a missing JavaScript property.
#[derive(Debug, Clone)]
pub struct Opt<T>(pub Option<T>);

impl<T> Default for Opt<T> {
    fn default() -> Self {
        Opt(None)
    }
}

impl<T> Opt<T> {
    pub fn present(&self) -> Option<&T> {
        self.0.as_ref()
    }
    pub fn is_some(&self) -> bool {
        self.0.is_some()
    }
}

impl<T> std::ops::Deref for Opt<T> {
    type Target = T;
    fn deref(&self) -> &T {
        self.0.as_ref().expect("a field this engine does not have")
    }
}

impl<T> std::ops::DerefMut for Opt<T> {
    fn deref_mut(&mut self) -> &mut T {
        self.0.as_mut().expect("a field this engine does not have")
    }
}

impl<'de, T: Deserialize<'de>> Deserialize<'de> for Opt<T> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        T::deserialize(d).map(|v| Opt(Some(v)))
    }
}

pub fn eng_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Opt<f64>, D::Error> {
    f64(d).map(|v| Opt(Some(v)))
}

pub fn eng_vec_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Opt<Vec<f64>>, D::Error> {
    vec_f64(d).map(|v| Opt(Some(v)))
}

pub fn eng_vec_vec_f64<'de, D: Deserializer<'de>>(d: D) -> Result<Opt<Vec<Vec<f64>>>, D::Error> {
    vec_vec_f64(d).map(|v| Opt(Some(v)))
}
