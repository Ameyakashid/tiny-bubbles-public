# `functions/__emulator__/` — the needs-Java emulator suite (DEFERRED)

**Status: authored at M1.2, DEFERRED in this environment — the Firestore
emulator requires a JVM and this build environment has NO Java.**

Run this suite on a Java-equipped machine **before every deploy** (it is a
release blocker, not optional):

```bash
cd functions
npx firebase emulators:exec --project demo-tiny-bubbles \
  "npx jest --config jest.emulator.config.js"
```

What it proves (the half the CI-floor unit suite cannot):

| Suite | Proof |
|---|---|
| `rules.test.ts` | `firestore.rules` in the real rules engine: default-deny; parent own-tree only; kid create-own-activity/reports but NO transcripts/alerts/controls; foreign kid/parent isolation; admin-only `safetyReports` + `config` |

The **unit-level twins** of the auth/consent/retention/alert behaviors already
run on the CI floor (`functions/__tests__/*.test.ts` against the `ports.ts`
fakes) — this suite re-proves the *rules-language and emulator-integration*
layer. See `functions/docs/RULES-REVIEW.md` for the full pre-deploy checklist
(TTL policies, App Check, seedGlobalConfig).

These files are excluded from `tsc -b` (tsconfig includes `src/` only) and
from the default `jest` run (`testPathIgnorePatterns: __emulator__`).
