# Tiny Bubbles — Plan Changelog (critique → FINAL)

*Plan doc 68. What changed in `66-MASTER-PLAN.md` + `67-build-backlog.md` in response to the five-lens critique (technical feasibility, anti-shame/child-safety ethics, license compliance, completeness/coverage, age-adaptive coverage). Every BLOCKER and MAJOR is resolved; real gaps are filled or explicitly deferred. Section refs (§1b.x) point at the new canonical-reconciliations section in doc 66.*

---

## BLOCKERS resolved

1. **Local analytics ON by default for a child** → `localAnalyticsEnabled` flipped to **default `false` (opt-IN)**; mood logging also opt-in. Added a hard "never leaves device" invariant + an M15 CI grep (no fetch/upload referencing `events`/`moods` slices), surfaced in `privacy_consent`. (§1b.12, M9, M15, invariant 8)
2. **Paywall take-away visible to the child** → added the **non-punishing-downgrade rule**: anything owned/equipped stays forever; gating blocks NEW unlocks only; `<PremiumGate>` never removes/hides/unequips. Added a test simulating trial expiry with premium cosmetics equipped → zero visible change. (§1b.11, M12, invariant 7)
3. **Parent zone reachable before a gate is configured / onboarding dropped the gate-setup step** → reconciled to **one onboarding flow** incl. `privacy_consent` + `parent_gate_setup` **before the child can land in `(kid)`**; `parentGate.mode` defaults to a configured challenge; `'none'` is dev-only and blocked from production builds. (§1b.8, M11, M15, invariant 10)
4. **Bundled audio licenses untracked; the prescribed `bubble-pop-...mp3` is absent + unknown-provenance** → **do not lift that mp3**; stood up a **bundled-asset license registry** (a standing `THIRD_PARTY_NOTICES` section from M0), all audio from CC0/royalty-free-commercial only, manual asset review at M15 (scanner is media-blind), CC-BY-NC/unverifiable forbidden. (§1b.9, M0, M13, M15)

## MAJORS resolved — technical feasibility

5. **`expo-av` is a dead end (removed in SDK 55) and is hook-incompatible with the imperative celebration** → switched to **`expo-audio`** via a **pre-instantiated, ref-backed imperative cue registry** + `playCue()` facade that preserves the M7/M13 imperative API and the sub-300ms window. (§1b.1, M1/M5/M7/M13)
6. **`tether`/`momentum`/`habit-tracker` presented as ports but are non-RN (Electron/Prisma/MobX-SDK50)** → reclassified as **REFERENCE-ONLY (logic + patterns)**; `lockin` is the only code-graft donor; M2/M4/M8/M9 relabeled **net-new builds** and re-sized upward (M4 L→XL, M8 L→XL, M2 L→XL). (§1b.2, milestone table)
7. **M1 sandbox tested the easy surfaces, not the risky ones** → M1 now de-risks **(a) animated SVG path/gradient via a shared value, (b) modal entering animations, (c) `Speech.speak()` + `getAvailableVoicesAsync()`, (d) tap→haptic+audio latency**; M6 gated on (a), M7 on (b)+(d); named fallback for the unmaintained `react-native-circular-progress`. (M1)
8. **Notifee is dead weight + double-delivery hazard** → **dropped `@notifee/react-native` entirely**; reminders ship on `expo-notifications` alone; removed Notifee from deps/sandbox/§1 rationale. (§1 table, M0, M1, M10)
9. **Offline TTS unverified for the non-reader + offline-first promise** → onboarding probes `getAvailableVoicesAsync()`; ships **pre-recorded CC0 fallback audio** for the onboarding script + seed labels + a one-time voice-install prompt. (M11, risk register)
10. **Web checkpoint self-contradictory (A–I required on web but needs haptics/audio)** → defined the **strict web subset** (boot + nav + visual-only celebration); M0 web acceptance = "renders + navigates"; M15 A–K run on iOS+Android with each item tagged PASS-subset/N/A on web. (§1b.10, M0, M15)
- **Minors also fixed:** Babel plugin → `'react-native-worklets/plugin'` (M0); `@gorhom/bottom-sheet` pinned `>=5.1.8` + picker screens re-authored against v5/v4 (M1/M9); `app.json` gains the `expo-notifications` config plugin (M0); audio-session/`UIBackgroundModes` decision recorded (no background audio → omitted) (§1b.1/M0); per-library New-Arch verdict + named circular-progress fallback (M1).

## MAJORS resolved — anti-shame / child-safety ethics

11. **Reinforcement thinning shrank the celebration as a function of the child's success** → **celebration magnitude decoupled from reinforcement phase**; phase thins ONLY the invisible bonus-token cadence; size is salience-driven (step vs routine-complete) with occasional deterministic UP only. (§1b.3, M2 `resolveCelebration`, M4/M8, invariant 3)
12. **`surprise_bonus` invited a variable-ratio (slot-machine) implementation** → bound to the **deterministic every-N cadence**, audit-logged, **no `Math.random` in any payout path**; copy de-randomized; unit test + M15 grep enforce it. (§1b.4, M4, M15, invariant 4)
13. **Over-claiming gate only scanned child/onboarding copy** → extended to **all surfaces** (welcome, paywall, parent dashboard, in-repo store copy) with a fixed reviewed claims allowlist; "treat/cure/clinically proven/fixes focus" forbidden everywhere; screen-time-as-reward must not be promoted/escalated. (M12, M15, invariant 9)
14. **Arithmetic/long-press gate inadequate for billing** → **parent-set PIN required on the purchase route** (in M12 acceptance now, though the buy is mocked); hard rule: no real processor may ever ship behind the arithmetic/long-press gate. (§1b.13, M9, M12, invariant 10)
- **Minors also fixed:** dropped the "type-enforced tone" claim (real control = fixed copy set + grep) and banned companion re-engagement strings (§1b.14, M10); single canonical **`CompanionMood`** union with repair→`content` + type/unit test (§1b.7, M3/M4/M6); paused-streak UI leads with `cumulativeCount`, "best:N" only as a non-losable badge (M8, invariant 2); cosmetic rotation is **additive-only**, no FOMO timers, rarity costs reachable, never real-money (invariant 11); added a COPPA parental data-review/export path (M9).

## MAJORS resolved — license compliance

15. **Reference-only grep can't detect copied code** → added a **`jscpd` clone-similarity scan vs the adhd-india + adhd-focus-mate trees** + a per-file **`PROVENANCE.md`** manifest with reviewer sign-off, alongside the string grep. (§1b.2/§1b.9, M0, M15, CONTRIBUTING)
16. **OFL attribution named the wrong font (Inter, never shipped)** → attribute the **real set: Fredoka + Lexend + locally-bundled OpenDyslexic** (OFL-1.1 text + author + reserved-font-name); flagged that locally-bundled fonts/assets evade `license-checker` and must be hand-added. (§1b.9, M0/M15)
- **Minors also fixed:** Apache-2.0 **NOTICE-file preservation** (not just license text) carried into M15, naming BSD MMKV native; `license-checker` scoped to **production deps**; `medtimer` recorded concept-only with an upstream-GPL reconfirm note; `collision.mp3` provenance must be verified or it is not shipped; `sidejot` prompt left unused for MVP. (§1b.9, M15)

## MAJORS resolved — completeness / coverage

17. **Tablet target had only a config flag** → responsive tokens (`contentMaxWidth`/`columns`/`breakpoints`) added to M2's resolver; **tablet smoke pass** added to M14 (iPad + Android tablet, both modes). (M2, M14)
18. **Companion nurture mechanic orphaned** → `bondLevel`/`growthStage` derived monotonically from `lifetimeEarned` with a rendered growth-stage change; "earning visibly advances the buddy" in M6 acceptance + shared assert in M8. (M6, M8)
19. **Companion mood-derivation unowned** → new `src/domain/companionMood.ts` rules table (event→mood + decay) authored in M4, wired to real events in M6 with acceptance. (M4, M6)
20. **Screen-time guardrails had fields but no milestone** → `limitPerWeek`/`cooldownHours` wired into M9 rewards-setup UI + M8 redemption enforcement ("come back later", never a punishment); `autoApproveRedeemUnderTokens` UI + escrow branch added. (M8, M9)
- **Minors also fixed:** resume-after-kill backed by **persisted run-progress** (M4/M7); `BadgeGrid` removed (badges deferred to v1) → cosmetics grid only (M4/M8); local-analytics event slice + opt-out reconciled to opt-IN with a settings row (M9); onboarding state machine reconciled to the built flow (M11); rarity-ladder + additive seasonal-rotation seam given a real home in M4 data shape + M6/M8 hooks; QA cases **J (reminders)** and **K (escrow/refund)** added (M15); completed-step "grey-out/done" visual added to `StepCard` (M7).

## MAJORS resolved — age-adaptive coverage

21. **Companion art selected by raw `ageMode` prop — violated the no-fork rule** → `BubbleBuddy` takes a **resolved `variant` key** (`buddy.artVariant`, driven by `companionStyle`) + `mood`, **never an `ageMode` prop**; M14 grep extended to flag any `ageMode=` prop. (§1b.7, M6, M14)
22. **Live side-by-side mode preview had no architectural support** → added a **scoped `<ThemeProvider overrideAgeMode>`** + optional hook override args (`useThemeTokens(opts?)`/`useCapabilities(opts?)`) in M2; referenced by M9/M11. (§1b.6/M2, M9, M11)
23. **Binary age bundle ignored the reading-age vs chronological-age split** → decoupled the highest-churn axes into **independent `companionStyle` (cuddly/cool) + `textFirst` overrides** (plus the already-independent `spokenLabelsEnabled`), each backed by a granular flag; a fluent non-reader can get picture/TTS-first without the babyish buddy. (§1b.6, M2/M4/M9)
24. **Two headline older-mode differentiators were table-only** → threaded end-to-end: **save-toward-a-goal** (`ProgressState.savingTowardRewardId` + `GoalBar`, gated by `showNumbersAndCharts`) and **kid-authored tasks** (`autonomy.canAddTasks` + a gated parent-approval proposal queue). (M4, M8, M9)
25. **`celebrationIntensity` defined 4× in 3 vocabularies with no precedence** → collapsed to **one `CelebrationLevel = full|medium|gentle|calm`** with a single precedence resolver (salience size → ageMode ceiling → sensory/calm/quiet-hours clamp; phase never reduces). (§1b.3, M2/M4/M7/M13)
26. **Theming's second axis (`sensoryMode`) missing from the data model + name-inconsistent** → added **per-child `sensoryMode: 'standard'|'lowStim'`** to `ChildSettings`; retired `stimLevel`/`'low'`; defined precedence with global `lowStimTheme`/OS reduced-motion/calm route; added to M3/M4 stores + M2 resolver inputs. (§1b.5, M2/M3/M4/M9/M14)
- **Minors also fixed:** young rewards list sliced by `maxChoices` (3) and premium `rewardMenuSize` capped at the curated ceiling 6, never `'unlimited'` (M8/M12); `customizationDepth` string replaced by independent booleans `canPickColor`/`canPickAccessory`/`canPickTheme` (§1b.6, M2/M4); "spoken reminders" over-claim corrected — notification sound + tap-through TTS, no background TTS (M10); age-pitched TTS pitch/rate added to `tts.ts` (M2); tablet dimension added to the resolver (M2/M14); typed `ModeKeyed<T>` forces both variants + an M14/M15 content-coverage check; kid step-reorder affordance for older added to the M7 runner.

---

## Effort re-sizing (net-new builds, expanded de-risk)

| Milestone | Was | Now | Why |
|---|---|---|---|
| M1 | M | **L** | sandbox now de-risks the real (SVG/modal/TTS/latency) surfaces |
| M2 | L | **XL** | override provider + celebration resolver + sensory axis + responsive/tablet tokens + content-coverage typing |
| M4 | L | **XL** | net-new domain/stores/seed (re-authored, not ported) + companionMood + bonus-determinism + run-progress |
| M8 | L | **XL** | net-new economy + nurture wiring + goal-bar + guardrails + non-drop paused UI |
| M15 | M | **L** | asset-license registry + manual review + clone scan + provenance + A–K on two platforms |

(M9 stays XL — already at ceiling but now explicitly net-new with re-authored pickers, PIN gate, the new overrides, guardrails, and the data-export path.)

## Explicitly deferred (with reason)

- **Real payment processor (RevenueCat/StoreKit/Play Billing)** — locked out of MVP; the mock + the PIN-on-purchase seam are built so the real processor drops in safely later.
- **Badge/Quest/Achievement engine** — deferred to the v1 novelty pipeline (doc 62 §15); MVP ships only the cosmetics/collectibles grid + the additive rotation seam.
- **Charts (`react-native-gifted-charts` + `react-native-linear-gradient`)** — v1 fast-follow; not needed for the core loop.
- **Multi-device sync** — out of MVP (offline-first); the per-child slice model + `storage` port keep it additive, and the analytics/mood slices are explicitly excluded from any future sync.
- **AI chunking (`sidejot` prompt)** — AI off by default; no `sidejot` text lifted for MVP; license + original-rewrite required if ever revived.
- **A third age band (teen 13+)** — architecture supports it (new token set + content variant + flag profile, zero component rewrites); not built for MVP.
