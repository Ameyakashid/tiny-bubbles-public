# Contributing to Tiny Bubbles

Tiny Bubbles is a calm, anti-shame ADHD app **for kids** (ages ~4–12). These
rules are non-negotiable; they protect children and keep the project legally
clean. See `_build/plan/66-MASTER-PLAN.md` for the authoritative plan.

## 1. License & provenance discipline (read before adding any code)

**Code may be grafted from exactly ONE donor: `lockin`** (MIT, © 2025 adhd.dev),
and only after removing its shame/mockery, "ruthless advisor" AI, and rigid
one-immutable-goal mechanics.

- `habit-tracker-app`, `tether`, `momentum` are **REFERENCE-ONLY**: read their
  logic/patterns and **re-author** against our stack. Do **not** copy their
  files.
- `adhd-india` and `adhd-focus-mate` are **HARD-PROHIBITED**: no license / no
  LICENSE file. **Never copy a single line** — concepts only, and only when
  unavoidable. A CI/grep guard fails the build on any reference to them, and a
  `jscpd` clone-similarity scan (M15) fails on high-similarity hits.

**Every new/changed source file must be recorded in `PROVENANCE.md`** with its
origin: `original`, `lockin:<path>`, or `reference:<repo>:<path>`. PRs without a
provenance entry are not merged.

New third-party runtime deps must be license-checked (MIT/BSD/Apache-2.0/ISC
only; **no GPL/AGPL/LGPL**). Bundled media (audio/fonts/images) must be
CC0/Pixabay-license/royalty-free-commercial and added to the **Bundled assets**
section of `THIRD_PARTY_NOTICES.md` (the JS scanner cannot see media).

## 2. Anti-shame / child-safety invariants (doc 66 §5)

These are gate conditions checked at every milestone — a PR that violates any of
them is rejected:

1. The companion is only ever positive/neutral/restful. No sad/angry/sick/guilt/
   dying/failure state, ever.
2. No streak `0` / "broken" / loss-aversion. Progress is cumulative + forgiving
   (freeze → pause, never zero).
3. A base token + a salience-appropriate celebration fire on every completion,
   never withheld and never reduced as a function of the child's own success.
4. No randomized payout — the bonus is a deterministic every-N. **No
   `Math.random()` in any payout path.**
5. Tokens never auto-deduct; the only negatives are explicit, refundable
   redemptions / parent adjustments.
6. Reminders are few, gentle, quiet-hours-respecting, never guilt-toned, and
   never companion-re-engagement nags.
7. Children never see a paywall; no trial-end/downgrade ever removes, hides,
   unequips, or alters anything the child owns or sees.
8. Analytics + mood logging default OFF (opt-in), on-device-only, and provably
   never leave the device. AI is off by default. No surveillance code.
9. No over-claiming on any surface (no "treats/cures/clinically proven");
   screen-time-as-reward is never promoted/escalated.
10. The parent zone is unreachable until the gate is configured; the purchase
    route requires a PIN.
11. Curated autonomy (3–6 options, young rewards capped at 3); cosmetic rotation
    is additive-only; no FOMO countdowns; no cosmetic tied to real money.

## 3. Component rules

- Components read `useThemeTokens()` + capability flags + resolved
  content/variant keys. **Never** branch on raw `ageMode` / `sensoryMode`, and
  **never** pass an `ageMode` prop into a component (e.g. `<BubbleBuddy>` takes
  `variant` + `mood`, never `ageMode`).
- Screens in `app/` are thin; reusable logic lives in `src/domain` (RN-free,
  unit-testable) and `src/state`.

## 4. Verification before opening a PR

This repo targets **Expo Go** (no custom native modules by default; AsyncStorage
behind the storage port). There is no simulator in CI:

- `npm run typecheck` (`tsc --noEmit`) — must pass.
- `npm test` (jest-expo) — must pass.
- `npx expo export --platform web` — must complete without error.
- Anti-shame / license greps (doc 66 §7) — must be clean.

Do not start a dev server (`expo start`) in automation — use `expo export` to
validate bundling. Device-only acceptance (haptics/audio/TTS/gestures) is
verified by the user in Expo Go and tracked in `RUN.md`.
