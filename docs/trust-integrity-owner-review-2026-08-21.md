# Trust integrity gate — owner review packet (2026-08-21, updated 2026-08-22)

**For:** Blake Ford (content owner / business approver). **Branch:**
`claude/phase1-trust-integrity` — **draft PR #54**
(https://github.com/beford782/LacksFurniture/pull/54). **Nothing is merged,
deployed or showroom-authorized**, and this packet does not change that.

## Status at 2026-08-22 — decision checklist

Your 2026-08-21 rulings R1–R8 are recorded below as **product direction**. They
are **not** legal, native-language, physical-device or showroom approval, and
they do not authorize merging either PR.

| Status | Items |
|---|---|
| **APPROVED — PRODUCT DIRECTION** | R1 merge order: #54 (this gate) before #53 (Slice 5) · R2 heritage Welcome-only this cycle · R3 tier presentation option A retained this cycle (Gold-first, within-tier, 15px relativity note) · R4 the hardcoded "never sold / unsubscribe" promise stays removed; no other absolute promise · R5 idle-dialog body replaced with behaviourally exact wording (direction) · R6 no anniversary arithmetic; "since 1935" stays, provisional · R7 VoiceOver sanity pass required before #54 leaves draft · R8 mounted-device gate stands |
| **PENDING — COPY APPROVAL** (yours) | the nine quiz help lines (§1) · the `sleep_position` gloss (§1a) · the final idle-dialog EN sentence as shipped (§2.5) · the Welcome and Review sentences as product wording (§2.1, §2.2) |
| **PENDING — LEGAL/BUSINESS** | the Welcome and Review sentences as representations (approver of record unnamed) · the privacy overlay policy and its draft notice (§2.4) · the email line in any live (email-enabled) mode (§2.3) · founding year 1935 by corporate/archival record (§4) |
| **PENDING — NATIVE SPANISH** | priority: `privacy.data_use_preview`, `privacy.data_use_live`, `review.help`, `safety.timeout_body` (§2.6) · the eight changed quiz ES lines (§1) |
| **PENDING — PHYSICAL DEVICE** | mounted iPad Pro 11" landscape and portrait, EN and ES · VoiceOver sanity pass · real Windows forced colors — all in `docs/trust-integrity-physical-gate-2026-08-21.md` |
| **DEFERRED — LATER PHASE** | tier options B (neutral initial tier) and D; the `partner_disturbance` preferred line (until 3.1 ships); heritage as an optional research condition; the Sleep System's own benefit-flavoured reason lines (1.4); the Results tier-tab overflow at 320px (1.3) |
| **NOT AUTHORIZED** | per-question heritage rail, counts, awards, testimonials, QR codes, anecdotes · cross-tier highest-fit marker / global maximum (3.3 🔒) · showroom use · deployment · merging #54 or #53 · marking #54 ready for review (gates above outstanding) · removing the draft-policy notice |

**What still needs you:** the ten ☐ decisions in §1/§1a, the wording sign-off in
§2.1/§2.2/§2.5, naming an approver of record (§2.1), and the policy decision
in §2.4. Then the physical packet.

Legend — **Ranks:** the answer changes the sleep-fit ranking. **Consult:** it
feeds the specialist's Consultation Summary. **Suggests:** it changes accessory
/ adjustable-base suggestions or the Sleep Brief trial priorities. Every
Spanish line is provisional until native review (roadmap Invariant 12).

## 1. Quiz help lines — PENDING — COPY APPROVAL (9 of 10 changed; `body_type` unchanged)

| # | id | Previous EN → **Proposed EN** | Previous ES → **Proposed ES** | Ranks / Consult / Suggests | What the answer actually does, and why the line changed | Decision | Approved by / date | ES review |
|---|---|---|---|---|---|---|---|---|
| 1 | `trigger` | No pressure — this just helps your specialist focus on what matters to you. → **This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you.** | Sin presión — esto ayuda a tu especialista a enfocarse en lo que te importa. → **Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa.** | no / yes (context row) / no | Every option scores nothing; the answer only feeds the summary's context row. The old line was true but silent about that; "No pressure" already appears on Welcome. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 2 | `mattress_size` | So every mattress we show actually fits your space. → **We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers.** | Nos aseguraremos de que las recomendaciones se ajusten a tu espacio → **Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte.** | no / yes (opens the "who" row) / no | Size never filters the lineup and no availability check exists — the old line was an overclaim. The size reaches the Sleep Brief, the summary and the email label only. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 3 | `partner_sleep` | Who shares your bed shapes which features matter most. → **This shapes the questions that follow and what we suggest testing together.** | Esto determina qué características importan más → **Esto define las preguntas que siguen y lo que sugerimos probar juntos.** | partly (`family` → durability; `partner` → a tag inert here) / no / yes (Motion control trial priority) | "Matter most" overstated a ≤2-point tag; the live effects are the skip/hide flow and the trial priority. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 4 | `partner_disturbance` | Motion isolation is one of the first upgrades you'll feel. → **The more movement wakes you, the more it shapes your matches and what we suggest testing.** | El aislamiento de movimiento es una de las mayores mejoras en un colchón nuevo → **Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar.** | yes, graded (live: `hybrid` 3/2/0) / no / yes (priority rank) | Old line was a benefit promise. **Your preferred "…the more we favor motion isolation" is deferred:** that tag never matches this catalog (lowercase `motionisolation`; roadmap 3.1 🔒), so it would describe a rule with no effect today. Recorded for proposal once 3.1 ships — not implemented before. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 5 | `sleep_position` | Your sleep position is the biggest clue to the support you need. → **This helps us favor pressure relief, support, or a responsive feel.** | Piensa en cómo terminas naturalmente → **Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta.** | yes / yes (profile row) / yes (pillows, pressure priority) | A ≤5-point tag against the 50-point firmness term is not "the biggest clue"; the ES line was not a translation. **See §1a — "pressure relief" is under review.** | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 6 | `body_type` | *(unchanged)* This helps us account for cushioning, support, and durability. | *(unchanged)* | yes / no / yes (support priority) | True as shipped. | — | — | consolidated ledger |
| 7 | `temperature` | Sleeping hot or cold is an easy fix with the right materials. → **If you sleep hot, we favor cooling features in your matches.** | La regulación de temperatura es clave para un sueño profundo → **Si duermes con calor, priorizamos materiales refrescantes en tus opciones.** | yes (`hot` → cooling 3, hybrid 2; `opposite` → cooling 2, hybrid 1; `cold` → one point each to memory and plush) / yes / yes (cooling pillows, protectors) | "Easy fix" was a benefit claim; the ES claimed a sleep outcome. New line states the strongest live mechanism and is conditional, not exhaustive: it stays silent about "cold" and about "opposite" (which also favours cooling, at a lower weight). | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 8 | `firmness` | No wrong answer here, just slide to what feels best. → **No wrong answer here, just slide to the feel you prefer.** | *(unchanged)* Desliza a tu comodidad ideal | yes (dominant term) / yes (feel + value) / no | Only "best" changed — it is on the banned list even though harmless here. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | consolidated ledger |
| 9 | `sleep_issues` | Tap anything you've noticed. Each one points us toward a fix. → **Tap anything you've noticed. These shape which features we favor and what we suggest testing.** | Toca las que apliquen → **Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar.** | yes for 6 of 8 (`stiff`, `none` rank nothing here) / yes (each issue's implication) / yes (back pain → base scoring + demo) | "A fix" is an outcome claim. "What we suggest testing" keeps the line true for the two options that rank nothing. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |
| 10 | `health_conditions` | Tap any that apply. A few of these change what we'd suggest. → **Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector.** | Toca las que apliquen → **Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón.** | yes for 3 of 7 (nerve pain, extra support, getting older) / yes (profile row, e.g. "test head-of-bed elevation on an adjustable base") / yes (snoring/reflux → base; allergies → protector goal) | Old line was true but incomplete. No condition is paired with a product as a treatment. | ☐ Approve ☐ Revise ☐ Defer | ____ / ____ | provisional |

**Affect ranking:** 3 (partly), 4, 5, 6, 7, 8, 9, 10. **Do not affect ranking:**
1, 2. **Consultation only:** 1. **Affect product-feature / base / accessory
suggestions or trial priorities:** 3, 4, 5, 6, 7, 9, 10. Engine evidence per
line: `docs/quiz-copy-engine-correspondence.md`.

### 1a. `sleep_position` — why "pressure relief" is under review

The shipped line names "pressure relief". For a side sleeper the engine adds
points for `plush` and `soft` (cushioning) — a fair plain-language match — but
the literal `pressureRelief` tag it also carries never matches this catalog
(it is spelled `pressurerelief` there; roadmap item 3.1, locked). So the
sentence names a mechanism the engine has but does not run here. Options:

- **Keep the gloss** (plain language for cushioning) — ☐
- **Conservative alternative** (names no mechanism): EN "This helps us compare
  support and comfort features for your usual sleep position." / ES
  (provisional) "Esto nos ayuda a comparar características de soporte y
  comodidad según tu postura habitual al dormir." — ☐
- **Stricter mechanism wording:** EN "This helps us favor a softer, cushioning
  feel, support, or a responsive feel." — ☐

Nothing changes in production until you choose; the alternatives are not
implemented.

## 2. Privacy and data-use copy

### 2.1 Welcome data-use sentence — PENDING — COPY (wording) · LEGAL/BUSINESS (representation) · NATIVE SPANISH

- **EN (shown now — `gasUrl` is blank):** During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them.
- **ES (provisional):** Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra.
- **Why it is true with a blank `gasUrl`:** the app's only two network calls are loading its own data files and a results POST that exists only when a Google Apps Script URL is configured; no beacon, socket, cookie, storage, image or frame carries answers; the salesperson roster is the only thing in `localStorage`; a confirmed Restart (and the final idle timeout) wipes the answers and every container that renders anything derived from them. Each of these is pinned by tests.
- **When it becomes false:** the moment a `gasUrl` is configured (then the live variant renders automatically instead), or if a new network sink or any persistence of answers is ever added (the suites fail).
- **How validation prevents incompatible activation:** `tools/validation.py` refuses a build whose retailer privacy prose carries preview-mode wording under any non-blank `gasUrl`, and refuses placeholder `gasUrl`s outright; the runtime selects the live variant from the same truth the send path uses.
- **Pending:** product wording (yours) ☐ · legal/business approval and the **approver of record** ____ ☐ · native Spanish ☐.

### 2.2 Review audience sentence — PENDING — COPY · LEGAL/BUSINESS · NATIVE SPANISH

- **EN:** These answers create your matches and the summary your specialist will review with you.
- **ES (provisional):** Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo.
- **What the specialist summary shows** (on the same tablet): the finalists or the engine's recommended starting point; the 1–3 trial priorities with testing prose; three rows built from the answers — *context* (why they came in), *who* (mattress size, then a testing implication for each sleep issue ticked, e.g. back pain → "test lower-back support carefully"), *profile* (sleep-position implication, a testing implication for each health condition ticked, e.g. snoring → "test head-of-bed elevation on an adjustable base", the firmness feel and value, the temperature implication).
- **Derived health/sleep implications:** yes, included. **Raw answers reproduced:** no — but the implications map one-to-one to the answers, so a specialist can infer them; the sentence does not claim otherwise.
- **What the customer controls:** Edit Answers on Review before the summary exists; Restart at any time. There is no per-item control over what the summary shows (open decision: specialist-summary scope).
- **Pending:** wording ☐ · legal/business ☐ · native Spanish ☐ · the scope ruling ☐.

### 2.3 Email line — R4 recorded

- **Removed (template, both languages):** "Your info is never sold to third parties. Unsubscribe anytime." / "Tu información nunca se vende. Puedes cancelar la suscripción en cualquier momento."
- **R4 — APPROVED, PRODUCT DIRECTION:** removal approved as an integrity correction; never to be restored; no other absolute privacy promise is to be authored. Your configured line is the only policy sentence on the screen itself; the draft policy opens from its "Privacy & Terms" link (§2.4).
- **Configured replacement behaviour:** EN "We'll only use your email to send your results." / ES "Solo usaremos tu correo para enviarte tus resultados." (the Spanish was configured but ignored before; it now renders), plus "Preview mode: live email delivery isn't connected yet."
- **Current `gasUrl`:** blank — nothing is sent. **Live variant** of the Welcome sentence exists for an email-enabled deployment and is not shown.
- **Before any live activation:** a Code.gs audit is required — today it would log a sheet row and BCC a central inbox, which the live wording must disclose. **No live approval is granted.**

### 2.4 Privacy overlay — PENDING — LEGAL/BUSINESS

- **Customer-visible location:** the "Privacy & Terms" link on the email screen.
- **Current draft notice (visible today):** "Draft policy — pending Lacks Furniture approval before live use." / "Política preliminar — pendiente de aprobación de Lacks Furniture antes de su uso."
- **Current policy body (your configured draft, unchanged):** "DreamFinder collects your name, email, and optional phone number to deliver your mattress recommendations. Your information is only used for this purpose and is never sold. DreamFinder does not send your information to lenders. If you choose to open Lacks' financing or application pages, you continue on lacks.com — a separate site governed by its own terms and privacy policy." + "To access or remove your information, contact your local Lacks Furniture store."
- **Why a draft policy is incompatible with showroom readiness:** a customer reads a policy that says it is not yet approved; in preview mode nothing is collected, so "collects" describes a future mode; "never sold" is an absolute promise that only the business can make.
- **Decision:** ☐ Approve the final policy (text: ____) · ☐ Supply a revised policy · ☐ Keep preview-only (no email, policy stays draft and visible) · ☐ Another business/legal decision: ____ · Approver of record: ____ / date ____

### 2.5 Idle dialog — R5 recorded (direction); final copy PENDING — COPY · NATIVE SPANISH

- **Previous:** "Still comparing? Your session is paused to protect your privacy."
- **New EN (shipped on the branch):** "Session paused. Continue this session where you left off, or start a new customer to clear it."
- **Provisional ES:** "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla."
- **Reason for change:** the old line described an intent. The dialog actually obscures and inerts the screen while a countdown runs; the answers persist until it ends or "Start new customer" is pressed; nothing is hidden, encrypted, anonymized or transmitted. The new line says what the two controls do.
- **Deviation from your direction, documented:** you said "…or restart to clear this session." The dialog's own controls are **"Continue this session"** and **"Start new customer"** (the "Restart" utility control is inert while the dialog is open), so the sentence names those. Timing, backdrop, focus containment and touch behaviour are unchanged.
- **Status:** direction APPROVED; the final EN wording as shipped ☐ (yours); Spanish ☐ native review.

### 2.6 Spanish — PENDING — NATIVE SPANISH (priority first)

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

## 5. Physical gates — PENDING — PHYSICAL DEVICE (R7, R8)

All steps, expected results and the evidence convention are in
**`docs/trust-integrity-physical-gate-2026-08-21.md`**: mounted iPad Pro 11"
landscape (1194×748) and portrait (834×1108), EN and ES, partner and solo
paths; the VoiceOver sanity pass (required before #54 leaves draft — not a
reopening of the 2026-08-12 ruling that screen-reader *function* is out of
scope); a real Windows forced-colors pass (browser emulation does not satisfy
it). **Known residues, recorded separately:** at 1194×748 in Spanish the
Welcome "Tu consulta crea" outcome row bottoms ~39px below the fold (the wider
ES button wraps the time estimate) — 1.6; the Results tier-tab row overflows
~19px at 320px (outside the device matrix) — 1.3; the Sleep System's own
benefit-flavoured reason lines — 1.4.
