# Provenance Manifest — Tiny Bubbles

Per-file origin manifest (doc 66 §1b.2). Every source file in this repository
records where it came from, so license discipline is auditable and the M15
reviewer sign-off (no code from a non-approved source) is verifiable.

## Origin codes

- `original` — net-new code authored for Tiny Bubbles.
- `lockin:<path>` — grafted/adapted from the **lockin** repo (the ONLY approved
  code-graft donor, MIT, © 2025 adhd.dev). Shame/AI/rigid-goal mechanics are
  removed/retoned on graft.
- `reference:<repo>:<path>` — re-authored against our stack from a
  **reference-only** repo's logic/pattern (habit-tracker-app, tether, momentum).
  **No code copied** — pattern only.

## Hard prohibitions (enforced in M15)

- NO code from `adhd-india` or `adhd-focus-mate` (unlicensed / no LICENSE file).
- A `jscpd` clone-similarity scan + string grep + this manifest's reviewer
  sign-off gate the ship.

## Reviewer sign-off

The M15 audit reviewed every source file below and ran the mechanical gates:

- `jscpd` clone-similarity scan of `app/ components/ src/` against the
  `adhd-india` and `adhd-focus-mate` trees → **0 cross-tree clones** (all 26
  reported duplicates are internal boilerplate within Tiny Bubbles itself).
- String grep `grep -rE 'adhd-india|adhd-focus-mate' app components src` → **0**.
- Per-file origin recorded for all 107 shipped `.ts/.tsx` files (M0–M15 below).

| Milestone | Reviewer | Date | "No code from a non-approved source" |
| --- | --- | --- | --- |
| M0–M15 (full tree) | M15 ship-gate audit | 2026-06-28 | CONFIRMED — only `lockin` (MIT) grafted; all others re-authored or original; jscpd + grep clean |
| M-C4 novelty & reward-refresh | feature-complete build-agent | 2026-07-06 | CONFIRMED — all new files original; no new dependency/asset; no RNG in rotation/payout paths; additive-only (`SCHEMA_VERSION` 1) |
| M-D1 clinician reporting + local backup/restore | feature-complete build-agent | 2026-07-06 | CONFIRMED — all new files original; four first-party Expo modules added via `npx expo install` (MIT, © Expo — §4(e) of THIRD_PARTY_NOTICES); ZERO AI, no network egress (report is pure aggregation + a fixed HTML template; PDF/backup go only where the parent sends them); anti-shame report copy (banned-word gate green); additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`) |
| M-D2 production hardening II (ship gate) | feature-complete ship-gate audit | 2026-07-09 | CONFIRMED — feature-complete (M-A1…M-D2) ship gate: only `lockin` (MIT) grafted; all Wave A–D work original / re-authored; `expo-image-picker` (MIT, © Expo) added via `npx expo install` for the optional photo-verify + registered as a config plugin with honest no-upload usage strings; EAS profiles completed (production has no dev-screen env, no `expo-updates`/OTA); OS-backup exclusion green (`android.allowBackup:false` + iOS cache-dir photos) so the store "No data collected/shared" claim is honest; migration-forward + schema-roundtrip fixtures cover every persisted slice/field (chores/quests/plans + all optional fields incl. `Task.verification`); anti-shame / no-over-claim / no-egress / no-raw-`ageMode` greps clean; `Math.random` only in the parental-gate arithmetic; additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`) |
| M1.0 monorepo migration (v2 w0) | build-agent (M1.0) | 2026-07-10 | CONFIRMED — pure lift-and-shift + original scaffolds only; NO app-source change in `apps/kid` (the shipped v1 tree moved verbatim; 69 suites / 695 tests + `tsc` + web export re-verified green); new root/workspace configs + `apps/parent` placeholder + `packages/shared`/`functions/` scaffolds are all `original`; new deps limited to first-party toolchain packages (`@expo/metro-runtime` MIT © Expo; `firebase-admin`/`firebase-functions` Apache-2.0 © Google, server-side `functions/` only — never bundled by Metro); additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`) |

---

## M0 — Scaffold, toolchain, app boots

| File | Origin | Notes |
| --- | --- | --- |
| `package.json` | `original` | SDK 56 deps via `expo install`; `main: expo-router/entry`. |
| `app.json` | `lockin:app.json` | Structure adapted; added `scheme`, `typedRoutes`, expo-notifications plugin; rebranded. |
| `eas.json` | `lockin:eas.json` | Standard EAS profiles (development/preview/production). |
| `babel.config.js` | `lockin:babel.config.js` | NativeWind preset kept; plugin swapped to `react-native-worklets/plugin` (Reanimated 4). |
| `metro.config.js` | `lockin:metro.config.js` | NativeWind metro wrapper (unchanged). |
| `global.css` | `lockin:global.css` | Tailwind directives kept; bright "bubble" palette replaces swiss/red. |
| `tailwind.config.js` | `lockin:tailwind.config.js` | Content globs widened (app/components/src); swiss/red palette removed; placeholder bubble tokens; not Inter. |
| `tsconfig.json` | `lockin:tsconfig.json` | strict + `@/*` path alias; expo base extend. |
| `nativewind-env.d.ts` | `lockin:nativewind-env.d.ts` | Standard NativeWind type reference. |
| `app/_layout.tsx` | `lockin:app/_layout.tsx` | Structure only (Stack + GestureHandlerRootView); AIProvider, notifee, war/tactical routes omitted. |
| `app/index.tsx` | `lockin:app/index.tsx` | Boot-redirect pattern only; rewritten as a thin placeholder. |
| `app/(onboarding)/_layout.tsx` | `original` | Placeholder Stack. |
| `app/(onboarding)/index.tsx` | `original` | Placeholder welcome screen. |
| `app/(kid)/_layout.tsx` | `original` | Placeholder Stack. |
| `app/(kid)/index.tsx` | `original` | Placeholder kid home. |
| `app/(parent)/_layout.tsx` | `original` | Placeholder Stack. |
| `app/(parent)/index.tsx` | `original` | Placeholder parent dashboard. |
| `app/(gate)/_layout.tsx` | `original` | Placeholder Stack. |
| `app/(gate)/parental-gate.tsx` | `original` | Placeholder gate challenge. |
| `components/ui/PlaceholderScreen.tsx` | `original` | Shared thin placeholder. |
| `jest.config.js` | `original` | jest-expo preset config. |
| `__tests__/smoke.test.ts` | `original` | Trivial passing smoke test. |
| `LICENSE` | `original` | MIT, Tiny Bubbles. |
| `THIRD_PARTY_NOTICES.md` | `original` | Donor + reference + asset attribution. |
| `PROVENANCE.md` | `original` | This file. |
| `CONTRIBUTING.md` | `original` | Reference-only + provenance rules. |

## M1 — Dependency reconciliation + native sandbox (KEPT as a dev diagnostic — M15 override)

The plan's "delete `_sandbox` at M15" step is **overridden**: the screen is KEPT
so the user can verify native/animated surfaces on a real device. It is NOT
linked from any kid/parent UI — reachable only by the direct `/_sandbox` route.

| File | Origin | Notes |
| --- | --- | --- |
| `app/_sandbox.tsx` | `original` | M1 de-risk screen, KEPT for on-device verification. SVG/Reanimated/picker patterns re-authored against the installed v5/v4 APIs (NOT copied from any donor). Direct-route only. |
| `assets/sounds/sandbox-cue.wav` | `original` | Self-synthesized sine "pop" (procedural, no third-party source) → license-clean/CC0. Used only by `/_sandbox`. |
| `app/_layout.tsx` (sandbox `Stack.Screen`) | `original` | Route registration for the kept diagnostic screen (no UI link). |

## M2 — Design system + theming/age-adaptive engine + celebration resolver

Net-new build (doc 66 §1b.2: M2 is a *build*, not a graft). Token *structure*
references habit-tracker-app's theme scaffold; the reduced-motion + provider
*patterns* reference momentum. All values/logic are re-authored; the palettes
are the real doc-61 hexes. No code copied from any reference repo.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | Canonical M2 unions (AgeMode/SensoryMode/CompanionStyle/CelebrationLevel/CompanionMood); M4 extends. |
| `src/theme/tokens.ts` | `reference:habit-tracker-app:app/theme/{colors,spacing,typography,timing}.ts` | Token *shape* reference only; values = doc 61 §2-§7 (Reef/Tide/Stillwater), re-authored. |
| `src/theme/breakpoints.ts` | `original` | Phone/tablet screen-size dimension. |
| `src/theme/resolveTokens.ts` | `original` | ageMode base + sensory/reduced-motion reducers + responsive dimension. |
| `src/theme/resolveCapabilities.ts` | `original` | Capability flags + independent overrides (doc 66 §1b.6). |
| `src/theme/resolveContent.ts` | `original` | Compiler-enforced `ModeKeyed<T>` copy/TTS + buddy art variant. |
| `src/theme/resolveCelebration.ts` | `original` | Single celebration resolver (doc 66 §1b.3). |
| `src/theme/ThemeProvider.tsx` | `reference:momentum:frontend/src/lib/theme/ThemeProvider.tsx` | Provider *pattern* reference; scoped `overrideAgeMode` + hooks re-authored. |
| `src/theme/useThemeTokens.ts` | `original` | Combines context inputs + runtime axes (reducedMotion/screenSize). |
| `src/theme/useReducedMotion.ts` | `reference:momentum:frontend/src/hooks/useReducedMotion.ts` | OS reduce-motion hook *pattern*, re-authored against RN AccessibilityInfo. |
| `src/theme/fonts.ts` | `lockin:app/_layout.tsx` | `useFonts` splash-gate pattern (graftable); font map is original. |
| `src/theme/index.ts` | `original` | Barrel export. |
| `src/services/tts.ts` | `original` | expo-speech facade; age-driven pitch/rate (doc 61 §6.4). |
| `components/ui/SpokenLabel.tsx` | `original` | Spoken-label primitive (doc 60 §7.5). |
| `global.css` | `lockin:global.css` | M2: real Reef/Tide/Tide-dark/Stillwater CSS-var class sets replace the M0 placeholder. |
| `tailwind.config.js` | `lockin:tailwind.config.js` | M2: semantic colors bound to palette CSS vars; Fredoka/Lexend/OpenDyslexic fontFamily. |
| `app/_layout.tsx` | `lockin:app/_layout.tsx` | M2: added font splash-gate + ThemeProvider (structure pattern from lockin). |
| `components/ui/PlaceholderScreen.tsx` | `original` | M2: className tokens updated to canvas/text. |
| `src/theme/__typetests__/content-typetest.ts` | `original` | Compile-time guarantees (ModeKeyed both-variants; no `phase` in celebration). |
| `__tests__/theme/*.test.ts` | `original` | Unit tests for the four pure resolvers. |
| `assets/fonts/README.md` | `original` | OpenDyslexic placeholder note (binary not fabricated). |

## M2 — Dev diagnostic (KEPT — M15 override)

The plan's "delete `_theme-gallery` at M15" step is **overridden**: KEPT for
on-device theme verification, reachable only by the direct `/_theme-gallery`
route (not linked from any kid/parent UI).

| File | Origin | Notes |
| --- | --- | --- |
| `app/_theme-gallery.tsx` | `original` | Dev screen — both modes side-by-side via `overrideAgeMode`. Direct-route only. |
| `app/_layout.tsx` (gallery `Stack.Screen`) | `original` | Route registration for the kept diagnostic screen (no UI link). |

---

## M3 — Storage, persistence & migration layer

Net-new infra (doc 66 §1b.2: no donor provides MMKV/Zustand-persist). The
load/merge/validate flow references tether's pattern; lockin's reset helper is
graftable. All re-authored against the AsyncStorage-backed storage port.

| File | Origin | Notes |
| --- | --- | --- |
| `src/storage/storage.ts` | `original` | Storage port (`getString/set/delete`) over AsyncStorage; MMKV-swappable. Shape ref: habit-tracker storage API. |
| `src/storage/persist.ts` | `original` | Zustand `persist` adapter (`partialize`, per-store `version`). |
| `src/storage/schemaVersion.ts` | `original` | `SCHEMA_VERSION` + `tb/`-namespaced keys (doc 62 §2). |
| `src/storage/migrations.ts` | `reference:tether:app/src/services/GamificationService.ts` | load/merge/validate *pattern* re-authored; `mergeWithDefaults` + `validateAndRepair` (incl. CompanionMood→`content` coercion, §1b.7). |
| `src/storage/legacyImport.ts` | `original` | One-time AsyncStorage→MMKV import seam; `tb/`-scoped reset (lockin `getAllKeys`/`multiRemove` pattern). |
| `src/storage/index.ts` | `original` | Barrel export. |
| `src/storage/README.md` | `original` | Storage-port notes. |
| `components/StoreHydrationGate.tsx` | `original` | Blocks render until persisted stores hydrate. |

## M4 — Data layer: domain logic + stores + seed (net-new build)

Re-authored from reference logic (doc 66 §1b.2: M4 is a *build*, not a graft).
No field anywhere can represent failure/loss/decay. `types.ts` (started in M2)
is extended here.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | M4 extends the M2 unions: `TaskStatus` (no `failed`), `ChildSettings` gains `sensoryMode`/`companionStyle`/`textFirst`/`autonomy`; `ParentGateMode`; entitlement/reward types. |
| `src/domain/gamification.ts` | `reference:tether:app/src/services/GamificationService.ts` | `earn()` append-event + cap; points→tokens re-toned; DI/`fs`/`uuid` dropped. Re-authored, no code copied. |
| `src/domain/streaks.ts` | `reference:momentum:backend/src/lib/streaks.ts` | timezone-aware streak math as a pure function; **freeze/pause, never zero** (anti-shame retone). date-fns/date-fns-tz. |
| `src/domain/reinforcement.ts` | `original` | dense→thinning→maintenance; thins ONLY the deterministic every-N bonus cadence; base token + celebration never thinned (§1b.4). No `Math.random`. |
| `src/domain/companionMood.ts` | `original` | event→mood rules table + decay; momentum's 4-Mood enum referenced for shape only; positive-only (§1b.7). |
| `src/domain/tasks.ts` | `original` | Forgiving rollover (today→someday). |
| `src/domain/tokens.ts` | `reference:tether:app/src/services/GamificationService.ts` | redemption *escrow* (hold→approve/decline→refund) + auto-approve-under-N; re-authored as refundable, zero-net. |
| `src/domain/progressMeter.ts` | `original` | Endowed-progress bubble meter math (starts >0%, never a current-vs-best drop). |
| `src/domain/constants.ts` | `original` | Default settings/entitlement; gate defaults to `math` (never `none`). |
| `src/domain/dates.ts` | `original` | Date helpers (date-fns). |
| `src/domain/index.ts` | `original` | Barrel export. |
| `src/state/settingsStore.ts` | `original` | Zustand persisted store. |
| `src/state/childStore.ts` | `original` | Per-child profiles. |
| `src/state/taskStore.ts` | `original` | Tasks + routines. |
| `src/state/rewardStore.ts` | `original` | Rewards + redemption ledger. |
| `src/state/buddyStore.ts` | `original` | Cosmetics/nurture; cosmetic shape ref: tether `DockTheme` (re-toned, with rarity). |
| `src/state/sessionStore.ts` | `original` | In-memory (parentUnlocked, transient UI). |
| `src/state/runProgressStore.ts` | `original` | Persisted run-progress for resume-after-kill. |
| `src/state/gameplay.ts` | `original` | Cross-store orchestration (earn/complete-step glue). |
| `src/state/ids.ts` | `original` | id generation (expo-crypto `randomUUID`). |
| `src/state/index.ts` | `original` | Barrel export. |
| `src/data/taskTemplates.ts` | `original` | 15 templated tasks seed. |
| `src/data/routinePresets.ts` | `original` | 3 routine presets. |
| `src/data/rewardPresets.ts` | `original` | 8 reward presets. |
| `src/data/buddyCosmetics.ts` | `original` | 2 companions + cosmetics; rarity + seasonal-pack shape (additive-only seam). Ref: tether `DOCK_THEMES` (re-toned). |
| `src/data/seed.ts` | `original` | Apply-once `seedState`. |
| `src/data/index.ts` | `original` | Barrel export. |

## M5 — App shell, navigation & age-mode layout switch

| File | Origin | Notes |
| --- | --- | --- |
| `app/_layout.tsx` | `lockin:app/_layout.tsx` | M5 extends the M0/M2 root: provider stack + audio cue-registry init + deferred notif register + background parent-lock. AIProvider/notifee/war routes omitted. |
| `app/index.tsx` | `lockin:app/index.tsx` | Boot-redirect pattern (lockin); re-authored thin. |
| `app/(kid)/_layout.tsx` | `original` | young single-surface vs older Tabs **from capability flags** (not raw ageMode). lockin Tabs structure as a loose ref. |
| `app/(parent)/_layout.tsx` | `original` | Parent Stack + route guard. |
| `app/(parent)/index.tsx` | `original` | Redirect to dashboard. |
| `app/(gate)/_layout.tsx` | `original` | Gate modal Stack. |

## M6 — Companion "Bubble Buddy" (positive-only)

| File | Origin | Notes |
| --- | --- | --- |
| `components/buddy/BubbleBuddy.tsx` | `lockin:components/dashboard/ExecutionSprite.tsx + ScannerSprite.tsx` | **Architecture only** — shared values, `withRepeat` breathe, gaze/blink. **Deleted on contact:** `isAngry`, angry-jump/eyes, `MOCKING`/`MockingPhase`, `DEFAULT_INSULTS`, tears, `mockeryText`. Takes `variant`+`mood`, never `ageMode`. |
| `components/buddy/buddyVisuals.ts` | `original` | Cosmetic→visual mapping (hue/finish/accessory). |
| `components/buddy/BuddyRoom.tsx` | `original` | Buddy scene + nurture growth-stage render. |
| `app/(kid)/buddy.tsx` | `original` | Buddy screen + customization. |

## M7 — Core loop: runner + celebration + token

| File | Origin | Notes |
| --- | --- | --- |
| `components/task/StepCard.tsx` | `lockin:components/.../MilestoneCard.tsx` | Step card *structure* re-authored/retoned; picture+icon+color+spoken; completed = calm "done", never red "failed". |
| `components/task/TaskRunner.tsx` | `lockin:components/.../MilestoneStack.tsx` | Advance logic (`handleCompleteMilestone`) re-authored; one-step young / list older via flags; resume-after-kill. |
| `components/task/DoneButton.tsx` | `original` | Large Done affordance. |
| `components/celebration/CelebrationOverlay.tsx` | `lockin:components/dashboard/VictoryOverlay.tsx` | Modal + `ZoomIn`/`SlideInDown`/`FadeIn` *structure*; copy/color/sprite retoned; size from `resolveCelebration` only. |
| `components/celebration/Confetti.tsx` | `original` | Reanimated confetti (doc 61 §8 timeline). |
| `hooks/useCelebration.ts` | `original` | Imperative `playCue()`+haptic+overlay+TTS orchestration (sub-300ms). |
| `app/(kid)/index.tsx` | `original` | Runner screen. |
| `app/(kid)/celebrate.tsx` | `original` | Celebration modal route. |

## M8 — Token economy, progress, nurture & caregiver rewards (net-new build)

| File | Origin | Notes |
| --- | --- | --- |
| `components/progress/BubbleMeter.tsx` | `original` | Endowed liquid bubble-fill; hand-rolled Reanimated+SVG ring (habit-tracker `AnimatedCircularProgress` as a loose ref). |
| `components/progress/StreakRing.tsx` | `original` | Opt-in forgiving ring; "best: N" only as a non-losable badge. |
| `components/progress/GoalBar.tsx` | `original` | Older save-toward-reward bar (gated by `showNumbersAndCharts`). |
| `components/rewards/TokenMeter.tsx` | `original` | Token balance + "saved for a treat" aside. |
| `components/rewards/RewardCard.tsx` | `reference:tether (Rewards tab UIs)` | Reskinned from Electron CSS to RN/NativeWind; "3 more bubbles!" framing. Re-authored. |
| `components/rewards/CollectiblesGrid.tsx` | `original` | Cosmetics/collectibles grid (no BadgeGrid — badges deferred). |
| `app/(kid)/rewards.tsx` | `original` | Kid rewards list sliced by `maxChoices` (3 young / 6 older). |

## M9 — Parent area + parental gate + task assignment (net-new build)

Pickers re-authored against the installed v5/v4 APIs (NOT copied from the
habit-tracker v4/v3 donor). The gate's challenge is original; medtimer is
**concept only** (no code).

| File | Origin | Notes |
| --- | --- | --- |
| `src/services/parentGate.ts` | `original` | PIN hash (expo-crypto) + arithmetic/long-press primitives + `'none'` production guard. medtimer gate = concept only. |
| `app/(gate)/parental-gate.tsx` | `original` | Gate screen; purchase route ALWAYS requires PIN (§1b.13); `'none'` coerced + asserted. |
| `app/(parent)/dashboard.tsx` | `reference:habit-tracker-app (settings/scaffold)` | Kids overview; rows/scaffold pattern re-authored. |
| `app/(parent)/children.tsx` | `original` | Per-child ageMode + independent companionStyle/textFirst/sensoryMode overrides; live preview. |
| `app/(parent)/tasks.tsx` | `reference:habit-tracker-app (create-new-habit picker pattern)` | Templated assign in ≤3 taps; pickers re-authored against bottom-sheet@5/color-picker@5/emoji-keyboard. |
| `app/(parent)/rewards-setup.tsx` | `original` | Reward CRUD + limit/cooldown + auto-approve. |
| `app/(parent)/settings.tsx` | `reference:habit-tracker-app (settings rows/Toggle scaffold)` | Per-category toggles, sensory/lowStim, quiet hours, analytics/mood opt-IN, data export, Licenses. Re-authored. |
| `components/parent/pickers.tsx` | `reference:habit-tracker-app (emoji/color/day/time picker patterns)` | Re-authored against the installed v5/v4 picker APIs. |
| `components/parent/ui.tsx` | `original` | Parent UI primitives (Ignite leaf-component shapes as a loose ref). |
| `components/parent/ChildModePreview.tsx` | `original` | Live side-by-side mode preview via `overrideAgeMode`. |

## M10 — Reminders (few, gentle, point-of-performance)

| File | Origin | Notes |
| --- | --- | --- |
| `src/services/notifications.ts` | `lockin:services/notifications.ts` | register/schedule/cancel *pattern* (graftable), retoned; quiet-hours + `maxPerDay` budget; fixed friendly copy set + banned-tone assert; momentum quiet-hours model as a ref. expo-notifications only (no notifee). |

## M11 — Onboarding (consent + gate-setup + child, calm offer)

| File | Origin | Notes |
| --- | --- | --- |
| `app/(onboarding)/index.tsx` | `lockin:(onboarding)/index.tsx` | Step-state/progress/persist-then-`replace` *pattern*; Goal/Contract/"CANNOT BE CHANGED"/Headbutt discarded. Welcome copy honest (never "treats ADHD"). |
| `app/(onboarding)/privacy-consent.tsx` | `original` | COPPA-style local ack; records `privacyConsentAckAt`. |
| `app/(onboarding)/parent-gate-setup.tsx` | `original` | Configures gate + sets purchase PIN before the child can reach `(kid)`. |
| `app/(onboarding)/child-setup.tsx` | `original` | Name + age → ageMode, with preview. |
| `app/(onboarding)/pick-buddy.tsx` | `original` | Name/customize buddy. |
| `app/(onboarding)/first-task.tsx` | `original` | Seeds one templated task. |
| `app/(onboarding)/calm-offer.tsx` | `original` | Offers the non-gamified path once. |
| `app/(onboarding)/done.tsx` | `original` | Writes onboarding-complete; `replace('/(kid)')`. |
| `app/(onboarding)/_layout.tsx` | `original` | Onboarding Stack (M0 placeholder → M11). |
| `components/onboarding/OnboardingShell.tsx` | `lockin:components/onboarding/*` | Wizard shell *structure only*; GoalInput/Contract/TimeLeft/HeadbuttScene discarded. |
| `components/onboarding/steps.ts` | `original` | Canonical step list + ordering. |
| `components/onboarding/useOnboardingVoice.ts` | `original` | Per-step spoken/clip playback hook. |
| `src/services/onboardingVoice.ts` | `original` | `getAvailableVoicesAsync()` probe + bundled-clip fallback slots. |

## M12 — Paywall stub + entitlement gating + PIN-on-purchase

| File | Origin | Notes |
| --- | --- | --- |
| `app/(parent)/paywall.tsx` | `original` | Honest 7-day trial, one-tap cancel, hardship, no urgency, no over-claiming. Reachable only via PIN gate. habit-tracker row layout as a loose ref. |
| `src/services/purchases.ts` | `original` | `mockPurchase`/`mockCancel`; `// TODO: wire RevenueCat`. No network. |
| `src/services/entitlements.ts` | `original` | `isPremium`/`FEATURE_GATES`; gates NEW unlocks only, never removes/hides. |
| `components/parent/PremiumGate.tsx` | `original` | Wrapper that gates acquisition only (never retention). |

## M13 — Sound (expo-audio), haptics, calm path & celebration polish

| File | Origin | Notes |
| --- | --- | --- |
| `src/services/sound.ts` | `original` | Imperative cue registry (pre-instantiate `AudioPlayer` per cue; `playCue=seekTo(0)+play()`); mix-not-hijack session. lockin haptics *usage pattern* referenced. **No audio lifted from lockin.** |
| `src/services/playCue.ts` | `original` | Module-level `playCue` facade (sub-300ms imperative). |
| `src/services/haptics.ts` | `original` | Haptic cue set; lockin `expo-haptics` usage pattern (child-facing Warning/Error removed). |
| `app/(kid)/calm.tsx` | `original` | Non-gamified breathing + soundscape; no tokens/confetti. |

## M14 — Age-adaptive + tablet verification pass

Verification/refactor over M2/M6/M7/M8/M9/M11 output — **no new source files**
(doc 66 M14). Sweep replaced any raw-mode/`ageMode`-prop branches with
tokens/flags/variant keys; greps clean (see M15 gate).

## M15 — QA + anti-shame ship gate + license/asset/provenance hygiene

| File | Origin | Notes |
| --- | --- | --- |
| `src/services/parentGate.ts` | `original` | M15 adds `effectiveGateMode` + `assertProductionGateMode` (the `'none'` production-build block, §1b.8). |
| `app/(gate)/parental-gate.tsx` | `original` | M15 wires the gate-mode guard at the challenge boundary. |
| `__tests__/services/parentGate.test.ts` | `original` | Ship-gate test: 'none' blocked, default ≠ 'none', PIN primitives, arithmetic. |
| `package.json` | `original` | M15 adds `"license": "MIT"` (clears the UNLICENSED self-report). |
| `README.md` | `original` | Product/architecture/run/license overview. |
| `RUN.md` | `original` | Run instructions, dev diagnostic screens, full device-verify list. |
| `THIRD_PARTY_NOTICES.md` | `original` | Finalized dep-scan results + bundled-asset registry. |
| `PROVENANCE.md` | `original` | This file — completed per-file for M0–M15. |

## Tests, mocks & config (all original)

| File | Origin | Notes |
| --- | --- | --- |
| `__tests__/**/*.test.ts` | `original` | jest-expo unit/edge/smoke tests (domain, theme, storage, state, services, components). |
| `__tests__/__mocks__/audioAssetStub.js` | `original` | Stubs bundled audio `require`s under jest. |
| `jest.config.js`, `jest.setup.js` | `original` | jest-expo config + setup. |
| `app/_sandbox.tsx`, `app/_theme-gallery.tsx` | `original` | KEPT dev diagnostics (see M1/M2 above). |

## M-A1 — Billing classification + gate seams + honest trial-end reminder (feature-complete)

Additive delta on the shipped mock paywall. Real purchase stays MOCKED (no
processor). Classification contract locked; `ifThenPlans` gate key added (M-C5
hard-dep); four unconsumed gate seams remain ready for their content owners.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | (modified) optional `Entitlement.trialEndReminderAt?` marker (additive, no bump). |
| `src/domain/constants.ts` | `original` | (modified) `ONE_DAY_MS` (trial-reminder lead time + "ends soon" window). |
| `src/services/entitlements.ts` | `original` | (modified) new `ifThenPlans {count, free:2, premium:8}` gate; `canAddMore` union widened. |
| `src/services/notifications.ts` | `original` | (modified) `BILLING_REMINDER_DATA_KIND` + generic non-billing copy + `assertBillingCopyClean`/`isBillingCopyClean` + `shiftOutOfQuietHours`/`trialReminderInstant`/`scheduleTrialEndingReminder`/`cancelTrialEndingReminder` (independent one-shot, distinct data.kind). |
| `src/services/purchases.ts` | `original` | (modified) expanded RevenueCat MOCK→real seam doc (comment-only) + `PLUS_ENTITLEMENT_ID`. No processor call. |
| `src/state/settingsStore.ts` | `original` | (modified) set/clear `trialEndReminderAt` in `mockPurchase`/`mockCancel`. |
| `src/storage/migrations.ts` | `original` | (modified) `repairEntitlement` (coherence-only) + `VALID_ENTITLEMENT_SOURCES`; wired into `validateAndRepair`. Never strips owned cosmetics. |
| `components/parent/PremiumGate.tsx` | `original` | (modified) `ifThenPlans` added to `COUNT_FEATURES`. |
| `app/_layout.tsx` | `original` | (modified) trial-end reminder (re)synced after routine reschedule resolves; keyed on live-trial signal. |
| `app/(parent)/settings.tsx` | `original` | (modified) "Tiny Bubbles Plus" PIN-gated management row (honest trial detail lives here, not the lock screen). |
| `__tests__/services/billingReminders.test.ts` | `original` | Unit test: remindAt math, quiet-hours shift, skip-if-past, generic/non-billing copy, DATE trigger + billing kind, selective cancel, idempotency. |
| `__tests__/state/entitlements.test.ts` | `original` | (modified) `ifThenPlans` classification, `trialEndReminderAt` set/clear, `repairEntitlement` coerces corrupt premium→free without touching cosmetics. |

## M-A2 — Aging-up: `preteen` tier + `avatar` companion (feature-complete)

Purely additive union widening (`AgeMode += "preteen"`, `CompanionStyle +=
"avatar"`, `BuddyArtVariant += "nova"`) exercised through the existing
theme/capability/content resolvers — ZERO new component `ageMode` branches, no
`ageMode` prop. Exposes the resolved `caps.companionStyle` ONCE (arch §6-C1),
retiring the `companionFraming === "care"` round-trip that could not reach
`"avatar"`. The MODE is FREE (never `<PremiumGate>`-wrapped). No `SCHEMA_VERSION`
bump — existing `young`/`older`/`cuddly`/`cool` values stay valid.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | (modified) `AgeMode += "preteen"`; `CompanionStyle += "avatar"` (union widenings, additive). |
| `src/theme/resolveCapabilities.ts` | `original` | (modified) `AGE_CAP_BASE.preteen`; expose `companionStyle` on `ModeCapabilities`; 3-way `companionFraming` (`identity`); `defaultCompanionStyle`/`defaultTextFirst` handle preteen. |
| `src/theme/resolveTokens.ts` | `original` | (modified) `TYPE_PRETEEN`, `AGE_BASE.preteen`, `RESPONSIVE.preteen`, explicit `pickPalette` `older\|preteen → Tide` branch. |
| `src/theme/resolveContent.ts` | `original` | (modified) `ModeKeyed` optional `preteen?` + `older` fallback; `BuddyArtVariant += "nova"`; `BUDDY_ART.avatar`; `AGE_MODE_LABEL → Record<AgeMode,string>`; identity copy keys (tabTitle/greet/levelup/stat.bond/growth/mood). |
| `src/domain/constants.ts` | `original` | (modified) `canReorderSteps: ageMode !== "young"` (preteen reorders like older). |
| `components/buddy/buddyVisuals.ts` | `original` | (modified) `VariantPreset.identityRing?`; `VARIANT_PRESETS.nova` preset. |
| `components/buddy/BubbleBuddy.tsx` | `original` | (modified) render the static Nova identity ring when `preset.identityRing`. |
| `components/buddy/BuddyRoom.tsx` | `original` | (modified) `caps.companionStyle` (was framing round-trip); stat labels via `resolveContent` (preteen → Level/Rank/Vibe). |
| `app/(kid)/celebrate.tsx` | `original` | (modified) `caps.companionStyle` (round-trip removed). |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) `caps.companionStyle` (round-trip removed). |
| `app/(kid)/_layout.tsx` | `original` | (modified) "Buddy" tab title via `resolveContent("buddy.tabTitle", { ageMode })` → "Avatar" for preteen. |
| `app/(parent)/children.tsx` | `original` | (modified) 3-way age Segmented (Younger/Older/Preteen) + 3-way companion-style Segmented (Cuddly/Cool/Avatar). |
| `app/(onboarding)/child-setup.tsx` | `original` | (modified) 3-way age Segmented. |
| `components/parent/ChildModePreview.tsx` | `original` | (modified) iterate `["young","older","preteen"]` in a horizontal `ScrollView`; use `caps.companionStyle`. |
| `app/_theme-gallery.tsx` | `original` | (modified, dev) preteen panel + avatar companionStyle override; `caps.companionStyle`. |
| `src/data/buddyCosmetics.ts` | `original` | (modified) third `CompanionSeed` (`nova`/`avatar`/"Nova"). Procedural SVG art — no new asset. |
| `src/theme/__typetests__/content-typetest.ts` | `original` | (modified) proof that a preteen-only `ModeKeyed` key still requires young+older. |
| `__tests__/theme/agingUp.test.ts` | `original` | Feature suite: preteen resolvers, `avatar → nova`, `companionStyle` on caps, identity copy + `older` fallback, positive-only Nova pose, low-stim/reduced-motion composition. |

## M-A3 — Accessibility pass + i18n scaffolding (ships English) (feature-complete)

Cross-cutting, 100% FREE (never gated — no new `FEATURE_GATES` key). i18n:
externalizes every kid/parent string into a bundled `src/i18n/*` catalog keyed
`locale → key → {young, older, preteen?}`; `resolveContent` keeps its exact
signatures and delegates to `getMessage` (no call-site changes); `ModeKeyed<T>`
is now defined ONCE in `src/i18n/types.ts` and re-exported from `resolveContent`.
Accessibility: screen-reader announcements on the core loop (token counter live
region, celebration announce, buddy `name is mood` label), a Dynamic-Type cap
(1.3× via `AppText`/`AppTextInput`), machine-checked AA contrast, the
effective-reduced-motion bug fix (persisted `settings.reducedMotion` +
`parentSettings.reducedMotionDefault` now reach the resolver), reduce-transparency,
triple-coding (`resolveStatusPresentation`), and `fonts.ts` OpenDyslexic plumbing
(toggle hidden until binaries land). Additive-only: optional `ParentSettings.locale`
(default `"en"`) → NO `SCHEMA_VERSION` bump. No new dependency (device-locale
detection is inert-but-ready; `expo-localization` was NOT adopted).

| File | Origin | Notes |
| --- | --- | --- |
| `src/i18n/types.ts` | `original` | Canonical `ModeKeyed<T>`, `Locale`, `CatalogEntry`, `MessageParams` (re-exported by `resolveContent`). |
| `src/i18n/en.ts` | `original` | The English source catalog — `COPY` (migrated verbatim from `resolveContent.COPY` + new `a11y.*`/`status.*`/`daypart.title.*`/`unit.*` keys) + `PLAIN` (`reminder.*`/`language.*`); `EN` = their union. |
| `src/i18n/catalog.ts` | `original` | Locale registry (`CATALOGS`/`SOURCE_LOCALE`/`AVAILABLE_LOCALES`); English only. |
| `src/i18n/messages.ts` | `original` | Pure accessor: `getMessage` (locale→key→age variant→interpolate; en/key fallback), `formatCount`, `interpolate`. |
| `src/i18n/useLocale.ts` | `original` | `useLocale()` (reads `parentSettings.locale`), `useCopy()`, `localeToBcp47()`. |
| `src/i18n/index.ts` | `original` | Barrel. |
| `src/a11y/announce.ts` | `original` | `announce()` (fire-and-forget `announceForAccessibility`, web no-op) + `useScreenReader()`. |
| `src/a11y/props.ts` | `original` | Pure a11y prop builders: `buttonA11y`/`toggleA11y`/`selectedA11y`/`decorative`/`liveValue`/`labelledA11y`. |
| `src/theme/useReduceTransparency.ts` | `original` | OS Reduce-Transparency hook (mirror of `useReducedMotion`). |
| `src/theme/useOSFontScale.ts` | `original` | Clamped OS font-scale (`[1,1.3]`) for opt-in layout reflow. |
| `src/theme/contrast.ts` | `original` | Pure WCAG luminance/ratio/`meetsAA` (AA guard on all palettes). |
| `src/theme/resolveStatusPresentation.ts` | `original` | Triple-coding resolver → `{icon,shape,colorKey,labelKey}` for status + daypart (blue↔gold, never red↔green). |
| `components/ui/AppText.tsx` | `original` | Text wrapper applying the Dynamic-Type cap + OpenDyslexic body-face resolution. |
| `components/ui/AppTextInput.tsx` | `original` | TextInput counterpart of `AppText`. |
| `src/theme/resolveContent.ts` | `original` | (modified) delegate to `getMessage`; re-export `ModeKeyed` (from i18n) + `COPY` (from `en.ts`); keep signatures + `buddy.artVariant` overload; add optional `locale`/`params`. |
| `src/theme/tokens.ts` | `original` | (modified) `ThemeTokens.{maxFontSizeMultiplier,reduceTransparency}`; export `DYNAMIC_TYPE_MAX_MULTIPLIER = 1.3`. |
| `src/theme/resolveTokens.ts` | `original` | (modified) `resolveEffectiveReducedMotion` helper; accept `reduceTransparency` (flatten scrim + drop gradients); output the two new tokens. |
| `src/theme/useThemeTokens.ts` | `original` | (modified) fold in `useReduceTransparency()` + effective reduced-motion (OS ∨ persisted). |
| `src/theme/ThemeProvider.tsx` | `original` | (modified) `ThemeInputs.reducedMotion?` (persisted pref); `useCelebrationLevel` uses effective reduced-motion. |
| `src/theme/fonts.ts` | `original` | (modified) OpenDyslexic plumbing: `OPEN_DYSLEXIC_BUNDLED`, `isOpenDyslexicAvailable`, `resolveFontFamily` (no-op until binaries land). |
| `src/theme/index.ts` | `original` | (modified) export contrast/resolveStatusPresentation/useReduceTransparency/useOSFontScale. |
| `src/domain/types.ts` | `original` | (modified) optional `ParentSettings.locale?` (additive; no bump). |
| `src/domain/constants.ts` | `original` | (modified) `defaultParentSettings.locale = "en"`. |
| `src/services/notifications.ts` | `original` | (modified) `REMINDER_TITLE`/`REMINDER_BODY_TEMPLATES` sourced from the catalog; `assertReminderCopyClean` runs over every locale's resolved copy (banned-tone gate kept). |
| `src/services/tts.ts` | `original` | (unchanged; `language` param already supported — threaded by callers). |
| `components/ui/SpokenLabel.tsx` | `original` | (modified) render via `AppText`; thread `language` from `useLocale`; role `button` when it speaks, `text` otherwise + hint. |
| `components/onboarding/useOnboardingVoice.ts` | `original` | (modified) thread `language` from `useLocale`. |
| `app/_layout.tsx` | `original` | (modified) feed persisted reduced-motion (per-child ∨ global default) into `ThemeInputs`. |
| `components/rewards/TokenMeter.tsx` | `original` | (modified) polite live region + `accessibilityValue` for the running balance; hide decorative glyph. |
| `components/celebration/CelebrationOverlay.tsx` | `original` | (modified) announce once per burst; hide the decorative confetti/ripple subtree from the reader. |
| `components/buddy/BubbleBuddy.tsx` | `original` | (modified) single resolved "name is/looks mood" a11y label (positive-only); grouped focal node. |
| `components/task/TaskRunner.tsx` | `original` | (modified) announce routine-complete (modal has no overlay); rename local copy var. |
| `components/task/StepCard.tsx` | `original` | (modified) triple-coded resolved chip via `resolveStatusPresentation` (skipped = dash + textDim, distinct from done). |
| `app/(parent)/settings.tsx` | `original` | (modified) Language & display card (locale picker + notes); gate the OpenDyslexic row behind `isOpenDyslexicAvailable()`. |
| `__tests__/i18n/messages.test.ts` | `original` | Accessor: key/age resolution, `{param}` interpolation, plural, en/key fallback. |
| `__tests__/i18n/catalog.test.ts` | `original` | Catalog completeness: both variants present, every key resolves, preteen→older fallback, registry. |
| `__tests__/theme/contrast.test.ts` | `original` | WCAG AA guard over all four palettes + helper math. |
| `__tests__/theme/resolveStatusPresentation.test.ts` | `original` | Triple-coding: icon+shape+label per status/daypart, colorblind-safe, no red/danger key. |
| `__tests__/theme/resolveTokens.test.ts` | `original` | (extended) `maxFontSizeMultiplier === 1.3`, reduce-transparency flatten, `resolveEffectiveReducedMotion`. |
| `__tests__/services/notifications.test.ts` | `original` | (extended) catalog-sourced reminder copy stays clean for the active locale. |

## M-A4 — Production hardening I (safety nets that guard every later slice) (feature-complete)

Cross-cutting, 100% FREE (never gated — no `FEATURE_GATES` key). Front-loads the
migration/versioning safety net + the shared render-test harness + the
error/empty/loading safety nets + the dev-screen gate + the OS-backup-exclusion
flag. Additive-only: `SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`. One new
optional persisted field (`AppMeta.lastRecoveredAt?`); no new store slice.

| File | Origin | Notes |
| --- | --- | --- |
| `src/config/flags.ts` | `original` | NEW. `DEV_SCREENS_ENABLED` (not persisted) from `__DEV__` ∨ `EXPO_PUBLIC_TB_DEV_SCREENS==="1"` (§2.6/§3.1). |
| `components/ui/ErrorScreen.tsx` | `original` | NEW. Calm, mode-neutral, provider-free recovery UI (still bubble + `error.recover` line + Reload + parent Show-details); NO network/telemetry (§2.3). |
| `components/RootErrorBoundary.tsx` | `original` | NEW. Global class error boundary → renders `ErrorScreen`; on recovery stamps `noteRecovered()`; on-device only (§2.3). |
| `src/domain/types.ts` | `original` | (modified) optional `AppMeta.lastRecoveredAt?` (additive; no bump) (§3.2). |
| `src/state/settingsStore.ts` | `original` | (modified) `noteRecovered()` action stamps `meta.lastRecoveredAt`. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys: `error.recover`, `empty.rewards`, `empty.noChildren`, `empty.tasks`, `empty.rewardsSetup` (both variants; anti-shame) (§2.3). |
| `app/_layout.tsx` | `original` | (modified) wrap tree in `RootErrorBoundary`; add router-level `export function ErrorBoundary`; register `_sandbox`/`_theme-gallery` only behind `DEV_SCREENS_ENABLED` (§2.3/§2.6). |
| `app/_sandbox.tsx` | `original` | (modified) prepend `if (!DEV_SCREENS_ENABLED) return <Redirect href="/">` (§2.6). |
| `app/_theme-gallery.tsx` | `original` | (modified) same redirect guard (§2.6). |
| `components/StoreHydrationGate.tsx` | `original` | (modified) `HYDRATION_MAX_WAIT_MS` ~4s fallback so a wedged store never hangs the first frame (§2.3). |
| `app/(parent)/settings.tsx` | `original` | (modified) bound `DataReview`: counts always; full JSON behind a 2nd tap; omit the unbounded arrays (ledger entries/moods/events/redemptions) → point to the backup file (§2.4). |
| `app/(parent)/dashboard.tsx` | `original` | (modified) no-children empty copy via `getMessage("empty.noChildren")` (§2.3). |
| `app/(parent)/tasks.tsx` | `original` | (modified) empty-daypart copy via `getMessage("empty.tasks")` (§2.3). |
| `app/(parent)/rewards-setup.tsx` | `original` | (modified) no-rewards empty note via `getMessage("empty.rewardsSetup")` (§2.3). |
| `app/(kid)/rewards.tsx` | `original` | (modified) kid empty-rewards copy via `resolveContent("empty.rewards")` (§2.3). |
| `app.json` | `original` | (modified) `android.allowBackup: false` — OS-backup-exclusion front-load (§2.7). |
| `jest.setup.js` | `original` | (modified) activate the manual Reanimated mock + require gesture-handler jestSetup (§2.8). |
| `__mocks__/react-native-reanimated.js` | `original` | NEW. Self-contained, worklet-free Reanimated jest mock (the shipped `/mock` pulls in native worklets that throw under jest) — animations resolve synchronously; `Animated.*` are RN components (§2.8). |
| `__tests__/helpers/render.tsx` | `original` | NEW. `react-test-renderer` wrapper (`renderWithTheme` + `queryAllText`) with a default `ThemeProvider` (no new dep) (§2.8). |
| `__tests__/render/harness.test.tsx` | `original` | NEW. Proves the harness + Reanimated mock render an animated component + `ErrorScreen` without a thrown worklet (§2.8). |
| `__tests__/storage/migration-forward.test.ts` | `original` | NEW. Golden v1-fixture → `migrateAndRepair(fixture,1)`: no throw, values preserved, anti-shame invariants, incl. A1 `trialEndReminderAt` / A2 `preteen`+`avatar` / A3 `locale` / A4 `lastRecoveredAt` (§3.3). |
| `__tests__/storage/schema-roundtrip.test.ts` | `original` | NEW. Each store default JSON-safe + `mergeWithDefaults`-stable; every `CHILD_SLICES` name maps to a store default (§3.3). |
| `__tests__/config/no-network.test.ts` | `original` | NEW. No-egress gate over `app`/`src`/`components`, replicating the BUILD-GUIDE §3 exclusion set (comments/`docs.expo.dev`/`schema`/`xmlns`) (§2.5). |
| `__tests__/config/dev-screens-gated.test.ts` | `original` | NEW. Asserts both dev screens carry the `DEV_SCREENS_ENABLED` redirect guard + `_layout` registers them only conditionally (§2.6). |
| `__tests__/config/backup-exclusion.test.ts` | `original` | NEW (scaffold). Asserts `app.json` `android.allowBackup === false`; iOS photo-dir check is `it.todo` until M-D2 (§2.7). |
| `RUN.md` | `original` | (modified) replace the "delete dev screens" note with the `DEV_SCREENS_ENABLED` flag story (§2.6). |

## M-B1 — Visual transition timers (feature-complete, Wave B)

A calm depleting bar/wedge for a step/transition, viewable across a room, with the
optional chime **audio DECOUPLED** (routed through the existing `duckOthers`
session — it lowers, never seizes, other media). Framed as EXTERNAL SCAFFOLDING for
a transition, never "fixes the internal clock." Advisory only: empty simply RESTS
(no auto-advance/skip, no token/celebration change, no red/flash, no looping tick).
Age/sensory-adaptive via resolvers + capability flags ONLY (young focal wedge vs
older slim bar; numbers only when `showNumbersAndCharts`; discrete 1 Hz stepping
under Reduce-Motion; muted single hue when confetti is off). 100% FREE (never
`<PremiumGate>`-wrapped). Additive-only: `SCHEMA_VERSION` stays 1, `MIGRATIONS`
stays `[]`. New optional persisted fields: `ActiveRunProgress.stepTimerStartedAt?`
+ `ParentSettings.timerSoundEnabled?` (both no-bump).

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/timer.ts` | `original` | NEW. Pure, RN-free wall-clock helpers (`timerRemainingMs`/`timerFraction`/`formatMSS`/`hasVisualTimer`) — the canonical timer math (M-C3 soft-reuses `formatMSS`). Drift-free recompute; non-positive/NaN budget => "no timer" (never throws) (§4 #1). |
| `components/task/VisualTimer.tsx` | `original` | NEW. The depleting wedge (young, `react-native-svg` `Circle`+`strokeDashoffset`, BubbleMeter pattern) / slim bar (older). ONE non-looping `withTiming` in standard/lowStim; single 1 Hz wall-clock `setInterval` for the discrete Reduce-Motion stepping + calm `m:ss` readout; empty via one wall-clock `setTimeout`. No red/danger, no flash, no `withRepeat`, no looping tick. Reads `useThemeTokens()` only — never raw `ageMode`/`sensoryMode`/`reducedMotion` (§4 #2). |
| `components/task/TaskRunner.tsx` | `original` | (modified) render `<VisualTimer>` on the active step in BOTH shells (young: between focal `StepCard` and `DoneButton`; older: above the bottom `DoneButton`); seed/clear the persisted `stepTimerStartedAt` on active-step change; wire the opt-in `onEmpty` → `playCue("timer.done")` gated by the Settings toggle + master-sound + quiet-hours. No change to completion/token/celebration logic (§2.1/§4 #5). |
| `src/domain/types.ts` | `original` | (modified) optional `ActiveRunProgress.stepTimerStartedAt?` (§3.2) + `ParentSettings.timerSoundEnabled?` (§2.7) — both additive, no bump. `Task.timerSeconds?` already existed (wired, not added). |
| `src/state/runProgressStore.ts` | `original` | (modified) NEW `setStepTimerStart(cid, startedAt)` setter (persisted via the existing `active` slice); `markStepResolved` clears the previous step's timer start so it never bleeds into the next step. |
| `src/domain/constants.ts` | `original` | (modified) `defaultParentSettings.timerSoundEnabled = false` (opt-in). |
| `src/state/gameplay.ts` | `original` | (modified) `AssignTaskInput.timerSeconds?` threaded through `makeTaskFromTemplate` (a curated Off clears, a positive sets) (§3.4). |
| `components/parent/pickers.tsx` | `original` | (modified) NEW reusable `TimerField` + `TIMER_DURATION_OPTIONS` — a curated `Segmented` (Off/30s/1m/2m/5m/10m), no free-form entry (curated autonomy) (§4 #8). |
| `app/(parent)/tasks.tsx` | `original` | (modified) `AssignDraft.timerSeconds`; `<TimerField>` in the Assign sheet (default from the template); pass `timerSeconds` into `assignTaskFromTemplate` (§4 #7). |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy: `timer.label`, `timer.rested` (calm empty state — never "time's up"), `timer.a11y` (both age variants; anti-shame) (§4 #9). |
| `src/services/playCue.ts` | `original` | (modified) add `"timer.done"` to the `CueId` union (decoupled one-shot; never looped) (§4 #11). |
| `src/services/sound.ts` | `original` | (modified) register `timer.done` in `CUE_ASSET`/`CUE_CATEGORY` (reuses `celebration` mixer category)/`CUE_VOLUME` (0.5). Ships muted-by-default at the feature level via the Settings toggle (§4 #12). |
| `assets/sounds/timer-done.wav` | `original` | NEW. Procedurally-synthesized soft ~0.55s two-note settle chime (CC0/original, Python stdlib) — non-alarming (§4 #13). |
| `app/(parent)/settings.tsx` | `original` | (modified) NEW "Timer sound" `SettingRow` + `Toggle` (default OFF) under "Sound & motion" (§4 #14). |
| `src/data/taskTemplates.ts` | `original` | (modified) `tpl()` gains an optional `timerSeconds`; seed forgiving defaults (`brush_teeth` 120s, `get_dressed`/`tidy_toys` 300s, `calm_breaths` 30s) so the feature is demonstrable day one (§4 #16). |
| `src/storage/migrations.ts` | `original` | (modified) `repairTask` coerces a negative/NaN `timerSeconds` → `undefined` ("no timer", never throws) (§3.3). |
| `__tests__/domain/timer.test.ts` | `original` | NEW. Wall-clock recompute across a background gap, clamping, zero/negative/NaN budgets, `m:ss` formatting (§4 #3). |
| `__tests__/components/visualTimer.test.tsx` | `original` | NEW. Readout gates on `showNumbers`; `onEmpty` fires exactly once when empty + never while time remains; Reduce-Motion stepped path renders (no thrown worklet); palettes carry no danger/error key (§4 #4). |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) extend the golden fixture with `parentSettings.timerSoundEnabled` + a task's `timerSeconds`; assert both survive (§3.3 extension contract). |
| `__tests__/services/sound.test.ts` | `original` | (modified) cue count 9 → 10 (adds `timer.done`). |
| `THIRD_PARTY_NOTICES.md` | `original` | (modified) register `assets/sounds/timer-done.wav` in the bundled-assets table. |

## M-B2 — Light verify + quick undo (feature-complete, Wave B)

Two small safety features that protect the core loop without adding shame or parent
burden: (1) **light, OPTIONAL task verification** (`self` / `photo` / `parent`) that
is **NEVER a gate** — completion + the token payout stay immediate on Done, verify is
a bonus confirmation; and (2) a fast, no-punishment **quick UNDO** on a completed step
and on an auto-approved redemption. Undo is anti-shame BY CONSTRUCTION: it corrects the
spendable `balance` (anti-gaming) but leaves `lifetimeEarned`/`cumulativeCount`/streak/
buddy growth UNTOUCHED (`undoEarn` touches neither lifetime total). Redemption undo =
`refund` + new terminal `reversed` (guardrail availability recovers). ZERO AI (manual
verify only; photos are on-device `file://`, never uploaded/analyzed). Curated + calm
(single optional affordance, equally-weighted Skip, no nag). Age-adaptive via capability
flags + resolved copy ONLY (no raw `ageMode`). Additive-only: `SCHEMA_VERSION` stays 1,
`MIGRATIONS` stays `[]`; the only persisted change is the `RedemptionStatus += "reversed"`
union widening. 100% FREE (never `<PremiumGate>`-wrapped).

**Optional-dep note (env + spec §5):** `expo-image-picker` / `expo-file-system` are the
`mode:'photo'` capture + on-device photo-file lifecycle backends. This build has no native
toolchain to install them, so `src/services/photoVerify.ts` loads them via a GUARDED runtime
`require` (feature-detected, no static import) — the module + everything importing it compiles
and web-bundles green, and photo gracefully degrades to `self`/hidden while `self`/`parent`/
`none` verify and ALL of undo ship with zero hard dependency. The `app.json` config-plugin +
usage-string registration and the `THIRD_PARTY_NOTICES` entry are deferred to when the deps are
actually installed (adding an unresolved plugin now would break `expo export --platform web`).

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | (modified) `RedemptionStatus += "reversed"` (additive union widening, no bump); refreshed the `Verification.required`/`photoUri` doc-comments (runner IGNORES `required` — never a gate; photo is on-device only). |
| `src/domain/constants.ts` | `original` | (modified) NEW `UNDO_WINDOW_MS = 6000` — the transient, never-persisted kid-side quick-undo window (§2.2/§5). |
| `src/domain/gamification.ts` | `original` | (modified) NEW pure `undoEarn` (lowers `balance` floored ≥0, appends a `reason:'undo'` entry, leaves BOTH lifetime totals untouched — the anti-shame split) + `latestEarnFor` (find the completion earn to reverse). Deterministic (`now`/`id` passed in) (§3.3). |
| `src/domain/tokens.ts` | `original` | (modified) NEW pure `reverseRedemption` — `refund` + status `reversed`, guarded so only an approved/fulfilled grant reverses (a stale reverse is a no-op, no double refund) (§3.4). |
| `src/domain/tasks.ts` | `original` | (modified) NEW pure `needsParentVerify` / `stepsAwaitingParentVerify` — the OPTIONAL parent confirm-at-leisure queue selectors (mode:'parent', done, unconfirmed) (§3.5). |
| `src/services/photoVerify.ts` | `original` | NEW. The single feature-detected on-device photo seam (`isPhotoVerifyAvailable`/`capturePhoto`/`deletePhoto`) over `expo-image-picker` + `expo-file-system`, loaded by guarded runtime `require` (NO static dep — web-safe/no-throw). Photos copied to an excluded-from-backup dir; `deletePhoto` cleans up on re-verify/wipe. ZERO egress, ZERO AI (§CREATE/§5/§9.3). |
| `src/state/runProgressStore.ts` | `original` | (modified) NEW `unmarkStepResolved(cid, taskId, {stepIds, routineId, resolvedTaskIds})` — re-arms a resolved step for both mid-run (drop from `completedStepIds`) and last-step (re-create the auto-cleared run) undo (§3.6). |
| `src/state/gameplay.ts` | `original` | (modified) NEW orchestrators `undoStep` (reverse balance + status + run pointer + clear the daypart mark; leave lifetime/growth), `verifyStep` (token-neutral stamp; `deletePhoto` prior photo on re-verify), `reverseRedemption`; thread `AssignTaskInput.verificationMode?` through `makeTaskFromTemplate`; `wipeAllChildData` now `deletePhoto`s every child photo BEFORE wiping (no orphans) (§MODIFY/§9.3). |
| `components/task/UndoBar.tsx` | `original` | NEW. Transient "Oops — undo?" affordance; `variant:'focal'|'row'` from a capability flag; gentle Reanimated shrinking ring (static under Reduce-Motion via `t.motion.loopsEnabled`); ≥64dp focal target; owns its own window `setTimeout`→`onExpire`. Resolved copy passed in (no raw ageMode) (§2.2/§CREATE). |
| `components/task/VerifyPrompt.tsx` | `original` | NEW. Optional self/photo affordance driven by `verification.mode`; equally-weighted Skip; `photo`→`self` degrade when the camera is unavailable; `parent`/`none` render nothing kid-facing; `calm` hides the sparkle; a calm confirmation after a self-verify. Never blocks the advance; resolved copy passed in (no raw ageMode) (§2.1/§CREATE). |
| `components/parent/VerifyQueue.tsx` | `original` | NEW. Dashboard section: OPTIONAL parent confirm-at-leisure ("Looks good" → `verifyStep` by parent) with a ZOOMABLE photo thumbnail (missing/dangling file renders NOTHING via `Image onError` — no broken-image icon) + a recently-approved-redemption "Undo" strip (`reverseRedemption`). Returns null when nothing awaits (self-hides). Dense parent copy, no raw ageMode (§2.4/§CREATE). |
| `components/task/TaskRunner.tsx` | `original` | (modified) render `UndoBar` + `VerifyPrompt` for the just-resolved step in BOTH shells (variant from `caps.multiStepVisible`); pass `undoTaskId` to `celebrate` for the last step; re-arm the "all done" latch when a completed run is un-done from celebrate; feature-detect `photoAvailable` once. Completion/token/celebration logic UNCHANGED (§2.1/§2.2). |
| `components/task/StepCard.tsx` | `original` | (modified) older `RowStep`: optional long-press on a RESOLVED row → "Mark not done" (persistent quick-undo fallback beyond the transient window) (§2.2). |
| `app/(kid)/celebrate.tsx` | `original` | (modified) secondary, low-emphasis "Oops, undo" link (reads the `undoTaskId` param → `undoStep` → `router.back()`) — never the primary focus; the big Done stays primary (§2.2). |
| `components/rewards/RewardCard.tsx` | `original` | (modified) NEW optional `onUndo`/`undoLabel` — a calm "Got it!" + short "Undo" on a JUST auto-approved redemption (verify-undo §2.3). |
| `app/(kid)/rewards.tsx` | `original` | (modified) compute the per-reward recent-auto-approve grant within `UNDO_WINDOW_MS` (a tick re-render fades it on expiry); wire `RewardCard.onUndo` → `reverseRedemption` (§2.3). |
| `app/(parent)/dashboard.tsx` | `original` | (modified) mount `<VerifyQueue childId>` in each `ChildCard` near "Reward requests" (§2.4). |
| `app/(parent)/tasks.tsx` | `original` | (modified) "Ask to verify?" `Segmented` (Off/Self/Photo/Parent) in the Assign sheet (default from the template, default `none`); thread `verificationMode` into `assignTaskFromTemplate`; `required` never surfaced (§2.4). |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy: `undo.step`/`undo.done`/`verify.self`/`verify.photo`/`verify.skip`/`verify.parentConfirm` (both age variants; playful-neutral, pass the anti-shame grep gate — no failed/missed/lost/removed) (§4). |
| `__tests__/domain/undo.test.ts` | `original` | NEW. Pure: `undoEarn` floors at 0 + leaves lifetime totals; `latestEarnFor`; `reverseRedemption` grant-only guard; `needsParentVerify`/`stepsAwaitingParentVerify` (§7). |
| `__tests__/state/verifyUndo.test.ts` | `original` | NEW. Verify never gates + token-neutral; step undo restores balance/status/run pointer but leaves lifetime/cumulative/buddy growth; balance floored ≥0; last-step undo clears the daypart mark + re-arms; redemption reverse refunds + `reversed` + guardrail recovery; re-verify + `wipeAllChildData` `deletePhoto` every photo (mocked photoVerify) (§7). |

## M-B3 — Child autonomy ("be the boss") (feature-complete, Wave B)

Closes the delta on the three curated autonomy pillars: **pick a reward**, **customize/rename
the companion**, **choose task order**. This is a wiring milestone, not a rebuild — the pillars
already existed; two dormant grants were connected to nothing and young mode had no order
autonomy. Now: the master `canCustomizeCompanion` grant forces the three `canPick*` off in the
resolver (Color/Finish/Accessory hide; the **Name** field stays ungated; no owned cosmetic is
stripped); `canPickReward=false` swaps the reward "Get this!" tap for a calm **"Ask a grown-up 💛"**
line (menu stays fully visible, "save toward" still works — no lock/greyed/denied state); young
mode gains a curated **"What next?"** strip (`NextStepChooser` → `runProgressStore.chooseNextStep`,
which moves the chosen step to the front of the UNCOMPLETED run portion — **per-run only**, the
parent routine is never permanently reordered; older ▲/▼ reorder unchanged); all four autonomy
toggles are surfaced in `children.tsx`. Self-Determination-Theory framing, but the extrinsic
tokens stay (autonomy sits on top of the token economy). CURATED (reward slice capped at
`maxChoices` 3/6; the chooser shows ≤`maxChoices` steps — never an open catalog); ANTI-SHAME (no
wrong choice, ignoring the strip is fine, no failure/denied state); ZERO AI (no ranking model —
the strip offers the child's own remaining steps in fixed order; no `Math.random`); age-adaptive
via `caps.*`/`autonomy.*` ONLY (no raw `ageMode` read, no `ageMode` prop). Additive-only:
`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]` (the grants already persist on
`ChildSettings.autonomy` since M4). 100% FREE. The optional reward-favorites enhancement
(§2.1/§3.3) is deferred (explicitly not required for acceptance).

| File | Origin | Notes |
| --- | --- | --- |
| `src/theme/resolveCapabilities.ts` | `original` | (modified) `ModeCapabilities += canPickReward`; `ResolveCapabilitiesInput += canCustomizeCompanion?/canPickReward?`; the master grant (`?? true`) forces `canPickColor/Accessory/Theme` false when off; `canPickReward` defaults true (§3.1). |
| `src/theme/ThemeProvider.tsx` | `original` | (modified) `CapabilityGrants += canCustomizeCompanion/canPickReward` (both flow through the existing `useCapabilities` grant-spread — no hook change) (§3.2). |
| `app/_layout.tsx` | `original` | (modified) `ThemedRoot` feeds `grants.canCustomizeCompanion`/`grants.canPickReward` from `cs.autonomy.*` — live-updates on `updateSettings` (§3.2). |
| `src/state/runProgressStore.ts` | `original` | (modified) NEW `chooseNextStep(cid, taskId)` — moves the chosen id to the front of the uncompleted run portion (completed order + `completedStepIds` preserved); no-op for unknown/resolved/already-front/no-run; never touches `taskStore.routines` (§3.4). |
| `components/task/NextStepChooser.tsx` | `original` | NEW. The young "What next?" curated strip — ≤`maxChoices` upcoming steps as tappable emoji+color bubbles with spoken labels; static (no drift); `tap.soft` cue on choose; no raw `ageMode` (§2.3/§CREATE). |
| `components/task/TaskRunner.tsx` | `original` | (modified) young branch renders `NextStepChooser` when `!multiStepVisible && autonomy.canReorderSteps` and ≥2 upcoming steps → `chooseNextStep`; older ▲/▼ reorder unchanged (§2.3). |
| `components/rewards/RewardCard.tsx` | `original` | (modified) NEW `canRequest?`/`askLabel?` props — when `canRequest` is false the "Get this!" tap becomes a calm "Ask a grown-up" pill (no lock/denied); "save toward" preserved (§2.1). |
| `app/(kid)/rewards.tsx` | `original` | (modified) pass `canRequest={caps.canPickReward}` + resolved `reward.askGrownup` copy to each `RewardCard` (§2.1). |
| `components/buddy/BuddyRoom.tsx` | `original` | (modified) Color/Finish/Accessory already gate on `caps.canPick*` (now master-gated automatically); Name stays ungated; NEW length cap (`maxLength`) + offline profanity check on save — a flagged/empty entry gently reverts (curated-autonomy free-text exception §2.2). |
| `src/domain/companionName.ts` | `original` | NEW. Pure `isCompanionNameAllowed`/`normalizeCompanionName` + `MAX_COMPANION_NAME_LEN` — a small bundled word-list check (leet-folded, token-based to avoid the Scunthorpe problem), NO network, NO AI (§2.2). |
| `app/(parent)/children.tsx` | `original` | (modified) Autonomy card: relabel reorder → "Let child choose step order"; add "Let child customize buddy" (`canCustomizeCompanion`) + "Let child ask for rewards" (`canPickReward`, hint "Suggestions still need your OK.") (§2.4). |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy `reward.askGrownup` (young "Ask a grown-up 💛" / older "Ask a grown-up to get this." — passes the anti-shame grep gate) (§2.1/§4). |
| `__tests__/theme/resolveCapabilities.test.ts` | `original` | (modified) extended: master-gate forces the three `canPick*` off; default keeps age defaults; master composes over granular overrides; `canPickReward` default/override (§7.1). |
| `__tests__/state/autonomy.test.ts` | `original` | NEW. `resolveCapabilities` master-gate + `canPickReward`; `chooseNextStep` reorder correctness + no-ops (unknown/resolved/already-front/no-run) + routine-untouched + resume; companion-name filter (allow/reject/leet/length) (§7). |

## M-B4 — Mood / energy check-in (feature-complete, Wave B)

Reviewer: feature-complete build-agent (M-B4). Additive delta on the shipped app: an **opt-in,
on-device-only** kid mood/energy check-in feeding a **calm-corner tie-in** + a **read-only parent
insight**. Default OFF — the parent-global `parentSettings.moodLoggingEnabled` (already shipped) is
the master switch, now ANDed with an additive optional per-child `ChildSettings.moodCheckinEnabled?`
(default `true`) to compute the resolved `moodCheckin` capability grant in `ThemedRoot` — so enabling
the global switch never silently opts in a sibling, and a parent can turn it off for ONE child. Every
kid/parent surface gates on `useCapabilities().moodCheckin`, NEVER the raw setting and NEVER `ageMode`.
The kid screen (`app/(kid)/mood.tsx`, a pushed modal in both shells) is deliberately UN-gamified — NO
tokens, NO confetti, NO streak, NO score; one "Check in" tap logs a `MoodLog{ mood, day, ts, daypart,
energyScaleMax?, source:"kid" }` (write defensively re-gated on `moodLoggingEnabled`), a warm thanks
line shows, and a `rough`/`okay` pick offers an OPTIONAL calm-breaths button routing to `/(kid)/calm`
(the companion is never made sad — `CompanionMood` has no negative member). Young = 3 energy cells +
auto-spoken prompt + larger tiles; older/preteen = 5 cells + no auto-speak — produced ONLY by the new
pure `resolveMoodCheckin({ ageMode, sensoryMode })` resolver + `resolveContent` (no raw `ageMode` in any
component; grep-clean). lowStim / OS Reduce-Motion → instant, static tap-select (`animateSelect` AND
`t.motion.loopsEnabled`). Parent insight (`app/(parent)/insights.tsx`, inside the PIN-gated group) is
strictly READ-ONLY + DESCRIPTIVE + NON-DIAGNOSTIC: FREE recent-check-ins list (all tiers) + PREMIUM
multi-week `MoodTrend` behind `<PremiumGate feature="advancedInsights">` (mock-gated; free sees an
honest no-urgency upsell). ZERO AI: the new pure `src/domain/moodInsight.ts` selectors return
counts/timelines of literal taps ONLY — never an emotional label — enforced by the mechanical
banned-interpretation gate (`moodInsight.test.ts` runs every selector output through the banned-token
check; the BUILD-GUIDE §3 grep over `insights.tsx`/`components/mood/*`/`moodInsight.ts`/`resolveContent`/
`en.ts` returns zero). Zero-log surfaces show calm `mood.glanceEmpty`/`mood.insightsEmpty` lines, never
a blank/blaming surface. Additive-only: three OPTIONAL `MoodLog` fields + one OPTIONAL `ChildSettings`
field — `SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`; the M-A4 migration-forward fixture is
extended to prove they survive. Reused: existing `childStore.moods`/`addMood`/`MOODS_CAP`, the
`moodCheckin` capability flag + `CapabilityGrants` slot, `date-fns` daypart engine, `expo-speech` TTS
seam, reanimated (calm select), `<PremiumGate>`/`advancedInsights`, parent `ui.tsx` kit. No new
dependency. Donor grounding is CONCEPT-ONLY (the 4-level weather-emoji scale + 3/5-level energy ramp) —
re-authored against our stack, no code copied.

| File | Origin | Notes |
| --- | --- | --- |
| `src/data/moodScale.ts` | `original` | NEW. Curated `MOOD_FACES` (🌧️ rough · ☁️ okay · 🌤️ good · ☀️ great, warm non-judgmental colors, NO red) + `ENERGY_CELLS_YOUNG` (3) / `ENERGY_CELLS_OLDER` (5) + `MOOD_FACE_BY_MOOD`; each tile carries a REQUIRED `spokenLabel`. Concept re-authored (momentum/ilseon/mymoodz) — no code copied (§5). |
| `src/theme/resolveMoodCheckin.ts` | `original` | NEW. Pure age/sensory resolver (`Record<AgeMode>` exhaustive → preteen forced): `energyLevels`/`energyScaleMax` (3 young / 5 older), `autoSpeakPrompt`, `animateSelect` (false in lowStim), `tileScale`, `showEnergy`. No React/store (§4.2). |
| `src/domain/moodInsight.ts` | `original` | NEW. Pure selectors — `recentMoods`, `moodCountsInRange`, `dominantMoods`, `energyByDaypart` (normalized against `energyScaleMax`; daypart fallback from `ts`), `moodTimeline`. Counts/timelines ONLY, NO interpretation (ZERO AI §2.5). `now`/`tz` passed in (deterministic). |
| `components/mood/MoodGrid.tsx` | `original` | NEW. 4-face kid grid; big touch targets; calm scale/opacity select only when `animate` (else instant/static). Age-agnostic — sizing from `config.tileScale`; no `ageMode` read (§2.2/§2.4). |
| `components/mood/EnergyGrid.tsx` | `original` | NEW. Optional, skippable 3/5-cell energy grid from `config.energyLevels`; calm border highlight; no `ageMode` read (§2.2). |
| `components/mood/MoodTrend.tsx` | `original` | NEW. Parent-side READ-ONLY emoji timeline + per-mood counts + energy-by-daypart bars, fed by `moodInsight.ts`. Descriptive only — banned-interpretation grep-clean (§2.5). |
| `app/(kid)/mood.tsx` | `original` | NEW. The pushed-modal check-in screen (both shells): resolves active child, composes `MoodGrid`/`EnergyGrid`, one-tap "Check in" → `addMood` (defensively re-gated on `moodLoggingEnabled`), warm thanks + OPTIONAL calm tie-in for rough/okay, "Maybe later" skip. UN-gamified; TTS via the shared `speak` seam; age via resolvers only (§2.2). |
| `app/(parent)/insights.tsx` | `original` | NEW. Parent mood insight (PIN-gated group): FREE recent list + PREMIUM `MoodTrend` behind `<PremiumGate feature="advancedInsights">` (honest upsell when free); `mood.insightsEmpty` zero-state; `ageModeLabel` (no raw `ageMode`) (§2.5). |
| `src/domain/types.ts` | `original` | (modified) `MoodLog += daypart?`/`energyScaleMax?`/`source?` (all OPTIONAL) + doc note (energy now young 1-3 / older 1-5); `ChildSettings += moodCheckinEnabled?` (absent ⇒ true). Additive → no `SCHEMA_VERSION` bump (§3). |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `mood.prompt`/`thanks`/`energyPrompt`/`calmOffer`/`skip`/`checkIn`/`glanceEmpty`/`insightsEmpty` (both age variants; anti-shame + no-interpretation grep-clean) (§4.3). |
| `app/_layout.tsx` | `original` | (modified) `ThemedRoot` computes `grants.moodCheckin = moodLoggingEnabled && (cs.moodCheckinEnabled ?? true)` (per-child consent) + adds `moodLoggingEnabled` to the memo deps (§4.1). |
| `app/(kid)/_layout.tsx` | `original` | (modified) registers `mood` as a pushed modal in `YoungStack` + `href:null` in `OlderTabs`; adds `"mood"` to the `GrownUpsDoor` hide list so the door never overlaps the modal (§5). |
| `app/(kid)/calm.tsx` | `original` | (modified) low-emphasis "Check in" affordance near the title, only when `caps.moodCheckin`, routing to `/(kid)/mood` (§2.1). |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) optional "How are you feeling?" chip (peer of the peek link), only when `caps.moodCheckin` → `/(kid)/mood` (§2.1). |
| `app/(parent)/dashboard.tsx` | `original` | (modified) `ChildCard` gains a FREE "Recent check-ins" emoji strip + "See check-ins →" link (only when `moodLoggingEnabled`; `mood.glanceEmpty` zero-state); management Card gains a "Check-ins" row → `insights.tsx` (§2.5). |
| `app/(parent)/settings.tsx` | `original` | (modified) extended the "Mood check-ins" hint ("Optional emoji check-in for kids + a private, on-device parent view. Applies to every child unless you turn it off for one.") (§2.0/§5). |
| `app/(parent)/children.tsx` | `original` | (modified) per-child "Mood check-ins for this child" toggle (`moodCheckinEnabled`), shown only when the parent-global switch is on — off for one child leaves siblings working (§2.0). |
| `src/theme/index.ts` | `original` | (modified) barrel export `resolveMoodCheckin` (§5). |
| `src/domain/index.ts` | `original` | (modified) barrel export the `moodInsight` selectors (§5). |
| `__tests__/theme/resolveMoodCheckin.test.ts` | `original` | NEW. Age table (young 3 / older & preteen 5; auto-speak; tileScale) + lowStim `animateSelect:false` + `energyScaleMax === energyLevels` (§9). |
| `__tests__/domain/moodInsight.test.ts` | `original` | NEW. Selector correctness (recent/counts/dominant/energy-by-daypart normalization + `ts` fallback/timeline window) + the banned-interpretation gate over every selector output (ZERO AI §2.5). |
| `__tests__/theme/resolveContent.test.ts` | `original` | (modified) asserts the 8 `mood.*` copy keys resolve BOTH age variants (§9). |
| `__tests__/theme/resolveCapabilities.test.ts` | `original` | (modified) `moodCheckin` defaults OFF for all ages; the parent grant flips it on; explicit false stays off (§9). |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with a `MoodLog` carrying `daypart`/`energyScaleMax`/`source` + `settings.moodCheckinEnabled:false`; asserts they survive `migrateAndRepair(fixture, 1)` untouched (M-A4 extension contract). |

## M-B5 — Multi-child switcher + rotating chores (feature-complete, Wave B)

Reviewer: feature-complete build-agent (M-B5). Additive delta on the shipped app implementing the two
genuinely-new pieces of the multi-child spec (most of which was already shipped + green): **(A) a fast,
parent-safe child switcher** for a shared device and **(B) rotating/assignable chores across siblings**
(the documented Joon white-space "rotate chores between children"). **ZERO AI:** rotation is pure,
offline `mod` date math (`src/domain/chores.ts`) — `currentHolderId` resolves the roster index from
whole local days/weeks (`date-fns`, DST-safe via calendar-day diff) or a completion counter; NO LLM,
NO `Math.random`, NO "smart" allocation (grep-clean). Each holder-day assignment **materialises as an
ORDINARY per-child `Task`** carrying `choreId`/`choreHolderDay` provenance, dropped into the holder's
active daypart routine (or standalone), so it flows through the shipped `TaskRunner → completeStep`
untouched — earning tokens + the same celebration + companion nurture (full core-loop reuse, NO new kid
UI). Materialisation is **idempotent** (exactly one live task per `(choreId, holder-day)`; re-running
`reconcileChild` never duplicates; a non-holder gets none) and **stale-safe** (a prior-day, still-`todo`
chore task is archived + detached from its routine's `stepIds`). **ANTI-SHAME (§6):** rotation is
"whose turn," never punishment — time cadences advance on the clock so no child gets "stuck"; a
`perCompletion` chore always has a manual "pass to next"; the switcher shows names + avatar colors ONLY
(no token counts / streaks / progress / leaderboard — no cross-child comparison); switching never
zeroes/hides the previous child's data (per-`cid`, untouched). **Premium:** rotation has NO separate
gate — free once ≥2 children exist, gated only transitively by the shipped `multiChild` count gate
(2nd–8th child); acquisition-only downgrade removes nothing. Additive-only: NEW persisted slice
`tb/chores` (hydrates from its own `{ chores: [] }` default), OPTIONAL `Task.{choreId,choreHolderDay}?`,
and REQUIRED `ParentSettings.quickChildSwitch` (seeded `false` in `defaultParentSettings`, so
`mergeWithDefaults` backfills old blobs) — `SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`; the M-A4
migration-forward fixture + schema-roundtrip audit + Settings `DataReview` are all extended for the new
slice/fields. Age presentation flows ONLY through resolved capability flags (`multiStepVisible` shell +
`ttsDefault`) + `resolveContent` — no component reads raw `ageMode`. No new dependency (reused `zustand`
persist seam, `date-fns`/`date-fns-tz`, `expo-speech`, the parent `pickers.tsx`/`ui.tsx` kit,
`<PremiumGate>`). All content original + MIT-free.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/chores.ts` | `original` | NEW. Pure rotation resolver: `daysSinceAnchor`/`weeksSinceAnchor`/`currentHolderIndex`/`currentHolderId` (mod-safe, DST-safe), `isChoreScheduledToday`/`isChoreActive`, `choreTaskFor` materialisation (ordinary Task + `choreId`/`choreHolderDay`), `rotationPreview`. `now`/`tz` passed in; RN-free; ZERO AI / no `Math.random`. |
| `src/state/choreStore.ts` | `original` | NEW. Persisted parent-global `tb/chores` slice (mirrors `rewardStore`): `add/update/remove/setChores`, `advanceChore` (perCompletion pointer), `passChoreToNext` (manual hand-off), `pruneChild` (drop from rosters + deactivate <2-member — never hard-delete). Registered with `registerPersistedStore`. |
| `src/data/choreTemplates.ts` | `original` | NEW. Curated `CHORE_TEMPLATES` (take_out_trash 🗑️ / feed_pet 🐶 / set_table 🍽️ / wash_dishes 🧽 / water_plants 🪴 / tidy_shared 🧸) with `defaultDaypart`/`defaultCadence`/`suggestedTokenValue` + required `spokenLabel`. Suggestions only (pre-fill), not an engine. |
| `components/parent/ChildSwitcher.tsx` | `original` | NEW. Reusable avatar-grid switcher — names + avatar colors ONLY (no comparison). Young = oversized scrollable bubbles + spoken name on tap; older = compact wrapping text row (resolved flags only, no raw `ageMode`; no entrance animation → low-stim needs no extra gate). |
| `components/parent/RotationPreview.tsx` | `original` | NEW. Pure next-N-days holder preview ("Mon → Ana · Tue → Beto …") over `rotationPreview` + an anti-shame "Pass to next child →" hand-off control (never "take away"). |
| `components/kid/ChildHandoffButton.tsx` | `original` | NEW. Opt-in kid quick-switch (the ONLY kid-facing multi-child affordance) — reuses `ChildSwitcher`; tapping a sibling calls `switchActiveChild` directly (ungated by design). Self-guards on <2 children. |
| `app/(parent)/chores.tsx` | `original` | NEW. Dense parent authoring screen: requires ≥2 children (else calm Note); `chore.empty` CTA on zero chores; per-chore label (Emoji/Color/text + `CHORE_TEMPLATES` suggestions), ordered roster (add/remove + ↑/↓), cadence/daypart/bubbles/days pickers, live `RotationPreview`, "Pass to next" + delete. |
| `app/(parent)/switch-child.tsx` | `original` | NEW. Dedicated fast switcher — `switchActiveChild(cid)` → `router.replace('/(kid)')`; a `<PremiumGate feature="multiChild">`-wrapped "＋ Add" tile (same gate as `children.tsx`). |
| `src/domain/types.ts` | `original` | (modified) `Task += choreId?`/`choreHolderDay?` (materialised-chore provenance); NEW `RotationCadence` + `SharedChore`; `ParentSettings += quickChildSwitch` (seeded `false`). All additive → no `SCHEMA_VERSION` bump. |
| `src/domain/constants.ts` | `original` | (modified) `defaultParentSettings()` seeds `quickChildSwitch: false` (so `mergeWithDefaults` backfills existing installs). |
| `src/state/gameplay.ts` | `original` | (modified) `switchActiveChild` (setActive + clear live run + reconcile); `removeChild` (archive + `pruneChild` + delete verify photos + reassign active); shared-chore CRUD orchestrators (`createSharedChore`/`updateSharedChore`/`deleteSharedChore`/`passSharedChoreToNext` — immediate materialise for the current holder); `reconcileChild` now materialises holder chores + archives stale (idempotent); `completeStep` advances a `perCompletion` chore on Done; `wipeAllChildData` clears `tb/chores`. |
| `app/(parent)/children.tsx` | `original` | (modified) Remove now calls `removeChild` (prunes rosters + photos); adds a "🔁 Shared chores" link (only with ≥2 children). |
| `app/(parent)/dashboard.tsx` | `original` | (modified) header gains a "Switch" action (≥2 children) → `switch-child`; management Card gains a "🔁 Shared chores" row (≥2 children); each `ChildCard` shows a dim "🔁 <chore> · <child>'s turn today" line (this child's turns only — isolation). |
| `app/(parent)/settings.tsx` | `original` | (modified) NEW "Sharing this device" card with the `quickChildSwitch` toggle; `DataReview` now counts + dumps `tb/chores` (roadmap invariant #8(d)). |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) conditionally renders `<ChildHandoffButton>` when `quickChildSwitch` AND ≥2 non-archived children (low-emphasis, resolved-flags copy). |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `switch.title`/`switch.handoff`/`chore.turn`/`chore.empty` (both age variants; anti-shame grep-clean). |
| `src/domain/index.ts` · `src/data/index.ts` · `src/state/index.ts` | `original` | (modified) barrel-export `chores` / `choreTemplates` / `choreStore`. |
| `__tests__/domain/chores.test.ts` | `original` | NEW. Rotation math: daily/weekly/perCompletion/manual holder correctness, 3-way mod wraparound, DST-safe day diff, empty/1-member inactive, weekday `isChoreScheduledToday`, `choreTaskFor` shape, `rotationPreview`. |
| `__tests__/state/chores.test.ts` | `original` | NEW. Store CRUD + `pruneChild` (roster prune, <2 → inactive, never deleted); materialisation idempotency via `reconcileChild` (one for holder, none for non-holder, stale archived); `perCompletion` advance on Done + normal completion leaves counters untouched; `wipeAllChildData` empties `tb/chores`. |
| `__tests__/state/gameplay.test.ts` | `original` | (modified) `switchActiveChild` clears the live run; per-child isolation (completing as A leaves B byte-identical); `removeChild` prunes rosters + reassigns active + keeps a's data; re-adding a sibling reactivates a chore. |
| `__tests__/storage/schema-roundtrip.test.ts` | `original` | (modified) adds `chores` to the round-trip `STORES` set. |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with `parentSettings.quickChildSwitch:false` + a Task carrying `choreId`/`choreHolderDay`; asserts they survive `migrateAndRepair(fixture, 1)` (M-A4 extension contract). |
| `__tests__/state/entitlements.test.ts` | `original` | (modified) asserts NO separate chore/rotation gate key (rotation free once ≥2 children, transitively gated by `multiChild`). |

## M-C1 — Focus / calm soundscapes (audio-bed layer) (feature-complete, Wave C)

Reviewer: feature-complete build-agent (M-C1). Additive delta on the shipped app that turns the
already-present `calmSoundscape` premium flag + paywall line into real content and **owns the shared
audio-bed layer** later milestones (breathing M-C2) reuse. Ships an **optional, opt-in, silent-by-default
looping ambient bed** the child can turn on in the **calm corner** (scene + volume + on/off) and an
**optional focus bed during routines** (older in-runner toggle + parent-managed for young). **MIX,
NEVER HIJACK + NO BACKGROUND:** the bed lives in a NEW service `src/services/soundscape.ts` that adds
**no** session change — it reuses the shipped `duckOthers` / `playsInSilentMode:false` /
`shouldPlayInBackground:false` session configured once by `initSoundRegistry` (so it DUCKS, never
seizes/stops, other media, respects the silent switch, and never plays backgrounded); `setAudioModeAsync`
stays solely in `sound.ts` (grep-gated). It is a **separate** looping player from the sub-300ms one-shot
cue registry (a scene swap never touches the celebration hot path). **FULL volume control:** a real,
persisted `0..1` bed volume (not a fixed constant), applied live + clamped by the resolver AND
`validateAndRepair`. **ZERO AI:** a fixed hand-authored catalog — no "recommended"/adaptive/generative
audio, no ranking, no microphone (grep-clean over the service/catalog/picker). **ANTI-SHAME +
acquisition-only:** opt-in (nothing auto-plays; the calm toggle starts OFF every visit), orthogonal to
tokens/streak/celebration; `isSceneAvailable` HONOURS the currently-selected scene id so a premium scene
already chosen keeps playing after a trial ends (only NEWLY choosing a not-yet-unlocked premium scene is
gated → routes through the parent gate to the paywall, never strips/greys an owned one). **FREE:** ≥1
calm scene (`waves`, reuses `calm-ambient.wav`) + on/off + full volume; **PREMIUM (`calmSoundscape`):**
the expanded scene pack + focus-during-tasks. **BUILD DEFAULT (green with zero new assets):** only scenes
whose `.wav` exists are registered — M-C1 ships the free `waves` scene; the ~6 premium CC0 loops are an
out-of-band orchestrator prerequisite (a `require()` of a missing file breaks `expo export`), added per
scene when its file lands. Age/sensory differences flow ONLY through resolved capability flags
(`multiStepVisible` / `maxChoices`) + `useCopy()` — no component reads raw `ageMode`; `VolumeSlider` +
`SoundscapePicker` are grep-clean. Additive-only: OPTIONAL `ChildSettings.soundscape?`
(`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`); the M-A4 migration-forward fixture + `validateAndRepair`
clamps are extended for it. No new dependency (reuses `expo-audio`, `react-native-gesture-handler` +
`react-native-reanimated` for the slider, the `<PremiumGate>` + parent `ui.tsx` kit). No new bundled
binary — `waves` reuses `calm-ambient.wav` (THIRD_PARTY_NOTICES §6 note added).

| File | Origin | Notes |
| --- | --- | --- |
| `src/services/soundscape.ts` | `original` | NEW. The scene-switchable, volume-controllable LOOPING-bed player (owns the shared audio-bed layer). `playSoundscape`/`stopSoundscape`/`setSoundscapeVolume`/`getSoundscapeState`/`teardownSoundscape`. Reuses `sound.ts`'s `isSoundEnabled`/`isCategoryEnabled` (no-op when master/ambient off) + its `duckOthers` session; NEVER configures the session itself; every native call guarded (web/soundless-safe). `SOUNDSCAPE_ASSET` literal require-map (`waves`→`calm-ambient.wav`). |
| `src/domain/soundscapes.ts` | `original` | NEW. Pure RN-free resolver + lookups: `resolveSoundscapeSettings` (spread defaults + clamp volume + coerce stale scene id), `findSoundscape`, `clampVolume`, `isSceneAvailable` (ownership-honoured, acquisition-only), `pickableScenes` (curated, sliced by `maxChoices`, selected-first). |
| `src/data/soundscapes.ts` | `original` | NEW. Curated catalog `SOUNDSCAPES` (free `waves` 🌊 present; premium target set documented, added only when assets land) + `SOUNDSCAPE_ASSET_KEYS` (binds the service require-map, test-checked) + `SOUNDSCAPE_IDS`/`isSoundscapeId` (validateAndRepair). Fixed hand-authored list — no ranking/personalisation/generation. |
| `components/ui/VolumeSlider.tsx` | `original` | NEW (M-C1 is the single owner; a11y consumes the `accessibilityRole="adjustable"` pattern). Gesture-handler `Pan` + reanimated thumb + explicit −/+ affordances + increment/decrement a11y actions (±0.1); `size` prop resolved by the caller — reads NO raw age/sensory mode. No new dep. |
| `components/kid/SoundscapePicker.tsx` | `original` | NEW. Composes on/off + curated scene tiles/chips (`pickableScenes` × `maxChoices`) + `<VolumeSlider>`; persists via `childStore.updateSettings`; drives the bed; premium tiles route through the parent gate to the paywall. Resolved flags + `useCopy()` only (no raw `ageMode`). Stops the bed on unmount. |
| `src/domain/types.ts` | `original` | (modified) NEW `SoundscapeId`/`SoundscapeKind`/`Soundscape`/`SoundscapeSettings`; OPTIONAL `ChildSettings.soundscape?` (additive → no bump). |
| `src/domain/constants.ts` | `original` | (modified) NEW `DEFAULT_SOUNDSCAPE_SETTINGS` (volume 0.55, `waves`, no focus scene, `focusDuringTasks:false`); `defaultChildSettings` seeds it (harmless for new children; existing get it via the resolver/merge). |
| `src/storage/migrations.ts` | `original` | (modified) NEW `repairSoundscapeSettings` (clamp volume `[0,1]`/NaN→0.55, coerce a stale/non-existent scene id → `waves`/`null` — a premium-LOCKED scene is NOT invalid, coerce `focusDuringTasks`→boolean), wired into `repairChildSlices` over `profile.settings.soundscape`. Coherence-only, never punitive. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `soundscape.calmTitle`/`play`/`stop`/`focusToggle`/`pick`/`volume`/`premium` (both age variants; anti-shame + no-medical grep-clean; scene NAMES live in the catalog `spokenLabel`). |
| `app/(kid)/calm.tsx` | `original` | (modified) the single ambient toggle → `<SoundscapePicker context="calm">` (scenes + volume + on/off); breathing visual + drifting bubbles unchanged; stop-on-blur/unmount now calls `stopSoundscape`. |
| `components/task/TaskRunner.tsx` | `original` | (modified) optional focus-bed lifecycle (plays only when `focusDuringTasks` + a `focusSceneId` + master sound on + screen focused + not `allDone`; stops on done/blur/background) + an OLDER-only header toggle chip (gated by `caps.multiStepVisible`). No change to completion/token/celebration logic. |
| `app/_layout.tsx` | `original` | (modified) mirrors the active child's bed volume (`setSoundscapeVolume`) + silences the bed on master-mute in the per-child effect; `stopSoundscape()` added to the AppState background listener (explicit app-level no-background stop). |
| `app/(parent)/settings.tsx` | `original` | (modified) NEW "Soundscapes" card (active child): focus-during-routines toggle, calm + focus scene chips (premium preview → paywall), a `<VolumeSlider>`, a non-premium `<PremiumGate feature="calmSoundscape">` "Unlock more soundscapes" upsell, mix-not-hijack hint. |
| `app/(parent)/paywall.tsx` | `original` | (modified) soundscape benefit line refined to reflect the multi-scene calm & focus pack (copy only). |
| `THIRD_PARTY_NOTICES.md` | `original` | (modified) §6 note: `waves` reuses `calm-ambient.wav` (no new binary); each future premium loop must get a row + a `require()` before its catalog entry. |
| `__tests__/domain/soundscapes.test.ts` | `original` | NEW. Catalog validity (≥1 free scene w/ spokenLabel, every `assetKey` in `SOUNDSCAPE_ASSET_KEYS`, unique ids), `resolveSoundscapeSettings` (defaults a missing blob, clamps volume/NaN, coerces stale ids + `focusDuringTasks`), `isSceneAvailable` (ownership-honoured after downgrade), `pickableScenes` (≤ maxChoices, `waves` in both contexts, selected-first). |
| `__tests__/services/soundscape.test.ts` | `original` | NEW (mocks `expo-audio`). Require-map ↔ catalog sync; NEVER configures the session; plays a LOOPING bed (create + loop + seekTo(0)+play); applies + clamps volume; stop pauses; same-scene reuse; NO-OP (no throw, no player) when master/ambient off or scene unknown. |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with `settings.soundscape` (valid → survives untouched; corrupt → clamped/coerced up), per the M-A4 extension contract. |

## M-C2 — Breathing / regulation mini-game (feature-complete, Wave C)

Reviewer: feature-complete build-agent (M-C2). Additive delta on the shipped, green app that upgrades
the **calm corner** (`app/(kid)/calm.tsx`) in place into a **self-paced calm breathing / regulation
activity** and consumes the M-C1 soundscape bed (unchanged, via the existing `<SoundscapePicker>`).
**NO hardware, NO body reading, NO efficacy/health claim, ZERO AI** — the "stay-calm-to-grow" garden
advances one stage **per completed cycle** (elapsed time on the activity only, via the pure
`breathPhaseAt`/`growStage` helpers), never from any signal about the child; the pattern is chosen by
the parent / older child from a **fixed, hand-authored curated list** (never free-form, never
proposed/adapted by the app; no `Math.random`). **ANTI-SHAME by construction:** the grow visual is
**within-session only** (it resets each visit, so nothing can ever be lost — no persistent score),
completing a set fires **NO token, NO confetti, NO `CelebrationOverlay`** (only a positive `rest` buddy
mood), and the in-loop offers are **invitations, never gates**. **Age/sensory via resolvers only:** a
curated **3-pattern chooser** shows only when the NEW `caps.breathingChoice` flag is true (young `false`
→ one calm default + no chooser; older/preteen `true`); the older-only cycle readout keys on
`showNumbersAndCharts`; motion keys on `t.motion.loopsEnabled` (halo/drift) + `t.animationDurationScale`
(Reduce-Motion → **static mid-pose + 1 Hz stepped label**, no continuous worklet) — no component reads
raw `ageMode`/`sensoryMode`/`reducedMotion` and no `ageMode` prop is passed (grep-clean). **Audio never
hijacks** (reuses the M-C1 `duckOthers` bed; stops on blur/unmount). **Baseline visual-first:** no
completion chime / no premium "pattern pack" ships (files #16–#17 skipped); the only paid hook stays the
existing `calmSoundscape` extra-bed flag (the breathing activity + all 3 patterns + one bed are FREE and
**never** wrapped in `<PremiumGate>`). **Opt-in pacing haptic** (soft Light impact per phase, default
OFF, gated by `hapticsEnabled`, off in lowStim/Reduce-Motion/quiet-hours; never a Warning/Error) +
**opt-in on-device session log** (`breathing_session` `ActivityEvent`, emitted ONLY when
`localAnalyticsEnabled`, never leaves device). Additive-only: OPTIONAL
`ChildSettings.{breathingPatternId,breathingPacingHaptics}?` + NEW `ModeCapabilities.breathingChoice`
(`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`); the M-A4 migration-forward fixture +
`validateAndRepair` are extended (unknown pattern id / non-boolean flag coerce to `undefined`). No new
dependency, no new bundled asset.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/breathing.ts` | `original` | NEW. Pure RN-free curated pattern table (`bubble`/`box`/`calm46`) + deterministic phase math: `breathPhaseAt` (phase/scale/cycleIndex, powers BOTH animation + Reduce-Motion label), `growStage` (clamped to `cyclesTarget`), `cycleMs`, `getBreathPattern`, `defaultBreathPatternId`, `breathPatternsFor`. Guards zero/negative/NaN durations; no RNG. |
| `components/kid/BreathingBubble.tsx` | `original` | NEW. Reusable breathe-with-the-bubble visual. Scale = one non-looping `withSequence` on repeat (standard/lowStim) OR static mid-pose (Reduce-Motion); a single wall-clock 1 Hz/200ms tick drives the resolved phase label + `onCycle`/`onComplete` + opt-in Light pacing haptic + TTS-on-phase. Takes resolved booleans + resolved `phaseLabels` — no raw `ageMode`/prop. No red/danger token. |
| `components/kid/CalmGarden.tsx` | `original` | NEW. Purely-presentational "stay-calm-to-grow" accretion: one soft `c.grow` bubble drifts in per completed cycle up to `target`, faint placeholders otherwise; resolved motion booleans only, no `ageMode`, no bar/meter/leaderboard, no red/danger. |
| `app/(kid)/calm.tsx` | `original` | (modified) inline hard-coded circle → `<BreathingBubble pattern={activePattern}>` (resolved from `breathingPatternId` ?? age default); curated chooser when `caps.breathingChoice`; `<CalmGarden>` + warm caption + older-only cycle readout; grow resets on focus/pattern-change; a completed set calls `buddyStore.applyEvent('rest')` + emits the opt-in `breathing_session` event; existing `<SoundscapePicker>` + mood chip kept. |
| `components/task/TaskRunner.tsx` | `original` | (modified) non-blocking "Take a breath 🫧" header chip (both shells) + a regulation-step "Breathe with me" secondary action beside Done (detected via `getTaskTemplate(currentStep.templateId)?.category === 'regulation'`), both `router.push('/(kid)/calm')`. NO change to `onDone`/`onSkip`/token/celebration — purely additive, never gates completion. |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) NEW young-reachable "Calm 🌊" entry affordance beside the "See what's later" peek → `router.push('/(kid)/calm')` (the young shell has no tab bar). Resolved tokens only. |
| `src/theme/resolveCapabilities.ts` | `original` | (modified) NEW `breathingChoice` capability on `ModeCapabilities`/`AgeCapBase`/`AGE_CAP_BASE` (young `false`, older/preteen `true`) + resolver return. HARD-CEILING age gate (not parent-overridable) — decides whether the curated pattern chooser shows. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `breathe.title`/`in`/`hold`/`out`/`rest`/`grow`/`offer`/`withMe` (both age variants; no efficacy/measurement/health/anti-shame words; grep-clean). |
| `src/domain/types.ts` | `original` | (modified) OPTIONAL `ChildSettings.{breathingPatternId,breathingPacingHaptics}?` (additive → no bump). |
| `src/domain/constants.ts` | `original` | (modified) `defaultChildSettings` sets `breathingPacingHaptics:false` (opt-in OFF); `breathingPatternId` left ABSENT so the age-resolved default applies. |
| `src/storage/migrations.ts` | `original` | (modified) `repairChildSlices` coerces an unknown/removed `breathingPatternId` → `undefined` (falls back to the age default) and a non-boolean `breathingPacingHaptics` → `undefined`. Coherence-only, never punitive. |
| `app/(parent)/settings.tsx` | `original` | (modified) NEW per-child rows under "Sound & motion" (active child): a "Default breathing pattern" `Segmented` (age-appropriate `breathPatternsFor`) + a "Breath pacing vibration" `Toggle` (default OFF). Copy claims no health effect. |
| `__tests__/domain/breathing.test.ts` | `original` | NEW. `cycleMs`; `breathPhaseAt` phase boundaries + `scale` monotonicity (inhale ↑, exhale ↓, holds flat); `growStage` clamping at `cyclesTarget`; deterministic recompute across a background gap; guards for zero/negative/NaN durations + unknown ids; `defaultBreathPatternId`/`breathPatternsFor`. |
| `__tests__/components/breathingBubble.test.tsx` | `original` | NEW (render harness + fake timers). Renders a resolved phase label (both age variants); `onCycle` fires per completed cycle + `onComplete` exactly once at the target (fixed elapsed sequence) + not before; Reduce-Motion static path renders without a thrown worklet; kid palette carries no red/danger token. |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with `settings.{breathingPatternId,breathingPacingHaptics}` (valid → survives untouched; unknown id + non-boolean flag → coerced to `undefined`), per the M-A4 extension contract. |

## M-C3 — Adjustable focus intervals + active breaks (feature-complete, Wave C)

Reviewer: feature-complete build-agent (M-C3). Additive delta on the shipped, green app that adds an
**OPTIONAL, NON-rigid, older-only Pomodoro-style focus/break scaffold** — offered, never forced.
**SCIENCE-HONEST framing (in copy + comments):** time-boxing evidence is thin/mixed and NOT
ADHD-specific, and a rigid 25/5 increases fatigue — so this ships as an **organizational tool, never a
medical claim**, with **user-adjustable** focus AND break lengths biased toward **shorter blocks +
active movement**; default **15/5**, never a forced 25/5. **Double opt-in:** the entry point renders
ONLY when the NEW hard-ceiling `caps.focusIntervalsAvailable` (young `false` / older+preteen `true`,
non-overridable) AND the parent toggle `settings.focusIntervals.enabled` (default OFF) are both true.
**ZERO AI / NO RNG:** durations come from curated option arrays; movement prompts are a fixed curated
array chosen by a **deterministic rotating index** (`nextMovementPrompt`, no `Math.random`).
**ANTI-SHAME by construction:** a block ending never auto-completes anything, never locks/flashes/reddens,
never nags, and **changes NO tokens** (token-neutral — can't become a focus-for-rewards grind); Pause +
Stop are always one tap and neutral; the `done` close shows a warm line and **suppresses** the neutral
"Focus blocks today: N" count entirely at N=0 (no shaming zero) and only shows it for older
(`showNumbersAndCharts`) at N≥1 — no streak/score/target anywhere. **Wall-clock correct / offline:**
remaining is always recomputed from `phaseStartedAt` against a passed-in `now` (drift-free across a
background gap); the LIVE ring **reuses `components/task/VisualTimer.tsx`** (M-B1 — smooth `withTiming`
vs **discrete 1 Hz stepping under Reduce-Motion**, single-fire `onEmpty`, never red/danger), and
`formatMSS` is **soft-reused** from `src/domain/timer.ts`. **Audio never hijacks:** at most ONE ducking
`transition.swoosh` cue fires per focus-block completion, gated by `settings.focusIntervals.chime` (+ the
existing master/category/quiet-hours gates); no looping tick, no per-second beep, no alarm; a single
positive-only Success haptic (gated by `hapticsEnabled`; never a Warning/Error). **Age/sensory via
resolvers only** — no component reads raw `ageMode`/`sensoryMode`/`reducedMotion` and no `ageMode` prop
is passed (grep-clean; the destructured `ageMode` only feeds `resolveContent`). The live `FocusSession`
is held in a NEW **in-memory** `focusSessionStore` (no `persist`, no persisted surface — a force-quit
just drops it, anti-shame-fine). **FREE** — never added to `FEATURE_GATES`, never wrapped in
`<PremiumGate>`. Additive-only: OPTIONAL `ChildSettings.focusIntervals?` + NEW
`ModeCapabilities.focusIntervalsAvailable` (`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`); the M-A4
migration-forward fixture + `validateAndRepair` are extended (off-list minutes snap to the nearest
curated option; non-boolean flags coerce to defaults). No new dependency, no new bundled asset.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/focus.ts` | `original` | NEW. Pure RN-free curated constants (`FOCUS_MINUTE_OPTIONS [10,15,20,25]`, `BREAK_MINUTE_OPTIONS [3,5,10]`, `DEFAULT_FOCUS_INTERVALS` 15/5) + wall-clock helpers (`focusRemainingMs`/`focusFraction`, clamp-to-0, guard zero/negative/NaN), `focusConfigOf` (settings → config, merged over defaults), `nextMovementPrompt` (deterministic rotation, safe modulo, no RNG), `nearestMinuteOption` (defensive repair), and a re-export of `formatMSS` from `timer.ts` (soft reuse). |
| `src/data/focusBreaks.ts` | `original` | NEW. The FIXED curated `MOVEMENT_PROMPTS` (8 home-safe, equipment-free prompts; each with a REQUIRED `spokenLabel` + emoji). No RNG, no adaptive selection, no AI. |
| `src/state/focusSessionStore.ts` | `original` | NEW. In-memory (NO `persist`) zustand store holding the single live `FocusSession`: `start`/`toBreak`(blocksCompleted++, deterministic prompt rotation)/`toFocus`/`finish`/`pause`(freeze remaining)/`resume`(re-anchor `phaseStartedAt`, no time lost)/`stop`. Never calls `Date.now()` — callers pass `now` (deterministic/testable). |
| `app/(kid)/focus.tsx` | `original` | NEW. Thin pushed-modal host: resolves active child + `focusConfigOf(settings)`, HARD-GATES on `caps.focusIntervalsAvailable && config.enabled` (else `<Redirect href="/(kid)" />`), renders the header (title + close ✕) + `<FocusSession>`. Close/back drops the in-memory session. Reads the capability flag, never a raw `ageMode`. |
| `components/focus/FocusSession.tsx` | `original` | NEW. The setup → focus → break → (focus…) → done state machine (driven by `focusSessionStore`). Setup = curated chip pickers (pre-filled from parent config) + movement On/Off + "Start focusing"; focus = reused `<VisualTimer>` (live) or `<FocusRing>` (paused) + Pause/Resume + Stop; break = `<MovementBreakCard>`; done = buddy `proud`/`happy` + warm line + N≥1-gated neutral count. Fires the chime + Success haptic ONCE on focus-block completion. Resolvers only — no raw `ageMode`; drops the session on unmount. |
| `components/focus/FocusRing.tsx` | `original` | NEW. Static presentational depleting ring (Svg `Circle` + `strokeDashoffset`, `strokeLinecap="round"`) for the PAUSED state — takes `fraction`/`remainingMs`/`showNumbers`/`label`; single calm hue (no red/danger, no animation, no clock). `progressbar` a11y; `m:ss` readout only when `showNumbers`. Resolved tokens only. |
| `components/focus/MovementBreakCard.tsx` | `original` | NEW. The active-movement (or plain-rest when movement off) break card: emoji + big spoken-label prompt + a shorter reused `<VisualTimer>` break ring; "I moved!"/"Skip break" advance immediately, and when the ring empties a calm "Back to focus" + "I'm done" appear (no auto-advance, no alarm). Resolved tokens + `showNumbers` only. |
| `src/domain/types.ts` | `original` | (modified) NEW `FocusIntervalConfig`, `FocusPhase`, `MovementPrompt`, `FocusSession` types + OPTIONAL `ChildSettings.focusIntervals?` (additive → no bump). |
| `src/theme/resolveCapabilities.ts` | `original` | (modified) NEW `focusIntervalsAvailable` on `ModeCapabilities`/`AgeCapBase`/`AGE_CAP_BASE` (young `false`, older/preteen `true`) + resolver return read straight from `base`. HARD-CEILING age gate (NOT in the input-override set) — a 4–7 child can never be granted it. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` `focus.*` copy keys (title/setupHint/lengths/start/focusing/pause/resume/paused/stop/break+rest titles+hints/moved/skip/backToFocus/imDone/done/blocks/launch/close/a11y; both age variants; no urgency/shame/efficacy/medical words; grep-clean). |
| `src/domain/constants.ts` | `original` | (modified) `defaultChildSettings` sets `focusIntervals: { ...DEFAULT_FOCUS_INTERVALS }` (`enabled:false`; availability gated by the capability). |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) NEW low-emphasis "🎯 Focus timer" launcher beside the peek/calm chips → `router.push('/(kid)/focus')`, shown ONLY when `caps.focusIntervalsAvailable && settings.focusIntervals.enabled`. Never a primary CTA, never auto-opens. Capability flag, no raw `ageMode`. |
| `app/(kid)/_layout.tsx` | `original` | (modified) registered the `focus` route in both shells (`YoungStack` modal for router completeness — unreachable there; `OlderTabs` `href:null` — reachable via push, never a tab) + added `focus` to the `GrownUpsDoor` hidden-over segments so the door never overlaps the focus controls. |
| `app/(parent)/children.tsx` | `original` | (modified) NEW "Focus timer" `Card` shown ONLY when `resolveCapabilities({ageMode}).focusIntervalsAvailable` (older, via the resolver — not a raw `=== "older"`): enable `Toggle` + focus/break `Segmented`s + movement-breaks + chime `Toggle`s, all writing through `updateSettings(..., { focusIntervals: { ...focusConfigOf(settings), <field>: v } })`, with an honest "not a treatment / never ADHD-proven, earns no bubbles" note. |
| `src/domain/index.ts` · `src/data/index.ts` · `src/state/index.ts` | `original` | (modified) barrels export `./focus`, `./focusBreaks`, `./focusSessionStore`. |
| `src/storage/migrations.ts` | `original` | (modified) `repairChildSlices` coerces a present `settings.focusIntervals` via NEW `repairFocusIntervals` (off-list `focusMinutes`/`breakMinutes` → nearest curated option; non-boolean `enabled`/`movementBreaks`/`chime` → defaults). Coherence-only, never punitive; absent ⇒ untouched. |
| `__tests__/domain/focus.test.ts` | `original` | NEW. Constants/defaults (15/5, curated lists); `focusConfigOf` fallback+merge; `focusRemainingMs`/`focusFraction` wall-clock recompute across a background gap, clamp-to-0, guards; `nextMovementPrompt` deterministic rotation/wrap/empty + reproducible order; `nearestMinuteOption`; `formatMSS` reuse. |
| `__tests__/state/focusSession.test.ts` | `original` | NEW. Store transitions: start→focus; focus→break (blocksCompleted++, prompt rotates to distinct curated prompts); break→focus; pause freezes remaining + resume re-anchors so remaining is unchanged (no time lost); first-block stop → done with `blocksCompleted:0`; stop clears. |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with `settings.focusIntervals` (valid → survives untouched; off-list minutes + non-boolean flags → coerced to curated options/defaults), per the M-A4 extension contract. |

## M-C4 — Novelty & reward-refresh pipeline (feature-complete, Wave C)

Reviewer: feature-complete build-agent (M-C4). Additive delta on the shipped, green app that ships the
**novelty & reward-refresh pipeline** to beat the #1 research risk (the 4–8 week novelty cliff): (a) a
DETERMINISTIC weekly **quest board** (rotating bonus goals), (b) year-round **seasonal cosmetic packs**
that only ever APPEAR (never expire), (c) a daily **spotlight-daypart** magnitude bonus, and (d) a parent
**content-cadence** readout. **ZERO AI / NO RNG:** the active weekly set is a stable window into a static
pool chosen by an in-repo **FNV-1a hash of the ISO-week key** (`activeQuestsFor`), and the spotlight is a
pure **day-of-year** function (`featuredDaypartFor`) — no recommender/model/LLM, and **no `Math.random` in
any rotation or payout path** (the reward is a FIXED `rewardTokens`, granted once). Variety is MAGNITUDE +
CONTENT (which quests, how big, which daypart is featured today), **never a variable *schedule*** — the
base token + a salience-appropriate celebration still fire on every completion, forever (anti-slot-machine
invariant preserved). **ADDITIVE-ONLY / NO FOMO:** `SeasonalPack` still has NO `availableUntil` (content
only appears); quests **auto-grant on target** (no missable "Claim"); an unfinished quest rotates out with
ZERO penalty while `everCompleted` + owned cosmetics are kept **forever**; no copy contains a
countdown/expiry/urgency/"buddy-misses-you" string (grep-clean; anti-shame gate green over `en.ts` copy
values). **CALM PATH WINS:** `calmMode` OR the NEW per-child `questsEnabled:false` suppresses the ENTIRE
layer — board, spotlight bonus, and "new!" badges (`emitQuestSignal`/`rotateQuests` short-circuit; the
board renders `null`). **AGE-ADAPTIVE via flags only:** the quest count derives from the existing
`caps.multiStepVisible` (young **1** auto-spoken card, no numerals; older **≤3** with numerals via
`showNumbersAndCharts`); `components/quests/**` contains **no raw `ageMode`** and **no `ageMode` prop**
(copy resolves through `useCopy`, TTS pitch through `SpokenLabel`). **PREMIUM = acquisition-only:** the base
weekly rotation + spotlight are **FREE**; seasonal packs + the premium quest pool gate on the existing
`noveltyPipeline` flag, and a downgrade removes NOTHING owned and never clears `everCompleted` (tested).
**Offline / deterministic:** all rotation/magnitude math is pure (`now`/`tz`/`weekKey` passed in), reuses
`date-fns`/`date-fns-tz` (`isoWeekKey` `RRRR-'W'II`, `dayOfYear`) — no native clock, no network, no new
dependency, no new bundled asset. Additive-only: NEW persisted slice `tb/quests`, `TokenReason +=
"quest_reward"`, OPTIONAL `ChildSettings.questsEnabled?` (`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays
`[]`); the M-A4 migration-forward fixture + schema-round-trip audit + backup `DataReview` are all extended.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/quests.ts` | `original` | NEW. Pure rotating-quest logic: `QuestSignal`/`QuestClaim` types, `hashKey` (in-repo FNV-1a), `activeQuestsFor` (deterministic ISO-week hash window into the pool — identical per weekKey, no RNG), `signalMatches` (kind + optional daypart filter), `advance` (monotonic counter, caps at target, no-op past claim), `isComplete`, `freshQuestProgress`, `QUEST_BOARD_SIZE`. No `Math.random`, no `Date.now` inside. |
| `src/domain/novelty.ts` | `original` | NEW. Pure cadence + magnitude: `featuredDaypartFor` (day-of-year → morning/afternoon/evening, stable all day, never night), `isFeaturedDaypart` (collapses night→evening), `FEATURED_DAYPART_BONUS` (+2, a FIXED magnitude), `featuredPackFor` (most-recently-appeared pack ≤ now), `isSeasonalNew`/`SEASONAL_NEW_WINDOW_MS` (recent-appearance window, never a countdown). No RNG. |
| `src/domain/dates.ts` | `original` | (modified) NEW tz-aware `isoWeekKey(ts,tz)` (`RRRR-'W'II`, DST-safe, the weekly rotation clock) + `dayOfYear(ts,tz)` (localized calendar day, the spotlight clock) — colocated with the other pure `formatInTimeZone` helpers. |
| `src/data/questPool.ts` | `original` | NEW. Static quest library: `BASE_QUEST_POOL` (free; `simple` = young-card kinds popBubbles/customizeBuddy) + `PREMIUM_QUEST_POOL` (each awards a registered seasonal cosmetic), `getQuestById`, `getQuestPool({premium,simpleOnly})` (premium quests only when `noveltyPipeline` unlocked). Side-effect `import "./seasonalPacks"` so packs register wherever the quest system loads. No RNG, curated only. |
| `src/data/seasonalPacks.ts` | `original` | NEW. Four year-round packs (spring/summer/autumn/winter) with `availableFrom` across the calendar and STRUCTURALLY no expiry; premium-acquisition cosmetics; registered ONCE at module load via the existing `registerSeasonalPack` seam. Dates are tunable placeholder data; additive-only is fixed. |
| `src/state/questStore.ts` | `original` | NEW persisted `tb/quests` slice (per child): `quests: Record<cid, ChildQuestState>` + `ensureRotation` (idempotent within a week, fresh board, PRESERVES `everCompleted`), `onSignal` (advance matches, auto-claim ONCE at target → append `everCompleted`, return `QuestClaim[]`; grant-once idempotent), `clearChild`. Single-purpose: never touches tokens/cosmetics; never calls `Math.random`. Same persist wiring as `runProgressStore`/`choreStore`. |
| `src/domain/types.ts` | `original` | (modified) NEW `QuestGoalKind`/`QuestDef`/`QuestProgress`/`ChildQuestState`; widened `TokenReason += "quest_reward"`; OPTIONAL `ChildSettings.questsEnabled?` (absent ⇒ `!calmMode`). All additive → no bump. |
| `src/domain/constants.ts` | `original` | (modified) `defaultChildSettings` seeds `questsEnabled: true` (mirrors `!calmMode`). |
| `src/domain/index.ts` · `src/data/index.ts` · `src/state/index.ts` | `original` | (modified) barrels export `./quests`+`./novelty`, `./questPool`+`./seasonalPacks` (side-effect registration), `./questStore`. |
| `src/state/childStore.ts` | `original` | (modified) `giftTokens` gains an OPTIONAL 4th `reason` arg (default `"parent_gift"`, existing callers unchanged) so quest/spotlight rewards ledger as `"quest_reward"`. |
| `src/state/gameplay.ts` | `original` | (modified) NEW `questsSuppressed`, `grantQuestClaims`, `rotateQuests`, `emitQuestSignal`. `completeStep` emits `popBubbles` (per step) + `completeDaypart` (on routine-complete) signals and applies the DETERMINISTIC spotlight bonus (returns `spotlight`); `unlockCosmeticWithTokens` emits `unlockCosmetic`; `reconcileChild` rotates the weekly board; `removeChild` → `clearChild`; `wipeAllChildData` empties `tb/quests`. |
| `components/quests/QuestBoard.tsx` | `original` | NEW. Kid quest surface (rewards route): resolves the deterministic active set (`activeQuestsFor`) for the current week, shows young **1** / older **≤3** cards (from `caps.multiStepVisible`), ensures rotation on mount, and self-suppresses on calm/off. NO `ageMode` (uses `useCopy` + capability flags). |
| `components/quests/QuestCard.tsx` | `original` | NEW. One quest: emoji + `SpokenLabel` (auto-speaks for young) + bubble-fill progress (reuses `BubbleMeter`) + calm forward caption / done ✓. No countdown; PROPS carry the age differences (`showNumbers`/`autoSpeak`) — no `ageMode`. |
| `components/quests/NoveltyBadge.tsx` | `original` | NEW. Calm "new!" star for newly-appeared seasonal content (corner-compact or labelled pill). No countdown; resolves copy via `useCopy` — no `ageMode`. |
| `app/(kid)/rewards.tsx` | `original` | (modified) renders `<QuestBoard childId=… />` above "My Collection" (self-suppressing). |
| `components/rewards/CollectiblesGrid.tsx` | `original` | (modified) shows a `<NoveltyBadge>` corner star on tiles where `isSeasonalNew(cos.seasonalPackId, now, packs)` — additive, no price shown to the child (paywall rule unchanged). |
| `components/buddy/BuddyRoom.tsx` | `original` | (modified) color/finish/accessory changes emit a `customizeBuddy` quest signal (self-suppressed on calm). |
| `app/(kid)/calm.tsx` | `original` | (modified) a calm-corner visit emits a silent `tryCalm` quest signal (suppressed for calm-mode children — the calm contract, no tokens/celebration here, holds). |
| `components/task/TaskRunner.tsx` | `original` | (modified) folds `res.spotlight` into the routine-complete celebration step-up (`bonus \|\| spotlight`) — magnitude variety, never a chance drop. |
| `app/(parent)/dashboard.tsx` | `original` | (modified) NEW read-only `NoveltyCadence` card ("New this month: <pack>") from `featuredPackFor(now, getSeasonalPacks())` — honest anticipation, no urgency. |
| `app/(parent)/settings.tsx` | `original` | (modified) NEW per-child "Show quests" toggle (writes `questsEnabled`; default `!calmMode`) on the Calm-path card; `DataReview` counts `tb/quests` ("questBoards") + inlines it in the full record. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `quest.tabTitle/new/done/moreToGo`, `featured.today`, `novelty.new` (both age variants; warm/forward; no urgency/expiry/FOMO; anti-shame grep-clean). |
| `__tests__/domain/quests.test.ts` | `original` | NEW. `hashKey` determinism; `activeQuestsFor` identical-per-weekKey + rotation + caps + distinct ids; `signalMatches` kind/daypart; `advance`/`isComplete` monotonic-cap + no-op-past-claim + ignore ≤0 deltas; `getQuestPool` premium/simple filtering; every def has a spokenLabel + fixed reward. |
| `__tests__/domain/novelty.test.ts` | `original` | NEW. `featuredDaypartFor` pure-per-day-of-year + stable-all-day + identical-across-calls + never-night; `FEATURED_DAYPART_BONUS` fixed; `isFeaturedDaypart` night→evening; `isoWeekKey` format+stability; `featuredPackFor` most-recent/undefined; `isSeasonalNew` window edges + future/undated excluded. |
| `__tests__/state/quests.test.ts` | `original` | NEW. Store: rotation idempotency, new-week rotate + preserve `everCompleted`, auto-claim once (no double grant), kind/daypart matching, `clearChild`. Gameplay: `reconcileChild` rotates the current week; `emitQuestSignal` grants `"quest_reward"` + a premium quest grants its owned-forever seasonal cosmetic; the SPOTLIGHT daypart pays exactly `FEATURED_DAYPART_BONUS` (non-spotlight pays none); calm/off suppresses the whole layer; `removeChild`/`wipeAllChildData` clear `tb/quests`; downgrade never removes owned or clears `everCompleted`. |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) golden fixture extended with `settings.questsEnabled` (survives untouched), per the M-A4 extension contract. |
| `__tests__/storage/schema-roundtrip.test.ts` | `original` | (modified) `STORES` extended with the `quests` slice (`tb/quests`) — default JSON-safe + `mergeWithDefaults`-stable. |

## M-C5 — If-then "when X, I will Y" plans (feature-complete, Wave C)

Reviewer: feature-complete build-agent (M-C5). Additive delta that ships **implementation-intention plans**:
a kid + caregiver co-author (behind the PIN gate) a CURATED cue→action plan and the app fires the
**point-of-performance cue** through the only mechanisms it can honestly support offline — a `time` cue → a
gentle notification (reusing the shipped reminder pipeline), an `afterStep` cue → an in-app card the moment
the linked step completes in the runner, an `afterRoutine` cue → the daypart-done panel, and a
`situational` cue that is **self-checked ONLY** (the app plainly states it cannot sense it — anti-overclaim).
**ZERO AI:** plans are assembled from curated cue/action templates + the family's own routines/steps — no
NL parsing, no suggestion engine, no situational auto-detection, no `Math.random` (grep-clean in
`src/domain/plans.ts`/`src/state/planStore.ts`/`src/data/planTemplates.ts`). **HONEST, LOW-COST FRAMING:**
copy frames a plan as "a little reminder you make for yourself," never a treatment/cure/guaranteed change
(no clinical claim in any surface). **ANTI-SHAME by construction:** a `Plan` carries NO adherence/miss/streak
field; there is no nag, no clawback; the ONLY "did you do it" is the POSITIVE-only situational
"I did it! 🫧" nod (fires a `stepDone` happy buddy mood + a soft `tap.soft` tick — **no tokens, no streak,
no negative counterpart**). **NOTIFICATION TONE GUARANTEED:** `time` cues map to a `ReminderAnchor` fed into
the EXISTING `rescheduleReminders`, so they inherit quiet-hours suppression, the shared per-day `maxPerDay`
budget (never a flood), the deferred permission prompt, and the fixed friendly copy + `BANNED_REMINDER_PATTERNS`
gate; `assertPlanCopyClean` additionally asserts the assembled phrase itself is clean before it can become a
notification (tested: every seed situation × action pairing is clean; a planted banned tone throws).
**AGE-ADAPTIVE via resolvers only:** the assembled sentence is age-framed ONLY through the `plans.thenYoung`
glue (`assemblePlanPhrase`) + layout via `caps.multiStepVisible`; the kid propose path reuses the resolved
`caps.canAddTasks` flag — `components/plans/**` + both plan screens contain **no raw `ageMode` branch and no
`ageMode` prop** (grep-clean; `ageMode` only ever feeds `assemblePlanPhrase`/`resolveContent`/`speak`, parent
surfaces use `ageModeLabel`). **PREMIUM = acquisition-only:** all firing for owned plans + the first **2**
plans are FREE; the 3rd→8th gate on the existing `ifThenPlans` count gate (`<PremiumGate>` calm upsell); a
downgrade removes/stops NOTHING already authored. Additive-only: NEW persisted slice `tb/plans`, NEW types
(`PlanCueType`/`PlanCue`/`PlanAction`/`Plan`/`PlanCueTemplate`/`PlanActionTemplate` — all on a new shape),
OPTIONAL `Plan.proposed?`/`authoredBy?` (`SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`); `wipeAllChildData`
+ `removeChild` clear the slice and `DataReview` counts it (roadmap invariant #8). No new dependency, no new
bundled asset.

| File | Origin | Notes |
| --- | --- | --- |
| `src/domain/types.ts` | `original` | (modified) NEW `PlanCueType` union + `PlanCue`/`PlanAction`/`Plan`/`PlanCueTemplate`/`PlanActionTemplate` interfaces (additive; `Plan` has NO failure/miss/streak field). Reuses `Daypart`/`VisualLabel`/`EpochMs`. No bump. |
| `src/domain/plans.ts` | `original` | NEW. PURE (no React/store): `assemblePlanPhrase(plan,ageMode)` (cue + `plans.thenYoung` glue + action → `{cue,action,spoken}`; the ONLY age-adaptive part is the glue); `planToReminderAnchor(plan,ageMode?)` (active `time` plan → `plan:<id>` anchor, else null); selectors `activePlans`/`plansForStep`/`plansForRoutine`/`plansForDaypart`/`situationalPlans`; `assertPlanCopyClean` (dev guard through the reminder banned-tone gate). Deterministic — ZERO RNG. |
| `src/data/planTemplates.ts` | `original` | NEW. Curated content: `SITUATION_TEMPLATES` (home/wiggly/timer/stuck/loud) + `PLAN_ACTION_TEMPLATES` (breaths/homework/shoes/water/bag/tidy), all with required `spokenLabel`+emoji+color; pure builders `timeCue`/`stepCue`/`routineCue`/`situationCue`/`actionFromTemplate`/`actionFromTask` + `planFromTemplates`. `formatClock` is a local pure 12h helper (no RN import). No free-text, no RNG. |
| `src/state/planStore.ts` | `original` | NEW persisted `tb/plans` slice (per child): `plans: Record<cid, Plan[]>` + `addPlan`/`updatePlan`/`setPlanActive`/`archivePlan`, the propose→approve→dismiss queue (`dismissPlan` ARCHIVES, never "rejects"), and `clearChild`. Same persist wiring as `questStore`; `partialize` persists only `plans`. ZERO RNG. |
| `src/i18n/en.ts` | `original` | (modified) NEW `ModeKeyed` copy keys `plans.title/when/thenYoung/now/doItNow/didIt/hearIt/emptyKid/entry` (both age variants; `thenYoung` = "I'll"/"I will" glue; anti-shame + no-over-claim grep-clean). |
| `components/plans/PlanCard.tsx` | `original` | NEW. Read-only if-then card: young two stacked lines + arrow (auto-speaks) / older one sentence (speaks on tap) via `caps.multiStepVisible`; situational-only POSITIVE "I did it!" nod. No raw `ageMode`. |
| `components/plans/PlanCuePanel.tsx` | `original` | NEW. Point-of-performance cue surface (afterStep in the runner / afterRoutine on the done panel): calm, non-blocking, dismissible; optional "Do it now" when the action links a task; NOT a celebration (no confetti/token). Entrance gated on `t.motion.loopsEnabled` (instant under lowStim/Reduce-Motion). |
| `components/plans/PlanAuthor.tsx` | `original` | NEW. Parent authoring form: cue-type `Segmented` → curated cue picker (time/afterStep/afterRoutine/situation) → action (curated template OR linked task) → spoken preview + "🔊 Hear it". Situational shows the "can't sense this" Note. Save affordance supplied via `renderSave` (host wraps it in `<PremiumGate>`). Uses `useThemeInputs().ageMode` for the preview only. |
| `app/(parent)/plans.tsx` | `original` | NEW PIN-gated authoring + management screen: child picker, `PlanAuthor` (Save gated by `<PremiumGate feature="ifThenPlans">`), the plan list (active toggle + Remove), and the kid-proposal Approve/Dismiss queue (only when `caps.canAddTasks`). Parent surface uses `ageModeLabel`; rows read `useThemeInputs().ageMode` to feed `assemblePlanPhrase`. |
| `app/(kid)/plans.tsx` | `original` | NEW pushed-modal "My Plans" glance modeled on `peek.tsx` (✕ close): lists active plans as spoken cards; young auto-speaks on open; situational cards get the positive `stepDone` + `tap.soft` nod. Never starts a run, never gates. |
| `app/(kid)/_layout.tsx` | `original` | (modified) registers `plans` as a pushed **modal** route in `YoungStack` + `href:null` in `OlderTabs` (like `peek`), and adds `"plans"` to the `GrownUpsDoor` hide list. |
| `app/_layout.tsx` | `original` | (modified) `ThemedRoot` reads the active child's plans, maps active `time` plans via `planToReminderAnchor(plan, ageMode)`, and CONCATs them into the existing `rescheduleReminders` anchors (so plan cues inherit quiet-hours + budget + copy gate); `plans`/`ageMode` added to the effect deps. |
| `components/task/TaskRunner.tsx` | `original` | (modified) after `completeStep`, looks up `plansForStep(plans[cid], task.id)` and renders `PlanCuePanel` (young below the focal step / older above the checklist) — held locally, replaced on the next step, cleared on skip/dismiss; NON-blocking, never alters the token/celebration path. Optional "Do it now" moves a linked task to the front of the run (young). |
| `components/kid/DaypartDonePanel.tsx` | `original` | (modified) on `mode:"done"` surfaces `plansForDaypart(plans, daypart)` afterRoutine plans as a calm line under the headline, and adds the low-emphasis "My plans" chip (peer of the peek link) → `/(kid)/plans`, shown only when the child has ≥1 active plan. |
| `app/(parent)/dashboard.tsx` | `original` | (modified) NEW "Plans" management row in the mission-control card → `/(parent)/plans`. |
| `app/(parent)/settings.tsx` | `original` | (modified) `DataReview` counts `tb/plans` ("plans") + inlines the plans map in the full record (roadmap invariant #8(d)). |
| `src/state/gameplay.ts` | `original` | (modified) `wipeAllChildData` empties `tb/plans`; `removeChild` → `usePlanStore.clearChild(cid)` (per-child COPPA delete). |
| `src/domain/index.ts` · `src/data/index.ts` · `src/state/index.ts` | `original` | (modified) barrels export `./plans`, `./planTemplates`, `./planStore`. |
| `__tests__/domain/plans.test.ts` | `original` | NEW. `assemblePlanPhrase` both age variants (glue only; preteen→older); `planToReminderAnchor` time-only + active/valid/archived/proposed/invalid-time; the five selectors; `assertPlanCopyClean` accepts every seed situation × action pairing + rejects a planted banned tone. Mocks `expo-notifications` (pulled transitively via the banned-tone gate). |
| `__tests__/state/planStore.test.ts` | `original` | NEW. CRUD + active toggle + archive (soft-remove), propose→approve→live, dismiss→archive, `partialize` persists only `plans`, `clearChild`, and `removeChild`/`wipeAllChildData` clear the slice. |
| `__tests__/theme/resolveContent.test.ts` | `original` | (modified) new `plans.*` keys resolve BOTH age variants (`thenYoung` = "I'll"/"I will"). |
| `__tests__/services/notifications.test.ts` | `original` | (modified) a plan `time` anchor mixed with routine anchors is quiet-hours-suppressed, budget-capped (shares the routine per-day budget), and copy-clean; the assembled phrase rides in the reminder body. |

## M-D1 — Clinician reporting + local backup/restore (feature-complete, Wave D)

The offline replacement for a cloud "your data" portal (`clinician-reporting`): an on-device PROGRESS REPORT
(routine/step completion, bubbles/tokens, forgiving streak-SAFE framing, opt-in mood trend), a PRINTABLE /
SHAREABLE PDF summary (`expo-print` → OS share sheet), and LOCAL data BACKUP/RESTORE (export the whole `tb/`
keyspace to one JSON file, import it back through the existing invariant-repair pipeline). ZERO AI — the report
is 100% deterministic aggregation + a fixed HTML template (no LLM, no suggestions, no network). OFFLINE + NO
EGRESS — the report is generated on-device and the PDF/backup file go ONLY where the parent explicitly sends
them via the OS share sheet; nothing auto-uploads (the four new modules are lazy-required + web-degrading, so
`no-network.test.ts` stays green). ANTI-SHAME — the report never emits a deficit/loss word (banned-word gate in
`reportHtml.test.ts`), frames a resting streak via `streakDisplay`, leads with the monotonic cumulative count,
and gives a zero-completion child forward framing. PIN-GATED — export, restore-replace, and delete-all all pass
the parent PIN (new `mode:'sensitive'` on the gate), not merely the entry challenge. Additive-only: ONE optional
field (`ParentSettings.lastBackupAt?`); `SCHEMA_VERSION` stays 1, `MIGRATIONS` stays `[]`.

| File | Origin | Notes |
| --- | --- | --- |
| `package.json` | `original` | (modified) added four first-party Expo deps via `npx expo install` (SDK-56-pinned): `expo-print`, `expo-sharing`, `expo-file-system`, `expo-document-picker` (all MIT, © Expo). |
| `app.json` | `original` | (modified by `expo install`) `expo-sharing` config plugin auto-added to `plugins`. |
| `src/domain/types.ts` | `original` | (modified) NEW optional `ParentSettings.lastBackupAt?: EpochMs` (display-only; additive → no bump). |
| `src/domain/report.ts` | `original` | NEW. PURE, deterministic `buildReport` + `makeRange` + report/mood/daypart types. Reads only the durable signals passed in (ledger/runs/progress/redemptions/moods) — no clock, no RNG, no network. Streak-safe via `streakDisplay`; mood energy normalized by each log's `energyScaleMax` (never a stale 0–10); daypart breakdown gated by `showNumbersAndCharts`; cap-truncation footnote flag. |
| `src/services/reportHtml.ts` | `original` | NEW. PURE `renderReportHtml(model)` → a self-contained HTML string (inline `<style>`, system fonts, NO external URL, NO `<script>`, NO network/AI). Anti-shame copy + fixed non-diagnostic disclaimer baked in; child name HTML-escaped. |
| `src/services/report.ts` | `original` | NEW. The ONLY module importing `expo-print`/`expo-sharing` (lazy indirect `require`, web-degrading): `shareReportPdf` (HTML→local PDF via `printToFileAsync` → OS share sheet, falls back to the print dialog) + `printReport`. No-throw, no network. |
| `src/services/backup.ts` | `original` | NEW. LOCAL backup/restore: `collectTbSlices` (whole `tb/` keyspace via the storage port), `buildBackupFile`/`validateBackupFile`/`repairBackupSlices` (maps `repairLedger`/`repairProgress`/`repairCompanion`/`repairTask` across the REAL per-store envelopes), `exportBackup` (write cache file → share; stamps `lastBackupAt`), two-phase `prepareRestore`/`applyRestore` + convenience `importBackup(confirm)`. Restore reconciles in-memory `sessionStore`/`focusSessionStore`, `deletePhoto`s outgoing photos, and re-derives the trial reminder. Lazy-requires `expo-file-system/legacy`/`expo-sharing`/`expo-document-picker`; non-punishing (repairs UP, a bad/foreign/canceled file mutates nothing). |
| `app/(parent)/report.tsx` | `original` | NEW parent-gated report screen: range `Segmented<ReportRangeKey>` (7d/30d free; 90d a `✨ Plus` affordance when not premium), child selector (>1 child), honest non-diagnostic Note, summary cards (calm-path leads with cumulative + routines; older gets the daypart bars + mood energy), Share/Print + Save actions via `shareReportPdf`. Age-adaptation via `resolveCapabilities` + `ageModeLabel` — NO raw `ageMode`. |
| `app/(parent)/dashboard.tsx` | `original` | (modified) NEW "Progress report" row (`📄`) in the mission-control card → `/(parent)/report` (only with ≥1 child). |
| `app/(parent)/settings.tsx` | `original` | (modified) "Your data" card gains a "Backup & restore" section: "Back up to a file" (`exportBackup`) + "Restore from a file" (`prepareRestore` → confirm-replace → `applyRestore`) + a "last backed up …" Note; delete-all + both backup actions now route through the PIN via `requestSensitive` (`mode:'sensitive'`). |
| `app/(gate)/parental-gate.tsx` | `original` | (modified) NEW `mode:'sensitive'` route (backup/restore/delete-all) shares the PURCHASE PIN posture (always the PIN, `pin-missing` handling); on a correct PIN it `grantSensitive()`s the one-shot the caller consumes; sensitive-specific header copy. |
| `src/state/sessionStore.ts` | `original` | (modified) NEW ephemeral `pendingSensitiveAction`/`sensitiveGrantAt` + `requestSensitiveAction`/`grantSensitive`/`clearSensitive` (in-memory only; the PIN-gated sensitive-action handshake). |
| `THIRD_PARTY_NOTICES.md` | `original` | (modified) §4 note (e) records the four new first-party Expo modules (all MIT, © Expo, plugin-free, no network). |
| `PROVENANCE.md` | `original` | (modified) this section + the M-D1 reviewer sign-off row. |
| `__tests__/domain/report.test.ts` | `original` | NEW. `makeRange` window math; `buildReport` window filtering, streak-safe (resting/active) framing, calm-path flag, mood opt-in + `energyScaleMax` normalization, daypart gating via `showNumbersAndCharts`, cap-truncation footnote, zero-completion forward framing. |
| `__tests__/services/reportHtml.test.ts` | `original` | NEW. Banned-word gate on the rendered output (incl. 30d/90d ranges), non-diagnostic disclaimer present, no external URL / `<script>` / AI ref, child-name escaping, zero-completion forward framing, truncation footnote. |
| `__tests__/services/backup.test.ts` | `original` | NEW. `jest.mock`s the four native modules (incl. `expo-file-system/legacy`) with in-memory stubs. Round-trip export→import equality; `lastBackupAt` stamp; a foreign/unreadable/empty/canceled/declined file touches nothing; a hand-edited negative balance + bad companion mood repaired UP; restore reconciles session/focus + re-derives the trial reminder; `collectTbSlices` covers the whole `tb/` keyspace. |

---

## M-D2 — Production hardening II (ship gate) (feature-complete, Wave D)

Reviewer: feature-complete ship-gate audit (M-D2). The closing production pass over the whole
feature-complete tree (production-readiness workstreams 1/2/8-store-gate + the closing pass of 4/5/6).
No new user-facing feature: completes the EAS/store metadata, the OS-backup store gate, the camera
config, targeted list memoization, and the final fixture/greps. Additive-only; `SCHEMA_VERSION` 1,
`MIGRATIONS` `[]`.

| File | Origin | Notes |
| --- | --- | --- |
| `eas.json` | `original` | (modified) Completed the three build profiles + submit config: `development`/`preview` set `EXPO_PUBLIC_TB_DEV_SCREENS=1` (dev screens ON for QA) + `channel` + `distribution:internal`; `production` sets `autoIncrement` + `channel:"production"` and DELIBERATELY has no dev-screen env (dev screens OFF); `submit.production` iOS/Android placeholders. No `expo-updates`/OTA wired (offline-first, no phone-home — §2.1). |
| `app.json` | `original` | (modified) Registered the `expo-image-picker` config plugin with honest, no-upload `cameraPermission`/`photosPermission` strings (optional child photo-verify — §2.1); added `ios.infoPlist.UIBackgroundModes: []` documenting no background audio. `android.allowBackup:false` already present (§2.7). |
| `package.json` / `package-lock.json` | `original` | (modified) `expo-image-picker@~56.0.20` added via `npx expo install` (MIT, © Expo — the M-B2 verify-undo dep, lit up for the store build so the config plugin resolves). Recorded in THIRD_PARTY_NOTICES §4(f). |
| `app/(kid)/buddy.tsx` | `original` | (modified, §2.9) Removed the dead pre-onboarding `DEMO_ID` demo-companion fallback (onboarding seeds a real child+companion before the kid area is reachable); renders the active child's `BuddyRoom`, with a calm empty canvas if — defensively — there is no active child. |
| `components/quests/QuestCard.tsx` | `original` | (modified, §2.4) Wrapped the leaf card in `React.memo` so a board re-render doesn't re-render every quest. |
| `components/plans/PlanCard.tsx` | `original` | (modified, §2.4) Wrapped in `React.memo` (leaf list card). |
| `components/rewards/RewardCard.tsx` | `original` | (modified, §2.4) Wrapped in `React.memo` (leaf list card). |
| `components/task/StepCard.tsx` | `original` | (modified, §2.4) Wrapped in `React.memo` (leaf step row). |
| `app/(parent)/dashboard.tsx` | `original` | (modified, §2.4) Memoized the inline `ChildCard` (each reads its own store slices; memo blocks parent-shell-only re-renders). |
| `store/privacy-policy.md` | `original` | NEW (§2.2). Store-review privacy policy: no account/cloud/analytics/ads; all on-device; optional data off by default; honest camera + OS-backup disclosure; non-medical framing. |
| `RUN.md` | `original` | (modified, §2.2) NEW "Store release (App Store / Play Store)" section (EAS/app.json/metadata/greps checklist) + a "Feature-complete device-verify items (Waves A–D)" section covering every new feature's on-device checks. |
| `README.md` | `original` | (modified) NEW "Feature-complete capabilities" + "Nothing leaves the device — including via the OS" sections. |
| `THIRD_PARTY_NOTICES.md` | `original` | (modified) §4 note (f) records `expo-image-picker` (MIT, © Expo; config plugin, no network, backup-excluded local photos). |
| `__tests__/config/backup-exclusion.test.ts` | `original` | (modified, §2.7) Completed the M-D2 `it.todo`: asserts `photoVerify.ts` writes to the backup-excluded OS cache dir (`tb-photos/`) + has `deletePhoto`; asserts `app.json` has the honest no-upload camera usage string (no medical/required framing). |
| `__tests__/storage/migration-forward.test.ts` | `original` | (modified) Extended the golden fixture with the M-B2 `Task.verification` optional block (photo-verify) + asserts it (mode + local `file://` photoUri) survives `repairTask` untouched. |
| `PROVENANCE.md` | `original` | (modified) This M-D2 section + the feature-complete ship-gate reviewer sign-off row. |
---

## M1.0 — Monorepo migration (v2 w0)

Reviewer: build-agent (M1.0, 2026-07-10). Spec: `_build/spec2/01-current-and-target.md` §2 +
`_build/spec2/02-architecture.md` §1 (roadmap card `00-MASTER-ROADMAP.md` M1.0). The shipped v1 tree moved
VERBATIM to `apps/kid/` (zero app-source edits — Phase 2A), then the workspace scaffolds were added (Phase 2B).
Kid app behaviorally identical: `tsc --noEmit` = 0, 69 suites / 695 tests green, `expo export --platform web`
succeeds, `SCHEMA_VERSION` 1, `MIGRATIONS` `[]`. The kid core remains fully functional with network + LLM OFF.

| File | Origin | Notes |
| --- | --- | --- |
| `package.json` (root) | `original` | NEW root manifest: npm workspaces (`apps/*`, `packages/*`, `functions`), `private:true`, the BUILD-GUIDE §2 verify scripts (`kid:verify`/`parent:verify`/`shared:verify`/`fns:verify`/`verify:all`) + root `typecheck`/`test` fan-outs. Single hoisted `package-lock.json` regenerated at root. |
| `tsconfig.base.json` | `original` | NEW shared compilerOptions (`strict`) + the `@tiny-bubbles/shared` path aliases (arch §1.2). No `baseUrl` (deprecated in TS 6); `paths` resolve relative to the declaring file. |
| `tsconfig.json` (root) | `original` | NEW solution-style root (TS project references → `packages/shared`, `functions`). Apps are per-workspace (jest-expo/Metro, not composite). |
| `apps/kid/**` (whole v1 tree) | *(unchanged — see M0–M-D2 sections above)* | MOVED verbatim from the repo root (`app/ components/ src/ __tests__/ __mocks__/ assets/ hooks/ store/ deploy-web/` + app configs). Per-file origins recorded in the sections above remain authoritative. |
| `apps/kid/package.json` | `original` | (modified) Renamed `tiny-bubbles` → `@tiny-bubbles/kid`; added `export:web`; added `@expo/metro-runtime@~56.0.15` (MIT, © Expo — the SDK's own web entry runtime, previously transitive; declared directly because `disableHierarchicalLookup` hides npm-nested trees). Dependencies otherwise unchanged. |
| `apps/kid/metro.config.js` | `original` | (modified — the ONE required config change, arch §1.2) Monorepo Metro: `watchFolders=[root]`, `nodeModulesPaths` app→root, `disableHierarchicalLookup:true`, `assetExts+riv`, `extraNodeModules[@tiny-bubbles/shared]`, `blockList` for `functions/node_modules` + the other app's; keeps `withNativeWind({input:"./global.css"})`. |
| `apps/kid/tsconfig.json` | `original` | (modified) Extends `["expo/tsconfig.base", "../../tsconfig.base.json"]`; keeps `@/* → ./*`; re-declares the `@tiny-bubbles/shared` aliases app-relative (tsc does not merge `paths`). |
| `apps/kid/__tests__/config/no-network.test.ts` | `original` | (modified) RETARGETED per the M1.0 card: scans `apps/kid/{app,src,components}` + `apps/parent/{app,src,components}` from the monorepo root; `functions/` (the ONE sanctioned raw-egress zone) excluded; sanity asserts BOTH app trees were scanned. |
| `apps/parent/package.json` | `original` | NEW minimal Expo SDK 56 app `@tiny-bubbles/parent` — same pinned versions as kid (expo/expo-router/react/react-native/nativewind); no ad/analytics SDK, ever (COPPA). |
| `apps/parent/{app.json,babel.config.js,metro.config.js,tailwind.config.js,global.css,tsconfig.json,jest.config.js,nativewind-env.d.ts}` | `original` | NEW config mirroring apps/kid (monorepo Metro identical in shape; babel without the worklets plugin — no reanimated here). |
| `apps/parent/app/_layout.tsx` + `app/index.tsx` | `original` | NEW placeholder shell: one `Stack` layout + one placeholder route (calm, claim-free copy). Real parent surfaces land in M3.0 (w3). |
| `apps/parent/__tests__/smoke.test.tsx` | `original` | NEW trivial smoke floor: renders the placeholder route under jest-expo via `react-test-renderer` (same approach as kid; no new dependency). |
| `packages/shared/{package.json,tsconfig.json,jest.config.js,src/index.ts}` | `original` | NEW scaffold: `@tiny-bubbles/shared`, `main:"src/index.ts"`, `composite:true` (project references), EMPTY barrel (one-home-per-symbol — arch §2.1; first extraction lands in M1.1). Jest node-side with self-alias `moduleNameMapper`. |
| `functions/{package.json,tsconfig.json,jest.config.js,src/index.ts}` | `original` | NEW scaffold: own Node toolchain (own `node_modules` via `npm --prefix functions install`), `firebase-admin` + `firebase-functions` (Apache-2.0, © Google — server-side only, NEVER bundled by Metro / imported from apps); tsconfig `references` `packages/shared`; jest `moduleNameMapper` for the alias; EMPTY `src/index.ts` (w1 lands M1.2; esbuild deploy bundling — arch §1.5 — lands M1.2/M6.2). |
| `.gitignore` | `original` | (modified) Added `packages/*/lib/` + `functions/lib/` (project-reference build output) and `apps/*/ios|android` (per-app generated native folders). |
| `PROVENANCE.md` | `original` | (modified) This M1.0 section + sign-off row. |

---

## M1.1 — Shared safety/compliance primitives + the neuroProfile axis + CI gate scaffolds (v2 w8-primitives)

Reviewer: build-agent (M1.1, 2026-07-10). Spec: `_build/spec2/workstreams/w8-safety-compliance-neuroprofile.md`
§3–§4 + `_build/spec2/02-architecture.md` §2.1/§3/§8 register (roadmap card `00-MASTER-ROADMAP.md` M1.1).
ALL new modules are `original` (w8 reuses the v1 copy-gate/resolver/gate-as-test PATTERNS, no third-party code;
the sole donor influence is the v1 tree itself). No new runtime dependency; dev-only `ts-jest` + `@types/node`
(MIT) added to `packages/shared` for the Node-side test transform (named by BUILD-GUIDE §2.2). Crisis hotline
numbers are the spec-verified seed ONLY (988/741741 · Tele-MANAS/KIRAN/Childline · Línea de la Vida/SAPTEL/911);
EVERY card ships `reviewed:false` until a psychologist `CRISIS_REVIEW_SIGNOFF` (§8 #16b). Kid app: existing
children (no `neuroProfile`) render byte-identically to v1 (proven in `resolveCapabilities.test.ts` +
`resolveTokens.test.ts`); `SCHEMA_VERSION` 1, `MIGRATIONS` `[]`; 69 suites / 708 tests green; web export green;
fully functional with network + LLM OFF (the axis resolves entirely on-device).

| File | Origin | Notes |
| --- | --- | --- |
| `packages/shared/src/domain/types.ts` | `original` | (extraction) The v1 `apps/kid/src/domain/types.ts` moved VERBATIM (first extraction, §2B) + ADDITIVE w8 axis types: `NeuroProfile`/`NoveltyMode`/`FeedbackTempo`/`NeuroPreset` + optional `ChildProfile.neuroProfile?`. Union-widening + one optional field → no bump. |
| `apps/kid/src/domain/types.ts` | `original` | (modified) Now a thin re-export seam (`export * from "@tiny-bubbles/shared/domain/types"`) — every kid import unchanged. |
| `packages/shared/src/theme/resolveNeuroPreset.ts` | `original` | NEW: `NEURO_PRESETS` (autism/adhd/both per arch §3.3; `autoAdvanceSteps` hard-false everywhere, §8 #14), `NEUTRAL_PRESET` (absent ⇒ v1-identical, §8 #13), `DEFAULT_NEURO_PROFILE` (undefined), `RECOMMENDED_NEW_CHILD_NEURO_PROFILE` ("both"), `resolveNeuroPreset()`. Pure, deterministic, on-device. |
| `packages/shared/src/compliance/pii.ts` | `original` | NEW: the SINGLE PII taxonomy (§8 #7 superset incl. `gov_id`/`dob`/`school_name`/`geolocation`/`biometric`), `PII_PATTERNS`, `containsPii`, `redactPii` (records the CATEGORY, never the value). w1/w2 import; `firestore/redaction.ts` stays dropped. |
| `packages/shared/src/compliance/evidenceHonesty.ts` | `original` | NEW: the ONE authoritative claim gate (§8 #23) — bans BARE `zones of regulation` + `social stor(y|ies)`, AAC speech near-misses, word-bounded cure/treat-claim/therapy/SI; `SCAFFOLD_ALLOWLIST`; `isEvidenceHonest`/`checkEvidenceHonesty`/`assertEvidenceHonestCatalog` (patterns authored from fragments, v1 `BANNED_REMINDER_PATTERNS` discipline). |
| `packages/shared/src/compliance/crisisResources.ts` | `original` | NEW: canonical `CrisisCard`/`CrisisResource`/`SafeMessaging` (§8 #20), `SAFE_MESSAGING` (validate/hope/trusted-grown-up/no-secrecy; no means/method), `CRISIS_RESOURCES` seed (en-US/en-IN/hi-IN/es-MX/en-MX, ALL `reviewed:false`), `CHILD_PROTECTION_RESOURCES` (§8 #27 abuse/csam path), `GENERIC_FALLBACK_CARD` (no number), `resolveCrisisCard(locale, crisisType)` (never throws, never invents). |
| `packages/shared/src/compliance/crisisReview.ts` | `original` | NEW: `CRISIS_REVIEW_SIGNOFF` (EMPTY until psychologist entries land), `LAUNCH_LOCALES`, `isCrisisCardShippable`, `assertCrisisTableReviewed` (throws on any unreviewed launch locale — incl. en-US pre-sign-off, §8 #16b). |
| `packages/shared/src/compliance/retention.ts` | `original` | NEW: `RetentionDays = 30\|90`, `RETENTION_POLICY` (default 30 COPPA-min, max 90 — §8 #10b), `coerceRetentionDays` (clamps, never lengthens), `retentionMs`, `computeTtlAt`. |
| `packages/shared/src/compliance/consent.ts` | `original` | NEW: canonical `ConsentMethod` (incl. emulator-only `dev_mock`, §8 #17/#29), `ConsentAgreement`/`ConsentRecord`, `CONSENT_AGREEMENTS` seed `coppa-2026-07` (no-ads + non-training-processor + no-secrecy + 30/90 retention named; body passes the evidence gate), `CURRENT_AGREEMENT`, `agreementByVersion`. |
| `packages/shared/src/compliance/symbolLicense.ts` | `original` | NEW: canonical `SymbolLicense` (incl. never-ship `user`/`unknown`, §8 #22) + `SymbolAssetManifestEntry`, `ALLOWED_SYMBOL_LICENSES`, `BANNED_SYMBOL_LICENSE_PATTERNS` (any-NC/GPL/AGPL/ARASAAC/Sclera), `isSymbolLicenseClean`, pure `checkSymbolManifest`/`assertSymbolManifestClean` (license + completeness). RN-safe (no fs). |
| `packages/shared/src/compliance/symbolLicenseNode.ts` | `original` | NEW: Node-only fs wrapper `assertSymbolManifestCleanAtPath(manifestPath, assetsDir)` over the ONE canonical `apps/kid/assets/symbols/manifest.json`; vacuous-pass until w4 lands art (§9 #7); NOT barrel-exported (never enters a client bundle). |
| `packages/shared/src/compliance/index.ts` + `src/index.ts` | `original` | (modified) Barrels: domain types + resolveNeuroPreset + compliance homes (one-home-per-symbol, §8 #20). |
| `packages/shared/{package.json,tsconfig.json,jest.config.js}` | `original` | (modified) dev-only `ts-jest` + `@types/node` (MIT); `types:["node"]`; ts-jest transform (isolatedModules, test-side rootDir/composite relax). |
| `apps/kid/src/theme/resolveCapabilities.ts` | `original` | (modified, additive) `neuroProfile?` input + the 8 preset caps (`noveltyMode`/`autoAdvanceSteps`(hard-false)/`transitionWarnings`/`celebrationCeiling`/`feedbackTempo`/`literalLanguage`/`previewNovelty`/`neuroInputModeDefault`); explicit override > preset > base; existing caps byte-identical when absent. |
| `apps/kid/src/theme/resolveTokens.ts` | `original` | (modified, additive) `sensoryMode` now optional — unset defaults from `preset.sensoryModeDefault` (autism/both ⇒ lowStim); explicit value + OS reduce-motion still win. |
| `apps/kid/src/theme/resolveContent.ts` | `original` | (modified, additive) copy overload gains `neuroProfile?`; literal-language selection flows via `getMessage({literal})`, base-copy fallback when unauthored. |
| `apps/kid/src/i18n/types.ts` + `src/i18n/messages.ts` | `original` | (modified, additive) `ModeKeyed<T>` gains optional `literal?` branch; `getMessage` gains `literal?: boolean` (falls back to the age variant). |
| `apps/kid/src/theme/ThemeProvider.tsx` + `src/theme/useThemeTokens.ts` | `original` | (modified, additive) `ThemeInputs.neuroProfile?` (the w6+w8 coordinate-once seam; DEFAULT_INPUTS leaves it ABSENT ⇒ neutral, §8 #13); `useCapabilities`/`useThemeTokens` thread it into the resolvers. |
| `apps/kid/app/_layout.tsx` | `original` | (modified, additive) `ThemedRoot` feeds `neuroProfile: profile.neuroProfile` into the provider inputs (absent for every existing child). |
| `apps/kid/jest.config.js` | `original` | (modified) `moduleNameMapper` for `@tiny-bubbles/shared(/*)` → `packages/shared/src` (mirrors tsc `paths` + Metro `extraNodeModules`). |
| `packages/shared/__tests__/theme/resolveNeuroPreset.test.ts` | `original` | NEW: each preset per §3.3 + absent ⇒ NEUTRAL + hard-false auto-advance + corrupt-value degradation. |
| `packages/shared/__tests__/compliance/{pii,evidenceHonesty,symbolLicense,retention,consent}.test.ts` | `original` | NEW: every `PiiCategory` redacts (fuzz incl. full_name/school_name; category-not-value), banned-claim classes reject + allowlist/legit copy accepts, NC/GPL/user/unknown never ship + completeness throws, `computeTtlAt`/clamp, agreement registry + evidence-honest body. |
| `packages/shared/__tests__/gates/{scanTree.ts,neuro-golden-rule,evidence-honesty,crisis-review,symbol-license,no-invented-hotline}.test.ts` | `original` | NEW CI gate scaffolds (vacuous-pass where a surface hasn't landed; tighten automatically): zero raw `neuroProfile ==\|===\|!==` in render paths; tree-wide claim scan (+ `docs/store-listing.md` once present, §8 #23b); `resolveCrisisCard` never invents + SAFE_MESSAGING means/method-free + `assertCrisisTableReviewed` BLOCKS pre-sign-off; the ONE manifest path + NC fixtures throw; phone/988 literals only in `crisisResources.ts`. |
| `apps/kid/__tests__/theme/resolveCapabilities.test.ts` | `original` | (modified) w8 back-compat proof: omitting `neuroProfile` ⇒ pre-w8 snapshot byte-identical + new caps = NEUTRAL; preset flow; explicit-override precedence; hard-false auto-advance. |
| `apps/kid/__tests__/theme/{resolveTokens,resolveContent}.test.ts` | `original` | (modified) sensory default from the preset (explicit wins; reduce-motion clamps); literal-branch fallback + accessor selection. |
| `apps/kid/__tests__/storage/migration-forward.test.ts` | `original` | (modified) Golden fixture gains `profile.neuroProfile:"both"` → survives `migrateAndRepair` untouched; `SCHEMA_VERSION` still 1, `MIGRATIONS` `[]`. |
| `scripts/{gate-evidence-honesty,gate-symbol-license,gate-anti-shame,gate-provenance,ship-gate}.sh` | `original` | NEW CI gate scripts wired as root npm scripts (`gate:*`, `gates`, `ship-gate`). Evidence grep matches the ONE authoritative module standard (§8 #23); anti-shame carries the v1 gate (comment lines stripped; the v1-shipped warm `buddy.greet` return greeting is the ONE documented exclusion, flagged for M6.1 human copy review); `ship-gate.sh` is the M6.1-finalized aggregate SCAFFOLD (crisis-review row EXPECTED red until psychologist sign-off — the gate holding, not a bug). |
| `package.json` (root) | `original` | (modified) Added `gate:evidence-honesty` / `gate:symbol-license` / `gate:anti-shame` / `gate:provenance` / `gates` / `ship-gate` scripts. |
| `PROVENANCE.md` | `original` | (modified) This M1.1 section + sign-off row. |

| Milestone | Reviewer | Date | "No code from a non-approved source" |
| --- | --- | --- | --- |
| M1.1 w8-primitives (neuroProfile axis + compliance modules + gate scaffolds) | build-agent (M1.1) | 2026-07-10 | CONFIRMED — all new modules original (v1 PATTERNS reused, no third-party code); dev-only `ts-jest`/`@types/node` (MIT); crisis numbers = spec-verified seed only, ALL cards `reviewed:false` pending psychologist sign-off (§8 #16b); no egress added to any client tree; existing children byte-identical (NEUTRAL preset); additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`) |

## M1.1b — Extract the RN-free v1 resolvers + report modules to `packages/shared` (v2 w0/w8)

**No new third-party code.** This milestone MOVES existing first-party v1 modules (all `original`, provenance
unchanged) from `apps/kid/src` to `packages/shared/src` per 02-architecture §2.1 barrel-ownership +
BUILD-GUIDE §4 extraction discipline. Each old kid path is a thin re-export seam, so kid behavior + the
69-suite kid test floor stay byte-identical. `date-fns`/`date-fns-tz` (both MIT, already shipped v1 kid deps)
are now ALSO declared by `packages/shared` (the moved `domain/dates.ts` uses them) — same versions, no new
package added to the tree.

| Path (new canonical home) | Provenance | Notes |
| --- | --- | --- |
| `packages/shared/src/theme/{resolveCapabilities,resolveTokens,resolveContent,resolveCelebration,resolveStatusPresentation}.ts` | `original` (moved from `apps/kid/src/theme/`) | The five RN-free v1 resolvers incl. the M1.1 `neuroProfile` axis (preset composes below explicit overrides; absent ⇒ NEUTRAL ⇒ v1-identical). `resolveContent` no longer re-exports `COPY`/`ModeKeyed` (one home per symbol — the kid seam restores back-compat). |
| `packages/shared/src/theme/{tokens,contrast,breakpoints}.ts` | `original` (moved) | Token contract + palettes, WCAG AA math, and the PURE breakpoint bucket (`useScreenSize` RN hook stays in the kid app). |
| `packages/shared/src/domain/{report,moodInsight,dates,streaks,constants}.ts` | `original` (moved) | `buildReport`/`ReportModel`/`makeRange`, the no-interpretation mood selectors, tz-aware day/daypart math, the forgiving streak math (anti-shame invariants intact), and the shared caps (`LEDGER_ENTRY_CAP`/`RUNS_CAP`/`ONE_DAY_MS` — kid-only defaults/factories stay in the kid app). |
| `packages/shared/src/services/reportHtml.ts` | `original` (moved) | PURE `renderReportHtml` — self-contained, script-free, network-free, anti-shame + non-diagnostic copy baked in. |
| `packages/shared/src/i18n/{types,en,catalog,messages}.ts` | `original` (moved) | The bundled copy catalog + accessor (`resolveContent` depends on it); `useLocale` RN hook stays in the kid app. Copy remains covered by the anti-shame/evidence-honesty gates (which scan both trees). |
| `apps/kid/src/{theme,domain,services,i18n}/…` (old paths) | `original` | (modified) Thin re-export seams to the shared homes (M1.1 `domain/types.ts` pattern); `src/theme/breakpoints.ts` keeps only the RN hook; `src/domain/constants.ts` re-exports the three moved caps. |
| `packages/shared/src/index.ts` | `original` | (modified) Barrel exports every new module from its ONE canonical home — no duplicate `export *` symbols. |
| `packages/shared/__tests__/{theme,domain,services,i18n}/*.test.ts` | `original` | NEW: a passing shared test per moved module (12 files, 100 tests) incl. the neuro-axis proofs (absent ⇒ v1-identical) + the v1 anti-shame banned-word gate for the report HTML. |
| `packages/shared/package.json` | `original` | (modified) `dependencies`: `date-fns@^4.4.0`, `date-fns-tz@^3.2.0` (MIT; identical to the kid app's shipped versions). |

| Milestone | Reviewer | Date | "No code from a non-approved source" |
| --- | --- | --- | --- |
| M1.1b shared extraction (RN-free resolvers + report/moodInsight + i18n catalog) | build-agent (M1.1b) | 2026-07-10 | CONFIRMED — pure move of first-party v1 code, no new third-party source; MIT-only deps re-declared; kid suite 69/708 green + web export clean (behavior-preserving); shared suite 23/195 green; RN-free contract enforced (zero `react`/`react-native` imports under `packages/shared/src`); neuro-golden-rule gate green (no raw `neuroProfile` comparison in any render path) |

## M1.2 — Backend + data model + auth/consent + sync adapter (v2 w1)

**Donor code reuse: PATTERNS ONLY (no lines copied).** The Cloud Functions backbone follows the donor
patterns named in w1 §5 — `firebase-cloud-functions-typescript-example` (MIT: locked-default rules,
claims typing, interceptor shape, client/firestore model split), `firebase-functions-samples`
(Apache-2.0: auth-blocking gate, FCM send, `onSchedule` cron sweep), `expo-firebase-boilerplate-v2`
(MIT: env-config SDK init concept, scrubbed creds) — every file below is original TS authored against
those patterns. New runtime deps: `firebase` JS SDK ^12 (Apache-2.0, apps/kid); dev-only `esbuild`
(MIT), `ts-jest` (MIT), `@firebase/rules-unit-testing` (Apache-2.0), `firebase` (functions devDep, for
the emulator suite). No ad/analytics SDK anywhere (gate-enforced).

| File | Origin | Notes |
| --- | --- | --- |
| `packages/shared/src/firestore/{types,paths,index}.ts` | `original` | NEW: the CANONICAL §2.3 Firestore contract (ParentUserDoc w/ typed `FcmTokenRecord` §8 #26, ChildDoc, ChildSettingsDoc controls+preferences §8 #1, Board/Schedule/Narrative projections, `ActivityKind` 11-member union + `ALL_ACTIVITY_KINDS` §8 #6, combined-turn `TranscriptTurnDoc` §8 #8, `AlertDoc` w/ `pinnedTurns`+`crisisType`+`legalHold` §8 #27, `SafetyReportDoc`, `ReportSnapshotDoc` §8 #21, `GlobalConfigDoc`) + the ONE path-helper spelling of the tree. Structural `Ts` (no SDK dep). |
| `packages/shared/src/sync/types.ts` | `original` | NEW: `OutboxItem`/`SyncState`/`SyncStatus` (shame-free `off\|pending\|synced\|paused`) + the epoch-ms `ActivityEventWire` (Ts stamped at drain). |
| `packages/shared/src/bloop/{provider,moderation,topics,index}.ts` | `original` | NEW (w2-owned homes SEEDED with only what the schema needs, §8 #19/#20): ONE `InputMode` union + `toInputMode()` (fails closed to chips), `ModeratedReplyStatus`, `ModerationFlag`/`ModerationCategory`/`ScanStage`/`OnFailAction` enum (§8 #9), `TopicCategory`+`ALL_TOPICS`+`toTopicCategory` (§8 #3). M2.0 extends, never re-declares. |
| `packages/shared/src/compliance/consent.ts` | `original` | (modified, additive) The pure VPC predicates (§8 #29): `VERIFIED_CONSENT_METHODS` (payment-verified + signed-form), `isVerifiedConsentMethod`, `isEmulatorEnv`, `consentMethodRejection` (dev_mock emulator-only, unknown ⇒ reject), `hasVerifiedParentalConsent`. |
| `packages/shared/src/domain/types.ts` | `original` | (modified, additive) Optional `ChildSettings` cloud fields (w1 §3.3a): `bloopEnabled?`/`bloopInputMode?`/`bloopTopicScope?`/`bloopLimits?`/`retentionDays? (30\|90)`/`crisisLocale?`/`cloudSyncEnabled?`/`firestoreChildId?` — every absent-default keeps network+LLM OFF; no SCHEMA_VERSION bump. |
| `apps/kid/src/state/syncStore.ts` | `original` | NEW: the persisted `tb/sync` slice (linkage/outbox/cursors/status; OUTBOX_CAP 1000 drops oldest silently) via the shipped `createTbPersistOptions`+`registerPersistedStore` pattern; cleared by `wipeAllChildData`. |
| `apps/kid/src/sync/firebase.ts` | `original` | NEW: the ONE egress module's SDK seam — `firebaseConfigFromEnv` (EXPO_PUBLIC_FIREBASE_*, fail-closed on partial config, NO https literal §1.4), lazy `import()` of firebase/{app,firestore,auth,functions} gated by config, narrow `SyncPorts` + `__setSyncPortsForTests`, `pairKidDevice(code, localCid)` custom-token pairing (§8 #21c, non-destructive linkage). |
| `apps/kid/src/sync/cloudSync.ts` | `original` | NEW: `emitActivity(kind,payload)` — THE shared seam for ALL producers (§2.4); `sanitizeActivityPayload` (counts only; drops long/PII strings); idempotent `drainOutbox` (localId===docId, set-merge, `expiresAt=createdAt+retentionDays` default 30); `computeAndSyncReportSnapshot` → `reports/{7d\|30d}` (+90d premium) via the shared `buildReport` (§8 #21); `emitAacUtteranceSummary` (w4 aggregate placeholder); `syncNow`. |
| `apps/kid/src/sync/syncQueue.ts` | `original` | NEW: the one module mutating the outbox (enqueue/list/removeDrained/bumpAttempts/markPushed). |
| `apps/kid/src/sync/settingsSync.ts` | `original` | NEW: pure `mergeSettings` (parent-authoritative controls ALWAYS down; preferences field-level LWW on updatedAt; kid never pushes controls) + staged `pullSettings`/`applyStagedSettings` (calm-boundary apply — the autism predictability invariant §2.4). |
| `apps/kid/src/sync/fcmToken.ts` | `original` | NEW: per-platform push-token capture SEAM (§8 #26): Android `getDevicePushTokenAsync`=FCM; iOS RNFB-messaging preferred (absent ⇒ APNs token recorded with type "apns"); lazy/no-throw; token TYPE always recorded. |
| `apps/kid/src/state/{gameplay,childStore,buddyStore,focusSessionStore}.ts` + `app/(kid)/calm.tsx` | `original` | (modified, additive) Producers route through `emitActivity`: completeStep → step_done/routine_complete/token_earned; addMood → mood_log/emotion_logged (note NEVER rides); applyEvent("rest") → break_taken; focus toBreak → movement_break/break_taken; calm complete → breathing_done. `wipeAllChildData` clears `tb/sync`. firstthen_done/schedule_step_done = w4/w5 call sites (documented placeholders on the same seam). |
| `apps/kid/src/storage/schemaVersion.ts` + `src/state/index.ts` | `original` | (modified, comment/barrel only) tb/sync slice noted; NO version bump. |
| `functions/src/ports.ts` + `src/firebaseAdmin.ts` | `original` | NEW: narrow admin ports (Db/Auth/Messaging/Email/Storage/Clock + `HandlerError`) so every handler unit-tests with fakes (no-Java floor); real firebase-admin adapters (lazy init; email fallback = Trigger-Email `mail/` queue contract). |
| `functions/src/auth/{setClaims,beforeUserCreated,onParentCreated,provisionChild,pairKidDevice}.ts` | `original` | NEW: claim shapes (kid `childId===uid` §8 #28); COPPA gate (kid uid ONLY under a consent-verified parent w/ non-mock VPC record; email signup ⇒ unverified parent; else reject); users/{uid} seeding (retentionDays 30); consent-gated provisioning (re-verifies the AUDIT TRAIL, first-name-only, seeds `bloopEnabled:false` + chips, 10-min single-use pairing code); code→custom-token exchange (consume-before-mint). |
| `functions/src/consent/recordConsent.ts` | `original` | NEW: the VPC callable — `dev_mock` REJECTED outside the emulator (§8 #29); payment-verified requires a PSP ref; signed-form requires envelope ref + verified email; KBA records but never verifies; append-only trail; claim stamped only for real methods. |
| `functions/src/data/{transcripts,seedGlobalConfig,deleteChildData,computeReportSnapshot}.ts` | `original` | NEW: the transcript WRITE CHOKEPOINT (imports shared `redactPii` — BOTH directions redacted BEFORE doc construction; no raw-text field exists §2.5/§8 #7); idempotent `config/{global}` seeding mirroring shared compliance (§8 #21b, NOT a public callable); parent erasure SKIPPING legalHold (tombstone while held, §8 #27); server-side ReportSnapshot SHAPE helper (kid adapter stays the producer). |
| `functions/src/retention/{ttlSweep,onRetentionChange}.ts` | `original` | NEW: daily backstop sweep over the 4 TTL collection groups + shrink-only re-stamp — BOTH skip `legalHold` (§8 #27); grow never extends. |
| `functions/src/alerts/sendParentAlert.ts` | `original` | NEW: crisis differentiation (§8 #27): self_harm/distress → alert doc + FCM (fcm-typed tokens only §8 #26) + email fallback + once-only 30-min re-escalation; abuse/csam → NO parent contact, `safetyReports` queue + transcript `legalHold:true`. |
| `functions/src/interceptors/verifyIdToken.ts` | `original` | NEW: server-authoritative kid context (§8 #28): childId===uid, claim/guardian cross-checks, settings loaded server-side, `bloopEnabled` fail-closed false. |
| `functions/src/index.ts` | `original` | (modified) Transport wiring (onCall/identity/scheduler/firestore triggers → handlers; HandlerError→HttpsError); re-exports `writeTranscriptTurn`/`verifyKidContext`/`sendParentAlert`/`seedGlobalConfig` for w2. |
| `functions/{firestore.rules,firestore.indexes.json,storage.rules,firebase.json}` | `original` (rules START from the MIT donor locked default) | NEW: default-deny opened per-collection (parent own-tree; kid create-own-activity/reports, preferences-only settings writes, NO transcripts/alerts access; admin-only transcripts/alerts/safetyReports/config); composite indexes; cross-service-checked Storage video tree; emulator ports + `build:deploy` predeploy. |
| `functions/{package.json,jest.config.js,jest.emulator.config.js,tsconfig unchanged}` | `original` | (modified/NEW) `build:deploy` esbuild bundle (shared runtime INLINED, admin/functions external — §1.5, verified: 60kb bundle cold-loads); unit jest (fakes, __emulator__ excluded); emulator jest config (needs-Java). |
| `functions/__tests__/{helpers/fakes,consent,redaction,retention,alerts,auth}.test.ts` | `original` | NEW: 50 unit tests on the CI floor — VPC dev_mock-rejected-in-prod, provision preconditions, redaction-BEFORE-storage (every PiiCategory + name/school fuzz + no-raw-field schema assert), TTL stamp/sweep/re-stamp + legalHold exemptions, crisis differentiation + dual channel + re-escalation, COPPA gate, single-use pairing, server-authoritative interceptor. |
| `functions/__emulator__/{rules.test.ts,README.md}` + `functions/docs/RULES-REVIEW.md` | `original` | NEW: the NEEDS-JAVA emulator rules suite (DEFERRED here — no JVM in this env; run `firebase emulators:exec … jest.emulator.config.js` BEFORE deploy) + the human rules-review matrix + pre-deploy checklist (TTL policies out-of-band, blocking-function binding, App Check, seedGlobalConfig, Trigger-Email, PSP binding). |
| `apps/kid/__tests__/sync/cloudSync.test.ts` | `original` | NEW: 16 tests — an outbox emission for EACH of the 11 ActivityKinds (+ real producer wiring incl. mood/emotion/rest/movement/aac aggregate); fail-closed defaults (off/unpaired ⇒ zero queue growth); offline queue; idempotent drain w/ TTL stamping; payload hygiene; settings LWW matrix (controls never up); PII-free ReportSnapshot (mood note never leaves); wipe clears tb/sync. Mocked Firestore port — no SDK/network. |
| `apps/kid/__tests__/config/no-analytics.test.ts` | `original` | NEW: the COPPA no-ad/analytics gate — bans firebase/analytics, RNFB analytics, ad SDKs, segment/amplitude/mixpanel/posthog/appsflyer/adjust/sentry across BOTH app trees + both dependency lists; self-testing. |
| `apps/kid/__tests__/storage/migration-forward.test.ts` | `original` | (modified) Fixture gains the M1.2 optional ChildSettings fields + a `tb/sync` v1-envelope hydration proof — `SCHEMA_VERSION` still 1, `MIGRATIONS` `[]`. |
| `packages/shared/__tests__/{compliance/consentVpc,firestore/contract}.test.ts` | `original` | NEW: the pure VPC matrix + the canonical-contract pins (11 kinds exactly, severity enum, InputMode mapper fails closed, topic mapping, one path spelling). |
| `apps/kid/package.json` | `original` | (modified) `firebase@^12.16.0` (Apache-2.0) — loaded ONLY via the gated dynamic import in `src/sync/firebase.ts`; unconfigured builds never evaluate it. |
| `PROVENANCE.md` | `original` | (modified) This M1.2 section + sign-off row. |

| Milestone | Reviewer | Date | "No code from a non-approved source" |
| --- | --- | --- | --- |
| M1.2 w1 backend/data + auth/consent(VPC) + sync adapter + rules | build-agent (M1.2) | 2026-07-10 | CONFIRMED — all new modules original (MIT/Apache donor PATTERNS only, no lines copied); new deps: firebase JS SDK (Apache-2.0), dev-only esbuild/ts-jest (MIT) + @firebase/rules-unit-testing (Apache-2.0); kid egress remains exactly `src/sync/**` behind env config + `cloudSyncEnabled:false` default (no-egress + no-analytics gates green); model never the safety boundary (rules + server-side gates fail closed); crisis differentiation per §8 #27 (abuse/csam ⇒ NO parent auto-alert + legalHold); additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`); emulator suite authored but DEFERRED (needs Java — run pre-deploy per functions/docs/RULES-REVIEW.md) |

## M2.0 — Shared bloop contract + mock-first kid seam (v2 w2)

**Approved sources for this milestone:** the project specs (`_build/spec2/*`, incl. the project-internal
hand-crafted `handcraft/guardrailPipeline.ts` whose `TurnOutcome` shape this milestone canonizes), the
existing MIT/Apache donor PATTERNS already recorded at M1.2 (llm-guard MIT scanner taxonomy, guardrails-ai
Apache-2.0 `OnFailAction` vocabulary — patterns only, no lines copied). **No new dependencies**
(react-native-gifted-chat DEFERRED to M5.2 — not added, not evaluated in-bundle; the placeholder list is
dependency-free). No network egress added: the proxy transport rides the M1.2 `src/sync/firebase.ts` SDK seam
(`httpsCallable`), no `fetch`/URL literal anywhere in the app trees.

| File | Origin | Notes |
| --- | --- | --- |
| `packages/shared/src/bloop/provider.ts` | `original` | (modified, additive) M1.2 seed COMPLETED: `BloopProvider` port + `BloopTurnInput`/`BloopContext`/`ModeratedReply`/`QuickReply` (w2 §4.1/arch §4.2); `ModeratedReplyStatus` widened ADDITIVELY with `redirect`/`error` (arch §4.2 vocabulary; every M1.2 member unchanged) + `ALL_MODERATED_REPLY_STATUSES` pin. `CrisisCard` imported from compliance (§8 #20). |
| `packages/shared/src/bloop/turn.ts` | `original` | NEW: the canonical WIRE contract — `TurnRequest` (ctx = untrusted hint §8 #28) + `TurnOutcome` aligned 1:1 with the handcraft pipeline (reply/gentleRedirect/crisis/hardStop/fallback; crisis routing fields honor §8 #27), `ShieldCategory`, `TurnHardStopReason`, fail-closed `parseTurnOutcome` (malformed wire ⇒ null ⇒ safe fallback), `turnOutcomeStatus`/`toModeratedReply` mapping, `toCrisisType` (unknown ⇒ self_harm, NEVER abuse/csam — alert suppression must be explicit), chat availability (`ChatAvailability` disabled/quietHours/budget/offline/shieldUnavailable + fail-closed `resolveChatAvailability`), warm `SAFE_FALLBACK_TEXT`/`REDIRECT_COPY` (ported from the project-internal handcraft spec). |
| `packages/shared/src/bloop/quickReplies.ts` | `original` | NEW: curated, PII-free, topic-scoped chip catalog (13 chips covering all 7 canonical topics) + `quickReplyById` + fail-closed `quickRepliesForScope` (empty scope ⇒ no chips). |
| `packages/shared/src/bloop/transcript.ts` | `original` | NEW: w2 draft names re-NAMED onto the canonical homes (never re-declared, §8 #20/#33): `TranscriptTurn`=`TranscriptTurnDoc`, `CrisisAlert`=`AlertDoc`, `BloopConfig`=`GlobalConfigDoc`; `TranscriptModel` union + pin. |
| `packages/shared/src/bloop/mock.ts` | `original` | NEW: `MockBloopProvider` — deterministic (no RNG/clock), fully offline, exercises EVERY status; handcraft gate order (crisis FIRST, then PII via shared `containsPii`, injection, medical, off-scope, scripted topic reply); §8 #27 differentiation (abuse/csam ⇒ alertParent:false + safetyReport + legalHold, no promise-of-disclosure); locale card via `resolveCrisisCard`; never echoes child text (PII structurally cannot resurface). |
| `packages/shared/src/bloop/index.ts` | `original` | (modified) barrel gains turn/quickReplies/transcript/mock. |
| `apps/kid/src/config/flags.ts` | `original` | (modified, additive) `BLOOP_PROXY_ENABLED` = `EXPO_PUBLIC_TB_BLOOP_PROXY === "1"` (default false — transport selection only; chat stays parent-gated on every path). |
| `apps/kid/src/services/bloopProvider.ts` | `original` | NEW: THE mock-first seam (mirrors `purchases.ts`): `getBloopProvider()` (mock DEFAULT, proxy only under the flag), `sendBloopTurn` re-checks the parent gate on EVERY turn (`bloopEnabled` absent ⇒ `disabled`, NO provider call), warm fail-closed error path, `getBloopChatAvailability`, `bloopTopicScopeOf` (legacy ids mapped, unknown dropped), `__setBloopProviderForTests`. The only file containing `sendTurn` (BUILD-GUIDE §3 grep green). |
| `apps/kid/src/services/bloopProxyProvider.ts` | `original` | NEW: transport-only callable stub — `callBloopTurn` via the sanctioned `SyncPorts.functions.call("bloopTurn")` (Firebase SDK `httpsCallable`; no fetch/URL literal); unconfigured/thrown/malformed ⇒ `null` ⇒ warm fallback (unconfigured = unavailable). |
| `apps/kid/app/(kid)/bloop.tsx` + `app/(kid)/_layout.tsx` | `original` | NEW route (+ layout registration, both shells, pushed modal, never a tab; GrownUpsDoor hidden over it): the MINIMAL chat placeholder — HARD-GATED on `getBloopChatAvailability === "available"` (Redirect to Today otherwise: disabled/offline child sees NOTHING broken); CHIPS-ONLY input (PII-free by construction), in-memory message list (COPPA data-min, no `tb/*` slice, SCHEMA_VERSION stays 1), persistent AI disclosure line, renders only `ModeratedReply.text`. Full surface = M5.2 (gifted-chat deferred). |
| `packages/shared/__tests__/bloop/{contract,mock}.test.ts` | `original` | NEW: 76 assertions total — wire round-trip for every outcome kind incl. every hard-stop reason; 14 hostile wire fixtures parse to null; status mapping matrix; fail-closed mappers (`toCrisisType`/`toInputMode`); availability gate order; mock determinism (fresh-provider byte-equality), every status reachable offline, §8 #27 differentiation, PII-never-echoed, scope-fail-closed chips, catalog PII-free + full topic coverage. |
| `apps/kid/__tests__/services/bloopProvider.test.ts` + `__tests__/render/bloop-route.test.tsx` | `original` | NEW: mock-is-default + flag-gated proxy (module-isolated env probes; non-"1" values fail closed to mock); OFF-BY-DEFAULT structural (absent/false/no-child ⇒ `disabled`, provider spy NEVER invoked); every status reachable offline through the seam; throwing provider ⇒ warm error; unconfigured proxy ⇒ warm error; route renders NO chat UI when disabled (redirect-only, no text) and the gated placeholder when enabled. |
| `PROVENANCE.md` | `original` | (modified) This M2.0 section + sign-off row. |

| Milestone | Reviewer | Date | "No code from a non-approved source" |
| --- | --- | --- | --- |
| M2.0 w2 shared bloop contract + mock-first kid seam | build-agent (M2.0) | 2026-07-10 | CONFIRMED — all new modules original (donor PATTERNS only: llm-guard MIT taxonomy, guardrails-ai Apache-2.0 on-fail vocabulary; the TurnOutcome shape ports the project-internal handcraft spec); ZERO new dependencies (gifted-chat deferred to M5.2); chat OFF by default (`bloopEnabled` absent ⇒ false, structurally enforced at the seam — provider never invoked when disabled); mock provider is the default everywhere (proxy only under `EXPO_PUBLIC_TB_BLOOP_PROXY=1`, unconfigured = warm unavailable); model never the safety boundary (fail-closed wire parse, hard-stop mapping, crisis = reviewed cards only); §8 #27 differentiation intact (abuse/csam ⇒ NO parent auto-alert + safetyReport + legalHold); no-egress + no-analytics + anti-shame + evidence-honesty gates green; additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` `[]`, status union widened additively); kid web export green, bundle carries no functions/ code |
