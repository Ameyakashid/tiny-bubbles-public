# Feature Spec — Light Verification + Quick Undo (`verify-undo`)

*Durable, buildable spec. Feature #17 in `_build/research/01-feature-matrix.md` (v1 tier).
Companion to `_build/spec/01-current-state.md`. Authored against the ACTUAL shipped code
under `tiny-bubbles/` (verified green: `tsc --noEmit` = 0, 34 suites / 335 tests). This is an
ADDITIVE delta, not a rewrite. Every file path below is real.*

Build order for an ordinary recursive build-agent is in **§7 (Acceptance)** and the
**Milestones** at the end. Read **§6 (anti-shame/no-AI rules)** before writing any code —
those are hard invariants an agent must not violate.

---

## 1. Overview + user value

**What it is.** Two small, tightly-related safety features that protect the integrity of the
core loop without adding shame or parent burden:

1. **Light, optional task verification** — a parent can attach one of three OPTIONAL
   confirmation styles to a task: `self` (the child taps "I did it!"), `photo` (an optional
   on-device snapshot), or `parent` (the grown-up confirms later, at leisure). Verification is
   **NEVER a gate**: the step still completes and pays its token the instant the child taps
   Done, exactly as today. Verify is a *bonus confirmation*, never a blocker.
2. **Quick UNDO** — a fast, no-punishment reversal of an accidental tap, on either a
   **completed step** (the child, in a short window) or a **redemption** (the child for an
   auto-approved reward in a short window; the parent for any recently-approved reward).

**Why (honest demand + science).**
- **Community/market demand is direct and specific.** `00-SYNTHESIS.md` §4 pitfall #7:
  *"Gameable / burdensome verification. Kids swipe-complete without doing the task (Brili);
  parent approval becomes its own management burden; tiny un-zoomable verify photos (Joon).
  **Make verification light, optional, and quick-to-undo.**"* `01-feature-matrix.md` #17 cites
  `30` §3.7/§2.11 ("Joon has 'no undo', tiny verify photos; parent approval is a burden").
- **It de-risks the loop's #3 failure mode.** `00-SYNTHESIS.md` §6 risk #3: *"Parent-dependency
  breaks the loop. Joon's loop collapses when the parent disengages from verification… the
  parent likely has ADHD too. Mitigation: lighter approval UX, smart defaults, low-friction/
  optional verification, and reduced parent admin burden as an explicit design goal."* Optional
  parent-verify (confirm-at-leisure, never a gate) is exactly that lighter path.
- **Honesty guardrail.** This is a **UX / anti-gaming / parent-burden** feature. It is **NOT** a
  core-symptom efficacy mechanism and MUST NOT be marketed as one (`01-feature-matrix.md` #17
  lists no efficacy claim — the "Scientific justification" column is a failure-mode mitigation,
  not a treatment claim). No copy anywhere may imply verification "improves attention" or that
  photos are "checked."

**Current state (the seam that already exists).** The data model is verify-ready and undo-ready
but **entirely unwired** (`01-current-state.md` §4.3 #8, "[PARTIAL]"):
- `Verification { mode: 'none'|'self'|'photo'|'parent'; required; photoUri?; verifiedBy?;
  verifiedAt? }` already lives on every `Task` (`src/domain/types.ts` L98–108). All seeded tasks
  inherit `mode:'none'` (`src/data/taskTemplates.ts` L11 `DEFAULT_VERIFICATION`). **No verify UI
  renders anywhere.**
- `TokenReason` already includes `'undo'` (`src/domain/types.ts` L253), and
  `gamification.spend()`'s `SpendInput.reason` accepts `'undo'` (`src/domain/gamification.ts`
  L85). **No undo affordance exists** (skip exists; undo does not).

So this feature is mostly *wiring + a few small additive helpers*, not new architecture.

---

## 2. UX behavior — screen by screen

Resolution rule (hard, `01-current-state.md` §1.5): components read **capability flags /
resolved content / tokens**, never raw `ageMode`. The runner already switches layout on
`capabilities.multiStepVisible` (`components/task/TaskRunner.tsx` L292). All new UI follows the
same rule.

### 2.1 Verification — the kid loop (`components/task/TaskRunner.tsx`, new `VerifyPrompt.tsx`)

**Invariant first:** completion + token payout are unchanged and immediate. `onDone` in
`TaskRunner` (L154) still calls `completeStep` → celebration → advance, exactly as today,
**regardless of `task.verification.mode`**. Verify never sits *before* Done.

The verify affordance appears **at/after completion**, driven ONLY by `task.verification.mode`:

| mode | Young (focal, `multiStepVisible=false`) | Older (list, `multiStepVisible=true`) | Effect |
|---|---|---|---|
| `none` | nothing (today's behavior) | nothing | — |
| `self` | after Done, a big optional **"I did it! 👍"** tap (auto-spoken); a tiny sparkle, no confetti | a compact **"I did it"** chip on the just-resolved row | stamps `verifiedBy:'child'`, `verifiedAt`. **Token-neutral** (no extra tokens — avoids re-gaming) |
| `photo` | after Done, a big **"Show a photo? 📷"** + an equally-prominent **"Skip"** (never nagged twice) | a compact **"Add photo"** chip | opens on-device camera (`src/services/photoVerify.ts`); on success stamps `photoUri` + `verifiedBy:'child'` + `verifiedAt`; skippable, no penalty |
| `parent` | nothing kid-facing beyond normal completion (the grown-up confirms later) | same | flags the completed step for the **optional** parent confirmation queue (§2.4) |

- `VerifyPrompt` is a small presentational component rendered by the runner beside the
  DoneButton area (young) or inside `StepCard`'s resolved row (older). It **never** blocks the
  "next step" advance; the child can ignore it and move on.
- **Photo is on-device only.** `photoUri` is a local `file://` URI (never uploaded, never
  analyzed — §6). If the camera module/permission is unavailable (web, or Expo Go denial), the
  photo affordance is **hidden** (feature-detected in `photoVerify.ts`), so `self`/`parent`/
  `none` all work with zero new deps and photo gracefully no-ops.
- **Low-stim / calm:** `VerifyPrompt` renders in the Stillwater palette with no sparkle and no
  auto-speak insistence; `calmMode` hides the `self` sparkle entirely (the stamp still records).

### 2.2 Quick undo — a completed step, kid-side (`TaskRunner.tsx`, new `UndoBar.tsx`)

A transient, always-available safety net for an accidental Done tap. **Always on** (it is
safety, not a per-task option). Window = `UNDO_WINDOW_MS` (new constant, default **6000 ms**).

- **Non-last step (in-run):**
  - **Young:** immediately after Done, a friendly **"Oops — undo?"** bubble (`UndoBar`,
    `variant="focal"`) floats under the focal area with a gentle shrinking ring for the window,
    then fades. One large touch target (≥64dp). Tapping it undoes the step.
  - **Older:** the most-recently-resolved row shows a small inline **"Undo"** text button for
    the window (`UndoBar variant="row"`), and a resolved row is long-pressable → "Mark not
    done" as a persistent fallback.
- **Last step (routine complete):** the runner navigates to `app/(kid)/celebrate.tsx`. That
  modal shows a **secondary, low-emphasis "Oops, undo"** text link (never the focus — the big
  **Done** button stays primary). Tapping it undoes the final step, closes the modal, and
  returns the child to the routine at that step. (The runner passes `undoTaskId` as a route
  param so celebrate is stateless — §4.)
- **Undo effect (see §2.5 for the exact ledger/anti-shame semantics).** A soft neutral cue only
  (`playCue('tap.soft')` equivalent — the existing soft tap); **never** an error/Warning haptic;
  **never** shame copy.

### 2.3 Quick undo — a redemption, kid-side (`app/(kid)/rewards.tsx`, `components/rewards/RewardCard.tsx`)

The kid rewards screen already renders `RewardCard`s with a pending "never mind" (cancel) for a
still-`requested` hold (`app/(kid)/rewards.tsx` L175 `cancelReward`). ADD: when a reward's
most-recent redemption is **`approved`/`fulfilled` within `UNDO_WINDOW_MS`** (the auto-approve-
under-N path spends immediately with no parent step — `src/domain/tokens.ts` L87), show a short-
window **"Undo"** that fully reverses it (refund + status `reversed`, §2.5). This fixes the
"accidental auto-approved redeem, no undo" gap directly. Outside the window, only the parent can
reverse (§2.4).

### 2.4 Parent surfaces (`app/(parent)/dashboard.tsx`, new `components/parent/VerifyQueue.tsx`, `app/(parent)/tasks.tsx`)

Parent area is dense/utilitarian, behind the PIN gate, no `ageMode` branching (`ageModeLabel`
only). Three additions:

1. **"Ask to verify?" control in the assign sheet** (`app/(parent)/tasks.tsx`, existing
   `BottomSheetModal` at L342). Add a segmented control **Off · Self · Photo · Parent** to the
   draft (alongside emoji/color/schedule/tokenValue at L412). Also editable for an existing
   task. Sets `verification.mode`. Default stays `none` (light by default). The `required` flag
   is **never surfaced** (verification is never a gate — §6).
2. **Verify queue on the dashboard** (`components/parent/VerifyQueue.tsx`, rendered in the
   per-child `ChildCard`, `app/(parent)/dashboard.tsx` ~L244 near "Reward requests"). Lists
   **today's completed steps whose task is `mode:'parent'` and not yet confirmed**, each with a
   one-tap **"Looks good"** (stamps `verifiedBy:'parent'`, `verifiedAt`). For `mode:'photo'`
   completed steps it shows a **zoomable photo thumbnail** (tap → full-screen; fixes Joon's
   "tiny un-zoomable" complaint). This is a **CONFIRMATION at leisure, never a gate** — the
   child already earned their token; a never-confirmed step is fine, never "failed".
   **Empty + conditional-render (no blank/blaming state):** `VerifyQueue` renders **only when
   `stepsAwaitingParentVerify(cid)` is non-empty** — it is entirely hidden (not an "empty" card)
   when nothing awaits verify, exactly like the existing proposals block. **Dangling `photoUri`
   (cross-device restore, §restore):** a `mode:'photo'` step whose `photoUri` file is missing (e.g.
   after export→import onto a new device — backup carries the URI, not the image bytes, arch §6-C9)
   renders **nothing in the thumbnail slot** (no broken-image icon, no error) — the "Looks good"
   confirmation still works. Use `<Image onError>` → render null, or feature-check before mounting.
3. **Undo on recently-approved redemptions** (same dashboard `ChildCard`, the existing pending
   strip renders Approve/"Not yet" at L265–270). ADD an **"Undo"** on redemptions that are
   `approved`/`fulfilled` recently (parent mis-tap / auto-approve correction). Calls
   `reverseRedemption` (§2.5). No time limit for the parent (they own the correction).

### 2.5 Undo semantics (the load-bearing anti-shame detail)

**Step undo** reverses *only what should be reversible*, and deliberately leaves the child's
felt progress intact:

| Signal | On undo | Why |
|---|---|---|
| `Task.status` | back to `todo` | the step becomes "to do" again |
| active run pointer (`runProgressStore`) | step removed from `completedStepIds` (run re-created if it had auto-cleared on the last step) | re-arms the step so the runner shows it |
| daypart-complete marker | `clearDaypartComplete` **iff** undoing the last step | so the calm "done" panel yields back to the run (no morning-loop; doc 70 §B2) |
| **spendable `balance`** | **decreased by the step's granted delta, floored at 0** | corrects the mis-earned *currency* — the anti-gaming lever |
| `lifetimeEarned` | **UNCHANGED** | monotonic; the buddy's bond/growth (derived from it) **never shrinks** on undo — anti-shame |
| `cumulativeCount` ("bubbles popped"), streak, buddy mood/growth | **UNCHANGED** | monotonic/celebratory; a mis-tap never claws back felt progress or frowns the buddy |
| reinforcement `completions`/`sinceLastBonus` | MAY step back by one (optional; invisible bonus cadence) | correctness only; not required |

This split is the whole point: **undo corrects the spendable balance (anti-gaming) while
protecting every monotonic/celebratory signal (anti-shame).** A child who taps Done by accident
loses the *spendable bubble*, but keeps their "you've popped N bubbles" total and their buddy's
growth. The buddy can never react negatively (its mood union has no negative member —
`src/domain/types.ts` L50).

The ledger effect uses a **new pure helper `undoEarn`** (not `spend`), because undo is neither
an earn nor a spend — it cancels an accidental earn: it lowers `balance` (floored ≥0), appends a
`reason:'undo'` entry, and touches **neither** `lifetimeEarned` **nor** `lifetimeSpent`. (See §3
for the exact function; §9 for the one accepted tradeoff vs. `repairLedger`.)

**Redemption undo** = refund via the existing `gamification.refund()` (`reason:'redeem_refund'`,
`balance += cost`, `lifetimeSpent -= cost`; `src/domain/gamification.ts` L128) **+** flip status
to new terminal **`reversed`**. A `reversed` redemption no longer counts as a grant for
guardrails (cooldown/weekly-limit), because `isRewardAvailable`'s `isGrant` only counts
`approved`/`fulfilled` (`src/domain/tokens.ts` L220) — so availability correctly recovers.

---

## 3. Data-model additions (exact types + store)

Additive only. No breaking change; no destructive migration.

### 3.1 `src/domain/types.ts`

- **`RedemptionStatus`** (L471) — add one member:
  ```ts
  export type RedemptionStatus =
    | "requested" | "approved" | "fulfilled"
    | "declined" | "expired" | "canceled"
    | "reversed"; // NEW — an approved/auto-approved redemption undone (refunded)
  ```
- **`Verification`** (L100) — **no field change needed**; `photoUri`, `verifiedBy`, `verifiedAt`
  already exist and are now WIRED. Update the doc-comment on `required` to record that the kid
  runner **ignores** it (verification is never a gate; the field is retained for data
  compatibility only).
- **`TokenReason`** (L253) — **no change** (`'undo'` already present).
- **`StepResult`** (L215) — **no change** (StepResults are not written by the current core loop;
  verify state lives on `Task.verification`, see §3.4). Left untouched to avoid dead surface.

### 3.2 `src/domain/constants.ts`

Add:
```ts
/** Kid-side quick-undo window (accidental Done / auto-approved redeem). doc 62 §5. */
export const UNDO_WINDOW_MS = 6000;
```

### 3.3 `src/domain/gamification.ts` — new pure `undoEarn`

```ts
export interface UndoInput { id: string; ts: number; amount: number; refId?: string; note?: string; }

/**
 * Cancel an accidental EARN (feature #17). Lowers `balance` by `amount` FLOORED AT 0
 * (never negative), appends a `reason:'undo'` entry, and leaves BOTH `lifetimeEarned`
 * and `lifetimeSpent` untouched — undo is neither an earn nor a spend. Buddy growth
 * (from lifetimeEarned) and "bubbles popped" therefore never regress (anti-shame §6).
 * Pure; `now`/`id` passed in (deterministic, no RNG).
 */
export function undoEarn(ledger: TokenLedger, input: UndoInput): EarnResult {
  const removed = Math.max(0, Math.min(input.amount, ledger.balance));
  const entry: TokenEntry = {
    id: input.id, ts: input.ts, delta: -removed, reason: "undo",
    ...(input.refId !== undefined ? { refId: input.refId } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
  };
  return { ledger: { ...ledger, balance: ledger.balance - removed, entries: capEntries([entry, ...ledger.entries]) }, entry };
}
```
Also add a tiny selector used to find the delta to reverse:
```ts
/** The most recent earn entry for a given refId (the step just completed), or null. */
export function latestEarnFor(ledger: TokenLedger, refId: string): TokenEntry | null {
  return ledger.entries.find((e) => e.refId === refId && e.delta > 0 &&
    (e.reason === "task_complete" || e.reason === "routine_complete")) ?? null;
}
```

### 3.4 `src/domain/tokens.ts` — new `reverseRedemption`

```ts
/**
 * Undo an approved/auto-approved/fulfilled redemption (feature #17). Refunds the cost
 * (balance += cost, lifetimeSpent -= cost via gamification.refund) and marks the request
 * `reversed`. Guarded: only a real grant (approved|fulfilled) can be reversed — a stale
 * reverse on a requested/declined/canceled/expired/already-reversed request is a no-op.
 */
export function reverseRedemption(ledger: TokenLedger, request: RedemptionRequest, ctx: RedemptionContext): DecisionResult {
  if (request.status !== "approved" && request.status !== "fulfilled") return { ok: true, ledger, request };
  const { ledger: refunded } = refund(ledger, { id: ctx.id, ts: ctx.now, amount: request.costTokens, refId: request.id });
  return { ok: true, ledger: refunded, request: { ...request, status: "reversed", decidedAt: ctx.now } };
}
```
(Import `refund` from `./gamification`.)

### 3.5 `src/domain/tasks.ts` — pure parent-queue selector

```ts
/** A completed step still awaiting the OPTIONAL parent confirmation (mode:'parent'). */
export function needsParentVerify(task: Task): boolean {
  return task.status === "done" && task.verification.mode === "parent" &&
    (task.verification.verifiedAt == null || (task.lastCompletedAt != null && task.verification.verifiedAt < task.lastCompletedAt));
}
/** All of a child's steps awaiting parent confirmation right now. */
export function stepsAwaitingParentVerify(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.archived && needsParentVerify(t));
}
```

### 3.6 `src/state/runProgressStore.ts` — new `unmarkStepResolved`

One action that handles both mid-run and last-step (auto-cleared) undo:
```ts
/**
 * Re-arm a resolved step (quick undo). `resolvedTaskIds` = the routine's currently
 * done/skipped step ids (the caller derives from task statuses). If an active run
 * exists, drop `taskId` from its completedStepIds; if the run auto-cleared on the last
 * step, RE-CREATE it with completedStepIds = resolvedTaskIds minus taskId (intersected
 * with `stepIds` order). No-op if the child has no such run and no stepIds given.
 */
unmarkStepResolved: (cid, taskId, opts: { stepIds: string[]; routineId: string | null; resolvedTaskIds: string[] }) => void;
```
`completedDayparts` reuse the existing `clearDaypartComplete` (L126) for the last-step case.

### 3.7 Store ownership summary

| Concern | Store / file | Persisted? |
|---|---|---|
| `verification` mode + `photoUri`/`verifiedBy`/`verifiedAt` | `taskStore.tasks[cid]` (on the `Task`), written via existing `updateTask` | yes (existing slice) |
| step-undo ledger reversal | `childStore.ledgers[cid]` via `setLedger` (new `undoEarn` result) | yes (existing) |
| step-undo run re-arm | `runProgressStore` (`unmarkStepResolved`, `clearDaypartComplete`) | yes (existing) |
| redemption reverse | `childStore.ledgers` + `rewardStore.redemptions` (`updateRedemption`) | yes (existing) |
| undo window timing | transient component state / route param — **not persisted** (a safety net, must not survive a kill) | no |

### 3.8 Migration notes (additive, `SCHEMA_VERSION` unchanged)

- Adding `"reversed"` to `RedemptionStatus` and the new `UNDO_WINDOW_MS` constant are **pure
  additive** — no persisted record uses `reversed` yet, and `mergeWithDefaults`
  (`src/storage/migrations.ts` L182) preserves unknown keys, so **no `MIGRATIONS` entry and no
  `SCHEMA_VERSION` bump are required.**
- `validateAndRepair` (`src/storage/migrations.ts` L286) already keeps a valid non-negative
  `balance` and never lowers `lifetimeEarned`/`cumulativeCount`, so `undoEarn`'s lowered balance
  survives repair untouched.
- If a future schema bump lands anyway, add nothing for this feature; the shapes are
  forward-safe.

---

## 4. Exact files to CREATE / MODIFY (real paths under `tiny-bubbles/`)

### CREATE
- `components/task/UndoBar.tsx` — transient "Oops — undo?" affordance; `variant: 'focal' | 'row'`;
  shrinking-ring countdown (Reanimated, respects `t.motion.loopsEnabled` / reduced-motion);
  resolved copy + spoken; ≥64dp target; calls an `onUndo` prop.
- `components/task/VerifyPrompt.tsx` — optional self/photo affordance driven by
  `verification.mode`; `onSelfVerify` / `onPhoto` / `onSkip` props; never blocks; calm/low-stim
  variant; auto-speaks in young (not in calmMode).
- `components/parent/VerifyQueue.tsx` — dashboard section: pending parent-verify steps
  ("Looks good") + zoomable photo thumbnails; and the recently-approved-redemption "Undo" strip.
  Uses existing `components/parent/ui.tsx` primitives (`Card`, `SectionTitle`, `TextButton`).
- `src/services/photoVerify.ts` — feature-detected wrapper over `expo-image-picker`
  (`launchCameraAsync`, permission request); returns `{ uri } | null`; **no-throw**, hides itself
  when unavailable (web / Expo Go denial). Single seam isolating the one new dep (mirrors the
  `purchases.ts` / storage-port pattern). **Photo-file lifecycle (child-safety — a GUARANTEE, §9.3):**
  captured photos are copied into a dedicated **excluded-from-backup** dir (`FileSystem.cacheDirectory
  + "tb-photos/"`, or a Documents subdir flagged `NSURLIsExcludedFromBackupKey` — production-readiness
  §2.7); exports `deletePhoto(uri)` (no-throw) used to **delete the prior `photoUri` file on re-verify,
  on `wipeAllChildData` / delete-child, and on restore-replace**, so photos never leave the device via
  OS backup and never orphan. `deletePhoto` is a no-op on web / when the file is absent.
- `__tests__/state/verifyUndo.test.ts` — undo reverses balance but NOT lifetimeEarned/
  cumulativeCount; last-step undo clears the daypart mark + re-arms; verify never gates; redeem
  reverse refunds + flips to `reversed` + guardrail recovers; **`wipeAllChildData`/`removeChild`
  calls `deletePhoto` for every child photoUri (mocked `photoVerify`) — a wiped child leaves no
  orphaned photo files**; re-verify deletes the prior photo before stamping the new one.
- `__tests__/domain/undo.test.ts` — pure `undoEarn` (floors at 0, leaves lifetime totals),
  `latestEarnFor`, `reverseRedemption` guards, `needsParentVerify`.

### MODIFY
- `src/domain/types.ts` — add `"reversed"` to `RedemptionStatus`; refresh the `required`
  doc-comment (never a gate).
- `src/domain/constants.ts` — add `UNDO_WINDOW_MS`.
- `src/domain/gamification.ts` — add `undoEarn`, `latestEarnFor`.
- `src/domain/tokens.ts` — add `reverseRedemption` (import `refund`).
- `src/domain/tasks.ts` — add `needsParentVerify`, `stepsAwaitingParentVerify`.
- `src/state/runProgressStore.ts` — add `unmarkStepResolved`.
- `src/state/gameplay.ts` — add orchestrators: `undoStep(cid, taskId)`,
  `verifyStep(cid, taskId, { by, photoUri? })` (on re-verify, `deletePhoto(prevPhotoUri)` before
  stamping the new one), `reverseRedemption(cid, requestId)`; thread `verificationMode?` through
  `AssignTaskInput` + `makeTaskFromTemplate`. **`wipeAllChildData` and `removeChild`** must call
  `deletePhoto` for every `photoUri` on that child's tasks (photos live OUTSIDE the `tb/` keyspace, so
  the store wipe alone would orphan them) — so a wiped/removed child leaves **no orphaned photo files**.
- `components/task/TaskRunner.tsx` — render `UndoBar` after a non-last Done; render
  `VerifyPrompt` per `verification.mode`; pass `undoTaskId` to the celebrate route for the
  last-step case; call the new orchestrators.
- `components/task/StepCard.tsx` — older `RowStep`: inline verify chip + inline "Undo" on the
  most-recently-resolved row + long-press "Mark not done" fallback.
- `app/(kid)/celebrate.tsx` — secondary "Oops, undo" link (reads `undoTaskId` param → `undoStep`
  → `router.back()`); never the primary focus.
- `app/(kid)/rewards.tsx` + `components/rewards/RewardCard.tsx` — short-window "Undo" on a
  just-approved (auto-approved) redemption (`reverseRedemption`).
- `app/(parent)/dashboard.tsx` — mount `VerifyQueue` in `ChildCard`; add "Undo" to the
  approved-redemption strip.
- `app/(parent)/tasks.tsx` — add the "Ask to verify?" segmented control to the assign sheet;
  pass `verificationMode` into `assignTaskFromTemplate`; allow editing an existing task's mode.
- `src/theme/resolveContent.ts` — add copy keys (both `young`+`older`, compiler-forced):
  `undo.step` ({young:"Oops — undo?", older:"Undo"}), `undo.done`
  ({young:"Put it back 🫧", older:"Marked not done"}), `verify.self`
  ({young:"I did it! 👍", older:"I did it"}), `verify.photo`
  ({young:"Show a photo? 📷", older:"Add a photo"}), `verify.skip`
  ({young:"Skip", older:"Skip"}), `verify.parentConfirm` ({young:"Looks good!", older:"Looks good"}).
- `package.json` — add `expo-image-picker` (SDK 56-compatible) — see §5.
- `app.json` — **register the `expo-image-picker` config plugin** with honest permission strings so a
  production/EAS build has the required usage descriptions (Expo Go supplies them, so this is invisible
  until the store build — it MUST be added now):
  ```json
  ["expo-image-picker", {
    "cameraPermission": "Tiny Bubbles can take an optional photo to help a grown-up confirm a chore is done. Photos stay on this device.",
    "photosPermission": "Tiny Bubbles can attach an optional photo to a chore. Photos stay on this device."
  }]
  ```
  This generates `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (iOS) + the `CAMERA`
  permission (Android). No medical claim, no "required" wording. **This reconciles with
  production-readiness §2.1 (which now acknowledges M-B2 introduces camera) — the two must agree.**
- (docs) `THIRD_PARTY_NOTICES.md` — record `expo-image-picker` (MIT) per the standing rules.

---

## 5. Reused prebuilt libraries

**Prefer existing deps — almost everything reuses what's already installed:**
- Undo ring + affordance animations: `react-native-reanimated` (4.3.1, installed).
- Cues/haptics: existing `src/services/playCue.ts` (soft tap) + `src/services/haptics.ts`
  (positive-only; **no** Warning/Error cue exists — enforced by §6).
- TTS for spoken verify/undo copy: existing `src/services/tts.ts` + `components/ui/SpokenLabel.tsx`.
- Photo thumbnails: React Native `Image` (no new dep).
- All redemption/token math: existing `src/domain/gamification.ts` + `src/domain/tokens.ts`.

**One new MIT dep (isolated, feature-detected):**
- **`expo-image-picker`** (MIT, first-party Expo module) — the ONLY way to capture an on-device
  photo for `mode:'photo'`. Chosen because it is Expo-Go-compatible (bundled in Expo Go), managed
  by the Expo SDK version train (no bare-workflow break), and web-degrading. It is used **only**
  behind `src/services/photoVerify.ts`, which feature-detects and no-ops when the module or
  permission is unavailable — so `self`/`parent`/`none` verification and **all** of undo ship
  with **zero** new deps, and photo is a graceful additive enhancement. Add to
  `THIRD_PARTY_NOTICES.md`. (If a build target forbids new deps entirely, `mode:'photo'` degrades
  to `mode:'self'` behavior and the dep can be dropped.)

---

## 6. Anti-shame + no-AI rules that apply (hard invariants)

1. **Verification is NEVER a gate.** Completion + token payout are immediate and unconditional
   on tap of Done (`TaskRunner.onDone` unchanged). `Verification.required` is **ignored** by the
   kid runner and is never surfaced in the parent UI. A never-verified step is completely fine —
   it is never "incomplete", "pending", or "failed" to the child.
2. **Undo is a neutral correction, never a punishment.** Copy is playful-neutral ("Oops — undo?"
   / "Put it back"), never "you failed"/"points removed"/"that wasn't done". Feedback is a soft
   tap only. **No `NotificationFeedbackType.Warning`/`Error` toward a child** — the haptics
   service defines no such cue (`src/services/haptics.ts`); do not add one.
3. **Undo never regresses felt progress.** It reverses spendable `balance`, task status, and the
   run pointer only. It does **NOT** reduce `lifetimeEarned`, `cumulativeCount` ("bubbles
   popped"), the streak, or the buddy's bond/growth — all monotonic (`undoEarn` leaves lifetime
   totals untouched by construction; `cumulativeCount` is never decremented). The buddy never
   shrinks and never shows a negative mood (its union has no negative member).
4. **Parent-verify is confirm-at-leisure, never a blocker** — it exists to *reduce* burden (risk
   #3), not add it. An unconfirmed step is shown neutrally ("waiting for you", never "missed").
5. **ZERO AI.** Verification is manual (self-tap / photo / parent-tap). There is **no** image
   recognition, no "AI checks your photo", no auto-suggested verify, no LLM. Photos are stored
   **on-device only** (`file://` URI), **never uploaded, never analyzed, never leave the device**
   — consistent with the network-egress ban (doc 66 §1b.12). No new network path may read a
   photo URI or verify state.
6. **Curated + calm.** Verify affordances are single, optional, and low-stim-aware; no
   nag-repeat (photo prompt shows once with an equally-weighted Skip).

---

## 7. Acceptance criteria + verify steps an agent runs

**Global gates (run all three, must stay green):**
```
cd tiny-bubbles
npx tsc --noEmit          # 0 errors
npx jest                  # all suites pass (34 existing + the 2 new)
npx expo export --platform web   # web build succeeds (photo path degrades, never crashes)
```

**Behavioral acceptance (asserted by the new tests + manual runner check):**
1. **Verify never gates.** With a task `mode:'parent'` (or `self`/`photo`), tapping Done pays the
   base token and advances immediately (same tokens as `mode:'none'`); the verify affordance is
   purely additive. (`__tests__/state/verifyUndo.test.ts`)
2. **Self-verify is token-neutral.** `verifyStep(by:'child')` stamps `verifiedBy`/`verifiedAt`
   and changes **no** ledger value.
3. **Photo degrades safely.** With `photoVerify` unavailable (mock returns null / web), the photo
   affordance is hidden and completion + self/parent verify still work; no throw.
4. **Step undo (non-last):** after Done then `undoStep`, the step is `todo` again and is the
   current step; `balance` is back to pre-tap; `lifetimeEarned`, `cumulativeCount`, streak, and
   buddy growth are **unchanged**; balance never goes negative even if tokens were spent between.
5. **Step undo (last step):** `undoStep` on the routine's final step clears the daypart-complete
   mark (`isDaypartComplete` → false), re-creates the active run with the correct
   `completedStepIds`, and the runner leaves the "all done" panel back to that step.
6. **Redemption undo:** `reverseRedemption` on an `approved`/`fulfilled` request refunds the cost
   (`balance += cost`, `lifetimeSpent -= cost`), flips status to `reversed`, and the reward's
   guardrail availability recovers (`isRewardAvailable` no longer counts it). A reverse on a
   `requested`/`declined`/`reversed` request is a no-op (no double refund).
7. **Kid-side auto-approve undo window:** an auto-approved redeem shows "Undo" only within
   `UNDO_WINDOW_MS`; after that only the parent dashboard offers it.
8. **No raw ageMode:** grep the new components for a raw `ageMode` branch or an `ageMode` prop →
   zero; layout comes from `capabilities.multiStepVisible` and copy from `resolveContent`.
9. **No shame / no AI grep:** the new copy keys contain no "failed/missed/lost/removed"; no new
   Warning/Error haptic; no network call reads `photoUri`/verify state; no AI/LLM import.

---

## 8. Dependencies + premium/free classification

**Depends on (all already shipped):**
- Core loop / runner + `completeStep` (`components/task/TaskRunner.tsx`, `src/state/gameplay.ts`).
- Token ledger + escrow (`src/domain/gamification.ts`, `src/domain/tokens.ts`,
  `src/state/childStore.ts`, `src/state/rewardStore.ts`).
- Daypart run marker (`src/state/runProgressStore.ts`) for last-step undo.
- Theme resolvers (`src/theme/resolveContent.ts`, `resolveCapabilities.ts`).

**Related specs (soft, not blocking):**
- **Clinician progress report** (`01-current-state.md` §4.1 #2) — verify counts + parent-confirm
  rate can feed it later; do not build that coupling here.
- **Local backup/restore** (`01-current-state.md` §4.1 #1) — cross-cutting note: `photoUri`
  points to a **file** outside the `tb/` AsyncStorage slices, so the backup spec must decide
  whether to bundle photo files or export URIs only (open item, §9).
- **Mood check-in (#16)** and **advancedInsights (premium)** — independent; no coupling.

**Premium vs free: FREE (never gated).** Verify + undo protect the integrity of the *core loop*
and reduce parent burden/trust friction — they are safety/accessibility, not monetization. Per
`src/services/entitlements.ts` (the "NEVER-GATED" list) and doc 66 §1b.11, they must **not** be
wrapped in `<PremiumGate>`. Photos are on-device (no cloud cost). A future premium *insights*
report that *summarizes* verify history could be premium, but the verify/undo **actions**
themselves are always free.

---

## 9. Open assumptions

1. **Undo window = 6000 ms** (`UNDO_WINDOW_MS`) as a global constant, not per-child. If product
   wants it tunable, promote to a `ParentSettings` field later (additive).
2. **`undoEarn` accepts a small ledger drift.** Because it lowers `balance` without touching
   `lifetimeEarned`/`lifetimeSpent`, `balance` can be *less* than `lifetimeEarned −
   lifetimeSpent − held`. `repairLedger` keeps any valid non-negative balance (so the correction
   survives), and only on genuine corruption recomputes to `earned − spent` — which would
   "restore" undone tokens, a non-punishing, child-favoring recovery. Accepted as the anti-shame-
   correct tradeoff (buddy growth must never regress). If strict equation-consistency is later
   required, switch step-undo to `spend(reason:'undo')` (bumps `lifetimeSpent`, keeps the
   equation, still leaves `lifetimeEarned`/buddy growth intact).
3. **Recurring-task verify state overwrites per run.** `verifiedAt`/`photoUri` live on the
   recurring `Task.verification` and are replaced on the task's next completion; the prior local
   photo **IS deleted** on re-verify via `deletePhoto` (§CREATE `photoVerify.ts`) — a GUARANTEE, no
   longer "should," so storage stays bounded and no stale image lingers. This is sufficient for
   "confirm today's completion." A durable per-run verify history (via `StepResult`/`RoutineRun`,
   currently unwritten) is out of scope.
4. **Photo storage / backup boundary — RESOLVED.** Photos are stored in an **excluded-from-OS-backup**
   dir (`FileSystem.cacheDirectory + "tb-photos/"` or a Documents subdir flagged
   `NSURLIsExcludedFromBackupKey` — production-readiness §2.7), and the whole-`tb/`-keyspace backup
   carries the `photoUri` **string only, never image bytes** (arch §6-C9). So after export→import on a
   new device the file is absent and the thumbnail renders **nothing** (no broken-image icon — §2.4);
   restore-replace also `deletePhoto`s the outgoing device's photos. Photos are **guaranteed deleted**
   on re-verify, on `wipeAllChildData`/`removeChild`, and on restore-replace (§CREATE `photoVerify.ts`,
   §MODIFY `gameplay.ts`). A test asserts a wiped child leaves no orphaned `tb-photos/` files.
5. **Reinforcement counter step-back on undo is optional** (invisible bonus cadence); the build
   may skip it without user-visible effect.
6. **Parent step-correction (un-completing a step later) is out of scope.** Kid step-undo is a
   short-window safety net; the parent's durable levers remain reassign/redemption-reverse. Add
   a parent step-reversal later if demanded.
7. **`expo-image-picker` version** must match the installed Expo SDK 56 train; pin to the version
   `npx expo install expo-image-picker` resolves.
