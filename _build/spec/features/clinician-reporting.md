# Feature Spec — Clinician Reporting, Print/Share & Local Backup (`clinician-reporting`)

*Feature-complete DELTA spec. Baseline: `_build/spec/01-current-state.md` (app is green — `npx tsc --noEmit` = 0, `npx jest` = 34 suites / 335 tests). This spec is additive; it does not rewrite the shipped core loop, daypart engine, or persistence layer. Written to be built recursively by an ordinary build-agent — every path is real, every signal it reads already exists in the code.*

**Stack (locked, verified against `tiny-bubbles/package.json`):** Expo SDK ~56.0, RN 0.85.3, React 19.2.3, TS ~6, zustand ^5, date-fns ^4 (+ date-fns-tz ^3), NativeWind ^4, react-native-svg 15, reanimated 4.3, `@react-native-async-storage/async-storage` 2.2 (behind the `storage` port). **Offline, no cloud, no accounts.** ZERO AI. Anti-shame. Expo-Go-compatible, web-safe (subset).

> **BUILD-AGENT NOTE — PINNED OFFLINE API (no web-docs fetch required):** to keep M-D1 buildable by an offline build-agent, this spec **pins the exact stable API surface** rather than asking the agent to read versioned web docs. Use the **`expo-file-system/legacy`** module — it is shipped and stable in SDK 56 and fully sufficient here: `import { readAsStringAsync, writeAsStringAsync, deleteAsync, cacheDirectory, documentDirectory } from 'expo-file-system/legacy';`. For print/share use `import * as Print from 'expo-print';` (`printToFileAsync({ html })` → `{ uri }`; `printAsync({ html })`) and `import * as Sharing from 'expo-sharing';` (`isAvailableAsync()`, `shareAsync(uri)`), and `import * as DocumentPicker from 'expo-document-picker';` (`getDocumentAsync({ type: 'application/json' })`). §6 gives the literal call for each of `exportBackup`/`importBackup`/`shareReportPdf`. Do **not** make the build depend on fetching external docs; the legacy module signatures above are the contract.

---

## 1. Overview + user value

This feature is the **offline replacement for a cloud portal** (locked decision: no server). It ships three parent/clinic-facing, on-device capabilities, all behind the existing parent gate:

1. **On-device progress report** — a calm, non-diagnostic summary of what a child actually did over a window (7 / 30 days): routines/steps completed, bubbles (tokens) earned, forgiving streak status (streak-safe framing), and — only if the parent opted in — a gentle mood trend. Rendered from the **same durable signals the kid loop already writes** (token ledger, routine runs, `ProgressState`, opt-in `MoodLog`).
2. **Printable / shareable summary** — the report rendered to a **PDF via `expo-print`** (on-device HTML→PDF, no network) and handed to the OS **share sheet / print dialog** (`expo-sharing` / `expo-print`), so a caregiver can hand a clinician a one-page summary at an appointment.
3. **Local data backup / restore** — export **every `tb/` slice** to a single JSON file (share/save) and import it back, validated through the existing repair pipeline before it touches disk. This is data ownership + device-migration for a no-account product.

### Why (honest market / community / science grounding)

- **Clinician trust is a marketing/trust asset, never a treatment claim.** Research is explicit: token economies + behavioral parent training have their strongest, guideline-grade evidence on *behavior, routines, and the parent-child relationship* — NOT on core-symptom cure (`00-SYNTHESIS.md` §3, §4 pitfall 6; fact-check `token-economy`, `parent-training`). A shareable summary of *observed routine behavior* is exactly the honest, defensible artifact a clinician can use — and it lets us treat clinical evidence as a trust asset without a payer dependency (`01-feature-matrix.md` #25; `00-SYNTHESIS.md` §3 "HSA/FSA / published study" as a *trust*, not *payer*, play).
- **Reduce parent/verification burden, don't add to it.** The report is auto-derived — zero data entry. This directly serves the documented parent-burden failure mode (`00-SYNTHESIS.md` §6 risk 3; `01-feature-matrix.md` #17).
- **Privacy-forward is a feature in a low-trust category.** The whole corpus flags surprise-cloud-upload and billing dark patterns as top churn drivers; "no data leaves the device" is a trust differentiator (`00-SYNTHESIS.md` §4 pitfalls 4/6; §5 "offline-first / no backend is the right posture for a children's product"). Local backup/restore is the offline-first analogue of "your data" without ever building a server.
- **Anti-shame framing is non-negotiable in what we *report*.** The report must never surface a "0-day / broken streak" or a "missed/failed" count — it uses the existing forgiving selectors (`streakDisplay`, cumulative "bubbles popped"), so the report itself can't reintroduce the shame the product structurally forbids (`00-SYNTHESIS.md` §4 pitfall 1; `61-design-system.md` §12).

---

## 2. UX behavior, screen-by-screen

All three surfaces live **inside `(parent)`**, which is reachable only through `(gate)/parental-gate` (the guard in `app/(parent)/_layout.tsx` on `sessionStore.parentUnlocked`, cleared on app-background by the root layout). There is **no kid-facing surface** in this feature — clinician reporting is a grown-up tool. Parent surfaces are the dense/utilitarian half of the bifurcation and use the parent `ui.tsx` kit (`Card`, `SectionTitle`, `SettingRow`, `TextButton`, `PrimaryButton`, `Note`, `Segmented`, `Divider`) and `useThemeTokens()`. **No parent screen branches on raw `ageMode`** — it uses `ageModeLabel()` (doc 66 §2 golden rule).

### 2.1 Entry points

- **Dashboard row (primary).** Add a `SettingRow` to the management `Card` in `app/(parent)/dashboard.tsx` (the card that already lists Children / Tasks / Rewards / Settings): `icon="📄" label="Progress report" hint="A calm summary to view, print or share"` → `router.push("/(parent)/report")`.
- **Settings "Your data" card (backup/restore).** Extend the existing `Your data` `Card` in `app/(parent)/settings.tsx` (which today holds "Review what's stored" + delete). Add two rows under a new `SectionTitle`: **"Back up to a file"** (export) and **"Restore from a file"** (import). Keep the existing on-device JSON review + delete rows unchanged.

### 2.2 Report screen — `app/(parent)/report.tsx`

Layout, top → bottom (one `ParentScreen title="Progress report"`):

1. **Range toggle** — a `Segmented<ReportRangeKey>` with `{ value:'7d', label:'7 days' }` and `{ value:'30d', label:'30 days' }`. Default `7d`. (Extended ranges are premium — see §2.5.)
2. **Child selector** — when >1 non-archived child in `useChildStore().index`, a `Segmented` of child names picks the subject; single-child skips this. Default = `meta.activeChildId` if present else first.
3. **Honest header note** — a fixed `Note`: *"A summary of routines and bubbles at home. This is not a medical assessment or a diagnosis."* (This is the anti-over-claim guardrail, `00-SYNTHESIS.md` §4 pitfall 6.)
4. **Summary cards** built from `buildReport(...)` (§3.2):
   - **Routines & steps** — "Steps completed: N", "Routines finished: M", plus a per-daypart mini-breakdown (Morning / Afternoon / Evening) using `summarizeDayparts`-style counts aggregated over the window. Framed as *"days active: K of 7"* — never "K missed".
   - **Bubbles (tokens)** — "Earned this period: N 🫧", "Lifetime earned: L". Uses ledger `entries` filtered to the window for the period figure; `lifetimeEarned` for lifetime.
   - **Streak (streak-safe)** — driven by `streakDisplay(progress)`: if `active` → "Active days in a row: D (best ever: B)"; if `resting` → leads with "Bubbles popped so far: C" + "Best run: B", and shows **"resting"** (never "0", never "broken"). See §7.
   - **Rewards** — count of `RedemptionRequest` with `status` in `approved|fulfilled` in the window ("Rewards enjoyed: R"). Declined/canceled are **not** surfaced as negatives.
   - **Mood trend (conditional)** — rendered ONLY when `parentSettings.moodLoggingEnabled === true` AND the child has `MoodLog` entries in the window. A compact tally of the 4-level mood (`rough/okay/good/great`) + an optional energy average expressed against the log's **`energyScaleMax`** (3 for young / 5 for older, arch §6-C12 / mood-checkin §3) — NOT the stale "0–10" scale. Normalize each log by its own `energyScaleMax` before averaging so a young↔older switch mid-window doesn't distort the mean (display e.g. "avg energy 3.4 / 5"). If mood logging is off, this card is **absent** (never an empty/locked teaser). **No interpretation** — counts/averages only, never an emotional label (mood-checkin §7 / §6.1 below).
5. **Actions row** — two `PrimaryButton`s: **"Share / Print"** (calls `shareReportPdf` → `printReport` fallback) and **"Save a copy"** (share the PDF file). On web these degrade (§6.4).
6. **Footer** — `Note`: *"Everything here was built on this device. Nothing is uploaded."*

Empty/edge state: a brand-new child with no completions renders the cards with zeros framed **forwardly** — "No steps yet — the report fills in as your child pops bubbles." Never a scolding empty state.

### 2.3 Backup / restore flow (in Settings "Your data")

- **Back up to a file** → calls `exportBackup()` (§3.4): reads every `tb/` key via the `storage` port, builds a `BackupFile` envelope, writes it to a cache file `tiny-bubbles-backup-YYYY-MM-DD.json`, and hands it to `Sharing.shareAsync(uri)`. Shows a `Note` confirming "Backed up N items" and (optionally) stamps `parentSettings.lastBackupAt`.
- **Restore from a file** → calls `importBackup()` (§3.5): `DocumentPicker.getDocumentAsync({ type: 'application/json' })` → read the file → parse → validate the envelope → per-store repair through the existing invariants → **confirmation gate** (a `confirmRestore` state showing "This replaces the data on this device with the backup. N children, M tasks…") → on confirm, write each store via `setState` (persist middleware writes disk) → set active child → success `Note`. On any validation failure it shows a gentle `Note` ("That file couldn't be read as a Tiny Bubbles backup — nothing was changed.") and **touches nothing**.
- **PIN posture (child-safety — STRENGTHENED).** Export, restore-replace, and delete-all are the **most sensitive actions in the app** — they move or destroy the entire family's mood logs, behavioral history, ledgers, and photo URIs. They must therefore demand the **parent PIN**, not merely the math/long-press *entry* challenge (a child who passes the entry challenge must NOT be able to export the whole dataset to the OS share sheet, or destructively restore/wipe from a foreign file). Route all three through the **PIN challenge**, reusing the existing purchase-PIN posture: `goToParentGate({ mode: 'sensitive' })` (a new gate mode that, like `mode:'purchase'`, requires the salted-SHA256 PIN via `parentGate.ts` `effectiveGateMode`; if no PIN is set, route to set one — same `pin-missing` handling as purchase). The mandatory confirm-replace step for restore is **in addition** to the PIN. Export and delete-all likewise pass the PIN before executing. (Implementation: add `'sensitive'` to the gate's mode union alongside `'purchase'`, mapping to the same PIN requirement in `assertProductionGateMode`/`effectiveGateMode`; `settings.tsx`'s existing delete-all row moves under the same PIN gate.)

### 2.4 YOUNG vs OLDER age-mode differences (via capability flags / resolvers, never raw `ageMode`)

The report is parent-facing, so its chrome is always the dense parent theme. Age-adaptation shapes **content selection** through resolved flags read from the subject child's settings:

- **`showNumbersAndCharts` (older default true / young default false)** decides the *chart depth*. For an **older** child the report includes the per-daypart bar-style breakdown and the mood/energy tally. For a **young** child the report leads with **counts + emoji** and **omits the numeric mood-energy chart** (young capability keeps mood off by default anyway), keeping it glanceable. The parent can still read raw numbers in both — the flag only gates the *chart-y* extras, matching how `GoalBar`/insights are gated elsewhere.
- **`moodCheckin` (older opt-in / young off)** + `moodLoggingEnabled` together decide whether the mood trend card can appear at all (young children realistically won't have mood data; the card simply doesn't render).
- **`ageModeLabel(profile.ageMode)`** is printed in the report header ("Younger" / "Older") so the clinician has context — the ONLY place age surfaces, and it goes through the resolver, never a raw string.
- No `ageMode` prop is passed to any component; the report screen reads `caps = resolveCapabilities({ ageMode, ...profile.settings })` (or the `useCapabilities()` hook scoped to the subject child) exactly like the kid surfaces.

### 2.5 Low-stim / calm variants + premium gating

- **Calm-path child (`settings.calmMode === true`, or `sensoryMode==='lowStim'`, or global `lowStimTheme`):** the report **suppresses streak/token *prominence*** to match the non-gamified path — it leads with **cumulative "bubbles popped" and routines completed**, and renders the streak line as plain "resting/active" text with no ring/number emphasis. Tokens are still shown (they exist under the hood) but framed as a quiet count, never a scoreboard. This mirrors how the kid calm path hides gamified intensity while keeping the routine record.
- **Parent theme low-stim:** the screen chrome already desaturates via `resolveTokens` when `lowStimTheme`/reduced-motion is on; no per-screen work — just use `useThemeTokens()`.
- **Premium (extended insights):** the **basic 7-day single-child report + PDF share + full backup/restore are FREE** (see §9). The **`advancedInsights` feature flag** (already in `FEATURE_GATES`) gates the *extended* range set (30-day is free; **90-day / custom range** + **per-routine breakdown** + **multi-child combined report**). When not premium, the 30-day toggle is free but a "90 days" option shows a small "✨ Plus" affordance routing to `goToPaywall` — never a locked/greyed core artifact. Free tier gets a genuinely useful report (research: the free tier must actually work, `00-SYNTHESIS.md` §3).

---

## 3. Data-model additions (exact TS types/fields + which store + migration)

**This feature is >90% READ-ONLY over existing signals.** The only persisted addition is one optional, additive field. Everything else is non-persisted derived/transport types.

### 3.1 Persisted additions (settingsStore → `tb/settings`)

Add ONE optional field to `ParentSettings` in `src/domain/types.ts` (additive, non-breaking):

```ts
export interface ParentSettings {
  // ...existing fields...
  /**
   * Epoch ms of the last successful local backup export (doc: clinician-reporting).
   * Optional + additive: absent on all pre-existing persisted settings and filled
   * by `mergeWithDefaults`, so NO schema bump / migration is required. Display-only
   * ("last backed up …"); never gates anything.
   */
  lastBackupAt?: EpochMs;
}
```

- Set in `settingsStore.updateParentSettings({ lastBackupAt: now() })` from the export action.
- `defaultParentSettings` in `src/domain/constants.ts` may leave it `undefined` (omit) — the `?` + `mergeWithDefaults` handle absence. Do NOT add it as a required default that forces a bump.

**Migration note:** because the field is optional and filled by `mergeWithDefaults` (see `src/storage/migrations.ts`), **`SCHEMA_VERSION` stays 1** and `MIGRATIONS` stays empty — this follows the exact additive-only pattern doc 70 used for `Routine.daypart`. If a *future* change makes it required, add a `{ from, to, migrate }` entry (the engine is ready).

### 3.2 Report model (pure, non-persisted) — `src/domain/report.ts`

```ts
export type ReportRangeKey = "7d" | "30d" | "90d"; // 90d is premium (advancedInsights)

export interface ReportRange {
  key: ReportRangeKey;
  /** inclusive window start (epoch ms) */
  startTs: EpochMs;
  /** window end (epoch ms) — usually `now` */
  endTs: EpochMs;
  /** ISO day of startTs/endTs in the child's tz (for header + day math) */
  startDay: IsoDay;
  endDay: IsoDay;
}

export interface DaypartTally {
  daypart: "morning" | "afternoon" | "evening";
  stepsDone: number;
}

export interface MoodTally {
  counts: Record<Mood, number>;        // rough/okay/good/great
  energyAvg: number | null;            // null when no energy logged; averaged AFTER normalizing each
                                       //   log by its own energyScaleMax (3 young / 5 older, C12)
  energyScaleMax: number;              // the scale to display against (default 5); never the stale 0–10
  samples: number;
}

/** Everything the report/PDF renders — fully derived, nothing persisted. */
export interface ReportModel {
  childDisplayName: string;
  ageModeLabel: string;                // via resolveContent.ageModeLabel — never raw
  calmPath: boolean;                   // calmMode || lowStim (drives streak-safe framing)
  range: ReportRange;
  stepsCompleted: number;              // TokenEntry reason 'task_complete' in window
  routinesFinished: number;            // RoutineRun.allDone in window
  tokensEarnedInPeriod: number;        // sum of positive ledger deltas in window
  lifetimeEarned: number;
  daysActive: number;                  // distinct ISO days with >=1 completion
  daysInRange: number;                 // 7 / 30 / 90
  daypartBreakdown: DaypartTally[];    // only populated when showNumbersAndCharts
  streak: StreakDisplay;               // reuse src/domain/streaks.ts streakDisplay()
  cumulativeBubbles: number;           // progress.cumulativeCount (never decreases)
  rewardsEnjoyed: number;              // redemptions approved|fulfilled in window
  mood: MoodTally | null;              // null unless moodLoggingEnabled && has data
  generatedAt: EpochMs;
}

export interface BuildReportInput {
  profile: ChildProfile;
  ledger: TokenLedger;
  progress: ProgressState;
  runs: RoutineRun[];
  redemptions: RedemptionRequest[];
  moods: MoodLog[];
  moodLoggingEnabled: boolean;
  showNumbersAndCharts: boolean;       // from resolveCapabilities
  range: ReportRange;
  now: EpochMs;
}

export function makeRange(key: ReportRangeKey, now: EpochMs, tz: string): ReportRange;
export function buildReport(input: BuildReportInput): ReportModel; // PURE, deterministic
```

**Signal sources (all already written by the shipped core loop):**
- `stepsCompleted` / `tokensEarnedInPeriod`: filter `ledger.entries` (each `TokenEntry` has `ts`, `reason`, `delta`) to `startTs..endTs`. Steps = entries with `reason === 'task_complete'`. Tokens earned = sum of positive `delta` for earn reasons (`task_complete|routine_complete|cadence_bonus|streak_bonus|parent_gift`). **Cap awareness:** `ledger.entries` is capped at `LEDGER_ENTRY_CAP` (500). A 7/30-day window is well within cap for normal use; `buildReport` must degrade gracefully (a truncated history simply undercounts far-back days) and the PDF footnotes "based on the most recent activity on this device" when the oldest entry `ts > startTs`.
- `routinesFinished`: `taskStore.runs[cid]` filtered to window where `allDone === true`. (`runs` capped at `RUNS_CAP` 500 — same footnote rule.)
- `daysActive`: distinct `isoDay(entry.ts, tz)` among in-window completions.
- `streak` / `cumulativeBubbles`: `streakDisplay(progress)` + `progress.cumulativeCount` (never zeroable — see `src/domain/streaks.ts`).
- `rewardsEnjoyed`: `rewardStore.redemptions[cid]` with `decidedAt`/`fulfilledAt` in window and `status ∈ {approved, fulfilled}`.
- `mood`: `childStore.moods[cid]` in window, only when `moodLoggingEnabled`.
- `daypartBreakdown`: only when `showNumbersAndCharts` — bucket in-window `task_complete` entries by the routine's daypart (join `refId`→task→`routineDaypartOf`); when the join is unavailable (task archived) bucket as "other" and omit.

`buildReport` is **pure + deterministic** (`now`/`tz` passed in, no clock, no RNG) so it is unit-tested exactly like the other `src/domain` functions.

### 3.3 Report HTML (pure) — `src/services/reportHtml.ts`

```ts
export function renderReportHtml(model: ReportModel): string; // pure string, no network, no AI
```

Produces a **self-contained HTML string** (inline `<style>`, system fonts, no external URLs, no `<script>`) for `expo-print`. Anti-shame copy baked in (no "missed/failed/0"). Includes the honest non-diagnostic disclaimer and a "Generated on-device by Tiny Bubbles · not a medical assessment" footer. Kept pure so it is snapshot-testable.

### 3.4 / 3.5 Backup transport types (non-persisted) — `src/services/backup.ts`

```ts
export const BACKUP_FORMAT = "tiny-bubbles-backup" as const;

export interface BackupFile {
  app: typeof BACKUP_FORMAT;
  schemaVersion: number;          // SCHEMA_VERSION at export time
  exportedAt: EpochMs;
  /** raw persisted envelopes keyed by tb/ key, e.g. { "tb/settings": {state,version}, ... } */
  slices: Record<string, unknown>;
}

export interface ExportResult { fileUri: string; itemCount: number; keys: string[] }
export type ImportResult =
  | { ok: true; counts: { children: number; tasks: number; rewards: number; companions: number } }
  | { ok: false; reason: "not_a_backup" | "unreadable" | "empty" | "canceled" };

export async function collectTbSlices(): Promise<Record<string, unknown>>; // read all tb/ keys via storage port
export function buildBackupFile(slices: Record<string, unknown>, now: EpochMs): BackupFile;
export function validateBackupFile(parsed: unknown): parsed is BackupFile;   // shape guard
export function repairBackupSlices(file: BackupFile): Record<string, unknown>; // per-store invariant repair
export async function exportBackup(): Promise<ExportResult>;                 // collect→build→write→share
export async function importBackup(): Promise<ImportResult>;                 // pick→read→validate→repair→apply
```

**Critical implementation detail (do not skip):** the *actual* persisted layout is **one envelope per zustand store** (`tb/settings`, `tb/children`, `tb/tasks`, `tb/rewards`, `tb/buddy`, `tb/runProgress`), each shaped `{ state: <partialized store>, version: number }`. This is **NOT** the theoretical `RawState` (`meta/childIndex/children`) that `migrations.ts#validateAndRepair` was written against. Therefore `repairBackupSlices` must map the **primitive** repair fns from `src/storage/migrations.ts` across the **real** store shapes:
- `tb/children.state`: `repairLedger` over each `ledgers[cid]`, `repairProgress` over each `progress[cid]`.
- `tb/buddy.state`: `repairCompanion` over each `companions[cid]`.
- `tb/tasks.state`: `repairTask` over each `tasks[cid][]`.
- `tb/settings.state`: leave as-is (no invariant-bearing numeric fields beyond gate/entitlement).
Reuse the exported helpers (`repairLedger`, `repairProgress`, `repairCompanion`, `repairTask`, `safeParse`, `clone`) — do NOT reinvent them. Apply on import (defense against a hand-edited or cross-version file), never zeroing anything (non-punishing).

**Apply on import** = for each known store key, `useXStore.setState(imported.state)` (mirrors `wipeAllChildData`'s `setState` approach in `gameplay.ts`), then `settingsStore.setActiveChild(...)` to a valid child. The persist middleware writes each slice to disk. Unknown/extra `tb/` keys in the file are written back verbatim via the `storage` port (forward-safe). If `file.schemaVersion < SCHEMA_VERSION`, run each store envelope's `version` through the (currently empty) `MIGRATIONS` chain per-store before `setState`.

**Reconcile in-memory + device-local state after `setState` (do not skip — a restore that only writes the persisted stores leaves stale in-memory pointers and a stale OS notification):**
- **In-memory stores** — clear `sessionStore` (`activeRunId = null`, `parentUnlocked` stays as-is or is re-locked) and `focusSessionStore` (`session = null`) after apply, because the restored `tb/runProgress`/child data may not contain the run those in-memory pointers referenced (a dangling `activeRunId`/focus session would point at a run that no longer exists). The kid home re-derives the active daypart run from the restored stores on next render.
- **Delete outgoing photo files** — before overwriting `tb/tasks`, `deletePhoto` (verify-undo §CREATE) every current `photoUri` on the device so restore-replace doesn't orphan the old device's photos; the restored `photoUri`s point at files that don't exist on this device and render nothing (arch §6-C9 / verify-undo §2.4).
- **Re-derive the trial-end reminder** — the restored `tb/settings` carries `Entitlement.trialEndReminderAt`/`trialEndsAt`, but the actual **OS-scheduled** device-local notification is NOT in the backup. After apply, re-run the billing reminder sync (`scheduleTrialEndingReminder`/`cancelTrialEndingReminder`, billing §2.4) from the restored entitlement so a restored live trial re-schedules its (generic, parent-only) reminder and a restored free/expired entitlement cancels any stale one. `app/_layout.tsx`'s existing trial-reminder effect will also re-sync on next open; the import path triggers it explicitly so it's immediate.

---

## 4. Files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE

| Path | Purpose |
|---|---|
| `src/domain/report.ts` | Pure `buildReport` + `makeRange` + report types (§3.2). RN-free, unit-tested. |
| `src/services/reportHtml.ts` | Pure `renderReportHtml(model)` HTML string generator (§3.3). |
| `src/services/report.ts` | `shareReportPdf(model)` / `printReport(model)` — wraps `expo-print` (`printToFileAsync`/`printAsync`) + `expo-sharing`. The ONLY module importing print/share. Web-degrades (§6.4). |
| `src/services/backup.ts` | Export/import (§3.4/§3.5): collect `tb/` slices, build/validate/repair envelope, write/read file, apply via store `setState`. Imports `expo-file-system`, `expo-sharing`, `expo-document-picker`. |
| `app/(parent)/report.tsx` | The report screen (§2.2). Parent-gated (auto under `(parent)`). |
| `__tests__/domain/report.test.ts` | `buildReport`/`makeRange`: window filtering, streak-safe framing, calm-path, mood conditional, cap-truncation footnote flag, zero-completions forward framing. |
| `__tests__/services/backup.test.ts` | Round-trip export→import equality; corrupt/foreign file rejected without touching stores; repair coerces a hand-edited negative balance / bad mood on import; version guard; **restore reconciles in-memory `sessionStore`/`focusSessionStore` (both cleared) + re-derives the trial reminder** (§3.5). **Must `jest.mock()` the four native modules** — `expo-file-system` (**and `expo-file-system/legacy`**), `expo-print`, `expo-sharing`, `expo-document-picker` — with stub impls (mirroring how `notifications.test.ts` mocks `expo-notifications`), so `backup.ts`'s native imports don't fail under `jest-expo`. `reportHtml.ts`/`report.ts` domain paths are pure and need no mock. |
| `__tests__/services/reportHtml.test.ts` | Snapshot: no banned words (`missed`/`failed`/`broken`/`0-day`), disclaimer present, no external URL / `<script>`. |

### MODIFY

| Path | Change |
|---|---|
| `package.json` | Add deps: `expo-print`, `expo-sharing`, `expo-file-system`, `expo-document-picker` (install via `npx expo install …` so SDK 56-pinned). |
| `src/domain/types.ts` | Add optional `ParentSettings.lastBackupAt?: EpochMs` (§3.1). |
| `app/(parent)/dashboard.tsx` | Add the "Progress report" `SettingRow` → `/(parent)/report` in the management `Card`. |
| `app/(parent)/settings.tsx` | Extend the "Your data" `Card`: a `SectionTitle "Backup & restore"` + "Back up to a file" (calls `exportBackup`) + "Restore from a file" (calls `importBackup` with the confirm-replace gate). Add a "last backed up …" `Note` when `lastBackupAt` set. |
| `THIRD_PARTY_NOTICES.md` | Add the four new Expo modules (all MIT, © Expo/650 Industries) under the runtime-deps section. |
| `src/services/index.ts` *(if it exists / barrel)* | Re-export `report`/`backup` if the services use a barrel; otherwise import directly (check the repo — services are imported by direct path today). |

**No new route registration needed:** `app/(parent)/_layout.tsx` renders a bare `<Stack>`; expo-router auto-discovers `report.tsx` as a file route. `app.json` needs **no** new config plugin — all four modules are Expo-Go-bundled and plugin-free for this usage (verify against v56 docs per §6.1).

---

## 5. Reused prebuilt libraries (prefer existing; new libs justified)

**Existing (no new dep):**
- `src/storage/storage.ts` `storage` port (`getAllKeys`/`getString`/`set`) — the backup export/import IO seam; already AsyncStorage-default + web-shimmed + MMKV-swappable.
- `src/storage/migrations.ts` `repairLedger`/`repairProgress`/`repairCompanion`/`repairTask`/`safeParse`/`clone`/`mergeWithDefaults` — import validation/repair (do not reinvent).
- `src/domain/streaks.ts` `streakDisplay` — streak-safe framing.
- `src/domain/progressMeter.ts` `bubblesUntil` (if a "toward reward" line is wanted) — reuse, don't reimplement.
- `src/domain/tasks.ts` `summarizeDayparts` / `routineDaypartOf` — daypart breakdown.
- `src/domain/dates.ts` `isoDay`/`diffDays` — window/day math.
- `src/services/entitlements.ts` `FEATURE_GATES.advancedInsights` + `useIsPremium` — premium extended-range gate; `components/parent/PremiumGate.tsx` `goToPaywall` — the ✨ Plus affordance.
- `components/parent/ui.tsx` kit + `useThemeTokens` — all screen chrome.
- `src/theme/resolveContent.ts` `ageModeLabel` + `resolveCapabilities` — age-adaptive content selection, no raw `ageMode`.

**NEW (all first-party Expo, MIT, Expo-Go-compatible, no config plugin, no network):**
- **`expo-print`** — on-device HTML→PDF (`printToFileAsync`) + native print dialog (`printAsync`). The only sane offline "printable summary" path; generates a real PDF with zero server. Web: `printAsync` uses the browser print dialog.
- **`expo-sharing`** — hands the PDF / backup file to the OS share sheet (`shareAsync`). `isAvailableAsync()` guards platforms where sharing is absent.
- **`expo-file-system`** — write the JSON backup to a cache file and read an imported file. **PINNED: use `expo-file-system/legacy`** (`writeAsStringAsync(uri, str)` / `readAsStringAsync(uri)` / `deleteAsync(uri, { idempotent: true })` / `cacheDirectory` / `documentDirectory`) — shipped + stable in SDK 56, no docs-fetch needed (the new `File`/`Paths` API is NOT required for read-string/write-string/temp-uri). Isolate ALL file/print/share/picker imports inside the single `src/services/report.ts` + `src/services/backup.ts` modules, behind `Platform`-guarded lazy access, so the web build degrades cleanly (§6.4) and no native module is imported at module scope on web.
- **`expo-document-picker`** — `getDocumentAsync({ type: 'application/json' })` to select a backup to restore.

Justification for four new libs: no existing dep can produce a shareable PDF or pick a file. All four are maintained by Expo, MIT-licensed, already in the Expo Go runtime for SDK 56, and require no custom native module — preserving the Expo-Go/offline constraints. Add to `THIRD_PARTY_NOTICES.md`.

---

## 6. Anti-shame + no-AI rules that apply

1. **ZERO AI.** The report is 100% deterministic aggregation + a fixed HTML template. No LLM, no "insight generation", no suggestions, no summary-writing model. `renderReportHtml` and `buildReport` contain no model calls and no network. (Grep gate: the feature's files import nothing from any AI/LLM/network SDK.)
2. **No shame in what we report.** The report NEVER prints `0`, "streak broken", "missed", or "failed". It uses `streakDisplay` (resting/active only) and leads with the monotonic `cumulativeCount`. A resting streak is framed "resting" with "best ever: N". Declined/canceled redemptions are omitted, not surfaced as negatives. Zero-completion children get forward framing ("fills in as your child pops bubbles"). Banned-word list enforced by `reportHtml.test.ts`.
3. **No over-claiming.** Every rendered report + the screen header carry the fixed non-diagnostic disclaimer ("not a medical assessment or diagnosis"). No symptom language, no "improvement %", no clinical thresholds. (`00-SYNTHESIS.md` §4 pitfall 6.)
4. **Privacy-forward / opt-in.** Mood data appears ONLY when `moodLoggingEnabled` is true and data exists. The report is generated on-device; the PDF/backup go only where the *parent* explicitly sends them via the OS share sheet. Nothing auto-uploads. Local-analytics event logging of "report_shared"/"backup_exported" happens ONLY if `localAnalyticsEnabled` (default off) — and those `ActivityEvent`s never leave the device (doc 66 §1b.12 invariant).
5. **Non-punishing restore.** Import repair only ever coerces corrupt values UP to safe positives (never zeroes a balance/streak) and blocks a bad file without mutating anything. A failed import changes nothing.
6. **Curated / parent-gated.** All three surfaces sit behind the existing parent gate; there is no child-facing report/export/import.

---

## 7. Acceptance criteria + verify steps

**Acceptance criteria**

- **Report content is correct + streak-safe.** For a seeded child with a known set of completions in the last 7 days, `buildReport` returns the exact step/token/routine counts; a child with a multi-day gap renders **"resting" + "best ever: N" + cumulative bubbles**, never "0"/"broken".
- **Age-adaptation via flags.** With `showNumbersAndCharts=false` (young) the daypart chart + mood-energy chart are omitted; with `=true` (older) they render — and no component reads raw `ageMode` (header uses `ageModeLabel`).
- **Calm/low-stim variant.** For a `calmMode`/`lowStim` child the report leads with cumulative bubbles + routines and de-emphasizes streak/tokens (no ring/scoreboard).
- **PDF + share work offline.** In airplane mode, "Share / Print" produces a PDF and opens the share sheet / print dialog (native); no network call is attempted.
- **Backup round-trips.** Export → wipe (or fresh install) → import the file → the app state (children, tasks, rewards, companions, ledgers, progress) matches the pre-export state (assert via `backup.test.ts` deep-equality after repair-normalization).
- **Import is safe.** A random/foreign JSON, an empty file, or a canceled picker leaves every store byte-identical (no `setState` called); a hand-edited backup with a negative balance / invalid mood imports with those values repaired to safe positives.
- **Sensitive actions demand the PIN.** Export, restore-replace, and delete-all each require the parent **PIN** (`mode:'sensitive'`, §2.3) — passing only the math/long-press entry challenge is NOT sufficient to reach them; restore additionally requires the confirm-replace step. (Assert the gate mode routes through the PIN posture.)
- **Restore reconciles runtime state.** After a restore, in-memory `sessionStore.activeRunId` and `focusSessionStore.session` are cleared, outgoing device photos are `deletePhoto`d, and the trial-end reminder is re-derived from the restored entitlement (§3.5).
- **Premium gate is non-punitive.** Free tier gets the 7-day and 30-day report + PDF share + full backup/restore; the 90-day option shows a ✨ Plus affordance (never a locked core artifact). Backup/restore and PDF are FREE regardless of tier.
- **Anti-shame + no-AI grep gates pass** (see verify).
- **No regressions.** `npx tsc --noEmit` = 0; existing 34 suites / 335 tests stay green.

**Verify steps an agent runs**

```bash
cd "tiny-bubbles"
# 1) install the four Expo modules (SDK-56 pinned)
npx expo install expo-print expo-sharing expo-file-system expo-document-picker
# 2) types + tests
npx tsc --noEmit
npx jest __tests__/domain/report.test.ts __tests__/services/backup.test.ts __tests__/services/reportHtml.test.ts
npx jest            # full suite stays green (>= 335 passing + new)
# 3) no-AI / no-network in the new feature files
grep -RInE "openai|anthropic|langchain|genai|fetch\(|axios|https?://" \
  src/domain/report.ts src/services/reportHtml.ts src/services/report.ts src/services/backup.ts app/\(parent\)/report.tsx \
  && echo "FAIL: network/AI ref in feature files" || echo "OK: offline + AI-free"
# 4) anti-shame: banned words never in the report template output
grep -RInE "missed|failed|broken|streak lost|0 days|0-day" src/services/reportHtml.ts \
  && echo "FAIL: shame word in report HTML" || echo "OK: anti-shame copy"
# 5) web subset still boots/navigates (report/backup are N/A-on-web per §6.4)
npx expo export --platform web
```

Manual device check (Expo Go, iOS + Android): open parent gate → dashboard → Progress report → toggle 7d/30d → Share/Print produces a PDF; Settings → Your data → Back up (share sheet appears, file saved) → Restore (pick the file, confirm, data replaced). Airplane mode throughout.

---

## 8. Dependencies on other feature specs + premium/free classification

**Depends on / interoperates with:**
- **`mood-checkin`** (sibling spec) — the report's mood-trend card reads the `MoodLog` data that spec produces, gated by the same `moodLoggingEnabled` + `moodCheckin` capability. If mood-checkin ships later, the report simply omits the mood card until then (graceful, no coupling break).
- **`multi-child`** (sibling spec) — the child selector + the premium "combined multi-child report" build on the existing multi-profile model; single-child works without it.
- **Existing shipped systems (hard deps, all present):** the token ledger / `RoutineRun` / `ProgressState` signals (childStore + taskStore), the `storage` port + `migrations.ts` repair fns, `streakDisplay`, `summarizeDayparts`, the parent gate + `(parent)` guard, `FEATURE_GATES.advancedInsights` + `goToPaywall`, `resolveCapabilities`/`ageModeLabel`.
- **Billing seam:** premium extended insights ride the existing MOCK entitlement (`isPremium`/`FEATURE_GATES`); real RevenueCat/StoreKit wiring stays a later step behind the same seam (locked decision) — this feature adds NO purchase code.

**Premium / free classification (core loop always free):**
- **FREE:** the on-device progress report (7-day + 30-day, single child), the PDF/print/share of that report, and **all** local backup/restore. Data ownership and clinician-trust artifacts are never paywalled (privacy-forward; `00-SYNTHESIS.md` §3 usable-free-tier rule).
- **PREMIUM (`advancedInsights`):** extended history (90-day / custom range), per-routine breakdowns, and the multi-child combined report. These are additive depth on top of a genuinely useful free report — and gating them never removes anything already generated/owned (doc 66 §1b.11).

---

## 9. Open assumptions

1. **`expo-file-system` API surface (SDK 56) — RESOLVED / PINNED.** Use **`expo-file-system/legacy`** (`writeAsStringAsync`/`readAsStringAsync`/`deleteAsync`/`cacheDirectory`/`documentDirectory`) — shipped + stable in SDK 56 and sufficient for write-string / read-string / temp-file-uri. No web-docs fetch required (BUILD-AGENT NOTE at top). The new `File`/`Paths` API is intentionally NOT used, so the milestone is buildable offline with no external dependency. **Web-export smoke:** immediately after `npx expo install`-ing the four deps and before writing IO, run `npx expo export --platform web` to confirm each module's web build resolves (they are lazy/`Platform`-guarded in `report.ts`/`backup.ts`, so web degrades — §6.4); do this smoke before wiring the IO so a web-unsafe import is caught at M-D1 start, not at the M-D1 boundary.
2. **`expo-sharing` availability.** Assumed present in the SDK-56 Expo Go runtime; if `Sharing.isAvailableAsync()` is false (some web/desktop), the share degrades to the print dialog (PDF) or a browser download (backup). Web is iteration-only, so share/backup are documented **N/A-on-web (or degraded)** — the core-loop remains web-safe; only these grown-up tools degrade.
3. **PDF is the "printable" artifact.** Assumed a one-page HTML→PDF via `expo-print` satisfies "printable/shareable". If a richer print view is later wanted, the same `ReportModel` + `renderReportHtml` feed it — no model change.
4. **Ledger/run 500-entry caps.** Assumed adequate for 7/30/90-day windows in normal use; the report footnotes "based on recent activity on this device" when the oldest retained entry is newer than the window start. A rolling archive is explicitly out of scope (matches doc 62 §16).
5. **Backup format is app-internal.** The `BackupFile` JSON is a Tiny-Bubbles-specific envelope, not an interchange standard; cross-app import is out of scope. Cross-*device* restore (same app) is the supported use.
6. **Restore is a full-device replace** (not a merge). Assumed acceptable for a single-family, no-account product; a selective/merge restore is a future enhancement (the per-slice structure makes it feasible without a model change).
7. **No new persisted state beyond `lastBackupAt`.** Assumed the report needs nothing stored (fully derived). If "email this report on a schedule" is ever wanted it would need new state + notification wiring — explicitly out of scope (and would stay local-only).
