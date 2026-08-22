# Quiz trust investigation — should the DreamFinder quiz show Lacks facts, process explanations or privacy notes, and what actually builds justified trust?

**Date:** 2026-08-21
**Status:** Investigation report — **no application code was changed**. Implementation is not authorized until the owner reviews this report.
**Repository examined:** `C:\Users\BlakeFord\Documents\Lacks PROTOTYPE\LacksFurniture-slice4` (branch `claude/nocturne-slice4-payment-choice` at `5436dea`, large uncommitted working tree including the trust-rail prototype). Cross-checked against the canonical repo (`origin/main` = `4a76503`).
**Method:** four independent research agents (customer trust & behavior; UX/content/accessibility; claims/evidence/privacy/governance; architecture/implementation/testing) worked in parallel without seeing each other's output, plus a lead repository and empirical analysis; then a red-team agent attacked the converged recommendation. Verbatim agent and red-team reports are preserved in the companion file `docs/quiz-trust-investigation-2026-08-21-agent-reports.md`.
**Location note:** `docs/` in this repo is flat with dated filenames (e.g. `financing-verification-2026-07-30.md`), so the suggested `docs/research/` subdirectory was not created.

---

## 1. Executive conclusion

1. **Historical factoids shown during the questions are not a justified-trust feature and should not ship as prototyped.** All four agents reached this independently. The prototype ("From the Lacks story": five company-history sentences mapped to question pairs, rendered below Back/Next) addresses only one of the seven trust outcomes — "Lacks is an established company" — which the welcome screen already states twice (`voice.eyebrow` and `text.heritage`, both "FAMILY-OWNED · SOUTH TEXAS · SINCE 1935"). It says nothing about why questions are asked, how matches are produced, what happens to answers, what the quiz cannot know, or whether the specialist handoff is optional.
2. **Process transparency is stronger than heritage copy for this goal — clearly.** The evidence (persuasion knowledge, split attention, banner blindness, wear-out; transparency repairing trust when expectations are violated; verifiability as the core of credibility) points the same way. The content the customer can *check* — what the quiz does with an answer, what it did not use, what it cannot know, what the specialist will see — is the content that produces trust that is *justified*.
3. **The prototype is well-engineered but mis-aimed and under-governed.** Mechanism: good (config-driven, deterministic by question id, stateless, escaped, bilingual, fail-soft, no timers, forced-colors-aware, 5.7:1 contrast). Content: company-reported only (sole source: `lacks.com/about-us`, whose own page says "celebrates its 89th anniversary this year", i.e. 2024, and whose store count is contradicted by four other sources; a BBB record says the business started in 1924). Governance: provenance is **stored, not enforced** — `verifiedAt` has no freshness gate, `sourceUrl` is not allowlisted, no approval or Spanish-review record exists, and the customer never sees the source. Placement: measured on the mounted landscape iPad (1194×748), the rail is below the fold on 4 of 10 questions (7 of 10 under WCAG text spacing, 10 of 10 at 200% zoom), and the civic-service anecdote lands on the two health-disclosure questions.
4. **The investigation found real, shipped trust defects that matter more than any new content:** (a) `renderQuestion()` never resets scroll, so after Next on a tall question the next headline renders off-screen (measured: headline at y = −95 on Q9); (b) three existing help lines overstate the engine ("so every mattress we show actually fits your space" — the lineup is never filtered by size; "sleep position is the biggest clue" — worth ≤5 points against the firmness slider's 50; "an easy fix with the right materials"); (c) `index.html` hardcodes "Your info is never sold to third parties. Unsubscribe anytime." in EN and ES (a template-level privacy promise, a white-label breach, and a "subscription" that does not exist); (d) the privacy policy renders under "Draft policy — pending Lacks Furniture approval"; (e) the one honest tier statement ("Match strength is relative within each tier") is 11px.
5. **Recommendation:** do not build the heritage rail. Ship the smallest intervention with a credible relationship to justified trust (§16): fix the scroll/focus defect; make the ten existing `helpText` lines true "why we ask / what it changes" statements tied to the engine; add **one** exact, code-true, config-gated data-use sentence on the welcome screen; retire or config-drive the hardcoded privacy promises; make the tier-relativity note legible. Keep heritage where it is (welcome). Build no claim register, QR, testimonial or handoff heritage line unless the owner wants facts beyond the existing welcome line — and if so, govern the fact *already on screen* ("since 1935" vs BBB "1924") first.

---

## 2. Definition of justified customer trust

Trust is a willingness to be vulnerable to another party based on beliefs about its **ability**, **benevolence** and **integrity** (Mayer, Davis & Schoorman 1995; operationalized for e-commerce by McKnight, Choudhury & Kacmar 2002). Trust is **justified** when the belief is produced by evidence the customer can in principle check or experience, not by a cue that would be equally present if the belief were false.

Applied to this kiosk, the seven business outcomes map as follows:

| Outcome | Trust component | What would make it *justified* here |
|---|---|---|
| 1. Lacks is credible and established | ability / reputation | a dated, verifiable fact, stated once |
| 2. The quiz acts in the customer's interest | benevolence | visible absence of steering; answers traceably drive results; no price/financing influence on ranking |
| 3. I understand why questions are asked | integrity / transparency | a true mechanism statement per question |
| 4. I understand how recommendations are produced | integrity / transparency | a short procedural explanation at results |
| 5. My answers aren't used in surprising ways | integrity | a data-use statement that exactly matches code, including what the specialist sees |
| 6. The quiz is honest about its limitations | integrity (two-sidedness) | a modest, voluntary limitation |
| 7. The handoff is helpful, not coercive | benevolence / control | customer control over the next step and over what is shared |

Heritage content touches outcome 1 only. Outcomes 3, 5 and 6 can only be earned inside the quiz, at the moment of vulnerability (answering). Outcome 4 is earned at results; outcome 7 at the handoff. **A test for any candidate line:** would the customer be able to tell if it were false? If not, it is a signal, not evidence.

---

## 3. Repository findings

### 3.1 State of the working tree
- Branch `claude/nocturne-slice4-payment-choice` at `5436dea` (pre-PR #51 main). 24 modified files + untracked `outputs/trust-stories-workbook/` (a `build_lacks_workbook.py --out` artifact, byte-identical to `incoming/Lacks_Store_Data.xlsx`, plus an `.inspect.ndjson` cell dump; delete-safe, must not be committed).
- The `index.html` working tree is closest to canonical commit `02c116b` (Slice 4 C1), 527 lines apart; it is 1,213 lines from the merged Slice 4 head `ee6e402`. **The prototype's Slice 4 base is superseded** (C3–C13, including three externally-found P1 defects, are on `main`). Any trust work must be re-derived on current `main`, never rebased from this tree. Nothing of value is lost by discarding the Slice 4 portion; the trust delta is small and fully enumerated below.
- Nothing was modified, reset, stashed or committed by this investigation (`git status` identical before and after).

### 3.2 Canonical vs generated
| File | Role |
|---|---|
| `incoming/dreamfinder_quiz.json` (`quiz.questions`, new `quiz.trustStories`) | canonical quiz source |
| `incoming/lacks_store_values.json`, `lacks_financing.json`, `lacks_promotions.json` | canonical store inputs |
| `incoming/Lacks_Store_Data.xlsx` | generated intermediate (committed); Quiz tab = chunked `{"quiz": …}` envelope |
| `data/quiz.json`, `data/store-config.json`, `data/allowed-hosts.js`, `data/accessories.json`, `manifest.json` | generated by `tools/convert_store_data.py` — never edit |
| `demo/black-friday/index.html`, `demo/black-friday/data/store-config.json` | generated by `tools/build_black_friday_demo.py`; the demo **shares production `./data/quiz.json`**, so any quiz-envelope content appears in the demo automatically |
| `index.html` | hand-authored app |

Lineage is consistent: `incoming` quiz block == workbook Quiz tab == `data/quiz.json` (content comparison, zero differences; `tests/lineage_check.py` 10/10).

### 3.3 The existing trust-story implementation (exactly what it does)
- **Data:** `quiz.trustStories = { label{en,es}, items[5] }`; each item `{ id, questionIds[2], text{en,es}, sourceLabel{en,es}, sourceUrl, verifiedAt }`. All five `sourceUrl` = `https://www.lacks.com/about-us`, all `verifiedAt` = `2026-08-20`, all `sourceLabel` = "Source: Lacks company history". Mapping: pairs (trigger, mattress_size) → "family-owned … since 1935"; (partner_sleep, partner_disturbance) → auto-parts origin; (sleep_position, body_type) → Mission second store; (temperature, firmness) → 1940s rationing pivot; (sleep_issues, health_conditions) → founder's civic service.
- **Loader** (`index.html` ~12494–12501): `window.__DF_QUIZ_TRUST_STORIES` set only if the block is an object with an `items` array; otherwise `null` (fail-soft).
- **Renderer** `quizTrustStoryMarkup(questionId)` (~13379–13401): first item whose `questionIds` contains the id; returns `''` if label/text/source missing; emits `<aside class="noct-quiz-trust" aria-labelledby=…>` with label, source line and one `<p>`; everything through `escapeHtml`; `sourceUrl`/`verifiedAt` never rendered. Called after `.noct-quiz-nav` in both the slider and option branches of `renderQuestion` (~13457, ~13515).
- **CSS:** grid (label column + text), 11px letter-spaced caps label, 12px source line, **16px italic serif** text in `--consultation-muted` (#685C4D on #F4EFE6 = **5.68:1**, AA pass); single column ≤700px; forced-colors block sets `CanvasText`.
- **Validator** (`tools/validation.py` ~2430–2510): optional block; unknown keys rejected; bilingual plain-text `text`/`sourceLabel`; slug ids; `sourceUrl` must be "safe https" (**any host passes** — the self-test uses `example.com`); `verifiedAt` must match `YYYY-MM-DD` (**no freshness or future check**); **every canonical question must be mapped exactly once** (so a rail is forced onto every question, including the health questions). Also adds an `unknown_root` check that tightens the quiz envelope for every retailer.
- **Tests:** `tests/quiz_presentation_check.mjs` TRUST RAIL section pins 5 items, complete mapping, bilingual fields, not live/timed/fixed/focusable, no rotation on answer select, no rail when the block is null. **No negative controls, no `tests/mutation_sweep.mjs` entries, no contrast or viewport assertions.**
- **Docs:** `CLAUDE.md` gained a paragraph legitimizing `trustStories` in `quiz.json`; `text.trustSignal` was shortened in `lacks_store_values.json` — but `trustSignal` has **zero consumers** in `index.html` (dead field), so that edit changes nothing on screen.

### 3.4 Runtime behavior (verified by code reading and by driving the app)
| Question | Finding |
|---|---|
| How does the quiz re-render after an answer? | `selectOption` → `renderQuestion()` replaces `#questionContainer.innerHTML` wholesale on **every tap**; the aside is rebuilt each time with identical markup. The "re-trigger animation" lines are a no-op in the Nocturne skin (`#questionContainer` has no animation), so nothing flashes. Focus is restored only to a `:focus-visible` activated option; the aside is never focusable. |
| Language switching | `switchLanguage` → `renderQuestion()` if the question screen is active → aside re-rendered in the new language (verified: ES copy appears). `L()` falls back to EN if an ES key is missing (validator prevents this at build; runtime does not). |
| Skip and Back | `partner_disturbance` is skipped for solo sleepers (`skipIf`), stamped `not_applicable`; `prevQuestion` steps back over it. The story pair is shown once on the solo path; no story is unreachable or doubled. Review → Edit and Review → Back also pass through `renderQuestion`. |
| State clearing | The aside holds no state; it is a pure function of (question id, language, loaded block). `resetSessionState()` clears answers and returns language to EN. |
| Hardcoded vs config-driven | Facts, label and source line are data (`quiz.json`); `index.html` contains no retailer name (smoke guard green). But `CLAUDE.md` (unmodified text) says quiz.json structure is an app contract with **copy-only** per-retailer variation and that retailer prose belongs in `store-config.text/text_es`; the prototype adds retailer prose structure to the quiz envelope and edits CLAUDE.md to permit it — a white-label boundary change requiring web review under the repo's working pattern. |
| Provenance enforced or stored? | **Stored.** Compare financing: `verifiedAt` with offset + `maxAgeDays` + `_materially_future` + fail-closed runtime `financingTermsFresh()`, `sourceUrl` allowlisted via `tools/source_hosts.json`, `esReviewStatus`, owner authority fields, a dated verification doc, a reverify tool. `trustStories` has none of these; the prototype copied the field names without the semantics. |
| Build/runtime mismatch | Validator: all-or-nothing mapping. Runtime: tolerates any partial mapping (blank rail on unmapped questions). Two definitions of "valid" for one block. |
| Does it fulfil the trust goal? | **No.** It adds a third "since 1935" exposure within ~30 seconds of the welcome screen, places unrelated history under health questions, is unseen on the tall questions in the mounted orientation, and asserts a source the customer cannot check. |

### 3.5 Empirical layout measurements (Playwright, prototype served read-only on loopback, DPR 2; independently reproduced by Agent 2 at DPR 1)
Landscape **1194×748** (the mounted orientation per the device matrix), EN, partner path:

| Question | Next bottom (px) | Rail top–bottom | Rail fully visible? |
|---|---|---|---|
| trigger | 666 | 688–743 | yes (5px spare) |
| mattress_size | 723 | 745–800 | **no** |
| partner_sleep | 666 | 688–743 | yes |
| partner_disturbance | 620 | 642–697 | yes |
| sleep_position | 666 | 688–755 | partial |
| body_type | 780 | 802–869 | no (Next already below fold) |
| temperature | 620 | 642–709 | yes |
| firmness | 856 | 878–945 | no (Next already below fold) |
| sleep_issues | 858 | 880–947 | no (Next already below fold) |
| health_conditions | 858 | 880–947 | no (Next already below fold) |

- ES: rail grows to 67px on three stories; second line clipped at the viewport on Q1/Q2/Q5 (screenshot `rail_landscape_1194x748_es.png` in the session scratchpad).
- WCAG 1.4.12 text spacing: rail fully visible on 0/10. 200% zoom (597×374): 0/10. Portrait 834×1108: visible on 10/10.
- Reconciled: the rail **adds scroll extent on 2–4 questions that otherwise fit** (mattress_size, sleep_position; trigger and partner_sleep by bottom padding only); **4 tall questions scroll regardless**; the rail never pushes Next down (it is after Next).
- **Scroll carry-over defect (pre-existing, rail-aggravated):** `renderQuestion` never scrolls; only `showScreen` does. Reproduced: scroll to Next on Q8 (firmness) → tap Next → Q9 renders at `scrollY = 233`, headline at **y = −95 (off-screen)**, the story in view at 647–714, `document.activeElement` = `BODY`. The 1.2 focus-transition work (draft PR #39) is not in this tree.
- Forced colors: renders legibly with `CanvasText` (screenshot `rail_forced_colors.png`).

### 3.6 What already exists that serves transparency (and its defects)
- **Per-question `helpText`** already occupies the "why we ask" slot on all ten questions, bilingual, answer-aware via `copyVariants`, governed by `validate_quiz`. Quality is uneven: some are true mechanism statements (`trigger`: "No pressure — this just helps your specialist focus on what matters to you."; `body_type`: "This helps us account for cushioning, support, and durability."); some are **overclaims**: `mattress_size` "So every mattress we show actually fits your space." (size never filters the lineup — display only); `sleep_position` "Your sleep position is the biggest clue to the support you need." (≤5 points vs. firmness 50); `temperature` "Sleeping hot or cold is an easy fix with the right materials."; `partner_disturbance` "Motion isolation is one of the first upgrades you'll feel." (benefit assertions, not reasons). **Two questions (`trigger`, `mattress_size`) carry zero scoring tags** — they feed only the specialist summary and display.
- **Recommendation explanations** exist: `calculateScores()` builds per-mattress `matchReasons` ("Matches your firmness preference (7/10)", feature reasons from `m.reasons`), shown in the drawer ("Why it matches you"); the Sleep Brief ("Made from your answers"; "What we will test together"); the Sleep System ("Suggested first because you mentioned back pain."). The tier note "Match strength is relative within each tier" exists but is **11px** (`.tier-relativity`). `analytics.topPick` is always Gold #1 by product rule; the customer-facing "Best match" label is a within-tier position label, and Gold is pre-selected.
- **Privacy copy** exists only off the quiz path: email screen `text.emailPrivacy` + a **hardcoded** static line "Your info is never sold to third parties. Unsubscribe anytime." (EN `index.html:10744`; ES and EN again at `:16031–16032`), and the `#privacyOverlay` (opened only from the email screen's "Privacy & Terms" link) whose `privacyBody` says DreamFinder "collects your name, email, and optional phone number" under `privacyDraftNotice` "Draft policy — pending Lacks Furniture approval before live use." The idle dialog says "Your session is paused to protect your privacy." The `disclaimerBody` already admits limitations ("starting points, not guarantees", "does not provide medical advice") but is unreachable during the quiz.
- **Data actually leaving the device:** none in this deployment. `answers` is in-memory; `analytics.log` pushes to an in-memory array plus a redacted `console.log`; the only network sinks are the data loader and `fetch(gasUrl, …)` gated on `gasUrl`, which is `""` in both production and demo configs; `localStorage` holds only the salesperson (RSA) name/list. **But** answers persist after the customer walks away for 5 min fully visible + 5 min behind a 0.88-alpha backdrop (`SESSION_POLICY`), the review screen lists every answer in plain labels, and the handoff screen renders health-derived implications to the specialist (`resolveConsultationSummary()` with `salesNotes.consultationImplications` keyed by `sleep_issues`/`health_conditions` options). The privacy-relevant audience is the human beside the customer — which no copy currently acknowledges.
- **Financing freshness evidence:** `verifiedAt 2026-07-31`, `maxAgeDays 7` → exact financing terms have been fail-closed-suppressed on the preview since 2026-08-07 (correct under Invariant 11, but evidence that freshness gates remove content silently and nobody on a floor notices).

### 3.7 Evidence verification of the five prototype claims (lead via Chrome; WebFetch/curl get 403/429 from lacks.com)
| Claim | On lacks.com/about-us (verbatim) | Independent corroboration | Status |
|---|---|---|---|
| Family-owned, South Texas roots, since 1935 | "1935 marked the beginning…"; "The stores remain a family-owned business…" | ISJL encyclopedia: "Sam Lack … starting Lacks Tire & Supply in 1935 in downtown McAllen"; HFA 2025 "Celebrating its 90th year" (→1935). **BBB profile: "Business Started 1/1/1924"** | 1935 corroborated; "family-owned" company-reported, consistent with independent leadership naming; "has remained" (continuity) company-reported; **BBB 1924 discrepancy must be logged and ruled on** |
| First store in downtown McAllen as a small auto-parts business | "…a specialty business selling auto parts in a modest building at the corner of Main and Beaumont in downtown McAllen" | ISJL ("Lacks Tire & Supply"); RGVision 2020 (company-sourced) | corroborated in substance |
| Second store in Mission three years later | "Only three years after opening, Mr. Lack built his second store in Mission" | none found | company-reported only |
| 1940s rationing → household appliances | "Auto parts were among the rationed goods… Lack expanded the stores' product line by offering household appliances." | RGVision 2020 (company-sourced; variant: jewelry, lawnmowers) | company-reported only |
| Founder served McAllen civic organizations, making community service part of the company's foundation | "He actively served with the McAllen United Fund, McAllen Civic Center Board, Drainage Advisory Board, McAllen Chamber of Commerce, and McAllen Rotary Club. This dedication… would become its own founding principle" | ISJL: "extremely active in McAllen civic life… McAllen Civic Center Board, the Citizens League, the Salvation Army…"; 1955 Chamber "Outstanding Man of the Year" | first clause corroborated; second clause is a values assertion, not a fact |

The cited page also states: "The company celebrates its 89th anniversary this year" (= 2024; read in 2026), "ten stores and a clearance center" (HFA says seven, BBB nine, another lacks.com page eleven, the site title lists nine cities), leadership names superseded by the HFA's April 2025 article, and awards last dated 2021–2022. **Nothing numeric about scale, counts, anniversaries or awards may be copied from it.**

---

## 4. External research findings (with citations)

Sources were checked for currency on 2026-08-21. "Strength" reflects the agents' assessment. Full tables with implications are in the companion file.

| # | Finding | Source | Strength |
|---|---|---|---|
| 1 | Persuasion knowledge: once a message is recognized as a persuasion attempt, consumers discount it and may detach | Friestad & Wright, *J. Consumer Research* 21(1), 1994 — https://academic.oup.com/jcr/article-abstract/21/1/1/1853712 | strong |
| 2 | An accessible selling motive (e.g., a sales floor) makes warm messages read as insincere even under cognitive load | Campbell & Kirmani, *JCR* 27(1), 2000 — https://academic.oup.com/jcr/article-abstract/27/1/69/1791556 | strong |
| 3 | Native/editorial framing of brand content: either unrecognized (no credibility gained) or recognized (evaluation falls) | Wojdynski & Evans, *J. Advertising* 45(2), 2016 | moderate-strong |
| 4 | Reactance: controlling/pushy framing reduces persuasion; meta-analytic | Rains, *Human Communication Research* 39, 2013 — https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1468-2958.2012.01443.x | strong |
| 5 | Personalization reactance when fit is not justified; "creepiness" from ambiguous, surveilling personalization | White et al., *Marketing Letters* 19, 2008; Aguirre et al., *J. Retailing* 91(1), 2015 — https://cris.maastrichtuniversity.nl/ws/files/65443620/mahr_2015_unraveling_the_personalization_paradox.pdf; Petrova et al., *Psychology & Marketing*, 2025-12-04 | strong / moderate |
| 6 | Explicit confidentiality assurances can make privacy salient and **reduce** disclosure | John, Acquisti & Loewenstein, *JCR* 37(5), 2011 — https://www.cmu.edu/dietrich/sds/docs/loewenstein/StrangersPlane.pdf | strong |
| 7 | Explaining why a field is asked sharply reduces refusal; 14% abandon an unexplained required phone field | Baymard Institute, 2020-03-16 (updated 2025-07-29) — https://baymard.com/blog/explain-phone-number-field | moderate |
| 8 | One thing per page; make clear on every question page why it is asked; hint text = one short sentence; no links in hints | GOV.UK Service Manual / Design System — https://www.gov.uk/service-manual/design/form-structure; https://design-system.service.gov.uk/patterns/question-pages/; https://design-system.service.gov.uk/components/text-input/ | moderate (research-backed guidance) |
| 9 | Split attention / extraneous load degrades task performance; respondents under load satisfice | Chandler & Sweller, *BJEP* 62, 1992; Krosnick, *Applied Cognitive Psychology* 5, 1991 | strong |
| 10 | Banner blindness: ad-like, visually distinct, peripheral content is ignored pre-attentively; avoidance persists across pages | NN/g, *Banner Blindness Revisited*, 2018-04-22 — https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/ | moderate-strong |
| 11 | 57% of viewing time above the fold; "illusion of completeness" stops scrolling | NN/g, *Scrolling and Attention*, 2018-04-15 — https://www.nngroup.com/articles/scrolling-and-attention/ | eyetracking |
| 12 | Auto-forwarding carousels: item visible ~20% of the time; moving content read as ads | NN/g, 2013-01-19 — https://www.nngroup.com/articles/auto-forwarding/ | usability study |
| 13 | Objective language beats "marketese" by 27%; credibility rises with verifiable, external references | NN/g, *How Users Read on the Web*, 1997-09-30 — https://www.nngroup.com/articles/how-users-read-on-the-web/ | classic |
| 14 | Credibility factors: up-front disclosure, current/correct content, connection to external sources; users trust external sources over company-sponsored content | NN/g, *Trustworthiness in Web Design*, 2016-05-08 — https://www.nngroup.com/articles/trustworthy-design/; Fogg, Stanford Web Credibility Guidelines, 2002 — https://credibility.stanford.edu/guidelines | moderate |
| 15 | Transparency restores trust after an expectation violation; **balanced**, not maximal, transparency is optimal | Kizilcec, CHI 2016 — https://dl.acm.org/doi/10.1145/2858036.2858402 | moderate-strong (field experiment) |
| 16 | **Placebic explanations raise felt trust about as much as real ones** — a warning, not a recipe | Eiband et al., CHI EA 2019 — https://dl.acm.org/doi/10.1145/3290607.3312787 | weak-moderate (N=30) |
| 17 | Explanations should let users *assess* rather than *promote*; promotional explanations cause later disappointment | Bilgic & Mooney 2005; Tintarev & Masthoff, *UMUAI* 2012 — https://link.springer.com/article/10.1007/s11257-011-9117-5 | moderate-strong |
| 18 | Trust in recommenders is driven by competence and explanation; user control raises trust and satisfaction | Pu & Chen, *KBS* 20(6), 2007; Pu, Chen & Hu, RecSys 2011 (ResQue) — https://dl.acm.org/doi/10.1145/2043932.2043962; Jannach et al. 2019 | strong |
| 19 | Operational transparency raises perceived value; backfires when it reveals incapacity or feels like surveillance; do not fake effort | Buell & Norton, *Management Science* 57(9), 2011; Buell, *HBR* 2019 — https://hbr.org/2019/03/operational-transparency | strong / moderate |
| 20 | Two-sided messages (a modest, voluntary limitation) are more credible | Eisend, *IJRM* 23(2), 2006 | strong (meta-analysis) |
| 21 | Repetition: wear-out from roughly the fourth exposure; mere exposure is inverted-U | Rethans, Swasy & Marks, *JMR* 1986; Bornstein, *Psych. Bulletin* 1989 | strong |
| 22 | Brand heritage raises brand trust/credibility — but no study shows transfer to trust in an algorithm | Wiedmann et al., *J. Brand Management* 2011 | moderate |
| 23 | Customer-oriented selling improves relationship quality; salesperson trust feeds firm trust | Saxe & Weitz 1982; Doney & Cannon 1997 | strong |
| 24 | Disclosed nudges remain effective — transparency is cheap | Bruns et al., *J. Economic Psychology* 65, 2018 | moderate |
| 25 | WCAG 2.2: 2.2.2 Pause, Stop, Hide (auto-updating content needs a control; user-triggered changes exempt); 1.4.3; 1.4.4; 1.4.10; 1.4.12; 2.4.11; 2.5.8 | W3C Understanding docs — https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html et al. (updated 2025–2026) | normative |
| 26 | Large public touchscreens: arm's-length reading; small peripheral text is not noticed; tooltips are not available on touch | NN/g, *Very Large Touchscreen UX*, 2015-08-23; *Tooltip Guidelines*, 2019-01-27; *Why So Many Info Tips Are Bad*, 2026-01-23 | guidance |
| 27 | Whole-block italics/caps impair legibility; aim for ~8th-grade reading level | WebAIM, *Typefaces and Fonts*; NN/g, *Legibility, Readability, and Comprehension*, 2015-11-15 | guidance |
| 28 | Translation expansion ~30% for sentences, 100%+ for short labels | W3C i18n, *Text size in translation* — https://www.w3.org/International/articles/article-text-size | guidance |
| 29 | FTC Endorsement Guides, 16 CFR 255 (revised 2023-06-29; 88 FR 48092): honest-opinion, typicality/substantiation, material-connection disclosure | https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising | regulatory |
| 30 | FTC Consumer Reviews and Testimonials Rule, 16 CFR 465 (effective 2024-10-21): fake/AI/insider testimonials prohibited; civil penalties | https://www.federalregister.gov/documents/2024/08/22/2024-18519/trade-regulation-rule-on-the-use-of-consumer-reviews-and-testimonials | regulatory |
| 31 | FTC *Bringing Dark Patterns to Light* (2022-09-15): disguised ads, false social proof, hidden information, obscured privacy choices | https://www.ftc.gov/reports/bringing-dark-patterns-light | regulatory |
| 32 | FTC deception/substantiation policy: objective claims need a reasonable basis before dissemination; broken privacy promises are deceptive | https://www.ftc.gov/legal-library/browse/ftc-policy-statement-deception ; https://www.ftc.gov/business-guidance/privacy-security | regulatory |
| 33 | Texas DTPA §17.46(b) laundry list (sponsorship/approval, characteristics, standard/quality, failure to disclose) | https://statutes.capitol.texas.gov/Docs/BC/htm/BC.17.htm | statute |
| 34 | Texas Data Privacy and Security Act (eff. 2024-07-01): health-revealing data is "sensitive"; not triggered by an in-memory kiosk that transmits nothing — **changes the day `gasUrl` is set** | https://statutes.capitol.texas.gov/Docs/BC/htm/BC.541.htm | statute (application inferred) |
| 35 | Lacks history: company page (stale), RGVision 2020-04-29 (company-sourced), ISJL encyclopedia (independent, medium weight), HFA 2025-04-30 Retailer of the Year (independent for the award), BBB (registry; 1924) | https://www.lacks.com/about-us ; https://rgvisionmagazine.com/85-years-of-lacks/ ; https://www.isjl.org/texas-mcallen-encyclopedia.html ; https://myhfa.org/blog/lacks-furniture-wins-hfas-2025-retailer-of-the-year-award/ | see §3.7 |

**Inference (labeled):** almost all of this evidence comes from web forms, online recommenders and advertising; no controlled study of side content inside an in-store tablet questionnaire was found. The transfers are conservative (a standing, arm's-length, often second-language reader with a salesperson nearby should be *more* sensitive to distraction and selling motive, not less), but they are transfers, which is why §14 insists on measuring.

---

## 5. Independent agent findings (condensed; full text in the companion file)

**Agent 1 — Customer trust & behavior.** Heritage during questions does not build justified trust and under realistic conditions slightly reduces it (persuasion knowledge in a showroom; wear-out — two landing exposures + five in-quiz + results/handoff ≈ 7–8 exposures of one theme in four minutes; split attention on scoring inputs → satisficing → worse match → trust loss). What earns trust inside a questionnaire, in evidence order: a one-line true "how this answer is used" per question; one exact data-use sentence, once, factual not reassuring (John et al. warn assurances cue concern); an honest limitation; assessment-oriented explanations at results; customer control at handoff. Key caveat: **placebic "why we ask" moves felt trust as much as real explanations**, so each line must name a real mechanism. Proposed an 8-item post-quiz card derived from ResQue/McKnight/Campbell scales.

**Agent 2 — UX, content design, accessibility.** Do not show history/anecdotes during the ten questions; keep the six-level hierarchy (eyebrow → question → one-sentence help → answers → Back/Next → optional one true line). Measured the fold tables above; found the **scroll carry-over defect (D1)**; found cadence is effectively random (chapters are invisible); the civic-service story (Flesch-Kincaid ≈ grade 15) sits on the health questions; the "Source:" line is self-referential and uncheckable; the caps-label + italic-serif + rule treatment is the banner-blindness triad; 11–12px metadata is too small at arm's length. Rejected rails, watermarks, carousels, per-question facts, disclosure toggles (state lost on every re-render; touch-contract cost) and tooltips. Produced a 20-row WCAG checklist.

**Agent 3 — Claims, evidence, privacy, governance.** Verified the five claims (§3.7) and found the BBB 1924 discrepancy, the ISJL and HFA sources, and the stale/contradicted counts on the official page. Classified claim types (historical fixed facts: sparingly, labeled; counts/awards/superlatives/charity/delivery/health: no). Derived code-true privacy statements and a list of overpromises (including the existing `mattress_size`, `temperature`, `partner_disturbance` help lines and the draft `privacyBody`). Proposed a claim–evidence register and lifecycle modeled on financing, a testimonial governance template (no examples), and 13 owner questions. Recommended no testimonials this phase (16 CFR 255/465).

**Agent 4 — Architecture, implementation, testing.** Mechanism sound; governance "in shape, not in truth"; build/runtime contract mismatch; no mutation proofs; `trustSignal` dead; demo shares production `quiz.json`; Slice 4 base superseded → discard, re-derive trust work on `main`. Recommends: any retailer facts live in a `store-config` block governed like financing, not in `quiz.json`; "why we ask" is already `helpText` (do not add a duplicate field); a dict-driven app-level process note; results explanations already exist — make them findable; privacy policy out of draft. Smallest implementation: dict note + `helpText` copy edits + tests.

---

## 6. Areas of agreement and disagreement

**Agreement (all four agents + lead):**
- Do not ship the heritage rail as prototyped; in-stream company history is net-neutral-to-negative for justified trust.
- Process transparency and data-use honesty outrank heritage for this goal; results-screen explanation is the highest-leverage moment.
- The existing `helpText` is the right "why we ask" vessel and needs a truth audit.
- Governance of any displayed fact must match the financing bar (freshness, allowlist, approval, ES review); the prototype stores but does not enforce provenance.
- No testimonials or answer-aware anecdotes; no rotation; no tooltips/toggles; no external navigation from the quiz.
- Heritage belongs on the welcome screen (already there) and at most once elsewhere.

**Disagreement (resolved in §9 after red-team):**
| Topic | Positions | Resolution |
|---|---|---|
| Where the single data-use line goes | A1: quiz start or before first sensitive question; A2: first health question (+welcome); A3: Q1 rail slot and/or idle dialog; A4: Q1 or persistent | **Welcome screen only** (or the review screen as a second option). The only placement-specific evidence (John et al.) argues against the health slot; the review screen is where disclosure is already complete. |
| Whether any heritage line survives inside the quiz | A1/A2: none; A3: H1 on Q1 acceptable; A4: optional, low value | **None inside the questions.** Keep welcome. Handoff line optional, default-off, no QR. |
| "Why we ask" as a new field vs copy audit | A1: add lines; A4: would duplicate `helpText` | **Copy audit of `helpText`** inside the existing contract; add a copy–engine correspondence table. |
| Where retailer facts live if ever added | A3: register riding the workbook from `incoming/`; A4: `store-config` block | Compatible: authored in `incoming/`, carried by the workbook, generated into `store-config.supportingCopy`; never `quiz.json`. |
| Tier semantics | A3: disclose "top pick = Gold #1"; red team: confession without a control causes reactance | **Make the existing relativity note legible; log a cross-tier marker/sort as an owner question; add no confessional line.** |

---

## 7. Red-team critique (what changed the recommendation)

The red team attacked ten points and re-checked each against code. Verdicts and the resulting changes:

1. **"Just more advertising" — partially survives.** A true, config-gated, action-verifiable line is not advertising. But the app already runs three reassurance lines in the first 30 seconds ("About 2 minutes · No pressure", Q1 "No pressure…", results "Ask your sleep specialist…"), and self-report items cannot separate justified from placebic trust. *Change:* count the new line net of existing reassurances; add one **objective comprehension item** to the measurement card.
2. **"Distracts from the quiz" — partially survives.** NONE-during-questions is the default; the only added sentence must not sit on a question screen, and the health-question slot is the worst candidate. *Change:* placement = welcome (or review screen).
3. **"Claims can become stale" — partially survives, strongly for facts and for "why we ask".** Freshness gates remove content silently (the financing gate has been suppressing exact terms since 2026-08-07); lacks.com blocks fetchers so reverification cannot be automated; a 365-day window invites date-bumping. "Why we ask" lines depend on `calculateScores` with nothing linking them — `sleep_position` "biggest clue" is already stale. *Change:* lines name the **mechanism, never the weight**; a copy–engine correspondence table referenced by the CLAUDE.md scoring-change rule; a whole-file network-sink test for the privacy line; the register framed as liability hygiene, not a trust feature.
4. **"Privacy language overpromises" — SURVIVES.** The draft wording "…cleared when you finish or start over" is **false**: finishing clears nothing; answers persist through results/handoff/email and for ~10 minutes after the customer walks away. Also surfaced: hardcoded "never sold… Unsubscribe anytime." (EN+ES) in the template; the draft `privacyBody` describing collection that does not occur; the idle dialog's privacy claim; and the specialist brief rendering health-derived implications. *Change:* replace the wording (§10.4); widen the privacy clean-up to every existing promise; correct the handoff premise.
5. **"Community stories feel self-congratulatory" — partially survives; QR — SURVIVES.** A heritage line on the closing, salesperson-operated screen is "trust us, now buy"; a QR to a page that itself says "89th anniversary" teaches that "verified" means "our marketing page". *Change:* drop the QR; handoff heritage optional, default-off, plain dated statement, no "Source:" label.
6. **"Do sources meaningfully improve trust?" — SURVIVES.** An unfollowable "Source:" label is a signal without checkability; the register improves the retailer's honesty, not the customer's epistemic position; the effort is disproportionate for 1–2 lines the welcome screen already states unframed. *Change:* never render a "Source:" label on the kiosk; build the register only if the owner wants facts beyond the welcome line, and apply it first to the "since 1935" line already shown (BBB says 1924).
7. **"Complexity without measurable value" — SURVIVES.** Four cells at d = 0.3 need ≈930 completed cards; the salesperson stands beside the customer for the "pressure" items; the plan needs a data channel the privacy line forbids. *Change:* §14 rewritten — two cells maximum, moderated sessions, one comprehension item, behavioral proxies, a local aggregate store designed before anything is promised.
8. **Discarding the Slice 4 base — fails (correct to discard).** Extract as reference only: the forced-colors CSS, the TRUST RAIL test section as a pattern, the five ES sentences as provisional copy. Re-measure fold numbers on `main` before writing assertions.
9. **Tier disclosure — partially survives.** The honest tier statement is already shipped at 11px; a confessional line without a control invites reactance. *Change:* make it legible; no new confession; owner question on a cross-tier marker.
10. **"The rail introduces scrolling" — overstated.** Reconciled in §3.5.

**What all agents missed (added to the recommendation):** the salesperson is the privacy audience and often operates the kiosk; the review screen is the natural data-use moment; template-level steering/reassurance copy in the shared dict; hardcoded privacy promises; bilingual legal exposure of an unreviewed Spanish privacy sentence (deserves an exception to Invariant 12's deferral); legibility of honesty lines for older customers; a `gasUrl`-gated line means live-email retailers silently get no line (the template needs a live-mode variant); any generic facts block will eventually be filled with marketing by some retailer — prose cannot be validated, only the approver record controls it.

---

## 8. Prioritized opportunity ranking (by likely impact on justified trust)

| Rank | Intervention | Outcome(s) served | Evidence | Confidence |
|---|---|---|---|---|
| 1 | Fix scroll/focus on question change (headline always on screen; focus to the question) | all — prerequisite | measured defect; NN/g fold data | high |
| 2 | `helpText` truth audit: each line names the mechanism; fix three overclaims; say plainly when a question does not affect ranking | 3, 2, 6 | Baymard; GOV.UK; Eiband warning | moderate-high |
| 3 | One exact data-use sentence on the welcome screen, `gasUrl`-gated, sink-pinned, native-reviewed Spanish | 5, 6 | McKnight integrity; FTC privacy enforcement; John et al. (once, factual) | moderate-high |
| 4 | Retire/config-drive every existing privacy promise so the app has one voice; get `privacyBody` out of draft and aligned with the deployment | 5 | FTC §5; white-label rule | high |
| 5 | Results: make the method note findable ("what we compared / what we did not use / change an answer") + one modest limitation; raise the 11px tier note to body size | 4, 6 | Kizilcec; Tintarev & Masthoff; Eisend | moderate-high |
| 6 | Handoff: tell the customer what the screen is ("made to share with your specialist: your finalists and what to test"); equal-weight actions; specialist framed as help on request | 7, 5 | Rains; Jannach; Saxe & Weitz | moderate-high |
| 7 | Measure (two cells or moderated sessions + comprehension item) | — | §14 | high that it is worthwhile |
| 8 | Governed retailer facts beyond the welcome line (register, liability hygiene first for "since 1935") | 1 | Fogg/NN/g verifiability | low incremental |
| 9 | Heritage rail as prototyped | 1 (already covered) | — | net ≤ 0 |

---

## 9. Recommended experience design

**Welcome screen (reading at rest):** keep heritage exactly once in visible form (the eyebrow/heritage line is duplicated — consider collapsing to one); keep "About 2 minutes"; add the single data-use sentence under the time estimate, body size, roman sans. Net reassurance count should not rise — if the data-use line is added, drop the duplicate "No pressure" from either the welcome line or the Q1 help.

**Question screens (task):** unchanged hierarchy — eyebrow/progress → question → **one true help sentence** → answers → Back/Next. Nothing after Next. No history, no source lines, no toggles, no rotation. `renderQuestion` scrolls to top and moves focus to the headline on question change (not on answer re-renders).

**Review screen ("Quick review"):** the natural moment to state what happens next: one line such as "These answers build your matches on this tablet and the summary your specialist will see." (optional second placement for the data-use sentence; code-true).

**Results / Sleep Brief:** surface the method note already implied by "Made from your answers": what was compared (your firmness target, then the features your answers pointed to), what was **not** used (price, brand, promotions, financing — pinned by `tests/scoring_isolation_check.mjs`), how to change an answer; one modest limitation ("We can't feel a mattress for you — lie on each finalist."). Tier note legible. No confessional line about tier ordering; owner question on a cross-tier marker.

**Handoff ("Review with the customer"):** name the audience honestly (this screen is for you and your specialist; it shows your finalists and what to test); equal-weight actions; no urgency; optional, default-off, plain dated heritage statement only if the owner insists — no QR, no "Source:" label.

**What must not change:** touch contract (`onclick` + `ontouchend(preventDefault)`, `touch-action: manipulation`), scoring, the domain lock, and the EN-reset-on-wipe.

---

## 10. Content strategy and example copy

Conventions: ES = provisional draft marked **NATIVE REVIEW REQUIRED** unless stated; "Approval" = none recorded unless stated; "Safe now" = on the evidence, assuming owner + ES approval are still outstanding.

### 10.1 Historical / community candidates (evidence-backed; placement is welcome/handoff, never inside the questions)

| # | Placement | EN | ES | Trust mechanism | Evidence | Verification | Approval | Expiry / reverify | Principal risk | Safe now |
|---|---|---|---|---|---|---|---|---|---|---|
| H1 | Welcome (replaces or complements existing heritage line) | "Lacks began in 1935 as an auto-supply business in downtown McAllen." | "Lacks comenzó en 1935 como una tienda de refacciones automotrices en el centro de McAllen." — NATIVE REVIEW REQUIRED (refacciones vs. autopartes) | specific, dated, modest, corroborated | lacks.com/about-us; ISJL; RGVision 2020 | independently corroborated | none | 365 days; retire if BBB 1924 is confirmed | BBB "1924" | **No** until the founding year is ruled on |
| H2 | Welcome (already present as "Family-owned · South Texas · since 1935") | "Family-owned in South Texas since 1935." | "Negocio familiar en el sur de Texas desde 1935." — NATIVE REVIEW REQUIRED | who am I dealing with | lacks.com; HFA 2025 leadership naming | company-reported (ownership); 1935 corroborated | none (already shipped unframed) | 365 days; **retire on any ownership change** | ownership change; 1924 discrepancy | Already shown; **needs the register first** |
| H3 | Handoff (optional, default-off) | "Founder Sam Lack served on McAllen civic boards, including the Civic Center Board." | NATIVE REVIEW REQUIRED | corroborated, past-tense, cannot go stale | lacks.com; ISJL | independently corroborated (first clause) | none | 730 days | editorial tail must stay dropped; reads as self-congratulation at the closing moment | No (approval + ES); low value |
| H4 | Handoff or omit | "According to Lacks' own history, wartime rationing in the 1940s led its auto-parts stores to add household appliances." | NATIVE REVIEW REQUIRED | context, framed as company-reported | lacks.com; RGVision (variant details) | company-reported only | none | 730 days | uncorroborated; trivial relevance | No; recommend drop |
| H5 | Omit | "Lacks' history records a second store in Mission three years after the first." | NATIVE REVIEW REQUIRED | local specificity | lacks.com only | company-reported only | none | 730 days | unverifiable | No; drop unless a dated record is supplied |
| H6 | Handoff (optional) | "Home Furnishings Association 2025 Retailer of the Year (over 50 employees)." | NATIVE REVIEW REQUIRED | independently granted award with year | HFA announcement 2025-04-30 | independently sourced | none | hard expiry 2026-12-31 | promotional in character; not what the goal asks for | No (owner decides whether awards belong at all) |

### 10.2 Quiz-process / transparency candidates

| # | Placement | EN | ES | Mechanism | Evidence (code) | Verification | Approval | Reverify | Risk | Safe now |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Welcome | "No account or email needed to see your results." | "No necesitas cuenta ni correo para ver tus resultados." — provisional | immediately verifiable | results render before the optional email step | code-true 2026-08-21 | none | on any flow change | none significant | Yes (owner + ES) |
| P2 | Results header / Sleep Brief | "Your matches come from your answers and each mattress's firmness and features — not from price, promotions or financing." | NATIVE REVIEW REQUIRED | explains the mechanism; pre-empts "are you steering me" | `calculateScores`; `scoring_isolation_check.mjs` | code-true | none | on any scoring change (Blake sign-off already required) | if tiers correlate with price, pair with the tier note | Yes (owner + ES + tier wording) |
| P3 | Results | "Firmness counts most; then the features your answers pointed to. Tap any match to see why it fits." | NATIVE REVIEW REQUIRED | procedural transparency (Kizilcec) | firmness max 50, capped feature tags; drawer "Why it matches you" | code-true | none | on scoring change | must never state weights as numbers that could drift | Yes |
| P4 | Review screen | "These answers build your matches on this tablet and the summary your specialist will see." | NATIVE REVIEW REQUIRED | honest audience statement at the moment disclosure is complete | `resolveConsultationSummary`; handoff screen | code-true | none | on handoff change | none | Yes |
| P5 | Results (limitation) | "We can't feel a mattress for you — lie on each finalist before you decide." | NATIVE REVIEW REQUIRED | two-sided message (Eisend) | `disclaimerBody` "starting points, not guarantees" | consistent with shipped disclaimer | none | n/a | overdoing caveats reads as hedging — one only | Yes |

### 10.3 "Why we ask" candidates tied to actual questions (replacements for existing `helpText`; mechanism, never weight)

| Question | Current helpText | Proposed EN | Proposed ES | Engine truth (evidence) | Safe now |
|---|---|---|---|---|---|
| `mattress_size` | "So every mattress we show actually fits your space." (**overclaim** — no size filtering) | "Size doesn't change your matches — we note it so your specialist shows you the right one." | "El tamaño no cambia tus resultados; lo anotamos para que tu especialista te muestre el correcto." — NATIVE REVIEW REQUIRED | zero `scores`; used for display/summary only | Yes (copy-only, owner sign-off for quiz copy) |
| `sleep_position` | "Your sleep position is the biggest clue to the support you need." (**overclaim** — ≤5 pts) | "This tells us whether to favor pressure relief, support, or a responsive feel." | "Esto nos dice si conviene priorizar alivio de presión, soporte o una sensación más reactiva." — NATIVE REVIEW REQUIRED | side → plush/pressureRelief; back → support/zoned; stomach → firm/support; combo → responsive | Yes |
| `temperature` | "Sleeping hot or cold is an easy fix with the right materials." (benefit claim) | "If you sleep hot, we favor cooling materials in your matches." | "Si duermes con calor, damos prioridad a materiales frescos en tus resultados." — NATIVE REVIEW REQUIRED | hot → cooling 3, hybrid 2 | Yes |
| `partner_disturbance` | "Motion isolation is one of the first upgrades you'll feel." (benefit claim) | "The more movement wakes you, the more we favor motion isolation." | "Cuanto más te despierte el movimiento, más priorizamos el aislamiento de movimiento." — NATIVE REVIEW REQUIRED | yes_often → motionIsolation 4 … rarely → 1 | Yes |
| `health_conditions` | "Tap any that apply. A few of these change what we'd suggest." (acceptable) | "Tap any that apply. Snoring or reflux, for example, is why we'd suggest an adjustable base." | "Marca lo que aplique. Los ronquidos o el reflujo, por ejemplo, son la razón por la que sugeriríamos una base ajustable." — NATIVE REVIEW REQUIRED | snoring/reflux → adjustable 3; adjustable-base hero trigger | Yes, but **no health-outcome promise** (FTC health-claim standard) |
| `trigger` | "No pressure — this just helps your specialist focus on what matters to you." (honest) | keep, or if the welcome line keeps "No pressure", shorten to "This doesn't change your matches — it helps your specialist focus on what matters to you." | — | zero `scores`; feeds `consultationImplications.trigger` | Yes |

### 10.4 Privacy / data-use candidates (only if supported by actual behavior)

| # | Placement | EN | ES | Evidence | Stops being true when | Safe now |
|---|---|---|---|---|---|---|
| D1 | Welcome | "Your answers aren't saved or sent anywhere — they're used on this tablet for today's matches, and Restart clears them at any time." | "Tus respuestas no se guardan ni se envían a ningún lado: se usan en esta tableta para las sugerencias de hoy, y Reiniciar las borra en cualquier momento." — **NATIVE REVIEW REQUIRED before showroom use (legal exposure; exception to Invariant 12's deferral recommended)** | in-memory `answers`; only network sinks are the loader and the `gasUrl`-gated POST; `gasUrl` = ""; `resetSessionState` on confirmed Restart | **the moment `gasUrl` is set** → must be validator-gated (`displayCondition: previewModeOnly`) and a live-mode variant authored for retailers with email | Yes with the gate + sink test |
| D2 | Welcome (weaker fallback) | "Your answers aren't saved or sent anywhere." | "Tus respuestas no se guardan ni se envían a ningún lado." — NATIVE REVIEW REQUIRED | same | same | Yes with the gate |
| D3 | Handoff entry | "This screen is made to share with your specialist: your finalists and what to test." | "Esta pantalla está hecha para compartir con tu especialista: tus finalistas y qué probar." — NATIVE REVIEW REQUIRED | handoff renders finalists + `consultationImplications` | on handoff redesign | Yes |

Rejected privacy phrasings: "cleared when you finish" (false — finishing clears nothing; ~10-minute idle window); "we don't collect any personal information" (email screen holds name/email/phone in memory; draft policy says otherwise); "nothing is stored on this device" (RSA name/list in `localStorage`); "anonymous"; "never shared"; "deleted immediately"; geographic/custodial promises.

### 10.5 Result-explanation examples
1. "Firmness counted most. You set 7 of 10, and these three sit within one step of it." (from `matchReasons` logic; numbers are the customer's, not weights)
2. "Because you mentioned sleeping hot and a partner who moves, cooling materials and motion isolation pushed these ahead." (from `opt.scores` tags → `m.reasons`)
3. "Price, brand, promotions and financing were not used to rank these. Gold, Silver and Bronze are price ranges; match strength is relative within each." (from `scoring_isolation_check.mjs`; existing relativity note made legible)

### 10.6 Human-handoff examples
1. "This screen is for you and your specialist. It shows your finalists and what to test — not your full answers." *(true only if the brief is limited to implications; verify wording against `resolveConsultationSummary` before use)*
2. "You choose what to mark. Nothing is sent or saved; your specialist can only see this tablet."
3. "Want to test these first? You can come back to this screen — it stays until you restart."

### 10.7 Wording that should be rejected (and why)
1. **"Trusted by South Texas families for 90 years."** — "trusted by" is an unverifiable endorsement-style claim; "90 years" is wrong in 2026 and was wrong on the company's own page ("89th") in 2025; counts must be computed and reviewed annually or not shown.
2. **"Lacks has ten stores across South Texas, from Laredo to Brownsville."** — contradicted across the company's own pages (ten/eleven), the HFA (seven) and BBB (nine).
3. **"One customer from Pharr told us the quiz found her the mattress she'd been looking for for years."** — no consent, identity, or typicality basis; precisely the conduct 16 CFR 465.2/465.4 and 255.2 target; "illustrative" framing does not help.
4. *(bonus)* **"Founder Sam Lack served McAllen civic organizations, making community service part of the company's foundation."** beside `health_conditions` — a values assertion, not a fact, delivered as the customer discloses reflux or nerve pain.

**Testimonials:** none this phase. If ever authorized, the governance template in the companion file (Agent 3 §7) — verbatim quote, identity on file off-kiosk, relationship and material-connection disclosure, consent record with scope and revocation, substantiation for any performance claim, legal and native-ES review, placement never beside health questions, ≤24-month expiry — is a **precondition** to authoring any text into config.

---

## 11. Claim–evidence governance model

**Principle:** an objective claim needs a reasonable basis *before* it is shown (FTC substantiation policy) — "founded 1935" exactly as "0% APR". The repo already has the right machinery for financing; reuse it rather than inventing a parallel, weaker one. **Apply it first to the fact already on screen** ("since 1935" — BBB says 1924) before adding any new one.

**Register entry (authoritative in `incoming/`, carried by the workbook, generated into `store-config.supportingCopy`; never `quiz.json`):**
`id` · `claimType` (historical | community | award | privacy | process | whyWeAsk | testimonial) · `text{en,es}` plain text · `attribution` (company-reported | independent | code-derived) · `sources[]{url, host ∈ tools/source_hosts.json supportingCopySourceHosts, kind, fetchedAt, verbatim quote}` · `independent` bool · `verifiedAt` ISO-8601 **with offset** · `maxAgeDays` (defaults: historical 365, award 540 + hard `expiresAt`, community 180, privacy/process/whyWeAsk every release + 365 ceiling) · `approvedBy/approvedAt/approverRole` · `esReviewStatus` (same enum as financing) · `placements[]` (welcome | review | results | handoff — **quiz:<id> forbidden for community/award/testimonial; never beside `sleep_issues`/`health_conditions`**) · `displayCondition` (previewModeOnly | always) · `discrepancies[]{source, says, noted, resolution}` · `retiredAt/retireReason` · `notes`.

**Lifecycle:** draft → verified (quote + allowlisted host + `verifiedAt`) → approved (owner fields) → published (ES may be provisional per Invariant 12 **except privacy lines**) → STALE when `verifiedAt + maxAgeDays` elapses or `expiresAt` passes → **build fails closed naming the entry** (never silently shown, never silently dropped) → re-verified or retired (kept in `incoming/` with `retiredAt`, excluded from `data/`, CI asserts not served). Quarterly `docs/trust-content-verification-<date>.md` in the financing-log format (browser-session capture, timestamps with offset, verbatim quotes, discrepancy log — lacks.com blocks fetchers, so verification is human). Any ownership, leadership, store-count or award change → owner notifies → affected entries retired the same day.

**Honesty about what governance can and cannot do:** the register makes the retailer able to prove what it shows and prevents silent staleness; it does **not** improve the customer's epistemic position (they cannot see it), and prose cannot be validated for marketing intent — the approver record is the only brand control. Do not render "Source:" labels on the kiosk; show plain dated statements.

**English/Spanish governance:** every string authored in both languages at the canonical source; ES provisional until the consolidated native pass (Invariant 12) **except** privacy/data-use sentences, which must be native-reviewed before showroom use because they are legal representations; list every new string in the PR copy inventory; sentence case, no whole-sentence italics, ~8th-grade reading level, +30% length budget.

---

## 12. Accessibility requirements (for any supporting line that ships)

VoiceOver/screen-reader behavior is out of scope by permanent owner ruling; the rest applies.

| Requirement | Test |
|---|---|
| Plain `<p>` in reading order with the element it explains (help line under the question; data-use line under the time estimate); no heading that outranks the question `h2`; no landmark needed | `quiz_presentation_check.mjs` markup assertion |
| Contrast ≥ 4.5:1 on `#F4EFE6` (and `#F2E9DB` where adjacent); body size (≥15–16px), roman, sans; no 11–12px integrity text | add selectors to `tests/contrast_check.mjs`; size assertion |
| Fully inside the first viewport at 1194×748 EN and ES on every screen where it appears; no 2-D scroll at 320px; no content loss under 1.4.12 overrides; usable at 200% | Playwright geometry assertions (re-measured on `main`) |
| No auto-updating content (2.2.2); no `position: fixed/sticky` over the focused Next (2.4.11); not focusable; no live region; no animation; `prefers-reduced-motion` respected | existing "not live/timed/fixed/focusable" assertion pattern |
| Forced colors: `CanvasText` for text and rules | Playwright `forced_colors='active'` + one manual Windows pass (existing gate) |
| Tapping an answer never changes the line (3.2.2); language switch re-renders it; wipe resets to EN | existing patterns |
| Any control (none recommended) ≥ 44×44 CSS px, keyboard operable, `onclick` + `ontouchend(preventDefault)`, `touch-action: manipulation` | grep + geometry |
| Question change scrolls to top and moves focus to the headline (the D1 fix) — **not** on answer re-renders, where `preventScroll` restoration is deliberate | Playwright: headline top ≥ 0 and `activeElement` = headline after Next on every question |
| Reading level ~grade 8 EN; plain ES | FK script as CI warning; native pass |

---

## 13. Technical architecture recommendation

1. **Target `main` (`4a76503`, or after Slice 5 lands).** The quiz renderer is untouched by Slice 5. Discard the prototype's Slice 4 portion; re-derive the trust hunks by hand.
2. **No new structure in `quiz.json`.** Revert the `trustStories` block, the `unknown_root` tightening and the CLAUDE.md paragraph (they widen every retailer's quiz contract and contradict the copy-only rule). "Why we ask" = `helpText` copy edits through the normal pipeline (`incoming/dreamfinder_quiz.json` → workbook → `data/quiz.json`).
3. **App-level truths live in the dictionaries** (`dict-en.json`/`dict-es.json`): the data-use sentence (preview-mode and live-mode variants), the results method note, the handoff audience line. **Retailer facts, if ever, live in `store-config.supportingCopy`** authored in `incoming/lacks_store_values.json` and governed by a `validate_supporting_copy` modeled on `validate_financing` (freshness + future check + allowlist via a new `tools/source_hosts.json` key + plain text + bilingual + placements), called from `convert_store_data.py` with the host list.
4. **Display gating by config truth:** the validator fails the build if the preview-mode privacy key is enabled while `gasUrl` is non-blank; runtime also checks `STORE_CONFIG.gasUrl`. A whole-file test pins the set of network sinks (exactly the loader helper and the GAS POST may call `fetch`; zero `XMLHttpRequest`/`sendBeacon`/`WebSocket`).
5. **Rendering:** reuse the prototype's stateless, escaped, non-focusable, timer-free approach; place explanatory lines *with* what they explain, never after Next; derive language at render; no new globals beyond what the loader already exposes.
6. **Hardcoded privacy promises** (`index.html:10744`, `:16031–16032`) move to `store-config.text/text_es` (or are removed); `privacyBody` gets a preview-mode variant matching the deployment; `privacyDraftNotice` is resolved by the owner.
7. **Demo bundle:** the demo shares `data/quiz.json` and gets its own config — decide explicitly whether governed facts or the preview-mode privacy line should appear in the Black Friday demo (they describe Lacks' real deployment; default: strip facts, keep the privacy line only if the demo config's `gasUrl` is also blank).
8. **Copy–engine correspondence table** in `docs/` listing each `helpText` line and the `scores` tags/behavior it describes; CLAUDE.md's scoring-change rule references it ("any scoring change re-audits these ten lines").

---

## 14. Measurement and experiment plan (justified trust, not conversion)

**Why conversion is not the metric:** conversion rises with persuasion, urgency and salesperson effort; all three can rise while justified trust falls. Conversion and completion are recorded as secondary, directional signals only, and a result where conversion rises but comprehension or pressure items worsen is **failure**, not success.

**Instruments**
1. *Post-quiz card* (≤8 items, 5-point, EN now / ES after native review), shown on the device **only if an aggregate-count store exists that records no answers and no identity** (design this before promising "nothing leaves the tablet"; the current privacy line forbids any network channel):
   - T1 "I understood why each question was asked." · T2 "I understand how my matches were chosen." · T3 "The quiz was working in my interest, not just trying to sell me something." · T4 (reverse) "I felt the quiz was trying to pressure me." · T5 "I know what happens to my answers after the quiz." · T6 "The quiz was honest about what it can and can't tell me." · T7 "Talking to a specialist felt like my choice." · T8 "Lacks seems like a company I can rely on." · E1 effort (Paas single item).
   - **C1 objective comprehension (required, separates justified from placebic trust):** "Which of these did the quiz use to rank mattresses?" (firmness ✔ / price ✘ / brand ✘ / financing ✘ / what I said about sleep ✔). **C2:** "Can you find where it says what happens to your answers?" (task, timed).
2. *Moderated think-aloud sessions* in store, 5–8 per condition, EN and ES, customers not staff: do they read the line? believe it? change an answer? what do they think the specialist sees?
3. *Behavioral proxies already in memory:* review-screen edit rate; `sleep_issues`/`health_conditions` option counts per condition (**disclosure suppression is the John et al. failure mode and shows up here**); abandonment by question; handoff opt-in; E1.
4. *Associate feedback:* structured weekly debrief (what customers asked about the line; pressure moments).
5. *Assistive-technology users:* keyboard-only and low-vision sessions (zoom 200%, forced colors) — VoiceOver excluded by ruling.

**Design.** The requested four-cell comparison (A none · B heritage only · C process only · D restrained combination) is specified below but is **not feasible as a between-subjects showroom test**: at d = 0.3 on 5-point items it needs ≈230 completed cards per cell (≈930 total) with the salesperson standing beside the customer for T3/T4/T7. Run instead:
- **Phase 1 (diagnostic, cheap):** moderated sessions on A vs C (current vs. smallest implementation) — n ≈ 6 per cell per language.
- **Phase 2 (directional):** two cells only, one store, A vs C, 60–80 cards per cell, plus proxies. Add D as a third cell only if the owner later approves any heritage line; B is answered by the literature and need not be run.
- Randomize per session start; log condition in the aggregate store; keep salespeople blind to condition where possible (the welcome line is visible, so blind is imperfect — record associate presence as a covariate).

**Success / failure / inconclusive (pre-registered):**
- *Success:* C1 correct rate up ≥ 15 points; T1, T2, T5 up; T4 not worse; E1 flat; health-option counts flat (no disclosure suppression); T8 flat (heritage constant); completion not worse.
- *Failure:* any of — E1 up; health-option counts down; T4 up; C1 flat while T1/T2 rise (placebic pattern); completion down.
- *Inconclusive:* < 60 cards per cell, or effects mixed across the two phases, or associate presence explains the difference.

---

## 15. Failure modes and mitigations

| # | Failure mode | Trigger | Customer symptom | Mitigation |
|---|---|---|---|---|
| 1 | Marketing re-frame | repeated brand content in the task stream | "this is an ad" → discounting of the recommendation | no heritage on question screens; one exposure on welcome; plain labels, no "story" framing |
| 2 | Satisficing on scoring inputs | extra prose on firmness/position/issues screens, esp. ES | default slider left, first plausible option tapped → wrong match | nothing non-task on question screens; one-sentence help only |
| 3 | Placebic transparency | copywriter-authored "why we ask" | felt trust without understanding; sharper drop when a match feels off | each line names a mechanism tied to `scores`; correspondence table; C1 comprehension item |
| 4 | Privacy promise drift | `gasUrl` set, a new beacon/pixel added, or an unreviewed ES sentence | a false representation (FTC §5 / DTPA exposure) | validator gate on `gasUrl`; whole-file sink test; native-ES review before showroom; one privacy voice in config |
| 5 | Stale or contradicted facts | date-bumped `verifiedAt`; page changes; counts copied | a local customer who knows better discounts everything | register + fail-closed + human quarterly record; no counts/awards/superlatives; govern "since 1935" first |
| 6 | Inverted hierarchy after Next | scroll carry-over on tall questions | headline off-screen; supporting line first | `renderQuestion` scroll/focus fix + Playwright assertion |
| 7 | Health-moment mismatch | warm brand copy beside `sleep_issues`/`health_conditions` | disclosure under persuasion; reactance toward handoff | placement rule: nothing but the question and its help on those screens |
| 8 | Handoff read as pressure | heritage/urgency at the closing screen; unacknowledged specialist audience | withheld picks; abandonment before handoff | audience statement; equal-weight actions; no QR; heritage default-off |
| 9 | Silent gate removal | fail-closed gate trips (as financing's has since 2026-08-07) and nobody notices | honest line disappears; nothing tells staff | build error names the entry; a staff-visible "content verification due" note in the runbook |
| 10 | Template misuse by another retailer | a generic facts block filled with marketing | the white-label product ships puffery under a "governed" label | approver record mandatory; no "Source:" rendering; claim-type rules; document that the validator cannot check intent |
| 11 | Demo leakage | production `quiz.json`/config facts appear in the prospect demo | Lacks-specific claims under an illustrative campaign | demo builder strips `supportingCopy`; decide privacy-line behavior per demo config |
| 12 | Measurement contradicts privacy | a feedback card that needs a data channel | the privacy line becomes false | aggregate-count local store designed first; wording permits it |

---

## 16. Smallest valuable implementation (recommended; one PR on `main`, ~one day)

1. **Scroll/focus on question change** in `renderQuestion` (question change only, not answer re-renders); Playwright assertion at 1194×748 EN/ES that the headline top ≥ 0 and focus is on the headline after Next on every question (numbers re-measured on `main`).
2. **`helpText` truth audit** (copy-only through `incoming/dreamfinder_quiz.json` → workbook → `data/quiz.json`): replace the three overclaims (`mattress_size`, `sleep_position`, `temperature`) and the benefit-claim (`partner_disturbance`) with mechanism statements from §10.3; state plainly for `trigger`/`mattress_size` that they do not change the ranking; add `docs/quiz-copy-engine-correspondence.md`; Blake's sign-off as quiz copy.
3. **One data-use sentence on the welcome screen** (§10.4 D1), dict-driven, preview-mode variant gated in the validator on `gasUrl` blank with a live-mode variant authored; whole-file network-sink test; ES native-reviewed before showroom use; net reassurance count held flat (drop the duplicated "No pressure").
4. **Privacy voice clean-up:** move/remove the hardcoded "never sold… Unsubscribe anytime." lines (EN+ES); preview-mode `privacyBody`; owner resolves `privacyDraftNotice`.
5. **Tier-relativity note to body size** (CSS only).
6. **Tests:** negative controls in `quiz_presentation_check.mjs`; `mutation_sweep.mjs` entries (delete the note; remove the scroll fix; break the gate); validator self-tests (gate trips when `gasUrl` set; stale/future dates if any register lands); contrast entries; EN/ES dict parity (existing).
7. **Revert from the prototype tree:** `trustStories` block, `unknown_root` check, CLAUDE.md paragraph, the dead `trustSignal` edit; delete `outputs/`.

Not in the smallest implementation: the register, any new heritage line, QR, results method note rewrite (valuable — next slice), handoff audience line (next slice), testimonials, experiment tooling.

---

## 17. Later-phase roadmap

- **Phase B (next slice):** results method note + one limitation (§10.2 P2/P3/P5); review-screen audience line (P4); handoff audience line (D3) and equal-weight actions; owner ruling on a cross-tier "highest overall score" marker or sort control (scoring/tier change → Blake sign-off).
- **Phase C (only if the owner wants facts beyond the welcome line):** `supportingCopy` register and validator modeled on financing; first entry = the existing "since 1935" line with the BBB discrepancy resolved; quarterly verification record; demo-builder strip.
- **Phase D (measurement):** aggregate-count local store; post-quiz card with C1/C2; moderated sessions; associate debrief; publish results in `docs/`.
- **Phase E (if ever):** testimonials under the governance template only.
- **Standing:** native-Spanish pass (Invariant 12) now includes every trust string; privacy sentences are the exception that goes first.

---

## 18. Exact acceptance criteria (for the smallest implementation)

1. On `main`, at 1194×748 and 834×1108, EN and ES, after Next from every question (both partner and solo paths), `.noct-quiz-headline` top ≥ 0 and `document.activeElement` is the headline; answer taps still restore focus to the activated option only when `:focus-visible`.
2. All ten `helpText` lines map to a row in `docs/quiz-copy-engine-correspondence.md` whose cited `scores` tags exist in `data/quiz.json`; no line states a numeric weight, a size filter, a health outcome, or a benefit promise; `tests/fixtures/phase1_output_baseline_*.json` byte-identical (copy edits never move recommendations).
3. The welcome data-use sentence renders in EN and ES only when `STORE_CONFIG.gasUrl` is blank; `tools/validation.py --self-test` proves the build fails when the preview-mode key is enabled with a non-blank `gasUrl`; a whole-file test proves exactly two `fetch` call sites and zero `XMLHttpRequest`/`sendBeacon`/`WebSocket` in `index.html`; the ES sentence carries a recorded native review.
4. `index.html` contains no privacy/policy sentence that is not dict- or config-driven (smoke guard extended); the email screen shows only config text; `privacyBody` matches the deployment mode.
5. `.tier-relativity` computed font size ≥ 15px; contrast ≥ 4.5:1; added to `contrast_check.mjs`.
6. New assertions fail first on the defect (negative controls + `mutation_sweep.mjs` entries), then pass; the full CI suite is green; the mutation sweep count increases by the number of new proofs.
7. `data/quiz.json` has no `trustStories` key; `validate_quiz` has no `unknown_root` check; CLAUDE.md has no `trustStories` paragraph; `outputs/` absent; white-label smoke guard green; `index.html` hash differs from `main` only by the enumerated hunks.
8. Manual gates (existing pattern): owner iPad pass both orientations EN+ES; Windows forced-colors rendered; reduced-motion.

---

## 19. Open questions requiring Lacks owner approval

1. **Founding year.** BBB lists "Business Started 1/1/1924". Confirm 1935 from corporate records before "since 1935" continues to ship, or correct it.
2. **Do you want any company-history content inside the quiz at all?** The evidence says no; this report recommends none. If yes, it is one plain line on Q1 at most, no label, no source line, above Next — and the register comes first.
3. **Approver of record** for trust/privacy copy (name, role), and permission to record approvals in config (`approvedBy/approvedAt`) rather than only in chat.
4. **Privacy copy.** Who resolves `privacyDraftNotice`; may the preview-mode sentence (§10.4 D1) ship; who performs the native-Spanish review of that one sentence ahead of the consolidated pass; should the hardcoded "never sold… Unsubscribe anytime." be retired or moved to config?
5. **What the specialist sees.** Confirm the handoff brief's scope (finalists + implications derived from health/sleep answers) and the audience wording (§10.6).
6. **Tier semantics.** Keep "Best match" as a within-tier label with a legible relativity note (recommended), or add a cross-tier highest-score marker / sort control (scoring/tier change → your sign-off).
7. **Quiz copy edits** to `mattress_size`, `sleep_position`, `temperature`, `partner_disturbance` (§10.3) — your sign-off as governed quiz copy.
8. **Awards/community lines on handoff** (HFA 2025; civic service): omit (recommended) or show plain and dated with hard expiry?
9. **Demo bundle policy:** strip any governed facts and the preview-mode privacy line from the Black Friday demo?
10. **Measurement:** approve an aggregate-count local store (no answers, no identity) and a two-cell directional study; approve moderated in-store sessions.
11. **Store count / cities** (7/9/10/11) — for the discrepancy log only; recommendation is never to display.
12. **Testimonials:** confirm "not this phase" and the governance template as the precondition for any future round.

---

## 20. Explicit "do not build" list

- The per-question or per-pair heritage rail / "From the Lacks story" editorial rail inside the question stream (the prototype), or any history line on `sleep_issues`/`health_conditions`.
- Background/watermark copy; timed rotation, tickers, carousels, fade-cycling facts; side rails; sticky/fixed fact bars.
- One fact per question; ten "Source:" lines; any "Source:" label on the kiosk; any QR or link to the About page; any outbound navigation from the quiz.
- Answer-aware anecdotes or "customers like you" lines; testimonials, star ratings, review counts, "X people took this quiz"; any fabricated or composite customer story.
- Placebic justifications ("to personalize your experience"); numeric weights in "why we ask" copy; health-outcome promises ("relieves back pain", "stops snoring", "easy fix"); origin/availability claims ("in stock", "fast delivery", "made in Texas") in quiz copy; any rate/term/APR outside the financing envelope.
- Absolute privacy promises ("never", "anonymous", "nothing stored", "deleted immediately", "cleared when you finish", "never shared"); a privacy line repeated per question; a privacy line that is not validator-gated on the deployment mode.
- Store counts, square footage, superlatives ("largest", "most preeminent"), anniversary counts as literal text, leadership names, the Lusitania biography, present-tense charity claims, Reader's Choice / Furniture Today rank claims.
- A confessional tier line without a control; a fake "calculating…" effort display; urgency/scarcity/"specialist is waiting" framing; a "Why we ask?" toggle or tooltip on the question screen.
- A new `whyWeAsk` field (duplicates `helpText`); retailer prose structure in `quiz.json`; the `unknown_root` tightening; a new workbook tab or `data/*.json` for ~5 strings; anything rebased from the prototype's Slice 4 files.
- A four-cell between-subjects showroom experiment; any feedback mechanism that needs a network channel while the privacy line says nothing leaves the tablet.

---

## Appendix A — Answers to the eighteen synthesis questions

1. **Are historical factoids likely to increase trust during this quiz?** No. They may raise affective brand warmth (already delivered on welcome) but not justified trust in the quiz or its recommendations; no evidence shows heritage transferring to algorithm trust.
2. **When would they reduce trust?** When repeated (the app is at two exposures before Q1), recognized as advertising in a consultation frame, placed beside health disclosures, unseen (below the fold) and therefore random, stale or contradicted (the source page is), or when they displace a real explanation.
3. **Placement?** Not background, not after the controls, not beside the question. Heritage: welcome only. Explanations: with the thing they explain (help line under the question; method note at results; audience line at review/handoff).
4. **Cadence?** Per-question for the existing one-sentence help only; everything else at selected moments (welcome, review, results, handoff); never per-chapter facts (chapters are invisible).
5. **Rotate automatically?** Never (WCAG 2.2.2; NN/g carousel findings).
6. **Depend on the customer's answer?** Only as overt, justified usage explanation already supported by `copyVariants` and the results "why it matches you"; never as anecdote or reassurance.
7. **Balance?** Recommendation explainability and "why we ask" first; privacy/data-use once and exact; quiz-process transparency at results; company history once on welcome; community involvement and testimonials not at all in this phase.
8. **Most effective interventions regardless of factoids?** §8 ranks 1–6: scroll/focus fix, help-text truth, one data-use line, one privacy voice, findable method note + limitation, honest handoff audience and control.
9. **Displayable now on available evidence?** P1–P5, D1–D3, the §10.3 help lines (after owner sign-off); H1/H2 only after the 1924 discrepancy is ruled on.
10. **Needs owner approval or more evidence?** Everything in §19; all ES strings (native review); H3–H6.
11. **Must not be displayed?** §20 and §10.7 (counts, superlatives, awards without year/expiry, testimonials, absolute privacy promises, health outcomes, "cleared when you finish").
12. **EN/ES governance?** Canonical bilingual authoring; ES provisional under Invariant 12 except privacy sentences, which are native-reviewed first; PR copy inventory; typography and reading-level rules (§11).
13. **Sources recorded and surfaced?** Recorded in the register with verbatim quotes and allowlisted hosts; **not** surfaced as "Source:" labels or links on the kiosk — plain dated statements; a human quarterly verification record.
14. **Smallest valuable implementation?** §16.
15. **A more complete trust system later?** §17.
16. **Measure without equating trust with conversion?** §14 — comprehension item, disclosure proxies, pressure/choice items, effort; conversion secondary; a conversion rise with worse comprehension = failure.
17. **Required tests?** §12, §16 item 6, §18.
18. **Does the current implementation meet these standards?** No. Exact gaps: content class (heritage only, unrelated to questions, on health screens); placement (below Next, below the fold on the mounted orientation, aggravates the scroll defect); governance (no freshness gate, no allowlist, no approval/ES record, source uncheckable, build/runtime mismatch, no mutation proofs); architecture (retailer prose in the quiz contract; CLAUDE.md amended to permit it; envelope tightened for all retailers; superseded Slice 4 base); evidence (company-reported only; source page stale and contradicted; BBB 1924 unlogged). The reusable part is the rendering mechanism and the fail-soft loader.

## Appendix B — Artifacts
- Companion file with verbatim agent and red-team reports: `docs/quiz-trust-investigation-2026-08-21-agent-reports.md`.
- Session scratchpad (ephemeral; not in the repo): Playwright probes `rail_probe.py`, `d1_probe.py`, screenshots `rail_landscape_1194x748_es.png`, `rail_forced_colors.png`, `rail_zoom200.png`; About-page capture `lacks-about-us-capture-2026-08-21.md`.
- No file under `index.html`, `data/`, `incoming/`, `tools/`, `tests/`, `demo/` or `CLAUDE.md` was modified by this investigation.
