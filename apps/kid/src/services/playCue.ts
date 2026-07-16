/**
 * src/services/playCue.ts — the imperative audio-cue FACADE (doc 66 §1b.1, M7).
 *
 * The core loop needs a synchronous, sub-300ms `playCue(id)` it can fire from the
 * celebration orchestrator (`useCelebration`). M13 owns the real cue registry
 * (`src/services/sound.ts`): it pre-instantiates one `AudioPlayer` per named cue
 * at boot and registers an implementation here via `registerCuePlayer`. Before
 * that registry initializes (and in unit tests / on a soundless device) this is a
 * deliberate NO-OP. The bundled cues are ORIGINAL / CC0 (project-authored); the
 * donor's `bubble-pop` mp3 is absent/unlicensed and is NEVER lifted (doc 66
 * §1b.9). The facade keeps the M7 timing contract intact regardless.
 *
 * Pure module (no expo-audio import here) so the celebration hook + the domain/
 * hook tests can import it without pulling in a native audio dependency; the
 * native players live behind `registerCuePlayer` in `sound.ts`.
 */

/**
 * The canonical named cue set (doc 61 §9.2). M13's `sound.ts` registers a real
 * imperative player for every id below; until then `playCue` is a no-op.
 */
export type CueId =
  | "tap.soft" // any UI tap — tiny soft tick
  | "step.done" // a routine step completed — the bubble "pop"
  | "token.payout" // a token lands on the counter — sparkly chime
  | "routine.complete" // routine/milestone — warm flourish
  | "levelup" // companion levels up — rising shimmer
  | "reward.redeem" // real-world reward requested/redeemed — unlock chord
  | "buddy.greet" // app open / buddy tap — non-verbal "boop"
  | "transition.swoosh" // step -> step — soft whoosh
  | "timer.done" // a step's visual-transition timer reached empty — a SINGLE soft,
  //                 non-alarming one-shot (visual-timers §2.7). Off by default at
  //                 the feature level (Settings toggle); NEVER looped, never a nag.
  | "calm.ambient"; // calm corner — loopable low soundscape

type CueImpl = (cue: CueId) => void;

/** The registered player (set by M13's sound.ts at boot); null = no-op facade. */
let impl: CueImpl | null = null;

/**
 * Register the real imperative cue player (called once at boot by M13). Pass
 * `null` to unregister (e.g. teardown / tests). Keeping this seam here is what
 * lets `useCelebration` call `playCue` today without any audio dependency.
 */
export function registerCuePlayer(fn: CueImpl | null): void {
  impl = fn;
}

/**
 * Fire a named cue. Synchronous + swallow-errors so a missing/failed player can
 * never break the celebration timing or the token payout. No-op until M13
 * registers a player.
 */
export function playCue(cue: CueId): void {
  if (!impl) return; // M7: intentional no-op until the M13 registry lands
  try {
    impl(cue);
  } catch {
    // a cue must never throw into the loop
  }
}
