// Builds the Rust core for WebAssembly and copies it to public/fateforge-core.wasm (committed, so the web and app
// builds need no Rust toolchain), and records the hash of the sources it came from. Needs the wasm32 target: rustup target add wasm32-unknown-unknown.
// node scripts/build-rust-wasm.mjs
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {rustSourceHash} from './lib/rust-source-hash.mjs';
const build=spawnSync('cargo',['rustc','--release','--target','wasm32-unknown-unknown','--lib','--crate-type','cdylib','--manifest-path','core/Cargo.toml'],{stdio:'inherit'});
if(build.status!==0)process.exit(build.status??1);
fs.copyFileSync('core/target/wasm32-unknown-unknown/release/fateforge_core.wasm','public/fateforge-core.wasm');
// The hash of the sources it was built from; check-rust-wasm fails when the sources change without a rebuild.
fs.writeFileSync('validation/rust-wasm-source.json',JSON.stringify({source:rustSourceHash()},null,1)+'\n');
console.log(`public/fateforge-core.wasm: ${(fs.statSync('public/fateforge-core.wasm').size/1024).toFixed(0)} KB`);
