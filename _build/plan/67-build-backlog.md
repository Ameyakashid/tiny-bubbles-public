# Tiny Bubbles — Build Backlog (ordered, checkbox) — FINAL

*Plan doc 67. The executable checklist companion to `66-MASTER-PLAN.md` (FINAL). Work top-to-bottom; do not start a milestone until the previous one's acceptance box is checked (the app stays runnable at every milestone boundary). Checkpoint letters (CP) map to `64-assembly-plan.md`. Canonical reconciliations referenced as §1b.x live in doc 66.*

---

## M0 — Scaffold, toolchain, app boots  · effort M · CP A
- [ ] `npx create-expo-app@latest tiny-bubbles -t expo-template-blank-typescript`
- [ ] Install router/anim core: expo-router, safe-area-context, screens, gesture-handler, reanimated v4, `react-native-worklets`, expo-font, expo-splash-screen, expo-dev-client
- [ ] Install NativeWind v4 + tailwindcss ^3.4
- [ ] Copy + retone build config from lockin: `babel.config.js`, `metro.config.js`, `global.css`, `tailwind.config.js` (kids palette placeholder, NO `swiss.red`)
- [ ] **Switch `babel.config.js` to `'react-native-worklets/plugin'`** (NOT `'react-native-reanimated/plugin'`) — Reanimated 4 + worklets 0.5.1
- [ ] Configure `app.json` (scheme, `typedRoutes:true`, `ios.supportsTablet:true`, Android package, portrait); **add the `expo-notifications` config plugin** (icon/sounds/permission); **NO Notifee plugin**; **NO `UIBackgroundModes`** (no background audio); keep `eas.json` profiles
- [ ] Root `app/_layout.tsx` + `app/index.tsx` placeholder; strict `tsconfig.json`
- [ ] Add `LICENSE` (MIT) + `THIRD_PARTY_NOTICES.md` (lockin = only code donor; habit-tracker/Ignite + tether + momentum as **reference patterns**; standing **`Bundled assets (audio/fonts/images)`** section, empty) + `PROVENANCE.md` (per-file origin manifest) + `CONTRIBUTING.md` (reference-only + provenance rules)
- [ ] Drop unwanted deps: `expo-ai-kit`, `@google/genai`, `expo-media-library`, `@bacons/apple-targets`, `@expo/ngrok`, **`@notifee/react-native`**
- [ ] **Accept:** boots clean on iOS + Android dev client; web **renders + navigates (subset only)**; `tsc --noEmit` passes; grep `swiss`/`@google/genai`/`@notifee`/`react-native-reanimated/plugin` → zero

## M1 — Dependency reconciliation + native sandbox (de-risk the REAL risks)  · effort L
- [ ] Install storage/loop deps: `react-native-mmkv@^3`, expo-haptics, **`expo-audio`** (NOT expo-av), expo-speech, expo-crypto, expo-notifications, `zustand@^5`, `react-native-svg@15.12.1`, `date-fns@3.6`, `date-fns-tz@^3`
- [ ] Install UI libs at New-Arch majors: **`@gorhom/bottom-sheet@>=5.1.8`** (first R4-compatible), `reanimated-color-picker@^4`, `rn-emoji-keyboard@^1.9`, `react-native-circular-progress@^1.4.1`, `@react-native-community/datetimepicker@^8.5`
- [ ] Build throwaway `app/_sandbox.tsx` exercising the REAL risks first: (a) **animated `react-native-svg` `Path` `d` + `RadialGradient` driven by a Reanimated shared value**; (b) **Modal / router-modal with `FadeIn`/`ZoomIn`/`SlideInDown` entering animations**; (c) **`Speech.speak()` + `Speech.getAvailableVoicesAsync()`**; (d) **tap→haptic+`playCue()` audio latency probe (<300ms)**; plus emoji/color/datetime pickers, bottom sheet, circular progress, MMKV read/write, expo-notifications schedule
- [ ] Verify each on a physical Android + iOS dev client (New Arch / Reanimated 4); **gate M6 on (a); gate M7 on (b)+(d)**; document any failure + **named** replacement (if `react-native-circular-progress` fails → hand-rolled Reanimated+SVG ring)
- [ ] **Accept:** (a)–(d) pass; all pickers open + animate with no worklet errors; MMKV value survives reload; a local notification fires

## M2 — Design system + theming/age engine + celebration resolver (de-risk)  · effort XL · CP C
- [ ] `src/theme/tokens.ts` (+ `contentMaxWidth`, `columns`) + `src/theme/breakpoints.ts`
- [ ] `resolveTokens.ts` (ageMode base + sensoryMode/reducedMotion reducers + **screen-size/breakpoint dimension** → tablet layouts per mode)
- [ ] `resolveCapabilities.ts` (`maxChoices`, `multiStepVisible`, `showNumbersAndCharts`, **`canPickColor`/`canPickAccessory`/`canPickTheme`** [replace `customizationDepth`], `companionFraming` from `companionStyle`, `delegateToChild`, **`canAddTasks`**, `moodCheckin`)
- [ ] `resolveContent.ts` (mode-keyed copy/TTS + **`buddy.artVariant`** key; typed `ModeKeyed<T>` that **forces both young+older variants at compile time**)
- [ ] **`resolveCelebration.ts`** — single resolver (§1b.3): salience sets size; ageMode ceiling; sensory/calm/quiet-hours clamp; **phase NEVER reduces size**
- [ ] **`ThemeProvider.tsx` with scoped `overrideAgeMode`** + hooks accept optional override (`useThemeTokens(opts?)`, `useCapabilities(opts?)`) → enables live side-by-side preview
- [ ] `useThemeTokens.ts`, `useReducedMotion.ts`
- [ ] NativeWind palettes: Reef (young/standard), Tide (older/standard + dark), Stillwater (lowStim) via CSS-var class set in `global.css`
- [ ] Load fonts **Fredoka + Lexend (`@expo-google-fonts/*`) + local OpenDyslexic** at splash; type scale per doc 61 §3
- [ ] `src/services/tts.ts` (expo-speech) with **age-driven pitch/rate** params + `components/ui/SpokenLabel.tsx`; motion tokens
- [ ] Dev screen `app/_theme-gallery.tsx` (both modes side-by-side via override provider)
- [ ] **Accept:** young↔older flips size/font/text-first/palette live AND renders both modes via `overrideAgeMode`; independent `companionStyle`/`textFirst` overrides work; lowStim desaturates + kills confetti + shortens motion; OS Reduce-Motion forces gentle; tablet viewport changes `contentMaxWidth`/`columns`; SpokenLabel speaks age-pitched; `resolveCelebration` never lowers size by phase; missing content variant = type error; zero inline `if (young)`

## M3 — Storage, persistence & migration layer  · effort M
- [ ] `src/storage/mmkv.ts` port (+ AsyncStorage web shim)
- [ ] `persist.ts` (Zustand persist adapter, partialize, per-store version)
- [ ] `schemaVersion.ts` (`SCHEMA_VERSION`, `tb/` keys per doc 62 §2)
- [ ] `migrations.ts` (ordered migrations + `mergeWithDefaults` + `validateAndRepair`, re-authored from tether pattern; **coerce out-of-set `CompanionMood` → `content`** per §1b.7)
- [ ] One-time AsyncStorage→MMKV import; `StoreHydrationGate.tsx`; `tb/`-scoped reset helper
- [ ] **Accept:** value survives force-quit; version bump migrates with no loss; corrupt blob → safe defaults, no crash; reset clears only `tb/`

## M4 — Data layer: domain logic + stores + seed (net-new build)  · effort XL
- [ ] `src/domain/types.ts` — `TaskStatus` no `failed`; canonical **`CompanionMood`** union; canonical **`CelebrationLevel`** (`full|medium|gentle|calm`); `ChildSettings` gains **`sensoryMode`**, **`companionStyle`**, **`textFirst`**, `autonomy.canAddTasks` (drop `customizationDepth`); `ProgressState.savingTowardRewardId?`; `ParentSettings.localAnalyticsEnabled` **default false**; **remove badge engine** (cosmetics grid only)
- [ ] `gamification.ts` (`earn()` append + cap), `streaks.ts` (freeze/pause, never zero), `reinforcement.ts` (dense→thinning→maintenance; **only bonus cadence thins**; base + celebration never thinned; **bonus deterministic every-N, no `Math.random`**)
- [ ] **`companionMood.ts`** (event→mood rules table + decay; step done→`celebrating`→`content`; return→`excited`)
- [ ] `tasks.ts` (forgiving rollover today→someday), `tokens.ts` (redemption escrow + **auto-approve-under-N branch**)
- [ ] Stores: settings, child, task, reward, buddy (persisted) + session (in-memory) **+ persisted run-progress for resume-after-kill**
- [ ] `src/data/` seed packs: 15 task templates, 3 routines, 8 rewards, 2 companions; cosmetics carry **rarity + seasonal-pack shape + seed hook** (additive-only novelty seam); apply-once via `seedState`
- [ ] jest-expo unit tests: gamification / streaks / reinforcement / **companionMood** / **bonus-determinism**
- [ ] **Accept:** `npm test` green; multi-day gap never yields streak `0`; base token always paid; **celebration size never decreases with completion count**; **no `Math.random` in payout**; escrow refunds on decline zero-net; auto-approve works; mood derivation transitions+decays, never negative; grep domain for `failed`/`FAILED`/payout-`Math.random` → zero

## M5 — App shell, navigation & age-mode layout switch  · effort M
- [ ] Root `app/_layout.tsx` provider order: GestureHandlerRootView → SafeAreaProvider → StoreHydrationGate → ThemeProvider → **audio cue-registry init** → Stack (AIProvider omitted)
- [ ] `app/index.tsx` boot redirect (`!onboardingComplete` → onboarding else kid)
- [ ] Route groups `(onboarding)`, `(kid)`, `(parent)`, `(gate)` with placeholder screens
- [ ] `(kid)/_layout.tsx`: young single-surface (no tabs) vs older Tabs (Today/Buddy/Rewards/Calm) **from capability flags, not raw ageMode**
- [ ] `(gate)/parental-gate.tsx` stub + in-memory `parentUnlocked` cleared on background; deferred notif registration
- [ ] **Accept:** fresh→onboarding, complete→kid home; ageMode flip changes kid shell, no crash/reset; kid can't reach `(parent)` except via gate

## M6 — Companion "Bubble Buddy" (positive-only) + nurture + mood  · effort L
- [ ] `components/buddy/BubbleBuddy.tsx` (SVG squircle + gradient + highlight + gaze/blink/breathe; mood-driven mouth; **takes `variant` + `mood` + cosmetics — NEVER an `ageMode` prop**)
- [ ] States from canonical `CompanionMood`; cuddly "Bloop" vs cool "Orbit" art via **`buddy.artVariant` key (driven by `companionStyle`, not age)**
- [ ] `BuddyRoom.tsx` + customization (bodyHue/finish/accessory/name) wired to buddyStore (cosmetic shape re-authored from tether reference, with rarity); `(kid)/buddy.tsx`
- [ ] **Nurture wiring:** `bondLevel`/`growthStage` derived monotonically from `lifetimeEarned`; **render the growth-stage visual change**
- [ ] **Mood derivation:** wire `companionMood.ts` to real events (completion→celebrating→content; return→excited) + debug control
- [ ] **Delete on contact** from lifted sprites: `isAngry`, angry-jump, angry-eyes, `MOCKING`/`MockingPhase`, `DEFAULT_INSULTS`, tears, `mockeryText`
- [ ] **Accept:** buddy idles + cycles states (debug + real events); **earning tokens visibly advances the buddy**; cuddly vs cool follows `companionStyle`; cosmetics persist; grep `isAngry|MOCKING|mockeryText|DEFAULT_INSULTS` → zero; grep `<BubbleBuddy ageMode`/`ageMode=` prop → zero

## M7 — Core loop: runner + celebration + token  · effort L · CP E
- [ ] `components/task/{StepCard,TaskRunner,DoneButton}.tsx` (one step young / list older via flags; picture+icon+color+spoken label; **completed steps render calm "done"/greyed — never red "failed"**; **kid step-reorder in older when `canReorderSteps`**)
- [ ] `components/celebration/{CelebrationOverlay,Confetti}.tsx` (timeline per doc 61 §8; **size from `resolveCelebration` only**) + `hooks/useCelebration.ts` (imperative `playCue()`+haptic+overlay+TTS, sub-300ms)
- [ ] `(kid)/index.tsx` runner + `(kid)/celebrate.tsx` modal
- [ ] Token earn via `gamification.earn()` + reinforcement (base always paid); step→next advance + **resume-after-kill via persisted run-progress**
- [ ] **Accept (airplane mode):** Done → haptic+sound+visual+token <~300ms every time; balance survives force-quit; **kill mid-routine → resumes at next incomplete step**; non-reader runs a 4-step routine; older list greys completed steps (never "failed"); sound/haptics toggles independent

## M8 — Token economy, progress, nurture & caregiver rewards (net-new build)  · effort XL
- [ ] `components/progress/{BubbleMeter,StreakRing}.tsx` (endowed progress, starts partly full; **paused state leads with `cumulativeCount`; "best: N" only as a non-losable badge, never adjacent as a drop**)
- [ ] `components/progress/GoalBar.tsx` (older save-toward-`savingTowardRewardId`, gated by `showNumbersAndCharts`)
- [ ] `components/rewards/{TokenMeter,RewardCard}.tsx` + cosmetics/collectibles grid (**no `BadgeGrid`**); `(kid)/rewards.tsx` (**kid list sliced by `maxChoices` — 3 young / 6 older**; "3 more bubbles!" framing)
- [ ] Redemption escrow flow (hold → approve/decline → refund **+ auto-approve-under-N**); **screen-time guardrails enforced** (`limitPerWeek`/`cooldownHours` → "come back later", never punishment)
- [ ] **Nurture wiring** (lifetimeEarned→bond/growth, shared with M6); reinforcement **bonus-cadence** thinning wired but child-invisible (celebration size unchanged)
- [ ] Forgiving rollover reconciler on app-open + local midnight
- [ ] **Accept:** redeem holds then spends on approval; decline refunds zero-net; tokens never negative; auto-approve works; reward at limit/cooldown unavailable; meter starts >0% + animates; **earning advances bond/growth**; older goal-bar fills; gap shows "popped N bubbles" + "best:N" badge (never a drop / never "0"); streaks off by default

## M9 — Parent area + parental gate + task assignment (net-new build)  · effort XL
- [ ] `(gate)/parental-gate.tsx` (arithmetic/long-press for low-stakes; **parent-set PIN REQUIRED before the paywall route**; no biometric required; graceful)
- [ ] `(parent)/dashboard.tsx`; `(parent)/children.tsx` (per-child ageMode toggle **+ live side-by-side preview via `overrideAgeMode`**; independent **`companionStyle`/`textFirst`/`sensoryMode`** overrides; always free)
- [ ] `(parent)/tasks.tsx` (templated library → 2–3-tap assign; emoji/color/day/time pickers **re-authored against `@gorhom/bottom-sheet@>=5.1.8` + `reanimated-color-picker@4`, not copied**; add-a-step; **gated kid task-proposal/approval queue when `canAddTasks`**)
- [ ] `(parent)/rewards-setup.tsx` (CRUD 3–6 rewards, cost, screen-time minutes, **`limitPerWeek`/`cooldownHours`**, **`autoApproveRedeemUnderTokens`**)
- [ ] `(parent)/settings.tsx` (per-category sound/haptics, **`sensoryMode`/lowStim**, reduced-motion, quiet hours, AI off, calm mode, OpenDyslexic, **local-analytics opt-IN row [default off]**, **mood-logging opt-IN row**, delete data, **parental data review/export**, Licenses) + route guards
- [ ] **Accept:** gate blocks every parent entry, clears on background; **purchase route demands PIN (even mocked)**; templated task assigned in ≤3 taps; ageMode flip re-themes losslessly + preview matches; companionStyle/textFirst/sensoryMode overrides independent; rewards honor limit/cooldown/auto-approve; analytics+mood default OFF, log only when opted in; data-export shows what's stored; settings affect child immediately

## M10 — Reminders (few, gentle, point-of-performance)  · effort M
- [ ] `src/services/notifications.ts` (**expo-notifications only**) gated by quiet-hours + `maxPerDay`
- [ ] `scheduleRoutineReminders(routine, quietHours)` skipping quiet windows; reschedule on app open
- [ ] **Fixed friendly copy set** (real tone control); **ban companion re-engagement strings** ("Buddy misses you/is back/is waiting"); deferred permission prompt
- [ ] **Honest spoken scope:** notification delivers a **sound**; TTS speaks the label only on **tap-through** (no background TTS claim)
- [ ] **Accept:** no reminder inside quiet hours; bounded count tied to routine times; grep confirms copy from fixed set only, zero companion-re-engagement/guilt strings; tap-through speaks label

## M11 — Onboarding (consent + gate-setup + parent + child, calm offer)  · effort M
- [ ] **Single canonical flow:** `welcome → privacy-consent → parent-gate-setup → child-setup → pick-buddy → first-task → calm-offer → done`
- [ ] `welcome.tsx` (honest framing, never "treats ADHD")
- [ ] **`privacy-consent.tsx`** (COPPA-style local ack; record `privacyConsentAckAt`; state no data leaves device + analytics/mood default OFF)
- [ ] **`parent-gate-setup.tsx`** (configure `parentGate` + **set purchase PIN**; `parentGateConfigured=true`; **runs before child can reach `(kid)`**)
- [ ] `child-setup.tsx` (name + age → ageMode + override preview); `pick-buddy.tsx` (name/customize)
- [ ] `first-task.tsx` (seed one templated task); `calm-offer.tsx` (offer non-gamified path once); `done.tsx` (write onboarding-complete, replace → kid)
- [ ] **Offline TTS fallback:** probe `getAvailableVoicesAsync()`; if no voice, play bundled pre-recorded CC0 onboarding/seed-label audio + one-time voice-install prompt
- [ ] **Accept:** fresh install → runnable routine ~60s; **gate configured before kid lands**; non-reader completes setup by audio (or fallback); calm mode offered once; grep all onboarding copy for "treat"/"cure" → none

## M12 — Paywall stub + entitlement gating + PIN-on-purchase  · effort M · CP G
- [ ] `(parent)/paywall.tsx` (clear price, honest 7-day trial end, one-tap cancel, hardship option, NO urgency; **no "treats/cures/clinically proven" copy**)
- [ ] `src/services/purchases.ts` (`mockPurchase`/`mockCancel`, `// TODO: wire RevenueCat`); `useEntitlements()`/`isPremium`
- [ ] `<PremiumGate>` that **gates NEW unlocks only — never removes/hides/unequips/alters anything the child owns or sees**
- [ ] `FEATURE_GATES` (multiChild free=1; **rewardMenuSize capped at curated 6, never `'unlimited'`**; companionThemes free=2 = acquisition only; novelty/calm-soundscape/insights premium; **age mode + companionStyle + sensoryMode NEVER gated**; free tier runs full core loop)
- [ ] **Accept:** core loop fully free; **purchase route requires PIN**; mock subscribe unlocks + cancel reverts (behind gate); **trial-expiry with premium cosmetics equipped → ZERO visible child change (test)**; honest trial, no urgency, hardship present; airplane mode → no network; child never sees paywall

## M13 — Sound (expo-audio), haptics, calm path & celebration polish  · effort M
- [ ] `src/services/sound.ts` — **imperative cue registry** (pre-instantiate `AudioPlayer` per cue at boot; `playCue(id)` = `seekTo(0)+play()`); mix-not-hijack session (duck-not-stop); full cue set; per-category toggles
- [ ] **Source ALL audio from CC0/Pixabay-license/royalty-free-commercial**; log each in THIRD_PARTY_NOTICES assets section; **NONE lifted from lockin**
- [ ] `src/services/haptics.ts` (cue set; NO Warning/Error toward a child)
- [ ] `(kid)/calm.tsx` (soundscape + breathing, non-gamified, no tokens/confetti); background parallax bubbles (standard only)
- [ ] lowStim + quiet-hours celebration variants; routine-complete vs step magnitudes **from `resolveCelebration` (salience-driven, never phase-driven)**
- [ ] **Accept:** cue ducks not stops background audio **(verified on real device)**; each channel toggle suppresses app-wide; lowStim/reduced-motion/quiet-hours soften celebration; calm path has no tokens/confetti; grep no child-facing Warning haptic; every audio file in the asset registry

## M14 — Age-adaptive + tablet verification pass (cross-cutting)  · effort M
- [ ] Sweep `app/` + `components/` for raw `ageMode`/`sensoryMode`/`stimLevel` branches AND **any `ageMode` PROP** → replace with tokens/flags/variant keys
- [ ] Older dark-mode pass; calm-mode pass; **parent age-mode switch + live side-by-side preview end-to-end**; independent `companionStyle`/`textFirst`/`sensoryMode` overrides verified
- [ ] Fill capability-flag coverage table (doc 65 §4–5); **content-coverage check** (every kid-facing key has both young+older variants)
- [ ] **Tablet pass:** run the full loop on iPad + Android tablet; confirm `contentMaxWidth`/`columns`/multi-column grids (no stretched phone UI) in both modes
- [ ] **Accept:** young↔older flip re-themes every kid screen (sizes/font/text-first/tabs/companion/celebration ceiling) with no crash/reset; both modes run the full loop on phone AND tablet; grep `=== 'young'`/`=== 'older'`/`stimLevel` outside resolvers → zero; grep `ageMode=` prop → zero; content-coverage check passes

## M15 — QA + anti-shame ship gate + license/asset/provenance hygiene  · effort L · CP G
- [ ] Run smoke suite **A–K** on **iOS + Android** (web = PASS-subset / N/A tagged per §1b.10): A–I (doc 60 §8.3) + **J reminders (none in quiet hours; ≤ `maxPerDay`)** + **K escrow (redeem spends exactly; decline refunds zero-net; never negative; limit/cooldown unavailable)**
- [ ] **Anti-shame grep/test gate:** `isAngry|MOCKING|mockeryText|FAILED|ruthless|streak broken|guilt` → zero; **`Math.random` in payout paths → zero**; **companion re-engagement reminder strings → zero**; **trial-expiry-with-equipped-cosmetics test = zero visible change**; **analytics/mood "never leaves device" grep**; **`parentGate.mode==='none'` blocked in production builds**
- [ ] **Over-claiming gate on ALL surfaces** (welcome/paywall/parent dashboard/in-repo store copy): forbid `treat|cure|clinically proven|fixes focus`; enforce reviewed claims allowlist; **verify no copy promotes/escalates screen-time-as-reward**
- [ ] jest-expo smoke: gamification + streak + reinforcement + companionMood pure functions; `tsc --noEmit` clean
- [ ] **License/asset/provenance:** finalize `THIRD_PARTY_NOTICES.md` incl. **Bundled assets** section (every audio/font/image: source/author/license/commercial-OK); **manual asset-license review** (forbid CC-BY-NC/Sampling+/unverifiable); **OpenDyslexic + Fredoka + Lexend OFL-1.1 text + reserved-font-name hand-added**; `npx license-checker-rseidelsohn --production` clean (no GPL/AGPL/LGPL; **Apache-2.0 NOTICE files preserved**; BSD for MMKV); **`jscpd` clone scan vs adhd-india + adhd-focus-mate fails on high similarity**; **`PROVENANCE.md` per-file sign-off complete**
- [ ] CI/grep guard failing build on `adhd-india`/`adhd-focus-mate` reference; remove `_sandbox`/`_theme-gallery`
- [ ] Offline E2E of full parent→child→reward loop; accessibility check (triple-coded, ~2cm, AA, reduced-motion)
- [ ] **Accept:** A–K pass on iOS+Android (web subset tagged); anti-shame + over-claiming + privacy gates zero/clean; tests green; **license scan (prod) clean + asset registry complete + manual asset review signed + clone scan clean + provenance signed**; full loop runs offline on both platforms; AI off (no provider, no network in loop)
