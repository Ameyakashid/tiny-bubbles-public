# Firestore/Storage rules review — w1 M1.2

*Authored 2026-07-10 with the M1.2 backend. This is the human-review record
for `functions/firestore.rules` + `functions/storage.rules` and the
pre-deploy checklist for everything the no-Java build environment could not
execute.*

## 1. The access matrix (as authored)

| Path | Parent (own family) | Kid (`uid === childId`, minted claims) | Unauthed / foreign | Admin (functions) |
|---|---|---|---|---|
| `users/{uid}` | read + update own (uid/role immutable) | — | — | create (trigger), consent append (callable) |
| `children/{childId}` | read + update (parentUid/childId immutable) | read own | — | create/delete (callables) |
| `…/settings/current` | read/write | read + write **`preferences` only** (`controls` must stay byte-identical) | — | seed (provisionChild) |
| `…/boards|schedules/**` | read/write | read | — | — |
| `…/narratives/{id}` | read/write | read **approved-only** (`approvedAt != null`) | — | — |
| `…/activity/{eventId}` | read | **create** own (`data.id == docId`) + idempotent re-set; no delete | — | ttlSweep delete |
| `…/reports/{rangeKey}` | read | create/update own (`data.rangeKey == docId`) | — | ttlSweep delete |
| `…/transcripts/{turnId}` | read | **NO access** | — | the ONLY writer (`writeTranscriptTurn` chokepoint → redaction provable, §2.5) |
| `…/alerts/{alertId}` | read | **NO access** | — | the ONLY writer (`sendParentAlert`); ack via callable (M3.x) |
| `safetyReports/{id}` | **NO access** (abuse/csam ⇒ no parent visibility, §8 #27) | NO access | — | read/write |
| `config/global` | read | read | — | write (`seedGlobalConfig`) |
| Storage `children/{childId}/videos/*` | read/write own (cross-service `firestore.get` guardian check; <50 MB, `video/*`) | read own | — | delete (deleteChildData/ttlSweep) |
| everything else | **denied** (donor locked default, kept LAST) | denied | denied | n/a |

Review notes:
- **Fail-closed order**: the catch-all `allow read, write: if false` is the
  final match; every grant above it is claim + ownership scoped.
- **§8 #28**: kid rules double-check `request.auth.uid == childId AND
  token.childId == childId` — a forged/foreign `childId` claim fails both.
- **§8 #21**: `reports` is the one kid-writable non-activity surface, keyed by
  `rangeKey` so a kid cannot spray arbitrary doc ids.
- **Alert acks** are deliberately NOT client-writable in M1.2 (`write: if
  false`); the M3.x parent app acks through a callable so `acknowledgedAt/By`
  is server-stamped and re-escalation is cancelled atomically.
- `pairingCodes/*` and `mail/*` are intentionally NOT opened — admin-only via
  the locked default.

## 2. ⚠ NEEDS-JAVA: the emulator suite (DEFERRED here — run before deploy)

This environment has **no JVM**, so the Firestore emulator cannot boot
(`firebase emulators:start` requires Java). The rules were therefore verified
by review + the unit-level twins only. **Before any deploy**, on a
Java-equipped machine:

```bash
cd functions
# 1) the rules suite (release blocker)
npx firebase emulators:exec --project demo-tiny-bubbles \
  "npx jest --config jest.emulator.config.js"
# 2) full emulator boot smoke
npx firebase emulators:start --only auth,firestore,functions,storage
```

## 3. Pre-deploy checklist (out-of-band project config)

1. **Native Firestore TTL policies** (primary deletion path; `ttlSweep` is the
   backstop): create a TTL policy on `expiresAt` for the `activity`,
   `transcripts`, `alerts`, and `reports` collection groups —
   `gcloud firestore fields ttls update expiresAt --collection-group=<g> --enable-ttl`.
   Verify with `gcloud firestore fields ttls list`.
2. **`seedGlobalConfig`** (§8 #21b): run once with admin credentials after
   deploy (`node -e "require('./lib/index.js')"` context or an admin script
   invoking the exported `seedGlobalConfig`); idempotent.
3. **Deploy bundling** (§1.5): `npm run build:deploy` (esbuild inlines the
   `@tiny-bubbles/shared` runtime; `firebase-admin`/`firebase-functions`
   external) is wired as the `firebase.json` predeploy. A cold-start
   smoke-check of a deployed callable is the M6.2 gate.
4. **App Check** (§8 #25): enforce for Firestore + Functions at the project
   level (App Attest / Play Integrity); native-build concern, not in rules.
5. **Blocking function registration**: `beforeusercreated` must be selected as
   the project's Before-create blocking function in the Firebase console
   (deploying the function alone does not bind it).
6. **Email fallback**: install the Trigger Email extension (or bind an SMTP
   relay) for the `mail/` queue `sendParentAlert` writes; otherwise crisis
   delivery is FCM-only and `deliveredEmail` stays false.
7. **VPC processor** (§8 #29): bind the real PSP for `payment-verified`
   (nominal auth+void); `dev_mock` is emulator-only and rejected in prod
   (CI-tested in `__tests__/consent.test.ts`).
