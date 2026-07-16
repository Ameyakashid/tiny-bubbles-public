# UX & Engagement Design Patterns for Kids' ADHD / Executive-Function Apps

*Research stream 40 · Compiled 2026-06-27*

This report synthesizes child-UX/HCI guidance, the neuroscience of ADHD reward processing, and concrete design patterns from successful kids' and self-care apps (Joon, Duolingo, Finch, Pokémon Smile, Endel, Tiimo). The goal is an evidence-grounded pattern library for designing an engaging, humane ADHD/executive-function app for children — including children who cannot yet read fluently.

A recurring theme: **the same mechanics that make these apps effective (immediate reward, streaks, loss aversion, companion characters) become harmful "dark patterns" when tuned for the operator's engagement metrics rather than the child's wellbeing.** The dividing line is whose goals the design serves. The final section treats this explicitly.

---

## 1. Why ADHD brains need a different engagement model (the science)

Designing for ADHD is not "designing for kids, but more colorful." The motivational neuroscience is specific, and it should drive the design.

**Dual-pathway model.** Contemporary models hold that ADHD arises from at least two partly independent neurodevelopmental pathways: an *executive* pathway (deficient inhibitory control) and a *motivational/reinforcement* pathway (altered reward processing and delay aversion). This explains the heterogeneity of presentations and means a good app must support **both** working-memory scaffolding *and* motivational engineering, not just one. (Sonuga-Barke dual-pathway literature; review: Luman, Tripp & Scheres, *Neuroscience & Biobehavioral Reviews*, 2010 — ["Identifying the neurobiology of altered reinforcement sensitivity in ADHD"](https://www.sciencedirect.com/science/article/abs/pii/S0149763409001870)).

**Delay aversion / steep delay discounting.** Children with ADHD show an abnormally strong preference for *smaller-but-immediate* rewards over *larger-but-delayed* ones — the subjective value of a future reward decays faster.
- Wilson, V.B., Mitchell, S.H., Musser, E.D., Schmitt, C.F., & Nigg, J.T. (2010). Delay discounting of reward in ADHD: Application in young children. *Journal of Child Psychology and Psychiatry*, 52(3), 256–264. [DOI:10.1111/j.1469-7610.2010.02347.x](https://doi.org/10.1111/j.1469-7610.2010.02347.x) (PMID 21083561). N=58 children ages 7–9; ADHD group showed significantly steeper delay-discounting gradients than controls. *Important nuance:* the effect attenuated when IQ and task-attention were controlled, so steeper discounting may partly reflect secondary cognitive factors rather than a pure reward deficit. ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3059765/))

**Altered dopaminergic reward anticipation.** Functional models propose neural *hypo*-responsiveness in the mesolimbic/ventral-striatal circuit, which may drive *behavioral* hyper-responsiveness to incentives — i.e., impulsive seeking of immediate reinforcers as compensation. When rewards are slowed or stopped, the ADHD dopamine signal is delayed. (Hyperresponsiveness to social rewards: [PMC2685404](https://pmc.ncbi.nlm.nih.gov/articles/PMC2685404/); reinforcement-sensitivity review above.)

**Design implications that fall directly out of the science:**
1. **Reward immediately and frequently.** Any meaningful delay between action and payoff is discounted hard. Celebrate the moment the task is tapped done, not at end-of-day.
2. **Front-load reinforcement during learning, then thin it out.** "Under continuous positive reinforcement, children with and without ADHD learn tasks more quickly" than under sparse reward; thinning the schedule later builds durability ([ADDitude / Gail Tripp, Ph.D.](https://www.additudemag.com/positive-reinforcement-reward-and-punishment-adhd/)).
3. **Make near-term, concrete goals; avoid long horizons.** Long-dated rewards are nearly worthless to the ADHD valuation system.
4. **Prefer rewards over punishment.** Children with ADHD are *more* sensitive to punishment than peers, and punishment "may carry serious long-term consequences if the child's emotion-regulation skills are weak." Positive reinforcement is the more effective motivator in most scenarios (Tripp, ADDitude, above).

**Evidence the digital version works.** A 2025 RCT built a game-based digital therapeutic with an integrated token-economy reward layer:
- Kim, S.-C. (2025). Verification of the effectiveness of a token economy method through digital intervention content for children with ADHD. *Bioengineering*, 12(10), 1035. [DOI:10.3390/bioengineering12101035](https://doi.org/10.3390/bioengineering12101035) (PMID 41155034). N=30 (ages 6–13), reward vs. no-reward digital content (both + medication), 4 weeks. The reward group showed significantly better attention (CAT Flanker sensitivity: F=4.76, p=.038, partial η²=.150 — a *large* effect) and greater reduction in externalizing symptoms (Cohen's d=0.86, p=.026), plus a large gain on a sustained-attention task (d=0.85). ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12561863/))

The **token economy** — immediate tokens for target behaviors, later exchanged for rewards — is the most evidence-backed behavioral framework for pediatric ADHD, precisely because tokens bridge the delay-aversion gap with instant, tangible reinforcement ([overview, Penn State ASP](https://sites.psu.edu/aspsy/2024/03/25/behaviorism-and-token-economy-for-children-with-adhd/); clinical RCTs combining token economy + CBT: [PMC4659172](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4659172/)). **A well-designed app is essentially a token economy with great UX.**

---

## 2. Companion / mascot characters and their psychology

The single most powerful engagement pattern across successful kids' apps is a **nurtured companion** the child feels responsible for. The mechanism is *parasocial attachment* — a one-sided but emotionally real bond with a character.

**The science of parasocial bonds and learning.**
- Brunick, K.L., Putnam, M.M., McGarry, L.E., Richards, M.N., & Calvert, S.L. (2016). Children's future parasocial relationships with media characters: the age of intelligent characters. *Journal of Children and Media*, 10(2), 181–190. [DOI:10.1080/17482798.2015.1127839](https://www.tandfonline.com/doi/abs/10.1080/17482798.2015.1127839). Core claim: **a sense of trust, emotional attachment, and friendship is particularly conducive to children learning from media**, and characters that *address children directly, elicit participation, and give contingent (responsive) replies* facilitate learning. ([Georgetown CDMC PDF](https://cdmc.georgetown.edu/wp-content/uploads/2016/04/Brunick-et-al-2016.pdf))
- Parasocial relationships act as **socialization agents** — fictional characters can teach, persuade, shift attitudes, and influence identity and wellbeing ([Springer chapter, 2024](https://link.springer.com/chapter/10.1007/978-3-031-69362-5_33)). In math-learning studies, the *social bond* with the character predicted learning gains ([PMC7818392, "Young Children's Mathematical Learning From Intelligent Characters"](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818392/)).

**Pattern: shift motivation from "do this because I said so" to "care for your companion."**
- **Joon** (ADHD/ODD/autism chore app, ages 6–12): the child raises a virtual pet called a *Doter* — feed, wash, level it up. Completing parent-assigned "Quests" earns coins that care for the pet. Joon reports 90% of kids complete all assigned tasks. The framing matters: "the Doter creates a sense of responsibility that goes beyond 'do this because I said so'… without feeling like bribery." ([Joon](https://www.joonapp.io/); [ChoosingTherapy review](https://www.choosingtherapy.com/joon-app-review/); [American SPCC](https://americanspcc.org/empowering-neurodivergent-children-with-joon-health-behavior-app/))
- **Finch** (self-care pet): onboarding *starts with hatching the pet* — not a feature tour — "instantly framing the experience around nurturing." As you complete real-life self-care, the bird gains energy, grows, and goes on adventures. The nurture bond is the central engagement driver. ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl); [Sophie Pilley](https://www.sophiepilley.com/post/the-magic-of-finch-where-self-care-meets-enchanted-design))
- **Pokémon Smile** (toothbrushing): you brush away bacteria to *rescue and capture* Pokémon — care/rescue framing plus collection. ([Pokémon Smile](https://www.pokemon-smile.jp/en/))

**Design guidance for the companion:**
- **Make it responsive/contingent**, not a static avatar — it should react to the child's actions in the moment (Brunick et al.). This is what converts a sprite into a relationship.
- **Reciprocal care, never debt.** The pet is happy and grows when the child succeeds; it should *never* be sick, sad, dying, or guilt-tripping when the child lapses. Finch deliberately "avoids penalties entirely" — the pet keeps living its life. (See §9 on why "your pet died because you didn't journal" is a dark pattern.)
- **Give the companion a "life of its own."** Finch's pet goes on 6-hour timer-based adventures and reports back — an *appointment mechanic* that creates gentle anticipation (a benign variable reward) without nagging. ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl))
- **Let the child name/customize it** — ownership deepens the bond and adds autonomy (§8).
- *Caution for AI companions:* the same bonding mechanisms raise overreliance risks for children; measurement and guardrails are an open research area ([ACM FAccT 2025](https://dl.acm.org/doi/10.1145/3715275.3732075)).

---

## 3. Micro-rewards & celebratory feedback (animation, sound, haptics, confetti)

Because ADHD reward systems demand *immediate* feedback (§1), the moment-of-completion celebration is doing real therapeutic work, not just decoration.

**Why it works.** Micro-rewards trigger small dopamine responses that make a task "feel less like a chore" ([Ludaxis](https://www.ludaxis.io/blog/gamification-in-apps-duolingo-case-study-2026)). Multisensory feedback — a chime + a vibration + a visual burst — is processed more saliently and improves recall and the sense of "being seen" ([Touch4IT](https://www.touch4it.com/the-role-of-microinteractions-in-ux-design); [Supercharged Studio](https://www.supercharged.studio/blog/psychology-of-microinteractions-in-ux-design)).

**Patterns:**
- **Confetti / burst on completion.** Duolingo's confetti on finishing a lesson "injects a sense of accomplishment"; Slack and Asana use celebratory bursts/unicorns to make routine completions feel momentous ([Userpilot micro-interactions](https://userpilot.com/blog/micro-interaction-examples/); [Touch4IT](https://www.touch4it.com/the-role-of-microinteractions-in-ux-design)).
- **Layer sound + haptics deliberately.** Google's Material guidance treats sound and haptics as first-class feedback channels, not afterthoughts ([Google Design: Sound & Touch](https://design.google/library/ux-sound-haptic-material-design)). A satisfying "tactile + audio" stamp on "done" makes the mundane feel genuinely rewarding.
- **Make the reward variable in magnitude.** Duolingo varies the payoff — sometimes bonus XP, sometimes a level-up, sometimes a perfect-score flourish; uncertainty about *how good* the reward will be is what sustains engagement ([Ludaxis](https://www.ludaxis.io/blog/gamification-in-apps-duolingo-case-study-2026)). This maps onto Skinner's **variable-ratio schedule**, the schedule that produces the highest, most extinction-resistant response rates (Skinner, *Science and Human Behavior*, 1953; [Simply Psychology](https://www.simplypsychology.org/schedules-of-reinforcement.html)).

**Critical guardrails (for kids especially):**
- **Don't over-celebrate.** "Too much confetti makes big achievements feel less special" ([Userpilot](https://userpilot.com/blog/micro-interaction-examples/)). Reserve the biggest celebrations for genuine milestones; use lighter feedback for routine taps.
- **Respect sensory needs.** Make sound and haptics *toggleable* — many neurodivergent children are over-stimulated by them. Tiimo lets users "control all sounds and haptic feedback" ([Tiimo](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)). See §6.
- **The variable-ratio schedule is dual-use.** It is exactly the mechanism behind slot machines and loot boxes ([Skinner quote, Simply Psychology](https://www.simplypsychology.org/schedules-of-reinforcement.html)). Use it to reward *real* behavior (finishing a task), never to drive open-ended in-app spending or compulsive re-opening. See §9.

---

## 4. Low-friction capture (one-tap, voice)

For ADHD, capture friction is the enemy: "the 'I'll add it later' trap is the ADHD killer — later often never comes. The solution isn't willpower — it's reducing friction so 'later' isn't necessary" ([Nori](https://heynori.com/blog/best-adhd-family-organizer-apps)).

**Why friction is uniquely costly here.** Typing a task is a multi-step chain — open app, tap "new," pick a list, type, confirm — and "each step is a chance to get distracted or forget." Voice collapses that to one step: "say it, and it's done." ADHD brains "work best when capture is instant" — capturing the thought *before working memory drops it* ([No Excuse Labs](https://braindump.noexcuselabs.com/voice-task-app-adhd); [Nori](https://heynori.com/blog/best-adhd-family-organizer-apps)).

**Patterns:**
- **One-tap completion** as the primary interaction — marking a task/quest done should be a single large tap with instant celebration (§3).
- **Voice-first entry.** Voice captures "in the moment, when the thought occurs." Especially important for kids who can't type or spell. ([No Excuse Labs](https://braindump.noexcuselabs.com/voice-task-app-adhd))
- **Home-screen / lock-screen widgets** for zero-launch capture and "what's next" visibility (Tudo, Tiimo) ([Nori](https://heynori.com/blog/best-adhd-family-organizer-apps); [Tiimo](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)).
- **Photo/quick-add** as alternatives to typing.
- Design rule of thumb: "lower the bar for capture to almost zero… any friction and an ADHD brain will skip it" ([Nori](https://heynori.com/blog/best-adhd-family-organizer-apps)).

For a *child* specifically, this means: a parent (or the child via voice) should be able to add a task in seconds, and the child should complete it in one tap with a picture, not a text label.

---

## 5. Short session design

**Keep sessions short and self-contained.** Microlearning lessons typically run 1–5 minutes and "less than 10 minutes," which "keeps engagement high" and "improves completion rates" because modules are short and self-paced ([Wranx](https://www.wranx.com/blog/a-quick-guide-to-microlearning-apps-enhance-your-learning-in-bite-sized-chunks/)). *(Caveat: widely-cited "47-second" / "8.25-second" attention-span figures circulate in marketing blogs and are contested; treat the directional point — shorter is better for sustained attention and fatigue — as sound, the exact numbers as soft.)*

**Patterns:**
- **One quest = one short, completable unit.** Break routines into discrete, individually-celebrated steps (progressive disclosure, §6) rather than one long checklist.
- **Active, not passive.** Educational-app experts warn against holding attention through passive activities like repetitive swiping; the app should "require active participation to be truly educational" ([Wranx](https://www.wranx.com/blog/a-quick-guide-to-microlearning-apps-enhance-your-learning-in-bite-sized-chunks/)). For an ADHD routine app this means *doing the real-world task*, not just tapping screens.
- **Appointment mechanics over open-ended grind.** Finch's design pulls the child back at *natural* moments (morning tasks → evening adventure check-in) rather than encouraging unbounded session length ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)). The healthy goal for a kids' executive-function app is **short, complete, and done** — not "maximize time-in-app."

---

## 6. Reducing cognitive load & visual overwhelm (calm vs. stimulating tension)

There is a real design tension: ADHD reward systems crave *stimulation and novelty*, but ADHD/autistic sensory systems are easily *overwhelmed*. The resolution is **stimulating moments inside a calm frame** — celebratory bursts at completion, but a quiet, uncluttered default canvas.

**The cognitive-load science for kids.** Children's **working memory is smaller than adults'**, so "it is crucial to pay attention to how much information your users need to carry around to use your interface" ([NN/G, Designing for Kids: Cognitive Considerations](https://www.nngroup.com/articles/kids-cognition/)). Too many on-screen elements "can be confusing and overwhelming to children"; use **progressive disclosure** — break the flow into steps to declutter ([NN/G UX for Children report](https://www.nngroup.com/reports/children-on-the-web/)). When on-screen information exceeds working-memory capacity, "tasks become more difficult, important details get missed, and users may abandon the task" ([Laws of UX: Cognitive Load](https://lawsofux.com/cognitive-load/)).

**Calm/sensory-friendly patterns (from Tiimo, designed for ADHD/autism):**
- **Color-coded items with customizable icons** "reduce scanning effort and support visual memory."
- **Greying-out completed/past items** so the child focuses on *what comes next* — directing attention "without harsh contrasts."
- **Slow, subtle animation** "designed to guide attention rather than demand it" — motion signals progress without creating visual chaos or startle.
- **Minimize app-switching** (widgets surface the next task) to avoid jarring transitions that disrupt attention regulation.
- **Low-stimulation / dark-mode themes**, dyslexia-friendly font toggles, and full control over sound/haptics.
- **Curate, don't clutter:** "limit markers to only the most critical items."
([Tiimo sensory design](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility); general sensory-overload guidance: [Source Kids](https://www.sourcekids.com.au/7-apps-to-help-with-sensory-processing-and-self-regulation/))

**NN/G physical/perceptual specifics:**
- **Larger touch targets for kids: ~2cm × 2cm** (vs. ~1cm for adults) — children have less precise motor control ([NN/G UX for Children report](https://www.nngroup.com/reports/children-on-the-web/)).
- **Exaggerated, unambiguous feedback.** Children under ~6 struggle to connect *subtle* feedback (small expression changes) to their action; use clear, exaggerated cues ([NN/G cognition](https://www.nngroup.com/articles/kids-cognition/)).
- **Clear, specific, goal-stated instructions**; lean on existing mental models (coloring, cooking) and skeuomorphism.

**Calm as a feature.** Endel's entire premise is that the *audio environment* can lower arousal and support focus; calm, low-stimulation focus timers "make time visible in a calm way to reduce overwhelm" ([Tiimo](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility); [Endel](https://endel.io/adhd)). See §10.

---

## 7. Accessibility for NON-READERS (icons, color-coding, audio/TTS)

A kids' ADHD app must assume the child may not read fluently (ages 3–8 especially). Text is at best a secondary channel.

**Core principles:**
- **Icons/symbols carry meaning, with text as support** — important due to reading difficulties and a "preference for visual means of communication in children" ([Aufait UX](https://www.aufaitux.com/blog/ui-ux-designing-for-children/); [AFixt](https://afixt.com/mobile-app-accessibility-best-practices-for-inclusive-design/)).
- **Audio previews before activation.** "Audio stimulus can enable a pre-literate child to hear a characterization of the functionality of a button before they activate it" — i.e., a button can *speak its own label* on focus/long-press. ([USPTO patent on non-literate touchscreen rendering, 10,853,029](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10853029))
- **TTS for all task content** so the child can hear quests/instructions; pair with the companion's voice for engagement (contingent voice → parasocial bond, §2).
- **Never rely on color alone.** WCAG-aligned: pair color with a second cue (icon shape, text, or sound) so color-blind children aren't excluded ([Material accessibility](https://www.mdui.org/en/design/1/usability/accessibility.html); [Aufait](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)). Color-*coding* (e.g., morning = yellow, evening = blue) is great as a *redundant* channel alongside icons.
- **Use the camera/AR and selfies** as a non-text input/reward, as Pokémon Smile does (brushing via the selfie camera; silly Pokémon-cap photos as rewards) ([Pokémon Smile](https://www.pokemon-smile.jp/en/); [Pokémon Smile / animationstudies](https://blog.animationstudies.org/this-is-the-way-we-brush-our-teeth-how-pokemon-smile-helps-children-learn-practical-skills/)).
- **Immediate, multimodal feedback.** Children "respond well to immediate feedback through visual cues like color changes and animations, as well as auditory feedback like sound effects" ([Aufait UX](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)).

**Practical pattern:** represent each task with a **picture + icon + color + spoken label**, completed with **one tap + animation + sound + haptic**. A non-reader should be able to run their whole routine without encountering a word they must decode.

---

## 8. Dopamine-friendly progress feedback (bubbles popping, filling meters, growth)

Progress feedback is where the motivational science and the visual design meet. The key constructs:

**Goal-gradient effect** — motivation *increases as the goal gets closer*; people "invest more effort, enthusiasm, and urgency as a reward comes within reach" ([Learnnovators](https://learnnovators.com/blog/the-goal-gradient-effect-why-visible-progress-sustains-motivation/); [Renascence](https://www.renascence.io/behavioral-biases/goal-gradient-effect)). Foundational research: Kivetz, Urminsky & Zheng (2006), *Journal of Marketing Research* — the coffee loyalty-card studies showing accelerating effort near the goal.

**Endowed-progress effect** — giving users a *head start* (progress that's already partly filled) increases the odds they finish, because they're now closer to the goal from the outset ([Kivetz et al.; Userpilot progress-bar psychology](https://userpilot.com/blog/progress-bar-psychology/)). For kids: never start a meter at zero — start it slightly filled.

**Patterns that visualize progress as growth/depletion:**
- **Filling meters / progress bars** for the day's routine. Make them *short and clearly fillable* — and start them partly full.
- **Popping/clearing mechanics** (bubbles, bacteria) — the *act of clearing* is itself the reward, as in Pokémon Smile's brushing-away-bacteria loop ([Pokémon Smile](https://blog.animationstudies.org/this-is-the-way-we-brush-our-teeth-how-pokemon-smile-helps-children-learn-practical-skills/)).
- **Growth as progress** — the companion grows / gains energy / unlocks adventures as tasks complete (Finch's pet grows and adventures; Joon's Doter levels up) ([Finch](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl); [Joon](https://www.joonapp.io/)).
- **Collection/sticker mechanics** — Pokédex entries, medals, accessories, furniture for the pet — provide layered, collectible progress ([Pokémon Smile](https://www.pokemon-smile.jp/en/); [Finch rainbow stones](https://eatproteins.com/finch-review/)).

**Critical caveat — progress bars can backfire.** "Long or empty progress bars… signal how much more effort is required" and act as a *deterrent*; a long unfilled bar or empty checklist discourages ([Irrational Labs](https://irrationallabs.com/blog/knowledge-cuts-both-ways-when-progress-bars-backfire/); [Userpilot](https://userpilot.com/blog/progress-bar-psychology/)). For an ADHD child with low frustration tolerance this is acute. **Rules:** keep goals small, show *recent* progress prominently, start meters partly filled (endowed progress), and never confront the child with a vast, empty "you've barely started" bar.

---

## 9. Choice & autonomy without decision paralysis

**Autonomy is a basic psychological need.** Self-Determination Theory (Deci & Ryan) holds that motivation and wellbeing depend on three needs: **autonomy, competence, and relatedness** ([Simply Psychology, SDT](https://www.simplypsychology.org/self-determination-theory.html); [Wikipedia, SDT](https://en.wikipedia.org/wiki/Self-determination_theory)). The three map cleanly onto the patterns above: **autonomy** (choice), **competence** (progress feedback §8), **relatedness** (the companion §2). Children who feel autonomy over their decisions are more motivated toward positive behaviors; those who feel pressured or alienated are less so ([SDT applications](https://positivepsychology.com/self-determination-theory/)). Choice itself enhances intrinsic motivation and cognitive engagement ([Schneider et al., 2018, *Learning and Instruction* — autonomy-enhancing effects of choice](https://selfdeterminationtheory.org/wp-content/uploads/2018/07/2018_Schneideretal_choiceeffects.pdf)).

**But cap the number of options.** In adults, too many options causes **choice overload** — demotivation and paralysis; a manageable set (~6, not 30) "prevents the paralysis and ego depletion that accompany excessive optionality" ([SDT / choice literature](https://positivepsychology.com/self-determination-theory/)). For ADHD specifically, working-memory and inhibitory limits make long option lists especially paralyzing. Tiimo deliberately offers "focused options rather than endless configurations, because choice overload creates its own cognitive burden" ([Tiimo](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)).

*Interesting nuance:* a 2023 study found **toddlers (~2.5y) did *not* show choice overload** — they preferred more options even up to 26, unlike adults ([Frontiers in Developmental Psychology, 2023](https://www.frontiersin.org/journals/developmental-psychology/articles/10.3389/fdpys.2023.1317426/full)). So overload thresholds are developmental; older children and ADHD profiles still warrant constrained, curated choice. Err toward fewer, clearer choices.

**Patterns:**
- **Curated, low-cardinality choices:** pick from a *few* quests, a *few* pet customizations, a *few* reward options — not open catalogs.
- **Choice of *how/order*, not *whether*:** let the child choose which task to do first, which outfit the pet wears, which celebration sound plays — autonomy over presentation, while the underlying routine is preserved.
- **Default-and-adjust:** ship "strong defaults that serve most users well" with optional targeted adjustments (Tiimo philosophy) — autonomy for those who want it, no burden for those who don't.
- **Picture-based choices** for non-readers (§7).

---

## 10. Calm/focus audio as an engagement & regulation layer (Endel)

Audio environments are an underused lever for ADHD focus and arousal regulation, and a non-text, non-screen channel well-suited to kids.

- **Endel** generates personalized, continuously-evolving soundscapes that adapt in real time to time of day, weather, heart rate, and location, grounded in circadian science and sound-masking ([Endel science](https://endel.io/science)).
- **Evidence (industry-funded, note conflict of interest):** Haruvi, A., Kopito, R., Brande-Eilat, N., Kalev, S., Kay, E., & Furman, D. (2022). Measuring and Modeling the Effect of Audio on Human Focus in Everyday Environments Using Brain-Computer Interface Technology. *Frontiers in Computational Neuroscience*. Reported ~**7× more consistent focus** vs. productivity playlists and silence, using EEG/BCI measurement (conducted with Arctop) ([Endel science](https://endel.io/science)). Endel also cites ~3.6× stress reduction with regular use. *These figures come from company-affiliated studies and should be cited with that caveat.*
- **Independent grounding for ADHD + sound:** Endel cites work on white/pink noise and attention in ADHD, e.g., Lin, Curcio & Tchounwou (2022), "The Effects of White Noise on Attentional Performance and On-Task Behaviors in Preschoolers with ADHD." White-noise/stochastic-resonance theories propose that moderate auditory noise can paradoxically *improve* attention in under-aroused (ADHD) systems. ([Endel ADHD](https://endel.io/adhd))

**Pattern:** offer an optional calming/focus soundscape during task execution and as a regulation tool (e.g., a "calm corner" mode), with full volume/on-off control (sensory respect, §6). It doubles as a non-screen way to support transitions and wind-down.

---

## 11. Avoiding dark patterns & shame mechanics with kids (the ethics line)

Every mechanic above is dual-use. Regulators are actively policing the abusive versions, and the developmental literature is clear that shame is counterproductive. **The test: does the pattern serve the child's stated goals, or the operator's engagement/revenue metrics?**

**Regulatory reality (US):**
- The FTC defines **dark patterns** as design that "tricks or manipulates users into making choices they would not otherwise have made and that may cause harm," and is escalating enforcement, especially for children ([FTC/Bloomberg Law](https://news.bloomberglaw.com/us-law-week/ftc-is-escalating-scrutiny-of-dark-patterns-childrens-privacy); [Fenwick](https://www.fenwick.com/insights/publications/ftcs-aggressive-enforcement-of-childrens-privacy-and-dark-patterns-a-cautionary-tale-and-simple-steps-companies-can-take-to-reduce-risk)).
- The **Epic Games / Fortnite settlement (Dec 2022, >$500M total)** included a dedicated dark-patterns order — e.g., counterintuitive purchase buttons that led to unauthorized charges by children ([Bloomberg Law](https://news.bloomberglaw.com/us-law-week/ftc-is-escalating-scrutiny-of-dark-patterns-childrens-privacy)).
- Advocacy groups (Fairplay) have petitioned the FTC over patterns aimed at kids: "arbitrary virtual currencies, encouragement from in-game characters, and ticking countdown timers" that exploit children's "immature and developing executive functioning" and FOMO ([Fairplay](https://fairplayforkids.org/advocates-ask-protect-dark-patterns/); [CRS / Congress.gov](https://www.congress.gov/crs-product/IF12246)). **Note the irony: "encouragement from in-game characters" is the parasocial-companion mechanic from §2 — benign as motivation, abusive when steering spending or compulsive use.**

**Shame is the wrong lever — the developmental science.** Brené Brown's distinction: **guilt = "I did something bad"** (focused on behavior, repairable, motivates positive change); **shame = "I am bad"** (attacks the self). Shame is associated with self-worth problems, depression, addiction, aggression, and bullying, and "you can't shame people into being better" — behavior change tracks with guilt, not shame ([Brené Brown: Shame v. Guilt](https://brenebrown.com/articles/2013/01/15/shame-v-guilt/); [fs.blog](https://fs.blog/brene-brown-guilt-shame/)). This compounds with the ADHD finding that these children are *more* sensitive to punishment and shame-based correction (§1, [ADDitude](https://www.additudemag.com/positive-reinforcement-reward-and-punishment-adhd/)).

**The Duolingo cautionary case.** Duolingo's streak + notification system is a masterclass in engagement *and* a widely-criticized example of guilt mechanics. It deliberately exploits **loss aversion** (fear of losing a streak grows as it lengthens) and **sunk-cost investment**; its mascot sends playful-to-guilt-inducing pushes ("Duo misses you," "You're about to lose your streak," "Some people just aren't language learners") that are A/B-optimized for retention ([The PM Repo](https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users-lessons-in-habit-formation); [WebDesignerDepot](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/)). Critics argue it can shift the goal *from learning to preserving the streak* and turn "missing a lesson into a personal moral failure" ([Medium analysis](https://medium.com/@milessightings/i-reverse-engineered-duolingos-guilt-algorithm-6ddf598d2a72)). For an *adult* opting in, arguably tolerable; for a *child* with developing executive function and emotion regulation, **guilt-trip streak loss is a shame mechanic to avoid.**

**Design rules for a humane kids' ADHD app:**
1. **Reward progress; never punish or shame lapses.** Companion stays well and happy regardless; a missed day is neutral, not a loss. (Finch "avoids penalties entirely.")
2. **Streaks without shame.** If you use streaks, make them *forgiving* — streak freezes/repair, "welcome back" framing, and *never* a dying pet or guilt-tripping notification. Loss aversion on a child is manipulation.
3. **Praise effort and identity-as-capable** ("you did something hard," not "good kids finish their chores").
4. **No FOMO timers, no arbitrary currencies tied to spending, no character-driven upsells.** Currency should buy *cosmetic* rewards earned by real behavior, never require money to keep the companion alive.
5. **Notifications serve the routine, not retention.** Cap frequency; tie to the child's *own* schedule; never use guilt or "we'll stop reminding you" reverse-psychology.
6. **No engagement-maximizing dark patterns** (counterintuitive buttons, hidden cancellation, "confirmshaming") — these are exactly what the FTC is enforcing against ([Fenwick](https://www.fenwick.com/insights/publications/ftcs-aggressive-enforcement-of-childrens-privacy-and-dark-patterns-a-cautionary-tale-and-simple-steps-companies-can-take-to-reduce-risk)).
7. **Optimize for "task done and child off the app," not time-in-app.** This is the clearest structural difference between a therapeutic tool and an attention-extraction product.

---

## 12. Synthesis: a pattern checklist for an ADHD/EF kids' app

| Need (science) | Pattern | Source apps |
|---|---|---|
| Delay aversion → immediate reward (§1) | One-tap done → instant confetti+sound+haptic; token economy | Pokémon Smile, Joon |
| Relatedness / parasocial bond (§2, SDT) | Nurtured, responsive, *never-punishing* companion the child names | Finch, Joon |
| Variable reward sustains engagement (§3) | Variable-magnitude celebration on real behavior (not spending) | Duolingo, Finch |
| Capture friction kills follow-through (§4) | Voice + one-tap + widgets; picture tasks | Nori, Tudo, Tiimo |
| Short attention / fatigue (§5) | 1–5 min completable quests; appointment, not grind | Finch, microlearning |
| Small working memory / sensory overload (§6) | Progressive disclosure, calm default, slow motion, grey-out done, 2cm targets, toggleable sound | Tiimo, NN/G |
| Non-readers (§7) | Picture+icon+color+spoken label; TTS; no color-only meaning; AR | Pokémon Smile, NN/G |
| Competence / dopamine progress (§8) | Filling meters (start partly full), popping/clearing, growth, collection — never long empty bars | Pokémon Smile, Finch, Joon |
| Autonomy without paralysis (§9, SDT) | ~3–6 curated, picture-based choices; choose order/cosmetics, not whether | Tiimo |
| Arousal regulation (§10) | Optional calm/focus soundscape, full controls | Endel, Tiimo |
| Avoid harm (§11) | No shame, forgiving streaks, no FOMO/upsell, optimize for "done & gone" | (counter-example: Duolingo guilt) |

**The throughline:** build a forgiving, immediate, low-friction token economy around a beloved companion, in a calm canvas with stimulating moments of celebration, give curated autonomy, speak everything aloud for non-readers — and deliberately refuse the engagement-maximizing dark patterns that the same toolkit makes so easy.

---

## Sources

**Peer-reviewed / scientific**
- Wilson et al. (2010), *J. Child Psychol. Psychiatry* — delay discounting in young children with ADHD. [DOI:10.1111/j.1469-7610.2010.02347.x](https://doi.org/10.1111/j.1469-7610.2010.02347.x) · PMID 21083561 · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3059765/)
- Kim, S.-C. (2025), *Bioengineering* 12(10):1035 — digital token-economy RCT for ADHD. [DOI:10.3390/bioengineering12101035](https://doi.org/10.3390/bioengineering12101035) · PMID 41155034 · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12561863/)
- Luman, Tripp & Scheres (2010) review, *Neurosci. Biobehav. Rev.* — altered reinforcement sensitivity in ADHD. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0149763409001870)
- Hyperresponsiveness to social rewards in ADHD — [PMC2685404](https://pmc.ncbi.nlm.nih.gov/articles/PMC2685404/)
- Brunick et al. (2016), *Journal of Children and Media* 10(2) — parasocial relationships with media characters. [DOI:10.1080/17482798.2015.1127839](https://www.tandfonline.com/doi/abs/10.1080/17482798.2015.1127839) · [Georgetown CDMC PDF](https://cdmc.georgetown.edu/wp-content/uploads/2016/04/Brunick-et-al-2016.pdf)
- "Young Children's Mathematical Learning From Intelligent Characters" — [PMC7818392](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818392/)
- Haruvi et al. (2022), *Frontiers in Computational Neuroscience* — audio & focus (Endel/Arctop). [Endel science](https://endel.io/science)
- Self-Determination Theory: [Simply Psychology](https://www.simplypsychology.org/self-determination-theory.html) · [Schneider et al. 2018 PDF](https://selfdeterminationtheory.org/wp-content/uploads/2018/07/2018_Schneideretal_choiceeffects.pdf) · [Wikipedia](https://en.wikipedia.org/wiki/Self-determination_theory)
- Toddlers & choice overload (2023), *Frontiers in Developmental Psychology* — [article](https://www.frontiersin.org/journals/developmental-psychology/articles/10.3389/fdpys.2023.1317426/full)
- Reinforcement schedules / variable-ratio (Skinner 1953) — [Simply Psychology](https://www.simplypsychology.org/schedules-of-reinforcement.html)
- Token economy + CBT clinical RCTs — [PMC4659172](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4659172/) · [Penn State ASP overview](https://sites.psu.edu/aspsy/2024/03/25/behaviorism-and-token-economy-for-children-with-adhd/)
- Brené Brown — shame vs. guilt: [brenebrown.com](https://brenebrown.com/articles/2013/01/15/shame-v-guilt/) · [fs.blog](https://fs.blog/brene-brown-guilt-shame/)

**Child-UX / HCI guidance**
- NN/G — [Designing for Kids: Cognitive Considerations](https://www.nngroup.com/articles/kids-cognition/) · [UX Design for Children (3–12) report](https://www.nngroup.com/reports/children-on-the-web/)
- [Laws of UX: Cognitive Load](https://lawsofux.com/cognitive-load/)
- Tiimo — [sensory-friendly neurodivergent design](https://www.tiimoapp.com/resource-hub/sensory-design-neurodivergent-accessibility)
- Aufait UX — [child-friendly interfaces](https://www.aufaitux.com/blog/ui-ux-designing-for-children/) · AFixt — [mobile accessibility](https://afixt.com/mobile-app-accessibility-best-practices-for-inclusive-design/) · [Material accessibility](https://www.mdui.org/en/design/1/usability/accessibility.html)
- Microinteractions/feedback — [Touch4IT](https://www.touch4it.com/the-role-of-microinteractions-in-ux-design) · [Supercharged Studio](https://www.supercharged.studio/blog/psychology-of-microinteractions-in-ux-design) · [Google Design: Sound & Touch](https://design.google/library/ux-sound-haptic-material-design) · [Userpilot](https://userpilot.com/blog/micro-interaction-examples/)
- Goal-gradient / progress bars — [Learnnovators](https://learnnovators.com/blog/the-goal-gradient-effect-why-visible-progress-sustains-motivation/) · [Userpilot](https://userpilot.com/blog/progress-bar-psychology/) · [Irrational Labs (backfire)](https://irrationallabs.com/blog/knowledge-cuts-both-ways-when-progress-bars-backfire/) · [Renascence](https://www.renascence.io/behavioral-biases/goal-gradient-effect)
- Microlearning/session length — [Wranx](https://www.wranx.com/blog/a-quick-guide-to-microlearning-apps-enhance-your-learning-in-bite-sized-chunks/)
- Low-friction capture — [Nori](https://heynori.com/blog/best-adhd-family-organizer-apps) · [No Excuse Labs](https://braindump.noexcuselabs.com/voice-task-app-adhd)
- Non-literate UI patents — [USPTO 10,853,029](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10853029)

**App examples**
- Joon — [joonapp.io](https://www.joonapp.io/) · [ChoosingTherapy review](https://www.choosingtherapy.com/joon-app-review/) · [American SPCC](https://americanspcc.org/empowering-neurodivergent-children-with-joon-health-behavior-app/)
- Finch — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl) · [Sophie Pilley](https://www.sophiepilley.com/post/the-magic-of-finch-where-self-care-meets-enchanted-design) · [eatproteins review](https://eatproteins.com/finch-review/)
- Duolingo — [The PM Repo](https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users-lessons-in-habit-formation) · [Ludaxis](https://www.ludaxis.io/blog/gamification-in-apps-duolingo-case-study-2026) · [WebDesignerDepot (notifications)](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/)
- Pokémon Smile — [official](https://www.pokemon-smile.jp/en/) · [animationstudies analysis](https://blog.animationstudies.org/this-is-the-way-we-brush-our-teeth-how-pokemon-smile-helps-children-learn-practical-skills/) · [Wikipedia](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Smile)
- Endel — [endel.io](https://endel.io/) · [/science](https://endel.io/science) · [/adhd](https://endel.io/adhd)

**Dark patterns / ethics / regulation**
- ADDitude (Gail Tripp, Ph.D.) — [reward vs. punishment for ADHD](https://www.additudemag.com/positive-reinforcement-reward-and-punishment-adhd/)
- FTC dark patterns & children — [Bloomberg Law](https://news.bloomberglaw.com/us-law-week/ftc-is-escalating-scrutiny-of-dark-patterns-childrens-privacy) · [Fenwick](https://www.fenwick.com/insights/publications/ftcs-aggressive-enforcement-of-childrens-privacy-and-dark-patterns-a-cautionary-tale-and-simple-steps-companies-can-take-to-reduce-risk) · [Fairplay petition](https://fairplayforkids.org/advocates-ask-protect-dark-patterns/) · [CRS/Congress.gov](https://www.congress.gov/crs-product/IF12246)

**Caveats on source quality:** Several engagement claims (Duolingo retention lifts, "47-second attention span," Endel's 7× focus / 3.6× stress figures) come from industry blogs or company-funded studies and are flagged as such inline; treat the *directional* findings as reliable and the *exact magnitudes* as soft. The ADHD neuroscience, SDT, token-economy, and shame/guilt claims are drawn from peer-reviewed literature.
