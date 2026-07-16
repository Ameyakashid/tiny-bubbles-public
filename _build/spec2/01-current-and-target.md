# 01 — Current State, v2 Target, and the Monorepo Migration

*Authored 2026-07-09. The v2 inventory + target-state + migration doc. Grounds every reuse claim in a
**real path** in the shipped app (`/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/`, verified in-repo:
Expo SDK 56 / RN 0.85.3 / React 19.2.3 / TS 6.0.3 / zustand 5.0.14 / NativeWind 4.2.6, `SCHEMA_VERSION = 1`,
`MIGRATIONS = []`, 69 test files). Authoritative inputs: `_build/research2/00-SYNTHESIS2.md`,
`_build/research2/01-v2-feature-matrix.md`, and the v1 spec `_build/spec/02-architecture.md` +
`_build/spec/00-MASTER-ROADMAP.md`. Donor code lives under `/Users/ameyakashid/Desktop/adhd india/_sources2/`.
Mind the SPACE in every path.*

> ## LOCKED v2 decisions this doc implements (do NOT relitigate)
> - **Monorepo, TWO apps:** `apps/kid` = the shipped v1 app **EXTENDED (not rewritten)** · `apps/parent` = net-new Expo app · `packages/shared` · `functions/` (Firebase Cloud Functions, TS).
> - **Firebase (Auth + Firestore + Functions + FCM + App Check) is ADDITIVE** oversight/sync/LLM. The v1 offline-first `storage` port stays the **source of truth for the child's core tools**. Never brick the child: full function with network + LLM OFF.
> - **Bloop = two layers:** always-on deterministic character (Rive/Lottie, baby-schema, never withers/sulks/guilt-trips) + off-by-default, parent-gated, server-moderated chat. The product fully works with the LLM disabled.
> - **Super-guardrailed LLM:** the model is never the safety boundary. Cloud-Functions proxy = input shield → provider (Gemini Flash strict / DeepSeek wrapped identically) → **output shield**. Hard topic-scope, PII refusal both directions, crisis = pre-written human-reviewed region-localized hotlines + parent FCM alert + transcript. **MOCK-FIRST `bloopProvider` seam** (app stays green/offline, CI never hits network).
> - **`neuroProfile` axis** (autism = predictable/low-stim · ADHD = novelty/bright) joins `ageMode` in the resolvers; per-child override.
> - **Evidence-honesty / license / COPPA-2025 + UK Children's Code** carried as hard constraints (see §3.6, §4).

---

## 0. How to read this document

- **§1 — CURRENT (v1 reuse inventory):** exactly what the shipped app already provides that v2 reuses, per subsystem, with real file paths and export names. This is the load-bearing "don't rewrite it" map.
- **§2 — MIGRATION:** the two-phase monorepo migration — (2A) lift-and-shift `tiny-bubbles/ → apps/kid/` with **zero code changes** (tree stays green), then (2B) incremental extraction into `packages/shared` + net-new `apps/parent` + `functions/`; plus the tooling (npm workspaces, tsconfig paths, metro, jest, the no-egress gate).
- **§3 — TARGET:** the v2 end-state — the monorepo layout, the extended kid app, the parent app, the functions package, the Firestore data model, and the invariants (v1's, plus the v2 additions).
- **§4 — GAP LIST:** everything that does not exist today and must be built, mapped to feature-matrix rows, donors, and effort.

---

## 1. CURRENT STATE — what shipped v1 provides that v2 REUSES

Everything below is **verified present** in `tiny-bubbles/`. v2 **extends** these; it does not fork or
rewrite them. Paths are relative to `tiny-bubbles/` (post-migration: `apps/kid/`; shared extractions noted
per subsystem in §2B).

### 1.1 The core loop + daypart engine (REUSE as-is; power AAC/schedule completions)

| Concern | Real path(s) | What it gives v2 |
|---|---|---|
| **Cross-store orchestrator** | `src/state/gameplay.ts` | `completeStep` (the loop: tokens → progress → reinforcement → task done → run advance → companion mood + monotonic nurture), `createChildWithSeed`, the redemption escrow flow (`request/approve/decline/cancel`), `wipeAllChildData`, chore materialisation + quest signals. **New AAC/schedule/first-then completions fire the same celebration path — no new reward engine.** |
| **Daypart engine** | `src/state/runProgressStore.ts` (`tb/runProgress`: `active`, `completedDayparts`), `src/domain/tasks.ts` (`routineDaypartOf`), `src/domain/dates.ts` (`isoDay`, `isoWeekKey`, tz-pure helpers) | The morning/afternoon/evening sequencing the visual-schedule player (A2) extends into full-day "now / next". |
| **Task runner (the hot shared UI)** | `components/task/TaskRunner.tsx` + `StepCard.tsx`, `DoneButton.tsx`, `NextStepChooser.tsx` | The step-by-step player that A2 (visual schedule), A3 (first-then), A4 (transition warnings), A8 (video-on-step) all layer onto — additive, non-blocking, reads `caps.*`, never raw `ageMode`. |
| **Token economy (pure)** | `src/domain/gamification.ts` | `earn`, `spend`, `refund`, `undoEarn`, `hold`, `releaseHold`, `availableBalance`, `latestEarnFor`, `capEntries`. Anti-shame by construction (undo splits spendable balance from monotonic felt progress). Powers every new completion celebration unchanged. |
| **Progress / streaks / reinforcement** | `src/domain/progressMeter.ts`, `src/domain/streaks.ts` (`reconcileStreakRest`, active/resting only), `src/domain/reinforcement.ts` | Monotonic, positive-only. The companion "grows," never shrinks. |

### 1.2 Resolvers + `ageMode` engine (REUSE; extend with `neuroProfile`)

The golden rule holds in v2: **no component reads raw `ageMode`/`neuroProfile`**; every difference is produced
by a resolver. `neuroProfile` becomes a *new resolver input*, never a prop.

| Resolver / type | Real path | v2 role |
|---|---|---|
| Age/sensory/companion unions | `src/domain/types.ts` — `AgeMode = "young"\|"older"\|"preteen"`, `SensoryMode = "standard"\|"lowStim"`, `CompanionStyle`, `CompanionMood` (positive-only), `CelebrationLevel` | Add `NeuroProfile = "adhd"\|"autism"\|"both"` here (union widening, additive, no `SCHEMA_VERSION` bump). |
| Capability resolver | `src/theme/resolveCapabilities.ts` (`ModeCapabilities`: `textPrimary`, `maxChoices 3\|6`, `multiStepVisible`, `companionStyle`, `moodCheckin`, autonomy grants, `breathingChoice`, `focusIntervalsAvailable`) | Add `neuroProfile` to `ResolveCapabilitiesInput`; it selects the novelty/predictability/stim preset (autism default = low novelty/no-auto-advance/sound+haptics off; ADHD = brighter/faster). |
| Token/theme resolver | `src/theme/resolveTokens.ts`, `src/theme/tokens.ts`, `src/theme/useThemeTokens.ts`, `src/theme/ThemeProvider.tsx` | Same machinery renders the autism low-stim palette; `stillwave`'s pastel tokens feed here. |
| Copy resolver | `src/theme/resolveContent.ts` (`ModeKeyed<T> = { young; older; preteen? }`) + `src/i18n/{en,catalog,messages,types}.ts`, `src/i18n/useLocale.ts` | All new AAC/emotion/Bloop copy authored through the same `ModeKeyed` key space; literal-language autism variants slot in here. |
| Celebration / status / mood presentation | `src/theme/resolveCelebration.ts`, `src/theme/resolveStatusPresentation.ts` (triple-coding icon+shape+label), `src/theme/resolveMoodCheckin.ts` | Reused for schedule-step-done, first-then-done, AAC-utterance nods, Bloop celebrate state. |
| Reduced-motion / a11y | `src/theme/useReducedMotion.ts`, `useReduceTransparency.ts`, `useOSFontScale.ts`, `src/theme/contrast.ts`, `src/a11y/{announce,props}.ts` | The sensory-preferences module (A5) + Bloop's Reduce-Motion damping build directly on these. |

### 1.3 Offline-first persistence: storage port + migrations + backup (REUSE; the source of truth)

This is the **"never brick the child"** substrate. Firebase is layered *on top*, never replacing it.

| Concern | Real path | Details v2 depends on |
|---|---|---|
| **Storage port** | `src/storage/storage.ts` | `StoragePort` interface (`getString`/`set`/`delete`/`getAllKeys`), AsyncStorage default + optional MMKV adapter, web shim. The swap seam a Firebase **sync adapter** slots beside (not into). |
| **Key layout** | `src/storage/schemaVersion.ts` | `SCHEMA_VERSION = 1`, `TB_PREFIX = "tb/"`, `APP_KEYS` (`meta`/`parentSettings`/`entitlement`/`childIndex`/`seedState`), `CHILD_SLICES` (12: `profile,companion,routines,tasks,runs,ledger,reinforcement,progress,rewards,redemptions,moods,events`). New v2 slices follow this exact pattern. |
| **Migration engine** | `src/storage/migrations.ts` | `safeParse`/`loadSlice`, `runMigrations` (forward-only, preserves unknown keys), `mergeWithDefaults`, `validateAndRepair` + primitive repairs `repairLedger`/`repairProgress`/`repairCompanion`/`repairTask` (coerce UP to safe positives, never zero). New v2 fields are additive → no bump. |
| **Persist adapter** | `src/storage/persist.ts` | `tbStateStorage`, `createTbPersistOptions({ name, partialize })`, `registerPersistedStore`, `useStoresHydrated` + `components/StoreHydrationGate.tsx`. Every new v2 store hydrates through this. |
| **Local backup/restore** | `src/services/backup.ts` | `BackupFile` envelope, `collectTbSlices()` (enumerates the WHOLE `tb/` keyspace via `getAllKeys` → new v2 slices auto-covered), `validateBackupFile`, `repairBackupSlices`, PIN-gated export/import. |
| **Legacy import** | `src/storage/legacyImport.ts` | Existing import path; unchanged. |

### 1.4 Reminders / notifications (REUSE; anti-shame copy gate, quiet hours)

`src/services/notifications.ts` — `buildReminderPlan`, `rescheduleReminders`, `scheduleRoutineReminders`,
`cancelAllReminders`, quiet-hours math (`isWithinQuietHours`, `shiftOutOfQuietHours`), `DEFAULT_MAX_PER_DAY = 3`,
and the **`BANNED_REMINDER_PATTERNS` + `isReminderCopyClean`/`assertReminderCopyClean` copy gate**. First-then
time cues (A3/A4) and Bloop break-nudges (D7) reuse this budget + gate; nothing new schedules outside it.
FCM push (crisis alerts) is **net-new and lives in `functions/`**, not here.

### 1.5 Visual timers + focus + breathing + soundscapes (REUSE; transition/break layer)

| Feature | Real path | v2 extension |
|---|---|---|
| **Visual timers** | `src/domain/timer.ts` (`timerRemainingMs`, `timerFraction`, `formatMSS`, `hasVisualTimer`), `components/task/VisualTimer.tsx` | A4 (transition warnings + priming) adds an advance-warning layer on top; **no new timer math**. |
| **Focus intervals** | `src/domain/focus.ts`, `src/state/focusSessionStore.ts` (in-memory), `src/data/focusBreaks.ts` | The movement-break (A10) reuses the break catalog + focus session shape. |
| **Breathing** | `src/domain/breathing.ts` (`BREATH_PATTERNS` bubble/box/calm46, `breathPhaseAt`, `growStage`), `components/kid/BreathingBubble.tsx`, `CalmGarden.tsx` | A5 "I need a break" → breathe reuses this; `stillwave` visuals enrich, not duplicate. |
| **Soundscapes** | `src/services/soundscape.ts` (`playSoundscape`/`stopSoundscape`/`setSoundscapeVolume`), `src/data/soundscapes.ts`, `components/kid/SoundscapePicker.tsx`, `components/ui/VolumeSlider.tsx` | A5 calm/sensory break reuses the audio-bed layer. |

### 1.6 If-then plans (REUSE; **re-skin as visual first-then**)

`src/domain/plans.ts` — `assemblePlanPhrase`, `planToReminderAnchor`, `plansForStep`/`plansForRoutine`/
`plansForDaypart`, `situationalPlans`, `assertPlanCopyClean`. `src/state/planStore.ts` (`tb/plans`,
per-child). `components/plans/{PlanAuthor,PlanCard,PlanCuePanel}.tsx`, `src/data/planTemplates.ts`.
**Feature A3 (First-Then card) is this exact feature re-skinned** as a two-cell visual first-then for
non-reading kids — one component, two framings. No new engine.

### 1.7 Mood check-in (REUSE; extend with emotion vocabulary)

`src/domain/moodInsight.ts` (`recentMoods`, `moodCountsInRange`, `energyByDaypart`, `moodTimeline` —
descriptive counts only, **no interpretation** = no AI), `src/data/moodScale.ts` (`MOOD_FACES`), the `MoodLog`
slice under `tb/child/<cid>/moods`, `src/theme/resolveMoodCheckin.ts`, `components/mood/{MoodGrid,EnergyGrid,
MoodTrend}.tsx`. **Feature A7 (emotion identification + strategy menu)** extends this with a feelings-vocabulary
layer (`feelings-wheel` taxonomy) + a "what could help?" strategy link — the mechanism, **not** the
branded Zones™ curriculum.

### 1.8 Companion sprite (REUSE the deterministic character; it becomes Bloop's fallback)

`components/buddy/BubbleBuddy.tsx` — a **fully procedural** `react-native-svg` + Reanimated companion:
glassy body, gaze/blink, a `smile` shared value **clamped ≥ 0 (can never frown)**, idle bob/breathe, celebratory
jump, sleepy lid, growth-stage render. Mood is a member of the **positive-only** `CompanionMood` union — no
sad/sick/guilt state by construction. Plus `components/buddy/{BuddyRoom,buddyVisuals}.tsx`, `src/state/buddyStore.ts`
(`tb/buddy`, monotonic bond/growth), `src/domain/{companionMood,companionName}.ts`, `src/data/buddyCosmetics.ts`.

This is **exactly the "always-on deterministic character" layer** the locked decision requires. v2 either
(a) keeps `BubbleBuddy` as the shipped/offline Bloop and adds a Rive state machine as the richer default when a
dev client is available, or (b) promotes Rive to primary with `BubbleBuddy` as the guaranteed offline/web
fallback. Either way the **anti-shame invariant (no withering/sulking) is already enforced in code** and carries
forward verbatim.

### 1.9 Mock-first service seam (REUSE the pattern for `bloopProvider`)

`src/services/purchases.ts` is the canonical seam: a deterministic offline MOCK (`mockPurchase`/`mockCancel`)
behind a stable interface with a `// TODO: wire RevenueCat` marker, keeping the app green/offline/Expo-Go-runnable.
**The `bloopProvider` port (C9) is authored by copying this discipline exactly** — a TS interface
`sendTurn(input, ctx) → ModeratedReply` with a default deterministic MOCK impl and the real Cloud-Functions-proxy
impl behind the same seam, selected by a build flag. Also reuse: `src/services/entitlements.ts`
(`isFeatureUnlocked`/`canAddMore`, `FEATURE_GATES`), `src/services/tts.ts` (`voiceParamsFor`, `speak` — the
"everything spoken aloud" guarantee AAC/schedules/Bloop all reuse), `src/services/{haptics,playCue,parentGate,
photoVerify}.ts`.

### 1.10 Tests + CI floors (REUSE; extend as features land)

69 test files under `__tests__/{domain,state,services,storage,theme,components,render,i18n,config,helpers}`.
Load-bearing gates that v2 must keep green and **retarget** (§2B):

- `__tests__/config/no-network.test.ts` — the **no-egress gate**: greps `app/`, `src/`, `components/` for
  `fetch(`/`axios`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`https?://` outside an exact exclusion set. In v2
  this scans `apps/kid/{app,src,components}` and `apps/parent/*` **client trees**; `functions/` is the only
  egress zone (excluded).
- `__tests__/config/backup-exclusion.test.ts` (OS-backup exclusion), `dev-screens-gated.test.ts`.
- `__tests__/storage/*` — the migration-forward fixture + schema-roundtrip harness that validates every
  "additive, no bump" claim. Every new v2 slice extends this fixture.

### 1.11 Tooling baseline (the ground truth the migration must preserve)

`package.json` (npm + `package-lock.json`, `"private": true`), `tsconfig.json` (`extends expo/tsconfig.base`,
`strict`, path `@/* → ./*`), `metro.config.js` (`getDefaultConfig` + `withNativeWind({ input: "./global.css" })`),
`babel.config.js` (`babel-preset-expo` jsxImportSource nativewind + `react-native-worklets/plugin` LAST),
`jest.config.js` + `jest.setup.js` (jest-expo), `app.json` (Expo config: `android.allowBackup:false`, plugins for
router/font/notifications/audio/image-picker/sharing), `tailwind.config.js`, `global.css`, `eas.json`,
`THIRD_PARTY_NOTICES.md` + `PROVENANCE.md` (license discipline).

---

## 2. THE MONOREPO MIGRATION PLAN

**Guiding principle:** the shipped tree is green (`tsc` = 0, 69 suites). The migration must **never break it**.
Do it in two phases: (2A) a pure lift-and-shift that changes **zero** application code, then (2B) incremental,
opt-in extraction into `packages/shared` + net-new `apps/parent` + `functions/`.

### 2.0 Target repository layout

```
tiny-bubbles-v2/                     ← new git root (recommended: git-mv the existing repo into apps/kid to keep history)
├── package.json                     ← root; "workspaces": ["apps/*", "packages/*", "functions"]; "private": true
├── package-lock.json                ← single lockfile hoisted to root
├── tsconfig.base.json               ← shared compilerOptions + path aliases
├── .npmrc / .nvmrc                  ← pin node; node-linker settings
├── apps/
│   ├── kid/                         ← THE SHIPPED v1 TREE, MOVED VERBATIM (was tiny-bubbles/)
│   │   ├── app/ src/ components/ __tests__/ assets/ hooks/ store/
│   │   ├── app.json  metro.config.js  babel.config.js  tsconfig.json  jest.config.js  global.css  tailwind.config.js
│   │   └── package.json             ← name "@tiny-bubbles/kid"
│   └── parent/                      ← NET-NEW Expo app (SDK 56/RN 0.85/TS): login, monitoring, consent, controls, authoring
│       └── (mirrors kid's config files; imports @tiny-bubbles/shared)
├── packages/
│   └── shared/                      ← extracted-incrementally cross-app TS (RN-free where possible)
│       ├── package.json             ← name "@tiny-bubbles/shared", "main": "src/index.ts"
│       ├── tsconfig.json
│       └── src/                     ← types, theme tokens/resolvers, storage port iface, shared domain, board/emotion schema, bloopProvider port, moderation taxonomy
└── functions/                       ← NET-NEW Firebase Cloud Functions (TS): Bloop proxy + moderation + crisis triggers + auth-blocking + FCM + TTL
    ├── package.json                 ← name "functions"; firebase-admin + firebase-functions; ITS OWN node_modules
    ├── tsconfig.json
    └── src/
```

### 2.1 Phase 2A — lift-and-shift `tiny-bubbles/ → apps/kid/` (zero code changes)

The key insight: **v1 imports are relative (`../domain/...`) or the `@/*` self-alias.** Moving the whole tree
into `apps/kid/` keeps every relative import valid and `@/* → ./*` still resolves within `apps/kid/`. So the
app code needs **no edits**; only root-level tooling is added.

**Steps:**

1. **`git mv` the entire `tiny-bubbles/` tree into `apps/kid/`** (preserves history). Keep `apps/kid/tsconfig.json`,
   `metro.config.js`, `babel.config.js`, `app.json`, `jest.config.js`, `tailwind.config.js`, `global.css` **exactly as-is**.
2. **Add a root `package.json`** with `"workspaces": ["apps/*", "packages/*", "functions"]`, `"private": true`,
   and root scripts that fan out (`"kid": "npm -w @tiny-bubbles/kid run <x>"`, etc.). Rename
   `apps/kid/package.json` → `"name": "@tiny-bubbles/kid"` (was `"tiny-bubbles"`); dependencies unchanged.
3. **Hoist to a single root `package-lock.json`.** Delete the per-app lockfile; `npm install` at root hoists
   shared deps to root `node_modules` and keeps app-specific/native deps resolvable.
4. **Fix Metro for the monorepo** (`apps/kid/metro.config.js`) — the one file that *must* change, because Metro
   defaults to a single project root. Add `watchFolders` (repo root) + `config.resolver.nodeModulesPaths`
   (app + root `node_modules`) + `disableHierarchicalLookup: true`, keeping the existing
   `withNativeWind(config, { input: "./global.css" })` wrapper:
   ```js
   const { getDefaultConfig } = require("expo/metro-config");
   const { withNativeWind } = require("nativewind/metro");
   const path = require("path");
   const projectRoot = __dirname;
   const monorepoRoot = path.resolve(projectRoot, "../..");
   const config = getDefaultConfig(projectRoot);
   config.watchFolders = [monorepoRoot];
   config.resolver.nodeModulesPaths = [
     path.resolve(projectRoot, "node_modules"),
     path.resolve(monorepoRoot, "node_modules"),
   ];
   config.resolver.disableHierarchicalLookup = true;
   module.exports = withNativeWind(config, { input: "./global.css" });
   ```
5. **Verify green:** `npm -w @tiny-bubbles/kid run typecheck` = 0 and `npm -w @tiny-bubbles/kid test` = 69 suites,
   Expo Go still boots. **No app source touched** → the shipped app is provably intact. This is the checkpoint
   before any extraction.

> At the end of 2A the app is byte-identical in behavior; only its folder and three root config files changed.

### 2.2 Phase 2B — add `packages/shared`, `apps/parent`, `functions/` (incremental)

**Tooling contract (set once, root `tsconfig.base.json`):**

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@tiny-bubbles/shared": ["packages/shared/src/index.ts"],
      "@tiny-bubbles/shared/*": ["packages/shared/src/*"]
    }
  }
}
```
Each workspace `tsconfig.json` `extends` `../../tsconfig.base.json` (kid keeps its own `@/* → ./*`; the two alias
namespaces do not collide). **Metro must also resolve the alias** — add
`config.resolver.extraNodeModules = { "@tiny-bubbles/shared": path.resolve(monorepoRoot, "packages/shared/src") }`
(or rely on `watchFolders` + the package `"main"`) so the RN bundler follows the same path map as `tsc`.

**What to extract into `packages/shared/src` (only what BOTH apps consume — extract lazily, keep the kid tree green):**

| Extract | From (v1 path) | Why shared | Notes |
|---|---|---|---|
| Domain **types / unions** | `src/domain/types.ts` (+ the new `NeuroProfile`, `Board`/`Symbol`, `Schedule`, Firestore doc types) | parent authors boards/schedules/settings that the kid renders → identical type source | pure TS, safe first extraction |
| **Theme tokens + pure resolvers** | `src/theme/{tokens,resolveTokens,resolveCapabilities,resolveContent,resolveCelebration,resolveStatusPresentation,contrast}.ts` | parent app renders kid-safe previews + a consistent design system | RN-free logic moves; RN-bound `ThemeProvider.tsx`/`useThemeTokens.ts` stay per-app (or a thin shared hook) |
| **Storage port INTERFACE** | `src/storage/storage.ts` (`StoragePort`), `schemaVersion.ts` (`TB_PREFIX`, key helpers) | both apps + the sync adapter reason about the same key scopes | keep AsyncStorage *adapter* per-app; share the interface + key layout |
| **Shared pure domain** | `src/domain/{dates,timer,plans,moodInsight,gamification}.ts` (as needed) | parent monitoring/authoring reuses the same math (e.g. `moodInsight` for the dashboard, `timer` formatting) | move opportunistically; never move RN-coupled code |
| **Emotion taxonomy** (new) | port `feelings-wheel/languages/*.toml` → typed `EMOTIONS` + `PALETTE`→zone colors | kid picks, parent glances/authors A9 narratives | new module, born shared |
| **Board / symbol schema** (new) | adopt `speakeasy-aac/src/types/index.ts` `Symbol`/`Board` | parent authors, kid renders, Firestore stores | new module, born shared |
| **`bloopProvider` port** (new) | mirror `src/services/purchases.ts` seam | kid calls it, mock lives here, real impl calls `functions/` | interface + mock in shared; wire in kid |
| **Moderation taxonomy** (new) | port `llm-guard` scanner taxonomy + `guardrails-ai` `OnFailAction` enum semantics | shared verdict/enum shapes between `functions/` and the transcript UI in both apps | types only client-side; heavy logic in `functions/` |

**Extraction discipline:** move a module to `packages/shared`, replace its old location with a re-export
(`export * from "@tiny-bubbles/shared/domain/types"`) OR update kid imports in one pass, run the kid test suite,
commit. One module per commit so a regression is bisectable. **Never** move RN-native or store-coupled code that
only the kid app uses.

**`apps/parent` (net-new):** scaffold an Expo SDK 56 / RN 0.85 / TS app mirroring kid's config files
(metro monorepo config identical to §2.1 step 4; its own `app.json`/`babel.config.js`/`tailwind.config.js`).
Depends on `@tiny-bubbles/shared` + Firebase JS SDK. Donor: `expo-firebase-boilerplate-v2` (MIT, **port JS→TS**,
scrub committed demo creds).

**`functions/` (net-new, separate toolchain):** its own `package.json` + `node_modules` (`firebase-admin`,
`firebase-functions`, `@google-cloud/vertexai`), its own `tsconfig.json`, **NOT** an Expo/Metro package —
excluded from the Metro `watchFolders` bundle so no server code ever enters a client bundle. This is where **all
egress lives**. Donor backbone: `firebase-cloud-functions-typescript-example` (MIT, already TS).

**Jest / CI:** keep per-app jest configs; add a root script that runs each workspace's suite. **Retarget the
no-egress gate** (`no-network.test.ts`) to scan `apps/kid` + `apps/parent` client trees and to **explicitly
exclude `functions/`** (the one sanctioned egress zone). Extend the migration-forward fixture for each new slice.

**License / provenance:** the root carries a consolidated `THIRD_PARTY_NOTICES.md` + `PROVENANCE.md`; every new
donor (Rive/Lottie/gifted-chat MIT/Apache; symbol art must be a cleared CC-BY/PD/original set — **exclude
ARASAAC CC-BY-NC-SA + Sclera CC-BY-NC**; guardrail donors are Python → **vendor patterns, not code**).

---

## 3. THE v2 TARGET STATE

### 3.1 Three surfaces on one shared spine

- **`apps/kid` (the extended v1 app):** the intact offline-first core loop + daypart + resolvers + storage +
  companion, **plus** the autism module (AAC, visual schedule, first-then, transition warnings, sensory profile,
  emotion-ID, video-on-step, social-narrative viewer, movement break) **plus** Bloop (character layer always-on;
  chat off-by-default behind the `bloopProvider` mock-first seam) **plus** a thin Firebase **sync adapter** that
  mirrors selected slices up for parent monitoring and pulls parent-authored boards/schedules/settings down.
  Works fully with **network + LLM OFF**.
- **`apps/parent` (net-new):** email/password login → dashboard → monitoring (activity + transcripts + alerts)
  → **COPPA consent gate** → controls (Bloop on/off, per-category topic scope, free-text-vs-chips, usage/time
  limits, retention window, crisis locale) → **board/schedule/first-then/social-narrative authoring** (Bloop-drafted
  narratives require parent approval) → review+delete data → persistent AI-disclosure notice → optional clinician
  routing.
- **`functions/` (net-new, the ONLY egress + the safety boundary):** the Bloop proxy (App Check + `verifyIdToken`
  gate → input shield → topic-scope → crisis detect → Gemini Flash strict / DeepSeek wrapped → output shield →
  on-fail state machine → PII-redacted transcript write), transcript `onWrite` crisis triggers → `alert` + **FCM
  push**, auth-blocking COPPA gate, scheduled TTL cleanup.

### 3.2 New on-device slices (follow the shipped `tb/*` pattern exactly)

New persisted slices under the storage port, each auto-covered by backup (`getAllKeys`), cleared by
`wipeAllChildData`, counted in `DataReview`, added to the migration fixture — **`SCHEMA_VERSION` stays 1** (all
additive): `tb/boards` (AAC/choice/first-then/schedule `Board`+`Symbol`), `tb/schedules` (ordered steps +
transition cfg + optional video ref), and a per-child **sensory profile** (an additive `ChildSettings` field group,
not necessarily a new slice). Existing new-in-v1 slices `tb/plans`, `tb/chores`, `tb/quests` + in-memory
`focusSessionStore` carry forward unchanged; the novelty layer (`questStore`) powers Bloop's opt-in durability (B4).

### 3.3 The `neuroProfile` axis (design resolution of novelty-vs-sameness)

`NeuroProfile` joins `ageMode` as a **resolver input** (never a component read). It selects presets: **autism** =
deterministic core, low novelty, no auto-advance, sound/haptics off, high predictability; **ADHD** = brighter,
faster feedback, more variety; **both** = deterministic core + **opt-in, previewed** novelty layer. Per-child
override in the parent app. This is expressed entirely through `resolveCapabilities`/`resolveTokens`/
`resolveContent` — the existing machinery — never a fork.

### 3.4 Firestore data model (oversight system-of-record; on-device stays source of truth for the child core)

```
users/{parentUid}          role, email, consent records, FCM tokens, retention/locale config
children/{childId}         parentUid, displayName (first name only), neuroProfile, ageMode, sensory profile,
                           bloopEnabled, topicScope[], limits
  /settings/{doc}          per-child controls (mirror on-device settings for parent editing)
  /boards/{boardId}        parent-authored Board {id,name,parentId,symbolIds[],gridSize} + Symbol {...}; kid caches + renders offline
  /schedules/{scheduleId}  ordered steps (icon/photo/TTS/optional Storage video ref) + transition cfg
  /activity/{eventId}      mirrored kid-activity for monitoring (step-done, token, mood, break, AAC-utterance aggregate, routine completion)
  /transcripts/{turnId}    child text (PII-REDACTED) + moderation verdicts/scores + model + Bloop reply + flags; TTL-expiring; parent-readable
  /alerts/{alertId}        crisis/flag events (severity, transcript window, status) → FCM
config/{global}            moderation thresholds, scope categories, crisis-resource locale table
```
Firebase **Storage** holds parent-recorded model videos (A8). Security rules start from the donor's **locked
default** (`allow read, write: if false`) and open per-collection with parent/child ownership + guardian-link checks.

### 3.5 Invariants in the target (v1's, preserved + extended)

**Carried from v1:** anti-shame (no failure/streak-loss/guilt; companion never withers/frowns) · curated
autonomy (3/6 caps) · acquisition-only downgrade · **no raw `ageMode`/`neuroProfile` in components** · PIN-gated
sensitive actions · additive-only persistence (`SCHEMA_VERSION` 1, `MIGRATIONS` []) · TTS-everywhere · triple-coded
status · offline-first core.

**New for v2:** the ZERO-AI invariant is **replaced** by *"AI only via the server proxy behind the mock-first
seam; the on-device core has no model in the loop"* · **no-egress now holds for the app trees only** (egress lives
solely in `functions/`, kept out of every client bundle) · **PII redacted before storage** · **TTL retention** ·
**no ad/analytics SDKs in the kid app** · LLM provider bound as a **non-training processor** · Bloop's character
layer is 100% deterministic; the model is never the safety boundary (output shield is the defense that holds) ·
crisis = pre-written human-reviewed region-localized resource + parent alert (never a bare refusal or a
model-invented number).

### 3.6 Evidence-honesty (hard copy constraints, enforced like v1's copy gates)

Build **generic mechanisms**; ship no efficacy claim for Zones-of-Regulation™ or Social-Stories™ (not EBPs), no
AAC speech-gain promise (promise *communication access*), no sensory-integration/therapy/cure claims. AAC / visual
schedules / first-then / token economy = strong evidence, stand on the practice not the product. Scaffolds, not
therapy. This is enforced via the same grep/copy-gate discipline as `BANNED_REMINDER_PATTERNS`.

---

## 4. THE GAP LIST — everything net-new (mapped to feature-matrix rows + donors)

Legend: **reuse-v1** = extends a shipped engine · **new** = net-new · donors under `_sources2/` ·
effort L/M/H. Feature IDs reference `01-v2-feature-matrix.md`.

### 4A. Monorepo + tooling gaps (do FIRST)
- **G0.1** Root workspaces + hoisted lockfile + `tsconfig.base.json` path aliases (§2). **new · L**
- **G0.2** `git mv tiny-bubbles → apps/kid`; monorepo Metro config (§2.1). **reuse-v1 · L**
- **G0.3** `packages/shared` scaffold + first extraction (`types`, board/emotion schema, storage-port iface). **new · M**
- **G0.4** Retarget `no-network.test.ts` to app trees; exclude `functions/`; extend migration fixture per new slice. **reuse-v1 · L**

### 4B. Autism module (net-new kid scope; reuses v1 engines) — feature-matrix §A
- **G-A1 AAC communication board** — core-vocab tiles + custom photo/record, tap→TTS, folders, offline, ≤1 tap.
  Donors: `aac-native` (MIT: `data/images/`, `data/languages/card_*.json`, `api.js` TTS, `components/{card,announcer,speaking}.js`),
  `speakeasy-aac` (MIT: `src/types/index.ts` `Symbol`/`Board`, `src/stores/boardStore.ts`). **Verify symbol-art
  license; ship a cleared set.** New `tb/boards` slice; reuses `tts.ts`. **new · H**
- **G-A2 Visual schedule builder + player** — parent-authored, "now/next" always visible. Reuse v1 `TaskRunner`
  + daypart engine; `speakeasy-aac` Board model (ordered `symbolIds[]`). New `tb/schedules` slice. **reuse-v1+new · M**
- **G-A3 First-Then card** — **reuse `src/domain/plans.ts` + `planStore` re-skinned**; `speakeasy-aac` 2-cell board. **reuse-v1 · L–M**
- **G-A4 Transition warnings + priming** — **reuse `src/domain/timer.ts` + `VisualTimer.tsx`**; add advance-warning/no-auto-advance layer. **reuse-v1 · L–M**
- **G-A5 Sensory profile + low-stim mode + break button** — extend v1 settings resolver + breathing/soundscapes;
  `stillwave` (MIT: `engine/haptics.ts`, `constants/theme.ts` low-arousal tokens). New per-child sensory field group. **reuse-v1+new · M**
- **G-A6 Non-reading-first predictable UI** — **reuse theme resolvers + `ModeKeyed` copy + `tts.ts`; add `neuroProfile` axis**; `stillwave` pastel tokens. **reuse-v1 · M**
- **G-A7 Emotion identification + strategy menu** — **extend v1 `mood-checkin`/`moodInsight`**; `feelings-wheel` (MIT data) taxonomy → typed `EMOTIONS`. Generic mechanism, **not** Zones™. **reuse-v1+new · M**
- **G-A8 Video modeling on steps** — camera (`expo-image-picker`, shipped) + **Firebase Storage**; play in A2 step. **new · M**
- **G-A9 Social narratives builder** — reuse board/step model + TTS; **Bloop draft with parent-approval gate** (the safe LLM use). **reuse-v1+new · M**
- **G-A10 Guided movement / wiggle break** — extends A5 + focus-break catalog; optional Lottie/Rive prompt. **reuse-v1+new · L–M**
- Later: **A11** AAC-beyond-requesting, **A12** work-system view, **A13** parent AAC analytics.

### 4C. Bloop (companion + safe chat) — feature-matrix §B
- **G-B1 Character layer (Rive)** — reactive state machine (idle-breathe/blink/tap-react/celebrate/mood-mirror/co-regulate), deterministic, always-on. Donors: `rive-react-native` (MIT), `lottie-react-native` (Apache-2.0), `moti`/Reanimated. **`BubbleBuddy.tsx` is the shipped offline/fallback character; bespoke `.riv` art required** (samples are demos; needs Expo dev client). **reuse-v1+new · H**
- **G-B2 Chat surface** — `react-native-gifted-chat` (MIT): `GiftedChat` + `QuickReplies` (kid-safe tap / AAC affordance) + `TypingIndicator`; `messages[]`→Firestore. UI shell only (safety = proxy). **new · M**
- **G-B3 Persona system prompt** — Personality/Environment/Tone/Goal/Guardrails; literal language, never needy/sad. Donor: `nemo-guardrails` `examples/bots/abc/prompts.yml` structure. **Behavioral spec, not a security boundary.** Lives in `functions/`. **new · M**
- **G-B4 Novelty/durability layer** — **reuse `questStore` (`tb/quests`) + `src/domain/{quests,novelty}.ts`**; opt-in previewed cosmetics only. **reuse-v1 · M**
- **G-B5 Sensory & autonomy panel** — **reuse settings resolvers + curated-autonomy caps + `VolumeSlider`/haptics**; per-channel toggles + Low-Sensory/Standard/Lively presets. **reuse-v1 · M**

### 4D. Guardrail proxy (all in `functions/`, TS) — feature-matrix §C
- **G-C1 Proxy skeleton** — App Check + `verifyIdToken` gate + settings load + rate-limit + provider-agnostic contract. Donors: `firebase-cloud-functions-typescript-example` (`functions/src/api/interceptors/verify-idtoken-interceptor.ts`, controller pattern), `llm-guard` `llm_guard_api/app/app.py` shape. **new · M**
- **G-C2 Input shield** — hygiene/invisible-unicode → deterministic blocklists → PII detect → injection classifier → topic-scope → crisis detect → optional LLM self-check. Donor: `llm-guard/llm_guard/input_scanners/*` (**port regex/substring 1:1 to TS**; delegate ML to GCP Model Armor/DLP), `nemo-guardrails` `self_check_input` + `library/gcp_moderate_text/actions.py`. **new · H**
- **G-C3 Model call** — Gemini Flash **explicit `BLOCK_LOW_AND_ABOVE` on all HarmCategories (default is OFF!)** / DeepSeek wrapped identically. Donor: `firebase-functions-samples/Node/remote-config-server-with-vertex/functions/index.js` (`@google-cloud/vertexai`); add DeepSeek branch + `nemo-guardrails` `library/llama_guard/` pre-screen. **new · M**
- **G-C4 Output shield** — toxicity/bias/sexual/violence → output ban-topics → PII-leak → malicious-URL strip → no-refusal→warm fallback → relevance/reading-level. **The defense that holds; TTS only voices moderated text.** Donor: `llm-guard/llm_guard/output_scanners/*`. **new · H**
- **G-C5 On-fail state machine** — REASK→REFRAIN→FILTER→CUSTOM(escalate); fail-safe. Donor: `guardrails-ai/guardrails/types/on_fail.py` `OnFailAction`. **new · M**
- **G-C6 Topic-scope allow-list** — off-scope → warm redirect before any model call; QuickReplies for young kids. Donor: `llm-guard` `ban_topics.py`, `nemo-guardrails` `library/topic_safety/`. **new · L–M**
- **G-C7 PII refusal both directions + data minimization** — redact before storing; vault if a name must pass. Donor: `llm-guard` `anonymize.py`/`sensitive.py`/`vault.py`; GCP DLP/Model Armor. **new · M**
- **G-C8 Crisis-escalation-to-parent** — recall-biased detect → **pre-written region-localized safe-messaging** (validate/hope/trusted-grown-up/resource card, no means, **no model-invented numbers**) → FCM alert + transcript window → escalation ladder; never bare-refuse, never secrecy. Donors: `firebase-cloud-functions-typescript-example` `event-triggers/by-document/*` (`onWrite`→alert), `firebase-functions-samples/Node/fcm-notifications/`. **Localize hotlines (988 = US; India + other locales need their own).** **new · H**
- **G-C9 Mock-first `bloopProvider` seam** — **mirror `src/services/purchases.ts`**: TS port + deterministic offline MOCK default + real-proxy impl; app tree stays green/offline/no-egress. **reuse-v1 · L–M**
- **G-C10 Adversarial red-team CI gate** — Safe-Child-LLM-derived cases + psychologist review of crisis copy. Write from scratch (PromptProof GPL = ref-only). **new · M**

### 4E. Firebase backend + Parent app — feature-matrix §D
- **G-D1 Parent auth + kid profiles under a verified parent** — custom claims `role: parent|kid`. Donor: `expo-firebase-boilerplate-v2` (MIT, **port JS→TS**, scrub demo creds): `scenes/{login,registration,initial}`, `routes/.../RootStack.js`. **new · M**
- **G-D2 COPPA consent gate** — verifiable consent before a child account; auth-blocking function. Donor: `firebase-functions-samples/Node/quickstarts/auth-blocking-functions/`. **new · M**
- **G-D3 Parent↔child link + real-time monitoring dashboard** — guardian-of link + live activity glance. Donor: `expo-firebase-boilerplate-v2` `follow/follower` + `context/UserDataContext.js`. Firestore `children/{id}/activity`. **new · M**
- **G-D4 Transcript visibility** — searchable, flags-highlighted, TTL, PII-redacted. Firestore `children/{id}/transcripts` from C4; `gifted-chat` `messages[]` serialized. **new · M**
- **G-D5 Controls** — Bloop on/off, topic scope, chips-vs-free-text, limits, retention, crisis locale → `children/{id}/settings`; proxy reads via C1. **new · M**
- **G-D6 Board/schedule/social-narrative authoring** — parent composes A1/A2/A3/A9. Donor: `speakeasy-aac` Board model + `boardStore` (Firestore-backed). **new · H**
- **G-D7 Persistent AI-disclosure + break nudges** — "Bloop is an AI helper, not a person or a doctor"; per-3h break reminder (**reuse the notifications copy gate**). **reuse-v1+new · L**
- **G-D8 Data rights + minimization ops** — parent review+delete; TTL auto-delete; **no ad/analytics SDKs in kid app**; LLM = bound non-training processor; written retention+security programs; locked-default rules. Donor: `firebase-functions-samples/Node/delete-unused-accounts-cron/` pattern. **new · M**
- **G-D9 Offline-first sync adapter** — **reuse `storage` port as source of truth**; thin Firestore mirror of selected slices up (monitoring) + pull parent-authored boards/schedules/settings down. Core AAC/schedule/first-then/emotion/token loop works with **network + LLM OFF**. **reuse-v1+new · M**
- **G-D10 Cross-platform + multilingual** — **reuse Expo/RN + `src/i18n/`**; `aac-native` `card_*.json` + `feelings-wheel` 5-lang taxonomy. **reuse-v1+new · M/locale**

### 4F. Build order (from `00-SYNTHESIS2.md` §6 / matrix roll-up)
Monorepo migration (G0.x) → backend + Parent shell + consent gate (D1–D3, D8) → autism core reusing v1 engines
(A1→A2→A3→A7→A5) → Bloop character layer (B1–B2, deterministic, no LLM) → Bloop proxy behind the mock-first seam
(C9→C1→C2→C3→C4→C5→C8), ship mock-first then wire Gemini → monitoring/transcripts/alerts/controls (D4–D7) →
harden (C10 red-team CI, TTL/retention D8, security rules, App Check, psychologist review of crisis copy).

---

## 5. One-line takeaway

v2 is a **monorepo lift of the intact green v1 kid app** (`apps/kid`) with three additive surfaces bolted on a
shared spine — an autism module that **re-skins v1 engines** (plans→first-then, timer→transitions, mood→emotion-ID,
breathing/soundscapes→sensory break), a **two-layer Bloop** (the shipped deterministic `BubbleBuddy` character +
an off-by-default chat behind a mock-first `bloopProvider` seam), and a **Firebase backend + Parent app** for
consent/monitoring/authoring — where the server-side output shield, not the model, is the safety boundary, the
on-device `storage` port stays the child's source of truth, and every v1 invariant (anti-shame, no-egress-in-the-app,
additive persistence, no-raw-`ageMode`) carries forward intact while `SCHEMA_VERSION` stays **1**.
