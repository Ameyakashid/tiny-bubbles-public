# Community Asks — What Real People Want from ADHD Kids' Tools

**Research stream:** COMMUNITY (parents of ADHD kids + ADHD users themselves)
**Compiled:** 2026-06-27
**Author/agent:** Claude Code research agent
**Scope:** Feature requests, pain points with existing apps, and retention drivers, mined from Reddit (r/ADHD, r/ADHDparenting, r/parentingADHD, r/ADHDwomen), CHADD/ADDitude, app-store reviews, and review aggregators for the leading kids' ADHD apps (Joon, Brili, Goally, Tiimo, Finch, Habitica).

---

## 0. Method & source caveats (read this first)

- **Reddit is fully blocked to the web crawler used here** (`reddit.com` returns "not accessible to our user agent"). To still mine real community voice, I queried the **PullPush Reddit archive API** (`api.pullpush.io`, a third-party Pushshift-style mirror — *not* reddit.com), which returns verbatim comment/post bodies, authors, scores, and `created_utc` timestamps. Quotes below are reproduced from that archive; dates are converted from `created_utc` (UTC) and are approximate to the day. Treat usernames as pseudonymous.
- Several review-aggregator pages (justuseapp, choosingtherapy, abreakfromthechaos) returned **HTTP 403/503** to the crawler; where blocked I relied on (a) Apple App Store review text I could fetch directly, (b) editorial reviews (Common Sense Media, ADDitude, Timily, Dinkum Tribe), and (c) search snippets, all cited inline.
- **Science citations:** the delay-discounting meta-analyses (Jackson & MacKillop 2016; Patros et al. 2016; Marx et al. 2021) were independently confirmed via search. The dopamine-pathway citations (Volkow 2009; Plichta & Scheres 2014; Westbrook & Braver 2016; Dovis et al. 2012) are real, well-known papers but were surfaced **as referenced by Tiimo's editorial**, not independently re-fetched here — flagged accordingly. "Rejection Sensitive Dysphoria (RSD)" is a **clinical descriptor (William Dodson/ADDitude), not a DSM-5 diagnosis** — flagged where used.

---

## 1. Executive summary

Across communities the signal is remarkably consistent. ADHD kids (and the adults who buy/manage the tools) reward apps that deliver **immediate, visible, low-effort dopamine** and an **emotional stake** (a pet/companion, a person, a privilege), and they punish apps that demand **perfect consecutive performance (streaks)**, **bury them in notifications**, **cost a lot and auto-renew**, are **complicated to set up**, or simply **become "another nag"** once novelty fades. The single most-cited failure mode is the **4–8 week novelty cliff**: the app works beautifully, then quietly gets ignored. The single most-cited emotional landmine is **streak-loss shame**, which for ADHD/RSD users routinely triggers *abandoning the app and the habit entirely*. For non-readers and younger kids, the table-stakes ask is **picture/photo/video-modeled visual schedules with audio cues** — words optional.

---

## 2. Ranked feature requests (what to build)

Ranked by frequency + intensity of demand across the sources.

1. **Instant, tangible reward at point-of-completion — not weekly payoff.** Parents repeatedly say delayed/weekly reward charts fail and immediate micro-rewards work. *"Instant reward for completing her tasks; instant gratification is really important for ADHD"* — sticker charts didn't work, Joon's instant feedback did (Vaquera, r/ADHDparenting, ~Oct 2024). *"If my kids get 100% ready by the time it's 8am they get 10 mins of screen time"* eliminated ~90% of morning conflict (FireflyT, r/ADHDparenting, ~Apr 2025). Backed by delay-discounting science (§5).
2. **Picture/photo/video-modeled visual schedule for non-readers + audio prompts.** Schedules "don't need to include any words" — use the child's own photos, icons, or a *video of the step being done* plus a timer beside it. Goally users specifically praise *"a video of someone brushing his teeth, and a timer next to it"* (12_25inches, r/ADHDparenting, ~Nov 2024). [OT4ADHD visual schedules](https://ot4adhd.com/2022/08/08/effective-visual-schedules-for-adhd/); [Goally blog](https://getgoally.com/blog/visual-schedule-apps/).
3. **Dead-simple, fast parent setup (parent likely has ADHD too).** Joon setup took *"a couple of hours"* for multiple kids ([Dinkum Tribe](https://dinkumtribe.com/joon-app-review-adhd-family-to-do-and-chores/)); a reviewer notes *"As a parent with ADHD, it takes too much focus to benefit from."* Habitica lost users *during onboarding*: *"so much work to write all my tasks…I gave up"* (Uruguaianense, r/ADHD, ~Apr 2025). ADDitude's #1 design rule: *"The app should solve one big problem"* and *"if you can't figure out how to use an app, this might negate its effectiveness"* ([ADDitude](https://www.additudemag.com/what-makes-a-good-adhd-app/)).
4. **An emotional stake / companion that the child cares about.** The virtual-pet mechanic works because *"your Doter is hungry and needs you"* reframes the chore and *"Children care about their virtual pet's wellbeing, which motivates without feeling like bribery"* ([Timily](https://timily.app/guides/joon-app-review/)). Finch's bird drove a *"60 days in a row"* tooth-brushing streak for an adult who never managed it before (TheodoreKarlShrubs, r/ADHDwomen, ~May 2025).
5. **Streak-optional / forgiving progress (grace days, "streak insurance," cumulative not consecutive).** Heavily requested as the antidote to shame (see §3.1). Klarity recommends flexible frequency goals (e.g., 3×/week), optional streak visibility, grace periods, and "year in pixels" cumulative views ([Klarity](https://www.helloklarity.com/post/breaking-the-chain-why-streak-features-fail-adhd-users-and-how-to-design-better-alternatives/)). Finch's *pause/freeze on hard days* is explicitly praised (maruthefrog, r/ADHD, ~Apr 2025).
6. **Child autonomy: kid chooses rewards and "owns" the system.** *"If you allow her to be the boss of her behavior & rewards, this will work"* (Fickle_Reflection851, r/ADHDparenting, ~Mar 2025); ADDitude: letting kids pick rewards *"increases investment."* Flexible weekly goals with **child-selected** rewards build resilience (scaryfeather, ~Mar 2025).
7. **Reduce parent nagging / point-of-performance prompts — without nagging the parent either.** The whole value prop for many is *"a visual schedule that guides them step by step without me having to repeat myself a million times"* (Kooky-Grape-6905, r/ADHDparenting, ~May 2025); Goally lets a parent *"hand off my nagging duties."*
8. **Screen-time / device access as the built-in currency.** Repeatedly the most motivating reward ("most children today want one reward: technology" — ADDitude). Parents want learning/task completion to *unlock* app or screen time, and want curated, ad-free content (Net-Radiant post; Kooky-Grape-6905 on Goally's curated, no-YouTube content).
9. **Multi-child management: rotate/assign chores across kids, per-kid difficulty, cross-platform.** The #1 Joon feature gap in reviews: *"missing basic organizing for multiple kids… ability to rotate chores between children"* (Wchollow, 4★, App Store) and *"Weekly repeating chores available to any child; flexible scheduling not tied to specific days"* (Kimiftn, App Store). Android parent app and multi-device sync also requested ([Dinkum Tribe](https://dinkumtribe.com/joon-app-review-adhd-family-to-do-and-chores/); ffxprincess wanted multi-device, r/ADHDparenting, ~Feb 2025).
10. **Customizable transition timers / visual countdowns that don't hijack audio.** Requests for timers that *"transition you into your next session and give obvious indicators when the sessions are over"* (MarsMonkey88, r/parentingADHD, ~Jan 2025) and color-changing timers viewable "from across the room" (ADDitude/Brili). Brili complaint: its sound *"completely interrupts and takes over audio"* (podcasts/audiobooks), forcing restarts.
11. **Quick correction/undo + low-friction verification.** Joon: *"No Undo Function… coins cannot be retracted after approval"* (Dinkum Tribe); photo-verify images are *"tiny with no zoom"* (Kimiftn, App Store); kids *"hate waiting on me to mark his quests done"* (theorigBobtard, r/ADHDparenting, ~Apr 2024).
12. **Built-in flexibility for real life (reorder tasks mid-routine).** ADDitude/Brili added mid-routine reordering after parents demanded it; rigidity breaks on chaotic mornings.
13. **A free tier that is genuinely usable + scholarship/low-cost options.** Praised where present: Finch's free version is *"fully functional"* (coloranathrowaway, r/ADHDwomen, ~May 2025); Joon offers hardship scholarships (Dinkum Tribe). Counter-signal in §3.3.

---

## 3. Pain points / must-avoid pitfalls (what kills these apps)

### 3.1 Streak-loss anxiety, guilt, and shame → total abandonment (the #1 emotional landmine)
For ADHD users a broken streak is not a minor setback; it triggers all-or-nothing collapse and often quitting the app *and* the habit.
- *"I despise streaks! Like Duolingo is lovely but the streaks makes me not want to do it."* (Informal-Bench7087, r/ADHD, ~Apr 14 2025).
- *"I started feeling a responsibility to log in every day due to their streak feature"* — pressure despite Finch initially helping (im__eebee, r/ADHD, ~May 7 2025).
- Klarity's case study "Michael": a single missed meditation day after **64 days** caused *"complete app abandonment for months — precisely when meditation would have helped most"* ([Klarity](https://www.helloklarity.com/post/breaking-the-chain-why-streak-features-fail-adhd-users-and-how-to-design-better-alternatives/)). Klarity's framing: *"A streak system punishes the inconsistency that is a fundamental part of ADHD, creating shame spirals that cause app abandonment."*
- Mechanism is amplified by **RSD/perfectionism** (clinical descriptor, not DSM) and ADHD "all-or-nothing"/catastrophizing thinking (CHADD's Brannan: *"I always let them down," "I'm totally irresponsible"*) ([CHADD](https://chadd.org/attention-article/conquering-the-three-mental-enemies-of-adults-with-adhd/)).
- **Design rule:** never display "Streak broken: 0 days." Prefer *"You did 3 out of 5 yesterday — great job!"* (per Sprout/DopaLoop framing in search results). Make streaks opt-in, offer grace/freeze days, count cumulatively.

### 3.2 The 4–8 week novelty cliff (gamification becomes "just another nag")
The most-cited *functional* failure. Apps win the first month then get ignored.
- *"It worked really well for a little while. But eventually got ignored… There's little difference between 'do your Joon task' and 'do your task.'"* (BattleBornMom, r/ADHDparenting, ~Nov 24 2023). This is the canonical warning: once the game layer is exhausted, you've just rebuilt nagging with extra steps.
- Joon editorial reviews confirm: *"engagement drops after 4 to 8 weeks… the motivational pull weakens"* once the pet's customization is explored ([Timily](https://timily.app/guides/joon-app-review/)). A neurotypical sibling *"ran out of new areas to explore after a couple of weeks"* ([Dinkum Tribe](https://dinkumtribe.com/joon-app-review-adhd-family-to-do-and-chores/)).
- Retention is the real metric: *"how many apps go in your trash heap after 6 months or less?"* (mnemoniker, r/ADHD, ~May 7 2025 — and a rare 6-year Habitica user).
- **Design rule:** plan for sustained novelty (new content/quests/companions), variable rewards, and value that survives the pet getting "boring."

### 3.3 Paywalls, high price, and surprise auto-renewals
- **Joon:** $12.99/mo or ~$80–90/yr; *"if your child loses interest after two months, you have effectively paid $40/month."* Surprise renewal complaint: *"Charged yearly subscription without reminder when free trial ended"* (Lavenderspring33, App Store, ~Mar).
- **Goally:** device ~$199–249 + ~$15–20/mo; the dominant complaint is *"The price is a bit steep, especially if you're not sure it would help"* ([review summary](https://www.educationalappstore.com/app/goally)).
- **Tiimo:** ~$54/yr / $12/mo seen as *"one of the pricier planners on the market"* ([YourAppLand](https://yourappland.com/tiimo-app-review/)).
- **Design rule:** usable free tier, transparent trial-end reminders, easy cancellation, low entry price; hardship pricing earns goodwill.

### 3.4 Notification fatigue → muting → deleting
ADHD users overwhelmingly report turning notifications *off* (or deleting apps) because alerts become anxiety-inducing noise that gets reflexively dismissed.
- *"I always have notifications turned off everywhere and it really helps: I just forget to check it"* (Competitive_Carob_66, r/ADHD, ~May 2025).
- *"I get derailed very easily by notifications"* (ibww, r/ADHD, ~May 2025); screenshots of 98k+ unread notifications causing *"anyone who looks at my phone anxiety"* (Brewingtonbulls).
- Finch's *"that fuckass bird keeps begging me to exercise"* (uraniumbabe, +15 score, r/ADHDwomen, ~May 12 2025) is the perfect one-line summary of supportive-reminder-turned-guilt-trip.
- Mechanism: a reminder is read, filed "later," and *"dropped from working memory within seconds"* ([imbusybeingawesome](https://imbusybeingawesome.com/adhd-reminders/)); too many micro-decisions → reflexive swiping → tuning out.
- **Design rule:** few, point-of-performance prompts; let users tune frequency; avoid guilt-toned/anthropomorphic begging.

### 3.5 Overwhelm / too complex / cluttered (kills it before it starts)
- *"Habitica has way too much going on, i hated every minute of using it tbh, too overwhelming"* (Pale-Statistician-58, r/ADHD, ~Apr 18 2025); another user *"lost interest during onboarding"* (sfcindolrip).
- Joon UI: *"difficult to navigate for simple things like assigning times… doesn't even automatically put them in sequential order"*; Brili and Tiiko-class apps draw "complicated setup" complaints.
- **Design rule:** start with 2–3 steps; progressive disclosure; minimal screens; the kid view must be uncluttered.

### 3.6 Reward/punishment ("ABA-style") backlash from the neurodivergent community
A vocal segment of r/ADHDparenting objects to compliance-via-rewards/punishment frameworks, especially for 2e/autistic+ADHD kids.
- *"forced compliance with rewards and punishments… backfires spectacularly!"* (nuccia13, r/ADHDparenting, ~Sep 17 2024); *"The Joon app is ABA. This doesn't work for many neurodivergent individuals."* (natalie1968, ~Jan 18 2025).
- Some kids actively reject gamification: a 9-yo (autistic+ADHD) *"doesn't care for ones like Joon that are 'gamified'"* (ffxprincess, r/ADHDparenting, ~Feb 17 2025) — wanted a plain cross-device visual list.
- Charts can become **shame sources**: some kids experience charts *"very negatively"*; one parent watched 5 years of *"structure, vitamins, sports, visual charts, timers"* end in the child developing *"self-hatred by age eight"* (MondayMadness5184, ~Apr 2025; PearSufficient4554, ~Mar 2025).
- **Design rule:** support intrinsic motivation and autonomy modes (not only token/reward); never punish; allow a non-gamified "calm" mode.

### 3.7 Verification gaming + parent admin burden
- Brili/Joon: kids *"may be tempted to swipe left without actually fully completing each task"* (Common Sense Media); parent approval *"becomes its own management burden"* (Timily). Tiny un-zoomable verification photos (Kimiftn).

### 3.8 Bugs / reliability / platform gaps erode trust fast
- Tiimo: *"somewhat buggy, with things disappearing from their schedule,"* timer bugs, slow support, hard to unsubscribe ([YourAppLand](https://yourappland.com/tiimo-app-review/)). Brili: requests for Apple Watch, better performance, reliable notifications. Joon: no Android parent app; no undo.

### 3.9 Doesn't fit the actual kid (age/reader/profile mismatch)
- Virtual pets read *"childish"* to teens; Joon "works best ages 6–10" (Timily). Goally is *"geared toward kids who are higher functioning."* Non-readers need picture/audio-first. One size does not fit.

---

## 4. What actually keeps an ADHD kid (and parent) coming back

Synthesized retention drivers, each evidenced above:
1. **Immediate dopamine at completion** (instant reward/coins/screen-time unlock) — the core engine.
2. **An emotional relationship object** — a pet/companion whose wellbeing depends on the kid (Doter, Finch bird). *"It feels so dumb, but I recognize it's working"* (sallyface, r/ADHDwomen, ~Apr 2025).
3. **Forgiveness built in** — pause/freeze days, cumulative progress; the user can have a bad day and return without shame.
4. **Visible, frequent, small wins** rather than distant goals (progress bars, micro-tasks, "did *something*" counts).
5. **Kid ownership** — they pick rewards, customize the companion, "are the boss" of the system.
6. **It genuinely removes parent labor** — replaces nagging with the device prompting, *"without me having to repeat myself a million times."* When mornings get calmer, parents stay subscribed.
7. **Novelty that refreshes** — new quests/skins/content to outrun the 4–8 week cliff.
8. **Low friction to keep using** — fast to check, few notifications, simple kid screen, works on the kid's device.
9. **Body-doubling / accountability to a person** for some users who find game mechanics hollow (*"prefers accountability from authority figures rather than game mechanics"* — awsm-Girl, r/ADHD; [FLOWN body-doubling list](https://flown.com/blog/adhd/best-body-doubling-apps)).

---

## 5. The science behind "immediate reward" (cite-ready)

ADHD is reliably associated with **steeper delay discounting / preference for small immediate over larger delayed rewards** — the empirical basis for "instant gratification matters":
- **Jackson JNS, MacKillop J (2016).** "Attention-Deficit/Hyperactivity Disorder and Monetary Delay Discounting: A Meta-Analysis of Case-Control Studies." *Biological Psychiatry: Cognitive Neuroscience and Neuroimaging* 1(4):316–325. DOI: 10.1016/j.bpsc.2016.01.007. [link](https://www.biologicalpsychiatrycnni.org/article/S2451-9022(16)00091-4/abstract) — robust ADHD–delay-discounting effect (notes publication bias).
- **Patros CHG, Alderson RM, et al. (2016).** "Choice-impulsivity in children and adolescents with attention-deficit/hyperactivity disorder (ADHD): A meta-analytic review." *Clinical Psychology Review* 43:162–174. DOI: 10.1016/j.cpr.2015.11.001.
- **Marx I, Hacker T, Yu X, Cortese S, Sonuga-Barke E (2021).** "ADHD and the Choice of Small Immediate Over Larger Delayed Rewards: A Comparative Meta-Analysis…" *Journal of Attention Disorders* 25(2):171–187. DOI: 10.1177/1087054718772138. [link](https://journals.sagepub.com/doi/10.1177/1087054718772138) — confirms effect across simple choice-delay and temporal-discounting paradigms (Sonuga-Barke's delay-aversion theory).

Dopamine/reward-system basis (real papers, surfaced **as cited by Tiimo's editorial**; not independently re-fetched here — verify primaries before quoting):
- **Volkow ND, Wang GJ, Kollins SH, et al. (2009).** "Evaluating Dopamine Reward Pathway in ADHD: Clinical Implications." *JAMA* 302(10):1084–1091. PMID: 19738093.
- **Plichta MM, Scheres A (2014).** "Ventral-striatal responsiveness during reward anticipation in ADHD…: a meta-analytic review." *Neuroscience & Biobehavioral Reviews* 38:125–134. PMID: 24269353.
- **Westbrook A, Braver TS (2016).** "Dopamine Does Double Duty in Motivating Cognitive Effort." *Neuron* 89(4):695–710. PMID: 26889810.
- **Dovis S, Van der Oord S, Wiers RW, Prins PJM (2012).** "Can motivation normalize working memory and task persistence in children with ADHD? The effects of money and computer-gaming." *Journal of Abnormal Child Psychology* 40(5):669–681. PMID: 22155988.

Practitioner framing (non-peer-reviewed, clinical): CHADD/Brannan on negativity bias, catastrophizing, perseveration → design positivity in, action over rumination ([CHADD](https://chadd.org/attention-article/conquering-the-three-mental-enemies-of-adults-with-adhd/)). RSD per Dodson/ADDitude (descriptor, not DSM). ADDitude on reward immediacy, frequency, child input, praise-over-punishment ([reward systems](https://www.additudemag.com/slideshows/reward-systems-for-kids-with-adhd-unlock-better-behavior/)).

---

## 6. App-by-app community read

| App | What people love | What they complain about | Price signal |
|---|---|---|---|
| **Joon** (kids RPG pet/chore) | Instant rewards; quest reframing; kids *"rushing to get chores done"*; parent verification; responsive dev + scholarships | 4–8 wk novelty fade → *"do your Joon task" = "do your task"*; no chore rotation; clunky time/UI; no undo; tiny verify photos; surprise auto-renew; iPhone-only parent app; ABA criticism | $12.99/mo, ~$80–90/yr; 4.7★ (~6.6k) |
| **Brili** (visual routine timer) | Clean kid UI; visual/color timers; photo-personalized tasks; earn stars/free time; reorder mid-routine | Kids swipe past without doing task; audio hijacks podcasts/audiobooks; wants Apple Watch + reliable notifications; setup friction | ~$19.99/yr |
| **Goally** (device + app, autism/ADHD) | Step-by-step visual schedule; **video-modeled** tasks + timer; portable; curated ad-free content; cuts parent prompting/conflict | Steep cost + device buy-in; *"digital and portable (and annoying)"*; best for "higher functioning"; uncertainty it'll help | ~$199–249 device + ~$15–20/mo |
| **Tiimo** (visual planner) | Neurodivergent-designed visual timeline; Apple App of the Year 2025; loyal base | Pricey; *"buggy, things disappearing"*; timer bugs; hard to unsubscribe; slow support | ~$54/yr / $12/mo |
| **Finch** (self-care pet) | Gentle pet companion; **pause streaks on hard days**; fully usable free tier; *"good enough IS perfect"* ethos; real habit wins (60–250 day streaks) | Streak pressure/guilt for some; *"bird keeps begging me to exercise"*; reminders can nag | Free tier strong; paid optional |
| **Habitica** (RPG tasks) | Deep gamification; team accountability; can last years for the right person | *"way too much going on… too overwhelming"*; onboarding/setup attrition (*"I gave up"*); cartoon mechanics don't motivate everyone | Free + sub |

---

## 7. Representative quotes (verbatim, with source + approx. date)

> "Instant reward for completing her tasks; instant gratification is really important for ADHD." — Vaquera, r/ADHDparenting (PullPush archive), ~Oct 2024
> "It worked really well for a little while. But eventually got ignored… There's little difference between 'do your Joon task' and 'do your task.'" — BattleBornMom, r/ADHDparenting, ~Nov 24 2023
> "I despise streaks! Like Duolingo is lovely but the streaks makes me not want to do it." — Informal-Bench7087, r/ADHD, ~Apr 14 2025
> "I started feeling a responsibility to log in every day due to their streak feature" (Finch). — im__eebee, r/ADHD, ~May 7 2025
> "Finch is good until that fuckass bird keeps begging me to exercise." — uraniumbabe (+15), r/ADHDwomen, ~May 12 2025
> "Habitica has way too much going on, i hated every minute of using it tbh, too overwhelming." — Pale-Statistician-58, r/ADHD, ~Apr 18 2025
> "so much work to write all my tasks…I gave up." — Uruguaianense, r/ADHD, ~Apr 15 2025
> "how many apps go in your trash heap after 6 months or less?" — mnemoniker, r/ADHD, ~May 7 2025
> "[She] doesn't care for ones like Joon that are 'gamified.'" — ffxprincess (re: 9-yo autistic+ADHD), r/ADHDparenting, ~Feb 17 2025
> "forced compliance with rewards and punishments… backfires spectacularly!" — nuccia13, r/ADHDparenting, ~Sep 17 2024
> "If my kids get 100% ready by the time it's 8am they get 10 mins of screen time" (≈90% less morning conflict). — FireflyT, r/ADHDparenting, ~Apr 2025
> "a video of someone brushing his teeth, and a timer next to it" (Goally). — 12_25inches, r/ADHDparenting, ~Nov 2024
> "a visual schedule that guides them step by step without me having to repeat myself a million times." — Kooky-Grape-6905, r/ADHDparenting, ~May 2025
> "missing basic organizing for multiple kids… ability to rotate chores between children." — Wchollow, Joon App Store review (4★), ~Jan
> "Charged yearly subscription without reminder when free trial ended." — Lavenderspring33, Joon App Store review, ~Mar

---

## 8. Design implications (the build brief in one place)

**Build:** instant point-of-completion rewards (with screen-time as currency); a cared-for companion; picture/photo/video-modeled visual schedules + audio for non-readers; 2–3-tap parent setup; kid-chosen rewards + autonomy mode; forgiving progress (freeze/grace, cumulative); few tunable point-of-performance prompts; multi-child rotation + cross-platform sync; customizable transition timers that don't hijack audio; quick undo; refreshing novelty pipeline; a genuinely usable free tier + transparent, cancelable, low pricing (+ hardship option).

**Avoid:** punitive consecutive-day streaks and "streak broken: 0"; the 4–8 week novelty cliff (gamification that decays into nagging); guilt-toned/anthropomorphic begging and notification floods; complex onboarding/cluttered UI; surprise auto-renewals and steep paywalls; rigid ABA-only compliance framing with no calm/intrinsic mode; verification that's gameable or burdensome; bugs/data loss and missing platforms.

---

## 9. Sources

**Community (Reddit via PullPush archive API — verbatim, dated):**
- r/ADHDparenting, r/parentingADHD, r/ADHD, r/ADHDwomen comment/submission archives via `https://api.pullpush.io/reddit/search/...` (queries: streak app, Joon, notifications, reward chart, Finch, Goally, Habitica, app). Note: reddit.com itself is crawler-blocked.

**Editorial / forum / review:**
- ADDitude — [What Makes a Good ADHD App](https://www.additudemag.com/what-makes-a-good-adhd-app/); [Reward Systems for Kids with ADHD](https://www.additudemag.com/slideshows/reward-systems-for-kids-with-adhd-unlock-better-behavior/); [Mobile Apps for ADHD Minds](https://www.additudemag.com/mobile-apps-for-adhd-minds/)
- CHADD — [Conquering the Three Mental Enemies of Adults with ADHD](https://chadd.org/attention-article/conquering-the-three-mental-enemies-of-adults-with-adhd/)
- Common Sense Media — [Brili Routines review](https://www.commonsensemedia.org/app-reviews/brili-routines)
- Timily — [Joon App Review (parent)](https://timily.app/guides/joon-app-review/)
- Dinkum Tribe — [Joon App Review](https://dinkumtribe.com/joon-app-review-adhd-family-to-do-and-chores/)
- Klarity — [Why Streak Features Fail ADHD Users](https://www.helloklarity.com/post/breaking-the-chain-why-streak-features-fail-adhd-users-and-how-to-design-better-alternatives/)
- Tiimo — [Gamification & ADHD](https://www.tiimoapp.com/resource-hub/gamification-adhd); YourAppLand — [Tiimo review/complaints](https://yourappland.com/tiimo-app-review/)
- Educational App Store — [Goally review/pricing](https://www.educationalappstore.com/app/goally)
- imbusybeingawesome — [ADHD reminders/notifications](https://imbusybeingawesome.com/adhd-reminders/)
- Apple App Store — [Joon reviews](https://apps.apple.com/us/app/joon-kids-adhd-chore-tracker/id1482225056?see-all=reviews&platform=iphone)
- Visual-schedule resources for non-readers — [OT4ADHD](https://ot4adhd.com/2022/08/08/effective-visual-schedules-for-adhd/), [Goally blog](https://getgoally.com/blog/visual-schedule-apps/)
- Body doubling — [FLOWN](https://flown.com/blog/adhd/best-body-doubling-apps)

**Science:** Jackson & MacKillop 2016 (DOI 10.1016/j.bpsc.2016.01.007); Patros et al. 2016 (DOI 10.1016/j.cpr.2015.11.001); Marx et al. 2021 (DOI 10.1177/1087054718772138); Volkow et al. 2009 (PMID 19738093); Plichta & Scheres 2014 (PMID 24269353); Westbrook & Braver 2016 (PMID 26889810); Dovis et al. 2012 (PMID 22155988).
