# Quiz copy ↔ engine correspondence — the ten `helpText` lines and what they may claim

**Status:** governing record for the per-question help copy (Phase 1 cross-cutting
gate — Trust integrity and transparency, 2026-08-21). Pinned by
`tests/trust_integrity_check.mjs`, which fails if a canonical question has no
section here, if a cited score tag is not in that question's `scores`, if the
inert-tag set recorded below stops matching the shipped catalog, or if a banned
phrase reappears in any help line.
**Verification date:** 2026-08-21, against `origin/main` `4a76503` (engine) and
the copy shipped by this gate.
**Canonical source of the copy:** `incoming/dreamfinder_quiz.json` → workbook
Quiz tab (JSON envelope) → generated `data/quiz.json`. Never edit the generated
file.
**Approval / review status:** EN copy implemented under the owner's 2026-08-21
instruction (the preferred directions for `mattress_size`, `sleep_position`,
`temperature`, `trigger` and `health_conditions` were adopted; `partner_disturbance`
was adapted — see its section). The instruction gave directions; **the final
lines as shipped are what Blake's sign-off as governed quiz copy covers, and
that sign-off is still owed** (CLAUDE.md: per-retailer variation is copy-only,
and quiz copy still needs Blake). The owner packet for it is
`docs/trust-integrity-owner-review-2026-08-21.md`. **ES copy is provisional — NATIVE REVIEW REQUIRED** for every
changed line (roadmap Invariant 12).

## How the engine actually uses an answer (what the copy may describe)

The sleep-fit ranking is `calculateScores()` in `index.html`:

1. **Firmness** — the slider answer against each mattress's `firmnessScore`:
   `max(0, 50 − diff × 10)`, with an extra −20 when the difference is 4 or more.
   This is the largest single term and the only source of the firmness target.
2. **Feature tags** — each selected option's `scores` object adds points to
   every mattress whose `features` array contains that **exact** string (the
   match is case-sensitive; at most 5 points per tag per mattress). Nothing
   else is read: no size filter, no availability, no origin, no price, no
   promotion, no financing (`tests/scoring_isolation_check.mjs`).

Two facts constrain what the copy may claim:

- **Zero-scoring questions.** `trigger` and `mattress_size` carry `scores: {}`
  on every option. They never touch the ranking.
- **Inert tags in this deployment.** The shipped catalog's `features` vocabulary
  is `cooling, durability, firm, hybrid, medium, motionisolation, plush,
  pressurerelief, responsive, soft, support, zoned`. Eight quiz tags therefore
  never add a point here: `motionIsolation` and `pressureRelief` (case-fold
  mismatch — roadmap item 3.1 🔒) and `adjustable, comfort, durable,
  hypoallergenic, memory, quality` (absent from the catalog — item 3.2 🔒).
  Copy must not name an inert mechanism as if it ranked mattresses. Both items
  are locked scoring decisions for Blake; **this document is not a request to
  change them**, and the test that pins the inert set exists so that when either
  ships, every line below is re-audited.

  `Inert tags: adjustable, comfort, durable, hypoallergenic, memory, motionIsolation, pressureRelief, quality`

Other consumers the copy may describe (all consume answers, none re-rank):

- **Sleep Brief priorities** (`showProfileScreen()`): the 1–3 "what we will
  test together" items and their in-store testing prose.
- **Sleep System / accessory suggestions** (`scoreAccessoriesFromAnswers()`,
  `getAdjustabilityDemo()`): pillow, protector and adjustable-base suggestions,
  and the base demo position.
- **Consultation Summary** (`resolveConsultationSummary()` with
  `salesNotes.consultationImplications`): the three rows the specialist reads —
  context (trigger), who (size + sleep-issue implications), profile (position,
  health implications, firmness feel + value, temperature implication).
- **Display only**: Sleep Brief reflection, decorative Sleep Signature,
  review rows, email payload (`mattressSize` label only).

**What no help line may say:** a numeric weight; that size filters or
guarantees availability; a health outcome ("relieves", "stops snoring",
"treats", "cures"); "easy fix", "biggest", "best"; an origin, stock or
delivery claim; a promise about feel. Mechanism language must stay true if
the exact weights change while the mechanism remains.

**Code/data locations that trigger a re-audit of this document:**
`calculateScores()`; any `scores` change in `incoming/dreamfinder_quiz.json`;
`build-data.ps1`'s tag handling and `data/mattresses.csv`'s `quizTags`
(the inert set); `showProfileScreen()` priorities; `scoreAccessoriesFromAnswers()`
/ `getAdjustabilityDemo()`; `resolveConsultationSummary()` and
`salesNotes.consultationImplications`; the email payload builder.

---

## The ten questions

Column key — **Ranks:** affects the sleep-fit ranking (via which live tags).
**Firmness:** sets the firmness target. **Display:** display only.
**Summary:** feeds the specialist's Consultation Summary. **Accessories:** feeds
Sleep System / base suggestions.

### 1. trigger

- **Question:** What can we help you with today?
- **Previous EN:** No pressure — this just helps your specialist focus on what matters to you.
- **Previous ES:** Sin presión — esto ayuda a tu especialista a enfocarse en lo que te importa.
- **Current EN:** This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you.
- **Current ES (provisional):** Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa.
- **Ranks:** no — every option `scores: {}`. **Firmness:** no. **Display:** no. **Summary:** yes — the context row (`consultImplication('trigger', …)`). **Accessories:** no.
- **Cited tags:** none.
- **Mechanism the copy describes:** zero scoring; consultation context only.
- **Must not say:** anything implying the answer changes matches. ("No pressure" was dropped here because the Welcome screen already says it — net reassurance held flat.)
- **Verdict on the previous line:** true but did not state the non-scoring fact.

### 2. mattress_size

- **Question:** What size mattress are you looking for?
- **Previous EN:** So every mattress we show actually fits your space.
- **Previous ES:** Nos aseguraremos de que las recomendaciones se ajusten a tu espacio
- **Current EN:** We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers.
- **Current ES (provisional):** Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte.
- **Ranks:** no — every option `scores: {}`; the lineup is never filtered by size and no availability check exists anywhere. **Firmness:** no. **Display:** yes — Sleep Brief reflection (`sizeLabels`), decorative signature. **Summary:** yes — the "who" row opens with the size label. **Accessories:** no. Also the email payload's `mattressSize` label.
- **Cited tags:** none.
- **Mechanism the copy describes:** carried into the consultation; ranking comes from the other answers.
- **Must not say:** that displayed mattresses fit or are available in that size.
- **Verdict on the previous line:** OVERCLAIM (no filtering, no availability) in both languages.

### 3. partner_sleep

- **Question:** Who's sharing the bed with you?
- **Previous EN:** Who shares your bed shapes which features matter most.
- **Previous ES:** Esto determina qué características importan más
- **Current EN:** This shapes the questions that follow and what we suggest testing together.
- **Current ES (provisional):** Esto define las preguntas que siguen y lo que sugerimos probar juntos.
- **Ranks:** partially — `family` → `durability: 2` (live); `partner` → `motionIsolation: 2` (inert here); `solo` → nothing. **Firmness:** no. **Display:** yes — profile wording. **Summary:** no (not in the implications map). **Accessories:** no. **Flow:** `skipIf` on `partner_disturbance`, `hideIf` on `body_type/different` and `temperature/opposite`, the `body_type` copy variant; the "Motion control" Sleep Brief priority and the couple trial prompt.
- **Cited tags:** durability, motionIsolation.
- **Mechanism the copy describes:** question flow and testing guidance — both live for every answer.
- **Must not say:** "matter most" (the partner answer ranks nothing here).
- **Verdict on the previous line:** VAGUE / overstated ("matter most"); ES "determina" stronger still.

### 4. partner_disturbance

- **Question:** Does your partner's movement wake you up?
- **Previous EN:** Motion isolation is one of the first upgrades you'll feel.
- **Previous ES:** El aislamiento de movimiento es una de las mayores mejoras en un colchón nuevo
- **Current EN:** The more movement wakes you, the more it shapes your matches and what we suggest testing.
- **Current ES (provisional):** Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar.
- **Ranks:** yes, graded — `yes_often` → `motionIsolation: 4, hybrid: 3, memory: 2`; `sometimes` → `motionIsolation: 3, hybrid: 2`; `rarely` → `motionIsolation: 1`; `not_applicable` → nothing. Live effect here is `hybrid` 3 / 2 / 0 (motionIsolation and memory are inert). **Firmness:** no. **Display:** yes — profile naming. **Summary:** no. **Accessories:** no. **Priorities:** the "Motion control" Sleep Brief priority at a higher rank when this is `yes_often`/`sometimes`; the couple trial prompt.
- **Cited tags:** motionIsolation, hybrid, memory.
- **Mechanism the copy describes:** a graded effect on the ranking and on the testing guidance — true of the live tags and the priorities.
- **Owner note:** the owner's preferred line — "The more movement wakes you, the more we favor motion isolation." — is true of the engine **rule** but not of this deployment's **output** until item 3.1 (case-fold) ships, because the `motionIsolation` tag never matches the catalog's `motionisolation`. The adapted line above is code-true today. The preferred line may be proposed for adoption once 3.1
  ships — it is not pre-approved and is not to be implemented before then; like
  every help line it needs Blake's sign-off at that time.
- **Must not say:** a benefit promise ("you'll feel"), or that motion isolation is favored in the ranking while the tag is inert.
- **Verdict on the previous line:** BENEFIT CLAIM in both languages.

### 5. sleep_position

- **Question:** How do you usually sleep?
- **Previous EN:** Your sleep position is the biggest clue to the support you need.
- **Previous ES:** Piensa en cómo terminas naturalmente
- **Current EN:** This helps us favor pressure relief, support, or a responsive feel.
- **Current ES (provisional):** Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta.
- **Ranks:** yes — `side` → `plush: 2, pressureRelief: 2, soft: 1`; `back` → `support: 2, medium: 2, zoned: 1`; `stomach` → `firm: 2, support: 1`; `combo` / `no_idea` → `medium: 2, responsive: 2`. (`pressureRelief` is inert; the side sleeper's live tags are `plush`/`soft`, which is what "pressure relief" means in plain language, and the Sleep Brief carries a pressure-relief priority for side sleepers.) **Firmness:** no. **Display:** yes — profile wording, reflection, signature. **Summary:** yes — the profile row's position implication. **Accessories:** yes — position-matched pillows.
- **Cited tags:** plush, pressureRelief, soft, support, medium, zoned, firm, responsive.
- **Mechanism the copy describes:** which feel/feature family is favored — live.
- **Must not say:** "the biggest clue" (a ≤5-point tag against a 50-point firmness term).
- **Verdict on the previous line:** OVERCLAIM (EN); ES was not a translation and named no mechanism.

### 6. body_type

- **Question:** What weight range should this mattress support? (couples variant: "…for the sleeper who needs more support?")
- **Current EN (unchanged):** This helps us account for cushioning, support, and durability.
- **Couples variant EN/ES (unchanged, `copyVariants`):** If you fall into different ranges, choose “Different weight ranges.” / Si están en rangos diferentes, elige “Rangos de peso diferentes”.
- **Current ES (unchanged):** Esto nos ayuda a considerar la amortiguación, el soporte y la durabilidad.
- **Ranks:** yes — `petite` → `plush: 2, soft: 1`; `average` → `medium: 2`; `athletic` → `support: 2, medium: 1, responsive: 1`; `plus` → `firm: 2, support: 3, hybrid: 2, durability: 2`; `different` → `medium: 2, support: 1, motionIsolation: 2`. All three named mechanisms (cushioning = plush/soft, support, durability) are live. **Firmness:** no. **Display:** no. **Summary:** no. **Accessories:** no. **Priorities:** support priority raised for `plus`.
- **Cited tags:** plush, soft, medium, support, responsive, firm, hybrid, durability, motionIsolation.
- **Verdict:** TRUE — kept.

### 7. temperature

- **Question:** How do you sleep temperature-wise?
- **Previous EN:** Sleeping hot or cold is an easy fix with the right materials.
- **Previous ES:** La regulación de temperatura es clave para un sueño profundo
- **Current EN:** If you sleep hot, we favor cooling features in your matches.
- **Current ES (provisional):** Si duermes con calor, priorizamos materiales refrescantes en tus opciones.
- **Ranks:** yes — `hot` → `cooling: 3, hybrid: 2`; `opposite` → `cooling: 2, hybrid: 1`; `cold` → `memory: 1, plush: 1` (memory inert; plush 1 live); `comfortable` → nothing. The copy is deliberately silent about "cold", whose live effect is one point. **Firmness:** no. **Display:** yes — profile wording. **Summary:** yes — the profile row's temperature implication. **Accessories:** yes — cooling pillows/protectors, the protection goal.
- **Cited tags:** cooling, hybrid, memory, plush.
- **Mechanism the copy describes:** cooling features favored for hot sleepers — live.
- **Must not say:** "easy fix", or that materials solve a temperature problem; no health/"deep sleep" claim.
- **Verdict on the previous line:** BENEFIT CLAIM (EN); ES made a different, health-adjacent claim.

### 8. firmness

- **Question:** What firmness level do you prefer?
- **Previous EN:** No wrong answer here, just slide to what feels best.
- **Current EN:** No wrong answer here, just slide to the feel you prefer.
- **Current ES (unchanged):** Desliza a tu comodidad ideal
- **Ranks:** yes — the dominant term (0–50 by distance, −20 beyond 3 steps); the only firmness source. **Firmness:** yes. **Display:** yes — feel phrase, review row. **Summary:** yes — "feel n/10" in the profile row. **Accessories:** no.
- **Cited tags:** none (slider, no `scores`).
- **Verdict:** TRUE; "feels best" was the customer's own feel, not a product claim, but "best" is on the banned list, so the EN line now says "the feel you prefer" (ES already did). A mechanism line ("ranked closest to this setting first") was considered and rejected because feature points can legitimately reorder a one-step neighbour.

### 9. sleep_issues

- **Question:** Any issues with your current mattress?
- **Previous EN:** Tap anything you've noticed. Each one points us toward a fix.
- **Previous ES:** Toca las que apliquen
- **Current EN:** Tap anything you've noticed. These shape which features we favor and what we suggest testing.
- **Current ES (provisional):** Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar.
- **Ranks:** yes — `back_pain` → `support: 3, zoned: 2, firm: 1`; `hip_pain` → `pressureRelief: 3, plush: 2`; `hot` → `cooling: 3, hybrid: 2`; `tossing` → `comfort: 2, medium: 1`; `stiff` → `pressureRelief: 2, comfort: 2` (all inert); `sagging` → `durability: 2, quality: 2`; `too_soft` → `firm: 3, support: 2`; `none` → `comfort: 1, quality: 1, durable: 1` (all inert). **Firmness:** no. **Display:** yes — profile wording, signature. **Summary:** yes — each selected issue's implication in the "who" row. **Accessories:** yes — `back_pain` raises adjustable-base scoring and sets the base demo to zero-gravity.
- **Cited tags:** support, zoned, firm, pressureRelief, plush, cooling, hybrid, comfort, medium, durability, quality, durable.
- **Mechanism the copy describes:** features favored + testing guidance — true in aggregate; "what we suggest testing" keeps the line true for `stiff`/`none`, which rank nothing here.
- **Must not say:** "a fix" (outcome claim).
- **Verdict on the previous line:** mild OUTCOME CLAIM (EN); ES vague.

### 10. health_conditions

- **Question:** Anything else going on that affects your sleep?
- **Previous EN:** Tap any that apply. A few of these change what we'd suggest.
- **Previous ES:** Toca las que apliquen
- **Current EN:** Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector.
- **Current ES (provisional):** Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón.
- **Ranks:** yes for some — `nerve_pain` → `support: 3, firm: 2, zoned: 2`; `extra_support` → `support: 3, firm: 2, durable: 3`; `getting_older` → `support: 2, comfort: 2, pressureRelief: 1`; `allergies` → `hypoallergenic: 3` (inert); `snoring` / `reflux` → `adjustable: 3` (inert); `none` → nothing. **Firmness:** no. **Display:** yes — profile wording, signature. **Summary:** yes — each selected condition's implication in the profile row (e.g. head-of-bed elevation for snoring). **Accessories:** yes — `snoring`/`reflux` raise adjustable-base scoring and set the demo position (anti-snore / zero-gravity); `allergies` sets the protector goal.
- **Cited tags:** support, firm, zoned, durable, comfort, pressureRelief, hypoallergenic, adjustable.
- **Mechanism the copy describes:** some answers shape the ranking; some change what is suggested to try (base, protector) — both live, with no condition→product pairing stated as a treatment.
- **Must not say:** that a mattress or base treats snoring, reflux, pain or any condition; no health outcome.
- **Verdict on the previous line:** TRUE but incomplete (EN); ES dropped the second sentence.

---

## Copy inventory for the consolidated native-Spanish pass

Eight ES lines changed (questions 1, 2, 3, 4, 5, 7, 9, 10 above) — all provisional.
Two ES lines unchanged (6, 8); question 8 changed in EN only. The ES `copyVariants` help line on `body_type` is
unchanged.
