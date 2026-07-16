# Workstream w8 — Safety, Compliance & the neuroProfile axis (cross-cutting governance + shared modules)

*Authored 2026-07-09. Durable, buildable spec for a recursive build-agent. Grounds every claim in a real path:
the shipped v1 app under `/Users/ameyakashid/Desktop/adhd india/tiny-bubbles/` (post-migration `apps/kid/`),
donor code under `/Users/ameyakashid/Desktop/adhd india/_sources2/`, and the authoritative v2 docs
`_build/research2/00-SYNTHESIS2.md` (§1.0, §2.5–§2.8, §3.3, §5.7), `_build/research2/01-v2-feature-matrix.md`
(§A6/A7/A9, §C7/C8/C10, §D2/D7/D8), `_build/research2/{autism-science,kid-llm-safety}.md`,
`_build/inventory2/aac-communication.md`, and `_build/spec2/01-current-and-target.md` (§1.2, §3.3, §3.5, §3.6).
Mind the SPACE in every absolute path.*

> ## What THIS workstream owns (cross-cutting — it threads through every other workstream)
> w8 is the **policy + shared-module + CI-gate** layer. It does **not** ship a screen or a Cloud Function of its
> own; it ships the **cross-cutting primitives** every other workstream consumes and the **gates** that block a
> non-compliant ship. Concretely it owns:
> 1. **The `neuroProfile` axis** — the `NeuroProfile` type, the preset resolver (`resolveNeuroPreset`), and the
>    integration of `neuroProfile` into the v1 resolvers (`resolveCapabilities`/`resolveTokens`/`resolveContent`),
>    joining `ageMode`; per-child override; the deterministic-core + opt-in-previewed-novelty resolution.
> 2. **The EVIDENCE-HONESTY copy gate** — a shared banned-claim module + CI gate (no Zones™/Social-Stories™
>    efficacy, no AAC speech-gain promise, no SI/therapy/cure claims) + the *scaffolds-not-therapy* allowlist.
> 3. **The crisis-pathway review + localized hotline table** — the human-reviewed `CrisisCard` locale data
>    (US 988 + India + Mexico + configurable + generic fallback), the safe-messaging strings, the review/sign-off
>    registry, and the **no-model-invented-number** grep gate.
> 4. **The COPPA-2025 / UK-Children's-Code compliance program** — the shared **PII-redaction taxonomy**, the
>    **retention TTL policy** values + registry, the **consent-agreement version registry**, and the
>    **data-processor (DPA) terms** the LLM provider is bound to (non-training processor).
> 5. **The red-team GATE** — the adversarial case catalog + the psychologist-review sign-off + the CI-gate policy.
> 6. **The license-clean symbol-set gate** — the shipped symbol manifest + the CI gate that excludes ARASAAC
>    (CC-BY-NC-SA) / Sclera (CC-BY-NC) and any non-commercial art.
> 7. **The v2 SHIP GATE** — the aggregate release gate that *extends* v1's anti-shame + provenance gates.
>
> **It does NOT own** (it defines the contract those consume): the Firestore schema / TTL-enforcement / consent
> mechanics / security rules / sync (**w1**); the LLM moderation pipeline / crisis *detection* + *escalation* /
> persona / the `functions/redteam.test.ts` implementation (**w2**); the parent-app consent/controls/transcript
> UI (**w3**); the AAC board + symbol *rendering* (**w4**); the visual-supports UI (**w5**); the regulation UI
> (**w6**); the Bloop character/chat UI (**w-companion**). w8 hands each of them a typed module + a gate; see §8.

> ## LOCKED v2 decisions this workstream enforces (do NOT relitigate)
> - **`neuroProfile` axis** (autism = predictable/low-stim default · ADHD = novelty/bright default · both =
>   deterministic core + opt-in previewed novelty) joins `ageMode` in the resolvers; **per-child override**;
>   **never a raw axis read in a component** (v1 golden rule).
> - **Evidence-honesty is hard law of the product:** build **generic mechanisms**; ship **no** Zones-of-Regulation™
>   / Social-Stories™ efficacy claim (not EBPs), **no** AAC speech-gain promise (promise *communication access*),
>   **no** sensory-integration / therapy / cure claim. **Scaffolds, not therapy.**
> - **COPPA-2025 + UK Children's Code as hard constraints:** verifiable parental consent, retention TTL,
>   PII redaction **before** storage, **no ad/analytics SDKs in the kid app**, LLM provider bound as a
>   **non-training processor**.
> - **Crisis = pre-written, human-reviewed, REGION-LOCALIZED hotlines + parent FCM alert + transcript** — never a
>   bare refusal, **never a model-invented number**. Localize: **988 = US**; India + Mexico + configurable each ship
>   their own reviewed numbers; unknown locale → a generic "trusted grown-up / local emergency" card.
> - **License clean:** ship code + art only from MIT/Apache/BSD + CC-BY / public-domain / original. GPL/AGPL =
>   reference-only; **ARASAAC (CC-BY-NC-SA) + Sclera (CC-BY-NC) are NON-COMMERCIAL → excluded**.
> - **Red-team predeployment testing is mandatory** (APA + Common Sense Media). Psychologist review of crisis copy.
> - **All v1 invariants carry forward** (anti-shame, provenance discipline, no-egress-in-the-app, additive
>   persistence); w8 extends the v1 gates, never weakens them.

> ## ⟦v2 FINAL reconciliation — the gates must actually HOLD (`02-architecture.md` §8 #22–#31)⟧
> - **`evidenceHonesty.ts` bans the BARE trademarks** `zones of regulation` + `social stor(y|ies)` (independent of
>   any efficacy word) — the locked-intent standard, stronger than "brand + works/proven" (§8 #23). This ONE
>   function is authoritative; every downstream grep (BUILD-GUIDE §3.1, w3/w5/w6 local gates) matches it. Also bans
>   the AAC near-miss `may (increase|improve|help).*speech` / `does not inhibit speech` / `talk more`. Greps use
>   word boundaries (`\bcure(s|d)?\b`, `therap(y|ies) (for|that|works)`) so `secure`/`occupational therapy` don't
>   false-positive.
> - **EVERY crisis card ships `reviewed:false` — including `en-US`** — until a recorded `CRISIS_REVIEW_SIGNOFF`
>   (psychologist) flips it (§8 #16b). A correct 988 *number* ≠ reviewed crisis *copy*. India (`en-IN`/`hi-IN`) +
>   Mexico (`es-MX`) review is a **launch-critical-path** item (named clinical owner + verified-number date),
>   NOT "candidates pending." (Fix §9 #1 + roadmap M1.1 which contradicted §5.2's `reviewed:false` rule.)
> - **ONE symbol manifest: `apps/kid/assets/symbols/manifest.json`** (§8 #22). `assertSymbolManifestClean` +
>   `symbol-license.test.ts` + the §3.1 grep target that ONE path + a **completeness assertion** (every file under
>   `assets/symbols/` has a clean row — no orphan/renamed NC asset ships). w8 owns canonical `SymbolLicense` +
>   `SymbolAssetManifestEntry` (`compliance/symbolLicense.ts`); w4 imports/extends.
> - **Crisis differentiation (§8 #27):** the case catalog + review cover the abuse/CSAM → NO-parent-auto-alert +
>   NCMEC/mandated-reporter path + `legalHold` TTL-exception. Psychologist + legal sign-off is launch-blocking.
> - **Marketing/store-listing copy is in-repo** (`docs/store-listing.md`) and runs through the SAME
>   evidence-honesty gate + a SHIP-GATE "marketing reviewed" row (the FTC-facing surface, §8 #23b).
> - **VPC + non-training processor + semantic-output-classifier are ship-gate DECISIONS**, not open assumptions
>   (§8 #29/#30/#31): `dev_mock` rejected in prod (CI-tested), Vertex non-training config asserted, DeepSeek gated
>   OFF until DPA+residency, chat cannot enable without a working semantic output classifier.

---

## 1. Overview, user value, and the verified evidence

**What it is.** Two things braided together, both cross-cutting:

1. **The `neuroProfile` axis** — the single design lever that lets *one* codebase serve both an autistic child
   (predictability, low stimulation, no surprises) and an ADHD child (novelty, brightness, fast feedback), and the
   comorbid child who is **both** (~50–70% of autistic children show clinically significant ADHD traits — Antshel
   & Russo 2019, *Curr Psychiatry Rep* 21:34). w8 delivers the *machinery* (a preset resolver threaded into the v1
   resolvers) so every feature workstream expresses the difference through **capability flags**, never a raw axis
   read. It resolves the novelty-vs-sameness tension **by design**: a **deterministic core** (identical reactions,
   layout, voice) with an **opt-in, previewed novelty layer**.

2. **The safety/compliance program** — the shared modules + CI gates that make the product **legally shippable to
   under-13s** and **honest about the evidence**: the evidence-honesty copy gate, the COPPA-2025 program (consent
   versioning, retention TTL, PII redaction taxonomy, processor DPA), the crisis hotline table + review, the
   red-team gate, the license-clean symbol-set gate, and the aggregate v2 ship gate.

**User value.**
- **The comorbid child is served by one app**, not split in two (the market keeps splitting this child — AAC apps
  are autism-only, reward-loop apps are ADHD-only; `market-teardown.md` §G5).
- **Families can trust the product**: honest marketing (no fake therapy claims), verifiable consent, data
  minimization, a real crisis pathway with *real local numbers*, and no ad/analytics tracking of children.
- **The build stays safe as it grows**: every gate is a CI test, so a future edit that smuggles in a cure claim, a
  non-commercial symbol, a model-invented hotline, or a raw `neuroProfile` read **fails the build**.

**Verified evidence (cited honestly; flags where evidence is weak).**
- **The novelty↔sameness split is real and clean on both sides.** Autistic children engage *more* with **familiar**
  than novel agent behavior (Rakhymbayeva 2021, *Front Robot AI* 8:669972); ADHD engagement wants novelty/variety.
  → deterministic core + opt-in previewed novelty (`autism-science.md` §10; `companion-design.md` §4.1). **moderate.**
- **Intolerance of uncertainty (IU)** is elevated in autism and strongly predicts anxiety (Jenkinson 2020, *Autism*
  24(8):1933–1944, pooled r=0.62) → predictability/no-surprise defaults reduce meltdown risk. **strong (mechanism).**
- **Evidence-honesty is grounded, not stylistic:** **Zones of Regulation™ is NOT an EBP** (Mason, Leaf & Gerhardt
  2024, *J Special Education* 57(4):219–229 — "cannot be categorized as an EBP"; one study found *increased*
  challenging behavior); **Social Stories™** are mixed-to-null (Qi 2018; umbrella review PMC10791792); **AAC does
  not produce speech gains** (Flippin 2010 — communication↑, speech-null) but **does not suppress speech and may
  increase it** (Pope, Light & Laubscher 2024, DOI 10.1007/s10803-024-06382-7) → promise *communication access*,
  never speech; **Ayres Sensory Integration is clinic OT** (Schaaf 2014) → the app must not claim to deliver it.
  The **generic mechanisms** underneath (Emotion-Regulation Training — Nuske 2023; Visual Supports, AAC,
  first-then/Premack) are the strong, honest ground. **These are scaffolds; label the weak ones as such.**
- **Crisis = escalate + resource, never bare-refuse** — APA Health Advisory (Nov 2025) mandates "rigorously tested
  crisis escalation pathways" + "immediate and clear contact information for human-led services like… 988"; the
  Character.AI/Setzer deaths are the failure mode. **Pre-written, human-reviewed** (never model-generated) to avoid
  the documented "bot invents a fake 988 number" failure; **no means/method** (988 Media Toolkit;
  reportingonsuicide.org). Localize: 988 is US-only. **strong (mandate).**
- **COPPA 2025 amendments + UK Children's Code** require verifiable consent, data minimization, retention limits,
  no behavioural ad/analytics tracking, and the third-party (LLM) bound as a processor. **strong (law).**
- **Predeployment red-teaming is required** (APA + Common Sense Media; Safe-Child-LLM, Jiao et al. 2025,
  arXiv:2506.13510 — every child-facing LLM tested has critical child-safety deficiencies). **strong (mandate).**

Nothing in this workstream claims therapeutic efficacy. w8's whole job is to make sure **nothing else does either.**

---

## 2. UX behavior — screen-by-screen (neuroProfile × ageMode × low-stim, via resolvers only)

**Golden rule (carried from v1, enforced by a gate):** no component reads raw `ageMode` **or** `neuroProfile`.
Every difference is produced by a resolver and consumed as a **capability flag** or **resolved token/copy**. w8
adds `neuroProfile` as a **new resolver input** and a **new preset layer**; it never adds a prop or a `neuroProfile
=== "autism"` branch to a component.

### 2.0 Precedence model (how the axes compose)

`resolveCapabilities` / `resolveTokens` / `resolveContent` compose **three layers**, most-specific wins:

```
explicit parent override  >  neuroProfile preset  >  ageMode base   (+ OS reduce-motion forces lowStim)
```

- `ageMode` (`young`/`older`/`preteen`) — the shipped base (reading level, choice caps, chart visibility).
- `neuroProfile` (`adhd`/`autism`/`both`) — the **new** preset that shifts novelty, auto-advance, sensory default,
  celebration ceiling, feedback tempo, literal-language, and the default companion/Bloop input mode.
- explicit per-child settings (`sensoryMode`, `companionStyle`, `celebrationIntensity`, `calmMode`, etc.) — always win.
- **Back-compat:** `neuroProfile` **absent** ⇒ the neutral preset (changes nothing) ⇒ existing v1 children render
  **byte-identically** to today. This is why the axis is additive and needs **no `SCHEMA_VERSION` bump** (§3.3).

### 2.1 The three presets (what the child actually experiences)

| Surface (owned by) | **autism** (predictable/low-stim) | **adhd** (novelty/bright) | **both** (deterministic core + opt-in novelty) |
|---|---|---|---|
| **Novelty layer** (`questStore`/`novelty`, w-companion B4) | `noveltyMode:"deterministic"` — no rotating quests surprise-appearing; owned cosmetics only; `questsEnabled` default off | `noveltyMode:"lively"` — quests/seasonal badges on; more variety | `noveltyMode:"previewed"` — core is fixed; novelty is **opt-in + forewarned** ("New this week — want to see?"), never a surprise UI change |
| **Step advance** (TaskRunner, w5 A4) | `autoAdvanceSteps:false` — kid taps "ready"; `transitionWarnings:true` (2-min / almost-done priming) | `autoAdvanceSteps:true` allowed; warnings optional | `autoAdvanceSteps:false` + `transitionWarnings:true` (autism-safe core) |
| **Sensory default** (resolveTokens, w6 A5) | `sensoryModeDefault:"lowStim"` (sound/haptics off, dim, no particles) | `sensoryModeDefault:"standard"` (brighter, fuller) | `sensoryModeDefault:"lowStim"` (predictable core wins) |
| **Celebration** (resolveCelebration) | `celebrationCeiling:"gentle"` — soft, no confetti storm | `celebrationCeiling:"full"` — big, bright | `celebrationCeiling:"medium"` |
| **Feedback tempo** (Bloop character, w-companion B1) | `feedbackTempo:"calm"` — steady, identical each time | `feedbackTempo:"bright"` — fast, immediate reinforcement | `feedbackTempo:"calm"` |
| **Copy voice** (resolveContent, w4/w5/w6/w2 persona) | `literalLanguage:true` — no idioms/sarcasm; short predictable turns | `literalLanguage:false` — warmer, more playful | `literalLanguage:true` |
| **Bloop/AAC default input** (w-companion B2, w2 ctx) | `neuroInputModeDefault:"aac"` / `"chips"` (PII-free by construction) | `"chips"` (freeText still age-gated) | `"chips"` |

All seven fields are produced by `resolveNeuroPreset(neuroProfile)` and merged into the caps/tokens/content the
feature workstreams already read. **A feature workstream never learns which profile is active — it reads
`caps.autoAdvanceSteps`, `caps.noveltyMode`, `tokens` (already low-stim), `content` (already literal).**

### 2.2 Predictability guarantee (the autism non-negotiable)

A `neuroProfile`/settings change **never surprise-mutates** the UI, Bloop's core look, or Bloop's voice
**mid-session** (`00-SYNTHESIS2.md` §3.3 rule 5; w1 §2.2). Pulled control changes apply at the **next calm
boundary** (cold start or explicit settings open), never mid-flow. w8 states this as an invariant; w1's sync
adapter honors it (§8).

### 2.3 Compliance-facing surfaces (copy + data the child/parent actually sees)

These screens are **owned by w1/w2/w3**; w8 owns the **copy discipline + the data content** they render:

- **Consent screen** (w3 `app/(auth)/consent.tsx`): renders the **current consent agreement** whose text + version
  come from w8's `CONSENT_AGREEMENTS` registry (§4.4). States: what's collected, retention (30/90d, parent-set),
  **no ads/analytics**, LLM is a **bound non-training processor**, **grown-ups can see all chats** (no secrecy).
- **Persistent AI-disclosure** (w3/w-companion `DisclosureBanner`): the exact string is w8-owned
  ("Bloop is an AI helper, not a person or a doctor") and passes the evidence-honesty gate.
- **Crisis card** (w2 renders; w8 owns the **data**): the child sees pre-written safe-messaging (validate / hope /
  tell-a-trusted-grown-up-now / no-secrecy); the **grown-up-facing resource card** shows the **locale-correct
  reviewed numbers** from `CRISIS_RESOURCES` (§4.3). Never model-generated, never a wrong-region number.
- **Data review + delete** (w3 `settings.tsx`): shows the honest retention window (from w8's `RETENTION_POLICY`)
  and the PII-redacted transcript (redacted by w8's `redactPii` taxonomy applied at w1/w2 chokepoints).
- **Every new feature's copy** (w4 AAC labels, w5 schedule/social-narrative copy, w6 emotion/breathing copy, w2
  persona, w3 parent copy) passes the **evidence-honesty gate** at author time (§4.2) — this is the surface-level
  guarantee that "scaffold, not therapy" holds everywhere.

---

## 3. DATA MODEL (exact TS types; slice/collection; migration; offline-first + additive-sync)

All w8 types are **shared** and live under `packages/shared/src/` so both apps and `functions/` import one source.
w8 adds **no new on-device `tb/*` slice** and **no `SCHEMA_VERSION` bump**: `neuroProfile` is a union-widening +
one optional field (additive); the compliance modules are pure data/logic, not persisted state. `SCHEMA_VERSION`
stays `1`, `MIGRATIONS` stays `[]`.

### 3.1 The `neuroProfile` axis (`packages/shared/src/domain/types.ts` — MODIFY, additive)

```ts
/**
 * neuroProfile — the third theming axis (joins ageMode + sensoryMode). Parent-set,
 * per-child. autism = predictable/low-stim default; adhd = novelty/bright default;
 * both = deterministic core + opt-in previewed novelty. ABSENT ⇒ neutral preset
 * (v1 behaviour unchanged). Union-widening + one optional field → NO SCHEMA_VERSION
 * bump. NEVER read raw in a component — flows through resolveNeuroPreset →
 * resolveCapabilities/resolveTokens/resolveContent (the v1 golden rule).
 */
export type NeuroProfile = "adhd" | "autism" | "both";

export type NoveltyMode = "deterministic" | "previewed" | "lively";
export type FeedbackTempo = "calm" | "bright";

/** The resolved preset (defaults only; explicit ChildSettings always win). */
export interface NeuroPreset {
  noveltyMode: NoveltyMode;
  autoAdvanceSteps: boolean;          // autism/both false (kid taps "ready")
  transitionWarnings: boolean;        // autism/both true (advance-warning + priming)
  sensoryModeDefault: SensoryMode;    // autism/both "lowStim"; adhd "standard"
  celebrationCeiling: CelebrationLevel; // autism "gentle" · adhd "full" · both "medium"
  feedbackTempo: FeedbackTempo;       // adhd "bright"; autism/both "calm"
  literalLanguage: boolean;           // autism/both true (no idioms/sarcasm)
  previewNovelty: boolean;            // both true (opt-in, forewarned)
  neuroInputModeDefault: "aac" | "chips" | "freeText"; // AAC/Bloop default input
}
```

Add the optional field to the shipped child shape (additive, back-compat):

```ts
// ChildProfile (or ChildSettings) — ADD one optional field, absent ⇒ neutral:
//   neuroProfile?: NeuroProfile;   // default via DEFAULT_NEURO_PROFILE (undefined = neutral)
```

> **Placement note.** In the shipped tree these unions live in `apps/kid/src/domain/types.ts`. Per
> `01-current-and-target.md` §2B the domain **types** are the *first* extraction to `packages/shared/src/domain/
> types.ts`. w8 authors the additions in the shared file (or, pre-extraction, in `apps/kid/src/domain/types.ts`
> with a re-export). Either way it is **union-widening + one optional field** — no bump.

### 3.2 The compliance data types (`packages/shared/src/compliance/*`)

```ts
// ── evidenceHonesty.ts ──────────────────────────────────────────────────────
export type BannedClaimClass =
  | "cure" | "treats" | "therapy" | "clinical_efficacy"
  | "zones_efficacy" | "social_stories_efficacy" | "speech_gain" | "sensory_integration";
export interface ClaimGateResult { clean: boolean; hits: { class: BannedClaimClass; match: string }[]; }

// ── pii.ts ──────────────────────────────────────────────────────────────────
export type PiiCategory =
  | "email" | "phone" | "street_address" | "url" | "full_name"
  | "geolocation" | "school_name" | "biometric"; // COPPA-2025 expanded (voiceprint/face)
export interface RedactionResult { redacted: string; found: PiiCategory[]; }

// ── crisisResources.ts ───────────────────────────────────────────────────────
export interface CrisisResource { label: string; contact: string; note?: string; }
export interface CrisisCard {
  locale: string;                 // BCP-47, e.g. "en-US" | "en-IN" | "hi-IN" | "es-MX"
  headline: string;              // grown-up-facing
  bodyLines: string[];           // NO means/method text
  resources: CrisisResource[];   // reviewed numbers ONLY
  reviewed: boolean;             // FALSE blocks ship (crisis-review gate) until human sign-off
  reviewedBy?: string; reviewedAt?: string; // sign-off audit
}
export interface SafeMessaging {  // pre-written, human-reviewed; NEVER model-generated
  validate: string; hope: string; trustedGrownUp: string; noSecrecy: string;
}

// ── retention.ts ─────────────────────────────────────────────────────────────
export interface RetentionPolicy { defaultDays: 30; allowedDays: readonly (30 | 90)[]; maxDays: 90; }

// ── consent.ts ───────────────────────────────────────────────────────────────
export type ConsentMethod = "signed-form-email-verified" | "payment-verified" | "knowledge-based";
export interface ConsentAgreement {   // the versioned text the parent agrees to
  version: string;                    // e.g. "coppa-2026-04"
  effectiveFrom: string;              // ISO date
  bodyMarkdown: string;               // plain-language disclosure
  collects: string[]; retentionSummary: string; processorBinding: string; noAdsStatement: string;
}
export interface ConsentRecord {      // append-only in users/{uid}.consent[] (w1/w3 write it)
  method: ConsentMethod; agreementVersion: string; grantedAt: number;
  parentName: string; region?: string; scope: { transcripts: boolean; activity: boolean; llmChat: boolean };
}

// ── symbolLicense.ts ─────────────────────────────────────────────────────────
export type SymbolLicense =
  | "CC0" | "public-domain" | "CC-BY" | "CC-BY-SA" | "MIT" | "Apache-2.0" | "BSD" | "original";
export interface SymbolAssetManifestEntry {
  file: string; source: string; license: SymbolLicense; attribution?: string;
}
// BANNED (non-commercial) — MUST NOT appear in a shipped manifest:
//   "CC-BY-NC" (Sclera), "CC-BY-NC-SA" (ARASAAC), any "*-NC*" or GPL/AGPL art.
```

### 3.3 Additive-versioned migration + offline-first / sync

- **No on-device schema bump.** `neuroProfile?` is optional; `mergeWithDefaults`/`validateAndRepair` backfill it
  as absent → neutral preset (identical to v1). Add `neuroProfile?: NeuroProfile` to the **migration-forward
  fixture** (`apps/kid/__tests__/storage/migration-forward.test.ts`) proving "additive, no bump" (v1 discipline).
- **Offline-first.** The neuroProfile axis resolves **entirely on-device** from the persisted `ChildSettings` — the
  full autism/ADHD experience works with **network + LLM OFF**. Nothing about the axis depends on Firebase.
- **Additive-sync.** `neuroProfile` rides the existing settings two-way sync (w1): parent sets it in `apps/parent`
  → `children/{childId}.neuroProfile` → kid app pulls it at the next calm boundary (§2.2). The **on-device
  `storage` port stays source of truth**; Firestore mirrors it for parent editing.
- **Compliance modules are stateless.** `evidenceHonesty`/`pii`/`crisisResources`/`retention`/`consent`/
  `symbolLicense` are pure data + pure functions — no slice, no Firestore doc of their own. The *records* they
  produce (`ConsentRecord`, redacted transcripts, TTL fields) live in collections **owned by w1/w2/w3**.

---

## 4. EXACT files to CREATE / MODIFY (real monorepo paths)

> Paths assume the w0 monorepo migration (`01-current-and-target.md` §2) has landed: `packages/shared` exists with
> `@tiny-bubbles/shared` aliased in `tsconfig.base.json` + Metro. Where a resolver has not yet been extracted from
> `apps/kid/src/theme/` to `packages/shared/src/theme/`, apply the edit in `apps/kid` and re-export (v1 §2B
> discipline). Files marked ⇄ are co-owned — w8 **extends**, does not replace.

### 4.1 The neuroProfile axis — `packages/shared/src/` (CREATE unless ⇄)

- `packages/shared/src/domain/types.ts` ⇄ — add `NeuroProfile`, `NoveltyMode`, `FeedbackTempo`, `NeuroPreset`,
  the optional `neuroProfile?` field on the child shape (§3.1). Union-widening only.
- `packages/shared/src/theme/resolveNeuroPreset.ts` — **CREATE**: `NEURO_PRESETS: Record<NeuroProfile, NeuroPreset>`,
  `NEUTRAL_PRESET`, `DEFAULT_NEURO_PROFILE`, `resolveNeuroPreset(neuroProfile?: NeuroProfile): NeuroPreset`
  (absent ⇒ `NEUTRAL_PRESET`). Pure + unit-tested. The three presets per §2.1.
- `packages/shared/src/theme/resolveCapabilities.ts` ⇄ — add `neuroProfile?: NeuroProfile` to
  `ResolveCapabilitiesInput`; compose the preset **below** explicit overrides, **above** the `ageMode` base; expose
  the new caps: `noveltyMode`, `autoAdvanceSteps`, `transitionWarnings`, `celebrationCeiling`, `feedbackTempo`,
  `literalLanguage`, `previewNovelty`, `neuroInputModeDefault`. (Existing caps unchanged when `neuroProfile` absent.)
- `packages/shared/src/theme/resolveTokens.ts` ⇄ — when `sensoryMode` is unset, default it from
  `preset.sensoryModeDefault` (autism/both ⇒ `lowStim`). Explicit `sensoryMode` + OS reduce-motion still win.
- `packages/shared/src/theme/resolveContent.ts` ⇄ — when `preset.literalLanguage`, select the **literal** variant
  of a `ModeKeyed` copy entry (add an optional `literal?` branch to the copy key space; falls back to the base
  string when no literal variant is authored, so nothing breaks).
- `packages/shared/src/index.ts` ⇄ — barrel-export the new types + `resolveNeuroPreset` + `NEURO_PRESETS`.
- **MODIFY** `apps/kid/src/theme/` consumers only if a resolver stays in `apps/kid` pre-extraction (re-export seam).

### 4.2 The evidence-honesty copy gate — `packages/shared/src/compliance/` (CREATE)

- `packages/shared/src/compliance/evidenceHonesty.ts` — `BANNED_CLAIM_PATTERNS: readonly {class, re}[]`
  (authored from fragments like `BANNED_REMINDER_PATTERNS`, so the banned phrase never appears as a contiguous
  literal), `SCAFFOLD_ALLOWLIST` (approved honest phrasings: "communication access", "helps you practice",
  "a calm-down tool", "not a doctor"), `isEvidenceHonest(text): boolean`, `checkEvidenceHonesty(text):
  ClaimGateResult`, `assertEvidenceHonestCatalog(strings)` (dev-time throw, mirrors `assertReminderCopyClean`).
  Banned classes (§8 #23 — this ONE function is authoritative; every downstream grep matches it):
  cure/treats/therapy/clinically-proven (word-bounded: `\bcure(s|d)?\b`, `therap(y|ies) (for|that|works)` so
  `secure`/`occupational therapy` don't false-positive); the **BARE trademarks** `zones of regulation` **and**
  `social stor(y|ies)` (trademark/brand hits **independent of any efficacy word** — the locked-intent standard,
  stronger than the earlier "brand + works/proven"); AAC speech claims incl. the near-miss
  `may (increase|improve|help).*speech` / `does not inhibit speech` / `talk more` (only "communication access"
  ships); "sensory integration"/"SI therapy" delivery claims.
- `packages/shared/src/compliance/index.ts` ⇄ — barrel.
- **Consumers wire it** (each feature workstream's copy authoring): w2 `functions/src/bloop/persona.ts`,
  w4 AAC labels, w5 schedule/social-narrative templates, w6 emotion/strategy copy, w3 parent copy — all call
  `assertEvidenceHonestCatalog` over their resolved catalog at dev-time + are covered by the §7 CI gate.

### 4.3 The crisis-pathway review + localized hotline table — `packages/shared/src/compliance/` (CREATE)

- `packages/shared/src/compliance/crisisResources.ts` — `SAFE_MESSAGING: SafeMessaging` (pre-written, reviewed),
  `CRISIS_RESOURCES: Record<string, CrisisCard>` keyed by BCP-47 locale, `GENERIC_FALLBACK_CARD`,
  `resolveCrisisCard(locale: string): CrisisCard` (exact → language → `GENERIC_FALLBACK_CARD`; **never throws,
  never invents**). Seed entries (each `reviewed:false` until human sign-off — the gate blocks ship on any
  `reviewed:false` that is referenced by a shipping locale):
  - `en-US` — **988 Suicide & Crisis Lifeline** (call/text 988; chat 988lifeline.org); **Crisis Text Line** (text
    HELLO to 741741). *(988 number verified in `kid-llm-safety.md`, but the card ships **`reviewed:false`** like
    every other locale — a verified NUMBER ≠ psychologist-reviewed crisis COPY; a `CRISIS_REVIEW_SIGNOFF` entry
    flips it, §8 #16b.)*
  - `en-IN` / `hi-IN` — India candidates pending review: **Tele-MANAS** (14416 / 1-800-891-4416), **KIRAN**
    (1800-599-0019), **iCALL**, **Childline** (1098). `reviewed:false`.
  - `es-MX` / `en-MX` — Mexico candidates pending review: **Línea de la Vida** (800-911-2000), **SAPTEL**
    (55-5259-8121), emergency **911**. `reviewed:false`.
  - `GENERIC_FALLBACK_CARD` — "Contact your local emergency services and tell a trusted grown-up right now" (no
    number) — used for any unreviewed/unknown locale so a child is **never** shown a wrong-region or invented number.
- `packages/shared/src/compliance/crisisReview.ts` — `CRISIS_REVIEW_SIGNOFF: Record<locale, {reviewer, date}>`
  (the psychologist/clinician sign-off audit) + `assertCrisisTableReviewed(shippingLocales)` (throws if any
  shipping locale's card is `reviewed:false` or missing a sign-off). This is the **crisis-pathway review**.
- **Consumers:** w2 `functions/src/bloop/crisis/{safeMessaging,resources}.ts` **import** `SAFE_MESSAGING` +
  `resolveCrisisCard` from shared instead of hand-rolling numbers; the proxy returns the resolved card only.

### 4.4 COPPA-2025 program — `packages/shared/src/compliance/` + product docs (CREATE)

- `packages/shared/src/compliance/pii.ts` — `PII_PATTERNS: Record<PiiCategory, RegExp>` (email/phone/address/URL/
  geolocation/school/full-name heuristics; biometric is a category flag for the voice-future), `containsPii(text)`,
  `redactPii(text): RedactionResult` (replaces each hit with `[redacted:<category>]`; **the fact, not the PII**).
  This is the **single shared redaction taxonomy** w1's storage chokepoint and w2's `functions/src/bloop/redact.ts`
  both import (one source of truth for what "PII" means).
- `packages/shared/src/compliance/retention.ts` — `RETENTION_POLICY` (default 30, allowed [30,90], max 90),
  `retentionMs(days)`, `computeTtlAt(createdAt, days)`. w1 sets the Firestore TTL field from this; w3 shows it.
- `packages/shared/src/compliance/consent.ts` — `CONSENT_AGREEMENTS: ConsentAgreement[]`, `CURRENT_AGREEMENT`,
  `agreementByVersion(v)`. w3's consent screen renders `CURRENT_AGREEMENT`; w1's `recordConsent` stamps
  `agreementVersion`.
- **Product docs (build-agent CREATEs — these are product deliverables, NOT this spec):**
  - `COMPLIANCE.md` (root) — the written COPPA-2025 information-security + data-handling program (required by
    COPPA 2025): consent method, data map, retention, redaction, no-ad guarantee, breach posture.
  - `RETENTION-POLICY.md` (root) — the written retention policy (COPPA "only as long as reasonably necessary").
  - `docs/dpa/llm-processor-terms.md` — the **data-processor (DPA) terms** binding Gemini/DeepSeek as a
    **non-training processor** (no training on child data, deletion on request, sub-processor list). Referenced by
    `CONSENT_AGREEMENTS[].processorBinding` and by w2's provider config.

### 4.5 The license-clean symbol-set gate — `packages/shared/src/compliance/` (CREATE)

- `packages/shared/src/compliance/symbolLicense.ts` — the CANONICAL `SymbolLicense` + `SymbolAssetManifestEntry`
  (§8 #22; w4 imports/extends, never re-declares), `ALLOWED_SYMBOL_LICENSES`, `BANNED_SYMBOL_LICENSE_PATTERNS`
  (`/-NC(-|$)/`, `/GPL/`, `/AGPL/`, `ARASAAC`, `Sclera`), `isSymbolLicenseClean(entry)`,
  `assertSymbolManifestClean(manifestPath, assetsDir)` — validates every row's license **AND completeness**
  (every file under `assetsDir` has a clean manifest row → an orphan/renamed NC asset FAILS the build).
- `apps/kid/assets/symbols/manifest.json` ⇄ (co-owned with **w4**) — the ONE canonical per-file provenance
  manifest the gate validates (JSON; `apps/kid/assets/symbols/`); every shipped symbol asset has a
  `{file, source, license, attribution}` row. **w4 populates the cleared set** (CC-BY / public-domain / original /
  Mulberry-CC-BY-SA-with-attribution — any recolored/tinted Mulberry derivative re-published CC-BY-SA, or prefer
  CC0/original to avoid share-alike); **w8 owns the gate + the license schema** and blocks ARASAAC/Sclera/any-NC.
  The divergent `apps/kid/src/data/aacSymbolManifest.ts` / `assets/aac/symbols/` are DROPPED (§8 #22).

### 4.6 The v2 ship gate + CI wiring — gates (CREATE)

- `packages/shared/__tests__/gates/evidence-honesty.test.ts` — scans all resolved copy catalogs in
  `apps/kid`, `apps/parent`, `functions/src/bloop/persona*`, **AND `docs/store-listing.md`** (the FTC-facing
  marketing/store copy, §8 #23b) for banned claims (incl. the BARE trademarks) → **zero**.
- `docs/store-listing.md` (root, build-agent CREATEs) — the app-store description + landing copy as an in-repo
  text artifact so the evidence-honesty gate covers the surface regulators actually read; SHIP-GATE.md adds a
  "marketing/store copy reviewed" row (legal + clinical sign-off).
- `packages/shared/__tests__/gates/crisis-review.test.ts` — `assertCrisisTableReviewed` over the launch locales;
  asserts `resolveCrisisCard` never returns an invented number + safe-messaging has no means/method.
- `packages/shared/__tests__/gates/symbol-license.test.ts` — `assertSymbolManifestClean` over the ONE canonical
  `apps/kid/assets/symbols/manifest.json` + `apps/kid/assets/symbols/` (§8 #22): validates every row's license
  **and completeness** (every file under `assets/symbols/` has a clean row — an orphan/renamed NC asset FAILS);
  grep asserts no `ARASAAC|Sclera|-NC` in bundled asset provenance.
- `packages/shared/__tests__/gates/no-invented-hotline.test.ts` — greps `apps/*` + `functions/` for a phone/`988`
  literal **outside** `packages/shared/src/compliance/crisisResources.ts` → **zero** (the reviewed table is the
  only place a number may live). Mirrors w2 §9-B's grep, hoisted to the shared gate.
- `packages/shared/__tests__/gates/neuro-golden-rule.test.ts` — greps `apps/kid/{app,src,components}` +
  `apps/parent/{app,components}` for `neuroProfile ===` / `neuroProfile ==` / `neuroProfile !==` in a render path
  → **zero** (must route through resolvers, like the existing `ageMode` gate).
- `packages/shared/__tests__/compliance/*.test.ts` — unit tests for `resolveNeuroPreset`, `redactPii`,
  `isEvidenceHonest`, `resolveCrisisCard`, `assertSymbolManifestClean`, `retention`.
- `scripts/ship-gate.sh` (root) + root `package.json` script `"ship-gate"` — the **aggregate v2 ship gate**: runs,
  in order, every workspace `typecheck` + `test`, then the cross-cutting gates (evidence-honesty, crisis-review,
  symbol-license, no-invented-hotline, neuro-golden-rule), then the retargeted **no-egress** gates (w1/w2), the
  **no-ad/analytics** grep (w1), the **anti-shame** grep (v1), the **red-team** suite (w2 `functions/__tests__/
  redteam/`), and prints the **provenance sign-off** checklist. **Any red = no ship.**
- `SHIP-GATE.md` (root, build-agent CREATEs) — the human checklist that pairs each mechanical gate with its
  sign-off owner (psychologist for crisis copy, legal for consent/DPA, license reviewer for symbols).
- **MODIFY** `PROVENANCE.md` + `THIRD_PARTY_NOTICES.md` (root, ⇄ v1 discipline) — add the cleared symbol set +
  its licenses/attribution; add the neuroProfile/compliance modules as `original`; record the ship-gate sign-off row.

---

## 5. Reused donor parts (repo · license · files; GPL = reference-only)

w8 is mostly **original** cross-cutting policy code; it reuses **patterns**, not third-party code, and it is the
workstream that **enforces** the license line for everyone else.

| Donor / source (local) | License | Ship? | What w8 reuses |
|---|---|---|---|
| **v1 shipped app** (`tiny-bubbles/`) | project | ✅ reuse via `packages/shared` | **The copy-gate pattern** verbatim: `apps/kid/src/services/notifications.ts` `BANNED_REMINDER_PATTERNS` + `isReminderCopyClean` + `assertReminderCopyClean` (the evidence-honesty gate is authored in this exact shape); `apps/kid/src/domain/plans.ts` `assertPlanCopyClean` (per-catalog assertion pattern). **The resolver pattern**: `resolveCapabilities.ts` `AGE_CAP_BASE` + input-override composition (neuroProfile presets slot in identically). **The additive-migration discipline**: `apps/kid/src/storage/{migrations,schemaVersion}.ts` + `__tests__/storage/migration-forward.test.ts` (prove `neuroProfile?` needs no bump). **The gate-as-test pattern**: `apps/kid/__tests__/config/no-network.test.ts` (walk/grep/exclusion shape reused for the new gates). **The provenance discipline**: `PROVENANCE.md`/`THIRD_PARTY_NOTICES.md`. |
| `_sources2/nemo-guardrails` | Apache-2.0 | ✅ ship (ref for copy) | `examples/bots/abc/rails/disallowed.co` (refuse-and-redirect → crisis) informs the **safe-messaging** stance; **preserve `LICENSE`/`NOTICE`** if any prompt text is adapted. The persona *policy* structure is w2's; w8 only ensures the crisis copy is human-reviewed + evidence-honest. |
| `Action Alliance 988 Media Toolkit` + `reportingonsuicide.org` | guidance | ✅ (guidance, not code) | The **safe-messaging rules** (validate / hope / trusted-grown-up / **no means/method**) the `SAFE_MESSAGING` strings must satisfy. |
| **Symbol asset sets** (evaluated by the gate) | mixed | selective | **Mulberry** (CC-BY-SA) = shippable **with attribution + share-alike**; **ARASAAC** (CC-BY-NC-SA) + **Sclera** (CC-BY-NC) = **NON-COMMERCIAL → BANNED by the gate**; OpenSymbols API results = **filter per-asset to CC-BY/PD**. w8 owns the manifest schema + the ban; **w4 selects the actual cleared art.** |
| `MindfulwareDev/PromptProof` | **GPL-3.0** | ⚠️ ref-only | Inspiration for the red-team **case taxonomy** only (§6/§4.6). **Copy no code/text.** |
| `Safe-Child-LLM` (arXiv:2506.13510) | paper | ✅ (cases, not code) | The adversarial **case catalog** w8 hands to w2's `functions/__tests__/redteam/` (indirect ideation, method-seeking, abuse disclosure, "hide from mom", injection). |

**No GPL/AGPL code enters this workstream.** No symbol art is *authored* here (w8 gates it). Guardrail donors
(`llm-guard`/`nemo-guardrails`/`guardrails-ai`) are Python and live in `functions/` (w2) — w8 touches none of them.

---

## 6. SAFETY + anti-shame + COPPA rules that apply (this workstream IS the safety layer)

1. **Evidence-honesty (hard).** No efficacy claim for Zones™/Social-Stories™; no AAC speech-gain promise (say
   *communication access*); no SI/therapy/cure claim. Build **generic mechanisms**; label weak-evidence features
   (emotion/zones, social narratives, sensory breaks) as **scaffolds**. Enforced by the §4.2 gate over **all**
   resolved copy in both apps + the persona.
2. **Crisis pathway.** Pre-written, **human-reviewed**, region-localized; **never model-generated, never an
   invented number, never a wrong-region number**; **no means/method**; validate + hope + tell-a-trusted-grown-up +
   **no secrecy**. Unknown locale → generic card, never a guess. `reviewed:false` **blocks ship** for that locale.
3. **COPPA-2025 + UK Children's Code.** Verifiable parental consent (versioned agreement) **before** any child data;
   **retention TTL** (30 default / 90 max, parent-set); **PII redacted before storage** (the shared taxonomy is the
   one definition of PII, applied at w1/w2 chokepoints); **no ad/analytics SDKs in the kid app** (grep gate);
   **LLM = bound non-training processor** (DPA terms); parent **review + delete**; a **written** security/retention
   program (`COMPLIANCE.md`/`RETENTION-POLICY.md`).
4. **Data minimization + no secrecy.** Log the *fact* of a PII refusal, not the PII. The parent sees every
   transcript; the child is told grown-ups can see chats. `displayName` = first name only. Activity = aggregates.
5. **neuroProfile predictability.** For autism/both, the deterministic core never surprise-changes; novelty is
   opt-in + previewed. Settings changes apply at a calm boundary, never mid-flow.
6. **Anti-shame carries forward (extended).** The neuroProfile presets never introduce a failure/loss/guilt state
   (celebration ceilings only *dampen*, never punish); the crisis + compliance copy is supportive, never punitive
   toward the child; the evidence-honesty gate composes with (does not replace) the v1 `BANNED_REMINDER_PATTERNS`
   anti-shame gate.
7. **License clean.** Ship only MIT/Apache/BSD/CC-BY/PD/original; **ARASAAC/Sclera/any-NC excluded**; GPL/AGPL =
   reference-only; every bundled asset in `THIRD_PARTY_NOTICES.md`/`PROVENANCE.md`.
8. **No-egress-in-the-app carries forward.** w8 ships only shared pure logic + data; it adds **no** network call to
   any client tree (all egress stays in `functions/`, w2). Its gates *enforce* this for everyone.
9. **Golden rule.** `neuroProfile` is never read raw in a component — the §4.6 gate makes this a build failure.

---

## 7. ACCEPTANCE CRITERIA + verify steps

**A. neuroProfile axis (shared + kid app, green/offline).**
- [ ] `npm -w @tiny-bubbles/shared run typecheck` → 0; `NeuroProfile`/`NeuroPreset`/`resolveNeuroPreset` compile.
- [ ] `npm -w @tiny-bubbles/shared test` → `resolveNeuroPreset.test.ts` asserts each preset (autism = deterministic/
      lowStim/no-auto-advance/literal; adhd = lively/standard/bright; both = deterministic core + `previewNovelty`),
      and that **absent ⇒ NEUTRAL** (v1 behaviour unchanged).
- [ ] `resolveCapabilities.test.ts` (extended): precedence holds — explicit override > preset > ageMode base; with
      `neuroProfile` **omitted**, output is **byte-identical** to the pre-w8 snapshot (back-compat proof).
- [ ] `npm -w @tiny-bubbles/kid run typecheck` → 0; `npm -w @tiny-bubbles/kid test` → all prior suites green +
      `migration-forward.test.ts` proves `neuroProfile?` round-trips with **`SCHEMA_VERSION` still 1, `MIGRATIONS` []**.
- [ ] **Golden-rule gate:** `neuro-golden-rule.test.ts` → **zero** raw `neuroProfile ===`/`==`/`!==` in
      `apps/kid/{app,src,components}` + `apps/parent/{app,components}`.
- [ ] `npx expo export` in `apps/kid` succeeds (axis is pure on-device logic; no new native dep, no egress).

**B. Evidence-honesty gate.**
- [ ] `evidence-honesty.test.ts` scans resolved copy catalogs in `apps/kid`, `apps/parent`, and
      `functions/src/bloop/persona*` → **zero** hits for `cure|treats|therapy|clinically proven|zones of
      regulation …works|social stor(y|ies) …proven|speech gain|sensory integration (therapy|delivered)`.
- [ ] Unit: `isEvidenceHonest` **rejects** each banned class and **accepts** each `SCAFFOLD_ALLOWLIST` phrase.
- [ ] Grep parity (CI): `grep -rniE "cure|treats|therapy|clinically proven|zones of regulation|social stor(y|ies) work|speech gain" apps packages functions --include=*.ts* | grep -v compliance/evidenceHonesty` → **zero**.

**C. Crisis table + review.**
- [ ] `crisis-review.test.ts`: `assertCrisisTableReviewed(LAUNCH_LOCALES)` **passes only when** every launch
      locale's card is `reviewed:true` with a sign-off (so an unreviewed India/Mexico number **blocks ship**);
      `resolveCrisisCard("xx-YY")` → `GENERIC_FALLBACK_CARD` (no number); `SAFE_MESSAGING` contains no means/method.
- [ ] **No-invented-hotline gate:** `no-invented-hotline.test.ts` → a `988`/phone literal appears **only** in
      `packages/shared/src/compliance/crisisResources.ts` (grep everywhere else → zero).
- [ ] Coordination with w2 (emulator, referenced): the proxy's crisis turn renders the **shared** card via
      `resolveCrisisCard(ctx.locale)` — a grep asserts `functions/src/bloop/crisis/resources.ts` imports from
      `@tiny-bubbles/shared/compliance/crisisResources` and hard-codes no number.

**D. COPPA program.**
- [ ] `pii.test.ts`: `redactPii` removes every `PiiCategory` sample (email/phone/address/URL/geo/school/name); a
      fuzz test asserts no raw email/phone survives; the result records the **category**, not the value.
- [ ] `retention.test.ts`: `computeTtlAt` = createdAt + days·86_400_000; default 30, clamp to [30,90].
- [ ] `consent.test.ts`: `CURRENT_AGREEMENT` is the newest by `effectiveFrom`; `agreementByVersion` round-trips;
      `bodyMarkdown` passes the evidence-honesty gate + names the **no-ads** + **non-training-processor** bindings.
- [ ] Coordination: w1's transcript write chokepoint + w2's `functions/src/bloop/redact.ts` both **import**
      `@tiny-bubbles/shared/compliance/pii` (grep asserts a single redaction source).

**E. License-clean symbol set.**
- [ ] `symbol-license.test.ts`: `assertSymbolManifestClean(apps/kid/assets/symbols/manifest.json)` passes; a fixture
      manifest containing an `ARASAAC`/`Sclera`/`CC-BY-NC` row **throws**.
- [ ] Grep: `grep -rniE "ARASAAC|Sclera|CC-?BY-?NC|-NC-|AGPL|GPL-3" apps/kid/assets apps/kid/PROVENANCE* THIRD_PARTY_NOTICES.md` → **zero** in a shipping context (reference-only mentions live in docs prose, excluded).

**F. Red-team gate (coordinated with w2; w8 owns the policy).**
- [ ] The `functions/__tests__/redteam/redteam.test.ts` (authored by **w2**, cases from **w8**'s catalog) is wired
      into `scripts/ship-gate.sh` as a **release blocker**; it covers: indirect ideation→crisis, method-seeking→
      blocked (no means), abuse disclosure→crisis, "hide from mom"→no-secrecy+alert, persona-override→blocked,
      invisible-unicode jailbreak→stripped, PII inbound→refused (no raw PII stored), off-scope→redirect (no model
      call), poisoned model reply→output-shield filter.
- [ ] `SHIP-GATE.md` records the **psychologist sign-off** on crisis copy + the **legal sign-off** on consent/DPA.

**G. The aggregate v2 SHIP GATE.**
- [ ] `npm run ship-gate` (root) is green end-to-end: all workspace typecheck+test, the five cross-cutting gates
      (B/C/E/A-golden-rule + no-invented-hotline), the no-egress gates (w1/w2), the no-ad/analytics grep (w1), the
      v1 anti-shame grep, the red-team suite (w2). **Any red = no ship.**
- [ ] `PROVENANCE.md` has a new ship-gate sign-off row confirming: neuroProfile/compliance modules `original`;
      cleared symbol set only; crisis table reviewed; additive-only (`SCHEMA_VERSION` 1, `MIGRATIONS` []).

---

## 8. Dependencies · premium/free · LLM on/off

### 8.1 Depends on (must land first / in parallel)
- **w0 — monorepo migration** (`01-current-and-target.md` §2): `packages/shared` + `@tiny-bubbles/shared` alias in
  `tsconfig.base.json` + Metro; the retargeted no-egress gate. **Hard prerequisite.**
- **w1 — backend/data:** owns the Firestore schema, TTL **enforcement** (sets the field from w8's `RETENTION_POLICY`),
  the transcript **redact chokepoint** (imports w8's `pii`), the consent **mechanics** (stamps w8's
  `CONSENT_AGREEMENTS` version), security rules, and the **no-ad/analytics** grep. w8 provides the taxonomy + policy
  values; w1 applies them.
- **w2 — LLM proxy:** consumes w8's `crisisResources` + `SAFE_MESSAGING` (crisis card), `pii` (redaction),
  `evidenceHonesty` (persona copy); **authors** `functions/__tests__/redteam/redteam.test.ts` from w8's case
  catalog. w8 owns the crisis **data + review** + the red-team **gate policy**; w2 owns detection + escalation.
- **w3 — parent app:** renders w8's `CURRENT_AGREEMENT` (consent), the disclosure string, the retention window, the
  crisis card; its copy passes the evidence-honesty gate.
- **w4/w5/w6 — feature workstreams:** **consume** the neuroProfile resolver (caps/tokens/content) + the
  evidence-honesty gate on all new copy; **w4** populates the cleared `symbols/manifest.json` w8's gate validates.

### 8.2 Provides to other workstreams
- The `neuroProfile` axis (types + `resolveNeuroPreset` + resolver integration) — consumed by **every** UI workstream.
- The evidence-honesty copy gate (`isEvidenceHonest`/`assertEvidenceHonestCatalog`) — consumed by all copy authors.
- The shared PII taxonomy (`redactPii`), retention policy, consent-agreement registry, DPA terms — consumed by w1/w2/w3.
- The crisis hotline table + safe-messaging + review sign-off — consumed by w2 (+ shown by w3).
- The license-clean symbol schema + gate — consumed by w4.
- The aggregate v2 ship gate + CI wiring — the release blocker for the whole monorepo.

### 8.3 Premium / free
- **All of w8 is FREE and never gated.** Safety, honesty, consent, crisis, license-cleanliness, and the
  neuroProfile axis are **product invariants, not revenue levers**. The neuroProfile *preset* is free; a premium
  cosmetic/novelty *pack* may ride the existing `premium` acquisition gate (v1 `entitlements.ts`), but the
  **predictable-core / autism-safe experience is never behind a paywall** and downgrade is acquisition-only (never
  strips an owned experience). Crisis + transcripts + consent are never premium.

### 8.4 LLM on/off behavior
- **The neuroProfile axis + evidence-honesty gate + license gate + consent/retention program are 100% independent
  of the LLM** — they work with the network and LLM fully **OFF** (pure on-device resolvers + shared data + CI gates).
- **The crisis table + PII redaction + red-team gate are LLM-adjacent**: they only *engage* when chat is ON (w2's
  proxy imports them), but they are **authored, unit-tested, and gate the ship regardless** of whether chat ever
  turns on — so the safety layer is proven before a single model call.
- **Mock provider (dev/CI):** w2's `MockBloopProvider` uses the same shared `crisisResources`/`pii`, so the crisis +
  redaction paths are exercised **offline, no network**, in CI — the whole safety layer stays green with the LLM off.

---

## 9. Open assumptions

1. **India + Mexico hotline numbers are candidates pending psychologist/clinician sign-off.** The seed entries
   (`en-IN`/`hi-IN`: Tele-MANAS/KIRAN/Childline; `es-MX`/`en-MX`: Línea de la Vida/SAPTEL/911) ship as
   `reviewed:false` and **block the ship for that locale** until a human reviewer verifies the current number +
   sets `reviewed:true`. The US 988 entry is verified in `kid-llm-safety.md`. Confirm the launch locale list +
   the sign-off owner.
2. **Default `neuroProfile` for a NEW child.** Assumed the parent **explicitly picks** at add-child (adhd/autism/
   both); an existing/absent value resolves to the **neutral** preset (v1 behaviour). Confirm whether the add-child
   flow should *require* a pick or default to `both` (the comorbid-target framing).
3. **`literalLanguage` copy variants.** Assumed additive: a `ModeKeyed` copy entry gains an optional `literal?`
   branch and falls back to the base string where no literal variant is authored (nothing breaks; literal variants
   are filled in per-feature over time). Confirm the copy-authoring cadence with w4/w5/w6.
4. **Verifiable-consent method.** COPPA "beyond self-attestation" mechanism is a legal/product decision captured in
   `ConsentRecord.method` (assumed `signed-form-email-verified` for v1). The exact mechanism is w1/w3's; w8 owns the
   versioned agreement text + the DPA binding it references.
5. **PII detection depth.** The shared `pii.ts` is deterministic regex/heuristics (email/phone/address/URL/geo/
   school/name). Assumed w1/w2 additionally delegate heavy ML PII to **GCP DLP / Model Armor** server-side (w2 §10);
   the shared taxonomy remains the canonical *definition* both paths agree on.
6. **Retention default = 30 days, max 90, parent-set.** Assumed per COPPA "only as long as reasonably necessary";
   confirm the default + the owner of the written retention/security program (`COMPLIANCE.md`/`RETENTION-POLICY.md`).
7. **Symbol-manifest ownership.** Assumed `apps/kid/assets/symbols/manifest.json` is populated by **w4** (the AAC
   workstream picks the cleared art) and *validated* by w8's gate. If w4 lands later, the gate runs against an empty
   manifest (passes vacuously) until art is added — the gate must be re-run at symbol-set landing (wired into
   `ship-gate`).
8. **Red-team test file ownership.** Assumed w2 authors `functions/__tests__/redteam/redteam.test.ts`; w8 owns the
   **case catalog** + the **gate policy** (release blocker) + the psychologist sign-off. If the team prefers w8 to
   author the test file directly, move it under `functions/__tests__/redteam/` with a dependency on w2's pipeline.
9. **`both`-profile novelty UX.** Assumed the opt-in previewed novelty for the comorbid child is surfaced by
   **w-companion** (B4 `questStore`) reading `caps.previewNovelty`/`caps.noveltyMode:"previewed"`; w8 provides the
   flags, w-companion provides the "want to see what's new?" preview affordance. Confirm the preview UX owner.
