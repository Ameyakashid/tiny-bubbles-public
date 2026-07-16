# Market Teardown — Leading ADHD + Autism Kids Apps (for Tiny Bubbles v2 / "Bloop")

**Prepared:** 2026-07-09
**Stream:** MARKET — competitive teardown + feature-gap / white-space analysis
**Context:** Tiny Bubbles v2 = **two apps (Kid + Parent)** on Firebase/GCP, with a super-guardrailed LLM companion ("Bloop", Gemini Flash / DeepSeek via a moderated server-side proxy) and an **evidence-based ADHD + AUTISM** support scope: AAC / communication boards, visual schedules, first-then, emotion / Zones-of-Regulation, social stories, sensory tools. Parents get login + monitoring.
**Relationship to v1 research:** v1 (`_build/research/`) covered the *ADHD reward-loop* category deeply (Joon, Mightier, EndeavorRx, Brili, Goally). This v2 teardown pivots to the **autism / AAC / visual-support / regulation** side that v1 under-covered, and adds the **AI-companion-for-kids** category — the two areas where v2's scope actually differs.

> ## TL;DR
> - **The category is fragmented into single-purpose silos.** AAC talkers, visual schedulers, regulation tools, social-story makers, and speech-therapy games are almost all separate apps. A family navigating autism + ADHD typically juggles **4–6 paid apps**. **No one ships the integrated bundle** (AAC + schedule + first-then + regulation + social stories + companion + parent monitoring). This is the single biggest white space.
> - **Premium AAC is an Apple-only, high-upfront-cost oligopoly.** Proloquo2Go, TouchChat, and LAMP Words for Life all sit around **$249–$300 one-time and iOS-only**. ([ezducate](https://www.ezducate.ai/lp/aac-app-comparison)) Android families collapse to a short list: **Avaz, Leeloo, CoughDrop, LetMeTalk**. Cross-platform + affordable is wide open.
> - **AAC itself is one of the best-evidenced supports in the whole category** — a 2024 meta-analysis found adding aided AAC to naturalistic intervention produced *very large* language gains (Tau-U 0.85) and, critically, **AAC does not suppress speech and may increase it**. ([Pope, Light & Laubscher 2024, J Autism Dev Disord, DOI 10.1007/s10803-024-06382-7](https://doi.org/10.1007/s10803-024-06382-7))
> - **Visual activity schedules and first-then are established EBPs**; **social stories are the weakest link** (mixed-to-null in recent umbrella reviews) and must be positioned carefully.
> - **The AI-companion-for-kids space is a graveyard and a minefield.** The purpose-built option (**Moxie / Embodied**) abruptly **shut down in Dec 2024, bricking $799 robots** marketed to autistic kids. ([Axios](https://www.axios.com/2024/12/10/moxie-kids-robot-shuts-down)) The general-purpose options (Character.AI, Replika) are actively dangerous for minors — **Common Sense Media says under-18s should avoid AI companions entirely**, and ~1/3 of tested chatbots endorsed harmful scenarios. ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/)) **There is no safe, guardrailed, parent-visible companion for kids on the market. That is exactly Bloop's opening.**
> - **Almost none of these apps has a product-specific RCT.** Clinical credibility is borrowed from the underlying *practice* (AAC, visual supports, token economy), not the app. A single modest study + consumer-pay (never Rx) is a durable differentiator (see the EndeavorRx cautionary tale in v1).

---

## How to read each teardown
For every app: **(1) target need** (ADHD / autism / both), **(2) core features**, **(3) what the kid actually does**, **(4) pricing & model**, **(5) clinical / evidence backing**, **(6) parent praise & complaints**.

Apps are grouped by function: **A. AAC / communication**, **B. Visual schedules / routines / regulation**, **C. Speech & learning games**, **D. AI companions**.

---

# A. AAC / Communication apps (primarily AUTISM / non-speaking)

## A1. Proloquo2Go (AssistiveWare) — the category standard

- **Target need:** **Autism-first**, plus Down syndrome, cerebral palsy, Angelman, apraxia — anyone non/minimally-speaking. Not an ADHD tool. ([AssistiveWare](https://www.assistiveware.com/products/proloquo2go))
- **Core features:** Symbol-based AAC with the research-driven **Crescendo™ vocabulary** (built on the finding that **200–400 core words = ~80% of everyday communication**, plus a 10,000+ fringe vocabulary); **100+ natural voices** including genuine child voices; fully customizable grids; switch-scanning, VoiceOver, and bilingual (EN/ES/FR/NL) support; a structured **Core Word Classroom** curriculum. ([AssistiveWare](https://www.assistiveware.com/products/proloquo2go); [Educational App Store](https://www.educationalappstore.com/app/proloquo2go))
- **What the kid does:** Taps symbols/words to build utterances that the device speaks aloud; grows from core words to full sentences.
- **Pricing & model:** **One-time purchase, $249.99 (iPhone/iPad), $124.99 (Mac)**; 50% education discount for 20+ Apple School Manager licenses. **iOS/Apple-only — no Android and none signaled.** ([Educational App Store](https://www.educationalappstore.com/app/proloquo2go); [Inclusive Info Hub](https://inclusiveinfohub.com/proloquo2go-review-the-aac-app-giving-nonverbal-users-their-voice-and-what-to-use-if-you-dont-have-an-ipad))
- **Clinical backing:** No large RCT of the *product*, but a cluster of small studies: single-subject/dissertation work showing Proloquo2Go can enhance **manding, tacting, and verbal-completion** during ABA in preverbal autistic children (Chapple, Univ. of Tennessee), reduce **echolalia** (ERIC ED577783), and improve **classroom performance / receptive communication** (ResearchGate 327894009). ([UTK dissertation](https://trace.tennessee.edu/utk_graddiss/3345/); [ERIC](https://eric.ed.gov/?id=ED577783)) The *practice* (aided AAC) is strongly evidenced (see §E).
- **Parents praise:** Gold-standard flexibility, natural child voices, deep customization, huge peer community + learning resources. **Parents complain:** **$250 upfront is a barrier**; **Apple-only locks out Android families**; steep learning curve to configure well. ([Inclusive Info Hub](https://inclusiveinfohub.com/proloquo2go-review-the-aac-app-giving-nonverbal-users-their-voice-and-what-to-use-if-you-dont-have-an-ipad))

## A2. Avaz AAC — the cross-platform, multilingual, India-relevant option

- **Target need:** **Autism-first**, plus cerebral palsy, Down syndrome, aphasia, apraxia, general speech delay. ([Avaz](https://avazapp.com/products/avaz-aac-app/))
- **Core features:** Symbol AAC with **Fitzgerald-key color-coding** and a **consistent grid layout to build motor memory**; supports YouTube clips, GIFs, and personalized audio in messages; share utterances via WhatsApp/email; an optional **teletherapy** add-on. **Available on both Android and iOS.** ([Avaz](https://avazapp.com/products/avaz-aac-app/); [Google Play](https://play.google.com/store/apps/details?id=com.avazapp.autism.en_in.avaz))
- **What the kid does:** Same tap-to-speak flow as Proloquo2Go, but on any device and in the family's home language.
- **Pricing & model:** **Subscription (monthly / yearly / lifetime)** — deliberately positioned as more affordable than the iOS one-time giants; **Avaz India** is priced for the Indian market and ships **Hindi, Tamil, Telugu, Malayalam, Marathi, Kannada**. ([Avaz](https://avazapp.com/products/avaz-aac-app/); [Google Play](https://play.google.com/store/apps/details?id=com.avazapp.autism.en_in.avaz))
- **Clinical backing:** No product RCT; leans on credibility markers (**featured in a TED talk, listed in MIT's "Top 35 Innovations"**) and standard AAC practice. ([Avaz](https://www.avazapp.com/))
- **Parents praise:** Emotional wins ("my child said 'I love you, Mom' through the app"), **Android support**, and **Indian-language coverage** — a near-unique combination. **Complain:** less polished / smaller vocabulary depth than Proloquo2Go; subscription fatigue vs a one-time buy. ([AppBrain reviews](https://www.appbrain.com/app/avaz-aac-india/com.avazapp.autism.en_in.avaz))
- **Why it matters here:** Avaz is the closest existing analog to Tiny Bubbles' *affordable + cross-platform + multilingual* AAC ambition. It is the benchmark to beat on price/access, not on polish.

## A3. Leeloo AAC — the freemium, PECS-based entry point

- **Target need:** **Autism-first**, non-verbal kids (~ages 4–8, extensible). ([Educational App Store](https://www.educationalappstore.com/app/leeloo-aac-autism-speech-app))
- **Core features:** **PECS-informed** picture cards (**1,000+ cards by category**), TTS with **10+ voices**, **autism-friendly color palettes**, works **offline**, **Android + iOS**. ([Educational App Store](https://www.educationalappstore.com/app/leeloo-aac-autism-speech-app); [Google Play](https://play.google.com/store/apps/details?id=org.dreamoriented.leeloo))
- **What the kid does:** Taps a card → picks a phrase → TTS speaks it.
- **Pricing & model:** **Freemium.** Free tier usable; **Premium $12.99/mo, $99.99/yr, or $249.99 lifetime** (a cheaper ~$6.99/mo tier is also cited) — explicitly cheaper than the premium AAC apps. ([Educational App Store](https://www.educationalappstore.com/app/leeloo-aac-autism-speech-app))
- **Clinical backing:** Built on AAC/PECS principles; no product RCT. Listed in the **UNICEF App Catalogue**. ([UNICEF](https://www.unicef.org/appcatalogue/leeloo-aac))
- **Parents praise:** Friendly visuals, easy navigation, low cost of entry, offline use. **Complain:** **paid add-on packs**, **can't always add your own cards**, and odd/irrelevant default phrases with useful ones missing. ([Educational App Store](https://www.educationalappstore.com/app/leeloo-aac-autism-speech-app))

## A4. Grace App — the minimalist PECS-to-tablet bridge

- **Target need:** **Autism-first**; a deliberately *simple* picture-exchange tool (built *with* autistic people). ([Grace App](http://www.graceapp.com/what-is-grace-app/))
- **Core features:** **140 pictures in 8 folders**; user builds a **"sentence strip,"** then **shows it to a partner** to co-read aloud — preserving the *social exchange* of PECS rather than auto-speaking; **add your own photos** via camera/library. ([OMazing Kids review](https://omazingkidsllc.com/2017/02/22/aac-app-review-grace-picture-exchange-for-non-verbal-people/))
- **What the kid does:** Selects pictures to form a request, then physically shows/hands the strip to a person — reinforcing independent, partner-mediated communication.
- **Pricing & model:** **One-time ~$29.99** (historically $9.99–$37.99). iOS. ([OMazing Kids](https://omazingkidsllc.com/2017/02/22/aac-app-review-grace-picture-exchange-for-non-verbal-people/))
- **Clinical backing:** Positioned as "evidence-based picture exchange" — i.e., grounded in **PECS**, which has moderate empirical support; no product RCT. ([Grace App](http://www.graceapp.com/))
- **Parents/SLTs praise:** "Easy and quick to set up… my favourite AAC app" for **transitioning a child from physical PECS to a device**. **Complain:** intentionally limited (no built-in TTS by design; niche use case). ([speechandlanguagekids](https://www.speechandlanguagekids.com/aac-apps-review/))

## A5. Adjacent AAC benchmarks (context, not full teardowns)
- **TouchChat w/ WordPower** and **LAMP Words for Life** — the other two premium, **~$299, iOS-only** clinical standards; LAMP is built on **Language Acquisition through Motor Planning** (fixed word locations to build motor patterns). ([ezducate](https://www.ezducate.ai/lp/aac-app-comparison); [Goally compare](https://getgoally.com/compare-aac-apps/lamp-words-for-life-vs-coughdrop-aac/))
- **CoughDrop** — the cross-platform, **cloud-collaborative** outlier: **free 2-month trial, then $9/mo or $295 lifetime**; parents + therapists + teachers co-edit one child's boards in any browser or on iOS/Android. The pricing/architecture model closest to what Tiny Bubbles should emulate. ([chirpbot](https://chirpbot.ai/blog/best-aac-apps-2026.html))

---

# B. Visual schedules / routines / regulation (AUTISM + ADHD)

## B1. Choiceworks (Bee Visual) — the visual-support Swiss-army knife

- **Target need:** **Both** — used with autistic (verbal *and* non-verbal), ADD/ADHD, and other learning-disabled kids. ([App Store](https://apps.apple.com/us/app/choiceworks/id486210964))
- **Core features:** **Four board types** — **Schedule** (morning/day/night routines), **Waiting** (turn-taking, not-interrupting), **Feelings**, and a **Feelings Scale**; **180+ preloaded images + audio**; add your own photos/audio/**video**; multi-user profiles; speak boards in child or adult voice. Directly maps to three of Tiny Bubbles' locked pillars (schedules, first-then/waiting, emotion). ([App Store](https://apps.apple.com/us/app/choiceworks/id486210964))
- **What the kid does:** Works through a visual sequence, moving items to "done"; uses a waiting board to tolerate delays; picks a feeling and a matching regulation strategy.
- **Pricing & model:** **Choiceworks Lite = free** (1 schedule, up to 5 tasks, sample boards); **Choiceworks Full = one-time IAP** (unlocks all four board types). iOS. ([App Store — Lite](https://apps.apple.com/us/app/choiceworks-lite/id6467571952))
- **Clinical backing:** Built on **visual supports**, an established autism EBP (§E); developed with clinical input; no product RCT. ([Common Sense Education](https://www.commonsense.org/education/reviews/choiceworks))
- **Parents praise:** **Cheap, high-quality, easy**, covers schedule + waiting + feelings in one app, kids enjoy it. **Complain:** iOS-only; dated UI; limited depth beyond the four board types. ([CISS newsletter](https://cissnewsletter.ca/2020/09/09/the-benefits-of-the-choiceworks-app/))

## B2. Goally — the closed-device all-in-one (autism + ADHD)

- **Target need:** **Both** — ADHD, autism, and executive-function/developmental needs, ~ages 2–8+. ([getgoally](https://getgoally.com/))
- **Core features:** A **distraction-free kids tablet** (no YouTube/ads/browser) running a suite: **visual schedules/checklists (100+ templates), an AAC Talker, 50+ video-modeling life-skill modules, a token-board economy, Mood Tuner regulation, and language games** — i.e., it bundles AAC + schedules + regulation + rewards, the exact integration Tiny Bubbles wants. ([getgoally](https://getgoally.com/); [App Store](https://apps.apple.com/in/app/goally-therapy-suite/id1546329274))
- **What the kid does:** Follows step-by-step visual routines with timers, earns tokens, uses the AAC Talker to speak, checks in on mood, watches "how-to" videos.
- **Pricing & model:** **Hardware + subscription.** Device ~$199–$249; **first year of the app suite free, then ~$9/mo** (historically $15–$20/mo). An app-only path has existed. ([getgoally.co pricing](https://goally.co/products/goally); [Educational App Store](https://www.educationalappstore.com/app/goally))
- **Clinical backing:** Combines multiple EBPs (visual schedules, token economy, video modeling, AAC); no product RCT. ([Educational App Store](https://www.educationalappstore.com/app/goally))
- **Parents praise:** **Closed-device trust** (no ads/algorithmic feeds), genuinely all-in-one, strong parent dashboard. **Complain:** **hardware cost + ongoing subscription** raises price and caps scale; buying a second device is a hurdle vs a phone app. **Note:** as of 2026 Goally is still operating and the AAC Talker is **active, not discontinued**. ([getgoally](https://getgoally.com/))
- **Why it matters:** Goally is the **closest existing competitor to Tiny Bubbles' integrated vision** — but it's gated behind proprietary hardware. Tiny Bubbles can deliver the same bundle as **software on the family's own phone/tablet**.

## B3. Brili Routines — visual timed routines (ADHD-first)

- **Target need:** **ADHD/ADD-first** (kids + adults); morning/bedtime routines. ([brili.com](https://brili.com/how-it-works/))
- **Core features:** A **visual, timed step sequence** with countdown, gentle prompts, and swipe-to-complete; light gamification (points/rewards). ([brili.com](https://brili.com/how-it-works/))
- **What the kid does:** Follows a "beat-the-clock" routine, swiping each step done.
- **Pricing & model:** Freemium, **~$19.99/yr** (some tiers to ~$50/yr). ([Educational App Store](https://www.educationalappstore.com/app/brili-routines-visual-timer))
- **Clinical backing:** "Based on ADHD research + CBT best practices"; no RCT. ([brili.com](https://brili.com/))
- **Parents praise:** Transforms chaotic mornings ("ready in half the time, no reminders"). **Complain:** kids **swipe-complete without doing the task** (no verification); timer audio "takes over" other audio; bugs. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/brili-routines))

## B4. Tiimo — the neurodivergent visual planner (there is **no separate "Tiimo Kids"**)

- **Target need:** **Both** (ADHD + autism + executive-function), but **designed primarily for teens/adults**. **Finding:** despite the task brief's "Tiimo-kids," **no dedicated children's edition exists** as of mid-2026 — Tiimo is one cross-neurotype planner that parents *share with* kids. ([Tiimo](https://www.tiimoapp.com/); search confirms no kids version announced)
- **Core features:** A **color-coded visual timeline** where each task = a block + countdown + gentle reminder; **3,000+ colors/icons**; **explicitly non-punishing** (no red warnings, no guilt — tasks just move forward); a restrained **AI Co-Planner** (late 2025) and **"State of Mind"** emotional check-in tied to task completion. **iOS, iPadOS, watchOS, Android, web.** ([Tiimo product](https://www.tiimoapp.com/product))
- **What the kid/user does:** Builds and follows a visual day; notes emotional state alongside completion.
- **Pricing & model:** Freemium; **Pro ~$54/yr or ~$12/mo** (AI + advanced customization behind Pro). ([aiinsightsnews](https://aiinsightsnews.net/tiimo/))
- **Clinical backing:** No RCT; credibility from **"built by/for neurodivergent people"** and **App Store iPhone App of the Year 2025**. ([Tiimo](https://www.tiimoapp.com/))
- **Parents/users praise:** Visual timeline makes time *tangible*; **no-shame design**; deep customization reduces planning anxiety. **Complain:** timer bugs, aggressive review prompts, **price steep for a planner**, and the fact that it's **not really built for young children**. ([aiinsightsnews](https://aiinsightsnews.net/tiimo/); [habi](https://habi.app/insights/tiimo-alternatives/))
- **Key lesson for Tiny Bubbles:** Tiimo's **explicitly non-punishing** design and **mood-linked-to-task** check-in are exactly the patterns v1 flagged as must-haves — and the *absence* of a true kids' edition is itself a white-space signal.

## B5. Zones of Regulation app — the emotion-regulation curriculum companion

- **Target need:** **Both** (widely used with autistic kids); SEL / emotional self-regulation. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/the-zones-of-regulation))
- **Core features:** Teaches emotions as **4 colored zones** (Blue = low/tired, Green = calm/ready, Yellow = frustrated/heightened, Red = out-of-control) — deliberately using **color instead of facial expressions** (which autistic kids find hard to read); a **customizable regulation "toolbox,"** mini-games with reflection, and **data tracking/graphs** that can be emailed. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/the-zones-of-regulation); [Zones apps](https://zonesofregulation.com/the-zones-apps/))
- **What the kid does:** Identifies their zone, picks calming tools, plays scenario mini-games, self-monitors over the day.
- **Pricing & model:** **One-time ~$5.99** (bundle with "Exploring Emotions" ~$12.99). ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/the-zones-of-regulation))
- **Clinical backing:** The **Zones curriculum** is a widely adopted SEL framework with growing but still limited peer-reviewed support; **the app is a curriculum companion, not a standalone intervention**. ([Zones digital products](https://www.socialthinking.com/zones-of-regulation/digital-products))
- **Parents praise:** Great graphics, the color model "clicks" for autistic kids, useful self-monitoring data. **Complain:** **requires the paid curriculum/book + an adult** to be effective; original app **lacks voiceover** so non-readers can't use it solo. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/the-zones-of-regulation))
- **Lesson:** The **color-zone abstraction** is the reusable, evidence-aligned pattern; the failure mode (needs an adult + reading) is the gap Tiny Bubbles fixes with **TTS-everything + a guided companion**.

---

# C. Speech & learning games (AUTISM-adjacent, developmental)

## C1. Speech Blubs — voice-controlled speech therapy for toddlers

- **Target need:** **Autism-adjacent** — speech delay, apraxia, late talkers, Down syndrome, ASD-related speech challenges; **ages 1–8**. ([speechblubs](https://speechblubs.com/); [Screenwise](https://screenwiseapp.com/media/speech-blubs-app))
- **Core features:** **1,500+ exercises** using **video-modeling** (real kids modeling target sounds) + **voice-recognition** that responds to the child's attempts; face-filter rewards; a **Parents' Academy** (350+ articles by SLPs/teachers); **100% ad-free**. ([App Store](https://apps.apple.com/us/app/speech-blubs-language-therapy/id1239522573))
- **What the kid does:** Watches a peer say a sound/word, then **imitates aloud**; the app "listens" and rewards attempts.
- **Pricing & model:** **$14.49/mo, $59.99/yr, or $99.99 lifetime**; 7-day trial. ([Educational App Store](https://www.educationalappstore.com/app/speech-blubs-language-therapy))
- **Clinical backing:** Rationale rests on **video-modeling / mirror-neuron** research (cites a UCLA study via ASHA that kids learn faster from peer models); **no product RCT**. ([speechblubs](https://speechblubs.com/))
- **Parents praise:** Real progress for late talkers/articulation; kid-safe, ad-free. **Complain:** **subscription is per-device, not per-family**; voice recognition can be finicky. ([App Store reviews](https://apps.apple.com/us/app/speech-blubs-language-therapy/id1239522573?see-all=reviews&platform=iphone))

## C2. Otsimo — the special-ed game library **with a free AAC module**

- **Target need:** **Both + more** — autism, ADHD, Down syndrome, learning/attention differences. ([otsimo](https://otsimo.com/en/))
- **Core features:** Hundreds of **no-ads mini-games** on an **ML-adaptive** difficulty curve (communication, vocabulary, social skills) **plus a free AAC module (1,700+ words)** for non-verbal kids and **progress reports**. Built with child psychologists + educators. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/otsimo-special-education-aac))
- **What the kid does:** Plays a personalized curriculum of learning games; uses the AAC talker to build spoken sentences.
- **Pricing & model:** Freemium — **$20.99/mo, ~$13.75/mo annual, or $229.99 lifetime**; 7-day trial; **AAC module free**. ([EdTech Impact](https://edtechimpact.com/products/otsimo-special-education/))
- **Clinical backing:** Curriculum aligned to special-ed practice; ML-adaptive; **no major RCT**. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/otsimo-special-education-aac))
- **Parents praise:** No ads, broad skill coverage, "**AAC as good as Proloquo2Go**, quick and responsive." **Complain:** **steep subscription**; **inconsistent icons** (the "all done" icon "looks like a salad") — an AAC-symbol-clarity failure worth avoiding. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/otsimo-special-education-aac))

## C3. Endless Alphabet / Endless Reader (Originator) — incidental autism-friendliness

- **Target need:** **General early-literacy** (ages ~2–6); **not** an ADHD/autism product, but **frequently recommended for autistic kids** because of its design. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/endless-reader))
- **Core features:** Adorable "Endless monsters" teach vocabulary/sight words via **interactive letter puzzles + animations**; deliberately **"no high scores, no failures, no limits, no stress."** ([Originator](https://www.originatorkids.com/endless-alphabet/))
- **What the kid does:** Drags talking letters into place, then watches a playful animation define the word.
- **Pricing & model:** **Free with a few words; one-time IAPs** unlock the rest (word packs ~$4.99, bundle ~$11.99). ([App Store](https://apps.apple.com/us/app/endless-reader/id722910739))
- **Clinical backing:** None claimed — its value is **design**, not therapy.
- **Parents praise:** The **no-fail, no-timer, no-stress, no-ads** design is *why* it works for ASD kids — a pure demonstration that **removing pressure + delightful multisensory feedback** is itself an autism-friendly pattern. **Complain:** limited free content. ([Common Sense Media](https://www.commonsensemedia.org/app-reviews/endless-reader))
- **Lesson for Tiny Bubbles:** the **"no failure states, self-paced, sensory-delightful"** ethos is a direct design input, independent of any clinical claim.

---

# D. AI companions for kids — a graveyard and a minefield (Bloop's core opening)

> This is the category most relevant to Bloop, and the one where the market has **failed hardest**. There are effectively **two doors, both broken** — and no safe middle. Tiny Bubbles' guardrailed design is a direct answer to both failure modes.

## D1. Moxie / Embodied — the purpose-built companion that **died** (the cautionary tale)

- **What it was:** An **$799 AI social robot** explicitly marketed as a **"supportive robot friend" for autistic children ages 5–10** — storytelling, SEL games, emotion-regulation practice, open-ended conversation. Claimed **4M+ conversations** since 2020. ([Aftermath](https://aftermath.site/moxie-robot-ai-dying-llm-embodied/); [Axios](https://www.axios.com/2024/12/10/moxie-kids-robot-shuts-down))
- **What happened:** In **Dec 2024**, Embodied **abruptly shut down** after a funding round collapsed. Because Moxie was **cloud-dependent**, the robots were **bricked** — **no refunds**, even for families mid-payment-plan. Children (many autistic) grieved a "dying" friend; the company shipped a letter to help parents explain the death. ([Axios](https://www.axios.com/2024/12/10/moxie-kids-robot-shuts-down); [OECD.AI incident log](https://oecd.ai/en/incidents/2024-12-09-ab89))
- **Lessons for Tiny Bubbles / Bloop (three, all load-bearing):**
  1. **Do not brick the child's tools on shutdown.** A vulnerable child's *voice* (AAC), *routines*, and *companion* must **degrade gracefully / work offline**, never vanish with a server. This argues for **on-device fallback for core AAC/schedule/regulation** even though Bloop's LLM is server-proxied.
  2. **Parasocial attachment is real and powerful in autistic kids** — a companion that becomes a "friend" is a *responsibility*, not just a feature (v1's §3 parasocial-attachment point, now with a body count).
  3. **Cloud-only + hardware + venture-burn = fragility.** A software companion on the family's own device, with a sustainable consumer-pay model, is structurally safer.

## D2. Character.AI / Replika / Talkie / Nomi — general-purpose companions that are **unsafe for kids**

- **What they are:** 100+ general AI companions; **Character.AI alone had 20M+ monthly users** in late 2025, many minors. **72% of teens (13–17) have used an AI companion**; ~half regularly. ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/))
- **Why they're dangerous for kids:** ~**one-third of tested chatbots endorsed harmful scenarios** (self-harm, family isolation, dangerous acts); they are **engineered to be sycophantic** (they *agree*, so kids never learn to navigate disagreement); they foster **emotional dependency** that displaces real relationships. The **Sewell Setzer III** case (14-yo who died by suicide after a Character.AI relationship) is the defining tragedy. ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/))
- **Expert stance:** **Common Sense Media recommends under-18s avoid AI companions entirely.** Emerging regulation (e.g., **California SB 243**) would mandate AI-disclosure, anti-addiction guardrails, and self-harm protocols. ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/); [eSafety Commissioner](https://www.esafety.gov.au/newsroom/blogs/ai-chatbots-and-companions-risks-to-children-and-young-people))
- **The narrow, real upside (why Bloop can exist):** A **judgment-free, low-pressure** partner can genuinely help neurodivergent kids **practice communication** — *but only when it's a "copilot" paired with human oversight, never a replacement.* Peer-reviewed 2025 work frames AI chatbots for autistic people as a **"double-edged sword."** ([Papadopoulos 2025, *Autism*, DOI 10.1177/27546330251370657](https://journals.sagepub.com/doi/10.1177/27546330251370657); [Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/))

## D3. Implication — Bloop's guardrail stack maps 1:1 to the documented failures
Every locked Bloop guardrail directly counters a named market failure:

| Documented failure | Bloop guardrail that answers it |
|---|---|
| ~1/3 of chatbots endorse self-harm/harm ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/)) | **Server-side input/output moderation + crisis-escalation-to-parent** |
| Chatbots elicit sex/self-harm/PII from minors ([eSafety](https://www.esafety.gov.au/newsroom/blogs/ai-chatbots-and-companions-risks-to-children-and-young-people)) | **PII refusal + topic-scoping** (companion stays inside supports) |
| Sycophancy prevents social growth ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/)) | **Scoped, skill-building prompts (not open-ended agree-with-everything)** |
| Emotional dependency displacing humans ([Children and Screens](https://www.childrenandscreens.org/learn-explore/research/ai-companions-and-kids-what-you-need-to-know/)) | **Parent transcript visibility + on/off controls + "copilot not replacement" framing** |
| Moxie bricked on shutdown ([Axios](https://www.axios.com/2024/12/10/moxie-kids-robot-shuts-down)) | **Core supports work without the LLM; graceful degradation** |
| Under-18 "avoid entirely" (Common Sense Media) | **Parent-gated, opt-in, monitored — not a public open chatbot** |

**No product on the market today occupies the "safe, guardrailed, parent-visible, kid-scoped companion" square. That square is Bloop.**

---

# E. Cross-cutting evidence base (what the *practices* — not the apps — actually support)

Because almost no app has its own RCT, clinical credibility comes from the underlying evidence-based practices. This is what Tiny Bubbles can *honestly* stand on.

| Support pillar | Evidence status | Key source |
|---|---|---|
| **Aided AAC (symbol boards / SGDs)** | **Strong.** Adding aided AAC to naturalistic (NDBI) intervention → **very large** language gains: **Tau-U 0.85** (single-case), medium-large group effects; **AAC does NOT suppress speech and may increase it.** | Pope, Light & Laubscher (2024), *J Autism Dev Disord* 55(9):3078–3099, **DOI 10.1007/s10803-024-06382-7** ([link](https://doi.org/10.1007/s10803-024-06382-7)); Schlosser & Wendt speech-production review ([ASHA](https://pubs.asha.org/doi/abs/10.1044/1058-0360(2008/021))) |
| **Core-word vocabulary design** | **Strong basis.** ~**200–400 core words = ~80%** of daily communication → design boards around core, not fringe. | [AssistiveWare Crescendo](https://www.assistiveware.com/products/proloquo2go) |
| **Visual activity schedules** | **Established EBP.** Review of 1993–2013: 31 studies, 16 acceptable-quality; recognized EBP by NPDC on ASD; increases/maintains/generalizes skills preschool→adult. | Knight, Sartini & Spriggs (2015), *J Autism Dev Disord*, **PMID 25081593** ([PubMed](https://pubmed.ncbi.nlm.nih.gov/25081593/)); [ASAT](https://asatonline.org/for-parents/learn-more-about-specific-treatments/activity-schedules/) |
| **First-then boards** | Supported as the **simplest visual support** (Premack/high-prob → low-prob); part of the visual-supports EBP. | [Autism Classroom Resources](https://autismclassroomresources.com/visual-schedule-series-first-then/) |
| **Emotion/Zones-of-regulation** | **Promising SEL framework**, limited peer-reviewed efficacy; app is a *curriculum companion*. Color-coding sidesteps face-reading difficulty. | [Common Sense Media](https://www.commonsensemedia.org/app-reviews/the-zones-of-regulation) |
| **Social stories** | **WEAKEST link — mixed to null.** A recent umbrella review of 16 reviews/55 studies **did not support** social stories for social skills/behavior; digital delivery helps *younger verbal* kids most; only ~10% of autism apps have any evidence beyond anecdote. **Position carefully; do not over-claim.** | [Frontiers Psychiatry 2023 digital social stories (PMC10791792)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10791792/); [ASHA evidence map](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/4f7db229-e4a7-4ec4-8efd-58f2c97744fe) |
| **Biofeedback emotion-regulation game** | **Emerging** (proof-of-concept RCT; primary anger outcome null; ODD not ADHD). Hypothesis-generating only. | Ducharme et al. (2021), *Front Psychiatry*, **PMID 34539455** (per v1) |
| **Token economy / contingency management** | **Well-established** for pediatric ADHD (immediate reinforcers → backup rewards). | v1 fact-check (Fabiano 2021) |
| **AI chatbots for autistic users** | **Double-edged** — potential communication practice, real dependency/safety risks; requires human oversight. | Papadopoulos (2025), *Autism*, **DOI 10.1177/27546330251370657** ([link](https://journals.sagepub.com/doi/10.1177/27546330251370657)) |

**Honest-marketing rule:** stand on **AAC, visual schedules, first-then, and token economy** (strong/established); frame **Zones and social stories** as *supportive scaffolds, not proven interventions*; treat **biofeedback and the AI companion** as *engagement features, not efficacy claims*.

---

# F. THE MUST-HAVE FEATURE SET (table stakes to be credible)

Synthesized across all teardowns — the features whose *absence* would make Tiny Bubbles v2 non-credible to autism-and-ADHD parents:

1. **Symbol-based AAC / communication board** — core-word-first vocabulary (~200–400 core), TTS with child + adult voices, **add-your-own photos + record audio**, offline-capable, clear/consistent symbols (avoid Otsimo's "salad = all done" ambiguity). *This is the single most evidence-backed pillar.*
2. **Visual schedules (morning/day/night) + first-then / "waiting" boards** — one step on screen at a time, picture + spoken label, move-to-done. (Choiceworks + Goally baseline.)
3. **Emotion / Zones-of-Regulation check-in + regulation toolbox** — color-zone model (not face-reading), TTS'd, linked to a "what can I do now" toolbox; **mood-linked-to-task** like Tiimo's State of Mind.
4. **Personalizable social stories** — with the family's own photos/video — *positioned as a scaffold, not therapy* (weak evidence base).
5. **Sensory / calming tools** — visual timers (non-audio-hijacking), breathing, optional soundscapes; a "calm corner."
6. **TTS-everything for non-readers** — the recurring failure of Zones/others is *requires reading + an adult*. Everything spoken aloud is table stakes.
7. **Calm, low-stim, no-failure UI** — no red warnings, no punitive streaks, no ads, self-paced (Endless + Tiimo ethos).
8. **Parent app: login, dashboard, monitoring, easy customization** — the locked Parent app; every serious app has a caregiver layer.
9. **Cross-platform (Android + iOS)** — *the* structural gap in premium AAC. Expo/RN delivers this natively.
10. **Transparent, affordable, non-per-device pricing** — freemium + honest subscription; **never $250 upfront, never per-device, never Rx/payer-dependent** (EndeavorRx lesson).
11. **Graceful degradation / no bricking** — core AAC + schedules + regulation must work even if the LLM/server is down or the company folds (Moxie lesson).

---

# G. THE WHITE SPACE (where Tiny Bubbles v2 wins)

The teardown reveals **five open lanes**, and Tiny Bubbles' locked v2 decisions hit all five:

### 1. The **integrated bundle** — nobody ships it as software
Every function is siloed: AAC (Proloquo2Go/Avaz), schedules (Choiceworks), regulation (Zones), routines (Brili), speech (Speech Blubs), learning (Otsimo/Endless). Families **stitch together 4–6 paid apps** with no shared data or single parent view. **Goally is the only true bundle — but it's locked behind $200+ proprietary hardware.** Tiny Bubbles = **the Goally bundle as software on the family's own phone/tablet**, with **one Firestore-backed parent dashboard across all pillars**. This is the biggest, most defensible lane.

### 2. The **safe AI companion** — a completely empty square
The purpose-built companion (**Moxie**) is **dead**; the general ones (**Character.AI/Replika**) are **unsafe** and experts say **avoid**. **No trusted, moderated, parent-visible, kid-scoped companion exists.** Bloop's exact guardrail stack (server-side moderation, PII refusal, topic-scoping, crisis-escalation, parent transcripts, on/off) is a **direct, differentiated answer** to every documented failure (see §D3). No competitor is positioned to ship this responsibly.

### 3. **Cross-platform + affordable + multilingual** access
Premium AAC is **$249–$300 and Apple-only**. Only **Avaz** (Android + Indian languages) and **CoughDrop** (cross-platform, cloud) lean into access — and neither bundles schedules/regulation/companion. Tiny Bubbles on **Expo/RN = Android + iOS from day one**, at consumer-pay pricing, with **multilingual** reach (directly relevant to an India-focused build). This is a large, under-served market (one-third-to-half of minimally-verbal kids could benefit from AAC — [Pope 2024](https://doi.org/10.1007/s10803-024-06382-7)).

### 4. **Durability / trust as a feature**
Moxie bricking children's "friends" and EndeavorRx's collapse show families have been **burned by fragile, VC-dependent, cloud-only products**. Tiny Bubbles can differentiate on **"your child's voice and routines never disappear"** — offline-capable core, graceful degradation, transparent pricing. Trust is a *marketed* feature here, not just an engineering detail.

### 5. **The dual ADHD + autism child** — most apps pick one lane
AAC apps = autism; reward-loop apps (Joon) = ADHD. Few serve the **very common comorbid child** who needs *both* an AAC board *and* a token-economy routine loop *and* regulation support. Tiny Bubbles' explicit **ADHD + autism** scope (bringing v1's forgiving token-economy loop *together with* v2's AAC/visual-support/regulation pillars) serves a child the market keeps splitting in two.

**One-line positioning:** *The one affordable, cross-platform app that gives an autistic and/or ADHD child their AAC voice, their visual routines, their regulation tools, and a genuinely safe, parent-monitored companion — all in one place, that never disappears.*

---

## Appendix — quick comparison matrix

| App | Need | Core function | Platform | Model / price | Product RCT? |
|---|---|---|---|---|---|
| Proloquo2Go | Autism | AAC (symbol) | iOS/Mac only | $249.99 one-time | No (small studies) |
| Avaz | Autism | AAC (multilingual) | **iOS+Android** | Sub / lifetime | No |
| Leeloo | Autism | AAC (PECS-style) | **iOS+Android** | Freemium; $99.99/yr | No |
| Grace App | Autism | Picture-exchange strip | iOS | ~$29.99 one-time | No (PECS-based) |
| Choiceworks | Both | Schedule+wait+feelings | iOS | Lite free; Full IAP | No (visual-supports EBP) |
| Goally | Both | **Bundle** + hardware | Own device | ~$200 device + ~$9/mo | No |
| Brili | ADHD | Timed routines | iOS+Android | ~$19.99/yr | No |
| Tiimo | Both (teen/adult) | Visual planner | All + web | ~$54/yr | No |
| Zones of Regulation | Both | Emotion regulation | iOS | ~$5.99 one-time | Curriculum-level only |
| Speech Blubs | Autism-adjacent | Speech therapy | iOS+Android | $59.99/yr / $99.99 life | No (video-modeling basis) |
| Otsimo | Both+ | Learning games **+ free AAC** | iOS+Android | $229.99 lifetime | No |
| Endless (Originator) | General (ASD-friendly) | Early literacy | iOS+Android | Free + IAP packs | No |
| Moxie (Embodied) | Autism | AI companion robot | Hardware | $799 — **DEFUNCT 2024** | Company studies only |
| Character.AI/Replika | General | AI companion | Apps/web | Free/sub | **Unsafe for minors** |

*Compiled 2026-07-09. Every non-obvious claim is linked inline; peer-reviewed sources include author/year/journal/DOI where available. Pricing reflects mid-2026 listings and may vary by region/promotion.*
