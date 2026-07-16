# Feature Spec — Billing & Entitlements (paywall, gating, MOCK→real seam)

**Slug:** `billing-entitlements` · **Feature Matrix #11** · **Status:** buildable delta on the shipped app
**Owner doc:** this file (the SINGLE SOURCE OF TRUTH for premium/free classification).
**Companion reads:** `_build/spec/01-current-state.md` (§1.7, §4.2), `_build/plan/62-data-model.md` (§12, §13),
`_build/plan/66-MASTER-PLAN.md` (§M12, §1b.11/§1b.13/§1b.15), `_build/plan/70-daypart-bifurcation.md`,
`_build/research/01-feature-matrix.md` (#11), `_build/research/00-SYNTHESIS.md` (§3 monetization, §4.4 paywall pitfalls).

> **Build note (read first).** The paywall/entitlement substrate is **ALREADY SHIPPED and
> green** (34 suites / 335 tests). This spec is a **DELTA + a classification contract**, not a
> rebuild. The four genuinely new/unfinished pieces are:
> **(A)** the durable **premium-vs-free classification of EVERY feature** (§1, §8 — this file
> is authoritative for it);
> **(B)** the **honest trial-end reminder** notification (the one real code gap,
> `01-current-state.md` §4.2 #4);
> **(C)** wiring the **four defined-but-unconsumed premium gate flags**
> (`companionThemes` beyond free-2, `noveltyPipeline`, `calmSoundscape`, `advancedInsights`) —
> the *mechanism* is here; each sibling spec wires its own *content* behind the named flag;
> **(D)** documenting the **MOCK→real RevenueCat seam** so a later agent can wire the processor
> without touching any call site.
> **Real purchase stays MOCKED this build.** Do not add a payment processor. Do not rebuild the
> parts marked DONE — reuse them. Every path below is real. Mind the SPACE in the repo path
> `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles`.

---

## 0. What already exists (DO NOT rebuild)

Verified by reading the code on 2026-07-06. DONE and tested:

| Capability | Where | State |
|---|---|---|
| Mock purchase service (no processor/network/StoreKit) | `src/services/purchases.ts` — `PLANS` (annual/monthly/hardship), `trialEndsAtFor`, `mockPurchase`, `mockCancel`, the `// TODO: wire RevenueCat` seam | DONE (mock) |
| Entitlement state + honest 7-day trial | `src/state/settingsStore.ts` — `mockPurchase`/`mockCancel` reducers, `isPremium(entitlement, ts)` (paid OR live trial) | DONE |
| Entitlement types | `src/domain/types.ts` — `Tier`, `Entitlement`, `MockPurchaseRecord` (L611-632) | DONE |
| Trial constants | `src/domain/constants.ts` — `PREMIUM_TRIAL_DAYS=7`, `PREMIUM_TRIAL_MS`, `defaultEntitlement()` (L46-47, L213) | DONE |
| Feature-gate matrix + selectors | `src/services/entitlements.ts` — `FEATURE_GATES`, `CURATED_REWARD_CEILING=6`, `featureLimit`, `isFeatureUnlocked`, `canAddMore`, `useIsPremium`, `useFeatureLimit`, `useEntitlements` | DONE |
| Acquisition-only add-button gate | `components/parent/PremiumGate.tsx` — `<PremiumGate>` + `goToPaywall()` (routes via PIN gate) | DONE |
| The paywall screen (honest, no dark patterns) | `app/(parent)/paywall.tsx` — real trial end-date, one-tap cancel, hardship plan, no countdown/urgency/anchor pricing, no medical claims | DONE |
| PIN-on-purchase | `app/(gate)/parental-gate.tsx` — `?mode=purchase` ALWAYS demands the parent-set PIN (`pin`/`pin-missing`), never math/long-press | DONE |
| Wired gates today | `multiChild` (Add-child in `app/(parent)/children.tsx`), the dashboard upsell row (`app/(parent)/dashboard.tsx`) | DONE |
| Anti-shame downgrade test | `__tests__/state/entitlements.test.ts` — "trial expiry with premium cosmetics EQUIPPED → zero visible change" | DONE |
| Notification infra (for the trial reminder) | `src/services/notifications.ts` — quiet-hours helpers, `isReminderCopyClean`/`BANNED_REMINDER_PATTERNS`, `ensurePermission`/`ensureAndroidChannel` (internal), `Notifications.scheduleNotificationAsync` with a trigger | DONE |

**The DELTA this spec adds** (everything else is DONE):
1. The **classification contract** (§1/§8) — durable, so sibling specs stop re-deciding pricing.
2. The **honest trial-end reminder** (§2.4, §3.2, §4).
3. Wiring the **four unconsumed premium flags** at their exact seams (§2.5, §4).
4. A **discoverable "Tiny Bubbles Plus" row in Settings** (§2.3) so a subscribed parent can find manage/cancel.
5. The **MOCK→real RevenueCat seam** doc + the named later dependency (§5).
6. Small **entitlement-repair** hardening in the migration layer (§3.3, additive, no bump).

---

## 1. Overview + user value (the classification, honestly)

**Monetization and retention are the same problem** (`00-SYNTHESIS.md` §3 "Revenue honesty";
§6.1). The proven kids' model is **D2C freemium** (~$80–130/yr band; we ship a friendlier
$29.99/yr + $3.99/mo + a real pay-what-you-can plan) with **a 7-day trial, HSA/FSA later, a
free tier that actually WORKS, and a hardship option** — never a prescription/payer model
(EndeavorRx is the cautionary tale, `00-SYNTHESIS.md` §3; Akili's OTC beat its Rx model).
This is a **business requirement, not a science claim** — the paywall makes **zero clinical /
symptom claims** (`00-SYNTHESIS.md` §4.6; `feature-matrix` #11 "no science claim").

**The four billing dark patterns we must refuse** (documented app-killers, `00-SYNTHESIS.md`
§4.4; `30 §3.3`; FTC/COPPA enforcement, `40 §11`):
1. **Surprise auto-renewal** → the trial shows a **real calendar end-date** and we **remind
   before it ends** (this spec finally *implements* that promise, §2.4).
2. **Hard-to-cancel** → **one-tap cancel**, always visible while subscribed.
3. **Steep / "scam" pricing** → honest low prices, **a visible pay-what-you-can plan**, no
   "was $X" anchor, no countdown, no urgency copy.
4. **A gutted free tier** → **the entire core loop is free forever for one child** (Finch's
   praised free tier is the model). Premium **adds depth**; it never removes or degrades the
   loop.

**The load-bearing anti-shame billing rule** (`66-MASTER-PLAN.md` §1b.11): **anything a child
owns or has equipped stays owned and equipped FOREVER.** Trial-end / decline / downgrade
**only blocks NEW acquisition** — it never removes, hides, unequips, greys, or alters anything
the child can see. `isPremium()` flipping false changes only *what is purchasable*, never the
buddy's current appearance. This is both an ethics rule and a trust/retention lever.

**Free-tier promise (never gated — accessibility/safety/core, not monetization):** the whole
`task → celebrate → token → nurture → redeem` loop; `ageMode`, `companionStyle`, `sensoryMode`,
reduced-motion, low-stim, **calm mode**, OpenDyslexic, **TTS/spoken labels**; the daypart
engine + parent mission-control; reminders; the parental gate/PIN; **one child profile**; and —
per the locked offline-first decision — **local backup/restore** and the **basic printable
clinician report** (the on-device *replacements* for a cloud portal MUST be free). See §8 for
the full table.

---

## 2. UX behavior — screen by screen

All billing UI is **PARENT-facing, behind the PIN gate**, dense/utilitarian, themed by the
resolved token set. **A child NEVER sees a paywall or any purchase affordance** (hard rule,
`66-MASTER-PLAN.md` §5.7; enforced structurally — `<PremiumGate>` and `paywall.tsx` are only
mounted under `(parent)`). Copy never mentions the child's age; where a parent surface must
name the mode it uses `ageModeLabel`, never raw `ageMode` (golden rule, `01-current-state.md`
§1.5). No component branches on raw `ageMode`.

### 2.1 The paywall (`app/(parent)/paywall.tsx`) — DONE, keep

Reachable ONLY via `goToPaywall()` → `/(gate)/parental-gate?mode=purchase&next=/(parent)/paywall`
→ PIN → paywall. Already honest by construction: plan radio (annual default, monthly, hardship),
a **real** "trial runs through {Month D, YYYY}" line, "we'll remind you before it ends" (now
truly backed by §2.4), one-tap **Cancel Plus** while subscribed, "Cancelling keeps everything
your child has unlocked. Nothing is ever removed or hidden," and a `Note` that "Plus helps you
build routines. It is not therapy and makes no health claims." **No change required** except the
minor status/subtitle already present. The `PLUS_BENEFITS` list MUST stay aligned with §8 (only
premium items; additive framing).

### 2.2 The acquisition gate (`components/parent/PremiumGate.tsx`) — DONE, extend usage

`<PremiumGate feature=… currentCount=…>{addAffordance}</PremiumGate>` renders the ADD button
while under the ceiling, else a calm upsell row ("Unlock more with Plus / Everything you have
now stays exactly as it is." → `goToPaywall()`). **The component is done; §4 wires it into the
four surfaces that currently define a gate flag but don't consume it.** Rule: a `<PremiumGate>`
wraps only the **ADD/ACQUIRE** control — the list of already-owned items is rendered by its own
screen and is never passed through the gate (retention untouched).

### 2.3 Subscription management row in Settings (NEW — small)

Today the paywall is discoverable only from an upsell (dashboard/gates). A **subscribed** parent
needs an obvious place to review/cancel. Add to `app/(parent)/settings.tsx`, above "Your data":

```
<SectionTitle>Tiny Bubbles Plus</SectionTitle>
<SettingRow
  label={premium ? "You're on Plus" : "Tiny Bubbles Plus"}
  hint={premium
    ? (trialEndsAt
        ? `Free trial through ${fmtDate(trialEndsAt)}${trialEndingSoon ? " · ends soon — keep Plus or cancel in one tap, you won't be charged" : " · manage or cancel"}`
        : "Manage or cancel")
    : "Free runs the whole routine — see what Plus adds"}
  onPress={goToPaywall}   // routes through the PIN gate to the paywall
/>
```

- `trialEndingSoon = trialEndsAt != null && now >= trialEndsAt - ONE_DAY_MS`. This row is the
  **parent-only surface** where the honest trial-end billing detail lives (the lock-screen
  notification stays generic, §2.4). It is already behind the PIN gate (this whole screen is under
  `(parent)`), so the billing specifics never reach a child.

- `premium`/`trialEndsAt` from `useIsPremium()` / `useEntitlements()` (both already exported).
- `fmtDate` = `date-fns` `format(new Date(ms), "MMMM d, yyyy")` (same helper the paywall uses).
- Routes through `goToPaywall()` so the **PIN gate** still guards purchase/cancel (§1b.13).
- Low-stim/calm: this is a plain `SettingRow` — inherits the resolved theme; no animation, no
  celebration, nothing to clamp.

### 2.4 Honest trial-end reminder (NEW — the real code gap)

The paywall promises "we'll remind you before it ends," but nothing schedules it
(`01-current-state.md` §4.2 #4). Implement a **single one-shot local notification** ~24h before
`trialEndsAt`, on the existing `expo-notifications` service, with fixed clean copy.

**Behavior:**
- When a live trial exists (`entitlement.source === 'trial'` and `trialEndsAt > now`), schedule
  ONE notification at `remindAt = trialEndsAt − ONE_DAY_MS`, shifted out of quiet hours (reuse
  `isWithinQuietHours` + the existing shift logic) to the nearest allowed minute.
- If `remindAt <= now` (trial already <1 day out), **skip** — we don't nag late, and never after
  it ends.
- On `mockCancel` (or downgrade), **cancel** the pending trial reminder (selective cancel by a
  distinct `data.kind`, so routine reminders are untouched).
- **Shared-device visibility (child-safety decision — LOCKED):** the offline device is shared by
  parent + kids, so a lock-screen/tray notification is visible to the child. A billing/upsell
  string on the lock screen ("free trial ends… keep Plus… you won't be charged") would put a
  purchase message in front of a child, breaking "a child NEVER sees a paywall/purchase
  affordance." Therefore the **visible notification is GENERIC and non-billing**; the billing
  detail lives only behind the PIN-gated Settings "Tiny Bubbles Plus" row (§2.3). The visible copy
  is indistinguishable from the app's other gentle reminders:
  > **Title:** `Tiny Bubbles 🫧`
  > **Body:** `A grown-up note is ready in Settings.`
  (FIXED template; passes `isReminderCopyClean` — no `streak`, `hurry`, `last chance`, `please`,
  `miss you`, `come back`, `don't forget`, `you forgot/missed`, and now also no `trial`, `Plus`,
  `charge`, `subscribe`, `price` on the visible surface. `assertBillingCopyClean()` — a dev-throw
  mirroring `assertReminderCopyClean()` — asserts BOTH the no-shame set AND the no-billing-word set
  over the visible title/body.)
- The **full honest billing detail** ("Your free trial ends {Month D}. Keep Plus, or cancel in one
  tap — you won't be charged.") is rendered **inside the PIN-gated Settings row** (§2.3 `hint`),
  and its trial-ending prominence bumps (an inline "ends soon" note) once `now >= remindAt` — so
  the honest reminder promise is kept, just on a parent-only surface a child cannot read.
- **On tap-through:** the reminder carries `data.kind:'billing_trial_end'` only and taps to
  **nothing kid-facing** — opening the app lands normally (kid home). No auto-navigation to any
  purchase screen. The parent reaches manage/cancel via the PIN-gated Settings row (§2.3). This
  keeps the child-never-sees-a-paywall rule intact for BOTH tap-through and mere lock-screen
  visibility.

**Quiet-hours + permission discipline:** the trial only exists *after* a deliberate PIN-gated
"Start free trial" tap, so requesting notification permission for this reminder is expected and
honest. Still, reuse `ensurePermission()` (no forced prompt on a child's first screen — this
only runs post-purchase / on app-open when a trial is live).

### 2.5 The gate seams (mechanism here; content in sibling specs)

Each currently-unconsumed flag (four existing + one new `ifThenPlans` count key) gets its
ADD/ACQUIRE control wrapped in `<PremiumGate>`. This spec fixes the **exact wrap point +
classification**; the **content** belongs to the named spec:

| Flag | Wrap point (surface) | Content owner spec |
|---|---|---|
| `companionThemes` (count, free 2 / premium 24) | the buddy cosmetic **"unlock/acquire" tile** in the companion-customization surface (`app/(kid)/buddy.tsx` is child-facing — the ACQUIRE control lives in the **parent** cosmetics/autonomy surface; a child never buys). | `child-autonomy.md`, `novelty-refresh.md` |
| `noveltyPipeline` (flag) | the **enable seasonal rotation** control in the parent novelty surface | `novelty-refresh.md` |
| `calmSoundscape` (flag) | the **premium soundscape pack** selector (basic ambient stays free) | `soundscapes.md` |
| `advancedInsights` (flag) | the **enhanced-insights** toggle on the clinician report (basic printable report stays FREE) | `clinician-reporting.md` |
| `ifThenPlans` (count, free 2 / premium 8) | the **"add a plan" tile** for the 3rd+ plan in the parent plan author (firing + first 2 plans stay FREE) | `if-then-plans.md` |

Rule for all five: **acquisition-only.** A downgrade with premium cosmetics equipped / a premium
soundscape selected / enhanced insights previously generated changes **nothing already owned or
on screen** — only *new* acquisition is blocked (a calm upsell replaces the ADD control). Sibling
specs MUST import `isFeatureUnlocked`/`canAddMore` from `src/services/entitlements.ts` — **no
ad-hoc `entitlement.tier === 'premium'` checks anywhere.**

### 2.6 Young vs older / low-stim / calm

Billing is parent-only, so there is **no young/older kid variant** — the paywall, gate, and
settings row are always the dense parent theme. The relevant age-adaptive rule is the *inverse*:
these surfaces must **never appear on a kid surface** regardless of mode. Low-stim/calm: parent
screens inherit the resolved low-stim tokens (desaturated, reduced motion) automatically via
`useThemeTokens()`; there is no celebration/confetti anywhere in billing to clamp. The trial-end
notification obeys the same quiet-hours + gentle-copy discipline as every other reminder.

---

## 3. Data-model additions

All additions are **additive + optional** → **no `SCHEMA_VERSION` bump** (stays 1). Justified by
the shipped `mergeWithDefaults` engine (`src/storage/migrations.ts`), which overlays defaults for
missing keys and preserves unknown keys (`multi-child.md` §3.6 sets the precedent).

### 3.1 `Entitlement` — one optional field (`src/domain/types.ts`)

```ts
export interface Entitlement {
  // …existing fields unchanged (tier, source, trialStartedAt, trialEndsAt,
  //   premiumSince, mockPurchases, updatedAt)…
  /**
   * The local ms we scheduled the honest trial-end reminder FOR (idempotency +
   * debug). Absent when no trial / already reminded / not yet scheduled. Optional
   * so old persisted blobs stay valid; never affects gating or isPremium().
   */
  trialEndReminderAt?: EpochMs;
}
```

`defaultEntitlement()` in `src/domain/constants.ts` is **unchanged** (the field is optional and
simply absent by default). This field is a convenience marker — the reminder scheduling is
otherwise **idempotent** because the app-open effect cancels-then-reschedules (§4). If a builder
prefers zero new fields, it may be omitted and reminder scheduling driven purely off
`entitlement.trialEndsAt`; the field is *recommended* only for cheap dedupe/debug.

### 3.2 Notification `data.kind` (no type change — a string constant)

Add a module constant in `src/services/notifications.ts`:
`export const BILLING_REMINDER_DATA_KIND = "billing_trial_end";`
Used to tag the one-shot so it can be **selectively cancelled** without disturbing routine
reminders (which use the existing `REMINDER_DATA_KIND`).

### 3.3 Migration / repair (additive, no bump)

- `Entitlement.trialEndReminderAt` → `mergeWithDefaults` leaves existing blobs untouched (absence
  is valid). No `MIGRATIONS` entry needed.
- **Recommended hardening — `repairEntitlement`** in `src/storage/migrations.ts` (mirrors
  `repairLedger`/`repairProgress`), added to `validateAndRepair`. Entitlement carries **no
  shame-bearing field**, so this is coherence-only, never a downgrade of what the child sees:
  - `mockPurchases` coerced to an array if corrupt (`Array.isArray` guard).
  - If `tier === 'premium'` but `source === 'none'` and `(trialEndsAt ?? 0) <= now` and no
    `premiumSince` → coerce to a clean free record (a corrupt "premium with no basis"), **but
    only after confirming this cannot strip owned cosmetics** — it can't: cosmetics live in
    `buddyStore.unlockedItems`, never in `Entitlement` (the §1b.11 test already asserts equipped
    cosmetics survive a free flip). Repair touches only the billing record.
  - Never *raise* to premium and never delete `mockPurchases` history.
- **IF real-billing wiring later needs a required field** (e.g. a cached entitlement id), bump
  `SCHEMA_VERSION` to 2 + add a `{ from:1, to:2, migrate }` that spread-merges the new default.
  Not needed now.

### 3.4 The classification is data too (`src/services/entitlements.ts`)

`FEATURE_GATES` **is** the machine-readable classification and is the runtime contract. Keep it
the single source; §8's table is its human mirror. Existing keys are correct and MUST NOT gain an
`'unlimited'` anywhere (the `_AssertRewardCeiling` compile guard enforces the reward ceiling ≤6).
If a sibling spec needs a new premium axis, it adds a **new key here** (never a scattered check).

**This spec adds ONE new count gate key** (the only classification change in feature-complete):

```ts
// src/services/entitlements.ts — add to FEATURE_GATES:
ifThenPlans: { kind: "count", free: 2, premium: 8 },   // if-then-plans (#21); M-C5 consumes it
```

- Widen `canAddMore`'s feature-name union to include `"ifThenPlans"`.
- Add `"ifThenPlans"` to `PremiumGate`'s `COUNT_FEATURES` set (so the 3rd-plan ADD tile shows the
  calm upsell, mirroring `multiChild`/`rewardMenuSize`).
- **Firing is NEVER gated** (a downgraded parent's already-authored plans keep firing); only the
  ADD control for the 3rd–8th plan is `<PremiumGate feature="ifThenPlans">`-wrapped by M-C5.
- Wiring the key here (M-A1) — ahead of M-C5 — is the hard edge: M-C5 imports
  `FEATURE_GATES.ifThenPlans`/`canAddMore(..., "ifThenPlans")` and would not compile if this key
  were absent.

---

## 4. Files to CREATE / MODIFY (real paths under `tiny-bubbles/`)

### CREATE
| Path | Purpose |
|---|---|
| `__tests__/services/billingReminders.test.ts` | Unit-test the trial-end reminder: `remindAt = trialEndsAt − 1 day`, quiet-hours shift, skip-if-past/expired, copy passes `isReminderCopyClean`, cancel by `data.kind`. Pure/scheduler-mocked (mock `expo-notifications` like the existing notifications test). |

*(No new source file: the reminder helpers live in the existing `notifications.ts` so they can
reuse its internal `ensurePermission`/`ensureAndroidChannel`/quiet-hours helpers without new
export plumbing. If a builder prefers a separate `src/services/billingReminders.ts`, export those
helpers from `notifications.ts` first — but adding to `notifications.ts` is the lower-risk path.)*

### MODIFY
| Path | Change |
|---|---|
| `src/services/notifications.ts` | Add `BILLING_REMINDER_DATA_KIND`; a fixed **generic non-billing** `BILLING_REMINDER` title/body template (title `Tiny Bubbles 🫧`, body `A grown-up note is ready in Settings.` — §2.4 shared-device decision) + `assertBillingCopyClean()` (dev-throw, mirrors `assertReminderCopyClean`; asserts the visible copy passes `isReminderCopyClean` AND contains none of `trial|plus|charge|subscribe|price`); `scheduleTrialEndingReminder(trialEndsAt, quietHours)` → computes `remindAt`, skips if `<= now`, shifts out of quiet hours, `ensurePermission()`+`ensureAndroidChannel()`, `Notifications.scheduleNotificationAsync({ content:{…,data:{kind:BILLING_REMINDER_DATA_KIND}}, trigger:{ type: SchedulableTriggerInputTypes.DATE, date: remindAt } })` — **use the SAME date-trigger shape the shipped routine reminders already use** (`SchedulableTriggerInputTypes.DATE`, not a bare `'date'` string literal, so it type-checks against the SDK-56 `expo-notifications` types; copy the exact trigger construction from the existing routine-reminder scheduler rather than re-inventing it), returns the id; `cancelTrialEndingReminder()` → cancel scheduled notifications whose `data.kind === BILLING_REMINDER_DATA_KIND` (iterate `getAllScheduledNotificationsAsync` + `cancelScheduledNotificationAsync`). **Do NOT route the trial reminder through `cancelAllReminders` / `rescheduleReminders`** (those `cancelAllScheduledNotificationsAsync` — which would nuke it); it is scheduled/cancelled independently. |
| `app/_layout.tsx` | Extend the existing reminder `useEffect` (or add a sibling effect keyed on `entitlement.source`/`entitlement.trialEndsAt`): after routine reminders resolve, if a live trial exists → `void scheduleTrialEndingReminder(trialEndsAt, quietHours)`; else → `void cancelTrialEndingReminder()`. Reads `entitlement` from `useSettingsStore`. Idempotent (cancel-then-reschedule the billing reminder each open). Runs only post-onboarding (same guard as the routine effect). |
| `app/(parent)/settings.tsx` | Add the "Tiny Bubbles Plus" `SectionTitle` + `SettingRow` (§2.3) above "Your data"; import `goToPaywall` from `components/parent/PremiumGate`, `useIsPremium`/`useEntitlements` from `src/services/entitlements`, `format` from `date-fns`. |
| `src/state/settingsStore.ts` | (Optional, if adopting §3.1) set/clear `entitlement.trialEndReminderAt` inside `mockPurchase`/`mockCancel`. If omitting the field, no change here. |
| `src/domain/types.ts` | (Optional, §3.1) add `trialEndReminderAt?: EpochMs` to `Entitlement`. |
| `src/storage/migrations.ts` | Add `repairEntitlement` (§3.3) + call it from `validateAndRepair`; export `VALID_ENTITLEMENT_SOURCES` if useful. Additive; keeps `MIGRATIONS` empty at v1. |
| `src/services/purchases.ts` | Expand the `// TODO: wire RevenueCat` seam into the concrete block in §5 (comment-only in this build — bodies stay mock). Optionally add a `PLUS_ENTITLEMENT_ID = "plus"` constant + map `PLANS[].sku` → store product IDs, documented as seam scaffolding. **No processor call added.** |
| `app/(parent)/paywall.tsx` | No behavior change. Optionally tighten the subscribed-state copy to reference the scheduled reminder ("We'll remind you on {date−1}"). Keep `PLUS_BENEFITS` aligned with §8. |
| `__tests__/state/entitlements.test.ts` | Extend: `trialEndReminderAt` set on purchase / cleared on cancel (if adopted); `repairEntitlement` coerces a corrupt "premium with no basis" to free **without** touching a companion's `unlockedItems`; classification invariants (below). |

### GATE-WIRING MODIFY (mechanism only — content owned by sibling specs; list here for traceability)
| Path | Change | Owner spec |
|---|---|---|
| parent companion-cosmetics ACQUIRE surface | wrap the "unlock cosmetic" tile in `<PremiumGate feature="companionThemes" currentCount={ownedPremiumCount}>` | `child-autonomy.md` / `novelty-refresh.md` |
| parent novelty surface | wrap "enable seasonal rotation" in `<PremiumGate feature="noveltyPipeline">` | `novelty-refresh.md` |
| parent soundscape surface | wrap "premium pack" in `<PremiumGate feature="calmSoundscape">` (basic ambient ungated) | `soundscapes.md` |
| clinician report surface | wrap "enhanced insights" in `<PremiumGate feature="advancedInsights">` (basic report ungated + FREE) | `clinician-reporting.md` |

---

## 5. Reused prebuilt libraries + the MOCK→real seam

**This build adds NO new dependency.** Everything reuses installed deps:
- **State/persist:** `zustand` v5 + `createTbPersistOptions`/`registerPersistedStore`
  (`settingsStore`, unchanged).
- **Notifications:** `expo-notifications` (already wired) — the trial reminder reuses the
  existing permission/channel/quiet-hours/scheduling helpers.
- **Dates:** `date-fns` v4 `format` (paywall/settings) — already a dep.
- **UI:** `components/parent/ui.tsx` (`ParentScreen`, `Card`, `SectionTitle`, `SettingRow`,
  `Note`, `PrimaryButton`, `TextButton`) + `components/parent/PremiumGate.tsx`.

**The MOCK→real seam (LATER wiring step — DO NOT do it this build).** `src/services/purchases.ts`
is the single seam; **call sites (`paywall.tsx`, `PremiumGate`, `settings.tsx`, every
`isPremium`/`useIsPremium`) stay byte-identical** because they read *entitlement state*, not the
processor. Later wiring:

- **New MIT dependency (later):** `react-native-purchases` (RevenueCat SDK, **MIT**) — chosen
  because it abstracts StoreKit 2 + Google Play Billing, handles receipt validation/restore
  server-side, and gives one cross-platform `CustomerInfo.entitlements.active` boolean. Add its
  Expo config plugin; requires a **dev client** (already the ship target — MMKV forces it) — it
  is **not Expo Go / web compatible**, so the mock MUST remain as the Expo-Go/web/offline
  fallback.
- **`mockPurchase(plan)` → real:** replace the body with
  `await Purchases.purchasePackage(pkg)` (or `purchaseProduct(PLANS_BY_ID[plan].sku)`), then
  derive entitlement from `customerInfo.entitlements.active["plus"]` and write it into
  `settingsStore` via a small `applyCustomerInfo(info)` reducer. On error/cancel, no state
  change. Keep a `try/catch` that falls back to the local mock when the SDK is unavailable
  (Expo Go / web / offline).
- **`mockCancel()` → real:** a real cancel happens in the OS subscription UI; replace with
  opening `Linking.openURL(customerInfo.managementURL)` and refreshing `CustomerInfo`. The mock's
  direct revert stays as the fallback.
- **`isPremium` → real:** add a `Purchases.addCustomerInfoUpdateListener` at app boot that writes
  `active["plus"]` into `entitlement`; `isPremium(entitlement)` then reads the same field it does
  today. Trial state comes from `CustomerInfo` (`entitlementInfo.periodType === 'trial'`,
  `expirationDate`) mapped onto `source`/`trialEndsAt`.
- **Product IDs:** `PLANS[].sku` (`tinybubbles.plus.annual|monthly|hardship`) are the store
  product IDs to register in App Store Connect / Play Console and mirror in RevenueCat offerings.
  The **hardship / pay-what-you-can** plan needs a store representation (a $0-or-low-tier product or a
  promo-code path) — flagged as an open assumption (§9).
- **What must NOT change:** the honest-trial copy, one-tap cancel, hardship visibility, the PIN
  gate on purchase, and the §1b.11 acquisition-only downgrade. The seam swaps *how entitlement is
  obtained*, never *how gating behaves*.

---

## 6. Anti-shame + no-AI rules that apply

Hard constraints (`00-SYNTHESIS.md` §4; `01-current-state.md` §4.6). This feature upholds ALL:
- **ZERO AI.** No "AI suggestions," no dynamic/personalized pricing, no AI upsell, no chatbot.
  Plans and copy are static and reviewed. There is no "AI off" toggle because there is no AI.
- **Acquisition-only, never retention (§1b.11).** Downgrade/trial-end/decline blocks only NEW
  unlocks. It never removes, hides, unequips, greys, or alters any owned cosmetic, reward,
  child, soundscape, or generated report. A test simulates trial expiry with premium cosmetics
  equipped and asserts **zero visible change** (already shipped; keep green).
- **No billing dark patterns (§1, §4.4).** No countdown, no "limited time / last chance," no
  fake anchor pricing, no guilt, no urgency. Real trial end-date + **an honest reminder before
  it ends** (§2.4) + **one-tap cancel** + a **visible hardship plan**. Cancel copy is reassuring
  ("keeps everything your child has unlocked").
- **No clinical/medical claims (§1).** The paywall/benefits/reminder make **no** symptom or
  therapy claim ("It is not therapy and makes no health claims"). The M15 over-claiming grep gate
  covers this copy.
- **Child never sees a paywall or purchase affordance (§5.7) — including on the shared lock
  screen.** All billing UI mounts under `(parent)` behind the PIN gate; the trial-end notification
  taps to nothing kid-facing AND its **visible** copy is generic/non-billing (§2.4), so a child
  glancing at the shared device's tray sees only a neutral "a grown-up note is ready" line. The
  billing specifics live solely behind the PIN in Settings.
- **Trial reminder tone (§1b.14).** The one-shot passes `isReminderCopyClean` / the banned-phrase
  gate exactly like routine reminders — no companion re-engagement, no "miss you," no begging.
- **Free tier genuinely works.** The core loop, calm mode, all accessibility, one child, backup/
  restore, and the basic clinician report are **never** gated (§8).

---

## 7. Acceptance criteria + verify steps

### Acceptance criteria
1. **Classification contract:** `FEATURE_GATES` matches §8; no `'unlimited'` exists; the reward
   ceiling stays ≤6 (compile guard holds). The core loop, calm/accessibility, 1 child, backup/
   restore, and the basic clinician report are reachable with a **fresh free** entitlement.
2. **Honest trial reminder (parent-only visibility):** starting a mock trial schedules exactly ONE
   notification at `trialEndsAt − 1 day` (quiet-hours-shifted); its **visible** title/body are the
   GENERIC non-billing copy (§2.4) — `assertBillingCopyClean()` asserts they pass `isReminderCopyClean`
   AND contain no billing words (`trial`/`Plus`/`charge`/`subscribe`/`price`); a trial with <1 day
   left schedules none; `mockCancel` cancels it (routine reminders untouched); re-open re-syncs
   idempotently (no duplicates). The billing detail renders only in the PIN-gated Settings row.
   *(Live firing on device is a dev-client-only manual check — local scheduled notifications are
   caveated in Expo Go, §9 assumption 3; the automated test asserts the mocked
   `scheduleNotificationAsync`/cancel calls + `remindAt` math + copy cleanliness only.)*
3. **Settings discoverability:** the "Tiny Bubbles Plus" row shows Free vs "trial through {date}"
   and routes through the **PIN gate** to the paywall.
4. **PIN-on-purchase:** every route into the paywall demands the parent-set PIN (or `pin-missing`
   → set one) — never math/long-press — even though the buy is mocked.
5. **Acquisition-only downgrade:** with premium cosmetics equipped, flipping to free removes/hides
   NOTHING the child owns or sees; only ADD controls become upsells. (Existing test stays green;
   extend for soundscape/insights/companionThemes seams as those land.)
6. **Gate seams:** `<PremiumGate feature="companionThemes"|"noveltyPipeline"|"calmSoundscape"|
   "advancedInsights">` blocks the ADD control past the free ceiling and shows the calm upsell;
   `isFeatureUnlocked`/`canAddMore` are the only entry points (no scattered tier checks).
7. **No dark patterns / no claims:** paywall + reminder copy contain no urgency/countdown/anchor/
   medical strings; grep gate returns zero.
8. **Mock only:** no payment processor / network import anywhere; `purchases.ts` still mutates
   local state only; web export succeeds.

### Verify steps (an agent runs these)
```bash
# from the repo root (mind the SPACE in the path)
cd "/Users/ameyakashid/Desktop/adhd india/tiny-bubbles"
npx tsc --noEmit                 # 0 errors (incl. optional Entitlement.trialEndReminderAt)
npx jest                         # all suites green, incl. new billingReminders + extended entitlements tests
npx expo export --platform web   # web-safe bundle (mock only; no processor/native billing import)
# guards:
grep -rniE "revenuecat|react-native-purchases|StoreKit|purchaseProduct|purchasePackage" src app components \
  | grep -v "// TODO\|seam\|MOCK\|later"        # only seam COMMENTS may match; no live call
grep -rniE "hurry|last chance|limited time|only .* left|was \\\$|treats?|cures?|therapy|diagnos" \
  app/\(parent\)/paywall.tsx src/services/notifications.ts   # over-claim / dark-pattern gate → zero (allow "not therapy")
grep -rn "unlimited" src/services/entitlements.ts            # → zero
```
Then a manual smoke (Expo Go or web): PIN → paywall → **Start free trial** → status shows "trial
through {date}"; open Settings → "You're on Plus / trial through {date}" → tap → PIN → paywall →
**Cancel Plus** → confirm any equipped premium cosmetic is **still equipped and visible** on the
buddy; confirm no paywall/purchase affordance is reachable from any `(kid)` screen.

---

## 8. Dependencies + premium/free classification (AUTHORITATIVE)

**This section is the single source of truth for pricing tier of every feature.** Sibling specs
MUST conform to it and MUST gate only through `src/services/entitlements.ts`.

**Core-loop-always-free principle** (`00-SYNTHESIS.md` §3; `62-data-model.md` §12 "free tier must
genuinely work"): the loop + accessibility/safety + the offline cloud-portal replacements are
**FREE**; premium **adds depth/collection/scale/family**, never removes.

| Feature (spec slug) | Tier | Gate key | Why (honest) |
|---|---|---|---|
| Core loop: runner, celebration, token, nurture, mood-derivation | **Free** | — | The evidence-based loop; free tier must work. |
| Token economy + caregiver real-world rewards (redeem/escrow) | **Free** | — (menu size gated, see below) | Redemption is core; only the *menu length* is a soft gate. |
| Reward menu size | **Free 3 / Premium 6** | `rewardMenuSize` | Curated-autonomy ceiling **6**, never unlimited. 3 runs the loop. |
| Forgiving progress / streaks / bubble meter | **Free** | — | Anti-shame core. |
| Daypart engine + parent mission-control (`70-daypart`) | **Free** | — | Core scheduling/parent surface. |
| Onboarding, parental gate + PIN | **Free** | — | Safety baseline (COPPA/FTC). |
| Reminders (few, gentle) + trial-end reminder | **Free** | — | Core scaffolding; billing courtesy. |
| Age-adaptive theming, low-stim, **calm mode**, reduced-motion, OpenDyslexic, TTS/spoken labels | **Free — NEVER gated** | — | Accessibility/safety, not monetization. Must never be `<PremiumGate>`-wrapped. |
| **1 child profile** (full loop) | **Free** | `multiChild` (free 1) | Finch-style working free tier. |
| **2nd–8th child** (`multi-child`) | **Premium** | `multiChild` (premium 8) | Family scale; the one paywall axis. |
| Fast child switcher (`multi-child`) | **Free** | — | Only meaningful with children you already have. |
| Rotating/shared chores (`multi-child`) | **Free once ≥2 children** | — (transitive) | Part of multi-child value; gated only by needing a 2nd child. |
| **Local backup / restore** (offline cloud-portal replacement) | **Free** | — | Locked decision: the "your data" replacement must be free. |
| **Basic printable clinician report** (`clinician-reporting`) | **Free** | — | Locked decision: offline portal replacement must be free. |
| **Enhanced insights / richer trends** (`clinician-reporting`) | **Premium** | `advancedInsights` | Extra on-device depth over the free report. |
| Visual transition timer (`visual-timers`, #14) | **Free** | — | Cheap core scaffolding; time-perception support. |
| Mood / energy check-in (`mood-checkin`, #16) | **Free** | — | Supportive, opt-in; low friction. |
| Light verify + quick undo (`verify-undo`, #17) | **Free** | — | Reduces parent burden + anti-gaming; a fairness feature. |
| Child autonomy / "be the boss" (`child-autonomy`, #13) | **Free** | — (extra cosmetics gated) | SDT autonomy is core; only the *catalog size* is gated. |
| Companion cosmetic themes | **Free 2 / Premium 24** | `companionThemes` | Collection depth; **acquisition-only** (owned stays forever). |
| Base weekly quest rotation + day-of-year spotlight (`novelty-refresh`, #12) | **Free** | — | The anti-novelty-cliff base loop must work free (matches `novelty-refresh` §8.3 / arch §3.5). |
| Seasonal cosmetic packs + premium quest pool (`novelty-refresh`, #12) | **Premium** | `noveltyPipeline` | The retention-*depth* layer (extra content over the free rotation); acquisition-only. |
| Breathing / regulation calm path (`breathing-regulation`, #19) | **Free** | — | Calm mode must always be free (anti-shame + accessibility). |
| Basic ambient soundscape | **Free** | — | Part of calm mode. |
| **Premium calm/focus soundscape pack** (`soundscapes`, #20) | **Premium** | `calmSoundscape` | Extra content over the free ambient. |
| If-then plan firing + first 2 plans (`if-then-plans`, #21) | **Free** | — | Low-cost task-initiation scaffold; the free tier can always author 2 plans + fire them. |
| **If-then plan library (3rd–8th plan)** (`if-then-plans`, #21) | **Premium** | `ifThenPlans` | Count gate free 2 / premium 8; firing is never gated; downgrade removes nothing. |
| Adjustable focus intervals / breaks (`focus-intervals`, #22) | **Free** | — | Optional older-kid scaffold; keeps free tier useful (revisit if needed, §9). |
| Auto task-breakdown (AI) | **N/A — excluded** | — | ZERO-AI hard constraint. Not a feature. |
| HSA/FSA + published study (#25) | **Non-code** | — | Business/regulatory; trust asset, not a payer key. |

**Depends on (all shipped):** `settingsStore` (entitlement), `src/services/entitlements.ts`,
`src/services/purchases.ts`, `components/parent/PremiumGate.tsx`, `app/(parent)/paywall.tsx`,
`app/(gate)/parental-gate.tsx` (PIN-on-purchase), `src/services/notifications.ts` (reminder infra),
theme resolvers (`useThemeTokens`).

**Cross-feature spec dependencies (this file is the classification authority for them):**
`multi-child.md` (`multiChild` gate — already conformant), `novelty-refresh.md`
(`noveltyPipeline` + `companionThemes`), `soundscapes.md` (`calmSoundscape`),
`clinician-reporting.md` (`advancedInsights` premium over a free basic report), `child-autonomy.md`
(`rewardMenuSize` + `companionThemes` catalog). The pending **backup/restore** spec must serialize
the `tb/entitlement` slice as plain JSON in a whole-namespace export (no gating logic in the
export). None of these block this spec.

**Billing stays MOCKED** behind `src/services/purchases.ts` — no RevenueCat/StoreKit this build.

---

## 9. Open assumptions

1. **Purchase stays mocked (locked).** Real RevenueCat/StoreKit is the later wiring step (§5);
   this build ships the full paywall/entitlement/classification with the mock. Assumed acceptable
   that a "purchase" opens a real trial locally with zero money movement.
2. **Trial reminder timing = `trialEndsAt − 24h`.** Assumed one reminder, one day prior, is the
   honest minimum. If product wants two (e.g. −72h and −24h), add a second template + trigger
   (both must pass the copy gate). Firing exactly at day boundary vs a friendly hour: we
   quiet-hours-shift to a daytime minute.
3. **Trial reminder needs notification permission.** Assumed the post-purchase moment is an
   acceptable time to request it (the parent just opted into "remind me"). If permission is
   denied, the reminder silently no-ops (the paywall still shows the date) — no nag.
4. **Classification of the "keeps-free-tier-useful" v1/later features** (`focus-intervals`,
   `visual-timers`, `verify-undo`, `mood-checkin` kid-core) as **Free** is a product call favoring
   a genuinely-working free tier (`62-data-model.md` §12; Finch precedent). Any of these could later
   move behind a new `FEATURE_GATES` flag *for new acquisition only* without a data migration.
   **`if-then-plans` is NOT fully free:** plan *firing* + the first 2 plans are free, but the 3rd–8th
   plan sits behind the new `ifThenPlans` count gate (§3.4, §8) — the one classification change this
   spec introduces. `novelty-refresh` is likewise split (base rotation free, seasonal packs premium).
   Flagged so product can revisit the exact free-count (2) if needed.
5. **`companionThemes.premium = 24` and `multiChild.premium = 8`** are inherited ceilings, not
   "unlimited" (curated-autonomy + honest scarcity). Changing them is an `entitlements.ts` edit,
   not a feature change.
6. **Hardship / pay-what-you-can store representation.** In the mock it is a $0+ plan; a real
   store needs a $0-or-low product or a promo-code/scholarship flow (Joon/Focus-Bear precedent).
   Assumed handled at real-wiring time (§5); out of scope now.
7. **Entitlement lives on-device only, single-device** (offline-first, no accounts). A future
   sync/restore-across-devices layer is out of scope; a real RevenueCat integration would add
   cross-device restore via the store account, not our own backend.
8. **`repairEntitlement` (§3.3) is recommended, not strictly required** — entitlement has no
   shame-bearing field, so the app is safe without it; it is coherence hardening. If omitted,
   drop the corresponding test.
9. **The gate seams' *content* is owned by sibling specs (four existing flag gates + the new
   `ifThenPlans` count gate).** This spec guarantees the mechanism + classification + wrap points +
   the new `ifThenPlans` KEY; if a sibling spec ships before its gate is wired, the feature is simply
   ungated (free) until wired — acceptable interim, but tracked here so it isn't forgotten. (The
   `ifThenPlans` key itself MUST land in M-A1 since M-C5 hard-depends on it, §3.4.)
