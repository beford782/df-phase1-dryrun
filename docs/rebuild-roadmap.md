# DreamFinder rebuild roadmap — Lacks deployment

**Status: LIVING DOCUMENT. Phase 0 COMPLETE (2026-08-10 — 0.4's mounted-device
evidence recorded; see 0.4 and `docs/kiosk-device-hardening.md`). Phase 1
implementation AUTHORIZED (2026-08-12, owner directive — see the authorization
block at the top of Phase 1) and, as of 2026-08-14, directed by the Nocturne
owner-review decisions (see "Phase 1 direction decisions — recorded
2026-08-14"). Phases 2–3 remain a plan of intent, not a grant of approval —
see the open-decisions register. Device hardening remains BLOCKING for
showroom use.**

**Last updated:** 2026-08-23 *(closes out the Trust integrity gate: PR #54 merged 2026-08-23 00:13Z as merge commit `d4049cb` (parents `4a76503` + `084f2f0`; merge, not squash; branch kept). Post-merge CI run 32607312520 and Pages run 32607311802 both succeeded at exactly `d4049cb`; the public preview `https://beford782.github.io/LacksFurniture/` serves `index.html` with SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321` — the bytes physically tested at `f748f59` and owner-reviewed at `9f27680` — and `store-config`, `quiz`, both dictionaries, `mattresses` and `allowed-hosts` hash-identical to `main`; a headless render showed Welcome with its Start button, one heritage line and the data-use sentence, no unauthorized-domain screen, no data-error overlay, a clean console; served `gasUrl` is blank, the draft-policy notice and preview wording are served. Preview deployment only: no showroom use, no live email, Spanish provisional. The gate moves 🔨 → ✅; Slice 5 (draft PR #53, `6decbef`) is next and must update from `main` at `d4049cb`, re-run the conflict forecast against that actual `main` — which now also carries the validator and test-manifest changes from the external-review fixes — resolve keep-both, rebuild the demo bundle with the canonical tool and re-run the complete suite and sweep on the combined tree; #53's pre-integration CI is not post-gate evidence. The reconciliation baseline is re-pointed from `4a76503` to `d4049cb`.)* The previous revision, 2026-08-22, recorded the owner's 2026-08-21 product-direction
rulings on the Trust integrity gate — R1 merge order: draft PR #54 (the gate)
merges before draft PR #53 (Slice 5), which then integrates the resulting
`main` and proves the combined behaviour; R2 heritage stays Welcome-only this
cycle; R3 the shipped Gold-first / within-tier presentation is retained this
cycle with the 15px relativity note, options B–D deferred, nothing in 3.3
authorized; R4 the removed hardcoded "never sold / unsubscribe" promise is
never restored and no other absolute promise is authored; R5 the idle
dialog's body becomes behaviourally exact and dictionary-driven (shipped on
the branch, Spanish provisional); R6 "since 1935" stays as shipped,
provisional, the BBB 1924 entry unresolved, no anniversary arithmetic; R7 a
one-time VoiceOver sanity pass on the mounted iPad is REQUIRED before #54
leaves draft; R8 the mounted-device gate stands. These are product-direction
rulings only — not legal, native-language, device or showroom approval, and
not authorization to merge either PR. The conflict forecast between the two
branches is re-stated as five files (it was three before the Sleep System
containers joined the wipe inventory). The previous revision, 2026-08-21,
inserted the **Phase 1 cross-cutting gate —
Trust integrity and transparency** (now ✅ — merged as `d4049cb`; it was 🔨 on branch `claude/phase1-trust-integrity`
from `4a76503`), discovered by the 2026-08-21 quiz trust investigation
(`docs/quiz-trust-investigation-2026-08-21.md`). By owner instruction it sits
after Slice 4 Payment Choice and before Slice 5 Sleep Plan in the approved
order; it repairs shipped trust defects that cross the ownership of 1.2, 1.3 and
1.6 and closes none of those items. It records the in-quiz heritage rail as not
approved, adds the tier-presentation, heritage, founding-year, privacy-approval,
specialist-audience, idle-dialog-wording, measurement and VoiceOver questions
to the register, and
re-points the reconciliation baseline. It closes nothing else: no scoring, tier,
threshold, touch, persistence or financing-influence change is implied or made;
Spanish stays provisional — with the privacy sentences now owed native review
FIRST; device hardening still blocks showroom use; Phase 0 stays closed. The
previous revision, 2026-08-20, closed out Slice 4: PR #51 merged as `b2acd7e`
with all four manual gates passed and owner-reported, the final reviewed head
`ee6e402` green in CI and clean on external review, and the Pages deployment
verified at exactly the merge commit; item 1.5 moved ⬜ → ✅. The
2026-08-17 revision recorded the Slice 4 Payment
Choice owner
rulings — the preserved "Payment preference" wording and its narrow validator
allowlist, the two-dimension durable model, the D4 rows landing on the existing
handoff only, the four key renames, the nine adopted copy strings, the ten
retired ones, the not-right-now transition table, first-open exploration
ordering, handoff-only suppression, the stale-path disclosure, the accepted
cache-skew window, the two retired diagnostics, the total email exclusion and
the drawer/Sleep System surface disable — and re-pointed the reconciliation
baseline and next-item pointer once Slice 3 had merged. The
2026-08-16 revision recorded the Slice 3 Quiz owner rulings — zero option
icons, the two-column grid cap, and the five authorized accessibility repairs —
together with the honest 47-icon audit ledger. The 2026-08-14 revision recorded
the Nocturne owner-review decisions D1–D6, the 2026-08-12 screen-reader
out-of-scope ruling's effect on 1.2, the settled tier-tab direction, the adopted
Payment Choice state model, the Daybreak PRs #42/#43 and the 2026-08-13
owner-approved scoring change they carried.)*
**Original roadmap baseline:** `42ff5f3a2158bc68219b1c87cb6356f146009fdc` — GitHub
`main` when this document's phase statuses were written, the merge commit of
PR #16 (2026-08-05). It is **not** current `main`. GitHub state is
authoritative; a local checkout never is.
**Reconciliation baseline:** `d4049cb0694f2dcba5322afef433a08c088238a3` — GitHub
`main` at this revision; PR #54 merge commit (2026-08-23, the Phase 1
cross-cutting Trust integrity gate), and the `main` that Slice 5 (draft PR #53)
must integrate. The prior baseline was
`4a765034b402ddfbfdb8bfcf3313cf2ee6c8e88b` (PR #52, the docs-only Slice 4
close-out, 2026-08-20, and the commit the trust-integrity branch was cut
from), before that `b2acd7edfb0aa2dfb3add2cf55d7489c0fe50c2a` (PR #51, Nocturne
Slice 4, the Payment Choice model per D4, 2026-08-20), before that
`5436deaea432ec87eb6b4d9f06cd82a85fb1910c` (PR #47, Nocturne Slice 3,
2026-08-16), before that `b05d47fdf88c54d2dda666e7e3c6b475aa1cc734` (PR #46,
Nocturne Slice 2, 2026-08-16), and before that
`83d4646e5af611a14a7b3fbd66f5a0604bb7886e` (PR #43,
Daybreak PR 2, 2026-08-14).
**Merged slices and current work:** per the approved 2026-08-14 slice order, items
(1), (2), (3) and (4) have all merged — Slice 1, the Results tier-tab restyle
and hero-plus-support card hierarchy (1.3 per D3), as PR #45; Slice 2, the Sleep
Brief recomposition and Sleep Signature (1.1 per D1+D2), as PR #46;
Slice 3, the Quiz visual pass (1.2), as PR #47; and Slice 4, Payment Choice
(1.5 per D4), as PR #51, merged 2026-08-20 as `b2acd7e` with its four manual
gates passed and its Pages deployment verified. **Slice 4 is complete, not the
current item.** Unlike
Slices 1–3 it was not presentation-only: it replaced an interaction model. It
still changed nothing the engine computes — the Phase 1 output-regression
fixture and its pinned sha256 are byte-identical across it — and it added no
telemetry, no email content and no payment math.

**Current work (2026-08-23).** The owner-inserted **Phase 1
cross-cutting gate — Trust integrity and transparency** is `✅` — PR #54 merged
as `d4049cb` on 2026-08-23 (branch `claude/phase1-trust-integrity`, cut from
`4a76503`, kept); it is placed in the approved order after Slice 4 and before
Slice 5, and its block sits after item 1.7. One branch remains in progress: **(5) Slice 5 — the Sleep Plan screen (D5 / item 1.7)** is `🔨` on
`claude/nocturne-slice5-sleep-plan` (commits C0–C7, draft PR #53, unmerged).
*(An earlier revision of this paragraph said Slice 5 was `⬜`, approved to build
and not started; it began on its own branch — draft PR #53, head `6decbef` —
before 2026-08-21. The gate is Slice 5's prerequisite in the approved order,
and the merge order is **ruled (owner, 2026-08-21): the gate — draft PR #54 —
merges first; Slice 5 — draft PR #53 — then updates from the resulting
`main`, resolves the forecast both-added conflicts semantically, rebuilds the
demo bundle and re-runs the complete suite on the combined tree.** Slice 5
was developed concurrently and its branch work continues; #53's current CI is
not post-gate integration proof. The ruling authorizes neither merge.)* Item 1.7 carries its own scope
and exit, and its Payment Choice row was deliberately excluded from Slice 4 by
owner ruling 3. The full recommended order is
recorded in the 2026-08-14 decision block. The two conditions Phase 1 implementation required — the 0.4
mounted-device evidence closing Phase 0, AND Blake explicitly opening Phase 1 —
**are both met** (2026-08-10 and 2026-08-12 respectively). Every merge still
passes the phase-wide device-matrix merge gate and the Phase 1 output
regression fixture.

**Scope:** the Lacks deployment. Migrating store-agnostic work back to the WGR
template is a real goal but has no owner, no phase and no schedule here; treat it
as out of scope until someone gives it one.

---

## What this document is for

The rebuild is four phases of genuinely different character, and the failure mode
is treating them as one undifferentiated backlog:

- **Phase 0** — defect and foundation work. Small, verifiable, and either
  mechanical or already decided.
- **Phase 1** — the visible redesign. Presentation only.
- **Phase 2** — price and payment. Builds dark, ships silent, activates only
  behind business and legal gates.
- **Phase 3** — structural. Changes what is recommended, so it requires evidence
  and Blake's sign-off.

The sequencing rule that matters: **Phase 3 items must not be bundled into Phase
1.** A visual redesign that also silently changes which mattress is recommended
cannot be evaluated, because a reviewer cannot tell whether a different top pick
came from the new card design or from a scoring change.

A second rule, learned the hard way: **no phase may leave `main` in a degraded
state for a later phase to repair.** Where a change removes something the customer
relies on, the removal ships in the same commit as its replacement.

### Status legend

| Mark | Meaning |
|---|---|
| ✅ | Shipped and verified on `main` |
| 🔨 | In progress on a branch |
| ⬜ | Approved to build, not started |
| ◐ | A named output may not ship or merge until its condition is met; listed Proceeds work continues |
| 🔒 | Blocked — no part of this item may start |
| ⏳ | Code merged on `main`; a named verification remains outstanding. Not closed, and not ✅ |
| ❓ | Proposed only. Not approved. Do not implement. |

**Rules for these marks.** ⬜ → 🔨 → ✅ may be moved by whoever does the work.
Moving anything **into or out of ◐, 🔒 or ❓ requires the named approver on that
item** — and that includes editing a ◐ item's Gated or Proceeds lists. Every ◐, 🔒
and ❓ item states who decides and what unblocks it.

**⏳ blocks calling an item done.** Moving ⏳ → ✅ requires the named
verification, recorded on the item.

**Where a mark goes.** Scope (whole item vs a portion) and stage (blocks starting
vs blocks merging) are independent, and one mark cannot carry both.

- **🔒 means no part of this item may start.** It goes on the item's heading.
- **◐ gates a production output, not an activity.** The named output may not
  ship or merge until its condition is met; everything in Proceeds continues,
  including prototypes and branch implementation. It goes on the item's heading
  and is **invalid without both of these directly beneath it**:
  - **Gated** — approver, unblock condition, and what may not be done, written as
    a **property of the output a reviewer can check in a diff**, not as an
    activity.
  - **Proceeds:** what may be done now.

  A ◐ item missing either list, or whose Gated line reads as an intention rather
  than a checkable property, **is read as 🔒**. The default when a mark is sloppy
  is more locked, not less.
- **A gate that applies to every item in a phase is recorded once**, in that
  phase's own gate block, and is not copied onto item headings. A mark carried by
  every heading distinguishes nothing.
- **A phase-wide merge gate is recorded once, in that phase's gate block, and
  nowhere else.** Item Exit lines do not repeat it.
- **A gate a test enforces needs no heading mark**, provided the suite fails
  deterministically on the gated change and the failure names the gate. Name the
  test in the body — the guard is the notice.

**Guards on ◐:** work under Proceeds may not encode an outcome of the gated
decision, ship placeholder content standing in for it, or remove anything the
gated decision might want to keep. If the unblocked portion turns out to require
the gated decision, **the item reverts to 🔒 and goes back to the approver.** A ◐
item's **Exit:** must state what it excludes.

**An entry in the open-decisions register bars adopting or shipping that
decision** — not prototypes, and not work listed under a Proceeds line.

**Merging moves an item to ⏳ automatically** when a named verification on it
remains outstanding.

**"Approved to build" means:** the problem is agreed, the constraints are agreed,
and implementation may begin. It does **not** approve a specific layout, wording,
or component set. Where this document names components, read them as the current
proposal unless the item says otherwise.

---

## The permanent operating premise

**DreamFinder is a salesperson-operated presentation and consultation tool, used
with the customer present.** The salesperson is the primary operator, guide,
narrator and interpreter. Both people normally view the same iPad. The interface
supports a shared, glanceable human conversation and **must not design the
salesperson out of it**.

It must nonetheless remain safe, respectful, accessible, comprehensible and
bilingual **if a customer interacts with it directly**, because they will.

**Sleep fit is primary. Payment Choice is secondary.**

This premise supersedes any older self-service framing, including the
"customers take a sleep quiz" self-service description in CLAUDE.md, which
predates it. *(That description said "12-question" until 2026-08-12; the
quiz is 10 questions since the owner-ruled removal recorded under 1.2.)* Where the two conflict, this premise governs product direction;
CLAUDE.md continues to govern architecture, i18n and the generated-artifact
pipeline.

Three consequences that change how items below are written:

- "Customer-facing" and "salesperson-facing" are not disjoint audiences on a
  shared screen. Content is not made acceptable merely by moving it to the
  Consultation Summary — both people can see both surfaces.
- Reading load is a cost paid **out loud**, by the salesperson, on every
  presentation. That is the real argument for concision, not a word count.
- A failure the customer can see is a failure in front of a customer. An error
  state is not "a tablet nobody noticed"; it is an interruption of a sales
  conversation.

---

## Invariants — these hold across every phase

None of these are negotiable by a redesign.

1. **Sleep fit is independent of financing.** Financing never affects scoring,
   ranking, tier assignment, the Sleep Brief, or match reasons. Pinned by
   `tests/scoring_isolation_check.mjs`.
2. **Nothing in Phase 0 or Phase 1 changes what the engine computes.** This is
   broader than "scoring": it covers scoring and firmness computation, the
   engine's computed mattress / accessory / priority selection, and ordering,
   tier assignment, caps, filtering and ranking. Any change to what is computed
   is Phase 3 and requires **Blake's sign-off**.

   **Presentation may change which already-computed value is surfaced, and
   where.** It may not change the value, the set it was drawn from, or that set's
   order. Surfacing the engine's top-ranked priority as a hero is a presentation
   change; re-deciding which priority ranks first is not. See Phase 1 constraint
   2, which is where this is enforced.
3. **The store-agnostic boundary.** `index.html` contains no retailer name,
   colour, product or code. A redesign is the most common way this rule gets
   broken — a hardcoded heading is still a hardcoded heading.
4. **Bilingual by construction.** Every new user-facing or salesperson-facing
   string ships `en` and `es` together. A redesign that lands English-only is not
   done.
5. **New copy is config-driven and goes through the pipeline.** Author at the
   canonical `incoming/` source, regenerate via `build_lacks_workbook.py` then
   `tools/convert_store_data.py`, and verify with the strict golden bundle.
   **Never hand-edit** `data/store-config.json`, `data/quiz.json`,
   `data/mattresses.json`, `data/accessories.json` or `data/allowed-hosts.js`.
   `data/dict-en.json` / `data/dict-es.json` are the exception — hand-maintained,
   generic, shared across retailers, and never a home for retailer copy.
6. **The customer session is memory-only.** No new persistence. `localStorage` is
   for reviewed staff/device state only.
7. **Diagnostics are allowlisted per event and value-validated**, and the logged
   event set and `EVENT_FIELDS` are held to set equality in both directions.
   The contract governs whatever event set exists, in both directions and at any
   size: adding an event without declaring it drops its whole payload, and
   declaring one nothing logs leaves dead contract surface — so **retiring an
   event means removing it from both halves in the same change**, which is how
   Slice 4 removed the two agenda events. *(What the guard does NOT cover is
   enum VALUES: an unlisted `placement` value is dropped at runtime with only an
   anonymous count. That gap is why 1.5 config-disables the drawer and Sleep
   System surfaces instead of retiring their placement values.)*
8. **The kiosk collects no financial data.** Applications happen only on approved
   external Lacks/lender pages.
9. **Focus, wipe and language safety.** Focus ownership is respected (safety
   dialog, drawer, overlays); no post-wipe announcement; no stale-language
   announcement; every customer-ending path clears the whole session.
10. **Touch handling and `window.startOver()` are not refactored casually**, and
    `location.reload()` is never used.
11. **Verification state is never staged.** `verifiedAt` is never freshened,
    and `exactPromotionsEnabled` is never enabled, to make exact financing
    claims render for a demonstration, review, screenshot or prospect. A
    verification timestamp records a real verification event against an
    allowlisted source, or it does not change. The suppressed, fail-closed
    presentation **is** the correct demonstration of stale state. *(Made
    permanent governance 2026-08-14, promoted from a prototype-round rule.)*
12. **Native-Spanish linguistic approval is consolidated, not per-slice.**
    *(Owner ruling 2026-08-15.)* The native-Spanish review of customer-facing
    ES copy is **deferred to a single consolidated pass at the end of
    development**, rather than gating each slice. A slice therefore does not
    wait on a Spanish linguistic sign-off to merge. What each slice still
    owes, without exception:
    - **EN and ES functional testing** on the device matrix (both
      orientations, both languages) — the language toggle, layout under
      Spanish text expansion, and every ES surface the slice touches.
    - **Automated EN/ES parity** — identical dictionary key sets, every new
      key present and genuinely translated in both languages, and the
      slice's own suite executing its ES path.
    - **A copy inventory**: every new or changed ES string the slice ships is
      listed in its PR, so the consolidated review has a complete ledger to
      work from rather than reconstructing it from diffs.
    Deferral is not approval. Until that consolidated pass happens, shipped
    ES copy is provisional, and this invariant is what records that it is
    owed. It does not touch the separate, still-open native-Spanish
    **claim-equivalence** reviewer for catalog claims (see the claim
    inventory), which remains its own gate.
    *(2026-08-21: the customer-facing privacy / data-use sentences are the
    one recorded exception to the deferral — a wrong translation there changes
    a promise, so they are owed native review before showroom use, ahead of
    the consolidated pass. Recorded on the owner's 2026-08-21 instruction that
    privacy copy receives native-review priority, which the investigation had
    also recommended. See the Phase 1 cross-cutting Trust integrity gate.)*

---

## Phase 0 — finish the foundation

Closes out before Phase 1 implementation begins.

### 0.1 — Financing analytics contract ✅

**Shipped.** PR #11 (merged `5a9cd10`) corrected an event rename that had left
`EVENT_FIELDS` declaring two retired names while two live events went undeclared —
so both agenda events emitted a drop-count and nothing else. PR #12 (merged
`1aef27d`) then made the guard itself fail closed after review found it recognised
only single-quoted literals and, later, only exact `analytics.log(` spacing.

The durable outcome is Invariant 7: the call sites and `EVENT_FIELDS` are held to
set equality in both directions, and any `analytics.log()` call whose event name
cannot be statically enumerated fails the suite. Implementation and mutation
evidence live in `tests/session_async_check.mjs` and in the PR history; they are
not restated here.

*(Terminology, 2026-08-17: this item is named for the two **agenda** events it
repaired — `financing_agenda_changed` and `financing_agenda_reviewed`. Slice 4
**retired both outright, with no replacement**, because a payment preference is
the customer's own position and no consumer needs it; the heading is renamed
accordingly. The item stays ✅: what 0.1 delivered was the set-equality contract,
not those two names, and that contract is exactly what let two events be removed
in one change without either half drifting — the same suite that caught the
rename now proves the retirement. The four surviving financing events are
`finance_module_impression`, `finance_details_open`,
`official_financing_link_click` and `mexico_financing_details_open`.)*

### 0.2 — This roadmap ✅

Added in PR #11, corrected in PR #12, reconciled against the operating premise and
shipped state in PR #14 (merged `7fa8390`, 2026-08-05).

### 0.3 — `showScreen()` moves focus and announces ✅

**Shipped.** Final PR #13 head `1574c53e41c7541f1f8a056f1efbb0bd589809f4`, merged
as `88f1e89882b4da30f7de5da903cea6e66e644549`. CI and the Pages deployment both
succeeded on that merge commit.

**What shipped, so nobody re-derives it wrongly:**

- **Announcement is focus.** There is deliberately **no live region and no
  deferred utterance**. An earlier design deferred a second utterance through a
  live region; it produced a double announcement on named containers ("Sleep quiz,
  region" then "Sleep quiz") and its callback was never bound to the destination
  that scheduled it, so a superseded transition could speak over the screen that
  replaced it. Both were removed at the cause. **Do not reintroduce a deferred
  screen announcer.**
- **Destination policy.** Five screens render their heading before the transition
  and are focused directly: `profileScreen`, `resultsScreen`, `hf2Screen`,
  `emailScreen`, `accessoriesScreen`. `welcomeScreen` has no heading;
  `questionScreen` and `reviewScreen` render theirs *after* the transition, so
  focusing them would announce the previous question or the previous render's
  language. Those three focus their named container instead.
- **Every container is nameable.** All eight carry a nameable role
  (`role="region"`, or `<main>` for welcome) plus a bilingual `aria-label` from
  `data/dict-en.json` / `data/dict-es.json`. A plain `<div>` has the implicit
  `generic` role, which cannot be named, so the label would be discarded.
- **Fail-closed naming.** A missing dictionary entry never becomes the spoken
  name, and a stale label is removed rather than left behind.
- **Refusals**, checked before the move: wipe in progress, safety dialog, drawer
  (`drawer-open`, not `inert`), financing sheet, compare modal, privacy overlay,
  failed data load, either staged reveal. A destination that is already active is
  a re-render, not a transition, and moves no focus.

**Known limitation carried forward:** question-to-question changes are not
announced. *(2026-08-12 owner ruling, recorded under 1.2: screen-reader
announcement work is permanently out of scope; this limitation is accepted,
not pending. The same-screen guard and everything shipped here stand.)*

### 0.4 — Recovery from the data-error overlay ✅

**CLOSED 2026-08-10 — the hardware exit is satisfied.** Blake confirmed the
mounted-device evidence: the actual mounted showroom device is an iPad Pro
11-inch (2nd generation), tested in its normal mounted orientation, and both
named routes — the data-error **retry** route and the data-error
**clean-restart** route — passed, with no layout or interaction problem
reported in the mounted configuration. The evidence is recorded, dated, and
bounded in `docs/kiosk-device-hardening.md` (*Mounted-device verification —
2026-08-10*), which also records exactly which protocol details the owner's
report did and did not itemize. That is the named verification this item's
exit demanded, so ⏳ → ✅ and Phase 0 closes. The prose below is the item's
history and its requirements as written while the gate was open; it stands
unedited.

**Code merged: PR #15, merge commit `572d405` (2026-08-05). The item holds at ⏳
— not ✅ — because its named verification is hardware, and that has not
happened.** The retry and clean-restart routes are recorded as unverified on any
device in `docs/kiosk-device-hardening.md`, whose checklist for them stands
unchecked. Reporting 0.4 as done on the strength of the merged PR is a
misreport.

What the merged code carries, against the requirements below:
the loader is extracted from its IIFE into a named, re-invocable `loadAppData()`
driven by a declarative `DATA_SOURCES` table (core vs independently non-fatal
accessories preserved, per-resource so a retry re-fetches only what is missing);
bilingual **Try again** and **Start over** controls on the overlay, the latter
delegating to `window.startOver()` with no second wipe implementation; the
failure flag and the poll counter cleared on recovery; `aria-hidden` restored;
`dataErrorOverlay` added to `SESSION_LAYERS` and `dataErrorLive` to
`SESSION_TEXT_IDS`; and load-generation plus session-epoch guards so a
superseded or post-wipe completion updates state without raising a layer,
announcing, or moving focus. Evidence: `tests/data_error_recovery_check.mjs`
(new, executes the real extracted code; every safety property named above is
mutated and the suite must fail when it is removed) and the wipe matrix in
`tests/session_safety_check.mjs`. The count is deliberately not stated here — it
went stale twice inside three commits, and the property is what matters.

Review rounds after the first implementation added the rest of what "the route
is not recovery if it can be terminal" actually requires, and each came from a
defect found rather than from the original plan: **bounded deadlines** on every
data and dictionary request, because an unbounded fetch on a black-holed
network left the in-flight latch stuck and Retry answering "still trying"
forever; an **applier-aware verdict**, because fetching the data and being able
to render it are different things and a throwing applier reported success;
**mattress schema validation with a narrow assign**, because the scoring pass
iterates every top-level key and the results pass slices all three tiers, both
after the twelfth question and neither wrapped; **dictionary identity**, because
a Spanish request that fell back to English recorded itself as Spanish and was
never retried; and **modal ownership in both directions** — the overlay yields
Tab to a layer above it, and a safety dialog closing over a visible overlay hands
focus to the overlay instead of restoring an opener now behind it.

The overlay was terminal before this item. `showDataError()` set `_dataLoadFailed`,
wrote one sentence, and showed a full-viewport layer that contained **no interactive
element of any kind**. There was no route out: `startQuiz` short-circuited back to
it on every tap, screen-transition focus was refused while `_dataLoadFailed` was
set, and the failure surfaced on Welcome — where the persistent Restart control is
deliberately hidden. With a salesperson and customer both looking at it, this was a
dead tablet mid-conversation.

Requirements:

- An explicit **retry** that re-fetches the failed resources. **Not
  `location.reload()`** — Invariant 10, and the file currently has zero violations
  of it. The loader is presently an IIFE and would need extracting into a named,
  re-invocable function.
- A route to a **clean restart**.
- **Reset the failure state on success**: `_dataLoadFailed` is currently set once
  and never cleared, and the retry-attempt counter needs the same treatment.
- **Clear the overlay** — remove its visible class and restore `aria-hidden`.
- **Add the overlay to the session-layer close list.** It is absent today, so a
  wipe leaves it stranded over a fresh Welcome screen while `focusWelcomeEntry()`
  focuses a Start button underneath it.
- Handle partial failure — one dataset failing is not all of them.
- Accessible status and focus behaviour, bilingual, consistent with 0.3.

**Exit — two conditions, separately satisfied.** The *code* exit is the
requirements above, green suites and a merged PR. The *hardware* exit is the
route verified on the mounted showroom device. They are not the same, and the
first does not imply the second — the same four-way distinction this document
applies to email (UI, payload, activation, verified delivery).

**Status after the code merges: ⏳, not ✅.** 0.4 becomes ✅ only when the retry
and clean-restart routes are recorded as verified on the confirmed mounted
showroom device in `docs/kiosk-device-hardening.md`. That document is marked
blocking for showroom use and records that the tests never established the test
iPad is the mounted device — so **this may not happen on this timeline**.

What ⏳ does and does not block, precisely: 0.5, 0.6 and 0.7 proceed while 0.4
awaits verification, and prototypes and research continue wherever already
allowed. But **Phase 0 cannot close and Phase 1 implementation cannot begin until
that verification is recorded** — the phase sequence is not weakened by this mark.
**Reporting 0.4 as done, shipped or complete on the strength of the merged PR is a
misreport.**

**Documentation obligation:** this adds a session-ending route.
`docs/kiosk-device-hardening.md` records each such route as separately verified on
hardware, precisely because verifying one says nothing about another. 0.4's exit
condition includes adding the new route to that table and re-verifying on the
mounted device.

### 0.5 — Route priorities content to the Consultation Summary and email ✅

**Shipped: PR #16, merge commit `42ff5f3` (2026-08-05), reviewed head
`412095a`. 0.5's exit criteria are code-level and were verified by the suites
that PR shipped; none carried a named post-merge verification the way 0.4's
hardware gate does, so the item never passed through ⏳.** That is a statement
about the exit, not about the presentation:
the new section's rendering was reviewed once, in a real browser, and its
deliberately-unstyled look (bare list inside the section card, minimal inline
spacing only) is part of the 1.6 debt below, not a settled design.

**What shipped, so nobody re-derives it wrongly:**

- **The engine produces one to three priorities, not always three.** A solo
  side sleeper with no issues and mid firmness yields exactly two. Both new
  surfaces render the engine's count in the engine's order — never padded,
  never synthesised. (The earlier "the three computed priorities" phrasing in
  this section's exit was corrected to match 1.1's "1–3 priority cards", which
  had it right.)
- **The store is the widened `analytics.trialFocus`.** Each element keeps its
  `{en, es}` name pair — so `renderResultsTrialFocus()` and its `L(item)` read
  are zero lines changed — and gains `why: {en, es}` and `test: {en, es}`,
  captured from the bilingual arguments `addPriority` already received and
  discarded. No new session variable, no rank field, no score, no kind: the
  wipe line and its post-wipe assertion were already in place.
- **The Consultation Summary section** sits between "What we set out to solve"
  and the finalists: the existing `hf2-review-section` pattern, a bare `<ol>`
  with no class (native ordered-list semantics; reusing the Sleep Brief's
  `.noct-profile-priority-*` classes would have coupled this screen to the
  exact classes 1.1 replaces), hidden entirely — label and all — when no valid
  priority state exists. Label reuses the approved "What we will test
  together" / "Lo que probaremos juntos" pair.
- **The email carries a bounded `priorities` field**: at most three entries of
  exactly `name`/`reason`/`test`, pre-localized to the payload's `lang` at send
  time. Code.gs treats it as untrusted (array-coerced, capped, per-field
  `_safeText`, allowlist-projected into `safeData`, escaped at every HTML
  interpolation) and renders it in the HTML email after the Sleep Brief line
  and in the full plain-text body, in the same order. That body is built once
  (`buildPlainBody`) and sent on both paths — as the text/plain MIME part of
  the normal HTML email, so a text-only or HTML-disabled client still receives
  the complete results, and as the entire body of the send-failure retry. (The
  success path originally shipped a one-sentence "view in an HTML client"
  stub as its text part; Codex flagged it on PR #16 and this revision fixes
  it.) The sheet row is untouched — priorities are email content, not a
  lead-record column.
- **Known, accepted near-duplication — recorded as 1.6 email debt:** the
  `sleepProfile` line is largely the lowercased priority names, and the new
  block repeats those names with their reason and testing text. Suppressing the
  brief line was rejected as non-additive; 1.6 owns the email surface and
  re-decides this alongside the on-screen presentation. **Both the hf2 section
  and the email block are 1.6 inherited debt.**
- **Within-session staleness is a latent property, not new:** stored priorities
  refresh only when `showProfileScreen()` re-runs, which today is guaranteed
  before hf2 is reachable after any answer edit (the only forward path off
  Review re-renders the profile). `analytics.profileBriefByLang` and the
  pre-0.5 `trialFocus` had the same property. 1.6's navigation rework must not
  open a Review → hf2 path without revisiting this.

**Additive only. This item does not change the Sleep Brief.**

Render the priorities content on the Consultation Summary and in the results
email, and stage the detailed testing, procedural and follow-up guidance as
Consultation Summary and email content.

**Why the Sleep Brief is explicitly out of scope here.** An earlier version of this
roadmap removed the priorities block in Phase 0 and rebuilt it as ranked cards in
Phase 1.1. Across the intervening PRs, `main` would have shipped a Sleep Brief
whose "What we will test together" heading and lead-in sat above an empty list —
and 1.1's hero derives from the same data. The visible transition now belongs
entirely to 1.1.

**This is not a file move.** The email currently carries none of this prose; the
payload sends only the brief-summary string. Routing it there means new payload
fields and Code.gs changes. The Results screen already renders a condensed
derivative of the same priority names, so a third surface must be designed
against the two that exist, not added blind.

**Exit:** the computed priorities (one to three, at the engine's length) render on
the Consultation Summary and in the results email, in the order the engine
produces them, bilingual, with no change to the Sleep Brief.

**Presentation constraint — a limit, not a licence.** The on-screen addition is
**one** new section, using the existing section pattern and ordered-list
semantics, placed above the finalists it explains. **It introduces no new
component class.** A diff that adds one has left additive content and entered
redesign; it stops and waits for 1.6. This presentation is **provisional and is
re-decided in 1.6**, where it is recorded as inherited design debt rather than a
settled layout.

**The real cost here is plumbing, not design.** The computed priorities are local
to the profile render; the only thing that outlives them carries names without the
reason or testing text. 0.5 must widen that or lift the data to session scope —
work that is entirely independent of any presentation decision, which is why this
item can proceed while 1.6 is still open. The email side is a new payload field
plus a Code.gs block; with `gasUrl` blank this is capability work, not delivery.

### 0.6 — Implication, not diagnosis, on the Consultation Summary ✅

**Ships in the PR that carries this revision (branch
`claude/phase0.6-implication-copy`). The ✅ records the intended main-state and
becomes true only when this exact reviewed PR merges — the same convention 0.5
used, and the same reasoning: the exit criteria are code-level, verified by the
suites this PR ships, with no named post-merge verification, so the item never
passes through ⏳.**

**What shipped, so nobody re-derives it wrongly:**

- **One mapping, one resolver, two consumers.** The bilingual implication copy
  lives at `salesNotes.consultationImplications[questionId][optionId]` (and
  `salesNotes_es.…`), authored in `incoming/lacks_store_values.json`, carried
  as `Type=consultation` rows on the workbook's SalesNotes tab (new
  `Implication` / `Implication (ES)` columns in `tools/workbook_schema.py`),
  rebuilt by `build_lacks_workbook.py`, emitted by `convert_store_data.py`,
  and validated end to end: completeness against the quiz's option inventory,
  emptiness parity between languages, and unknown-key rejection
  (`validate_sales_notes` + `validate_store_config`). The client hydrates the
  two maps and `resolveConsultationSummary()` produces the three strings —
  context, who, profile — consumed by BOTH the hf2 rows and the email payload,
  so the surfaces cannot drift.
- **Fail closed by omission.** A missing, malformed or untranslated entry
  omits that fragment — never the clinical-style quiz label, never an option
  or question id, never English copy in Spanish mode. `answerLabelFor` (now
  used only for the neutral mattress-size identity) also fails closed to ''
  instead of echoing the raw id. Intentional omissions (the "none" options,
  comfortable temperature) are authored as empty-string entries so the
  validator can tell them from holes.
- **The email got real equivalents.** The roadmap previously claimed email
  equivalents that did not exist — the payload sent only the brief-summary
  string. The payload now carries an allowlisted `consultation` field of
  exactly `{context, who, profile}` (pre-localized), bounded and projected in
  Code.gs (300 chars each), rendered INSIDE the existing Sleep Brief block in
  the HTML part and directly under the Sleep Brief line in the shared
  text/plain body on both send paths. The sheet row is untouched. 0.5's
  priorities content is untouched. gasUrl stays blank — capability, not
  delivery.
- **Non-leakage is proven behaviorally**, not by inspection:
  `tests/consultation_summary_check.mjs` rebuilds the quiz labels as sentinel
  diagnosis strings in a sandbox and shows every output surface — summary
  rows, payload, HTML email, normal text part, fallback body, sheet row —
  carries only implication copy. **Every 0.6 safety property is
  manifest-guarded in the mutation sweep** — resolver fail-closure (label
  fallback, id leak, label-keyed lookup, cross-language resolution,
  blank-only handling), hydration (blanking and language swapping), the
  single view-model (drift on either consumer), both plain-text branches, the
  HTML rendering (presence, escaping), the server projection (allowlist,
  bound, trim), and sheet non-persistence — each entry proven to apply and to
  turn its named observer red against a green baseline. The durable rule: a
  new 0.6-surface property ships WITH a manifest entry, and the sweep (not a
  count in this document) is the authority on coverage.
- **The source lineage is an executable CI guarantee**, not a description:
  `tests/lineage_check.py` rebuilds the workbook from the committed incoming
  sources in temp space, compares it cell-semantically with the committed
  xlsx, validates it warnings-as-errors, converts it, canonically compares
  every generated artifact with the committed bundle, and proves its own
  non-vacuity by mutating an implication string in a sandboxed source copy
  and requiring both observers to turn red.
- **Operator note:** the CI job name "Full suite (18 checks)" is pinned by the
  branch-protection required-check name and now undercounts (19 suites).
  Renaming job + protection rule together is Blake's action; the workflow
  carries the same note.

**Approved route — decided, not open: add a separate bilingual consultation-summary
presentation mapping. Do not relabel the shared quiz options.**

The Consultation Summary's profile and who rows are built by resolving quiz option
labels directly, so a customer reads back something like *"Side Sleeper · Snoring
or Sleep Apnea · Nerve Pain or Tingling · Medium 6/10"* — a clinical summary of a
person. "Sleep Apnea" is a diagnosis the kiosk is in no position to record.

Relabelling the quiz was considered and **rejected**: those same labels render on
the quiz option buttons and on the Review screen, where plain, self-recognising
language is exactly what makes an option findable. One label store cannot serve
both surfaces. The quiz says what the customer recognises; the summary says what
it implies for mattress testing.

Requirements:

- **Quiz option `id`, order, `type`, `scores` and customer-facing labels are
  unchanged.** A diff touching any of those is out of scope for Phase 0 and, for
  `scores`, is a Phase 3 change requiring Blake's sign-off.
- Add config-driven **English and Spanish implication copy** for the Consultation
  Summary and email, **keyed by option id** — never by label text, so a future
  relabel cannot silently break it.
- The retailer-facing `salesNotes` / `salesNotes_es` channel is the closest
  architectural fit: it is already the sales-floor prose channel, already hydrated
  from store config, and already understood as salesperson copy. Authored at
  `incoming/lacks_store_values.json` and regenerated (Invariant 5).
- **Never present a quiz answer as a diagnosis.**
- Test that clinical-style quiz labels cannot leak into the Consultation Summary
  or the email.

**Exit:** the Consultation Summary's who and profile rows, and their email
equivalents, resolve implication copy keyed by option id rather than quiz option
labels, in both languages; quiz option `id`, order, `type`, `scores` and
customer-facing labels are unchanged; and a test proves clinical-style quiz labels
cannot reach either surface. **This item changes no layout** — it substitutes
content into the three existing summary rows — and therefore carries **no
dependency on 1.6**.

### 0.7 — Prove the protections still hold ✅

Not a feature. The acceptance gate for Phase 0: session, privacy, accessibility,
analytics-contract and financing-isolation protections remain intact.

**Ships in the PR that carries this revision, folded in with 0.6 (Codex
approved the consolidation — it is only the acceptance proof, and running it
against any earlier tree would prove the wrong state). Same mark convention:
the ✅ becomes true only when this exact reviewed PR merges. The run this PR
records: every named suite green at the PR head, the complete mutation sweep
with zero survivors / zero stale / zero not-applied entries, strict golden and
workbook validation green, ranged `git diff --check` clean, protected
artifacts byte-identical across the test run, and a clean working tree — all
re-executed by CI on the exact head.**

**This did NOT close Phase 0 by itself.** 0.4 stayed ⏳ until its
mounted-showroom-device evidence was recorded in
`docs/kiosk-device-hardening.md` — and that is exactly how the phase closed:
the evidence landed 2026-08-10 (see 0.4), with no further implementation
work.

**Exit:** the full repository suite is green — scoring isolation, session async and
privacy, session safety, data-error recovery, financing totality, validation and
quiz validation, the QR suite, workbook validation and the strict golden bundle —
and `git diff --check` is clean.

---

## Phase 1 — the visible redesign

**This is the substantial phase.** Everything below changes what is on screen.
None of it changes what is recommended.

**Phase 1 implementation authorization — granted 2026-08-12.** Following
Phase 0's closure and the device-matrix recording (PR #37), Blake Ford
explicitly authorized Phase 1 implementation under this document's
constraints. The authorization covers work described by items' **Proceeds**
lists. It lifts **no item-specific gate** and does not authorize: a final
Sleep Brief layout; a need-derived hero replacing or subordinating the
current heading (1.1's gated output); personalized per-model reasons without
approved catalog content (1.3's reason gate); replacement of the tier-tab
navigation (1.3's adoption gate); any scoring, ranking, tier, threshold, cap,
back-fill or firmness change (Phase 3); auto-advance (3.4); prices or payment
calculations (Phase 2); Phase 2.2 activation; Phase 3 work; or showroom use
or production launch. **Device hardening remains BLOCKING for showroom use**
(`docs/kiosk-device-hardening.md`) — no Phase 1 work deploys to
customer-facing showroom use while that blocker stands. The regression exit
gate below was built first, as the opening act of the phase.

*(2026-08-14: two entries on the not-authorized list above have since been
authorized by the item-specific approvals they pointed to — the Sleep Brief
composition and need-derived hero (1.1's gate, lifted by D1), and the
finalized tier-tab direction (1.3's adoption clause, satisfied by "the tabs
stand", D3). Everything else on the list stands, including the reason gate,
Phase 2, Phase 3, and the showroom blocker.)*

*(2026-08-21: Blake Ford instructed, in conversation, that a cross-cutting
Trust integrity and transparency gate be inserted after Slice 4 and before
Slice 5. Its work lies inside 1.2 and 1.6 (⬜) and 1.3's Proceeds (neither
gated output), so it proceeds under this authorization and lifts nothing on
the list above.)*

### Standing Phase 1 constraints

1. **Nothing here changes what is recommended** (Invariant 2). Scoring, ranking,
   tier assignment, the firmness scale, the qualification threshold, the result
   cap, the back-fill, and **every engine-computed ordering — mattresses,
   accessories, adjustability demo positions and Sleep Brief priorities alike** —
   are out of scope. There is no "unless approved" escape in this phase; such a
   change is Phase 3 and needs Blake.
2. **Consume, never re-derive.** A Phase 1 surface may read engine output, choose
   which element of it to display, and style it. It must take that output **at the
   index, in the order and at the cap the engine produced**. It must not re-sort
   or re-rank; change or re-apply the cap; recompute or re-weight the score that
   produced the order; filter, deduplicate or substitute elements; merge, split or
   re-bucket them; synthesise an element when the engine produced none; or
   condition the selection on anything other than position in the engine's own
   list.

   Prohibited **for mattresses, accessories, heroes and priorities without
   distinction**: selecting by any predicate other than index — including a field
   carried on the element itself (`kind`, `matched`, `subType`,
   `meetsMatchThreshold`, `tier`).

   **Reading stored answers is permitted for one purpose: rendering that answer,
   or its reviewed presentation mapping, verbatim.** The position, temperature,
   sharing, feel and size signal badges are exactly this, and need no engine or
   view-model refactor. Answers may not select, filter, substitute, reorder,
   reweight or synthesise mattresses, accessories, heroes, priorities or any other
   computed engine output.

   **Concretely:** the Sleep Brief hero is the first element of the computed
   priority list and nothing else — not "the highest-scoring need", not "the first
   one whose kind is `need`". An accessory hero is the first element of that
   step's computed group — not "the highest-scoring matched item", not "an
   adjustable base when snoring is flagged". The adjustability demo position is
   whatever the engine returned; Phase 1 does not re-evaluate its conditions, add
   one, or change which position wins a tie. Badges restate stored answers
   verbatim; no inferred or re-bucketed values.

   *(One engine-side reorder already exists and is not what this forbids: the
   support group is re-sorted after qualification by a fixed sub-type order. That
   is inside the engine. Phase 1 neither undoes it nor copies the pattern.)*
3. **New copy is bilingual and config-driven** (Invariants 4 and 5).
4. **Accessibility acceptance criteria apply to every item** — see the section
   after 1.6.

**Phase 1 exit gate — approved and built 2026-08-12 (owner directive).**
`tests/phase1_output_regression_check.mjs`, in CI alongside
`tests/scoring_isolation_check.mjs`, executes the real extracted engine over
ten fixed answer sets in both languages and holds every recommendation output
against the committed baseline fixture: scores and match reasons, resolved
firmness and feel classification, tier membership and within-tier order, pct,
the 60% qualification, the cap of 3 and the back-fill floor, the top pick,
the ordered accessory engine and its step groups, and the ordered Sleep Brief
priorities. In-memory engine mutations must each diverge from the
baseline on every run, so the pin proves its own non-vacuity. This is
Invariant 2 made enforceable. The fixture regenerates only from the
pre-change commit of an approved engine change, with its pinned
hash moved in the same reviewed diff. *(This closed the register's "Phase 1
scoring-fixture exit gate" entry.)*

*(Fixture history: originally
`tests/fixtures/phase1_output_baseline_85c5c10.json`, generated at the Phase 1
baseline commit `85c5c10` with fifteen mutations. Regenerated once, exactly by
the fixture's own rule, as
`tests/fixtures/phase1_output_baseline_daybreak_pr1.json` for the
owner-approved 2026-08-13 scoring change in Daybreak PR #42 — the retirement
of the `locallyMade` +25 bonus and its stock/delivery match reason, ruled by
Blake because origin and availability must not alter sleep-fit ranking. The
flag is data-only now; `tests/scoring_isolation_check.mjs` pins that the
engine may not reference it, and the mutation for the retired bonus retired
with it (fourteen mutations since). That change was an owner-approved engine
change shipped on its own PR with the fixture moved in the same reviewed diff
— it is the model for how such changes ship, and it does not open Phase 3.)*

### Phase 1 direction decisions — recorded 2026-08-07

**Evidence source:** Draft PR #18 (research/prototype only, DO NOT MERGE),
exact reviewed head `8e850c4`, Codex final narrow-review verdict PASS —
https://github.com/beford782/LacksFurniture/pull/18. These are Blake's
**direction confirmations for continued iteration**. They are not final
visual approval, content approval, Spanish approval, legal/compliance
approval, mounted-device evidence, production approval, or Phase 1
implementation authorization; no ◐/🔒/❓ mark below moves on their account.

**Evidence limitations, stated plainly.** The assisted-sales run behind
these decisions was a **solo expert walkthrough** — Blake played both the
operator and customer roles — in **English only**, assistant-transcribed
from Blake's stated observations, on a **hand-held landscape iPad**,
served from a temporary static mirror pinned to prototype commit
`c73324e`. It is not paired observation, not customer research, not
mounted-device evidence, and not Spanish evidence.

**Sleep Brief (feeds 1.1).** Direction confirmed for continued iteration:
need-led hero from `priorities[0]`, visible badge category labels, exact
firmness word + integer, always-visible testing guidance, no first-visit
Compare. Revision backlog before any final-layout approval:

- the firmness presentation reads like a score rather than a feel;
- the primary CTA does not clearly launch the next journey step;
- the journey rail underuses landscape space;
- the Sharing badge's value is questioned;
- minor sticky-action crowding requires a mounted-device re-test.
  *(Re-test done 2026-08-10: the owner ran the sticky-control crowding check
  on the mounted showroom device and it passed — no layout or interaction
  problem reported. The rest of this backlog stands.)*

**Results (feeds 1.3's navigation question).** Structural direction
confirmed for continued iteration: the tier tab affordance is retained
and restyled (the accordion exploration is rejected), with lead +
compact-support card hierarchy and page-local compare selection.
Presentation requires revision:

- increase useful imagery/graphics and reduce text-wall density;
- make comparison feel like a distinct destination/context;
- evaluate a drawer or similarly distinct comparison treatment;
- reassess Payment Choice visibility while preserving the fit-first
  hierarchy;
- provide evidence-backed substance explaining why one mattress differs
  from another and why that matters to sleep.

**Catalog-substance gate.** Catalog substance is the critical path before
Phase 1 implementation authorization. *(Overtaken 2026-08-12: authorization
was granted ahead of this gate by owner prerogative — see sequence step 7
below and the Phase 1 authorization block. The content gate itself stands.)*
**Blake Ford is the named Lacks
content owner and business approver as of 2026-08-07.** His next owner
task is disposition of the **24 Tier-D/E claim-risk rows currently
rendered in production** (the broader preliminary inventory flags 83
rows; see PR #18's authoring-brief appendix). *(Count stale as of
2026-08-14: PR #41 retired unsupported display claims on g6/g7/s3/g8/g9 with
total component omission, and PR #42 removed the unbacked availability
claims — re-derive the outstanding-row count from the current tree before
acting on it.)* A spec-card → evidence
record → AI draft → human approval workflow is a **proposal candidate
only**; nothing from it is approved to render. Personalized catalog
reasons remain absent and must continue to **fail closed by omission**
(1.3's reason gate is unchanged).

**Spanish decision.** The paired Spanish prototype usability pass is
**SKIPPED / DEFERRED BY OWNER DECISION for this prototype cycle** — not
completed, passed, failed, or validated, and no Spanish evidence is
inferred from the English walkthrough. Native-Spanish claim-equivalence
review remains required before any Spanish catalog reason content
activates; the existing bilingual contracts, strict EN/ES parity, and
no-English-fallback requirements are unchanged.

**Gates — current state (rewritten 2026-08-14; the original 2026-08-07
wording predated four closures).** Closed: 0.4's mounted-device evidence
landed and Phase 0 closed (both 2026-08-10); Phase 1 implementation was
authorized (2026-08-12); the Sleep Brief composition was approved and the
tier-tab direction settled (2026-08-14 — see the decision block below).
Still open: the native-Spanish claim-equivalence reviewer and the
legal/compliance reviewer (where claim class requires one) remain unnamed;
the claim-inventory disposition remains open (re-derive the outstanding
count — see above); every merged slice still requires device-matrix
verification and Blake's live review; and catalog schema, scoring changes,
and reason activation remain separately gated (Phase 3 and 1.3 as written).

**Mounted-device observations — 2026-08-12 (observations only, not
approval).** Recorded during the 2026-08-12 device-identity audit on the
confirmed mounted showroom device, deployed build `fd70747`, mounted
landscape orientation. These are owner observations for continued
prototyping; they are not visual approval, prototype approval, or Phase 1
implementation authorization, and no mark moves on their account:

- **The Sleep Brief reads as too textual** — in the owner's words, "just so
  textual with so many words, no pictures or graphics to intrigue" before
  mattress trials begin. Reinforces 1.1's need-led-hero direction and the
  imagery/text-density revision items.
- **The journey rail's use of landscape space was observed as good** on the
  mounted device — a mounted-device data point against the 2026-08-07
  hand-held observation that it underuses landscape. The backlog item's
  disposition stays with its approver; both observations stand, dated.
- **Glare and shared-viewing legibility: fine** under actual showroom
  lighting at the mount.
- **No touch-target, focus, or interaction concern** was noted this session.

**Recommended sequence from here** (no step below is complete unless
already marked so elsewhere):

1. Merge this roadmap-only governance update after review.
2. Blake dispositions the 24 production-rendering Tier-D/E claim rows.
3. Draft a small spec-card pipeline proposal, starting with the sibling
   mattresses that caused confusion in the walkthrough.
4. Name the native-Spanish and legal/compliance reviewers when activation
   work approaches.
5. Gather Phase 0.4 mounted-device evidence. **✅ 2026-08-10** — owner
   confirmed both data-error routes on the actual mounted showroom device
   (iPad Pro 11-inch, 2nd generation, normal mounted orientation); recorded
   in `docs/kiosk-device-hardening.md`. Phase 0 is closed.
6. Re-test sticky-bar crowding and comparison context on the mounted
   device. **✅ 2026-08-10** — owner confirmed the sticky-control crowding
   check and the complete two-card Compare selection, tray, and modal flow
   passed on the mounted device, with no layout or interaction problem.
7. Request explicit Phase 1 implementation authorization only after the
   remaining gates close. **Granted 2026-08-12** by owner directive ahead of
   the catalog-substance and reviewer gates — owner's prerogative; those
   gates and every item-specific gate stand unchanged (see the Phase 1
   authorization block).

### Phase 1 direction decisions — Nocturne owner review, recorded 2026-08-14

**Evidence source:** the Nocturne demo prototype, branch
`claude/demo-prototype-round`, exact reviewed commit `6fe1669` (Rev 3.1 plus
the handoff-clipping repair), entirely under
`prototypes/demo-round-2026-08-13/`. **Approver: Blake Ford, who approved the
recommended D1–D6 slate on 2026-08-14** after a read-only briefing comparing
the prototype against this roadmap and the deployed application. The
prototype branch remains research — its 17 commits are not merged wholesale;
approved directions are re-implemented as small canonical PRs under every
standing constraint (consume-never-re-derive, bilingual-by-construction,
config-driven copy, the output-regression fixture, and the device-matrix
merge gate).

**D1 — Sleep Brief composition APPROVED as the production 1.1 specification,
as corrected by the owner 2026-08-14.** This is the reviewed-prototype
approval 1.1's gate named, so **1.1's gate is lifted** (recorded on the
item). The approved composition: the fixed bilingual heading "Your Sleep
Brief" / "Tu Resumen de Sueño" is **retained as the screen's semantic heading
and 0.3 focus anchor**; "Made from *your* answers" / "Creada con *tus*
respuestas" may render as the **visible hero message beneath it** — a hero
message under the heading, not a replacement for it; the constellation hero
(D2) with the eyebrow "Your sleep signature" / "Tu firma de sueño"; the
engine's own composed reflection sentence rendered verbatim; the 1–3 computed
trial priorities as a **single-open** disclosure accordion (shipped `why`
prose plus the in-store `test` prose behind disclosure); and the forward CTA.
The quiz finish button becomes "See my sleep signature" (its bilingual pair
ships with it). The reveal animation performs **once**, at quiz finish only;
every re-render, re-entry and language switch redraws statically;
`prefers-reduced-motion` is honored. **Not approved: rendering any internal
archetype or profile nickname/subtitle customer-facing.** The prototype's
subordinate profile-subtitle chip is excluded from this approval and requires
its own separate bilingual approval before any surface renders it — this
keeps the standing fact below ("archetype nicknames never reach the DOM")
true.

**D2 — Sleep Signature constellation APPROVED as a production component**, in
the reveal and as the small stamp on the Results header and the Consultation
Summary card. It is answer-derived and strictly decorative: `aria-hidden`,
never an engine input, never a scoring surface. Per the 2026-08-12 permanent
ruling, no screen-reader text alternative is required.

*(Slice 2 clarification — owner rulings 2026-08-15, recorded with the
implementation of D1 + D2 under item 1.1. **Composition.** The heading is
retained and the ruled hero message renders beneath it; the constellation
carries its ruled eyebrow; the engine's reflection sentence is unchanged;
the 1–3 computed priorities become a single-open disclosure accordion whose
panel carries **both** the reason and the in-store testing prose (an earlier
reading that left the reason permanently visible was corrected by the owner);
the forward CTA keeps its owner-ruled "See My Matches →" label and Results
route, and Edit Answers is retained as a subdued secondary action. The quiz
finish control is relabeled "See my sleep signature". **Removed from the
customer-visible screen:** the answer-derived subtitle line, the summary
line, the meta strip, the reassurance line, the journey rail, and the
priority category tags. The subtitle's computation, its `analytics` fields
and its email fallback are preserved untouched — the ruling removed it from
the DOM only. **Excluded from this slice:** the firmness dial and signal
badges (neither approved nor rejected by D1, and optional), and the
2026-08-07 Sleep Brief backlog, both deferred. **Motion.** The Card Table
gather is retained as the production entry path; the constellation animates
only on the quiz-completion entry, while re-entry and language switches
redraw the identical figure statically; the retained legacy reveal fallback
was hardened so reduced motion advances straight to the Brief instead of
inheriting the staged overlay the gather would have skipped. **Copy** for the
new and surviving D1 chrome moved to the governed dictionaries; the unrelated
orphaned `profile.*` and `review.looks_good` keys are left for a later
cleanup by ruling. **D2 placements** all ship here — Sleep Brief hero,
Results header stamp, and a stamp-only addition to the Consultation Summary
whose layout, resolver, rows, priorities and copy are untouched.
**Repairs in-slice** (required by D1's own accessibility criteria): the focus
destination's suppressed indicator, and wipe ownership of every container the
recomposed screen renders into. **Fixture policy.** Both pinned fixtures and
both `BASELINE_SHA256` values are unchanged: the 572d405 Sleep Brief baseline
is retained as the historical *semantic* oracle for what survives the
recomposition, and the Phase 1 harvester was decoupled from the removed
meta-strip markup rather than re-baselined. The new D1 structural and
behavioral contract lives in `tests/sleep_brief_presentation_check.mjs`.)*

**D3 — Results-card direction APPROVED, as corrected by the owner
2026-08-14** (all within 1.3's Proceeds; both 1.3 gates stand): (a) the
hero-plus-support card hierarchy — the first entry of the active tier as a
large "Best match" card with the remaining entries compact — consuming the
engine's order at its indices; (b) the Gold/Silver/Bronze **tabs stand**,
retained and restyled (reaffirming 2026-08-07; the accordion replacement
stays rejected; no replacement is sought this cycle); (c) **percentage rings
are not approved for production** — the approved direction is **ordinal,
tier-relative match-strength language** (tier and position, never a naked
percentage), framed by the adopted relativity line "Match strength is
relative within each tier" / "La afinidad es relativa dentro de cada nivel"
wherever match strength is presented; the prototype's rings are
prototype-only. Origin display is omitted from the cards entirely for now.
Per-model personalized reasons remain absent and fail closed — 1.3's reason
gate is untouched by this decision.

*(Slice 1 clarification — owner-approved 2026-08-14, recorded with the
implementation. The role labels are exactly "Best match" / "Mejor opción",
"Second match" / "Segunda opción", "Third match" / "Tercera opción",
shipped as generic dictionary copy. The "entry-level" / "básico" Results
tier descriptor is removed without a replacement buyer label — the tier name
and the relativity line are the framing — and the long-dead
`results.tier_explainer` dictionary key, which carried the same retired
labels, is removed from both dictionaries. The synthesized
`buildMattressPriorities()` rows/chips stop rendering on the Results
mattress cards ONLY; the helper and its logic are unchanged, and its three
non-Results consumers — the drawer data, the Compare modal, and the HF2
Consultation Summary pick card — are untouched and outside this slice: this
is a Results-card presentation correction, not cross-surface reason or
claim work. The former `meetsMatchThreshold`-conditioned card copy ("Best
place to start" / "Additional comparison option" / "Matches your
priorities") is replaced by the index-only role labels, so the
below-threshold comparison cue is retired from the Results cards by this
decision — surfacing position, never selecting by the field; the
below-threshold cues that survive elsewhere (the HF2 pick card's line and
the Sleep System step badge) are untouched and remain later-slice
territory. *(2026-08-21: the relativity line shipped at 11px, below body size
for the one honest statement about tier-relative match strength; the
cross-cutting Trust integrity gate (block after 1.7) raises it to body size
with contrast and size assertions. Its wording, its semantics, the tabs, the
Gold-first default, the engine's order and everything else in this ruling are
unchanged — legibility only.)* Three further owner-directed repairs ship in the same slice: the
promotions offer cue now receives the engine's full qualified list instead
of a presentation-layer slice (behaviorally identical at the engine's cap
of 3; cue and cards can no longer diverge), a one-entry tier no longer
strands the "More directions to compare" heading over an empty support
grid, and a tier tap now restores keyboard focus to the newly rendered
active tab (renderTierTabs() replaces the activated button, which
previously dropped focus to the document body; the restore lives in the
tap handler, not the shared re-render, so the language-switch focus
policy — restoreLanguageFocus() — is untouched). The relativity line's
Slice 1 scope is the Results screen; the
drawer and Consultation Summary instances of match-strength presentation
belong to their own slices.)*

**D4 — Payment Choice state model ADOPTED, superseding 1.5's agenda model.**
The salesperson-marked "topics to discuss" agenda is replaced by two
observable dimensions: **`payExplored`** — an accumulating history of payment
paths whose governed details were deliberately opened (descriptive, never
intent) — and **`payPref`** — exactly one of: nothing selected, a single
provisional "currently considering" path, or an authoritative "Not right
now". Consider is deliberate and one-way (exploring never sets it); Clear is
the only way to unset a path preference and never erases history; "Not right
now" is a first-class current state whose handoff row suppresses the explored
list while preserving it internally. The durable protections carry forward
unchanged: session-only, never affects scoring or the Sleep Brief, excluded
from email and diagnostics beyond approved allowlisted events, wipes with the
session, never a qualification form, never a scoring input. **Adopted with
it:** the eight proposed envelope copy strings (Payment preference / Options
explored / Review this option / Hide details / Consider this option /
Currently considering ✓ / Clear preference / the exploration-consequence line
preserving the governed no-submission sentence verbatim) enter
`incoming/lacks_financing.json` through the pipeline — Spanish provisional
under the native-review gate — and the governed keys still carrying retired
agenda vocabulary are renamed in the envelope in that same adoption change.
*(Renames DONE, Slice 4 commit C1, output-identical — every value preserved
character-for-character: `agendaNotNow` → `preferenceNotNow`,
`interestNotNowAnnounce` → `preferenceNotNowAnnounce`,
`interestClearedAnnounce` → `preferenceClearedAnnounce`, `agendaDone` →
`sheetDone`.)*
*(Copy count corrected, 2026-08-17: the adopted set is NINE, not eight. The
2026-08-17 Slice 4 authorization added `preferenceNone` — "Not selected" /
"Sin seleccionar" — which the eight above had no way to express: the preference
row needs a value when nothing is selected, and leaving it blank would read as a
rendering failure rather than as a state. All nine shipped in commit C2; the
governed no-submission sentence is preserved character-for-character in both
languages and pinned by exact tests.)*

**D5 — Sleep Plan and Consultation Summary.** (a) The **Sleep Plan is
commissioned as a new production screen** (see the new item 1.7) between
comparison and the Consultation Summary. (b) **Explicit finalist-state
semantics are adopted app-wide**: Finalist ✓ (customer-chosen), "Recommended
starting point" (the engine's top pick, honestly labeled, never silently
promoted to finalist), and an honest "No finalist selected yet" — no surface
may silently substitute one state for another. (c) The prototype's
consultation-card treatment is **adopted as 1.6's Consultation Summary
direction**: store attribution from config, a status line, the finalist /
profile / test-priorities / compared / system rows, the payment-preference
and options-explored rows per D4, a bounded explanatory note varying on
finalist state × payment state, and no raw quiz answers.

**D6 — Confirmed prototype-only (not approved for production by this
decision):** presenter mode (its shipping mechanism is decided by the kiosk
hardening review, not defaulted to a query parameter); the visible
stale-financing governance band (a separate proposal — if pursued, production
gets its own dedicated governed key, not a reuse of `staleAnnouncement`;
register entry added); customer-recorded trial reactions (not built; the
prototype's own candidate for a next revision); the prototype's
`touchend`/`pointerdown` guard changes (touch handling changes still require
Blake's separate sign-off — Invariant 10); and any text wordmark or logo (no
logo asset exists in the repo; rendering one would fabricate a mark). The
prototype era's rule against staging financing verification state for
demonstrations is **not** a prototype-only note — it is permanent governance,
recorded as Invariant 11.

**What D1–D6 are not.** Not final pixel-level visual approval — every merged
slice still passes the device-matrix merge gate (both orientations, EN and
ES) and Blake's live review, as every shipped slice has. Not Spanish
approval — ES copy remains provisional until the consolidated end-of-
development native-Spanish pass (Invariant 12, owner ruling 2026-08-15;
before that ruling this gate blocked each slice). Not a
scoring, ranking, tier, threshold, cap, back-fill or firmness change — the
output-regression fixture holds. Not showroom-use authorization — device
hardening remains blocking.

**Approved slice order** (each its own small PR; merge order may adapt to
review findings): (1) Results tier-tab restyle + hero-plus-support card
hierarchy with the ordinal match-strength presentation (D3); (2) Sleep Brief
recomposition (corrected D1/D2 — constellation
component, then reveal composition; heading retained); (3) quiz visual/icon pass (1.2);
(4) Payment Choice model (D4 — envelope extension + validation, then sheet
interaction, then plan/handoff rows); (5) Sleep Plan screen (D5/1.7 —
finalist-state machinery, then the screen); (6) Consultation Summary, then
Welcome, drawer, email (1.6).

*(2026-08-21: by owner instruction, a **cross-cutting Trust integrity and
transparency gate** is inserted after (4) Payment Choice and before (5) Sleep
Plan — see the gate block after item 1.7. It is an integrity repair and a
prerequisite for the later customer-facing screens, not a new visual feature,
and it does not change the approved D1–D6 direction. Slice 5 had already begun
on `claude/nocturne-slice5-sleep-plan` (C0–C7, draft PR #53, unmerged) when the
gate was inserted; its branch work continues, and by owner ruling (2026-08-21)
it merges after the gate and integrates the resulting `main`. Nothing here
changes Slice 5's scope or exit.)*

### 1.1 — Sleep Brief ⬜

**Slice 2 merged 2026-08-16 (PR #46, merge `b05d47f`)** — the D1 recomposition
plus the D2 Sleep Signature. The status mark above still reads ⬜ ("approved to
build, not started"), which this merge contradicts; moving it is the owner's
call, not this slice's, so it is flagged rather than changed. Native-Spanish
approval remains deferred to the consolidated end-of-development review
(Invariant 12).

**Gate lifted 2026-08-14.** The gate read: approver Blake, unblocked by his
approval of a reviewed prototype, recorded here with the date, over two output
properties — replacing or subordinating the fixed bilingual heading with a
need-derived hero, and changing the screen's section order or top-level
composition. **Blake approved the reviewed Nocturne prototype's composition on
2026-08-14, as corrected in D1 (see the decision block above), which is
exactly that approval — in the *subordinating* form:** the fixed bilingual
heading "Your Sleep Brief" / "Tu Resumen de Sueño" is retained as the
semantic heading and 0.3 focus anchor, with the hero message beneath it; the
top-level composition changes per the D1 specification. Reviewed diffs
implementing that specification may ship both formerly-gated outputs. **Still
excluded:** rendering any internal archetype or profile nickname/subtitle
customer-facing — that requires its own separate bilingual approval (D1).
*(An earlier revision's Exit said "three layout properties" where the Gated
block named two — the Gated block was correct.)*

**Proceeds:** everything — the item is approved to build against the corrected
D1 specification. The firmness dial and signal badges from the older proposal
below are neither approved nor rejected by D1: the approved composition
governs the top level, and any of those elements returns only where it fits
that composition, under its own constraints (the dial renders the engine's
exact value; badges restate stored answers verbatim).

*(This item was previously ⬜ while its final design was transitively blocked by
the device matrix and carried an unmarked hard dependency on 0.5 in prose — a
worse under-block than the one that prompted this correction.)*

The central redesign. Reduce reading load and make the first five seconds useful
to a salesperson presenting it aloud.

Earlier proposal — **superseded 2026-08-14 by the approved D1 composition**
(kept for the constraints it recorded, which stand where their subject
survives):

- A **need-based hero** derived from the top priority, replacing the generic
  heading. (The heading today reads "Your Sleep Brief" / "Tu Resumen de Sueño".)
- Reuse the existing icon system; no new icon vocabulary.
- Concise **signal badges**: position, temperature, sharing, feel, size.
- The customer's firmness on a **visual 1–10 dial**. **Constraint:** render the
  existing computed value. No stops, no rounding, no rescaling — the number shown
  equals the number scored. Changing the scale is Phase 3.5.
- **1–3 priority cards** in the engine's existing order: icon, position, short
  title, one-line reason, and the testing detail behind progressive disclosure.
- A simple next-step rail. **One already exists** ("What happens next", three
  steps) — this is restructuring, not new computation.
- Keep **Edit Answers**. The results-handoff CTA also already exists —
  relabelled **"See My Matches →"** on 2026-08-10 (owner-authorized; it was
  "Compare My Matches" and claimed a comparison it never opened — see 1.6's
  reconciled Compare table).
- **No decorative photography on this screen.** This is a constraint, not a
  proposal.

**The priorities swap ships here, atomically.** The prose block is removed in the
same change that lands the cards; the customer never sees a Sleep Brief without
priority orientation. Requires 0.5 shipped, so the detail has somewhere to go.

**Two facts that lower the risk, kept separate from the design above.** The engine
already computes the top three priorities with the fields a card needs — a name, a
one-line reason, a testing prompt, and a kind (must-solve / worth-comparing / feel
preference). There is **no rank field**; ordering is by an internal score that is
never rendered, so "rank" is a display position, not data. And the testing prompt
is currently **fully visible** on the Sleep Brief, labelled "Try this:" — moving it
behind disclosure is a real reduction in visible words, not a relocation of
something already hidden.

**Exit:** the redesigned Sleep Brief ships the approved D1 composition on
`main` with the priorities swap atomic, any rendered firmness value being the
engine's own, and every accessibility criterion met — verified on the
confirmed hardware per the phase-wide merge gate. This item cannot be closed
by shipping prototypes; the 2026-08-14 approval opens implementation, it does
not close the item.

### 1.2 — Quiz ⬜

- Review all option icons for meaning **before** introducing any (47 since
  2026-08-12; 56 before the removal below). Suppress
  icons that are confusing, insulting, medicalising or merely decorative. An icon
  that characterises the customer is worse than no icon.
- No payment or budget question. No financing content.
- No scoring change hidden inside presentation work.

**Question removal — owner-ruled 2026-08-12 (12 → 10 questions; 9 visible on
the solo path).** Blake ruled after a full consumer audit: `sleep_quality`
and `current_mattress_age` removed. Both carried zero score tags;
`current_mattress_age` had no consumer of any kind (its answer was collected
and discarded), and `sleep_quality` fed only the Consultation Summary's
context row, which now builds from `trigger` alone. Removal is **not** a
scoring change: the engine ignores unknown answer ids, and the Phase 1
output-regression fixture is **byte-identical across the change** — the
executable proof that recommendations did not move. Changed together, per
the structure contract: canonical quiz source → workbook → bundle,
`QUIZ_CANONICAL` and `CONSULTATION_QUESTIONS` in `tools/validation.py`,
`resolveConsultationSummary()` and `QUESTION_ACCENTS` in `index.html`, and
the affected suite fixtures. Deeper cuts (any scoring question) remain
Phase 3.

**Question-transition accessibility — RETIRED by permanent owner ruling
(2026-08-12).** An earlier revision required a bilingual focus-and-context
announcement for question-to-question advance and called it "an acceptance
criterion, not an option." Blake ruled screen-reader / VoiceOver announcement
functionality **permanently out of scope** for this product; the work is
neither required, deferred, nor gated — it is out of scope, full stop. The
draft implementation (PR #39) was closed unmerged as a research record. What
survives the ruling, because it never depended on it: the same-screen guard
shipped in 0.3 stays; answer controls, touch behaviour, language switching,
session safety and Review behaviour remain protected by their suites; and the
sighted-user acceptance criteria (visible focus, contrast, touch targets) in
the accessibility section apply in full. Do not reopen this as a gate or a
deferred task.

**Remaining 1.2 work is visual:** the icon review above, and restyling the
quiz without changing scoring, answer structure, touch behaviour, or
navigation semantics. Auto-advance stays a separate locked journey decision —
see 3.4 🔒.

**Icon review — COMPLETE, and the ruling is ZERO icons (owner, 2026-08-16).**
The review the bullet above required has been done, and Blake ruled that the
Quiz displays **no option icons at all**. The honest ledger, recorded here so
the count is auditable rather than asserted:

| Outcome of the 47-mapping review | Count |
|---|---|
| Configured option-icon mappings reviewed | **47** |
| Pass the meaning test above | **18** |
| Fail it | **28** |
| Semantically deferred (neither clearly meaningful nor clearly harmful) | **1** |
| Introduced into the customer UI | **0** |

**"Passes the meaning test" is not pre-approval to render an icon later.** The
18 passing mappings are recorded as *reviewed and not disqualified*, nothing
more; introducing any of them is a new decision, not a resumption of this one.
The 47 dormant `icon` fields stay in `incoming/dreamfinder_quiz.json` → the
workbook → `data/quiz.json`, and `validate_quiz`'s requirement that every
option carry one stays in force — the data contract is unchanged, only the
renderer never reads it. Selective introduction of the 18, any new icon
vocabulary, deletion of the dormant fields, and cleanup of the orphaned
`.opt-icon` / `.option-btn` / `.options-grid` CSS are all explicitly out of
scope for Slice 3.

What the 28 failures fail on, with real examples from the shipped data:

- *Medicalising* — `nerve_pain → lightning`, `reflux → flame`,
  `back_pain → spine`, `hip_pain → pressure`, `allergies → sneeze`,
  `snoring → snore`. Clinical iconography on a furniture showroom floor.
- *Characterising the customer* — `body_type/petite → cloud`,
  `average → weight`, `athletic → support`, `plus → support`,
  `getting_older → aging`. These depict the shopper's body or age, which the
  meaning test above already calls worse than no icon.
- *Confusing* — `trigger/moving → family`, `trigger/upgrade → cloud`,
  `too_soft → couch`.
- *Merely decorative* — `trigger/browsing → smile`,
  `temperature/comfortable → smile`, `rarely → check`, and both `none → check`
  mappings.
- *Colliding* — one glyph carrying several unrelated meanings defeats the
  purpose: `flame` serves temperature/hot, sleep_issues/hot **and**
  health_conditions/reflux; `combo` serves sleep_position/combo and
  sleep_issues/tossing; `support` serves both `athletic` and `plus`; `weight`
  serves `average` and `extra_support`.

The one deferred mapping is `sleep_position/no_idea → question`: whether a
question-mark glyph dignifies "I'm not sure" or signals confusion is a copy
question, not an icon question, and it is not being answered here.

**Visual direction — owner-ruled 2026-08-16:** *"A refined consultation form,
not an illustrated card quiz."* Implemented as flat, restrained editorial
answer rows on the existing warm consultation palette. Preserved unchanged:
the eyebrow, the progress rule, the question headline and its italic accent
treatment, the help copy, option labels and sublabels, firmness behaviour, and
the manual Back/Next journey. Prohibited and absent: pictograms,
illustrations, badges, decorative checkmarks, shadows, gradients, ripples,
stagger, bounce, and any new selection animation. Labels keep the serif
treatment; sublabels were raised to 15px/1.45 for legibility.

**Grid — owner-ruled 2026-08-16:** `quizColsClass` emits `cols-1` for 1–3
options and `cols-2` for 4–8; the live Quiz **never** emits `cols-3`, and the
existing sub-700px one-column behaviour is untouched. The two-column cap
deliberately favours readable bilingual options over fitting the eight-option
question inside a 748px landscape viewport — the screen already scrolls, and
normal document scrolling is preserved (no nested option-grid scrolling, no
clipped choices, no obscured navigation).

**Authorized accessibility repairs (sighted-user criteria only — the
2026-08-12 screen-reader ruling above is untouched, and none of this is
question-transition announcement work):**

1. `aria-pressed` on every option button, single- and multiple-select alike,
   mirroring the stored answer exactly. The controls stay `<button>`s: no
   radio/checkbox roles, no arrow-key group semantics.
2. A non-colour selected cue. In normal rendering a 6px rail is reserved
   transparently at rest and painted on selection while the remaining boundary
   doubles to 2px, with padding compensation so no text moves. Under forced
   colours the treatment is deliberately different, because a transparent
   border is not guaranteed to stay transparent there and a reserved rail could
   paint on every option: resting options take a **uniform 1px boundary on all
   four sides, explicitly coloured `CanvasText`**, and the selected option a
   **3px frame with a 6px left rail, also explicitly `CanvasText`**. Pinning the
   colour on *both* rules is load-bearing rather than tidy: a uniform width
   alone still left the left edge carrying the base rule's `solid transparent`,
   whose visibility is the UA's choice; and a colour on the resting rule alone
   could never reach a selected option, because that selector is (1,2,1) and
   loses to the normal selected rule's author colour at (1,3,1). Both are
   padding-compensated to the same per-side totals (21/23/21/23 wide,
   18/19/18/19 at the narrow breakpoint, which carries its own forced-colours
   geometry). The rule is scoped to the active quiz screen and qualified by
   `.selected[aria-pressed="true"]` so it outranks the normal selected rule
   (1,4,1 against 1,3,1); `forced-color-adjust: none` is not used. No answer
   icon, no decorative checkmark.

   *An earlier revision of this slice shipped this cue as
   `.noct-quiz-option[aria-pressed="true"]` at specificity (0,2,0), which lost
   the cascade to the normal selected rule's `border-width: 2px` at (1,3,1) and
   therefore never applied — the paragraph above described behaviour that did
   not occur. Found in review and repaired; the regression test now asserts the
   cascade outcome and the per-side geometry rather than the presence of CSS
   text. **The forced-colours result is verified by static cascade analysis
   only — no forced-colours rendering environment was available, and it has not
   been visually confirmed.***
3. Visible focus. `.noct-quiz-option`, `.noct-quiz-back`, `.noct-quiz-next`,
   `.noct-review-edit` and `.noct-slider-track` joined the existing shared
   two-ring `:focus-visible` block and its CanvasText forced-colors fallback,
   in place — the anchored block's position is unchanged, because current
   suites depend on it. The firmness slider had removed its outline with no
   replacement; that is repaired.
4. 44×44 CSS-px interaction areas. Option rows (84/88/76px) and Next (~53px)
   already cleared the floor and are now pinned; Back (33px) and Review Edit
   (32px) did not and were raised. The slider gained a transparent 44px
   interaction band via vertical padding with the paint clipped to the content
   box — the ~20px painted thumb, the 1–10 values, stops, default, drag
   semantics and touch handlers are all unchanged. The band also carries
   `touch-action: manipulation`, as CLAUDE.md requires of every interactive
   element; it was missing when the band was first enlarged (found in review).
5. Keyboard-only focus restoration. `selectOption()` replaces the activated
   button, which dropped keyboard focus to BODY. Options now carry stable ids
   (`qopt-<questionId>-<optionId>`); focus is restored synchronously with
   `focus({preventScroll: true})` **only** when the outgoing element was
   `:focus-visible`, so touch (whose `ontouchend` preventDefault means the
   button never took focus) and mouse (focused but not `:focus-visible`) never
   enter the path. No timer, no `requestAnimationFrame`, and the shipped
   `onclick` + `ontouchend` handler pair is untouched.

Review rendering, layout, column count, content, order, copy and navigation
are **unchanged**; the only Review-adjacent changes are the Edit control's
44px floor and its focus/forced-colors styling.

**1.2 is not closed by this slice.** The item stays ⬜ until the Slice 3 PR is
merged AND the phase-wide device-matrix gate passes on confirmed hardware.
Desktop screenshots are not a physical-iPad pass.

**Both conditions are now met (recorded 2026-08-17).** Slice 3 merged as
**PR #47**, merge commit `5436deaea432ec87eb6b4d9f06cd82a85fb1910c`, and its
manual gates — the desktop keyboard/zoom/reduced-motion pass, the Windows
forced-colors visual check, and the physical mounted iPad Pro 11-inch pass in
both orientations and both languages — **passed**. 1.2's presentation work is
therefore closed; the item's remaining ⬜ scope is the icon programme, which is
content authoring rather than engineering. Native-Spanish linguistic approval
remains deferred to the consolidated end-of-development pass (Invariant 12) and
is **not** a Slice 3 gate.

*(2026-08-21: two shipped defects inside this item's territory are repaired
under the cross-cutting Trust integrity and transparency gate (block after 1.7):
the question-change scroll position and keyboard-focus placement inside the
quiz — after Next on a tall question the next headline rendered above the
viewport and focus fell to the document body — and the truth of the
per-question `helpText` against the engine. The scroll/focus repair is
sighted-user work under the surviving clause above (visible focus, viewport):
no announcement, no live region, no timer. It does not reopen the retired
2026-08-12 question-transition-announcement item. The copy repair is
copy-only through the canonical pipeline and moves no score tag.)*

### 1.3 — Results and mattress cards ◐

*(The heading previously also carried ❓, which contradicted its own Proceeds
list: ❓ means do not implement, while Proceeds authorises implementation. The
document already says globally that named components are proposals unless an item
says otherwise, so the second mark added nothing but the conflict.)*

**Gated** — two outputs, each with its own unblock condition. Neither may appear
in a merged diff until its condition is met.

- **Reason-led per-model personalisation.** Approver: Blake; unblocked by
  populated per-feature catalog reason content. Gated output: any rendered card,
  drawer or summary string presenting a per-model "why this fits *this customer*"
  reason. Across all 26 models every per-feature reason column is empty
  (re-verified 2026-08-14); the generic default is populated on only 14 of the
  26, and the other 12 carry no reason text at all — so **placeholder, sample,
  authored-in-app or generic-default text standing in for that content does
  not lift the gate** — a diff adding such a string *is* the gated output, not
  a step toward it.
- **Adoption of a replacement tier navigation.** Approver: Blake; unblocked by his
  approval of a reviewed prototype. *(Resolved for this cycle 2026-08-14: Blake
  recorded that **the tabs stand** — retained and restyled, accordion rejected,
  no replacement sought (D3, reaffirming 2026-08-07). The gate stays as
  written for any future replacement; a merged replacement would remain this
  gated output.)* Gated output: a merged diff in which the tier
  tab affordance is no longer the shipped Results navigation. Prototypes and
  unmerged branches are not this output. Any replacement must preserve tier
  identity and membership, the internal keys, within-tier ordering, per-tier
  percentage computation, the qualification threshold, the result cap and the
  back-fill; introduce no mixed cross-tier ordering; avoid presenting tier leaders
  so as to imply cross-tier ranking; and handle `tier_view` in the same change.
  **This gate does not wait on 3.3.**

**Proceeds:** card hierarchy and scannability of distinguishing features; removing
buyer-characterising labels; keeping sleep fit visually dominant over financing;
restyling the current tier tabs; and **prototyping** replacement tier navigations,
including grouped, stacked and accordion layouts. Each must read correctly against
**today's** content — that is, with the generic default reason present on only
14 of 26 models and no reason text at all on the other 12 — and
must leave the shipped tab affordance in place until the adoption gate lifts.

*(2026-08-14: the approved direction for this Proceeds work is D3 in the
decision block above — hero-plus-support hierarchy at the engine's indices,
tabs restyled, and ordinal tier-relative match-strength language framed by the
relativity line; percentage rings are not approved for production, and origin
display is omitted from the cards entirely for now.)*

- Rework the card hierarchy so a salesperson can present it at a glance.
- Lead with **why this fits this customer**, not a wall of generic features.
- Make distinguishing features scannable.
- Avoid labels such as "entry-level" that characterise the buyer rather than the
  product.
- Keep sleep fit visually dominant over financing.
- Prototype and verify at the real device matrix — see the accessibility and
  showroom section, and note the matrix is an open dependency.

**The reason content is catalog authoring for Lacks, not engineering.** It should
start early because it gates the most valuable part of this redesign. Reasons must
be accurate, product-specific, bilingual, and safe for a salesperson to repeat.

**Tier navigation — resolved for this cycle (2026-08-14): the tabs stand.**
Blake recorded the tabs as retained and restyled; no replacement is sought
this cycle, and the adoption gate stays as written for any future one. The
analysis below is kept because it corrects an earlier wrong claim and governs
any future replacement proposal.

An earlier draft claimed removing the tab affordance forces Results into a single
cross-tier ordering. **That was wrong**, and the correction matters because it was
being used to defer a presentation decision into Phase 3. The per-tier data is
built for all three tiers unconditionally, before any tab exists; the active tier
is only a lookup key. A grouped, stacked or accordion presentation can therefore
drop the tabs while preserving tiers, tier keys, within-tier order, per-tier
percentages and the per-tier qualification threshold — no cross-tier ranking
required, and no engine change.

Two real constraints remain, and they are not the one that was claimed:

- **The honesty hazard is real but narrower than an earlier draft claimed, and it
  is a design constraint rather than a blocker.** That draft said stacking puts
  three incomparable percentages in one viewport. **No match percentage is
  rendered on any screen.** The percentage is computed per tier and reaches the
  customer only through the results email; on screen the cards carry a qualitative
  line, and the drawer and compare modal show the tier name. The genuine instance
  of cross-tier incomparability is the **email**, which already lists saved picks
  from different tiers with their per-tier percentages adjacent — today, with tabs
  in place. Tabs never protected that surface and no tier-navigation change
  touches it. What a stacked layout does raise is **rank adjacency**: three tier
  leaders side by side, each presented as its tier's best, inviting a comparison
  the tiers do not support. That is a checkable property of a layout, so it
  belongs in the adoption gate's criteria — not in a phase dependency.
- **`tier_view` has exactly one call site — inside the tab switcher.** A layout
  that removes tab switching must delete that call site or the switcher containing
  it. **But the guard is a static text sweep, not a runtime observation.** It
  fails with `DEAD ENTRIES: tier_view` only if the literal `analytics.log` call is
  removed from source; leaving the switcher defined but unreachable keeps the
  suite green. The tree already proves this — two events are declared in
  `EVENT_FIELDS` whose only call sites sit inside a function the suite itself
  pins as never called, and it passes today. So the guard catches a source-level
  deletion, not a reachability regression, and nothing proves `tier_view` is ever
  actually emitted. A replacement presentation must therefore **intentionally**
  retire or replace the event and add behavioural coverage suited to the new
  interaction; CI will not do that thinking for anyone. (`tier_view` is separately
  pinned behaviourally for enum redaction, which is a different guarantee.)

**What is Phase 3.3, not Phase 1:** a global maximum score, any mixed cross-tier
ranking or single merged list, removing or merging a tier, changing which tier a
model belongs to, and changing the qualification threshold, the result cap or the
back-fill.

**Two effects, not one cascade.** The displayed/flagged basis and the
qualification basis are computed **separately**, in different functions. Changing
the first alone changes the computed percentage — which reaches the customer only
in the email — *and* the on-screen best-match/comparison copy, since the same
value drives that flag; it does **not** change which models appear. Membership
changes only if the qualification maximum or its threshold changes. Both are Phase
3.3, for different reasons: the first changes what the customer is told about fit,
the second changes what is recommended. Note also that the qualification helper is
**shared with the Sleep System**, so a change made inside it is not
mattress-scoped.

**None of this gates a Phase 1 presentation that leaves all of it unchanged.** If
3.3 later adopts a global maximum, a preserving Phase 1 layout is restyled, not
rebuilt; that rework risk is a cost to weigh at approval, not a bar on
proceeding.

**Internal keys `gold` / `silver` / `bronze` are not in scope for either.** The
catalog JSON is keyed by them; results state and every tier surface — tabs,
descriptors, drawer, handoff cards, comparison view, price symbols, CSS custom
properties — keys off them; the `tier` analytics enum enumerates them and **two**
events carry them (`tier_view` and `save_pick_toggle`); saved picks carry a tier
the Consultation Summary consumes; and tests pin the catalog split, the enum
redaction, the `tierViews` wipe and a no-re-tier assertion.

**They are not carried by the session summary or the email.** The session-safe
summary returns counts only, the email's match map reconstructs each entry without
a tier, and `Code.gs` has no reference to tier at all. An earlier draft asserted
both; neither is true.

**Exit:** the card hierarchy is presentable at a glance, distinguishing features
are scannable, no label characterises the buyer, and sleep fit reads as dominant
over financing. **Excluded until their gates lift — both, separately:** (1) any
card that leads with a per-model "why this fits" reason, and (2) any replacement
for the tier tab affordance. Shipping the unblocked portion does not close this
item: the reason-led card is the point of the redesign. *(The tier-navigation
clause is satisfied: Blake recorded that the tabs stand, 2026-08-14.)*

*(2026-08-21: the D3 relativity line's legibility — 11px → body size — is
repaired under the cross-cutting Trust integrity gate (block after 1.7; see
the D3 clarification in the decision block). CSS only; it touches neither
gated output and edits neither list above.)*

### 1.4 — Sleep System ⬜

The largest reading load in the app.

- Rebuild feature cards for salesperson-led scanning: customer benefit first,
  product distinction second.
- **Separate customer-facing benefit from salesperson procedure**, and reduce
  repeated instructions and disclosure prose.
- Keep product distinctions and selection state clear. Do not compress so far that
  materially different products become indistinguishable.
- **Prices:** accessory prices are displayed today and stay as they are. Phase 1
  adds no new price surface, and this bullet does not license one — see Phase 2.

### 1.5 — Financing footprint ✅

- **The Payment Choice model is the 2026-08-14 exploration/preference model
  (D4) — the agenda model is superseded.** An earlier revision of this bullet
  mandated keeping the salesperson-marked "topics to discuss" agenda as built;
  Blake superseded that on 2026-08-14 after the Nocturne review (the framing
  itself was retired in an owner live-conversation ruling during prototyping).
  The adopted model and its adoption requirements are recorded once, in D4 in
  the decision block — implementation replaces the agenda interaction with
  the explored-history + single-provisional-preference (or authoritative "Not
  right now") model, shipping the approved envelope copy through the pipeline
  and renaming the retired-vocabulary governed keys in the same change. The
  durable protections the old bullet carried transfer unchanged: state is
  session-only, never affects scoring or the Sleep Brief, is excluded from
  email and diagnostics beyond approved allowlisted events, and wipes with the
  session. **Still prohibited:** an interested/not-interested classification,
  a qualification form, or a scoring input. (A recorded *provisional
  preference with an explicit Clear* is the adopted design; it is not the
  prohibited interest classification, and it still never reaches email or
  unapproved diagnostics.)
- **Config-disable** duplicate financing content in the mattress drawer and the
  Sleep System. Prefer disabling to deletion: Phase 2 may want a per-product price
  anchor on the drawer, and retiring the placement values from the closed
  analytics enum would then have to be undone.

  **Enum retirement is deferred**, and the reason is not the one an earlier draft
  gave. Config-disabling a surface does not remove its call site, so retiring
  those values would retire values the shipped source still passes — and **nothing
  catches that**. Invariant 7's set-equality guard compares logged event *names*
  against `EVENT_FIELDS` *keys*; it never inspects enum values, and both surfaces
  log an event that stays logged from the results and handoff paths regardless. At
  runtime an unlisted value is silently dropped with only an anonymous count —
  the same drift 0.1 closed at the event-name level, still open at the value
  level. Invariant 7 governs event and field sets and says nothing about value
  sets; **that gap is the reason to defer, not a reason to proceed.**

  Protection across the enum is uneven rather than uniform: two values are
  load-bearing in behavioural assertions in `tests/session_async_check.mjs` and
  would fail the suite if retired; the other four, including one of the two this
  bullet contemplates retiring, are pinned by nothing. Retire only when Phase 2.2
  confirms the surfaces are permanently unused **and** the call sites go in the
  same change.
- Keep financing orientation separate from sleep-fit scoring (Invariant 1).
- Make financing concrete through eventual verified price grounding, not by
  repeating vague financing copy everywhere.

**SLICE 4 MERGED AND DEPLOYED — item 1.5 closed 2026-08-20.** PR #51 merged as
**`b2acd7e`** (a merge commit; parents `5436dea` + `ee6e402`, the fourteen-commit
correction history deliberately preserved rather than squashed, and the source
branch `claude/nocturne-slice4-payment-choice` kept). The condition this block
previously stated has been met in both halves — the PR merged **and** all four
manual gates passed. Neither half was waived.

*Final reviewed head.* **`ee6e402`** — CI `Full suite (18 checks)` green at
exactly that head (run 32381397192), and an external Codex review of exactly
that commit returned no findings, with zero unresolved review threads.
Post-merge CI on `main` (run 32388655153) is green at exactly `b2acd7e`.

*The gates, and why they still apply to what merged.* All four passed on
**2026-08-20**, owner-reported by Blake on real hardware — they are manual
findings, not automated ones, and were not independently observed or reproduced
by the implementation. They were performed against **`305fb41`**, one commit
below the merged head. They carry forward because **C13 changed validator and
test infrastructure only**: all **25 protected customer-facing artifacts are
byte-identical** between `305fb41` and `ee6e402`, `index.html` included, so the
bytes the gates ran against are the bytes that merged. That is a byte-identity
proof, not an assumption that a test-only change must be harmless.

*Deployment.* Pages built from **exactly `b2acd7e`** (run 32388653613; build
record `status=built commit=b2acd7e`) and serves
https://beford782.github.io/LacksFurniture/. Deployed smoke passed: 12 of 12
served files byte-identical to the repository blobs at `b2acd7e`, with
`index.html` at the same hash proven identical to `305fb41`; all 14 D4 required
copy keys served and none of the 10 retired keys; promotions still the inert
contract; the demo route reachable; and the white-label boundary intact in the
served bytes.

*What this does NOT close.* **Spanish remains PROVISIONAL** under
`esReviewStatus: "pending-native-legal-review"` and may not be described as
native-reviewed anywhere; per Invariant 12 that pass is consolidated to the end
of development and was never a merge gate for this slice. **Kiosk hardening
independently blocks showroom authorization** — see
`docs/kiosk-device-hardening.md`. A verified preview deployment is not showroom
readiness, and ✅ on this item does not assert that it is.

**What shipped.** The agenda interaction is replaced by the D4 model in one
atomic runtime change (commit C2), preceded by test hardening (C0) and an
output-identical key rename (C1), and followed by the surface policy (C3) and
this documentation (C4).

*The model.* Two observable dimensions and nothing else — `payExplored`, an
ordered de-duplicated history in first-deliberate-open order, and `payPref`,
exactly one of null / a canonical path id / `not_now`. `payOpen` is a third
variable but NOT a third dimension: ephemeral disclosure state, invisible to the
handoff, the email, the diagnostics and the recorded position.

*Canonical path identity.* Path ids are now `kind '-' <injective escape>` rather
than a slug. This is a correctness fix, not a tidy-up: the retired slugifier
collapsed `"Synchrony Bank"`/`"Synchrony-Bank"`, `"Synchrony"`/`"SYNCHRONY"`
(two distinct provider groups), an accented provider against a punctuated one,
and a provider literally named `"General"` against a promotional group with no
provider — so two payment paths could share one preference row and one set of
DOM ids, and a customer's Consider could land on a path they did not pick. The
old ids also embedded a colon, which `getElementById` tolerates but
`querySelector` parses as a pseudo-class. `tools/validation.py` mirrors the
encoder and refuses a config whose derived path ids collide.

*Interaction.* A native button plus a hidden panel per path (`aria-expanded`,
`aria-controls`) — deliberately not `<details>`/`<summary>`, because the sheet's
focus trap would exclude a `<summary>`. Consider is one-way and carries no
`aria-pressed`; the considering marker is a non-interactive span; Clear is a
separately named subordinate action; "Not right now" is the one genuinely
reversible two-state control and is the only one with `aria-pressed`. A stale
path stays fully reviewable — its disclosure reveals the governed `staleNotice`
instead of rates and terms.

*Isolation.* Payment state reaches no score, ranking, tier, match reason,
priority, Sleep Signature, Sleep Brief, result order, email, GAS payload,
`Code.gs`, diagnostic or session summary. `financingExplored` and the
state-specific `emailBody` key are deleted; the email's financing row is the
neutral `emailBodyAvailable` in every state. `financing_agenda_changed` and
`financing_agenda_reviewed` are retired outright from both their call sites and
`EVENT_FIELDS`, with no replacement — D4 adds no telemetry at all.

*Surfaces.* `financing.surfaces` config-disables the drawer and Sleep System
duplicates. The markup, renderers, call sites, CSS and the `placement` enum
values all stay; only the flag decides whether they render, and a MISSING flag
means enabled so a deployment predating the field is unaffected. This is the
resolution of the "enum retirement is deferred" bullet above — the surfaces go
dormant, the enum values do not move.

**Owner rulings recorded (2026-08-17, all implemented as written).**

1. The adopted copy "Payment preference" / "Preferencia de pago" is preserved
   verbatim. The validator's payment-claim guard learned exactly that
   collocation — the copy did not learn the guard. The addition is narrow:
   `preference` neutralises a payment noun only in that two-word phrase, and
   "Payment-preference", "Preferencia del pago", "Preference of payment" and
   "Preferencia de pago mensual" all still fail, as does every
   previously-rejected benign phrasing.
2. Exactly two durable dimensions. No `payCleared`, no fourth durable variable,
   no second cleared sentinel; clear announcements are transient action effects
   in a dedicated live region. `payOpen` is permitted solely as ephemeral
   disclosure UI state.
3. D4 rows land on the EXISTING handoff only. The Sleep Plan screen and its
   payment row remain Slice 5 (item 1.7) and appear nowhere in this change.
4. Four governed keys renamed, values preserved character-for-character:
   `agendaNotNow` → `preferenceNotNow`, `interestNotNowAnnounce` →
   `preferenceNotNowAnnounce`, `interestClearedAnnounce` →
   `preferenceClearedAnnounce`, `agendaDone` → `sheetDone`.
5. Nine governed bilingual keys added: `paymentPreferenceLabel`,
   `optionsExploredLabel`, `reviewOption`, `hideDetails`, `considerOption`,
   `currentlyConsidering`, `clearPreference`, `exploreConsequence`,
   `preferenceNone`. The governed no-submission sentence is pinned verbatim in
   both languages by exact tests.
6. Ten keys retired in the same atomic runtime change: `agendaMark`,
   `agendaMarked`, `agendaPrompt`, `agendaConsequence`, `agendaEmpty`,
   `agendaDismissed`, `agendaChange`, `resultsAsk`, `drawerMark` and the
   state-specific `emailBody`. The hardcoded "Review agenda (N)" /
   "Revisar agenda (N)" output is gone. Results retains ONE governed
   "Explore payment options" CTA; the obsolete duplicate button is removed, as
   are the drawer's and the handoff's duplicates. 34 → 33 copy keys.
7. Not-right-now transitions: null → not_now; a selected path → not_now;
   not_now pressed again → null; Consider from not_now → that path. History is
   never erased by not_now or by clearing it, and Clear applies only to the
   exact currently selected path.
8. `payExplored` uses first-deliberate-open order and is de-duplicated.
9. Not-right-now suppresses explored history **only** in the handoff
   presentation. History is preserved internally; nothing is hidden or
   suppressed on Results or in the sheet; undoing it restores the row exactly.
   *(Wording corrected 2026-08-17 after review. An earlier draft said Results
   and the sheet "are unchanged", which is over-broad: when a path WAS the
   preference, pressing Not right now necessarily re-renders that card —
   the considering marker and Clear revert to Consider — because ruling 7
   makes not_now replace the selected path. That is the ruled behaviour, not
   an exception to it. What ruling 9 forbids is SUPPRESSION outside the
   handoff, and there is none.)*
10. A stale promotional path remains reviewable, its disclosure revealing the
    governed `staleNotice`. No visible stale-governance band was added and
    `staleAnnouncement` was not reused for a new visible surface (D6 stands).
11. The short shell/config cache-skew window is ACCEPTED. No compatibility
    aliases were added; the manual device card below carries an explicit
    hard-reload step because of it.
12. `financing_agenda_changed` and `financing_agenda_reviewed` retired
    atomically, call sites and `EVENT_FIELDS` together, with no preference,
    path, Consider, Clear or Not-right-now telemetry added. The four neutral
    events survive: module impression, whole-sheet open, official-link click,
    Mexico detail open.
13. Payment state is entirely excluded from email.
14. The surface disable ships in this PR as its own commit, with the dormant
    markup, renderers, call sites, CSS and enum values all preserved.

**Four further owner rulings, 2026-08-17 — the open questions the independent
reviews raised, put to Blake and answered.** None required a code change; the
implementation stands as shipped. They are recorded because each closes a
question a future reviewer would otherwise reopen, and because "we looked at it
and decided" is worth exactly nothing if it is not written down.

15. **Consider stays available without expanding the path's details.** The plan
    detail and disclosure moved inside the collapsed panel in Slice 4; before
    it they were always visible on the card. Ruling 10 authorised the
    disclosure MECHANISM and did not address this, so it was put separately.
    **Ruled: leave as-is.** Nothing is submitted, no application starts, no
    exact terms are agreed, and the governed `disclosureFooter` renders in
    every state at the bottom of the sheet. While `exactPromotionsEnabled` is
    false the panel shows the generic `staleNotice` in any case. The two
    alternatives were considered and declined: gating Consider on a prior
    expand would make a salesperson-led choice impossible without a step that
    means nothing to the customer, and auto-expanding on Consider would move
    layout under the customer at the instant they act.

16. **Ruling 8 is confirmed as written, not widened.** The governance review
    read Consider's `payRecordExplored(id)` as widening "first-deliberate-open
    order", because a path chosen on the salesperson's word and never opened is
    recorded as explored and then surfaces under "Options explored" once Clear
    is pressed. That behaviour is the STATE-MACHINE CONTRACT verbatim
    ("Considering X ensures X is explored and sets payPref to X"); the reviewer
    did not have that clause. **Ruled: keep as specified.** "Explored" means
    "this path was on the table", which is the more useful record for a
    salesperson resuming the conversation. The alternative — Consider setting
    the preference without recording history — would leave a considered-then-
    cleared path with no trace on the handoff at all.

17. **The Consider announcement keeps reusing `currentlyConsidering`.** The nine
    adopted strings contain no dedicated "considering" announcement, so the
    runtime announces the marker's own copy ("Currently considering ✓" / "En
    consideración ✓") into the sheet's action region. **Ruled: keep the reuse;
    no tenth governed key.** No new copy enters the pipeline and no further
    provisional-Spanish string joins the consolidated native pass. The ✓ glyph
    reads oddly as speech, which is immaterial: screen-reader function is out of
    scope by the permanent 2026-08-12 ruling, so nothing depends on how it
    sounds.

18. **The desktop mouse-focus question waits for the desktop gate.** The
    accessibility review argued that a mouse click drops focus to `<body>`
    outside the sheet's focus trap, because `payFocusOrigin` declines to restore
    when `:focus-visible` is false; the implementation could not reproduce it
    deterministically, and touch and keyboard are unaffected. **Ruled: do not
    pre-emptively change it.** It stays an explicit item on the desktop manual
    card with the exact reproduction to run. If it reproduces, the decision is
    taken then with evidence — relaxing the ruled "keyboard-visible focus"
    condition on a reviewer's inference plus a failed reproduction is the wrong
    order.

**Spanish is PROVISIONAL.** Every ES string added here is unreviewed by a native
speaker and ships under `esReviewStatus: "pending-native-legal-review"`. Per
Invariant 12 that is not a merge gate for this slice; the consolidated
native-Spanish pass at the end of development is where it is settled. Nothing
in this slice may be described as native-reviewed.

**Verification (automated, all zero failures), as executed on the merged tree.**
Every count below is the current total at the Slice 4 merge; where a figure is
written `before → after`, the first is the count at base `5436dea` and the
second is current. Payment Choice 420 (new suite,
replacing the retired handoff-interest suite); financing renderer 97 → 319;
financing copy policy 95 → 215; scoring isolation 71 → 247; session safety
489 → 535; session async/privacy 216 → 283; email gating 19 → 96; phase 1
output regression 65 → 72; `tools/validation.py --self-test` 757 → 951; smoke
112 → 116; financing totality 3395; Daybreak contract 87; lineage 10; QR
payload 188; contrast 90; financing taxonomy 102; financing URL 53;
exact-promotions policy 45; claim retirement 53; integrity repairs 17; quiz
presentation 176; results presentation 83; Sleep Brief presentation 134;
compare modal 65 and entry 75; construction reveal 102; drawer lifecycle 44;
motion 202; data-error recovery 331; consultation priorities 219 and summary
94; email priorities 96; Daybreak demo runtime 54 and server 23; strict golden
bundle PASS; converter 16; canonical 14; reverify 25; workbook validation OK
with warnings-as-errors. **Mutation sweep 301/301 caught, 0 survived, 0 did not
apply** (244 before; this figure read 294 when written at C4 and moved with
C7–C13). The Phase 1 recommendation fixture and its pinned `BASELINE_SHA256` are
byte-identical.

The last of those entries is C13's, and it is the one worth remembering: it
restores a bypass in `tools/validation.py` and is caught by the **validator's
own self-test**, because no runtime suite can observe that class of defect at
all. It lives in what the build *admits*, not in what the page does — which is
exactly how it survived every green suite until an external review found it.

**Manual gates — ALL FOUR PASSED 2026-08-20.** Run and reported by Blake on
real hardware. They are manual findings: not automated, covered by no suite, and
not independently observed or reproduced by the implementation. Each gate's
description is preserved as written below, with its outcome recorded against it,
so the scope of what was actually checked stays legible.

1. Desktop keyboard / zoom / reduced-motion / manual modal lifecycle —
   **PASSED.** The ruling-18 mouse-focus escape did **not** reproduce. The
   finding therefore stays *recorded, not fixed*: one manual pass that fails to
   reproduce a defect is not proof of its absence, and ruling 18 stands.
   **Carry one specific unresolved item into this gate.** An independent
   accessibility review argued that a MOUSE click on a Payment Choice control
   focuses it without matching `:focus-visible`, so `payFocusOrigin` declines to
   restore, the control is destroyed by the rerender, and focus falls to
   `<body>` — outside the sheet, where the modal trap's listener cannot see Tab.
   It was reasoned from documented UA behaviour, not observed, and an attempt to
   reproduce it in Chrome was inconclusive: `:focus-visible` after a programmatic
   `focus()` follows the page's current input modality, which the reproduction
   could not isolate. Touch is unaffected either way (`ontouchend` preventDefaults,
   so the control never takes focus and the identity gate declines for a
   different reason), and keyboard is unaffected. So this is a DESKTOP-REVIEW
   question, not a kiosk one. **Check it explicitly:** with a mouse, click
   Consider, then press Tab, and confirm focus stays inside the dialog. If it
   escapes, the fix is to let restoration turn on origin identity alone and
   leave the ring to the browser — but that relaxes the ruled "keyboard-visible
   focus" condition, so it is Blake's call and not the implementation's.
2. Windows forced-colors visual check — **PASSED, rendered.** This closed the
   gap the gate existed for: the automated coverage is STATIC CASCADE
   ANALYSIS of the shipped stylesheet, not rendered verification, and until this
   pass no forced-colors rendering environment had been available and nothing
   claimed a cue was seen.
3. Physical mounted iPad Pro 11-inch, portrait and landscape, EN and ES —
   **PASSED.** Run against the card
   below.
4. Owner live review — **PASSED.**

Screen-reader / VoiceOver verification remains OUT OF SCOPE by the permanent
2026-08-12 owner ruling. The automated semantic checks still apply.

**Manual iPad card — Slice 4.** Run on the confirmed mounted device (the matrix
recorded under 1.2's device section), in both orientations and both languages.

0. **Hard-reload before testing.** The app shell and `data/store-config.json`
   are fetched separately, so a warm cache can pair a NEW shell with an OLD
   config for a short window — new code reading retired copy keys, or old code
   reading keys that no longer exist. That window is accepted rather than
   papered over with compatibility aliases, which is exactly why this step is
   first: a stale-cache reading is not a defect finding.
1. Single tap on Review, Hide, Consider, Clear and Not right now — each fires
   once, no double fire, no sticky hover state left behind.
2. No stale focus ring under hybrid keyboard + touch: activate one control with
   a keyboard, then TAP a different one, and confirm the ring does not jump
   back to the first.
3. State survives rotation and an EN/ES switch: the same paths stay explored, in
   the same order; the same preference stays selected; open panels stay open.
4. Spanish wrapping: "Considerar esta opción", "Quitar preferencia",
   "Preferencia de pago" and "En consideración ✓" wrap without horizontal
   overflow, including at 200% zoom.
5. The sheet footer and the card actions remain reachable — nothing is pushed
   out of the scroll area.
6. Not-right-now suppression and recovery: with paths explored, press Not right
   now and confirm the explored row disappears from the handoff; press it again
   and confirm the row returns unchanged.
7. Idle Continue preserves the payment state.
8. Timeout and "Start new customer" clear it completely — reopen the sheet and
   confirm nothing is explored, nothing is preferred and no panel is open.

If a gesture test exposes a defect that would require changing the established
touch-handler architecture, STOP: that is Invariant 10 and D6 territory and
needs its own authorization.

### 1.6 — Consultation Summary, Compare, and the remaining screens ⬜

**The Review screen stays complete and fully editable.** That is the approved
default, not a pending question, and it does not hold this item open. Compressing
or removing it is a separate locked decision (see the register) that only Blake
may take, on observed-session evidence. Restyling that preserves every answer and
every correction path needs no approval.

Customer-facing terminology in this document is **Consultation Summary**. Internal
handoff element ids may remain until a separately approved refactor. The analytics
`placement` value `handoff` stays as-is by policy — note that unlike two other
values in that enum it is not pinned by any test, so the constraint is a decision
recorded here, not a guard that would catch a change.

**Consultation Summary.** Because the salesperson is already present, this is not
the moment a human enters the journey — it is where the conversation is concluded
and continued. It should carry the customer's most important sleep needs, the
finalists to compare, testing priorities, the payment-preference and
options-explored rows (per the adopted D4 model — an earlier revision said
"the selected Payment Choice discussion topics", which the 2026-08-14 decision
superseded), next steps, and save/send options where operationally available.

*(2026-08-14, D5c: the Nocturne consultation-card treatment is the adopted
design direction for this screen — store attribution from config, a status
line carrying the explicit finalist state, the finalist / profile /
test-priorities / compared / system rows, the D4 payment rows, a bounded
explanatory note varying on finalist state × payment state, and no raw quiz
answers. This is direction, not shipped work; the exit below is unchanged.)*

It carries content added additively by 0.5 under an explicit no-new-component
constraint, and content substituted in place by 0.6. **1.6 owns the design
direction for this screen and must re-decide 0.5's provisional presentation** —
that presentation ships as a deliberate constraint, not as an endorsed layout, and
1.6 is not complete while it stands unreviewed. **Phase 0's exit does not depend
on this design.**

**Exit:** the Consultation Summary, Welcome, the mattress drawer and the email
each ship their reworked presentation on `main`, **or** carry a no-change decision
explicitly approved by Blake and recorded here with the date; Compare is reachable
and correctly labelled from the Sleep Brief, the results cards, the results action
area and the Consultation Summary, with the existing working entry preserved and
the Sleep Brief CTA's label/behaviour mismatch resolved *(this one clause was
resolved 2026-08-10 — see the reconciled Compare table below; every other clause
stands open)*; and 0.5's provisional
priorities presentation has been **either replaced, or kept under a no-change
decision approved by Blake and recorded here with the date**.

A description of intended direction, written by whoever is doing the work,
satisfies no clause of this exit — this is a visible-redesign item, and 1.6 is the
only owner of 0.5's inherited design debt. Preserving "no change" as a legitimate
outcome avoids forcing churn; requiring an approver's dated decision removes the
path an implementer can walk alone.

Review compression or removal is out of scope here; leaving Review as it stands
satisfies this item.

**Compare — the gap is discoverability, not absence.** Four facts,
reconciled 2026-08-10 (the original table had gone stale):

| Surface | State today |
|---|---|
| Consultation Summary "Compare finalists" | **Works.** Auto-selects two saved picks (favourite first) — the customer never chooses which two. Preserved unchanged through PR #34. |
| Sleep Brief "See My Matches →" | **Resolved 2026-08-10** (owner-authorized relabel, ES provisional under the open native-Spanish gate). The CTA still navigates to Results — by design, per the approved "no first-visit Compare" direction — and its label now says so instead of claiming a comparison it never opened. Compare is reached from the Sleep Brief *through* Results. |
| Results cards | **Entry shipped.** PR #34 (merged `c165497`, 2026-08-10, owner-approved live) renders card-level Compare controls on the top-pick and supporting cards. |
| Results compare tray and modal | **Reachable.** The tray's "Compare →" / "Comparar →" opens the aligned comparison modal (dialog semantics PR #30, static alignment PR #31, entry PR #34). |

So Phase 1's remaining Compare work here is coherence review, not
reactivation: the entries above exist and the label/behaviour mismatch is
resolved. **This does not close 1.6** — every other clause of the exit
(Consultation Summary presentation, Welcome, drawer, email, 0.5's
provisional presentation) stands, and 1.6 stays ⬜. *(An earlier revision of
this sentence also said Phase 1 implementation remained unauthorized; it was
authorized 2026-08-12.)* Do not turn Compare into another feature wall.

**Welcome.** Brief, calm, and framed for a salesperson opening the conversation
with the customer beside them. One restrained Payment Choice acknowledgment — no
coupon-styled tease, no self-deferring "come back after your matches". Persistent
language and restart controls stay available. Do not promise an inaccurate
completion time.

**Review screen.** A protected confirmation and correction step: where the
salesperson confirms answers, a couple catches a misunderstanding, and a second
participant corrects the first. It stays as it is; compression or removal is a
separate locked decision.

*(2026-08-21: three integrity repairs inside this item's territory ship under
the cross-cutting Trust integrity and transparency gate (block after 1.7),
ahead of 1.6's own presentation work and without deciding any of it: the
Welcome screen gains one deployment-mode-aware data-use sentence; the email
screen's template-hardcoded "never sold / unsubscribe anytime" promise is
retired and the privacy line reads retailer config in both languages; and the
Review screen's help line becomes the audience statement that a specialist
summary is produced from the answers. 1.6's exit clauses — Consultation
Summary, Welcome, drawer and email presentation, and 0.5's provisional
presentation — all stand open; the broader Review/Consultation Summary
composition remains 1.6's.)*

**Mattress drawer.** Genuine product detail — firmness, match reasons, features.
Duplicate financing reduced per 1.5. Eventually it may show a verified price and
one concise path to Payment Choice. It must never become a per-product wall of
speculative payment claims.

**Email.** The only artifact the customer leaves with. A concise brief, ranked
priorities, matches, practical testing guidance, and approved next steps. **Never**
payment state of any kind — no preference, no explored history, no path
identifier — nor medical-style labels, unapproved rates or terms, or customer
data beyond the reviewed payload contract. *(Slice 4 made this executable: the
email's financing row is the neutral `emailBodyAvailable` in **every** D4 state,
proven byte-identical across the whole state matrix in both languages by
`tests/email_gating_check.mjs`, and the `financingExplored` flag that used to
split "explored" from "available" wording is deleted.)* Keep four things
distinct: UI implementation, payload capability, GAS activation, and verified
delivery — `gasUrl` is blank today, so no email change is "live" merely because the
template exists.

### 1.7 — Sleep Plan ⬜

**Commissioned 2026-08-14 (D5a — added by the Nocturne owner review; this item
did not exist in earlier revisions).** A new screen between comparison and the
Consultation Summary: the customer's plan for the in-store trial, presented
by the salesperson.

*(2026-08-21: in the approved order the cross-cutting Trust integrity gate
(the block after this item) precedes this item and merges first (owner
ruling 2026-08-21). Slice 5 began on `claude/nocturne-slice5-sleep-plan`
(draft PR #53) before the gate was inserted and continues; after the gate
merges it integrates the resulting `main` and proves the combined behaviour;
the gate adds nothing to this item's scope or exit. The `⬜` above is stale — Slice 5 is `🔨` — and is Slice 5's branch to
move, per the 1.1 precedent.)*

What it carries, per the approved direction: an explicit finalist block —
either the customer-chosen **Finalist**, or the engine's top pick honestly
labeled **"Recommended starting point"** with the absence of a finalist stated
plainly and a route back to choose one, never a silent promotion of the top
pick to finalist; the trial priorities with their in-store testing prose; the
compared models; the top Sleep System items from the engine's accessory
ranking, at the engine's indices, with add/added state; and the payment moment
per D4 (preference line, governed explore action that navigates without
recording, "Not right now" toggle).

Constraints, none new: consume, never re-derive (the finalist block reads the
engine's existing top pick; the accessory block reads the engine's existing
ranking); model lines speak tier and position, never a naked cross-tier
number; bilingual by construction; all copy config-driven through the
pipeline; the screen joins `SESSION_LAYERS`/wipe coverage and every
customer-ending path clears its state; touch behaviour follows the shipped
patterns (Invariant 10 — the prototype's alternative guards were **not**
adopted, D6).

**The explicit finalist-state semantics adopted app-wide (D5b) land with or
before this item** — Finalist ✓ / Recommended starting point / no finalist
yet — and every surface that speaks about a finalist (this screen, the
Consultation Summary, the email when its surface is reworked) uses them; no
surface may substitute one state for another.

**Exit:** the Sleep Plan ships on `main` with the finalist-state semantics,
wipe coverage proven by the session suites, EN and ES, verified on the
confirmed hardware per the phase-wide merge gate.

### Phase 1 cross-cutting gate — Trust integrity and transparency ✅ (merged 2026-08-23, `d4049cb`)

**Inserted 2026-08-21 on Blake Ford's instruction (given in conversation, not
in a committed document)**, following the 2026-08-21 quiz
trust investigation (`docs/quiz-trust-investigation-2026-08-21.md`; verbatim
agent and red-team reports in
`docs/quiz-trust-investigation-2026-08-21-agent-reports.md`). The
investigation asked whether the quiz should show company history, process
explanations or privacy notes to build justified customer trust, and found
instead that the shipped app already made several claims its code did not
keep. **This is Phase 1 work — an integrity repair and a prerequisite for the
later customer-facing screens, not a new visual feature.** Phase 0 is closed
and is not reopened by it.

**Placement.** In the approved 2026-08-14 slice order it sits **after (4)
Slice 4 Payment Choice and before (5) Slice 5 Sleep Plan**; Slice 5 had already
begun on its own branch (draft PR #53) when the gate was inserted; its
development continues, and by owner ruling (2026-08-21) it merges after this
gate and integrates the resulting `main` (see the decision block). **This block's position after item 1.7 is topical,
not temporal** — the 1.x items are numbered by subject and have never encoded
schedule (Slice 1 shipped as 1.3, Slice 2 as 1.1, Slice 3 as 1.2, Slice 4 as
1.5); the gate's place in the schedule is the approved slice order and the
sequence of record. It has no number of its own because it is
**cross-cutting**: it repairs shipped defects that fall inside three existing
items' ownership and closes none of them —

- **1.2 (Quiz)** — question-change scroll position and keyboard-focus placement;
  the truth of every `helpText` line against the engine.
- **1.3 (Results)** — the legibility of the ruled relativity line "Match
  strength is relative within each tier" / "La afinidad es relativa dentro de
  cada nivel" (D3), which shipped at 11px.
- **1.6 (Welcome / Review / email)** — one deployment-mode-aware data-use
  sentence on Welcome; retirement of the template-hardcoded "Your info is never
  sold to third parties. Unsubscribe anytime." promise (EN+ES) on the email
  screen; the Review screen's help line becoming an honest statement of the
  specialist audience.

Each of those items keeps its own mark, gates and exit; this gate lifts
nothing on any of them. The approved D1–D6 direction is unchanged.

**Defects it fixes, all found by code audit and mounted-device measurement
(1194×748 and 834×1108, the recorded device matrix), not by preference:**

1. `renderQuestion()` never reset scroll, so after Next on a tall question the
   next question's eyebrow, progress row and headline rendered above the
   viewport and keyboard focus fell to the document body (measured on `main`
   at `4a76503`: headline top −6 px at 1194×748, −216 px at 390×844, −308 px
   at 200% zoom; `activeElement` = BODY on every Next and Back).
2. Help lines overstated the engine: "So every mattress we show actually fits
   your space" (size never filters the lineup); "the biggest clue to the
   support you need" (a ≤5-point tag against a 50-point firmness term); "an
   easy fix with the right materials"; "one of the first upgrades you'll feel";
   and several Spanish lines that said something different from their English.
3. `index.html` hardcoded a retailer privacy promise in both languages — a
   white-label breach, an absolute claim, and an "unsubscribe" for a
   subscription that does not exist — and ignored the configured Spanish
   email-privacy text.
4. Nothing told the customer that a specialist summary is produced from their
   answers, although the Consultation Summary renders implications derived
   from the sleep-issue and health answers.
5. The one honest tier statement was 11px.

**What it does not do.** It does not alter scoring, ranking, tier membership,
the Gold-first default tab, thresholds, caps, back-fill, firmness, the
qualification rule, touch handling (Invariant 10), persistence (Invariant 6),
financing influence (Invariant 1), or the engine's computed output
(Invariant 2 — the Phase 1 output-regression fixture and its pinned sha256
are byte-identical across it). It adds no auto-advance (3.4 🔒), no consent
flow, no live region or announcement, no analytics field, no email content.
**The in-quiz heritage rail ("From the Lacks story") is not approved for
production and is not built**: no `quiz.trustStories`, no validator contract
for it, no renderer, no CLAUDE.md paragraph. Heritage stays on the Welcome
screen once. A restrained heritage treatment remains available only as a
separately testable research condition in moderated sessions; no
company-history content belongs beside `sleep_issues` or `health_conditions`,
and no automatic rotation, background watermark, answer-aware anecdote,
testimonial, QR or external navigation is authorized. The superseded
prototype worktree is preserved as research evidence and is not merged.

**Tier architecture — a cross-tier marker, a global maximum, any cross-tier
ranking — remains Phase 3.3 🔒. The Gold-first initial-tier presentation is a
separate, presentation-only owner decision (register: "Tier presentation
(trust)" — ruled 2026-08-21: the shipped Gold-first presentation is retained
this cycle; a neutral initial tier and a cross-tier marker stay deferred); it
is not 3.3 and does not wait on it.** This gate may improve the existing relativity
note's legibility; it may not change tier behaviour, and it adds no
confessional line and no cross-tier marker.

**Privacy language is conditional on verified deployment behaviour.** The
data-use sentence is dictionary copy in two variants — a preview-mode
sentence shown only while `gasUrl` is blank (nothing is sent; this is the
shipped state) and a live-mode sentence for retailers with email enabled —
selected at runtime by the same `gasUrl` truth the email screen uses, and
gated at build by `tools/validation.py`, which rejects preview-mode wording
in retailer privacy prose under a non-blank `gasUrl`. The network-sink set
that makes the sentence true (exactly two `fetch` call sites: the same-origin
data loader and the `gasUrl`-gated results POST; no beacon, socket, form
action, storage of answers or query serialization) is pinned by
`tests/trust_integrity_check.mjs` — a tripwire on the named sink forms, not a
proof against every possible sink, so every diff touching `index.html` is
still reviewed against the sentence. No privacy policy is claimed approved:
`text.privacyDraftNotice` stays until the approver of record resolves it.

**Native-Spanish review (Invariant 12) still applies to every ES string this
gate ships, and the privacy/data-use sentences (and, since R5, the idle-dialog
body `safety.timeout_body`) are the recorded exception that goes first** — a wrong translation there changes the promise, so they are
owed native review before showroom use rather than at the consolidated pass.
**Owner ruling 2026-08-22 (Blake Ford): that review is waived as a PR #54
readiness/merge gate for the preview-only merge** — the four strings are not
native-reviewed or approved, Spanish stays provisional, and native review is
still required before any Spanish showroom authorization or any live
email/lead-enabled deployment (either reopens it). The eight changed ES quiz
lines stay on the consolidated ledger.
The copy inventory is in `docs/trust-integrity-implementation-2026-08-21.md`.

**This gate grants no showroom-use authorization.** `docs/kiosk-device-hardening.md`
remains BLOCKING; the phase-wide device-matrix merge gate, the Windows
forced-colors visual check and Blake's live review apply to it exactly as to
every slice. **A one-time VoiceOver sanity pass on the mounted iPad is
required before PR #54 leaves draft (owner ruling R7, 2026-08-21)** — a check
of the new headline focus and of the Welcome and Review lines in reading
order, with no accepted-risk alternative; screen-reader functionality itself
stays out of scope by the 2026-08-12 permanent ruling, which this does not
reopen. **Recorded PASS for `f748f59` by Blake's 2026-08-22 owner attestation:**
all 21 compact physical checks passed, covering the mounted-iPad matrix,
VoiceOver sanity pass and real Windows forced colors. The physical packet §15
records the byte-verified mirror and the absence of an exported checklist or
screenshots. This closes only the physical portion of Exit 13. **Recorded
2026-08-22, Blake Ford:** the nine rewritten EN help lines approved as governed
quiz copy; `sleep_position` keeps its shipped gloss (option A); the Welcome,
Review and idle-dialog sentences approved as shipped English product wording;
Blake Ford named business/legal approver of record. No bytes changed. **Also
recorded 2026-08-22, Blake Ford as approver of record:** the Welcome and Review
English sentences signed as accurate business representations for the current
preview-mode deployment (`gasUrl` blank; not a live-email approval); and the
privacy-policy decision taken as **option C, preview-only for this merge** —
the draft policy and its visible notice stay, the policy is not claimed
finalized, live activation stays a separate gated decision. **Also 2026-08-22:**
the priority native-Spanish review waived as a PR #54 gate (owner ruling; not
a translation approval — see the native-review paragraph above). **Blake's
live review passed 2026-08-22 at `9f27680`** (app bytes identical to the
attested `f748f59`; mirror re-verified byte-identical before the walk).
**Reviewed application head designated `9f27680`** (Blake Ford, 2026-08-22;
CI run 32593585017 pass; app bytes identical to `f748f59`; later commits are
documentation only) and **ready-for-review authorized** the same day,
conditional on green CI at the documentation head. **External review at the
ready head (2026-08-22):** two P2 validator threads, owner option B — the
live-capable `gasUrl` rule preserved and documented with self-tests; the
storage-negation phrase match narrowed to governed-data sentences with
positive and negative self-tests (implementation report §33); validator and
sweep manifest only, customer-visible bytes unchanged, physical and
live-review passes not reopened; eighteen external-review threads on that
heuristic fixed, none waived (report §33). **Merge authorized 2026-08-22 by
Blake Ford** — merge commit, branch kept; the merge publishes only the existing
Pages preview and grants no showroom use, no live email, no non-blank `gasUrl`,
no Spanish approval and nothing for PR #53. **Merged and verified:** PR #54 merged 2026-08-23 00:13Z as merge commit `d4049cb` (parents `4a76503` + `084f2f0`; merge, not squash; branch kept). Post-merge CI run 32607312520 and Pages run 32607311802 both succeeded at exactly `d4049cb`; the public preview `https://beford782.github.io/LacksFurniture/` serves `index.html` with SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321` — the bytes physically tested at `f748f59` and owner-reviewed at `9f27680` — and `store-config`, `quiz`, both dictionaries, `mattresses` and `allowed-hosts` hash-identical to `main`; a headless render showed Welcome with its Start button, one heritage line and the data-use sentence, no unauthorized-domain screen, no data-error overlay, a clean console; served `gasUrl` is blank, the draft-policy notice and preview wording are served. Preview deployment only: no showroom use, no live email, Spanish provisional. Exit 13 is complete.

**Exit:**

1. A question change no longer inherits an off-screen scroll position.
2. A question change scrolls the new question into view and moves keyboard
   focus to its headline, without touching the answer-tap focus restoration
   (Slice 3) or the language-switch focus policy.
3. Every quiz help line corresponds to real engine or handoff behaviour, as
   recorded in `docs/quiz-copy-engine-correspondence.md`.
4. The copy distinguishes scoring inputs from consultation-only inputs.
5. No template-hardcoded retailer privacy promise remains in `index.html`.
6. The customer-facing data-use sentence is true for the active deployment
   mode, and the build rejects a preview-only statement under a live endpoint.
7. Customers are told, on the Review screen, that a specialist summary is
   produced from their answers.
8. The tier-relativity statement is readable at body size (≥15px, ≥4.5:1).
9. Scoring outputs and the Phase 1 output fixture are unchanged.
10. The full suite passes.
11. No trust-story rail exists on production question screens.
12. The remaining tier-presentation questions are recorded in the register,
    not implemented.
13. Recorded before PR #54 may leave draft (owner ruling 2026-08-21): Blake's
    sign-off on the nine rewritten help lines as governed quiz copy; approval
    of the Welcome and Review sentences; the privacy-policy decision; the
    priority native-Spanish review of `privacy.data_use_preview`,
    `privacy.data_use_live`, `review.help` and `safety.timeout_body` (the
    Invariant 12 exception — *waived as a gate for this preview-only merge by
    owner ruling 2026-08-22; still owed before Spanish showroom or live-mode
    use*); the physical mounted-iPad pass in both
    orientations and languages; the VoiceOver sanity pass; a real Windows
    forced-colors pass; and Blake's live review. None of these is satisfied by
    browser emulation or by the strings being implemented.

---

## Accessibility and showroom acceptance criteria

These apply to every Phase 1 item.

**Component semantics — approved:**

- Decorative hero icon: `aria-hidden`, when the heading carries its meaning.
- Firmness visualisation: a meaningful role and a bilingual accessible verbal
  value (e.g. "Medium, 4 of 10"). The current text form is readable by assistive
  technology; a graphic without this is a regression, not a redesign.
- Ranked priorities: an ordered list. Order conveyed by position and a number
  glyph alone is not conveyed.
- Progressive disclosure: a real `button` with `aria-expanded`, and a bilingual
  accessible name.
- Next-step rail: ordered semantics, with `aria-current` where appropriate. The
  existing rail renders plain divs, so "restyling" must not preserve that.
- Icon badges retain visible text. Icons never replace text.
- **Contrast and visible focus remain required.** Focus is now load-bearing, not
  cosmetic: since 0.3, focus *is* the screen-transition announcement. A suppressed
  or invisible focus ring is a functional defect for sighted users on every
  transition — and a redesign is exactly when focus rings get styled away.

**Real-device QA must cover** the actual approved showroom iPad hardware and
browser, its viewport width **and** height, both orientations, English and
Spanish, glare and shared-viewing conditions, and touch.

### Phase 1 merge gate — the device matrix

A phase-wide **merge gate**, not an item status. Recorded here only — item Exit
lines do not repeat it, and it carries no heading mark.

It does not override the Phase 0 → Phase 1 sequence; the two apply in order:

- **Before Phase 0 closes:** Phase 1 research and prototyping may proceed. Phase 1
  implementation may not begin.
- **After Phase 0 closes:** this gate independently permits Phase 1
  implementation, and blocks merging until verification on the confirmed
  hardware.

**Approver: Blake, unblocked by confirming the showroom hardware.** No committed
source in this repository identifies the showroom device, its viewport or its
orientation, so "real iPad dimensions" is not yet a checkable acceptance
criterion. **No Phase 1 change merges without verification on the confirmed
hardware.** *(The hardware was confirmed and the matrix recorded 2026-08-12 —
see below. The merge requirement stands unchanged.)*

**Device matrix — recorded 2026-08-12, owner-confirmed on the mounted device**
(full session record: `docs/kiosk-device-hardening.md`, *Device identity and
configuration audit — 2026-08-12*):

| Field | Value |
|---|---|
| Device | iPad Pro 11-inch (2nd generation) — the actual mounted showroom tablet, confirmed the same physical unit as the 2026-08-03 test iPad |
| iPadOS / browser | 26.3.1 (a) / Safari |
| Viewport, portrait | 834 × 1108 CSS px |
| Viewport, landscape | 1194 × 748 CSS px |
| Intended operating orientation | landscape |
| Supervision / management | not supervised, no MDM profiles (see the hardening doc — BLOCKING for showroom use) |

**PR #54 trust-gate run — 2026-08-22:** Blake instructed the lead to record all
21 compact checks as PASS for branch head `f748f59`, served from the retained
dry-run mirror at mirror commit `22b9109`. This covers landscape and portrait,
EN and ES, partner and solo paths, VoiceOver, and real Windows Aquatic/Desert
forced colors. The served `index.html` was byte-identical to the branch blob
(SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321`).
No Share Results export, screenshots or exact device-version metadata were
supplied; `docs/trust-integrity-physical-gate-2026-08-21.md` §15 is the record.
The matrix gate is closed for these bytes only; showroom hardening and every
non-physical Exit 13 approval remain separate.

With the matrix recorded, "real iPad dimensions" is now a checkable acceptance
criterion, and the breakpoint-justification restriction below lifts on its own
stated terms. What does **not** change: every Phase 1 merge still requires
verification on this confirmed hardware, both orientations, English and
Spanish — and **recording this matrix is not Phase 1 implementation
authorization**, which was a separate, explicit owner decision, granted
2026-08-12 (see the Phase 1 authorization block).

Prototyping and implementation proceed meanwhile under one restriction: **no new
CSS breakpoint, and no change to an existing one, may be justified as matching the
showroom device until the matrix is recorded here.** That is scoped deliberately.
`index.html` already carries roughly 25 width-based media queries, including one
explicitly bracketing tablet widths, so a flat "do not invent dimensions" reads as
either already-violated or as a ban on responsive CSS — and would be ignored
either way. The enforceable rule is about *new justification*, not about
responsive design.

Never write a width without its paired height: portrait and landscape on the same
device are different designs.

---

## Phase 2 — price and payment

**Build dark first. No customer-facing output in the first stage.**

> **Daybreak is not Phase 2.** The Daybreak work merged 2026-08-14 (PR #42
> integrity repairs; PR #43 promotions contract + demo) established
> *promotions governance*: an inert `store-config.promotions` contract
> (`activeScenario: null`, empty `scenarios`, locked by CI's operating-state
> invariant), a strict current-event validation contract in
> `tools/validation.py` (owner authorization, fresh allowlisted evidence,
> bilingual review), and a fully isolated illustrative Black Friday demo under
> `demo/` that the production pipeline never consumes. It carries **no
> verified product prices, no payment calculation, and no activation** — every
> Phase 2 gate below stands untouched, and `incoming/lacks_catalog_selection.json`
> remains exactly as the warning box in 2.1 describes it.

### 2.1 — The dark framework ⬜

Ship the whole mechanism with nothing rendered: product/SKU/size identity,
verified prices, canonical source and generation pipeline, price ownership,
source-URL allowlisting, `verifiedAt`, `maxAgeDays` or an approved
merchandising-calendar control, emergency disable, plan eligibility, approved
calculation modes, payment frequency, disclosures, bilingual presentation data,
deterministic validation, and fail-closed behaviour.

**Exit:** DOM silence is necessary but not sufficient. Deterministic tests must
prove the dark framework actually implements, with no customer-visible price or
payment output in any state:

- product / SKU / size identity;
- approved source and ownership metadata;
- freshness and cadence control, and emergency disable;
- plan eligibility, calculation mode, and the plan's actual cadence;
- the price-unavailable and quote-only states as **separate** outcomes;
- a missing, stale or unapproved price producing **no numeric result**;
- validation and fail-closed behaviour on every one of the above.

**Two unavailability states, never conflated:**

| Condition | State | What is shown |
|---|---|---|
| The **product price** is missing, stale, or unapproved | *price unavailable* | No numeric price and no payment result. No estimate from a substitute price, and never a figure inferred from another size. |
| The **plan** has no approved payment formula, but an approved price exists | *quote-only plan* | The price may be shown per 2.2; no calculated periodic payment, because the **formula** is missing — not the price. |

"Quote-only" is a property of a plan. It is never a fallback label for an
unverified price.

> **⚠️ `incoming/lacks_catalog_selection.json` is discovery evidence, not a price
> source.** It contains 26 Queen-model observations carrying SKU, a promotional
> price and a regular price, from a browser-session scrape dated **2026-07-30**.
> Queen is the only size represented. It sits **outside the production
> mattress-data generation path** — the build inputs carry no price at all, the
> shipped catalog's price column is empty by design, and the only consumer of this
> file is a one-off image-fetch helper.
>
> Its shape is a near-perfect structural match for "verified SKU/size prices",
> which is exactly why this warning exists. **It must not enter customer-facing
> output or the Phase 2 pipeline merely because it exists.** It is not
> business-approved, carries no `verifiedAt`, no freshness policy and no
> allowlisted source, and its prices are promotional — the kind that move on a
> merchandising calendar. **Never infer another size's price from Queen.**
>
> Phase 2.1 still requires approved ownership, an approved source, freshness and
> cadence control, size identity, legal and MAP clearance, validation, and
> emergency-disable behaviour.

**Validator relaxation is gated too.** The shipped invariant that no product-level
payment is calculated or shown is enforced by validation. Split it: 2.1 may relax
what is **computed**; what may be **displayed** stays enforced until 2.2 is
approved. Otherwise the dark phase silently weakens a shipped guarantee ahead of
its gate.

### 2.2 — Activation 🔒

Approver: Blake, plus written business and legal approval. Hardware and browser
verification required.

Only then: an approved cash-price or price-range anchor; periodic-payment
illustrations **only** for plans with approved formulas; the plan's **actual
cadence** preserved — a biweekly lease-to-own payment is never rendered as
monthly; lease-to-own visibly distinct from credit; required disclosure adjacent
to the amount; assumptions disclosed; no implied approval; no financial data
collected; applications linked only to approved external destinations; emergency
disable and freshness failure preserved.

Price and Payment Choice should be grounded on the same screen but need not share
one card. Keep the payment-choice structure stable rather than varying it by
tier or by customer interest *(written when 1.5 carried the agenda model; the
rule transfers unchanged to the 2026-08-14 exploration/preference model — the
path list and its order do not vary by tier or by recorded preference)*.

---

## Phase 3 — structural changes requiring evidence

Every item here changes what is recommended or how the journey works. **Approver
for all of them: Blake.** None may be bundled into Phase 1.

### 3.1 — Scoring case-fold defect 🔒

Two quiz tags never match the catalog because the comparison is case-sensitive and
the catalog spellings are lowercase. **Ten scoring rules across six questions**
currently award zero — `partner_sleep`, `partner_disturbance`, `sleep_position`,
`body_type`, `sleep_issues` and `health_conditions` — including the strongest
partner-disturbance answer and hip pain.

**The defect is in the generator, not the catalog and not the app.** The CSV
authors these tags correctly in camelCase. The build script lowercases every tag
and then restores capitals only after a hyphen, so a tag without one never
recovers. The same script maps the per-feature reason columns *without*
lowercasing, so the reasons map is keyed camelCase and already agrees with the
quiz — the features array is the sole disagreement. The fix is a one-line
generator change plus regeneration through the pipeline; `index.html` is not
touched.

**Bounded impact, for the evidence Blake needs.** A per-feature cap limits
accumulation, so the maximum swing is +5 per tag and +10 combined, per model
carrying the tag — not the naive sum of the dead rules. Pressure relief is carried
by half the catalog and reorders broadly; motion isolation is carried by three
models and reorders narrowly but sharply, since it holds the largest individual
awards. Solo sleepers reach only the pressure-relief rules, because the
partner-disturbance question and the differing-body-type option are both skipped
for them — so the reordering concentrates on partnered sleepers and on the
side-sleeper / hip-pain population the tags exist to serve.

Unblocked by: Blake's explicit approval, on its own PR, with the changed top picks
enumerated as evidence. **Not a drive-by fix.**

### 3.2 — Unmatched quiz-tag vocabulary 🔒

Six quiz tags match no catalog feature in any casing. Separate from 3.1 and needs
its own decision: populate the catalog vocabulary, or retire the tags.

### 3.3 — Global maximum score and tier structure 🔒

The maximum is computed per tier, so a "96% match" in Bronze and in Gold are not
the same measurement. Evaluate a global maximum, and whether the three-tier
structure earns its place.

**This is independent of 1.3's tier-navigation presentation**, which may be
approved and ship first provided it preserves tier identity and membership,
within-tier ordering, per-tier percentages, the qualification threshold, the
result cap and the back-fill. 3.3 changes the measurement; 1.3 changes how the
existing measurement is arranged on screen. **Neither waits on the other.**

One factual note, since it is the basis of the whole comparability argument: the
percentage is **not rendered on any screen** today. It is computed per tier and
reaches the customer only through the results email. A global maximum therefore
changes the email's numbers and the on-screen best-match/comparison copy; it
changes on-screen membership only if the qualification basis changes with it.

### 3.4 — Auto-advance and journey changes 🔒

Auto-advance for single-select questions is a hypothesis, not an improvement.
Removing the pause changes answer-revision behaviour, hence answer sets, hence
recommendations. Unblocked only by observed salesperson/customer sessions.
Question-transition accessibility (1.2) is **not** part of this decision and does
not wait on it.

### 3.5 — Firmness scale and stops 🔒

Reducing the ten-position firmness input to fewer stops changes scoring; firmness
is the largest single scoring term. Not a cosmetic simplification. The 1.1 dial
renders the existing value and must not rescale it.

### 3.6 — Richer persistent identity bar ❓

Proposed only. No evidence, no design, no approval. Listed so it is not mistaken
for approved work.

---

## Open decisions register

Everything here is **unresolved**. An item's absence from this list is not
approval; its presence is a bar on proceeding.

| Decision | Mark | Approver | Unblocked by |
|---|---|---|---|
| Auto-advance | 🔒 | Blake | Observed sessions |
| Review-screen compression or removal | 🔒 | Blake | Observed sessions. Review otherwise stays as it is; this does not hold 1.6 open |
| Phase 2.2 price/payment activation | 🔒 | Blake + business/legal | Written approval |
| Scoring case-fold (3.1) | 🔒 | Blake | Approval + enumerated impact |
| Quiz-tag vocabulary gap (3.2) | 🔒 | Blake | Populate-or-retire decision |
| Global maxScore / cross-tier ranking / tier merge or removal / threshold, cap, back-fill (3.3) | 🔒 | Blake | Evidence. **Does not gate a preserving Phase 1 tier-navigation change.** *(2026-08-21: a cross-tier "highest-fit" marker — raised as a trust question — is this row, because it changes what the customer is told about fit; see "Tier presentation (trust)" for the presentation-only half.)* |
| Firmness stops (3.5) | 🔒 | Blake | Evidence |
| Persistent identity bar (3.6) | ❓ | Blake | A case for it |
| Dormant nickname-code cleanup | ❓ | Blake | Analytics review — see below |
| Visible stale-financing status band (production) | ❓ | Blake | A case for it plus review sign-off. Prototype-only today (D6); if pursued, production gets its own dedicated governed key — not a reuse of `staleAnnouncement` |
| Customer-recorded trial reactions | ❓ | Blake | A case for it. The Nocturne prototype's own candidate next revision; deliberately not built (D6) |
| Presenter mode — shipping mechanism | ❓ | Blake + kiosk hardening review | The hardening review decides the mechanism; the prototype's query parameter is rehearsal tooling, not a shipped design (D6) |
| **Tier presentation (trust)** — a neutral initial tier choice or another presentation control, versus the shipped Gold-first initial tier with the within-tier model | ❓ | Blake | *(Ruled for this cycle, 2026-08-21: the shipped Gold-first / within-tier presentation is retained with the 15px relativity note; a neutral initial tier (B) and any other control (D) are DEFERRED to a later owner/research decision; this is not a permanent endorsement of Gold-first.)* Any future change is presentation only — it must preserve tier identity and membership, within-tier order, the threshold, cap and back-fill. A cross-tier highest-fit marker or any global best-match computation is the 3.3 row above (NOT AUTHORIZED), not this one. The legible within-tier relativity note is NOT this decision |
| **Heritage content** — Welcome only (current), an optional moderated-research condition, or no additional heritage | ❓ | Blake | *(Ruled for this cycle, 2026-08-21: the restrained Welcome treatment stays; no per-question rail, no anniversary count, no store counts, awards, testimonials, QR codes, community claims or anecdotes in the quiz; the research prototype is preserved separately; historical content may be tested later as an optional research condition — that later test is what stays open here.)* Any future fact beyond the Welcome line needs governance modelled on financing (freshness, allowlisted source, approval, ES review) |
| **Founding-year discrepancy** — lacks.com "1935" vs the BBB record "Business Started 1/1/1924" | ❓ | Blake | *(Ruled for this branch, 2026-08-21: the "since 1935" line is not altered and is treated as provisional; the BBB entry is an unresolved discrepancy, not proof; no second founding-year exposure and no anniversary arithmetic are added; the ruling is not historical verification.)* Resolve through corporate or archival records. 1935 is corroborated by two independent sources (the ISJL encyclopedia; the HFA's 2025 "90th year"); the BBB entry may describe a predecessor entity, an earlier registration, or be inaccurate — it is not evidence that 1935 is false, and the corroboration is not proof either. Affects `text.heritage` / `voice.eyebrow` (and the dead `text.trustSignal`); the shipped line stays as it is meanwhile. No anniversary arithmetic is to be added either way |
| **Privacy approval** — approver of record; final showroom wording; `text.privacyDraftNotice` resolution — **the overlay shows "Draft policy — pending Lacks Furniture approval before live use." to customers today, EN and ES, until this is resolved**; the native-Spanish reviewer for the data-use sentences; the live-mode (email-enabled) wording, which must disclose what `Code.gs` does with a submitted address | ❓ | Blake Ford (approver of record, named 2026-08-22) | Written approval recorded in config or this document. **Recorded 2026-08-22:** the EN sentences approved as product wording and signed as business representations for the preview-mode deployment; the policy decision taken as option C, preview-only — the overlay keeps its draft notice by decision, not by omission. Still ❓ for what remains: final showroom policy wording, the live-mode (email-enabled) wording and its Code.gs disclosure, and the native-Spanish reviewer |
| **Specialist-summary scope** — exactly what the Consultation Summary shows from the answers (today: finalists, what to test, and implications derived from sleep-issue and health answers), whether the customer may control what appears, whether health-derived implications remain | ❓ | Blake | A ruling; 1.6 owns the presentation. The trust gate's Review line describes today's behaviour and must be re-verified if the scope changes |
| **Idle-dialog wording** — the Gate 1B body "Your session is paused to protect your privacy." described intent, not behaviour (a grace countdown runs; the answers persist until it ends or Start new customer) | ❓ | Blake | *(Ruled 2026-08-21, R5: replaced on the trust branch with dictionary copy that names the dialog's real controls — EN "Session paused. Continue this session where you left off, or start a new customer to clear it."; ES provisional. Product direction only.)* Still open here: the final EN wording's copy sign-off and the native review of the Spanish |
| **Trust measurement** — moderated current-vs-process-transparency sessions; whether a restrained heritage condition is retained as a third research condition; any aggregate local measurement store (which must record no answers and no identity, or the data-use sentence becomes false) | ❓ | Blake | Approval of the study design; the store is designed before anything is promised |
| **VoiceOver sanity pass on the trust copy** — the owner's 2026-08-21 ruling (R7) requires a one-time sanity pass on the mounted iPad (new headline focus, the Welcome and Review lines in reading order, no duplicate announcement) before PR #54 leaves draft | ✅ | Blake | PASS by Blake's 2026-08-22 all-tests-pass attestation for `f748f59`; compact VO-01…04 and VO-ES-01 covered. No transcript/export supplied; evidence limitation recorded in `docs/trust-integrity-physical-gate-2026-08-21.md` §15. Screen-reader functionality itself stays out of scope by the 2026-08-12 permanent ruling. |

*(Resolved and removed from the table: "Phase 1 scoring-fixture exit gate" —
approved by owner directive 2026-08-12 and built the same day; see the Phase 1
exit gate block under Standing Phase 1 constraints. "Tier navigation
presentation — adopting a replacement" — resolved for this cycle 2026-08-14:
Blake recorded that the tabs stand, retained and restyled, accordion rejected
(D3, reaffirming the 2026-08-07 direction); 1.3's adoption gate stays as
written for any future replacement proposal. "Final Sleep Brief layout" —
resolved 2026-08-14: Blake approved the reviewed Nocturne prototype's
composition as the production 1.1 specification (D1/D2); per-merge
device-matrix verification and live review still apply to every shipped
slice. "The device matrix itself" — resolved 2026-08-12: the showroom
hardware was confirmed and the matrix recorded in the Phase 1 merge-gate
block; the merge requirement it feeds stands unchanged.)*

**Visible Gold/Silver/Bronze presentation: the tabs stand (2026-08-14).** The
earlier text here advertised grouped, stacked or accordion replacements as a
live Phase 1 possibility; the accordion was rejected 2026-08-07 and Blake
recorded the retained-and-restyled tabs as the operative decision for this
cycle. The structural analysis it carried remains true and governs any future
replacement proposal: such a change is a *presentation* decision, not a Phase
3 one, **does not wait on 3.3**, and must preserve tier identity and
membership, within-tier ordering, per-tier percentage computation, the
qualification threshold, the result cap and the back-fill, with no mixed
cross-tier ordering.

**Internal tier keys do not change**, and the structural questions — a global
maximum, mixed cross-tier ranking, removing or merging a tier, or altering the
qualification threshold, cap or back-fill — remain Phase 3.3, because each of them
changes what is recommended.

---

## Facts that correct earlier drafts

Recorded because each one previously sent work in the wrong direction.

**There is no visible nickname hero.** The engine computes archetype nicknames
("The Goldilocks", "The Ache Fighter", and fourteen others), but they never reach
the DOM. The visible Sleep Brief heading is the fixed bilingual string "Your Sleep
Brief" / "Tu Resumen de Sueño". The nickname is assigned only to an analytics
field, which nothing reads — not the email payload, not Code.gs, not any renderer.
**Retiring a live nickname hero is therefore not a Phase 1.1 blocker**, because
there is nothing visible to retire.

Dormant nickname cleanup is separate work (❓ above) and must not be bundled into
presentation changes without reviewing the analytics implications first. Two
cautions if it is ever done: the analytics field is in the session-wipe list and
pinned by tests, so those move together; and the heading **element** must stay — it
is the 0.3 focus destination for the Sleep Brief and the `aria-labelledby` target
for two ancestors. A companion icon-key variable is read by nothing at all.

**Mattress `archetype` is a different thing entirely** — live per-product copy used
for response labels, differentiator titles, trial prompts and summary reasons.
It shares only a word with the nickname engine. **Do not remove it accidentally.**

**Compare is fully shipped.** Compare is available from the Results cards
through the tray and comparison modal (PRs #30/#31/#34, owner-approved live)
and from the Consultation Summary's preserved "Compare finalists" entry; the
Sleep Brief CTA — "See My Matches →" (PR #35) — correctly routes through
Results, per the approved "no first-visit Compare" direction. See the
reconciled table in 1.6.

**The priorities data has no rank field.** Ordering is by an internal score that is
never rendered. "Rank" in the 1.1 proposal means display position.

**Word counts in this document came from an audit that is not in this repository.**
They are indicative, not acceptance criteria, and they drift with every copy
change. Re-measure against the tree before implementing to a target, and do not
cite the audit as authority for a design decision.

**No "20-step working agreement" and no 2026-08-02 design study exist in this
repository.** Neither is a citable source here. If either is to be referenced, it
must be committed first.

**Process material lives elsewhere.** Branching, PR flow, required checks, the
pre-merge checklist and post-merge verification are in
`docs/deployment-workflow.md`; architecture, i18n and the generated-artifact
pipeline are in CLAUDE.md. This document does not restate them. If a durable
contributor or review checklist is wanted, it belongs in its own governance
document, not here.

---

## Sequence of record

1. ✅ **Analytics contract and roadmap** — 0.1, 0.2. PR #11 (`5a9cd10`), PR #12
   (`1aef27d`).
2. ✅ **Screen-transition focus and announcement** — 0.3. PR #13, head `1574c53`,
   merged `88f1e89`.
3. ✅ **Roadmap reconciliation** — 0.2. PR #14 (`7fa8390`).
4. ✅ **Remaining Phase 0** — 0.4 merged (PR #15, `572d405`), 0.5 merged
   (PR #16, `42ff5f3`), 0.6 + 0.7 in the PR carrying the 2026-08-05 revision.
   0.4's hardware gate closed 2026-08-10 with the owner-confirmed
   mounted-device evidence (`docs/kiosk-device-hardening.md`) — **Phase 0 is
   complete.**
5. ✅ **Presentation slices shipped between revisions of this document** —
   the motion/construction program and Compare (PRs #24–#35, ending merge
   `248123e`), Phase 0 closure docs (PR #36), the device matrix (PR #37), the
   Phase 1 output-regression exit gate (PR #38), the owner-ruled 12→10
   question removal (PR #40), and the claim retirement on g6/g7/s3/g8/g9
   (PR #41).
6. ✅ **Daybreak** (2026-08-14) — integrity repairs including the
   owner-approved `locallyMade` bonus retirement (PR #42, merge `b0dc95a`),
   then the inert promotions contract + isolated Black Friday demo (PR #43,
   merge `83d4646`). Promotions governance, not Phase 2 pricing — see the
   note at the top of Phase 2.
7. ✅ **Nocturne presentation slices** (2026-08-15/16) — the D1–D6 slate
   recorded as the plan of record (PR #44, merge `aee0410`), then Slice 1, the
   Results tier-tab restyle and hero-plus-support card hierarchy per D3
   (PR #45, merge `69d5d36`), then Slice 2, the Sleep Brief recomposition and
   Sleep Signature per D1+D2 (PR #46, merge `b05d47f`), then Slice 3, the Quiz
   visual pass per 1.2 (PR #47, merge `5436dea`), whose manual desktop,
   forced-colors and physical-iPad gates passed. Then Slice 4, Payment Choice per
   D4 (1.5), merged 2026-08-20 as `b2acd7e`, with all four of its manual gates
   passed and its Pages deployment verified at exactly that commit.
8. ✅ **Trust integrity and transparency** — the Phase 1 cross-cutting gate,
   inserted 2026-08-21 by owner instruction after Slice 4 and before Slice 5
   (block after item 1.7; branch `claude/phase1-trust-integrity` from
   `4a76503`). Merged 2026-08-23 as `d4049cb` (PR #54; post-merge CI and
   Pages verified at exactly that commit; served bytes identical to the
   physically tested `f748f59`). Slice 5 was developed concurrently on its
   own branch (draft PR #53, head `6decbef`) and, by owner ruling 2026-08-21,
   now integrates the resulting `main` at `d4049cb`.
9. 🔨 **The visible redesign** — Phase 1. *(Implementation explicitly
   authorized by Blake 2026-08-12 — see the authorization block at the top of
   Phase 1. Direction set by the 2026-08-14 Nocturne owner review, D1–D6,
   with its approved slice order; 1.3's reason gate and the Phase 2/3 gates
   stand.)* Start the catalog reason-content
   authoring (1.3's gated content) in parallel and early; it is not engineering
   work, and it gates **reason-led/personalised-card completion** — not the card
   redesign itself, which proceeds against today's reason content (the generic
   default on 14 of 26 models only; none on the other 12) per
   1.3's Proceeds list.
10. ⬜ **Dark pricing/payment foundation** — 2.1.
11. 🔒 **Activate prices and payments** — 2.2, after business and legal approval.
12. 🔒 **Structural scoring and tier changes last** — Phase 3.

---

## Evidence appendix

Findings established by direct inspection of the tree, distinct from the audit's
word counts. Line numbers drift with every merge and are deliberately omitted; the
described behaviour is the durable anchor.

| # | Finding |
|---|---|
| 1 | Quiz: 10 questions, exactly 47 options — so "review all 47 icons" is a bounded task. *(As originally recorded: 12 questions / 56 options; reduced 2026-08-12 by the owner-ruled removal of sleep_quality and current_mattress_age — see 1.2)* |
| 2 | The engine already computes the top three priorities with name, reason, testing prompt and kind; there is no rank field, and ordering is by an unrendered score |
| 3 | A next-step rail already exists on the Sleep Brief, rendering three steps as plain divs |
| 4 | The "Try this:" testing prompt is currently fully visible on the Sleep Brief, not behind disclosure |
| 5 | Per-feature match reasons never render: every per-feature reason column is empty. *(Re-measured 2026-08-14 against the post-#41/#42 catalog: still true — and the generic default itself is now populated on only 14 of 26 models, so 12 models carry no reason text at all. 1.3's reason gate stands on this.)* |
| 6 | Two quiz tags never score against the catalog because the match is case-sensitive; six more match no catalog feature in any casing |
| 7 | The maximum score is per-tier, so match percentages are not comparable across tiers |
| 8 | Consultation Summary condition strings are quiz option labels resolved at render time, which is why 0.6 needs a separate mapping rather than a relabel |
| 9 | Of 8 screens, `welcomeScreen` and `questionScreen` render no heading, and the Sleep Brief heading is empty until runtime — the basis for 0.3's destination policy |
| 10 | Question-to-question advance renders without a screen transition, so 0.3 does not announce it; the renderer also runs on every option tap and on language switch. *(Announcement work permanently out of scope by owner ruling 2026-08-12 — see 1.2; the finding stays as a description of behaviour, not a task)* |
| 11 | The data-error overlay was terminal *before* 0.4 — no interactive element, a failure flag never cleared, and absent from the session-layer close list. These are the findings 0.4 was written against, not current state |
| 12 | Compare is available from the Results cards through the tray and comparison modal and from the Consultation Summary; the Sleep Brief CTA correctly routes through Results (PRs #30/#31/#34/#35 — see the reconciled table in 1.6) |
| 13 | Archetype nicknames are computed but never reach the DOM; the visible heading is a fixed bilingual string |
| 14 | `incoming/lacks_catalog_selection.json` carries 26 Queen-only SKU/price/regular-price observations dated 2026-07-30, outside the production generation path |
| 15 | Accessory prices flow end to end and display today; mattress prices do not exist anywhere in the shipped data |
