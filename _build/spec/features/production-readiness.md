# Feature Spec — Production Readiness

**Slug:** `production-readiness` · **Cross-cutting hardening (not a research feature #)** · **Status:** buildable delta on the shipped app
**Owner doc:** this file. Companion reads: `_build/spec/01-current-state.md` (§4.5 production hardening, §4.6 guardrails),
`_build/plan/66-MASTER-PLAN.md` (M0 scaffold, M15 ship gate, §1b.9 license, §1b.10 web-subset),
`_build/plan/62-data-model.md` (§3 migration/versioning), `_build/plan/61-design-system.md` (empty/calm states),
`_build/research/00-SYNTHESIS.md` (§4 must-avoid pitfalls, §3 trust-as-a-feature).

> **Build note (read first).** This is a **cross-cutting hardening spec**, NOT a user-facing feature. It makes the shipped
> app *shippable to the App Store / Play Store*: real EAS build profiles, a store-assets/metadata checklist, complete
> empty/edge/error/loading states, list virtualization + memoization, offline robustness guards, a coordinated
> data-migration/versioning strategy for the v1 feature specs, and **gating the two dev-only screens behind a build flag**.
> Most of the underlying infrastructure already exists and is green (see §0) — this spec adds the *thin glue + guards +
> checklists* that turn "runs in Expo Go" into "passes store review." Every path below is real. Mind the SPACE in the repo
> path `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles`.

---

## 0. What already exists (DO NOT rebuild)

Verified by reading the code on 2026-07-06. These production-relevant pieces are DONE and (mostly) tested:

| Capability | Where | State |
|---|---|---|
| EAS scaffold (dev/preview/prod profiles) | `eas.json` (`developmentClient`, `distribution:internal`, apk preview, `autoIncrement`, `appVersionSource:remote`) | PARTIAL — profiles exist but carry no env/channel/resource config |
| App config (icons, splash, notif plugin, tablet) | `app.json` (`icon`, `adaptiveIcon` full set, `splash-icon`, `notification-icon`, `expo-notifications`/`expo-audio` plugins, `ios.supportsTablet`, `scheme`, `bundleIdentifier`/`package`) | DONE — icon/splash/notif assets present |
| Offline-first storage + swappable port | `src/storage/storage.ts` (AsyncStorage default + web localStorage shim + optional MMKV stub), `persist.ts`, `StoreHydrationGate.tsx` | DONE |
| Forward-only migration engine + repair | `src/storage/migrations.ts` (`MIGRATIONS`=[] at `SCHEMA_VERSION 1`, `mergeWithDefaults`, `validateAndRepair`, `migrateAndRepair`) | DONE — engine ready, empty registry |
| Loading gate (hydration + fonts) | `components/StoreHydrationGate.tsx` (blocks first frame until all persisted stores rehydrate), `app/_layout.tsx` (`useFonts` splash gate) | DONE |
| Kid empty/complete state | `components/kid/DaypartDonePanel.tsx` (calm "all done for now"), `app/(kid)/index.tsx` (forward-only, never `routines[0]`) | DONE |
| No network egress anywhere | grep of `app`/`src`/`components` for `fetch(`/`axios`/`XMLHttpRequest`/`http(s)://` returns ZERO | DONE (offline-first by construction) |
| Notifications no-throw wrapping | `src/services/notifications.ts` (every native call `try/catch`, import-safe) | DONE |
| Dev-only diagnostic screens | `app/_sandbox.tsx`, `app/_theme-gallery.tsx` (reachable by direct route; registered in `app/_layout.tsx` Stack) | PRESENT but **NOT gated** — reachable in a store build |
| Production gate-mode assert | `src/services/parentGate.ts` (`effectiveGateMode` coerces `'none'`→`'math'`; `assertProductionGateMode` throws in non-`__DEV__`) | DONE |
| On-device data review + delete | `app/(parent)/settings.tsx` `DataReview` (full JSON, selectable), `wipeAllChildData`, `resetAllTbData`/`resetChildData` | DONE (see §2.4 perf caveat) |
| License / provenance artifacts | `LICENSE`, `THIRD_PARTY_NOTICES.md` (incl. Bundled assets section), `PROVENANCE.md`, `CONTRIBUTING.md` | DONE |

**The DELTA this spec adds (nine workstreams):**
1. **EAS build config + profiles** — env vars, channels, resource classes, runtime-version policy, submit config, **camera permission strings + OS-backup-exclusion flags** (§2.1, §2.7, §4).
2. **App-store assets/metadata checklist** — privacy policy doc, Data-Safety / Privacy-Nutrition answers (**honest re: child-triggered camera + no OS-cloud-backup**), screenshots, age rating / Kids-Category decision, honest copy (§2.2, §4).
3. **Empty / edge / error / loading states across screens** — a global `ErrorBoundary`, per-screen empty states, a hydration-timeout fallback (§2.3).
4. **Performance** — `React.memo` on list-item components, `FlatList`/virtualization for potentially-large lists, `useMemo` on heavy derivations, bounded data-review dump (§2.4).
5. **Offline robustness** — a no-network CI grep gate, airplane-mode acceptance, graceful native-unavailable fallbacks (§2.5).
6. **Data migration/versioning for all new features** — a coordination rule + a golden-fixture forward-migration regression test + a schema-round-trip audit (§3).
7. **Gating dev-only screens behind a flag for store builds** — a central `flags.ts` + per-screen redirect guard + a grep gate (§2.6, §3.1).
8. **OS-level backup exclusion (the load-bearing "nothing leaves the device" fix)** — turn OFF iCloud/Google auto-backup of the app container + child photo files so the store "No data collected/shared" claim is TRUE (§2.7).
9. **Test-tooling harness** — wire the Reanimated jest mock + standardize on the installed `react-test-renderer` so the component render-tests other milestones mandate can actually be authored (§2.8). Front-loaded into M-A4.

*(Workstream split across milestones: **M-A4** front-loads 3, 6, 7, 8-flags, 9 + the front-loadable parts of 4/5; **M-D2** does 1, 2, 8-store-gate + the closing pass of 4/5/6. See `00-MASTER-ROADMAP.md` §1.)*

---

## 1. Overview + user value

Production readiness is **infrastructure, not a feature** — but it is directly load-bearing on the two things the research says
decide survival in this category: **trust and retention.**

- **Trust is a feature in a low-trust category.** The entire corpus flags surprise-cloud-upload, billing dark patterns,
  crashes, and shame mechanics as the top churn/"scam" drivers, and the FTC actively enforces against children's products
  (`00-SYNTHESIS.md` §4 pitfalls 1/3/4/6; §5 "offline-first / no backend is the right privacy posture for a children's
  product"). A store build that (a) leaks no data, (b) never crashes into a scary red screen, (c) ships an honest privacy
  policy + "no data collected" store labels, and (d) hides all dev/debug surfaces is the *concrete* expression of that trust.
  This is a market/community-demand justification, **not** an efficacy claim.
- **Stability is retention.** The population is abandonment-prone (`00-SYNTHESIS.md` §6.5, high individual variability); a
  single crash or a hung white screen at launch is a documented uninstall trigger for ADHD users (`30` §3.5 overwhelm →
  "I gave up"). Empty/loading/error states that stay calm and forgiving are the same anti-shame design rule applied to
  *failure modes of the software itself*.
- **Honesty over the store listing.** The synthesis is explicit: **never market core-symptom "treatment"** (EndeavorRx's RCT
  *failed* on symptom ratings; token-economy/PTBM evidence is on behavior/parenting, not core symptoms —
  `00-SYNTHESIS.md` §4 pitfall 6, §6.4). The store copy + metadata this spec locks say "builds routines / reduces morning
  conflict," never "treats/cures/fixes ADHD."

**Scientific framing (honest):** there is **no science claim** attached to build config, error states, or migrations. The
only research-anchored decisions here are *negative* constraints (no data egress → §2.5; no shame in error copy → §6; no
treatment claims in store metadata → §2.2). Everything else is standard mobile-release engineering.

---

## 2. UX behavior — workstream by workstream

All parent surfaces stay dense/utilitarian behind the PIN gate; all kid surfaces stay big/playful. **No component reads raw
`ageMode`** — presentation comes from resolved capability flags / `resolveContent` / `ageModeLabel`
(`01-current-state.md` §1.5). Copy goes through `resolveContent` (both `young` + `older` variants forced at compile time)
wherever a child could see it. Error/empty states honor `sensoryMode==='lowStim'` and `calmMode` clamps (no confetti, no
bounce; gate any Reanimated entrance on `useReducedMotion()`).

### 2.1 EAS build config + profiles (`eas.json`, `app.json`)

No UX — this is the build matrix. The shipped `eas.json` has three bare profiles; harden them to:

- **`development`** — `developmentClient:true`, `distribution:internal`, `env: { EXPO_PUBLIC_TB_DEV_SCREENS: "1" }` (turns the
  dev diagnostic screens ON, §2.6), `channel:"development"`.
- **`preview`** — internal QA build (apk on Android, ad-hoc/TestFlight on iOS), `env: { EXPO_PUBLIC_TB_DEV_SCREENS: "1" }`
  (QA still wants `/_sandbox` + `/_theme-gallery`), `channel:"preview"`, `distribution:internal`.
- **`production`** — store build. **NO `EXPO_PUBLIC_TB_DEV_SCREENS`** (dev screens OFF), `autoIncrement:true`,
  `channel:"production"`, and (if using EAS Update) an `expo-updates` `runtimeVersion` policy pinned so an OTA update can
  never load a bundle built against an incompatible native runtime. Because the app is **offline-first with no server**, EAS
  Update is OPTIONAL and, if omitted, must be omitted cleanly (no half-wired update channel that phones home — that would
  violate the no-egress guarantee, §2.5). Default recommendation: **ship WITHOUT `expo-updates`** for v1 (simplest, most
  private); document the decision in `RUN.md`.
- **`submit.production`** — fill in `ios` (`appleId`, `ascAppId`, `appleTeamId` placeholders) + `android`
  (`serviceAccountKeyPath` placeholder) so `eas submit` is one command. Values are secrets, referenced not committed.
- **Native config already in `app.json`** stays; add only what store review needs: an `ios.infoPlist` note that there are
  **no** `UIBackgroundModes` (no background audio — matches doc 66 §1b.1), and confirm no permission strings are requested
  that the app never uses.
- **Camera/photo permission (RECONCILED — verify-undo IS in the feature-complete set).** An earlier draft assumed no
  camera in v1; that is now WRONG: **`verify-undo` (M-B2) adds an optional child photo-verify via `expo-image-picker`**, so
  the feature-complete store build DOES request camera/photo. This spec's M-D2 store gate MUST therefore:
  (a) register the **`expo-image-picker` Expo config plugin** in `app.json` with honest `cameraPermission` +
  `photosPermission` strings (e.g. *"Tiny Bubbles can take an optional photo to help a grown-up confirm a chore is done. Photos
  stay on this device."* — NO medical claim, no "required"); this generates `NSCameraUsageDescription` /
  `NSPhotoLibraryUsageDescription` on iOS and the `CAMERA` permission on Android. `verify-undo.md` §4 also names this — the
  two must agree.
  (b) update the **Data-Safety / Privacy-Nutrition** answer to honestly cover **on-device photo capture** (still "not
  collected / not shared" because it never leaves the device — see §2.7 — but the camera *permission* is disclosed).
  (c) record a **Kids-Category decision** on child-triggered `launchCameraAsync` (§2.2): photo-verify is optional,
  parent-enabled per task, never required, and photos never leave the device (§2.7) — acceptable under Designed-for-Families
  provided the usage string is honest and the capability is off by default. Confirm whichever store path (§2.2) is chosen
  tolerates an optional child-facing camera; if not, ship with photo-verify's config disabled (the feature already
  feature-detects and no-ops when the picker is unavailable — `verify-undo.md` §2.1).

### 2.2 App-store assets / metadata checklist (mostly non-code)

A tracked checklist (put it in `RUN.md` under a new "Store release" section, and create the one missing doc):

- **Icons / splash / adaptive** — present (`assets/icon.png`, `assets/splash-icon.png`, `assets/android-icon-*`,
  `assets/notification-icon.png`, `assets/favicon.png`). **Verify** final art at all required densities; no placeholder art
  ships. (Checklist item, no code.)
- **Privacy policy** — **CREATE** `store/privacy-policy.md` (and host it at a stable URL for the store forms). Content is
  short and true: *no account, no cloud, no analytics SDK, no ads, no third-party data sharing; all data stays on the device;
  the only optional data (usage insights, mood logs) is on-device and off by default; local notifications only.* This is the
  offline-first story the settings screen already tells (`app/(parent)/settings.tsx` Privacy card) written for store review.
- **Data Safety (Google Play) / Privacy Nutrition Label (Apple)** — answer **"No data collected / No data shared."** Justified
  by the zero-egress grep (§2.5) **AND the OS-backup-exclusion in §2.7** (without §2.7 this answer is FALSE — AsyncStorage +
  photo files would ride iCloud/Google auto-backup off the device). Local notifications and on-device storage are not
  "collection." **Disclose the camera/photo permission** (optional child photo-verify, §2.1) — the *permission* is declared,
  but because the photo never leaves the device the "not collected/not shared" answer still holds. This declaration is only
  honest once §2.7 ships; the M-D2 gate blocks the store submission until the §2.7 flags + the acceptance test are in place.
- **Age rating / kids positioning** — the app targets ~4–12 with a parent payer. Decide ONE of: (a) a normal listing rated for
  children, or (b) Apple **Kids Category** / Google **Teacher/Designed-for-Families**. The stricter kids programs FORBID
  third-party analytics/ads and require a privacy policy — **the app already satisfies both** (no analytics SDK, no ads,
  privacy policy above), so either path is open. Record the choice in the checklist. **Child-triggered camera decision
  (§2.1c):** the optional photo-verify (`verify-undo`, M-B2) lets a *child* invoke `launchCameraAsync`; under kids programs
  this is permissible because it is (i) parent-enabled per task and OFF by default, (ii) never required to complete/earn
  (verify is never a gate), (iii) on-device only with no upload path (§2.5) and excluded from OS backup (§2.7), and (iv)
  covered by an honest usage string (§2.1a). Record this decision; if the chosen store path rejects a child-facing camera,
  disable photo-verify's config (it self-degrades). Note: the mock paywall is fine, but the **real** billing (later spec) must
  use the platform's kids-safe purchase rules + the PIN gate (`§1b.13`, already enforced).
- **Store listing copy** — honest framing ONLY: "a calm, playful way to build routines and reduce morning conflict — not a
  medical treatment" (mirrors `app/(onboarding)/index.tsx` welcome copy). **Banned in listing + screenshots:** "treats /
  cures / fixes ADHD," "clinically proven," symptom claims (`00-SYNTHESIS.md` §4 pitfall 6). A grep-able copy rule.
- **Screenshots** — capture from the real app on a phone + tablet (`ios.supportsTablet:true`), both age modes, showing the
  calm core loop + celebration + parent dashboard. No dev screens in any screenshot. (Checklist item.)
- **Support URL / contact** — a reachable email/URL (checklist item).

### 2.3 Empty / edge / error / loading states across screens

The single most user-visible hardening workstream. Enumerated per surface; **calm, forgiving, never blaming**.

**Global error boundary (NEW — none exists today).** Add a root React error boundary so an unexpected render/runtime error
shows a **calm recovery screen instead of a red box / white crash**. Because the app is offline and privacy-first, this
boundary must **NOT** send any crash telemetry off-device (a network crash reporter would violate §2.5 and the "no data
leaves the device" promise). Instead it renders `components/ui/ErrorScreen.tsx` — a gentle bubble + one line ("Let's try that
again 🫧") + a single "Reload" button (`expo-router` `router.replace('/')` or a state reset) + a small parent-only "copy
details" affordance for manual bug reports. Optional: stamp an additive `AppMeta.lastRecoveredAt?` for local diagnostics
(§3). Wire it two ways: (a) a class `RootErrorBoundary` wrapping the tree in `app/_layout.tsx`, AND (b) expo-router's
route-level `export function ErrorBoundary(props) { … }` in `app/_layout.tsx` so a per-route render error is caught by the
router too. The screen honors low-stim/calm (no animation) and is age-neutral (a child could see it), so copy stays picture +
one short spoken-able line.

**Loading states.**
- **Hydration gate** (`components/StoreHydrationGate.tsx`) already blocks the first frame until stores rehydrate. **EDGE FIX:**
  add a **max-wait fallback** — if hydration hasn't completed within ~4s (a wedged/corrupt store), render children anyway on
  top-of-defaults rather than hanging on a white screen forever. (`useStoresHydrated()` returns false indefinitely today if a
  store never fires `onFinishHydration`.) The fallback is safe because `validateAndRepair` guarantees safe defaults.
- **Fonts gate** (`app/_layout.tsx`) already proceeds on `fontError`. Keep.
- **Splash** — `expo-splash-screen` hides on fonts-resolved. Keep; ensure it also hides if the boundary catches during boot.

**Empty states (per screen).**
- **Kid home** (`app/(kid)/index.tsx`) — DONE via `DaypartDonePanel` (nothing scheduled / all done). No change.
- **Kid rewards** (`app/(kid)/rewards.tsx`) — if `visibleRewards` is empty (parent defined none / all at their weekly limit),
  show a calm "Nothing to trade for right now 🫧 — check back soon," never an error. Add if missing.
- **Kid buddy / peek** — always have content (seeded buddy; peek lists dayparts). No empty case.
- **Parent dashboard** (`app/(parent)/dashboard.tsx`) — **no children yet** (shouldn't happen post-onboarding, but a wipe can
  cause it): show "Add your first child" CTA, not a blank list. **No routines active:** the daypart roll-up shows "not
  started" (anti-shame), already handled.
- **Parent tasks** (`app/(parent)/tasks.tsx`) — **no routines** in a daypart section: "No chores here yet — add one." **No
  pending proposals:** hide the proposals block (already conditional).
- **Parent rewards-setup** (`app/(parent)/rewards-setup.tsx`) — **no rewards:** "Add a reward your child can save toward."
- **Parent children** (`app/(parent)/children.tsx`) — always ≥1 post-onboarding; guard the wiped case with the dashboard CTA.

**Edge states.**
- **Corrupt persisted blob** — already handled by `safeParse`/`loadSlice`/`validateAndRepair` (never crashes, never a
  punishing zeroed state). Add a regression test (§3).
- **Notifications permission denied / unavailable (Expo Go, web)** — already no-throw; the reminders toggle simply schedules
  nothing. Surface a quiet `Note` in settings when permission is denied ("Reminders are off in your phone's settings"),
  never an error.
- **Trial expiry with premium cosmetics equipped** — already non-punishing (`entitlements.ts` §1b.11: acquisition-only). Keep
  the invariant test (a downgrade changes zero visible child content).
- **Clock/timezone edge** — daypart engine is DST-safe (`__tests__/domain/edge-dst.test.ts`). No change.

**Young vs older / low-stim for all the above:** empty/error copy resolves via `resolveContent` (young = shorter + auto-spoken;
older = text). Low-stim/calm: no bubble-drift, no bounce on the error/empty illustration; single-hue. The error screen is
deliberately mode-neutral and minimal so it is safe under any resolver state (including a pre-hydration crash where no profile
is available — fall back to `young`/`standard` defaults, matching `app/_layout.tsx` ThemedRoot's no-profile branch).

### 2.4 Performance — list virtualization + memoization

Current lists render with `.map()` inside `ScrollView`. For the shipped sizes most are fine; the targeted fixes:

- **Virtualize the genuinely-unbounded/large lists** with `FlatList` (built into RN, already a transitive dep — no new lib):
  - The template picker in `app/(parent)/tasks.tsx` (`TASK_TEMPLATES.map`, grows as templates are added; also the assign
    sheet) → `FlatList`/`BottomSheetFlatList` with `keyExtractor` + `getItemLayout` where item height is fixed.
  - Any ledger/history list if one is ever rendered in full (today only counts are shown — keep it that way).
- **Bound the settings data-review dump** (`app/(parent)/settings.tsx` `DataReview`): today it `JSON.stringify`s the ENTIRE
  store (all children × up-to-500 ledger entries each × moods × events) into one selectable `<Text>` — that can be megabytes
  and jank the settings screen. Fix: (a) keep the cheap **counts** table always, (b) render the full JSON **lazily/behind a
  second tap** ("Show full record"), and (c) cap/paginate or stream it (e.g. omit `entries`/`events`/`moods` arrays from the
  inline dump and point to the backup/export file for the complete record — which the clinician-reporting spec's
  `exportBackup()` already produces). This also fixes a real memory spike on low-end devices.
- **Memoize list-item components** with `React.memo` so a parent re-render doesn't re-render every row:
  `ChildCard` (`dashboard.tsx`), `RewardCard` (`components/rewards/RewardCard.tsx`), `StepCard`
  (`components/task/StepCard.tsx`), `CollectiblesGrid` items, template rows. Pair with **stable callbacks** (`useCallback`)
  and **stable keys** (never array index for reorderable lists).
- **`useMemo` heavy pure derivations** that run on every render: the daypart roll-up (`summarizeDayparts` in the dashboard),
  `selectDaypartRoutine`, the reward `Map` builds (`new Map(...)` in `dashboard.tsx`/`(kid)/index.tsx`/`peek.tsx`) — wrap in
  `useMemo` keyed on the underlying store slice so they don't rebuild per keystroke.
- **BubbleBuddy** (`components/buddy/BubbleBuddy.tsx`) already uses shared values; confirm its Reanimated loops are paused/
  cheap under `useReducedMotion()` (they are, per M2), and that it is `React.memo`'d where embedded in lists (e.g. a switcher).
- **Guardrail:** performance work must not change behavior or add a dependency. `@shopify/flash-list` is explicitly DEFERRED
  (`66-MASTER-PLAN.md` M1) — use RN `FlatList`; only revisit FlashList if a profiled list actually janks.

### 2.5 Offline robustness

The app is offline-first by construction; this workstream *locks it in* and proves it.

- **Zero network egress — enforced by CI grep.** Add a gate (`__tests__/config/no-network.test.ts`) that greps `app/`,
  `src/`, `components/` for real client-call tokens — `fetch(`, `axios`, `XMLHttpRequest`, `WebSocket`,
  `navigator.sendBeacon` — plus `http(s)://` literals; **fails** on any hit outside the exclusion set. Today this returns zero
  — the gate keeps it zero as features land (mirrors the AI-network gate in `66-MASTER-PLAN.md` §1b.12). Especially important
  for the `ActivityEvent`/`MoodLog` slices, which must **never** be read by any upload path.
- **The jest gate MUST replicate the exact BUILD-GUIDE §3 exclusion set** so it doesn't false-positive on legitimate
  non-egress literals: exclude **comments** (`//`, `*`), **`docs.expo.dev`** (the AGENTS doc pointer), **`schema`**, and
  **`xmlns`** (the SVG namespace `xmlns="http://www.w3.org/2000/svg"` that `clinician-reporting`'s `reportHtml.ts` embeds in a
  self-contained HTML/SVG string — a string literal, not a network call). Test only real client-call tokens; a generated
  HTML/SVG namespace or a documentation URL must NOT trip the offline floor. Codify the exclusion regex as a shared constant so
  the shell grep (BUILD-GUIDE §3) and this test stay in lockstep.
- **Airplane-mode acceptance.** The whole core loop (assign → run → complete → celebrate → token → nurture → redeem) already
  works with no network (no calls exist). Acceptance test: run it in airplane mode / with `expo start --offline`.
- **Graceful native-unavailable fallbacks (Expo Go + web subset).** Every native touchpoint already no-throws:
  notifications (`try/catch`), audio (cue registry idempotent), TTS (`Speech.getAvailableVoicesAsync()` probe with a
  pre-recorded fallback path per onboarding). Confirm the same for any NEW native call a feature adds; the web subset
  (`66-MASTER-PLAN.md` §1b.10) is "renders + navigates," with haptics/audio/notifications tagged N/A.
- **No `expo-updates` phone-home** unless deliberately enabled with a private channel (see §2.1) — default off for v1.
- **Storage backend swap is offline-safe:** the AsyncStorage default + web localStorage shim + optional MMKV all satisfy the
  same synchronous-feeling port (`src/storage/storage.ts`); no path assumes a server.

### 2.6 Gating dev-only screens behind a flag for store builds

Two diagnostic screens ship in the repo and are **reachable by direct route even in a production bundle**:
`app/_sandbox.tsx` (native-surface probe) and `app/_theme-gallery.tsx` (age/sensory theming). expo-router bundles every file
under `app/` and (per the sandbox file's own comment) underscore-prefixed files are routable, so **removing the two
`<Stack.Screen>` lines is not enough** — the routes still resolve. Gate them behind a build flag:

- **Central flag** — CREATE `src/config/flags.ts` exporting `DEV_SCREENS_ENABLED = (typeof __DEV__ !== 'undefined' && __DEV__)
  || process.env.EXPO_PUBLIC_TB_DEV_SCREENS === '1'`. So dev screens are ON in `__DEV__` (local) and in any EAS profile that
  sets `EXPO_PUBLIC_TB_DEV_SCREENS=1` (development/preview, §2.1); OFF in `production` (flag unset).
- **Per-screen guard** — at the top of each dev screen's default export: `if (!DEV_SCREENS_ENABLED) return <Redirect href="/" />;`
  (`expo-router`'s `<Redirect>`), so even if someone deep-links `/_sandbox` in a store build they land back on the boot
  redirect. This is the robust runtime guard regardless of bundling.
- **Conditional registration** — in `app/_layout.tsx`, wrap the two `<Stack.Screen name="_sandbox" />` /
  `name="_theme-gallery"` lines in `{DEV_SCREENS_ENABLED && ( … )}` so they don't even appear in the navigator in prod.
- **CI grep gate** — a script asserting that a production export does not surface these routes (grep the built route manifest,
  or simply assert the guard exists in both files). Also update `RUN.md` (its "Dev diagnostic screens" section already
  documents manual deletion — replace with the flag story so nobody has to hand-delete).
- The same flag can gate any future debug affordance (a hidden long-press menu, etc.) so there is ONE switch.

### 2.7 OS-level backup exclusion — the load-bearing "nothing leaves the device" fix (BLOCKER)

The store declaration (§2.2), the settings/privacy copy, and the report/backup footers all promise **"nothing is uploaded /
everything stays on this device / no data collected."** That promise is **FALSE by default**: iOS **iCloud Backup** and Android
**Auto Backup / Google Drive** sweep the app's data container by default, so all `tb/` AsyncStorage slices (mood logs, ledgers,
behavioral history) AND the `verify-undo` photo `file://` files leave the device via the OS backup provider. The no-network
grep (§2.5 / BUILD-GUIDE §3) inspects app code only and **cannot** detect this. This is exactly the "surprise-cloud-upload"
posture §1 says to avoid, and it is the one blocker between the app and an honest Data-Safety answer. **Fix (required before the
"nothing leaves the device" claim is allowed):**

- **Android — disable auto-backup of the container.** In `app.json` set `android.allowBackup: false` (Expo passes this to the
  manifest's `android:allowBackup`). This stops Android Auto Backup / Google Drive from copying `tb/` AsyncStorage + photo
  files. (If a future release wants selective backup, use `fullBackupContent`/`dataExtractionRules` excludes instead — but v1
  ships `allowBackup:false`, the simplest honest default.)
- **iOS — exclude the data + photos from iCloud/iTunes backup.** AsyncStorage's store lives under the app's Documents/Library.
  (a) For **child photo files**, write them (via `expo-image-picker` → copy into) a dedicated dir under
  `FileSystem.documentDirectory + "tb-photos/"` and set **`NSURLIsExcludedFromBackupKey`** on that dir (SDK-56
  `expo-file-system` exposes this via the `File`/`Directory` API — or the legacy `FileSystem` on iOS). (b) Prefer storing photos
  under **`FileSystem.cacheDirectory`** where feasible (caches are not backed up), balancing that the OS may evict caches — for
  verify photos (short-lived, re-capturable) cache is acceptable; if durability is wanted, use the excluded Documents subdir.
  (c) The AsyncStorage container itself is best excluded at the native layer; where a JS-only hook isn't available, the honest
  fallback is: keep `allowBackup:false` on Android, exclude the photos dir on iOS, and if the AsyncStorage sqlite/plist cannot
  be excluded purely from JS in Expo Go, **document that limitation in `store/privacy-policy.md`** and gate the absolute
  "nothing is uploaded" wording accordingly (say "we do not upload your data; if you have iCloud Backup on, iOS may include
  the app in your personal encrypted device backup" — honest, not a server upload).
- **Verification (acceptance).** Add `__tests__/config/backup-exclusion.test.ts`: assert `app.json` has
  `android.allowBackup === false`, and assert the photo-write path targets the excluded/cache dir (grep
  `verify-undo`'s `photoVerify.ts` / the backup service for the `tb-photos` dir + the exclusion call). The M-D2 store gate is
  BLOCKED until this passes; only then may the "No data collected/shared" answer (§2.2) and the absolute privacy copy ship.
- **This is coupled to verify-undo's photo lifecycle** (`verify-undo.md` §9.3, now a GUARANTEE): a prior photo is deleted on
  re-verify, on `wipeAllChildData`/delete-child, and on restore-replace — so the excluded photo dir never accumulates orphans.

### 2.8 Test-tooling harness — make the mandated component render-tests authorable (M-A4, front-loaded)

Two Wave-B/C specs mandate **React component render-tests** (`visual-timers.md` §4 `visualTimer.test.tsx`,
`breathing-regulation.md` §4 `breathingBubble.test.tsx`) that assert render output (numeric readout only when `showNumbers`,
`onEmpty`/`onCycle` fire counts, reduced-motion stepped path). Today the repo has **no render-test precedent** (the two existing
"component" tests are pure-logic `.test.ts`), `@testing-library/react-native` is **not installed** (and BUILD-GUIDE §0 forbids
un-specced deps), and **`react-native-reanimated`'s jest mock is not wired**, so any component calling `withTiming`/
`useAnimatedProps` throws under jest. `react-test-renderer@19.2.3` **is** installed. M-A4 stands up the harness so B1/C2 can
author their render-tests without re-planning or a new dep:

- **Wire the Reanimated jest mock.** In `jest.setup.js` add `jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'));` (the mock ships in `node_modules/react-native-reanimated/mock.js`) plus any
  worklet no-op init, so `withTiming`/`withSequence`/`useAnimatedProps`/`useSharedValue` resolve to synchronous stubs under
  jest. Confirm `react-native-gesture-handler`'s jestSetup is required too if a rendered component uses it (`VolumeSlider`).
- **Standardize on the installed `react-test-renderer`** (NO new dep). Provide a tiny local helper
  `__tests__/helpers/render.tsx` wrapping `TestRenderer.create(<ThemeProvider>…</ThemeProvider>)` with a default child
  profile, exposing `root.findAll`/`findByProps` for the assertions the two specs list. NativeWind `className` interop renders
  fine under `react-test-renderer` (styles collapse to props); tests assert on component props/text, not computed styles.
- **Downgrade note for the two specs:** the *render* assertions stay, but the **behavioral core** (`onEmpty` fires once,
  remaining/fraction/format, stepped-vs-smooth selection) is already covered by the pure `src/domain/timer.ts` /
  `src/domain/breathing.ts` unit tests — those are the load-bearing assertions; the `.test.tsx` render test is a thin shell
  over this harness. If the harness proves flaky for a given agent, the render assertion may fall back to a pure-logic test of
  the extracted domain module + a manual/dev-client check, but the DEFAULT is the wired harness above.
- This lands in **M-A4** (before M-B1/M-C2 consume it), so the green floor holds for every mandated `.test.tsx`.

### 2.9 Known-gap dispositions at the ship gate (previously-orphaned current-state items)

Three `01-current-state.md` §4.5 gaps had no milestone owner. This spec adopts them so "feature-complete" is verifiable:

- **OpenDyslexic font activation (§4.5 #17) — OWNED (split M-A3 wiring + M-D2 ship-gate decision).** The `openDyslexicFont`
  setting persists and is advertised as a FREE accessibility control, but is inert until the font binaries ship + `src/theme/
  fonts.ts` is wired. **M-A3 (accessibility-i18n)** owns the `fonts.ts` `fontFamily` plumbing so the toggle *takes effect when
  the binaries are present* (bundling OpenDyslexic-Regular/Bold via `expo-font`, resolving the app font family from the
  setting). The **binary `.otf`/`.ttf` files are an out-of-band orchestrator prerequisite** (a code-agent cannot author a
  font; same posture as the CC0 soundscape loops — roadmap §6). **M-D2 ship-gate rule:** if the binaries are bundled and
  `fonts.ts` is wired, ship the working toggle; **if the binaries are NOT bundled, the toggle MUST be hidden/disabled** in
  `settings.tsx` (an advertised free control must never be a silent no-op). An acceptance test asserts: either the font family
  resolves to OpenDyslexic when the setting is on AND the binaries are registered, OR the toggle is not rendered.
- **Parent-tunable daypart windows (§4.5 #18) — DEFERRED (explicit, with rationale).** `DaypartWindows` is typed as tunable but
  only `DEFAULT_DAYPART_WINDOWS` is used. Adding a parent settings control is **out of scope for feature-complete v1**: the
  default windows (morning 5 / afternoon 12 / evening 17 / night 21) serve the target routines, and the type is already
  forward-compatible (a future `ParentSettings.daypartWindows?` optional field + a settings row is a purely additive delta,
  no migration). Deferring avoids a low-value settings-surface expansion. Recorded here (and in `00-MASTER-ROADMAP.md` §1) as a
  deliberate deferral, not a silent omission — mirroring how #23 (auto-breakdown, ZERO-AI) and #25 (HSA/FSA, non-code) are
  dispositioned.
- **Demo-companion `DEMO_ID` fallback cleanup (§4.5 #20) — OWNED (M-D2 one-line cleanup).** The pre-onboarding `DEMO_ID`
  companion path in `app/(kid)/buddy.tsx` is dead in the onboarded flow. M-D2 removes it as a one-line hardening task (or, if a
  builder finds it still guards a genuine pre-seed race, keeps it with a clarifying comment). Not a blocker; tracked so it
  isn't dropped.

---

## 3. Data-model additions

Production-readiness is deliberately **almost data-model-free** — its job is to protect the model, not extend it. The only
additions are a non-persisted config module and (optionally) one additive diagnostic field. **All additive → no
`SCHEMA_VERSION` bump** (§3.2).

### 3.1 Build-flag config — `src/config/flags.ts` (NEW, not persisted)

```ts
/** Central build/runtime flags. Not persisted; derived from __DEV__ + EXPO_PUBLIC_* env. */
export const DEV_SCREENS_ENABLED: boolean =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.EXPO_PUBLIC_TB_DEV_SCREENS === "1";
```
(No store slice, no migration — read at module load. Env comes from `eas.json` per-profile `env`.)

### 3.2 Optional additive diagnostic field — `src/domain/types.ts` `AppMeta` (OPTIONAL)

Only if the error boundary wants a local breadcrumb (nice-to-have, not required):
```ts
export interface AppMeta {
  // …existing…
  /** Epoch ms the RootErrorBoundary last recovered from a caught error (local diagnostics only). */
  lastRecoveredAt?: EpochMs;
}
```
Set via `settingsStore` from the boundary. **Optional + on-device-only** → `mergeWithDefaults` fills its absence; **no bump**.
If product doesn't want it, omit it entirely.

### 3.3 Migration / versioning strategy for ALL new features (the core of workstream 6)

This spec OWNS the cross-feature versioning discipline the v1 specs each rely on. The shipped engine
(`src/storage/migrations.ts`) is forward-only, total, and unknown-key-preserving, and `SCHEMA_VERSION` is **1** with an empty
`MIGRATIONS` registry. The rule set:

1. **Additive-only fields need NO bump.** Every v1 feature spec (multi-child `SharedChore`/`Task.choreId`, clinician
   `lastBackupAt`, novelty seasonal packs, mood-checkin, visual-timers `Task.timerSeconds` already present, verify-undo
   `Verification`, if-then plans, focus-intervals, soundscapes) adds **optional** fields or **brand-new independently-persisted
   store slices**. `mergeWithDefaults` overlays new optional field defaults onto old blobs, and a new store slice hydrates from
   its own `partialize` default. This is the exact pattern doc 70 used for `Routine.daypart`. **No bump for any of these.**
2. **When a bump IS required** (a field changes shape/meaning, or an existing field is removed/renamed): bump
   `SCHEMA_VERSION` to 2, add a `{ from: 1, to: 2, migrate }` entry to `MIGRATIONS` that spread-merges the new default and
   transforms only the changed key (engine preserves unknown keys). Because per-store `version` defaults to `SCHEMA_VERSION`
   (`persist.ts`), also provide each affected store's `migrate` callback OR rely on the assembled-state `migrateAndRepair`;
   **align the two so a store `version` and the global `SCHEMA_VERSION` never disagree silently.** (Today they're equal — keep
   them equal, or set explicit per-store versions when they diverge.)
3. **Newer-build data is never downgraded** — `runMigrations` returns a future blob untouched, so a store rollback mid-release
   can't strip newer keys (`migrations.ts` doc). Keep this property; don't add destructive migrations.
4. **A golden-fixture forward-migration regression test (NEW).** CREATE `__tests__/storage/migration-forward.test.ts`: capture
   a **v1 pre-feature snapshot** (a realistic `RawState` blob with one child, ledger, progress, companion, tasks — as the
   shipped app writes it today) as a fixture, run `migrateAndRepair(fixture, 1)` after all v1 feature fields exist, and assert:
   (a) it never throws, (b) every new optional field is present-with-default, (c) no existing value is lost or altered, (d) all
   anti-shame invariants hold (mood valid-positive, balances ≥ 0, no `failed` status). This is the safety net that lets each
   feature claim "additive, no bump" honestly.
5. **A schema round-trip audit (NEW).** CREATE `__tests__/storage/schema-roundtrip.test.ts`: for each persisted store, take its
   default state → `JSON.parse(JSON.stringify(...))` → `mergeWithDefaults(parsed, default)` and assert deep-equality (proves
   every default shape is JSON-safe and merge-stable — catches a non-serializable field or a `mergeWithDefaults` gap before it
   ships). Also assert every `CHILD_SLICES` name in `schemaVersion.ts` has a corresponding store default.
6. **Backup/restore is a migration client.** The clinician-reporting spec's `importBackup()` runs imported data through
   `migrateAndRepair` before writing (`clinician-reporting.md` §2.3/§3.5). This spec's rule #4 fixture doubles as the
   import-path regression (an old backup file must restore cleanly). Confirm the backup envelope stamps `schemaVersion` so a
   future importer knows which migrations to run.

### 3.4 Which stores / where (no new persisted slice from THIS spec)

- Reads/writes only through the existing `settingsStore` (optional `lastRecoveredAt`) and the existing migration/persist
  modules. No new `tb/*` key is introduced by production-readiness itself (the feature specs introduce their own).

---

## 4. Files to CREATE / MODIFY (real paths under `tiny-bubbles/`)

### CREATE
| Path | Purpose |
|---|---|
| `src/config/flags.ts` | Central `DEV_SCREENS_ENABLED` build flag (§2.6/§3.1). |
| `components/ui/ErrorScreen.tsx` | Calm, mode-neutral recovery UI (bubble + one line + Reload + parent copy-details). NO network telemetry (§2.3). |
| `store/privacy-policy.md` | Store-review privacy policy: no account/cloud/analytics/ads; all on-device; optional data off by default (§2.2). |
| `__tests__/storage/migration-forward.test.ts` | Golden v1-fixture → `migrateAndRepair` regression (§3.3 rule 4). |
| `__tests__/storage/schema-roundtrip.test.ts` | Every store default is JSON-safe + `mergeWithDefaults`-stable; all `CHILD_SLICES` have defaults (§3.3 rule 5). |
| `__tests__/config/no-network.test.ts` | Grep-style gate: no `fetch`/`axios`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`http(s)://` in `app`/`src`/`components`, **replicating the BUILD-GUIDE §3 exclusion set** (comments, `docs.expo.dev`, `schema`, `xmlns`) so generated report HTML/SVG namespaces don't false-positive (§2.5). |
| `__tests__/config/dev-screens-gated.test.ts` | Asserts both dev screens contain the `DEV_SCREENS_ENABLED` redirect guard and `_layout` registers them conditionally (§2.6). |
| `__tests__/config/backup-exclusion.test.ts` | Asserts `app.json` `android.allowBackup === false` and photo writes target the excluded/cache dir (§2.7). Blocks the M-D2 store gate. |
| `jest.setup.js` (MODIFY if present, else CREATE) | Wire the `react-native-reanimated` jest mock (+ gesture-handler setup) so mandated component render-tests can run (§2.8). |
| `__tests__/helpers/render.tsx` | Thin `react-test-renderer` wrapper (default `ThemeProvider` + profile) for the mandated `visualTimer`/`breathingBubble` render-tests (§2.8). No new dep. |

### MODIFY
| Path | Change |
|---|---|
| `eas.json` | Add per-profile `env` (`EXPO_PUBLIC_TB_DEV_SCREENS` on dev/preview, absent on production), `channel`s, iOS/Android `submit.production` placeholders, optional `runtimeVersion`/resource classes (§2.1). |
| `app.json` | Confirm no unused permission strings; document "no `UIBackgroundModes`"; keep icons/splash/notif plugins; **set `android.allowBackup: false`** (§2.7); **register the `expo-image-picker` config plugin with honest `cameraPermission`/`photosPermission` strings** (§2.1, reconciles with `verify-undo.md` §4) (§2.1/§2.7). |
| `app/_layout.tsx` | Add `RootErrorBoundary` wrapping the tree + `export function ErrorBoundary` (router-level); conditionally register `_sandbox`/`_theme-gallery` behind `DEV_SCREENS_ENABLED`; ensure splash hides on boundary catch (§2.3/§2.6). |
| `app/_sandbox.tsx` | Prepend `if (!DEV_SCREENS_ENABLED) return <Redirect href="/" />;` (§2.6). |
| `app/_theme-gallery.tsx` | Same redirect guard (§2.6). |
| `components/StoreHydrationGate.tsx` | Add a ~4s max-wait fallback so hydration never hangs the first frame forever (§2.3). |
| `app/(parent)/settings.tsx` | Bound the `DataReview` dump: keep counts, gate the full-JSON behind a second tap, omit huge arrays (point to backup file); add a "Reminders off in phone settings" `Note` when permission denied (§2.4/§2.3). |
| `app/(parent)/dashboard.tsx` | Empty state when no children (Add-first-child CTA); `React.memo` on `ChildCard`; `useMemo` the daypart roll-up + reward `Map` (§2.3/§2.4). |
| `app/(parent)/tasks.tsx` | `FlatList`/`BottomSheetFlatList` for the template list; empty-section copy (§2.3/§2.4). |
| `app/(parent)/rewards-setup.tsx` | Empty state ("Add a reward…") (§2.3). |
| `app/(kid)/rewards.tsx` | Empty state ("Nothing to trade for right now 🫧") (§2.3). |
| `components/rewards/RewardCard.tsx`, `components/task/StepCard.tsx` | Wrap in `React.memo` (+ stable props/callbacks) (§2.4). |
| `src/domain/types.ts` | (Optional) add `AppMeta.lastRecoveredAt?` (§3.2). |
| `src/state/settingsStore.ts` | (Optional) a `noteRecovered()` action if `lastRecoveredAt` is adopted (§3.2). |
| `src/theme/resolveContent.ts` | Add copy keys (both variants) for the new empty/error states: `error.recover`, `empty.rewards`, `empty.tasks`, `empty.rewardsSetup`, `empty.noChildren` (§2.3). |
| `RUN.md` | Add a "Store release" checklist section (§2.2) and replace the "delete dev screens" note with the flag story (§2.6). |
| `THIRD_PARTY_NOTICES.md` | Confirm the Bundled-assets (audio/fonts) section is complete before a production build (§0 license); add OpenDyslexic entry when its binaries land (§2.9 / `src/theme/fonts.ts`). |
| `app/(kid)/buddy.tsx` | Remove the dead `DEMO_ID` demo-companion fallback (§2.9), or keep it with a clarifying comment if it guards a real pre-seed race. |
| `app/(parent)/settings.tsx` (OpenDyslexic) | Hide/disable the OpenDyslexic toggle unless the font binaries are bundled + `fonts.ts` wired (§2.9) — never advertise a no-op control. |

---

## 5. Reused prebuilt libraries (prefer existing deps)

**No new runtime dependency is required.** Everything reuses installed deps:
- **Lists/virtualization:** RN built-in `FlatList` + `@gorhom/bottom-sheet`'s `BottomSheetFlatList` (already installed) — no
  FlashList (deferred per `66-MASTER-PLAN.md` M1).
- **Error boundary:** plain React class component + `expo-router`'s `ErrorBoundary` route export + `<Redirect>` (all present).
- **Build flag:** `process.env.EXPO_PUBLIC_*` (Expo's built-in public-env mechanism) + `__DEV__` — no lib.
- **Storage/migration:** the shipped `src/storage/*` engine (`migrateAndRepair`, `mergeWithDefaults`, `validateAndRepair`).
- **EAS:** `eas.json` config only (EAS CLI is a build tool, not an app dep).
- **Backup transport (referenced, owned by clinician spec):** `expo-file-system`, `expo-sharing`, `expo-document-picker` are
  named there — production-readiness does not add them; it only requires the backup envelope stamp `schemaVersion` (§3.3).

**No new MIT lib named.** (Explicitly NOT adding a crash-reporting SDK — Sentry/Bugsnag/Firebase Crashlytics all phone home
and would break the no-egress / no-data-leaves-device guarantee, §2.5/§6. Crash handling stays a local ErrorBoundary.)

---

## 6. Anti-shame + no-AI rules that apply

Hard constraints (`00-SYNTHESIS.md` §4; `01-current-state.md` §4.6). This cross-cutting spec must uphold ALL of them and adds
a few of its own for failure modes:
- **ZERO AI.** No AI is added anywhere; error recovery is deterministic (reload/reset), not an "AI assistant." No chatbot, no
  LLM crash-triage, no "smart" anything. The companion stays a non-AI pet. There is no "AI off" toggle because there is no AI.
- **Error/empty copy is calm and blameless.** The `ErrorScreen` never says "crash / error / you broke / oops something went
  wrong" in a scary tone — it says "Let's try that again 🫧." Empty states say "nothing right now / check back soon," never
  "you have nothing / you did nothing." No red danger styling on child surfaces (`61-design-system.md` §2.2 — no child-facing
  `error`/`danger` color).
- **No shame in loading/failure.** A hung or corrupt store never zeroes progress: `validateAndRepair` restores earned tokens
  (never punishes), and the hydration fallback renders safe defaults, not an empty scoreboard. The migration path never
  lowers a streak/best or coerces to a negative/`failed` state.
- **No data leaves the device — enforced, not promised.** The no-egress grep gate (§2.5) makes the privacy claim structural;
  the store metadata (§2.2) states "no data collected" truthfully; the crash boundary keeps errors on-device. This is the
  anti-dark-pattern posture the research demands (`00-SYNTHESIS.md` §4 pitfalls 4/6).
- **No treatment claims** in any store asset/metadata/screenshot (`§2.2`) — market routines/behavior/relationship, never core
  symptoms (`00-SYNTHESIS.md` §4 pitfall 6).
- **Dev/debug surfaces are invisible in production** (§2.6) — a child (or a reviewer) can never wander into `/_sandbox` or a
  theme gallery in a store build.
- **Premium downgrade stays non-punishing** (`entitlements.ts` §1b.11) — production hardening must not introduce any path that
  strips owned content on entitlement change; the invariant test stays green.

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. **Dev screens gated:** in a `production`-profile build (or with `EXPO_PUBLIC_TB_DEV_SCREENS` unset and `__DEV__` false),
   deep-linking `/_sandbox` or `/_theme-gallery` redirects to `/`; in `development`/`preview` (flag=1) they render. The two
   `<Stack.Screen>` registrations only exist when `DEV_SCREENS_ENABLED`.
2. **EAS profiles complete:** `eas build --profile production` and `eas submit --profile production` have all required config
   (channel, autoIncrement, submit placeholders); dev/preview set the dev-screen env; production does not.
3. **Store metadata truthful + complete:** `store/privacy-policy.md` exists and matches the app's actual behavior; the Data
   Safety / Privacy Nutrition answers are "no data collected/shared"; no store copy contains a treatment claim.
4. **Global error boundary:** a thrown render error anywhere shows `ErrorScreen` (calm, offline, no telemetry) with a working
   Reload, not a red box / white screen; the app recovers.
5. **Loading never hangs:** with a deliberately-wedged store (never fires `onFinishHydration`), the app still renders within
   ~4s on safe defaults; normal launch still gates correctly on hydration + fonts.
6. **Empty states everywhere:** kid rewards (none available), parent dashboard (no children), tasks (empty daypart), rewards
   setup (no rewards) each show a calm, anti-shame empty state — never a blank list or an error.
7. **Performance:** the template list virtualizes (`FlatList`); the settings data-review no longer stringifies the full store
   inline (counts always, full record behind a second tap / omits huge arrays); list-item components are `React.memo`'d; heavy
   derivations are `useMemo`'d. No behavior change, no new dependency.
8. **Offline robustness:** the no-network grep gate returns zero; the full core loop runs in airplane mode; every native call
   in new code no-throws when the module is unavailable.
9. **Migration/versioning:** the golden v1 fixture round-trips through `migrateAndRepair` with all v1 feature fields present —
   no throw, no data loss, defaults filled, anti-shame invariants intact; the schema round-trip audit passes for every store;
   `SCHEMA_VERSION` bumps only when a change is non-additive, with a matching `MIGRATIONS` entry.
10. **Anti-shame/no-AI:** no AI, no treatment claim, no shame/failure copy in any new surface; premium-downgrade invariant test
    still green; no crash-telemetry / network egress introduced.

### Verify steps (an agent runs these)
```bash
# from the repo root (mind the space in the path)
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"
npx tsc --noEmit                 # 0 errors (flags.ts, ErrorScreen, optional AppMeta field compile)
npx jest                         # all suites green, incl. migration-forward, schema-roundtrip,
                                 # no-network, dev-screens-gated
npx expo export --platform web   # web-subset bundle succeeds (renders + navigates; no egress)

# dev-screen gating (grep both guards exist; and no unconditional registration)
grep -n "DEV_SCREENS_ENABLED" app/_sandbox.tsx app/_theme-gallery.tsx src/config/flags.ts
grep -n "DEV_SCREENS_ENABLED" app/_layout.tsx   # conditional Stack.Screen registration

# offline egress gate (must return nothing)
grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" app src components \
  | grep -viE "^[^:]+:[0-9]+: *(//|\*)"

# treatment-claim gate over store assets (must return nothing)
grep -rniE "treats?|cure|fixes ADHD|clinically proven" store/ RUN.md
```
Then a manual smoke: build the `preview` profile → confirm `/_sandbox` + `/_theme-gallery` reachable; build/simulate the
`production` profile → confirm both redirect away; force a render error (temporary throw) → confirm `ErrorScreen` + recovery;
wipe data → confirm the dashboard shows the Add-first-child CTA (not a blank list); open settings data-review → confirm it no
longer freezes with a large store.

---

## 8. Dependencies + premium/free classification

**Depends on (all shipped):**
- The storage/migration engine (`src/storage/migrations.ts`, `persist.ts`, `schemaVersion.ts`, `StoreHydrationGate.tsx`).
- The theme resolvers (`resolveContent`, `resolveTokens`, `useReducedMotion`) for mode-correct empty/error copy.
- The parent-gate production assert (`src/services/parentGate.ts`) and entitlements (`src/services/entitlements.ts`).
- `app/_layout.tsx` provider/boot structure; `eas.json` / `app.json` scaffold.

**Cross-feature spec dependencies (this spec HARDENS them, and they feed this one):**
- **`clinician-reporting`** — owns backup/restore (`exportBackup`/`importBackup`); this spec requires the backup envelope stamp
  `schemaVersion` and that import runs through `migrateAndRepair` (§3.3 rule 6). The bounded data-review dump (§2.4) points
  users to that export for the full record.
- **`multi-child`, `novelty-refresh`, `mood-checkin`, `verify-undo`, `visual-timers`, `if-then-plans`, `focus-intervals`,
  `soundscapes`, `child-autonomy`, `breathing-regulation`** — each claims "additive, no schema bump." This spec's
  migration-forward + schema-roundtrip tests (§3.3) are the **shared regression harness** that makes those claims safe; each
  new persisted slice/field must be added to the round-trip audit + the fixture as it lands. Each new screen must add its own
  empty/error state per §2.3, virtualize its own large lists per §2.4, and no-throw its own native calls per §2.5.
- **Real billing wiring (deferred)** — production-readiness sets up the EAS submit config + kids-safe store positioning (§2.2)
  the real processor will need, but billing stays **MOCKED** behind `src/services/purchases.ts` (`// TODO: wire RevenueCat`).

**Premium / free classification (core loop always free — `00-SYNTHESIS.md` §3):**
| Sub-capability | Tier |
|---|---|
| Error/empty/loading states, error boundary | **Free** (safety/UX — never gated) |
| Offline robustness, no-egress guarantee | **Free** (privacy/safety — never gated) |
| EAS build config, store metadata, privacy policy | **N/A** (build/ops, not a user-facing entitlement) |
| Performance (virtualization/memoization) | **Free** (applies to the whole app) |
| Data migration/versioning + tests | **Free** (protects everyone's data) |
| Dev-screen gating | **N/A** (build config) |

Production-readiness gates **nothing** behind premium — it is infrastructure that must work identically on free and premium.

---

## 9. Open assumptions

1. **No `expo-updates` in v1.** We assume the simplest, most private path: ship without OTA updates (no update channel that
   phones home). If product wants OTA, add `expo-updates` with a pinned `runtimeVersion` + a private channel and document it
   as a deliberate (still no-personal-data) network use — but that is a conscious relaxation of the pure-offline posture.
2. **No crash-reporting SDK.** We assume the "no data leaves the device" promise outranks having remote stack traces, so
   crashes are handled by a local `ErrorBoundary` only. If product accepts a privacy trade-off for remote crash reports, that
   is a separate, disclosed decision (and would need the privacy policy + store labels updated) — out of scope here.
3. **Kids-category choice is a product/legal call.** We assume either a normal children-appropriate listing or Apple Kids /
   Google Designed-for-Families is acceptable since the app already meets the stricter no-ads/no-analytics + privacy-policy
   bar; the exact program is picked at submission, not in code.
4. **Additive-only holds for all v1 features.** We assume every v1 feature spec's fields/slices are additive (they say so), so
   `SCHEMA_VERSION` stays 1. The migration-forward fixture is the guard; the FIRST feature that needs a non-additive change
   triggers the bump-to-2 procedure (§3.3 rule 2) — that is expected, not a failure.
5. **Hydration max-wait of ~4s** is a chosen default; tune against real device cold-start once profiled. The fallback is safe
   because repaired defaults are valid, but a too-short timeout could flash defaults before disk on a very slow device — err
   toward a slightly longer wait if that flash is observed.
6. **`DataReview` full-record trimming** assumes users who want the *complete* record use the backup/export file (clinician
   spec). If product wants the entire JSON inline, keep it behind the explicit second tap + a size warning; do not restore the
   unbounded eager dump.
7. **Store assets (final icon/splash/screenshots) are produced outside code.** This spec tracks them as a checklist; it does
   not generate art. It assumes the present placeholder-quality assets are replaced with final art before submission.
8. **The no-network grep gate is a heuristic**, not a sandbox. It catches literal client calls; a determined future
   dependency could still open a socket. Pair it with the store Data-Safety review and dependency vetting (`66-MASTER-PLAN.md`
   §1b.9 license/provenance) for defense in depth.
