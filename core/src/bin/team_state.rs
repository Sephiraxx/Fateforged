//! Loads battle snapshots exported by `scripts/lib/team-state.mjs` and checks that the Rust state digests to the
//! same value as the JavaScript battle it came from.
//! Usage: `team-state <dir>`: every `<name>.json` needs a `<name>.digest` holding the JavaScript digest.
//! Prints a JSON summary; exits with status 1 when a snapshot fails to load or digests differently.
use fateforge_core::team::Snapshot;
use std::fs;

fn main() {
    let dir = std::env::args().nth(1).expect("usage: team-state <dir>");
    let mut names: Vec<String> = fs::read_dir(&dir)
        .expect("readable directory")
        .filter_map(|e| e.ok()?.file_name().into_string().ok())
        .filter(|n| n.ends_with(".json"))
        .collect();
    names.sort();
    let (mut ok, mut failures) = (0usize, Vec::new());
    for name in &names {
        let text = fs::read_to_string(format!("{dir}/{name}")).expect("readable snapshot");
        let want = fs::read_to_string(format!("{dir}/{}", name.replace(".json", ".digest"))).expect("digest file");
        match serde_json::from_str::<Snapshot>(&text) {
            Err(e) => failures.push(format!("{{\"file\":\"{name}\",\"error\":{:?}}}", e.to_string())),
            Ok(s) => {
                let got = s.digest();
                if got == want.trim() {
                    ok += 1;
                } else {
                    failures.push(format!("{{\"file\":\"{name}\",\"want\":\"{}\",\"got\":\"{got}\"}}", want.trim()));
                }
            }
        }
    }
    println!("{{\"snapshots\":{},\"matching\":{ok},\"failures\":[{}]}}", names.len(), failures.join(","));
    if !failures.is_empty() {
        std::process::exit(1);
    }
}
