# Trust integrity gate — physical verification packet (2026-08-21; for PR #54)

**Status:** **PASS by owner attestation, 2026-08-22, for build `f748f59`.**
Blake instructed the lead to treat every item in the compact 21-check packet as
passed. The original detailed Result cells below remain blank: no checklist
export, screenshot set, spoken transcript, exact device-version metadata or
per-row evidence filenames were supplied, and this record does not invent
them. The attestation and its limits are recorded in §15. Browser emulation was
used only to derive the target numbers the owner compares against; it satisfies
none of these gates and is not the basis of the recorded pass.

**Build to test:** the PR #54 head actually served to the device on the day
(record its 7+ character SHA and, if supplied, the served `index.html` SHA-256).
The geometry numbers below were measured in Chromium (Playwright, DPR 1) at
`c65a437`. Since then `index.html` changed once, in the re-review round after
`d75ac98`: three ids were added to the `SESSION_TEXT_IDS` wipe inventory (a
script constant — no markup, CSS or copy), which cannot move geometry; any
later head that touches markup, CSS or copy must be re-measured (§11). The
idle-dialog wording is the R5 sentence shipped in `444abe2`.

**Gates this packet serves:** the Phase 1 device-matrix merge gate (mounted
iPad Pro 11", both orientations, EN and ES — roadmap), owner ruling R7 (a
one-time VoiceOver sanity pass before #54 leaves draft; screen-reader
*functionality* stays out of scope per the 2026-08-12 permanent ruling), and
the real Windows forced-colors check. **A full PASS does not authorize showroom
use** — `docs/kiosk-device-hardening.md` remains BLOCKING.

---

## 0. What this packet is for

The trust gate (roadmap block "Phase 1 cross-cutting gate — Trust integrity and
transparency") changed five customer-visible things: question-change scroll/
focus, nine quiz help lines, the Welcome data-use sentence, the Review audience
sentence, the 15px tier-relativity note — and the idle
dialog's body sentence (owner ruling R5). The roadmap's Phase 1 merge gate
requires verification on the confirmed showroom hardware, both orientations,
EN and ES, before any Phase 1 change merges. Ruling R7 (2026-08-21) additionally
requires a one-time VoiceOver sanity pass on the mounted iPad before #54 leaves
draft. The Windows forced-colors rendering is an owner-run visual check.
Screen-reader *functionality* stays out of scope (2026-08-12 permanent ruling);
the VO section tests meaning, order and duplication only.

The owner executes this packet at the kiosk without reading code. Every step
says what to do, what to look for, and what counts as a pass.

---

## 1. Header table (fill in once per run; one table per orientation × language run is acceptable)

| Field | Value |
|---|---|
| Tester | |
| Date (local, America/Chicago) | |
| Store / location | |
| Device model | iPad Pro 11-inch (2nd generation) — the mounted showroom unit (confirm it is the same unit recorded 2026-08-12) |
| iPadOS version | (Settings → General → About; recorded 2026-08-12 as 26.3.1 (a)) |
| Browser / version | Safari (version follows iPadOS) |
| Mounted orientation for this run | landscape 1194×748 / portrait 834×1108 |
| Build / commit SHA | the PR head served to the device (7+ chars) — and the served `index.html` SHA-256 if the lead provides it |
| PR number | #54 |
| Language for this run | EN / ES |
| Served URL | (the mirror URL — see §12 blocker 1; NOT `beford782.github.io/LacksFurniture/`, which serves `main`) |
| Result | PASS / FAIL / PARTIAL (list failing IDs) |
| Evidence location | directory path per §10, outside `git` |
| Device settings noted | Auto-Lock value during the idle test; VoiceOver Spanish voice installed Y/N; Predictive on/off (record only) |

---

## 2. Test ID scheme

| Prefix | Meaning |
|---|---|
| `IPAD-L-EN-nn` | mounted iPad, landscape 1194×748, English |
| `IPAD-L-ES-nn` | mounted iPad, landscape, Spanish |
| `IPAD-P-EN-nn` / `IPAD-P-ES-nn` | portrait 834×1108 |
| `SOLO-EN-nn` / `SOLO-ES-nn` | the solo-sleeper path (9 questions) |
| `VO-EN-nn` / `VO-ES-nn` | VoiceOver sanity pass |
| `WIN-FC-nn` | Windows forced colors (real device or VM, High Contrast theme) |

IDs are stable: a retest re-runs the same ID; never renumber.

**Three terms used throughout.**
- *Heritage line* = the small caps line "FAMILY-OWNED · SOUTH TEXAS · SINCE 1935" (ES "NEGOCIO FAMILIAR · SUR DE TEXAS · DESDE 1935"). It exists twice in the markup — the eyebrow above the headline (`voice.eyebrow`) and a footer span (`text.heritage`) — **but the footer row is `display:none` with no override, so exactly one heritage line is visible. What counts: ONE line, above the headline, at y≈156–173 (landscape) / 216–233 (portrait EN) / 194–211 (portrait ES). A second identical line anywhere on Welcome is a FAIL.** The "ownership badge" is configured empty and must not appear either.
- *Data-use sentence* = "During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them." (ES: "Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra.") — shown because `gasUrl` is blank. If the sentence says "sent only if you choose to email" the deployment mode is wrong: FAIL and stop.
- *Tall question* = firmness (Q8 partner / Q7 solo; the slider with the animated mattress) and sleep issues (8 options). In landscape these scroll by ~144 px and ~146 px (EN) before Next is reachable; in portrait nothing scrolls.

---

## 3. IPAD-L-EN — landscape English, partner path (run first; this is the operating orientation)

Setup: iPad in its mount, landscape. **Hard-reload the served URL first** (pull-to-refresh, or close the tab and reopen it — the shell and `data/store-config.json` / `data/dict-*.json` are fetched separately, and a stale one invalidates the run); close any other Safari tab on it. Language EN. Do not use a keyboard unless a step says so. Tap with a finger; the app is touch-first.

| ID | Step | Look for | Pass criterion | Result | Evidence |
|---|---|---|---|---|---|
| IPAD-L-EN-01 | Welcome loads | The page renders with the retailer name, "SLEEP SHOP", the EN/ES toggle at top right | No data-error overlay; no "Unauthorized domain" page | | screenshot |
| IPAD-L-EN-02 | Heritage line | One small-caps heritage line above the "South Texas' Sleep Shop." headline | Exactly one; footer shows no second line (§2) | | same shot |
| IPAD-L-EN-03 | Data-use sentence without scrolling | Below "About 2 minutes · No pressure", a two-line sentence in muted brown | Visible in full **without scrolling** (emulation: y 560–608 of 748); readable from the mounted position; wording matches §2 exactly | | same shot |
| IPAD-L-EN-04 | Below-fold composition (record only) | Scroll down: "YOUR CONSULTATION BUILDS" row, then cities | Nothing clipped, no horizontal scroll. (EN outcome row ends y≈716, inside the fold; cities at ≈850 need a scroll — pre-existing, record, not a trust-gate fail) | | |
| IPAD-L-EN-05 | Start | Tap "Find My Sleep Match →" | Q1 "What can we help you with today?" at top; "QUESTION 1 · OF 10"; no previous-question content anywhere on screen | | |
| IPAD-L-EN-06 | Q1 help line | Under the headline | Reads "This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you." | | |
| IPAD-L-EN-07 | Answer Q1, Next | Tap "Back or Body Pain" (any option), tap Next → | Q2 headline top edge sits just below the progress bar (emulation 138 px from the top of the viewport). Eyebrow "QUESTION 2 · OF 10" visible. **No part of Q1 visible.** The page did not "jump" mid-animation | | |
| IPAD-L-EN-08 | Q2 help line | | "We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers." | | |
| IPAD-L-EN-09 | Q2→Q3 | Pick Queen, Next | Q3 "Who's sharing the bed with you?" at the same position; help "This shapes the questions that follow and what we suggest testing together." | | |
| IPAD-L-EN-10 | Partner path | Pick "With a Partner", Next | Q4 "Does your partner's movement wake you up?" appears (this question exists ONLY on the partner/family path); help "The more movement wakes you, the more it shapes your matches and what we suggest testing." | | |
| IPAD-L-EN-11 | Q4→Q5 | Pick any, Next | Q5 sleep position; help "This helps us favor pressure relief, support, or a responsive feel." | | |
| IPAD-L-EN-12 | Q5→Q6 | Pick "Side Sleeper", Next | Q6 reads "What weight range should we match for the sleeper who needs more support?" with help "If you fall into different ranges, choose “Different weight ranges.”" (the partner-path copy variant; the base help line shows only on the solo path — SOLO-EN-02); fifth option "Different weight ranges" present (partner path only) | | |
| IPAD-L-EN-13 | Q6→Q7 | Pick any, Next | Q7 temperature; help "If you sleep hot, we favor cooling features in your matches." Fourth option "We're Opposite" present (partner path) | | |
| IPAD-L-EN-14 | Q7→Q8 firmness | Pick "I Sleep Hot", Next | Q8 slider question; help "No wrong answer here, just slide to the feel you prefer." This screen is taller than the viewport: scroll to the bottom to reach Next | | |
| IPAD-L-EN-15 | **Tall question: firmness → sleep issues** | With the firmness screen scrolled to its bottom, tap Next → | **Q9 "Any issues with your current mattress?" lands with its eyebrow, progress bar and headline at the TOP of the viewport (headline ≈138 px), not scrolled down to where the firmness Next button was.** Before this gate the headline sat 6 px above the viewport here. Help "Tap anything you've noticed. These shape which features we favor and what we suggest testing." | | **screenshot** |
| IPAD-L-EN-16 | **Tall question: sleep issues → health** | Tick "Back Pain" and "Sleeping Too Hot", scroll to the bottom, tap Next → | Q10 "Anything else going on that affects your sleep?" at the top (≈138 px). Help "Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector." | | **screenshot** |
| IPAD-L-EN-17 | **Back from a tall question** | On Q10 scroll down, then tap ← Back | Q9 returns with its headline at the top (≈138 px), your two ticks still selected, "QUESTION 9 · OF 10" | | screenshot |
| IPAD-L-EN-18 | Forward again | Tap Next → on Q9; tick "Snoring or Sleep Apnea" and "Acid Reflux / Heartburn" on Q10; tap "Review My Answers →" | Review screen: "ALMOST THERE", "Quick review", then the sentence in IPAD-L-EN-19 | | |
| IPAD-L-EN-19 | **Review sentence** | Directly under "Quick review" (emulation y 159–182, 15px) | Reads exactly "These answers create your matches and the summary your specialist will review with you." No line beginning "A quick check…" or "Make sure everything…" | | screenshot |
| IPAD-L-EN-20 | **Edit from Review** | Tap "Edit" on the third row (Who's sharing the bed) | The quiz reopens on Q3 with its headline at the top (≈138 px), "QUESTION 3 · OF 10", your previous answer selected. Tap Next **once**: the app returns straight to Review (edit mode snaps back; it does not walk the remaining questions) | | |
| IPAD-L-EN-21 | Sleep Brief | Tap "See my sleep signature" | The reveal plays, then the Sleep Brief screen. (Not a trust-gate surface; record any breakage only) | | |
| IPAD-L-EN-22 | **Results tier note** | Tap the Sleep Brief's primary button to Results; look under the GOLD / SILVER / BRONZE tabs | "Gold · premium materials" then, larger beneath it, **"Match strength is relative within each tier"** at body size (15px; emulation y 389–411). Readable at arm's length from the mounted position. It must NOT be the tiny 11px line it was before | | **screenshot** |
| IPAD-L-EN-23 | Sleep System reason lines (seed for -31) | Tap "Build Your Sleep System →" | Because you ticked back pain + snoring + reflux, the adjustable-base section shows answer-derived lines such as "Suggested first because you mentioned back pain." / "Targets the back pain you mentioned" / "Helps with the snoring you reported". Note which ones appear | | screenshot |
| IPAD-L-EN-24 | Restart control reachable | Top-right utility bar: "English \| Español \| ↺ Restart" (emulation x 1096–1180, y 14–58) | Visible on every screen after Welcome; not overlapped by content; tappable | | |
| IPAD-L-EN-25 | Restart dialog | Tap ↺ Restart | Dialog "Start a new customer?" / "This clears the current answers, mattress selections, and Sleep Plan." with "Keep this session" and "Start new customer". Panel centred (emulation y 246–502, 460 px wide), nothing behind it reacts to taps | | screenshot |
| IPAD-L-EN-26 | Keep | Tap "Keep this session" | Dialog closes; you are exactly where you were (Sleep System), selections intact | | |
| IPAD-L-EN-27 | **Idle dialog appears** | Leave the tablet completely alone (§9 for the timing options). After 5 minutes of no touch the warning opens | Title **"Still comparing?"**; body **"Session paused. Continue this session where you left off, or start a new customer to clear it."** (the R5 wording — NOT "…paused to protect your privacy."); a thin time bar with "N seconds left" counting down from 300; buttons "Continue this session" and "Start new customer". Panel centred (emulation y 220–528) | | **screenshot within the first minute** |
| IPAD-L-EN-28 | **Continue keeps state** | Tap "Continue this session" | Dialog closes; the same screen with the same selections; nothing reset; no language change | | |
| IPAD-L-EN-29 | Final reminder (optional, long) | If you let the dialog run to ≤60 s you will see the bar nearly empty; nothing else changes visually (the spoken reminder is VO-only) | Record only | | |
| IPAD-L-EN-30 | **Restart clears** | Tap ↺ Restart → "Start new customer" | Welcome screen, **in English**, the data-use sentence present, EN/ES toggle shows EN; the quiz when started again shows Q1 with **nothing selected** | | screenshot |
| IPAD-L-EN-31 | **Sleep System containers after Restart — the observable proxy** | As a second customer: Q1 any, Queen, **"Solo Sleeper"**, "Side Sleeper", any, "I'm Comfortable", slider default, Q8 tick **"No Major Issues"** only, Q9 tick **"None of These"** only → Review → Sleep Brief → Results → "Build Your Sleep System →" | **No** line mentioning back pain, snoring or reflux anywhere on the Sleep System screen; no adjustable-base "suggested first because…" line. **What this proves and does not prove:** without devtools the owner cannot see the emptied containers at the moment of Restart — the screen is rebuilt from the new answers before it is shown again. This step proves no first-customer prose survives into the second customer's Sleep System *as seen*. The clearing at Restart itself is proven by `tests/session_safety_check.mjs` (sentinel seeded into every `SESSION_CONTENT_IDS` entry, including the four Sleep System containers) — a code result, recorded as such | | screenshot |
| IPAD-L-EN-32 | Horizontal scroll sweep | On Welcome, a question, Review, Results: drag sideways | The page never scrolls horizontally; no content cut at the right edge | | |
| IPAD-L-EN-33 | Touch targets | Every control you used responded to a single tap, no double-fire (no question skipped by one tap) | Record any double-advance as FAIL with the question number | | |
| IPAD-L-EN-34 | Glare / readability | From the customer's standing position at the mount | Data-use sentence, help lines, Review sentence and tier note legible under showroom lighting | | |
| IPAD-L-EN-35 | Email screen keyboard | From Results → "Review with customer →" (handoff) → the save/email screen; tap the Name field | The on-screen keyboard does not hide the "We'll only use your email to send your results." line permanently (scroll reaches it); the "Preview mode…" note present; the old "never sold… Unsubscribe anytime." line is **absent** | | screenshot |
| IPAD-L-EN-36 | Evidence | Screenshots for -03, -15, -16, -17, -19, -22, -23, -25, -27, -30, -31, -35 renamed per §10 | All present in the evidence directory | | |

---

## 4. IPAD-L-ES — landscape Spanish, critical path

Setup: on Welcome tap **ES**. The whole run stays in Spanish; switch language mid-quiz only in -ES-10.

| ID | Step | Pass criterion | Result | Evidence |
|---|---|---|---|---|
| IPAD-L-ES-01 | Welcome in Spanish | One heritage line "NEGOCIO FAMILIAR · SUR DE TEXAS · DESDE 1935"; data-use sentence (§2 ES) fully visible without scrolling (emulation y 604–652 of 748); accents (sesión, están → "permanecen", resumen, borra) render, no "?" glyphs | | screenshot |
| IPAD-L-ES-02 | **Known Welcome fold residue — record separately, not a trust-gate fail** | The wider "Encontrar Mi Opción Ideal →" button wraps "Aproximadamente 2 minutos · Sin presión" onto its own line, so the "TU CONSULTA CREA" row bottoms ≈39 px below the fold (emulation 670–787 vs 748). Record whether the data-use sentence is still fully above the fold (it is in emulation) and that the outcome row is reachable by scrolling. Owner of the Welcome composition is item 1.6 | | screenshot |
| IPAD-L-ES-03 | Start → Q1 | "Pregunta 1 · de 10"; help "Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa." | | |
| IPAD-L-ES-04 | Each Next through Q7 | Headline at the top each time (≈138 px); no prior content; no horizontal scroll; no clipped option text (Spanish labels are longer: check the two-column options on Q2 and Q7 wrap inside their cards) | | |
| IPAD-L-ES-05 | Firmness → issues (tall) | Scroll to the bottom, "Siguiente →": Q9 "¿Algún problema…?" at the top; help "Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar." | | screenshot |
| IPAD-L-ES-06 | Issues → health (tall) | Q10 at the top; help "Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón." | | screenshot |
| IPAD-L-ES-07 | Back from Q10 | Q9 at the top, ticks kept | | |
| IPAD-L-ES-08 | Review sentence | "Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo." directly under "Revisión rápida"; wraps to at most 2 lines; nothing clipped | | screenshot |
| IPAD-L-ES-09 | Results tier note | "La afinidad es relativa dentro de cada nivel" at body size, under "Oro · …" | | screenshot |
| IPAD-L-ES-10 | **Language switch mid-quiz (no jump)** — go back into the quiz via "Editar" on any Review row; on that question tap **English** in the utility bar, then **Español** | The same question re-renders in the other language; the page does not scroll or jump; your selection is kept; nothing else changes. (Keyboard users: focus stays on the language button — touch users simply see no movement) | | |
| IPAD-L-ES-11 | Idle dialog in Spanish — wait (or use the §9 accelerator for layout-only): "¿Sigues comparando?" / "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla." / "Seguir en esta sesión" / "Empezar con otro cliente"; "Quedan N segundos" | **Wording is provisional (native review owed) — record wrap, clipping and accents only; this step does not approve the Spanish** | | screenshot |
| IPAD-L-ES-12 | Restart from Spanish — ↺ "Reiniciar" → "Empezar con otro cliente" | Welcome returns **in English** (language reset is by design), data-use sentence in English | | screenshot |
| IPAD-L-ES-13 | Email screen | Only "Solo usaremos tu correo para enviarte tus resultados." (now rendered — it was ignored before) plus the Spanish preview note; no "nunca se vende… cancelar la suscripción" line | | screenshot |

---

## 5. IPAD-P-EN / IPAD-P-ES — portrait 834×1108

Rotate the iPad in the mount (or hand-hold if the mount is fixed — record which). Repeat the critical path; the numbers change: headline lands at ≈122 px from the top after every Next/Back/Edit; Review sentence at ≈130–152; tier note at ≈389–411; Restart control at x 736–820, y 14–58; restart dialog panel y 426–682, timeout dialog y 400–708. In emulation nothing scrolls on any question in portrait, so IPAD-P-*-05/06 test "no jump" rather than "scroll reset".

| ID | Step | Pass criterion | Result | Evidence |
|---|---|---|---|---|
| IPAD-P-EN-01 | Welcome | One heritage line; data-use sentence visible (emulation y 579–627 of 1108); outcome row and cities all inside the first screen (docHeight = 1108, nothing below the fold) | | screenshot |
| IPAD-P-EN-02 | Q1→Q7 | Headline at ≈122 px each time; no overlap between the utility bar (top right) and the eyebrow/progress row; drag sideways on a question and on Review — **no horizontal scroll** | | |
| IPAD-P-EN-03 | Firmness → issues | Headline at the top; the 8-option grid fits without clipping | | screenshot |
| IPAD-P-EN-04 | Issues → health, Back | As landscape | | |
| IPAD-P-EN-05 | Focus jump | Watching closely at each Next: no visible viewport jump (the scroll reset is a no-op when nothing scrolled) | | |
| IPAD-P-EN-06 | Review sentence | Wraps naturally (one or two lines), not clipped at the right edge; visibly smaller than the "Quick review" heading yet legible from the mount (supporting copy stays subordinate) | | screenshot |
| IPAD-P-EN-07 | Tier note wraps | "Match strength is relative within each tier" fits on one line at 738 px wide (emulation); if it wraps, it wraps cleanly; smaller than the results headline yet legible from the mount — and the quiz help lines the same (subordinate, not faint) | | screenshot |
| IPAD-P-EN-08 | Idle dialog fits | 460 px panel centred, all four text blocks and both buttons visible; nothing under the top bar | | screenshot |
| IPAD-P-EN-09 | Restart reachable | Utility bar visible and tappable on every screen | | |
| IPAD-P-EN-10 | Restart clears | As IPAD-L-EN-30 | | |
| IPAD-P-ES-01 | Welcome ES | One heritage line; data-use sentence (emulation y 601–649); outcome row 667–753 — inside the fold in portrait | | screenshot |
| IPAD-P-ES-02 | Q1→Q10 | Headline ≈122 px; long Spanish option labels wrap inside cards; no horizontal scroll | | |
| IPAD-P-ES-03 | Review + tier note | ES sentences wrap cleanly | | screenshot |
| IPAD-P-ES-04 | Idle dialog ES | Layout only (wording provisional) | | screenshot |
| IPAD-P-ES-05 | Restart → English Welcome | | | |

---

## 6. SOLO-EN / SOLO-ES — the solo path (9 questions)

| ID | Step | Pass criterion | Result | Evidence |
|---|---|---|---|---|
| SOLO-EN-01 | Q3 "Solo Sleeper" → Next | **Q4 is skipped**: the next screen is sleep position and the eyebrow reads "QUESTION 4 · OF 9" (total 9, not 10). No "partner's movement" question appears | | screenshot |
| SOLO-EN-02 | Body type / temperature | Q5 body type reads the base question "What weight range should this mattress support?" with help "This helps us account for cushioning, support, and durability." and shows **four** options (no "Different weight ranges"); Q6 temperature shows **three** (no "We're Opposite") | | |
| SOLO-EN-03 | **Back across the skip** — on sleep position tap ← Back | Lands on "Who's sharing the bed with you?" (Q3 · of 9) with "Solo Sleeper" selected — not on the hidden partner-movement question; headline at the top | | screenshot |
| SOLO-EN-04 | Tall questions | Firmness → issues → health as in the partner path; eyebrows "8 · of 9" and "9 · of 9"; Back from Q9 lands on Q8 at the top | | |
| SOLO-EN-05 | Review has 9 rows, each with Edit; Edit on row 3 reopens Q3 at the top | | | |
| SOLO-EN-06 | No rail | No "From the Lacks story" or any company-history panel beside any question (the rail is not built; heritage is Welcome-only) | | |
| SOLO-ES-01…06 | Same in Spanish ("Pregunta 4 · de 9", "Duermo Solo"); record one Result per mapped EN step in the Evidence/notes cell (`-01 PASS, …`) | | | |

---

## 7. VO-EN / VO-ES — VoiceOver sanity pass (required by R7 before #54 leaves draft; NOT a screen-reader functionality gate)

**Setup.** Settings → Accessibility → VoiceOver → On (or Accessibility Shortcut: triple-click the top button, after enabling it under Accessibility → Accessibility Shortcut). Speaking rate moderate. For VO-ES install a Spanish voice first: Accessibility → VoiceOver → Speech → Add New Language → Español (México or US). Gestures: swipe right = next item, swipe left = previous, double-tap = activate the item under the VoiceOver cursor, two-finger swipe up = read from top, three-finger swipe = scroll. Turn VoiceOver off with the same shortcut when done, and **re-check Settings → Accessibility afterwards — the device is shared and unmanaged.**

**How to judge.** Test *meaning, order and duplication*, not the exact words. Write what VoiceOver actually said in the **Actual (spoken)** column as a short paraphrase in order ("Sleep quiz, region; Question 1 of 10; …") — not a transcript; the judgment goes in Result. "Announced once" means the item is spoken one time when the screen changes; a second identical utterance within a second or two is a duplicate. Ignore the "heading level 2" / "button" / "landmark" suffixes unless they are absent where the table says they belong. The expectations come from the implementation: the app never uses a live region for these transitions — **announcement is focus**: after Start / Review / Edit the whole screen container is focused (it is a named `region`, so its name is spoken); after every Next or Back the new question's `<h2>` is focused (so the question text is spoken); after an answer tap nothing is focused on purpose.

| ID | Action | What the code focuses | Expected (meaning / order) | Fail if | Actual (spoken) | Result | Notes |
|---|---|---|---|---|---|---|---|
| VO-EN-01 | Two-finger swipe up on Welcome | nothing (no programmatic focus at load) | Reading order: retailer name, "SLEEP SHOP", "Language" group with EN (selected) and ES buttons, **the heritage line once**, headline, sub-copy, "Find My Sleep Match" button, "About 2 minutes · No pressure", **the data-use sentence as plain text**, "Your consultation builds …", cities | Heritage line read twice; data-use sentence announced with "updates"/"live"/"alert"; the outcome row or a promotion read before the CTA | | | |
| VO-EN-02 | Double-tap "Find My Sleep Match" | `#questionScreen` — `role="region"`, `aria-label` "Sleep quiz" | **"Sleep quiz"** (with "region"/"landmark"), once. Swiping right then reads "Question 1 · of 10", the question as a heading, the help line, the five options as buttons | The question headline spoken *and* "Sleep quiz" spoken twice; silence (VO cursor lost at the top of the document) | | | |
| VO-EN-03 | Swipe to an option, double-tap it | **nothing** (touch path: the option list re-renders; no focus restore on touch) | No headline re-announcement, no "Sleep quiz" again. The tapped option may be re-read with "selected" (aria-pressed=true); Next becomes enabled silently. **Where the VO cursor lands after the re-render is not under the app's control** — record it (same option / first option / nothing) | The question headline or the screen name is spoken again | | | |
| VO-EN-04 | Swipe to "Next", double-tap | `h2#questionHeadline` (`tabindex="-1"`) | **The new question text, once, as a heading** ("What size mattress are you looking for?, heading level 2"). The eyebrow "Question 2 · of 10" is NOT spoken automatically (it is above the focused heading; swipe left to hear it). Help line follows on the next swipe | Headline twice; "Sleep quiz" spoken; the previous question's text; nothing spoken (focus on body) | | | |
| VO-EN-05 | Repeat -03/-04 through to the firmness question; on firmness use the slider (swipe up/down adjusts) then Next | `h2` | "Any issues with your current mattress?" once | | | | |
| VO-EN-06 | On sleep issues double-tap two options, then "Next" | `h2` | Before Next: each double-tapped option re-reads as "selected". After Next: "Anything else going on that affects your sleep?" once; then swipe: help line, "Pick up to 3", options | An option you double-tapped reads *unselected* (the multi-select toggle fired twice — a `touchend`+`click` double dispatch the handlers are meant to suppress) | | | |
| VO-EN-07 | Double-tap "← Back" | `h2` | "Any issues with your current mattress?" once; swipe: your two ticked options read as "selected" | Headline twice; wrong question | | | |
| VO-EN-08 | Next, tick two, double-tap "Review My Answers →" | `#reviewScreen` region "Quick review" | **"Quick review"** once; swipe right: "Almost there", the "Quick review" heading, **the audience sentence as plain text** ("These answers create your matches and the summary your specialist will review with you."), then each row with its Edit button | The sentence announced as a status/alert; "Quick review" twice | | | |
| VO-EN-09 | Swipe to the third row's "Edit", double-tap | `#questionScreen` region (**by design** — the question is rendered after the screen transition, so the container, not the headline, is focused) | **"Sleep quiz"** once — NOT the question text. Swipe right to reach "Question 3 · of 10" and the question | Nothing spoken; headline spoken twice | | | |
| VO-EN-10 | Swipe to the top-right "Español" button, double-tap | `restoreLanguageFocus()`: the element that had focus, if it survived the re-render (the Español button when the VoiceOver cursor was on it; otherwise the question `h2` or the "Sleep quiz" region); the current-language button is only the fallback. `<html lang>` becomes `es` synchronously | **"Español, selected"** (or equivalent) once **if** the VoiceOver cursor had focused the button; otherwise the element that had focus (the question heading, or "Sleep quiz") is re-spoken **once, in Spanish** — that is by design, not a fail. Subsequent swipes read the same question in Spanish, in the Spanish voice if one is installed (VoiceOver follows `lang="es"`) | A double utterance of whichever element is re-focused, or silence; two announcements of the button; the English voice reading Spanish when a Spanish voice is installed (record; not a trust fail) | | | |
| VO-EN-11 | Double-tap "English" to return; Next to Review; double-tap "See my sleep signature" | `h1#profileName` only — the Sleep Signature motion gather (`MOTION_POLICY.enabled = true`, `#dfmGatherLayer` `aria-hidden="true"`) is hidden from VoiceOver; the staged `role="status"` overlay is the fallback only when the gather declines or Reduce Motion is on | The profile name as a heading, once, after roughly 0.7 s of silence (with Reduce Motion on: immediately) | Profile name twice; any spoken "reveal" status while the gather runs | | | |
| VO-EN-12 | Double-tap the Sleep Brief's main button | results reveal `role="status"`, then `h1#resultsHeadline` | Reveal status once, then "Your strongest matches are ready" as a heading once. Swipe: "Your matches", subtitle, trial focus, tier buttons (Gold selected), "Gold · premium materials", **"Match strength is relative within each tier"** as plain text | The relativity note announced as live; headline twice | | | |
| VO-EN-13 | Swipe to "Restart — start a new customer, button" (top right; its `aria-label`), double-tap | `h2#sessionSafetyTitle` inside `role="alertdialog"` (`aria-labelledby` title, `aria-describedby` body); everything else made `inert` | "Start a new customer?" and the body "This clears the current answers, mattress selections, and Sleep Plan." — each once, title first (the description may follow the title automatically or on the next swipe). Swiping right reaches only "Keep this session" and "Start new customer"; the page behind is unreachable | Title twice; body never reachable; swiping escapes to the results page behind | | | |
| VO-EN-14 | Double-tap "Keep this session" | whatever had focus when the dialog opened (`_safetyReturnFocus`): the Restart button if the VoiceOver cursor was on it; otherwise the last transition heading (on Results, `h1#resultsHeadline` — a finger tap never moves focus, so the heading usually still holds it); the "Your matches" container only if nothing was focused | One utterance, whichever it is: "Restart — start a new customer, button", or "Your strongest matches are ready, heading level 1", or "Your matches" | Two utterances, or silence | | | |
| VO-EN-15 | Idle dialog (wait per §9) | `h2#sessionSafetyTitle` | "Still comparing?" then "Session paused. Continue this session where you left off, or start a new customer to clear it." — each once. **The "N seconds left" text is never spoken** (the meter is `aria-hidden`). Swipe: "Continue this session", "Start new customer" | Per-second countdown speech; title twice | | | |
| VO-EN-16 | Keep waiting until ≤60 s remain | `#sessionSafetyLive` polite status, once | **One** sentence "This session clears in about N seconds." then silence | Repeated every second; never spoken | | | |
| VO-EN-17 | Double-tap "Continue this session" | the same restore as VO-EN-14: the element that had focus when the dialog opened, otherwise the active screen container | One utterance: the last transition heading (the usual touch-kiosk case — taps never move focus), "Restart — start a new customer, button" if the VoiceOver cursor was there, or "Your matches" only if nothing was focused | Two announcements; nothing | | | |
| VO-EN-18 | Restart → "Start new customer" | `#startBtn` (Welcome), after the language reset | "Find My Sleep Match, button" once, Welcome in English. (Possible and acceptable: a second utterance of the same button when the English dictionary lands — record it, it is not a trust defect) | Any previous-customer content spoken; Spanish voice persisting | | | |
| VO-ES-01…18 | Repeat with Spanish selected on Welcome before starting (**record one Result per mapped EN step** in the Notes column as `-01 PASS, -02 PASS, -04 FAIL: …`; expand to 18 rows if a printed sheet is easier); expected strings per §2/§4 ("Cuestionario de sueño" for the quiz region, "Revisión rápida", "Tus opciones", "¿Empezar con otro cliente?", "¿Sigues comparando?", "Quedan N segundos" never spoken, "Esta sesión se borrará en unos N segundos." once) | | With a Spanish voice installed, the Spanish voice reads every screen; after the wipe the voice returns to English | | | | |

Tolerance on the dialog steps (VO-EN-13, -15): the dialog is `role="alertdialog"` named by its title, and focus lands on that same title, so iOS VoiceOver may legitimately speak the title once as the dialog's name and once as the focused heading — record it, it is not a FAIL; the duplicate to catch is the **body** spoken twice, or the title spoken again after a swipe. What a VO failure means: a duplicate or a missing announcement here is recorded and handed to the lead for a ruling; the 2026-08-12 ruling means it is not automatically a merge blocker, but R7 requires the pass to have been *run* and its findings recorded before #54 leaves draft.

---

## 8. WIN-FC — Windows forced colors (real Windows device or VM, not browser emulation)

**Setup.** Windows 11 → Settings → Accessibility → Contrast themes → choose **Aquatic** (dark) and then repeat with **Desert** (light) → Apply. Edge or Chrome; open the served URL; a hardware keyboard. Take screenshots with Win+Shift+S. **Emulation ≠ physical:** the Chromium `forced-colors: active` emulation used during implementation (and for the target descriptions below) substitutes system colours in one fixed palette and does not exercise the Windows compositor, theme palette, backdrop handling or the system focus indicator. Only a real contrast theme counts as the owner-run check. Do both a dark and a light theme: the dialog backdrop and the disabled/inert states behave differently.

| ID | Step | Expected (from the CSS) | Result | Evidence |
|---|---|---|---|---|
| WIN-FC-01 | Welcome | All copy in the theme's text colour; the data-use sentence legible (it is a plain paragraph; no author colour survives); one heritage line | | screenshot |
| WIN-FC-02 | Start, pick an answer with the mouse, then **Tab to "Next →" and press Enter** | The new question's headline shows a **3 px solid outline in the theme's text colour, 2 px outside the text**, no glow (`outline-color: CanvasText; box-shadow: none`). The headline sits at the top of the viewport | | screenshot |
| WIN-FC-03 | Press Tab once | Focus moves to the first option (outline on the option button). Press Shift+Tab: focus goes to the utility bar's Restart button — **the headline is skipped** (it is not a tab stop) | | |
| WIN-FC-04 | Click "Next →" with the mouse | No focus outline on the headline (mouse focus is not `:focus-visible`) | | |
| WIN-FC-05 | Help text | Legible under both themes; no author colour survives; not clipped | | screenshot |
| WIN-FC-06 | Review | The audience sentence legible; Edit buttons keep a border | | screenshot |
| WIN-FC-07 | Results | The tier note legible; the selected tier tab keeps a 2 px border (its fill is stripped); tabs readable | | screenshot |
| WIN-FC-08 | Restart dialog | The panel keeps a **1 px border in the text colour** so its boundary is visible even though the tinted backdrop is stripped; both buttons keep borders; the focused title shows the 3 px outline | | screenshot |
| WIN-FC-09 | Idle dialog (the localhost hook is not available on the served host either — wait 5 minutes, or open the page from a localhost server on the Windows machine and call `window.__dfSetSessionPolicy({idleWarningMs: 5000, graceMs: 60000})` in devtools **for the layout check only**, recorded as such) | Title, body, "N seconds left" text and both buttons visible; **the meter bar itself is expected to be invisible** under forced colours (its fill is an author colour) — the text carries the countdown; panel border visible | | screenshot |
| WIN-FC-10 | Tab inside the dialog | Focus cycles title → Continue → Start new customer → title (containment), never to the page behind | | |
| WIN-FC-11 | Whole-flow sweep, **both themes**: Welcome → Q1 → a tall question → Review → Results → idle dialog | Every separator rule, card border, tab border and text block is still visible; **nothing essential disappears** — the only expected casualty is the idle meter's fill (WIN-FC-09). List anything else that vanished | | screenshot per theme |

---

## 9. Triggering the idle dialog on the real device (the `__dfSetSessionPolicy` hook refuses every host except `localhost` / `127.0.0.1` / `[::1]`, so it does nothing on a Pages host)

The timer uses absolute wall-clock deadlines: the warning opens when `Date.now()` passes the deadline set by the last activity, and is reconciled on every `visibilitychange`/`pageshow`. Activity = any touch, pointer, click, key, scroll or mouse movement on the page.

1. **Real wait (the evidence route).** Leave the tablet untouched for 5 minutes, timed on a phone. Do not touch, rotate or scroll. This is the route the 2026-08-03 table used ("idle until the warning appeared"). Expiry needs a further 5 minutes untouched. Budget: 10 minutes per full expiry; plan one full expiry per orientation at most and use Continue (5 minutes) elsewhere.
2. **Background / wake (also a real route).** Lock the iPad (or switch apps) for more than 5 minutes, then wake and return to Safari: the warning appears on wake with a full 5-minute grace window. This is the 2026-08-03 "Background / wake" precedent and proves the reconciliation, not the foreground ticker. **If the iPad's Auto-Lock is shorter than 5 minutes, route 1 silently becomes route 2.** Record the Auto-Lock setting (Settings → Display & Brightness → Auto-Lock); set it to Never for the session if route 1 is wanted, and set it back afterwards.
3. **Accelerator — layout/copy only, not timing evidence.** Settings → General → Date & Time → turn off "Set Automatically" → move the clock forward 6 minutes while Safari is open on the kiosk page. The ticker compares the wall clock to absolute deadlines each second, and leaving Safari for Settings backgrounds the page, so the warning appears **when you return to Safari** (the page reconciles on becoming visible) with a fresh 5-minute meter; moving the clock another 6 minutes forward produces the expiry wipe on the next return. Restore "Set Automatically" immediately afterwards — the clock then moves back, which pushes the deadlines further out, so tap the page once (or use Continue if the dialog is open) to re-base them. Use this only for retests of wording/layout (e.g. after a dictionary change), and record "clock-advanced" in the Notes column — the real-wait route stays the timing evidence.
4. **Not acceptable as evidence:** opening the dialog from a desktop Web Inspector via the `window.__dfSession.openSafety('timeout')` inspection surface (it bypasses the idle controller), or any edit to `SESSION_POLICY`.

---

## 10. Evidence convention

- **Directory:** `outputs/manual-gates/trust-integrity-2026-08-21/` inside the checkout — `outputs/manual-gates/` is git-ignored as of this packet, so screenshots can never be committed by `git add -A`. (A directory outside the repository, e.g. `C:\Users\BlakeFord\Documents\DreamFinder-manual-gates\`, is equally acceptable; record whichever is used in the header table.)
- **Filename pattern:** `<TESTID>_<sha7>_<YYYYMMDD-HHMM>.png` — e.g. `IPAD-L-EN-15_c65a437_20260822-1432.png`. iPad screenshots arrive as `IMG_nnnn.PNG` via AirDrop/Files/iCloud; rename on the PC. Windows captures from Win+Shift+S likewise. No colons in names (Windows).
- **What the markdown records:** per test ID — filename, timestamp, commit, PASS/FAIL, one-line note. **Never embed or commit the images**; the markdown points at them. Images may contain the owner's device chrome (time, battery, personal Apple ID hints) — another reason they stay out of git.
- **Also record** the served `index.html` SHA-256 (the lead computes it from the mirror, §12 blocker 1) so the observation is tied to bytes, not to a branch name.
- **This document** is allowlisted in `.gitignore` (`docs/*` is ignored by default) and is the only committed record of the runs.

---

## 11. Retest rules after copy-only changes

A copy-only change re-runs the IDs whose pass criterion quotes the changed string, in both orientations and both languages where the string renders; geometry IDs re-run only if the change alters line count.

| Change | Re-run |
|---|---|
| Idle dialog body (`safety.timeout_body`, either language) | IPAD-L-EN-27/28, IPAD-L-ES-11, IPAD-P-EN-08, IPAD-P-ES-04, VO-EN-15 (VO-ES-15), WIN-FC-09 — and `tests/session_safety_check.mjs` / `tests/mutation_sweep.mjs` pins must be updated first (they pin the sentence exactly) |
| Idle dialog title or button labels | the same set plus VO-EN-13/14/17 |
| A quiz help line (`incoming/dreamfinder_quiz.json` → workbook → `data/quiz.json`) | the IPAD-L-EN step quoting that question (-06, -08, -09, -10, -11, -12, -13, -14, -15, -16), its ES twin in §4, and the portrait wrap step if the line count changed (IPAD-P-*-02/03); VO-EN-04/05/06 only if the changed line is on the question those steps land on |
| Data-use sentence (`privacy.data_use_preview` / `_live`) | IPAD-L-EN-03, IPAD-L-ES-01/02 (fold), IPAD-P-EN-01, IPAD-P-ES-01, VO-EN-01, WIN-FC-01, IPAD-L-EN-30 (sentence after Restart) |
| Review sentence (`review.help`) | IPAD-L-EN-19, IPAD-L-ES-08, IPAD-P-EN-06, IPAD-P-ES-03, VO-EN-08, WIN-FC-06 |
| Tier note (`results.match_relativity`) or its size | IPAD-L-EN-22, IPAD-L-ES-09, IPAD-P-EN-07, IPAD-P-ES-03, VO-EN-12, WIN-FC-07 |
| `text.emailPrivacy` (config) | IPAD-L-EN-35, IPAD-L-ES-13 |
| Any `index.html` change (even whitespace) | the whole packet — the served bytes are the unit of evidence |
| `gasUrl` becomes non-blank | the live-mode sentence renders instead: the entire privacy set above, and the packet's §2 definition must be rewritten first |

---

## 12. Blockers to executing this packet (in order of who can clear them)

1. **Cleared for this run — branch build served to the iPad.** GitHub Pages for this repo deploys `main` only; the gate had to pass *before* merge (circular). The retained dry-run mirror `beford782/df-phase1-dryrun` served mirror commit `22b9109`, whose tree was the exact public PR #54 tree at `f748f59` plus only `verify.html`. GitHub Pages reported `built`; the live `index.html` was byte-identical to the `f748f59` git blob (SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321`); the compact packet was live at `https://beford782.github.io/df-phase1-dryrun/verify.html`. The lead also verified the live app showed Welcome with no domain-lock or data-error screen. This clears the serving blocker for this run only; the mirror must not be mistaken for production.
2. **The pass is valid only for the bytes served.** §11's "any `index.html` change → whole packet" rule applies; freeze the head before mirroring and record it in the header table.
3. **The 5-minute idle wait, twice per orientation** (warning, then expiry) — ~25–40 minutes of hands-off time across the matrix. §9 routes 1–2 are evidence; route 3 is an accelerator for wording/layout only. Auto-Lock must be recorded and, for route 1, set to Never for the session.
4. **Cleared for this run — R7 VoiceOver sanity pass.** Blake's 2026-08-22 all-tests-pass attestation covers the compact packet's five VoiceOver checks, including the Spanish spot-check. No transcript or voice-installation metadata was supplied; §15 records that evidence limitation. Screen-reader functionality remains outside this gate's scope.
5. **Spanish wording is provisional.** The idle ES body (R5), the three privacy/audience sentences and the nine help lines are all owed native review (roadmap Invariant 12; the privacy sentences are the priority exception). The ES runs record wrap, clipping and accents; they cannot approve wording, and the packet must say so in the Result cell.
6. *(cleared)* `.gitignore` now ignores `outputs/manual-gates/` and allowlists this packet.
7. **Cleared for this run — real Windows forced colors.** Blake's 2026-08-22 all-tests-pass attestation covers both compact Windows checks in Aquatic and Desert. No screenshots or Windows/browser version metadata were supplied; browser emulation remains explicitly not the basis of the pass.
8. **No showroom authorization follows from a full PASS.** `docs/kiosk-device-hardening.md` remains BLOCKING (unsupervised, unpinned, personal Apple ID, autofill surfaces on); this packet is the Phase 1 merge-gate evidence for one PR, nothing more.

---

## 13. Numbers the owner can compare against (Chromium emulation at the device matrix, DPR 1 — targets, not evidence)

| Surface | Landscape 1194×748 | Portrait 834×1108 |
|---|---|---|
| Heritage eyebrow (the one visible heritage line) | y 156–173 | EN 216–233 · ES 194–211 |
| "Find My Sleep Match" button | y 457–522 | EN 476–541 · ES 454–519 |
| Data-use sentence (16px, 2 lines) | EN 560–608 · ES 604–652 | EN 579–627 · ES 601–649 |
| Outcome row ("Your consultation builds") | EN 626–716 · **ES 670–787 (39 px below the fold — recorded residue, 1.6)** | EN 645–731 · ES 667–753 |
| Cities row | EN 850–877 · ES 945–972 (below the fold, both — pre-existing) | EN 889–916 · ES 911–938 |
| Welcome document height | EN 1001 · ES 1096 (scrolls) | 1108 (no scroll) |
| Question headline top after every Next / Back (all 9–10 transitions, EN+ES, partner+solo) | **138** | **122** |
| Scroll consumed on the tall questions before Next (what the reset undoes) | firmness 144 (EN) / 87 (ES); sleep issues 146; body type 68 | 0 (nothing scrolls) |
| After Review → Edit / Review → Back, headline top | 138 (focus on the screen container, by design) | 122 |
| Review sentence (15px) | y 159–182 | y 130–152 |
| Tier tabs / tier note (15px) | tabs 294–353 · note **389–411** | same |
| Utility bar Restart control | x 1096–1180 (ES 1088), y 14–58 | x 736–820 (ES 728), y 14–58 |
| Restart dialog panel | y 246–502, w 460 | y 426–682 |
| Idle dialog panel (with meter) | y 220–528, w 460 | y 400–708 |
| Keyboard Enter on Next (forced-colors emulation) | headline focused, `:focus-visible` true, 3 px outline in CanvasText, top 138; Tab → first option; Shift+Tab → Restart control (headline skipped) | — |
| After idle expiry | Welcome, `lang=en`, focus on Start, answers empty, Sleep System containers empty | same |
| Language switch on Review (keyboard) | focus stays on the language button; `html lang` flips; sentence re-rendered | same |
| Console errors across all 8 runs | none | none |

---

## 14. Residual risks and deviations recorded after the run (fill in; empty means "nothing observed", not "not run")

Every VoiceOver duplicate, ES clipping, wrap oddity, focus landing that differed from the table, or step that could not be executed lands here — including anything the tolerance paragraphs in §7 and §9 say to "record, not fail". A run whose header says PASS while this table has rows without a lead ruling is **PARTIAL**, not PASS. A ruling here is a product decision about a recorded observation; it is not an approval of wording, of Spanish, or of showroom use.

| ID | Test ID(s) | Observation (what was seen / heard) | Lead ruling (accept / fix / retest) | Accepted by / date | Retest required (which §11 row) |
|---|---|---|---|---|---|
| RR-01 | | | | | |
| RR-02 | | | | | |
| RR-03 | | | | | |

---

## 15. Owner attestation — compact physical run (2026-08-22)

Blake reported **“all tests passed”** after receiving the compact packet and,
when asked for its Share Results export, instructed the lead to **assume every
test passed rather than exchange the export**. This is an explicit owner
attestation, not reconstructed device telemetry.

| Field | Recorded value |
|---|---|
| Tester / approver | Blake Ford, owner attestation in the Codex task |
| Date | 2026-08-22 (America/Chicago) |
| Build tested | PR #54 branch head `f748f59` |
| Served build | `https://beford782.github.io/df-phase1-dryrun/`; mirror commit `22b9109` |
| Served `index.html` proof | byte-identical to the `f748f59` git blob; SHA-256 `B0981E11F9065FA69DBD8BCD31EE100C7044E1FFB58C56AC87241E525D412321` |
| Packet | compact 21-check `verify.html`; full packet remained linked as the detailed reference |
| Result | **PASS — all 21 compact checks owner-attested passed** |
| Gates closed | mounted iPad landscape EN/ES; mounted iPad portrait EN/ES; partner and solo paths; idle Continue and Restart/wipe; VoiceOver sanity pass including Spanish spot-check; real Windows forced colors in Aquatic and Desert; evidence/disposition checks |
| Evidence supplied | owner attestation only; no Share Results export, screenshots, spoken transcript, exact device/iPadOS/Windows/browser versions, store/location or evidence-directory path supplied |
| Residual observations | none reported by the owner |

The absent metadata is recorded as an evidence limitation, not filled by
assumption. Blake's instruction nevertheless resolves the R7/R8 physical gate
for `f748f59`. It does **not** approve the English copy, legal/business
representations, privacy policy, native Spanish, showroom use, deployment,
ready-for-review status or merge. Any later `index.html` change invokes §11 and
invalidates this physical pass until the applicable retest is recorded.
