# Third-Party Notices — Tiny Bubbles

This product, "Tiny Bubbles", includes source code adapted from, and patterns
re-authored against, the open-source projects listed below. It also bundles
third-party runtime dependencies and (as they land) media assets. Each is used
under its respective license; the relevant copyright and permission notices are
reproduced or referenced below.

This file is maintained from M0 onward and finalized in M15 (per doc 66 §1b.9):
the dependency scan (`npx license-checker-rseidelsohn --production`) and the
manual bundled-asset review are appended here before ship.

---

## 1. Code donor (the ONLY repo any code is grafted from)

Per the master plan (doc 66 §0, §1b.2), **`lockin` is the single code-graft
donor.** Its shame/mockery mechanics, "ruthless advisor" AI, and rigid
one-immutable-goal model are explicitly NOT carried over (removed/retoned on
graft).

- **lockin** (byadhddev/lockin26) — Copyright (c) 2025 adhd.dev
  (https://x.com/adhd_paws) — MIT License (full text in §3).

## 2. Reference patterns (logic/patterns re-authored against our own stack — NO code copied)

The following MIT-licensed projects are **reference-only**: their logic and UI
patterns informed net-new implementations against our stack (expo-router,
Zustand, NativeWind, Reanimated 4). No source files are copied from them. They
are attributed here in good faith because their patterns shaped our design.

- **habit-tracker-app** (takanome-dev) — Copyright (c) 2024 takanome-dev — MIT.
  - Built on **Ignite** boilerplate — Copyright (c) Infinite Red, Inc. — MIT.
- **tether** (Aarsh Shah) — Copyright (c) 2025 Aarsh Shah — MIT.
- **momentum** (Vishal) — Copyright (c) 2024 Vishal — MIT.

> NOT donors and never shipped (reference concepts only, enforced in M15):
> `adhd-india` (no license / all rights reserved) and `adhd-focus-mate`
> (no LICENSE file). No code from either may appear in this repository.

## 3. MIT License (applies to the code donor and reference projects in §1–§2)

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 4. Runtime dependencies (npm)

The production dependency tree (Expo SDK 56, React Native 0.85, expo-router,
NativeWind, Reanimated 4, react-native-svg, AsyncStorage, etc.) is
predominantly MIT/BSD/ISC/Apache-2.0. Authoritative scan, run on the real tree:

```
npx license-checker-rseidelsohn --production --summary
```

**Result (M15 — production deps only):**

| License | Count | Notes |
| --- | --- | --- |
| MIT | 613 | permissive (was 608 at M15; +5 after the M-D1 Expo modules + the M-D2 `expo-image-picker`, all MIT) |
| ISC | 38 | permissive |
| Apache-2.0 | 16 | permissive; NOTICE files preserved (see below) |
| BSD-3-Clause | 15 | permissive |
| BSD-2-Clause | 12 | permissive |
| BlueOak-1.0.0 | 6 | permissive (OSI-approved) |
| MPL-2.0 | 4 | weak/file-level copyleft — see note (a) |
| MIT AND OFL-1.1 | 2 | the Google Fonts packages — see §5 |
| Unlicense | 2 | public-domain-equivalent |
| 0BSD | 2 | permissive |
| (MIT OR CC0-1.0) | 2 | we elect MIT |
| MIT AND Apache-2.0 | 1 | permissive |
| Python-2.0 | 1 | permissive (`argparse`) |
| CC-BY-4.0 | 1 | build-time data only — see note (b) |
| (MIT OR Apache-2.0) | 1 | we elect MIT |
| CC0-1.0 | 1 | public domain (`mdn-data`) |
| (BSD-3-Clause OR GPL-2.0) | 1 | dual — we elect BSD-3-Clause — see note (c) |
| UNLICENSED | 1 | this app itself (`tiny-bubbles`) — see note (d) |

**M1.2 additions (v2 backend/sync):** `firebase` JS SDK ^12 (**Apache-2.0**, with
Google `@firebase/*` scoped packages, Apache-2.0) is now a production dependency of
`apps/kid` — loaded ONLY through the gated dynamic import in `apps/kid/src/sync/firebase.ts`
(unconfigured/default builds never evaluate it). `firebase-admin` (Apache-2.0) +
`firebase-functions` (MIT) remain server-side only (`functions/`, never bundled into an
app). Dev-only additions: `esbuild` (MIT, deploy bundling), `ts-jest` (MIT),
`@firebase/rules-unit-testing` (Apache-2.0, the needs-Java emulator suite), `firebase`
as a functions devDependency (emulator client). **No ad/analytics SDK was added** —
enforced by `apps/kid/__tests__/config/no-analytics.test.ts`.

**GPL/AGPL/LGPL gate: PASS.** No standalone GPL/AGPL/LGPL dependency is present.
The only GPL token is the dual-licensed `node-forge` (`BSD-3-Clause OR GPL-2.0`),
for which **we elect BSD-3-Clause** — note (c).

Notes:
- **(a) MPL-2.0** — `lightningcss` + its platform binary (`lightningcss`,
  `lightningcss-darwin-arm64`). MPL-2.0 is **file-level** copyleft: it does not
  impose any obligation on Tiny Bubbles' own source; only modifications to the
  MPL-licensed files themselves would need sharing (we do not modify them).
  `lightningcss` is a **build-time** CSS transformer (NativeWind/Tailwind
  tooling) and is not shipped in the app bundle. Acceptable.
- **(b) CC-BY-4.0** — `caniuse-lite` (browser-support **data**, build-time only,
  not shipped). Attribution: "caniuse-lite © caniuse contributors, CC-BY-4.0."
- **(c) (BSD-3-Clause OR GPL-2.0)** — `node-forge` (transitive of Expo dev
  tooling). Dual-licensed; **Tiny Bubbles elects the BSD-3-Clause option**, so no
  GPL obligation attaches.
- **(d) UNLICENSED** — this is **Tiny Bubbles' own root package**, not a
  dependency. `license-checker` labels any `"private": true` package `UNLICENSED`
  by design (a private package is not offered for npm redistribution), even though
  `package.json` declares `"license": "MIT"` and the tool detects our `LICENSE`
  file. The project IS MIT (see `LICENSE`); there is no third-party UNLICENSED
  dependency.
- **(e) M-D1 clinician-reporting deps** — four first-party Expo modules were added
  for the on-device progress report + local backup/restore (M-D1,
  `clinician-reporting`): **`expo-print`**, **`expo-sharing`**, **`expo-file-system`**
  (used via its shipped `expo-file-system/legacy` surface), and
  **`expo-document-picker`**. All are **MIT-licensed, © 650 Industries / Expo**,
  bundled in the Expo Go SDK-56 runtime, plugin-free for this usage, and require no
  network — they render the report to a local PDF, hand a file to the OS share
  sheet, write/read the JSON backup file, and pick a backup to restore. They are
  covered by the MIT count in the §4 table above (the tree was re-scanned after
  `npx expo install`).
- **(f) M-B2 / M-D2 verify-undo camera dep** — **`expo-image-picker`**
  (`~56.0.20`, MIT, © 650 Industries / Expo) was added via `npx expo install` for
  the OPTIONAL child photo-verify (`verify-undo`). It is bundled in the Expo Go
  SDK-56 runtime, registered as an Expo **config plugin** in `app.json` with honest
  camera/photo usage strings (no medical/required framing — the photo is optional,
  parent-enabled, off by default). It requires **no network**: a captured photo is
  a device-local `file://` in the backup-excluded cache dir (`tb-photos/`), never
  uploaded/analyzed, and `deletePhoto` removes it on re-verify / wipe / restore
  (production-readiness §2.7). Covered by the MIT count in §4 (re-scanned after
  install).
- **(g) M1.0 monorepo-migration deps (v2 w0)** — the repo became an npm-workspaces
  monorepo (`apps/kid` = the shipped v1 app moved verbatim; `apps/parent`,
  `packages/shared`, `functions/` scaffolds). Three toolchain packages were added:
  **`@expo/metro-runtime`** (`~56.0.15`, MIT, © 650 Industries / Expo) — the Expo
  SDK's own web entry runtime, previously a transitive dep, now declared directly
  in both apps because the monorepo Metro config sets `disableHierarchicalLookup`
  (npm-nested trees are invisible to it); no behavior change, no network. And, in
  the **server-side `functions/` workspace ONLY** (its own Node toolchain — NEVER
  bundled by Metro, never imported from either app; the ONLY sanctioned raw-egress
  zone per 02-architecture §1.4): **`firebase-admin`** (`^13`) and
  **`firebase-functions`** (`^6`), both **Apache-2.0, © Google** (empty scaffold at
  M1.0; real functions land in M1.2). The kid app's client bundle is unchanged and
  still has ZERO egress (retargeted `no-network` gate green).
- **(h) M1.1 shared-workspace dev deps (v2 w8-primitives)** — two **dev-only**
  packages were added to `packages/shared` for its Node-side jest suite (the w8
  compliance/neuroPreset unit tests + CI gate scaffolds, BUILD-GUIDE §2.2):
  **`ts-jest`** (`^29`, MIT, © ts-jest contributors — the TS transform for the
  node test runner) and **`@types/node`** (`^26`, MIT, © DefinitelyTyped
  contributors — type declarations for the Node-only fs gate wrapper
  `compliance/symbolLicenseNode.ts`). Both are devDependencies: never shipped,
  never bundled by Metro, no runtime footprint in either app.
- **Apache-2.0 NOTICE files** — of the 16 Apache-2.0 deps (mostly build/dev
  tooling: `typescript`, `fb-watchman`, `walker`, `chrome-launcher`,
  `lighthouse-logger`, `detect-libc`, `xcode`, `aria-query`, `bser`, `marky`,
  `ts-interface-checker`, `exponential-backoff`, `didyoumean`,
  `baseline-browser-mapping`, `@expo-google-fonts/material-symbols`,
  `chromium-edge-launcher`), the only one shipping a dedicated `NOTICE` file is
  **`xcode`** (`node_modules/xcode/NOTICE`, a dev-only `.pbxproj` parser).
  Its license text + NOTICE are preserved in `node_modules` and travel under the
  Apache-2.0 terms; the others carry license text only (no NOTICE file to
  preserve). Re-run the scan + re-check for new NOTICE files before any release.
- **BSD** also applies to native modules such as **MMKV** if/when adopted behind
  the storage port (the MVP default is AsyncStorage — MIT).

_(Full per-package CSV available via `npx license-checker-rseidelsohn
--production --csv > licenses.csv`.)_

---

## 5. Fonts

Shipped fonts and their licenses (locally-bundled fonts are invisible to
`license-checker` and must be hand-added per doc 66 §1b.9):

- **Fredoka** — SIL Open Font License 1.1 — **shipping as of M2** via
  `@expo-google-fonts/fredoka` (carries its own `LICENSE`/`LICENSE_FONT` in
  `node_modules`). Loaded at splash; used for display/headings/young UI.
- **Lexend** — SIL Open Font License 1.1 — **shipping as of M2** via
  `@expo-google-fonts/lexend`. Loaded at splash; used for body/labels/numerals.
- **OpenDyslexic** — SIL Open Font License 1.1 (Reserved Font Name
  "OpenDyslexic") — **NOT yet bundled.** The `.otf` binaries are not in the repo
  (we do not fabricate font binaries); see `assets/fonts/README.md` for how to
  add them + uncomment the `require`s in `src/theme/fonts.ts`. The full OFL-1.1
  text + author + Reserved-Font-Name note are hand-added HERE when the files
  land. Until then the `dyslexic` fontFamily degrades to the platform default.

(Inter is intentionally NOT shipped.)

---

## 6. Bundled assets (audio/fonts/images)

Standing registry, populated as assets land (audio in M13, etc.). Every bundled
media asset MUST be recorded here with: `{ filename, source URL, author,
license, commercial-OK }`. All audio MUST be CC0 / Pixabay-license /
explicitly-royalty-free-commercial. CC-BY-NC / CC-Sampling+ / unverifiable
licenses are FORBIDDEN (incompatible with a paywalled app).

| Filename | Type | Source URL | Author | License | Commercial OK |
| --- | --- | --- | --- | --- | --- |
| `assets/sounds/sandbox-cue.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (original) | CC0 / original work | Yes — used by the kept `/_sandbox` dev diagnostic screen |
| `assets/sounds/tap-soft.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/step-done.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/token-payout.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/routine-complete.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/levelup.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/reward-redeem.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/buddy-greet.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/transition-swoosh.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |
| `assets/sounds/timer-done.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes — optional soft one-shot when a step's visual-transition timer ends (M-B1; off by default) |
| `assets/sounds/calm-ambient.wav` | audio | n/a (procedurally synthesized) | Tiny Bubbles (project-authored) | original / CC0 | Yes |

> **All M13 cues above are ORIGINAL, self-synthesized** (soft sine/marimba-like
> tones + a filtered-noise swoosh, computed with the Python standard library —
> `wave`/`struct`/`math`, no third-party audio downloaded or sampled), so they
> carry **no third-party license** and are project-authored CC0. They are the
> shipping cue set registered in `src/services/sound.ts` and wired into
> `useCelebration` / the calm path. The `sandbox-cue.wav` row remains a TEMPORARY
> M1 probe asset, removed with `app/_sandbox.tsx` at M15.
>
> A richer, professionally-produced soundscape may replace these later: keep the
> filenames (the registry keys in `sound.ts`) stable and swap the binaries, or add
> new CC0 / Pixabay / royalty-free-commercial files and record their real license
> rows here. The documented cue "slots" live in RUN.md.
>
> **Soundscapes feature (M-C1):** the looping-bed feature's FREE `waves` scene
> **reuses the already-listed `assets/sounds/calm-ambient.wav`** above — it bundles
> **no new binary**, so M-C1 ships green with zero new asset rows. The premium
> scenes (`rain` / `brown_noise` / `forest` / `soft_piano` / `cafe` / `night`,
> target set) are an out-of-band prerequisite: each new CC0 / project-authored loop
> dropped into `assets/sounds/soundscapes/` MUST get its own row here
> (`filename, source URL, author, license, commercial-OK`) AND a `require()` in
> `src/services/soundscape.ts` `SOUNDSCAPE_ASSET` before its catalog entry is added
> — a scene may never reference an un-bundled asset (keeps `expo export` green).
>
> `sandbox-cue.wav` is used only by the `/_sandbox` dev diagnostic screen (kept
> for on-device verification, M15 override) — it is not referenced by any
> kid/parent UI.

### 6a. Reserved asset slots — onboarding offline-TTS fallback (M11)

The onboarding flow (`app/(onboarding)/*`) is fully spoken. On a device with NO
usable system voice it falls back to a **bundled pre-recorded clip per step**
(`src/services/onboardingVoice.ts` → `ONBOARDING_VOICE_SLOTS`). **No CC0 clip is
bundled yet** — every slot maps to `null` and the fallback player is a registered
no-op, so the path is WIRED but inert (we never fabricate an audio binary). When a
licensed clip lands, place the file at the path below, point the slot at it via
`require(...)`, register a player, and record the real license row here.

| Reserved filename | Type | Source URL | Author | License | Commercial OK |
| --- | --- | --- | --- | --- | --- |
| `assets/audio/onboarding/welcome.m4a` | audio | TBD (CC0 / royalty-free) | TBD | TBD — must be CC0 / Pixabay / royalty-free-commercial | TBD |
| `assets/audio/onboarding/privacy.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/gate.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/child.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/buddy.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/task.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/calm.m4a` | audio | TBD | TBD | TBD | TBD |
| `assets/audio/onboarding/done.m4a` | audio | TBD | TBD | TBD | TBD |

> These rows are **placeholders for slots, not shipped assets** — nothing in this
> sub-section is bundled today. They exist so the asset-license review (M15) has a
> checklist if/when the offline onboarding voice clips are recorded/sourced. The
> same CC0 / Pixabay / royalty-free-commercial rule and the CC-BY-NC / Sampling+ /
> unverifiable ban apply to every slot before it may ship.
