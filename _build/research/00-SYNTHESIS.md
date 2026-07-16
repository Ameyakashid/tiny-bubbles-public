# Tiny Bubbles — Master Synthesis (Phase 1)

**A polished, engaging ADHD app FOR KIDS, built by stitching MIT open-source repos.**

*Compiled 2026-06-27. Synthesizes all Phase-1 research streams (market, kids-market, science, community, UX, repo-fit) plus the adversarial science fact-check. Every load-bearing claim is tied to a verified source. Where the original research overstated a finding, this doc uses the corrected, fact-checked version.*

---

## 0. Reading this document

This is the decision layer that sits on top of six research reports:

- `10-market-overview.md` — adult/general ADHD app market
- `11-market-kids-adhd.md` — kids' ADHD apps (Joon, Brili, Goally, Mightier, EndeavorRx)
- `20-science-engagement.md` — engagement/behavior science (now corrected by the fact-check)
- `30-community-asks.md` — what real parents/users want and hate
- `40-ux-engagement-patterns.md` — child-UX pattern library + dark-pattern ethics
- `50-repo-fit-analysis.md` — which of the 16 cloned MIT repos to build on

Two honesty rules apply throughout, both forced by the adversarial fact-check:

1. **The science is real but moderate, not magic.** The mechanisms we build on (delay discounting, token economies, parent training, time-perception deficits) are robustly replicated but mostly *moderate* in effect size with high individual variability. Do not market core-symptom "treatment."
2. **Several popular ADHD-design tropes are weaker than they sound** — notably the "variable/surprising rewards beat predictable rewards" claim and the "dopamine transfer deficit" mechanism. We keep the *design practice* where the behavioral evidence supports it, but we drop the overconfident neuro-marketing copy.

---

## 1. Executive summary

**The opportunity is proven and the leader's weaknesses are the white space.** Joon has demonstrated product-market fit for exactly the loop Tiny Bubbles is pursuing — a two-app contingency-management system where a parent assigns real-world tasks, the child completes them offline, the parent verifies, and the child earns in-game currency to nurture a virtual pet (500k+ users, ~18k paying, $6.4M raised, 4.7★) (`11-market-kids-adhd.md` §2). Its four loudest complaints — **(a) novelty decay at 4–8 weeks, (b) parent-verification burden, (c) no screen-time guardrails, (d) an age cliff at ~12** — are the open product gaps to attack.

**The winning model is a direct-to-consumer subscription, not a medical/prescription product.** The single clearest market signal in the entire corpus: EndeavorRx had an FDA authorization and a *Lancet* RCT and still collapsed commercially because payers would not reimburse; Akili was sold for ~$34M after a ~$1B SPAC valuation, and its OTC consumer model outperformed its Rx model (`10-market-overview.md` §3; `11-market-kids-adhd.md` §6). Build for parents' wallets, treat clinical evidence as a trust asset, and never depend on insurers.

**The science gives a clear, defensible engagement engine: an immediate, forgiving token economy delivered through a beloved companion, operated by a coached parent.** Token economies and behavioral parent training are the two strongest, guideline-grade pediatric ADHD evidence bases (fact-check: `parent-training` = *confirmed*; `token-economy` = *partially-confirmed, well-established core*). They are powerful precisely *because* kids with ADHD show steeper delay discounting and need immediate, frequent, tangible reinforcement (`delay-discounting` = *partially-confirmed*, moderate g≈0.43–0.47, replicated across three meta-analyses including a child-only one).

**The biggest risk is not "will it work" but "will they keep using it."** Both the market stream and the community stream independently converge on the same #1 failure: the 4–8 week novelty cliff, where the game layer is exhausted and "do your Joon task" becomes indistinguishable from "do your task" (`11` §12.7; `30` §3.2). Retention is the moat. The second-biggest risk is emotional harm: streak-loss shame causes ADHD/RSD users to abandon the app *and* the habit (`30` §3.1; `40` §11).

**Recommended build:** React Native + Expo, base repo `lockin` (the only cloned repo with a real animated companion-sprite system), with `habit-tracker-app` as the UI-component donor and `tether`/`momentum` as logic donors — all MIT-licensed (`50-repo-fit-analysis.md`).

---

## 2. The winning engagement loop for kids' ADHD

This is the core mechanic, grounded in the verified science, the market evidence (what already sells), and the community voice (what users beg for). It is one sentence: **a forgiving, immediate token economy around a beloved, never-punishing companion, operated by a lightly-coached parent, that refreshes itself before novelty dies.**

### 2.1 The loop, step by step

1. **Parent assigns a small, concrete task or routine step** (templated, 2–3 taps). *Why:* parent training (PTBM) is AAP first-line, Grade-A for ages 4–6 and a core component at all pediatric ages (fact-check `parent-training` = confirmed; Wolraich et al. 2019, *Pediatrics* 144(4):e20192528). The parent layer is also what makes the token economy generalize beyond the app (the documented failure point of token systems — fact-check `token-economy`).
2. **Child sees ONE step at a time**, represented as picture + icon + color + spoken label (non-readers must be able to run the whole routine without decoding a word) (`30` §2; `40` §7). *Why:* task chunking lowers working-memory load and creates frequent completion points (fact-check `task-chunking` = partially-confirmed, **not overstated** — one of the cleaner claims; Martinussen 2005 WM meta-analysis + segmenting-effect evidence).
3. **Child taps "done" → immediate multisensory celebration** (animation + sound + haptic) **and an immediate token payout.** *Why:* this is the load-bearing, best-supported mechanism. Kids with ADHD discount delayed rewards more steeply and prefer smaller-immediate over larger-delayed rewards (fact-check `delay-discounting`, replicated in Patros 2016 child-only meta, g=0.47). Reinforce *at the moment of behavior*, sub-second, never end-of-day.
4. **Tokens nurture a companion / unlock cosmetic collectibles.** *Why:* the parasocial-bond mechanic is the single most powerful engagement pattern across Joon (Doter), Finch (bird), and Pokémon Smile (`40` §2; `30` §2.4). It reframes "do this because I said so" into "care for your buddy" without feeling like a bribe.
5. **Tokens are also redeemable for caregiver-set real-world backup rewards** (the most-requested being screen time) (`30` §2.8). *Why:* this is textbook token economy — immediate secondary reinforcers bridging to backup rewards — the most evidence-backed behavioral framework for pediatric ADHD (fact-check `token-economy`).
6. **Reinforce richly at first, then thin the schedule as the habit forms.** *Why:* "start dense, then stretch the ratio" is legitimate, standard ABA and evidence-aligned for all children (fact-check `reinforcement-frequency`: keep the practice, **drop** the "ADHD-specific" and "variable schedule resists extinction better in ADHD" justifications — the cited paper found the opposite).

### 2.2 What makes the loop *durable* (beating the novelty cliff)

The cliff is the category-defining problem. Counter-levers, each evidenced:

- **A content/quest/companion refresh pipeline from day one**, not bolted on later (`11` §12.7; `30` §3.2). Treat fresh content as a core feature, not marketing.
- **Varied, surprising rewards — used carefully.** Novelty/stimulation-seeking is a real, moderately-supported ADHD trait and variety helps sustain engagement (fact-check `novelty-stimulation-seeking`). **But** the specific claim that *variable/unpredictable* rewards beat *predictable* ones is weak and partly contradicted, and variable-ratio schedules are the exact mechanism behind slot machines and loot boxes (`40` §3, §11). Use variety in *content and reward magnitude* to fight boredom; do **not** build a compulsion engine, and do not market "unpredictable rewards" as scientifically superior.
- **Appointment mechanics, not open-ended grind** (Finch's pet goes on timed adventures and reports back) — gentle anticipation without nagging (`40` §5).
- **Optimize for "task done and child off the app," not time-in-app** (`40` §11). This is the structural line between a therapeutic tool and an attention-extraction product, and it is also what keeps parents subscribed (they want calmer mornings, not a more-addicted kid).

### 2.3 What makes the loop *humane and safe*

- **Default to positive reinforcement; minimize punishment and loss.** Avoid hard streak-loss, point clawbacks, and public failure. *Corrected justification:* frame this around **emotional reactivity / frustration tolerance and delay aversion**, NOT "blunted feedback processing" or "kids with ADHD can't learn from punishment" — the most current evidence (Hulsbosch 2024) finds intact punishment-driven learning but rising negative emotionality (fact-check `punishment-streak-loss-risk`). The design rule stands; the reason changes.
- **Forgiving streaks only:** opt-in, streak freezes/grace days, cumulative-not-consecutive counts, "you did 3 of 5 — great job!" framing, and *never* "Streak broken: 0 days" or a sick/dying/guilt-tripping pet (`30` §3.1; `40` §11).
- **Curated autonomy:** the child picks rewards, names/customizes the companion, and chooses task order — 3–6 picture-based options, never open catalogs (choice overload) (`40` §9; `30` §2.6). Maps to Self-Determination Theory's autonomy/competence/relatedness needs (fact-check `gamification-sdt`: use SDT as the design backbone, but **do not strip extrinsic rewards** — immediate reinforcement is evidence-based for ADHD even though SDT warns it can backfire in general populations).
- **A "calm mode" / non-gamified path**, because a vocal neurodivergent segment rejects ABA-style reward/punishment framing outright (`30` §3.6).

---

## 3. Monetization reality

**The proven winner is a direct-to-consumer freemium subscription in the ~$80–$130/yr band, with a 7-day trial, HSA/FSA eligibility, and a genuinely usable free tier.** This is what Joon ($13/mo, ~$80/yr), Otsimo, and Habitica run, and it is the model the entire corpus endorses (`11` §13).

| Model | Evidence | Verdict for Tiny Bubbles |
|---|---|---|
| **D2C freemium subscription (~$80–130/yr)** | Joon's working model; sweet spot identified across kids' apps | **Adopt.** Primary model. |
| **Subscription + hardware** (Mightier sensor, Goally tablet) | Higher trust/stickiness, lower scale, higher CAC/COGS | Defer. Optional premium tier later, not MVP. |
| **HSA/FSA eligibility** | Lets families pay pre-tax (Mightier, EndeavorRx use it) | **Pursue early** once a health-positioning narrative exists. |
| **Prescription / payer-reimbursed (PDT)** | EndeavorRx + Pear both clinically validated and commercially fatal | **Avoid as primary model.** The clearest cautionary tale in the data. |
| **Free / ad-free / unmonetized** | ChoreMonster died; OurHome has no revenue | Unsustainable. |
| **High-price coaching sub ($40–48/mo)** | Inflow monetizes per-user but has the worst churn + "scam" backlash | Avoid the price point and the reading-heavy format. |

**Pricing must be designed to defuse churn, because the population is abandonment-prone and the category is full of dark patterns.** Concretely (`10` §4–5; `30` §3.3):

- A **free tier that actually works** (Finch's fully-functional free version is repeatedly praised). Trust is a feature in a low-trust category.
- **No-card or transparent trials, honest trial-end reminders, one-tap cancellation.** "Charged after I canceled" is the single most trust-destroying complaint in the whole corpus.
- **A hardship / pay-what-you-can option** (Focus Bear, Joon scholarships) — removes price as a churn excuse for a population with income variability.
- **Annual plans reduce churn materially** (Endel ~75% annual mix), so price the annual plan to be the obvious choice.

**Revenue honesty:** indie single-purpose ADHD apps have small ceilings (Llama Life ~$51k ARR). The kids' subscription model with a parent payer and HSA/FSA is a meaningfully larger opportunity than adult indie tools, but it lives or dies on **retention past week 8**, which is also the product problem. Monetization and retention are the same problem.

---

## 4. The must-AVOID pitfalls

These come from the convergence of the community stream, the UX/ethics stream, and the FTC regulatory reality. Violating any one of them is documented to kill kids' ADHD apps.

1. **Shame / streak-loss / loss-aversion mechanics.** Never show "Streak broken: 0." No dying/sick/guilt-tripping pet. No "Duo misses you"-style guilt notifications. For a child with developing emotion regulation, loss aversion is manipulation, and for ADHD/RSD users it triggers all-or-nothing collapse and total abandonment (`30` §3.1; `40` §11). Use guilt-free, forgiving progress only.
2. **Overwhelm — cluttered UI and heavy onboarding.** Habitica loses users *during onboarding* ("I gave up"); the core irony is that reading-heavy, multi-step setup defeats the exact ADHD user (parent or child) it targets (`30` §3.5; `10` §5). Rules: 2–3-tap parent setup, progressive disclosure, one step on screen at a time, ~2cm touch targets, calm default canvas with stimulating moments only at celebration (`40` §6).
3. **Nagging / notification floods.** ADHD users overwhelmingly mute or delete apps that bombard them; reminders become anxiety-inducing noise ("that fuckass bird keeps begging me to exercise") (`30` §3.4). Rules: few, tunable, point-of-performance prompts tied to the child's own schedule; never guilt-toned; respect quiet hours (school/sleep).
4. **Paywalls and billing dark patterns.** Steep prices, surprise auto-renewals, and hard-to-cancel subscriptions are the top churn/"scam" drivers (`10` §5; `30` §3.3). Also a live FTC enforcement risk for children's products (Epic/Fortnite >$500M settlement; FTC dark-pattern + COPPA escalation) (`40` §11).
5. **Rigid ABA-only compliance framing with no calm/intrinsic mode.** A real neurodivergent-community backlash exists against "forced compliance with rewards and punishments"; some kids reject gamification entirely (`30` §3.6). Offer autonomy and a non-gamified path.
6. **Over-promising clinical outcomes.** EndeavorRx's RCT *failed* on parent/clinician-rated symptoms despite hitting its objective-attention endpoint; token economies and parent training have weak/non-significant effects on *core* symptoms under blinding (fact-check `digital-therapeutic-endeavorrx`, `token-economy`, `parent-training`). Market improved routines, parent-child relationship, on-task behavior, and reduced disruptive behavior — **never** "treats/cures ADHD" or "fixes the internal clock."
7. **Gameable / burdensome verification.** Kids swipe-complete without doing the task (Brili); parent approval becomes its own management burden; tiny un-zoomable verify photos (Joon) (`30` §3.7). Make verification light, optional, and quick-to-undo.

---

## 5. Preliminary recommendation: platform + base repo

### Platform: React Native + Expo

Rationale (`50-repo-fit-analysis.md` §1):

- **It is the only platform where a working companion-character system already exists** in the cloned repos. A nurtured mascot is the single biggest engagement differentiator (§2 above) and is a declared gap in every other repo. Building it from scratch elsewhere is the most expensive missing piece.
- **One codebase → iOS + Android, phones + tablets.** Kids' apps live on both, and Joon's lack of an Android parent app is a documented complaint (`30` §2.9).
- **Multisensory feedback is already wired:** `expo-haptics`, `expo-av`, `expo-sensors`, `expo-notifications`, Reanimated — exactly the "polished and engaging" levers for kids.
- **Offline-first / no backend / no accounts by default** (AsyncStorage) — the right privacy posture for a children's product.

*Fallback:* if iOS is explicitly out of scope and the team is Kotlin-native, `ilseon` (Android/Compose) is nearly feature-complete for ADHD — but it has no mascot and forfeits iOS.

### Base repo: `lockin` (byadhddev/lockin26) — MIT

- Expo SDK 54, expo-router v6, NativeWind v4, RN 0.81.5 / React 19. **MIT LICENSE present and verified** (©2025 adhd.dev).
- Ships the reactive companion sprites, focus-timer lifecycle with background handling, local notifications, milestone/task breakdown UI, onboarding, and progress widgets.

**Primary UI donor:** `habit-tracker-app` (takanome-dev) — MIT, verified — Ignite component kit, emoji/color pickers, progress rings, charts, settings screen.

**Logic donors (port the algorithm, reskin):** `tether` (gamification engine, plain TS, MIT), `momentum` (timezone-aware streak math + mood selector + "add a step" UX, MIT), `sidejot` (AI task-chunking prompt — keep AI **off by default**).

### License cautions (critical)

- **`adhd-india` has NO license** (all-rights-reserved). **Reference only — do NOT ship its code.** Use only as concept inspiration (the scheduler decision-layer pattern, the SOUL persona concept).
- **`adhd-focus-mate`** declares MIT in README but has **no LICENSE file** (API reports `license: null`). Treat as unverified; confirm with the author before shipping any code. (Also a macOS screen-surveillance app — wrong fit for kids anyway.)
- All other recommended donors (`lockin`, `habit-tracker-app`, `tether`, `momentum`, `ilseon`, `medtimer`, `dose-android`, `minimoods`, `mymoodz`, `trakit`, `focustide`, `pomotroid`) carry verified MIT LICENSE files. Transitive Apache-2.0 libs (DGCharts in `mymoodz`, konfetti/MPAndroidChart in `minimoods`) are permissive — attribute, no copyleft detected.

### Mandatory rework before shipping `lockin` to kids

This is non-negotiable and flagged in repo-fit §4:

1. **Tone reversal.** `lockin` is built on a **shame/"mockery" accountability mechanic** — sprites get angry (`isAngry`, angry-jump in `ExecutionSprite.tsx`) and its AI is a "ruthless advisor." Every negative reaction must become positive reinforcement. This directly contradicts pitfall #1 and must be fully removed.
2. **Goal model.** `lockin`'s "one immutable goal per year, app won't let you change it" rigidity is inappropriate for kids — replace with flexible, short-horizon tasks.
3. **Art + copy + palette.** Redraw sprites as a friendly "bubble buddy"; replace adult motivational copy; brighten the dark "swiss-red" theme to a bright, playful kids palette.
4. **SDK alignment.** `habit-tracker-app` is SDK 50 / RN 0.73 vs `lockin`'s SDK 54 / RN 0.81 — lift its components/screens, not its app shell; re-verify picker libs.
5. **Keep AI off by default** for privacy/safety; drop all surveillance pipelines (`adhd-focus-mate` screenshots, `tether` window/activity monitors).

---

## 6. Key risks

1. **Retention / the 4–8 week novelty cliff (highest).** The category's defining failure; it is simultaneously the churn driver and the thing that makes the subscription feel worth it. If we don't ship a content-refresh pipeline and appointment mechanics in the MVP, we rebuild Joon's biggest weakness. *Mitigation:* novelty pipeline + varied content + companion depth from day one; optimize for "done & gone," which keeps parents subscribed.
2. **Emotional-harm / dark-pattern risk.** The same mechanics that engage (streaks, loss aversion, companion guilt, variable rewards) are exactly what harm ADHD kids and what the FTC is enforcing against for children. The `lockin` base ships shame mechanics that MUST be removed. *Mitigation:* the §4 avoid-list as hard design constraints; a child-safety/ethics review gate before launch.
3. **Parent-dependency breaks the loop.** Joon's loop collapses when the parent disengages from verification, and the parent likely has ADHD too. *Mitigation:* lighter approval UX, smart defaults, low-friction/optional verification, and reduced parent admin burden as an explicit design goal.
4. **Over-claiming clinical efficacy.** Tempting for marketing and dangerous: the strongest precedent (EndeavorRx) failed on symptom ratings; blinded evidence for token economies/parent training is on behavior and parenting, not core symptoms. *Mitigation:* market function/behavior/relationship outcomes only; if pursuing a study, pair it with a consumer-pay model, never payer dependence.
5. **Science is moderate with high variability.** Effects are g≈0.3–0.5, not transformative, and mask sex/individual differences. The app will not work uniformly for every child. *Mitigation:* honest expectation-setting in onboarding and marketing; a calm/non-gamified mode for kids who reject the reward loop.
6. **Crowded, zombie-filled category.** 2,800+ ADHD apps launched in 2023; differentiation and retention, not acquisition, decide survival. *Mitigation:* compete on the specific Joon gaps (retention, parent burden, screen-time guardrails, aging-up), not on being "another ADHD chore app."
7. **Codebase tone/architecture debt.** `lockin` carries adult, shame-based, rigid-goal assumptions throughout; retoning is real work and easy to do incompletely. *Mitigation:* treat tone reversal as a tracked, reviewed workstream, not a find-and-replace.

---

## 7. One-paragraph recommendation

Build **Tiny Bubbles as a React Native + Expo app on the MIT-licensed `lockin` base**, assembling the companion sprites (`lockin`), the gamification engine (`tether`, ported to AsyncStorage), streak math + mood + "add-a-step" UX (`momentum`), and a polished component kit + pickers + charts (`habit-tracker-app`). Ship the **evidence-based core loop**: a parent assigns small concrete tasks (PTBM), the child runs a picture/audio-first, one-step-at-a-time routine, and every completion fires an immediate multisensory celebration plus a token that nurtures a never-punishing companion and is redeemable for caregiver-set real-world rewards (token economy + delay-discounting science). Reinforce densely at first, then thin the schedule. Monetize via a **D2C freemium subscription (~$80–130/yr, 7-day trial, HSA/FSA, real free tier, hardship option)** — never a prescription model. Win on the things Joon gets wrong: **beat the novelty cliff, cut the parent burden, add screen-time guardrails, and age up gracefully.** Above all, **refuse the shame/streak-loss/nagging/paywall dark patterns** — including the ones baked into the `lockin` base, which must be retoned before launch — and never market core-symptom treatment.
