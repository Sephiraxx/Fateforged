# Fateforge app (Windows and Android)

Fateforge runs as a standalone app: a Windows installer and an Android APK. There's no browser, address bar or tabs. The app is a [Tauri 2](https://tauri.app) shell (`desktop/`) around the offline game, which is the same build as the GitHub Pages version (`node scripts/build-pages.mjs` → `_site`). It runs in the system WebView: WebView2 on Windows, Android System WebView on phones.

## Getting the app
- **GitHub Actions** (`.github/workflows/app.yml`) builds on every pull request, every push to `main`, and on demand (Actions → App builds → Run workflow). Open the run and download the artifacts:
  - **fateforge-windows**: the `Fateforge_x.y.z_x64-setup.exe` installer (NSIS), an `.msi`, and the bare `fateforge.exe`. The bare `.exe` runs without installing, on Windows 10/11 with WebView2, which is built in.
  - **fateforge-android**: a debug-signed `.apk` for arm64 phones. Allow installs from unknown sources to sideload it.
- **Signing:** the builds are not code-signed yet. Windows SmartScreen will warn ("More info" → "Run anyway"). A Play Store or signed release build needs a Windows code-signing certificate and an Android keystore.

## Building locally (Windows)
1. Install Node 22, Rust (rustup) and the Microsoft C++ Build Tools.
2. In the repository root: `npm ci`.
3. Then `cd desktop`, `npm ci`, and either:
   - `npx tauri dev` for a live window;
   - `npx tauri build` for the installer in `desktop/src-tauri/target/release/bundle/`.
4. For Android:
   - install Android Studio (SDK, NDK, Java 17) and set `ANDROID_HOME` and `NDK_HOME`;
   - run `npx tauri android init` once;
   - then `npm run build:android`, or `npx tauri android dev` with a phone connected.

## Saves
- **Where saves live:** like the Pages version, saves are one SQLite file kept in the WebView's storage.
- **The save file:** the app also writes that file to its data folder after every save:
  - `%APPDATA%\com.fateforge.game\fateforge-save.sqlite` on Windows;
  - the app's private storage on Android.
  - If the WebView's storage is ever cleared, the app restores the save from that file.
  - The Backups dialog shows the path.
- **Moving saves from the browser:** in the browser version, open Backups → Export a backup. In the app, open Backups → Import that `.sqlite` file.

## Sound
The apps play the same generated retro sound as the browser (see `SOUND.md`), through WebView2 on Windows and the Android System WebView. Sound starts after the first tap or click.

## Performance
- **Same speed as Chrome today:** the app runs the same JavaScript simulation, and the browser was never the slow part.
- **Multi-core:** simulations already use every core but one (see "Faster simulation and patch audits" in `TEAM-BATTLES.md`).
- **Next speed step:** a Rust simulation core, shared by the app (native, all cores) and the web version (WebAssembly). It will port the current engines (team-2.7, team-3.6, duel v13) and must reproduce the JavaScript engines' recorded games exactly (`validation/team-engine-fingerprints.json`), so saves and replays keep working.
