# Trust integrity gate — owner review packet (2026-08-21, updated 2026-08-22)

**For:** Blake Ford (content owner / business approver). **Branch:**
`claude/phase1-trust-integrity` — **PR #54, merged 2026-08-23 as `d4049cb`**
(https://github.com/beford782/LacksFurniture/pull/54) and live on the Pages
preview with the physically tested bytes. **Not showroom-authorized**; no live
email; Spanish provisional. This packet is now the record of the decisions
that took it there.

## Status at 2026-08-22 — decision checklist

Your 2026-08-21 rulings R1–R8 are recorded below as **product direction**. They
are **not** legal, native-language, physical-device or showroom approval, and
they do not authorize merging either PR.

| Status | Items |
|---|---|
| **APPROVED — PRODUCT DIRECTION** | R1 merge order: #54 (this gate) before #53 (Slice 5) · R2 heritage Welcome-only this cycle · R3 tier presentation option A retained this cycle (Gold-first, within-tier, 15px relativity note) · R4 the hardcoded "never sold / unsubscribe" promise stays removed; no other absolute promise · R5 idle-dialog body replaced with behaviourally exact wording (direction) · R6 no anniversary arithmetic; "since 1935" stays, provisional · R7 VoiceOver sanity pass required before #54 leaves draft · R8 mounted-device gate stands |
| **APPROVED — PRODUCT COPY (Blake Ford, 2026-08-22)** | the nine quiz help lines as governed EN copy (§1) · `sleep_position` option A — the shipped gloss stays (§1a) · the final idle-dialog EN sentence as shipped (§2.5) · the Welcome and Review sentences as product wording (§2.1, §2.2). English only — every Spanish line stays provisional. No bytes changed; the `f748f59` physical pass carries forward. |
| **APPROVED — LEGAL/BUSINESS (Blake Ford, approver of record, 2026-08-22)** | #6 the Welcome and Review English sentences signed as accurate business representations for the current preview-mode deployment (`gasUrl` blank; scope: the current preview-mode deployment only, `gasUrl` blank, answers staying on the tablet unless a future email-enabled configuration is separately approved; it does not cover a live-email configuration, does not approve Spanish, and does not authorize showroom use, deployment, readiness or merge) (§2.1, §2.2) · #7 **option C — preview-only for this merge**: `gasUrl` stays blank, no live email or lead collection, the draft policy and its visible notice stay, the policy is **not** claimed finalized; the privacy-policy gate is resolved for this PR by that explicit decision (§2.4) |
| **PENDING — LEGAL/BUSINESS** (approver of record: Blake Ford) | the email line and the live-mode Welcome sentence in any future email-enabled configuration — separate Code.gs audit, final policy wording, business/legal approval, native Spanish and deployment authorization (§2.3) · founding year 1935 by corporate/archival record (§4) |
| **WAIVED AS A PR #54 GATE — NATIVE SPANISH STILL PENDING** (owner ruling, Blake Ford, 2026-08-22) | the four priority strings `privacy.data_use_preview`, `privacy.data_use_live`, `review.help`, `safety.timeout_body` (§2.6) no longer block this preview-only merge — **not** native-reviewed, approved or final; Spanish provisional · the eight changed quiz ES lines stay on the consolidated ledger (§1) · native review is still required before Spanish showroom authorization or any live email/lead-enabled deployment, and either reopens it |
| **COMPLETED — PHYSICAL DEVICE (owner attestation, 2026-08-22)** | Blake instructed the lead to treat all 21 compact checks as passed for `f748f59`: mounted iPad landscape and portrait, EN and ES; partner and solo paths; VoiceOver sanity pass; real Windows Aquatic and Desert forced colors. No export, screenshots or exact device-version metadata were supplied; the evidence limitation is recorded in `docs/trust-integrity-physical-gate-2026-08-21.md` §15. |
| **DEFERRED — LATER PHASE** | tier options B (neutral initial tier) and D; the `partner_disturbance` preferred line (until 3.1 ships); heritage as an optional research condition; the Sleep System's own benefit-flavoured reason lines (1.4); the Results tier-tab overflow at 320px (1.3) |
| **NOT AUTHORIZED** | per-question heritage rail, counts, awards, testimonials, QR codes, anecdotes · cross-tier highest-fit marker / global maximum (3.3 🔒) · showroom use · live email / lead collection / a non-blank `gasUrl` · merging or modifying #53 · removing the draft-policy notice |

**Nothing further is needed from you for this PR: #14 merge authorization was
given 2026-08-22** (merge commit, branch kept, no squash/rebase). Merging to `main` publishes only the existing GitHub Pages preview. The authorization grants no showroom use, no live email or lead collection, no non-blank `gasUrl`, no final Spanish approval, no production/live-business approval beyond the existing preview deployment, and no permission to merge or modify PR #53. Three heads, one set of application bytes: **physical-test head `f748f59`** (owner-attested device pass), **reviewed application head `9f27680`** (owner live review; CI run 32593585017 pass), and the **current PR/documentation head** (the latest docs-only commit recording these decisions). `index.html` and the `data/`, `demo/` and `incoming/` trees — every customer-visible byte, configuration, generated file and scoring input — are byte-identical across all three. After the reviewed head, and only by the owner's 2026-08-22 option-B direction on the external review, `tools/validation.py` (the build-admission validator) and `tests/mutation_sweep.mjs` changed; those are build tooling and test manifest, not the served application, so the physical and live-review passes are not reopened. Native review (#9 waived as a gate,
#10 on the consolidated ledger) stays owed before Spanish showroom use or any
live-mode deployment. The physical packet is complete by your 2026-08-22
attestation. The decision sheet directly below records what is decided and
what remains.

## Decision sheet — 2026-08-22, after the physical pass: all 14 decisions taken 2026-08-22

**External review disposition (Blake Ford, 2026-08-22, option B).** When PR #54 left
draft, the repository's automated Codex review left two P2 threads on
`tools/validation.py`. You directed: thread 1 (a temporary scenario that disables
email should not make a non-blank `gasUrl` count as preview) — **preserve the
conservative behaviour**, correct the inaccurate comment, add self-tests proving a
temporary scenario cannot relax admission; thread 2 (bare "not stored" rejected
even in an unrelated truthful sentence) — **fix now**, narrowing storage-negation
phrases to sentences about answers, customer information, session or results,
with positive and negative self-tests. Implemented in the validator and the
mutation manifest only; no customer-visible byte changed (implementation report
§33). The re-review raised a third thread — a whitespace-only `gasUrl` is live
at runtime but was admitted as blank — fixed the same way under your
live-capable ruling (`5a1f70c`); a fourth bound the storage negation to its own
clause so a time adverbial such as "during your session" no longer rejects an
unrelated claim (`ea887db`). A fifth and sixth (`b98b7a7`) inspect every occurrence of a phrase and let
clause conjunctions (but/while/although…) delimit the bound phrase — "and" is
deliberately not a delimiter, fail closed. A seventh (`babef79`) completes the family with contractions, "won't be", keep/retain
and the Spanish active forms. An eighth (`bbf3c9c`) replaces the phrase list with a grammatical family after
folding typographic apostrophes. A ninth and tenth (`9aa11ac`) allow adverbs between negation and verb and scope
transmission negations to absolute claims about governed data. An eleventh and twelfth (`dbde3ec`) test every destination word for universality and
restrict the negation gap to auxiliaries and adverbs. A thirteenth and fourteenth (`9988795`) scan the whole destination for a universal and
treat a scoped "any lender" as qualified. A fifteenth (`53b7e27`) limits that scan to the coordinated continuation of the
destination. A sixteenth and seventeenth (`f2aa300`) remove the length cap and require structural
evidence of coordination for a continuation. An eighteenth (`b7eff97`) keeps a coordinated clause after ", and" out of the
destination; after it the lead closed the review loop (eleven passes, all on the
same prose heuristic, none touching the app). All eighteen threads
answered and resolved
on the PR.

The physical gates are closed for the bytes at `f748f59` (§5). Everything
below is **yours or someone you name**; nothing on this sheet is pre-decided,
and the lead's recommendations are recommendations only. Six kinds of decision
are kept apart because each authorizes something different: **product-copy
approval** (a sentence may ship as governed copy), **legal/business approval**
(the business stands behind a representation), **native-Spanish approval** (a
Spanish string is correct and natural), **owner live review** (you have walked
the build that will merge), **readiness authorization** (PR #54 may leave
draft) and **merge authorization** (PR #54 may merge). Approving one never
implies another. No decision here authorizes deployment or showroom use —
`docs/kiosk-device-hardening.md` still blocks that independently.

| # | Kind | Decision | Exact current wording | Options | Lead recommends | Approval authorizes · does **not** authorize |
|---|---|---|---|---|---|---|
| 1 ✅ | Product copy | The nine rewritten quiz help lines (§1 rows 1–5, 7–10) — **APPROVED as proposed, Blake Ford, 2026-08-22** (EN only) | §1, "Proposed EN" column — the lines shipped in `data/quiz.json` at `f748f59` | Approve each · Revise (say which and how) · Defer | **Approve all nine as proposed.** Each was verified code-true against the engine in three independent rounds; every earlier line overstated or under-described what the answer does. Row 4's preferred "…the more we favor motion isolation" stays deferred until roadmap 3.1 makes that tag live. | The EN line ships as governed copy in this PR · not the ES line (#10), not legal, not merge. A revision re-runs the quiz pipeline and the §11 copy retest for that question. |
| 2 ✅ | Product copy | `sleep_position` wording (§1a) — **Option A chosen, Blake Ford, 2026-08-22**: the shipped gloss stays; no rebuild, no retest | "This helps us favor pressure relief, support, or a responsive feel." | **A** keep the gloss · **B** conservative: "This helps us compare support and comfort features for your usual sleep position." · **C** stricter: "This helps us favor a softer, cushioning feel, support, or a responsive feel." | **A — keep the gloss.** "Pressure relief" is plain language for the cushioning (`plush`/`soft`) points that do run for a side sleeper; the inert `pressureRelief` tag is an internal spelling mismatch (3.1), not a customer-facing falsehood. B is the right fallback if you want no mechanism language at all; B or C costs a pipeline rebuild, a new provisional ES string for native review, and the §11 retest of IPAD-L-EN-10 / its ES twin on the just-passed build. | The chosen EN line ships · not its ES line, not merge. |
| 3 ✅ | Product copy | Welcome data-use sentence as product wording (§2.1) — **APPROVED as shipped, Blake Ford, 2026-08-22** | "During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them." | Approve · Revise · Defer | **Approve.** True under the blank `gasUrl` (two network calls only, no storage of answers, wipe inventory test-pinned); the validator refuses the wording under any live `gasUrl`, where the live variant renders instead. | The sentence stays as shipped · does not make it a legal representation (#6), does not approve the ES (#9). |
| 4 ✅ | Product copy | Review specialist-summary sentence as product wording (§2.2) — **APPROVED as shipped, Blake Ford, 2026-08-22** | "These answers create your matches and the summary your specialist will review with you." | Approve · Revise · Defer | **Approve.** It claims exactly what happens: the answers build the matches and the Consultation Summary the specialist reviews with the customer on the same tablet. The separate *specialist-summary scope* question (what the summary shows, whether the customer can trim it) stays open and is not forced by this wording. | The sentence stays as shipped · not the scope ruling, not legal (#6), not the ES (#9). |
| 5 ✅ | Product copy | Final English idle-dialog sentence as shipped (§2.5; direction R5 already approved) — **APPROVED as shipped, Blake Ford, 2026-08-22** | "Session paused. Continue this session where you left off, or start a new customer to clear it." | Approve as shipped · Revise (the sentence must keep naming the dialog's real controls, "Continue this session" / "Start new customer") | **Approve as shipped.** It names the two controls exactly and promises nothing about privacy; tests pin both. Your direction's "restart" could not be used literally because the Restart utility control is inert while the dialog is open. | The EN sentence stays · not the ES (#9). A revision re-pins `session_safety_check` / `mutation_sweep` and re-runs the §11 idle rows. |
| 6 ✅ | Legal/business | The Welcome and Review sentences as representations the business stands behind (§2.1, §2.2) — **SIGNED, Blake Ford, approver of record, 2026-08-22**, for the current preview-mode deployment only (`gasUrl` blank); not a live-email approval, not Spanish, not showroom/deploy/ready/merge | the two sentences in #3 and #4 | Approve (by the approver of record) · Request counsel review · Defer | **Approve once #8 names the approver** — in preview mode both sentences describe what the code does, test-pinned; a live (`gasUrl`) deployment needs its own pass because the live variant and the Code.gs sheet/BCC behaviour must be disclosed then. | The representation is the business's · does not approve the privacy policy (#7) or any live-email wording. |
| 7 ✅ | Legal/business | Privacy policy and the visible draft notice (§2.4) — **OPTION C chosen, Blake Ford, 2026-08-22**: preview-only for this merge; `gasUrl` blank; no live email or lead collection; the draft policy and its visible notice stay; the policy is not finalized; the gate is resolved for this PR by this explicit decision | Notice: "Draft policy — pending Lacks Furniture approval before live use." Body: your configured draft, unchanged (§2.4) | **A** approve the final policy (supply text) · **B** supply a revised policy · **C** keep preview-only — no email, the draft policy and its notice stay visible · **D** another business/legal decision | **C for this merge, with A scheduled beside the live-email decision.** Nothing is collected while `gasUrl` is blank, so the policy's "collects" describes a mode that is not on; the draft notice is honest about that. The notice is incompatible with *showroom* readiness, which hardening already blocks — it is not a reason to hold this integrity PR. | C keeps the PR mergeable with the notice visible; A/B ship a final policy and remove the notice · neither authorizes live email, which needs the Code.gs audit first. |
| 8 ✅ | Legal/business | Name the legal/business approver of record (§2.1) — **Blake Ford named, 2026-08-22** | Blake Ford | Yourself as business owner · Yourself plus counsel for #6/#7 · Someone else named | **Name yourself now** and decide whether counsel reviews #6/#7. Until a name is on record, #6 and #7 cannot close. | Lets #6/#7 be signed · does not itself approve anything. |
| 9 ✅ (waived as a gate) | Native Spanish | The four priority strings (§2.6) — **owner ruling, Blake Ford, 2026-08-22: native review waived as a PR #54 readiness/merge gate for this preview-only merge.** Not a translation approval: the strings are not native-reviewed, approved or final; Spanish provisional; review still required before Spanish showroom authorization or any live email/lead-enabled deployment, which reopens it | `privacy.data_use_preview`, `privacy.data_use_live`, `review.help`, `safety.timeout_body` — exact ES in §2.1, §2.6, §2.2, §2.5 | Commission a native reviewer now · Defer to the consolidated end-of-development pass (Invariant 12 made these four the exception — they were a PR #54 gate until the 2026-08-22 waiver) | **Commission as soon as #3–#5 are approved**, so the reviewer sees final English. The review notes in §2.6 tell the reviewer what each string must not drift into. | The ES strings may ship as reviewed · does not approve the eight quiz lines (#10). |
| 10 | Native Spanish | The eight changed Spanish quiz help lines (§1) | §1, "Proposed ES" column | Review now with #9 · Leave on the consolidated ledger (roadmap Invariant 12) | **Leave on the consolidated ledger** unless the reviewer is already engaged — these are not a PR #54 gate; ship provisional, as every slice has. | Nothing for this PR · the lines remain provisional either way. |
| 11 ✅ | Owner live review | Your own walkthrough of the build that will merge — **PASSED, Blake Ford, 2026-08-22, at branch head `9f27680`** (app bytes identical to the attested `f748f59`; walked on the dry-run mirror, whose `index.html`, `store-config.json`, `quiz.json` and `dict-es.json` were re-verified byte-identical to the branch immediately before the walk). Reviewed the seven customer-visible changes in EN and the critical path in ES; Spanish viewed as provisional, not approved | — | — | — | Closes the live-review gate · not readiness, not merge. |
| 12 ✅ | Readiness | Designate the final reviewed head and its CI run — **DESIGNATED, Blake Ford, 2026-08-22: reviewed application head `9f27680`**, CI run 32593585017 pass (18 checks); app bytes identical to the physical-test head `f748f59`; commits after it are documentation only and do not change the reviewed bytes. The current documentation head must still carry green CI before the PR is marked ready | `9f27680` | — | — | Ticks "Final CI at the reviewed head" · nothing else. |
| 13 ✅ | Readiness | Explicit authorization to mark PR #54 ready for review — **AUTHORIZED, Blake Ford, 2026-08-22**, conditional on: all state/SHA checks passing, the reviewed-head designation recorded consistently, green CI on the current documentation-only head, and the checklist showing only the merge gate open. The lead flips draft → ready once those hold | — | — | — | The lead flips draft → ready · **not merge** (#14 stays open). |
| 14 ✅ | Merge | Explicit authorization to merge PR #54 — **AUTHORIZED, Blake Ford, 2026-08-22**: merge commit, keep the branch, no squash, no rebase; acknowledges that merging updates the Pages preview. Merging to `main` publishes only the existing GitHub Pages preview. The authorization grants no showroom use, no live email or lead collection, no non-blank `gasUrl`, no final Spanish approval, no production/live-business approval beyond the existing preview deployment, and no permission to merge or modify PR #53. | — | — | After #13; merge as a merge commit, branch kept, then PR #53 integrates the resulting `main` (R1). | Merges to `main` and deploys the Pages preview · not showroom use (hardening blocks), not PR #53. |

**Decided 2026-08-22 (Blake Ford):** #1 all nine lines approved as proposed;
#2 option A; #3, #4, #5 approved as shipped; #8 Blake Ford is the approver of
record; then, as that approver, #6 the Welcome and Review sentences signed as
business representations for the preview-mode deployment, and #7 option C —
preview-only for this merge, draft notice retained, policy not finalized. All
English-only, all as shipped — no bytes changed, so the physical pass at
`f748f59` carries forward unchanged.

**Also 2026-08-22 (Blake Ford):** #9 native review of the four priority
strings waived as a PR #54 gate — not approved, Spanish provisional, owed
before Spanish showroom or live-mode use.

**Also 2026-08-22 (Blake Ford):** #11 live review passed at `9f27680`.

**Also 2026-08-22 (Blake Ford):** #12 reviewed application head designated
`9f27680`; #13 ready-for-review authorized (conditional on green CI at the
documentation head). **Not authorized: #14 merge.**

**Also 2026-08-22 (Blake Ford):** #14 merge authorized (after the external-review
threads were resolved and the validator change recorded). **Remaining:** nothing
for this PR; #10 stays on the consolidated ledger; Slice 5 (#53) integrates the
resulting `main` next (R1).

Legend — **Ranks:** the answer changes the sleep-fit ranking. **Consult:** it
feeds the specialist's Consultation Summary. **Suggests:** it changes accessory
/ adjustable-base suggestions or the Sleep Brief trial priorities. Every
Spanish line is provisional until native review (roadmap Invariant 12).

## 1. Quiz help lines — APPROVED AS GOVERNED EN COPY (Blake Ford, 2026-08-22; 9 of 10 changed; `body_type` unchanged; Spanish provisional)

| # | id | Previous EN → **Proposed EN** | Previous ES → **Proposed ES** | Ranks / Consult / Suggests | What the answer actually does, and why the line changed | Decision | Approved by / date | ES review |
|---|---|---|---|---|---|---|---|---|
| 1 | `trigger` | No pressure — this just helps your specialist focus on what matters to you. → **This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you.** | Sin presión — esto ayuda a tu especialista a enfocarse en lo que te importa. → **Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa.** | no / yes (context row) / no | Every option scores nothing; the answer only feeds the summary's context row. The old line was true but silent about that; "No pressure" already appears on Welcome. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 2 | `mattress_size` | So every mattress we show actually fits your space. → **We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers.** | Nos aseguraremos de que las recomendaciones se ajusten a tu espacio → **Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte.** | no / yes (opens the "who" row) / no | Size never filters the lineup and no availability check exists — the old line was an overclaim. The size reaches the Sleep Brief, the summary and the email label only. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 3 | `partner_sleep` | Who shares your bed shapes which features matter most. → **This shapes the questions that follow and what we suggest testing together.** | Esto determina qué características importan más → **Esto define las preguntas que siguen y lo que sugerimos probar juntos.** | partly (`family` → durability; `partner` → a tag inert here) / no / yes (Motion control trial priority) | "Matter most" overstated a ≤2-point tag; the live effects are the skip/hide flow and the trial priority. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 4 | `partner_disturbance` | Motion isolation is one of the first upgrades you'll feel. → **The more movement wakes you, the more it shapes your matches and what we suggest testing.** | El aislamiento de movimiento es una de las mayores mejoras en un colchón nuevo → **Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar.** | yes, graded (live: `hybrid` 3/2/0) / no / yes (priority rank) | Old line was a benefit promise. **Your preferred "…the more we favor motion isolation" is deferred:** that tag never matches this catalog (lowercase `motionisolation`; roadmap 3.1 🔒), so it would describe a rule with no effect today. Recorded for proposal once 3.1 ships — not implemented before. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 5 | `sleep_position` | Your sleep position is the biggest clue to the support you need. → **This helps us favor pressure relief, support, or a responsive feel.** | Piensa en cómo terminas naturalmente → **Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta.** | yes / yes (profile row) / yes (pillows, pressure priority) | A ≤5-point tag against the 50-point firmness term is not "the biggest clue"; the ES line was not a translation. **See §1a — "pressure relief" is under review.** | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 6 | `body_type` | *(unchanged)* This helps us account for cushioning, support, and durability. | *(unchanged)* | yes / no / yes (support priority) | True as shipped. | — | — | consolidated ledger |
| 7 | `temperature` | Sleeping hot or cold is an easy fix with the right materials. → **If you sleep hot, we favor cooling features in your matches.** | La regulación de temperatura es clave para un sueño profundo → **Si duermes con calor, priorizamos materiales refrescantes en tus opciones.** | yes (`hot` → cooling 3, hybrid 2; `opposite` → cooling 2, hybrid 1; `cold` → one point each to memory and plush) / yes / yes (cooling pillows, protectors) | "Easy fix" was a benefit claim; the ES claimed a sleep outcome. New line states the strongest live mechanism and is conditional, not exhaustive: it stays silent about "cold" and about "opposite" (which also favours cooling, at a lower weight). | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 8 | `firmness` | No wrong answer here, just slide to what feels best. → **No wrong answer here, just slide to the feel you prefer.** | *(unchanged)* Desliza a tu comodidad ideal | yes (dominant term) / yes (feel + value) / no | Only "best" changed — it is on the banned list even though harmless here. | ☑ **Approved** | Blake Ford / 2026-08-22 | consolidated ledger |
| 9 | `sleep_issues` | Tap anything you've noticed. Each one points us toward a fix. → **Tap anything you've noticed. These shape which features we favor and what we suggest testing.** | Toca las que apliquen → **Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar.** | yes for 6 of 8 (`stiff`, `none` rank nothing here) / yes (each issue's implication) / yes (back pain → base scoring + demo) | "A fix" is an outcome claim. "What we suggest testing" keeps the line true for the two options that rank nothing. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |
| 10 | `health_conditions` | Tap any that apply. A few of these change what we'd suggest. → **Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector.** | Toca las que apliquen → **Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón.** | yes for 3 of 7 (nerve pain, extra support, getting older) / yes (profile row, e.g. "test head-of-bed elevation on an adjustable base") / yes (snoring/reflux → base; allergies → protector goal) | Old line was true but incomplete. No condition is paired with a product as a treatment. | ☑ **Approved** | Blake Ford / 2026-08-22 | provisional |

**Affect ranking:** 3 (partly), 4, 5, 6, 7, 8, 9, 10. **Do not affect ranking:**
1, 2. **Consultation only:** 1. **Affect product-feature / base / accessory
suggestions or trial priorities:** 3, 4, 5, 6, 7, 9, 10. Engine evidence per
line: `docs/quiz-copy-engine-correspondence.md`.

### 1a. `sleep_position` — RESOLVED: option A, keep the gloss (Blake Ford, 2026-08-22)

The shipped line names "pressure relief". For a side sleeper the engine adds
points for `plush` and `soft` (cushioning) — a fair plain-language match — but
the literal `pressureRelief` tag it also carries never matches this catalog
(it is spelled `pressurerelief` there; roadmap item 3.1, locked). So the
sentence names a mechanism the engine has but does not run here. Options:

- **Keep the gloss** (plain language for cushioning) — ☑ **chosen, Blake Ford, 2026-08-22**
- **Conservative alternative** (names no mechanism): EN "This helps us compare
  support and comfort features for your usual sleep position." / ES
  (provisional) "Esto nos ayuda a comparar características de soporte y
  comodidad según tu postura habitual al dormir." — ☐
- **Stricter mechanism wording:** EN "This helps us favor a softer, cushioning
  feel, support, or a responsive feel." — ☐

Option A chosen: the shipped line stays as is; the alternatives were never
implemented and no rebuild or retest follows. The ES line stays provisional.

## 2. Privacy and data-use copy

### 2.1 Welcome data-use sentence — COPY APPROVED · REPRESENTATION SIGNED (Blake Ford, approver of record, 2026-08-22; preview mode only) · PENDING — NATIVE SPANISH

- **EN (shown now — `gasUrl` is blank):** During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them.
- **ES (provisional):** Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra.
- **Why it is true with a blank `gasUrl`:** the app's only two network calls are loading its own data files and a results POST that exists only when a Google Apps Script URL is configured; no beacon, socket, cookie, storage, image or frame carries answers; the salesperson roster is the only thing in `localStorage`; a confirmed Restart (and the final idle timeout) wipes the answers and every container that renders anything derived from them. Each of these is pinned by tests.
- **When it becomes false:** the moment a `gasUrl` is configured (then the live variant renders automatically instead), or if a new network sink or any persistence of answers is ever added (the suites fail).
- **How validation prevents incompatible activation:** `tools/validation.py` refuses a build whose retailer privacy prose carries preview-mode wording under any non-blank `gasUrl`, and refuses placeholder `gasUrl`s outright; the runtime selects the live variant from the same truth the send path uses.
- **Product wording:** ☑ approved as shipped, Blake Ford, 2026-08-22. **Approver of record:** Blake Ford (named 2026-08-22). **Business/legal representation:** ☑ signed as accurate for the current preview-mode deployment, Blake Ford, approver of record, 2026-08-22 — scope: the current preview-mode deployment only, `gasUrl` blank, answers staying on the tablet unless a future email-enabled configuration is separately approved; it does not cover a live-email configuration, does not approve Spanish, and does not authorize showroom use, deployment, readiness or merge. **Pending:** native Spanish ☐.

### 2.2 Review audience sentence — COPY APPROVED · REPRESENTATION SIGNED (Blake Ford, approver of record, 2026-08-22; preview mode only) · PENDING — NATIVE SPANISH

- **EN:** These answers create your matches and the summary your specialist will review with you.
- **ES (provisional):** Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo.
- **What the specialist summary shows** (on the same tablet): the finalists or the engine's recommended starting point; the 1–3 trial priorities with testing prose; three rows built from the answers — *context* (why they came in), *who* (mattress size, then a testing implication for each sleep issue ticked, e.g. back pain → "test lower-back support carefully"), *profile* (sleep-position implication, a testing implication for each health condition ticked, e.g. snoring → "test head-of-bed elevation on an adjustable base", the firmness feel and value, the temperature implication).
- **Derived health/sleep implications:** yes, included. **Raw answers reproduced:** no — but the implications map one-to-one to the answers, so a specialist can infer them; the sentence does not claim otherwise.
- **What the customer controls:** Edit Answers on Review before the summary exists; Restart at any time. There is no per-item control over what the summary shows (open decision: specialist-summary scope).
- **Wording:** ☑ approved as shipped, Blake Ford, 2026-08-22. **Business/legal representation:** ☑ signed as accurate for the current preview-mode deployment, Blake Ford, approver of record, 2026-08-22 (same scope as §2.1). **Pending:** native Spanish ☐ · the scope ruling ☐.

### 2.3 Email line — R4 recorded

- **Removed (template, both languages):** "Your info is never sold to third parties. Unsubscribe anytime." / "Tu información nunca se vende. Puedes cancelar la suscripción en cualquier momento."
- **R4 — APPROVED, PRODUCT DIRECTION:** removal approved as an integrity correction; never to be restored; no other absolute privacy promise is to be authored. Your configured line is the only policy sentence on the screen itself; the draft policy opens from its "Privacy & Terms" link (§2.4).
- **Configured replacement behaviour:** EN "We'll only use your email to send your results." / ES "Solo usaremos tu correo para enviarte tus resultados." (the Spanish was configured but ignored before; it now renders), plus "Preview mode: live email delivery isn't connected yet."
- **Current `gasUrl`:** blank — nothing is sent. **Live variant** of the Welcome sentence exists for an email-enabled deployment and is not shown.
- **Before any live activation:** a Code.gs audit is required — today it would log a sheet row and BCC a central inbox, which the live wording must disclose. **No live approval is granted.**

### 2.4 Privacy overlay — RESOLVED FOR THIS PR: OPTION C, PREVIEW-ONLY (Blake Ford, approver of record, 2026-08-22)

- **Customer-visible location:** the "Privacy & Terms" link on the email screen.
- **Current draft notice (visible today):** "Draft policy — pending Lacks Furniture approval before live use." / "Política preliminar — pendiente de aprobación de Lacks Furniture antes de su uso."
- **Current policy body (your configured draft, unchanged):** "DreamFinder collects your name, email, and optional phone number to deliver your mattress recommendations. Your information is only used for this purpose and is never sold. DreamFinder does not send your information to lenders. If you choose to open Lacks' financing or application pages, you continue on lacks.com — a separate site governed by its own terms and privacy policy." + "To access or remove your information, contact your local Lacks Furniture store."
- **Why a draft policy is incompatible with showroom readiness:** a customer reads a policy that says it is not yet approved; in preview mode nothing is collected, so "collects" describes a future mode; "never sold" is an absolute promise that only the business can make.
- **Decision:** ☐ Approve the final policy · ☐ Supply a revised policy · ☑ **Keep preview-only (no email, policy stays draft and visible)** · ☐ Another business/legal decision · Approver of record: **Blake Ford** / decision date **2026-08-22**
- **What option C means for this PR:** `gasUrl` stays blank; no live email or lead collection; the draft policy body and its visible notice stay exactly as they are; the policy is **not** claimed finalized or approved. The privacy-policy gate is resolved for this PR by this explicit preview-only decision, not by approving the draft.
- **Why the draft notice remains visible:** it is true — the policy has not been approved for live use, and in preview mode nothing is collected, so the notice is the honest state rather than a defect. Removing it would require a final approved policy (option A/B), which is a separate decision.
- **Any future live activation requires, separately:** a Code.gs audit (sheet row, BCC), final policy wording, business/legal approval, native-Spanish review, and deployment authorization. The existing fail-closed validation (`tools/validation.py` refuses preview wording under a non-blank `gasUrl` and refuses placeholder `gasUrl`s) is not to be removed or weakened.

### 2.5 Idle dialog — R5 recorded; final EN copy APPROVED as shipped (Blake Ford, 2026-08-22); PENDING — NATIVE SPANISH

- **Previous:** "Still comparing? Your session is paused to protect your privacy."
- **New EN (shipped on the branch):** "Session paused. Continue this session where you left off, or start a new customer to clear it."
- **Provisional ES:** "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla."
- **Reason for change:** the old line described an intent. The dialog actually obscures and inerts the screen while a countdown runs; the answers persist until it ends or "Start new customer" is pressed; nothing is hidden, encrypted, anonymized or transmitted. The new line says what the two controls do.
- **Deviation from your direction, documented:** you said "…or restart to clear this session." The dialog's own controls are **"Continue this session"** and **"Start new customer"** (the "Restart" utility control is inert while the dialog is open), so the sentence names those. Timing, backdrop, focus containment and touch behaviour are unchanged.
- **Status:** direction APPROVED; the final EN wording as shipped ☑ approved, Blake Ford, 2026-08-22; Spanish ☐ native review.

### 2.6 Spanish — NATIVE REVIEW STILL PENDING; WAIVED AS A PR #54 GATE (owner ruling, Blake Ford, 2026-08-22)

**Owner ruling 2026-08-22 (Blake Ford): native-Spanish review is waived as a PR #54 readiness/merge gate for this preview-only merge.** The four priority strings are **not** native-reviewed, approved, final or production-ready; Spanish stays provisional; native review remains required before any Spanish showroom authorization or any live email/lead-enabled deployment, and any such activation or claim reopens it. The eight changed ES quiz lines stay on the consolidated ledger. No Spanish copy, dictionary, configuration or generated file changed. The review notes below stand for whoever performs the review.

1. `privacy.data_use_preview` (§2.1) — a literal rendering of "stay on this tablet" could read as a storage promise; "Restart clears them" must not become "deletes everything" (the salesperson roster persists by design).
2. `privacy.data_use_live` (not shown while `gasUrl` is blank) — EN "Your answers are used on this tablet to create your matches and specialist summary. They are sent only if you choose to email your Sleep Brief. Restart clears them." / ES "Tus respuestas se usan en esta tableta para crear tus resultados y el resumen para tu especialista. Solo se envían si eliges recibir tu Resumen de Sueño por correo. Reiniciar las borra." — "sent only if you choose" must stay conditional; a looser verb would widen the promise.
3. `review.help` (§2.2) — "revisará contigo" must not become "decidirá por ti" or imply the specialist receives the answers elsewhere.
4. `safety.timeout_body` (§2.5) — must keep the two controls' own terminology ("Seguir en esta sesión", "Empezar con otro cliente") and promise nothing about privacy.
The eight changed quiz ES lines (§1) follow on the consolidated ledger.

## 3. Tier presentation — R3 recorded

- **Option A selected for this cycle:** Gold-first initial tab, within-tier ordering, tier-relative semantics, the relativity note enlarged to 15px in both languages. **Existing behaviour unchanged.**
- **Deferred (later owner/research decision):** B neutral initial tier choice; D another presentation control.
- **Not authorized:** C cross-tier highest-fit marker, any global maximum, tier removal/reordering, product reordering, scoring changes, a "best overall" calculation — Phase 3.3.
- This is not a permanent endorsement of Gold-first presentation. Wording guidance stands: never "price has no influence" without separating the sleep-fit *score* (ignores price, promotions, financing — test-pinned) from the tier *presentation* (grouped by price).

## 4. Heritage and founding year — R2 / R6 recorded

- **Welcome-only this cycle:** the restrained heritage line stays; no per-question rail; no anniversary count; no store counts, awards, testimonials, QR codes, community claims or anecdotes in the quiz; the research prototype is preserved separately; historical content may be tested later as an optional research condition.
- **Founding year:** "since 1935" is **not altered** and is treated as **provisional** pending corporate/archival confirmation (1935 is corroborated by two independent sources; the BBB profile reportedly lists 1924 — an unresolved discrepancy that may describe a predecessor or be inaccurate, and is **not** proof that 1935 is false). No anniversary arithmetic and no second founding-year exposure are added. (The configured `text.trustSignal` / `text_es.trustSignal` line — "…90 years of South Texas homes" — has **no consumer** in `index.html` and is not rendered; the implementation report records it as dead. It must not be wired up without a new ruling, since it would add exactly the anniversary count this ruling excludes.) This ruling is not historical verification. Pending: ☐ records confirm 1935 · ☐ the BBB entry explained.

## 5. Physical gates — PASS BY OWNER ATTESTATION (R7, R8; 2026-08-22)

All steps, expected results and the evidence convention are in
**`docs/trust-integrity-physical-gate-2026-08-21.md`**: mounted iPad Pro 11"
landscape (1194×748) and portrait (834×1108), EN and ES, partner and solo
paths; the VoiceOver sanity pass (required before #54 leaves draft — not a
reopening of the 2026-08-12 ruling that screen-reader *function* is out of
scope); a real Windows forced-colors pass (browser emulation does not satisfy
it). Blake instructed the lead to treat every check in the compact 21-check
packet as passed for `f748f59`; §15 of the physical packet records the served
build proof and the fact that no export, screenshots or exact device metadata
were supplied. **Known residues, recorded separately:** at 1194×748 in Spanish the
Welcome "Tu consulta crea" outcome row bottoms ~39px below the fold (the wider
ES button wraps the time estimate) — 1.6; the Results tier-tab row overflows
~19px at 320px (outside the device matrix) — 1.3; the Sleep System's own
benefit-flavoured reason lines — 1.4.
