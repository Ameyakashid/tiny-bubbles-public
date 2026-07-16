# Feature Spec — Aging-Up / Older-Kid Identity Mode (`aging-up`)

*Durable, buildable spec. Authored 2026-07-06 against the shipped, green baseline
(`_build/spec/01-current-state.md`: `npx tsc --noEmit` = 0, `npx jest` = 34 suites /
335 tests). Feature-complete = ADDITIVE deltas on the age-adaptive engine that already
ships. Research grounding: `_build/research/00-SYNTHESIS.md` §1 / §6 (risk #6 "age up
gracefully") / §7, `01-feature-matrix.md` row #24. Plan grounding:
`_build/plan/66-MASTER-PLAN.md` §1b.6 (age decoupling) / §1b.7 (no `ageMode` prop) / §1b.11
(non-punishing downgrade), `65-age-adaptive` (a third band drops in with zero component
rewrites), `61-design-system.md` §2.4 (Tide "supports aging-up") / §6.4 (young vs older
companion presets).*

> **Read before building.** This feature does NOT invent a new subsystem. It extends the
> EXISTING resolver stack — `src/theme/resolveTokens.ts`, `resolveCapabilities.ts`,
> `resolveContent.ts`, `resolveCelebration.ts` — plus the procedural companion
> (`components/buddy/BubbleBuddy.tsx` + `buddyVisuals.ts`) and its seed data. The whole
> architecture was built to absorb "a future band (teen 13+) [that drops] in with zero
> component rewrites" (comment in `resolveCapabilities.ts`; `65-age-adaptive` §7.7). We
> are exercising that seam for the ~10–12 band. **Every kid-facing screen already reads
> resolved tokens / capability flags / resolved content — NEVER raw `ageMode`, NEVER an
> `ageMode` prop (`66` §2, §1b.7).** Nothing here may add a server, an account, an LLM/AI,
> an RNG payout, a streak-loss/guilt state, or a paywall on the mode itself.

---

## 1. Overview + user value

### 1.1 The problem this solves (honest, cited)
Joon has proven the exact loop Tiny Bubbles runs — parent assigns tasks, child completes
offline, tokens nurture a virtual pet (`00-SYNTHESIS.md` §1). But one of Joon's four
loudest, category-defining complaints is an **age cliff at ~12**: the virtual pet and the
whole visual language read "childish" to a 10–12-year-old, so families churn exactly when
the child ages out of the cute-pet frame (`01-feature-matrix.md` #24; `00-SYNTHESIS.md` §1
"an age cliff at ~12", §6 risk #6 "win on … age up gracefully", §7 "age up gracefully";
`11 §2/§12`, `30 §3.9`). This is a documented, ownable white-space gap — one of the four
Joon weaknesses the product exists to attack.

### 1.2 Why the fix is an identity tier, not "just older"
The app currently ships a **binary** age axis: `young` (~4–7) and `older` (~8–12). That
lumps a 12-year-old in with an 8-year-old: same "Bubble Buddy" pet, same "care for your
buddy" framing, same celebration ceiling. The aging-up fix is a **third capability tier**
for ~10–12 — call it **`preteen`** — whose default companion is a **less childish
avatar/energy-signature** (a new `companionStyle: "avatar"`) framed as **identity/level**,
not a pet to nurture. This is grounded in Self-Determination Theory: older kids' durable
motivation leans harder on **autonomy + identity/competence** than on a cuddly parasocial
pet (`01-feature-matrix.md` #24 sci justification; `00-SYNTHESIS.md` §2.3 "curated
autonomy … maps to SDT"; fact-check `gamification-sdt` — use SDT as the backbone, keep the
extrinsic tokens). **Honesty guardrail (must hold in all copy):** this addresses a
retention/identity gap; it is NOT a core-symptom treatment claim (`00-SYNTHESIS.md` §4.6;
`66` §5.9 over-claiming gate).

### 1.3 What the feature is, in one sentence
A third, parent-selectable age band (`preteen`, ~10–12) that resolves — through the
existing theme/capability/content/celebration resolvers, with **zero new component
branches on `ageMode`** — to a cooler visual scale, more autonomy defaults, subtler
celebrations, and a new **avatar** companion ("Nova") with **identity framing** ("Avatar",
"Level", "Vibe") instead of pet-care framing ("Buddy", "Bond", "Mood"); the mode itself is
always FREE, and it composes cleanly with low-stim / calm / reduced-motion.

### 1.4 Non-goals (locked)
- No new age *data* per child beyond the `ageMode` value (no birthdate tracking; the
  existing optional `birthMonth` is untouched).
- No AI/LLM avatar generation — the avatar is procedural SVG, identical machinery to the
  existing buddy (ZERO-AI constraint).
- No teen (13+) band in this spec (the seam supports it later; out of scope here).
- No removal or reskin of `young`/`older` — they are unchanged; `preteen` is purely
  additive.

---

## 2. UX behavior — screen by screen

**Golden rule restated:** the young / older / preteen differences below are ALL produced
by resolvers + capability flags. No screen adds an `if (ageMode === 'preteen')`. Copy comes
from `resolveContent(key, { ageMode })` (components read `ageMode` from `useThemeInputs()`
ONLY to feed the resolver — the sanctioned pattern already used in `celebrate.tsx`,
`DaypartDonePanel.tsx`, `rewards.tsx`, `peek.tsx`, `TaskRunner.tsx`). Companion art comes
from `resolveContent('buddy.artVariant', { companionStyle })` where `companionStyle` is the
NEW resolved `caps.companionStyle` (see §3.2), never a framing round-trip.

### 2.1 Kid shell selection (`app/(kid)/_layout.tsx`) — no change to the switch logic
The shell is already chosen from the resolved `capabilities.multiStepVisible` flag, never
raw `ageMode`. `preteen` sets `multiStepVisible: true` (§3.2), so a preteen child gets the
**older Tabs shell** (Today / Avatar / Rewards / Calm) automatically — no layout code
change beyond one copy rename:
- The **"Buddy" tab title** is routed through `resolveContent("buddy.tabTitle", { ageMode })`
  (currently a hardcoded literal). Young/older → "My Buddy" / "Buddy"; preteen → **"Avatar"**.
  Read `ageMode` from `useThemeInputs()` inside the tab option builder (resolver-feed, not a
  branch). If the build agent prefers to keep the literal, that is an acceptable degrade
  (see §9), but the rename is the visible identity payoff on the shell.

### 2.2 Kid — companion surface (`components/buddy/BuddyRoom.tsx`, rendered by `app/(kid)/buddy.tsx`)
This is the headline surface for the feature. Behavior by resolved axis:

- **Art variant.** `const variant = resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle })`.
  - `cuddly → "bloop"` (round, big eyes, cheeks), `cool → "orbit"` (sleeker orb), and NEW
    `avatar → "nova"` (§3.4: sleekest body, smallest calm eyes, no cheeks, an "identity
    ring", least expressive). Replaces the existing `caps.companionFraming === "care" ?
    "cuddly" : "cool"` round-trip (which structurally cannot reach `avatar`).
- **Framing copy.** The nurture read-out labels are routed through `resolveContent`:
  - `buddy.stat.bond`: young/older "Bond" → preteen **"Level"**
  - `buddy.stat.growth`: young/older "Stage" → preteen **"Rank"**
  - `buddy.stat.mood`: young/older "Mood" → preteen **"Vibe"**
  These replace the hardcoded `"Bond"/"Stage"/"Mood"` strings in `BuddyRoom`. The underlying
  data (`bondLevel`, `growthStage`, `mood`) is IDENTICAL across modes — only the label
  changes. No new data, so a mode switch is lossless.
- **Greeting.** `resolveContent("buddy.greet", { ageMode })`: young "Hi! I missed you!" /
  older "Hey — good to see you." / preteen **"Hey. Ready when you are."** (cooler, never
  babyish, never a guilt "I missed you" for the identity tier).
- **Customization sections** stay flag-gated exactly as today: `caps.canPickColor` /
  `caps.canPickTheme` (finish) / `caps.canPickAccessory`. `preteen` grants all three (§3.2)
  — the identity tier is the MOST customizable, per SDT autonomy.
- **Nurture is still monotonic and never-punishing** — `bondLevel`/`growthStage` derive
  from `lifetimeEarned` and never decrease; the avatar has NO sick/sad/neglected state (the
  `CompanionMood` union is positive-only by construction; §6). "Level/Rank" is a reframing
  of the same monotonic growth, NOT an XP bar that can drop.

### 2.3 Kid — core loop (`components/task/TaskRunner.tsx`, `StepCard`, `DoneButton`)
No structural change. `preteen` inherits the older-shell behavior via flags:
- `multiStepVisible: true` → the full checklist / complete-in-any-order view (calm grey-out
  on done, never "failed").
- `autonomy.canReorderSteps` default TRUE for preteen (§3.5 constants fix) → the reorder
  affordance is available.
- Celebration ceiling: `resolveCelebration` treats `preteen` steps at the **older ceiling
  (`medium`)** — subtler than young's `full` — which is exactly the "less childish" feel
  (no code change; `preteen` falls into the non-`young` branch; §3.3). Routine-complete
  still reaches `full` in all modes (a genuine milestone is celebrated for everyone).

### 2.4 Kid — celebration + daypart-done + rewards
- `app/(kid)/celebrate.tsx` and `components/kid/DaypartDonePanel.tsx` render the companion
  via `resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle })` — swap
  the framing round-trip for `caps.companionStyle` so the avatar appears here too.
- `celebrate.levelup` copy: young "Buddy grew! 🎉" / older "Your buddy leveled up." /
  preteen **"Level up."** (terse, cool).
- `app/(kid)/rewards.tsx` needs no aging-up change (already flag-driven: `maxChoices` 6,
  `showNumbersAndCharts` true for preteen via §3.2). The reward menu / collectibles wall are
  unchanged.

### 2.5 Parent — child profile editor (`app/(parent)/children.tsx`)
- **Age mode** `Segmented` becomes THREE options:
  `Younger (4–7)` · `Older (8–10)` · `Preteen (10–12)`.
  (Age 10 is a shared boundary the parent picks by the child's preference/maturity — SDT
  autonomy; the mode is a preference, not a birthdate lock.)
- **Companion style** `Segmented` becomes THREE options: `Cuddly` · `Cool` · `Avatar`.
  Still independent of age (a `cool`-loving 8-year-old keeps `cool`; a `cuddly`-loving
  preteen keeps `cuddly`) — the §1b.6 decoupling is preserved and now 3-wide.
- The **live side-by-side preview** (`ChildModePreview`, §2.7) now shows all three bands.
- Everything on this screen stays FREE (never paywalled) — `children.tsx` is explicitly
  ungated.

### 2.6 Parent — onboarding child setup (`app/(onboarding)/child-setup.tsx`)
The age `Segmented` gains the third `Preteen (10–12)` option. `createChildWithSeed` /
`updateProfile` already take `ageMode`; the seed then instantiates the avatar species
because `defaultCompanionStyle("preteen") === "avatar"` flows through
`defaultChildSettings` → `createChildWithSeed` (§3.2/§3.5). The collapsed preview reflects
the choice.

### 2.7 Parent — live preview (`components/parent/ChildModePreview.tsx`)
Extend the hardcoded `(["young", "older"] as const)` map to
`(["young", "older", "preteen"] as const)`. Wrap the tiles in a **horizontal `ScrollView`**
(3 fixed-width ~150dp tiles) so three fit on a phone. Each tile reads its own resolved
palette/tokens/flags via the nested `<ThemeProvider overrideAgeMode={mode}>` — already the
mechanism — and now uses `caps.companionStyle` (not the framing round-trip) so the preteen
tile shows the **Nova avatar** with **Tide** palette and text-first sample card. The
selected mode tile keeps its highlighted border.

### 2.8 YOUNG vs OLDER vs PRETEEN — the resolved differences (single reference table)
| Resolved axis | young (4–7) | older (8–10) | **preteen (10–12)** | Where |
|---|---|---|---|---|
| Palette | Reef (bright) | Tide (+dark) | **Tide (+dark)** | `resolveTokens.pickPalette` |
| Type scale | large/heavy | standard | **standard** (`TYPE_PRETEEN`) | `resolveTokens` |
| `textFirst` | false (pictures) | true | **true** | `resolveTokens` / `defaultTextFirst` |
| `spokenLabelDefault` | true (auto) | false | **false** (mutable, on tap) | `resolveTokens` |
| TTS pitch | high/bubbly | neutral | **neutral** | `services/tts.ts` |
| Shell | single-surface | Tabs | **Tabs** | `multiStepVisible` |
| `maxChoices` | 3 | 6 | **6** | `resolveCapabilities` |
| `showNumbersAndCharts` | false | true | **true** | `resolveCapabilities` |
| `companionStyle` default | cuddly | cool | **avatar** | `defaultCompanionStyle` |
| `companionFraming` | care | levelup | **identity** | `resolveCapabilities` |
| Buddy art | bloop | orbit | **nova** | `resolveContent('buddy.artVariant')` |
| Companion labels | Buddy/Bond/Stage/Mood | Buddy/Bond/Stage/Mood | **Avatar/Level/Rank/Vibe** | `resolveContent` |
| `canPick{Color,Accessory,Theme}` | color only | all three | **all three** | `resolveCapabilities` |
| `canReorderSteps` default | false | true | **true** | `constants.defaultChildSettings` |
| `delegateToChild` default | false | false | **true** | `resolveCapabilities` |
| Step celebration ceiling | full | medium | **medium** | `resolveCelebration` |

### 2.9 Low-stim / calm / reduced-motion composition (unchanged, verified)
`preteen` composes with the second axis exactly like the other bands:
- `sensoryMode: 'lowStim'` (per-child) OR global `lowStimTheme` OR OS Reduce-Motion →
  **Stillwater** palette + `confetti:false` + shortened/zeroed motion (`pickPalette` returns
  Stillwater for lowStim REGARDLESS of age — no aging-up change needed).
- The Nova avatar renders **static** (`animate={t.motion.loopsEnabled}` → false under
  reduced-motion/lowStim) — the `BubbleBuddy` `animate` prop already gates every loop/blink.
- `calmMode` → celebration clamps to `calm`; the identity "Level/Rank/Vibe" labels still
  apply, but tokens/confetti hide per the existing calm path.

---

## 3. Data-model additions (exact TS + which store) + additive migration notes

All additions are **additive union members** and **additive optional fields** — no existing
persisted shape changes, so **no `SCHEMA_VERSION` bump and no `MIGRATIONS` entry are
required** (§3.6). The TypeScript `Record<AgeMode, …>` / `Record<CompanionStyle, …>` /
`Record<BuddyArtVariant, …>` maps will FORCE the build agent (via `tsc --noEmit`
exhaustiveness errors) to fill the new entries — the compiler is the checklist.

### 3.1 `src/domain/types.ts` — the two union extensions (source of truth)
```ts
// ~L19: add the third band. ~10–12 identity tier. Additive; existing data valid.
export type AgeMode = "young" | "older" | "preteen";

// ~L34: add the third, INDEPENDENT companion style (the identity avatar).
// Default derived from ageMode (preteen -> avatar) but overridable per §1b.6.
export type CompanionStyle = "cuddly" | "cool" | "avatar";
```
Persisted in: `ChildProfile.ageMode` + `ChildIndexEntry.ageMode` (childStore),
`ChildSettings.companionStyle` (childStore), `CompanionSeed.style` (seed data only).
No field is added to any persisted interface; only the set of allowed values grows.

### 3.2 `src/theme/resolveCapabilities.ts` — the capability tier (NOT persisted; pure resolver)
```ts
// widen the framing type
companionFraming: "care" | "levelup" | "identity";
// NEW: expose the RESOLVED companionStyle so components stop round-tripping through
// framing (which cannot represent `avatar`). This is the durable fix that makes the
// avatar reachable everywhere.
companionStyle: CompanionStyle;

// defaults derived from age (both overridable):
export function defaultCompanionStyle(ageMode: AgeMode): CompanionStyle {
  if (ageMode === "young") return "cuddly";
  if (ageMode === "older") return "cool";
  return "avatar"; // preteen
}
export function defaultTextFirst(ageMode: AgeMode): boolean {
  return ageMode !== "young"; // older + preteen are text-first
}

// AGE_CAP_BASE gains a `preteen` entry (Record<AgeMode> forces it):
preteen: {
  ttsDefault: true,          // on but mutable (a preteen usually mutes it)
  maxChoices: 6,
  multiStepVisible: true,    // Tabs shell + checklist
  showNumbersAndCharts: true,
  canPickColor: true,
  canPickAccessory: true,
  canPickTheme: true,
  delegateToChild: true,     // MORE autonomy than `older` (identity/SDT)
  canAddTasks: false,        // still parent-grantable
  moodCheckin: false,        // opt-in
},

// in resolveCapabilities(): compute companionStyle once and return it + the 3-way framing:
const companionStyle = input.companionStyle ?? defaultCompanionStyle(ageMode);
const companionFraming =
  companionStyle === "cuddly" ? "care" : companionStyle === "cool" ? "levelup" : "identity";
return { /* …existing… */, companionStyle, companionFraming };
```

### 3.3 `src/theme/resolveTokens.ts` — tokens for the tier (pure resolver)
```ts
// TYPE_PRETEEN: start identical to TYPE_OLDER (a preteen reads at the older scale). A
// future polish pass may tighten it; for now reuse the older metrics.
const TYPE_PRETEEN: TypeScale = { ...TYPE_OLDER };

// AGE_BASE gains preteen (Record<AgeMode> forces it): mirror `older` metrics.
preteen: {
  touchTargetMin: 48, primaryActionMin: 96, fontScale: 1.0, radius: 22,
  type: TYPE_PRETEEN, textFirst: true, spokenLabelDefault: false,
  showLabels: true, soundscapeDefault: false,
},

// RESPONSIVE gains preteen (Record<AgeMode> forces it): mirror `older` (tablet 2-col).
preteen: { phone: { contentMaxWidth: 640, columns: 1 },
           tablet: { contentMaxWidth: 960, columns: 2 } },

// pickPalette(): preteen reuses Tide (light/dark) — doc 61 §2.4 states Tide "supports
// aging-up". Add an explicit branch for clarity (the current `else -> Tide` already
// catches preteen, but be explicit so a future distinct "Slate" palette is a 1-line swap):
if (ageMode === "young") return { colors: REEF, themeClass: "tb-reef" };
// older | preteen -> Tide (the only palette with a dark variant)
return colorScheme === "dark"
  ? { colors: TIDE_DARK, themeClass: "tb-tide-dark" }
  : { colors: TIDE_LIGHT, themeClass: "tb-tide" };
```
No new NativeWind CSS-var class / `global.css` entry is needed because preteen reuses the
`tb-tide` / `tb-tide-dark` classes. (A dedicated palette is an open assumption, §9.)

### 3.4 `src/theme/resolveContent.ts` + `components/buddy/buddyVisuals.ts` — copy + art
```ts
// resolveContent.ts — ModeKeyed gains an OPTIONAL third variant. This PRESERVES the
// compile-time guarantee that young+older are both required (so no key ships half-
// populated), while making the preteen voice an additive override that FALLS BACK to the
// respectful `older` copy when omitted.
export type ModeKeyed<T> = { young: T; older: T; preteen?: T };

// resolve impl: prefer the exact band, else fall back to `older` (never `young`).
return (COPY[key][opts.ageMode ?? "young"] ?? COPY[key].older) as string;

// BuddyArtVariant gains "nova"; BUDDY_ART (Record<CompanionStyle>) forces the mapping:
export type BuddyArtVariant = "bloop" | "orbit" | "nova";
const BUDDY_ART: Record<CompanionStyle, BuddyArtVariant> =
  { cuddly: "bloop", cool: "orbit", avatar: "nova" };

// ageModeLabel: switch AGE_MODE_LABEL to Record<AgeMode,string> so all THREE are compiler-
// forced (parent-facing profile rows / preview tiles):
const AGE_MODE_LABEL: Record<AgeMode, string> =
  { young: "Younger", older: "Older", preteen: "Preteen" };

// New / extended COPY entries (identity overrides; unlisted keys keep 2 variants + fall
// back to `older` for preteen):
"buddy.tabTitle":  { young: "My Buddy", older: "Buddy", preteen: "Avatar" },
"buddy.greet":     { young: "Hi! I missed you!", older: "Hey — good to see you.", preteen: "Hey. Ready when you are." },
"celebrate.levelup": { young: "Buddy grew! 🎉", older: "Your buddy leveled up.", preteen: "Level up." },
"buddy.stat.bond":   { young: "Bond", older: "Bond", preteen: "Level" },
"buddy.stat.growth": { young: "Stage", older: "Stage", preteen: "Rank" },
"buddy.stat.mood":   { young: "Mood", older: "Mood", preteen: "Vibe" },
```
```ts
// buddyVisuals.ts — VariantPreset gains an optional identity flourish; VARIANT_PRESETS
// (Record<BuddyArtVariant>) forces the `nova` entry.
export interface VariantPreset {
  bodyStretch: number; eyeScale: number; cheeks: boolean; expressiveness: number;
  /** NEW: a subtle orbital "identity ring" — the avatar reads as a signature, not a pet. */
  identityRing?: boolean;
}
export const VARIANT_PRESETS: Record<BuddyArtVariant, VariantPreset> = {
  bloop: { bodyStretch: 1.0,  eyeScale: 1.0,  cheeks: true,  expressiveness: 1.0 },
  orbit: { bodyStretch: 1.08, eyeScale: 0.78, cheeks: false, expressiveness: 0.72 },
  nova:  { bodyStretch: 1.14, eyeScale: 0.6,  cheeks: false, expressiveness: 0.5, identityRing: true },
};
```
The mood→pose table (`buddyPose`) is UNCHANGED — it switches over the positive-only
`CompanionMood` union, so `nova` inherits the same never-negative expressions (just
rendered smaller/sleeker via `expressiveness`). `growthVisual` is unchanged (monotonic).

### 3.5 `src/domain/constants.ts` — default child settings (persisted via childStore)
`defaultChildSettings(ageMode)` already derives `companionStyle`/`textFirst` from the
resolvers, so `preteen` auto-gets `companionStyle:"avatar"` + `textFirst:true`. Two
one-line touch-ups so the preteen defaults are correct:
```ts
// celebrationIntensity: young 'full', else 'medium' — preteen -> 'medium' (already correct).
// FIX canReorderSteps so preteen (like older) can reorder:
canReorderSteps: ageMode !== "young",   // was: ageMode === "older"
```
`defaultReinforcementConfig` (young keeps a longer dense phase; preteen uses the default)
and `defaultProgressConfig` (young 2 freeze; preteen 1) already do the right thing for a
non-`young` band via their `ageMode === "young"` guards — no change.

### 3.6 Migration notes (ADDITIVE — no version bump)
- **No `SCHEMA_VERSION` bump, no `MIGRATIONS` entry.** Existing persisted
  `ageMode ∈ {young, older}` and `companionStyle ∈ {cuddly, cool}` remain valid members of
  the widened unions. New values (`preteen`, `avatar`, `nova` art) are only ever WRITTEN by
  a parent choosing them post-update.
- **`validateAndRepair` is unaffected** — it does not (and should not) touch
  `ageMode`/`companionStyle`. Optional hardening (recommended, not required): have the
  resolvers fall back to the `older` branch for any unrecognized `ageMode` string so a
  corrupt value can never produce an undefined token lookup. (`resolveTokens`/
  `resolveCapabilities` `Record<AgeMode>` lookups are total over the union; a *corrupt*
  non-union string would return undefined — add a `?? AGE_BASE.older` / `?? AGE_CAP_BASE.older`
  guard if defending against corruption.)
- **Forward-safety:** an OLDER build (pre-update) reading a `preteen`/`avatar` value would
  fall into its own binary defaults (effectively `older`) — degraded but never crashing or
  data-losing, consistent with the doc 62 §3 forward/backward-safety contract.
- **Seed data** (`buddyCosmetics.ts`) grows by one `CompanionSeed` (§4); `seedChild` already
  selects the species by `companionStyle` (`COMPANION_SEEDS.find(c => c.style === companionStyle)`),
  so once the `avatar` seed exists, a preteen child seeds the Nova species with no seed-logic
  change. `SEED_VERSION` may stay at 1 (re-merge by id is idempotent).

---

## 4. Exact files to CREATE and MODIFY (real paths under `tiny-bubbles/`)

### CREATE
- `tiny-bubbles/__tests__/theme/agingUp.test.ts` — the feature's focused suite (§7): asserts
  the preteen resolutions, the `avatar → nova` mapping, `companionStyle` on capabilities,
  the identity copy + `older` fallback, and lossless mode-switch. (May instead extend the
  existing `__tests__/theme/{capabilities,tokens,content}.test.ts` — either is fine; a
  dedicated file keeps the diff legible.)

### MODIFY — resolvers / domain (the load-bearing additive edits)
1. `tiny-bubbles/src/domain/types.ts` — `AgeMode` += `"preteen"`; `CompanionStyle` += `"avatar"` (§3.1).
2. `tiny-bubbles/src/theme/resolveCapabilities.ts` — `preteen` in `AGE_CAP_BASE`; return
   `companionStyle`; 3-way `companionFraming`; `defaultCompanionStyle`/`defaultTextFirst`
   handle preteen (§3.2).
3. `tiny-bubbles/src/theme/resolveTokens.ts` — `TYPE_PRETEEN`, `AGE_BASE.preteen`,
   `RESPONSIVE.preteen`, explicit `pickPalette` preteen→Tide branch (§3.3).
4. `tiny-bubbles/src/theme/resolveContent.ts` — `ModeKeyed` optional `preteen?`; `older`
   fallback in the resolver; `BuddyArtVariant` += `"nova"`; `BUDDY_ART.avatar`;
   `AGE_MODE_LABEL` → `Record<AgeMode,string>`; new/extended identity copy keys (§3.4).
5. `tiny-bubbles/src/domain/constants.ts` — `canReorderSteps: ageMode !== "young"` (§3.5).
6. `tiny-bubbles/components/buddy/buddyVisuals.ts` — `VariantPreset.identityRing?`;
   `VARIANT_PRESETS.nova` (§3.4).

### MODIFY — companion rendering
7. `tiny-bubbles/components/buddy/BubbleBuddy.tsx` — render the `nova` identity ring when
   `preset.identityRing` (a thin, low-opacity `react-native-svg` `Circle`/`Ellipse`
   orbital ring around the body; suppressed when `!animate`/reduced-motion is fine — it is a
   static ring, so it may stay). Sleeker geometry already flows from the preset
   (`bodyStretch`/`eyeScale`/`expressiveness`); no cheeks (preset `cheeks:false`).
8. `tiny-bubbles/components/buddy/BuddyRoom.tsx` — swap the framing round-trip for
   `caps.companionStyle`; route the three stat labels + greeting through `resolveContent`
   (`buddy.stat.bond/growth/mood`, read `ageMode` via `useThemeInputs()`).

### MODIFY — kid surfaces (framing round-trip → `caps.companionStyle`)
9. `tiny-bubbles/app/(kid)/celebrate.tsx` — `companionStyle = caps.companionStyle` (was
   `caps.companionFraming === "care" ? "cuddly" : "cool"`).
10. `tiny-bubbles/components/kid/DaypartDonePanel.tsx` — same swap.
11. `tiny-bubbles/app/(kid)/_layout.tsx` — "Buddy" tab title via
    `resolveContent("buddy.tabTitle", { ageMode: useThemeInputs().ageMode })` → "Avatar" for
    preteen (§2.1).

### MODIFY — parent + onboarding UI
12. `tiny-bubbles/app/(parent)/children.tsx` — 3-way age `Segmented` (Younger 4–7 / Older
    8–10 / Preteen 10–12); 3-way companion-style `Segmented` (Cuddly / Cool / Avatar).
13. `tiny-bubbles/app/(onboarding)/child-setup.tsx` — 3-way age `Segmented`.
14. `tiny-bubbles/components/parent/ChildModePreview.tsx` — iterate
    `["young","older","preteen"]` in a horizontal `ScrollView`; use `caps.companionStyle`.
15. `tiny-bubbles/app/_theme-gallery.tsx` (dev-only) — add the `preteen` toggle option; use
    `caps.companionStyle`. (Keeps the dev gallery honest; harmless if skipped.)

### MODIFY — seed data
16. `tiny-bubbles/src/data/buddyCosmetics.ts` — add the third `CompanionSeed`
    (`speciesId:"nova"`, `style:"avatar"`, `defaultName:"Nova"`, free starter colors, e.g.
    `["color_tide","color_grape"]`); OPTIONAL additive "identity" cosmetics (a couple of
    avatar-flavored finishes/accessories, following the existing free-starter + premium-
    acquisition split — never retention-gated). No change to `seedChild`.

### VERIFY-ONLY (no edit expected, but confirm compiler is green)
- `tiny-bubbles/src/theme/ThemeProvider.tsx` — already passes `companionStyle` through
  `useCapabilities`; confirm the widened union + new `companionStyle` return field compile.
- `tiny-bubbles/src/services/tts.ts` — `voiceParamsFor` neutral branch already covers
  preteen; no change (a preteen gets neutral pitch — correct).
- `tiny-bubbles/src/theme/resolveCelebration.ts` — preteen falls into the non-young `medium`
  ceiling; no change.
- `tiny-bubbles/src/state/gameplay.ts` (`createChildWithSeed`) + `src/data/seed.ts` — pass
  `companionStyle` through to `seedChild`; verify the avatar species seeds for preteen.
- `tiny-bubbles/src/theme/__typetests__/content-typetest.ts` — the `good`/`bad` `ModeKeyed`
  proofs still hold (young+older still required); add a proof that a preteen-only key is a
  type error (§7).

---

## 5. Reused prebuilt libraries (prefer existing deps; NO new deps)

**No new dependency is required.** Everything rides existing stack deps already in
`package.json` and already exercised by the shipped app:
- `react-native-svg` (15.x) + `react-native-reanimated` (4.x) — the Nova avatar reuses the
  exact `BubbleBuddy` machinery (animated `Path`, `RadialGradient`, `useSharedValue`,
  `useAnimatedProps`); the identity ring is one more static `Circle`/`Ellipse`.
- `zustand` v5 — no new store; `childStore`/`buddyStore` hold the (unchanged-shape) values.
- TypeScript 6 — the `Record<AgeMode|CompanionStyle|BuddyArtVariant, …>` maps are the
  build checklist (exhaustiveness errors guide the agent).
- `expo-speech` (`tts.ts`), NativeWind v4 (reused `tb-tide` classes) — unchanged.
- `date-fns`/`date-fns-tz`, notifications, haptics, audio — untouched by this feature.

No MIT (or other) library needs to be added; introducing one would violate the
"prefer existing deps" rule with zero benefit here.

---

## 6. Anti-shame + no-AI rules that apply

1. **No AI, ever.** The avatar is 100% procedural SVG (identical to the pet). No LLM/avatar
   generator, no "AI style" toggle, no chatbot. The companion (in any style) is a non-AI
   entity (`66` §5.8; `01-current-state.md` §4.6).
2. **Positive-only companion, all three styles.** Nova inherits the positive-only
   `CompanionMood` union and the `smile ≥ 0` mouth clamp in `buddyVisuals` — there is
   structurally no sad/neglected/"you haven't leveled me" avatar state. "Level/Rank" is a
   monotonic reframing of `bondLevel`/`growthStage`; it can never DROP (no XP loss, no
   demotion), so it is not a streak/loss mechanic (`66` §5.1/§5.2; `62` §9/§10).
3. **Identity framing is never guilt.** Preteen `buddy.greet` is "Hey. Ready when you are." —
   never "I missed you"/"where were you." The reminder banned-phrase gate (`66` §1b.14,
   enforced in `notifications.ts`) still forbids any companion re-engagement/guilt string
   for ALL styles; the avatar cannot become a nag.
4. **Celebration is decoupled from mastery.** Preteen's subtler ceiling (`medium` steps)
   comes only from `resolveCelebration`'s salience/age ceiling — NEVER from reinforcement
   phase/streak/"you're too old for confetti" (phase is not even a parameter of the
   resolver; the type-test proves it). Routine-complete still reaches `full` for a preteen.
5. **The mode itself is free and non-punishing to switch.** Flipping `ageMode` /
   `companionStyle` NEVER resets tokens, ledger, progress, streaks, unlocked cosmetics, or
   companion growth (identical persisted shape across modes — §3.6). Owned cosmetics stay
   owned (`66` §1b.11). A parent can move a child young↔older↔preteen losslessly, any number
   of times.
6. **No over-claiming.** All copy stays within the reviewed allow-list (routines / autonomy /
   identity) — never "treats/cures/clinically proven." "Aging-up" is a retention/identity
   fix, not a therapeutic claim (`66` §5.9; `00-SYNTHESIS.md` §4.6).
7. **Curated autonomy holds.** Preteen `maxChoices` is 6 (never unlimited); the avatar's
   customization is the same curated, capped cosmetic set (`66` §5.11).

---

## 7. Acceptance criteria + verify steps

### 7.1 Acceptance criteria
- **AC1 — union + compile.** `AgeMode` and `CompanionStyle` include the new members; the
  whole tree type-checks (the `Record<AgeMode>`/`Record<CompanionStyle>`/`Record<BuddyArtVariant>`
  maps are all filled). `npx tsc --noEmit` exits 0.
- **AC2 — resolvers.** For `ageMode:"preteen"`: `resolveTokens` returns the Tide palette
  (`themeClass` `tb-tide`/`tb-tide-dark`), `textFirst:true`, `columns` 1(phone)/2(tablet);
  `resolveCapabilities` returns `multiStepVisible:true`, `showNumbersAndCharts:true`,
  `maxChoices:6`, `companionStyle:"avatar"`, `companionFraming:"identity"`,
  `delegateToChild:true`; `resolveContent("buddy.artVariant",{companionStyle:"avatar"})`
  === `"nova"`.
- **AC3 — copy fallback + identity overrides.** `resolveContent(k,{ageMode:"preteen"})`
  returns the preteen override where defined (`buddy.tabTitle`→"Avatar",
  `buddy.stat.bond`→"Level", `buddy.greet`→"Hey. Ready when you are.") and otherwise the
  `older` string (never the `young` string). Young+older remain compile-required
  (`content-typetest.ts` `bad` still errors).
- **AC4 — companion never negative.** For every `CompanionMood`, `buddyPose(mood).smile ≥ 0`
  with the `nova` preset; there is no `avatar` code path to a sad/sick state.
- **AC5 — lossless switch.** Toggling a child young→older→preteen→young in
  `app/(parent)/children.tsx` leaves ledger balance, `lifetimeEarned`, `progress`,
  `longestStreakDays`, unlocked cosmetics, and `bondLevel`/`growthStage` UNCHANGED.
- **AC6 — free-tier.** Selecting `preteen` / `avatar` is available with `tier:"free"`
  (no `<PremiumGate>` wraps the age or companion-style controls; `entitlements.ts` lists
  neither as gated).
- **AC7 — no raw-ageMode/no-prop regressions.** No component gains an `if (ageMode === …)`
  branch and no `<BubbleBuddy ageMode=…>` prop exists; the framing round-trips are removed
  in favor of `caps.companionStyle`.
- **AC8 — calm/low-stim compose.** `preteen` + `lowStim` resolves to Stillwater +
  `confetti:false`; the Nova avatar renders static under reduced-motion.

### 7.2 Verify steps an agent runs
```bash
cd "tiny-bubbles"
npx tsc --noEmit                 # AC1, AC3 (type-tests), AC7 (compile)
npx jest                         # AC2–AC5, AC8 (new/extended theme + buddyVisuals suites)
npx expo export --platform web   # web-safe: builds without native-only APIs

# AC7 grep gates (must return ONLY resolvers/constants/tts, never app/components):
grep -rnE "=== \"(young|older|preteen)\"|=== '(young|older|preteen)'" src app components \
  | grep -v "__tests__"          # expect hits only in resolveTokens/resolveCapabilities/
                                 # resolveCelebration/constants/tts (the sanctioned resolvers)
grep -rn "companionFraming === \"care\"" app components src   # expect ZERO (round-trips removed)
grep -rnE "<BubbleBuddy[^>]*ageMode|ageMode=\{" components app # expect ZERO
```
Manual (dev client or `_theme-gallery`): set a child to **Preteen** in
`app/(parent)/children.tsx`; confirm the kid shell shows Tabs with an **"Avatar"** tab, the
companion is the **Nova** avatar (sleeker, no cheeks, identity ring), the buddy screen reads
**Level / Rank / Vibe**, celebrations are subtler (medium step / full routine-complete), and
switching back to Older restores the pet + "Bond/Stage/Mood" with tokens intact.

---

## 8. Dependencies on other feature specs + premium/free classification

### 8.1 Dependencies
- **Foundational (already shipped):** the age-adaptive engine — `src/theme/*` resolvers,
  `ThemeProvider`, `resolveCelebration`, the procedural `BubbleBuddy`. This feature is a
  pure extension of them; nothing new must be built first.
- **`child-autonomy.md` (coordinate, not blocked):** that spec also derives framing from
  `companionStyle` (`child-autonomy.md` L119/L346). Both specs must land the SAME
  `companionStyle` widening + the `caps.companionStyle` exposure; if built together, do the
  `resolveCapabilities.companionStyle` change once. Preteen's `delegateToChild:true` +
  `maxChoices:6` dovetail with child-autonomy's grant model.
- **`multi-child.md` (shared file):** edits the same `app/(parent)/children.tsx` per-child
  editor (age/companion-style rows). Merge the 3-way `Segmented`s with multi-child's
  switcher additions; no logic conflict.
- **`novelty-refresh.md` (optional, for premium avatar packs):** the OPTIONAL identity
  cosmetic pack (§4 item 16) rides the existing additive `Cosmetic`/`SeasonalPack` /
  `registerSeasonalPack` seam and the `companionThemes`/`noveltyPipeline` gates — reuse,
  don't duplicate. The core aging-up mode does NOT depend on novelty-refresh shipping.

### 8.2 Premium / free classification
- **The aging-up MODE is FREE (core loop, always).** `preteen` `ageMode`, the `avatar`
  `companionStyle`, the identity framing, and the Nova art are accessibility/identity, not
  monetization — `entitlements.ts` explicitly NEVER gates `ageMode`/`companionStyle`
  (`66` §1b.11; `entitlements.ts` NEVER-GATED list). You cannot paywall the fix to the age
  cliff. **Do not wrap the age or companion-style controls in `<PremiumGate>`.**
- **Optional PREMIUM = extra avatar/identity cosmetics only.** Like every cosmetic, new
  avatar finishes/accessories split into a free starter set + premium-**acquisition** items
  via the existing `Cosmetic.premium` flag and `FEATURE_GATES.companionThemes` — and
  **retention is never gated** (owned-forever; a downgrade changes nothing the child sees,
  `66` §1b.11). This is the same model the shipped cosmetics already use — no new billing
  surface.

---

## 9. Open assumptions

1. **Band naming + boundaries.** Third band named `preteen`, labeled "Preteen (10–12)", with
   `older` relabeled "Older (8–10)" and a shared boundary at 10 the parent picks by
   preference (SDT autonomy). If product prefers `tween` or non-overlapping "8–10 / 11–12",
   it is a label-only change (the code value string is the only durable coupling — keep it
   stable once chosen). Assumed acceptable.
2. **Palette reuse (Tide).** `preteen` reuses the Tide palette (which doc 61 §2.4 already
   frames as aging-up-ready, with dark mode). A dedicated "Slate" palette (new tokens + one
   NativeWind CSS-var class in `global.css` + a `pickPalette` branch) is a deferred visual
   polish, not required for the retention fix. Assumed reuse is sufficient for v1.
3. **Nova art fidelity.** The avatar is delivered by re-parameterizing the existing
   `BubbleBuddy` (sleeker body, smaller calm eyes, no cheeks, an identity ring) rather than a
   bespoke faceless avatar. If product wants a truly face-optional "energy signature," that
   is an additive `BubbleBuddy` render branch behind the same `nova` variant key — no API
   change. Assumed the re-parameterized orb reads sufficiently "less childish" for v1.
4. **Preteen copy voice.** Preteen copy overrides only the identity-flavored keys and falls
   back to the (respectful, non-babyish) `older` copy elsewhere. If a fuller preteen voice is
   wanted later, add more `preteen:` entries — additive, no structural change.
5. **`ttsDefault` for preteen.** Left `true` (mutable) for consistency with `older`; a
   preteen typically mutes spoken labels. If product wants preteen `ttsDefault:false`, flip
   the one `AGE_CAP_BASE.preteen` value (the child setting still overrides either way).
6. **Corrupt-`ageMode` hardening** (resolver `?? older` fallback) is recommended but optional;
   since only parent action writes the value, it is defense-in-depth, not a correctness
   requirement. Assumed optional for v1.
