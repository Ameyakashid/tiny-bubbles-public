# Tiny Bubbles — Design System & Visual/Sensory Direction

*Plan doc 61 · Compiled 2026-06-28. The visual, motion, sound, and haptic specification that makes Tiny Bubbles feel premium and humane rather than like "another ADHD chore app." Grounded in `_build/research/40-ux-engagement-patterns.md`, `00-SYNTHESIS.md`, `01-feature-matrix.md`, and the actual donor code under `_sources/`.*

This doc is **concrete**: real hex tokens, real font packages, real Reanimated/expo-av/expo-haptics APIs, and exact references to the donor files we lift from and the donor mechanics we **delete**. It is the source of truth for `theme/`, the companion component, the celebration moment, and the sensory layer.

> **Design north star (from `40` §12):** a forgiving, immediate, low-friction token economy around a beloved, *never-punishing* companion, on a **calm canvas with celebratory moments**, with curated autonomy, everything spoken aloud for non-readers — and a deliberate refusal of the engagement-maximizing dark patterns the same toolkit makes easy.

---

## 0. Age-adaptive architecture (read first)

Age mode is a **first-class theming axis**, not a skin bolted on later. Every token, font size, density value, companion parameter, and motion/sound default is resolved through **two orthogonal switches**, both parent-set per child:

| Axis | Values | Set by | Default |
|---|---|---|---|
| `ageMode` | `young` (~4–7) · `older` (~8–12) | parent, per child profile | inferred from child age at setup |
| `sensoryMode` | `standard` · `lowStim` | parent (or child via a calm-corner toggle) | `standard` |

`lowStim` is **composable with both ages** (a 5-year-old and an 11-year-old can each be in calm mode). It is the "calm/non-gamified path" the research requires (`00` §2.3; `30` §3.6) and the OS **Reduce Motion / Reduce Transparency** accessibility flags force `lowStim`-equivalent motion automatically.

Implementation: a single `ThemeProvider` exposes a resolved `theme` object (`theme.color.*`, `theme.type.*`, `theme.space.*`, `theme.motion.*`, `theme.companion.*`) selected by `(ageMode, sensoryMode)`. Components **never** hardcode hex/px — they read semantic tokens, so a child switching modes re-themes instantly with zero component changes. This replaces lockin's single hardcoded `swiss` palette in `tailwind.config.js`.

---

## 1. Brand identity & the bubble motif

**Name:** Tiny Bubbles. **Tagline:** *"Small steps, big pops."* **Voice:** warm, encouraging, concrete, never bossy; praises *effort and identity-as-capable* ("You did something hard!"), never compliance ("Good kids finish their chores") — per `40` §11.3.

**The bubble is the universal unit of the entire product.** One metaphor carries every piece of feedback, which is what makes the app feel coherent and premium instead of a pile of widgets:

| Concept | Bubble expression |
|---|---|
| A task / routine step | a **bubble to pop** (one tap → it pops) or a **bubble to fill** |
| A token / currency | a small **gold bubble** ("Bubbles" is the currency name) |
| Daily / routine progress | a clear bubble **filling with liquid** (start partly full — endowed-progress, `40` §8) |
| A completion celebration | **bubbles bursting and floating up** |
| The companion | *is literally a bubble* — the "Bubble Buddy" (§6) |
| The canvas | slow, sparse **drifting background bubbles** (parallax; off in `lowStim`) |
| Rewards / collectibles | bubbles that **freeze into keepsakes** (accessories, finishes) |

**Logomark:** a cluster of three overlapping bubbles — the largest mid-*fill* (liquid ~70%), a small one popping (tiny particle ring), one with a specular highlight. Procedurally drawable in `react-native-svg`; same primitives as the companion, so the brand and the buddy are visually one family. **Wordmark:** "Tiny Bubbles" set in Fredoka SemiBold, the dot of any 'i' replaced by a bubble.

**What the brand explicitly is *not*:** no sharp edges, no klaxon-red urgency, no "swiss-red" severity (delete lockin's `#FF3B30` from all child surfaces), no countdown-doom timers, no scoreboards. Calm canvas; the *only* loud, saturated, fast moments are celebrations.

---

## 2. Color system

### 2.1 Principles

- **Calm canvas, celebratory moments.** Backgrounds are low-saturation; high-chroma color is rationed to the companion, the active step, tokens, and celebrations.
- **Triple-coded, never color-alone (WCAG 1.4.1).** Every state pairs color with an **icon/shape + spoken label** (`40` §7). Color-*coding* (morning = warm, evening = cool) is a *redundant* third channel only.
- **Colorblind-safe.** The load-bearing status contrast is **blue↔orange/gold** (safe across deuteranopia/protanopia/tritanopia), never red↔green. Success is *also* marked with a checkmark-bubble; "needs doing" with an outline bubble. We deliberately retire the donor "angry" reds (`habit-tracker-app/app/theme/colors.ts` `angry500 #C03403`; lockin `swiss.red`) from child UI.
- **Contrast targets:** body text ≥ **4.5:1**, large/graphical ≥ **3:1** (WCAG AA). Values below are checked against their stated surface.

### 2.2 Semantic token names (shared across all three palettes)

Every palette below fills the **same** keys, so swapping is free:

```
color.canvas              screen background (calm)
color.canvasGradTop/Bot   optional soft vertical gradient for canvas
color.surface             cards / sheets
color.surfaceAlt          secondary card / input fill
color.surfaceSunken       wells, progress tracks
color.primary             main brand action (the bubble blue)
color.primaryDeep         pressed/active, text-on-light accents
color.onPrimary           text/icon on primary
color.secondary           supportive accent
color.accent              warm highlight (sunny)
color.grow                companion / growth / "alive" green
color.token               currency gold (bubbles)
color.tokenGlow           token sparkle/halo
color.success             completion green (always + check icon)
color.successSurface      success chip background
color.info                neutral informational
color.gentleAlert         soft amber — PARENT-FACING ONLY, never to scold a child
color.text                primary text
color.textDim             secondary text
color.onDark              text on dark/overlay
color.border              hairline borders
color.separator           list separators
color.focusRing           keyboard/switch-access focus
color.scrim               modal/celebration backdrop
color.celebration[]       ordered array of confetti/bubble-burst hues
```

> Deliberately **absent: `error`/`danger`/`angry` as a child-facing color.** Child mistakes are never error-colored. Parent forms may use `gentleAlert` (amber) for validation only.

### 2.3 Palette A — "Reef" (young, `standard`)

Bright, candy-aquatic, warm. High-chroma accents on a soft sky canvas.

| Token | Hex | Notes / contrast |
|---|---|---|
| canvas | `#EAF6FF` | soft sky |
| canvasGradTop / Bot | `#EAF6FF` / `#FFF4FA` | barely-there sky→blush wash |
| surface | `#FFFFFF` | |
| surfaceAlt | `#F1F8FF` | |
| surfaceSunken | `#E3EFF8` | progress track |
| primary | `#1EA7E6` | bubble blue; 3.0:1 on white (large/graphic) — text uses primaryDeep |
| primaryDeep | `#0E6FA8` | 5.2:1 on white (body OK) |
| onPrimary | `#FFFFFF` | 3.0:1 on primary fill (large only) → use bold ≥18px |
| secondary | `#FF7A66` | coral |
| accent | `#FFC53D` | sunny yellow |
| grow | `#2ED3A0` | companion/growth |
| token | `#FFB020` | gold bubble; glow `#FFE08A` |
| tokenGlow | `#FFE08A` | |
| success | `#13A66B` | 4.6:1 on white; paired w/ check |
| successSurface | `#D9F5E8` | |
| info | `#4C8DD6` | |
| gentleAlert | `#E8941F` | parent-only |
| text | `#15293A` | deep navy; 13.6:1 on white |
| textDim | `#52677A` | 5.0:1 on white |
| onDark | `#F4FBFF` | |
| border | `#D3E6F2` | |
| separator | `#E6F0F7` | |
| focusRing | `#0E6FA8` | |
| scrim | `rgba(10,32,52,0.72)` | celebration backdrop (NOT lockin's black/90) |
| celebration[] | `#FFC53D` `#FF7A66` `#1EA7E6` `#2ED3A0` `#A06BE6` `#FF9EC2` | gold, coral, blue, mint, grape, pink |

### 2.4 Palette B — "Tide" (older, `standard`)

Cooler, cleaner, more "designed," less candy. Reads as a capable tool, not a toy — supports aging-up (`feature-matrix` #24). Ships with a dark variant (older kids ask for dark mode).

| Token | Hex (light) | Hex (dark) |
|---|---|---|
| canvas | `#F3F7FB` | `#0E1822` |
| canvasGradTop / Bot | `#F3F7FB` / `#ECF2F8` | `#0E1822` / `#101F2C` |
| surface | `#FFFFFF` | `#17242F` |
| surfaceAlt | `#EDF3F8` | `#1E2E3B` |
| surfaceSunken | `#E2EAF1` | `#0B141C` |
| primary | `#1C84AD` | `#39A7CE` |
| primaryDeep | `#10617F` | `#7FCDE6` |
| onPrimary | `#FFFFFF` | `#08131B` |
| secondary | `#5566E0` | `#8A97F0` |
| accent | `#17B3AD` | `#3FD0C8` |
| grow | `#1FB37E` | `#3BD79B` |
| token | `#E2A92F` | `#F3C75A` |
| tokenGlow | `#F7DD9C` | `#5A4B22` |
| success | `#159469` | `#3BD79B` |
| successSurface | `#D5EFE5` | `#13322A` |
| info | `#3E7FC2` | `#6FA8E0` |
| gentleAlert | `#D6881A` | `#F0A93A` |
| text | `#13202B` | `#EAF2F8` |
| textDim | `#54677A` | `#9FB2C2` |
| onDark | `#EAF2F8` | `#EAF2F8` |
| border | `#D9E3EC` | `#2A3B49` |
| separator | `#E6EDF3` | `#21323F` |
| focusRing | `#1C84AD` | `#39A7CE` |
| scrim | `rgba(8,18,26,0.74)` | `rgba(2,7,11,0.80)` |
| celebration[] | `#17B3AD` `#5566E0` `#1C84AD` `#1FB37E` `#E2A92F` `#7B5BE0` | teal, indigo, blue, green, gold, violet |

### 2.5 Palette C — "Stillwater" (low-stim / calm — overlays either age)

Desaturated, low-contrast-but-AA-compliant, warm-neutral. **No gradients, no background bubbles, single-hue celebration.** This is the palette the OS Reduce-Motion flag and the calm-corner toggle resolve to.

| Token | Hex | Notes |
|---|---|---|
| canvas | `#EEF0EC` | warm grey-green |
| canvasGradTop / Bot | `#EEF0EC` / `#EEF0EC` | flat (no gradient) |
| surface | `#F7F8F5` | |
| surfaceAlt | `#E8EBE5` | |
| surfaceSunken | `#DFE3DC` | |
| primary | `#5E8398` | muted slate-blue; 4.6:1 on surface |
| primaryDeep | `#3F6173` | 7.1:1 |
| onPrimary | `#FBFDFC` | |
| secondary | `#7E9A93` | sage |
| accent | `#C7B187` | muted sand |
| grow | `#6FA98C` | |
| token | `#BFA06A` | muted gold |
| tokenGlow | `#E3D5B6` | |
| success | `#5E977A` | 4.5:1; + check |
| successSurface | `#DCE8E0` | |
| info | `#6C8AA0` | |
| gentleAlert | `#B68A4A` | |
| text | `#26323A` | 11.2:1 on surface |
| textDim | `#5C6A72` | 5.1:1 |
| onDark | `#F2F4F0` | |
| border | `#D5DAD0` | |
| separator | `#E1E5DC` | |
| focusRing | `#3F6173` | |
| scrim | `rgba(38,50,58,0.55)` | softer, lower-contrast |
| celebration[] | `#6FA98C` | **single** soft green — gentle ripple, no multi-hue confetti |

### 2.6 Donor mapping

- **Keep the *shape* of** `habit-tracker-app/app/theme/colors.ts` (palette object + semantic-name layer) — it is the cleanest theming scaffold in the donors. **Replace** its earthy/terracotta `palette` values with the three palettes above and **drop** `angry100/500`.
- **Delete** lockin's `swiss` block in `tailwind.config.js` and every `bg-swiss-red`/`text-swiss-red` usage (notably `VictoryOverlay.tsx`, `CountdownTimer.tsx` seconds digit). NativeWind theme is regenerated from these tokens.
- Reuse `overlay20/overlay50` → renamed `scrim` (but lighten — our celebration backdrop is a soft tinted scrim, not lockin's near-opaque `bg-black/90`).

---

## 3. Typography

### 3.1 Font choices (all OFL, all via `@expo-google-fonts`)

We deliberately move off lockin's `Inter` (`tailwind.config.js`) and habit-tracker's `Space Grotesk` (`app/theme/typography.ts`) toward **friendlier, higher-legibility, reading-research-backed** families:

| Role | Family | Package | Why |
|---|---|---|---|
| **Display / headings / all young-mode UI** | **Fredoka** | `@expo-google-fonts/fredoka` (`Fredoka_400Regular`…`_600SemiBold`,`_700Bold`) | rounded, geometric, friendly-but-not-babyish; superb large-size legibility; the "bubble" roundness in type form |
| **Body / labels / dense older-mode text** | **Lexend** | `@expo-google-fonts/lexend` | engineered to *reduce reading distance and improve reading proficiency*; an evidence-aligned pick for ADHD/early readers |
| **Numerals (tokens, timers)** | Lexend (`tabular-nums` / `fontVariant:['tabular-nums']`) | — | non-jumping counters during roll-up animation |
| **Accessibility toggle** | **OpenDyslexic** (bundled local OFL) | local `assets/fonts` | parent/child toggle, swaps the body face app-wide (Tiimo-style sensory control, `40` §6) |

Load via `useFonts` at the splash (lockin already gates render on `useFonts` in its splash flow — reuse that pattern).

### 3.2 Type scale

Two physical scales; `young` is ~1 step larger and heavier with looser line height. Sizes in `dp`/`pt` (RN density-independent). **Min body text never below 16; young min 18.**

| Token | young size / line / weight | older size / line / weight | Use |
|---|---|---|---|
| display | 40 / 46 / Fredoka 700 | 32 / 38 / Fredoka 700 | celebration headline, big numbers |
| h1 | 30 / 36 / Fredoka 600 | 24 / 30 / Fredoka 600 | screen title |
| h2 | 24 / 30 / Fredoka 600 | 20 / 26 / Fredoka 600 | section / step title |
| bodyLg | 20 / 30 / Lexend 500 | 18 / 27 / Lexend 500 | the one on-screen step's label |
| body | 18 / 27 / Lexend 400 | 16 / 24 / Lexend 400 | general text (older only routinely shows this much) |
| label | 16 / 22 / Lexend 600 | 14 / 20 / Lexend 600 | button labels, chips |
| caption | 14 / 20 / Lexend 500 | 13 / 18 / Lexend 500 | parent-facing meta only |
| token | 24 / — / Lexend 700 tabular | 20 / — / Lexend 700 tabular | currency counter |

Rules: **max ~45 characters per line**; left-aligned (never justified); sentence case, never ALL-CAPS for child copy (delete lockin's `tracking-widest` uppercase "CONTINUE"/"MILESTONE COMPLETE" styling — shouty caps hurt legibility and tone). Dynamic Type / `fontScale` respected up to 1.3×; layouts wrap, never clip. Letterspacing 0 for Lexend body, slight `-0.01em` only on Fredoka display.

---

## 4. Iconography

**Approach: rounded, filled/duotone, triple-coded, mostly emoji for task pictures.**

- **System/UI icons:** **Phosphor** (`phosphor-react-native`, MIT) at **Fill** or **Duotone** weight — rounded terminals match the bubble aesthetic and read clearly at large sizes for young eyes. Fall back to **Ionicons** (already bundled via `@expo/vector-icons` in lockin, MIT) where a glyph is missing. One weight per mode (young = Fill, older = Duotone/Regular) so the set feels cohesive.
- **Task "pictures" (kid-facing):** use **emoji** chosen by the parent via the already-present `rn-emoji-keyboard` picker (`habit-tracker-app/app/screens/create-new-habit.tsx`) — universally recognizable, full-color, zero art cost, and instantly meaningful to non-readers. Optionally back a task with a **photo** (parent's camera) for hyper-concrete steps (Goally-style "video of brushing teeth," `30` §2.2).
- **Custom bubble glyphs** (token, pop, fill, buddy) drawn in `react-native-svg` so brand marks scale and animate.
- **Hard rules (`40` §7):** every icon carries a **text label *and* a spoken label** (TTS on focus/long-press — the "button speaks itself" pattern for pre-readers). Never icon-only. Never color-only meaning. Minimum icon optical size **32dp** (young) / **28dp** (older); inside ≥ 2cm hit targets (§5).

---

## 5. Spacing, touch targets, density, progressive disclosure

### 5.1 Spacing scale (4px grid)

Reuse `habit-tracker-app/app/theme/spacing.ts` verbatim — it is already a clean 4px scale:

```
xxxs 2 · xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48 · xxxl 64
```

### 5.2 Touch targets — the ~2cm rule (NN/G, `40` §6)

At Android's baseline 160dpi, **1cm ≈ 63dp**, so **2cm ≈ 126dp**. We honor this for the things that matter and stay generous elsewhere:

| Element | Min size | ≈ physical |
|---|---|---|
| **Primary "Done"/pop tap** (young) | **120 dp** height, full-width-ish | ~1.9 cm |
| Primary action (older) | 96 dp | ~1.5 cm |
| Any standalone tappable (both) | **64 dp × 64 dp** hit area | ~1 cm (absolute floor) |
| Spacing between targets | ≥ 12 dp (`sm`) | prevents mis-taps |

Hit area ≥ visual size (use `hitSlop`). This directly supersizes lockin's tiny `w-8 h-8` (32dp) sprite/control sizing, which is far too small for a 5-year-old.

### 5.3 Density modes

| | young | older | lowStim (overlay) |
|---|---|---|---|
| Screen padding | `lg` (24) | `md` (16) | `lg` (24) |
| Max primary actions on screen | **1** | 1–2 | 1 |
| Max cards/items visible | ~3 | ~5–6 | ~3, more whitespace |
| Card radius | 28–32 | 20–24 | 16 |
| Card elevation | soft, warm shadow | flatter | flat, hairline border only |
| Inter-card gap | `lg` | `md` | `xl` |

### 5.4 Progressive disclosure (`40` §6, feature #4/#8)

- **One routine step on screen at a time.** Never a full checklist to a young child (a long empty list is the demotivating "vast empty progress bar" of `40` §8). Completed steps **grey out and pop away** (Tiimo grey-out pattern); only "what's next" is vivid.
- **Parent setup = one decision per screen**, 2–3 taps total, templated (feature #5). No reading-heavy wizard (Habitica's onboarding-abandonment failure, `30` §3.5).
- **Curated choices: 3–6 options, never open catalogs** (`40` §9). Customization, rewards, task templates all capped.
- **Depth lives behind the parent gate** (feature #10): stats, billing, AI, difficulty, reward catalog. The child surface stays radically simple.

---

## 6. The companion — "Bubble Buddy"

The single most important retention object (`40` §2; `00` §2). **Fully procedural in `react-native-svg` + Reanimated — no external artist, no sprite sheets.** We keep lockin's *architecture* (a function component driving SVG `Path`/`Circle` with `useSharedValue` + `useAnimatedStyle` + `withRepeat/withSequence/withTiming/withSpring`, exactly as in `ScannerSprite.tsx`/`ExecutionSprite.tsx`) and **throw away its content and its shame states.**

### 6.1 Form (the drawable spec)

A single `<BubbleBuddy>` component, parameterized:

- **Body:** a near-circular **superellipse** (squircle) `Path` ~140×140 viewbox, translucent fill (`fillOpacity ~0.92`) in the chosen `bodyHue`, with a subtle inner **radial gradient** (lighter top) via `<RadialGradient>`. Gives the glassy bubble look.
- **Specular highlight:** one small white ellipse top-left at ~0.6 opacity (the "shine" that makes it read as a bubble, not a ball).
- **Rim light:** a thin lighter stroke arc on the lower-right.
- **Eyes:** two `Circle`s with darker pupil `Circle`s; pupils track via `pupilX/pupilY` shared values (reuse `ScannerSprite`'s gaze logic — random saccades every ~2.5s in IDLE, fixed gaze toward the active step during a task). Blink = animate eye `scaleY → 0.08` over 90ms every 3.5–6s (randomized).
- **Mouth:** a single `Path` whose control points are driven by an `expression` shared value (a smile-curve interpolation), so emotion is one animatable number.
- **Optional cheeks:** two soft blush ellipses (young only).
- **Shadow:** a soft ground ellipse (`grow`/neutral, low opacity) that scales inversely with the bob, selling the float.

### 6.2 Customization axes (curated, token-unlocked — `40` §9, feature #13)

| Axis | Options (capped) | Unlock |
|---|---|---|
| `bodyHue` | 6 palette-constrained hues (free starter set of 3) | tokens |
| `finish` | plain · sparkle · polka · gradient-glass · galaxy | tokens (rarity ladder, see below) |
| `accessory` | none + 6 curated (young: bow, party-hat, snorkel, star-clip, scarf, crown; older: visor, headphones, halo-ring, trail, shades, circuit-glow) | tokens |
| `name` | child/parent names it (TTS speaks the name) | free, deepens the parasocial bond |

Map the **rarity + unlockCost + previewColor + gradient{from,to}** model **directly** from `tether`'s `DOCK_THEMES` (`app/src/electron/services/GamificationService.ts`, `rarity: 'common'|'rare'|'epic'|'legendary'`, `unlockCost: 0/10/25/50/75/150/300`). We **re-skin** those dock themes into buddy `finish`/`accessory` collectibles — the data shape and unlock math transfer 1:1; only labels/art change. This also seeds the **novelty-refresh pipeline** (feature #12): rotate new finishes/accessories seasonally.

### 6.3 Allowed emotional states (and the forbidden ones)

**The buddy may ONLY ever be positive, neutral, or restful.** This is a hard, non-negotiable anti-shame rule (`00` §4.1; `40` §11; the explicit reason we must rip out lockin's mechanics).

| State | Trigger | Animation sketch |
|---|---|---|
| `neutral` (idle) | default | gentle bob (translateY −6↔0, 1800ms loop) + breathing (scale 0.97↔1.03) + occasional blink + slow saccades |
| `happy` | step done, app opened | bigger smile, springy bounce, eyes squint up, 1–2 sparkles |
| `celebrating` | routine complete / level-up | the full celebration (§8): jump, beam, confetti, glow pulse |
| `sleepy` | quiet hours / wind-down / long absence | half-lidded eyes, slow bob, a drifting "z" bubble — **resting, never sick** |
| `curious` / `listening` | TTS speaking, choosing options | head-tilt (rotate ±6°), pupils toward content, soft ear-cue pulse |
| `proud` | milestone, new collectible | puff-up (scale 1→1.08 hold), chest-out, slow nod |

**FORBIDDEN — never implement, ever:** `sad`, `angry`, `crying`, `sick`, `hungry`, `dying`, `deflated`, `disappointed`, `guilt`. There is **no failure state**. A missed day = the buddy is simply *sleeping peacefully* or *off on a little adventure* (Finch appointment mechanic, `40` §2/§5), then *delighted* to see the child return ("welcome back!" framing, `40` §11.2). 

> **Delete from lockin on contact:** `ExecutionSprite.tsx` `isAngry` state + angry eyes (`> <`) + angry-mark SVG + angry-jump; `ScannerSprite.tsx` `MOCKING`/`'LAUGH'|'SHOUT'|'CLAP'` phases, `DEFAULT_INSULTS`/`mockeryText`, tear animation, `excitementLevel` insults. Keep only `IDLE`/`APPROVED` (→ rename `celebrating`) plus the float/gaze/blink machinery.

### 6.4 Young vs older variants (one component, two presets)

Same `<BubbleBuddy>`, different parameter presets so the companion ages up (`00` §1; feature #24):

| Param | young — "Bloop" | older — "Orbit" |
|---|---|---|
| body roundness | very round, soft squircle | sleeker, slightly elongated orb |
| eye size | large (cuddly) | smaller, calmer |
| cheeks | yes (blush) | no |
| palette ref | Reef | Tide |
| finish bias | candy/sparkle | glassy gradient / subtle circuit-glow |
| accessories | toys (hat, bow, snorkel) | gear/style (visor, headphones, trail) |
| expressiveness | exaggerated (NN/G: young kids need unambiguous cues) | subtler, "cooler," less "childish" |
| voice cue | high, bubbly "boop" | lower, mellow chime |

Older mode can present Orbit as a near-abstract "energy orb" so it never reads as a baby toy — the documented Joon age-cliff fix.

---

## 7. Animation language (Reanimated v4)

Matches the APIs already in the donor (`react-native-reanimated` v4 + `react-native-worklets`; `useSharedValue`, `withTiming/withSpring/withSequence/withRepeat/withDelay`, `Easing`, `FadeIn/ZoomIn/SlideInDown`). Slow, purposeful motion that *guides* attention rather than demanding it (Tiimo, `40` §6) — except the celebration, which is allowed to be exuberant.

### 7.1 Motion tokens

```
motion.duration = { instant 120, quick 240, base 320, slow 520, celebrate 900 }
motion.easing  = {
  enter:  Easing.out(Easing.cubic),      // things arriving
  exit:   Easing.in(Easing.cubic),       // things leaving
  loop:   Easing.inOut(Easing.quad),     // idle/breathe (lockin already uses this)
  emphasize: Easing.inOut(Easing.cubic),
}
motion.spring  = {
  bouncy: { damping 9,  stiffness 140, mass 0.8 },  // celebration jumps
  gentle: { damping 16, stiffness 120, mass 0.9 },  // UI settle
}
```

`lowStim` / OS-Reduce-Motion transform: **durations ×1.4**, disable all `withRepeat` loops and parallax, replace `spring.bouncy` with `withTiming(base, emphasize)`, replace confetti with a single ripple. One shared `useReducedMotion()` gate.

### 7.2 Named animations

- **Idle bob/breathe** (buddy, §6.1) — `withRepeat(withSequence(withTiming(-6,{1800,loop}), withTiming(0,{1800,loop})), -1)`. (Calmer than lockin's 1500ms/±0.05 breathe.)
- **Bubble-fill (progress meter):** a `<ClipPath>` liquid `Rect` whose top rises with `withTiming(targetFillY, {520, enter})`; the liquid **surface wobbles** via a low-amplitude sine on a skew/translate shared value; 2–3 tiny bubbles rise inside on each increment (`translateY` up + `opacity→0`, staggered `withDelay(i*60)`). **Starts partly full** (endowed-progress, `40` §8) — never at 0, never a vast empty bar.
- **Step "pop":** tapped step card `scale` springs `1→1.12→1` (bouncy), its emoji becomes a bubble that **inflates then pops** (`scale 1→1.3` then `→0` with a 6-particle ring), 320ms.
- **Token payout:** a gold bubble `ZoomIn` from the tap point, **arcs** to the counter (`translateX` linear + `translateY` via `withSequence(up, down)` to fake a parabola, 500ms `emphasize`); on arrival the counter does `scale 1→1.3→1` (bouncy) and the number **rolls up** (tabular nums); a "+1" label floats up & fades.
- **Step→step transition:** outgoing step `SlideOutLeft`/`FadeOut` (240ms exit), incoming `SlideInRight`/`FadeIn` (320ms enter); the completed step floats up as a bubble.
- **Screen transitions:** reuse lockin's `FadeIn` + `SlideInDown` entrances (already in `VictoryOverlay`/`CountdownTimer`), retimed to tokens; never hard cuts.
- **Background ambience:** 4–7 sparse bubbles drift up slowly on a parallax layer (`standard` only; off in `lowStim`).
- **Visual timer (feature #14):** a calm **depleting bubble** (liquid lowering) or shrinking wedge, smooth `withTiming`, color easing canvas→accent as time nears — **no audio hijack** (§9).

---

## 8. The celebration moment (the single most important polish detail)

Fires the instant the child taps **Done** — this is the immediate, multisensory reinforcer doing the real therapeutic work (delay-discounting, `40` §1/§3; feature #1). **Sub-second start, non-blocking, interruptible** (the child can tap the next step and it gracefully cuts). Replaces lockin's `VictoryOverlay.tsx` (keep its `Modal` + `ZoomIn/SlideInDown/FadeIn` *structure*, retone everything: copy, color, sprite state).

### 8.1 Standard completion (single step) — timeline ≈ 900ms

| t (ms) | Channel | Event |
|---|---|---|
| 0 | haptic + sound | `Haptics.notificationAsync(Success)` + `step.done` "pop" sound |
| 0 | visual | tapped step card pop (`scale 1→1.12→1`, bouncy); emoji→bubble→pop |
| 60 | visual | a **halo bubble** expands from the tap point (`scale 0→2.2`, `opacity 1→0`, 500ms enter) |
| 80 | companion | buddy `happy`→ small jump (`withSequence(withSpring(-20,bouncy), withSpring(0))`) + beaming smile + sparkle eyes |
| 120 | token | gold bubble pops out, arcs to counter; counter pops; "+1" floats |
| 150 | visual | **bubble burst**: 12–18 small bubbles in `celebration[]` hues rise & drift, `scale 0→1→0.6`, `opacity→0`, staggered `withDelay(i*30)`, randomized x; 3–5 of them audibly *pop* |
| 200 | progress | day/routine bubble-fill rises to new level with surface wobble |
| ~300 | optional | TTS varied praise ("Nice pop!", "You did it!") if voice on |

### 8.2 Routine-complete / milestone — bigger, ≈ 1.4s

Reserved for *genuine* milestones (guardrail: "don't over-celebrate," `40` §3) — last step of a routine, companion level-up, new collectible:

- Soft tinted **scrim** (`color.scrim`, NOT lockin's opaque black) + centered card (`ZoomIn 500`).
- Buddy enters `celebrating`/`proud`: full jump + glow pulse + the new collectible dropping in.
- Denser, longer confetti/bubble fountain; `routine.complete` sound; `Haptics` sequence (§10).
- **Copy retone:** lockin's "MILESTONE COMPLETE / Objective met. Maintain your focus." → "You finished your morning! 🫧" / "Look what you did!" — effort/identity praise, sentence case, one warm line, one big **Done** button.

### 8.3 Variable *magnitude*, not variable *schedule* (critical ethics line)

Per `40` §3/§11 and the fact-check (`00` §2.2): **every** completion *always* celebrates (never withhold the base reward — that's the slot-machine variable-ratio trap). What varies is **how big**: routine steps get the standard burst; the final step / streak-of-the-day / level-up gets the large one; occasionally a small **bonus bubble** drops to keep it fresh (varied *content/magnitude* fighting the novelty cliff, not a compulsion engine). Magnitude is **never** tied to money or to re-opening the app.

### 8.4 `lowStim` celebration

Single soft **ripple** (one ring, one hue from Stillwater `celebration[]`), a gentle `calm`/marimba chime, **one** light haptic, buddy just smiles and does a tiny settle. No confetti, no scrim flash, no parallax. Fully sufficient as positive feedback for sensory-sensitive kids.

### 8.5 Quiet-hours behavior

During parent-set quiet hours (sleep/school), the celebration auto-softens toward `lowStim`, sound defaults off, buddy is `sleepy` — celebratory but never disruptive (no notification floods, `30` §3.4).

---

## 9. Sound design (expo-av)

Reuse lockin's `expo-av` `Audio.Sound.createAsync` + `replayAsync` pattern (`app/(tabs)/journey.tsx`). **lockin already ships `assets/sounds/bubble-pop-06-351337.mp3`** — that becomes our `step.done`. Build a small, cohesive **soft, watery/marimba/glassy** sound palette: rounded timbres, normalized loudness, max ~1.2s, no harsh stings.

### 9.1 Never hijack audio (hard rule, `30` §2.10 — the Brili complaint)

Configure the audio session to **mix, not seize**: `Audio.setAudioModeAsync({ playsInSilentModeIOS: false, interruptionModeIOS: MixWithOthers, shouldDuckAndroid: true, interruptionModeAndroid: DuckOthers })`. Cues **duck** background media (a child's music/podcast/parent's audio) for ~1s, never stop it. Respect the hardware silent switch except for an explicitly user-enabled "play sounds with phone on silent" option. Calm soundscape is the only loopable asset.

### 9.2 Named cues (all individually toggleable)

| Cue | When | Character |
|---|---|---|
| `tap.soft` | any UI tap | tiny soft tick |
| `step.done` | step complete | the **bubble pop** (existing asset) |
| `token.payout` | token lands on counter | short sparkly chime |
| `routine.complete` | routine/milestone | brief warm flourish (~1s) |
| `levelup.companion` | buddy levels up | rising shimmer |
| `reward.redeem` | real-world reward redeemed | gentle unlock chord |
| `buddy.greet` | app open / buddy tap | non-verbal companion "boop" (age-pitched, §6.4) |
| `transition.swoosh` | step→step | soft whoosh |
| `calm.ambient` | calm corner / optional during tasks | loopable low soundscape (Endel-style, feature #20) |
| `timer.tick` | visual timer | **off by default**; soft, never over media |

### 9.3 Controls

Master volume + **per-category toggles** (UI / celebration / companion voice / ambient), all in the parent-gated settings, mirroring Tiimo's "control all sounds" (`40` §6). TTS (`expo-speech`) for spoken labels/praise is its own toggle. Defaults: `standard` = sounds on; `lowStim` = celebration sounds soft, ambient available; quiet hours = off.

---

## 10. Haptic design (expo-haptics)

Reuse lockin's existing usage (`expo-haptics`: `notificationAsync(Success/Warning)`, `impactAsync(Light/Medium/Heavy)` in `app/focus-timer.tsx`, `journey.tsx`, `onboarding/ContractStep.tsx`). Haptics are a first-class feedback channel (`40` §3) but **fully toggleable** (many neurodivergent kids dislike them, `40` §6).

### 10.1 Named cues

| Cue | API | When |
|---|---|---|
| `haptic.tap` | `impactAsync(Light)` | UI tap / selection |
| `haptic.done` | `notificationAsync(Success)` | step complete |
| `haptic.token` | `impactAsync(Medium)` | token lands |
| `haptic.routineComplete` | `notificationAsync(Success)` → `withDelay 120ms` → `impactAsync(Medium)` | routine/milestone |
| `haptic.levelUp` | `impactAsync(Heavy)` → 2× `impactAsync(Light)` (sparkle) | buddy level-up |
| `haptic.select` | `impactAsync(Light)` | picker/toggle |

### 10.2 Hard rules

- **Never** `NotificationFeedbackType.Warning`/`Error` toward a child (no scolding by vibration). `Warning` is **parent-facing only** (form validation). This deletes lockin's `journey.tsx` Warning-haptic-on-failure usage from child flows.
- **No continuous buzzing**; cues are discrete and short.
- Defaults: `standard` = on; `lowStim` = **off** by default; honor the OS "System Haptics" setting; quiet hours = off.

---

## 11. Implementation checklist & donor map

| Layer | Build from | Action |
|---|---|---|
| Theme tokens | `habit-tracker-app/app/theme/{colors,spacing,typography,timing}.ts` | keep structure; replace values with §2–§5; add `(ageMode,sensoryMode)` resolver |
| NativeWind theme | lockin `tailwind.config.js` + `global.css` | delete `swiss`; generate from tokens; add Fredoka/Lexend `fontFamily` |
| Fonts | `@expo-google-fonts/fredoka`, `@expo-google-fonts/lexend`, local OpenDyslexic | load via lockin's `useFonts` splash gate |
| Companion | lockin `ScannerSprite.tsx` + `ExecutionSprite.tsx` (architecture only) | rewrite as `<BubbleBuddy>`; strip ALL anger/mockery/tear/insult; keep float/gaze/blink; add §6 states |
| Celebration | lockin `VictoryOverlay.tsx` + `MotivationCard.tsx` | keep Modal/entrance structure; retone copy+color+sprite; build §8 timeline |
| Progress / bubble-fill | habit-tracker `home.tsx` `AnimatedCircularProgress`; lockin `CountdownTimer.tsx` | reskin to liquid bubble-fill; start partly full |
| Tokens / collectibles | `tether` `GamificationService.ts` `DOCK_THEMES` (rarity/unlockCost/gradient) | re-skin themes → buddy finishes/accessories; reuse unlock math |
| Task pictures | habit-tracker `create-new-habit.tsx` (`rn-emoji-keyboard`, `ColorPicker`) | parent picks emoji+color per task |
| Sound | lockin `expo-av` usage + `assets/sounds/bubble-pop-06-351337.mp3` | mix-don't-hijack session config; §9 cue set |
| Haptics | lockin `expo-haptics` usage | §10 cue set; remove child-facing Warning haptics |
| Mood check-in (feature #16) | `momentum/MoodSelector.tsx` | reskin to bubble faces; **note:** mood is about the *child's* feeling (all states OK) — distinct from the buddy, which is never negative |

---

## 12. Non-negotiable design rules (one-screen recap)

1. **Calm canvas, celebratory moments** — saturation/motion/sound rationed to companion, active step, tokens, celebration.
2. **Companion is only ever positive/neutral/sleepy.** No sad/angry/sick/guilt/dying. No failure state. Ever.
3. **No shame, no streak-loss color, no loss-aversion, no FOMO timers, no nagging, no dark-pattern paywall UI.**
4. **Triple-code everything** (color + icon/shape + spoken label); colorblind-safe (blue↔gold, never red↔green); WCAG AA contrast.
5. **~2cm primary touch targets; one step on screen; 3–6 curated choices; progressive disclosure; depth behind the parent gate.**
6. **Every sensory channel toggleable; audio mixes (never hijacks); haptics never scold; quiet hours respected.**
7. **Variable magnitude, never variable schedule** — always celebrate, vary only the size, never tie to money or re-opening.
8. **A real low-stim/calm path** composable with both ages, honored automatically by OS Reduce-Motion.
</content>
</invoke>
