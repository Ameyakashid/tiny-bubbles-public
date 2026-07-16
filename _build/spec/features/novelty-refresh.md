# Feature Spec — Novelty & Reward-Refresh Pipeline (`novelty-refresh`)

*Durable, buildable spec. Authored 2026-07-06 against the shipped, green baseline
(`_build/spec/01-current-state.md`: `tsc --noEmit` = 0, `jest` = 34 suites / 335
tests). Feature-complete = ADDITIVE deltas on top of what already ships. Research
grounding: `_build/research/00-SYNTHESIS.md` §2.2/§4/§6, `01-feature-matrix.md`
row #12. Plan grounding: `_build/plan/66-MASTER-PLAN.md` §1b.3/§1b.4/§1b.11,
`62-data-model.md` §8/§9/§14, `61-design-system.md` §6.2/§8.3, `70-daypart-bifurcation.md`.*

> **Read before building:** this feature stitches together data seams that ALREADY
> exist in the repo (`Cosmetic.seasonalPackId`, `SeasonalPack`, `registerSeasonalPack`,
> `visibleCosmetics`, the `noveltyPipeline` entitlement flag, the deterministic
> `computeReinforcement` bonus). It adds the ROTATION LOGIC, the QUEST system, the
> deterministic MAGNITUDE variety, and the CONTENT-CADENCE surfacing that are named
> as "the #1 research risk (4–8 week novelty cliff) and currently only a data seam"
> (`01-current-state.md` §4.3 gap #5). No line of this feature may introduce a
> server, an account, an LLM, an RNG payout, or a FOMO/expiry mechanic.

---

## 1. Overview + user value

### 1.1 The problem this solves (honest, cited)
The single category-defining failure across kids' ADHD apps is the **4–8 week
novelty cliff**: once the game layer is exhausted, "do your Joon task" becomes
indistinguishable from "do your task," and families churn (`00-SYNTHESIS.md` §1,
§6 risk #1; `01-feature-matrix.md` #12). Retention past week 8 is simultaneously
the churn driver AND the thing that makes the subscription feel worth paying for —
"monetization and retention are the same problem" (`00-SYNTHESIS.md` §3).

### 1.2 The counter-levers we ship (each evidenced)
Per `00-SYNTHESIS.md` §2.2 and the adversarial fact-check, the durable, humane
counter-levers are:

1. **A content/quest/companion refresh pipeline from day one**, treated as a core
   feature, not marketing (`00-SYNTHESIS.md` §2.2; `01-feature-matrix.md` #12).
2. **Varied reward MAGNITUDE and CONTENT — never a variable *schedule*.** ADHD
   novelty/stimulation-seeking is a real, moderately-supported trait, so variety
   helps sustain engagement — **but** the "unpredictable rewards beat predictable
   rewards" claim is weak/contradicted and variable-ratio is the exact slot-machine/
   loot-box mechanism we refuse (`00-SYNTHESIS.md` §2.2; `61-design-system.md`
   §8.3). We vary *how big* a reward is and *what* content is fresh — **deterministically**
   — never *whether/when* a reward drops.
3. **Appointment-style anticipation, not open-ended grind** — gentle "new this week"
   framing without nagging (`00-SYNTHESIS.md` §2.2; `40-ux-engagement-patterns.md` §5).
4. **Additive-only, no FOMO.** Nothing earnable ever disappears, expires, or is
   time-limited-with-a-countdown (anti-shame / anti-dark-pattern; `66` §1b.11,
   `00-SYNTHESIS.md` §4.1). Rotation changes *what is featured*, never *what you can
   still get or keep*.

### 1.3 What the feature is, in one sentence
A deterministic, offline, additive pipeline that (a) rotates a small board of gentle
bonus **quests** every ISO week, (b) surfaces **seasonal cosmetic packs** that
*appear* over the calendar year (never expire), and (c) grants **varied but
deterministic reward magnitude** (a daily "spotlight" daypart + quest rewards) —
all as a supportive layer on top of the always-free core loop, with a
non-gamified/calm path that turns the whole thing off.

---

## 2. UX behavior, screen by screen

All copy resolves through `src/theme/resolveContent.ts` (new keys in §6); all sizing
through resolved tokens; all celebration magnitude through
`src/theme/resolveCelebration.ts`. **No component branches on raw `ageMode`** — the
young/older differences below are driven by capability flags (`multiStepVisible`,
`showNumbersAndCharts`, `maxChoices`) exactly like the rest of the app.

### 2.1 Kid — Quest board (surfaced in `app/(kid)/rewards.tsx`)
A new **"Quests"** section is added ABOVE "My Collection" in the rewards surface
(older Tabs → Rewards tab; young single-surface → the same rewards route). It renders
`components/quests/QuestBoard.tsx`.

- Each quest is a `components/quests/QuestCard.tsx`: emoji + spoken label + a
  **bubble-fill progress bar** (reuse the `components/progress/BubbleMeter.tsx`
  liquid-fill visual, or its `bubblesUntil` framing) showing `count / target`.
- Progress framing is **calm and forward** ("2 more to go! 🫧"), NEVER a countdown,
  deadline, or "expires in N days."
- On reaching `target`, the quest **auto-grants** its deterministic reward (bubbles
  + optional cosmetic reveal) and fires a `resolveCelebration`-sized burst + a
  one-shot "Quest done!" reveal. There is **no missable "Claim" button** (avoids a
  forgotten-claim shame/FOMO trap); the reveal is celebratory, not a chore.
- Completed quests show an **owned/done ✓** state and stay on the board until the
  weekly rotation, then rotate out gracefully. Incomplete quests simply rotate out
  with **zero penalty** — progress is retained in `everCompleted`-style history and
  the same quest may return in a future week.

**YOUNG (`multiStepVisible === false`, `textPrimary === false`):**
- Shows **ONE** quest card (the first active quest), large, emoji-first, the spoken
  label **auto-speaks** on mount (TTS via existing `SpokenLabel`/`tts.ts`).
- Quest pool is filtered to the simplest goal kinds (`popBubbles`, `customizeBuddy`).
- No numeric `count/target` text; the bubble-fill bar carries the progress visually
  (numbers hidden because `showNumbersAndCharts === false`).
- Section title from `resolveContent("quest.tabTitle", { ageMode })` → "Quests".

**OLDER (`multiStepVisible === true`, `showNumbersAndCharts === true`):**
- Shows up to **3** quests (a small "adventure board").
- Numeric progress shown (`3/10`), plus the richer goal kinds
  (`completeDaypart`, `unlockCosmetic`, `tryCalm`).
- Same anti-shame framing; no timers.

**Quest count is derived from existing flags, not a new axis:**
`shownQuestCount = caps.multiStepVisible ? 3 : 1`.

### 2.2 Kid — daily "spotlight" magnitude (in the runner + celebration)
One daypart per day is the **deterministic "spotlight"** (`novelty.featuredDaypartFor`,
pure function of the local day). Completing the spotlight routine grants a
**deterministic extra bonus** (`FEATURED_DAYPART_BONUS`, a `TokenEntry` with
`reason: "quest_reward"`) and steps the routine-complete celebration UP one level via
the existing "a deterministic bonus moment may step magnitude UP (never down)" seam in
`resolveCelebration` (`66` §1b.3).

- Framing is **predictable and announced**, never luck: `resolveContent("featured.today")`
  → young "Today's spotlight! ✨" / older "Featured today." The child can SEE which
  routine is featured (a small spotlight chip on the daypart card / done panel).
- **Determinism:** the spotlight is the same for the whole local day and the same on
  every device — a pure function of `getDayOfYear(localDate)`. No `Math.random`.
- This is *magnitude* variety (how big), tied to *content* (which routine today),
  **not** a variable payout *schedule*. The base token + a salience-appropriate
  celebration still fire on EVERY completion, forever (unchanged from today).

### 2.3 Kid — "new this season" surfacing (in `CollectiblesGrid` + `BuddyRoom`)
Seasonal cosmetic packs become **visible** as their `availableFrom` date passes
(existing `visibleCosmetics(now)` already hides future packs). Newly-available
cosmetics get a small, calm **"new!" badge** (`components/quests/NoveltyBadge.tsx`,
or a `⭐` corner on the existing collectible tile) — **never a countdown, never
"limited time."** Additive-only: a pack only ever *adds* items; there is no expiry
field and no removal path (structurally enforced — `SeasonalPack` has no
`availableUntil`).

- FREE children see the base rotation + the "new!" markers, but **seasonal-pack
  cosmetics are premium-acquisition** (see §8); premium, not-yet-owned items are not
  shown a price to the child (they arrive via the parent premium flow), consistent
  with the existing `CollectiblesGrid` "a child never sees a paywall" rule.

### 2.4 Kid — daypart done panel nudge (optional, low-emphasis)
`components/kid/DaypartDonePanel.tsx` may show a **single, low-emphasis** quest chip
("Quest: pop 3 more 🫧") when there is an active, unfinished, simplest-kind quest —
so young children who mostly live in the runner still see the novelty layer. It is a
gentle nudge, NOT a nag, NOT a primary CTA, and it is suppressed in calm mode.

### 2.5 Low-stim / calm variants (hard requirements)
- `sensoryMode === "lowStim"` / OS Reduce-Motion: the quest board renders with the
  resolved low-stim tokens (no confetti, single-hue gentle ripple, motion ×1.4) —
  automatic via `useThemeTokens`/`resolveCelebration`, no special-casing.
- `child.settings.calmMode === true` (the non-gamified path): **the entire quest
  board, the spotlight bonus, and the "new!" badges are HIDDEN/suppressed.** Calm mode
  already suppresses reinforcement bonuses and drama (`62` §8); novelty follows the
  same rule. A calm-path child gets the plain routine + owned cosmetics, no quests,
  no magnitude variety. This is the "calm/non-gamified path" the research requires
  (`00-SYNTHESIS.md` §2.3; `30-community-asks.md` §3.6).

### 2.6 Parent — content cadence + controls (in `app/(parent)/dashboard.tsx` and/or `app/(parent)/settings.tsx`)
- **Cadence readout** (dashboard, read-only): "New this month: Spring pack 🌸" from
  `novelty.featuredPackFor(now)` — honest anticipation, no urgency.
- **Quests toggle** (settings, per child): a "Show quests" row. OFF is equivalent to
  calm-path suppression for quests only. Default ON for `standard`, OFF when
  `calmMode` is on.
- **Premium upsell** for the seasonal packs is the existing paywall (`app/(parent)/paywall.tsx`)
  behind the PIN gate — honest, no countdown/anchor pricing (unchanged).
- All parent surfaces stay dense/utilitarian, PIN-gated, and use `ageModeLabel`
  (never raw `ageMode`).

---

## 3. Data-model additions (exact TS + store + migration)

### 3.1 New types → `src/domain/types.ts` (ADD, additive only)
Append after the existing `SeasonalPack`/`CompanionSeed` block (§14 region):

```ts
// ---------------------------------------------------------------------------
// Novelty-refresh: rotating quests (additive, anti-shame, deterministic).
// A quest is an OPTIONAL bonus goal layered on the core loop. It never blocks
// the loop, never expires with a penalty, and rotation is a pure function of the
// ISO week — no RNG, no AI, no server (feature: novelty-refresh).
// ---------------------------------------------------------------------------

export type QuestGoalKind =
  | "popBubbles"        // cumulativeCount delta since quest start >= target
  | "completeDaypart"   // finish a (given or any) daypart routine `target` times
  | "unlockCosmetic"    // unlock any cosmetic `target` times
  | "customizeBuddy"    // change buddy color/finish/accessory `target` times
  | "tryCalm";          // visit the calm corner `target` times

export interface QuestDef {
  id: string;
  label: VisualLabel;            // REQUIRED spokenLabel (non-reader) + emoji + color
  goalKind: QuestGoalKind;
  target: number;                // e.g. 10
  /** optional daypart filter for completeDaypart (undefined = any) */
  daypart?: Daypart;
  /** deterministic bubbles granted on completion — NEVER random */
  rewardTokens: number;
  /** optional cosmetic (already in the catalog) revealed/granted on completion */
  rewardCosmeticId?: string;
  /** base (free) rotation vs a premium/seasonal pack id (gates via noveltyPipeline) */
  packId?: string;
  /** simplest goals suitable for young single-card mode */
  simple?: boolean;
}

export interface QuestProgress {
  questId: string;
  /** progress toward target (monotonic within the active window) */
  count: number;
  /** snapshot at rotation start, to compute deltas (e.g. cumulativeCount) */
  baseline: number;
  /** reward granted (auto on reaching target) */
  claimed: boolean;
  claimedAt?: EpochMs;
}

export interface ChildQuestState {
  childId: string;
  /** the ISO week key the active set was deterministically rotated for */
  weekKey: string;               // e.g. "2026-W27" (tz-aware, see dates.ts)
  /** progress per active quest id (the current week's board) */
  active: Record<string, QuestProgress>;
  /** ids of every quest EVER completed — kept forever (additive, no loss) */
  everCompleted: string[];
}
```

Also widen the token-reason union (additive, non-breaking):

```ts
export type TokenReason =
  | "task_complete"
  | "routine_complete"
  | "streak_bonus"
  | "cadence_bonus"
  | "quest_reward"     // ADD: deterministic quest + spotlight-daypart bonuses
  | "redeem"
  | "redeem_refund"
  | "parent_gift"
  | "undo"
  | "seed"
  | "adjustment";
```

### 3.2 New persisted store → `src/state/questStore.ts` (namespace `tb/quests`)
Mirror the shape of `runProgressStore.ts` exactly (same `persist` + `createTbPersistOptions`
+ `registerPersistedStore` pattern):

```ts
export interface QuestStoreState {
  quests: Record<string, ChildQuestState>;           // per child

  ensureRotation: (cid: string, weekKey: string, defs: QuestDef[]) => void;
  onSignal: (cid: string, signal: QuestSignal) => QuestClaim[];  // advance + auto-claim
  clearChild: (cid: string) => void;                 // used by wipeAllChildData
}
```

- `partialize: (s) => ({ quests: s.quests })`.
- `ensureRotation`: if `stored?.weekKey !== weekKey`, build a fresh `active` map by
  snapshotting each new quest's `baseline` from the current durable signal (e.g.
  `cumulativeCount` for `popBubbles`), preserving `everCompleted`. Idempotent within a
  week. This is the rotation entry point (called on app-open + when the board mounts).
- `onSignal`: given a `QuestSignal` (`{ kind, delta, daypart? }`), advance every
  matching active quest's `count`; when `count >= target && !claimed`, mark `claimed`,
  append to `everCompleted`, and return a `QuestClaim` describing the reward for the
  orchestrator to grant. **Pure counter math only** — the token/cosmetic grant is done
  by the `gameplay` orchestrator (§4) so store slices stay single-purpose.

`QuestSignal`/`QuestClaim` are small helper interfaces (define in `src/domain/quests.ts`).

### 3.3 Additive versioned migration notes
- **`SCHEMA_VERSION` stays `1`.** Everything added here is additive:
  - A brand-new persisted slice (`tb/quests`) is created fresh by the persist
    middleware on first write — no migration needed; a missing slice hydrates to
    `{ quests: {} }`.
  - New optional fields on existing types (none required on `ChildSettings`; the
    "show quests" toggle can reuse `calmMode` + a new optional `questsEnabled?: boolean`
    on `ChildSettings` — see below) are filled by `mergeWithDefaults` (`storage/migrations.ts`),
    which already spreads defaults under loaded values and preserves unknown keys.
  - Widening `TokenReason` is a string-union widening; existing persisted entries never
    used the new member and `validateAndRepair` does not validate `reason` — safe.
- **If** `ChildSettings.questsEnabled` is added, make it **optional** (`questsEnabled?: boolean`)
  so existing persisted `ChildSettings` blobs stay valid; treat `undefined` as
  `!calmMode` (default ON unless calm). Add its default to `defaultChildSettings`
  (`src/domain/constants.ts`). No migration entry required (optional + merged).
- **Seed/content cadence bumps:** adding more bundled quests or seasonal packs later
  is a pure DATA edit (`src/data/questPool.ts`, `src/data/seasonalPacks.ts`) — bump
  `SEED_VERSION` (`src/data/seed.ts`) so the by-id re-merge picks up new built-ins,
  but no `SCHEMA_VERSION` migration. The per-child quest PROGRESS is unaffected
  (rotation re-snapshots baselines each week).
- **Only if** a future change alters an existing persisted shape do you add a
  `MIGRATIONS` entry in `storage/migrations.ts` (the engine + `validateAndRepair` are
  ready). This feature does not.

---

## 4. Exact files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### 4.1 CREATE
| Path | Purpose |
|---|---|
| `src/domain/quests.ts` | Pure quest logic: `activeQuestsFor(weekKey, pool, count)` (deterministic weekly rotation), `signalMatches(def, signal)`, `advance(progress, def, signal)`, `isComplete(progress, def)`, `QuestSignal`/`QuestClaim` types, `baselineFor(goalKind, ctx)`. **No `Math.random`, no Date.now inside — `now`/`weekKey` passed in.** |
| `src/domain/novelty.ts` | Pure cadence + magnitude: `isoWeekKey`-based helpers re-exported from dates, `featuredDaypartFor(now, tz)` (deterministic day-of-year → daypart), `FEATURED_DAYPART_BONUS`, `featuredPackFor(now, packs)`, `isSeasonalNew(cosmetic, now, packs, windowMs)`. Pure. |
| `src/data/questPool.ts` | The static quest library: a **base (free) pool** + **premium/seasonal pools** (`packId` set). Plus `getQuestPool(opts)` filtering by premium + `simple` for young. |
| `src/data/seasonalPacks.ts` | Bundle the year-round seasonal cosmetic packs (each with `availableFrom` across the calendar, **no expiry**) and register them via the existing `registerSeasonalPack` seam at module load. Imported once from `src/data/index.ts`. |
| `src/state/questStore.ts` | Persisted `tb/quests` store (§3.2). |
| `components/quests/QuestBoard.tsx` | The kid quest surface (young: 1 card; older: up to 3). Reads resolved tokens + capability flags; suppressed in calm mode / when `questsEnabled === false`. |
| `components/quests/QuestCard.tsx` | One quest: emoji + spoken label + bubble-fill progress + done ✓. |
| `components/quests/NoveltyBadge.tsx` | The calm "new!" marker for newly-available seasonal cosmetics (no countdown). |
| `__tests__/domain/quests.test.ts` | Determinism + anti-shame + additive tests (§7). |
| `__tests__/domain/novelty.test.ts` | Deterministic spotlight/cadence tests. |
| `__tests__/state/quests.test.ts` | Store rotation + auto-claim + wipe tests. |

### 4.2 MODIFY
| Path | Change |
|---|---|
| `src/domain/types.ts` | Add the types in §3.1; widen `TokenReason`; add optional `ChildSettings.questsEnabled?`. |
| `src/domain/dates.ts` | Add `isoWeekKey(now, tz): string` (tz-aware, via `formatInTimeZone(now, tz, "RRRR-'W'II")`) and `dayOfYear(now, tz): number` — the deterministic rotation clocks, colocated with the other pure tz helpers. |
| `src/domain/index.ts` | Export `./quests`, `./novelty`. |
| `src/domain/constants.ts` | Add `defaultChildSettings.questsEnabled` (default `!calmMode`). Add `FEATURED_DAYPART_BONUS` re-export or keep in `novelty.ts`. |
| `src/data/index.ts` | Export `./questPool`; import `./seasonalPacks` (registers packs on load). |
| `src/data/buddyCosmetics.ts` | (Optional) move the `SAMPLE_SEASONAL_PACK` demo into `seasonalPacks.ts`, or leave it and add real packs alongside. Keep the registry API unchanged. |
| `src/state/index.ts` | Export `./questStore`. |
| `src/state/gameplay.ts` | (a) In `completeStep`: after `recordCompletion`, emit quest signals (`popBubbles` delta, `completeDaypart` when `isRoutineComplete`) via `questStore.onSignal`, grant any returned `QuestClaim`s (bubbles via `childStore.giftTokens`, cosmetic via `buddyStore.unlockCosmetic`, mood via `buddyStore.applyEvent("collectible")`); (b) apply the deterministic **spotlight** magnitude when the completed routine's daypart is `featuredDaypartFor(now, tz)`; (c) in `unlockCosmeticWithTokens` emit an `unlockCosmetic` signal; (d) add `rotateQuests(cid)` (calls `questStore.ensureRotation` with `getQuestPool` + `isoWeekKey`) and call it from `reconcileChild`; (e) in `wipeAllChildData` add `useQuestStore.setState({ quests: {} })`. |
| `src/theme/resolveContent.ts` | Add the copy keys in §6 (each MUST carry both `young` + `older` — the `satisfies` constraint enforces it). |
| `app/(kid)/rewards.tsx` | Render `<QuestBoard childId=... />` as a new section above "My Collection", gated by `!calmMode && questsEnabled`. |
| `components/rewards/CollectiblesGrid.tsx` | Add a `<NoveltyBadge>`/⭐ corner to tiles where `isSeasonalNew(cos, now, packs)` is true. |
| `components/kid/DaypartDonePanel.tsx` | (Optional) low-emphasis quest chip for young when an unfinished simple quest exists; suppressed in calm mode. |
| `app/(parent)/dashboard.tsx` | Add the read-only "New this month: <pack>" cadence readout. |
| `app/(parent)/settings.tsx` | Add the per-child "Show quests" toggle (writes `questsEnabled`). **Also extend `DataReview`: count `tb/quests` (e.g. "Quests: N")** so the new persisted slice appears in "Review what's stored" (roadmap invariant #8(d) / arch §1.3(c); matches the if-then §3.3 precedent). |
| `src/state/childStore.ts` | (Only if `questsEnabled` added) ensure `updateSettings` passes it through (it already spreads `patch` — no change needed). |

---

## 5. Reused prebuilt libraries

**No new dependency is required.** Everything is built from existing deps:

- **`date-fns` v4 + `date-fns-tz` v3** (already deps): `formatInTimeZone` for the
  tz-aware `isoWeekKey` (tokens `RRRR-'W'II`) and day-of-year math — the exact pattern
  `src/domain/dates.ts` already uses for `isoDay`/`getDaypart`. Deterministic, offline.
- **`zustand` v5** (already): the new `questStore` uses the identical persist wiring as
  `runProgressStore`.
- **`react-native-svg` + `reanimated`** (already): quest progress reuses the existing
  liquid `BubbleMeter` (`components/progress/BubbleMeter.tsx`) — no new chart lib.
- **Existing theme layer** (`resolveTokens`/`resolveCapabilities`/`resolveContent`/
  `resolveCelebration`) and **existing cosmetic seam** (`registerSeasonalPack`,
  `visibleCosmetics`, `getSeasonalPacks` in `src/data/buddyCosmetics.ts`) — reused as-is.
- **Existing `entitlements.ts`** `noveltyPipeline` flag + `isPremium` — reused for
  premium gating.

Rotation determinism uses a tiny in-repo integer hash of the `weekKey` string
(sum-of-char-codes or FNV-1a, written inline in `quests.ts`) → a stable offset into
the pool. **This is arithmetic, not an ML/AI recommender** — no library, no model.

---

## 6. Copy keys to add → `src/theme/resolveContent.ts`

Add to `COPY` (both variants mandatory; tone per `61` §1 — effort/identity, never
compliance; never urgency/FOMO):

```ts
"quest.tabTitle":  { young: "Quests",              older: "Quests" },
"quest.new":       { young: "New quests! 🌟",       older: "New quests this week" },
"quest.done":      { young: "Quest done! 🎉",       older: "Quest complete" },
"quest.moreToGo":  { young: "A little more! 🫧",     older: "Almost there" },
"featured.today":  { young: "Today's spotlight! ✨", older: "Featured today" },
"novelty.new":     { young: "Something new! ✨",     older: "New this season" },
```

Progress numerals for older come from the raw `count/target` (only when
`showNumbersAndCharts`), not from copy. No copy key may contain a deadline, a
countdown, "expires", "hurry", "last chance", "limited", or a "buddy misses
you"-style re-engagement string (the M10 reminder banned-phrase intent extends here).

---

## 7. Anti-shame + no-AI rules that apply (hard constraints)

1. **No FOMO / no expiry / no countdown.** Quests rotate; they do not "expire." A
   `SeasonalPack` has `availableFrom` but structurally **no** `availableUntil` — content
   only ever appears, never disappears. Owned cosmetics + `everCompleted` are kept
   forever (`66` §1b.11).
2. **No failure/negative state.** There is no "failed quest," no red, no guilt. An
   unfinished quest silently rotates out; the companion mood union has no negative
   member (unchanged). Reward magnitude only ever steps **UP**, never down
   (`resolveCelebration` clamps down only for calm/low-stim/quiet-hours, never as a
   penalty).
3. **Deterministic magnitude, NEVER a variable *schedule*.** All variety is a pure
   function of the ISO week (quests), the day-of-year (spotlight daypart), or explicit
   quest completion. **`Math.random` is forbidden in `quests.ts`, `novelty.ts`,
   `questStore.ts`, and every payout path** — enforced by an M15-style grep gate.
   Base token + a salience-appropriate celebration still fire on every completion,
   forever (the anti-slot-machine invariant, `61` §8.3, `62` §8).
4. **Calm/non-gamified path wins.** `calmMode === true` OR `questsEnabled === false`
   suppresses the entire quest board, the spotlight bonus, and the "new!" badges — the
   child gets the plain routine + owned cosmetics only.
5. **No AI anywhere.** Rotation is integer arithmetic over a static pool. There is no
   recommender, no personalization model, no LLM, no "suggested quest," no AI toggle
   (there is no AI to toggle). The companion stays a non-AI pet.
6. **Curated autonomy.** Quest board is capped (young 1 / older ≤3); cosmetic choices
   remain capped by the existing curated catalog. No open catalogs.
7. **Never a child-facing paywall.** Premium/seasonal, not-yet-owned cosmetics are not
   shown a price on the kid surface (existing `CollectiblesGrid` rule); the child never
   sees "buy." Premium content arrives via the parent/premium flow.
8. **Everything spoken.** Every quest `label` carries a required `spokenLabel`; young
   auto-speaks it. Non-readers can understand the whole quest board via TTS + emoji +
   the bubble-fill visual.

---

## 8. Dependencies + premium/free classification

### 8.1 Depends on (already shipped — no new prerequisite specs)
- **Core loop / token economy:** `completeStep`, `childStore.recordCompletion`,
  `TokenLedger`, `giftTokens` (`src/state/childStore.ts`, `src/state/gameplay.ts`).
- **Companion + cosmetics:** `buddyStore`, the cosmetic catalog + `registerSeasonalPack`/
  `visibleCosmetics` seam (`src/data/buddyCosmetics.ts`), `CollectiblesGrid`.
- **Daypart flow:** `getDaypart` + daypart completion signals
  (`src/domain/dates.ts`, `src/state/runProgressStore.ts`, `70-daypart-bifurcation.md`).
- **Entitlements / mock paywall:** `noveltyPipeline` flag + `isPremium`
  (`src/services/entitlements.ts`) — the mocked-purchase seam (`purchases.ts`) is
  unchanged; this feature only *reads* entitlement.
- **Theme resolvers:** `resolveContent`/`resolveCapabilities`/`resolveCelebration`.

### 8.2 Soft/related (not blocking)
- A future **clinician-report** spec may surface "quests completed" from
  `ChildQuestState.everCompleted` (read-only, opt-in framing) — coordinate the field
  name, no coupling required.

### 8.3 Premium vs free (core loop always free)
This feature is **MIXED**, classified to keep the free tier genuinely useful (a "free
tier that actually works" is a research requirement — `00-SYNTHESIS.md` §3):

| Sub-feature | Tier | Rationale |
|---|---|---|
| Base weekly **quest rotation** (free pool, `packId` undefined) | **FREE** | Real novelty for free users — beats the cliff without a wall; core-loop-adjacent. |
| Deterministic **spotlight-daypart** magnitude | **FREE** | It's a reframing of the existing (free) reinforcement bonus; must never be paywalled. |
| Base cosmetics + owned items + `everCompleted` | **FREE / retained forever** | `66` §1b.11 — retention is never gated. |
| **Seasonal cosmetic packs** (bundled, `availableFrom`-gated) | **PREMIUM** (`noveltyPipeline`) | The richer seasonal content is the paid novelty pipeline. |
| **Premium quest pool** (quests whose `packId` is a seasonal pack, awarding seasonal cosmetics) | **PREMIUM** (`noveltyPipeline`) | Rotated in only when `isFeatureUnlocked("noveltyPipeline", entitlement)`. |

Implementation: `getQuestPool({ premium })` includes premium/seasonal quests only when
`isFeatureUnlocked("noveltyPipeline", entitlement)`; `visibleCosmetics` already handles
seasonal visibility. **This refines (does not contradict) the existing
`FEATURE_GATES.noveltyPipeline` flag: the flag gates *seasonal/premium* novelty content
specifically; a base free rotation always exists.** Confirm in §9.

**Downgrade is non-punishing (hard rule, tested):** flipping premium → free removes
premium quests from the *next* rotation and stops surfacing new seasonal *acquisitions*,
but NEVER removes an owned seasonal cosmetic, never clears `everCompleted`, never unequips
anything. `isPremium()` false changes only what is *acquirable*, per `66` §1b.11.

---

## 9. Acceptance criteria + verify steps

### 9.1 Acceptance criteria
1. **Determinism (no RNG, no AI):** `activeQuestsFor(weekKey, pool, n)` returns the
   identical set for the same `weekKey` on repeated calls and across simulated
   "devices"; `featuredDaypartFor(day)` is stable per local day. `grep -rn "Math.random"
   src/domain/quests.ts src/domain/novelty.ts src/state/questStore.ts` → **zero**; the
   payout paths in `gameplay.ts` add no `Math.random`.
2. **Rotation is tz-aware + weekly:** a new ISO week (in the child's tz) rotates the
   board via `ensureRotation`, snapshots fresh baselines, and preserves `everCompleted`;
   the same week never re-rotates. DST-safe (reuses the tested `formatInTimeZone` path).
3. **Auto-claim + magnitude are deterministic:** reaching a quest `target` auto-grants
   exactly `rewardTokens` (+ any `rewardCosmeticId`) once (idempotent — no double
   grant), appends to `everCompleted`, and fires a `resolveCelebration`-sized burst.
   Completing the spotlight daypart grants exactly `FEATURED_DAYPART_BONUS` and steps
   the celebration up one level; completing a non-spotlight daypart does not.
4. **Additive-only / no FOMO:** registering a seasonal pack only ADDS cosmetics
   (existing `registerSeasonalPack` invariant); no type or code path can expire/remove a
   pack (`SeasonalPack` has no `availableUntil`). No quest/cosmetic copy contains a
   countdown/expiry/urgency string (grep gate).
5. **Anti-shame:** an unfinished quest at rotation yields no negative/failed state and
   no token loss; `calmMode` OR `questsEnabled === false` hides the board, the spotlight
   bonus, and the badges entirely.
6. **Premium/retention:** premium quests + seasonal acquisitions appear only when
   `noveltyPipeline` is unlocked; simulating trial expiry with a seasonal cosmetic OWNED
   asserts **zero visible change** to owned items and **`everCompleted` unchanged**
   (extends the existing `66` §1b.11 test).
7. **Age-adaptive via flags only:** young renders 1 auto-spoken card with no numerals;
   older renders ≤3 cards with numerals; `grep` for a raw `ageMode` branch or an
   `ageMode` prop inside `components/quests/**` → **zero**.
8. **Offline / web-safe:** all rotation/magnitude logic is pure (`now`/`tz`/`weekKey`
   passed in), no native clock, no network; `npx expo export --platform web` succeeds.
9. **Baseline stays green:** `npx tsc --noEmit` = 0; `npm test` all suites pass including
   the 3 new suites; no existing suite regresses.

### 9.2 Verify steps an agent runs
```bash
cd tiny-bubbles
npx tsc --noEmit                                  # 0 errors
npm test                                          # all suites green (incl. quests/novelty)
npx expo export --platform web                    # web bundle builds
grep -rn "Math.random" src/domain/quests.ts src/domain/novelty.ts src/state/questStore.ts   # -> empty
grep -rni "expires\|countdown\|last chance\|hurry\|limited time" src/data/questPool.ts src/theme/resolveContent.ts   # -> empty
grep -rn "ageMode" components/quests/                # -> empty (no raw-ageMode branch / prop)
```
Manual (dev client or web): open the kid Rewards surface → a quest board renders
(1 card young / ≤3 older); complete a routine → matching quest advances and, on target,
auto-celebrates and grants bubbles; the spotlight daypart shows the "Featured today"
chip and pays the larger bonus; toggle the child to calm mode / quests-off in parent
settings → the board disappears; on the parent dashboard the "New this month" cadence
line reflects `featuredPackFor(now)`.

---

## 10. Open assumptions (flag for confirmation; safe defaults chosen)

1. **Free base rotation vs all-premium.** This spec makes a **base weekly quest rotation
   FREE** and seasonal packs/premium quests PREMIUM (§8.3), refining the semantics of
   the existing `noveltyPipeline` flag to "gates seasonal/premium novelty," so the free
   tier still gets real novelty. If product wants novelty entirely premium, flip
   `getQuestPool` to require `noveltyPipeline` for ALL quests — one-line change.
2. **Auto-grant vs tap-to-claim.** Chosen **auto-grant on target + a celebratory reveal**
   (no missable "Claim" button) to avoid a forgotten-claim FOMO/shame trap. If a tap
   reveal is preferred for satisfaction, add a non-penalized "Open your treasure" tap
   that never expires.
3. **Quest count by age.** Reuses `multiStepVisible` (young 1 / older 3) rather than
   adding a capability flag. A dedicated `questSlots` capability can be added later with
   zero component rewrites if a middle count is wanted.
4. **Seasonal-pack calendar.** The bundled packs' `availableFrom` dates (which pack
   appears when across the year) are placeholder; product/design finalizes the real
   cadence + art. Additive-only is fixed; the dates are tunable data.
5. **`questsEnabled` field.** Added as an optional `ChildSettings.questsEnabled?`
   (default `!calmMode`). If product prefers to key quests purely off `calmMode`, drop
   the field and the parent toggle (calm mode already suppresses).
6. **Spotlight bonus size.** `FEATURED_DAYPART_BONUS` is a tunable constant (suggest +2
   bubbles); confirm the economy balance with the token-economy owner.
7. **Young surfacing.** Quests live on the Rewards surface for both ages, with an
   optional low-emphasis chip on the young daypart-done panel. If young children should
   see quests on the Buddy screen instead, move `<QuestBoard>` there — the component is
   self-contained.
