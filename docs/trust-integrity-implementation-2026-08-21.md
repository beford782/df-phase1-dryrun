# Trust integrity and transparency — implementation report (2026-08-21)

**Status at 2026-08-23 (three separate states, per
`docs/deployment-workflow.md`):** the branch `claude/phase1-trust-integrity` is
**pushed** to `origin` and kept at `084f2f0`; PR #54 is **merged** to `main`
as merge commit `d4049cb` (2026-08-23 00:13Z); the Pages preview is
**deployed** at exactly `d4049cb`, serving `index.html` SHA-256
`b0981e11…412321` — the bytes physically tested at `f748f59` and
owner-reviewed at `9f27680` (§35). **Nothing is showroom-authorized:** preview
deployment only, `gasUrl` blank (no live email), Spanish provisional (native
review still owed, privacy sentences first). The device-matrix, VoiceOver and
real Windows forced-colors gates passed by Blake's 2026-08-22 owner attestation
at `f748f59` (§27); copy, legal/business, privacy and owner-live-review
decisions were answered by the owner and recorded in §28–§34; merge was authorized
2026-08-22. Earlier sections below are dated history of how the branch got
there and are not re-written; where they say "draft PR" or "nothing is
merged", read them as of their own date.
**Owner packet:** `docs/trust-integrity-owner-review-2026-08-21.md` (the nine
quiz lines, the privacy sentences, the tier-presentation options, the
founding-year decision, the physical checklists).
**Placement:** Phase 1 cross-cutting gate (roadmap block after item 1.7), after
Slice 4 Payment Choice and before Slice 5 Sleep Plan in the approved order.
**Discovered by:** the 2026-08-21 quiz trust investigation
(`docs/quiz-trust-investigation-2026-08-21.md`, companion agent reports in
`docs/quiz-trust-investigation-2026-08-21-agent-reports.md`).

## 1. Objective

Make the quiz tell the truth about itself: every per-question explanation
names a mechanism the engine actually runs; a question is never presented
off-screen; the customer is told once, plainly, what happens to their answers
and who sees the summary built from them; the one honest statement about tier
match strength is readable; and none of those sentences can drift away from the
code without a test going red. No conversion, upsell, brand-exposure or
"reassurance count" goal — the in-quiz heritage rail the prototype built was
not shipped.

## 2. Baseline commit

`4a765034b402ddfbfdb8bfcf3313cf2ee6c8e88b` — `origin/main` at branch creation
(PR #52 merge, 2026-08-20). Baseline suite at that commit (run by the
architecture audit before any edit): validator self-test 951/0, smoke 116/0,
converter self-test 16/0, golden `--strict` reproduced, lineage 10/0, daybreak
contract 87/0, QR 188/0, scoring isolation 247/0, Phase 1 output regression
72/0 (14 mutations caught), quiz presentation 176/176, contrast 90/0, session
safety 535/0, session async 283/0, results presentation 83/83, consultation
summary 94/0, email gating 96/0, payment choice 420/420; mutation sweep
301/301 caught.

## 3. Branch and worktree

- Worktree: `C:\Users\BlakeFord\Documents\GitWorktrees\LacksFurniture\trust-integrity`
  (sibling under the repo's worktree discipline directory), created clean
  from `origin/main` with `git worktree add -b claude/phase1-trust-integrity … origin/main`.
- Branch: `claude/phase1-trust-integrity`.
- The canonical checkout (`Documents\GitHub\LacksFurniture`, branch
  `claude/nocturne-slice5-sleep-plan` @ `6decbef`, Slice 5 in progress) and the
  prototype clone (`Documents\Lacks PROTOTYPE\LacksFurniture-slice4`, branch
  `claude/nocturne-slice4-payment-choice` @ `5436dea`, dirty, the trust-story
  prototype) were **not touched**: nothing reset, stashed, rebased, merged or
  cherry-picked. Only the two investigation documents were copied from the
  prototype (byte-identical, sha256 `2e83b415…` and `26c9d62e…`).
- Commits (in order):
  1. `3bfbe92` docs: place trust integrity gate in phase 1 roadmap
  2. `c979547` fix: restore quiz context after question navigation
  3. `d56284d` content: align quiz explanations with engine behavior
  4. `66f787d` fix: align privacy copy with deployment behavior
  5. `812a984` fix: make tier relativity disclosure legible
  6. `8d0bda6` fix: resolve the independent review findings (§14b)
  7. *(this report)* docs: trust integrity implementation report

## 4. Roadmap placement

`docs/rebuild-roadmap.md` (commit `3bfbe92`): a new unnumbered block
**"Phase 1 cross-cutting gate — Trust integrity and transparency 🔨"** after
item 1.7 and before the accessibility criteria; the approved-slice-order list
gains a dated parenthetical placing the gate after (4) and before (5) and
recording that Slice 5 had already begun on its own branch (not re-sequenced);
the header's "Next implementation item" paragraph is corrected with the
document's own correction idiom (Slice 5 🔨, not ⬜); the reconciliation
baseline moves to `4a76503` with the chain kept; items 1.2, 1.3 and 1.6 carry
cross-reference parentheticals; Invariant 12 records the privacy-sentence
exception; the open-decisions register gains eight rows (§19 items 1–8); the
sequence of record gains entry 8 and renumbers. Phase 0 is not reopened; 3.3 is
untouched.

## 5. Investigation findings accepted

- The scroll carry-over defect (D1) — reproduced on `main` before the fix.
- The `helpText` overclaims (`mattress_size`, `sleep_position`, `temperature`,
  `partner_disturbance`) and the Spanish lines that said something different.
- The template-hardcoded "never sold / unsubscribe anytime" promise (EN+ES).
- The unacknowledged specialist audience of the Consultation Summary.
- The 11px relativity note.
- Do not build the heritage rail; keep heritage on Welcome once.
- Mechanism language, never weights; the copy–engine correspondence table.
- A `gasUrl`-gated data-use sentence with a live-mode variant; a network-sink
  pin; native-Spanish review of privacy sentences first.

## 6. Findings modified or rejected

| Investigation said | What shipped, and why |
|---|---|
| Welcome sentence D1: "Your answers aren't saved or sent anywhere — … Restart clears them at any time." | The owner's preferred wording ("…stay on this tablet and are used to create your matches and specialist summary. Restart clears them.") — it names the specialist audience and avoids the absolute "anywhere". |
| `partner_disturbance` → "the more we favor motion isolation" (owner's preferred line) | Adapted: "the more it shapes your matches and what we suggest testing." The `motionIsolation` tag never matches this catalog's lowercase `motionisolation` (roadmap 3.1 🔒), so the preferred line is true of the rule but not of this deployment's output. Recorded in the correspondence doc for adoption once 3.1 ships. |
| `health_conditions` → "Snoring or reflux, for example, is why we'd suggest an adjustable base." | No condition→product pairing (reads as a treatment claim). Shipped: "Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector." |
| Line references in the investigation (e.g. `index.html:10744`) | Were prototype-tree lines; on `main` the promise lived at `:10773` and `:16402–16404`. The investigation docs are preserved verbatim as research records. |
| "text_es.emailPrivacy is not supplied" (code comment the investigation relied on) | False — it is configured; the renderer ignored it. Now honoured. |
| Data-use sentence location: the investigation's architecture section proposed dictionary copy; the white-label reading could also argue store-config | Dictionary, in two mode variants, selected at runtime from `gasUrl` (one source of truth, no new workbook column); the retailer's own policy prose stays in config and is gated at build. |
| Sleep System containers absent from the wipe list (data-flow audit) | Deferred at first (rebuilt before display; the table is also edited by Slice 5), then **added in the 2026-08-22 revalidation (`f6fac09`)** after the privacy auditor measured a previous customer's prose in the hidden DOM after a confirmed Restart (§18). This is what raised the Slice 5 conflict forecast from three files to five (§14d). |
| Idle-dialog wording ("paused to protect your privacy") | Left as shipped through the first two rounds (Gate 1B required copy, test-pinned; recorded as an owner decision), then **replaced on the owner's R5 ruling (2026-08-21, commit `444abe2`)** with behaviourally exact dictionary copy naming the dialog's real controls — §8. |

## 7. Exact implemented behaviour

**A. Question navigation (`c979547`).** `renderQuestion()` records the id it
last rendered (`_renderedQuestionId`). A render whose id differs from the
recorded one is a question change and calls `afterQuestionChange()`: refusal
gate (`screenTransitionOwnedElsewhere()`), active-screen check, then exactly
`showScreen()`'s scroll idiom (`window.scrollTo(0, 0)`; `screen.scrollTop = 0`),
then `#questionHeadline.focus({ preventScroll: true })` in the
`focusScreenDestination()` idiom. The `<h2>` carries `id="questionHeadline"
tabindex="-1"` in both render branches (no permanent tab stop) and joins the
consolidated two-ring `:focus-visible` block and its forced-colors fallback.
`showScreen()` nulls the record on every true screen transition, so the first
render after `startQuiz`, Review → Edit and Review → Back is owned by the
screen transition (container focus, as before) and not double-handled. Same-id
renders — an answer tap (Slice 3's keyboard restoration in `selectOption()`
is untouched) and a language switch (`restoreLanguageFocus()` owns it) — are
not changes. No timer, no frame, no live region, no announcement, no
touch-handler change, no auto-advance.

**B. Quiz copy (`d56284d`).** Nine help lines rewritten at the canonical source
and regenerated (workbook → `data/quiz.json`); §8 lists them. No `scores`,
option, id, order, type or skip rule changed.

**C. Privacy voice (`66f787d`).** `emailDeliveryLive()` — `gasUrl` configured
AND the active promotion scenario does not block submission — is the one mode
truth; it mirrors `sendResults()`'s own gate (proven equivalent over the
matrix) and now drives the email screen's preview note. `renderDataUseStatement()`
renders `privacy.data_use_live` or `privacy.data_use_preview` from the
dictionary into `<p id="landingDataUse">` on Welcome; a missing or blank variant
renders nothing and hides the element (never the key, never the other mode's
sentence). `renderReviewChrome()` reads `t('review.help')`. The email screen's
static promise span is removed (markup and renderer); the lead reads
`localizedConfigBlock('text').emailPrivacy || ''`. The privacy overlay's
pre-config placeholder is empty and hydrates to config or nothing (so do the
email lead and the policy-contact line; the draft-notice line keeps its
generic template fallback "Draft policy — pending retailer approval before
live use." — a status label, not a promise).
`tools/validation.py` rejects preview-mode signal phrases in retailer privacy
prose under a live `gasUrl` — "live" meaning the runtime's own notion, any
non-blank `gasUrl`; a non-blank placeholder `gasUrl` ("TODO",
"https://example.com/…") is itself a build error, because the kiosk would
treat it as live and POST to it.

**D. Review line (`66f787d`).** The Review help line is the audience statement
(§8). Plain paragraph, 15px, normal flow, not focusable, not live.

**E. Tier note (`812a984`).** `.noct-tier-descriptor .tier-relativity` 11px →
15px, line-height 1.45, normal tracking; wording, key, markup, ink token and
every tier semantic unchanged.

**F. Trust-story prototype.** Not brought over: no `quiz.trustStories`, no
validator contract, no renderer or CSS, no CLAUDE.md paragraph — pinned by
`tests/trust_integrity_check.mjs` section B. The prototype worktree is
preserved untouched as research evidence.

**G. Results explainability — documented, not built.** What exists today:
per-mattress `matchReasons` ("Why it matches you" in the drawer — only the
two firmness reasons, since every per-feature reason column is empty; 1.3's
reason gate); the Sleep Brief's "Made from your answers" hero and the 1–3 trial
priorities with in-store testing prose; the Sleep System's "Suggested first
because you mentioned …" lines; the relativity note; Edit Answers from Review
and the Sleep Brief's secondary action. What is hidden: there is no
findable statement at Results of what was compared and what was not used.
Recommended (next Phase 1 slice, not this one; verify each clause before
adoption): "Within each price tier, matches are ranked using your firmness
preference and the sleep features your answers pointed to. Promotions and
financing do not change the sleep-fit score." — true today: the ranking is
`calculateScores()` (firmness term + feature tags), financing/promotions are
pinned out by `tests/scoring_isolation_check.mjs`, and tiers are price
groupings ranked within (the "within each price tier" clause keeps scoring and
Gold-first presentation distinct).

## 8. Exact copy changes

Quiz help lines (EN → ES provisional; previous lines in
`docs/quiz-copy-engine-correspondence.md`):

| id | EN | ES (provisional) |
|---|---|---|
| trigger | This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you. | Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa. |
| mattress_size | We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers. | Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte. |
| partner_sleep | This shapes the questions that follow and what we suggest testing together. | Esto define las preguntas que siguen y lo que sugerimos probar juntos. |
| partner_disturbance | The more movement wakes you, the more it shapes your matches and what we suggest testing. | Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar. |
| sleep_position | This helps us favor pressure relief, support, or a responsive feel. | Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta. |
| body_type | *(unchanged)* | *(unchanged)* |
| temperature | If you sleep hot, we favor cooling features in your matches. | Si duermes con calor, priorizamos materiales refrescantes en tus opciones. |
| firmness | No wrong answer here, just slide to the feel you prefer. | *(unchanged)* Desliza a tu comodidad ideal |
| sleep_issues | Tap anything you've noticed. These shape which features we favor and what we suggest testing. | Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar. |
| health_conditions | Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector. | Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón. |

Dictionary (generic, both languages):

| key | EN | ES (provisional — NATIVE REVIEW REQUIRED FIRST) |
|---|---|---|
| privacy.data_use_preview *(shown: gasUrl blank)* | During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them. | Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra. |
| privacy.data_use_live *(not shown here)* | Your answers are used on this tablet to create your matches and specialist summary. They are sent only if you choose to email your Sleep Brief. Restart clears them. | Tus respuestas se usan en esta tableta para crear tus resultados y el resumen para tu especialista. Solo se envían si eliges recibir tu Resumen de Sueño por correo. Reiniciar las borra. |
| review.help | These answers create your matches and the summary your specialist will review with you. | Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo. |
| safety.timeout_body *(ruling R5, `444abe2`; replaces "Your session is paused to protect your privacy." / "Pausamos tu sesión para proteger tu privacidad.")* | Session paused. Continue this session where you left off, or start a new customer to clear it. | Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla. |

Removed: "Your info is never sold to third parties. Unsubscribe anytime." /
"Tu información nunca se vende. Puedes cancelar la suscripción en cualquier
momento." (email screen, template); "A quick check, then your specialist builds
your recommendations." / "Asegúrate de que todo esté bien, luego construiremos
tu combinación." (Review, inline); the overlay's placeholder "…never sold or
shared with third parties." (pre-config DOM). Unchanged: `text.emailPrivacy`
("We'll only use your email to send your results." / "Solo usaremos tu correo
para enviarte tus resultados." — now rendered in both languages), the preview
notes, the privacy overlay's configured body and draft notice, the relativity
line's wording.

## 9. Data-flow inventory (verified on `4a76503` and re-verified on `812a984`)

| State | Where | Lifetime | Who sees it | Sink |
|---|---|---|---|---|
| `answers` | in-memory module variable | until confirmed Restart, final idle timeout (5 min visible + 5 min obscured), or the email confirmation's "Start New Customer" | customer + salesperson on the shared screen; Review lists every answer as labels | none |
| derived: scores, match reasons, tiers, Sleep Brief priorities, Sleep Signature, profile subtitle, accessory scores, consultation summary rows, Sleep System guidance, saved picks, payment state | in-memory / DOM | same; every customer-ending path wipes the state and every container that renders answer-derived content (`SESSION_CONTENT_IDS`, `resetSessionState`), the four Sleep System containers included since the 2026-08-22 revalidation | same; the Consultation Summary shows the specialist implications derived from sleep-issue and health answers | none |
| name / email / phone | inputs + in-memory locals | same | same | with `gasUrl` blank: nothing is sent; a preview recap is shown. With `gasUrl` set: one POST to `gasUrl` on Save |
| salesperson name / roster | `localStorage` `dreamfinder.<store>.deviceRsa` / `.rsaList` (5 call sites) | device-persistent, outside the wipe by design | staff | none |
| analytics | in-memory `events[]` + a redacted `console.log` | session | nobody off-device | none; `EVENT_FIELDS` default-deny, answer values and contact values never logged (session async suite) |
| URL | — | — | — | only `?motion=1` is read; nothing is written |

Network sinks in `index.html`: exactly two `fetch()` call sites — and exactly
two references to the `fetch` identifier at all — the bounded same-origin
JSON loader (`boundedJson`) and `fetch(gasUrl, …)` inside
`if (gasUrl && !scenarioBlocksEmail)`. No external URL literal in executable
code other than the SVG namespace; no protocol-relative URL. Zero
`XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `navigator.share`,
`postMessage`, `window.open`, `Image(`, `.src =`, `location =`,
`document.location`, `window.name`, clipboard, Worker/SharedWorker,
`BroadcastChannel`, `RTCPeerConnection`, `importScripts`, `.submit(`,
history/location writes, iframes, cookies, `sessionStorage`, `indexedDB`,
Cache API, service worker, or external script/style URLs; zero attribute-set
`src/href/action/ping/srcset/formaction`, `requestSubmit`, `print(`,
`download`, dynamic `import(`, `cookieStore`, `WebTransport`, `Audio(`,
element-created `iframe/object/embed/base/video/audio/script/link/form`,
`formaction`, `http-equiv` or `ping=`; `publicAssetRoot` referenced once, in
the email payload only; `analytics.getSummary()` (raw answers) has no caller.
One `<form>`, `onsubmit` prevents default, no `action`. **This pin is a
tripwire on the named sink forms in executable text, not a proof against
every possible sink** — a string-split API name or a config-host URL built
at runtime would evade it (the privacy auditor's evasion matrix: 27 of 35
forms before this widening). The sentence's truth also rests on the session
suites' redaction pins and on review of every diff that touches `index.html`.
External financing links are bare allowlisted URLs; the QR encodes
`https://www.lacks.com/financing` with no query. Pinned by
`tests/trust_integrity_check.mjs` section C on comment-stripped code.

## 10. Privacy-copy truth table (this deployment: `gasUrl` blank)

| Statement | Where | Mechanism | Verdict | Falsified when |
|---|---|---|---|---|
| "During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them." | Welcome | dict `privacy.data_use_preview`, runtime-selected | TRUE | `gasUrl` set — then the live variant renders instead (build also rejects preview wording in retailer prose) |
| "Your answers are used on this tablet … They are sent only if you choose to email your Sleep Brief. Restart clears them." | Welcome, live mode only | dict `privacy.data_use_live` | TRUE in live mode (send only on Save; raw answers are not sent — only `mattressSize` as a label plus derived profile/priorities/summary, so "they are sent" overstates in the safe direction) — **live readiness caveat:** Code.gs's sheet row and default BCC must be disclosed before any `gasUrl` is set | an automatic send or a beacon is added (sink pin) |
| "These answers create your matches and the summary your specialist will review with you." | Review | dict `review.help` | TRUE (`calculateScores`; `resolveConsultationSummary`) | the Consultation Summary stops deriving from answers, or a surface other than the shared screen receives it |
| "We'll only use your email to send your results." | Email screen | config `text.emailPrivacy` / `text_es` | CONDITIONAL — vacuous in preview (nothing sent; the adjacent "Preview mode" note says so); in live mode needs the BCC/sheet disclosure | `gasUrl` set with default Code.gs |
| "Preview mode: live email delivery isn't connected yet." / "No email was sent…" | Email screen | inline, shown when `!emailDeliveryLive()` | TRUE | — |
| Privacy overlay body (retailer draft: "collects your name, email… never sold… does not send your information to lenders…") + "Draft policy — pending Lacks Furniture approval before live use." | Overlay from the email screen | config `text.privacyBody` / `privacyDraftNotice` | RETAILER DRAFT, labelled as such; "does not send … to lenders" TRUE; "collects" is a live-mode description | owner decision (§19) |
| "Session paused. Continue this session where you left off, or start a new customer to clear it." | Idle dialog | dict `safety.timeout_body` (replaced on ruling R5, `444abe2`; rendered through the real controller and pinned in EN and ES) | TRUE — interaction is suspended (backdrop + inert) while the grace countdown runs and is shown by the meter; "Continue this session" restores the exact prior layer and focus and grants a full window; "Start new customer" runs the authoritative wipe; it claims nothing about privacy, protection, hiding, encryption, anonymity or transmission | the dialog's control labels change without the sentence (the terminology pin fails), or the sentence is reworded to claim privacy (the banned-claim pin fails) |
| "This clears the current answers, mattress selections, and Sleep Plan." | Restart dialog | dict | TRUE | — |

No "anonymous", "never shared", "nothing is stored", "deleted immediately",
"cleared when you finish" or "unsubscribe" sentence remains anywhere the
customer can see (trust suite + smoke guard).

## 11. Copy–engine correspondence

`docs/quiz-copy-engine-correspondence.md` — one section per canonical question
(previous/current EN/ES, real score tags, consumers, what the copy may and may
not say, verdict), the engine facts (firmness term, exact-match feature tags,
the zero-scoring questions, the eight inert tags and why), re-audit triggers,
and approval status. Pinned by `tests/trust_integrity_check.mjs` section A.

## 12. Accessibility behaviour

- Question change: headline top ≥ 108px at 1194×748, 834×1108, 390×844,
  320×568 and 597×374 after every Next and Back on both paths;
  `activeElement` = `H2#questionHeadline`; keyboard Enter on Next draws the
  two-ring ring (`:focus-visible` true); touch/mouse Next draws none; Tab after
  the headline goes to the first option; Shift+Tab skips the headline (no tab
  stop). Reduced motion: identical (scroll is instant `auto`). Forced colors
  (Chromium `forced-colors: active` emulation only): CanvasText ring and text;
  the Windows forced-colors rendering is an owner-run gate (§15).
- Supporting copy: Welcome line 16px `#685C4D` on `#F4EFE6` (5.68:1); Review
  line 15px same pair; tier note 15px `#665D54` on `#F3EEE5` (5.58:1). All in
  normal flow, not focusable, no `aria-live`, no role. Welcome line inside the
  first viewport at 1194×748 in EN (564–612) and ES (608–656). No horizontal
  overflow at 320px on Welcome, question or Review, including under the WCAG
  1.4.12 text-spacing override. 200%-equivalent (597×374): all three lines
  render and wrap.
- Pre-existing, not this gate: the Results tier-tab row overflows by 19px at
  320px (Bronze tab); 320px is outside the recorded device matrix. Recorded for
  1.3. Also for 1.3: the tier note (15px) now visually outranks the 12px
  descriptor line above it ("Gold · premium materials"); raising the
  descriptor is outside this gate's authorization.
- Welcome at 1194×748 in Spanish: the "Tu consulta crea" outcome row bottoms
  39px below the fold (its items line ends 20px below, 715–768) because the
  wider ES CTA wraps the time estimate onto its own line (pre-existing); the
  data-use line is inside the fold in both languages. For the owner's iPad
  pass; the Welcome composition is 1.6's.
- The Sleep System's own reason strings ("Helps with the snoring you
  reported", "Targets the back pain you mentioned") are benefit-flavoured on a
  surface adjacent to help lines that forbid such claims — outside this gate
  (1.4); recorded for the owner.
- The `sleep_position` line's "pressure relief" is a plain-language gloss for
  the live `plush`/`soft` tags (the literal `pressureRelief` tag is inert here,
  3.1); the packet asks the owner to accept the gloss or take the stricter
  wording.
- VoiceOver: a one-time sanity pass on the mounted iPad is **required**
  before PR #54 leaves draft (owner ruling R7, 2026-08-21; no accepted-risk
  alternative); screen-reader functionality itself stays out of scope
  (2026-08-12 ruling). **Passed by owner attestation 2026-08-22 at `f748f59`
  (§27; physical packet §15) — no transcript supplied.** Steps and expected
  announcements: `docs/trust-integrity-physical-gate-2026-08-21.md`.

## 13. Generated-file lineage

`incoming/dreamfinder_quiz.json` (9 help lines) → `python incoming/build_lacks_workbook.py`
→ `incoming/Lacks_Store_Data.xlsx` (Quiz tab envelope verified by reading the
cell back: `{"quiz": …}`, no `trustStories`) → `python tools/validate_workbook.py … --warnings-as-errors`
→ `python tools/convert_store_data.py incoming/Lacks_Store_Data.xlsx --output-dir . --source-images incoming/images`
→ `data/quiz.json` (32/34 lines changed, all `helpText`). Every other generated
artifact (`data/store-config.json`, `data/accessories.json`,
`data/allowed-hosts.js`, `manifest.json`, `data/mattresses.json`) is
byte-identical after normalization. `demo/black-friday/` rebuilt with
`python tools/build_black_friday_demo.py` in every commit that touched
`index.html`; `tests/daybreak_contract_check.py` 87/0. Dictionaries are
hand-maintained (Invariant 5 exception). The Phase 1 output fixture
`tests/fixtures/phase1_output_baseline_daybreak_pr1.json` is untouched and its
pinned sha holds.

## 14. Test commands and results

See §14a (filled from the full local run) and the commit messages. New and
changed suites: `tests/trust_integrity_check.mjs` (new, registered in
`.github/workflows/ci.yml` after the quiz presentation step), quiz
presentation REPAIR 9 + five negative controls (failed first: 27 assertions red
on the unrepaired tree), contrast block, smoke privacy guard, validator
self-test cases, daybreak demo runtime extraction update, mutation manifest
301 → 326 (all new entries proven caught with the subset runner; two Slice 3
entries repaired after the headline's focus selector shifted their find text).

## 14a. Full local run (CI-equivalent)

Every step of `.github/workflows/ci.yml` run locally in order (Python
3.14.2 / Node 24.13 — CI pins 3.12 / 20.18.1) at `812a984`, then the suites
touched by the review fix-up re-run at `8d0bda6`:

| Step | Result |
|---|---|
| validation self-test | 974 passed, 0 failed *(961 at `812a984`)* |
| financing totality | 3395 / 0 |
| smoke | 118 / 0 |
| canonical / converter / reverify self-tests | 14 / 16 / 25, all 0 failed |
| workbook validation (`--warnings-as-errors`) | OK, no issues |
| strict golden bundle | reproduced |
| canonical lineage (sources → workbook → bundle) | 10 / 0 |
| QR payload / committed asset | 188 / 0 / OK |
| financing render / copy policy / taxonomy / URL / exact-promotions | 319, 215, 102, 53, 45 — all 0 failed |
| scoring isolation | 247 / 0 |
| payment choice | 420 / 420 |
| email gating | 96 / 0 |
| contrast | 98 / 0 |
| drawer lifecycle | 44 / 0 |
| session safety / session async / data-error recovery | 535, 283, 331 — all 0 failed |
| consultation priorities / email priorities / consultation summary | 219, 96, 94 — all 0 failed |
| motion flag / compare modal / construction reveal / compare entry | 202, 65, 102, 75 — all passed |
| Phase 1 output regression | 72 / 0 (14 mutations caught; fixture and sha unchanged) |
| claim retirement / integrity repairs | 53, 17 — 0 failed |
| results presentation / sleep brief presentation | 83 / 83, 134 / 134 |
| quiz presentation | 217 / 217 *(209 at `812a984`)* |
| **trust integrity (new)** | 111 / 111 *(106 at `812a984`)* |
| daybreak demo runtime / contract / server | 55, 87, 23 — 0 failed |
| mutation sweep | 326 / 326 caught at `812a984`; 331 entries at `8d0bda6`, every trust-gate entry re-proven caught with the subset runner (full re-run pending in §14c) |
| `git diff --check 4a76503..HEAD` | clean |
| protected artifacts byte-identical after the suites; operating state unchanged (gasUrl blank, exactPromotionsEnabled false, discount disabled, promotions inert) | ok |

## 14b. Independent review findings and resolutions (at `812a984`)

Three read-only reviewers re-audited the branch. **No blocker on the branch
itself.** Resolutions shipped in `8d0bda6`:

| Reviewer | Finding | Resolution |
|---|---|---|
| A (privacy) | The validator keyed its prose gate on its placeholder heuristic; the runtime treats any non-blank `gasUrl` as live, so a sentinel `gasUrl` built green with preview wording while the kiosk would speak live copy and POST to the sentinel | Gate keyed on any non-blank `gasUrl`; a non-blank placeholder is a build error; 13 self-test cases |
| A | The sink pin passed 9 plausible sink forms (spaced `fetch (`, `window['fetch']`, pixel `img.src`, bare `location =`, clipboard, `window.name`, bracket `localStorage`, protocol-relative links) | Pin widened (§9); pixel-beacon and spaced-call sweep entries |
| A | `PREVIEW_MODE_SIGNALS` missed the project's own proposed preview sentences; bare "never sent" would mis-reject lender wording | List widened to every proposed sentence; "never sent" narrowed |
| A | The privacy overlay's retailer draft body still describes live-mode collection under a blank `gasUrl` | Retailer-authored draft under its draft notice — owner decision (§19), not code |
| A | `privacy-policy-contact` kept a template fallback | Config-or-nothing like its siblings |
| B (navigation/copy) | REPAIR 9 could not see a tracker frozen at the first question (ad-hoc mutant survived) | Walkers count from before the tap; answer-tap-after-Next (touch + keyboard), gate-release, inactive-screen and `isFocusRestorable` cases; negative control; three sweep entries |
| B | Welcome outcome row pushed below the 1194×748 fold in Spanish (items 727–780) | Margins tightened to 10/18 and max-width 720 → 760px (items now 715–768: a 20px residue from the pre-existing ES CTA wrap) — recorded for the owner's iPad pass; the data-use line itself is inside the fold in both languages |
| B | Four provisional ES help lines read awkwardly ("características frescas", "sensación más reactiva", "Llevamos el tamaño", "Marca" vs "Toca") | Reworded at the canonical source; still provisional |
| B | Correspondence doc misquoted the `body_type` copy-variant line; variant lines were not pinned | Fixed and pinned |
| B | Two test labels stronger than their assertions | Relabelled / folded |
| B | Tier note (15px) now outranks the 12px tier descriptor visually | Left as is — the descriptor is outside this gate's authorization; recorded for 1.3 |
| C (architecture) | `tests/sleep_brief_presentation_check.mjs` captured the focus block through a fixed 700-char window the new selector overflowed: a vacuous pass here, red on the first merge with Slice 5 | Brace-anchored regex; the match is the first block |
| C | Roadmap header enumerated seven register rows of eight; the 🔒 row did not say what locks it; the report was referenced before it existed | Fixed; this report committed |
| C | CLAUDE.md should record where mode-aware data-use copy lives | One bullet added to the bilingual architecture section |
| C | Merge with Slice 5 (`6decbef`): three trivial both-added conflicts (`data/dict-en.json`, `data/dict-es.json`, `tests/mutation_sweep.mjs` observer constants), everything else auto-merges; the merged tree was exercised green apart from the Sleep Brief window (now fixed) | Recorded at `8d0bda6`/`ac95a7b`. **Superseded:** `f6fac09` added the four Sleep System ids to `SESSION_CONTENT_IDS`, which Slice 5 also extends, so the forecast is now five files (§14d); the integrating side rebuilds the demo bundle rather than resolving it by hand |

Reviewer NOTES left as recorded: the hidden Sleep System containers (§18);
`text.privacyBody` still says "never sold" (retailer draft, register); the
orphaned `review.category/title/looks_good` keys (pre-existing); the
hand-kept signal lists are coupled by a test, so a future rewrite of the
preview sentence must update both; `heading.focus({preventScroll:true})`
from a `touchend` handler was verified in Chromium only — it is the idiom
`focusScreenDestination()` already uses, but this branch has not been
observed on the device.

## 14c. Runs at the reviewed heads

- `ac95a7b` (report commit): GitHub CI workflow_dispatch run **32539492057 —
  success** on the pinned toolchain (Python 3.12 / Node 20.18.1), every step
  including `tests/mutation_sweep.mjs` (331/331 caught). Local CI-equivalent
  run at the same head: all 45 non-sweep steps green; local sweep 331/331.
- Post-integration-review head (§23): see §23 for the run at the final head.

## 14d. Second-round revalidation (2026-08-22) and Slice 5 status

**Slice 5 status — STATE B, unmerged.** `origin/main` is still `4a76503`; Slice
5 is open **draft PR #53** on `claude/nocturne-slice5-sleep-plan` @ `6decbef`,
untouched. No integration merge was performed (there is nothing new on `main`
to integrate); the unmerged Slice 5 branch was NOT merged or cherry-picked.
Conflict forecast, re-verified read-only with `git merge-tree --write-tree`:

| File | Git conflict type | Slice 5 change | Trust change | Expected merged result | Why both intents survive | Proof |
|---|---|---|---|---|---|---|
| `data/dict-en.json` (and `dict-es.json`) | content, one both-added hunk inside the `safety.*` group | strips the blank separator line between key groups; appends ~27 `plan.*` keys at the end | adds `privacy.data_use_preview` / `_live` after `safety.timeout_final_warning`; changes the values of `review.help` and `safety.timeout_body` | keep both: trust's keys stay in the group; Slice 5's blank-line removal and appended keys stay | disjoint keys; the two value changes are trust-only | `session_safety_check` key-set parity and exact-copy pins; `trust_integrity_check` C2; `sleep_plan_check` on the merged tree |
| `index.html` | content, one both-added hunk at the tail of `SESSION_CONTENT_IDS` (since `f6fac09`) | appends five `sleepPlan*` ids | appends the four `sleepSystem*` ids (with a comment) | keep both id blocks (either order; a trailing comma on the first) | disjoint ids; both sides' wipe-matrix tests require their own ids; the trust sweep entry anchors on the ids, not their position (`c65a437`) | `session_safety_check` wipe matrix (both required lists); `sleep_plan_check`; `trust_integrity_check` C |
| `demo/black-friday/index.html` | content, the same hunk (derived file) | same | same | **do not hand-resolve — regenerate** with `python tools/build_black_friday_demo.py` after `index.html` is resolved | the contract check compares against a fresh rebuild | `tests/daybreak_contract_check.py` |
| `tests/mutation_sweep.mjs` | content, one both-added hunk after `PAY_VALIDATOR` | adds `PLAN`, `PLAN_WITH_SESSION`, … observer constants | adds `TRUST`, `TRUST_CONTRAST` | keep both constant blocks | disjoint identifiers; trust entries were inserted mid-manifest, Slice 5's appended | merged manifest parses; full merged sweep (expected ≈ 338 + Slice 5's entries, 0 survived, 0 not-applied) |
| `.github/workflows/ci.yml`, `tests/session_safety_check.mjs`, `tests/sleep_brief_presentation_check.mjs` | auto-merge (both sides edit, no textual conflict) | a CI step after quiz presentation; Gate 2A rewrites; a forced-colors selector in the focus twin | a CI step in the same position; four required wipe ids; the brace-anchored focus-block regex | both sides land | adjacent additions; the regex repair is what keeps the Sleep Brief suite green once Slice 5's selector also lands | the combined suite run the integrating side owes |

**Merge order — owner ruling R1 (2026-08-21):** PR #54 (this gate) is the
intended next merge candidate and merges before PR #53. PR #54 stays
independent of unmerged Slice 5 code. After #54 eventually merges, #53 must
update from `main`, re-run the forecast against the actual `main` (the table
above is a forecast at `12ad950` × `6decbef`, re-run unchanged at `85c34b9` ×
`6decbef` on 2026-08-22 — five files carrying three both-added regions: the
`safety.*` dictionary group in both dictionaries, the `SESSION_CONTENT_IDS`
tail in `index.html` and its derived demo index, and the observer constants in
`tests/mutation_sweep.mjs` — not a promise), resolve the
both-added conflicts semantically preserving both features, rebuild the demo
bundle with the canonical tool, and re-run the complete suite on the combined
tree. **#53's current CI is not post-#54 integration proof, and this
documentation authorizes neither merge.**

**Roadmap placement decision:** the block stays after item 1.7 (its position is
topical, not temporal — the 1.x items have never encoded schedule), and the
sequence is now stated identically at the header, the slice-order list, the
gate block, item 1.7 and the sequence of record: Slice 4 → this gate → Slice 5
→ Slice 6, with Slice 5's concurrent development recorded as history.

## 15. Device-matrix status — physical gates passed by owner attestation

Browser (Chromium, Playwright, DPR 1) at the recorded matrix sizes and beyond,
EN and ES, partner and solo paths — §12. **Blake's 2026-08-22 attestation at
`f748f59` records PASS for the compact packet's mounted-iPad matrix, partner
and solo paths, VoiceOver sanity pass and real Windows Aquatic/Desert
forced-colors checks.** The owner supplied no checklist export, screenshots,
spoken transcript or exact device-version metadata; that evidence limitation
and the byte-verified dry-run mirror are recorded in the physical packet §15.

## 16. Screenshots / scratch evidence

Session scratchpad (ephemeral, not committed):
`…\scratchpad\welcome_1194x748_{en,es}.png`, `welcome_390x844_{en,es}.png`,
`question_mattress_size_en.png`, `question_temperature_es.png`,
`after_fix_1194x748_firmness_next.png`, `after_fix_1194x748_sleep_issues_next.png`,
`keyboard_headline_focus.png`, `review_1194x748_{en,es}.png`,
`review_390x844_{en,es}.png`, `email_1194x748_{en,es}.png`,
`results_1194x748_{en,es}.png`, `results_320x568_{en,es}.png`,
`forced_welcome.png`, `forced_question_size.png`, `textspacing_welcome_320.png`,
`textspacing_review_320.png`, `zoom200_review.png`; measurement JSON
`verify_nav_results.json`, `verify_privacy_results.json`,
`verify_tier_results.json`, `verify_emulations.json`; the pre-fix defect
reproduction `shot_1194x748_partner_firmness_next.png` and
`probe_nav_results.json` (Agent B, on `4a76503`).

## 17. Scoring-output proof

`node tests/phase1_output_regression_check.mjs` → 72/0 with the committed
fixture and pinned sha unchanged across all five commits;
`node tests/scoring_isolation_check.mjs` → 247/0; `git diff 4a76503..812a984 -- data/quiz.json`
touches only `helpText` values (no `scores`, ids, order, types, `skipIf`,
`hideIf`). The engine reads none of the changed fields.

## 18. Deferred work

- *(Resolved in the 2026-08-22 revalidation — no longer deferred.)* The four
  Sleep System containers (`#sleepSystemMain/Guidance/Rail/PlanList`) joined
  `SESSION_CONTENT_IDS` after the privacy auditor measured a previous
  customer's "Targets the back pain you mentioned" still in the hidden DOM
  after a confirmed Restart. Each is rebuilt by its renderer before display;
  the wipe matrix (`session_safety_check`) now seeds and clears all four.
- Live-mode readiness: before any `gasUrl` is set, disclose or disable
  Code.gs's sheet row and default BCC, resolve `privacyDraftNotice`, and
  author the email-enabled wording (register).
- `emailPreviewNote` / "No email was sent" strings are inline EN/ES literals
  (true; a later dictionary move).
- Dead `text.trustSignal` ("90 years") has no consumer; retire or govern.
- `text.disclaimerBody` mentions "match percentages" — none render on screen.
- *(Resolved in the re-review round — no longer deferred.)* The drawer's
  answer-derived text (`#drawerShortlistFit`, `#drawerSystemPromptTitle`,
  `#drawerSystemPromptReason`) joined `SESSION_TEXT_IDS` after the privacy
  re-review found it outside the wipe, the same class as the Sleep System
  residue; overwritten before the drawer can open again, now also cleared.
- Results method note + one modest limitation (§7 G) — next Phase 1 slice.
- Results tier-tab row overflow at 320px (pre-existing) — 1.3.
- Optional moderated research condition for heritage (register).

## 19. Owner decisions — ruled 2026-08-21 (product direction) and still open

**Ruled (product direction only — not legal, native-language, device or
showroom approval, and not authorization to merge):** R1 merge order (#54
before #53); R2 heritage Welcome-only this cycle (no rail, counts, awards,
testimonials, QR, anecdotes; prototype preserved; a later optional research
condition stays possible); R3 tier presentation option A retained this cycle
(Gold-first, within-tier, 15px note; B/C/D deferred; 3.3 untouched; not a
permanent endorsement); R4 the hardcoded email promise stays removed and no
other absolute promise is authored; R5 the idle dialog body replaced with
behaviourally exact dictionary copy (`444abe2`); R6 "since 1935" provisional,
BBB 1924 unresolved, no arithmetic; R7 a VoiceOver sanity pass is required
before #54 leaves draft; R8 the mounted-device gate stands.

**Still open (recorded in the roadmap register):**

1. **Tier presentation (later cycle):** a neutral initial tier choice or
   another presentation control (B/D) — deferred; a cross-tier marker (C) is
   3.3 and not authorized.
2. **Heritage (later):** whether historical content is tested as an optional
   research condition.
3. **Founding year:** corporate/archival confirmation of 1935 and an
   explanation of the BBB "1924" entry (no copy changes meanwhile).
4. **Privacy approval:** approver of record **named 2026-08-22: Blake
   Ford**, who the same day **signed the Welcome and Review representations
   for the preview-mode deployment (#6)** and chose **option C, preview-only
   for this merge (#7)** — draft notice retained, policy not finalized (§29).
   Still open: the native-Spanish reviewer for the data-use sentences; and,
   for any future email-enabled configuration, the Code.gs audit, final
   policy wording, business/legal approval and deployment authorization.
5. **Specialist audience:** exact scope of the Consultation Summary; whether
   the customer may control what appears; whether health-derived implications
   remain.
6. **Measurement:** moderated current-vs-process-transparency sessions;
   whether heritage is retained as a third condition; any aggregate local
   store (must record no answers and no identity).
7. **VoiceOver:** the required sanity pass itself (a physical-device gate,
   not a decision) — recorded in the physical packet when run.
8. **Idle-dialog wording:** ~~copy sign-off on the final EN sentence~~
   **approved as shipped, Blake Ford, 2026-08-22**; native review of the
   Spanish still open.
9. **Quiz copy sign-off** as governed quiz copy (CLAUDE.md) — **the nine
   EN lines in §8 approved as proposed and the `sleep_position` gloss kept
   (option A), Blake Ford, 2026-08-22**; the Welcome and Review sentences
   approved as product wording the same day. Still open: the
   `partner_disturbance` preferred line once 3.1 ships; every ES line
   (native review).

## 20. Native-Spanish review debt

**Owner ruling 2026-08-22 (Blake Ford): native-Spanish review is waived as a PR #54 readiness/merge gate for this preview-only merge.** The four priority strings are **not** native-reviewed, approved, final or production-ready; Spanish stays provisional; native review remains required before any Spanish showroom authorization or any live email/lead-enabled deployment, and any such activation or claim reopens it. The eight changed ES quiz lines stay on the consolidated ledger. No Spanish copy, dictionary, configuration or generated file changed.

Provisional ES strings shipped by this gate (all owed native review; the four
dictionary sentences were to go **first**, ahead of the consolidated pass —
that ordering stands for the review itself, it just no longer gates this PR):
`privacy.data_use_preview`, `privacy.data_use_live`, `review.help`,
`safety.timeout_body`; quiz
`helpText.es` for `trigger`, `mattress_size`, `partner_sleep`,
`partner_disturbance`, `sleep_position`, `temperature`, `sleep_issues`,
`health_conditions`. Unchanged ES lines (`body_type`, `firmness`) are already on
the consolidated ledger.

## 21. Showroom-authorization status

**Not authorized.** `docs/kiosk-device-hardening.md` remains BLOCKING. The
phase-wide physical device gate is complete for `f748f59` by owner attestation
and Blake's distinct live review passed at `9f27680` (§31); Spanish is provisional; no
privacy policy is claimed approved — the privacy gate for this PR is resolved
by the explicit preview-only decision (§29), with the draft notice retained.

## 23. Pull request, CI and final state (2026-08-22)

- **Draft PR #54** — https://github.com/beford782/LacksFurniture/pull/54 —
  `claude/phase1-trust-integrity` → `main`, **draft, not merged. Merge order
  ruled 2026-08-21 (this PR first; #53 integrates afterwards, §14d). Not to
  be marked ready until every gate in Exit 13 of the roadmap block is
  recorded: the nine-line copy approval (incl. the `sleep_position` gloss),
  the Welcome/Review copy approval, the privacy-policy decision, the priority
  native-Spanish review, and the owner's live review. The physical mounted-iPad,
  VoiceOver and real Windows forced-colors gates are now recorded complete in
  §27.**
- Revalidation commit `f6fac09` (audits 1–3 resolved; packet; roadmap
  sequence) followed by this record. Pushed to `origin`.
- GitHub CI: pull_request run 32542916416 at `12ad950` — **success** (trust
  121/121, sweep 334/334); workflow_dispatch 32542823153 at `f6fac09` —
  success; 32539492057 at `ac95a7b` — success (sweep 331/331). Run
  32542881301 (pull_request at `f6fac09`) was cancelled as superseded when
  `12ad950` was pushed. Later heads: §24.
- Baselines: original implementation baseline `4a76503` (origin/main at branch
  creation); post-integration `main` baseline **unchanged — `4a76503`** (no
  new `main` existed to integrate; Slice 5 is unmerged draft PR #53).
- **Nothing merged. Nothing deployed. No showroom authorization.** The priority
  native-Spanish review of the three privacy/audience sentences and the idle body, the privacy-policy approval
  (`privacyDraftNotice` is customer-visible today) and Blake's sign-off on the
  nine help lines all remain outstanding; the owner packet lists each. The
  three physical gates are complete by the §27 owner attestation.

## 24. Owner rulings round (2026-08-22) — what changed

- Commits: `444abe2` idle-dialog copy (R5); `c65a437` sweep anchor
  (position-independent wipe-inventory mutant); the docs commits that record
  R1–R8 in the roadmap, this report, the owner packet and the PR bodies; the
  physical verification packet `docs/trust-integrity-physical-gate-2026-08-21.md`.
- GitHub: PR #54's body rewritten to the 16-section structure with 16
  unchecked gates; one factual merge-order comment posted on PR #53; no labels
  applied (the repository has only GitHub's nine defaults, none of which
  expresses a dependency or a manual-testing requirement; no label was created).
- Exact idle copy now shipped: EN "Session paused. Continue this session where
  you left off, or start a new customer to clear it." / ES (provisional)
  "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro
  cliente para borrarla." The dialog's controls are "Continue this session" /
  "Start new customer" (ES "Seguir en esta sesión" / "Empezar con otro
  cliente"); the owner's direction said "restart", which is the utility-bar
  control and is inert while the dialog is open, so the sentence names the
  dialog's own confirm control instead (deviation documented).
- Conflict forecast re-run at `12ad950` × `6decbef`: five files (§14d);
  re-confirmed unchanged at `d75ac98`.
- GitHub CI: pull_request run 32544882828 at `d75ac98` — **success** (trust
  121/121, session safety 543/0, mutation sweep 338/338, 0 survived, 0
  not-applied). The re-review round that followed adds the drawer's three
  answer-derived text ids to the wipe inventory and corrects this report; its
  head and run are recorded in §25. Any later docs-only commit gets its own
  run; the "Final CI at the reviewed head" gate in PR #54 stays unchecked until
  the owner names the reviewed head.
- Dates: this round was worked on the evening of 2026-08-21 local time (-0500);
  GitHub records the pushes and runs as 2026-08-22 UTC. The documents use
  2026-08-21 for the owner's rulings and 2026-08-22 for the round's record.

## 25. Re-review round — what changed after `d75ac98`

- The drawer's three answer-derived text ids join the wipe inventory (and the
  session suite's required list); a trust assertion and a sweep entry pin it.
- This report's stale rows (the idle truth-table row, §8's copy table and its
  "unchanged" list, §20's priority list, the circular §23/§24 CI reference)
  were re-executed rather than patched by reference.
- The physical packet was corrected on the third re-review (packet reviewer,
  code read + Chromium probe of the focus claims only): four table rows had a
  sixth cell or an unescaped pipe (the pass criterion rendered in the Result
  column); twelve option labels did not match the kiosk (e.g. "Solo Sleeper",
  "With a Partner", "I Sleep Hot", "Snoring or Sleep Apnea", "Duermo Solo");
  Q6 on the partner path renders its copy variant, not the base help line;
  Edit mode returns to Review on the first Next; and four VoiceOver rows
  described behaviour the code does not produce — `restoreLanguageFocus()`
  re-focuses the element that had focus (the button is the fallback), the
  Sleep Signature motion gather is `aria-hidden` so no reveal status is spoken,
  the Restart control's accessible name is "Restart — start a new customer",
  and the dialog returns focus to whatever had it (on a touch kiosk, the last
  transition heading). All editorial; a faithful owner would otherwise have
  recorded spurious FAILs. Every table row in the three trust documents now
  has its header's cell count (checked by script).
- Heads: `25ee157` (the wipe change) and `24d8ff7` (this report and the
  packets). GitHub CI pull_request run 32545837035 at `24d8ff7` — **success**
  (trust 122/122, session safety 543/0, mutation sweep 339/339 including the
  drawer entry, caught by both owning suites). The commit that records this
  run is docs-only and gets its own run; the "Final CI at the reviewed head"
  gate in PR #54 stays unchecked until the owner names the reviewed head.
- GitHub CI pull_request run 32546014806 at `85c34b9` (the commit recording
  the run above) — **success**.

## 26. Final-review round (2026-08-22) — three read-only auditors at `85c34b9`

Re-run of the setup instruction against the pushed branch: the expected head
`12ad950` was seven commits behind, every task already landed, so the round
became an audit. Three independent read-only agents (owner-ruling/copy;
physical-gate/accessibility; GitHub/roadmap/merge-order), each finding
reproduced by the lead before acting.

- **Copy / rulings:** no MATERIAL finding. All eight rulings recorded as
  product direction only; nothing marked approved that the instruction leaves
  pending; every customer-visible sentence code-true at this head (help-line
  mechanism claims re-verified against `data/quiz.json` `scores` and the
  catalog tag set; the idle body matches the rendered controls in both
  languages and is pinned through the real renderer). Two MINOR packet
  clarifications applied: the `temperature` row now says the sentence is
  conditional (silent about `cold` and `opposite`), and §4 records that the
  configured `text.trustSignal` "90 years" line has no consumer.
- **Physical packet:** two MATERIAL spec gaps, both closed — the VoiceOver
  table had no "Actual (spoken)" column, and there was no place to record
  residual risks (new §14: observation → lead ruling → accepted by/date →
  retest row; PASS with unruled rows is PARTIAL). MINOR: IPAD-L-EN-07 quoted
  "Back pain / aches" (the option is "Back or Body Pain"); a hard-reload step
  in §3 Setup; a horizontal-scroll sweep and a "subordinate but legible"
  criterion on the portrait rows; WIN-FC-11 whole-flow "nothing essential
  disappeared" sweep in both themes; VO-EN-06 gains the double-dispatch
  fail-if (a double-tapped multi-select option reading unselected); the
  collapsed VO-ES / SOLO-ES rows state the one-Result-per-EN-step recording
  rule. Confirmed: no emulation anywhere stands in for physical evidence;
  every quoted label, dict string and focus claim matches `index.html`.
- **GitHub / roadmap:** no contradictory dependency language in the roadmap,
  this report, either PR body or the #53 comment; concurrency history
  preserved; neither PR merged (`mergedAt` null) or ready (`isDraft` true);
  `origin/main` still `4a76503`. Stale-by-one-docs-commit forecast anchors
  refreshed above (§14d) and in PR #54 §10. Labels: the repository has only
  GitHub's nine defaults, none of which represents a dependency or
  manual-testing state — **none applied, none created**. Milestones: none.
- Targeted suites re-run locally at `85c34b9` before editing: session safety
  543/0, session async 283/0, trust 122/122, quiz presentation 222/222,
  scoring isolation 247/0, phase 1 regression 72/0, contrast 98/0, smoke
  118/0, validator self-test 978/0, Daybreak contract 87/0; fixtures
  byte-identical to `main`; `git diff --check` clean. This round changes
  three Markdown files only; the full run at its head is recorded by CI on
  the PR.

## 27. Owner-attested physical pass (2026-08-22; `f748f59`)

- The retained public dry-run mirror served commit `22b9109`: the exact PR #54
  tree at `f748f59` plus only the compact `verify.html` packet. GitHub Pages
  reported the build complete. The live `index.html` matched the `f748f59` git
  blob byte-for-byte (SHA-256
  `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321`),
  and the live app reached Welcome with no domain-lock or data-error screen.
- Blake first reported **“all tests passed”**, then instructed the lead to
  assume every compact test passed without exchanging the Share Results
  export. The physical packet §15 therefore records PASS for all 21 compact
  checks: mounted iPad landscape/portrait EN/ES, partner/solo, idle and wipe,
  VoiceOver including the Spanish spot-check, and real Windows Aquatic/Desert
  forced colors.
- Evidence limitation: no checklist export, screenshots, spoken transcript,
  exact device/iPadOS/Windows/browser versions, location or evidence directory
  were supplied. The record says so; no evidence details were invented.
- This closes R7/R8's physical gates for the tested `f748f59` bytes. It does
  not approve copy, legal/business representations, the privacy policy, native
  Spanish, owner live review, showroom use, deployment, readiness or merge.
  Any later `index.html` change invokes the packet's retest rule.

## 22. Rollback strategy

Each commit is independently revertible with `git revert` (no commit depends
on a later one). Reverting `d56284d` requires re-running the canonical pipeline
(workbook → convert) because it changes the xlsx and `data/quiz.json` together;
reverting `c979547`, `66f787d` or `812a984` requires `python tools/build_black_friday_demo.py`
to keep the demo bundle byte-matched. `3bfbe92` is docs-only. Nothing was
pushed to `main`; no deployment occurred.

## 28. Owner copy approvals (2026-08-22)

Blake Ford approved, in writing to the lead: all nine rewritten EN help lines
as governed quiz copy; `sleep_position` option A (the shipped gloss stays);
the Welcome data-use sentence, the Review specialist-summary sentence and the
idle-dialog sentence as shipped English product wording; and named himself
the business/legal approver of record. English only — every Spanish string
remains provisional pending native review (§20). No bytes changed: the quiz
pipeline was not re-run, `data/quiz.json`, both dictionaries and `index.html`
are identical to `f748f59`, so the owner-attested physical pass (§27) carries
forward.

Not decided by this round and not inferred from it: the business/legal
sign-off of the Welcome and Review representations by the approver of record;
the privacy-policy and draft-notice decision (both decided later the same day
— §29); native Spanish; the owner live review; the reviewed-head designation;
ready-for-review and merge authorization. PR #54 stays draft.

## 29. Owner business/legal decisions (2026-08-22)

**#6 — signed.** Blake Ford, as the named business/legal approver of record,
signed the English Welcome sentence ("During this showroom session, your
answers stay on this tablet and are used to create your matches and
specialist summary. Restart clears them.") and the English Review sentence
("These answers create your matches and the summary your specialist will
review with you.") as accurate business representations for the **current
preview-mode deployment**: `gasUrl` blank; answers stay on the tablet unless a
future email-enabled configuration is separately approved. The signature does
not cover a live-email configuration, does not approve the Spanish, and does
not authorize showroom use, deployment, readiness or merge.

**#7 — option C, preview-only for this merge.** `gasUrl` stays blank; live
email and lead collection stay off; the draft privacy policy and its visible
notice ("Draft policy — pending Lacks Furniture approval before live use.")
stay as shipped; the policy is **not** claimed finalized. The privacy-policy
gate is resolved for this PR by that explicit decision — not by approving the
draft. Any future live activation requires, separately: a Code.gs audit,
final policy wording, business/legal approval, native-Spanish review and
deployment authorization. The fail-closed validation in `tools/validation.py`
is unchanged and is not to be weakened.

No bytes changed: `index.html`, both dictionaries, `data/store-config.json`,
`data/quiz.json` and the demo bundle are identical to `f748f59`, so the
owner-attested physical pass (§27) carries forward. Still open after this
round: native Spanish (the four priority strings were the PR gate until the
2026-08-22 waiver, §30; the eight quiz lines follow on the consolidated
ledger), the owner live review, the reviewed-head designation, and the
ready-for-review and merge authorizations. PR #54 stays draft.

## 30. Owner ruling — native-Spanish review waived as a PR #54 gate (2026-08-22)

Blake Ford directed that native-Spanish review be skipped for PR #54 and not
block this preview-only merge. Recorded narrowly:

- The PR #54 checklist gate for native review of `privacy.data_use_preview`,
  `privacy.data_use_live`, `review.help` and `safety.timeout_body` is resolved
  by **explicit owner waiver/deferment** — not by review. None of the four is
  native-reviewed, approved, final or production-ready; Spanish remains
  provisional in every record.
- The eight changed Spanish quiz help lines stay pending on the consolidated
  ledger (§20).
- Native review remains required before any Spanish showroom authorization
  or any live email/lead-enabled deployment; any future live activation, or
  any claim that Spanish is showroom-ready, reopens it.
- `gasUrl` stays blank; the preview-only decision (§29) and the visible draft
  policy notice remain in force.
- No Spanish copy, dictionary, application code, configuration, generated
  file, scoring or touch behaviour changed; application bytes are identical
  to `f748f59`, so the owner-attested physical pass (§27) carries forward.
- This ruling does not authorize marking ready, merging, deployment or
  showroom use. Gates still open: the owner live review, the reviewed-head /
  CI designation, and the explicit authorizations to mark ready and to merge.

## 31. Owner live review — passed (2026-08-22; `9f27680`)

Blake Ford walked the build on the retained dry-run mirror
(`https://beford782.github.io/df-phase1-dryrun/`) and reported it passed.
Immediately before the walk the lead re-verified the mirror's served
`index.html`, `data/store-config.json`, `data/quiz.json` and
`data/dict-es.json` byte-identical (SHA-256) to the branch blobs at `9f27680`,
whose application bytes are identical to the attested `f748f59`. The walk
covered the seven customer-visible changes (Welcome data-use sentence and
single heritage line; the help lines in place; question transitions incl.
Back from the tall questions and Edit from Review; the Review sentence; the
15px tier-relativity note with ordering unchanged; the email screen without
the retired promise and with the draft-policy overlay notice retained by
option C; the idle dialog wording against its two controls) and the critical
path in Spanish, viewed as provisional — not a translation approval.

This closes the live-review gate only. The reviewed-head designation and
the ready-for-review authorization followed the same day (§32); merge
authorization is still open. Commits after `9f27680` on this branch are
documentation only and do not change the reviewed bytes. Nothing merged or
deployed.

## 32. Reviewed application head designated; ready-for-review authorized (2026-08-22)

**Designation.** Blake Ford designated **`9f27680` as the owner-reviewed
application head** for PR #54: the owner live review (§31) was performed
against those application bytes; CI run 32593585017 at `9f27680` passed; the
application bytes are identical to the physically tested `f748f59` (§27);
later commits only record decisions and do not change the application.

Three heads, one set of application bytes: **physical-test head `f748f59`** (owner-attested device pass), **reviewed application head `9f27680`** (owner live review; CI run 32593585017 pass), and the **current PR/documentation head** (the latest docs-only commit recording these decisions). `index.html` and the `data/`, `demo/`, `tests/`, `tools/` and `incoming/` trees are byte-identical across all three. The proof at the time of
recording: `git diff --name-only 9f27680 HEAD` lists only
`docs/rebuild-roadmap.md`, `docs/trust-integrity-implementation-2026-08-21.md`
and `docs/trust-integrity-owner-review-2026-08-21.md`; `git diff --stat
f748f59 9f27680 -- index.html data/ demo/ tests/ tools/ incoming/` is empty;
the `index.html` blob (SHA-256 `b0981e11…412321`) and the five tree ids are
equal at `f748f59`, `9f27680` and the current head.

**Ready-for-review.** Blake Ford authorized marking PR #54 ready for review
once all state and SHA checks pass, this designation is recorded
consistently, the current documentation-only head has green CI, and the
checklist shows only the merge-authorization gate open. The lead performs the
draft → ready change only after the CI run at the documentation head that
carries this record is green.

**Not authorized:** merging PR #54. The merge gate stays unchecked; nothing
is merged, deployed or showroom-authorized; PR #53 is untouched; Spanish
stays provisional (native review waived as a gate only, §30); `gasUrl` stays
blank; the preview-only privacy decision (§29) and the visible draft-policy
notice remain in force.

## 33. External review at `f7a63f5` — two P2 threads, owner disposition option B (2026-08-22)

Marking the PR ready triggered the repository's automated Codex review, which
left two P2 threads on `tools/validation.py`. The pre-merge rule (no
unresolved review threads) stopped the merge; Blake Ford chose option B — fix
before merging — with the disposition below.

**Thread 1 (`live_at_runtime`, ~line 397) — preserved as intentional.** The
runtime's `emailDeliveryLive()` is `gasUrl && !activeScenario.disableEmailSubmission`;
the validator treats any non-blank `gasUrl` as live. Codex proposed deriving
the validator's notion from the scenario flag. Ruled no: a scenario is a
date-windowed runtime state, so the same configured bytes go live the day it
expires without another build — a config must be true in every state it can
reach, and a non-blank `gasUrl` is therefore *live-capable* for admission.
Change: the comment that wrongly claimed the runtime treats every non-blank
`gasUrl` as presently live is corrected and now explains the live-capable
rule; the code line `live_at_runtime = not _blank(gas)` is byte-identical.
Four self-tests pin it (live `gasUrl` + active `historical-demo` scenario
with `disableEmailSubmission: true` + preview wording → still rejected, EN and
ES; placeholder under a blocking scenario → still the placeholder error;
blank `gasUrl` under a blocking scenario → accepted). A sweep mutant that
makes the validator follow the scenario is caught by those tests (3 failures).

**Thread 2 (`PREVIEW_MODE_SIGNALS`, ~line 287) — fixed.** The bare
storage-negation phrases ("not stored", "never stored", "do not store",
"not saved", "no se guarda(n)", "no se almacena(n)", …) moved out of the
unconditional list into `STORAGE_NEGATION_SIGNALS`, matched by
`_preview_signal_hit()` only inside a sentence (split on `. ! ? ;` and line
breaks) that also names governed data (`GOVERNED_DATA_TERMS`: answers,
responses, quiz, results, session, email, phone, contact, your name,
your/personal/customer/contact information, your/personal/customer data, and
the Spanish equivalents — deliberately not generic "details", "information"
or "data" alone). Unconditional signals ("nothing is sent", "stays on this
tablet", "does not send or store", …) are unchanged. Self-tests: nine
governed-data storage claims still fail under a live `gasUrl` (EN and ES);
five unrelated truthful storage statements ("Payment card details are not
stored by this application.", "This kiosk does not store cookies.", …) are
accepted; sentence scoping cannot be laundered by an unrelated sentence in
the same key; unconditional signals still fire regardless of context; every
prose key is read; the same governed claim is accepted under a blank `gasUrl`;
three unit checks on `_preview_signal_hit`. Two sweep mutants (context gate
removed → 6 failures; storage family disabled → 16 failures) are caught.
The absolute-promise ban (R4) is a product rule outside the validator and is
untouched; no existing rejection was weakened — every previously caught
sentence in the self-test still fails.

**Counts.** Validator self-test 978 → 1003 (0 failed); mutation manifest
339 → 342; every other `ci.yml` step re-run locally green (financing
totality 3395/0, smoke 118/0, golden strict reproduced, lineage 10/0, QR
188/0, Daybreak contract 87/0 and server 23/0, workbook validation OK with
warnings-as-errors, 28 node suites green, `git diff --check` clean). Full local mutation sweep at the fix commit `8742764`: **342/342 caught, 0
survived, 0 did not apply** — the three new validator mutants all caught by
the self-test; the PR's CI re-runs it.

**Scope statement, re-framed.** `index.html` and the `data/`, `demo/` and `incoming/` trees — every customer-visible byte, configuration, generated file and scoring input — are byte-identical across all three. After the reviewed head, and only by the owner's 2026-08-22 option-B direction on the external review, `tools/validation.py` (the build-admission validator) and `tests/mutation_sweep.mjs` changed; those are build tooling and test manifest, not the served application, so the physical and live-review passes are not reopened. The physical packet's §11
keys retests on `index.html`, dictionary, config and quiz copy — none
changed. The reviewed application head stays `9f27680`; the merge candidate
is the head carrying this change plus its record.

**Thread 3 (`aa08e7e`, raised on the re-review) — fixed in `5a1f70c`.** The
kiosk reads `STORE_CONFIG.gasUrl` raw: `emailDeliveryLive()` is `!!gasUrl`
and `sendResults()` guards its POST with `if (gasUrl && …)`, so a
whitespace-only `gasUrl` is live at runtime (live-mode copy, a real fetch),
while the validator stripped it to blank and admitted preview prose under
it — the validator admitting a promise the kiosk would break, the exact case
the live-capable ruling forbids. The whitespace self-test that expected
acceptance was this branch's own (`8d0bda6`) and was wrong. Fix: a
`_runtime_truthy()` helper mirroring JavaScript truthiness; `live_at_runtime`
derives from the raw value, never the stripped string; a whitespace-only
`gasUrl` is refused as a non-blank placeholder ("whitespace counts") and
preview prose under it is refused too; `""` and `null` stay preview; a padded
real endpoint stays live-capable. Self-tests 1003 → 1008 / 0; manifest 342 →
343 (a stripped-admission regression mutant, 2 failures; the scenario mutant
re-anchored, 3 failures); `tests/trust_integrity_check.mjs` re-pins the
corrected line and additionally requires the helper and the new self-test
(122/122). Customer-visible bytes unchanged. The external reviewer was asked
to re-inspect again at this head.

**Thread 4 (`133fef2`, second re-review) — fixed.** The sentence-wide
context test still rejected "During your showroom session, payment card
details are not stored by this application" (the time adverbial "session").
`_storage_claim_is_governed()` now binds the negation to the noun phrase it
is about — passive/reflexive: the in-clause text before the verb; active:
the in-clause text after it; Spanish reflexive: the object after the verb
when it opens with a noun phrase rather than a preposition — and, when the
bound fragment has no noun of its own (a bare pronoun, an interjected
aside), widens in the fail-closed direction to the rest of the sentence and
then the previous sentence. Self-tests 1008 → 1027 / 0; manifest 343 → 345;
all eight validator entries proven caught in place. Customer-visible bytes
unchanged. The external reviewer was asked to re-inspect a third time.

**Threads 5 and 6 (`bf87c26`, third re-review) — fixed in `b98b7a7`.** Thread
5 was a real fail-open: only the first occurrence of a signal in a sentence
was bound, so "Payment card details are not stored, but your answers are not
stored." was admitted; every occurrence is now inspected. Thread 6: "but",
"while", "whereas", "although", "though", "yet" (ES "pero", "sino",
"aunque", "mientras") now delimit the clause a negation binds to, so "Your
answers are emailed but payment card details are not stored." passes.
"and"/"or" are **deliberately not** clause delimiters — they also coordinate
subject noun phrases ("your email and card numbers are not stored"), and
splitting there would admit a false promise about the first conjunct; a
coordinated clause on "and" stays rejected (fail closed, rephrasable) and
two self-tests pin that choice by name. Self-tests 1027 → 1038 / 0; manifest
345 → 347; all ten validator entries proven caught in place. Customer-visible
bytes unchanged. The external reviewer was asked to re-inspect a fourth time.

**Thread 7 (`e4f4d42`, fourth re-review) — fixed in `babef79`.** A fail-open
list gap: "aren't stored" / "isn't stored" were absent, so "Your answers
aren't stored." shipped with no error. The family now covers, for
store/save/keep/retain, the passive negations with contractions and "won't
be", the active "do not / don't / doesn't / does not / never / won't" forms,
and the Spanish reflexive and active forms; the active and reflexive
sub-families are derived from the one list. Every addition is clause-bound,
so unrelated statements stay accepted. Self-tests 1038 → 1056 / 0; manifest
347 → 348; all eleven validator entries proven caught in place.
Customer-visible bytes unchanged. The external reviewer was asked to
re-inspect a fifth time.

**Thread 8 (`a9d24cd`, fifth re-review) — fixed in `bbf3c9c`.** Typographic
apostrophes ("weren’t stored") and past-tense contractions bypassed the
enumerated list. Enumeration cannot close that class, so the storage family
is now grammatical: apostrophes and quotes fold to ASCII before matching
(for the unconditional signals too), and four compiled patterns — passive
(n't / not / never / cannot / no longer + optional be + stored / saved /
kept / retained), active (+ store / save / keep / retain), Spanish reflexive
and Spanish active, including future forms — replace the list. Each match is
bound to its clause exactly as before. Self-tests 1056 → 1073 / 0; manifest
348 → 349; all twelve validator entries proven caught in place.
Customer-visible bytes unchanged. The external reviewer was asked to
re-inspect a sixth time.

**Threads 9 and 10 (`3b5b837`, sixth re-review) — fixed in `9aa11ac`.** Thread
9 (fail-open): only "ever" or an auxiliary could sit between the negation and
the verb, so "not permanently stored" passed; up to three words may now
(`_GAP`), and the Spanish patterns accept a clitic object. Thread 10 (false
rejection, inconsistent with the "sent to lenders" acceptance): transmission
negations (transmit / send / share / upload / forward / submit; ES transmitir
/ enviar / compartir) move from the unconditional list into the grammatical
family and are a preview claim only when **absolute** — no destination after
the verb, or a universal one ("anywhere", "to anyone", "a nadie") — and bound
to governed data; a qualifying destination or condition ("to lenders",
"unless you choose to email them") is a claim the business owns. Binder
corrections found while testing: fallback fragments never include the
matched verb; auxiliaries and Spanish clitics are non-content; a pronoun
object followed by an adverbial widens to the previous sentence. Self-tests
1073 → 1104 / 0; manifest 349 → 352; all fifteen validator entries proven
caught in place. Customer-visible bytes unchanged. The external reviewer was
asked to re-inspect a seventh time.

**Threads 11 and 12 (`d33bde2`, seventh re-review) — fixed in `dbde3ec`.**
Thread 11 (fail-open): the universal-destination test looked only at the
first captured word, so "not sent to absolutely anyone" was admitted as a
qualified destination; every word of the destination is now tested. Thread
12 (false rejection): the three-word gap accepted any word, so "we do not
ask lenders to store your answers" — a claim about lenders, not the kiosk —
was reported as a storage negation; the gap now admits only auxiliaries and
adverbs. Self-tests 1104 → 1118 / 0; manifest 352 → 354; all seventeen
validator entries proven caught in place. Customer-visible bytes unchanged.
The external reviewer was asked to re-inspect an eighth time.

**Threads 13 and 14 (`f3a8b91`, eighth re-review) — fixed in `9988795`.**
Thread 13 (fail-open): the destination capture stopped at three words, so
"not shared with our service providers or anyone else" was admitted; the
destination now runs to the end of its clause and the universal scan
separately covers everything after the verb to the end of the sentence
(fail closed across a comma list). Thread 14 (false rejection): the bare
determiner "any" counted as universal, so "not sent to absolutely any
lender" was rejected; universality now means a pronoun or a universal phrase
("any other", "anyone else", "ningún sitio"), and determiner + noun stays a
scoped, qualified claim. Self-tests 1118 → 1129 / 0; manifest 354 → 356; all
nineteen validator entries proven caught in place. Customer-visible bytes
unchanged. The external reviewer was asked to re-inspect a ninth time.

**Thread 15 (`4fe6db5`, ninth re-review) — fixed in `53b7e27`.** The
sentence-tail scan from thread 13 also caught a universal in an unrelated
following clause ("not shared with lenders, *but anyone* can ask us
questions"). The destination now extends only through comma segments that
read as coordinated list items, stopping at a clause starter, a verb-like
token or a long segment. Self-tests 1129 → 1134 / 0; manifest 356 → 357;
all twenty validator entries proven caught in place. Customer-visible bytes
unchanged. The external reviewer was asked to re-inspect a tenth time.

**Threads 16 and 17 (`9fa87e2`, tenth re-review) — fixed in `f2aa300`.**
Thread 16 (fail-open): a coordinated segment longer than six words stopped
the destination scan before "… or anyone else"; the length cap is gone.
Thread 17 (false rejection): a dash-introduced clause with a lexical verb
was appended to the destination. A segment now continues only on structural
evidence of coordination — comma-joined (a colon, parenthesis, quote or a
dash that does not open with a coordinator ends the destination), no clause
starter or verb-like token, and either a coordinator or a short list item of
at most four words. Self-tests 1134 → 1145 / 0; manifest 357 → 359; all
twenty-two validator entries proven caught in place. Customer-visible bytes
unchanged. The external reviewer was asked to re-inspect an eleventh time.

**Thread 18 (`04a4190`, eleventh re-review) — fixed in `b7eff97`.** ", and
anyone who asks receives support" satisfied the coordinator test because
"and" is a coordinator. When the coordinator is the segment's first word the
remainder must itself be a short list item, and a relative pronoun marks a
clause. Self-tests 1145 → 1153 / 0; manifest 359 → 360; all twenty-three
validator entries proven caught in place. Customer-visible bytes unchanged.

**Closing the external-review loop (lead decision, 2026-08-22).** Eleven
Codex passes produced eighteen threads, every one on the same build-time
heuristic — the validator's reading of retailer-authored privacy prose —
alternating between "too strict" and "too loose" on an unbounded long tail
of English and Spanish phrasing. None touched the application, the Lacks
configuration (`gasUrl` blank) or any customer-visible byte. The owner's
option-B direction was to let external review inspect the validation
change; it has, repeatedly, and every finding was fixed rather than waived.
No further re-review was requested after `b7eff97`: the heuristic's remaining
limits are documented in the code (fail-closed where ambiguous: "and"-joined
subject noun phrases, comma-spliced clauses, pronoun objects without an
antecedent), every rule is pinned by self-tests and sweep mutants, and
future retailer prose that trips a false rejection is reported with the
exact phrase and can be rephrased. Automatic Codex reviews still fire on any
later ready-for-review transition.

All eighteen threads were answered on the PR with this rationale and resolved after
the tests passed; the external reviewer was asked to re-inspect the change
before the merge.

## 34. Merge authorization (Blake Ford, 2026-08-22)

Blake Ford explicitly authorized merging PR #54: a **merge commit**, source
branch **kept**, no squash, no rebase, no auto-merge; acknowledging that a
merge to `main` automatically updates the GitHub Pages preview. Merging to `main` publishes only the existing GitHub Pages preview. The authorization grants no showroom use, no live email or lead collection, no non-blank `gasUrl`, no final Spanish approval, no production/live-business approval beyond the existing preview deployment, and no permission to merge or modify PR #53.

Pre-merge state at the time of recording: `origin/main` `4a76503`; PR #53
open/draft at `6decbef`, untouched; PR #54 open, ready, MERGEABLE/CLEAN, all
eighteen external-review threads resolved, auto-merge disabled; the
application bytes (`index.html`, `data/`, `demo/`, `incoming/`) identical to
the physically tested `f748f59` and the owner-reviewed `9f27680`; the
validator and test changes after `9f27680` (§33) CI-green at `1b776a1`.
The merge proceeds only after this record's own commit is CI-green and the
PR re-verified ready and mergeable; the post-merge verification (merge
commit, new `main`, Pages build/deploy, served `index.html` SHA-256
`b0981e11…412321`, blank `gasUrl`, preview wording) is recorded in §35.

## 35. Merged and deployed (2026-08-23)

PR #54 merged 2026-08-23 00:13Z as merge commit `d4049cb` (parents `4a76503` + `084f2f0`; merge, not squash; branch kept). Post-merge CI run 32607312520 and Pages run 32607311802 both succeeded at exactly `d4049cb`; the public preview `https://beford782.github.io/LacksFurniture/` serves `index.html` with SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321` — the bytes physically tested at `f748f59` and owner-reviewed at `9f27680` — and `store-config`, `quiz`, both dictionaries, `mattresses` and `allowed-hosts` hash-identical to `main`; a headless render showed Welcome with its Start button, one heritage line and the data-use sentence, no unauthorized-domain screen, no data-error overlay, a clean console; served `gasUrl` is blank, the draft-policy notice and preview wording are served. Preview deployment only: no showroom use, no live email, Spanish provisional.

PR #53 (Slice 5) is untouched at `6decbef`, open and draft. Its next step: update from `main` at `d4049cb`; re-run the conflict forecast against that actual `main` (the pre-merge forecast was five files / three both-added regions against `4a76503`; `main` now also carries the `tools/validation.py`, `tests/mutation_sweep.mjs` and `tests/trust_integrity_check.mjs` changes from the external-review fixes, so the manifest's observer constants are a fresh conflict surface); resolve every conflict semantically, preserving both features; rebuild `demo/black-friday/` with `python tools/build_black_friday_demo.py`; run the complete suite and the full mutation sweep on the combined tree. #53's existing CI is not post-merge evidence.
