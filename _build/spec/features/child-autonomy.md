# Feature Spec — Child Autonomy ("Be the Boss")

Slug: `child-autonomy` · Tier: **v1 / retention+autonomy** (research feature #13) · Status: **~80% shipped; this spec closes the delta to feature-complete.**

Author target: an ordinary build-agent working recursively. Every path below is real (verified against the tree on 2026-07-06). Mind the SPACE in the repo root `/Users/ameyakashid/Desktop/adhd india/`.

> **Honesty up front.** The three autonomy pillars already exist in the shipped app:
> reward picking (`app/(kid)/rewards.tsx` slices to `maxChoices`), companion
> customize/rename (`components/buddy/BuddyRoom.tsx`), and older-mode step reorder
> (`components/task/TaskRunner.tsx`). This spec is a **DELTA**, not a rebuild. The
> gaps that make the feature *cohesive and complete* are: (1) two autonomy grant
> flags that exist in the data model but are wired to nothing
> (`ChildAutonomy.canPickReward`, `ChildAutonomy.canCustomizeCompanion`); (2) young
> kids have **no** way to choose task order (reorder is older-only); (3) parents can
> only toggle 2 of the 4 autonomy grants; (4) no tests cover autonomy wiring. Build
> those. Do not re-implement what already works.

---

## 1. Overview + user value

**What it is.** A "be the boss" layer that lets the child make three curated, low-stakes
choices inside the existing loop: (a) **pick which curated reward** to pursue / redeem /
save toward, (b) **customize and rename the companion**, and (c) **choose the order** of
steps within a routine. Choices are always **curated** (3–6 picture options, never an open
catalog) and **extrinsic tokens stay** — autonomy sits *on top of* the token economy, it
does not replace it.

**Why (verified science — cite honestly).**
- **Self-Determination Theory is the backbone, but do not strip extrinsic rewards.**
  Fact-check `gamification-sdt`: SDT's autonomy/competence/relatedness needs support
  *durable* motivation, so we give the child real (bounded) choices — but SDT's general
  warning that extrinsic rewards can crowd out intrinsic motivation is **overridden here**
  because immediate, frequent reinforcement is the evidence-based mechanism for ADHD
  (fact-check `delay-discounting`, `token-economy`). So: SDT framing **+** keep the bubbles.
  (`00-SYNTHESIS.md` §2.3; `01-feature-matrix.md` #13.)
- **Cap choices to fight overload.** Choice overload is real and children's working memory
  is smaller than adults'; the pattern library mandates **3–6 curated options, never open
  catalogs** (`40-ux-engagement-patterns.md` §9; `61-design-system.md` §5.4). This is why
  the reward menu is sliced to `capabilities.maxChoices` (3 young / 6 older) and cosmetics
  are a curated set, not a store.

**Why (market / community demand).**
- The single most-cited parent quote for this feature: *"if you allow her to be the boss of
  her behavior & rewards, this will work"* (`30-community-asks.md` §2.6). Autonomy increases
  investment and reframes "do this because I said so" into the child's own choice.
- Naming/customizing the companion is the strongest parasocial-bond lever across Joon,
  Finch, and Pokémon Smile (`40` §2; `30` §2.4) — it "motivates without feeling like
  bribery."

**Honest limits.** This is engagement/adherence design, **not** a symptom treatment. Do not
let any copy imply the child "controlling their rewards" treats ADHD. Effects of the
underlying mechanisms are moderate (g≈0.3–0.5) with high individual variation.

---

## 2. UX behavior — screen by screen

All three pillars run inside surfaces that already exist. Components read **resolved tokens +
capability flags**, never raw `ageMode`, and never take an `ageMode` prop (doc 66 §2).

### 2.1 Pillar A — pick from curated rewards (`app/(kid)/rewards.tsx`, `components/rewards/RewardCard.tsx`)

**Already built:** the reward list is filtered to `active` rewards and **sliced to
`caps.maxChoices` (3 young / 6 older)** regardless of how many the parent defined; each
`RewardCard` offers "Get this!" (escrow request — tokens are only *held*, never silently
spent), a forgiving "never mind" on a pending request, "N more bubbles!" goal-gradient
framing when unaffordable, "come back later" at a weekly-limit/cooldown, and (older only, via
`showNumbersAndCharts`) "⭐ save toward this" which sets `progress.savingTowardRewardId`.

**DELTA — gate self-request on `canPickReward`.** The dormant `ChildAutonomy.canPickReward`
grant must actually control whether the child can self-request:
- `canPickReward === true` (default): unchanged — the child taps "Get this!" to open the
  escrow request; the parent approves (or auto-approves under
  `autoApproveRedeemUnderTokens`).
- `canPickReward === false`: the reward menu is still **fully visible** (aspirational
  "save up" framing is motivating), but the request action is replaced by a calm,
  non-shaming line — young: *"Ask a grown-up 💛"*, older: *"Ask a grown-up to get this."* —
  and "save toward this" stays available (choosing a goal is autonomy that needs no
  approval). The parent redeems from `app/(parent)/dashboard.tsx`. **No lock icon, no
  greyed-out "denied" state** (anti-shame).

**YOUNG vs OLDER.** Young: 3 cards, no numbers (bubble-dot cost row via `showNumbers=false`),
no streak/goal-bar, TTS auto-context. Older: up to 6 cards, numeric cost, streak ring +
save-toward goal bar. Both come purely from `caps.*`.

**Low-stim / calm.** In `calmMode`, tokens/celebration are suppressed elsewhere but the
reward menu remains reachable (a calm child can still choose a treat). No confetti on
request; the "reward.redeem" cue already ducks-not-hijacks.

**OPTIONAL enhancement — kid reward "favorites" (see §3.3).** Let the child *star* which of
the parent's pool appears in the capped slice (favorites float to the top). This deepens
"be the boss" but is **not required for acceptance**; ship it only if the core delta lands
green first.

### 2.2 Pillar B — customize + rename the companion (`components/buddy/BuddyRoom.tsx`)

**Already built:** Color / Finish / Accessory / Name sections, each gated by a capability
flag (`caps.canPickColor` / `caps.canPickTheme` / `caps.canPickAccessory`), plus the
owned-forever `CollectiblesGrid` on the rewards screen for token-unlocking more cosmetics.
Cosmetics are curated (a fixed base set + additive-only seasonal packs); a child **never
sees a paywall** (premium, not-yet-owned items are simply not shown a price — doc 66 §5).

**DELTA — wire the `canCustomizeCompanion` master grant.** Today `BuddyRoom` gates on
`caps.canPickColor/Theme/Accessory`, which resolve from `ageMode` defaults **only** — the
per-child `ChildAutonomy.canCustomizeCompanion` toggle is connected to nothing. Fix so the
master grant actually gates:
- `canCustomizeCompanion === true` (default): unchanged behavior (the three granular,
  age-derived pickers show as today).
- `canCustomizeCompanion === false`: the **Color / Finish / Accessory** sections are hidden
  (the master forces `canPickColor = canPickAccessory = canPickTheme = false` in the
  resolver, §3.1). The **Name** section stays — renaming is the lowest-friction, highest-bond
  autonomy and needs no gate. The buddy still renders in its current (owned) look; nothing
  the child already equipped is stripped (doc 66 §1b.11).
- **Curated-autonomy exception — the Name field is the ONE free-text kid input (PII caveat).**
  Because it is uncurated free text a child could type their real name/details, and it is
  persisted + carried in the whole-`tb/`-keyspace backup a parent may hand to a clinician. Mitigate:
  (a) **cap the length** (e.g. `maxLength={20}` on the `AppTextInput`); (b) run it through a **light,
  on-device, offline profanity filter** (a small bundled word-list check — no network, no AI) that
  gently rejects/blanks a flagged entry; (c) the **clinician report OMITS the free-text buddy name**
  (it uses the species/companion framing, not the child-typed string) so a child's typed PII never
  appears on a shareable report. Note this exception explicitly in §6 (curated-autonomy caveat). The
  backup still carries the name (it is the child's data, kept on-device); the report does not print it.

**YOUNG vs OLDER (unchanged, via flags).** Young defaults: name + a curated color only
(`canPickColor=true`, accessory/theme false) — "Bloop" framing (`companionFraming==='care'`).
Older defaults: name + color + finish + accessory — "Orbit" framing
(`companionFraming==='levelup'`). These are `companionStyle`-derived, never `ageMode`-props.
A precocious older kid kept on `cuddly` still gets Bloop; the master grant composes on top.

**Low-stim / calm.** Customization is calm by nature (static pickers). Swatches/chips honor
resolved tokens; no motion. Nothing here changes under `lowStim` except the palette.

### 2.3 Pillar C — choose task order (`components/task/TaskRunner.tsx`, `components/task/StepCard.tsx`)

**Already built (OLDER):** when `caps.multiStepVisible && autonomy.canReorderSteps`, each
checklist row shows ▲/▼ reorder handles (`StepCard` `onMoveUp`/`onMoveDown` →
`TaskRunner.move` → `taskStore.reorderRoutineSteps`), which **permanently** reorders the
routine (persisted, updates `Routine.stepIds` + each `Task.order`). Completed rows grey out
calmly (never "failed").

**DELTA — young "choose what's next".** Young mode (`multiStepVisible === false`) shows ONE
focal step and currently has **zero** order autonomy — `canReorder` is
`multiStepVisible && …`, so young can never reorder. Add a young-appropriate, curated chooser:
- When `!multiStepVisible && autonomy.canReorderSteps` **and** there are ≥2 *upcoming*
  (not-yet-resolved) steps, render a small **"What next?"** strip below the Done button
  (new `components/task/NextStepChooser.tsx`): up to `caps.maxChoices` (=3) upcoming steps as
  tappable emoji+color bubbles, each with a spoken label. Tapping one makes it the **current
  focal step**.
- Mechanism: a new `runProgressStore.chooseNextStep(cid, taskId)` moves `taskId` to the front
  of the **uncompleted** portion of the *active run's* `stepIds` (it does **not** permanently
  reorder the parent's routine — young choice is per-run only). Because
  `TaskRunner` derives `currentId = nextStepId(run.stepIds, completedIds)`, the chosen step
  becomes focal immediately, and it survives a force-quit (run `stepIds` is persisted).
- This is genuinely optional in the moment: if the child ignores the strip, the default is
  the existing next-in-order step. No pressure, no "wrong" pick.

**OLDER (unchanged):** keeps the permanent ▲/▼ reorder. Relabel the parent toggle to cover
both (§2.4).

**Low-stim / calm.** The "What next?" strip uses static bubbles (no drift/parallax). In
`calmMode` the strip may still show (choosing order is calm); honor motion tokens
(`t.motion.loopsEnabled`) exactly as `StepCard` does — no bounce under reduced-motion.

### 2.4 Parent controls (`app/(parent)/children.tsx` → "Autonomy" card)

**Already built:** toggles for "Let child suggest tasks" (`autonomy.canAddTasks`) and "Let
child reorder steps" (`autonomy.canReorderSteps`).

**DELTA — surface all four grants.** Add two rows and relabel one:
- **"Let child customize buddy"** → `autonomy.canCustomizeCompanion`.
- **"Let child ask for rewards"** → `autonomy.canPickReward`. Hint: *"Suggestions still need
  your OK."*
- Relabel "Let child reorder steps" → **"Let child choose step order"** (now covers young's
  "what next?" chooser AND older's reorder).

All four write through the existing `useChildStore().updateSettings(cid, { autonomy: {…} })`
and take effect on the live active child immediately (the root `ThemedRoot` re-feeds grants
into the theme provider). This card is **always free**, never paywalled.

---

## 3. Data-model additions (exact TS + which store) + migration notes

### 3.1 Capability resolver (`src/theme/resolveCapabilities.ts`) — NOT persisted

The grants **already persist** on `ChildSettings.autonomy` (doc `src/domain/types.ts`
`ChildAutonomy`); the resolver just needs to consume them.

```ts
// ADD to ResolveCapabilitiesInput (all optional; default from ageMode/true):
export interface ResolveCapabilitiesInput {
  // …existing…
  /** master grant: when false, forces all three canPick* off (doc: child-autonomy §2.2) */
  canCustomizeCompanion?: boolean;
  /** child may self-request a reward; when false the kid asks a grown-up (§2.1) */
  canPickReward?: boolean;
}

// ADD to ModeCapabilities:
export interface ModeCapabilities {
  // …existing…
  canPickReward: boolean;
}
```

In `resolveCapabilities()`:
```ts
const master = input.canCustomizeCompanion ?? true; // default: allowed
const canPickColor     = master && (input.canPickColor     ?? base.canPickColor);
const canPickAccessory = master && (input.canPickAccessory ?? base.canPickAccessory);
const canPickTheme     = master && (input.canPickTheme     ?? base.canPickTheme);
// …
return { …, canPickColor, canPickAccessory, canPickTheme,
         canPickReward: input.canPickReward ?? true };
```

### 3.2 Theme provider grants (`src/theme/ThemeProvider.tsx`) — NOT persisted

```ts
export type CapabilityGrants = Partial<{
  // …existing…
  canCustomizeCompanion: boolean;
  canPickReward: boolean;
}>;
```
Fed by `app/_layout.tsx` `ThemedRoot` from the active child:
```ts
grants: {
  ttsDefault: cs.spokenLabelsEnabled,
  canCustomizeCompanion: cs.autonomy.canCustomizeCompanion,
  canPickReward: cs.autonomy.canPickReward,
},
```
`useCapabilities()` already spreads `ctx.grants` into `resolveCapabilities`, so no hook change
is needed beyond the two new keys flowing through.

### 3.3 OPTIONAL — kid reward favorites (`ChildSettings`, persisted in `childStore`)

Only if building the §2.1 optional enhancement. **Additive optional field** on
`ChildSettings` in `src/domain/types.ts`:
```ts
export interface ChildSettings {
  // …existing…
  /** kid-curated favorite reward ids (float to the top of the capped slice).
   *  Optional + additive: absent => no favorites. Capped at maxChoices in UI. */
  rewardFavorites?: string[];
}
```
Persisted via the existing `childStore` profile slice (`tb/child/<cid>/profile`). Written
through `updateSettings(cid, { rewardFavorites })`.

### 3.4 Run-order choice (`src/state/runProgressStore.ts`) — persisted (existing slice)

No new persisted *shape* — reorders the existing `ActiveRunProgress.stepIds`. Add one method:
```ts
/** Move `taskId` to the front of the UNCOMPLETED portion of the active run's
 *  stepIds (young "what next?" choice; per-run only, not the routine). No-op if
 *  taskId is unknown or already resolved. */
chooseNextStep: (cid: string, taskId: string) => void;
```
Implementation sketch: read `active[cid]`; keep `completedStepIds` order intact; among the
uncompleted ids, remove `taskId` and re-insert it first; write back `stepIds =
[…completedInOriginalRelativeOrder-preserved…]` — simplest correct form: rebuild `stepIds`
as `[...stepIds.filter(id => completed.includes(id)), taskId, ...uncompleted.filter(id => id !== taskId)]`
while preserving each group's relative order. Update `updatedAt`.

### 3.5 Migration notes (additive, no SCHEMA_VERSION bump)

- `canPickReward` / `canCustomizeCompanion` **already exist** on persisted `ChildSettings`
  (seeded `true` by `defaultChildSettings` since M4). Any pre-existing blob missing them is
  healed by `mergeWithDefaults` (doc 62 §3) → no migration entry required.
- `rewardFavorites?` is **optional** → absent reads as "no favorites"; `mergeWithDefaults`
  fills nothing. **No `SCHEMA_VERSION` bump.**
- Reordering `ActiveRunProgress.stepIds` is a value change to an existing field → no shape
  change, no migration.
- If any of the above were ever made **required**, add a `MIGRATIONS` entry in
  `src/storage/migrations.ts` with a default-filling `migrate` and bump `SCHEMA_VERSION` in
  `src/storage/schemaVersion.ts`. Not needed for this feature.

---

## 4. Exact files to CREATE and MODIFY

**CREATE**
- `tiny-bubbles/components/task/NextStepChooser.tsx` — young "What next?" curated strip (up
  to `maxChoices` upcoming steps as tappable spoken bubbles → `chooseNextStep`).
- `tiny-bubbles/__tests__/state/autonomy.test.ts` — grant wiring + `chooseNextStep` +
  `resolveCapabilities` master-gate + `canPickReward` default (see §7).

**MODIFY**
- `tiny-bubbles/src/theme/resolveCapabilities.ts` — add `canCustomizeCompanion` (master gate)
  + `canPickReward` to input + `ModeCapabilities` (§3.1).
- `tiny-bubbles/src/theme/ThemeProvider.tsx` — add the two keys to `CapabilityGrants` (§3.2).
- `tiny-bubbles/app/_layout.tsx` — feed both grants from `cs.autonomy.*` in `ThemedRoot`
  `value.grants` (§3.2).
- `tiny-bubbles/components/buddy/BuddyRoom.tsx` — Color/Finish/Accessory sections now honor
  the master grant automatically (the three `caps.canPick*` go false); **keep Name ungated**.
- `tiny-bubbles/app/(kid)/rewards.tsx` — gate the request affordance on `caps.canPickReward`;
  (optional) favorites-first ordering of `visibleRewards`.
- `tiny-bubbles/components/rewards/RewardCard.tsx` — accept a `canRequest: boolean` prop; when
  false, render the calm "Ask a grown-up" line instead of "Get this!" (keep "save toward");
  (optional) a "⭐ favorite" star.
- `tiny-bubbles/components/task/TaskRunner.tsx` — render `NextStepChooser` in the young branch
  when `!multiStepVisible && autonomy.canReorderSteps` and ≥2 upcoming; wire `chooseNextStep`.
  Older branch unchanged.
- `tiny-bubbles/src/state/runProgressStore.ts` — add `chooseNextStep` (§3.4).
- `tiny-bubbles/app/(parent)/children.tsx` — Autonomy card: add "Let child customize buddy"
  (`canCustomizeCompanion`) + "Let child ask for rewards" (`canPickReward`); relabel reorder
  toggle to "Let child choose step order".
- `tiny-bubbles/src/domain/types.ts` — (OPTIONAL) add `rewardFavorites?: string[]` (§3.3).
- `tiny-bubbles/__tests__/theme/resolveCapabilities.test.ts` — extend for the master gate +
  `canPickReward`.

---

## 5. Reused prebuilt libraries (prefer existing deps; no new deps needed)

**No new dependency.** Everything reuses the current stack:
- **zustand v5** — the grant/order state lives in existing stores (`childStore`,
  `runProgressStore`).
- **react-native `Pressable`/`Text`/`View`** + `components/ui/SpokenLabel.tsx` (expo-speech
  TTS) — the chooser bubbles and reward gating are plain RN + the existing spoken-label
  primitive.
- **`components/parent/ui.tsx`** (`Toggle`, `SettingRow`, `SegmentedControl`) — the two new
  parent rows reuse the shipped parent UI kit.
- **`src/services/playCue.ts`** (expo-audio cue registry) — reuse `tap.soft`/`buddy.greet`
  for chooser taps; no new cues required.
- **NativeWind v4 / theme tokens** via `useThemeTokens()` — all styling.
- Reorder math reuses `src/domain/tasks.ts#nextStepId` and
  `taskStore.reorderRoutineSteps` (older) — no new algorithm.

If the optional favorites star wants a filled/outline glyph, use the emoji `⭐`/`☆` already
in use across the codebase — do **not** add an icon library.

---

## 6. Anti-shame + no-AI rules that apply

- **ZERO AI.** No suggestion engine picks rewards/order/cosmetics. The "What next?" chooser
  offers the child's own remaining steps in a fixed curated order — no ranking model, no LLM,
  no "recommended for you." Companion stays a non-AI pet.
- **Curated, never open.** Reward slice capped at `maxChoices` (3/6); cosmetics are a fixed
  base set + additive-only packs; the chooser shows ≤ `maxChoices` upcoming steps. No open
  catalogs, no infinite scroll (choice-overload guardrail, `40` §9).
- **No shame when a grant is OFF.** `canPickReward=false` → calm "Ask a grown-up 💛", never a
  lock/denied/greyed "you can't" state. `canCustomizeCompanion=false` → sections simply
  absent; the buddy keeps its current look. A child never sees a punitive "disabled" UI.
- **No wrong choice.** Choosing order/reward/cosmetic is never scored, timed, or reversed
  with penalty. Ignoring the "What next?" strip is fine (default order proceeds).
- **Owned-forever.** Nothing the child equipped/owns is ever stripped by a grant flip or by a
  premium downgrade (doc 66 §1b.11).
- **Age-adaptive via resolvers only.** All gating flows through `caps.*` / `autonomy.*`; no
  component reads raw `ageMode` or takes an `ageMode` prop. `BubbleBuddy` variant stays
  keyed on `companionStyle`.
- **Extrinsic tokens kept.** SDT framing does not remove the immediate token payout; autonomy
  is additive to the token economy (`00` §2.3).

---

## 7. Acceptance criteria + verify steps

**Acceptance criteria**
1. `resolveCapabilities({ ageMode:'older', canCustomizeCompanion:false })` returns
   `canPickColor === canPickAccessory === canPickTheme === false`; with the default
   (undefined/true) it returns the age defaults. `canPickReward` defaults `true`, honors an
   explicit `false`.
2. Flipping "Let child customize buddy" OFF in `children.tsx` hides Color/Finish/Accessory in
   `BuddyRoom` on the live child while the **Name** field remains; flipping ON restores them.
   No owned cosmetic is removed.
3. Flipping "Let child ask for rewards" OFF replaces "Get this!" with the calm "Ask a
   grown-up" line on `RewardCard`; "save toward this" still works; the parent can still redeem
   from the dashboard. No lock/denied styling appears.
4. In young mode with "choose step order" ON and ≥2 upcoming steps, the "What next?" strip
   shows ≤3 upcoming steps; tapping one makes it the focal step immediately; force-quit +
   reopen resumes on the chosen step (persisted run order). With the grant OFF, the strip is
   absent and default order proceeds.
5. `runProgressStore.chooseNextStep` moves the chosen id to the front of the uncompleted
   portion without touching `completedStepIds`, is a no-op for unknown/already-resolved ids,
   and does **not** mutate the parent routine (`taskStore.routines` unchanged).
6. Older-mode ▲/▼ reorder still permanently reorders the routine (regression intact).
7. Reward slice is still capped at `maxChoices` (3 young / 6 older) regardless of pool size.
8. `npx tsc --noEmit` = 0 errors; `npx jest` all suites green (the current 34 suites/335 tests
   plus the new autonomy suite); `npx expo export --platform web` succeeds (web-safe).
9. Grep guards pass: no new raw-`ageMode` branch in a component, no `ageMode` prop on
   `BubbleBuddy`, no `Math.random` in any choice/payout path, no AI/LLM import.

**Verify steps an agent runs (from `tiny-bubbles/`)**
```
npx tsc --noEmit
npx jest __tests__/state/autonomy.test.ts __tests__/theme/resolveCapabilities.test.ts
npx jest
npx expo export --platform web
grep -rn "ageMode" components/buddy/BubbleBuddy.tsx        # expect: no ageMode prop
grep -rn "Math.random" components/task src/state/runProgressStore.ts  # expect: none
```
Manual (dev client or `_theme-gallery` + a seeded child): walk criteria 2–4 & 6 by hand.

New/updated tests to author in `__tests__/state/autonomy.test.ts` (jest-expo, pure where
possible):
- `resolveCapabilities` master-gate + `canPickReward` default/override.
- `runProgressStore.chooseNextStep` reorder correctness + no-ops + routine-untouched.
- (if favorites built) favorites-first ordering respects the `maxChoices` cap.

---

## 8. Dependencies on other feature specs + premium/free classification

**Depends on (all already shipped — read-only for this feature):**
- **Theming / age-adaptive engine** (`src/theme/*`) — `resolveCapabilities`, `ThemeProvider`,
  `useCapabilities`. This feature *extends* it.
- **Companion** (`components/buddy/*`, `src/state/buddyStore.ts`, `src/data/buddyCosmetics.ts`)
  — customization surface + owned-forever cosmetics.
- **Token economy / rewards** (`app/(kid)/rewards.tsx`, `src/state/rewardStore.ts`,
  `src/domain/tokens.ts`, `src/state/gameplay.ts`) — escrow request/save-toward.
- **Core loop / daypart runner** (`components/task/TaskRunner.tsx`, `runProgressStore`,
  `src/domain/tasks.ts`) — the order-choice surface.
- **Parent area + gate** (`app/(parent)/children.tsx`, `(gate)/parental-gate.tsx`) — the
  autonomy toggles live behind the PIN/challenge gate.

**Related specs (adjacent, not blocking):**
- **Task proposal / `canAddTasks`** — a *fourth* autonomy grant (child proposes tasks into a
  parent approval queue). Its store glue exists (`gameplay.ts#proposeTaskFromTemplate/
  approveProposal/dismissProposal`) and the parent toggle is already surfaced; the kid-facing
  propose UI is a **separate** feature spec. This spec does not build it, but the "Autonomy"
  card it touches is shared — keep the rows consistent.
- **Multi-child** — autonomy grants are per-child; siblings can have different grants (free
  for child #1; adding children is the multiChild premium gate, unrelated to autonomy).

**Premium vs free.**
- **FREE — always (core loop):** renaming the buddy, picking a curated free color, choosing
  step order (young + older), requesting/saving-toward a reward, and every autonomy grant
  toggle. Autonomy is part of the core loop and is never gated.
- **PREMIUM — acquisition breadth only (never retention):** the *size of the cosmetics
  catalog* the child can unlock (`FEATURE_GATES.companionThemes` free=2 / premium=all) and
  premium finishes/colors. Premium **never** removes autonomy or strips owned items; a child
  on the free tier still fully customizes within the free set (doc 66 §1b.11). The reward menu
  size is capped at the **curated ceiling 6** for everyone (`rewardMenuSize` premium is
  *not* "unlimited" — curated-autonomy rule).
- **Billing stays MOCKED** behind the existing seam (`src/services/purchases.ts`,
  `src/services/entitlements.ts`); this feature adds no purchase call.

---

## 9. Open assumptions

1. **Name editing is ungated.** Assumed renaming stays available even when
   `canCustomizeCompanion=false` (lowest-friction bond, harmless). If product wants name under
   the master grant, move the Name section inside the gate — one-line change.
2. **Young order choice is per-run, not permanent.** Assumed young "What next?" reorders only
   the active run (not the parent's routine), while older ▲/▼ stays permanent. If product wants
   young choices to persist to the routine, call `taskStore.reorderRoutineSteps` instead of
   `chooseNextStep`.
3. **`canPickReward=false` still shows the menu.** Assumed the aspirational menu is motivating
   and the child asks a grown-up. If product prefers hiding rewards entirely for that child,
   gate the whole section (but that reduces the SDT "save-up" motivation).
4. **Favorites is optional / deferred.** Assumed §2.1/§3.3 favorites is a nice-to-have shipped
   only after the required delta is green; if product wants kid reward-curation as core, it
   becomes a required item and needs its own small test.
5. **`maxChoices` for the "What next?" strip = the same 3/6 cap.** Assumed we reuse
   `caps.maxChoices`; young's 3 is the intended ceiling for the strip. Adjust if a smaller
   young ceiling (e.g. 2) tests better with kids.
6. **Grants re-feed live.** Assumed `ThemedRoot` re-renders on `updateSettings` (it selects the
   active profile), so a parent toggle updates the kid surface without a relaunch. Verify on
   device; if stale, ensure the selector subscribes to `autonomy`.
