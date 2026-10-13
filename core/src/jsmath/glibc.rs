//! sin and cos exactly as Chromium's V8 computes them: V8 is built with `v8_use_libm_trig_functions`, which uses a
//! copy of glibc's IBM Accurate Mathematical Library (`third_party/glibc/src/sysdeps/ieee754/dbl-64/s_sin.c` and
//! `branred.c`, identical from V8 12.4 to 14.1). Chrome, Edge (WebView2) and Android WebView all run this code, so it is
//! what the app's JavaScript engines use. Ported line by line; `glibc_table.rs` holds its table.
//!
//! LGPL-2.1-or-later. IBM Accurate Mathematical Library, written by International Business Machines Corp.
//! Copyright (C) 2001-2022 Free Software Foundation, Inc. This library is free software; you can redistribute it
//! and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software
//! Foundation; either version 2.1 of the License, or (at your option) any later version. It is distributed WITHOUT ANY
//! WARRANTY; see <https://www.gnu.org/licenses/>.

use super::glibc_table::SINCOSTAB;
use super::words::{hi, lo, set_hi};

// usncs.h
const S1: f64 = f64::from_bits(0xBFC5_5555_5555_5555); // -0x1.5555555555555p-3
const S2: f64 = f64::from_bits(0x3F81_1111_1111_0ECE);
const S3: f64 = f64::from_bits(0xBF2A_01A0_19DB_08B8);
const S4: f64 = f64::from_bits(0x3EC7_1DE2_7B9A_7ED9);
const S5: f64 = f64::from_bits(0xBE5A_DDFF_C2FC_DF59);
const BIG: f64 = f64::from_bits(0x42C8_0000_0000_0000); // 0x1.8p45
const HP0: f64 = f64::from_bits(0x3FF9_21FB_5444_2D18);
const HP1: f64 = f64::from_bits(0x3C91_A626_3314_5C07);
const MP1: f64 = f64::from_bits(0x3FF9_21FB_5800_0000);
const MP2: f64 = f64::from_bits(0xBE4D_DE97_3C00_0000); // -0x1.DDE973Cp-27
const PP3: f64 = f64::from_bits(0xBC8C_B3B3_9800_0000);
const PP4: f64 = f64::from_bits(0xBACD_747F_23E3_2ED7);
const HPINV: f64 = f64::from_bits(0x3FE4_5F30_6DC9_C883);
const TOINT: f64 = f64::from_bits(0x4338_0000_0000_0000); // 0x1.8p52

// s_sin.c
const SN3: f64 = -1.66666666666664880952546298448555E-01;
const SN5: f64 = 8.33333214285722277379541354343671E-03;
const CS2: f64 = 4.99999999999999999999950396842453E-01;
const CS4: f64 = -4.16666666666664434524222570944589E-02;
const CS6: f64 = 1.38888874007937613028114285595617E-03;

#[inline]
fn table(u: f64) -> (f64, f64, f64, f64) {
    let k = ((lo(u) as i32) << 2) as usize;
    (
        f64::from_bits(SINCOSTAB[k]),
        f64::from_bits(SINCOSTAB[k + 1]),
        f64::from_bits(SINCOSTAB[k + 2]),
        f64::from_bits(SINCOSTAB[k + 3]),
    )
}

#[inline]
fn taylor_sin(xx: f64, x: f64, dx: f64) -> f64 {
    let poly2 = (((S5 * xx + S4) * xx + S3) * xx + S2) * xx;
    let poly = poly2 + S1;
    let t = (poly * x - 0.5 * dx) * xx + dx;
    x + t
}

fn do_cos(x_in: f64, dx_in: f64) -> f64 {
    let mut dx = dx_in;
    if x_in < 0.0 {
        dx = -dx;
    }
    let u = BIG + x_in.abs();
    let x = x_in.abs() - (u - BIG) + dx;
    let xx = x * x;
    let s = x + x * xx * (SN3 + xx * SN5);
    let c = xx * (CS2 + xx * (CS4 + xx * CS6));
    let (sn, ssn, cs, ccs) = table(u);
    let cor = (ccs - s * ssn - cs * c) - sn * s;
    cs + cor
}

fn do_sin(x_in: f64, dx_in: f64) -> f64 {
    let xold = x_in;
    if x_in.abs() < 0.126 {
        return taylor_sin(x_in * x_in, x_in, dx_in);
    }
    let mut dx = dx_in;
    if x_in <= 0.0 {
        dx = -dx;
    }
    let u = BIG + x_in.abs();
    let x = x_in.abs() - (u - BIG);
    let xx = x * x;
    let s = x + (dx + x * xx * (SN3 + xx * SN5));
    let c = x * dx + xx * (CS2 + xx * (CS4 + xx * CS6));
    let (sn, ssn, cs, ccs) = table(u);
    let cor = (ssn + s * ccs - sn * c) + cs * s;
    (sn + cor).copysign(xold)
}

fn reduce_sincos(x: f64) -> (i32, f64, f64) {
    let t = x * HPINV + TOINT;
    let xn = t - TOINT;
    let y = (x - xn * MP1) - xn * MP2;
    let n = (lo(t) as i32) & 3;
    let mut t1 = xn * PP3;
    let t2 = y - t1;
    let mut db = (y - t2) - t1;
    t1 = xn * PP4;
    let b = t2 - t1;
    db += (t2 - b) - t1;
    (n, b, db)
}

fn do_sincos(a: f64, da: f64, n: i32) -> f64 {
    let r = if n & 1 != 0 { do_cos(a, da) } else { do_sin(a, da) };
    if n & 2 != 0 {
        -r
    } else {
        r
    }
}

pub fn sin(x: f64) -> f64 {
    let k = hi(x) & 0x7fffffff;
    if k < 0x3e500000 {
        x
    } else if k < 0x3feb6000 {
        do_sin(x, 0.0)
    } else if k < 0x400368fd {
        let t = HP0 - x.abs();
        do_cos(t, HP1).copysign(x)
    } else if k < 0x419921FB {
        let (n, a, da) = reduce_sincos(x);
        do_sincos(a, da, n)
    } else if k < 0x7ff00000 {
        let (n, a, da) = branred(x);
        do_sincos(a, da, n)
    } else {
        x / x
    }
}

pub fn cos(x: f64) -> f64 {
    let k = hi(x) & 0x7fffffff;
    if k < 0x3e400000 {
        1.0
    } else if k < 0x3feb6000 {
        do_cos(x, 0.0)
    } else if k < 0x400368fd {
        let y = HP0 - x.abs();
        let a = y + HP1;
        let da = (y - a) + HP1;
        do_sin(a, da)
    } else if k < 0x419921FB {
        let (n, a, da) = reduce_sincos(x);
        do_sincos(a, da, n + 1)
    } else if k < 0x7ff00000 {
        let (n, a, da) = branred(x);
        do_sincos(a, da, n + 1)
    } else {
        x / x
    }
}

// branred.c / branred.h (its own constants: note BR_MP2 differs from usncs.h's MP2).
const T576: f64 = f64::from_bits(0x63f0_0000_0000_0000);
const TM600: f64 = f64::from_bits(0x1a70_0000_0000_0000);
const TM24: f64 = f64::from_bits(0x3e70_0000_0000_0000);
const BR_BIG: f64 = f64::from_bits(0x4338_0000_0000_0000);
const BR_BIG1: f64 = f64::from_bits(0x4358_0000_0000_0000);
const BR_HP0: f64 = f64::from_bits(0x3FF9_21FB_5444_2D18);
const BR_HP1: f64 = f64::from_bits(0x3C91_A626_3314_5C07);
const BR_MP1: f64 = f64::from_bits(0x3FF9_21FB_5800_0000);
const BR_MP2: f64 = f64::from_bits(0xBE4D_DE97_4000_0000);
const SPLIT: f64 = 134217729.0;
const TOVERP: [f64; 75] = [
    10680707.0, 7228996.0, 1387004.0, 2578385.0, 16069853.0, 12639074.0, 9804092.0, 4427841.0, 16666979.0, 11263675.0,
    12935607.0, 2387514.0, 4345298.0, 14681673.0, 3074569.0, 13734428.0, 16653803.0, 1880361.0, 10960616.0, 8533493.0,
    3062596.0, 8710556.0, 7349940.0, 6258241.0, 3772886.0, 3769171.0, 3798172.0, 8675211.0, 12450088.0, 3874808.0,
    9961438.0, 366607.0, 15675153.0, 9132554.0, 7151469.0, 3571407.0, 2607881.0, 12013382.0, 4155038.0, 6285869.0,
    7677882.0, 13102053.0, 15825725.0, 473591.0, 9065106.0, 15363067.0, 6271263.0, 9264392.0, 5636912.0, 4652155.0,
    7056368.0, 13614112.0, 10155062.0, 1944035.0, 9527646.0, 15080200.0, 6658437.0, 6231200.0, 6832269.0, 16767104.0,
    5075751.0, 3212806.0, 1398474.0, 7579849.0, 6349435.0, 12618859.0, 4703257.0, 12806093.0, 14477321.0, 2786137.0,
    12875403.0, 9837734.0, 14528324.0, 13719321.0, 343717.0,
];

/// One half of branred's sum: returns (b, bb, sum) for the part `xp` of the split argument.
fn branred_part(xp: f64) -> (f64, f64, f64) {
    let mut r = [0.0f64; 6];
    let mut sum = 0.0;
    let mut k = ((hi(xp) >> 20) & 2047) as i32;
    k = (k - 450) / 24;
    if k < 0 {
        k = 0;
    }
    let mut gor = set_hi(T576, (hi(T576) - ((k * 24) << 20)) as u32);
    for (i, v) in r.iter_mut().enumerate() {
        *v = xp * TOVERP[k as usize + i] * gor;
        gor *= TM24;
    }
    for v in r.iter_mut().take(3) {
        let s = (*v + BR_BIG) - BR_BIG;
        sum += s;
        *v -= s;
    }
    let mut t = 0.0;
    for i in 0..6 {
        t += r[5 - i];
    }
    let mut bb = (((((r[0] - t) + r[1]) + r[2]) + r[3]) + r[4]) + r[5];
    let s = (t + BR_BIG) - BR_BIG;
    sum += s;
    t -= s;
    let b = t + bb;
    bb = (t - b) + bb;
    let s = (sum + BR_BIG1) - BR_BIG1;
    sum -= s;
    (b, bb, sum)
}

fn branred(x_in: f64) -> (i32, f64, f64) {
    let x = x_in * TM600;
    let t = x * SPLIT;
    let x1 = t - (t - x);
    let x2 = x - x1;
    let (b1, bb1, sum1) = branred_part(x1);
    let (b2, bb2, sum2) = branred_part(x2);
    let mut sum = sum1 + sum2;
    let mut b = b1 + b2;
    let bb = if b1.abs() > b2.abs() { (b1 - b) + b2 } else { (b2 - b) + b1 };
    if b > 0.5 {
        b -= 1.0;
        sum += 1.0;
    } else if b < -0.5 {
        b += 1.0;
        sum -= 1.0;
    }
    let s = b + (bb + bb1 + bb2);
    let t = ((b - s) + bb) + (bb1 + bb2);
    let b = s * SPLIT;
    let t1 = b - (b - s);
    let t2 = s - t1;
    let b = s * BR_HP0;
    let bb = (((t1 * BR_MP1 - b) + t1 * BR_MP2) + t2 * BR_MP1) + (t2 * BR_MP2 + s * BR_HP1 + t * BR_HP0);
    let s = b + bb;
    let t = (b - s) + bb;
    ((sum as i32) & 3, s, t)
}
