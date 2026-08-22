# Quiz trust investigation — verbatim agent and red-team reports (2026-08-21)

Companion to `docs/quiz-trust-investigation-2026-08-21.md`. Each section below is the unedited report written by an independent agent during the investigation. Line numbers cited refer to the prototype working tree at the time of the investigation. Agents worked without seeing each other's output; the red team read all of them afterwards.

Contents: 1 Lead findings · 2 Agent 1 (trust & behavior) · 3 Agent 2 (UX & accessibility) · 4 Agent 3 (claims, privacy, governance) · 5 Agent 4 (architecture & testing) · 6 Red team · 7 About-page capture



---

<!-- ===== SECTION 1: lead-findings.md ===== -->

# Lead investigator findings (repository + empirical) — 2026-08-21

## Repo state
- Path: C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4 ; branch claude/nocturne-slice4-payment-choice @ 5436dea (pre-PR#51 main)
- origin = local canonical repo (C:\Users\BlakeFord\Documents\GitHub\LacksFurniture); b2acd7e/ee6e402 NOT present in prototype objects
- Working tree: 24 modified files + untracked outputs/trust-stories-workbook/ (Lacks_Store_Data.xlsx byte-identical to incoming/ copy + .inspect.ndjson)
- Closest canonical commit to proto index.html = 02c116b (Slice 4 C1), 527 changed lines; vs ee6e402 (Slice 4 head) 1213 lines → the prototype is an EARLIER Slice 4 iteration + trust rail; any trust work must be re-derived onto current main (4a76503), not merged from this tree.
- Trust delta in index.html vs C1: ~95 lines: CSS block (.noct-quiz-trust*, 5 rules + 1 responsive + forced-colors block), loader (window.__DF_QUIZ_TRUST_STORIES fail-soft), quizTrustStoryMarkup(), two template insertions after .noct-quiz-nav in both slider and option branches of renderQuestion.
- Also in tree: CLAUDE.md paragraph documenting trustStories; tests/quiz_presentation_check.mjs "TRUST RAIL" section (pins 5 items, complete mapping, not live/timed/fixed/focusable, no rail when stories null); tools/validation.py block (~2435-2510) + 3 self-test cases; incoming/dreamfinder_quiz.json quiz.trustStories (5 items) → data/quiz.json (top-level trustStories + questions); lacks_store_values.json trustSignal shortened ("Family-owned since 1935 — 90 years of South Texas homes" → "Family-owned in South Texas since 1935") — NOTE the removed string contained a stale-prone "90 years" count.

## Data flow / canonical vs generated
- canonical: incoming/dreamfinder_quiz.json (envelope {_meta, quiz:{questions, trustStories}}) → build_lacks_workbook.py (canonical repo only; absent in proto) → incoming/Lacks_Store_Data.xlsx Quiz tab (JSON envelope rows) → tools/convert_store_data.py build_quiz() passes the whole quiz object through (no trustStories awareness; round-trips any key) → data/quiz.json (generated).
- validator: validate_quiz allows root keys {questions, trustStories} only.
- canonical repo tools have NO trustStories references (grep) → the schema exists only in the prototype tree.
- demo/black-friday/ has its own data/store-config.json only; index.html fetches ./data/quiz.json — bundle contract unaffected unless build copies quiz.json (agent 4 to confirm).

## Runtime behavior (index.html line refs, prototype tree)
- renderQuestion (13403) rebuilds #questionContainer.innerHTML on EVERY call; selectOption (13550) calls renderQuestion after each tap → the aside is re-created on every answer tap (same content; container has no CSS animation in the Nocturne profile, so the "re-trigger animation" lines 13521-13524 are a no-op; no flash observed).
- Aside is injected AFTER .noct-quiz-nav (Back/Next) in both slider (13457) and option (13515) branches → DOM/reading order: eyebrow → progress → headline → help → options → nav → aside. Not focusable, no live region (correct for supplementary content).
- Story mapping: by question id (stories[].questionIds), first match wins; deterministic; never answer-aware; no timers.
- skipIf: nextQuestion (13618) skips partner_disturbance for solo, sets 'not_applicable'; prevQuestion (13643) skips back over it. Story pair (partner_sleep, partner_disturbance) → solo path sees that story once; no doubling. Verified empirically.
- Language switch (12086): switchLanguage → renderQuestion if questionScreen active → aside re-rendered in new language (verified: ES copy appears).
- Reset: aside holds no state; resetSessionState (20025) clears answers; rail content is pure function of (question id, lang).
- Loader (12494-12501): trustStories fail-soft to null if not object-with-items; runtime tolerates PARTIAL mapping (quizTrustStoryMarkup returns '' when no story for a qid) while the validator REQUIRES complete mapping → build/runtime asymmetry is intentional fail-soft, but means a rail can silently appear on some questions and not others if generated data bypasses the validator.
- escapeHtml applied to label/source/copy/id → XSS-safe for config text.
- Analytics: analytics.log (14490) pushes to in-memory events[] + console.log; sessionSafeSummary deliberately excludes sessionId; nothing is transmitted unless gasUrl set (16441: `if (gasUrl && !scenarioBlocksEmail) fetch(gasUrl…)`); data/store-config.json gasUrl = '' → NOTHING leaves the device in this deployment; localStorage holds only device RSA name/list (19049-19076), never answers.
- Existing transparency surfaces:
  * helpText per question (quiz.json) already plays the "why we ask" role, unevenly: mattress_size "So every mattress we show actually fits your space." (explanatory) vs partner_disturbance "Motion isolation is one of the first upgrades you'll feel." and temperature "Sleeping hot or cold is an easy fix with the right materials." (benefit claims, not explanations) vs trigger "No pressure — this just helps your specialist focus on what matters to you." (explanatory + sales-pressure disclaimer).
  * Scoring explanations: calculateScores (13747) builds per-mattress matchReasons (firmness within 1: "Matches your firmness preference (N/10)"; feature reasons from m.reasons[feat]) → shown in drawer; plus Sleep Brief.
  * Privacy: text.privacyBody/disclaimerBody render ONLY inside #privacyOverlay (20549), opened ONLY from the email screen link "Privacy & Terms" (10745). text.privacyDraftNotice = "Draft policy — pending Lacks Furniture approval before live use." privacyBody says DreamFinder "collects your name, email, and optional phone number" — in this deployment (gasUrl blank) it collects nothing → the draft text describes a different deployment than the one running.
  * disclaimerBody already states limitations ("starting points, not guarantees", "does not provide medical advice") but is unreachable during the quiz.
  * Welcome screen: voice.eyebrow "FAMILY-OWNED · SOUTH TEXAS · SINCE 1935" + text.heritage (landingHeritage, same string) + text.trustSignal "Family-owned in South Texas since 1935" + locations line + "About 2 minutes · No pressure". So "since 1935" is already on the landing screen; the prototype's Q1-Q2 story repeats it as the 3rd exposure within ~30 seconds.
- White-label: index.html contains no retailer name (grep: 1 hit = the verb "lacks" in a comment). Label "From the Lacks story" lives in quiz.json data → boundary respected. BUT quiz.json is documented as app-contract structure with copy-only variation; trustStories adds a retailer-content block to the quiz envelope rather than store-config text blocks — architectural question.

## Provenance: STORED, not ENFORCED
- validator requires: id slug, questionIds (complete, unique), bilingual text/sourceLabel (plain text), sourceUrl safe https, verifiedAt YYYY-MM-DD.
- NOT enforced: sourceUrl host allowlist (financing/promotions use tools/source_hosts.json; trustStories does not); freshness (financing has maxAgeDays + fail-closed; trustStories has verifiedAt with NO maxAge → can never go stale); approval record (no approvedBy/approvedAt); ES review status (financing has esReviewStatus; trustStories none); claim type; independent-source flag.
- sourceUrl is NEVER rendered or reachable by the customer; the visible "Source: Lacks company history" is a free-text sourceLabel. The label is truthful but the source is the retailer's own About page (not independent).

## Evidence verification (lead, via Chrome 2026-08-21; WebFetch 403)
- All 5 prototype claims are stated on https://www.lacks.com/about-us (company-reported). Quotes captured in lacks-about-us-capture-2026-08-21.md.
- The SAME page says "The company celebrates its 89th anniversary this year" (=2024) — live demonstration that the cited source itself carries stale time-bound counts; store count "ten stores and a clearance center", awards through 2022 — all stale-prone.
- RGVision Magazine "85 Years of Lacks" 2020-04-29 corroborates the narrative but quotes Lacks' communications director and CMO → company-sourced, not independent.
- No independent (non-company-sourced) corroboration found by the lead for the Mission/3-years or civic-service claims; 1935 founding + family ownership are widely repeated but still trace to company materials.

## Empirical layout (Playwright, prototype served on 127.0.0.1:8163, DPR 2)
Landscape 1194×748 (the MOUNTED orientation per device matrix):
- Q1: rail 688–743 (fits by 5px); docScrollH 779 > 748 → page already overflows.
- Q2 (mattress_size, 6 options): rail 745–800 → BELOW THE FOLD; docScrollH 836.
- Q3 (partner_sleep): rail 688–743 fits.
- Q5 after solo skip (sleep_position): rail 688–755 → clipped.
- ES: rail 688–755 → second line clipped (screenshot rail_landscape_1194x748_es.png).
- WCAG 1.4.12 text spacing: rail 826–925 → fully below fold.
- Without the rail (≈95px incl. margin/padding/border) Q2 would fit: 836−95 = 741 < 748 → the rail is the element that introduces scrolling to the quiz at the mounted orientation.
Portrait 834×1108: rail always fully visible (658–745 range), no overflow.
200% zoom equivalent (597×374): rail 855–967 on a 993px page → far below fold (expected; whole quiz scrolls).
Forced colors: renders with CanvasText (screenshot rail_forced_colors.png).
Contrast (computed from live styles): text rgb(104,92,77) #685C4D on #F4EFE6 → 5.7:1 (AA pass, AAA fail); label rgb(47,39,30) → ~12:1; source line is 12px (small for a kiosk viewed at arm's length).
Content relevance observation: "Three years after the McAllen store opened, a second Lacks location followed in Mission." appears under "How do you usually sleep?" — no semantic relation to the question; reads as a non sequitur.


---

<!-- ===== SECTION 2: agent1-trust-behavior.md ===== -->

# Agent 1 — Customer Trust & Behavior: should the DreamFinder quiz show Lacks facts / anecdotes / explanations during the questions?

Prepared 2026-08-21. Independent investigation; no other agents' work consulted. Every claim is tagged **[SOURCED]** (a cited document says it) or **[INFERENCE]** (my judgment applied to this kiosk). Source currency was checked on 2026-08-21; foundational papers are old but remain the standard references and none has been retracted or superseded in a way that reverses the finding cited.

Context facts I verified myself, read-only, in the repo (not edited): the landing screen already renders the heritage line twice before question 1 — `voice.eyebrow` ("FAMILY-OWNED · SOUTH TEXAS · SINCE 1935", `index.html:13677`) and `text.heritage` (`index.html:13702`, same wording). Any in-quiz heritage content is therefore *additional* exposure, not first exposure.

Lacks facts I could confirm from public sources (no embellishment; lacks.com/about-us returned HTTP 429 to my fetcher twice, so the About-page wording below comes from the search-engine excerpt of that page and must be re-verified against the live page by the owner before any of it ships): founded 1935 by Sam Lack in downtown McAllen as an auto-parts store; pivoted to household goods during WWII rationing, then furniture; today family-owned and operated, nine showrooms from Laredo to Brownsville ([lacks.com/about-us](https://www.lacks.com/about-us)); fourth-generation leadership, Galleria concept mid-1990s ([RGVision, 2020-04-29](https://rgvisionmagazine.com/85-years-of-lacks/)).

---

## 1. Summary conclusion

**Heritage and anecdote content shown *during* the questions does not build JUSTIFIED trust in the recommendation, and under realistic conditions it slightly reduces it.** It can raise affective brand trust (heritage → brand trust/credibility is a real, sourced effect), but that job is already done twice on the landing screen, and it speaks to only one of the seven trust outcomes the business cares about (credible, established company). It says nothing about why questions are asked, how recommendations are produced, how answers are used, what the quiz cannot know, or whether the specialist handoff is optional — which are the outcomes a questionnaire is uniquely positioned to earn.

What earns justified trust *inside* a questionnaire is, in order of evidence strength: (1) a one-line, factual "why we ask / how this is used" statement attached to the question it explains; (2) a single, exact statement of data handling placed once (not repeated) and worded to match actual behavior; (3) an honest statement of what the quiz cannot assess; and (4) on the results and handoff screens, explanations that let the customer *evaluate* the recommendation rather than be sold it, with the next step visibly under their control.

Conditions under which heritage/anecdote content reduces trust (all sourced in §2): when it is repeated (the wear-out/tedium phase begins around the fourth exposure, and the app is already at two before question 1); when it is recognized as advertising dressed as editorial content (persuasion-knowledge activation → discounting and detachment); when it splits attention from the question and raises extraneous load on the answers that drive scoring (satisficing → worse answers → worse matches → trust loss downstream); when it is personalized to the customer's answers without a utility justification (personalization reactance, "creepiness"); when any fact is wrong, unverifiable or stale (credibility depends on verifiability); and when it substitutes for a real explanation (placebic explanations raise *felt* trust without raising *informed* trust — the opposite of the stated goal).

Bottom line: **recommend NOT building the per-question heritage aside.** Keep heritage on the landing screen (and optionally once on the handoff screen, where it supports trust in the store and the human specialist, which is where heritage is actually relevant). Spend the in-quiz real estate on process transparency and limitation honesty instead. Confidence: moderate-high for "do not add heritage mid-quiz"; moderate for the specific alternatives, because the kiosk-specific literature is thin and the strongest studies are from adjacent domains (web forms, online recommenders, advertising).

---

## 2. Evidence table

| # | Claim | Source (link, date) | Strength | What it implies for this kiosk |
|---|---|---|---|---|
| 1 | Consumers hold "persuasion knowledge"; once a message is recognized as a persuasion attempt they discount it and may disengage (the "detachment" response). | Friestad & Wright, *J. Consumer Research* 21(1), 1994 — [OUP](https://academic.oup.com/jcr/article-abstract/21/1/1/1853712) | Strong (foundational; thousands of citations) | Brand-history snippets inside a "neutral" quiz are a persuasion attempt in a non-persuasion frame. If recognized as such, the *quiz itself* gets re-tagged as marketing, undermining outcome (2) "acts in my interest". |
| 2 | When an ulterior motive is accessible, even cognitively busy consumers use persuasion knowledge and rate the agent as less sincere (flattery study). | Campbell & Kirmani, *JCR* 27(1), 2000 — [OUP](https://academic.oup.com/jcr/article-abstract/27/1/69/1791556) | Strong | A sales floor makes the selling motive highly accessible. Warm company stories in that setting read as flattery/selling, not information. |
| 3 | Native advertising: readers struggle to recognize brand content presented as editorial; when disclosure makes them recognize it, evaluations of the brand and publisher fall. | Wojdynski & Evans, *J. Advertising* 45(2), 2016 — [Semantic Scholar](https://www.semanticscholar.org/paper/Going-Native:-Effects-of-Disclosure-Position-and-on-Wojdynski-Evans/f6b49ed8e67a2f288101dfdfee5f6e794f0afdfa) | Moderate-strong | A rail titled "From the Lacks story" is editorial framing for brand content. Either it goes unrecognized (no justified trust gained) or it is recognized (evaluation drops). Neither path produces *justified* trust. |
| 4 | Psychological reactance: a perceived threat to freedom produces anger + counter-arguing; controlling/pushy language reliably (if modestly) reduces persuasion. | Brehm 1966; Rains meta-analysis, *Human Communication Research* 39, 2013 — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1468-2958.2012.01443.x) | Strong (meta-analytic) | Anything that feels like steering toward a purchase or toward the salesperson triggers reactance. Visible customer control over the next step is the antidote (see #21). |
| 5 | Highly personalized messages provoke "personalization reactance" when the fit is not explicitly justified — mainly for customers who see low utility in the service. | White, Zahay, Thorbjørnsen & Shavitt, *Marketing Letters* 19, 2008 — [Springer](https://link.springer.com/article/10.1007/s11002-007-9027-9) | Moderate-strong | Answer-aware *anecdotes* (low utility) are the worst case. Answer-aware *usage explanations* ("because you sleep hot, we weight cooling materials") are justified fit and fall on the safe side. |
| 6 | Personalization–privacy paradox: personalization raises response, but covert information use raises vulnerability and cuts response unless trust-building cues are present. | Aguirre, Mahr, Grewal, de Ruyter & Wetzels, *J. Retailing* 91(1), 2015 — [Maastricht OA PDF](https://cris.maastrichtuniversity.nl/ws/files/65443620/mahr_2015_unraveling_the_personalization_paradox.pdf) | Strong | The quiz collects overtly, which is the good case. Keep it that way: every use of an answer should be visibly traceable to the question that collected it. |
| 7 | "Creepiness" arises when personalization is appraised as *ambiguous* and *intrusively surveilling*, producing uneasiness then reactance; skeptical consumers are more susceptible. | Petrova, Malär, Hoyer & Krohmer, *Psychology & Marketing*, online 2025-12-04 / print April 2026 — [Wiley](https://onlinelibrary.wiley.com/doi/10.1002/mar.70089) (abstract via Crossref) | Moderate (recent, peer-reviewed; I could read only the abstract) | Ambiguity is the trigger. Content that reacts to an answer without saying *why* ("Families like yours…") is ambiguous by construction. Content that is explicit about the mapping is not. |
| 8 | Privacy cues that are *inversely* related to objective risk drive disclosure; explicit confidentiality assurances can *reduce* willingness to answer because they make privacy concern salient. | John, Acquisti & Loewenstein, *JCR* 37(5), 2011 — [CMU PDF](https://www.cmu.edu/dietrich/sds/docs/loewenstein/StrangersPlane.pdf) (full text read), citing Frey 1986 and Singer, Hippler & Schwarz 1992 | Strong (4 experiments) | A privacy line is still worth having for *integrity* (it must exist and be exact), but it should appear once, be factual rather than reassuring, and not be repeated next to every question — repetition cues concern, especially at the health-conditions question. |
| 9 | Explaining *why* a field is required sharply reduces refusal/false entry; 14% abandon when a phone field is required without explanation; short inline explanations fix it. | Baymard Institute, orig. 2020-03-16, updated 2025-07-29 — [baymard.com](https://baymard.com/blog/explain-phone-number-field) | Moderate (large-N usability testing, commercial research firm) | Direct support for per-question "why we ask" lines, phrased as one short sentence near the question. |
| 10 | Government form research: "on every question page you should make sure it's clear to users why you're asking each question"; one thing per page; hint text one short sentence; avoid distracting page furniture. | GOV.UK Design System, *Question pages* pattern (undated page; maintained) — [design-system.service.gov.uk](https://design-system.service.gov.uk/patterns/question-pages/) | Moderate (practice guidance grounded in repeated user research, not a single study) | Supports "why we ask" per question and argues *against* decorative/unrelated content on the question screen. |
| 11 | Split-attention: forcing users to integrate spatially or semantically separate information sources imposes extraneous cognitive load and degrades task performance. | Chandler & Sweller, *Brit. J. Educational Psychology* 62, 1992 — [Wiley](https://bpspsychub.onlinelibrary.wiley.com/doi/abs/10.1111/j.2044-8279.1992.tb01017.x) | Strong (replicated effect within CLT) | An unrelated history sentence on the question screen is a second information source with no integration value — pure extraneous load, magnified for second-language readers. |
| 12 | Under cognitive burden respondents "satisfice": pick the first acceptable option, fail to differentiate, answer randomly — lowering data quality. | Krosnick, *Applied Cognitive Psychology* 5, 1991 — [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/acp.2350050305) | Strong | The quiz answers *are* the scoring inputs. Anything that nudges toward satisficing on firmness/position/issues degrades the recommendation, and a wrong-feeling recommendation is the single biggest trust destroyer (#14). |
| 13 | Banner blindness: users have learned to ignore peripheral, ad-like elements (bottom, side); the decision not to look is made pre-attentively. | NN/g, *Banner Blindness Revisited* 2018 and original eyetracking overview — [nngroup.com](https://www.nngroup.com/articles/banner-blindness-original-eyetracking/) | Moderate-strong | A "quiet aside below Back/Next" sits exactly where banner blindness operates. Most customers will not read it — so it cannot build trust — while the ones who do read it bear the costs in #1–#3 and #11. |
| 14 | Transparency moderates trust only when expectations are violated (e.g., a worse-than-expected outcome); procedural explanation restored trust, but *more* outcome detail eroded it again. Balanced, not maximal, transparency. | Kizilcec, CHI 2016 — [ACM](https://dl.acm.org/doi/10.1145/2858036.2858402) (full text read) | Moderate-strong (field experiment, N≈100) | Explanations pay off precisely when a customer thinks "that's not what I expected" at results. Put a *procedural* explanation (what counted most) on the results screen; do not dump raw scores. Heritage content does nothing for this moment. |
| 15 | Placebic explanations ("we need these details because they are necessary for the algorithm") raised perceived trust about as much as real explanations (N=30 lab study). | Eiband, Buschek, Kremer & Hussmann, CHI EA 2019 — [ACM](https://dl.acm.org/doi/10.1145/3290607.3312787) (full text read) | Weak-moderate (small N, exploratory) | A warning, not a recipe: hollow "why we ask" text *will* move the trust needle, which makes it easy to fake. Justified trust requires the explanation to carry real information about how the answer is used. |
| 16 | Explanations should help users *assess* item quality (satisfaction), not *convince* them (promotion); positively biased explanation formats cause overestimation that later disappoints. | Bilgic & Mooney, Beyond Personalization workshop 2005 — [PDF](https://grouplens.org/beyond2005/full/bilgic.pdf); Tintarev & Masthoff, *UMUAI* 2012 — [Springer](https://link.springer.com/article/10.1007/s11257-011-9117-5) | Moderate-strong | The Sleep Brief and match reasons should be written to let the customer disagree ("firmness counted most; you can override") rather than to close. Heritage framing is promotion-type by nature. |
| 17 | Trust in a recommender is driven by perceived competence and the ability to explain; organization-based explanation interfaces raised trust, return intention and lowered effort. | Pu & Chen, *Knowledge-Based Systems* 20(6), 2007 — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0950705107000445) | Strong (for recommender trust) | Competence signals belong to the *engine's* behavior and explanations, not to the store's age. |
| 18 | Trust = willingness to be vulnerable, driven by ability, benevolence, integrity; integrity matters most early, benevolence grows with experience. | Mayer, Davis & Schoorman, *AMR* 20(3), 1995 — [JSTOR](https://www.jstor.org/stable/258792); e-commerce operationalization McKnight, Choudhury & Kacmar, *ISR* 13(3), 2002 — [INFORMS](https://pubsonline.informs.org/doi/10.1287/isre.13.3.334.81) | Strong | Heritage speaks weakly to ability (longevity ≈ competence) and not at all to benevolence or integrity *of the quiz*. "Why we ask", exact privacy wording and admitted limits are integrity signals; customer control is a benevolence signal. |
| 19 | Brand heritage positively affects brand trust, credibility and perceived value. | Wiedmann, Hennigs, Schmidt & Wuestefeld, *J. Brand Management* 19, 2011 — [Springer](https://link.springer.com/article/10.1057/bm.2011.36) | Moderate (survey-based, single industry per study) | Heritage is worth stating — once, where brand trust is the question (landing, handoff). It is not evidence that heritage transfers to *algorithm* trust; no study I found tests that transfer. |
| 20 | Repetition: wear-in then wear-out (two-factor theory); negative repetition-related thoughts dominate from roughly the fourth exposure; mere-exposure liking is inverted-U and is larger for brief/unattended exposures than for consciously processed ones. | Cacioppo & Petty 1979 / Rethans, Swasy & Marks, *JMR* 1986 — [Sage](https://journals.sagepub.com/doi/10.1177/002224378602300106); Bornstein, *Psych. Bulletin* 106, 1989 — [ResearchGate](https://www.researchgate.net/publication/232497059_Exposure_and_Affect_Overview_and_Meta-Analysis_of_Research_1968-1987) | Strong (meta-analytic) | Two landing exposures + five in-quiz items + results/handoff mentions ≈ 8 exposures of one theme in ~4 minutes. That is squarely in the tedium zone. |
| 21 | User control over the recommendation process improves perceived accuracy, transparency, trust and satisfaction. | Jannach, Jugovac & Nunes, *Explanations and User Control in Recommender Systems*, 2019 — [PDF](https://web-ainf.aau.at/pub/jannach/files/BOOK_CHAPTER_PERSONALIZED_HCI_2019.pdf); Pu, Chen & Hu, RecSys 2011 — [ACM](https://dl.acm.org/doi/10.1145/2043932.2043962) | Moderate-strong | "Change an answer", "see all tiers", "choose what the specialist sees" are trust features. Content is not a substitute for control. |
| 22 | Two-sided messages (admitting a shortcoming) are more credible than one-sided ones; effect depends on amount/placement of negative information and voluntariness. | Eisend, *Int. J. Research in Marketing* 23(2), 2006 — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0167811606000267) | Strong (meta-analytic) | A voluntary, modest limitation ("we can't feel the mattress for you — lie on it") increases credibility. |
| 23 | Showing confidence/uncertainty helps calibrate trust case-by-case (though calibration alone does not guarantee better decisions). | Zhang, Liao & Bellamy, FAT* 2020 — [ACM](https://dl.acm.org/doi/10.1145/3351095.3372852) | Moderate | "Strong match / good match" style language, already tier-based, is the right register; avoid implying certainty the 60%-of-top rule does not support. |
| 24 | Operational transparency raises perceived value via perceived effort; it backfires when it exposes incapable, indifferent or powerless workers or feels like being watched; it helps "pretty good, not perfect" operations most. | Buell & Norton, *Management Science* 57(9), 2011 — [INFORMS](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376); Buell, *HBR* Mar–Apr 2019 — [hbr.org](https://hbr.org/2019/03/operational-transparency) | Strong (5 experiments) / Moderate (HBR synthesis; paywalled, read via summaries) | Showing the quiz's *work* ("firmness counted most; 3 of your answers pointed to cooling") is operational transparency. Showing the store's *age* is not. Note the labor-illusion effect is about perceived value, not justified trust — don't fake effort (a spinner) to exploit it. |
| 25 | Nudges (defaults) remained effective when their purpose was disclosed; no evidence that disclosure triggered reactance. | Bruns et al., *J. Economic Psychology* 65, 2018 — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0167487017307845) | Moderate | Being open about what the quiz does (e.g., "we pre-select the Gold tab") does not cost effectiveness. Transparency is cheap. |
| 26 | Web credibility: make accuracy easy to verify; show a real organization (physical address); up-front disclosure; comprehensive, current content; external validation weighs more than self-hosted testimonials. | Fogg, *Stanford Guidelines for Web Credibility*, May 2002 — [credibility.stanford.edu](https://credibility.stanford.edu/guidelines); NN/g *Trustworthiness in Web Design*, 2016-05-08 — [nngroup.com](https://www.nngroup.com/articles/trustworthy-design/) | Moderate (guideline syntheses of large studies) | Heritage facts only help if verifiable and current ("90 years" rolls over; "nine showrooms" changes). Self-authored anecdotes are the weakest credibility class. |
| 27 | Regulators: dark patterns include false urgency, disguised ads, hidden information, and obscured privacy choices; disclosures must be "difficult to miss and easily understandable". | FTC, *Bringing Dark Patterns to Light*, 2022-09-15 — [ftc.gov](https://www.ftc.gov/reports/bringing-dark-patterns-light); FTC Endorsement Guides final, 2023-06-29 — [Federal Register](https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising) | Strong (regulatory) | Nothing in the candidates is illegal, but "advertising disguised as editorial content" is a named FTC category; a "From the Lacks story" rail is closer to that line than a plain "About Lacks" label. Any customer quote/"families tell us" anecdote would be a testimonial subject to the Endorsement Guides — typicality and substantiation apply. |
| 28 | Customer-oriented (vs. selling-oriented) salesperson behavior improves customer-salesperson relationship quality; salesperson trust feeds trust in the firm. | Saxe & Weitz, *JMR* 19, 1982 — [Sage](https://journals.sagepub.com/doi/abs/10.1177/002224378201900307); Doney & Cannon, *J. Marketing* 61(2), 1997 — [Sage](https://journals.sagepub.com/doi/10.1177/002224299706100203) | Strong | The handoff screen should frame the specialist as a resource the customer directs, and the store's heritage is most useful *there*, attached to the human. |

---

## 3. Inferences (my judgment; each labeled)

- **[INFERENCE] The seven trust outcomes map onto ability/benevolence/integrity, and heritage touches only ability.** Outcome (1) is ability/reputation; (2), (5), (7) are benevolence; (3), (4), (6) are integrity/transparency. Heritage content addresses (1) only, which the landing screen already covers. The in-quiz surface is the only place outcomes (3), (5) and (6) can be earned *at the moment the vulnerability occurs* (answering).
- **[INFERENCE] Exposure arithmetic puts the prototype into wear-out.** Two landing exposures (verified in code) + five in-quiz items + any results/handoff mention → 7–8 presentations of the same theme in a 3–5-minute session. Two-factor theory (#20) places the tedium crossover near the fourth exposure for a single message; a *theme* is more tolerant than a verbatim message, but five distinct history sentences are still five processing demands with no task payoff.
- **[INFERENCE] The showroom makes the selling motive maximally accessible (#2).** Customers are standing in a store, often with a specialist nearby, about to be handed to that specialist. Heritage copy in this setting is processed as "the store talking about itself", not as background information. The same sentence on the company website would be benign.
- **[INFERENCE] Banner blindness makes the quiet-footer variant mostly inert, and inertness is not neutral.** Most customers won't read it (#13), so it cannot build trust; it still costs bilingual copy maintenance, a freshness obligation (facts change), and a small but real split-attention tax for those who do read it — concentrated on second-language readers and older customers.
- **[INFERENCE] Second-language load matters here specifically.** The quiz is EN+ES and Spanish copy is still marked provisional in this repo. Extra prose per question is extra translation surface and extra reading load for exactly the customers for whom the business most wants a dignified, low-friction experience.
- **[INFERENCE] The worst-case failure is indirect.** Heritage content doesn't lower trust much by itself; it lowers trust by (a) nudging satisficing on the firmness slider or sleep-issues question, producing a worse match, and (b) pre-loading a "this is marketing" frame so that when the match feels off, the customer attributes it to motive rather than to noise. Both are plausible, neither is directly measured in the literature for kiosks.
- **[INFERENCE] Placebic "why we ask" is the real design risk for the alternative I recommend.** Because hollow justifications move felt trust (#15), the content discipline must be: each "why we ask" line names the *mechanism* (what changes in the recommendation because of this answer). If the honest answer is "nothing changes", the question should not be asked — which is also what GOV.UK's question protocol says (#10). (For reference: the owner already removed two zero-scoring questions in August 2026 on exactly this logic.)
- **[INFERENCE] Privacy wording must be checked against the wipe semantics before it is written.** Answers are session-only, but they persist until Restart/timeout/"Start New Customer", and saved picks are shown to the specialist on the handoff screen. "Cleared when you finish" would be inexact; "Your answers stay on this tablet, are used only to build your matches, and are cleared for the next customer" is exact today (demo mode, no email). If email capture is later enabled, the line must change in the same commit.

---

## 4. Assessment of each candidate presentation

| Candidate | Verdict | Reasoning (evidence #) |
|---|---|---|
| **Background / watermark heritage content** | Reject | Either unread (banner blindness #13) or read as décor/advertising (#1, #3). Contrast/forced-colors burden; zero informational value; persistent low-level repetition (#20). |
| **Quiet footer / rail after the controls (the current prototype)** | Reject | Mostly unread (#13); when read, it is extraneous (#11) and motive-accessible (#2); five items → wear-out (#20); "From the Lacks story" is editorial framing of brand content (#3, #27). Offers nothing toward outcomes 3–7. |
| **Beside the question (same visual block)** | Reject for heritage; **adopt for "why we ask"** | Proximity is correct *only* for content that must be integrated with the question (#11). Heritage beside a question is the maximal split-attention case. A one-sentence usage note beside the question is the best-supported pattern (#9, #10). |
| **One heritage fact per question** | Reject | Ten exposures; strongest wear-out and satisficing risk (#12, #20); encourages reading instead of answering. |
| **One heritage fact per chapter (3–4 chapter intros)** | Weak reject | Fewer exposures, but still heritage in the task stream. A chapter intro is valuable if it is *process* content ("Next: how you sleep — 3 questions; these set your firmness target") — that is adopt-able, the history is not. |
| **Rotating / carousel facts** | Reject | Motion is distraction; rotation suggests content is filler; unverifiable which fact a customer saw (testing and a11y problem); carousels are a classic ignored pattern. Stable content beats rotating (see §8). |
| **Answer-aware anecdotes ("Valley families tell us they sleep hot too")** | Reject firmly | Personalization without utility justification → reactance (#5); ambiguity + surveillance appraisal → creepiness (#7); any "families tell us" claim is a testimonial under the Endorsement Guides (#27) and has no data source in this repo. Highest downside of all candidates. |
| **Answer-aware *usage* explanations ("Because you chose side sleeping, pressure relief counts more")** | Adopt (carefully) | This is overt, justified personalization (#5, #6) and real operational transparency (#24). Must be true of the engine (ties to `opt.scores` tags) — never placebic (#15). Already partially present via `copyVariants`; extend only where the mechanism is real. |
| **Process-only (how the quiz works, no heritage)** | Adopt | Directly earns outcomes 3 and 4; procedural transparency is what restores trust on expectation violation (#14); does not cost effectiveness (#25). Keep it to a sentence per question plus one results-screen paragraph — balanced, not maximal (#14). |
| **Privacy/data-use only** | Adopt, once | Required for integrity (outcomes 5, 6) and must exactly match behavior. Place once — quiz start or first sensitive question — factual, not reassuring; don't repeat per question (#8). |
| **Result explanation (Sleep Brief / match reasons)** | Adopt and tune | Highest-leverage location (#14, #16, #17). Write for assessment, not promotion; name what counted most, what was ignored (price, feel), and how to override; add a modest limitation (#22, #23). |
| **Combination: heritage + process** | Conditional | Acceptable only if heritage is confined to landing (existing) and optionally one line on the handoff screen attached to the specialist ("Lacks has been family-owned in South Texas since 1935 — your specialist can…"). Any mixing *within the question stream* inherits the heritage failure modes. |
| **NONE (no added content during questions)** | Acceptable baseline; better than the prototype | Given GOV.UK's "why we ask" guidance (#10) and the Baymard effect (#9), "none" leaves a sourced improvement on the table, but it is strictly safer than heritage-in-stream. If only one change is possible, do the results-screen explanation rather than anything in-quiz. |

---

## 5. Failure modes (trigger → customer symptom → mitigation)

1. **Marketing re-frame.** *Trigger:* customer reads a second or third "since 1935" item while answering. *Symptom:* "This is an ad, not a tool" — discounting of the eventual recommendation, shorter time at results, earlier disengagement (#1, #2, #3). *Mitigation:* keep heritage off the question screens; one landing exposure is sufficient; label any About-type content plainly ("About Lacks"), never as a story rail.
2. **Satisficing on scoring inputs.** *Trigger:* extra prose on the firmness-slider or sleep-issues screen, especially in Spanish. *Symptom:* customer leaves the slider at default or taps the first plausible issue; the match feels wrong at results; blame lands on the quiz (#11, #12). *Mitigation:* no non-task text on high-weight questions; if a "why we ask" line is added, one sentence, below the options, same language register as the question.
3. **Creepy personalization.** *Trigger:* content that visibly reacts to a sensitive answer (health conditions, body type) without stating the mechanism. *Symptom:* "Why is it saying that to me?"; reluctance to answer subsequent questions honestly; reactance toward the handoff (#5, #7). *Mitigation:* any answer-aware text states the mapping explicitly and serves the recommendation; never anecdotal, never about other customers.
4. **Placebic transparency.** *Trigger:* "why we ask" text written by copywriters rather than derived from the engine ("This helps us personalize your results"). *Symptom:* customer feels informed but is not; on an off-match the explanation can't be reconciled with what they see → sharper trust drop than with no explanation (#14, #15). *Mitigation:* each line names a concrete effect tied to a scoring tag; validator rule that every `whyWeAsk` references at least one real `scores` tag; an owner review that asks "is this sentence true of the engine?"
5. **Privacy promise drift.** *Trigger:* a data-use line written for demo mode survives a later enablement of email/lead capture or a GAS endpoint. *Symptom:* the promise is false; a customer who later receives email feels deceived (integrity breach, also FTC deception exposure) (#8, #27). *Mitigation:* the privacy string lives in store-config next to `gasUrl`; a validator fails the build if `gasUrl` is non-blank while the copy says nothing leaves the tablet.
6. **Stale or unverifiable facts.** *Trigger:* "nine showrooms", "90 years", leadership names, or an anecdote that the About page no longer states. *Symptom:* a local customer who knows better ("they closed that store") discounts everything else (#26). *Mitigation:* if any heritage fact is shown anywhere, source it to the live About page with a `verifiedAt` date and treat it like financing facts (freshness-gated); avoid numbers that roll over.
7. **Handoff read as sales pressure.** *Trigger:* results screen content that frames the specialist as the next mandatory step, or heritage copy positioned as "trust us, now buy". *Symptom:* reactance — customer abandons before the handoff or withholds picks (#4, #28). *Mitigation:* explicit optionality and customer control ("Show these to a specialist" as one of several equal actions; customer chooses what is saved); specialist framed as customer-oriented help, not closer.

---

## 6. Ranked recommendations (impact on JUSTIFIED trust)

1. **Tune the results-screen explanation for assessment, not promotion, and add one honest limitation.** Name what counted most (firmness target, then matched features), what the quiz does *not* know (price, feel, how the bed is on the floor), and how to change an answer. Evidence #14, #16, #17, #22, #23. **Confidence: high** that this is the highest-leverage location; moderate on the exact wording effect size.
2. **Add a one-sentence "how this answer is used" line to each question, derived from the engine.** Short, factual, tied to a real scoring tag; no marketing verbs. Omit on any question where the honest answer is "it doesn't change the match" (or reconsider the question). Evidence #9, #10, #15. **Confidence: moderate-high.**
3. **Add one exact data-use sentence, once.** At quiz start (or immediately before the first sensitive question), phrased to match wipe/handoff behavior; validator-linked to `gasUrl`. Evidence #8, #18, #27. **Confidence: moderate** (integrity value is clear; disclosure-volume effects are mixed, which is fine because disclosure volume is not the goal).
4. **Make customer control over the handoff explicit.** Equal-weight actions at results; the customer picks what the specialist sees; specialist framed as help on request. Evidence #4, #21, #28. **Confidence: moderate-high.** (Largely already the design — verify the copy doesn't undercut it.)
5. **Do not add heritage content to the question screens; leave the landing exposures as they are.** Optionally allow one heritage sentence on the handoff screen, attached to the human specialist, sourced and freshness-dated. Evidence #1–#3, #11–#13, #19, #20. **Confidence: moderate-high** that in-stream heritage is net-negative-to-neutral; moderate that a single handoff mention is net-positive.
6. **Chapter intros as process content, if chapters are introduced at all.** "Next: your body and position — 3 questions. These set your firmness target." No history. Evidence #10, #14. **Confidence: moderate.**
7. **Measure before deciding anything further** (see §9): a 6–8 item post-quiz card, randomized between the current build and a process-transparency build, will settle most of the remaining uncertainty at low cost. **Confidence: high that measurement is worthwhile.**

---

## 7. "Do not build" list

- A per-question or per-pair heritage aside (the current prototype) or any "From the Lacks story" editorial rail inside the question stream.
- Background/watermark or rotating/carousel facts.
- Answer-aware anecdotes, "customers like you" lines, or any implied testimonial ("families tell us…") — no data source exists and it is Endorsement-Guides territory.
- Placebic justifications ("to personalize your experience") — every "why we ask" must name a real mechanism.
- A privacy line repeated next to every question, or any privacy line that is not literally true of the current build (e.g., "nothing is stored" while the handoff screen shows saved picks).
- A fake "calculating…" effort display to exploit the labor illusion; it is perceived value via theatre, not justified trust.
- Numbers that roll over ("90 years", "nine showrooms") anywhere in the app without a freshness gate.
- Heritage or history text in the dict files or `index.html` — it is retailer copy and belongs in `store-config.text/text_es` if it exists at all (white-label rule).
- Any urgency, scarcity or "specialist is waiting" framing around the handoff.

---

## 8. Test of the proposed design principles

| Principle | Verdict | Evidence / reasoning |
|---|---|---|
| Specific modest facts > generic praise | **Agree** | Verifiability and up-front disclosure drive credibility (#26); generic praise trips persuasion knowledge (#1, #2). Caveat: "specific" must still be *relevant* to the task at hand, or it is extraneous load (#11). |
| Operational transparency > heritage copy | **Agree** (for justified trust in the *recommendation*) | Showing the work raises perceived effort and value (#24) and procedural explanation repairs trust on expectation violation (#14); heritage affects brand trust only (#19) and no source shows transfer to algorithm trust. Conditional: transparency must be balanced, not exhaustive (#14). |
| Stable content > carousel | **Agree** | Carousels/rotation are ignored and increase load; banner blindness (#13); split attention (#11); unverifiable what was seen. [INFERENCE] for the kiosk specifically — no carousel-in-questionnaire study found. |
| Answer-personalized anecdotes feel targeted | **Agree** | Personalization reactance when fit is unjustified and utility low (#5); ambiguity + surveillance → creepiness (#7). Distinguish from answer-aware *usage* explanations, which are justified and overt (#5, #6). |
| Privacy promise valuable only if it exactly matches behavior | **Agree, and add: it can also suppress honest answers** | Integrity requires exactness (#18, #27); assurances cue concern and can reduce disclosure (#8). So: once, exact, factual. |
| Explaining recommendations > explaining history | **Agree** | #14, #16, #17 vs. #19. The results screen is where trust is tested. |
| Admitting limitations increases justified confidence | **Agree (conditional)** | Two-sided messages raise credibility when the negative is modest, voluntary and not about the core attribute (#22); uncertainty display helps calibration (#23). Don't overdo it — a long list of caveats reads as hedging. |
| Customer control over next step reduces sales resistance | **Agree** | Reactance is about threatened freedom (#4); control raises trust in recommenders (#21); customer-oriented selling builds relationship quality (#28). |
| Repeating "since 1935" feels promotional | **Agree** | Two-factor/wear-out and mere-exposure inverted-U (#20); motive accessibility in a store (#2). The app is already at two exposures before question 1. |
| Source label helps only if the source is meaningful | **Agree, with a twist** | Verifiability helps (#26), but a kiosk customer cannot follow a link, and self-sourced ("source: our own About page") adds nothing independent; an external source (a dated news article) would carry more weight (#26) but is still heritage-in-stream. In practice the label is a governance tool (freshness, auditability) more than a customer-facing trust signal. |

---

## 9. Suggested post-quiz trust measurement items

Short card, 5-point agree/disagree, ≤8 items, EN now, ES after native review (consistent with this repo's provisional-Spanish status). Map each to the seven outcomes. Sources for derivation are given; wording is adapted, not verbatim, so it fits a kiosk.

| # | Item (EN) | Outcome | Derived from |
|---|---|---|---|
| T1 | "I understood why each question was asked." | 3 | ResQue *transparency/control* construct — Pu, Chen & Hu, RecSys 2011 ([ACM](https://dl.acm.org/doi/10.1145/2043932.2043962)) |
| T2 | "I understand how my matches were chosen." | 4 | ResQue *transparency*; Kizilcec 2016 procedural-understanding item |
| T3 | "The quiz was working in my interest, not just trying to sell me something." | 2 | McKnight et al. 2002 *benevolence* trusting belief ([INFORMS](https://pubsonline.informs.org/doi/10.1287/isre.13.3.334.81)); reverse of Campbell 1995 *inferences of manipulative intent* |
| T4 | "I felt the quiz was trying to pressure or manipulate me." (reverse-scored) | 2, 5 | Campbell, *J. Consumer Psychology* 4(3), 1995 manipulative-intent scale; Dillard & Shen 2005 state-reactance items |
| T5 | "I know what happens to my answers after the quiz." | 5, 6 | McKnight *integrity*; adapted from privacy-transparency items in Aguirre et al. 2015 |
| T6 | "The quiz was honest about what it can and can't tell me." | 6 | Two-sidedness/credibility (Eisend 2006); ResQue *trust* |
| T7 | "Talking to a specialist felt like my choice." | 7 | Perceived control / autonomy — Jannach et al. 2019; Saxe & Weitz 1982 SOCO (customer-oriented) |
| T8 | "Lacks seems like a company I can rely on." | 1 | McKnight *trusting intention/willingness to depend*; Mayer et al. *ability* |
| E1 | "How hard was it to answer the questions?" (1 very easy – 5 very hard) | load check | Paas 1992 single-item mental-effort scale |

Analysis note: compare builds (current vs. process-transparency) on T1–T7; T8 should be *flat* across builds (heritage is constant on landing) — if T8 rises only with more heritage, that is affective brand trust, not the justified trust the brief asks for. E1 guards against the satisficing failure mode; a rise in E1 with any added content is a stop signal.

---

## 10. Open questions

1. **Kiosk-specific evidence is thin.** Almost all findings come from web forms, online recommenders and advertising; I found no controlled study of side content inside an in-store tablet questionnaire. The recommendations are transfers, and §9 is the cheap way to close that gap.
2. **Does heritage transfer to algorithm trust at all?** No study tests brand-heritage → trust in a recommendation engine. Worth one A/B cell (heritage on landing vs. none) purely to learn, not to ship.
3. **Bilingual effects.** Is the split-attention cost larger in Spanish mode on this device (font size, line length)? Needs device pass with native-Spanish readers; the repo already flags Spanish as provisional.
4. **What does the specialist see, and does the customer know it?** The handoff screen shows saved picks; the exact scope (answers? only picks?) determines the wording of the data-use line. Confirm before writing it.
5. **How true can "why we ask" be per question?** Each line needs the owner/engine review described in §3 (maps to real `scores` tags). If any question cannot support a true sentence, that is a question-protocol finding, not a copy problem.
6. **Email/lead capture roadmap.** Any future enablement changes the privacy sentence; decide now that the two are coupled in config and validated together.
7. **Lacks facts freshness.** I could not fetch lacks.com/about-us directly (HTTP 429). If any heritage fact is retained anywhere, re-verify against the live page and date it, as done for financing facts.
8. **Owner intent.** If the actual goal behind the prototype is brand warmth rather than justified trust, that is a legitimate goal — but a different one, with a different best location (landing/handoff, not the questions) and a different metric (T8, not T1–T7).


---

<!-- ===== SECTION 3: agent2-ux-a11y.md ===== -->

# Agent 2 — UX, content design and accessibility: supporting content during the DreamFinder quiz

Date: 2026-08-21. Scope: the Lacks Furniture kiosk quiz (iPad Pro 11", landscape-mounted 1194×748, portrait 834×1108). Inspected read-only: `C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4\index.html` (uncommitted working tree; line numbers below are from that file), `data/quiz.json`, `incoming/dreamfinder_quiz.json`, `tools/validation.py`, `tests/quiz_presentation_check.mjs`, `docs/rebuild-roadmap.md`, `docs/kiosk-device-hardening.md`. Rendered measurements were taken with headless Chromium 151 against a loopback read-only server of that directory (nothing written there). Nothing in any git repository was modified.

Labels used throughout: **SOURCED** = backed by a linked external document or a measurement reproduced below; **INFERENCE** = my professional judgement applied to those facts.

---

## 1. Summary conclusion

**Recommendation: do not show company history, anecdotes or community stories during the ten questions.** Keep the question screen to its existing hierarchy (progress → question → one-sentence help → answers → Back/Next). The one category of supporting content that *does* belong inside the quiz is **process and data-use explanation**, and most of it already exists as the per-question `helpText` ("So every mattress we show actually fits your space"). The two gaps worth filling are (a) a single, true, one-line data-use note at the first health question — *answers are only used for today's suggestions and are not stored* — which is true by construction (roadmap Invariant 6, session is memory-only), and (b) a short "how we matched you" explanation on the results/Sleep Brief screen, where the "how recommendations are produced" trust question actually arises. Establishment facts (founded 1935, family-owned, South Texas) belong on the welcome screen and the specialist handoff, where they are read once, at rest, and can be paired with a verifiable pointer.

The working-tree prototype (`quizTrustStoryMarkup()`, an `<aside class="noct-quiz-trust">` below Back/Next with "FROM THE LACKS STORY", "Source: Lacks company history", one italic serif sentence of company history per question pair) is well-engineered — stable, not timed, not focusable, not live, config-driven, bilingual, contrast-compliant, forced-colors-aware, reflows to 320 px — but it fails on **placement** and **content fit**, not on craft:

- It sits **below the fold on the longest questions** in landscape (4 of 10 EN questions not visible without scrolling, 2 more partially; 7 of 10 under WCAG text-spacing; 10 of 10 at 200 % zoom). Its cadence is therefore, from the customer's seat, effectively random: the stories attached to the long health questions are the least likely to be seen.
- It **aggravates a pre-existing defect**: `renderQuestion()` never resets scroll, so a customer who scrolled down to reach Next lands on the next question with the headline 97 px above the viewport and the *story* fully in view — an inverted hierarchy at the exact moment of the health-condition questions (measured, §2.6).
- Its source line ("Source: Lacks company history") is **self-referential and not inspectable** on the kiosk; the `sourceUrl` in the data is never rendered. Under the NN/g and Stanford credibility literature an un-followable first-party citation is a trust *signal*, not trust *evidence*, and the all-caps-label + italic-serif treatment is exactly the "visually distinct from surrounding content" styling that triggers banner blindness.
- The anecdote shown during `sleep_issues` / `health_conditions` ("Founder Sam Lack served McAllen civic organizations…", Flesch-Kincaid ≈ grade 15) is the one moment where a data-use sentence would earn trust, and the one moment where company history reads as a non-sequitur.

If an owner ruling nevertheless requires a history line inside the quiz, the survivable form is: **one** line, on **one** question (the first), plain roman sans at ≥ 16 px, no "Source:" line unless the source can be inspected on-device, never below Next (above the nav rule or beside the help text), and a scroll-to-top fix shipped first.

---

## 2. Code findings

### 2.1 How the quiz renders (prototype `index.html`)

| Fact | Where |
|---|---|
| Question screen markup: `<div class="question-screen screen" id="questionScreen" role="region">` → `.noct-quiz` → `#questionContainer` (empty; filled by JS) | `index.html:10249-10253` |
| `window.renderQuestion` replaces `container.innerHTML` wholesale on every question *and on every answer tap* (`selectOption()` calls `renderQuestion()`) | `index.html:13403-13523`, `13605` |
| Two templates: slider (`firmness`) and option grid; both end with `${quizTrustStoryMarkup(q.id)}` **after** `.noct-quiz-nav` — the aside is the last child of `#questionContainer`, i.e. last in DOM and reading order, after the Next button | `index.html:13460`, `13518` |
| `quizTrustStoryMarkup(questionId)`: reads `window.__DF_QUIZ_TRUST_STORIES`, picks the first item whose `questionIds` contains the id, returns `''` if block/label/text/source missing. Emits `<aside aria-labelledby="quiz-trust-label-<qid>" data-trust-story-id>` → heading div (label `<span id>`, source `<span>`) → `<p>` text. All strings pass through `escapeHtml`. `sourceUrl` and `verifiedAt` are **never rendered** | `index.html:13379-13401` |
| Loader: `trustStories` is optional, fail-soft (`null` when malformed) — an older `quiz.json` cannot break the quiz | `index.html:12496-12505` |
| Navigation: `nextQuestion()` / `prevQuestion()` increment and call `renderQuestion()`; **no `scrollTo`, no focus move**. Only `showScreen()` (screen change) does `window.scrollTo(0,0)` | `index.html:13618-13665`, `13249-13250` |
| After Next, `document.activeElement` is `BODY` (measured) — the tapped button was destroyed by the rerender; the 1.2 `focusQuestionTransition` work (draft PR #39) is **not** in this tree | measured, §2.6 |
| The "re-trigger animation" block (`container.style.animation='none'; offsetHeight; ''`) is a **no-op**: `#questionContainer` has no `animation`; the `fadeUp` rule is on `.question-container` (class), which `#questionContainer` does not carry. Net effect: question transitions have no motion at all — good for reduced-motion, and the aside inherits that | `index.html:13520-13523`, `4638-4644`, `1306-1308` |
| Quiz data contract: `tools/validation.py` requires, when `trustStories` is present, exactly one story per canonical question, bilingual `text`/`sourceLabel`, plain text (no HTML), slug ids, `sourceUrl` "safe absolute https", `verifiedAt` `YYYY-MM-DD` | `tools/validation.py:2430-2509` |
| Validator gaps vs. the financing pipeline: `sourceUrl` is **not** checked against `tools/source_hosts.json`; `verifiedAt` is **not** freshness-gated (no `maxAgeDays`), and nothing fails closed if the fact is stale | same; compare `validation.py:428-443` (financing allowlist) |
| Test coverage: `tests/quiz_presentation_check.mjs` pins 5 stories × 10 questions, bilingual + https + date, "not live, timed, fixed, or focusable", no rotation on answer select, absent block ⇒ no empty rail. **No** test in `tests/contrast_check.mjs` covers `.noct-quiz-trust`; **no** viewport/fold test exists | `tests/quiz_presentation_check.mjs:268-313` |
| White-label boundary: label, copy, source all come from `quiz.json`; `index.html` contains no retailer string for this feature. ✔ | `index.html:13379-13401` |
| `html[lang]` is switched by `switchLanguage()` → WCAG 3.1.1/3.1.2 satisfied for the aside in ES | `index.html:12095` |

### 2.2 Content currently shipped (`data/quiz.json → trustStories`; canonical `incoming/dreamfinder_quiz.json:8-100`)

Label: "From the Lacks story" / "De la historia de Lacks". Five items, each mapped to a question pair that coincides exactly with the five invisible `category` chapters (Getting Started, Who's With You, About You, What You Like, What You're Solving). All five `sourceLabel`s are identical ("Source: Lacks company history"), all `sourceUrl`s are `https://www.lacks.com/about-us`, all `verifiedAt` = 2026-08-20.

| id | questions | EN chars / words | ES chars (Δ) | FK grade (EN, approx.) |
|---|---|---|---|---|
| south-texas-since-1935 | trigger, mattress_size | 77 / 12 | 81 (+5 %) | 8.8 |
| mcallen-auto-parts-origin | partner_sleep, partner_disturbance | 80 / 14 | 92 (+15 %) | 7.6 |
| mission-second-store | sleep_position, body_type | 88 / 14 | 97 (+10 %) | 10.1 |
| wartime-appliance-pivot | temperature, firmness | 101 / 17 | 119 (+18 %) | 9.8 |
| community-service-roots | sleep_issues, health_conditions | 111 / 15 | 131 (+18 %) | **15.4** |

Fact check (SOURCED, fetched 2026-08-21 from `https://www.lacks.com/about-us` — the page the data cites): all five statements are supported by that page's history section (1935 founding; auto-parts store "at the corner of Main and Beaumont in downtown McAllen"; second store in Mission "only three years after opening"; 1940s rationing and the move into household appliances; Sam Lack's service with the McAllen United Fund, Civic Center Board, Chamber of Commerce, Rotary). The source is first-party (the retailer's own site).

### 2.3 Actual CSS (consultation theme, active on `#questionScreen`)

Tokens (`index.html:1266-1277`, `:76`, `:108-109`): `--consultation-bg #F4EFE6`, `--consultation-paper #FBF7EF`, `--consultation-ink #2F271E`, `--consultation-muted #685C4D`, `--consultation-subtle #8B7B67`, `--consultation-rule rgba(104,84,60,.28)`, `--accent-ink #2F271E`, `--font-serif Georgia…`, `--font-sans -apple-system/Segoe UI…`.

`.noct-quiz-trust` (`:1508-1547`): `display:grid; grid-template-columns: minmax(150px,.26fr) minmax(0,.74fr); gap:20px; margin-top:22px; padding-top:18px; border-top:1px solid var(--consultation-rule)`.
`-label`: sans 11 px / 750 / 0.18em / uppercase / `--accent-ink`. `-source`: sans 12 px / `--consultation-muted`. `-text`: **serif 16 px italic**, line-height 1.5, `--consultation-muted`, `margin:0`.
`@media (max-width:700px)` (`:1641-1644`): single column, gap 9 px.
`@media (forced-colors:active)` (`:9653-9661`): border-top `CanvasText`; label/source/text `CanvasText`. Measured under emulation: all three resolve to `rgb(0,0,0)` — the aside stays visible and legible in Windows High Contrast. ✔
Layout container (`:1286-1291`, `:1299-1303`): `#questionScreen { height:auto; min-height:100dvh }` → the **document** scrolls (not an inner panel); `.noct-quiz { max-width:980px; padding: clamp(32,5vw,58)px clamp(28,7vw,76)px 36px }`.
No `position:fixed/sticky`, no `animation`, no `transition` on the aside. No `user-select:none` on any `.noct-quiz-*` text, so the sentence is selectable (iPad long-press shows the Copy/Look Up/Share callout — pre-existing for all quiz text, but the aside adds another paragraph of it).

### 2.4 Computed contrast (WCAG 2.x relative-luminance formula; background `#F4EFE6`)

| Element | Colour | Ratio on `#F4EFE6` | Requirement | Result |
|---|---|---|---|---|
| Story text, 16 px italic serif | `#685C4D` | **5.68 : 1** | 1.4.3 AA 4.5 : 1 (normal text) | Pass AA; fails AAA 7 : 1 |
| Source line, 12 px sans | `#685C4D` | 5.68 : 1 | 4.5 : 1 | Pass AA |
| Label, 11 px bold caps | `#2F271E` | **12.82 : 1** | 4.5 : 1 | Pass AAA |
| Rule (border-top), composited | ≈ `#CDC4B6` | 1.51 : 1 | 1.4.11 exempt (decorative separator) | n/a |
| (Reference) `--consultation-subtle` used by disabled Next | `#8B7B67` | 3.58 : 1 | — | not the aside's problem |

Contrast is **not** a defect of the prototype. Readability, not contrast, is the concern: 16 px *italic* Georgia at arm's length on a mounted tablet, in the muted (not ink) tone, reads as secondary — which is the intent — but WebAIM's caution on whole-block italics applies (§3).

### 2.5 Viewport fit (measured, headless Chromium, `has_touch`, DPR 1, partner path so all 10 questions render)

"Visible" = fully inside the first viewport with no scrolling. Landscape is the mounted orientation.

**Landscape 1194 × 748, EN, default spacing**

| Question | options | Next bottom (px) | Aside top–bottom | Aside visible? | Next visible? |
|---|---|---|---|---|---|
| trigger | 5 | 666 | 688–743 | yes (5 px spare) | yes |
| mattress_size | 6 | 723 | 745–800 | partial | yes |
| partner_sleep | 3 | 666 | 688–743 | yes | yes |
| partner_disturbance | 4 | 620 | 642–697 | yes | yes |
| sleep_position | 5 | 666 | 688–755 | partial | yes |
| body_type | 5 | 780 | 802–869 | **no** | **no** |
| temperature | 4 | 620 | 642–709 | yes | yes |
| firmness | slider | 856 | 878–945 | **no** | **no** |
| sleep_issues | 8 | 858 | 880–947 | **no** | **no** |
| health_conditions | 7 | 858 | 880–947 | **no** | **no** |

Aside fully visible on 4/10, partial 2/10, hidden 4/10. ES landscape: same pattern, aside height grows 56 → 67 px on 3/5 stories (second line); on `trigger`/`mattress_size` the ES aside ends at 743 px of 748. Note: the **Next button is already below the fold on the same four questions without the aside** (the aside is after Next, so it never pushes Next down); the `quizColsClass` comment at `:1369-1373` records this as an accepted owner trade-off.

**Landscape with WCAG 1.4.12 text spacing** (line-height 1.5, letter 0.12em, word 0.16em, paragraph 2em): aside height 99–123 px; visible on 0/10, partial 3/10, hidden 7/10. Next hidden on 7/10. No content loss — 1.4.12 passes — but the aside is practically never seen.

**Landscape at 200 % zoom (597 × 374 CSS px, WCAG 1.4.4)**: document heights 759–1316 px; aside hidden on 10/10, Next hidden on 10/10. Layout collapses to one column, no horizontal scroll (`scrollWidth == 597`). Passes 1.4.4/1.4.10; the aside simply becomes a third-screenful footer.

**Portrait 834 × 1108**: everything fits on every question in EN and ES, with and without text spacing (max aside bottom 1048 px). Portrait 200 % (417 × 554): aside hidden on 10/10.

**Reflow 320 × 256 (WCAG 1.4.10)**: `scrollWidth == 320`, aside single-column 276 px wide. Pass.

### 2.6 Defects found (ordered by severity)

**D1 — Scroll carry-over between questions (pre-existing root; materially worsened by the aside).** `renderQuestion()` replaces the container but never scrolls; only `showScreen()` does. Reproduced: on `sleep_issues` in landscape the customer must scroll 235 px to reach Next (docH 983). After tapping Next, `health_conditions` renders at the same `scrollY = 235`: eyebrow at −177 px, **headline at −97 px (off-screen)**, the story fully in view at 645–712 px, focus on `BODY`. Without the aside the document would be 894 px, max scroll 146, and the headline would sit at −8 px — still clipped, but the aside turns a sliver into a full inversion where the *supporting* content is the first thing read and the *question* is not on screen. Screenshot: `scratchpad/shots/carry_after.png`. Fix regardless of the aside decision: `window.scrollTo(0,0)` (or scroll the headline into view) inside `renderQuestion()` on question change (not on answer-select rerenders, where `preventScroll` focus restoration is deliberate), ideally combined with the PR #39 focus-on-headline transition.

**D2 — Cadence is invisible and effectively random.** Stories change per *chapter* (pairs of questions matching the data `category`), but the chapter is never shown (eyebrow is "Question n · of 10"), and §2.5 shows the aside is below the fold on precisely the long questions. A customer sees a story on Q1, Q3, Q4, Q7 and nothing on Q6, Q8, Q9, Q10 — there is no perceivable rule, which undermines the "stable, governed" intent.

**D3 — Content/moment mismatch.** The civic-service anecdote (grade-15 reading level, the longest of the five, 131 ES chars) is attached to the two health-disclosure questions. No data-use statement exists anywhere in the quiz (the only privacy copy is on the email screen, `store-config.json` text.emailPrivacy / privacyBody). The strongest *justified*-trust statement available — answers are held in memory only and never stored (Invariant 6) — is not made at the moment it matters.

**D4 — Source line is a signal the customer cannot check.** "Source: Lacks company history" names the retailer as the authority on itself and offers no way to inspect it; `sourceUrl` is unrendered and un-allowlisted; `verifiedAt` is unrendered and un-gated. Honest as far as it goes, but a citation that cannot be followed risks reading as decoration — and a reader who notices that it is *always the same source line on every question* will discount it.

**D5 — Ad-pattern styling.** Letter-spaced all-caps micro-label + italic serif + rule-separated block at the page foot is the "visually distinct / fancy formatting / traditional ad position" triad in NN/g's banner-blindness findings (§3). The prototype's own CSS comment says the aside must "never [be] a competing prompt"; the styling achieves that so well that it is likely to be skipped entirely.

**D6 — No automated coverage of colour or fit.** `contrast_check.mjs` does not assert the aside; no test asserts the aside is visible on any viewport or that Next is reachable. The 5.68 : 1 figure above is the first measurement of the shipped colour.

**D7 (minor) — Size at kiosk distance.** 11 px label / 12 px source at arm's length on a mounted tablet is below every other body-text size on the screen (help text 15 px, options 21/15 px). Pass for WCAG; weak for a standing reader (NN/g large-touchscreen guidance, §3).

**D8 (minor) — Selectable text.** Long-press on the sentence raises the iOS text callout; with Guided Access not yet proven on the device (`docs/kiosk-device-hardening.md:106-123`), "Share"/"Look Up" are small escape paths. Pre-existing across the quiz, slightly enlarged by the aside.

---

## 3. Evidence table

| # | Finding | Source (link, date) | Strength | Implication for this decision |
|---|---|---|---|---|
| E1 | Content that "starts automatically" and updates "in parallel with other content" needs pause/stop/hide; changes that are "the direct result of a user's intentional activation" are out of scope | [W3C Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), updated 2026-06-28, Level A | Normative | Any timed rotation/carousel of facts fails A unless it has a pause control; content that changes only when the customer taps Next is exempt. The prototype's per-question swap is compliant; a ticker would not be. |
| E2 | Auto-forwarding carousels: item visible only 20 % of the time; users treat moving things as ads; "show a new panel only when users ask for it" | [NN/g, Auto-Forwarding Carousels and Accordions Annoy Users](https://www.nngroup.com/articles/auto-forwarding/), Nielsen, 2013-01-19 | Usability study, old but repeatedly reaffirmed | Rules out rotation/carousel presentations outright. |
| E3 | Users ignore content that looks like an ad: "animation, colored backgrounds, fancy formatting, and distinct shapes", and content in "the top banner and right rail"; attention in a right rail "33 times smaller than its size might have warranted"; avoidance persists across pages ("hot potato") | [NN/g, Banner Blindness Revisited](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/), Pernice, 2018-04-22 | Eyetracking, 3 decades of replication | Rules out an editorial **rail** and watermark/background treatments; warns against distinct styling for a footer block (D5). |
| E4 | 57 % of viewing time above the fold, 74 % in the first two screenfuls; "reserve the top of the page for high-priority content"; minimalist layouts create an "illusion of completeness" that stops scrolling | [NN/g, Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/), Fessenden, 2018-04-15, 120 participants / 130 k fixations | Eyetracking | Content placed after Next, beneath a rule, on a page whose Next button is itself often below the fold, is in the lowest-attention zone (§2.5). |
| E5 | Objective language beat "marketese" by 27 % in measured usability; users "detested" promotional copy; credibility rises with "outbound hypertext links that demonstrate the authors' research" | [NN/g, How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/), Nielsen, 1997-09-30 | Classic study, small n | Anecdotes/story framing ("From the Lacks story") risks the marketese reaction; verifiable, plain statements do better. |
| E6 | Four credibility factors: design quality, **up-front disclosure**, comprehensive/correct/current content, **connection to the rest of the web**; users "trust external sources more than company-sponsored content" | [NN/g, Trustworthiness in Web Design](https://www.nngroup.com/articles/trustworthy-design/), Harley, 2016-05-08 | Qualitative synthesis | A first-party, un-followable "Source:" line delivers none of factor 4 and little of factor 2. Up-front disclosure of *how answers are used* is the factor the quiz can actually deliver. |
| E7 | "Make it easy to verify the accuracy of the information on your site" — third-party citations, especially when linked | Stanford Web Credibility Guidelines, Fogg 2002 ([summary](https://en.wikipedia.org/wiki/Stanford_Web_Credibility_Project); primary PDF via ResearchGate) | Large study (4,500+), dated | Same implication as E6; any fact shown should be inspectable (§5, §11). |
| E8 | Inline explanation of *why* a field is asked resolves most privacy hesitation; 39 % of sites give none; 14 % of shoppers refuse a phone number without one | [Baymard, Explain Why the "Phone Field" Is Required](https://baymard.com/blog/explain-phone-number-field), 2020-03-16, updated 2025-07-29 | Moderated usability testing, large benchmark | Directly supports "why we ask / what we do with it" one-liners next to sensitive questions (health conditions) — not history. |
| E9 | One thing per page: "one piece of information… one decision… one question"; build a question protocol: "why you need the information" and "what you'll do with it" | [GOV.UK Service Manual, Structuring forms](https://www.gov.uk/service-manual/design/form-structure), updated 2018-08-07; [Designing good questions](https://www.gov.uk/service-manual/design/designing-good-questions), updated 2026-06-24 | Design-system guidance, research-backed | The question page should carry one question and its own help; the "why" belongs in hint text, not a separate narrative block. |
| E10 | Hint text: "a few words only; ideally, one sentence"; "do not use hint text for important information that a user cannot skip"; "do not include links within hint text" | [GOV.UK Design System, Text input → hint text](https://design-system.service.gov.uk/components/text-input/) (current, 2026) | Design-system guidance | The existing `helpText` is the right vessel for "why we ask"; keep it to one sentence; do not put a "Source" link inside it. |
| E11 | Wizards: irrelevant information still costs attention — "people will have to spend attentional resources to scan it"; "Help and explanations should appear in a window next to the wizard and should not cover the wizard" | [NN/g, Wizards](https://www.nngroup.com/articles/wizards/), Budiu, 2017-06-25 | Guidance | Per-step narrative content is an attention tax; contextual help beside the step is the sanctioned form. |
| E12 | Info tips: "assume most users will never see info tips"; never hide essential information (constraints, legal, privacy) in a tip; the `i` icon reads as optional supplemental info, `?` as help | [NN/g, Why So Many Info Tips Are Bad](https://www.nngroup.com/articles/info-tips-bad/), Kaplan, 2026-01-23; [Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/), 2019-01-27 ("tooltips are not normally available on touchscreens") | Guidance, recent | A "Why we ask?" disclosure is acceptable only for nice-to-know text; the data-use sentence must be visible, not behind a toggle. Hover tooltips are unusable on the kiosk. |
| E13 | Large public touchscreens: elements are hard to notice in a large field of view; users stand "at arm's length"; make elements "noticeable, without being obnoxious"; show sensitive typed text small | [NN/g, Very Large Touchscreen UX](https://www.nngroup.com/articles/very-large-touchscreen-ux-design/), Pernice, 2015-08-23 | Expert interview | 11–12 px metadata at the foot of a mounted tablet will not be read; conversely, health answers should not be echoed large. |
| E14 | Target size ≥ 24 × 24 CSS px (AA), exceptions for inline/spacing | [W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), updated 2026-05-11 | Normative | Any "Why we ask?" / "Source" control must be ≥ 24 px (this app's own floor is 44 px, `.noct-quiz-back` at `:1147-1159`). |
| E15 | Focused component must not be entirely hidden by author content (sticky headers/footers) | [W3C Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), updated 2026-06-15 | Normative | Rules out a sticky/fixed "fact bar" that could overlap the focused Next button. |
| E16 | Reflow at 320 CSS px without 2-D scrolling | [W3C Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), updated 2026-06-12 | Normative | Prototype passes (§2.5). A side rail would have to collapse below 700 px anyway. |
| E17 | Text spacing overrides must cause no loss of content/functionality | [W3C Understanding SC 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), updated 2025-10-01 | Normative | Prototype passes technically; practically the aside disappears below the fold on 7/10 questions. |
| E18 | "Be careful with longer sections of text that are entirely bold, italicized, capitalized, or styled in atypical ways" | [WebAIM, Typefaces and Fonts](https://webaim.org/techniques/fonts/), updated 2020-10-27 | Guidance | Whole-sentence italics and letter-spaced caps are legibility costs, doubled at kiosk distance. |
| E19 | Aim for an 8th-grade reading level for general audiences | [NN/g, Legibility, Readability, and Comprehension](https://www.nngroup.com/articles/legibility-readability-comprehension/), Nielsen, 2015-11-15; [WCAG 3.1.5 (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html) "lower secondary" | Guidance / AAA | Four of five stories are above grade 8; the health-question story is grade ≈ 15. |
| E20 | Translation expansion: paragraphs ≈ 130 %, short strings 200–300 %; "avoid small fixed-width containers" | [W3C i18n, Text size in translation](https://www.w3.org/International/articles/article-text-size) (Ishida; undated on page, 2007 original) | Guidance | Budget 30 % for sentences and 100 %+ for a two-word label; the prototype's ES copy measured only +5…+18 %, so the 0.26fr label column is the tighter risk. |
| E21 | All five shipped facts appear on the cited page | `https://www.lacks.com/about-us`, fetched 2026-08-21 | Primary (first-party) | Facts are accurate; the source is the company about itself. |

---

## 4. Inferences (labelled)

- **INFERENCE I1.** On a mounted kiosk the customer's reading posture is "scan, tap, move on"; text after the primary action button is read only by the minority who pause. The E4 numbers come from desktop/mobile browsing and should transfer conservatively to a standing kiosk user (E13 says noticing is *harder* on large public screens).
- **INFERENCE I2.** Justified trust in a consultation is produced mainly by the questions themselves being obviously relevant and by the consultation visibly acting on the answers (results that cite the answers). History facts do not change whether the quiz is acting in the customer's interest; they change whether the *retailer* seems established — a welcome/handoff-screen job.
- **INFERENCE I3.** Repeating the identical "Source: Lacks company history" line ten times teaches the customer that the line is furniture, not a citation; the fourth sighting is ignored.
- **INFERENCE I4.** A "Why we ask?" disclosure toggle on this screen is more hazardous than it looks: `selectOption()` rerenders the whole container, so an open toggle would snap shut on every answer tap unless its state is added to session state, and its handlers must replicate the `onclick` + `ontouchend(preventDefault)` contract (Invariant 10). The existing one-sentence `helpText` already delivers the benefit (E8/E10) with zero interaction.
- **INFERENCE I5.** The strongest data-use statement the kiosk can make is also the simplest to verify by design: session answers live in memory only (Invariant 6) and there is no `gasUrl` in demo mode. "Your answers only shape today's suggestions — they aren't saved" is true today; it must be re-validated if email/lead capture goes live, because the email screen *does* transmit answers to GAS in production deployments.
- **INFERENCE I6.** "Lacks" appearing inside the quiz copy is fine for the white-label rule (it is data), but a *generic* mechanism named `trustStories` invites other retailers to fill it with marketing; if kept, the validator should constrain it to a fixed claim vocabulary (founding year, ownership, locations) rather than free prose.

---

## 5. Placement & cadence assessment

Recommended information hierarchy for a question screen (unchanged from shipped Slice 3, stated explicitly):

1. Orientation — eyebrow "Question n of N" + progress line (already there).
2. The question (h2) — the only headline.
3. Help text — one sentence that says **why we ask / what it changes** (already there for all 10; this *is* the "why we ask" layer).
4. Answers — the primary interaction; nothing between 3 and 4.
5. Back / Next — the end of the task unit.
6. *Optional, one line, only where it earns its place*: a process or data-use note that is true, specific to this question, and verifiable by design. Never history, never an anecdote, never a rotating fact.

| Candidate | Cadence | Assessment | Verdict |
|---|---|---|---|
| **NONE during questions** (supporting content on welcome, review, results/Sleep Brief, handoff only) | — | Matches E9/E11 one-thing-per-page; zero attention tax; no fold/scroll issues; trust work moves to the screens where the customer is reading at rest. Loses nothing measurable: the prototype aside is unseen on the long questions anyway. | **Recommended default** |
| Quiet content at the bottom, below Back/Next (prototype) | per chapter | Lowest-attention zone (E4); hidden on 4–10 of 10 questions in the mounted orientation (§2.5); worsens D1; styling pattern-matches ads (E3, D5); source not inspectable (D4). Technically clean a11y. | Not recommended; if overruled, move above the nav rule and cut to one line on Q1 only |
| In-flow footer *above* the nav rule (between answers and Back/Next) | selected moments | Seen more often than below Next, but now sits between answers and the action — a direct competitor to Next and pushes Next down on the four tall questions (fails the owner's own "never a competing prompt" rule). | Only for a one-line data-use note on health questions, ≤ 1 line, sans, 15–16 px |
| Editorial rail beside the question | per question/chapter | Right-rail = ad position (E3); at 1194 px the 980 px column leaves ~107 px per side, so a rail must shrink the question column; must collapse to a footer at ≤ 834 portrait and at 200 % zoom; adds a second reading column to a one-thing screen (E9). | Do not build |
| Background / watermark content | continuous | Either decorative (then it conveys nothing) or readable (then it fails 1.4.3 on the paper tone and competes with the question); muddies forced-colors; kiosk glare. | Do not build |
| One fact per question (10 facts) | per question | Highest attention tax; invites marketese (E5); ten "Source:" lines; no user-perceivable rule. | Do not build |
| One fact per chapter (5 facts) | per chapter | What the prototype actually does — but chapters are invisible in the UI, so the cadence reads as random (D2). Would require showing the chapter name, which adds hierarchy the Slice 3 ruling removed. | Not recommended |
| History mixed with process explanation | per chapter | Blurs "what we do with your answer" (useful) with "who we are" (not useful here); the blend makes the useful sentence look like marketing. | Do not build |
| "Why we ask" per question | per question | Already shipped as `helpText`; keep it the single sentence under the headline (E8, E10). Audit the ten sentences for *why + what it changes* (e.g. `firmness` "No wrong answer here…" explains tone but not use). | **Keep; refine copy** |
| Privacy / data-use explanation | selected moments | One true line at `sleep_issues` (first health question) and one on the welcome screen; visible, not in a disclosure (E12). | **Recommended** |
| Result explanations ("how we matched you", which answers drove which pick) | once, at results | This is where "how recommendations are produced" is actually evaluated; the Sleep Brief already cites answers. Add a short plain-language method note with the three inputs (firmness match, feature tags, no brand/price/financing influence — Invariant 1). | **Recommended** (outside quiz scope) |
| Timed rotation / ticker / carousel | continuous | Fails 2.2.2 without pause control (E1); annoys and is ignored (E2). | Do not build |
| Disclosure toggle ("Why we ask?" button) | per question | Touch contract cost (I4); state loss on rerender; most users never open it (E12); the answer fits in one visible sentence anyway. | Do not build |
| "Source" expandable / on-device source viewer | on demand | See §11; only viable as a handoff-screen QR or a staff-facing note; not during questions. | Defer to handoff |

---

## 6. Bilingual presentation requirements (for whatever supporting content ships)

1. Every string in `en` and `es` at the canonical source (`incoming/dreamfinder_quiz.json`), regenerated through the pipeline (Invariant 4/5); listed in the PR copy inventory (Invariant 12).
2. Budget **+30 %** for sentences and **+100 %** for labels ≤ 20 chars (E20). The prototype's grid gives the label `minmax(150px, .26fr)`; "DE LA HISTORIA DE LACKS" at 11 px/0.18em fits, but a longer retailer name would wrap the label before the sentence — test with a 30-char label.
3. No fixed heights; allow the note to wrap to 2–3 lines in ES; measure in both orientations (ES landscape already grows 56 → 67 px).
4. Spanish typography: sentence case, not Title Case; if the label is uppercased by CSS, any accented capital must keep its accent (RAE rule; `text-transform` preserves it — verify in Safari); opening ¿/¡ preserved; avoid italics for whole sentences in either language (E18) — in Spanish, cursiva conventionally marks foreign words/titles, so an italic full sentence reads as a quotation.
5. The ES `html[lang]` switch is already in place (`:12095`); do not add per-element `lang` unless mixing languages.
6. Reading level ≤ grade 8 in EN and the equivalent in ES; prefer short verbs ("we use this to…") over nominal constructions.
7. ES copy is *provisional* until the consolidated native-Spanish pass (Invariant 12) — say so in the PR; the current five stories read as competent but unreviewed.

---

## 7. Failure modes

| # | Failure mode | Trigger | Symptom | Mitigation |
|---|---|---|---|---|
| F1 | **Inverted hierarchy after Next** | Customer scrolls to reach Next on a tall question (body_type, firmness, sleep_issues, health_conditions — landscape) then taps Next | Next question renders with its headline ≥ 97 px above the viewport; the supporting note is the first thing in view; focus on `BODY` | `renderQuestion()` scrolls to top on question change (not on answer rerender) and moves focus to the headline (PR #39 pattern); add a Playwright assertion that the headline's top ≥ 0 after Next on every question at 1194×748 |
| F2 | **Stale or wrong fact shown as "verified"** | `verifiedAt` freshened without re-verification, or the retailer's about page changes (ownership, store count) | The kiosk asserts a date-stamped fact that is no longer true; "Source:" line lends false authority | Route `sourceUrl` through `tools/source_hosts.json`, add `maxAgeDays` fail-closed exactly as financing does; restrict claims to a fixed vocabulary (founding year, ownership form, region) rather than free prose; Invariant 11 applies (never freshen `verifiedAt` for a demo) |
| F3 | **Banner blindness / marketese discount** | Letter-spaced caps label + italic serif + repeated identical "Source:" line | Customers skip the block; the few who read it classify it as advertising and, per the hot-potato effect, avoid that page region on later screens — including a later *data-use* note placed in the same spot | Use one typographic voice with the help text (sans, roman, 15–16 px, muted ink); no label; no repeated source line; at most one appearance |
| F4 | **Health-moment mismatch** | `sleep_issues` / `health_conditions` render the civic-service anecdote | A customer disclosing reflux, apnea or nerve pain is told about the founder's Rotary service; no statement of what happens to the answer | Replace with a one-line data-use note at the first health question; nothing on the second |
| F5 | **Text-spacing / zoom pushes the note out of existence** | User style overrides (1.4.12) or 200 % zoom (1.4.4) | Compliant (no content loss) but the note is never in the first viewport on any question | Accept for non-essential notes; for the data-use line, place it above the answers where it stays in view, or repeat it on the welcome screen |
| F6 | **Disclosure toggle state loss** (if a "Why we ask?" button were built) | Customer opens the toggle then taps an answer | `selectOption()` rerenders the container; the toggle snaps shut; on a hybrid keyboard iPad the focus-restoration path at `:13574-13590` does not know the toggle | Don't build; if built, persist open state per question in session state and add to the focus-restore id set |
| F7 | **Kiosk escape via selectable text** | Long-press on the note | iOS callout (Copy / Look Up / Share) — Share can leave the app when Guided Access is not enabled | `user-select:none; -webkit-touch-callout:none` on `.noct-quiz` static text; close the Guided Access checklist item |

---

## 8. Ranked recommendations (impact on *justified* trust)

1. **Fix D1 (scroll + focus on question change) before any supporting content ships.** Confidence: high. It is a correctness defect in the primary flow and every placement option depends on the question being on screen.
2. **Ship no history/anecdote content during questions.** Keep the question screen to the six-level hierarchy above. Confidence: high (E4, E5, E9, E11, §2.5 measurements).
3. **Add one data-use line at the first health question** (`sleep_issues`), visible, sans, ≤ 1 line EN/ES, above the answers or directly under the help text: e.g. EN "This only shapes today's suggestions — your answers aren't saved." / ES "Esto solo guía las sugerencias de hoy — tus respuestas no se guardan." Must be re-validated against the live email/lead path before showroom use (I5). Confidence: medium-high (E8, E6 factor 2).
4. **Audit the ten `helpText` sentences as the "why we ask" layer.** Each should name the *use* ("This sets the support level we look for"), not just reassure. `firmness` and `trigger` currently explain tone, not use. Confidence: medium-high (E8, E10).
5. **Put "how we matched you" on the results/Sleep Brief screen**, three plain sentences: what was compared (firmness distance, feature tags from answers), what was *not* used (brand, price, financing — Invariant 1), and that the specialist can adjust. Confidence: medium (E6 factor 2; outside this slice).
6. **Move establishment facts to welcome and handoff**, stated plainly and once ("Family-owned, South Texas, since 1935"), with a verifiable pointer on the handoff screen (QR to the about page, same technique as `images/qr-financing.svg`, `tests/qr_payload_check.py`). Confidence: medium (E6 factor 4, E7).
7. **If an owner ruling keeps an in-quiz history line:** one line, Q1 only, roman sans 16 px muted, no label, no "Source:" unless inspectable, placed above the nav rule; add contrast and fold assertions. Confidence: medium (fallback, not preferred).
8. **Harden the data contract if `trustStories` stays in the schema**: allowlisted host, `maxAgeDays`, claim vocabulary, and a test that the block renders nothing below the fold on the mounted orientation. Confidence: high on the mechanics.

---

## 9. Do not build

- Timed rotation, ticker, carousel, fade-cycling facts (E1, E2).
- An editorial side rail or right-hand column (E3; collapses at 834 px anyway).
- Background / watermark copy (contrast, forced-colors, competes with the question).
- One fact per question; ten "Source:" lines.
- History mixed into the help text (blurs use-explanation with marketing).
- A "Why we ask?" toggle/tooltip on the question screen (E12, I4, F6); hover tooltips of any kind (touch-only device).
- A sticky/fixed fact bar (2.4.11, E15; and it would steal height from a 748 px viewport).
- Any external navigation from the quiz ("Read more at lacks.com") — the kiosk has no browser chrome, and the only sanctioned external path is the financing link on approved pages.
- Testimonials or community anecdotes presented as evidence (E6: users distrust company-generated testimonials).
- Personalised facts ("Since you mentioned back pain, did you know…") — answers must not be reflected back as marketing hooks; the prototype's own test already pins "selecting an answer cannot rotate or personalize the story".

---

## 10. Accessibility requirements checklist for any supporting content on the question screen

| SC | Requirement as applied | How to test | Auto / manual |
|---|---|---|---|
| 1.3.1 Info and Relationships (A) | If the block is a landmark, `<aside aria-labelledby>` is correct; a one-line note under the help text should be a plain `<p>` (no landmark, no heading). Never a heading element that outranks the question `h2`. | Inspect DOM; axe `region`/`landmark-*` rules | Auto |
| 1.3.2 Meaningful Sequence (A) | DOM order = reading order: note must come **before** the answers if it explains them, or after Next only if it is genuinely optional | Read the rendered `innerHTML` in `quiz_presentation_check.mjs` | Auto |
| 1.4.3 Contrast (AA) | ≥ 4.5 : 1 on `#F4EFE6` and on `#F2E9DB` where adjacent; current `#685C4D` = 5.68 : 1 | Add the note's selectors to `tests/contrast_check.mjs` (the file computes composited colours already) | Auto |
| 1.4.4 Resize Text (AA) | Content usable at 200 % (597 × 374 landscape) — passes today; record that the note is below the fold | Playwright viewport 597×374; assert no clipping, `scrollWidth == innerWidth` | Auto |
| 1.4.10 Reflow (AA) | No 2-D scroll at 320 px; single column ≤ 700 px (passes) | Playwright 320×256 | Auto |
| 1.4.11 Non-text Contrast (AA) | If a control (toggle/QR button) is added, its boundary ≥ 3 : 1; separators are exempt | contrast_check on the control | Auto |
| 1.4.12 Text Spacing (AA) | No loss of content with the four overrides (passes; note moves below the fold) | Inject the override stylesheet in Playwright, assert no overflow/clipping | Auto |
| 1.4.13 Content on Hover/Focus (AA) | Applies only if a tip/disclosure is built: dismissible, hoverable, persistent — and hover does not exist on the kiosk | Manual on iPad | Manual |
| 2.1.1 Keyboard (A) | Any control reachable/operable by keyboard (hybrid iPads exist — see `:13560-13570`) | Tab through in Playwright; Enter/Space activates | Auto |
| 2.2.2 Pause, Stop, Hide (A) | No auto-updating content; changes only on Next/Back | Existing assertion "not live, timed, fixed" in `quiz_presentation_check.mjs:300-303` | Auto |
| 2.3.3 Animation from Interactions (AAA) / `prefers-reduced-motion` | No animation on the note; question change currently has none (the retrigger is a no-op) | Emulate `reduced_motion`, diff screenshots over 500 ms | Auto |
| 2.4.3 Focus Order (A) | Non-interactive note must not be in tab order (`tabindex` absent — pinned); if a control is added it follows Next, never precedes the answers | Tab sequence assertion | Auto |
| 2.4.11 Focus Not Obscured (AA) | No sticky/fixed note; Next never covered | Assertion that `.noct-quiz-trust` has `position: static` (exists) | Auto |
| 2.5.2 Pointer Cancellation (A) / touch contract | Any control uses the shipped `onclick` + `ontouchend(preventDefault)` pair, `touch-action: manipulation` | Grep assertion like `quiz_presentation_check.mjs` option checks | Auto |
| 2.5.8 Target Size (AA) / 2.5.5 (AAA, app floor 44 px) | Control ≥ 44 × 44 CSS px with ≥ 8 px spacing from Next | `getBoundingClientRect` in Playwright | Auto |
| 3.1.1 / 3.1.2 Language (A/AA) | `html[lang]` switches (exists); no mixed-language fragments without `lang` | Assert `document.documentElement.lang` after `switchLanguage('es')` | Auto |
| 3.1.5 Reading Level (AAA, advisory here) | ≤ grade 8 EN; plain ES | FK script (§2.2) in CI as a warning; native-ES pass per Invariant 12 | Auto (EN) + manual (ES) |
| 3.2.2 On Input (A) | Tapping an answer never changes the note (pinned: "cannot rotate or personalize") | Existing assertion | Auto |
| Forced colors (WCAG 1.4.1/1.4.3 adjunct; Windows HCM) | Text `CanvasText`, rules `CanvasText`; no information carried by colour alone | Playwright `forced_colors='active'` screenshot (done, §2.3) | Auto + one manual Windows pass (owner gate already exists) |
| Viewport fit (project rule, not WCAG) | Note fully inside the first viewport at 1194×748 EN+ES on every question where it appears | Playwright geometry assertion (the script used for §2.5 is in the scratchpad: `measure.py`) | Auto |
| Screen reader semantics (OUT OF SCOPE by owner ruling — documented for correctness only) | Correct form would be: focus moves to the question `h2` on transition; the note is a silent `<p>` or named `<aside>`; **no** live region (the note is not a status); if a data-use note is essential it is referenced via `aria-describedby` from the option group | Not a gate | — |

---

## 11. Open questions

1. **Is any in-quiz establishment content an owner requirement, or an exploration?** The roadmap has no D-numbered decision for it; the prototype is untracked work. If it is exploratory, recommendation 2 closes it.
2. **What does "source" mean on a kiosk with no outbound navigation?** Options, with trade-offs: (a) no source line (honest, unverifiable); (b) a QR code to the about page, on the handoff screen only (verifiable on the customer's phone; reuses the financing QR technique; not during questions); (c) an on-device "About Lacks" sheet reusing the financing-sheet modal (`.fin-sheet`, `:9693+`) holding the full dated history text — inspectable without leaving the kiosk but it is still the company citing itself; (d) a specialist-facing line on the handoff ("Founded 1935 — ask me"). My ranking: b > d > c > a. None belongs inside the questions.
3. **Data-use line truth conditions.** Is it true in every deployment that quiz answers are not persisted? Today `gasUrl` is blank (demo) and the session is memory-only, but the production email path posts answers to GAS. The line must be written to the weakest true statement ("not saved on this kiosk") or be conditional on `gasUrl`.
4. **Should `helpText` be re-scoped as the official "why we ask" layer** and audited per question (recommendation 4)? That is copy-only under the quiz contract and needs no app-code review.
5. **Native-Spanish review** of the five stories (if any survive) and of any new data-use line — deferred by Invariant 12 but should be logged in the copy inventory.
6. **Should the scroll/focus fix (D1) be shipped as its own slice** (it touches `renderQuestion()` and overlaps draft PR #39's focus-transition work)? It is prerequisite for every placement option, including NONE.
7. **Chapter visibility.** The data already has five categories; the UI hides them by owner ruling. If chapters are ever surfaced, "one fact per chapter" becomes perceivable — but that is a hierarchy change Slice 3 explicitly removed.

---

### Appendix — artefacts in the scratchpad (not in any repo)

- `measure.py`, `shots/measure.json` — per-question geometry at 4 viewports × 2 languages × text-spacing on/off, plus forced-colors.
- `scrollcarry.py` — reproduction of D1.
- `reflow.py` — 320 / 597 / 417 px reflow checks.
- `shots/` — `en_land_trigger.png`, `es_land_health_conditions.png`, `en_land200_trigger.png`, `carry_before.png`, `carry_after.png`, `forced_land_trigger.png`, and others.
- `about.html` — fetched copy of `lacks.com/about-us` used for the fact check.


---

<!-- ===== SECTION 4: agent3-claims-governance.md ===== -->

# Agent 3 — Claims, Evidence, Privacy and Content Governance

**Scope:** Should the Lacks DreamFinder quiz show company facts / history / community / process / "why we ask" / privacy notes / testimonials, and if so, how must each be evidenced, approved, dated, re-verified, expired, retired and translated.
**Repo examined (read-only):** `C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4` (working tree, uncommitted; HEAD 5436dea). Line numbers below are from that working tree's `index.html` / `tools/validation.py` and may drift.
**Web research date:** 2026-08-21. `https://www.lacks.com` blocks WebFetch (HTTP 429) and curl (HTTP 403 — same PerimeterX behaviour the financing log records); the About page was captured through a real Chrome session and the verbatim text is saved at `scratchpad\lacks-about-capture-2026-08-21.txt`.
**Independence standard used throughout:** a company's own website, a company-sourced interview, a press release, or a trade-association write-up fed by the company is **company-reported**. Only a source with its own research basis (ISJL encyclopedia, a newspaper's own reporting, a regulator/registry record, an award-granting body's own announcement) counts as **independent corroboration**, and even then only for the specific sentence it supports.

---

## 1. Summary conclusion

1. **Most of the prototype's five history sentences are supportable only as company-reported history.** Two are independently corroborated in substance (1935 founding in downtown McAllen as an automotive-supply business; Sam Lack's McAllen civic service). Two rest solely on lacks.com (the Mission store "three years later"; the 1940s rationing pivot). One ("family-owned … since 1935") is a composite: the 1935 date is corroborated, "family-owned" today is company-reported but consistent with independent leadership naming, and "has remained" (continuity) is company-reported only. One third-party record (BBB: "Business Started 1/1/1924") conflicts with 1935 and must be logged as a discrepancy, exactly as the financing verification doc logs its discrepancies.

2. **The official About page is itself stale and internally inconsistent**: it says "The company celebrates its 89th anniversary this year" (1935 + 89 = 2024), names leadership that the Home Furnishings Association's April 2025 article supersedes (Seth Aaronson CEO, Lee Aaronson Chairman), and gives "ten stores and a clearance center" while another lacks.com page (per search snippet) says eleven, the HFA says seven, the BBB lists nine, and the site title lists nine cities. **Anything numeric about scale, counts, anniversaries or awards must not be copied from the About page.**

3. **A small, governed set of company-reported history can justifiably raise trust only if it is labelled as company-reported, stated without editorialising, and held to at least the bar the repo already applies to financing claims** — and the `trustStories` prototype is currently below that bar: `verifiedAt` is format-checked but never freshness-gated (build or runtime), `sourceUrl` is "safe https" but not checked against `tools/source_hosts.json`, there is no approval record, no `esReviewStatus`, no expiry, no retirement path, and the customer never sees the URL (so the on-screen "Source: Lacks company history" is the only provenance a kiosk reader gets).

4. **Privacy / process notes that are literally true of the code probably do more for *justified* trust than history does**, because the customer can verify them in the moment ("no account, no email required, answers cleared when you finish"). Three such sentences are code-supported today (§5/§6). Several tempting phrasings would overpromise and are listed as rejected.

5. **Do not display testimonials or customer anecdotes in this phase.** The kiosk has no consent capture, no review-collection process, and 16 CFR Part 465 (effective 2024-10-21) plus the 2023 Endorsement Guides make an unconsented, undocumented or employee-sourced anecdote a direct liability. A template is provided (§7) for a later phase only.

6. **Recommendation in one line:** build the claim–evidence register (§8) first; ship at most 2–3 register-backed, company-reported-labelled history lines plus 2–3 code-true privacy lines; keep everything else on the "do not display" list (§11) until the owner answers §12.

---

## 2. Lacks claim verification table

Fetch date for all rows: **2026-08-21**. "Official" = `https://www.lacks.com/about-us` (Chrome capture). Independent sources actually reached:

| Code | Source | Independence | URL |
|---|---|---|---|
| OFF | Lacks About Us page | company | https://www.lacks.com/about-us |
| ISJL | Goldring/Woldenberg Institute of Southern Jewish Life, "Texas — McAllen" encyclopedia entry (no bibliography shown on page) | independent (historical encyclopedia; no citations displayed → medium weight) | https://www.isjl.org/texas-mcallen-encyclopedia.html |
| HFA | Home Furnishings Association, "Celebrating 90 Years: Lacks Furniture Has G.G.R.I.T", 2025-04-30 (2025 Retailer of the Year, Over 50 Employees) | trade association; award announcement is independent for the award itself, company-sourced for history | https://myhfa.org/blog/lacks-furniture-wins-hfas-2025-retailer-of-the-year-award/ |
| RGV | RGVision Magazine, "85 Years of Lacks", 2020-04-29 (interview with Lacks leadership) | company-sourced feature | https://rgvisionmagazine.com/85-years-of-lacks/ |
| BBB | BBB profile, Lacks Valley Stores LTD, Pharr TX | third-party registry (self/auto-populated; not rated, not accredited) | https://www.bbb.org/us/tx/pharr/profile/furniture-stores/lacks-valley-stores-ltd-0915-71000422 |
| KVEO | valleycentral.com "Lacks reinventing showroom design" | not reachable this session (403 / domain not permitted in Chrome) | https://www.valleycentral.com/news/lacks-reinventing-showroom-design/ |

Not found / not reachable: The Monitor (myrgv.com) archive hits for Lacks history (site search returned nothing relevant); Texas Tribune (none); Furniture Today Top 100 list (paywalled, not fetched); Texas SOS filings (not reachable without account); Wikipedia (no article on Lacks Furniture — "Lack Brothers" is unrelated); Texas State Historical Association Handbook (no entry found).

### 2.1 The five prototype claims

| # | Prototype text (EN) | What OFF actually says (verbatim) | Independent corroboration | Status |
|---|---|---|---|---|
| (a) | "Lacks has remained a family-owned business with South Texas roots since 1935." | "1935 marked the beginning of what would one day become the most preeminent furniture chain in South Texas." / "The stores remain a family-owned business, maintained under the guidance of Lee Aaronson, Carolyn Aaronson, and Vicki Hutson." / "Texas has been Lacks Furniture's home for almost a century" | ISJL: "Sam Lack, who after starting Lacks Tire & Supply in 1935 in downtown McAllen, later opened a chain of furniture stores throughout the Rio Grande Valley." HFA 2025: "Celebrating its 90th year in business" (→ 1935) and names Seth Aaronson (CEO) and Lee Aaronson (Chairman) — Aaronson family per OFF — but HFA does **not** say "family-owned". **BBB: "Business Started 1/1/1924", "102 years in business"** — conflicts with 1935. | **1935 founding: independently corroborated** (ISJL; HFA by arithmetic). **"Family-owned" today: company-reported**, consistent with independent leadership naming. **"Has remained" (unbroken continuity): company-reported only.** **BBB 1924 = contradicting third-party record** (probably a registry artifact; must be logged and the owner asked). Note OFF itself records a 1955 purchase of the Weslaco store by son-in-law Myles Aaronson from Sam Lack and son Stanley — "family" means the Lack–Aaronson family across a sale, which is fine but is the kind of nuance "has remained" glosses. |
| (b) | "The first Lacks store opened in downtown McAllen as a small auto-parts business." | "America's love affair with automobiles during the 1930s and their growing accessibility convinced Sam Lack to create a specialty business selling auto parts in a modest building at the corner of Main and Beaumont in downtown McAllen." | ISJL: "starting Lacks Tire & Supply in 1935 in downtown McAllen". RGV (company-sourced): "got its start as an auto parts supply store". | **Independently corroborated in substance** (year, downtown McAllen, automotive supply). Wording differs: ISJL says "Tire & Supply", OFF says "auto parts". "Small" and "modest building" are company characterisation. Safe wording: "began in 1935 as an auto-supply business in downtown McAllen". |
| (c) | "Three years after the McAllen store opened, a second Lacks location followed in Mission." | "Only three years after opening, Mr. Lack built his second store in Mission, which was quickly followed by new locations in Edinburg and Weslaco." | None found. ISJL says only "later opened a chain of furniture stores throughout the Rio Grande Valley." | **Company-reported only.** Not contradicted. If shown at all, must be framed "According to Lacks' own history…". |
| (d) | "When auto parts were rationed in the 1940s, Lacks added household appliances and began a new chapter." | "The war years of the 1940s were hard on the U.S. economy. Auto parts were among the rationed goods alongside food and gasoline. Determined to succeed, Lack expanded the stores' product line by offering household appliances." | RGV (interview, company-sourced): "During World War II, when there was a shortage of parts due to the rationing mandates at the time … Sam Lack turned to other goods, such as jewelry, small appliances, lawnmowers, and other household items". No independent source. (That WWII rationing covered tires/auto goods is general history, not Lacks-specific evidence.) | **Company-reported only**; consistent with general history and with the 2020 interview. "Began a new chapter" is editorial and should be cut. Note RGV adds jewelry/lawnmowers — the story has variants. |
| (e) | "Founder Sam Lack served McAllen civic organizations, making community service part of the company's foundation." | "Sam Lack was deeply devoted to serving the community. He actively served with the McAllen United Fund, McAllen Civic Center Board, Drainage Advisory Board, McAllen Chamber of Commerce, and McAllen Rotary Club. This dedication to others' welfare would become its own founding principle of the business" | ISJL: "He was extremely active in McAllen civic life, serving as president or board member of several local organizations, including the McAllen Civic Center Board, the Citizens League, the Salvation Army, the Rio Grande Cancer Treatment Center, and the First National Bank of McAllen." and "In 1955, McAllen's Chamber of Commerce chose him as the city's first 'Outstanding Man of the Year.'" | **First clause independently corroborated** (civic service generally; Civic Center Board specifically; the two lists overlap only on the Civic Center Board — do not reproduce either list as exhaustive). **Second clause ("making community service part of the company's foundation") is company editorial / values claim — unsupported as fact.** Display only the first clause. |

### 2.2 Other candidate facts found

| Candidate | Source(s) | Status | Display? |
|---|---|---|---|
| Founded by Sam Lack, an immigrant who arrived in 1914 aged 13 aboard the Lusitania | OFF only | Company-reported, biographical, uncorroborated (Lusitania was in service until May 1915, so plausible) | No — personal biography, unverifiable, irrelevant to a mattress decision |
| Company "celebrates its 89th anniversary this year" | OFF (stale, = 2024) | **Stale on the company's own page** | Never copy an anniversary count; compute from founding year only under annual re-verification |
| "Celebrating 90 Years" (2025) | HFA 2025 | Consistent with 1935 | Same rule — compute, don't copy |
| HFA 2025 Retailer of the Year (Over 50 Employees) | HFA (granting body) | **Independently sourced award**, dated 2025-04-30 | Possible later, as an award claim with year; not on lacks.com; owner must confirm and the claim expires (see §3) |
| Furniture Today Top 100; "Sustained Excellence Award … 40 Years … May 2021" | OFF; HFA says "Top 100 Furniture Retailer" | Award list company-reported; rank/year unstable; FT list paywalled | No — rank/years unverifiable here; stale |
| The Monitor / Laredo Morning Times Reader's Choice awards (2003–2022) | OFF only | Company-reported; last year listed is 2022 | No — stale, reader poll |
| "ten stores and a clearance center" | OFF says ten; other lacks.com page (search snippet) eleven; HFA seven; BBB nine; site title lists nine cities | **Contradicted across sources** | No |
| "largest furniture store in South Texas … 140,000 square feet" (McAllen Galleria) | OFF only | Superlative, company-reported | No |
| "most preeminent furniture chain in South Texas" | OFF | Puffery | No |
| Donations: Food Bank of the RGV, American Diabetes Association, American Cancer Society | OFF only; HFA: "participates in charity events, sponsors scholarships…" | Company-reported; current-tense charity claims need current substantiation | No, unless each named charity confirms and the claim is re-verified yearly |
| Legal name Lacks Valley Stores, Ltd.; HQ 1300 San Patricio Dr, Pharr | BBB; OFF ("Lacks Valley Stores, Ltd.") | Corroborated | Not a trust claim; useful for the register's "who is the speaker" field |
| Restonic + Chattam & Wells "made in Texas" (repo `locally-made` flag, per Blake 2026-07-30) | repo only | Owner-asserted; manufacturer substantiation not in repo | Not in scope of quiz copy; if ever displayed it is a US-origin claim (see §4, Made in USA rule) |

---

## 3. Claim-type risk classification

| Claim type | Examples | Evidence needed | Volatility | Appropriate in the quiz? |
|---|---|---|---|---|
| Historical (dated, fixed) | founded 1935; first store downtown McAllen | Independent corroboration preferred; company-reported acceptable **only with the "company history" label** | Low (facts don't change; wording/attribution can) | **Yes, sparingly** (≤3 lines), register-backed |
| Historical narrative / values editorial | "began a new chapter", "community service part of the foundation" | Not evidentiable | n/a | **No** — cut editorial clauses |
| Community / charity (present tense) | "Lacks donates to…" | Recipient confirmation + annual re-verification | High | **Not in quiz**; at most on handoff with date |
| Service / process (present tense) | in-home delivery, free decor consultation | Operational policy owner sign-off; verify per store | High | No — sales context, not sleep-fit; also not what the quiz is for |
| Store counts / scale | "ten stores", "largest in South Texas" | Contradicted across sources | High | **No** |
| Anniversary counts | "90 years" | Computed from founding year; annual review | Changes every year | Only as a computed value with a yearly register review; never hard-coded text |
| Awards | HFA 2025, Furniture Today Top 100 | Granting-body source, year stated, expiry ≤ 12–18 months | Medium | Not in quiz; possibly handoff/welcome with year, if owner wants |
| Testimonials / anecdotes | "A customer from Mission said…" | Written consent, identity record, honest-opinion + typicality, material-connection disclosure (16 CFR 255, 465) | Medium | **No** in this phase |
| Promotions | sales, deadlines | Existing Daybreak contract (owner authorization + evidence + bilingual review); inert by CI | High | Already governed; out of trust-content scope |
| Financing | rates, terms | Existing envelope (verifiedAt + maxAgeDays ≤ 7 + allowlisted sourceUrl; exact claims fail closed) | Very high | Already governed; trust content must not restate any rate/term |
| Delivery / inventory / availability | "in stock", "fast delivery" | Live inventory — none in repo; the +25 locally-made "in stock" reason was retired 2026-08-13 for exactly this reason | Very high | **No** |
| Health / comfort | "relieves back pain", "easy fix with the right materials" | Competent and reliable scientific evidence (FTC health-claim standard) for any health effect | Low volatility, high liability | Only non-health comfort language; existing helpText lines need review (§5) |
| Privacy / data-use | "no email required", "answers cleared" | Must map 1:1 to code; re-verified on every release that touches session/email/analytics | Changes with code | **Yes** — highest justified-trust value per word, if code-true |
| Process / "why we ask" | "sleep position is the biggest clue…" | Must match how the engine actually uses the answer | Changes with scoring | Yes for accurate statements; several current lines overstate |

---

## 4. Regulator / legal findings (sourced vs inferred labelled)

**Sourced this session (URLs fetched or confirmed by search):**

1. **FTC Endorsement Guides, 16 CFR Part 255 — revised 2023.** Final revised Guides published 88 FR 48092, 2023-07-26 (effective on publication). https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising ; current text https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255 . Relevant to a kiosk anecdote: an endorsement must reflect the honest opinion/experience of the endorser and cannot be presented out of context (§255.1); consumer endorsements about performance require substantiation and must not imply atypical results are typical (§255.2); material connections (employee, relative, payment, free goods) must be clearly disclosed (§255.5). A kiosk screen is advertising; attribution "— M., McAllen" does not cure an undocumented quote. *(Application to this kiosk: inferred.)*

2. **FTC Trade Regulation Rule on the Use of Consumer Reviews and Testimonials, 16 CFR Part 465.** Final rule published 2024-08-22 (89 FR 68034), effective **2024-10-21**. https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials ; https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-465 . Prohibits fake or false reviews/testimonials including AI-generated ones and testimonials that misrepresent the reviewer's experience (§465.2); insider testimonials (officers, managers, employees, their relatives) without clear disclosure (§465.4); review suppression (§465.6). Civil penalties per violation. *(Consequence for the quiz, inferred: an invented, composite, paraphrased or staff-sourced "customer story" is the exact conduct the rule targets; "illustrative" framing does not help.)*

3. **FTC staff report "Bringing Dark Patterns to Light", 2022-09-15.** https://www.ftc.gov/reports/bringing-dark-patterns-light ; press release https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers . Named tactics include false social proof, false urgency/scarcity, hidden information, and tricking consumers into sharing data. *(Inferred application: trust content placed beside a question must not function as social-proof pressure, must not imply an answer is expected, and "why we ask" notes must be true; fabricated counters like "1,200 Valley families took this quiz" would be a dark pattern and a false claim.)*

4. **Texas Deceptive Trade Practices–Consumer Protection Act (DTPA), Tex. Bus. & Com. Code ch. 17, subch. E.** https://statutes.capitol.texas.gov/Docs/BC/htm/BC.17.htm . §17.46(b) "laundry list" includes: (2) causing confusion as to source, sponsorship, approval; (5) representing that goods or services have sponsorship, approval, characteristics, uses or benefits they do not have; (7) representing goods are of a particular standard or quality if they are of another; (9) advertising goods or services with intent not to sell them as advertised; (24) failing to disclose information known at the time of the transaction with intent to induce. Private action §17.50; AG enforcement §17.47. *(Inferred: a history line is unlikely to be actionable on its own, but a false award, stale anniversary, "in stock", health benefit or a misleading privacy promise could be; the exposure is the retailer's, so the owner approves every line.)*

5. **Texas Data Privacy and Security Act (TDPSA), Tex. Bus. & Com. Code ch. 541**, HB 4 signed 2023-06-18, effective **2024-07-01** (universal opt-out provisions 2025-01-01). https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm ; AG page https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act . Applies to persons that conduct business in Texas and process or sell personal data and are **not** a "small business" under the SBA size standard (§541.002); even small businesses may not sell sensitive data without consent (§541.107). "Sensitive data" includes data revealing a mental or physical health diagnosis. *(Inferred: Lacks, at ~250 employees per HFA, is probably a covered controller for its ordinary business. The kiosk in its current configuration processes quiz answers — including health-adjacent selections — only in device memory, unlinked to any identity, and transmits nothing, so the TDPSA's notice/consent machinery is not triggered by the kiosk today. That changes the day `gasUrl` is set: a live send associates name/email/phone with a sleep profile, and the implication copy can reveal health conditions. Any privacy line must therefore be gated on the preview-mode condition, not written as timeless truth.)*

**Sourced from prior knowledge (URL given, not re-fetched this session — verify before citing externally):**

6. **FTC Act §5 deception + Policy Statement on Deception (1983)** https://www.ftc.gov/legal-library/browse/ftc-policy-statement-deception and **Policy Statement Regarding Advertising Substantiation (1983)** https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation — an objective claim must have a reasonable basis **before** it is disseminated. This is the principle behind "verified-before-shown" and it applies to "founded 1935" exactly as to "0% APR".

7. **FTC Made in USA Labeling Rule, 16 CFR Part 323 (effective 2021-08-13)** https://www.ftc.gov/legal-library/browse/rules/made-usa-labeling-rule — "Made in Texas" is an implied US-origin claim; the "all or virtually all" standard applies. Relevant only if the `locally-made` flag is ever surfaced as copy.

8. **FTC Health Products Compliance Guidance (Dec 2022)** https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance — health-benefit claims (back pain relief, snoring/reflux reduction for adjustable bases) need competent and reliable scientific evidence. Relevant to the adjustable-base hero and to two existing helpText lines (§5).

9. **FTC privacy-promise enforcement** (broken privacy representations are treated as deceptive under §5; numerous consent orders) https://www.ftc.gov/business-guidance/privacy-security — the reason every privacy sentence in §5/§6 is tied to a code line.

**WCAG:** out of scope per assignment.

---

## 5. Privacy / data-use statements: what is TRUE of the code, and what would OVERPROMISE

Derived from the slice4 working tree `index.html` (line numbers approximate).

### 5.1 Code behaviours (evidence)

| Behaviour | Evidence |
|---|---|
| Quiz answers live in a plain in-memory variable | `let answers = {};` index.html:13215; reset `answers = {}` at 13305 (quiz start) and 20083 (wipe) |
| No customer data is written to localStorage/sessionStorage/cookies/IndexedDB | only `localStorage` uses are the salesperson ("RSA") name and list keys `dreamfinder.<store>.deviceRsa` / `.rsaList` at 16285, 19049–19076 — device-level staff identity, **persists across customers** |
| Wipe clears answers, payment-choice state, contact inputs, generated content, analytics, language | `resetSessionState()` 20025: answers 20083; `payExplored = {}`/`payPref = null` 20115–20116; contact form + inputs 20120–20129; content/text ids 20132–20139; analytics fields + `events = []` + sessionId rotated 20150–20171; `switchLanguage('en')` 20182 |
| Wipe triggers: confirmed Restart, final idle timeout, email-confirmation "Start New Customer" | CLAUDE.md Key App Flows; `SESSION_POLICY` 19244–19247: 5 min idle warning + 5 min grace before wipe (provisional preview values) |
| "Analytics" is an in-memory event array plus a **redacted** console line; there is **no analytics network sink** | `analytics` object 14375; `log()` pushes to `this.events` and `console.log`s the redacted copy 14446–14452; per-event field allowlist + enum validators 14427–14445; comment 14419–14426 lists deliberately absent fields: name, email, phone, answers, mattressId, health booleans, financing interest, sessionId. The only `fetch()` calls are the data loader (11889) and the GAS POST (16445). |
| Raw answers are nonetheless copied into memory for the session summary | `analytics.answers = Object.assign({}, answers)` 15905; `getSummary()` 14454–14466 exposes them (memory only; not logged, not sent) |
| Email path with blank `gasUrl` (this deployment): **no network request, no email**, payload shape only logged, button reads "Preview Email Experience" / "✓ Saved" | 16394–16408 (`isEmailPreview = !gasUrl || scenarioBlocksEmail`), 16440 (send branch skipped), 16481–16491 (preview branch, "payload suppressed"); `data/store-config.json` `gasUrl: ""` |
| …but the form still asks for and holds name / email / optional phone in memory until wipe | `analytics.log('email_previewed', {email, name, phone})` 16411–16415 (fields dropped by redaction before logging); contact inputs cleared only at wipe 20120–20129 |
| When `gasUrl` is set (not this deployment): POST to Google Apps Script with name, email, phone, sleep profile, matches, accessories; the email payload carries implication copy and computed firmness, **not** raw answers/ids | 16445–16476; payload comment 16358–16362 ("no raw answers, no option/question ids") |
| Scoring = firmness distance (max +50, −20 beyond diff 4) + capped feature-tag matching; nothing else | `calculateScores()` 13747–13800; `FEATURE_CAP = 5`; `tests/scoring_isolation_check.mjs` pins that financing and `locallyMade` are never read |
| Untouched firmness slider scores from `q.defaultValue` | 13756 |
| "Top pick" is **always Gold tier #1 by product rule**, not the global highest score; each tier ranks its own top 3 with a 60 %-of-max qualification | 15927–15935 (`analytics.topPick is always Gold #1 by product rule`), 15915–15923 (`meetsMatchThreshold: rawScore >= maxScore * 0.6`) |
| `mattress_size` does **not** filter the lineup; it is displayed as identity only | 13843, 14082, 16325, 18270 — no filtering by size anywhere |
| Exact financing terms are hidden at runtime when `verifiedAt` is older than `maxAgeDays` or in the future | `financingTermsFresh()` 11105–11137; today `verifiedAt 2026-07-31T16:43-05:00`, `maxAgeDays 7` → stale → exact terms suppressed (correct fail-closed behaviour; Invariant 11 forbids freshening it for demos) |
| Financing links leave the kiosk to lacks.com; the kiosk collects no financial data | 11396–11401; CLAUDE.md |

### 5.2 Statements that are TRUE today (safe to write, with the condition under which they stop being true)

| Statement | Why true | Stops being true when |
|---|---|---|
| "You don't need an account or an email address to see your results." | results render before the email screen; email capture is a separate later step | never, unless flow changes |
| "Your answers stay on this tablet and are cleared when you finish or start over." | in-memory only; no storage; no network sink; wipe on restart/timeout/new customer | **the moment `gasUrl` is set** (results summary leaves the device on send) — gate on `!STORE_CONFIG.gasUrl` |
| "Your quiz answers are not saved or sent anywhere." | same | same |
| "Nothing you tap here affects your credit or starts an application — financing pages open on lacks.com." | 11396; no financial data fields exist | never, unless flow changes |
| "Your recommendations come only from your answers and each mattress's firmness and features — not from price, promotions or financing." | `calculateScores`; isolation test | any scoring change (Blake sign-off required anyway) |
| "A salesperson can see the picks you mark on the handoff screen." | handoff flow | n/a (this is a disclosure, not a promise) |

### 5.3 Statements that would OVERPROMISE (do not write)

| Tempting wording | Why it overpromises |
|---|---|
| "We don't collect any personal information." | The email screen asks for name/email/phone and holds them in memory; the existing draft `privacyBody` in store-config even says the opposite ("DreamFinder collects your name, email, and optional phone number…"). |
| "Nothing is stored on this device." | The salesperson name/list persists in `localStorage` (16285, 19054–19076); console history on a shared tablet is not retractable (the code's own comment at 14396–14401 says so). |
| "Your answers are deleted immediately." | They persist until wipe: an abandoned session survives ~10 min of idle (warning + grace) and anyone can walk up to it. |
| "Your answers are anonymous." | True only while no email is entered; once a customer types an email the session is identified in memory. Avoid the word. |
| "We never share your information." | Once `gasUrl` is live the payload goes to Google Apps Script / a Google Sheet / an outbound email; "never sold" may be defensible but is an owner policy statement, not a code fact. |
| "The top pick is the best match for you." | Top pick = Gold #1 by product rule (15927), not the global best score. Say "best match within each range" or explain tiers. |
| "So every mattress we show actually fits your space." (existing `mattress_size` helpText) | The lineup is not filtered by size; availability per size is not checked. Reword or verify that every listed model is offered in every size. |
| "Sleeping hot or cold is an easy fix with the right materials." / "Motion isolation is one of the first upgrades you'll feel." (existing helpText) | Comfort/outcome promises with no substantiation in repo; "easy fix" is a benefit claim. Soften to "tells us which materials to look at". |
| "DreamFinder collects your name, email… to deliver your mattress recommendations." (existing draft privacyBody) | In this deployment nothing is delivered; the draft carries `privacyDraftNotice` "pending Lacks Furniture approval" — correct, keep it draft. |
| "Your answers never leave the Valley / stay with Lacks." | Geographic or custodial promises have no code basis. |

---

## 6. Candidate content with full metadata

Placement vocabulary: **Q-rail** = the quiz's quiet evidence aside (`quizTrustStoryMarkup`, one per question); **Welcome**; **Results**; **Handoff**. "Trust mechanism" = why a sceptical customer would justifiably trust more after reading it. ES status follows Invariant 12 (all ES provisional until the consolidated native pass) — marked **NATIVE REVIEW REQUIRED** where no draft exists or the draft should not be reused.

### 6.1 Historical / community (company-reported, labelled as such)

**H1 — Founding**
- Placement: Welcome (one line under the brand) or Q-rail Q1 only
- EN: "Lacks began in 1935 as an auto-supply store in downtown McAllen. — From Lacks' own company history"
- ES: "Lacks comenzó en 1935 como una tienda de refacciones automotrices en el centro de McAllen. — De la historia de la propia empresa Lacks" — **NATIVE REVIEW REQUIRED** (regional term: refacciones vs autopartes)
- Trust mechanism: verifiable, dated, specific, modest; no superlative
- Evidence: OFF; ISJL ("Lacks Tire & Supply in 1935 in downtown McAllen"); RGV
- Verification: independently corroborated (1935, downtown McAllen, auto-supply); fetched 2026-08-21
- Approval: **none recorded** (needs owner + named approver)
- Expiry/reverification: 365 days (fixed fact; re-check source page still says it; re-check BBB 1924 discrepancy resolved)
- Principal risk: BBB record says 1924 — owner must confirm founding year against corporate records
- Safe to publish now: **No** (owner approval + BBB discrepancy ruling + ES review outstanding); **content itself is the strongest candidate**

**H2 — Family ownership**
- Placement: Welcome or Handoff (not beside a health question)
- EN: "Lacks describes itself as a family-owned South Texas business, now led by the founder's family."
- ES: **NATIVE REVIEW REQUIRED**
- Trust mechanism: relevant to "who am I dealing with"; hedged to what is evidenced
- Evidence: OFF ("The stores remain a family-owned business"); HFA 2025 names Seth and Lee Aaronson; ISJL (Lack → Aaronson lineage per OFF)
- Verification: company-reported (ownership); leadership family consistent with independent naming
- Approval: none recorded
- Expiry: 365 days; **retire immediately on any ownership change** (owner must notify)
- Principal risk: ownership/leadership change makes it false overnight; OFF's own leadership names are already stale vs HFA
- Safe to publish now: No (approval + ES)

**H3 — Civic service of the founder**
- Placement: Handoff or Welcome; **not** Q-rail beside `sleep_issues` / `health_conditions` as the prototype maps it (a community claim next to a health question reads as persuasion)
- EN: "Founder Sam Lack served on McAllen civic boards, including the McAllen Civic Center Board. — From Lacks' company history and the Institute of Southern Jewish Life"
- ES: **NATIVE REVIEW REQUIRED**
- Trust mechanism: independently corroborated, specific, past-tense (cannot go stale)
- Evidence: OFF list; ISJL list; overlap = Civic Center Board; ISJL adds 1955 Chamber "Outstanding Man of the Year"
- Verification: independently corroborated (general civic service; Civic Center Board)
- Approval: none recorded
- Expiry: 730 days (historical); source-availability check only
- Principal risk: the prototype's editorial tail ("making community service part of the company's foundation") must be dropped; two different organisation lists — quote neither as exhaustive
- Safe to publish now: No (approval + ES)

**H4 — Wartime pivot**
- Placement: Q-rail, mid-quiz, or omit
- EN: "According to Lacks' own history, wartime rationing in the 1940s led the auto-parts stores to add household appliances."
- ES: **NATIVE REVIEW REQUIRED**
- Trust mechanism: explains why a furniture/mattress store exists — context, not persuasion
- Evidence: OFF; RGV (company interview, with variant detail: jewelry, lawnmowers)
- Verification: **company-reported only**
- Approval: none recorded
- Expiry: 730 days
- Principal risk: cannot be corroborated; must keep the "according to" frame; drop "began a new chapter"
- Safe to publish now: No; **lowest-value of the five** — consider dropping

**H5 — Mission store**
- Placement: Q-rail or omit
- EN: "Lacks' history records a second store in Mission three years after the first."
- ES: **NATIVE REVIEW REQUIRED**
- Trust mechanism: local specificity (Mission customers)
- Evidence: OFF only
- Verification: **company-reported only**; no independent source
- Approval: none recorded
- Expiry: 730 days
- Principal risk: unverifiable; trivial relevance; if the owner's records say otherwise it is an avoidable false statement
- Safe to publish now: No; recommend **drop** unless owner supplies a dated record (e.g., a 1938 newspaper ad)

**H6 — Award (optional, non-quiz)**
- Placement: Handoff only (never Q-rail)
- EN: "Home Furnishings Association 2025 Retailer of the Year (over 50 employees)."
- ES: **NATIVE REVIEW REQUIRED**
- Evidence: HFA announcement 2025-04-30 (granting body → independent for the award)
- Verification: independently sourced
- Approval: none recorded
- Expiry: **2026-12-31** hard expiry (an award older than ~18 months reads as padding); never "award-winning" without year
- Principal risk: award claims are promotional in character; the business goal is trust not promotion — owner decides whether this belongs
- Safe to publish now: No (approval + ES); defensible on evidence

### 6.2 Privacy / data-use (code-supported)

**P1 — No account / email needed**
- Placement: Welcome, under Start
- EN: "No account or email needed to see your results."
- ES: "No necesitas cuenta ni correo para ver tus resultados." — provisional, **native review required**
- Trust mechanism: immediately verifiable by the customer
- Evidence: email capture is a later optional step (16097, 16394)
- Verification: code-true 2026-08-21; approval none recorded
- Reverification: on any flow change to results/email order
- Principal risk: none significant
- Safe to publish now: **Yes on evidence; needs owner approval + ES review**

**P2 — Session-only answers (preview-mode gated)**
- Placement: Q-rail Q1 (`trigger`) — replaces the history line beside the first question; and/or the idle-warning dialog
- EN: "Your answers stay on this tablet and are cleared when you finish or start over."
- ES: "Tus respuestas se quedan en esta tableta y se borran cuando terminas o empiezas de nuevo." — provisional, **native review required**
- Trust mechanism: honest scope statement a customer can test (Restart → everything gone)
- Evidence: 13215, 20025–20171; no storage; no network sink; `gasUrl` blank
- Verification: code-true 2026-08-21 **only while `gasUrl` is blank** → must be rendered under `!STORE_CONFIG.gasUrl` (config-driven, validator-enforced), or reworded for live mode
- Reverification: every release touching session/email/analytics; CI test pinning the condition
- Principal risk: someone sets `gasUrl` and this line silently becomes false → **must fail closed at build** (validator: line forbidden when gasUrl non-blank)
- Safe to publish now: Yes on evidence with the gate; approval + ES outstanding

**P3 — Scoring is fit-only**
- Placement: Results header or the Sleep Brief
- EN: "Your matches come from your answers and each mattress's firmness and features — not from price, promotions or financing."
- ES: **NATIVE REVIEW REQUIRED**
- Trust mechanism: explains the mechanism; pre-empts the "are you steering me" suspicion
- Evidence: `calculateScores` 13747–13800; `tests/scoring_isolation_check.mjs`
- Verification: code-true 2026-08-21; **caveat**: the headline top pick is Gold #1 by product rule (15927) — the line above is true of *matches*; do not extend it to "the top pick is your best overall match"
- Reverification: on any scoring or tier-rule change (Blake sign-off already required)
- Principal risk: tier semantics — if Gold/Silver/Bronze correlate with price, "not from price" needs the tier explanation alongside
- Safe to publish now: Yes on evidence; approval + ES + tier wording outstanding

**P4 — Financing boundary** (already partly in store-config `privacyBody` draft)
- EN: "Nothing you tap here starts a credit application — Lacks' financing pages open on lacks.com."
- Evidence: 11396–11401; no financial inputs exist
- Safe to publish now: Yes on evidence; approval + ES outstanding

### 6.3 REJECTED wordings (with reasons)

**R1** — "Lacks has remained a family-owned business with South Texas roots since 1935." (prototype item 1, as written) — *Rejected as bare fact*: "has remained" asserts unbroken continuity that only the company reports; stated without an attribution frame, and the repo's own `text.trustSignal` ("Family-owned in South Texas since 1935") already makes the same unframed claim on the welcome screen. Either both carry the "company history" frame or the claim is reduced to what is corroborated (founded 1935). Also: BBB says 1924.

**R2** — "Founder Sam Lack served McAllen civic organizations, making community service part of the company's foundation." (prototype item 5) — *Rejected*: the second clause is a values assertion, not a fact, and it is mapped beside `sleep_issues` / `health_conditions`, where a warm community message functions as persuasion at the moment the customer discloses health information (dark-pattern adjacency; TDPSA-sensitive context). Keep only the first clause, elsewhere.

**R3** — "Trusted by South Texas families for 90 years." — *Rejected*: "trusted by" is an unverifiable endorsement-style claim; "90 years" is a count that is already wrong in 2026 (91) and was wrong on Lacks' own page in 2025 ("89th"). Counts must be computed and annually reviewed, never written as text.

**R4** — "Lacks has ten stores across South Texas, from Laredo to Brownsville." — *Rejected*: contradicted across the company's own pages (ten/eleven), the HFA (seven), and BBB (nine).

**R5** — "We never store or share anything about you." — *Rejected*: staff name persists in localStorage; session persists until wipe; becomes false when `gasUrl` goes live; "never" is a policy promise no code can keep.

**R6** — "One customer from Pharr told us the quiz found her the mattress she'd been looking for for years." — *Rejected*: no consent, no identity record, no typicality basis; exactly the conduct 16 CFR 465.2/465.4 and 255.2 target. No testimonial of any form this phase.

---

## 7. Testimonial governance template (no examples)

To be used **only** if the owner later authorises testimonials; nothing in this template is filled in.

```
testimonial:
  id:                 <slug>
  status:             draft | consented | approved | published | retired
  quote:
    en:               <verbatim words of the endorser, or a faithful translation marked as such>
    es:               <verbatim if given in Spanish; otherwise "translated" flag + native review>
    originalLanguage: en | es
    editedForLength:  true|false   # any edit must not change meaning; keep the unedited original on file
  endorser:
    displayAttribution: <first name + city, or initials — as the endorser chose>
    identityOnFile:   true          # full name + contact held OFF-kiosk by the owner, never in repo
    relationship:     customer | employee | relative-of-employee | vendor | other
    materialConnection: none | discount | gift | payment | employment | other   # must be disclosed on screen if not "none" (16 CFR 255.5, 465.4)
    isBonaFideUser:   true          # purchased/used the product or service described
    experienceDate:   YYYY-MM-DD
  consent:
    obtainedAt:       YYYY-MM-DD
    method:           signed-form | email | recorded-verbal
    scope:            in-store kiosk EN/ES | web | print | email
    revocable:        true          # revocation → retire within N days
    minor:            false         # minors require guardian consent; avoid
  substantiation:
    claimsMade:       [ list any product-performance or health statements in the quote ]
    typicality:       typical | atypical-disclosed | no-performance-claim
    evidenceRef:      <owner file ref for any performance claim>
  review:
    legalReviewedBy / At
    esReviewStatus:   provisional | native-reviewed
    approvedBy / approvedAt (owner)
  placement:          [ handoff ]   # never Q-rail, never beside a health question, never results
  expiresAt:          YYYY-MM-DD    # ≤ 24 months from experienceDate
  retiredAt / retireReason
```

Rules: verbatim or faithfully translated; no composites, no AI-written or "representative" quotes, no paraphrase presented as a quote; employee/relative quotes need on-screen disclosure; any health or performance statement in a quote inherits the substantiation standard of the claim itself; revocation honoured; register entry and the consent record must exist **before** the text is authored into config.

---

## 8. Proposed claim–evidence register schema + lifecycle + gaps

### 8.1 Register entry (authoritative source: `incoming/`, rides the workbook like the financing envelope; generated into `data/`)

| Field | Type | Purpose |
|---|---|---|
| `id` | slug | stable key; referenced by placements and tests |
| `claimType` | enum: `historical` · `community` · `award` · `privacy` · `process` · `whyWeAsk` · `testimonial` | drives which validator branch and which expiry default apply |
| `text.en` / `text.es` | plain text (no HTML) | customer copy |
| `attribution` | enum: `company-reported` · `independent` · `code-derived` | decides the on-screen frame (§5 of assignment: "According to Lacks' own history…" vs plain statement) |
| `sourceLabel.en/.es` | plain text | the only provenance a kiosk customer sees — must name the *kind* of source honestly ("Lacks company history", "Institute of Southern Jewish Life", "how this quiz works") |
| `sources[]` | `{url, host, kind: official|independent|registry|code, fetchedAt, quote}` | every URL's host must be in `tools/source_hosts.json` (new key `trustSourceHosts`: lacks.com, www.lacks.com, isjl.org, myhfa.org, …); `quote` is the verbatim sentence relied on; `code` kind points to `index.html` symbol + test name |
| `independent` | bool | true only if ≥1 source is `independent`/`registry` and supports the full sentence |
| `verifiedAt` | ISO-8601 **with offset** (match financing, not the prototype's bare date) | observation timestamp; **never freshened for demos (Invariant 11)** |
| `maxAgeDays` | int | freshness window; defaults by type: historical 365, award 540 (plus hard `expiresAt`), community 180, privacy/process/whyWeAsk = "every release" (enforced by test, plus 365 ceiling), testimonial 730 |
| `expiresAt` | ISO date, optional | hard stop regardless of re-verification (awards, anniversaries) |
| `approvedBy` / `approvedAt` / `approverRole` | string / ISO / enum | owner authorization (mirrors promotions `authority.owner/role` + `enabledByOwner`) |
| `esReviewStatus` | enum identical to financing: `pending-native-legal-review` · `native-reviewed` · … | Invariant 12 ledger |
| `placements[]` | enum: `welcome` · `quiz:<questionId>` · `results` · `handoff` | replaces `questionIds`; validator forbids `community`/`award`/`testimonial` beside `sleep_issues`/`health_conditions` |
| `displayCondition` | optional enum: `previewModeOnly` (`gasUrl` blank) · `always` | privacy lines gated on config truth |
| `discrepancies[]` | `{source, says, noted, resolution}` | e.g. BBB 1924; OFF store counts |
| `retiredAt` / `retireReason` | ISO / text | retired entries stay in the register (audit trail) but are excluded from `data/` |
| `notes` | text | wording constraints ("drop editorial tail") |

### 8.2 Lifecycle

```
draft ──(evidence attached, quote + host allowlisted)──► verified(verifiedAt set)
   ──(owner approvedBy/At)──► approved ──(ES provisional allowed per Invariant 12)──► published
published ──(verifiedAt + maxAgeDays elapsed OR expiresAt passed)──► STALE
   STALE: build FAILS for this entry (fail closed, like promotions) — never silently shown,
          never silently dropped; the build error names the entry and the date
   STALE ──(re-verify: new fetch, new verifiedAt, same or updated quote)──► published
        ──(source no longer supports it / owner withdraws / ownership change)──► retired
retired: kept in incoming/ with retiredAt; excluded from data/; CI asserts it is not served
```

Operational cadence: a quarterly "trust content verification record" in `docs/` in the same verbatim-quote format as `docs/financing-verification-2026-07-30.md` (browser session, timestamp with offset, verbatim quotes, discrepancy log). Any ownership, leadership, store-count or award change → owner notifies → affected entries retired the same day.

### 8.3 Gaps in the current `trustStories` prototype vs this register and vs the financing pattern

| Aspect | Financing (shipped) | `trustStories` (prototype) | Gap |
|---|---|---|---|
| `verifiedAt` | offset-bearing; build-time `_verified_age_exceeds` (validation.py 951) for promotions; runtime `financingTermsFresh()` (index.html 11105) fails closed | `YYYY-MM-DD` format check only (validation.py ~2502); **runtime never reads it** (quizTrustStoryMarkup 13379–13400) | **Not freshness-gated at all** — a 2026 date will still render in 2030 |
| `maxAgeDays` | required, 1..60 | absent | no expiry concept |
| `sourceUrl` | must be on `tools/source_hosts.json` allowlist; archive captures checked against embedded host | `_split_safe_https` only (~2498) — **any https host passes** | not allowlisted; and the customer never sees it (not rendered) |
| Evidence quote | verification doc holds verbatim quotes | none | no record of *what sentence* on the page supports the claim |
| Approval | `enabledByOwner` + `authority.owner/role` (promotions); owner rulings logged in roadmap | none | **no approval recorded anywhere**; CLAUDE.md calls it "retailer-authored" but nothing records who authored/approved |
| ES review | `esReviewStatus` enum, validated | none | no Invariant 12 ledger field |
| Placement safety | financing never affects scoring; placements enumerated | `questionIds` must cover every question exactly once — so the rail is **mandatory on every question including health ones** | forces a claim beside `health_conditions`; no placement type rules |
| Attribution frame | exact terms are verbatim from source | "Source: Lacks company history" label; sentence stated as plain fact | label is honest but the sentence form asserts fact; no `attribution` field |
| Retirement | promotions scenarios stay `{}` until governed | none | no retire path; deleting an item breaks the all-questions-mapped rule |
| Discrepancy log | financing doc has one | none | BBB 1924 / store counts unrecorded |
| Tests | validator self-tests + runtime suites + mutation sweep | validator self-tests only (5199–5217) | no runtime rendering test; no "stale entry fails build" proof |

---

## 9. Failure modes

1. **Silent staleness.** *Trigger:* `verifiedAt` is a date the runtime never reads and the validator never ages. *Symptom:* a history, award or leadership line stays on screen for years after Lacks' page changes (the About page's own "89th anniversary" shows how this happens even to the company). *Mitigation:* register `maxAgeDays` + `expiresAt`, build fails closed on stale, quarterly verification record, CI test that feeds a stale fixture and asserts the build error.

2. **Config drift makes a true privacy line false.** *Trigger:* someone sets `gasUrl` (or a future analytics sink) without touching trust copy. *Symptom:* "Your answers stay on this tablet" is displayed while a POST leaves the device — a deceptive privacy representation, the category the FTC enforces most readily. *Mitigation:* `displayCondition: previewModeOnly` enforced by the validator against `store-config.gasUrl`; runtime also checks; `tests/email_gating_check.mjs` extended to assert the line is absent when gasUrl is non-blank.

3. **Unallowlisted or dead source.** *Trigger:* a contributor pastes a blog, Yelp or AI-summary URL as `sourceUrl`; or lacks.com restructures (`/locations` already 404s). *Symptom:* claim "verified" against nothing the owner controls or can re-check. *Mitigation:* `trustSourceHosts` allowlist in `tools/source_hosts.json`, verbatim `quote` required per source, verification record requires a browser-session capture (lacks.com blocks fetchers).

4. **Persuasion adjacency.** *Trigger:* the current mapping puts a community-values line beside `sleep_issues` / `health_conditions`. *Symptom:* the customer discloses health information under a warm brand message — reads as manipulation and undermines the "justified trust" goal; in a live-send configuration this is sensitive-data context under TDPSA. *Mitigation:* placement rules in the validator (no community/award/testimonial beside health questions); prefer a privacy line there instead ("not saved or sent").

5. **Count inflation.** *Trigger:* anniversary or store-count text copied from a page. *Symptom:* wrong number within a year (already wrong on the source). *Mitigation:* counts are computed from a register field (`foundedYear`) with annual review, or not shown.

6. **Testimonial without paper.** *Trigger:* a salesperson relays "a customer said…" and it is typed into config. *Symptom:* unconsented, unverifiable endorsement; 16 CFR 465 exposure with per-violation penalties. *Mitigation:* §7 template is a precondition to authoring; validator rejects `claimType: testimonial` without `consent.obtainedAt` and `approvedBy`.

---

## 10. Ranked recommendations (by likely impact on *justified* trust)

1. **Ship code-true privacy/process lines first (P1, P2-gated, P3, P4).** They are verifiable by the customer in the moment, cost nothing to evidence, and address the suspicion a kiosk actually raises ("what happens to what I tap? are you steering me?").
2. **Build the register and validator before adding any more history copy.** Freshness gate (build + runtime), allowlisted hosts with verbatim quotes, approval fields, `esReviewStatus`, placement rules, retire path, discrepancy log. Reuse the financing/promotions code paths rather than inventing parallel ones.
3. **Reduce history to H1 (+ optionally H3), framed as company history, off the health questions.** One corroborated, specific, dated sentence beats five soft ones. Drop H5; treat H4 as optional.
4. **Fix the existing overstatements already in the quiz** (`mattress_size` helpText; "easy fix"/"first upgrade you'll feel" comfort promises; unframed `text.trustSignal`) — inconsistent honesty undermines the new content.
5. **Make the "top pick = Gold #1" rule visible or reword the badge.** A process note that explains tiers honestly ("best fit within each of Lacks' three ranges") is trust-building; a "top pick" that is secretly tier-first is the opposite.
6. **Record the BBB 1924 and store-count discrepancies and get an owner ruling**, then write the first `docs/trust-content-verification-<date>.md` in the financing-log format.
7. **Defer awards to the handoff screen with a year and hard expiry, if the owner wants them at all.** They are promotional, not trust-justifying.
8. **No testimonials this phase.** Adopt §7 as the precondition for any future round.

---

## 11. "Do not build / do not display" list

- Any store count, square footage, "largest", "most preeminent", "#1", "top-rated" superlative.
- Any anniversary count as literal text ("90 years"); any "since 1935" stated **without** the founding-year discrepancy resolved and a company-history frame (or independent corroboration noted in the register).
- Present-tense charity/donation claims naming organisations, unless each is confirmed and re-verified yearly.
- Reader's Choice / Furniture Today rank claims (stale, paywalled, or unverifiable here).
- Leadership names (OFF's are already superseded).
- The Lusitania / immigration biography.
- Testimonials, customer anecdotes, "families trust us", star ratings, review counts, "X people took this quiz".
- Any health-outcome promise ("relieves back pain", "stops snoring", "easy fix") in trust or "why we ask" copy.
- "In stock", "fast delivery", "made in Texas" in quiz copy (origin/availability claims were deliberately retired from scoring and reasons 2026-08-13; origin claims are FTC Made-in-USA territory).
- Any rate, term, APR, payment or "0%" wording outside the governed financing envelope.
- Absolute privacy promises: "never", "anonymous", "nothing stored", "deleted immediately", "never shared".
- Community/award/testimonial content adjacent to `sleep_issues` or `health_conditions`.
- A mandatory rail on every question (the current "map every question exactly once" rule forces low-value filler; make the rail optional per question).
- Displaying `sourceUrl` as a tappable link on the kiosk (leaves the locked app; the domain lock and kiosk hardening assume no outbound browsing except the governed financing links).

---

## 12. Open questions requiring Lacks owner approval

1. **Founding year:** BBB lists "Business Started 1/1/1924". Does any corporate record (charter, assumed-name filing, Texas SOS) date the business? Confirm 1935 or correct it before any "since 1935" line ships (this also affects the existing `text.trustSignal`).
2. **Who is the approver of record** for trust content (name + role), and may approvals be recorded in the register (`approvedBy/approvedAt`) rather than only in chat?
3. **Attribution frame:** is Lacks comfortable with "From Lacks' own company history" / "Según la historia de la propia empresa" on its own kiosk, or does it prefer to show only independently corroborated sentences stated plainly?
4. **Which external hosts may be cited** (`trustSourceHosts`): isjl.org, myhfa.org, rgvisionmagazine.com? Any objection to naming the Institute of Southern Jewish Life on screen?
5. **Ownership/leadership wording:** "family-owned" — confirm current ownership structure (Lacks Valley Stores, Ltd.) and who must be notified to retire H2 on any change.
6. **Store count and cities:** which number is current (7/9/10/11)? (Only needed to record the discrepancy; recommendation is not to display.)
7. **Awards:** display HFA 2025 Retailer of the Year on handoff with a 2026-12-31 expiry, or omit all awards?
8. **Tier semantics:** may the quiz state what Gold/Silver/Bronze mean and that the top-pick badge is the Gold range's best fit? (P3 depends on this.)
9. **Placement rule:** confirm that nothing but a privacy/process line may sit beside `sleep_issues` / `health_conditions`.
10. **Privacy copy owner:** the store-config `privacyBody` draft is marked "pending Lacks Furniture approval" — who reviews it, and should P1/P2/P4 replace it for preview mode?
11. **Native-Spanish reviewer** (Invariant 12) and **legal/compliance reviewer** remain unnamed in the roadmap; trust content adds to that ledger. Who?
12. **Testimonials:** confirm "not this phase"; if ever, confirm the §7 template as the precondition.
13. **Existing helpText edits** (`mattress_size`, `temperature`, `partner_disturbance`): owner sign-off to soften, since quiz copy is a governed contract field.


---

<!-- ===== SECTION 5: agent4-architecture.md ===== -->

# Agent 4 — Product architecture, implementation and testing review of the quiz trust-rail prototype

Scope: read-only investigation of `C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4` (branch `claude/nocturne-slice4-payment-choice` at 5436dea + uncommitted diff), cross-checked against the canonical repo `C:\Users\BlakeFord\Documents\GitHub\LacksFurniture` (origin/main = 4a76503; local checkout on `claude/nocturne-slice5-sleep-plan` @ 6decbef). All line numbers below are **working-tree** lines in the prototype checkout unless prefixed `origin/main:`. Nothing was modified in either repo (`git status` line count identical before/after every command: 25).

---

## 1. Summary conclusion

**The prototype is a competent, fail-soft, white-label-clean rendering of retailer heritage facts under the quiz navigation. It does not yet meet the standard this repo applies to customer-facing claims, and — more importantly — it is aimed at the wrong kind of trust.**

What it does well:
- Data flow is complete and round-trips: `incoming/dreamfinder_quiz.json` → workbook Quiz tab → `data/quiz.json` → runtime, with the lineage check green (10/10) and the committed workbook carrying the identical block (verified by loading the xlsx: `workbook trustStories == incoming: True`).
- Runtime is side-effect-free, stateless, escaped, deterministic, bilingual, reset-safe and fails soft (rail omitted) on absent/malformed data.
- White-label boundary is intact: `index.html` contains no retailer name (smoke 112/112 incl. the `"Lacks" not in html` guard, `tests/smoke_check.py:285-286`).
- All read-only suites pass: validator self-test 765/0, quiz presentation 201/201, contrast 90/0, smoke 112/0, session safety 489/0, converter self-test 16/0, workbook validation OK, lineage 10/10.

Exact gaps against the repo's own bar for a trust feature:
1. **Provenance is stored, not enforced.** `verifiedAt` is format-checked only (`tools/validation.py:2494-2496`) — no `maxAgeDays`, no future-date check, no staleness gate — unlike financing (`validation.py:1775-1794, 1921-1928`). `sourceUrl` is checked for "safe https" only (`_split_safe_https`, `validation.py:462-483`); it is **not** allowlisted against `tools/source_hosts.json` (the validator self-test passes with `https://example.com/history`, `validation.py:5206`), and `validate_quiz` is the only validator the converter calls **without** a source-host list (`tools/convert_store_data.py:852` vs `:840-849`). No approval/verification record exists anywhere (grep for `about-us`/`trust` across `docs/` returns nothing; compare `docs/financing-verification-2026-07-30.md`).
2. **The "visible provenance" is a label, not provenance.** The customer sees the string "Source: Lacks company history"; `sourceUrl` is never rendered or reachable (`index.html:13379-13401` renders `label`, `text`, `sourceLabel` only). That is correct for a kiosk (no external navigation) but it means the rail *asserts* sourcing rather than *demonstrating* it.
3. **No mutation proofs.** The TRUST RAIL assertions (`tests/quiz_presentation_check.mjs:267-318`) have no negative control in the suite's own control section (`:1181-1299`) and no entry in `tests/mutation_sweep.mjs` (QUIZ entries `:861-908` contain none). This repo's standard (memory: "verify tests fail on the defect") is not met.
4. **Build/runtime contract mismatch.** The validator requires every canonical question mapped exactly once (`validation.py:2505-2508`); the runtime tolerates any partial mapping and any per-language gap (`index.html:13380-13390`, `L()` EN fallback `:11815-11819`). Two definitions of "valid" for the same block.
5. **Placement under Back/Next** means the rail is the last thing in the scroll container; on the landscape iPad (1194×748) with the 8-option questions it is likely below the fold (not measured — no layout tool exists in either checkout).
6. **Content/trust mismatch (the product question).** The five facts are brand-heritage statements (auto-parts origin, Mission store, wartime pivot, civic service) mapped to consecutive question pairs with no relationship to the question being asked. They build *affinity*, not *justified trust in the recommendation process*. The things a customer could rationally verify or be reassured by — what happens to their answers, why a question is asked, how the match is computed — already partly exist (helpText, "Why it matches you", the Sleep Brief) and are not surfaced as a coherent transparency layer.

Verdict: **do not ship the heritage rail as-is.** The *mechanism* (optional governed block → deterministic per-question mapping → stateless `<aside>` renderer → fail-soft) is reusable and good; the *content class* and *governance* should change. See §8 and §13.

---

## 2. Canonical vs generated file map

| File | Role | Evidence |
|---|---|---|
| `incoming/dreamfinder_quiz.json` | **Canonical** quiz source (`quiz` key incl. new `trustStories`) | `incoming/build_lacks_workbook.py:247-251` loads it and writes the envelope verbatim |
| `incoming/lacks_store_values.json` | **Canonical** store text (trustSignal shortened in diff) | builder input |
| `incoming/lacks_financing.json`, `incoming/lacks_promotions.json` | **Canonical** Promotions envelope | builder |
| `incoming/Lacks_Store_Data.xlsx` | **Generated intermediate** (by `incoming/build_lacks_workbook.py`), but committed | Quiz tab = chunked `{"quiz": …}`; `workbook_schema.py:410-425` |
| `data/quiz.json` | **Generated** (`tools/convert_store_data.py:347-367 build_quiz`, `:894-896 write_json`) | never edit |
| `data/store-config.json`, `data/allowed-hosts.js`, `data/accessories.json`, `manifest.json` | **Generated** by converter | |
| `demo/black-friday/index.html`, `demo/black-friday/data/store-config.json` | **Generated** by `tools/build_black_friday_demo.py` from root `index.html` + config | demo rewrites only the store-config path (`build_black_friday_demo.py:301-303`); it **shares production `./data/quiz.json`** |
| `index.html` | Hand-authored app | |
| `outputs/trust-stories-workbook/` (untracked) | Scratch output of `build_lacks_workbook.py --out` (byte-identical to `incoming/Lacks_Store_Data.xlsx`, verified with `cmp`) plus an `.inspect.ndjson` cell dump | delete-safe, must not be committed |

**Consistency check (content, not bytes):** a recursive JSON comparison of `incoming/dreamfinder_quiz.json["quiz"]` against `data/quiz.json` reports zero differences (keys `trustStories`, `questions`; 10 questions). The workbook Quiz tab, reassembled, equals the incoming block. `tests/lineage_check.py` (CI step `ci.yml:223`) confirms sources → workbook → bundle canonically equal: 10/10.

Note: the demo bundle has **no** `data/quiz.json` of its own (`demo/black-friday/data/` contains only `store-config.json`), so any trust content in production `data/quiz.json` appears in the demo automatically — acceptable for heritage facts, but a governed-claims block would need the same "demo never leaks into production" discipline in reverse (production content leaks *into* the demo by construction).

---

## 3. Working-tree inventory: trust delta vs Slice 4 delta (hunk level)

`git diff --stat`: 21 files, +1490/−1052, plus untracked `outputs/`.

### Trust-rail delta (MUST be separated before any rebase)
| File | Hunks (`git diff -U0`) | Content |
|---|---|---|
| `index.html` | `@@ -1504,0 +1505,45` | `.noct-quiz-trust*` CSS (grid, label, source, text) |
| | `@@ -1594,0 +1640,5` | ≤700px: single column |
| | `@@ -9601,0 +9652,12` | forced-colors: CanvasText for rule + three text classes |
| | `@@ -12410,0 +12497,8` | loader: `window.__DF_QUIZ_TRUST_STORIES` from `payload.trustStories`, fail-soft |
| | `@@ -13284,0 +13379,24` | `quizTrustStoryMarkup(questionId)` |
| | `@@ -13341,0 +13460` and `@@ -13398,0 +13518` | two call sites after `.noct-quiz-nav` in `renderQuestion` (slider branch and option branch) |
| `demo/black-friday/index.html` | the same 7 hunks at +2/+46 offsets (diff of the two diffs differs only in `@@` line numbers) | regenerated demo |
| `incoming/dreamfinder_quiz.json` | `+6..+99` | `quiz.trustStories` (label + 5 items) |
| `data/quiz.json` | `+2..+94` | generated copy |
| `incoming/Lacks_Store_Data.xlsx` | binary | Quiz tab payload now carries the block (and Promotions tab carries Slice 4 financing changes — **mixed** binary, cannot be split by hunk; must be regenerated from whichever incoming set is kept) |
| `tools/validation.py` | `@@ -2376,8 +2427,86` (trustStories validation + `unknown_root` check) and the `qtrust*` self-tests in `@@ -5028,6 +5195,29` | |
| `tests/quiz_presentation_check.mjs` | all hunks (`SOURCES` +escape/+story, `makeQuizEnv` stories param, TRUST RAIL section) | trust-only file |
| `CLAUDE.md` | `+143..+149` | policy paragraph legitimising `trustStories` in quiz.json |
| `incoming/lacks_store_values.json` → `data/store-config.json` → `demo/.../store-config.json` | `text.trustSignal` / `text_es.trustSignal` shortened ("Family-owned in South Texas since 1935") | trust-adjacent copy edit; **`trustSignal` has zero consumers in `index.html`** (grep count 0), so this is a no-op on screen |

### Slice 4 (payment-choice) delta — everything else
`index.html` hunks from `@@ -9687` through `@@ -19993` except the seven above (agenda→choice rename, `financingSurfaceEnabled`, `payExplored/payPref/payDetailsOpen`, handoff region comments, wipe step 5), `tests/{email_gating,financing_copy_policy,financing_render,handoff_interest,scoring_isolation,session_async,session_safety}_check.mjs`, `tests/smoke_check.py` (event-name sweep only), `tools/validation.py` hunks at 1375/1463/1479/1788 and the financing self-tests, `incoming/lacks_financing.json`, `data/store-config.json` financing/voice changes, `docs/rebuild-roadmap.md`, `manifest.json`, `data/accessories.json`, `data/allowed-hosts.js`. Grep of every one of these diffs for `trust|stories|heritage` returns 0 lines.

**This Slice 4 delta is superseded**: origin/main already contains C0–C13 (`69895bc..ee6e402`, merged as `b2acd7e`, docs `4a76503`). The prototype's Slice 4 state is closest to C1/C2. It must be **discarded**, not rebased; only the trust files are new information.

---

## 4. Runtime behaviour findings

### 4.1 Load
`index.html:12490-12505` — quiz loader (core source). `questions` missing/empty → hard failure (`throw 'quiz.json has no questions'`, :12495). `trustStories` → `window.__DF_QUIZ_TRUST_STORIES` only if it is a non-array object with an `items` array; else `null` (:12500-12504). No per-item validation at load.

### 4.2 Render and re-render
- `window.renderQuestion` (:13403-13525) replaces the **entire** `#questionContainer` via `container.innerHTML =` in both branches (:13435, :13481). The aside is emitted last, after `.noct-quiz-nav` (:13460, :13518).
- `selectOption` (:13550-13604) mutates `answers` then calls `renderQuestion()` (:13596) → the aside is destroyed and rebuilt on **every option tap**. Markup is byte-identical between renders for the same question+language (pure function of `q.id`, block, `currentLang`), so nothing visibly changes.
- Animation: the "re-trigger" at :13522-13524 toggles `container.style.animation`, but `#questionContainer` (:10251) has no `question-container` class and no animation rule (`body:has(#questionScreen.active) #questionContainer { width:100% }`, :1306; `fadeUp` is only on `.question-container`, :4638-4642). **The re-trigger is inert in the Nocturnal skin; the aside does not flash.** The prototype's CSS comment "carries no independent animation" (:1505-1507) is accurate.
- Focus: `selectOption` restores focus only to the activated option when it was `:focus-visible` (:13575-13586, :13597-13602). The aside is non-focusable (no `tabindex`), so it never participates; pinned by `tests/quiz_presentation_check.mjs:303-306`.
- Accessible name: `<aside aria-labelledby="quiz-trust-label-<qid>">` (:13393-13395) — one per container, id uniqueness holds because only one question is ever in the DOM. (VoiceOver is owner-ruled out of scope; noted for completeness only.)

### 4.3 Language switch mid-quiz
`switchLanguage` (:12086) → after dictionary install, `applyTranslations(); applyStoreConfig();` then, if `#questionScreen` is active, `window.renderQuestion()` (:12117-12120). The aside is rebuilt with `L(block.label)`, `L(story.text)`, `L(story.sourceLabel)` under the new `currentLang` (:13388-13390). **Aside updates correctly.** `L()` falls back to `en` when the active language key is missing (:11815-11819) — silently English in ES mode if ES copy were absent (the validator prevents this at build, the runtime does not).

### 4.4 Skip / Back
- `nextQuestion` (:13618-13641): on entering a question whose `skipIf` matches, stamps `not_applicable` and advances again. `prevQuestion` (:13643-13670) steps back over it. `visibleQuestions()` (:13324-13328) drives progress numbering only.
- Only `partner_disturbance` has `skipIf` (`partner_sleep == solo`). Its story mate is `partner_sleep` (`mcallen-auto-parts-origin`, `data/quiz.json` item 2). Solo path: story shown once (on Q3) instead of twice. **No story becomes unreachable; none is shown out of sequence.** Every story is shown on two consecutive screens (pairs 1-2, 3-4, 5-6, 7-8, 9-10) — i.e. the customer sees the same fact repeated on two consecutive questions, in between which every option tap re-renders it.
- Review → Edit → question (`editingFromReview`) and Review → Back → last visible question (:13644-13651) both go through `renderQuestion`, so the aside shows for the revisited question. No special casing needed.

### 4.5 Reset between customers
`resetSessionState` (:20025-…): step 3 clears `currentQuestion`, `answers`, `editingFromReview` (:20082-20084); `SESSION_LAYERS.forEach(wipeLayer)` handles screens. The aside has **no state** — it is derived from the load-time global + `currentLang` + `currentQuestion`. The wipe returns language to English, so the next customer's first question renders the EN story. Nothing to add to the wipe inventory.

### 4.6 Failure behaviour — build vs runtime
| Condition | Build (`validate_quiz`) | Runtime |
|---|---|---|
| `trustStories` absent | OK (optional) | rail omitted |
| `trustStories` not an object / `items` not a list | error (:2441-2448) | global `null`, rail omitted |
| item missing `text`/`sourceLabel` EN or ES | error (:2474-2477) | `L()` EN fallback; if both missing → `''` → rail omitted for that question (:13391) |
| a question unmapped | **error** (:2505-2508) | rail omitted silently for that question |
| question mapped twice | error (:2499-2502) | first match wins (`filter(...)[0]`, :13382-13385) |
| `sourceUrl` off-allowlist (e.g. example.com) | **passes** (:2490-2492; self-test :5206 proves it) | never read |
| `verifiedAt` 10 years old / in the future | **passes** (format only, :2494-2496) | never read |
| HTML in text | error (:2476-2478) | would be escaped anyway (`escapeHtml`, :14518) |
| unknown root key in quiz envelope | **new error** (:2430-2432) — tightens the contract for every retailer | ignored |

Inconsistency to resolve: the validator's "every question exactly once" rule (and its CLAUDE.md justification "so skip/back paths cannot accidentally show a mismatched or blank claim") is not what the runtime enforces; the runtime is happy with a blank rail on some questions. Either the rule is a product decision ("a rail on every question or none") and the runtime should also go all-or-nothing, or the rule should be relaxed to "each mapped question at most once". Pick one.

---

## 5. Governance / provenance: enforced vs stored

| Control | Financing / Promotions | Trust stories (prototype) |
|---|---|---|
| `verifiedAt` freshness (`maxAgeDays`, fail-closed) | enforced (`validation.py:1785-1794`, `:1921-1928`; promos `:1334-1345`) | **stored only** — `YYYY-MM-DD` regex, :2494-2496 |
| future-dated `verifiedAt` rejected | yes (`_materially_future`, :1781) | no |
| `sourceUrl` host allowlist (`tools/source_hosts.json`) | enforced; converter passes the list (:840-849) | **no** — `validate_quiz(quiz)` receives no hosts (:852); `source_hosts.json` has no quiz/trust key |
| shipped `allowedSourceHosts` mirror for the browser | yes (`financing.allowedSourceHosts`) | n/a (URL never shipped to the customer) |
| ES review status / owner authorisation fields | promotions scenarios carry `esReviewStatus`, `enabledByOwner`, `authority` (:844-845) | none |
| written verification record | `docs/financing-verification-2026-07-30.md` | none |
| customer can see the source | financing shows official links/QR (allowlisted) | sees the text "Source: Lacks company history" only |
| reverification tool | `tools/reverify_financing.py` | none |
| workbook round-trip | Promotions tab envelope | **preserved** — builder passes `src["quiz"]` whole (`build_lacks_workbook.py:247-251`); converter returns `parsed["quiz"]` whole (`convert_store_data.py:364-367`); `workbook_schema.py` needs no change (Quiz tab is an opaque JSON payload, :410-425) |
| demo bundle | demo config is injected separately | demo shares production `data/quiz.json` → inherits stories |

Conclusion: the block is **governed in shape, not in truth**. The repo's own financing rules are the template; the prototype copied the field names (`verifiedAt`, `sourceUrl`) without the semantics.

---

## 6. White-label boundary

- `index.html`: zero occurrences of "Lacks" (only lowercase verb "lacks" in a comment, :12012). Smoke guard `tests/smoke_check.py:285-286` green.
- The label "From the Lacks story" / "De la historia de Lacks" lives in `data/quiz.json` (retailer data), not in `dict-*.json` and not hardcoded. ✔ for the hardcoding rule.
- BUT per `CLAUDE.md` (unmodified text, lines ~130-141): quiz.json **structure is an app-level contract** and per-retailer variation is **copy only**; retailer-specific copy belongs in `store-config.json` `text`/`text_es`. The prototype adds a new top-level structure to the quiz envelope and edits CLAUDE.md (+143-149) to permit it. That is a **boundary change that needs web review** under the "working pattern" section, and it means every retailer's quiz envelope now accepts retailer prose. The `unknown_root` check (:2430) also makes the envelope stricter for all retailers at the same time.
- `store-config.text.trustSignal` is a dead field (0 consumers in `index.html`; `landingHeritage` renders `text.heritage`, :13119). The diff's shortening of `trustSignal` changes nothing visible — worth knowing before anyone claims it as a copy change.
- CSS tokens used are the shared consultation palette (`--consultation-muted #685C4D` on `--consultation-bg #F4EFE6` = 5.68:1; label `--accent-ink` = 12.8:1) — no retailer colour leaked. `tests/contrast_check.mjs` does not cover the new classes (quiz rules at :301-370 only), though the same token pair is already proven on `.noct-quiz-help`.

---

## 7. What already exists that serves transparency

**Per-question "why we ask" already exists as `helpText`** (rendered at `index.html:13444/13490`, source `data/quiz.json`):
- trigger: "No pressure — this just helps your specialist focus on what matters to you."
- mattress_size: "So every mattress we show actually fits your space."
- partner_sleep: "Who shares your bed shapes which features matter most."
- partner_disturbance: "Motion isolation is one of the first upgrades you'll feel."
- sleep_position: "Your sleep position is the biggest clue to the support you need."
- body_type: "This helps us account for cushioning, support, and durability." (+ `copyVariants` for couples: "If you fall into different ranges, choose 'Different weight ranges.'", resolved by `resolveQuizCopy`, :13334-13344)
- temperature: "Sleeping hot or cold is an easy fix with the right materials."
- firmness: "No wrong answer here, just slide to what feels best."
- sleep_issues: "Tap anything you've noticed. Each one points us toward a fix."
- health_conditions: "Tap any that apply. A few of these change what we'd suggest."

So a separate `whyWeAsk` field would duplicate a slot that is already bilingual, answer-aware, governed by `validate_quiz`, and rendered on every question. The uneven quality ("Sleeping hot or cold is an easy fix…" is a sales assertion, not a reason) is a **copy** problem, fixable inside the existing contract.

**Sleep Brief already explains the recommendation basis** (`profileScreen`, :10270-10289; copy :14080-14089, dict `brief.*`): hero "Made from your answers"; reflection sentence built from answers ("You are shopping for a Queen, …, and prefer …"); "What we will test together" with intro "Use these signals to compare each mattress instead of relying on first impressions alone."; priorities derived from `salesNotes.consultationImplications` (retailer-authored, keyed by question/option id — e.g. `sleep_issues.back_pain → "test lower-back support carefully"`).

**Results/drawer**: "Tap any match to see why it fits" (:10301); drawer section `drawer.why_matches` "Why it matches you" fed by `matchReasons` (:13749-13808, e.g. "Matches your firmness preference (7/10)"); Sleep System "Suggested first because you mentioned back pain." (:17049-17055).

**Privacy**: email screen line `text.emailPrivacy` "We'll only use your email to send your results." + static "Your info is never sold to third parties." + Privacy & Terms overlay (:10742-10745); overlay body `text.privacyBody`, disclaimer `text.disclaimerBody`. **Caution:** `text.privacyDraftNotice` = "Draft policy — pending Lacks Furniture approval before live use." is rendered (:13044) — the privacy policy itself is currently a draft, which is a trust liability that no heritage fact offsets.

**Verifiable process facts the code can back:** quiz answers live only in module state (`answers`, :13215; `analytics`, :14375 in-memory); the only outbound write is the email POST `fetch(gasUrl, …)` (:16445), gated on the customer submitting the form; `localStorage` holds only the device RSA name/list (:16285, :19049-19059). Financing never reads answers (`tests/scoring_isolation_check.mjs`). These are statements a customer *can* rationally trust and that CI already pins — nothing currently tells the customer any of them during the quiz.

---

## 8. Architecture recommendation

### Where content lives
Recommendation: **a new governed block in `store-config.json`, not in `quiz.json`** — call it `supportingCopy` (or `transparency`). Rationale: CLAUDE.md places retailer prose in store-config and keeps quiz.json copy-only on an app-contract structure; store-config is already a core load with the same fail-hard boot; the Store Info / Promotions channel already carries governed JSON envelopes with freshness + allowlist semantics. Keep the prototype's **mapping-by-stable-question-id** idea (ids are app constants, so a store-config block may reference them; the validator already knows `QUIZ_CANONICAL`).

Alternatives considered:
- *Keep in `quiz.json` (prototype)* — works, round-trips free, but widens the quiz contract for every retailer and contradicts the copy-only rule; needs the CLAUDE.md amendment + web review.
- *Dict keys* — only for **app-level** truths ("Your answers stay on this tablet…"), never for retailer facts. Use this for the process note.
- *New file `data/trust.json`* — clean but adds a loader entry, a workbook tab, schema, builder and converter plumbing; not justified for ~5 strings.

### Schema (sketch, no code)
```
supportingCopy: {
  process: { en, es }                      // one app-neutral-but-retailer-phrased process line, optional
  facts: [ { id, questionIds[], text{en,es}, sourceLabel{en,es},
             sourceUrl, verifiedAt (ISO instant), maxAgeDays (1..365),
             esReviewStatus, approvedBy?, approvedAt? } ]   // optional
}
```
Validation = financing pattern: `_valid_iso_instant` + `_materially_future` + `maxAgeDays` staleness fail-closed; `sourceUrl` host ∈ a new `tools/source_hosts.json` key (`supportingCopySourceHosts`); plain-text only; bilingual; ids slug; questionIds ⊂ canonical, each at most once; a `docs/trust-facts-verification-<date>.md` record referenced by convention (like financing).

### Deterministic mapping
Keep exactly-one-story-per-question lookup by id, but make build and runtime agree: recommended policy **"at most once; unmapped question shows nothing"** (relax the validator) — it matches runtime and lets a retailer run 2–3 good facts rather than padding to 10 questions with filler (which is what produced "auto-parts origin" under "who shares your bed").

### Fail-soft policy
As prototyped: absent/malformed block → no rail, quiz unaffected; **plus** stale (`verifiedAt + maxAgeDays < today`) → build error (never reaches the tablet). Runtime stays ignorant of dates (no clock dependency on a kiosk).

### Rendering
Reuse the prototype's `<aside>` renderer verbatim in behaviour (stateless, escaped, non-focusable, no timers, no animation) but **move it above the nav** or into the help area: content that explains the question should sit with the question, not after the Next button. For the process note, render once (Q1 only, or in the eyebrow row) rather than on all ten screens.

### Language / reset
No change needed — derive from `currentLang` at render; `switchLanguage` already re-renders; wipe already resets language. Any new dict keys get the standard EN/ES parity test.

---

## 9. Test plan

**Extend (not new files where possible):**
- `tests/quiz_presentation_check.mjs` — keep the TRUST RAIL section's rendering assertions; add: (a) negative controls in the `negative controls` section (:1181+): strip the renderer call → "rail missing" detected; swap `questionIds` lookup to `answers`-based → "personalised" detected; (b) skip-path assertion: solo answers → `partner_disturbance` never rendered, mate story appears once; (c) EN→ES re-render of the same question yields the ES strings and no EN residue; (d) after `resetSessionState` the first rendered question carries the EN story (wipe section, :621).
- `tests/mutation_sweep.mjs` — add QUIZ-observed entries: delete both `${quizTrustStoryMarkup(q.id)}` call sites; replace `indexOf(questionId)` with `true` (first story everywhere); drop `escapeHtml` on `copy`; remove the forced-colors trust block. Each must be caught by the quiz suite (repo rule: fail on the defect first).
- `tools/validation.py --self-test` — add: stale `verifiedAt` → error; future `verifiedAt` → error; off-allowlist host → error (this is the one that currently **passes**, :5206); duplicate `questionIds` across items → error; unknown question id → error.
- `tests/contrast_check.mjs` — add the three trust classes to the quiz rule table (:301-370) so a token change is caught.
- `tests/smoke_check.py` — keep the retailer-name guard; add "no `sourceUrl` string reaches `index.html` output" if the block moves to store-config (the converter must not project it into any rendered field).
- `tests/lineage_check.py` — already covers round-trip; no change if the block stays in an existing envelope; if a new `source_hosts.json` key is added, extend the converter's allowlist argument.
- Forced-colors: no rendering environment exists (`quiz_presentation_check.mjs:720-724` says so); keep the textual cascade check and put it in the manual gate.

**CI:** all of the above are already registered (`ci.yml:188, 256, 434, 465`); nothing new to register unless a new suite is created.

**Manual gates (existing owner pattern):** iPad Pro 11" both orientations EN+ES, Windows forced-colors rendered, reduced-motion — verify the aside is visible without scrolling on the 8-option questions in landscape (748px), or accept that it is not.

---

## 10. Failure modes

1. **Stale or wrong fact ships indefinitely.** Trigger: a story's `verifiedAt` is never refreshed, or the about-us page changes. Symptom: the kiosk keeps asserting a dated/incorrect company fact with "Source: …" attached — worse than no claim. Mitigation: `maxAgeDays` fail-closed at build + `reverify` tooling + a dated verification doc (financing pattern).
2. **Contract drift between validator and runtime.** Trigger: a retailer ships 3 stories; the validator (exactly-once-for-all) fails the build while the runtime would have been fine — or, the validator is bypassed (pre-migration deployment with an older converter) and the runtime happily renders partial/EN-only content in ES mode. Symptom: either blocked builds for valid content, or silent English in Spanish. Mitigation: single policy (§8), runtime ES-missing → omit rail rather than fall back to EN for this block.
3. **Rebase onto the wrong Slice 4.** Trigger: applying the working-tree diff wholesale onto origin/main. Symptom: reintroduces the pre-C3..C13 payment-choice code (surfaces, identity hardening, C13 copy gate) and breaks 14 suites. Mitigation: cherry-pick only the seven `index.html` hunks + quiz/validator/test/CLAUDE.md trust hunks; regenerate the workbook from current `incoming/`; discard everything else.
4. **Demo bundle inherits production claims.** Trigger: demo rebuilt from a production `data/quiz.json` (or store-config) carrying governed facts. Symptom: prospect-facing demo shows Lacks-specific sourced claims under an illustrative Black Friday campaign. Mitigation: decide explicitly; if undesired, have `build_black_friday_demo.py` strip the block from the demo config.
5. **Below-the-fold rail.** Trigger: 8-option question, landscape 1194×748. Symptom: the trust content is never seen on the questions where it was meant to help; cost without benefit. Mitigation: place above nav / in help area; measure on device.
6. **Relevance mismatch erodes rather than builds trust.** Trigger: "The first Lacks store opened … as a small auto-parts business" under "Who shares your bed?". Symptom: reads as advertising interrupting a consultation; the label "From the Lacks story" makes the interruption explicit. Mitigation: content class change (§11).

---

## 11. Ranked recommendations by likely impact on JUSTIFIED trust

1. **Process-transparency note during the quiz** (app-level, dict-driven, bilingual, TRUE and CI-pinned): "Your answers stay on this tablet and only shape your matches. Nothing is sent unless you choose to save your Sleep Brief." Shown once (Q1) or as a persistent quiet line. Backed by `email_gating`/`session_async`/`scoring_isolation` suites. Highest justified-trust yield per line of code.
2. **Tighten existing `helpText` so every line is a real "why we ask"** (copy-only change inside the governed contract; no new structure). Replace assertions like "an easy fix with the right materials" with reasons ("We use this to favour cooling or warming materials in your matches.").
3. **Result-side explanation is already there — make it findable**: the drawer's "Why it matches you" and the Sleep Brief's "Made from your answers" do the real work. A one-line pointer at the end of the quiz/review ("Next: your Sleep Brief shows how each answer shaped your matches") closes the loop.
4. **Privacy policy out of draft.** `text.privacyDraftNotice` currently tells customers the policy is unapproved. Resolving that beats any heritage copy.
5. **Sourced retailer facts, governed like financing** (freshness + allowlist + record + ES review), **few and relevant**, placed where they answer a customer question (e.g. delivery/showroom facts at handoff, "family-owned since 1935" on Welcome — already present as `text.heritage`). Optional; low incremental trust because Welcome already states it.
6. **Heritage rail as prototyped on every question** — lowest; repeats a brand fact twice per pair, unrelated to the question, below the nav.

---

## 12. Do not build

- A per-question `whyWeAsk` field — duplicates `helpText`.
- Rotating/timed/randomised or answer-personalised stories (prototype already forbids; keep forbidding).
- Rendering `sourceUrl` or any outbound link from the quiz (kiosk; domain-locked; financing is the only sanctioned external path).
- Any trust block that reads `answers` or feeds scoring (isolation invariant).
- A new workbook tab / new `data/*.json` for this — use an existing envelope.
- The `unknown_root` strictness on the quiz envelope unless the team wants it for other reasons — it changes every retailer's contract as a side effect.
- Anything on top of the prototype's Slice 4 files; they are stale.

---

## 13. Smallest valuable implementation (file-level, no code)

Target: origin/main (4a76503) or after Slice 5 lands; quiz renderer is untouched by Slice 5 (diff of `claude/nocturne-slice5-sleep-plan` vs origin/main has 0 hits on `renderQuestion`/`noct-quiz-nav`/loader).

1. `data/dict-en.json`, `data/dict-es.json` — add `quiz.process_note` (app-level, retailer-neutral, factual per §7).
2. `index.html` — in `renderQuestion`, emit one `<p class="noct-quiz-process">` (or reuse the `.noct-quiz-help` style) **above** `.noct-quiz-nav`, only when `stepIdx === 0` (or always, owner's call); no new globals, no loader change; CSS next to the `.noct-quiz-help` rule plus the same forced-colors treatment the prototype wrote (7 lines).
3. `incoming/dreamfinder_quiz.json` → workbook → `data/quiz.json` — copy-only `helpText` edits for the weak lines (temperature, firmness, sleep_issues); no structure change, `validate_quiz` unchanged.
4. `tests/quiz_presentation_check.mjs` — assert the note renders EN/ES, is not focusable/live, and survives language switch; add one negative control; `tests/mutation_sweep.mjs` — one QUIZ entry deleting the note.
5. `tests/session_safety_check.mjs` — EN/ES dict parity already enforced; nothing else.
6. `docs/rebuild-roadmap.md` — record the ruling that heritage facts are deferred to a governed `supportingCopy` block (financing-pattern), if the owner wants them at all.

If the owner *does* want sourced retailer facts now: additionally (a) `incoming/lacks_store_values.json`/builder → `store-config.supportingCopy`, (b) `tools/validation.py` `validate_supporting_copy` modelled on `validate_financing` (freshness, allowlist via a new `tools/source_hosts.json` key, plain text, bilingual), called from `convert_store_data.py` with the host list, (c) loader reads `STORE_CONFIG.supportingCopy`, renderer = prototype's `quizTrustStoryMarkup` moved above nav, (d) `docs/trust-facts-verification-<date>.md`, (e) self-tests + mutation entries as §9. Retire the quiz.json `trustStories` block and the CLAUDE.md paragraph.

---

## 14. Open questions

1. Does the owner want brand-heritage content in the quiz at all, or only process/privacy transparency? (Everything in §13 step 2–4 is valuable regardless.)
2. If facts are kept: one policy for "every question or none" vs "at most once"? Validator and runtime currently disagree.
3. Should the demo bundle show governed retailer facts, or should the demo builder strip them?
4. Is `store-config.text.trustSignal` meant to be rendered somewhere (currently dead), or should it be retired from the schema?
5. Who verifies the five about-us facts and where is that recorded (no record exists; `verifiedAt: 2026-08-20` is asserted only)?
6. Placement: is "below Back/Next" an intentional design (quiet, ignorable) or an accident of implementation? If intentional, it should be measured on the 748px landscape iPad before calling it "visible".
7. Is the `unknown_root` tightening of the quiz envelope wanted independently of this feature?


---

<!-- ===== SECTION 6: redteam.md ===== -->

# Red team — attack on the emerging recommendation (2026-08-21)

Target: `emerging-recommendation.md` (R1–R7, measurement plan, "smallest valuable implementation" = R1+R2+R3).
Method: read all five reports + the About-page capture, then re-checked every claim I attack against the prototype tree `C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4` (read-only; `git status` line count 25 before and after). Line numbers are working-tree lines in that `index.html` unless stated. Nothing was written to any repo.

Verdict key: **SURVIVES** = the recommendation should change; **PARTIALLY** = a specific clause should change; **FAILS** = objection does not hold.

---

## (a) The ten challenges

### 1. "This is just more advertising" — PARTIALLY SURVIVES

**Strongest objection.** The recommendation swaps heritage persuasion for integrity persuasion. A "why we ask" line written by the retailer's copywriter is still the retailer talking about itself; "Your answers stay on this tablet" is a reassurance with the same rhetorical job as "family-owned since 1935" (make me comfortable, keep me answering). And the plan's success metric — T1–T7 up — is *felt* trust. Agent 1's own evidence #15 (Eiband et al. 2019) says placebic explanations raise felt trust about as much as real ones. So the measurement cannot distinguish justified trust from successful trust-washing; an advertiser would use the same card and call it a win.

**Evidence.** The app already runs three reassurance lines in the first 30 seconds: `text.timeEstimate` "About 2 minutes · No pressure" (`data/store-config.json:422`), the Q1 helpText "No pressure — this just helps your specialist focus…" (`data/quiz.json`, trigger), and on results `results.specialist_cue` "Ask your sleep specialist to walk you through each option" (`data/dict-en.json:47`). Adding a fourth reassurance is the same "protesting too much" pattern A1 flagged for "since 1935" — and John, Acquisti & Loewenstein (A1 #8) applies to reassurance generally, not only to privacy.

**Where it fails.** A sentence that is literally true, verifiable by the customer's own action (tap Restart → everything gone), and gated by the validator is not advertising by any usable definition; it is the thing the customer would want to know. The objection does not survive against R3 *in principle*.

**Where it survives.** (i) The proposed wording has a false clause (see #4), which turns it into exactly the trust-washing the objection fears. (ii) The measurement plan needs at least one *objective* comprehension item (e.g., "Which of these did the quiz use to rank mattresses? price / firmness / brand / financing") so the team can tell justified from placebic. (iii) The recommendation should cap total reassurance lines, not just add one — retire or merge the duplicate "No pressure" in the Q1 helpText if the welcome line stays.

**Change.** Add an objective comprehension item to the card; treat "one data-use line" as "one, net of existing reassurances"; fix the wording per #4.

---

### 2. "The content distracts from the quiz" — PARTIALLY SURVIVES

**Strongest objection.** Every line the agents cite (split attention, satisficing, privacy salience) argues that the first health question is the *worst* place to put a privacy sentence: John et al. (A1 #8) is the one study that speaks directly to placement, and it says confidentiality assurances right before sensitive items reduce disclosure. Reduced disclosure on `sleep_issues`/`health_conditions` means lost scoring signal (those options carry 3-point tags, `data/quiz.json` sleep_issues/health_conditions) and worse matches — the single biggest trust destroyer per A1. The recommendation hedges "welcome and/or first health question", keeping the bad option alive.

**Did the agents under-weight NONE?** No. A2 already names NONE-during-questions as the recommended default; A1 calls it "acceptable baseline"; R2 is copy-only (adds no lines); R1 is a defect fix. The smallest implementation adds exactly one sentence, once. NONE is not better than that *if* the sentence is off the question screens.

**Change.** Resolve "and/or" to one placement that is **not a question screen**. Best candidates, in order: (1) welcome screen, directly under `landingTimeEstimate` (`:13098`) where expectation-setting already lives and the customer reads at rest; (2) the **review screen** (`#reviewScreen`, `:10256-10267`), which nobody examined — it is the one moment all answers (including health labels) are visible on one screen, disclosure is already complete so the John effect cannot bite, and the customer can still edit. Drop the health-question slot.

---

### 3. "Claims can become stale" — PARTIALLY SURVIVES (strongly for the fact register; weakly for the privacy line; strongly for "why we ask")

**Strongest objection.** A freshness gate does not keep content fresh; it removes content silently and nobody on a showroom floor notices. The repo already demonstrates this: financing `verifiedAt` is `2026-07-31T16:43:00-05:00` with `maxAgeDays: 7` (`data/store-config.json:126-127`, identical on `origin/main:112-113`), so exact financing terms have been suppressed on the deployed preview since 2026-08-07 — two weeks — and no reverification has happened (Invariant 11 forbids freshening for demos, which is fine, but it is still evidence that the human cadence is the weak link). For heritage facts with a 365-day window the bypass is trivial: bump `verifiedAt` without re-reading the page. And it cannot be automated — lacks.com blocks fetchers (403/429, per all three agents), so `tools/reverify_financing.py`-style tooling has nothing to check against. The register is a discipline, not a control.

**Privacy line.** The gasUrl gate is config-based, not time-based, so it does not rot. But the gate is too narrow: any *new* network sink (a future analytics beacon, an image pixel, `sendBeacon`) would falsify "stays on this tablet" without touching `gasUrl`. No test pins the global set of sinks — `tests/session_safety_check.mjs:1486` checks one extracted function only. Add a whole-file assertion: exactly the loader helper (`:11677`) and the GAS POST (`:16445`) may call `fetch`; zero `XMLHttpRequest`/`sendBeacon`/`WebSocket`.

**"Why we ask" lines (R2).** Under-addressed. These depend on `calculateScores` (`:13747-13800`) and `opt.scores` tags, are prose, and nothing links them to the engine. The audit also missed one: `sleep_position` helpText says "Your sleep position is the biggest clue to the support you need", but sleep_position contributes at most 5 points (e.g. side = plush 2 + pressureRelief 2 + soft 1) against the firmness slider's 50 (`:13760-13765`), and an *untouched* slider still scores from `defaultValue` 5 (`data/quiz.json:744`). "Biggest clue" is a weight claim the engine contradicts. Staleness here is not hypothetical — it is the current state.

**Change.** (i) For R2: include `sleep_position` in the overclaim list; write each line to name the *mechanism*, never the *weight*; add a `docs/` copy–engine correspondence table that the scoring-change rule in CLAUDE.md references ("any scoring change re-audits these 10 lines"). (ii) For R3: add the sink-pinning test. (iii) For R7: state plainly that the register's value is liability and honesty discipline, not customer-visible trust (see #6), and that it must first govern the fact *already on screen* ("SINCE 1935", `data/store-config.json:51`, BBB says 1924) before any new one.

---

### 4. "Privacy language overpromises" — SURVIVES

Sentence under test: **"Your answers stay on this tablet and are cleared when you finish or start over."**

| Clause | Code | Verdict |
|---|---|---|
| "stay on this tablet" | `answers` in memory (`:13215`); only `fetch` sinks are loader + `fetch(gasUrl…)` gated on `gasUrl` (`:16445`); `gasUrl: ""` in prod and demo configs; analytics in memory + redacted `console.log` (`:14446-14452`); localStorage holds only RSA name/list (`:16285`, `:19049-19076`) | **True today**, gasUrl-gated. Pedantry: mattress image requests for the *results* hit the Pages host, so the host can infer which models were shown — not answers. Acceptable. |
| "cleared when you **finish**" | Finishing the quiz clears nothing. Answers drive results, Sleep Brief, Sleep System, handoff and email screens; after the customer walks away they persist for `idleWarningMs` 5 min fully visible, then `graceMs` 5 min behind an 0.88-alpha backdrop (`SESSION_POLICY` `:19244-19250`; `.safety-backdrop` `:9971-9976`). Only Restart-confirm, final timeout, or "Start New Customer" wipe (`resetSessionState` `:20025`). | **False** on the natural reading. A1 §3 already said "cleared when you finish" is inexact; the lead's draft kept it. |
| "or start over" | Restart → confirm → wipe | True. |
| Implicature "nobody else sees them" | The handoff screen "Review with the customer" renders `resolveConsultationSummary()` (`:18260-18297`): sleep_issues and health_conditions become specialist-facing implications ("test head-of-bed elevation on an adjustable base", "notice how a raised upper body feels" — reflux/snoring are inferable; `data/store-config.json` salesNotes.consultationImplications). The review screen (`:13720-13737`) lists every answer in plain labels. | Not false, but the sentence's reassurance is aimed at the wrong threat: the privacy-relevant audience is the human standing next to the customer, and the app routes health-derived content to them by design. |
| Adjacent promises already shipped | Email screen: hardcoded "Your info is never sold to third parties. Unsubscribe anytime." (`:10744`, `:16031-16033`, EN **and** ES hardcoded — a template-level policy promise, white-label breach, and "Unsubscribe" describes a subscription that does not exist in demo mode). Privacy overlay: draft `privacyBody` says the app collects name/email/phone (`:20555`) under a "Draft policy — pending approval" notice. Idle dialog: "Your session is paused to protect your privacy." (`dict-en.json:19`). | The app already speaks about privacy in three voices, none audited by the recommendation; R6 is too soft. |

**Weakest-but-still-useful true sentence (preview mode, gasUrl blank):**
> EN: "Your answers aren't saved or sent anywhere — they're used on this tablet for today's matches, and Restart clears them at any time."
> ES (provisional, native review required): "Tus respuestas no se guardan ni se envían a ningún lado: se usan en esta tableta para las sugerencias de hoy, y Reiniciar las borra en cualquier momento."

Every clause is code-true and the last clause hands the customer a verifiable action. If the handoff implicature must be addressed, do it on the handoff entry, not here: "This screen is made to share with your specialist: your finalists and what to test." Even weaker, still useful: "Your answers aren't saved or sent anywhere."

**Change.** Replace R3's example wording; add a "no hidden sinks" test; widen R6 to "retire or config-drive every existing privacy promise (email-screen static line, ES hardcoded lead, draft privacyBody, idle-dialog body) so the app has one privacy voice"; correct R5's premise (the specialist sees more than the marked picks).

---

### 5. "Community stories feel self-congratulatory" — PARTIALLY SURVIVES (QR: SURVIVES)

**Strongest objection.** Moving heritage to handoff relocates it to the *closing* moment. The handoff screen is titled "Review with the customer" and is the salesperson's surface (RSA picker `:10540-10547`, localStorage attribution). A heritage line there is read while a human is selling — A1's failure mode 7 ("trust us, now buy") in its purest form, and no study A1 cites shows heritage transferring to trust in the *person*. The welcome screen already carries "FAMILY-OWNED · SOUTH TEXAS · SINCE 1935" twice (`:13119` heritage + voice eyebrow); a third placement is the repetition the agents themselves rejected.

**The QR is worse than no source.** The lead verified that lacks.com/about-us says "89th anniversary this year" (=2024), lists superseded leadership and "ten stores" contradicted by four other sources (capture file; A3 §2). A QR code whose promise is "verify us" and whose destination is a stale self-published page teaches the customer that the kiosk's "verified" standard means "our own marketing page". It also invites phone-out behaviour mid-handoff, has no task (the financing QR has one — applying), and adds a second QR to a screen whose first QR is governed by `tests/qr_payload_check.py` and an allowlist. Traffic, not trust.

**Change.** Drop the QR. Make the handoff heritage line explicitly optional and default-off; if the owner wants heritage beyond welcome, the honest form is a plain dated statement with no "Source:" label and no link. Keep R5's *control* half (customer picks what is shared) — but first correct its premise (see #4).

---

### 6. "Do sources meaningfully improve trust?" — SURVIVES

**Strongest objection.** On a kiosk with no navigation, "Source: Lacks company history" is a credibility *signal* with zero *checkability* (A2 D4). Signals without checkability are precisely what advertising uses ("clinically proven*"). The register makes the *retailer* honest; it does not improve the *customer's* epistemic position one bit, because the customer's reason to believe (the label) is the same reason they would have if the label were false. That is the definition of unjustified trust. The governance effort — validator branch, `source_hosts.json` key, verbatim quotes, approval fields, `esReviewStatus`, quarterly verification doc, discrepancy log — is for 1–2 lines that the welcome screen already states unframed. Disproportionate by any measure, and A1's §8 already concedes the source label is "a governance tool more than a customer-facing trust signal".

**What survives of R7.** Only the liability argument: if any retailer fact is on screen, the retailer should be able to prove it. But that argument applies *first* to the fact already on screen ("since 1935", contradicted by a BBB record), which the recommendation does not say.

**Change.** Re-frame R7 as "liability hygiene for facts already displayed", not as a trust feature; make it explicitly optional and last; never render a "Source:" label on the kiosk — show plain dated statements and keep provenance in the register. Do not build the register at all unless the owner wants facts beyond the existing welcome line.

---

### 7. "Complexity without measurable value" — SURVIVES

**Strongest objection, with numbers.** Five-point agree items on a kiosk have a ceiling (most people tick "agree"), so realistic effect sizes are small. Detecting d = 0.3 between two cells at α .05, power .8 needs ≈174 completed cards per cell; four cells with three baseline comparisons (Bonferroni α .0167) need ≈232 per cell ≈ **930 completed cards**. At showroom kiosk traffic ("low" per the brief) and a 30–50 % card completion rate, that is months per store or a multi-store design that introduces store and salesperson confounds larger than the effect. Even d = 0.5 needs ≈63 per cell (≈250 for four cells).

**Salesperson bias.** T3/T4/T7 ("trying to sell me", "pressure", "my choice") are answered with the specialist standing beside the customer on a screen titled "Review with the customer". They will be socially desirable, not honest.

**The plan contradicts R3.** The kiosk has no data channel (`gasUrl: ""`), and R3 promises nothing leaves the tablet. Card responses have to go somewhere. The only compatible design is aggregate counts in localStorage (no answers, no identity) read out on a staff screen — which nobody has designed or tested, and which the privacy line must then be worded to permit.

**Placebic confound.** T1–T7 are self-reports; the agents' own evidence (A1 #15) says hollow lines move them. Without an objective comprehension item the experiment measures persuasion.

**Cheaper, more credible.** (1) Two cells only (current vs. smallest implementation), one store, run to 60–80 cards, treat as directional. (2) Five to eight moderated think-aloud sessions per cell in-store (customers, EN and ES) — the effect sizes the team cares about (does anyone read the line? do they believe it? do they change an answer?) are visible at n = 5. (3) Behavioural proxies already in memory: review-screen edit rate, `sleep_issues`/`health_conditions` option counts per cell (disclosure suppression shows up here), handoff opt-in — not conversion, but not self-report either.

**Change.** Replace the A/B/C/D card with the three-part plan above; add one comprehension item; design the local aggregate store before promising "nothing leaves".

---

### 8. Discarding the prototype's Slice 4 base — FAILS (nothing valuable lost)

The prototype is Slice 4 at roughly C1/C2; `origin/main` has C3–C13 including three externally-found P1 defects (C11–C13). Rebasing would resurrect them. A4 §3 enumerates the seven trust hunks; all are mechanically re-derivable in an hour. What is worth *extracting* as reference, not merging: the forced-colors CSS block (`:9652-9663`), the TRUST RAIL test section (`tests/quiz_presentation_check.mjs:267-318`) as a pattern, and the five ES sentences as provisional copy if any heritage survives. `trustSignal` shortening is a no-op (0 consumers). One caveat: the fold measurements were taken on the prototype layout; the quiz renderer is unchanged on main per A4's diff check, but assert the numbers again on main before any Playwright fold test is written against them.

**Change.** None to the decision; add "re-measure on main" to R1's test note.

---

### 9. "Top pick = Gold #1 by product rule" disclosure — PARTIALLY SURVIVES

**Strongest objection.** The recommendation attacks a customer-facing claim that does not exist as described. `analytics.topPick` is an analytics/email field (`:15927-15935`). What the customer sees is "Best match" as an *index-only* role label inside whichever tier tab is active (`:14993-15001`, comment: "a statement of position within the active tier"), plus a tier descriptor "Gold · premium materials / Silver · mid-range value" and the note "Match strength is relative within each tier" (`:14740-14752`, `dict-en.json:54`). The disclosure is already shipped. A new confessional line ("the first card is the premium tier's best fit, not your highest score") exposes a design the customer may object to (Gold pre-selected: `activeTier: 'gold'` `:15953`) *without giving them a control to fix it* — reactance without remedy (A1 #4, #21). That would reduce trust more than silence.

**What survives.** The existing disclosure is the smallest text on the results screen: `.tier-relativity` is **11px** (`:2220-2226`) — the one honest tier statement is the least legible line on the page for a standing, often older, reader.

**Change.** Replace R4's "tier semantics disclosure" with: keep the existing relativity note, raise it to body size, and log as an owner question whether a cross-tier "highest overall score" marker or a sort control should exist (scoring/tier changes need Blake's sign-off anyway). Do not add a confessional sentence.

---

### 10. "The rail is the element that introduces scrolling" — PARTIALLY SURVIVES (the lead's sentence is overstated; both measurements are right)

Reconciliation from the two data sets (landscape 1194×748, EN; rail ≈95px incl. margin; bottom padding 36px):

| Question | Next bottom (A2) | Fits without rail? | Fits with rail? |
|---|---|---|---|
| trigger | 666 | yes (702) | content yes (743), padding overflows (779) |
| mattress_size | 723 | yes (759→ lead: 741) | **no** (836) |
| partner_sleep | 666 | yes | content yes, padding overflows |
| partner_disturbance | 620 | yes | yes (733) |
| sleep_position | 666 | yes | **no** (791) |
| body_type | 780 | **no** | no |
| temperature | 620 | yes | yes (745) |
| firmness | 856 | **no** | no |
| sleep_issues | 858 | **no** | no |
| health_conditions | 858 | **no** | no |

So: the rail *introduces* scrolling on 2 questions (mattress_size, sleep_position; arguably 4 if padding-only overflow counts), 4 questions scroll regardless, 2 never scroll. The rail never pushes Next down (it is after Next). The lead's general claim is true for a minority of questions; A2's claim is true for the four that matter most for D1. Both support the same conclusion — the rail adds nothing above the fold where it is meant to help and worsens the scroll-carry defect by ~95px on the tall questions.

**Change.** Narrow the sentence in the recommendation to "adds scroll extent on 2–4 questions that otherwise fit; 4 tall questions scroll regardless, which is why R1 is a prerequisite independent of the rail".

---

## (b) Ranked: the five objections that most deserve to change the recommendation

1. **#4 — the privacy sentence is false as drafted ("cleared when you finish") and the app already makes three other unaudited privacy promises, one hardcoded in the template.** This is the one place the recommendation can turn a justified-trust feature into a deceptive representation. Fix wording, pin network sinks, and make R6 retire/config-drive the existing promises.
2. **#7 — the measurement plan is infeasible, contradicts R3, and cannot distinguish justified from placebic trust.** Two cells at most, moderated sessions, one comprehension item, a local aggregate store designed before anything is promised.
3. **The specialist premise (under #4/#5, missed by all four agents) — the handoff brief shows health-derived implications, not just marked picks.** R5's control framing and A3's P-line are wrong as written; the privacy-relevant audience is the human beside the customer.
4. **#2 — resolve placement to welcome (or review screen), never the first health question.** The only placement-specific evidence the agents cite argues against the health slot.
5. **#6/#3 — R7 is disproportionate as a trust feature and the existing "SINCE 1935" line is the fact that actually needs governing.** Reframe as liability hygiene, optional, no "Source:" label on the kiosk; note the financing gate has been stale-suppressing since 2026-08-07 as evidence about cadence.

(Honourable mention: #9 — don't add a confessional tier line; make the existing 11px disclosure legible. #3 — add `sleep_position` "biggest clue" to the R2 overclaim list.)

---

## (c) What all four agents missed

- **The salesperson is the privacy audience, and the kiosk is a sales-attribution tool.** `resolveConsultationSummary()` (`:18260-18297`) renders health-condition and sleep-issue implications on the shared handoff screen; the RSA picker persists the salesperson's identity in localStorage (`:19049-19076`). Nobody told the customer that the screen they are handed is the specialist's brief. Also common in showrooms: the specialist *operates* the kiosk for the customer — then "your answers stay on this tablet" is moot and "I'm Interested" marks are staff-made.
- **The review screen** (`:10256-10267`, `renderReview` `:13720-13737`) — every answer including health labels on one screen, "Make sure everything looks right". It is the natural data-use moment, the largest passer-by exposure surface, and the best place to say what the specialist will see. Unexamined.
- **"About 2 minutes · No pressure" + Q1 "No pressure" + "Ask your sleep specialist" (dict, template-level)** — three reassurance/steering lines already in flow; a fourth was recommended without netting them. `results.specialist_cue` in the *shared* dict is template-level steering copy that conflicts with R5's "help on request" framing.
- **Hardcoded privacy promises in `index.html`** (`:10744`, `:16028-16033`): "never sold to third parties. Unsubscribe anytime." in EN and ES, plus a hardcoded ES email lead. White-label breach (retailer policy in the template) and a subscription claim with no subscription. Legal exposure today comes from *shipped* lines (this, draft `privacyBody`, "fits your space", "easy fix", "biggest clue"), not from anything proposed.
- **Idle dialog "Your session is paused to protect your privacy."** (`dict-en.json:19`) — an existing privacy claim in the session flow; true-ish (0.88 backdrop), never audited.
- **Financing freshness is currently stale on the deployed preview** (`verifiedAt 2026-07-31`, `maxAgeDays 7`) — real evidence about how fail-closed gates behave on a kiosk: content vanishes, nobody notices.
- **Measurement needs a data channel the privacy line forbids** (see #7).
- **Bilingual legal exposure.** A privacy statement in *unreviewed* Spanish is not like unreviewed marketing copy — DTPA applies regardless of language, and "se borran" vs "no se guardan" carry different promises. Invariant 12 defers native review to a consolidated pass; this one line deserves an exception.
- **Older customers and the legibility of honesty.** The only tier-honesty line is 11px (`:2220`); the prototype's source line was 12px. Any line whose purpose is integrity must be body-size or it is decoration.
- **White-label consequences of a dict-level privacy line.** Gating on `gasUrl` means a retailer with live email silently gets *no* line; the template needs a second, live-mode variant ("If you choose to email your results, we send…") or it ships inconsistent across deployments. And any generic `facts`/`supportingCopy` block *will* be filled with marketing by some retailer; prose cannot be validated — the only control is the per-retailer approver record, so say so rather than implying the validator protects the brand.
- **EN-only reset** is a non-issue for trust content (the idle dialog renders in the current language; wipe returns to EN for the next customer by design). Mention only to close it.

---

## (d) Verdict on the smallest valuable implementation

Ship **R1** (scroll/focus on question change, with a fold assertion re-measured on main), **R2 widened** (audit all ten helpText lines for mechanism-not-weight, adding `sleep_position` "biggest clue" to the overclaim list and recording a copy–engine correspondence table the scoring-change rule references), and **one data-use sentence on the welcome screen** — not the health question — worded without "finish" ("Your answers aren't saved or sent anywhere — they're used on this tablet for today's matches, and Restart clears them at any time"), gasUrl-gated in the validator, pinned by a whole-file network-sink test, with the Spanish line native-reviewed ahead of the consolidated pass. In the same slice, **retire or config-drive the hardcoded email-screen privacy promises** and **raise the existing 11px tier-relativity note to body size**, so the app has one honest privacy voice and its one honest tier statement is legible. Do **not** build the register, the QR, the handoff heritage line, a tier confession, or a four-cell experiment; learn with two cells or moderated sessions plus one objective comprehension item, and design the local aggregate store before promising that nothing leaves the tablet. That is the whole of what the evidence supports, and it is smaller and more defensible than what the five reports converged on.


---

<!-- ===== SECTION 7: lacks-about-us-capture-2026-08-21.md ===== -->

# Capture: https://www.lacks.com/about-us — read via Chrome 2026-08-21 (WebFetch returned HTTP 403)
Title: About Us | Lacks Furniture | Brownsville, Laredo, McAllen, Alice, Corpus Christi, Harlingen, Rio Grande City, Victoria, Pharr, TX

Key verbatim sentences:
- "Texas has been Lacks Furniture's home for almost a century and our family will never stop working to make it better for everyone."
- Awards list (company-stated): Furniture Today "Sustained Excellence Award" 40 Years Top 100 (May 2021); HFB Power 50 #4 Large Independents 2017/2018; The Monitor Reader's Choice Best Furniture Store 2003-2021 (except 2007); Monitor Favorite Appliance Store 2020; Laredo Morning Times Best Furniture Store 2017-2022; Laredo Morning Times Best Mattress Store 2022.
- "In 1914, at the young age of 13, a boy named Sam Lack boarded the "Lusitania" and began a lone voyage from Russia to the United States where he would join his father. Some years later, Sam would find the very first Lacks store in McAllen, Texas. 1935 marked the beginning of what would one day become the most preeminent furniture chain in South Texas."
- "America's love affair with automobiles during the 1930s and their growing accessibility convinced Sam Lack to create a specialty business selling auto parts in a modest building at the corner of Main and Beaumont in downtown McAllen. Under his watchful eye and with tireless support from his family, his business flourished. Only three years after opening, Mr. Lack built his second store in Mission, which was quickly followed by new locations in Edinburg and Weslaco."
- "The war years of the 1940s were hard on the U.S. economy. Auto parts were among the rationed goods alongside food and gasoline. Determined to succeed, Lack expanded the stores' product line by offering household appliances. As he added new products and opened stores across the Valley, Lack's business transformed from a small auto parts chain into a full-scale furniture and appliance operation."
- "Beyond working hard for the success of his business, Sam Lack was deeply devoted to serving the community. He actively served with the McAllen United Fund, McAllen Civic Center Board, Drainage Advisory Board, McAllen Chamber of Commerce, and McAllen Rotary Club. This dedication to others' welfare would become its own founding principle of the business, turning into an intrinsic part of the Lacks brand for generations to come."
- "In 1949, Sam's son-in-law, Myles Aaronson, began helping him run the family business. Myles later purchased the Weslaco store from Sam and began his own expansion program, called Lacks Associated Valley Stores, Inc. Aaronson purchased the Weslaco store from Sam Lack and his son Stanley in 1955, and the company changed its name to Lacks Valley Stores, Ltd in 1995, keeping the trade's Lack family name."
- "Two years later, Sylvia and Myles' son, Lee Aaronson, became the company's chief executive officer. The stores remain a family-owned business, maintained under the guidance of Lee Aaronson, Carolyn Aaronson, and Vicki Hutson."
- "Today, Lacks Valley Stores, Ltd. — also known simply as "Lacks" — has ten stores and a clearance center in South Texas, running from Laredo to Brownsville. The Lacks Galleria in McAllen is the largest furniture store in South Texas with a staggering 140,000 square feet ... The company's newest store opened in Corpus Christi in 2018."
- "Currently, Lacks donates to organizations ... including the Food Bank of the Rio Grande Valley, the American Diabetes Association, and the American Cancer Society, among many others."
- "Lacks ranks among the top 100 retail furniture operations in the U.S. according to Furniture Today"
- "The company celebrates its 89th anniversary this year."   <-- STALE: 1935+89 = 2024; page read in 2026 (91st year)

Secondary: RGVision Magazine "85 Years of Lacks" (2020-04-29) — regional magazine profile quoting Lacks' director of communications and CMO; company-sourced, not independent verification. Corroborates 1935 / auto parts / WWII rationing pivot / Mission second store / Myles Aaronson 1949 / name change 1995.
