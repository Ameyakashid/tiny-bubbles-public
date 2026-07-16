# Workstream w7 — Bloop Character (the interactive companion + safe chat surface)

*Durable, buildable spec for a recursive build-agent. Authored 2026-07-09. Owner scope: the **kid app's**
interactive Bloop — the always-on **deterministic character layer** and the off-by-default, parent-gated
**chat surface** that renders the w2 proxy's moderated replies. Extends the SHIPPED v1 app
(`tiny-bubbles/` → post-migration `apps/kid/`); it does NOT rewrite it. Authoritative inputs:
`_build/research2/00-SYNTHESIS2.md` §3 (+ §2.9 mock-seam), `_build/research2/01-v2-feature-matrix.md` rows
**B1, B2, B4, B5**, `_build/research2/companion-design.md`, `_build/inventory2/interactive-companion.md`,
`_build/spec2/01-current-and-target.md` §1.8/§1.9/§3, and the sibling specs `w2-llm-proxy-guardrails.md`
(the port/mock this WS consumes) + `w6-regulation.md` (the shared sensory panel). Donor code under
`/Users/ameyakashid/Desktop/adhd india/_sources2/`. Mind the SPACE in every absolute path.*

> **This workstream owns feature-matrix rows B1 (character layer), B2 (chat surface), B4 (novelty/durability),
> B5 (sensory & autonomy panel).** It builds the Rive/Lottie/`BubbleBuddy` character, the `react-native-gifted-chat`
> surface that calls `bloopProvider.sendTurn`, the `caps.bloopInputMode`/`bloopFreeTextAllowed` capability keys
> (which **w2 reads** into `BloopContext`), the opt-in durability layer (reusing v1 `questStore`), and the shared
> Sensory & autonomy panel. It does **NOT** build the moderation pipeline / persona prompt / crisis path
> (workstream **w2**, rows C1–C10 + B3), the Firebase backend/auth/rules/App-Check (**w1**), or the parent
> monitoring/consent/controls UI (**w3**, rows D1–D8). It **consumes** the `bloopProvider` port + `MockBloopProvider`
> from w2 and the `bloopEnabled`/`topicScope[]` settings authored by w3. See §8.

> ## HUMAN-AUTHORED-IN-BUILD callout (do NOT auto-generate the art or the reactive tuning)
> Per the locked brief, **the human (Fable/Opus) hand-crafts the character code + the bespoke `.riv` art in build.**
> The build-agent's job here is to land the **deterministic seam** around that craft: the pure `resolveBloopState`
> resolver, the `RiveInputContract`, the `BubbleBuddy` fallback wiring, the chat surface + provider call, the
> capability keys, the in-memory chat store, and the full test/grep-gate suite. The `.riv` art, the fine-tuned
> `BloopCharacter`/`useBloopRive` reactive timing, and the personality-bible motion are **hand-authored**; the
> agent scaffolds them with the sample `blinko.riv`/`avatars.riv` stand-ins and TODO markers, and never invents
> the final Bloop identity. Sections §2.3/§4 mark every hand-authored file `[HUMAN]`.

> ## LOCKED v2 decisions this workstream implements (do NOT relitigate)
> - **Bloop is TWO layers.** (A) an **always-on DETERMINISTIC character** — no model in the loop, ~80% aliveness
>   from motion, **IDENTICAL every time** for autism predictability, **NEVER withers/sulks/guilt-trips**; and
>   (B) an **OFF-BY-DEFAULT, parent-gated, moderated CHAT** surface that renders only the w2 proxy's approved text.
>   **The product fully works with the LLM disabled and offline** — the beloved character requires no LLM.
> - **The model is never rendered raw.** The chat surface renders **only** `ModeratedReply.text`; **TTS voices only
>   already-moderated text**; all guardrails live server-side in w2. This WS is a **UI shell + character**, no safety.
> - **Task-done-and-off, not time-in-app.** Optimize for real-world routine transfer via the parent loop; Bloop
>   hands back to the offline task and celebrates the *real* completion (Meng 2026 "Engagement Is Not Transfer").
> - **`neuroProfile` axis** (autism = predictable/low-stim · ADHD = novelty/bright · both = deterministic core +
>   opt-in previewed novelty) joins `ageMode` as a **resolver input** — NEVER a raw read in a component.
> - **Customization/autonomy is bounded** (name Bloop; pick look from 3–6 options; per-channel sensory toggles;
>   chat/voice on-off; Calm Mode) — never an open catalog (choice overload). Every sensory channel is opt-out-able.
> - **Additive-only.** New fields are optional on existing shapes; the chat message cache is **in-memory only**
>   (COPPA data-minimization). `SCHEMA_VERSION` stays **1**, `MIGRATIONS` stays **[]**.
> - **License:** ship only MIT/Apache/BSD. Here: `react-native-gifted-chat` (MIT), `rive-react-native` (MIT),
>   `lottie-react-native` (Apache-2.0 — preserve `LICENSE`/`NOTICE`), `moti`/Reanimated (MIT). Bespoke `.riv` art
>   is original work. No GPL/AGPL code ships.

> ## ⟦v2 FINAL reconciliation — the web/Expo-Go-safe invariant is LOAD-BEARING (§8 #33)⟧
> - **Rive AND Lottie are native libs with no web runtime → they must NEVER be statically imported on web/Expo
>   Go** (a top-level `import Rive from "rive-react-native"` red-screens Expo Go and breaks `expo export --platform
>   web`, failing M5.1). **Split the component: `BloopCharacter.native.tsx` (Rive) + `BloopCharacter.web.tsx`
>   (BubbleBuddy)**, OR gate the Rive/Lottie import behind a lazy `require` + runtime-availability check, so the
>   `BubbleBuddy` fallback path never pulls the native module. Add **`config.resolver.assetExts.push("riv")`** to
>   `apps/kid/metro.config.js` (Metro won't resolve a `.riv` asset without it). State both explicitly in §4 + M5.1.
> - **`gifted-chat`/`moti` must have SDK-56 / RN-0.85 / React-19.2 / New-Arch-compatible releases** — pin via
>   `npx expo install`; keep gifted-chat swappable behind the `BloopChat` wrapper (it has historically lagged
>   majors). A one-time **dev-client smoke build** (Rive render, gifted-chat mount) is the M5.x checkpoint the
>   tsc/jest/web-export floor cannot cover (§8 #25).
> - **`caps.bloopChatAvailable` is driven by the canonical `bloopEnabled`** (§8 #15); §3.5 `settings.bloopChatEnabled`
>   is the alias — add the end-to-end alias test (owned with w3's `controlsAlias.test.ts`).
> - **The 3-hour break-nudge is BUILT in w3 (D7)**; w7 only *displays* the nudge when w3 schedules it (§6.6 stays).

---

## 1. Overview + user value + verified evidence

### 1.1 What this delivers
A comorbid ADHD + autistic child gets a **lovable, reactive companion (Bloop)** they can name and customize, that:
1. **Is always present and alive** (idle breathing + blink + look-around + tap-reactions + celebrations),
   **100% deterministic** — the same event always produces the same reaction (parasocial identity + autism
   predictability), with **no model in the loop** and **no withering/sulking/guilt state, ever**.
2. **Can, once a parent turns it on, be talked to** through a heavily-railed chat surface — tap-to-say
   QuickReplies / AAC symbols by default, free text only when age + parent allow — where the child sees **only**
   pre-approved text from the w2 proxy, and Bloop's animation does ~80% of the emotional work.
3. **Stays fresh without breaking predictability** via an **opt-in, previewed** novelty layer (new cosmetics,
   collectible Bloop "friends") reusing v1's `questStore`.
4. **Respects every sensory channel** through a Sensory & autonomy panel (sound/haptics/animation/celebration/voice
   toggles + Low-Sensory/Standard/Lively presets + Calm Mode).

The character is the **beloved companion**; the chat is a *capability layered onto an already-beloved character*,
not the foundation — the safest possible architecture for a children's product (Common Sense Media, UNICEF, APA
all warn against child-facing AI companions).

### 1.2 User value
The one competitor square nobody occupies safely: a **genuinely safe, parent-visible, kid-scoped companion** that
is *lovable with the LLM completely off*. Caregiving reframe ("help Bloop feel calm") out-motivates willpower;
the character carries the reward loop, emotion/regulation, AAC and schedules with **zero** LLM and **zero** egress.

### 1.3 Verified evidence (cited honestly; engagement claims flagged; NOT therapy claims)
- **Baby-schema cuteness motivates caregiving — MODERATE/STRONG (engagement).** Manipulated infant faces with
  high baby-schema were rated cuter and elicited stronger caretaking motivation (Glocker et al. 2009, *Ethology*
  115(3):257–263, DOI 10.1111/j.1439-0310.2008.01603.x); baby-schema activates the nucleus accumbens reward
  circuit (Glocker et al. 2009, *PNAS* 106(22):9115–9119); the effect is present in **children** (Borgi et al.
  2014, *Front. Psychol.* 5:411). → Bloop is drawn to baby-schema (big round head ≈ body, large low eyes, tiny
  mouth, soft round body, no sharp edges — already the `BubbleBuddy` silhouette).
- **Familiar > novel for autistic kids — STRONG (for the predictable-core decision).** Autistic children engaged
  *more* with familiar than novel agent behavior (Rakhymbayeva et al. 2021, *Front. Robot. AI* 8:669972); a robot
  becoming *less* predictable drew *less* visual attention over time (Predictable Robots, *ACM TOCHI* 2021, DOI
  10.1145/3468849). → the character's core reactions are **deterministic and identical every time**; novelty is
  opt-in/previewed.
- **"Alive" comes from motion — practice-strong (Disney 12 principles).** Idle breathing/blink/look-around is the
  #1 aliveness cue; anticipation→celebrate + squash-and-stretch + contingent <150 ms tap-reactions read as a
  companion. Contingent immediate reinforcement also serves the ADHD need for sub-second feedback (v1 synthesis).
- **Never punish neglect — practice-strong + anti-shame (Finch vs Duolingo).** Withering/death "gives negative
  feedback for the behavior you want to drive" (Finch design rationale); Duolingo guilt/streak-loss is catastrophic
  for RSD/ADHD/autistic kids. → **hard never-list (§6).** This is already enforced in v1 code: `CompanionMood` is a
  **positive-only union** and the mouth `smile` is **clamped ≥ 0 (can never frown)** (`components/buddy/buddyVisuals.ts`).
- **Engagement ≠ transfer — sobering caveat.** A consumer-robot withdrawal study ("Engagement Is Not Transfer,"
  Meng et al. 2026, *IDC '26*, DOI 10.1145/3773077.3806118) flags novelty decay + substitution risk. → optimize
  for **task-done-and-off**, celebrate the *real* completion, hand back to offline life.
- **Chat surface = UI shell (n/a safety).** `react-native-gifted-chat` renders what the proxy approves; the
  AI-companion upside exists *only* as a monitored "copilot" (Papadopoulos 2025, DOI 10.1177/27546330251370657).
  The safety is entirely w2's output shield — **not this workstream.**

**No therapeutic-efficacy claim anywhere.** Bloop is a **scaffold**; it is disclosed (age-appropriately) as
"a friendly helper in the app, not a real animal or person, and not a doctor."

---

## 2. UX behavior — screen by screen (neuroProfile × ageMode × low-stim, via resolvers only)

**Golden rule (enforced):** no component reads raw `ageMode`/`neuroProfile`. All variation flows through
resolvers — `resolveCapabilities` (adds `bloopInputMode`/`bloopFreeTextAllowed`/`bloopChatAvailable`),
`resolveBloopState` (the pure event→character-state map), `resolveBloopPresentation` (animation amplitude /
particles / celebration salience from sensory inputs), `resolveContent` (copy + `buddy.artVariant`), and
`voiceParamsFor` (TTS pitch/rate). `neuroProfile` is a resolver **input**, never a prop or a branch.

### 2.1 The `neuroProfile` × sensory presets (how autism vs ADHD change Bloop)
Resolved once (see §3.5). The preset only sets **defaults**; every value stays parent-overridable per child, and
OS Reduce-Motion always clamps motion to off (as today). Existing children with no `neuroProfile` resolve to
**"both"** → byte-identical to v1.

| Preset | Character motion | Chat input default | Novelty | Voice/sound |
|---|---|---|---|---|
| **autism** | slow, low-amplitude idle; identical reactions every visit; **no surprise skin/UI change**; celebration flourish dampened | **chips / AAC** (PII-free by construction); free-text off by default | off by default (opt-in + **previewed**) | sound + pacing-haptics **off** by default; single consistent voice, toggleable |
| **ADHD** | livelier idle + brighter, faster celebrate; more chip variety | chips, with **free-text allowed sooner** (age + parent gate) | on (previewed) | sound + haptics on; voice on |
| **both** (default) | deterministic core + opt-in previewed extras | chips; free-text via age + parent gate | opt-in previewed | standard defaults |
| **low-stim** (`sensoryMode="lowStim"` / Low-Sensory preset) | idle amplitude dampened, **particles disabled**, no celebration flourish on reply | unchanged | unchanged | quieter; celebration audio muted |
| **ageMode** (`young`/`older`/`preteen`) | `young` = bigger, bubblier (art via `companionStyle`, never ageMode) | `young` = **chips only + auto-TTS**; `older`/`preteen` = free-text may be allowed | — | `voiceParamsFor` (young higher/slower) |

### 2.2 The always-on character (no LLM, always FREE)
- **Where it lives:** Bloop **replaces/wraps** the shipped companion render sites — `app/(kid)/buddy.tsx` +
  `components/buddy/BuddyRoom.tsx` (the buddy tab/room), the celebration moment in `components/task/TaskRunner.tsx`
  (step/routine complete), and the calm corner co-regulation (shared with w6). It is present the same way
  `BubbleBuddy` is today; nothing about the core loop changes.
- **Deterministic state machine (identical every time).** From `companion-design.md` §7.2, driven by the pure
  `resolveBloopState(stimulus, ctx)` → a `BloopCharacterState` + Rive inputs. States:

| State | Trigger (stimulus) | Visual / behavior | Sensory (respects toggles) |
|---|---|---|---|
| **Idle/Present** | default, foreground | slow breathe-scale + periodic blink + occasional look-around | silent |
| **Greet** | app open / return | small happy bounce, "hi \[name\]" | soft chime + light haptic (if on) |
| **Listening** | child opens chat / starts input | leans in, eyes attentive | silent |
| **Thinking** | proxy request in flight (`TypingIndicator`) | gentle "hmm" wobble | silent (masks latency) |
| **Talking** | moderated reply / scripted line shown | mouth-move, matching expression | **TTS voices `reply.text` only** (if on) |
| **Mood-mirror** | child selects an emotion (w6) | reflects the chosen category color, then models calming | color shift; optional soft tone |
| **Co-regulate/Breathe** | breathing/sensory tool active (w6) | slow expand/contract "breathe with me" loop | optional slow haptic pulse |
| **Anticipate→Celebrate** | step/routine/first-then complete | wind-up → squash-stretch jump + sparkle | celebration sound + haptic + confetti (each toggle-gated) |
| **Encourage** | child stalls | warm, calm nudge; **NEVER sad/disappointed** | soft, optional |
| **Rest/Sleep** | quiet hours / long idle | curls up, gentle Zzz (calm, not guilt) | silent |
| **Neglect-return** | opened after days away | **Greet + "so glad you're back," no scolding** | warm, gentle |

  **Hard rule: NO Withering / Sick / Dying / Sulking / Crying-at-you states, ever.** `resolveBloopState` can only
  return a state in this table; there is no negative member (compile-enforced, like `CompanionMood`).
- **Contingent responsiveness.** Tap Bloop → quick giggle/wiggle within ~150 ms (reuses the existing
  `BubbleBuddy` `onPress` micro-motion). Reactions are identical for identical stimuli (predictability).
- **Rive-or-fallback.** `BloopCharacter` renders the **Rive** state machine when a dev client / native runtime is
  available; on **Expo Go / web / any platform without Rive it falls back to the shipped procedural `BubbleBuddy`**
  (SVG + Reanimated) so the tree stays Expo-Go-runnable, web-exportable, and green. Both share the same
  positive-only mood + the never-frown clamp.

### 2.3 The chat surface (OFF by default, parent-gated, always FREE when on) — `app/(kid)/bloop.tsx`  [HUMAN tunes avatar]
- **Reachability = the off-by-default posture.** The chat entry point (a chip on the buddy room) and the `bloop`
  route **only render when `caps.bloopChatAvailable` is true** — i.e. the parent enabled it (`bloopEnabled` in
  Firestore `children/{id}`, mirrored to `ChildSettings.bloopChatEnabled`; default **false**). With it off, the
  character is fully present and the chat simply does not exist in the UI.
- **The surface** = `react-native-gifted-chat`'s `GiftedChat` with: `renderAvatar` = the `BloopCharacter`
  (reacts to the message being shown), `QuickReplies` (curated tap-to-say chips / AAC symbols — the default
  input), `TypingIndicator` = "Bloop is thinking" (drives the character's **Thinking** state, masks proxy latency),
  and a **gated free-text `Composer`** shown only when `caps.bloopFreeTextAllowed`.
- **Turn lifecycle (client side).** input (chip / AAC payload / gated free text) → `bloopProvider.sendTurn(input,
  ctx)` (the w2 seam; default = `MockBloopProvider`, offline) → while pending, `isTyping=true` + Bloop **Thinking**
  → on resolve, render **only** `reply.text` in the Bloop bubble, drive **Talking**, and **TTS `reply.text` only**
  (if voice on) → render `reply.quickReplies` as the next chips → append to the in-memory `bloopChatStore`
  (§3.3). The client **never** calls a model, never renders unmoderated text, never writes Firestore directly.
- **Every `ModeratedReply.status` has a warm rendering** (statuses defined by w2): `ok`/`redirect`/`refused`/
  `crisis`/`rateLimited`/`disabled`/`error`. `crisis` additionally renders w2's grown-up-facing `CrisisCard`
  (from the human-reviewed locale table) — this WS only *displays* it; the alert + FCM are w2/w1's job. A cold
  refusal is never shown (w2's `no_refusal` swaps it for the warm line before it reaches the client).
- **`ctx` build (no raw axis read).** The surface assembles `BloopContext` from **capability flags + the active
  child id/session** (`caps.bloopInputMode`, `ctx.topicScope` from settings, `sessionId` from the store); the
  server shapes persona tone from `neuroProfile`/`ageMode`. The client passes `ageMode`/`neuroProfile` through
  only as *data in the context object*, exactly as `voiceParamsFor(ageMode)` is a sanctioned resolver input — it
  is never a rendering branch.

### 2.4 The Sensory & autonomy panel (B5, FREE) — `components/bloop/SensoryAutonomyPanel.tsx` (shared with w6)
One panel, two owners (this WS + w6's sensory profile). Kid-facing subset in the kid app; full editing in the
Parent app (w3). Controls: **per-channel toggles** (Sound / Haptics / Animation-intensity / Celebration-effects /
Voice) + **global presets** (Low-Sensory/Calm · Standard · Lively; default follows OS Reduce-Motion) + **autonomy**
(name Bloop [reuses `buddyStore.renameCompanion`]; pick look from **3–6** options [reuses `buddyStore` cosmetics +
`caps.canPickColor/Accessory/Theme`, ceiling 6]; chat on/off [when parent allows the child to toggle]; voice
on/off; **"keep things familiar"** = dampen novelty introductions; a non-gamified **Calm Mode** [reuses the shipped
`ChildSettings.calmMode`]). All toggles are opt-out-never-lock (never disables a channel the parent explicitly
enabled). TTS-labeled, big targets, no raw `ageMode`.

### 2.5 The novelty / durability layer (B4) — reuses v1 `questStore`
Beats the 4–8 week cliff *without* breaking predictability: novelty is an **opt-in, previewed content layer** —
new Bloop cosmetics + collectible "friends" + quest themes surfaced through the **shipped** `questStore`
(`tb/quests`) + `src/domain/{quests,novelty}.ts` (deterministic ISO-week rotation + day-of-year spotlight, **no
`Math.random`**). Under the **autism** preset (or "keep things familiar" on) the layer is **suppressed by default**;
under **ADHD** it is on. New cosmetics are **forewarned, never a surprise UI/identity change**. No countdown / FOMO
/ expiry copy (v1 `SeasonalPack` has no `availableUntil`). Bloop's core silhouette, face, and voice never change.

---

## 3. Data model

All additions are **additive + optional** on existing shapes, or **in-memory only** → they merge through
`mergeWithDefaults`/`validateAndRepair`, are auto-covered by `collectTbSlices()` backup (whole-`tb/` keyspace),
cleared by `wipeAllChildData`, counted in `DataReview`, and extend the migration-forward fixture. **No new
persisted `tb/*` slice is added by this workstream → `SCHEMA_VERSION` stays 1; `MIGRATIONS` stays [].**

### 3.1 Reused persisted state (NO new slice)
- **`tb/buddy`** (`src/state/buddyStore.ts`, `CompanionState`) — Bloop's identity/mood/customization/bond/growth,
  **unchanged**. `mood` is the positive-only `CompanionMood`; `name`/`equipped`/cosmetics power B5 autonomy; the
  monotonic `bondLevel`/`growthStage` power the (never-shrinking) growth. The character layer READS this; it adds
  no field to it.
- **`tb/quests`** (`src/state/questStore.ts`) — reused as-is for B4 (opt-in novelty). No change.

### 3.2 Additive OPTIONAL fields on `ChildSettings` (persisted in `tb/child/<cid>/profile`)
```ts
// packages/shared/src/domain/types.ts (pre-extraction: apps/kid/src/domain/types.ts)
export type SensoryPreset = "lowSensory" | "standard" | "lively";
export type BloopInputModePref = "chips" | "aac" | "freeText";

export interface ChildSettings {
  // ...existing fields unchanged (soundEnabled, hapticsEnabled, reducedMotion,
  //    sensoryMode, calmMode, spokenLabelsEnabled, autonomy grants, ...)...

  /** Bloop CHAT master (mirrors Firestore children/{id}.bloopEnabled, authored by w3).
   *  Absent ⇒ false (chat OFF by default). Additive/optional → NO schema bump. */
  bloopChatEnabled?: boolean;
  /** Bloop TTS voice on/off. Absent ⇒ derived from spokenLabelsEnabled + preset. */
  bloopVoiceEnabled?: boolean;
  /** child/parent-preferred chat input modality (bounded by age + parent gate). */
  bloopInputModePref?: BloopInputModePref;
  /** global multisensory preset; absent ⇒ derived from neuroProfile + OS Reduce-Motion. */
  sensoryPreset?: SensoryPreset;
  /** celebration-effect intensity 0..1 (0 = none). Absent ⇒ preset default. */
  celebrationIntensity?: number;
  /** idle/reaction animation amplitude 0..1. Absent ⇒ preset default; clamped by Reduce-Motion. */
  animationIntensity?: number;
  /** B4 "keep things familiar" — suppress novelty introductions. Absent ⇒ derived from neuroProfile. */
  keepFamiliar?: boolean;
}
```
`neuroProfile` itself is added to `ChildProfile` by **w6** (`ChildProfile.neuroProfile?: NeuroProfile`); this WS
**consumes** it via the resolvers and does not re-declare it. If w6 has not landed, this WS may land the
`NeuroProfile` union defensively (union widening, additive) and w6 reconciles — coordinate one definition.

### 3.3 New IN-MEMORY store (NOT persisted — COPPA data-minimization)
```ts
// apps/kid/src/state/bloopChatStore.ts — session-scoped, mirrors sessionStore/focusSessionStore discipline.
// A force-quit simply drops the local chat (the AUTHORITATIVE transcript is Firestore, written by functions/
// (w2) PII-redacted + TTL). Keeping NO child chat in tb/* is the minimal-data choice; nothing to migrate.
export interface BloopChatSession {
  sessionId: string;
  childId: string;
  messages: IMessage[];              // gifted-chat's serializable message shape (approved text only)
  characterState: BloopCharacterState;
}
export interface BloopChatStore {
  session: BloopChatSession | null;
  start(childId: string): void;
  appendChild(text: string, inputMode: BloopInputMode): void;   // local echo of the child's tapped/typed turn
  appendBloop(reply: ModeratedReply): void;                     // approved reply.text only
  setCharacterState(s: BloopCharacterState): void;
  end(): void;                                                  // cleared on leave / child switch / wipe
}
```

### 3.4 New NON-persisted domain / resolver / catalog types
```ts
// packages/shared/src/bloop/character.ts — BORN SHARED (parent app previews the same state map).
export type BloopCharacterState =
  | "idle" | "greet" | "listening" | "thinking" | "talking"
  | "moodMirror" | "coRegulate" | "celebrate" | "encourage" | "rest" | "neglectReturn";
//  ^ positive/neutral ONLY. There is deliberately NO withering/sick/sulk/cry member.

/** What can drive Bloop. A superset of v1 CompanionEvent + the chat-lifecycle + regulation stimuli. */
export type BloopStimulus =
  | { kind: "appOpen"; awayMs: number }        // → greet | neglectReturn (deterministic threshold)
  | { kind: "tap" }
  | { kind: "companionEvent"; event: CompanionEvent }   // reuse v1 stepDone/routineComplete/tokenEarned/...
  | { kind: "chatOpen" } | { kind: "turnPending" } | { kind: "turnReply"; status: ModeratedReplyStatus }
  | { kind: "emotionPicked"; core: EmotionCoreId }      // w6 mood-mirror
  | { kind: "breathePhase"; scale: number }             // w6 co-regulate (from breathPhaseAt().scale)
  | { kind: "stall" } | { kind: "quietHours" } | { kind: "idleLong" };

export interface BloopStateContext {
  mood: CompanionMood;         // from buddyStore (positive-only)
  neuroProfile: NeuroProfile;  // resolver input (never a component branch)
  now: number;
}

/** PURE + DETERMINISTIC: identical stimulus + ctx ⇒ identical output, always. NO Math.random, NO Date.now(). */
export function resolveBloopState(
  stimulus: BloopStimulus,
  ctx: BloopStateContext,
): { state: BloopCharacterState; moodInput: CompanionMood; celebrate: boolean };

/** The documented artboard interface the [HUMAN] .riv author implements + useBloopRive drives. */
export interface RiveInputContract {
  stateMachineName: string;               // e.g. "Bloop"
  numberInputs: { mood: number; motionAmplitude: number };  // motionAmplitude dampened under lowStim/ReduceMotion
  boolInputs: { listening: boolean; talking: boolean };
  triggers: readonly ("greet" | "celebrate" | "coRegulate" | "rest")[];
}
```
```ts
// apps/kid/src/theme/resolveBloopPresentation.ts — PURE resolver (like resolveCelebration).
export interface BloopPresentation {
  animationScale: number;      // 0..1 idle/reaction amplitude
  celebrationSalience: CelebrationSalience;  // reuse resolveCelebration's type
  particlesEnabled: boolean;
  voiceEnabled: boolean;
}
export function resolveBloopPresentation(input: {
  neuroProfile: NeuroProfile; sensoryMode: SensoryMode; reducedMotion: boolean;
  ageMode: AgeMode; settings: Pick<ChildSettings, "sensoryPreset"|"celebrationIntensity"|"animationIntensity"|"bloopVoiceEnabled"|"spokenLabelsEnabled">;
}): BloopPresentation;   // Reduce-Motion clamps animationScale→low + particlesEnabled→false, always.
```

### 3.5 `resolveCapabilities` additions (the keys w2 consumes)
Add to `ModeCapabilities` (in `apps/kid/src/theme/resolveCapabilities.ts`), computed from `neuroProfile` + `ageMode`
+ the parent gate — **never** read raw in a component:

| Flag | Type | Default rule | Consumer |
|---|---|---|---|
| `bloopChatAvailable` | `boolean` | `settings.bloopChatEnabled === true` (parent-gated; default false) | gates the `bloop` route + entry chip (§2.3) |
| `bloopInputMode` | `"chips"\|"aac"\|"freeText"` | autism/young ⇒ `"chips"` (or `"aac"` if AAC preferred); older+ADHD ⇒ may be `"freeText"` | **w2** reads into `BloopContext`; the surface's default input |
| `bloopFreeTextAllowed` | `boolean` | `false` for `young`; `older`/`preteen` ⇒ `settings.bloopInputModePref === "freeText"` AND parent-allowed | gates the free-text `Composer` |

### 3.6 Firestore (additive oversight; on-device stays source of truth)
- **READS ONLY** (authored by w3/w1): `children/{childId}.bloopEnabled`, `.topicScope[]`, `.limits`,
  `.neuroProfile`, `.ageMode`, `.locale` — pulled down by the sync adapter (w1/w6) into on-device settings; the
  chat surface reads them via capability flags / `ctx`. **This WS writes NOTHING to Firestore directly** (the
  transcript write is server-side in `functions/`, w2) → the app tree stays **no-egress** (the only online call
  is `bloopProvider.sendTurn`, which uses the Firebase SDK callable inside w2's provider).
- **Offline-first:** the character + B4 + B5 + the Sensory panel are 100% offline. Chat, when on with the real
  proxy, is the one online feature; with the default `MockBloopProvider` it is offline too.

### 3.7 Additive-sync + migration
Every §3.2 field is optional → `mergeWithDefaults` backfills, `validateAndRepair` coerces (clamp
`animationIntensity`/`celebrationIntensity` to `[0,1]`; unknown `sensoryPreset`/`bloopInputModePref` → `undefined`
→ resolver default; non-boolean flags → `undefined`). The migration-forward fixture gains an old `ChildSettings`
blob lacking all Bloop fields → proves clean merge, `SCHEMA_VERSION` still 1. The in-memory `bloopChatStore` has
**zero** migration surface.

---

## 4. Exact files to CREATE / MODIFY (real monorepo paths)

Paths are the post-migration `apps/kid/…` / `packages/shared/…` layout (`_build/spec2/01-current-and-target.md`
§2). Pre-migration equivalents drop the `apps/kid/` prefix. If `packages/shared` is not yet extracted, land shared
modules under `apps/kid/src/…` and re-export later (one module per commit, kid suite green each step). `[HUMAN]`
= hand-authored in build (art / reactive tuning); the agent scaffolds it with the sample `.riv` + TODO markers.

### CREATE
| Path | Purpose |
|---|---|
| `packages/shared/src/bloop/character.ts` | `BloopCharacterState`, `BloopStimulus`, `BloopStateContext`, **pure `resolveBloopState`** (deterministic, no RNG), `RiveInputContract` (§3.4) |
| `packages/shared/src/bloop/index.ts` (⇄ extend w2's barrel) | re-export character + reused provider types |
| `apps/kid/src/state/bloopChatStore.ts` | in-memory session chat store (§3.3), never persisted |
| `apps/kid/src/theme/resolveBloopPresentation.ts` | pure animation/celebration/voice resolver (§3.4) |
| `apps/kid/components/bloop/BloopCharacter.native.tsx` | **[HUMAN]** Rive-driven character (native only); renders `RiveInputContract` via `useBloopRive`; imports `rive-react-native`/`lottie-react-native` (NEVER reachable on web/Expo Go) |
| `apps/kid/components/bloop/BloopCharacter.web.tsx` | the guaranteed `BubbleBuddy` fallback (web/Expo Go); **no** Rive/Lottie import — keeps `expo export --platform web` + Expo-Go boot green (§8 #25) |
| `apps/kid/components/bloop/useBloopRive.ts` | **[HUMAN]** driver hook (native): `resolveBloopState` output → `fireState`/`setInputState` on `RiveRef` |
| `apps/kid/components/bloop/BloopChat.tsx` | gifted-chat wrapper (QuickReplies/TypingIndicator/`renderAvatar`=`BloopCharacter`); calls `bloopProvider.sendTurn` |
| `apps/kid/components/bloop/BloopComposerGate.tsx` | free-text-vs-chips gate (reads `caps.bloopFreeTextAllowed`) |
| `apps/kid/components/bloop/SensoryAutonomyPanel.tsx` | B5 panel (shared with w6; reuses `VolumeSlider`, cosmetic pickers, `renameCompanion`) |
| `apps/kid/app/(kid)/bloop.tsx` | chat screen (pushed modal; renders `BloopChat`; guarded by `caps.bloopChatAvailable`) |
| `apps/kid/assets/rive/bloop.riv` | **[HUMAN]** bespoke Bloop artboard (build stand-in: copy `_sources2/rive-react-native/example/assets/rive/blinko.riv`) |
| `apps/kid/__tests__/domain/bloopCharacter.test.ts` | determinism (same stimulus ⇒ same state), never-negative state, no-RNG grep |
| `apps/kid/__tests__/theme/resolveBloopPresentation.test.ts` | exhaustive neuro×sensory×age table; Reduce-Motion clamps |
| `apps/kid/__tests__/theme/resolveCapabilities.bloop.test.ts` | `bloopChatAvailable`/`bloopInputMode`/`bloopFreeTextAllowed` defaults + gates |
| `apps/kid/__tests__/state/bloopChatStore.test.ts` | append/clear; only approved text stored; cleared on end/switch |
| `apps/kid/__tests__/render/bloop.render.test.tsx` | chat renders with mock provider; hidden when `bloopChatAvailable=false` |
| `apps/kid/__tests__/config/bloop-copy-clean.test.ts` | grep gate: no sycophancy / "always here" / guilt / "AI friend" / withering strings |

### MODIFY (additive)
| Path | Change |
|---|---|
| `packages/shared/src/domain/types.ts` (or `apps/kid/src/domain/types.ts`) | add `SensoryPreset`, `BloopInputModePref`; the §3.2 optional `ChildSettings` fields; (defensively) `NeuroProfile` union if w6 hasn't landed it |
| `apps/kid/src/theme/resolveCapabilities.ts` | add `bloopChatAvailable`, `bloopInputMode`, `bloopFreeTextAllowed` (§3.5); unchanged when settings absent |
| `apps/kid/src/theme/ThemeProvider.tsx` | thread `neuroProfile` (from active `ChildProfile`) into the Bloop resolvers (coordinate with w6's identical thread — do it once) |
| `apps/kid/app/(kid)/_layout.tsx` | register `bloop` as `presentation:"modal"` in both shells + `href:null` in tabs; add to the `GrownUpsDoor` hide-list; entry chip gated by `caps.bloopChatAvailable` |
| `apps/kid/app/(kid)/buddy.tsx`, `apps/kid/components/buddy/BuddyRoom.tsx` | mount `<BloopCharacter>` (primary) wrapping/replacing `<BubbleBuddy>`, keeping the fallback; add the (gated) "Talk to Bloop" chip |
| `apps/kid/components/task/TaskRunner.tsx`, `components/celebration/CelebrationOverlay.tsx` | fire Bloop **Celebrate** on step/routine complete via `resolveBloopState` + `resolveCelebration` (additive; no change to `onDone`/token/celebration logic) |
| `apps/kid/app.json` | add `rive-react-native` + `lottie-react-native` config plugins (dev client); keep `android.allowBackup:false` |
| `apps/kid/metro.config.js` | **add `config.resolver.assetExts.push("riv")`** so the `.riv` artboard resolves; keep the monorepo `blockList`/`extraNodeModules` (§8 #25) |
| `apps/kid/package.json` | add `rive-react-native` (MIT), `lottie-react-native` (Apache-2.0), `react-native-gifted-chat` (MIT), `moti` (MIT); dep on `@tiny-bubbles/shared` |
| `apps/kid/THIRD_PARTY_NOTICES.md`, `apps/kid/PROVENANCE.md` | add Rive (MIT), Lottie (Apache-2.0 — **preserve `LICENSE`/`NOTICE`**), gifted-chat (MIT), moti (MIT) |
| `apps/kid/src/state/gameplay.ts` | `wipeAllChildData` / `switchActiveChild` also `bloopChatStore.end()` (clear the in-memory session) |
| `apps/kid/__tests__/storage/*` migration-forward fixture | old `ChildSettings` without any Bloop field → clean merge, no bump |
| `apps/kid/__tests__/config/no-network.test.ts` (⇄) | confirm the new files add no raw egress literal (the only online path is w2's SDK callable) |

**No `functions/` changes.** This workstream is UI + character only; the moderation pipeline, persona prompt,
crisis path, transcript write, and FCM are entirely w2/w1.

---

## 5. Reused donor parts (repo · license · files; GPL = reference-only)

| Donor (local `_sources2/…`) | License | Ship? | Concrete parts used here |
|---|---|---|---|
| **`react-native-gifted-chat`** | **MIT** ✅ ship | Bloop chat surface | `src/GiftedChat/{index.tsx,types.ts}` (the `messages[]`/`onSend`/`isTyping` surface); `src/QuickReplies.tsx` (+`onQuickReply` — kid-safe tap / AAC affordance, the default input); `src/TypingIndicator/` ("Bloop is thinking" → **Thinking** state); override `renderAvatar`/`renderBubble`/`renderMessageText`/`renderChatFooter` (types.ts) to host `BloopCharacter`; `src/MessageImage.tsx`/`Actions.tsx` for AAC picture-messages. **UI shell only — no moderation (that is w2's proxy).** Re-theme off the Slack/adult example styling. |
| **`rive-react-native`** | **MIT** ✅ ship | the reactive Bloop character | `src/Rive.tsx` + `src/types.ts` `RiveRef` (`fireState(machine,trigger)` / `setInputState(machine,input,value)` / `onStateChanged`) — driven by `useBloopRive` from `resolveBloopState`. Patterns: `example/app/(examples)/{StateMachine,NestedInputs,Events,SimpleControls,DynamicText}.tsx`. **Build stand-in art:** `example/assets/rive/{blinko,avatars}.riv`. **Bespoke `bloop.riv` is [HUMAN]-authored** (samples are demos). **Needs Expo dev client (config plugin) — not Expo Go → `BubbleBuddy` is the Expo-Go/web fallback.** |
| **`lottie-react-native`** | **Apache-2.0** ✅ ship | cheap expressions + confetti | `packages/core` `<LottieView>` for one-shot emotion faces, calm loops, celebration confetti where a full Rive state machine is overkill. **Preserve `LICENSE`/`NOTICE` + attribute.** `example/animations/DynamicText.json` = runtime-text reference. |
| `moti` / `react-native-skottie` | MIT (npm) | ✅ (moti) / ⚠️ ref | `moti`/Reanimated for cheap tap micro-motion (already used by `BubbleBuddy`); `skottie` = a perf-alternative Lottie renderer **reference-only** if animation count grows. |
| `rive-app/awesome-rive` | resource list | ⚠️ ref-only | state-machine patterns + kid-character `.riv` examples (resource, not shippable code). |
| `SeakMengs/WindowPet`, tamagotchi web clones | unverified / off-stack | ⚠️ ref-only | virtual-pet **care-loop concept** inspiration only — **ship no code** (wrong stack / unverified license). |

**v1 engines reused (not donors — the shipped tree, `apps/kid/`):** `components/buddy/{BubbleBuddy,BuddyRoom,
buddyVisuals}.tsx` (the deterministic fallback character + never-frown clamp), `src/state/buddyStore.ts` +
`src/domain/{companionMood,companionName}.ts` (positive-only mood + `applyCompanionEvent`/`decayMood`/monotonic
`nurtureCompanion` — reused by `resolveBloopState`), `src/data/buddyCosmetics.ts` (B5 look picking),
`src/state/questStore.ts` + `src/domain/{quests,novelty}.ts` (B4, no RNG), `src/theme/{resolveCapabilities,
resolveContent,resolveCelebration,resolveStatusPresentation,useReducedMotion}.ts`, `components/celebration/
CelebrationOverlay.tsx`, `components/ui/VolumeSlider.tsx`, `src/services/{tts,haptics,playCue}.ts` (the consistent
Bloop voice + toggle-gated haptics/cues), `src/services/purchases.ts` (the mock-seam **pattern** mirrored by w2's
`bloopProvider`), `app/(kid)/_layout.tsx` `GrownUpsDoor` (overlay/hide-list pattern).

---

## 6. Safety + anti-shame + COPPA rules that apply

1. **The hard "never" list (character).** No **Withering / Sick / Dying / Sulking / Crying-at-you** Bloop and no
   guilt-trip notification, ever. `resolveBloopState` can return only a member of the positive/neutral
   `BloopCharacterState` union; the fallback `BubbleBuddy` keeps its `smile ≥ 0` clamp (`buddyVisuals.ts`).
   Neglect → **Neglect-return** (warm "so glad you're back"), never punishment. **Enforced** by
   `bloop-copy-clean.test.ts` (no `miss(es)? you|come back|don't leave|disappointed|sad|guilt|withering` strings)
   + the union's compile-time exhaustiveness.
2. **The hard "never" list (chat).** No open-ended AI friend / confidant / **sycophancy** / engineered emotional
   dependency; no "I'll always be here for you"; never client→model; never render/TTS unmoderated output; never
   collect/echo child PII; never let the model free-handle crisis. This WS enforces the client half: it renders
   **only** `ModeratedReply.text`, TTS voices **only** that text, and the copy gate bans `always be here|best
   friend|our secret|AI friend|I love you`. The server half is w2.
3. **Predictability (autism).** The character is **deterministic and identical every time** (pure resolver, no
   `Math.random`, no `Date.now()` inside — `now` passed in). No surprise UI / core-look / voice change. Novelty
   (B4) is **opt-in + previewed**, suppressed by default under the autism preset / "keep things familiar."
4. **Every sensory channel is opt-out-able.** Sound / Haptics / Animation / Celebration / Voice each independently;
   Low-Sensory preset dampens amplitude + disables particles; **OS Reduce-Motion always clamps motion to off**
   (`resolveBloopPresentation` honors it unconditionally). Never force output.
5. **Task-done-and-off, not time-in-app.** No engagement-maximizing loops, no "come back" nudges from Bloop; the
   celebration fires on the **real** step/routine completion and hands back to offline life.
6. **Age-appropriate AI-disclosure (SB 243).** When chat is on, a soft child-facing framing ("Bloop is a friendly
   helper in the app, not a real animal or person") + the parent-facing persistent notice ("Bloop is an AI helper,
   not a person or a doctor") — the persistent notice + 3-hour break nudge are **owned by w3 (D7)**; this WS
   surfaces the soft child-facing line and drives the break-nudge display when w3 schedules it.
7. **COPPA-2025 / UK Children's Code.** Chat is **OFF by default + parent-gated** (verifiable consent is w1/w3).
   The kid device keeps **no persisted child chat** (in-memory `bloopChatStore` only; the authoritative transcript
   is Firestore, PII-redacted + TTL, written server-side by w2). **No ad/analytics SDKs** in the kid app. The app
   tree stays **no-egress** (the only online call is w2's SDK callable). **Data-minimization:** the panel names
   only bounded presets; no free-text profile is collected here.
8. **Evidence honesty.** Bloop is a **scaffold**, disclosed as not-a-person/not-a-doctor; no therapy/cure/efficacy
   claim in any Bloop copy (shares the `BANNED_REMINDER_PATTERNS`-style copy gate).

---

## 7. Acceptance criteria + verify steps

**Functional acceptance**
- [ ] The character is present on the buddy room + task-complete celebration; **Rive when available, `BubbleBuddy`
      on Expo Go / web** — both render a positive mood and never a frown.
- [ ] `resolveBloopState` is **deterministic**: the same `(stimulus, ctx)` yields the same `state`/`moodInput`
      across calls and "devices"; every returned state is a member of the union (no negative member reachable).
- [ ] Tap → giggle within ~150 ms; step complete → Anticipate→Celebrate; return-after-days → **Neglect-return**
      (warm greet), never a scold; quiet hours → Rest; **no Withering/Sick/Sulk/Cry state is reachable**.
- [ ] The chat entry point + `bloop` route are **absent** when `caps.bloopChatAvailable` is false (default), and
      appear only when the parent enabled it; with chat on and the **default `MockBloopProvider`**, turns resolve
      **offline** and only `reply.text` renders (a poisoned mock reply is never shown raw — that is w2, but the
      client renders only `reply.text`).
- [ ] Input mode follows caps: `young`/autism ⇒ **chips/AAC only** (free-text `Composer` absent); `older`+ADHD ⇒
      free-text allowed when `caps.bloopFreeTextAllowed`. `TypingIndicator` drives the **Thinking** state; **TTS
      voices `reply.text` only** (and only when voice is on).
- [ ] The Sensory & autonomy panel toggles all 5 channels + presets, names Bloop, picks a look from ≤6 options,
      and is opt-out-never-lock; Reduce-Motion clamps `animationScale` low + `particlesEnabled` false.
- [ ] B4 novelty is **suppressed by default under the autism preset / keepFamiliar**, on under ADHD, previewed +
      no expiry/FOMO copy; Bloop's silhouette/face/voice never change.
- [ ] Existing children (no Bloop settings, no `neuroProfile`) behave byte-identically to v1.

**Verify commands** (root workspace; pre-migration: run in `tiny-bubbles/`)
```bash
npm -w @tiny-bubbles/kid run typecheck                 # tsc = 0
npm -w @tiny-bubbles/kid test                          # all prior suites + the new Bloop suites green
npm -w @tiny-bubbles/shared run typecheck              # character.ts + shared bloop types compile
npm -w @tiny-bubbles/kid test -- no-network            # NO-EGRESS gate green (only online path = w2 SDK callable)
npm -w @tiny-bubbles/kid test -- storage               # SCHEMA_VERSION stays 1, MIGRATIONS []
npm -w @tiny-bubbles/kid test -- bloop-copy-clean      # anti-sycophancy / anti-guilt / no-"always here" gate
npm -w @tiny-bubbles/kid run export                    # or: npx expo export --platform web (BubbleBuddy fallback)
# determinism / anti-shame greps
grep -rn "Math.random"  apps/kid/src/state/bloopChatStore.ts packages/shared/src/bloop | grep -v __tests__   # → none
grep -rnE '\b(ageMode|neuroProfile)\s*===' apps/kid/components/bloop apps/kid/app/\(kid\)/bloop.tsx           # → none (resolvers only)
grep -rniE "always (be )?here|best friend|our secret|AI friend|withering|disappointed|miss(es)? you" apps/kid/{app,src,components} | grep -v __tests__   # → 0
grep -rn "sendTurn" apps/kid                           # all call sites go through services/bloopProvider (the w2 seam)
```
- [ ] Migration-forward fixture: an old `ChildSettings` blob with no Bloop fields loads/merges/round-trips; no bump.
- [ ] `THIRD_PARTY_NOTICES.md` lists gifted-chat (MIT), Rive (MIT), Lottie (Apache-2.0 with `NOTICE`), moti (MIT).
- [ ] **No `functions/` emulator step** — this workstream ships no server code. (The proxy pipeline / crisis /
      transcript emulator tests live in **w2**.)

---

## 8. Dependencies · premium/free · LLM-on/off

### 8.1 Depends on other workstreams
- **w1 (monorepo/backend):** `packages/shared` scaffold + `@tiny-bubbles/shared` alias (Metro + tsconfig); the
  Firestore `children/{id}.bloopEnabled/topicScope[]/neuroProfile/ageMode/locale` that the sync adapter pulls down
  into on-device settings; the retargeted no-egress gate. **Hard prerequisite for the shared extraction** (else
  land shared modules under `apps/kid/src/` and re-export later).
- **w2 (LLM proxy):** **provides** the `bloopProvider` port + `MockBloopProvider` + `ModeratedReply`/`BloopContext`/
  `QuickReply`/`ModeratedReplyStatus`/`CrisisCard` types + the moderation taxonomy that this WS renders. This WS
  **provides back** the `caps.bloopInputMode`/`bloopFreeTextAllowed` keys w2 reads into `BloopContext`, and the
  chat surface + character that call `sendTurn`. Neither ships the other's half.
- **w3 (parent app):** authors `bloopEnabled` (the on/off gate), the topic scope, chips-vs-free-text policy, the
  usage/time limits, retention, crisis locale, and the **full** Sensory & autonomy editing; renders the transcripts
  this WS's turns produce (server-side). Owns the persistent AI-disclosure notice + 3-hour break nudge (D7); this
  WS surfaces the soft child-facing disclosure line + displays the nudge.
- **w6 (regulation):** **shares the Sensory & autonomy panel** (one panel, two owners) and the `neuroProfile`
  `ThemeInputs` thread (do it once). Bloop's **Mood-mirror** subscribes to w6's emotion pick and **Co-regulate**
  to w6's `breathPhaseAt().scale` — deterministic, **no LLM**. This WS does not depend on w6 to function (character
  + chat work with w6 absent); the two coordinate the shared surfaces.
- **w4 (AAC):** the AAC symbol board is a chat **input mode** (QuickReplies-as-AAC / `MessageImage`), sharing the
  `Symbol`/`Board` model — the AAC WS owns the board; this WS consumes it as an input affordance.

### 8.2 Provides to other workstreams
- `caps.bloopInputMode` / `bloopFreeTextAllowed` / `bloopChatAvailable` (w2 reads the first two).
- `BloopCharacterState` + `resolveBloopState` + `RiveInputContract` (shared; w3 can preview the same state map).
- The rendered chat surface + character that exercise w2's `sendTurn` and display every `ModeratedReply.status`.

### 8.3 Premium / free
- **Character layer, chat availability, TTS voice, Sensory & autonomy panel = FREE.** The character is
  core/safety/accessibility infrastructure; chat is **parent-gated, not paywalled** (the safety posture, matching
  w2's decision — the model is never a revenue lever for a child).
- **B4 novelty cosmetics = PREMIUM, acquisition-only** (reuse the existing `companionThemes` / `noveltyPipeline`
  gates via `src/services/entitlements.ts`; **never** retention — a downgrade strips/hides/greys **nothing** owned).
  The underlying character is always fully expressive on the free tier.

### 8.4 LLM-on vs LLM-off (the load-bearing "don't brick the child" contract)
- **Character layer:** **identical** on/off — it has **no model in the loop**, ever. Fully functional offline.
- **Chat OFF (default):** `caps.bloopChatAvailable=false` → the chat surface + route do not exist; character
  untouched; zero network.
- **Chat ON + default build (`MockBloopProvider`):** deterministic scripted safe replies, **offline**, CI-green
  (no network) — the app + tests exercise every `ModeratedReply.status` with no egress.
- **Chat ON + real proxy (`EXPO_PUBLIC_TB_BLOOP_PROXY=1`, online):** `sendTurn` hits w2's callable; full shields
  engage server-side. If the network drops mid-session → w2 returns `{status:"error"}` → the surface renders the
  warm line, and **the rest of the app (character, AAC, schedules, emotion, token loop) keeps working**.

---

## 9. Open assumptions
1. **The bespoke `.riv` art + the hand-crafted `BloopCharacter`/`useBloopRive` reactive tuning are a HUMAN
   (Fable/Opus) deliverable** (per the brief). The agent lands the deterministic seam (`resolveBloopState`,
   `RiveInputContract`, `BubbleBuddy` fallback, chat wiring, tests) with the sample `blinko.riv`/`avatars.riv`
   stand-in + TODO markers, and does not invent the final Bloop identity. Confirm the art-authoring hand-off point.
2. **Rive needs an Expo dev client** (native config plugin) → the character defaults to the shipped **`BubbleBuddy`**
   on Expo Go / web / any Rive-less platform, and Rive is the richer upgrade behind a runtime-availability check.
   This keeps the tree Expo-Go-runnable + web-exportable + green. Confirm the dev-client build path is in scope
   (if the team wants Rive as the *only* character, the Expo-Go/web-safe property is lost — flagged, not assumed).
3. **Local chat cache = in-memory only** (`bloopChatStore`, no `tb/*` slice) — the COPPA-minimal choice; the
   authoritative transcript is Firestore (w2). Confirm no product need for on-device chat history (recommend none).
4. **TTS = on-device `expo-speech`** via `voiceParamsFor` (offline, free, a single consistent Bloop voice),
   toggleable. A warmer cloud TTS voice is deferred (would add latency/cost + an egress path — out of scope here).
5. **`neuroProfile` ownership:** the `NeuroProfile` union + `ChildProfile.neuroProfile` land in **w6** (shared
   `types.ts`); this WS consumes them. If w7 lands first, it adds the union defensively and w6 reconciles — one
   definition, coordinate.
6. **B4 novelty default per neuroProfile:** autism ⇒ suppressed by default (predictable core), ADHD ⇒ on, both ⇒
   opt-in previewed. If the product wants "autism-safe-by-default" globally, that is a product decision to flip —
   flagged, not assumed.
7. **Celebration integration:** the Rive **Celebrate** state layers *with* the shipped `CelebrationOverlay`
   confetti (both toggle-gated by `resolveBloopPresentation.particlesEnabled`) rather than replacing it, so the
   `BubbleBuddy` fallback path keeps its existing celebration. Confirm whether Rive should own confetti when active.
8. **Soft child-facing AI-disclosure wording** (SB 243) is drafted here but **reviewed/owned with w3** (the
   persistent parent-facing notice + 3-hour break nudge are w3/D7). Confirm the exact child-facing line with the
   psychologist/clinical review that w2's crisis-copy review already requires.
