# Autism Science — Evidence-Based Features for Autistic Kids

**Stream:** AUTISM SCIENCE (Tiny Bubbles v2)
**Prepared:** 2026-07-09
**Scope:** Peer-reviewed / guideline-grade evidence for autism supports that are buildable into the **Kid app** (Expo/RN/TS) on the locked v2 stack (Firebase + Cloud Functions + super-guardrailed "Bloop" LLM companion). Every non-obvious claim is cited with author(s), year, journal, and a URL/DOI/PMID. Evidence strength is rated honestly; weak/marketing claims are flagged.

Companion to the v1 ADHD research in `../research/` (esp. `20-science-engagement.md`, `01-feature-matrix.md`) and the v1 spec in `../spec/`. Several autism supports **overlap** with features already specced for ADHD (visual timers, first-then / if-then plans, mood check-in, breathing/regulation, calm UI); this doc marks those and adds the autism-specific layer.

> **How to read evidence-strength labels** (same scale as the ADHD stream)
> - **strong** = converging RCTs and/or meta-analyses, replicated, on an official evidence-based-practice (EBP) list.
> - **moderate** = multiple controlled studies or a meta-analysis with caveats (single-subject designs, heterogeneity, modest/variable effects, generalization concerns).
> - **emerging** = early RCTs / single-case proof-of-concept; promising but not settled.
> - **weak** = widely used in practice but controlled evidence thin, null, or absent; do NOT market as proven.

> **Two honesty rules carried over from v1 (and reinforced here):**
> 1. **These supports are scaffolds, not cures.** They improve communication, participation, predictability and regulation; none "treats autism." Market accommodation and skill support, never remediation of core autism.
> 2. **Build neurodiversity-affirming, not compliance-driven.** Much of the autism intervention literature is behavioral (ABA-rooted) and outcome-measured on "compliance"/"reducing behaviors." Autistic self-advocates and a growing clinical consensus warn against tools that suppress harmless behaviors (e.g., stimming), enforce eye contact, or coerce. We adopt the *supports* (communication, predictability, regulation, choice) and explicitly reject the coercive framing. See §11.

---

## 0. The anchor: the NCAEP/NPDC list of 28 evidence-based practices

The single most authoritative synthesis for autism intervention in children/youth is the National Clearinghouse on Autism Evidence and Practice (NCAEP) review, which screened **31,779 abstracts** and included **972 studies** (published 1990–2017) of learners **birth–22**, identifying **28 focused evidence-based practices (EBPs)**.

- Report: **Steinbrenner, J. R., Hume, K., Odom, S. L., Morin, K. L., Nowell, S. W., Tomaszewski, B., Szendrey, S., McIntyre, N. S., Yücesoy-Özkan, S., & Savage, M. N. (2020).** *Evidence-Based Practices for Children, Youth, and Young Adults with Autism.* UNC Chapel Hill, Frank Porter Graham Child Development Institute, NCAEP. https://ncaep.fpg.unc.edu/wp-content/uploads/EBP-Report-2020.pdf
- Peer-reviewed version: **Hume, K., Steinbrenner, J. R., Odom, S. L., et al. (2021).** *Evidence-Based Practices for Children, Youth, and Young Adults with Autism: Third Generation Review.* **Journal of Autism and Developmental Disorders, 51, 4013–4032.** https://doi.org/10.1007/s10803-020-04844-2

The 28 EBPs (abbreviations as used in the report): Antecedent-Based Intervention (ABI); Augmentative & Alternative Communication (**AAC**); Behavioral Momentum Intervention (BMI); Cognitive Behavioral/Instructional Strategies (CBIS); Differential Reinforcement (DR); Direct Instruction (DI); Discrete Trial Training (DTT); Exercise & Movement (EXM); Extinction (EXT); Functional Behavioral Assessment (FBA); Functional Communication Training (FCT); Modeling (MD); Music-Mediated Intervention (MMI); Naturalistic Intervention (NI); Parent-Implemented Intervention (PII); Peer-Based Instruction & Intervention (PBII); Prompting (PP); Reinforcement (R); Response Interruption/Redirection (RIR); Self-Management (SM); **Sensory Integration (SI)**; **Social Narratives (SN)** [the category that includes Social Stories]; Social Skills Training (SST); Task Analysis (TA); Technology-Aided Instruction & Intervention (TAII); Time Delay (TD); **Video Modeling (VM)**; **Visual Supports (VS)** [the category that includes visual schedules, first-then boards].

**Why this matters for us:** almost every feature this stream recommends maps onto a *named EBP on this list* — AAC, Visual Supports (schedules, first-then), Social Narratives, Video Modeling, Sensory Integration, Reinforcement, Antecedent-Based Intervention, Technology-Aided Instruction. That is the strongest possible provenance argument for the Kid app's autism module. Two popular things we investigated are **NOT** on the list and must be treated as weak: **TEACCH** (a comprehensive program, evaluated separately — §2) and **Zones of Regulation** (a branded curriculum — §6).

Note the critique literature (e.g., **Leaf, J. B., et al. (2021).** *The evidence-based practices for children, youth, and young adults with autism report: Concerns and critiques.* **Behavioral Interventions, 37(2).** https://doi.org/10.1002/bin.1771) — the list is a useful floor, not gospel; single-case designs dominate and inflate apparent certainty.

---

## 1. AAC / PECS — picture-based & device communication

**Claim.** For the ~25–35% of autistic children who are minimally or non-speaking, augmentative and alternative communication (AAC) — picture exchange, symbol boards, and speech-generating devices/apps (SGDs) — increases functional communication (especially requesting/"manding") and does **not** suppress speech.

**Evidence.**
- **AAC as a whole is now a named EBP.** Newly classified as evidence-based in the NCAEP 2020 / Hume 2021 review (Steinbrenner et al. 2020; Hume et al. 2021, above). Aided AAC spans low-tech (object/picture exchange, letter boards) to high-tech SGDs and tablet apps. **Strength: strong (as a category).**
- **PECS specifically — Picture Exchange Communication System** (Bondy & Frost's 6-phase protocol). Meta-analysis: **Flippin, M., Reszka, S., & Watson, L. R. (2010).** *Effectiveness of the Picture Exchange Communication System (PECS) on communication and speech for children with autism spectrum disorders: A meta-analysis.* **American Journal of Speech-Language Pathology, 19(2), 178–195.** https://doi.org/10.1044/1058-0360(2010/09-0022) (PMID 20181849). Eight single-subject experiments (18 participants) + 3 group studies; ages 1–11. **Small-to-moderate gains in communication; small-to-negative gains in speech**; PECS judged "promising but not yet established," with **maintenance and generalization flagged as weak points.** **Strength: moderate.**
- **Group RCT** (teacher-implemented): **Howlin, P., Gordon, R. K., Pasco, G., Wade, A., & Charman, T. (2007).** *The effectiveness of PECS training for teachers of children with autism: a pragmatic, group randomised controlled trial.* **Journal of Child Psychology and Psychiatry, 48(5), 473–481.** (PMID 17501728) — increased initiations/PECS use in the classroom, but **gains did not clearly generalize or persist after the intervention/consultancy ended.**
- **Newer, larger evidence base (China RCTs).** A 2025 systematic review/meta-analysis of **37 RCTs, N≈2,343** reported a significant overall effect of PECS on communication and collateral outcomes (social skills, some cognitive) — but **still no significant effect on spoken-language development** (ScienceDirect S0891422225002744, *Research in Developmental Disabilities*, 2025). https://www.sciencedirect.com/science/article/abs/pii/S0891422225002744 . **Strength: moderate-and-rising for communication; consistently null for speech.**
- Association for Science in Autism Treatment (ASAT) synopses corroborate the "communication yes, speech questionable, watch generalization" pattern. https://asatonline.org/for-parents/learn-more-about-specific-treatments/augmentative-communication/

**Key design facts.** (a) AAC does **not** inhibit natural speech — a critical myth to counter in-product for parents. (b) Requesting/"mands" dominate the evidence; **commenting and other communicative functions are under-supported** — build beyond "I want." (c) The bottleneck is **generalization** across people/settings — an app that lives on the child's own device, always available, partly addresses this. (d) Core-vocabulary boards + symbol consistency + modeling ("aided language input") are best practice (ASHA practice portal). https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/

**Build implication.** An in-app **AAC / communication board** is the highest-value autism-specific feature: picture+symbol tiles → tap → TTS speaks it; category folders; a small **core-vocabulary** set (want, help, more, stop, done, yes/no, feelings) plus customizable personal tiles (photos of family, favorite foods). Must work **offline** and be reachable in **≤1 tap from anywhere**. This is the load-bearing accessibility feature that makes the whole app usable by non-speaking kids.

---

## 2. TEACCH / structured teaching

**Claim.** TEACCH ("Treatment and Education of Autistic and related Communication-handicapped CHildren") organizes the environment around the "culture of autism" — visual over auditory information, physical structure, work systems, and visual schedules to make expectations concrete and predictable.

**Evidence.**
- **Meta-analysis: Virués-Ortega, J., Julio, F. M., & Pastor-Barriuso, R. (2013).** *The TEACCH program for children and adults with autism: A meta-analysis of intervention studies.* **Clinical Psychology Review, 33(8), 940–953.** https://doi.org/10.1016/j.cpr.2013.07.005 — across 13 studies: **small effects on perceptual, motor, verbal and cognitive skills; small/negligible on communication, ADLs and motor functioning; larger (but needing replication) gains in social behavior and reducing maladaptive behavior.** **Strength: moderate, uneven.**
- **TEACCH is NOT on the NCAEP EBP list** because it is a comprehensive treatment model, not a focused practice — but its *components* (visual supports, structured work systems, antecedent structure) map directly onto listed EBPs (VS, ABI). Recent syntheses (e.g., *Translational Pediatrics* 2025 review; ASAT synopsis https://asatonline.org/research-treatment/research-synopses/teacch/) reach the same "promising, mixed, component-driven" conclusion.

**Build implication.** Don't build "TEACCH" as a brand; **borrow its component that has independent evidence** — physical/visual structure and *work systems*: what work, how much, when it's finished, what's next. This is the conceptual parent of the visual-schedule + first-then + "all done" features below. The design principle "make the invisible (time, sequence, expectations, completion) visible" is the durable takeaway.

---

## 3. Visual schedules + predictability

**Claim.** Visual schedules (a sequence of picture/photo/icon steps for a routine or a day) increase independent transitioning and task completion and reduce anxiety/challenging behavior by making sequence and expectations concrete and predictable.

**Evidence.**
- **Visual Supports (which includes visual schedules and first-then boards) is a named NCAEP EBP** (Steinbrenner et al. 2020; Hume et al. 2021). **Strength: strong (category).**
- **Systematic review: Knight, V., Sartini, E., & Spriggs, A. D. (2015).** *Evaluating visual activity schedules as evidence-based practice for individuals with autism spectrum disorders.* **Journal of Autism and Developmental Disorders, 45(1), 157–178.** https://doi.org/10.1007/s10803-014-2201-z — reviewed 1993–2013; concluded **visual activity schedules meet criteria for an EBP**, particularly when paired with systematic instruction (prompting, reinforcement). **Strength: strong.**
- **Honest caveat.** A 2025 component analysis (**Mouzakes et al., 2025, *Behavioral Interventions*** https://doi.org/10.1002/bin.70028) found **insufficient evidence that the visual-schedule component *alone*** drives improved transitions — schedules are almost always delivered *with* prompting/reinforcement/other components. So: a schedule is a scaffold, not a standalone treatment; pair it with cueing and reinforcement.
- **Why predictability itself matters (mechanism):** **Intolerance of uncertainty (IU)** is elevated in autism and is a strong correlate of anxiety. Meta-analysis: **Jenkinson, R., Milne, E., & Thompson, A. (2020).** *The relationship between intolerance of uncertainty and anxiety in autism: A systematic literature review and meta-analysis.* **Autism, 24(8), 1933–1944.** https://doi.org/10.1177/1362361320932437 — 10 studies, N=562, pooled **r = 0.62** (IU explains ~38% of anxiety variance). Insistence-on-sameness/routines is theorized as a coping strategy to reduce uncertainty (Rodgers and colleagues; South & Rodgers). **This is the scientific backbone for "predictability" as a product value:** making the next step visible directly reduces the uncertainty that drives anxiety and meltdowns. **Strength: strong (correlational mechanism).**

**Build implication.** A **visual schedule builder** (parent composes a routine from picture/photo/TTS steps; kid sees the day/routine as a strip, checks steps off, and **always sees "what's now / what's next"**). Predictability features: a persistent "next up" card, no surprise reordering, optional "surprise/change" symbol to teach flexibility gently. This overlaps heavily with the ADHD "one step at a time" task view already specced — **the same engine serves both; autism adds full-day/routine sequencing and the always-visible "next."**

---

## 4. First-then / contingency (Premack, behavioral momentum)

**Claim.** A "first X, then Y" visual contingency (do the less-preferred task, then the preferred one) increases task initiation/compliance and reduces avoidance by making the contingency explicit and the payoff predictable.

**Evidence.**
- **Premack principle** (Premack, 1959, *Science*): a high-probability behavior reinforces a low-probability one. Operationalized visually as the **First-Then board** — a two-cell strip. It sits under **Antecedent-Based Intervention** and **Visual Supports** (both NCAEP EBPs) and **Reinforcement** (EBP). **Strength: strong (as a behavioral principle + component of EBPs).**
- **Behavioral Momentum Intervention (BMI)** — the high-probability ("high-p") request sequence: run 2–3 easy, likely-compliance requests immediately before a hard one to build "momentum." **BMI is a named NCAEP EBP.** Evidence is real but effect durability/practical value is debated (e.g., analyses questioning how "low-effort" high-p sequences truly are — ERIC EJ1248317). **Strength: moderate.**
- Predictability of the contingency reduces anxiety-driven avoidance (ties to §3's IU mechanism). Practice sources (ABA) consistently describe first-then as removing ambiguity about "what's expected and what's coming."

**Build implication.** A **First-Then card** (two picture cells: the required step + the chosen reward/next-preferred activity, both with TTS). This is essentially the ADHD **if-then / implementation-intentions** feature (`../spec/features/if-then-plans.md`) re-skinned for younger/non-reading autistic kids as a purely *visual* first-then. **Overlap: high — one component, two framings.** Let the kid *choose* the "then" from a curated set (autonomy; see §11).

---

## 5. Social Stories (Carol Gray)

**Claim.** A Social Story™ is a short, first-person, individualized narrative (following Gray's 10 criteria and descriptive/perspective/directive sentence ratios) that describes a social situation, expectations, and others' perspectives to build understanding before the situation occurs.

**Evidence.**
- **Social Narratives is a named NCAEP EBP** — but "Social Stories" specifically is weaker than its popularity suggests. **Strength (Social Narratives category): strong. Strength (Social Stories as branded/fidelity-checked): weak-to-moderate, mixed.**
- **Systematic review: Qi, C. H., Barton, E. E., Collier, M., Lin, Y.-L., & Montoya, C. (2018).** *A systematic review of effects of Social Stories interventions for individuals with autism spectrum disorder.* **Focus on Autism and Other Developmental Disabilities, 33(1), 25–34.** https://doi.org/10.1177/1088357615613516 — of ~22 studies, **only ~7 showed strong effects; ~12 showed ineffective/negligible effects; results were mixed and often confounded with other components.** Many studies did not verify Gray's criteria. **Strength: mixed.**
- **RCT-track evidence is thin.** The UK ASSSIST feasibility work (**Wright, B., Marshall, D., Adamson, J., et al. (2016).** *Social Stories™ to alleviate challenging behaviour... a feasibility study for a cluster RCT.* **Health Technology Assessment, 20(6).** https://www.ncbi.nlm.nih.gov/books/NBK338473/ ) established feasibility but not definitive efficacy.
- ASAT: present Social Stories as having **limited scientific support** and pair with better-supported procedures. https://asatonline.org/for-parents/learn-more-about-specific-treatments/social-stories/

**Build implication.** Build **social narratives** (the EBP category), not "Social Stories™" as a claim. A **story builder** (parent/child assembles a short first-person, picture-supported narrative for a specific situation: haircut, dentist, new sibling, fire drill, going to the park) with TTS. Effective *because* it pre-loads predictability (§3). Keep templates neurodiversity-affirming (describe/prepare, don't dictate "correct" social behavior or mask). Position as a **preparation/predictability tool**, and be honest in copy that evidence is mixed. This is a natural, **safe use for the Bloop LLM** (draft a personalized narrative from parent-provided facts — with parent review before the child sees it; see §12).

---

## 6. Zones of Regulation + emotion identification

**Claim.** A color-coded framework (Blue = low/sad/tired, Green = calm/ready, Yellow = heightened/anxious/silly, Red = intense/anger/panic) that teaches children to *identify* their emotional/arousal state and *select* a regulation strategy.

**Evidence.**
- **Emotion identification/labeling and emotion-regulation skill instruction are well-supported.** A systematic review of interventions for emotion dysregulation & challenging behavior in autism graded **Emotion Regulation Training, Reinforcement, Visual Supports, Cognitive-Behavioral strategies, Antecedent-Based Interventions and Parent-Implemented Intervention as top-tier (RCTs, low bias)**: **Nuske, H. J., Young, A. V., Khan, F., et al. (2023).** *Systematic Review: Emotion Dysregulation and Challenging Behavior Interventions for Children and Adolescents with Autism, with Graded Key Evidence-Based Strategy Recommendations.* (preprint / *JAACAP* line) https://pmc.ncbi.nlm.nih.gov/articles/PMC10153364/ . **Strength (emotion-ID + ER training generally): strong.**
- **BUT the branded "Zones of Regulation" curriculum is NOT evidence-based.** **Mason, B. K., Leaf, J. B., & Gerhardt, P. F. (2024).** *A Research Review of the Zones of Regulation Program.* **The Journal of Special Education, 57(4), 219–229.** https://doi.org/10.1177/00224669231170202 — only **3 studies met inclusion; 5 of 6 had moderate-to-high bias risk; some found no improvement or even increased challenging behavior.** Conclusion: **"cannot be categorized as an evidence-based practice at this time."** The vendor's own site concedes independent peer-reviewed efficacy trials are lacking. **Strength (Zones brand): weak.**

**Build implication.** Build the **mechanism** (identify emotion/arousal → pick a coping strategy) which is well-supported, **without licensing or over-claiming the Zones brand.** A neutral **"how do I feel?" check-in** (a small emotion/arousal grid — this *already exists* as the ADHD mood check-in, `../spec/features/mood-checkin.md`) plus a **feelings vocabulary** (pictures + words + TTS + intensity) and a **"what could help?" strategy menu** (breathe, ask for a break, get a fidget, drink water, tell an adult). Optional 4-color arousal framing is fine as *one visual option* but **do not market efficacy or use the ™ curriculum**. Overlap with ADHD mood check-in: high — extend it with an emotion-vocabulary/identification layer and a strategy-menu link into sensory/breathing tools.

---

## 7. Sensory regulation / breaks

**Claim.** Many autistic children have atypical sensory processing (hyper-/hypo-reactivity, sensory seeking). Providing sensory-regulation tools and movement/sensory breaks supports arousal regulation, on-task behavior, and reduces distress/stereotypy.

**Evidence — two threads, rated separately:**
- **Ayres Sensory Integration® (ASI, clinic OT with a certified therapist)** is now classified as an EBP (Sensory Integration on the NCAEP list) on the strength of **three group RCTs**: **Schaaf, R. C., Benevides, T., Mailloux, Z., et al. (2014).** *An intervention for sensory difficulties in children with autism: A randomized trial.* **Journal of Autism and Developmental Disorders, 44(7), 1493–1506.** https://doi.org/10.1007/s10803-013-1983-8 (gains in individualized daily-living/functional goals, not core symptoms); plus **Pfeiffer et al. (2011), *AJOT***, and **Kashefimehr et al. (2018)**. A 2025 comparative trial (Schaaf et al., *Autism Research*, https://doi.org/10.1002/aur.70099) continues this line. **Strength: moderate — but note: this is clinic-delivered, hands-on OT with specialized equipment, NOT something an app delivers.** Generic "sensory diets"/brushing protocols and unstructured "sensory-integration" products remain **weak/unproven**.
- **Movement/exercise breaks (antecedent physical activity)** have decent support for *short-term* reductions in stereotypy and increases in on-task behavior. Systematic review: **Fournier et al. / "Collateral Effects of Antecedent Exercise on Stereotypy..." (2022/2023), *Behavior Analysis in Practice*** https://doi.org/10.1007/s40617-022-00746-0 (3–15 min exercise → less stereotypy, more on-task across participants); meta-analysis **Tarr, C. W., Rineer-Hershey, A., & Larwin, K. (2020), *Focus on Autism and Other Developmental Disabilities***, https://doi.org/10.1177/1088357619881220 . **Exercise & Movement is a named NCAEP EBP.** Classic study: Rosenthal-Malek & Mitchell (jogging → ↓ stereotypy, ↑ on-task). **Strength: moderate.**

**Build implication.** The **app cannot deliver ASI therapy** — do not claim to. What the app *can* do, evidence-aligned: (a) a **"break" button reachable from anywhere** that offers regulation options (breathing — already specced; calm soundscape — already specced; a short guided movement/"wiggle" break; dimming/low-stim mode); (b) let the kid **request a break via the AAC board** (the single most therapeutically valuable use — turning a would-be meltdown into a communicative request); (c) a **sensory-preferences profile** (parent flags sound/haptics/brightness sensitivities → app respects them globally). Frame as *self-regulation support and choice*, not sensory-integration treatment.

---

## 8. Video modeling

**Claim.** Showing a short video of a model (peer, adult, the child themselves, or point-of-view) performing a target skill/routine, then having the child perform it, teaches social, communication, functional and daily-living skills — with good maintenance and generalization.

**Evidence.**
- **Video Modeling is a named NCAEP EBP.** **Strength: strong.**
- **Meta-analysis: Bellini, S., & Akullian, J. (2007).** *A Meta-Analysis of Video Modeling and Video Self-Modeling Interventions for Children and Adolescents with Autism Spectrum Disorders.* **Exceptional Children, 73(3), 264–287.** https://doi.org/10.1177/001440290707300301 — 23 single-subject studies; effects measured by percentage of non-overlapping data points (PND). **Intervention effects were strong (PND in the ~80% range), and effects were well maintained (~3 months) and generalized across people/settings** — leading the authors to conclude VM/VSM **meet criteria for an EBP.** (Caveat: PND from single-case designs overstates certainty vs. group RCTs — see the Leaf 2021 critique.) **Strength: strong-but-single-case.**
- Later meta-analyses (e.g., 2015/2018 reviews) replicate moderate-to-large effects across social-communication, functional, and vocational skills; point-of-view and video-self-modeling variants are effective.

**Build implication.** Support **routine/skill videos**: a step (in the visual schedule or AAC routine) can carry a short **model video** (parent can record the child or a family member doing "brush teeth," "put on shoes," "wash hands," "greet a friend"). Point-of-view recording (film over the child's shoulder) is a known-good, easy-to-produce variant. Low technical cost (camera + storage in Firebase); high evidence value; strong overlap with the ADHD "video of someone doing the task" ask that Goally users praised (v1 `30-community-asks.md`).

---

## 9. Reducing transitions / overwhelm

**Claim.** Transitions between activities are a top trigger for anxiety and challenging behavior in autism. Advance warnings + visual cues + timers make the *end* of one activity and the *start* of the next predictable, reducing problem behavior.

**Evidence.**
- **Classic study: Dettmer, S., Simpson, R. L., Myles, B. S., & Ganz, J. B. (2000).** *The use of visual supports to facilitate transitions of students with autism.* **Focus on Autism and Other Developmental Disabilities, 15(3), 163–169.** — visual cues + advance warning **reduced transition-related problem behavior** vs. verbal warnings alone. **Strength: moderate (foundational single-case).**
- Transition supports are an application of **Visual Supports + Antecedent-Based Intervention** (both EBPs) and are directly downstream of the **intolerance-of-uncertainty → anxiety** mechanism (Jenkinson et al. 2020, §3). Reviews of transition-related challenging behavior confirm visual schedules, timers, and priming reduce difficulty (e.g., IRCA/Indiana resources; Focus on Autism syntheses). **Visual timers** additionally address time-perception (see v1 `../spec/features/visual-timers.md`; robust for ADHD, also useful here as external time-structure).
- **Overwhelm/sensory-and-cognitive load:** autistic kids are more susceptible to overload; the neurodiversity-affirming design consensus (and v1 UX research §6) is a **calm, low-stimulation, uncluttered, one-thing-at-a-time UI** with predictable navigation.

**Build implication.** (a) **Transition warnings**: a "2 more minutes / almost done / next: ___" visual + optional gentle chime + a **visual countdown timer** (already specced) attached to each schedule step; (b) **priming**: show "what's next" before the current step ends; (c) a global **low-stim mode** (reduce animation, muted palette, no surprise sounds) and **respect the sensory-preferences profile** from §7; (d) never auto-advance abruptly — give the child a "ready" tap. Overlap with ADHD visual timers: high; autism adds the *advance-warning + priming* layer specifically for transition anxiety.

---

## 10. Where ADHD + autism supports OVERLAP vs. DIFFER

**Co-occurrence is the rule, not the exception.** DSM-5 (2013) first allowed a **dual diagnosis**. Roughly **50–70% of autistic people show clinically significant ADHD traits**, and ~15–50% of ADHD children show autistic traits; the combined presentation is typically **more impairing** than either alone (worse executive function, emotion regulation, and quality of life). See **Antshel, K. M., & Russo, N. (2019).** *Autism Spectrum Disorders and ADHD: Overlapping Phenomenology, Diagnostic Issues, and Treatment Considerations.* **Current Psychiatry Reports, 21, 34.** https://doi.org/10.1007/s11920-019-1020-5 ; and **"Unraveling the spectrum: overlap, distinctions, and nuances of ADHD and ASD in children" (2024), *Frontiers in Psychiatry*** https://doi.org/10.3389/fpsyt.2024.1387179 . **This means a single Kid app should serve BOTH, with a shared core and a switchable emphasis.**

**Shared mechanisms → shared features (build once, serve both):**
| Shared mechanism | Evidence | Shared feature |
|---|---|---|
| Executive-function / working-memory load; need to externalize | Both conditions share EF deficits (Antshel 2019; Frontiers 2024) | One-step-at-a-time task view; visual schedules; externalize time (visual timers) |
| Reward/motivation → immediate reinforcement | ADHD delay discounting (v1 §1); ASD responds to reinforcement (EBP) | Immediate reward at point-of-completion; token economy; forgiving progress |
| Emotion dysregulation | Prominent in both; worse when combined | Emotion check-in + ID; regulation/strategy menu; breathing |
| Transitions & time-blindness | ADHD time-perception deficit; ASD transition anxiety | Transition warnings, priming, visual countdown |
| First-then / contingency | Premack + reinforcement (both) | First-then / if-then card |

**Where they DIFFER → autism-specific additions (net-new for v2):**
| Need | Autism-specific | ADHD-only equivalent |
|---|---|---|
| **Communication** | **AAC / PECS board** for minimally-speaking kids (25–35% of autistic kids) — *core, non-negotiable* | Rarely needed |
| **Predictability / sameness** | Full-day visual schedule, "no surprises," social narratives to pre-load novel events; IU is the driver (Jenkinson 2020) | ADHD tolerates/*seeks* novelty; v1 even adds a **novelty-refresh** engine to fight boredom |
| **Sensory** | Sensory-preferences profile, sensory/movement breaks, low-stim mode as a *primary* need | Calm UI is nice-to-have, not a core sensory accommodation |
| **Skill acquisition** | Video modeling of routines; task analysis of self-care | Less central |
| **Social understanding** | Social narratives / emotion perspective | Less central |

**The important tension to design around:** **ADHD design wants novelty/variety/surprise to sustain engagement (v1 novelty-refresh, varied rewards); autism design wants predictability/sameness/no surprises.** These pull in opposite directions. Resolution: make **stimulation and novelty tunable**, and gate "surprises" behind a **sensory/predictability profile** the parent sets. Default the autism profile to *low novelty, high predictability, low stimulation, sound/haptics off, no auto-advance*; default the ADHD profile to *more variety, brighter, faster feedback*. One codebase, two default presets, per-child override.

**Medication note (context, not a build item):** stimulants help ADHD symptoms in co-occurring ASD+ADHD but with **lower response and more side effects** than in ADHD alone (**RUPP Autism Network (2005), *Archives of General Psychiatry, 62(11), 1266–1274*** — ~49% response vs. ~70–75% typical, higher dropout). Practical upshot for us: **behavioral/environmental scaffolds carry proportionally more weight in autism** — which is exactly what this app provides. Do not give medical advice.

---

## 11. Cross-cutting design constraints (neurodiversity-affirming, safety)

These apply to *every* feature above and to the Bloop LLM companion:

1. **Support, don't suppress.** Do not build features that punish stimming, enforce eye contact, or coerce "normal" social behavior. Frame social narratives/emotion tools as *understanding and self-advocacy*, not masking. (Autistic self-advocacy consensus; echoes v1's anti-shame/anti-dark-pattern stance, `../research/40-ux-engagement-patterns.md`.)
2. **Non-speaking-first accessibility.** Every screen must be operable without reading (picture + icon + color + **TTS**), because a large share of the autism target users are pre-literate or non-speaking. This is stricter than the ADHD spec's "non-reader support."
3. **Predictability by default** for the autism profile: no surprise sounds/animations, no auto-advancing, consistent navigation, "what's next" always visible.
4. **Sensory safety:** global toggles for sound, haptics, motion/animation, brightness/contrast; a low-stim theme; respect the per-child sensory profile everywhere (§7, §9).
5. **Choice/autonomy** (Self-Determination Theory carryover from v1 child-autonomy spec): let the child *choose* the "then," the reward, the break type, the companion — capped to a few curated options to avoid overload.
6. **Bloop LLM guardrails, autism-specific:** literal-language mode (avoid idioms/sarcasm that autistic kids may take literally), short predictable turns, no unexpected topic shifts, never coerce social behavior, always route distress/crisis to the parent per the locked escalation design. Social-narrative generation must be **parent-reviewed before the child sees it.**

---

## 12. Prioritized, buildable feature set for the KID app

Tiers: **MVP** = the autism module doesn't work without it · **v1** = fast follow · **later** = differentiators. "Overlap" = shares an engine with an already-specced ADHD feature (build once). Every feature names its EBP provenance.

### MVP — the autism core
| # | Feature | EBP / evidence provenance | Overlap w/ ADHD spec | Effort |
|---|---|---|---|---|
| A1 | **AAC communication board** — core-vocab tiles (want, more, help, stop, done, break, yes/no, feelings) + custom photo tiles; tap → TTS; category folders; **offline**; ≤1 tap from anywhere | AAC (NCAEP EBP; Flippin 2010; Howlin 2007 RCT) — *the* accessibility keystone | New (autism-specific) | High |
| A2 | **Visual schedule builder + player** — parent composes routine/day from picture/photo/TTS steps; kid sees strip, checks off, **"now / next" always visible** | Visual Supports (EBP); Knight 2015 review; IU→anxiety (Jenkinson 2020) | High — extends ADHD one-step task view | Med |
| A3 | **First-Then card** — 2 visual cells (required step → chosen preferred), TTS, kid picks the "then" | Antecedent-Based Intervention + Reinforcement (EBPs); Premack | High — re-skin of if-then-plans | Low–Med |
| A4 | **Transition warnings + priming** — "2 min / almost done / next: ___" visual + gentle chime + visual countdown attached per step; no abrupt auto-advance | Visual Supports + ABI; Dettmer 2000 | High — reuses visual-timers | Low–Med |
| A5 | **Sensory-preferences profile + global low-stim mode + break button** — toggles for sound/haptics/motion/brightness; "I need a break" reachable anywhere (also via AAC tile) | Sensory Integration/Exercise&Movement (EBPs, for the *break*, not therapy); Fournier 2022 | Med — extends calm-UI + soundscapes + breathing | Med |
| A6 | **Non-reading-first, predictable, calm UI** (picture+icon+color+TTS everywhere; consistent nav; autism default preset = low novelty/stim, no surprises) | Cross-cutting (§11); Visual Supports | Med — stricter version of ADHD calm UI | Med |

### v1 — fast follow
| # | Feature | EBP / evidence provenance | Notes | Effort |
|---|---|---|---|---|
| B1 | **Emotion identification + strategy menu** ("how do I feel?" grid → feelings vocab w/ intensity → "what could help?" → breathe/break/fidget/tell adult) | Emotion-Regulation Training (strong; Nuske 2023). Optional 4-color arousal visual — **do NOT license/claim Zones™** (Mason 2024 = weak) | Extends mood-checkin | Med |
| B2 | **Video modeling on steps** — attach a short model/point-of-view video (parent-recorded) to any schedule/routine step | Video Modeling (EBP; Bellini & Akullian 2007) | Camera + Firebase storage | Med |
| B3 | **Social narratives builder** — assemble a short first-person picture+TTS narrative for a specific upcoming situation; **Bloop can draft from parent facts, parent approves before child sees** | Social Narratives (EBP category; Social Stories evidence *mixed* — Qi 2018) | Safe LLM use w/ guardrails | Med |
| B4 | **Guided movement / "wiggle" break** (30–90s), selectable from the break menu | Exercise & Movement (EBP); Fournier 2022; Tarr 2020 | Extends A5 | Low–Med |

### later — differentiators
| # | Feature | Provenance | Effort |
|---|---|---|---|
| C1 | **AAC beyond requesting** — sentence-building, commenting/social tiles, word prediction, aided-language modeling prompts for parents | AAC evidence gap: commenting under-served (systematic reviews) | High |
| C2 | **Structured work-system view** (what work / how much / when done / what next) for independent task runs | TEACCH component (moderate; Virués-Ortega 2013) → maps to Visual Supports | Med |
| C3 | **"Change/surprise" flexibility teaching** — gentle, opt-in insertion of a surprise symbol to build tolerance for change | Predictability/IU literature; deliver cautiously | Med |
| C4 | **Parent AAC/vocabulary analytics** (which tiles the child uses, growth over time) surfaced in the Parent app | Generalization/data-based decision-making | Med |

### What NOT to build / NOT to claim
- **Don't** brand or license **Zones of Regulation™** or claim its efficacy (Mason 2024 — not an EBP). Build the generic, well-supported emotion-ID + strategy mechanism instead.
- **Don't** claim the app delivers **sensory-integration therapy** — ASI is clinic-based OT (Schaaf 2014); the app offers *self-regulation choices and breaks*, not treatment.
- **Don't** over-claim **Social Stories** — evidence is mixed (Qi 2018); position as a preparation/predictability aid.
- **Don't** promise **speech gains from AAC/PECS** — evidence is null there (Flippin 2010; 2025 meta); promise *communication access*, and reassure parents AAC does not inhibit speech.
- **Don't** market "treatment/cure" of autism, and **don't** build compliance/masking mechanics (§11).

---

## References (primary sources)

- Steinbrenner, J. R., Hume, K., Odom, S. L., et al. (2020). *Evidence-Based Practices for Children, Youth, and Young Adults with Autism.* NCAEP/FPG, UNC Chapel Hill. https://ncaep.fpg.unc.edu/wp-content/uploads/EBP-Report-2020.pdf
- Hume, K., Steinbrenner, J. R., Odom, S. L., et al. (2021). *Evidence-Based Practices for Children, Youth, and Young Adults with Autism: Third Generation Review.* J Autism Dev Disord, 51, 4013–4032. https://doi.org/10.1007/s10803-020-04844-2
- Leaf, J. B., et al. (2021). *The EBP for children, youth, and young adults with autism report: Concerns and critiques.* Behavioral Interventions, 37(2). https://doi.org/10.1002/bin.1771
- Flippin, M., Reszka, S., & Watson, L. R. (2010). *Effectiveness of PECS on communication and speech… A meta-analysis.* Am J Speech-Lang Pathol, 19(2), 178–195. https://doi.org/10.1044/1058-0360(2010/09-0022)
- Howlin, P., Gordon, R. K., Pasco, G., Wade, A., & Charman, T. (2007). *Effectiveness of PECS training for teachers… a pragmatic group RCT.* J Child Psychol Psychiatry, 48(5), 473–481. (PMID 17501728)
- Chinese PECS RCT meta-analysis (2025), Research in Developmental Disabilities. https://www.sciencedirect.com/science/article/abs/pii/S0891422225002744
- Virués-Ortega, J., Julio, F. M., & Pastor-Barriuso, R. (2013). *The TEACCH program… A meta-analysis.* Clinical Psychology Review, 33(8), 940–953. https://doi.org/10.1016/j.cpr.2013.07.005
- Knight, V., Sartini, E., & Spriggs, A. D. (2015). *Evaluating visual activity schedules as EBP for individuals with ASD.* J Autism Dev Disord, 45(1), 157–178. https://doi.org/10.1007/s10803-014-2201-z
- Mouzakes, K., et al. (2025). *A Closer Examination of the Visual Schedule Component…* Behavioral Interventions. https://doi.org/10.1002/bin.70028
- Jenkinson, R., Milne, E., & Thompson, A. (2020). *The relationship between intolerance of uncertainty and anxiety in autism… meta-analysis.* Autism, 24(8), 1933–1944. https://doi.org/10.1177/1362361320932437
- Qi, C. H., Barton, E. E., Collier, M., Lin, Y.-L., & Montoya, C. (2018). *A systematic review of effects of Social Stories interventions…* Focus Autism Other Dev Disabl, 33(1), 25–34. https://doi.org/10.1177/1088357615613516
- Wright, B., Marshall, D., Adamson, J., et al. (2016). *Social Stories™… feasibility study for a cluster RCT.* Health Technology Assessment, 20(6). https://www.ncbi.nlm.nih.gov/books/NBK338473/
- Mason, B. K., Leaf, J. B., & Gerhardt, P. F. (2024). *A Research Review of the Zones of Regulation Program.* The Journal of Special Education, 57(4), 219–229. https://doi.org/10.1177/00224669231170202
- Nuske, H. J., Young, A. V., Khan, F., et al. (2023). *Systematic Review: Emotion Dysregulation and Challenging Behavior Interventions for Children/Adolescents with Autism…* https://pmc.ncbi.nlm.nih.gov/articles/PMC10153364/
- Schaaf, R. C., Benevides, T., Mailloux, Z., et al. (2014). *An intervention for sensory difficulties in children with autism: A randomized trial.* J Autism Dev Disord, 44(7), 1493–1506. https://doi.org/10.1007/s10803-013-1983-8
- "Collateral Effects of Antecedent Exercise on Stereotypy… A Systematic Review" (2022), Behavior Analysis in Practice. https://doi.org/10.1007/s40617-022-00746-0
- Tarr, C. W., Rineer-Hershey, A., & Larwin, K. (2020). *The Effects of Physical Exercise on Stereotypic Behaviors in Autism: Small-n Meta-Analyses.* Focus Autism Other Dev Disabl. https://doi.org/10.1177/1088357619881220
- Bellini, S., & Akullian, J. (2007). *A Meta-Analysis of Video Modeling and Video Self-Modeling Interventions for Children and Adolescents with ASD.* Exceptional Children, 73(3), 264–287. https://doi.org/10.1177/001440290707300301
- Dettmer, S., Simpson, R. L., Myles, B. S., & Ganz, J. B. (2000). *The use of visual supports to facilitate transitions of students with autism.* Focus Autism Other Dev Disabl, 15(3), 163–169.
- Antshel, K. M., & Russo, N. (2019). *Autism Spectrum Disorders and ADHD: Overlapping Phenomenology, Diagnostic Issues, and Treatment Considerations.* Current Psychiatry Reports, 21, 34. https://doi.org/10.1007/s11920-019-1020-5
- "Unraveling the spectrum: overlap, distinctions, and nuances of ADHD and ASD in children" (2024). Frontiers in Psychiatry. https://doi.org/10.3389/fpsyt.2024.1387179
- RUPP Autism Network (2005). *Randomized, controlled, crossover trial of methylphenidate in pervasive developmental disorders with hyperactivity.* Archives of General Psychiatry, 62(11), 1266–1274.
- ASHA Practice Portal — AAC. https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/
- ASAT synopses (AAC, PECS, TEACCH, Social Stories, Zones, Sensory Integration). https://asatonline.org/
