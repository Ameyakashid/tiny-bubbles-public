/**
 * i18n/en.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] THE English source catalog (accessibility-i18n §4.1).
 *
 * The single source of truth for every human-facing string. It MERGES:
 *   - the age-variant copy that used to live in `resolveContent.COPY` (migrated
 *     VERBATIM, so rendering is byte-identical to before), plus
 *   - new `a11y.*` screen-reader announcement keys, `status.*`/`daypart.title.*`
 *     triple-coding labels, and `unit.*` plural nouns, and
 *   - the age-invariant `reminder.*` + `language.*` plain strings, migrated from
 *     `notifications.ts` / the settings screen.
 *
 * `COPY` (the `ModeKeyed` group) is `satisfies Record<string, ModeKeyed<string>>`
 * so the compile-time "both young + older" guarantee is preserved for every
 * age-variant key (same trick `resolveContent` used); `PLAIN` is
 * `satisfies Record<string, string>`. `EN` is their union and the catalog value.
 *
 * Adding `src/i18n/es.ts` later is a pure data drop — no component edits (§10.1).
 * Copy authored here is scanned by the anti-shame / no-mood-interpretation grep
 * gates (BUILD-GUIDE §3): keep every string warm, effort-framed, never corrective.
 */
import type { CatalogEntry, ModeKeyed } from "./types";

// ---------------------------------------------------------------------------
// Age-variant copy (ModeKeyed). Migrated from resolveContent.COPY + new a11y /
// status / unit keys. Tone per doc 61 §1 / doc 65 §1: young = 1-3 warm words,
// spoken-first; older = short, respectful, never babyish. `preteen` is an
// optional identity override that falls back to `older`.
// ---------------------------------------------------------------------------
export const COPY = {
  // --- migrated verbatim from resolveContent.COPY ---------------------------
  "celebrate.step": { young: "Yay — you did it!", older: "Nice — that's done." },
  "celebrate.routine": { young: "You finished! 🫧", older: "Routine complete. Great work." },
  "celebrate.levelup": { young: "Buddy grew! 🎉", older: "Your buddy leveled up.", preteen: "Level up." },
  "celebrate.collectible": { young: "A new treasure!", older: "New collectible unlocked." },
  "task.next": { young: "What's next?", older: "Next up" },
  "task.done": { young: "Done!", older: "Mark done" },
  "task.allDone": { young: "All done! 🌟", older: "All tasks complete" },
  "daypart.done.morning": {
    young: "Morning done! See you this afternoon 🌤",
    older: "Morning routine complete. Next up this afternoon.",
  },
  "daypart.done.afternoon": {
    young: "Nice! See you this evening 🌙",
    older: "Afternoon done. Next up this evening.",
  },
  "daypart.done.evening": {
    young: "All done! See you tomorrow ☀️",
    older: "Evening done. See you tomorrow morning.",
  },
  "daypart.empty": {
    young: "Nothing to do right now 🫧",
    older: "Nothing scheduled right now.",
  },
  "daypart.peek": { young: "See what's later", older: "Peek at later" },
  "token.earned": { young: "A bubble for you!", older: "+1 bubble" },

  // --- Visual transition timers (visual-timers §4 #9). EXTERNAL SCAFFOLDING for a
  //     transition — never "fixes the clock." The empty state RESTS: `timer.rested`
  //     is warm + effort-framed, NEVER "time's up / out of time / too slow / hurry"
  //     (anti-shame copy gate). Both age variants compile-required. ----------------
  "timer.label": { young: "A little time for this", older: "Time for this step" },
  "timer.rested": {
    young: "Take your time 🫧",
    older: "That's the time — finish when you're ready.",
  },
  "timer.a11y": { young: "Time left", older: "Time remaining" },
  "buddy.greet": {
    young: "Hi! I missed you!",
    older: "Hey — good to see you.",
    preteen: "Hey. Ready when you are.",
  },
  "buddy.tabTitle": { young: "My Buddy", older: "Buddy", preteen: "Avatar" },
  "buddy.stat.bond": { young: "Bond", older: "Bond", preteen: "Level" },
  "buddy.stat.growth": { young: "Stage", older: "Stage", preteen: "Rank" },
  "buddy.stat.mood": { young: "Mood", older: "Mood", preteen: "Vibe" },
  "rewards.tabTitle": { young: "Treats", older: "Rewards" },
  // Child-autonomy §2.1: when `canPickReward` is off the menu STAYS visible (the
  // aspirational "save up" framing is motivating) but the request affordance
  // becomes this calm, non-shaming line — never a lock / "denied" / greyed state.
  "reward.askGrownup": { young: "Ask a grown-up 💛", older: "Ask a grown-up to get this." },
  "calm.tabTitle": { young: "Calm", older: "Calm" },
  "today.tabTitle": { young: "Today", older: "Today" },
  "progress.popped": { young: "You popped lots of bubbles!", older: "Bubbles popped" },

  // --- NEW: screen-reader announcement keys (§2.1). Warm, effort-framed; the
  //     buddy state can only ever interpolate a positive mood (§7). ------------
  "a11y.stepDone": { young: "Yay — you did it!", older: "Done." },
  "a11y.tokenEarned": { young: "A bubble for you!", older: "Plus one bubble." },
  "a11y.celebrate.step": { young: "Great job! 🫧", older: "Nice." },
  "a11y.celebrate.routine": {
    young: "You finished everything! 🫧",
    older: "Routine complete.",
  },
  "a11y.buddy.state": { young: "{name} looks {mood}", older: "{name} is {mood}" },
  "a11y.buddy.stateNoName": { young: "Your buddy looks {mood}", older: "Your buddy is {mood}" },
  "a11y.tokenBalance": { young: "You have {count}", older: "{count}" },

  // --- NEW: triple-coding status labels (§2.4). Never color alone; every status
  //     carries an icon + shape + THIS label. blue↔gold, never red↔green. -------
  "status.done": { young: "Done", older: "Done" },
  "status.todo": { young: "To do", older: "To do" },
  "status.skipped": { young: "Later", older: "Later" },
  "status.active": { young: "Now", older: "Current" },
  "daypart.title.morning": { young: "Morning", older: "Morning" },
  "daypart.title.afternoon": { young: "Afternoon", older: "Afternoon" },
  "daypart.title.evening": { young: "Evening", older: "Evening" },
  "daypart.title.night": { young: "Night", older: "Night" },

  // --- NEW: calm error + empty-state copy (production-readiness §2.3). Never
  //     scary/blaming: the recovery line is picture + one spoken-able phrase; the
  //     empty lines say "check back soon", never "you did nothing". Both age
  //     variants are compile-required; these pass the anti-shame grep gate. ------
  "error.recover": { young: "Let's try that again 🫧", older: "Let's try that again." },
  "empty.rewards": {
    young: "Nothing to trade for right now 🫧 — check back soon.",
    older: "Nothing to trade for right now — check back soon.",
  },
  "empty.noChildren": {
    young: "Add your first child to get started.",
    older: "Add your first child to get started.",
  },
  "empty.tasks": {
    young: "No chores here yet — add one 🫧",
    older: "No chores here yet — add one.",
  },
  "empty.rewardsSetup": {
    young: "Add a reward your child can save toward.",
    older: "Add a reward your child can save toward.",
  },

  // --- Light verify + quick undo (verify-undo §4 / §6). Playful-neutral, NEVER
  //     shame: undo is "oops — put it back," never "you failed / points removed /
  //     that wasn't done." Verify is an optional BONUS, never a gate. These pass the
  //     anti-shame grep gate (no failed/missed/lost/removed). Both variants required.
  "undo.step": { young: "Oops — undo?", older: "Undo" },
  "undo.done": { young: "Put it back 🫧", older: "Marked not done" },
  "verify.self": { young: "I did it! 👍", older: "I did it" },
  "verify.photo": { young: "Show a photo? 📷", older: "Add a photo" },
  "verify.skip": { young: "Skip", older: "Skip" },
  "verify.parentConfirm": { young: "Looks good!", older: "Looks good" },

  // --- Mood / energy check-in (mood-checkin §4.3). OPT-IN, never required, never a
  //     score. A "rough" pick is met with warmth + an OPTIONAL calm offer only — no
  //     interpretation, no clinical claim (ZERO AI + anti-shame §7). These pass the
  //     anti-shame + no-mood-interpretation grep gates. Both age variants required.
  "mood.prompt": { young: "How do you feel?", older: "How are you feeling?" },
  "mood.thanks": { young: "Thanks for sharing! 💛", older: "Thanks for checking in." },
  "mood.energyPrompt": { young: "How much energy?", older: "Energy level" },
  "mood.calmOffer": { young: "Want some calm breaths?", older: "Try the calm corner?" },
  "mood.skip": { young: "Maybe later", older: "Skip" },
  "mood.checkIn": { young: "Check in", older: "Check in" },
  // parent-side zero-log empty states (never a blank / "0 moods" scoreboard, §2.5)
  "mood.glanceEmpty": {
    young: "No check-ins yet — they'll appear here.",
    older: "No check-ins yet — they'll appear here.",
  },
  "mood.insightsEmpty": {
    young: "No check-ins yet — this fills in as your child checks in.",
    older: "No check-ins yet — this fills in as your child checks in.",
  },

  // --- Multi-child switcher + rotating chores (multi-child §4.MODIFY). The switcher
  //     shows names + avatar colors ONLY (no token counts / progress — no cross-child
  //     comparison, §6). Rotation is "whose turn," never punishment: chore copy is a
  //     neutral hand-off, never "you failed / lost it." Both age variants required;
  //     these pass the anti-shame grep gate (no failed/lost/streak/leaderboard/compare).
  "switch.title": { young: "Who's playing?", older: "Switch profile" },
  "switch.handoff": { young: "Someone else's turn?", older: "Hand off to…" },
  "chore.turn": { young: "Your turn! 🔁", older: "Your rotating chore" },
  "chore.empty": {
    young: "Add a shared chore to rotate across your kids.",
    older: "Add a shared chore to rotate across your kids.",
  },

  // --- Focus / calm soundscapes (soundscapes §4.MODIFY #15). Optional, opt-in
  //     background sound — a regulation + transition aid, never a medical or
  //     focus-score claim (copy stays "help you focus / wind down"). Scene NAMES
  //     live in the catalog `label.spokenLabel`, not here. Both age variants
  //     compile-required; these pass the anti-shame + no-medical grep gates. -----
  "soundscape.calmTitle": { young: "Calm sounds", older: "Calm sounds" },
  "soundscape.play": { young: "Play calm sounds", older: "Play calm sounds" },
  "soundscape.stop": { young: "Calm sounds on", older: "Calm sounds on" },
  "soundscape.focusToggle": { young: "Focus sounds", older: "Focus sounds" },
  "soundscape.pick": { young: "Pick a sound", older: "Choose a soundscape" },
  "soundscape.volume": { young: "How loud?", older: "Volume" },
  "soundscape.premium": {
    young: "Ask a grown-up ✨",
    older: "Premium — unlock in settings",
  },

  // --- Calm breathing / regulation mini-game (breathing-regulation §4 #8). A
  //     self-paced, OPTIONAL calming activity — never a health claim and never a
  //     reading of the child's body. The phase labels stay in sync with the bubble
  //     via breathPhaseAt; the grow line is a soft "look what a calm minute looks
  //     like," never a score. The loop "offer" is an INVITATION, never a demand or
  //     a precondition. Both age variants compile-required; these pass the
  //     anti-shame + no-over-claim grep gates. -------------------------------------
  "breathe.title": { young: "Breathe with the bubble", older: "Breathe" },
  "breathe.in": { young: "Breathe in…", older: "Breathe in" },
  "breathe.hold": { young: "Hold…", older: "Hold" },
  "breathe.out": { young: "Breathe out…", older: "Breathe out" },
  "breathe.rest": { young: "Rest…", older: "Rest" },
  "breathe.grow": {
    young: "Your calm garden is growing 🫧",
    older: "Nice and calm.",
  },
  // the never-blocking loop offer (an invitation, never a gate)
  "breathe.offer": { young: "Take a breath?", older: "Take a breath" },
  // the regulation-step secondary action (advisory, never a precondition)
  "breathe.withMe": { young: "Breathe with me", older: "Breathe with me" },

  // --- Adjustable focus intervals + active breaks (focus-intervals §4.MODIFY #12).
  //     An OPTIONAL, NON-rigid, older-only organizational scaffold — offered, never
  //     forced. NOT a treatment, NEVER "ADHD-proven / improves focus". Pausing and
  //     stopping are always free + neutral; a block ending is a calm "rested" state,
  //     never "time's up / you lost focus / you only did N". The `young` variants are
  //     compile-required but never shown (the feature is age-gated older-only). These
  //     pass the anti-shame + no-efficacy/medical grep gates. --------------------------
  "focus.title": { young: "Focus time", older: "Focus timer" },
  "focus.setupHint": {
    young: "Pick a little time",
    older: "Pick a length that feels right — short is fine.",
  },
  "focus.focusLength": { young: "How long?", older: "Focus length" },
  "focus.breakLength": { young: "Break", older: "Break length" },
  "focus.movementToggle": { young: "Move on breaks", older: "Movement breaks" },
  "focus.start": { young: "Start", older: "Start focusing" },
  "focus.focusing": { young: "Focusing", older: "Focusing" },
  "focus.pause": { young: "Pause", older: "Pause" },
  "focus.resume": { young: "Keep going", older: "Resume" },
  "focus.paused": { young: "Paused", older: "Paused" },
  "focus.stop": { young: "Stop", older: "Stop" },
  "focus.breakTitle": { young: "Move time!", older: "Movement break" },
  "focus.breakHint": { young: "Wiggle it out 🫧", older: "Get up and move for a bit." },
  "focus.restTitle": { young: "Breather", older: "Take a breather" },
  "focus.restHint": { young: "Rest a moment 🫧", older: "Rest for a moment." },
  "focus.moved": { young: "I moved!", older: "I moved!" },
  "focus.skipBreak": { young: "Skip", older: "Skip break" },
  "focus.backToFocus": { young: "More focus", older: "Back to focus" },
  "focus.imDone": { young: "I'm done", older: "I'm done" },
  "focus.done": { young: "Nice job! 🫧", older: "Nice focusing. Come back any time." },
  "focus.blocks": { young: "Focus blocks", older: "Focus blocks today" },
  "focus.launch": { young: "Focus", older: "Focus timer" },
  "focus.close": { young: "Done", older: "Done" },
  "focus.a11y": { young: "Time left", older: "Time remaining" },

  // --- Novelty & reward-refresh: rotating quests + seasonal packs (novelty-refresh
  //     §6, M-C4). Gentle appointment-style anticipation ("new this week"), NEVER a
  //     countdown/expiry/urgency/FOMO string and NEVER a "buddy misses you" nag —
  //     the M10 reminder banned-phrase intent extends here. Rotation changes what is
  //     FEATURED, never what you can still get or keep. Progress framing is calm and
  //     forward ("a little more"), never a deadline. Both age variants compile-required;
  //     these pass the anti-shame + no-urgency grep gates. -----------------------------
  "quest.tabTitle": { young: "Quests", older: "Quests" },
  "quest.new": { young: "New quests! 🌟", older: "New quests this week" },
  "quest.done": { young: "Quest done! 🎉", older: "Quest complete" },
  "quest.moreToGo": { young: "A little more! 🫧", older: "Almost there" },
  "featured.today": { young: "Today's spotlight! ✨", older: "Featured today" },
  "novelty.new": { young: "Something new! ✨", older: "New this season" },

  // --- If-then "when X, I will Y" plans (if-then-plans §4.2, M-C5). HONEST,
  //     low-cost framing: a plan is "a little reminder you make for yourself,"
  //     NEVER a treatment/cure/guarantee. There is NO adherence/miss/streak copy —
  //     the only "did you do it" is the POSITIVE-only situational nod (`plans.didIt`).
  //     The `plans.thenYoung` glue is the ONLY age-adaptive part of the assembled
  //     sentence (so no component branches on ageMode). Both age variants
  //     compile-required; these pass the anti-shame + no-over-claim grep gates. -----
  "plans.title": { young: "My plans", older: "My plans" },
  "plans.when": { young: "When", older: "When" },
  "plans.thenYoung": { young: "I'll", older: "I will" }, // sentence glue
  "plans.now": { young: "Now your plan!", older: "Now your plan" },
  "plans.doItNow": { young: "Do it now", older: "Do it now" },
  "plans.didIt": { young: "I did it! 🫧", older: "Did it" },
  "plans.hearIt": { young: "🔊 Hear it", older: "🔊 Hear it" },
  "plans.emptyKid": { young: "No plans yet 🫧", older: "No plans yet." },
  "plans.entry": { young: "My plans", older: "My plans" },
} satisfies Record<string, ModeKeyed<string>>;

// ---------------------------------------------------------------------------
// Age-invariant plain strings. Reminder copy is migrated from notifications.ts —
// it stays under the BANNED_REMINDER_PATTERNS gate (§4.3) which now runs over the
// resolved catalog string, so no translation can smuggle in a nag/shame tone.
// `{label}` is interpolated at build time by buildReminderContent.
// ---------------------------------------------------------------------------
export const PLAIN = {
  "reminder.title": "Tiny Bubbles 🫧",
  "reminder.body.1": "Whenever you're ready: {label}. 🫧",
  "reminder.body.2": "A little bubble for {label} — no rush.",
  "reminder.body.3": "{label} time, whenever it works for you.",
  "reminder.body.4": "Here when you are: {label}.",
  "reminder.body.5": "Time for {label}, take it easy. 🫧",

  // plural nouns for formatCount (§4.1) — a11y balance read-out
  "unit.bubble.one": "bubble",
  "unit.bubble.other": "bubbles",

  // Language settings row (§2.7)
  "language.title": "Language",
  "language.english": "English",
  "language.note":
    "More languages coming. Set your device language and Tiny Bubbles will follow when available.",
  "language.textNote": "Larger text follows your device.",
} satisfies Record<string, string>;

/**
 * The English catalog value: the union of the age-variant `COPY` keys and the
 * age-invariant `PLAIN` keys. `keyof typeof EN` is the full message-key space.
 */
export const EN = { ...COPY, ...PLAIN } as const satisfies Record<string, CatalogEntry>;

/** Every message key present in the English source catalog. */
export type EnKey = keyof typeof EN;
