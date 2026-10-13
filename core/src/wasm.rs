//! The WebAssembly entry point the game's simulation workers use (public/rust-core.js). A plain C ABI over linear
//! memory: JavaScript copies a battle's exported state JSON in (`ff_alloc`), `ff_simulate` plays the game to the
//! end and returns `result()` as JSON, behind a 4-byte little-endian length; JavaScript reads it and frees both
//! buffers (`ff_free`). A failure returns `{"error": ...}` instead.
use crate::team::engine::Engine;
use crate::team::Snapshot;

/// No game lasts anywhere near this many steps (the time limit ends it); a guard against an endless loop.
const MAX_STEPS: usize = 2_000_000;

#[no_mangle]
pub extern "C" fn ff_alloc(len: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len.max(1));
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// # Safety
/// `ptr` and `len` must come from `ff_alloc` (or a returned result buffer) and be freed once.
#[no_mangle]
pub unsafe extern "C" fn ff_free(ptr: *mut u8, len: usize) {
    drop(Vec::from_raw_parts(ptr, 0, len.max(1)));
}

fn run(input: &[u8]) -> Result<String, String> {
    let text = std::str::from_utf8(input).map_err(|e| e.to_string())?;
    let snapshot: Snapshot = serde_json::from_str(text).map_err(|e| format!("state: {e}"))?;
    if snapshot.engine != "team-4.0" {
        return Err(format!("engine {} is not supported", snapshot.engine));
    }
    let mut eng = Engine::from_snapshot(snapshot);
    let mut steps = 0;
    while !eng.b.done {
        eng.step(1.0 / 60.0);
        steps += 1;
        if steps > MAX_STEPS {
            return Err("the game did not end".into());
        }
    }
    Ok(eng.result().to_string())
}

/// Plays the game in `input` (the state JSON) to the end. Returns a buffer of `4 + n` bytes: the length `n` and the
/// result JSON (or `{"error": ...}`); free it with `ff_free(ptr, 4 + n)`.
///
/// # Safety
/// `ptr` must point to `len` readable bytes.
#[no_mangle]
pub unsafe extern "C" fn ff_simulate(ptr: *const u8, len: usize) -> *mut u8 {
    let input = std::slice::from_raw_parts(ptr, len);
    let out = run(input).unwrap_or_else(|e| serde_json::json!({ "error": e }).to_string());
    let bytes = out.into_bytes();
    let total = 4 + bytes.len();
    let p = ff_alloc(total);
    std::ptr::copy_nonoverlapping((bytes.len() as u32).to_le_bytes().as_ptr(), p, 4);
    std::ptr::copy_nonoverlapping(bytes.as_ptr(), p.add(4), bytes.len());
    p
}
