//! JavaScript math, bit for bit.
//!
//! The team engines are JavaScript and rely on V8's `Math` functions and number conversions. A Rust engine has to
//! reproduce each of them exactly, or seeded games drift apart after a few hundred steps. Plain IEEE-754 arithmetic
//! (+, −, ×, ÷, `%`, `sqrt`, `floor`, `ceil`, `abs`) is already identical in Rust; this module covers the rest.
//!
//! sin and cos come in two flavours, because V8 builds differ: node uses fdlibm, while Chrome, Edge (WebView2) and
//! Android WebView use V8's copy of glibc. JavaScript detects which one it runs on (`public/js-math-flavor.js`) and
//! tells the Rust side, so results always match the runtime that replays the game.

pub mod fdlibm;
pub mod glibc;
mod glibc_table;

/// Which sin/cos implementation the JavaScript runtime uses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrigFlavor {
    /// V8's fdlibm port: node.
    Fdlibm,
    /// V8's bundled glibc (`v8_use_libm_trig_functions`): Chrome, Edge/WebView2, Android WebView.
    Glibc,
}

impl TrigFlavor {
    pub fn parse(name: &str) -> Option<TrigFlavor> {
        match name {
            "fdlibm" => Some(TrigFlavor::Fdlibm),
            "glibc" => Some(TrigFlavor::Glibc),
            _ => None,
        }
    }
}

/// The math functions of one JavaScript runtime.
#[derive(Clone, Copy, Debug)]
pub struct JsMath {
    pub flavor: TrigFlavor,
}

impl JsMath {
    pub fn new(flavor: TrigFlavor) -> JsMath {
        JsMath { flavor }
    }
    #[inline]
    pub fn sin(&self, x: f64) -> f64 {
        match self.flavor {
            TrigFlavor::Fdlibm => fdlibm::sin(x),
            TrigFlavor::Glibc => glibc::sin(x),
        }
    }
    #[inline]
    pub fn cos(&self, x: f64) -> f64 {
        match self.flavor {
            TrigFlavor::Fdlibm => fdlibm::cos(x),
            TrigFlavor::Glibc => glibc::cos(x),
        }
    }
}

/// `Math.atan2`: fdlibm in every V8 build.
#[inline]
pub fn atan2(y: f64, x: f64) -> f64 {
    fdlibm::atan2(y, x)
}

/// `Math.hypot(...values)`, as V8's builtin computes it (`src/builtins/math.tq`): normalise by the largest magnitude
/// and add the squares with Kahan compensation.
pub fn hypot(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut one_nan = false;
    let mut max = 0.0f64;
    for &v in values {
        if v.is_nan() {
            one_nan = true;
        } else if v.abs() > max {
            max = v.abs();
        }
    }
    if max == f64::INFINITY {
        return f64::INFINITY;
    }
    if one_nan {
        return f64::NAN;
    }
    if max == 0.0 {
        return 0.0;
    }
    let mut sum = 0.0f64;
    let mut compensation = 0.0f64;
    for &v in values {
        let n = v.abs() / max;
        let summand = n * n - compensation;
        let preliminary = sum + summand;
        compensation = (preliminary - sum) - summand;
        sum = preliminary;
    }
    sum.sqrt() * max
}

/// `Math.hypot(x, y)`.
#[inline]
pub fn hypot2(x: f64, y: f64) -> f64 {
    hypot(&[x, y])
}

/// `Math.round`: halves round towards +∞, and −0 stays −0 (V8: `ceil(x)`, minus one if that overshoots by more than ½).
#[inline]
pub fn round(x: f64) -> f64 {
    let r = x.ceil();
    if r - 0.5 > x {
        r - 1.0
    } else {
        r
    }
}

/// `Math.max(a, b)`: NaN wins, and +0 beats −0.
#[inline]
pub fn max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == b {
        // Only ±0 can differ here.
        return if a.is_sign_negative() { b } else { a };
    }
    if a > b {
        a
    } else {
        b
    }
}

/// `Math.min(a, b)`: NaN wins, and −0 beats +0.
#[inline]
pub fn min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == b {
        return if a.is_sign_negative() { a } else { b };
    }
    if a < b {
        a
    } else {
        b
    }
}

/// ECMAScript ToUint32 (`x >>> 0`).
#[inline]
pub fn to_uint32(x: f64) -> u32 {
    if !x.is_finite() {
        return 0;
    }
    let t = x.trunc();
    let mut m = t % 4294967296.0;
    if m < 0.0 {
        m += 4294967296.0;
    }
    m as u32
}

/// ECMAScript ToInt32 (`x | 0`).
#[inline]
pub fn to_int32(x: f64) -> i32 {
    to_uint32(x) as i32
}

/// `Math.imul(a, b)` on already-converted int32 operands.
#[inline]
pub fn imul(a: i32, b: i32) -> i32 {
    a.wrapping_mul(b)
}

/// The engines' seeded generator, `random(seed)` in `public/combat-v1.js`:
/// `n+=0x6D2B79F5; t=n; t=imul(t^t>>>15,t|1); t^=t+imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/2**32`.
/// `n` is a JavaScript number that keeps growing without wrapping, so it is kept as an f64 here too.
#[derive(Clone, Debug)]
pub struct JsRandom {
    n: f64,
}

impl JsRandom {
    pub fn new(seed: f64) -> JsRandom {
        JsRandom { n: to_uint32(seed) as f64 }
    }
    pub fn next(&mut self) -> f64 {
        self.n += 1831565813.0; // 0x6D2B79F5
        let n = to_uint32(self.n);
        let t = imul((n ^ (n >> 15)) as i32, (n | 1) as i32);
        let u = t as u32;
        let inner = imul((u ^ (u >> 7)) as i32, t | 61);
        // `t + imul(...)` is a JavaScript addition of two int32 values (exact), then ToInt32 for the xor.
        let sum = to_int32(t as f64 + inner as f64);
        let t = t ^ sum;
        let u = t as u32;
        (u ^ (u >> 14)) as f64 / 4294967296.0
    }
}

pub(crate) mod words {
    #[inline]
    pub fn hi(x: f64) -> i32 {
        (x.to_bits() >> 32) as i32
    }
    #[inline]
    pub fn lo(x: f64) -> u32 {
        x.to_bits() as u32
    }
    #[inline]
    pub fn from_words(hi: u32, lo: u32) -> f64 {
        f64::from_bits(((hi as u64) << 32) | lo as u64)
    }
    #[inline]
    pub fn set_hi(x: f64, hi: u32) -> f64 {
        f64::from_bits((x.to_bits() & 0xFFFF_FFFF) | ((hi as u64) << 32))
    }
    #[inline]
    pub fn set_lo(x: f64, lo: u32) -> f64 {
        f64::from_bits((x.to_bits() & 0xFFFF_FFFF_0000_0000) | lo as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn round_matches_javascript() {
        for (x, want) in [(0.5, 1.0), (-0.5, -0.0), (2.5, 3.0), (-2.5, -2.0), (-0.4, -0.0), (1.4999999999999998, 1.0)] {
            assert_eq!(round(x).to_bits(), f64::to_bits(want), "{x}");
        }
    }
    #[test]
    fn min_max_signed_zero() {
        assert!(max(-0.0, 0.0).is_sign_positive());
        assert!(min(0.0, -0.0).is_sign_negative());
        assert!(max(1.0, f64::NAN).is_nan());
    }
    #[test]
    fn int_conversions() {
        assert_eq!(to_uint32(-1.0), 4294967295);
        assert_eq!(to_int32(4294967296.0 + 5.0), 5);
        assert_eq!(to_int32(2147483648.0), -2147483648);
        assert_eq!(to_uint32(f64::NAN), 0);
    }
}
