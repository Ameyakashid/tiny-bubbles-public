# Inventory — Expo + Firebase (Auth + Firestore) Starter + Cloud Functions

**Category:** Expo + Firebase auth/firestore starter
**Goal (v2):** Speed the Tiny Bubbles v2 backend — TWO Expo apps (Kid + Parent) on a Firebase backend (Auth + Firestore + Cloud Functions on GCP), parent login + monitoring, and a **server-side LLM proxy** for the "Bloop" companion (Gemini Flash default / DeepSeek alt) with input/output moderation, PII refusal, topic-scoping, crisis-escalation-to-parent, and parent transcript visibility.
**Date:** 2026-07-09
**Cloned to:** `/Users/ameyakashid/Desktop/adhd india/_sources2/`

---

## Summary of what was cloned

| # | Repo | License | Stars | Last push | Role for v2 |
|---|------|---------|-------|-----------|-------------|
| 1 | `kiyohken2000/ReactNative-Expo-Firebase-Boilerplate-v2` | **MIT** | 114 | 2026-07-03 | App-side Auth + Firestore + Storage + Push scaffolding (Kid & Parent apps) |
| 2 | `RodrigoBertotti/firebase-cloud-functions-typescript-example` | **MIT** | 21 | 2024-06 | TypeScript Cloud Functions **backend template** (Express API + Auth-token middleware + Firestore triggers) — backbone for the Bloop proxy |
| 3 | `firebase/functions-samples` (official) | **Apache-2.0** | 12.2k | 2026-07-09 | Official CF sample library — **Vertex/Gemini server call**, **text moderation**, auth-blocking/lifecycle functions |

All three carry permissive licenses (MIT / MIT / Apache-2.0) and are cleared to ship-with-attribution.

---

## 1. `expo-firebase-boilerplate-v2` — App-side Firebase starter

- **Repo:** https://github.com/kiyohken2000/ReactNative-Expo-Firebase-Boilerplate-v2
- **Local:** `/Users/ameyakashid/Desktop/adhd india/_sources2/expo-firebase-boilerplate-v2`
- **License:** **MIT** (`LICENSE`, © 2024 Toshiaki Shirakura) — verified.
- **Language:** JavaScript (not TS — will need porting to the v2 TS stack, but the wiring/patterns are the value).
- **Stack (verified from `package.json`):** **Expo `^57.0.1`**, **React Native `0.86.0`**, **Firebase JS SDK `^9.6.10`** (modular), React Navigation (stack/drawer/bottom-tabs/material-top-tabs), Push Notifications, dark theme. Note: uses **React Navigation**, *not* expo-router.

### Structure that matters
- `src/firebase/config.js` — single-file Firebase init (`initializeApp`, Auth, Firestore, Storage). **Replace the committed demo `firebaseKey` / `expoProjectId` with the Tiny Bubbles GCP project config** — the repo ships a live demo config that must not be reused.
- `src/config.js` — app-level constants (default avatar in Firebase Storage, EULA link, Expo project id).
- `src/context/` — `AppContext.js`, `UserDataContext.js`, `ColorSchemeContext.js`, `HomeTitleContext.js` — React Context auth/user-data providers.
- `src/scenes/` — `initial/`, `login/`, `registration/`, `home/`, `profile/`, `edit/`, `detail/`, `post/`, `follow/`, `follower/`, `print/`.
- `src/routes/navigation/rootstack/RootStack.js` — auth-gated navigation (signed-in vs signed-out stacks).

### Reusable for Tiny Bubbles v2
- **Parent + Kid auth flows (direct lift → port to TS):**
  - `src/scenes/login/Login.js` + `src/scenes/registration/Registration.js` — email/password sign-in + account creation writing a Firestore user doc.
  - `src/scenes/initial/Initial.js` — auth state bootstrap / splash gate → maps to "route to Kid app vs Parent app after login."
  - `src/routes/navigation/rootstack/RootStack.js` — the signed-in/out gating pattern for **parent login + monitoring** shell.
  - `src/context/UserDataContext.js` + `AppContext.js` — "watch the current user's Firestore profile in real time" provider → reuse for parent dashboard live view of kid state.
- **Profile CRUD + avatar upload:** `src/scenes/profile/` + `src/scenes/edit/Edit.js` + `src/firebase/config.js` Storage usage → kid profile, avatar, per-child settings.
- **Parent↔Kid linking pattern (reference):** the `follow/` + `follower/` scenes implement a **real-time Firestore relationship graph** — the closest in-repo analog to a **parent-account ↔ child-account link** (adapt "follow" → "guardian-of"; a parent "follows" their child to gain monitoring/transcript visibility).
- **Push Notifications wiring:** repo already provisions the Expo push token → Firestore `tokens` collection. Reuse for **crisis-escalation-to-parent push** (Cloud Function writes → parent device push).
- **Theming / dark mode:** `ColorSchemeContext.js` — starting point, reskin to the kid palette.

**Caveats:** JS (port to TS); React Navigation not expo-router (v1 base `lockin` used expo-router — decide one; RN Navigation is fine for the Parent app); scrub the committed demo Firebase credentials; the "social feed" (`post/`, `detail/`) scenes are not needed — strip them.

---

## 2. `firebase-cloud-functions-typescript-example` — CF backend template (the Bloop proxy backbone)

- **Repo:** https://github.com/RodrigoBertotti/firebase-cloud-functions-typescript-example
- **Local:** `/Users/ameyakashid/Desktop/adhd india/_sources2/firebase-cloud-functions-typescript-example`
- **License:** **MIT** (`LICENSE`, © 2023 Rodrigo João Bertotti) — verified.
- **Language:** **TypeScript** (matches the v2 stack).
- **Stack:** Firebase Cloud Functions, **Express**, Firebase **Admin SDK**, Firebase **Authentication**, **Firestore**, 2nd-gen **Event Triggers**. Ships `firebase.json`, `firestore.rules`, `firestore.indexes.json`, and a Postman collection.

### Reusable for Tiny Bubbles v2 (this is the strongest single donor for the CF backend)
- **Auth-gated HTTPS proxy (the core of Bloop's server-side LLM proxy):**
  - `functions/src/api/interceptors/verify-idtoken-interceptor.ts` — **Express middleware that verifies the Firebase Auth ID token** (`Bearer` header → `admin.auth().verifyIdToken`) and attaches claims. This is exactly the gate the kid app must pass to reach the LLM proxy. Extend it to also load the child's parent-linked settings + "AI on/off" flag before any model call.
  - `functions/src/api/index.ts` + `functions/src/api/controllers/` (`account-controller`, `administrative-controller`, `product-controller`, `root-controller`) — clean **controller pattern**; add a `bloop-controller` here for the moderated chat endpoint (input-moderate → model call → output-moderate → PII-refusal → topic-scope → persist transcript).
  - `functions/src/index.ts` — how HTTPS + triggers are exported together; `MyClaims` custom-claims typing (use for `role: kid | parent`).
- **Firestore document triggers (crisis-escalation + transcript pipeline):**
  - `functions/src/event-triggers/by-document/users-event-triggers.ts` and `.../products-event-triggers.ts` — 2nd-gen `onDocument*` triggers. Model the **Bloop transcript** as documents and use an `onWrite` trigger to run crisis-detection → write an alert doc → push to the parent (pattern parallels functions-samples `text-moderation` below).
  - `functions/src/event-triggers/initialize-event-triggers.ts` — trigger registration wiring.
- **Data-model discipline (client vs firestore models):** `functions/src/core/data/models/*/{client,firestore}/` split + `validators.ts` — adopt for **transcript, child-profile, parent-link, moderation-log** schemas so the kid app never sees server-only fields.
- **Security-rules + deploy scaffolding:** `firestore.rules` (starts locked `allow read, write: if false` — the correct default; open up per-collection with parent/child ownership checks), `firestore.indexes.json`, `firebase.json`. Drop-in starting point for the v2 project.
- **Services layer:** `functions/src/core/services/` (`accounts-service.ts`, `db-changes-service.ts`) — patterns for Admin-SDK Firestore access and change-tracking (audit trail for parent transcript visibility).

**Caveats:** built for 2nd-gen Node functions (current); the demo domain is products/accounts — reuse the *architecture*, replace the domain with kid/parent/transcript. No LLM code here (that's what repo #3 supplies).

---

## 3. `firebase-functions-samples` — official CF samples (LLM call + moderation + auth lifecycle)

- **Repo:** https://github.com/firebase/functions-samples
- **Local:** `/Users/ameyakashid/Desktop/adhd india/_sources2/firebase-functions-samples`
- **License:** **Apache-2.0** (`LICENSE`) — verified. Permissive; attribute.
- **Layout:** `Node/` (2nd-gen), `Node-1st-gen/`, `Python/`.

### Reusable for Tiny Bubbles v2
- **Server-side Gemini/Vertex call (the Bloop model proxy pattern):**
  - `Node/remote-config-server-with-vertex/functions/index.js` — **calls Vertex AI Gemini server-side** (`@google-cloud/vertexai`, default `model_name: "gemini-1.5-flash-002"`). This is the canonical "server holds the key, calls **Gemini Flash**, returns text" pattern the Bloop proxy needs. Swap in system-prompt/topic-scope + moderation wrappers; add a DeepSeek branch as the alternative model.
  - `Node/call-vertex-remote-config-server/functions/` + `client/` — companion showing the **client → callable function → Vertex** round-trip (kid app never holds the API key).
- **Text moderation (input/output moderation + PII/profanity refusal):**
  - `Node-1st-gen/text-moderation/functions/index.js` — bad-words filter + sanitize on message write (`moderateMessage`, `badWordsFilter`, `sanitized` flag). Reuse the **pre- and post-model moderation** shape; layer PII-refusal + crisis-keyword detection on top.
  - `Node-1st-gen/moderate-images/` — Cloud Vision image moderation (bonus if kids can send images).
- **Auth-gated endpoints (proxy auth references, 1st-gen):** `Node-1st-gen/authenticated-json-api/`, `authorized-https-endpoint/`, `username-password-auth/` — alternative auth-gating patterns (repo #2's interceptor is the preferred 2nd-gen version).
- **Auth lifecycle / guardrails:**
  - `Node/quickstarts/auth-blocking-functions/` (+ `Python/quickstarts/auth-blocking-functions/`) — **beforeCreate/beforeSignIn blocking functions** → enforce that a kid account can only be created/linked under a verified parent (COPPA-style gating).
  - `Python/quickstarts/firestore-sync-auth/` — keep a Firestore user profile in sync with Auth (mirror of the app starter's `users` collection).
  - `Node/delete-unused-accounts-cron/` — scheduled account cleanup (data-minimization for a kids product).
- **Push on server events:** `Node/fcm-notifications/` — server-triggered FCM push → the **crisis-escalation-to-parent** notification path.

**Caveats:** it's a large multi-sample monorepo — take individual sample folders, not the whole tree, into v2. Several safety samples are 1st-gen; prefer 2nd-gen equivalents where they exist. Vertex sample uses `@google-cloud/vertexai` (Vertex AI on GCP) — aligns with the "Gemini Flash on GCP" decision; if using the Gemini Developer API instead, swap the SDK but keep the proxy shape.

---

## Reference-only (NOT cloned)

| Repo | Why not cloned | Still useful as… |
|------|----------------|------------------|
| `milotek/react-native-firestarter` | **No LICENSE** (all-rights-reserved) — verified `license: null` via API; only 2 stars | TS reference only: it *is* Expo SDK 52 + **expo-router** + **Zustand** + Firebase auth (Ignite-based) — the closest thing to a TS/expo-router Firebase starter. Read for structure; do not copy code. |
| `expo-community/expo-firebase-starter` | MIT & 533★, but **JavaScript** + hooks-only auth demo, older; superseded by #1 for completeness | Canonical minimal auth-hooks reference if #1 feels heavy. |
| `instamobile/react-native-firebase` | MIT & 441★, but **JavaScript** and last pushed 2024; #1 is newer/more complete | Alternate login/registration reference. |
| `gregfenton/expo-and-user-profiles-...` / `mondotDev/expo-firebase-template` | **No LICENSE** (`license: null`) — verified | Concept reference only for "watch user profile in real time" / minimal anonymous-auth + Firestore. |

**Note on the TS gap:** every *strong, well-starred, actively-maintained* Expo+Firebase Auth/Firestore starter is JavaScript; the TypeScript/expo-router ones (`react-native-firestarter`, etc.) are unlicensed and tiny. Recommendation: take the **auth/Firestore wiring** from #1 (JS → port to TS) and pair it with the **already-TypeScript** CF backend from #2 — together they cover the full v2 stack with clean licenses.

---

## Suggested v2 assembly

1. **Backend (`functions/`):** start from **#2** (`firebase-cloud-functions-typescript-example`) — its Express + `verifyIdTokenInterceptor` + controller/trigger layout is the skeleton. Add a `bloop` controller whose handler runs: input-moderation (#3 `text-moderation`) → topic-scope/PII-refusal system prompt → **Gemini Flash call** (#3 `remote-config-server-with-vertex`, DeepSeek as alt branch) → output-moderation → persist transcript doc. A Firestore `onWrite` trigger (#2 event-triggers) runs crisis-detection → writes parent alert → FCM push (#3 `fcm-notifications`). Enforce kid-account creation via auth-blocking functions (#3 `auth-blocking-functions`).
2. **Apps (Kid + Parent):** take auth + Firestore + push + profile wiring from **#1**, port to TS. Parent app reuses the `follow/follower` relationship pattern as **guardian-of link** and the `UserDataContext` real-time provider for **transcript/monitoring** views. AI on/off toggle lives on the child profile doc and is checked in the proxy interceptor.
3. **Security rules:** begin from #2's locked-default `firestore.rules`; open per-collection with ownership + parent-link checks (parent can read child transcript/alerts; child cannot read moderation internals).
