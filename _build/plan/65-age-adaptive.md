# Tiny Bubbles — Age-Adaptive Strategy (ages ~4–12)

*Plan doc 65. Compiled 2026-06-28. Defines how the product adapts across two parent-set, per-child age modes — **young** (~4–7) and **older** (~8–12) — for every MVP feature and every cross-cutting concern, plus the mode-switch mechanism and the shared (non-forked) architecture that makes it work.*

**Reads with:** `_build/research/00-SYNTHESIS.md`, `_build/research/01-feature-matrix.md`, `_build/research/40-ux-engagement-patterns.md` (§7 non-readers, §9 curated autonomy, §8 progress, §11 dark patterns), `_build/research/30-community-asks.md` (§3.9 age/profile mismatch). Donor code under `_sources/`.

**Hard dependency / alignment:** This doc specifies the *age-mode dimension* that the **theming engine owns** (token-driven theming + content variants + capability flags). The architecture doc that defines the `ThemeProvider`/token contract is **not yet written** (`_build/plan/` is empty). When it lands, the `AgeMode` token sets, `useAgeMode()` hook, and `capabilities` resolver described here MUST be a first-class input to that engine — see §8 Open Questions.

---

## 0. Why age-adaptive is architectural, not cosmetic

The research names the **age cliff** as one of market leader Joon's four loudest failures: virtual pets read *"childish"* to older kids, *"Joon works best ages 6–10,"* and *"one size does not fit"* (`30` §3.9; `11` §2, §41). Families churn when the product stops fitting the child. A 4-year-old non-reader and an 11-year-old fluent reader cannot share one UI: one needs picture+icon+color+spoken-label with zero decodable words (`40` §7), the other is alienated by a babyish cuddly pet and wants autonomy/identity (`40` §9, SDT).

So Tiny Bubbles ships **two modes from day one**, but as **one codebase**. The wrong way (forking screens per age) doubles maintenance and guarantees drift. The right way: a single component tree where mode is a runtime value driving three layers — **theming tokens**, **content variants**, **capability flags**. Components are mode-agnostic; they read tokens/content/flags, never branch on a raw age string.

**Locked stance:** Age mode is a child-wellbeing/fit feature, **always free** — never paywalled. Locking "age-up" behind premium would re-create the exact age-cliff churn we are attacking and would be a dark pattern aimed at children (`00` §4.4; `40` §11).

---

## 1. The two modes at a glance

| Dimension | **young** (~4–7) | **older** (~8–12) |
|---|---|---|
| Mental model | "Care for my buddy; do the one thing on screen" | "Run my routine; level up my buddy/avatar; earn toward my reward" |
| Reading level | **Icon/color/picture + spoken-label FIRST**; text decorative/secondary; whole routine runnable with zero words decoded (`40` §7) | Text allowed as primary (≈grade 2–4), icon support; reading not required but rewarded |
| TTS default | **ON, pervasive** — every label/step/celebration spoken in companion voice; long-press anything to hear it | **ON by default but unobtrusive**; one-tap mute; stays as accessibility |
| Companion | "Bubble Buddy" — round, cuddly, big-eyed, cooing/giggling, hatches & grows, gentle "care" framing | "Buddy/avatar" — cooler, less babyish (stylized creature / sidekick / customizable avatar); chill personality, fist-bump not cuddle; "level up / customize" framing |
| Autonomy (curated choices) | **3 picture choices** max; parent pre-curates heavily | **up to 6 choices**; richer customization; optional kid-proposes-tasks (parent-approved) |
| Reward types/framing | Care/feed buddy, pop bubbles, stickers; backup reward shown as a single picture ("10 min TV") | Tokens/"coins," collectible skins/accessories/themes, save-toward-a-goal; choose own reward from curated menu |
| Copy tone | 1–3 words, warm, second-person, spoken-first ("Tap the bubble!", "Yay — you did it!") | Short sentences allowed, respectful, not babyish ("Nice — that's done.", "2 to go") |
| Density / complexity | **One element on screen**, oversized targets, no numbers/charts, single one-step loop | Short agenda/list, today's plan, simple streak number + light stats, a few tabs |
| Celebration intensity | Maximal: confetti + buddy dance + sound + haptic + voice cheer | Satisfying-but-snappy: particle + token count-up + sound + haptic; toggle-downable, never babyish |
| Parental-control depth | Parent owns ~everything; child surface is "do step → celebrate" | Parent owns money/rewards/mode/billing; can **delegate** (kid adds tasks, customizes, picks reward to save toward) via toggles |

Both modes are bound by the same **hard rules**: no shame/streak-loss/loss-aversion, no dying/guilt-tripping pet, no nagging, no dark-pattern paywalls, no clinical over-claiming, forgiving cumulative progress only, calm canvas + celebratory moments, curated autonomy (never open catalogs), and a calm/non-gamified path (`00` §4; `40` §11).

---

## 2. The mode-switch mechanism

**What it is.** Each child profile carries one field: `ageMode: 'young' | 'older'`. Everything age-adaptive derives from it (§3).

**Where it lives.** In the **Parent Zone**, behind the parental gate (see Feature 10) — under *Child Profile → Age mode*. The child can never change it. Children's-product / COPPA-aligned: the operator of consequence is the parent (`40` §11).

**How it's first set.** During child-profile creation (parent onboarding, adapting `lockin` `components/onboarding/*` + `app/(onboarding)/*` wizard). One question — *"How old is {name}?"* — maps **4–7 → young, 8–12 → older**. Because the 7/8 boundary is fuzzy (reading ability and maturity vary), the next screen shows a **live side-by-side preview** of both modes and lets the parent flip the default. We store the chosen `ageMode` and (optionally) the entered age for a future gentle nudge; we do **not** require a birthdate.

**Can it change? Yes — anytime, instantly, losslessly.**
- A single toggle in the Parent Zone flips the mode and the entire UI re-themes on next render (no rebuild, no reinstall).
- **All progress is mode-agnostic and persists across switches**: tokens, companion identity/level, history, unlocked items, streak counts, and rewards are stored independently of mode. Switching young→older does not reset or "downgrade" anything — consistent with our forgiving, cumulative-only rule (`00` §2.3).
- Optional, parent-controlled **age-up nudge**: if the stored age has crossed ~8 (or after long tenure), the Parent Zone may surface a quiet, dismissible card — *"{name} might enjoy the older-kid look. Preview it?"* It is **never automatic, never a notification to the child, never nagging** (`00` §4.3). The parent decides.

**Per child.** Mode is per profile, so one household/device can run a 5-year-old in young and a 10-year-old in older simultaneously. The full multi-child profile/sync system is a v1 feature (`01` #15), but **the `ageMode` field is per-profile from MVP** so we never retrofit it.

---

## 3. Shared architecture (one codebase, three driven layers)

Mode is resolved once and consumed everywhere. We do **not** fork screens.

```
ChildProfile { id, name, ageMode: 'young'|'older', cosmeticThemeId, companionId, ... }
        │
   useAgeMode()            ← reads active child profile from context (AsyncStorage-backed)
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  resolveCapabilities(ageMode) → ModeCapabilities                   │
│  resolveModeTokens(ageMode)   → design tokens (theming engine)     │
│  resolveContent(ageMode, key) → copy / TTS string / art-variant    │
└──────────────────────────────────────────────────────────────────┘
        │                       │                         │
   capability flags       token-driven theming       content variants
```

### 3.1 Layer A — token-driven theming (aligns with the architecture doc's engine)

The theming engine exposes **two base token sets** keyed by mode. The same components consume tokens; mode swaps the values. Donor foundations:
- `lockin` NativeWind v4 — `tailwind.config.js` (`theme.extend.colors`, `fontFamily`), `global.css` (`:root` CSS vars `--background`/`--foreground`). Today it ships an adult **swiss-red** palette (`swiss.red #FF3B30`) that must be replaced (`50` §5).
- `habit-tracker-app` `app/theme/colors.ts` — semantic tokens (`text`, `textDim`, `background`, `tint`, `border`, `separator`, `success`) over a `palette`. This semantic-token shape is the contract to standardize on (current values are muted adult terracotta — reskin).
- `momentum` `frontend/src/lib/theme/ThemeProvider.tsx` + `frontend/src/hooks/useReducedMotion.ts` — provider pattern + reduced-motion support to preserve.

**Mode controls these token dimensions:**

| Token | young | older |
|---|---|---|
| Type scale | Larger base, fewer sizes; labels optional | Smaller base, more sizes; body text first-class |
| Touch target | Oversized (well above ~2cm / 44–48dp floor, `40` §6) | Large but denser (≥44dp) |
| Color saturation | Bright, high-contrast, playful | Bright but cooler/less candy; more neutrals allowed |
| Motion intensity | Bouncy, springy idle animation | Calmer, snappier (still reduced-motion aware) |
| Icon:text ratio | Icon-dominant | Balanced |
| Density/spacing | Very airy, one focal element | Moderate, list-capable |

**Two-tier theming.** Mode sets the **base** token set; the per-child **cosmetic theme/skin** (earned, unlockable) sets accent/skin on top. Reuse `tether` `DockTheme` (`_sources/tether/app/src/shared/types.ts`: `{ id, name, previewColor, backgroundColor, borderColor?, glowColor?, unlockCost, rarity, gradient?, special? }`) and the `DOCK_THEMES` catalog + `GamificationService.getThemes()/unlockTheme()` (`_sources/tether/app/src/electron/services/GamificationService.ts`). Curate **two cosmetic catalogs** (cuddly skins vs cooler skins) selected by `ageMode`; both ride the identical `DockTheme` schema, so the engine and unlock economy are shared.

### 3.2 Layer B — content variants

A content resolver returns mode-keyed values so we never hardcode copy in components:
```ts
type ModeKeyed<T> = { young: T; older: T };
resolveContent('celebrate.done', ageMode) // → "Yay — you did it!" | "Nice — that's done."
```
Resolves: **copy** (reading level/tone), **TTS strings** (and whether spoken), **companion art-variant key** (cuddly vs cooler), and **icon-vs-label** rendering. Build atop `habit-tracker-app` `app/i18n/*` (`i18n-js` + `expo-localization`) so the mode axis composes with localization (mode is an orthogonal key, not a new language). TTS is **new dependency work** — add **`expo-speech`** (NOT currently in `lockin` `package.json`; `lockin` ships `expo-av`/`expo-haptics`/`expo-sensors` but no speech) wrapped behind a `speak(key)` helper that reads the resolved string and respects the mode's TTS default + parent override.

### 3.3 Layer C — capability flags

`resolveCapabilities(ageMode)` returns a typed object; components read **flags, never the raw mode string** (keeps it testable and lets us add a future band, e.g. teen 13+, with zero component rewrites):
```ts
interface ModeCapabilities {
  ttsDefault: boolean;          // young: true,  older: true (but mutable + quiet)
  textPrimary: boolean;         // young: false, older: true
  maxChoices: 3 | 6;            // curated-autonomy cap (40 §9)
  multiStepVisible: boolean;    // young: false (1 step), older: true (short agenda)
  showNumbersAndCharts: boolean;// young: false, older: true (light)
  customizationDepth: 'name' | 'name+color+accessory+theme';
  celebrationIntensity: 'max' | 'satisfying';
  companionFraming: 'care' | 'levelup';
  delegateToChild: boolean;     // young: false, older: parent-toggleable
  moodCheckin: boolean;         // young: false (v1), older: optional (v1)
}
```

**Why three layers, not one switch:** theming (look/feel), content (words/voice/art), and capability (what's allowed/shown) change at different rates and are owned by different parts of the system. Splitting them keeps each independently testable and prevents the "giant `if (young)` everywhere" anti-pattern that becomes a de facto fork.

---

## 4. Per-feature young vs older — MVP features (`01` #1–11)

Master comparison table; nuance follows below for features where it matters.

| # | MVP feature (donor) | **young (~4–7)** | **older (~8–12)** | Shared mechanism |
|---|---|---|---|---|
| 1 | **Immediate reward at completion** (`tether` `GamificationService.ts` + `useGamification.ts`; `lockin` `VictoryOverlay.tsx`, `MotivationCard.tsx`) | One giant tap → max celebration (confetti + buddy dance + sound + haptic + spoken cheer). No number shown — just bubbles/buddy reacting | Tap → satisfying celebration + visible **token count-up** + sound/haptic; toggle-downable; not babyish | Same engine + payout event (`PointEarningEvent`); celebration component reads `celebrationIntensity` flag + mode tokens |
| 2 | **Token economy → caregiver real-world rewards** (`tether` `GamificationService` points/unlockCost + `Rewards/*Tab.tsx`; backup-reward menu = new glue) | Tokens shown as collected objects ("bubbles"); **one** backup reward as a single picture card ("10 min TV"); parent fully sets it | Tokens as "coins"; child can **save toward** a reward and **choose** from a curated menu (≤6); shows balance/goal progress | One points ledger + one redemption model; UI density + framing differ by flags |
| 3 | **Nurtured companion** (`lockin` `components/dashboard/*Sprite.tsx` — Reanimated+SVG; **remove `isAngry`**) | Bubble Buddy: round, cuddly, very expressive, hatches/grows; warm childlike voice; "care for me" | Cooler buddy/avatar: stylized/sidekick/customizable; chill voice; "level up / gear up"; fewer needy "feed me" beats | **One `<Companion mood variant={artKey} />` contract** over a shared mood/animation state set; only art asset pack + voice + idle personality swap. Never sad/sick/angry in either |
| 4 | **Picture+icon+color+spoken task steps, one at a time** (`lockin` `MilestoneCard.tsx`/`MilestoneStack.tsx`, `app/focus-zone/*`; `habit-tracker-app` `create-new-habit.tsx` pickers; `expo-speech` glue) | **One step on screen**, big picture/icon/color, **spoken automatically**; zero words required; optional parent photo/video model of the step | Short ordered list visible (today's routine); text label primary + icon; TTS available, auto-off-able; can reorder | Same step data model (`lockin` `types.ts` `Milestone`/`Todo`); `multiStepVisible` + `textPrimary` flags + `speak()` differ |
| 5 | **Dead-simple parent setup + task assignment** (`habit-tracker-app` `create-new-habit.tsx`; `lockin` onboarding) | Parent builds routine from **templated picture tasks**, picks emoji/color; assigns to child; 2–3 taps | Same parent flow, **plus** optional "let {name} add their own tasks (you approve)" delegation toggle | Same authoring UI (emoji via `rn-emoji-keyboard`, color via `reanimated-color-picker`, day-of-week selector); `delegateToChild` flag exposes child authoring |
| 6 | **Forgiving progress — NO punitive streaks** (`momentum` `backend/src/lib/streaks.ts` `calculateTaskStreak`, `jobs/dailyRollover.ts`; `lockin` progress widgets) | **No streak number shown**; progress = cumulative bubbles/buddy growth; "you did 2 today!" spoken | Optional **cumulative** streak count + "3 of 5 — great job!" framing; never "0 / broken"; freeze/grace built in | Identical timezone-aware, gap-forgiving streak math + forgiving rollover; only whether/how it surfaces differs |
| 7 | **One-tap done + visual progress** (`habit-tracker-app` `home.tsx` `AnimatedCircularProgress`; bubble-fill reskin of `lockin` `CountdownTimer.tsx`) | Big filling **bubble meter**, starts partly full (endowed progress, `40` §8); pops on done; no % | Filling ring/meter + small numeric (e.g. "3/5"); starts partly full; subtle | Same progress primitive; numeric visibility = `showNumbersAndCharts` flag; never a vast empty bar (`40` §8) |
| 8 | **Calm, uncluttered, sensory UI** (`lockin` NativeWind + `habit-tracker-app` `app/theme/*`; `momentum` `useReducedMotion.ts`) | Most airy tokens, one focal element, oversized targets, bouncy motion; low-stim mode available | Denser-but-calm tokens, list-capable, calmer motion; low-stim mode available | One token contract (§3.1); reduced-motion + low-stim mode honored in both |
| 9 | **Few, tunable, point-of-performance reminders** (`lockin` `services/notifications.ts`/`focusNotification.ts`; quiet hours from `momentum` SettingsPage) | Reminder copy ultra-simple + can be **spoken**; aimed at parent-mediated routine; zero guilt | Slightly richer copy; can address the child directly but never guilt/begging | Same scheduler + quiet-hours + rate-limit; tone/voice via content variant; no nagging in either (`00` §4.3) |
| 10 | **Parental gate + controls** (`habit-tracker-app` `settings.tsx`; gate concept from `medtimer` `Biometrics.kt` math-challenge) | Gate protects **all** settings, rewards, mode; child surface has almost no settings | Same gate; older mode exposes optional **kid-autonomy sub-settings** the parent can grant | One gate; one settings store; `delegateToChild` reveals the extra older-mode toggles |
| 11 | **Free tier + transparent paywall (stub purchase)** (new; settings scaffold `habit-tracker-app` `settings.tsx`) | **Parent-facing only** — child never sees a paywall; premium = extra cuddly skins/themes | Parent-facing only; premium = extra cooler skins/themes/customization | One paywall surface in Parent Zone; **age mode itself is always free**; premium *catalog* differs by mode. No real processor (mock) |

### 4.1 Feature nuances worth stating explicitly

- **#1 / #7 celebration & progress.** Both modes celebrate *every* real completion (dense reinforcement, `00` §2.1). Young is maximal-multisensory; older is "satisfying but cool." Both start meters partly filled (endowed progress) and never show an intimidating empty bar (`40` §8). Older mode may *show* the token number; young mode shows objects, not digits.
- **#3 companion is the anti-fork keystone.** The single biggest age-fit risk (pet reads "childish" to older kids, `30` §3.9) is solved by **one sprite contract, two art packs**. Animation/mood states (`idle`, `celebrate`, `sleepy`, `cheer`) are shared; we swap the SVG asset set, voice, and idle personality via the `variant` art key. We **delete** the shame states from `lockin` (`ExecutionSprite.tsx` `isAngry`/angry-eyes/angry-jump at lines 28, 57–75, 96–121, and equivalents across the other `*Sprite.tsx`) in both modes — non-negotiable (`00` §4.1, §5).
- **#6 streaks.** The math (`momentum` `calculateTaskStreak`: increment if done within the window, reset only after a gap; `dailyRollover` promotes/defers instead of failing) is identical and forgiving in both modes. The *only* difference is surfacing: young hides the number entirely (a number a non-reader can't read and could read as pressure); older may show a cumulative, never-resettable-to-zero count with "X of Y" framing. Neither ever shows "Streak broken: 0" (`00` §4.1).
- **#11 monetization.** The paywall is **parent-facing and mode-independent** for the child (children never see paywalls — dark-pattern + FTC risk, `40` §11). Mode only changes *which cosmetic catalog* premium unlocks (cuddly vs cooler). Per locked decision: full functional paywall + gating designed, **purchase stubbed/mocked**, no real processor.

---

## 5. Per-concern young vs older — cross-cutting

| Concern | **young (~4–7)** | **older (~8–12)** | Shared mechanism |
|---|---|---|---|
| Reading level | Icon/color/picture + spoken-label first; text decorative; non-reader runs whole routine wordlessly (`40` §7) | Text primary (≈grade 2–4) + icon support | Content variant (`textPrimary` flag); same screens |
| TTS default | ON, pervasive, companion voice; long-press to hear anything | ON but quiet; one-tap mute; stays for accessibility | `expo-speech` `speak()` + `ttsDefault` flag + parent override |
| Companion art/personality | Cuddly creature; cooing; "care" | Cooler buddy/avatar; chill; "level up" | One sprite contract, two art packs + voices |
| Autonomy depth | 3 picture choices; parent pre-curates | ≤6 choices; richer customization; opt kid-authoring | `maxChoices` + `customizationDepth` + `delegateToChild` |
| Reward types/framing | Care buddy / pop bubbles / stickers; 1 picture backup reward | Coins / collectibles / save-toward-goal / pick reward | One ledger + redemption; framing via content + flags |
| Copy tone | 1–3 words, warm, spoken-first | Short sentences, respectful, not babyish | Content variant |
| Density / complexity | One element; oversized targets; no charts | Short list; light stats; a few tabs | Mode tokens + `multiStepVisible`/`showNumbersAndCharts` |
| Celebration intensity | Maximal multisensory | Satisfying, snappy, toggle-down | `celebrationIntensity` flag + tokens |
| Parental-control depth | Parent owns ~everything | Parent owns money/mode/billing; can delegate | One gate + settings; `delegateToChild` reveals extras |
| Navigation / IA | Near-single-screen "do step → celebrate"; minimal tabs | Home + routine list + buddy/customize + (light) stats | Same router (`lockin` expo-router); tabs gated by flags |
| Onboarding | Parent sets up; child "hatches" buddy, names it (from suggestions + audio) | Parent sets up; child picks/customizes avatar + name | One wizard (`lockin` onboarding); steps gated by flags |
| Accessibility | Reduced-motion + low-stim + high-contrast; TTS; never color-only meaning | Same; TTS opt-out preserved | `momentum` `useReducedMotion.ts`; color-not-sole-channel both modes |
| Notifications tone | Simplest, spoken-capable, zero guilt | Richer, may address child, zero guilt/begging | One scheduler (`lockin` notifications) + quiet hours; content variant |
| Mood/energy check-in (v1, `01` #16) | Off by default (younger kids; keep loop minimal) | Optional emoji grid (`momentum` `MoodSelector.tsx`: `value`/`onChange`/`disabled`, 4-point `ROUGH/OKAY/GOOD/GREAT`) | Same component; `moodCheckin` flag |
| Data model & persistence | `ageMode` on profile (AsyncStorage) | same | One `ChildProfile`; mode-agnostic progress |

---

## 6. Implementation sketch (where each piece lives)

1. **`ChildProfile` + `useAgeMode()`** — new context over AsyncStorage (pattern from `lockin` `contexts/*` + `habit-tracker-app` `app/utils/storage/storage.ts`). Holds `ageMode`, `cosmeticThemeId`, `companionId`. Extend `lockin` `types.ts` (add `ChildProfile`, `AgeMode`).
2. **`resolveCapabilities` / `resolveModeTokens` / `resolveContent`** — three pure resolvers (own module). Tokens feed the architecture doc's `ThemeProvider`; content composes with `habit-tracker-app` i18n; capabilities are read by feature components.
3. **Theming** — base token sets in NativeWind config + semantic-token shape from `habit-tracker-app` `app/theme/colors.ts`; cosmetic layer via `tether` `DockTheme`/`DOCK_THEMES` (two curated catalogs).
4. **Companion** — refactor `lockin` `*Sprite.tsx` into one `<Companion mood variant />` over an art registry; **strip all anger/shame states** first.
5. **TTS** — add `expo-speech`; `speak(key)` wrapper honoring `ttsDefault` + parent override.
6. **Mode switch UI** — Parent Zone screen (behind `medtimer`-style math gate) with toggle + live side-by-side preview; first-set during onboarding age question.
7. **Reminders/streaks/rewards** — single instances of `lockin` notifications, `momentum` streak math, `tether` gamification engine; mode changes only surfacing/tone/framing, never the underlying logic.

---

## 7. Key decisions (locked here)

1. **One codebase, three mode-driven layers** (theming tokens + content variants + capability flags). No forked screens. Components read flags, never the raw mode string.
2. **Mode is parent-set, per child, behind the parental gate**, first chosen from an age question with a live preview override, **changeable anytime, losslessly** (progress is mode-agnostic and cumulative).
3. **Companion = one sprite contract, two art packs** (cuddly vs cooler) — the keystone that beats Joon's age cliff without a fork. All shame states removed in both modes.
4. **Age mode is always free**; premium changes only the *cosmetic catalog* per mode, never access to age-up. Paywall is parent-facing only; child never sees it; purchase is stubbed.
5. **Streak math is identical and forgiving in both modes**; only surfacing differs (young hides the number; older shows a cumulative, never-zeroing count). Never "streak broken."
6. **TTS is new work** (`expo-speech`): ON+pervasive for young, ON+quiet+mutable for older.
7. **Capability flags are forward-compatible**: a future band (teen 13+) = new token set + content variant + flag profile, zero component rewrites.

---

## 8. Risks / open questions

1. **Architecture-doc dependency (highest).** The theming engine / `ThemeProvider` token contract is not yet written (`_build/plan/` empty). This doc assumes the engine accepts `ageMode` as a base-token selector and layers the `tether` cosmetic theme on top. If the architecture doc models theming differently, §3.1 must be reconciled. **Action:** make `AgeMode` a required input when the architecture doc is authored.
2. **The 7/8 boundary is fuzzy.** A precocious 6-year-old reader or a 9-year-old who prefers cuddly content won't fit the age→mode default. Mitigated by parent override + live preview + lossless switching, but copy/art must avoid making "young" feel like a demotion if an older kid is placed there.
3. **Two art packs + two cosmetic catalogs = real art/content cost.** The companion variants and skin catalogs are the largest non-code lift; under-resourcing the "cooler" pack would re-open the age cliff for older kids.
4. **TTS coverage & quality.** `expo-speech` is system-voice; a truly engaging *companion voice* (parasocial bond, `40` §2) may need recorded audio for key lines — scope decision for MVP vs v1.
5. **Mode vs cosmetic-theme interaction.** Base mode tokens and an unlocked high-saturation cosmetic skin could clash or hurt contrast/low-stim mode. Need a token-precedence rule (mode sets base + accessibility floors; cosmetic theme may only adjust accents within contrast limits).
6. **Multi-child in MVP.** `ageMode` is per-profile from MVP, but full multi-profile management/sync is v1 (`01` #15). A single-profile MVP must still store mode per profile to avoid a later migration.
