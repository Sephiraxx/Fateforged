//! FNV-1a 64 over a tagged binary walk of the battle state; the byte layout matches `scripts/lib/team-state.mjs`.
pub trait Digest {
    fn digest(&self, h: &mut Fnv);
}

const NIL: u8 = 0;
const F64: u8 = 1;
const TRUE: u8 = 2;
const FALSE: u8 = 3;
const STR: u8 = 4;
const ENT: u8 = 5;
const ARR: u8 = 6;
const OBJ: u8 = 7;
const MAP: u8 = 8;

pub struct Fnv(u64);

impl Default for Fnv {
    fn default() -> Self {
        Fnv::new()
    }
}

impl Fnv {
    pub fn new() -> Fnv {
        Fnv(0xcbf2_9ce4_8422_2325)
    }
    #[inline]
    pub fn byte(&mut self, b: u8) {
        self.0 = (self.0 ^ b as u64).wrapping_mul(0x0000_0100_0000_01b3);
    }
    pub fn raw_u32(&mut self, n: u32) {
        for b in n.to_le_bytes() {
            self.byte(b);
        }
    }
    pub fn raw_f64(&mut self, v: f64) {
        for b in v.to_bits().to_le_bytes() {
            self.byte(b);
        }
    }
    /// A map key: length and UTF-8 bytes, no tag.
    pub fn key(&mut self, s: &str) {
        self.raw_u32(s.len() as u32);
        for b in s.bytes() {
            self.byte(b);
        }
    }
    pub fn nil(&mut self) {
        self.byte(NIL);
    }
    pub fn f64(&mut self, v: f64) {
        self.byte(F64);
        self.raw_f64(v);
    }
    pub fn bool(&mut self, v: bool) {
        self.byte(if v { TRUE } else { FALSE });
    }
    pub fn str(&mut self, s: &str) {
        self.byte(STR);
        self.key(s);
    }
    pub fn ent(&mut self, e: super::jsnum::Ent) {
        self.byte(ENT);
        self.raw_u32(e.0);
    }
    pub fn arr(&mut self, len: usize) {
        self.byte(ARR);
        self.raw_u32(len as u32);
    }
    pub fn map(&mut self, len: usize) {
        self.byte(MAP);
        self.raw_u32(len as u32);
    }
    pub fn obj(&mut self) {
        self.byte(OBJ);
    }
    pub fn hex(&self) -> String {
        format!("{:016x}", self.0)
    }
}
