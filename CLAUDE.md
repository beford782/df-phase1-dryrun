# DreamFinder — Claude Code Project Guide

## Working With Blake

If Blake asks you to do something and you know of a better approach —
whether it's a cleaner implementation, a simpler workflow, a tool that
would make the task easier, or a potential pitfall with the current
approach — **speak up before acting**. Briefly explain the alternative
and let him decide. Don't just silently execute what was asked if you
can see a better path.

---

## What DreamFinder Is
DreamFinder is a store-agnostic single-page tablet kiosk app for mattress showroom floors.
Customers take a 10-question sleep quiz, get personalized mattress recommendations across
Gold/Silver/Bronze tiers, browse accessories, and receive results + a discount code by email.
Salespeople get a handoff screen showing the customer's saved picks.

**DreamFinder is a white-label product.** The canonical app has no relationship to any
specific retailer. Each store gets its own fully customized deployment.

---

## This Repo — Lacks Furniture Deployment
Deployed (PREVIEW, not production): https://beford782.github.io/LacksFurniture
Repo: https://github.com/beford782/LacksFurniture (main = Pages branch)
Local path: `C:\Users\BlakeFord\Documents\GitHub\LacksFurniture`
Forked from the WGR template (beford782/WGRFurniture) at commit b05e574.

**Lacks Payment Choice**: the primary promotional concept is a financing
experience (not the illustrative Savings Pass, which is disabled via
`discount.mode: "disabled"`). Canonical source: `incoming/lacks_financing.json`
→ workbook Promotions tab (envelope form) → `store-config.financing`. Sleep fit
first, payment choice second — financing NEVER affects scoring, tiers, or the
Sleep Brief. Exact rate/term claims are freshness-gated fail-closed
(`verifiedAt` + `maxAgeDays` + allowlisted `sourceUrl`; see
`tools/source_hosts.json`). No product-level monthly payments are calculated or
shown (V1 invariant, enforced by `validate_financing`). Live financing
applications happen only on approved external Lacks/lender pages — the kiosk
collects no financial data. Facts verified against live lacks.com pages:
`docs/financing-verification-2026-07-30.md` (includes the discrepancy log).

This is Lacks Furniture's instance (South Texas / Rio Grande Valley, family-owned
since 1935; EN+ES). Everything in `data/` is Lacks-specific and generated from the
build inputs in `incoming/` (lacks_store_values.json, lacks_mattresses.json,
lacks_accessories.json → build_lacks_workbook.py → Lacks_Store_Data.xlsx →
tools/convert_store_data.py). The Promotions tab carries the two-key envelope
`{"promotions": …, "financing": …}`: promotions from
`incoming/lacks_promotions.json` (the inert Daybreak contract — shipped
`scenarios` stays `{}` until a governed current-event campaign passes owner
authorization + evidence + bilingual review; CI locks this), financing from
`incoming/lacks_financing.json`. **Illustrative demo campaigns (the Black
Friday demo) live ONLY in `demo/daybreak-black-friday.json` and the generated
`demo/black-friday/` bundle (rebuild: `python tools/build_black_friday_demo.py`;
localhost preview: `python tools/serve_daybreak_demo.py`) — they must never
enter `incoming/`, the workbook, or production `data/`.** Catalog provenance + rescrape technique:
incoming/lacks_catalog_selection.json (lacks.com is AVB/Magento — browser-session
API + linqcdn image pull via fetch_lacks_images.py; NOT the Blueport sitemap
technique). gasUrl is intentionally blank (demo mode — no live email/leads).
Locally-made provenance flag: Restonic + Chattam & Wells = yes (made in Texas,
per Blake 2026-07-30); the flag's former +25 scoring bonus was retired by owner
ruling 2026-08-13 (Daybreak PR 1) — it is data-only now, never a scoring
input. Do not treat any Lacks-specific content as a default or
starting point for other retailers. Elsewhere in this file, references to "Bel"
are template heritage — read them as "this repo's retailer".

---

## Working pattern: terminal + web review

Claude Code in terminal does the work. Web Claude (claude.ai) reviews
the work for non-mechanical changes. Sequential, not parallel.

- Terminal Claude Code is the primary surface for DreamFinder work —
  file edits, greps, commits, pushes, local dev server.
- Web Claude is the second pair of eyes for high-stakes changes:
  schema additions, white-label boundary changes, new public API
  fields, anything where "trust the wiring" feels tempting.
- Skip web review for genuinely mechanical work (typo fixes, dict
  string updates, single-property CSS tweaks).
- Handoff: paste terminal output (proposals, diffs, grep results,
  git status) into web chat verbatim. Do not summarize — the value
  is in raw output, including narration the terminal session might
  gloss over.
- Do not run both surfaces editing files in parallel on the same
  task. Sequential only.

Cadence that has shipped clean: discovery → proposal → web review →
approval → implement → verify → commit → push. Single commit at a
time, browser-verify between commits, no back-to-back-without-review.

Reference: 2026-04-30 / 2026-05-01 sessions shipping commits 72424d1
(handoff idle timeout), 9e2f256 (dream code wipe), 7f766fd (Nocturnal
dead code retire) all followed this pattern.

---

## White-Label Architecture — Critical Rules

### The store-agnostic boundary
`index.html` must contain zero store-specific content. No retailer names, logos,
colors, mattress models, or discount codes hardcoded in the HTML.

All store identity lives in two files only:
- `data/store-config.json` — branding, store name, colors, brands list, GAS URL,
  public asset root, and all retailer-specific copy (text / text_es blocks)
- `data/mattresses.csv` / `data/mattresses.json` — this store's mattress lineup

### Each retailer gets its own repo
Do not push Bel changes to another retailer's deployment.
Do not copy `data/mattresses.csv` between retailer repos — each store has a
completely different product lineup.

**Deployments (separate repos):**
- Lacks Furniture — this repo (preview at beford782.github.io/LacksFurniture)
- The Furniture Market — `beford782/TheFurnitureMarket` (active)
- Star Furniture — separate repo (planned)

### New features must be config-driven
Any feature that could vary by store (colors, copy, quiz questions, tier names,
email templates) must be driven by `store-config.json`, not hardcoded.
If you find yourself writing a store name or brand color into the HTML, stop —
it belongs in config.

### Quiz questions are config-driven (data/quiz.json)
The 12 quiz questions live in `incoming/dreamfinder_quiz.json` → workbook
Quiz tab (JSON envelope, same channel as the Promotions financing envelope)
→ `data/quiz.json` (generated — never edit directly; rebuild via
build_lacks_workbook.py + convert_store_data.py). The app fetches it at load
alongside mattresses/store-config and fails hard without it.

**Structure is an app-level contract**: question/option ids, types, order,
and `scores` tags are consumed by name across the app (profile assignment,
Sleep Brief, adjustable-base hero, narratives, email) and are pinned exactly
by `validate_quiz` in `tools/validation.py`. Per-retailer variation is COPY
ONLY (question/helpText/category/label/sublabel/copyVariants text, both
languages). Adding/removing/renaming questions or options, or changing
scores, requires an app-code review of the id consumers first — and scoring
changes still require Blake's sign-off. Answer-aware copy is declarative
(`copyVariants`, resolved by `resolveQuizCopy`) — no functions in config.

---

## App Architecture — Read Before Touching Anything

### Single-file HTML
`index.html` is the entire app. No separate JS or CSS files. Do not split it.

### Domain Lock
A domain lock at the top of the `<script>` block restricts where the app runs.
Allowed hosts: `beford782.github.io`, plus `localhost` / `127.0.0.1` (built-in fallback).
The allowlist is **config-driven (M1)**: the host lives in `store-config.allowedHosts`,
the converter projects it into `data/allowed-hosts.js`
(`window.__DF_ALLOWED_HOSTS = [...]`), and the lock IIFE reads that global with a
`localhost`/`127.0.0.1` fallback — so **do not hand-edit any `allowed` array in
`index.html`** to add a domain. To allow a new host, set it in `allowedHosts` (the
workbook / `store-config.json`) and regenerate. After deploy, confirm
`https://<host>.github.io/DreamFinder/data/allowed-hosts.js` returns **HTTP 200** — a
missing file blanks the production host while `localhost` still works.

Opening `index.html` via `file://` is **not supported** — the domain lock rejects
empty hostname, and even if it didn't, browser CORS blocks `fetch()` of
`data/*.json` on the file protocol. For local development, serve the repo root
over HTTP (e.g. `python -m http.server 8000`, `npx http-server`, or VS Code's
Live Server) and open `http://localhost:8000/`.

### Data files
- `data/mattresses.csv` — source of truth for mattress lineup, edit this
- `data/mattresses-es.csv` — Spanish translations for mattress display text (optional per retailer)
- `data/mattresses.json` — generated file, never edit directly
- `data/store-config.json` — all store-specific configuration
- `data/dict-en.json` — English UI dictionary (shared across all retailers)
- `data/dict-es.json` — Spanish UI dictionary (shared across all retailers)

The app fetches mattresses.json, store-config.json, and the active dictionary at load time.

### Build script
```
.\build-data.ps1
```
Run from repo root. Converts `data\mattresses.csv` → `data\mattresses.json`.
If `data\mattresses-es.csv` exists, merges Spanish translations as `tags_es`,
`highlight_es`, `reasons_es` fields into the JSON.
Always run this before committing if the CSV was changed.
Never commit CSV changes without also committing the regenerated JSON.

### Git hooks (one-time activation per clone)
This repo ships hooks in `tools/hooks/`, activated via `core.hooksPath`.
Git does **not** auto-enable hooks from a clone for security reasons, so on a
**fresh clone (new machine, or a new retailer repo forked from this one)** run
once:
```
git config core.hooksPath tools/hooks
```
Without this, the hook files exist but never fire. Current hooks:
- `pre-push` — refuses every direct push to `main`; push a feature branch and
  merge it through a pull request (see `docs/deployment-workflow.md`).
- `pre-commit` — when a mattress CSV is staged, re-runs `build-data.ps1` and
  refuses the commit if `data/mattresses.json` is out of sync. Enforces the
  "never commit CSV without regenerated JSON" rule above. Escape hatch:
  `GIT_SKIP_CSV_BUILD=1 git commit ...`. Requires `pwsh` or `powershell` on PATH.

---

## Bilingual / i18n Architecture — Critical Rules

DreamFinder ships with full English + Spanish support as a core feature of the
white-label template. Every new retailer deployment includes bilingual accessibility
by default. Do not treat this as optional or Bel-specific.

### How it works
- **Language toggle** (EN | ES) appears on the welcome screen. Controlled by
  `store-config.json` field `"languages": ["en", "es"]`. Toggle hides automatically
  if only one language is configured.
- **UI strings** live in `data/dict-en.json` and `data/dict-es.json`. These are
  generic (not retailer-specific) and shared across all deployments. Do not put
  store names, slogans, or brand copy in the dict files.
- **Retailer-specific text** lives in `store-config.json` under `text` (English)
  and `text_es` (Spanish) blocks. This includes trust signals, footer copy, email
  privacy text, social proof, and in-stock labels.
- **Quiz questions** carry inline bilingual objects `{en: "...", es: "..."}`
  in `data/quiz.json` (canonical source `incoming/dreamfinder_quiz.json`).
  **Profile names and label constants** still use inline bilingual objects
  directly in `index.html`. The `L(obj)` function reads the active language
  from these objects in both cases.
- **Mattress product text** (badges, highlights, match reasons) is translated via
  `data/mattresses-es.csv`. The build script merges these into `mattresses.json`.
  If a retailer hasn't provided Spanish product translations, the app falls back
  to English text gracefully.
- **Email** is sent in the customer's chosen language. The client builds the HTML
  email body in the active language and sends `lang: currentLang` in the GAS payload.
  `Code.gs` uses this for the subject line and server-side fallback.
- **Language switching preserves the session.** Changing EN/ES mid-session keeps
  the current screen, answers, saved mattresses, reactions, favorite/finalist
  state, comparison state, Sleep System decisions, financing-interest state and
  any in-progress contact values. It is a copy swap, not a reset.
- **Only a new-customer wipe resets language to English.** The authoritative
  wipe (`resetSessionState()`, which `window.startOver()` delegates to) runs on
  a confirmed Restart, on final timeout, and from the email confirmation's
  "Start New Customer". It returns the app to English so the next customer
  never inherits the previous customer's language.

### Rules for new features
- Any new user-facing string must be bilingual. Use `t('key')` for dict lookups
  or `{en: "...", es: "..."}` with `L()` for inline data.
- Never hardcode English-only display text in JavaScript template literals.
- Retailer-specific copy (store name, taglines, footer) goes in `store-config.json`
  `text` and `text_es` blocks — never in the dict files.
- When adding new quiz questions or options, always include both `en` and `es` values.
- When adding new accessories, use `{en: "...", es: "..."}` for `name`, `category`,
  and `description` fields.

### Key functions
- `t(key, replacements)` — dictionary lookup with optional `{placeholder}` interpolation
- `L(obj)` — reads `currentLang` from a `{en: "...", es: "..."}` object; falls back
  to plain strings gracefully
- `mField(m, field)` — language-aware mattress field accessor (reads `field_es` when
  in Spanish mode)
- `applyTranslations()` — applies `data-i18n` attributes on all tagged HTML elements
- `switchLanguage(lang)` — reloads dictionary, updates toggle UI, re-applies text
- `applyLanguageConfig()` — shows/hides toggle based on `store-config.languages`

---

## Mattress Data — CSV Column Reference

| Column | Notes |
|---|---|
| `tier` | gold / silver / bronze |
| `id` | g1–g33, unique per deployment, never reuse |
| `name` | Model name |
| `brand` | Spring Air / Restonic / Bel-O-Pedic (Bel-specific) |
| `subBrand` | Sub-line (Copper, Last Mattress, etc.) |
| `firmnessScore` | 1–10 number used by scoring engine |
| `firmnessLabel` | Display text (Plush, Medium, Firm, etc.) |
| `price` | Leave blank — not displayed in app |
| `locally-made` | yes / no — data-only provenance flag (scoring use retired 2026-08-13, see below) |
| `quizTags` | Pipe-delimited. Used by scoring engine as `features` in JSON |
| `displayBadges` | Pipe-delimited. 2–3 chips shown on card |
| `highlight` | One punchy line for the card hero (~10 words) |
| `features` | Long-form feature text for display |
| `reason_*` | Personalised match reason shown to customer per quiz answer |

---

## Scoring Engine — How Recommendations Work

Located in `index.html` around line 4040. Two scoring passes:

**1. Firmness (most important, max +50)**
Linear sliding scale: `firmScore = max(0, 50 - diff * 10)` where
`diff = |customerFirmness - mattressFirmness|`. So: diff 0 = +50,
diff 1 = +40, diff 2 = +30, diff 3 = +20, diff 4 = +10, diff 5+ = 0.
Additionally, if `diff ≥ 4` an extra **-20** penalty is applied,
so a diff of 4 nets -10 and a diff of 5+ nets -20.

**2. Feature matching**
Quiz answers map to feature tags via `opt.scores`. Each matching tag adds points.
Tags are stored in the JSON `features` array (mapped from `quizTags` in CSV).

**3. Locally made bonus — RETIRED (owner ruling 2026-08-13, Daybreak PR 1)**
The former +25 bonus for `locallyMade === true` (and its "typically in stock
and ready for fast delivery" match reason) was removed: origin and
availability must not alter sleep-fit ranking, and the reason text asserted
stock/delivery facts no data source backs. The `locally-made` CSV column
remains as a data-only provenance flag; the engine may not read it —
`tests/scoring_isolation_check.mjs` pins the absence, and
`tests/fixtures/phase1_output_baseline_daybreak_pr1.json` is the post-removal
recommendation baseline. Reinstating any scoring use of origin requires
Blake's explicit sign-off.

Qualified results = top 3 models scoring ≥ 60% of the top score.

IMPORTANT: Do not modify scoring weights or logic without confirming with Blake.
This area has had significant prior tuning.

---

## Backend — Google Apps Script

Email delivery and lead logging use a Google Apps Script (GAS) web app.
The GAS endpoint URL lives in `data/store-config.json` under `gasUrl`.
Each retailer deployment has its own GAS script and endpoint.

Absolute image URLs for the HTML email body are built from
`store-config.json`'s `publicAssetRoot` (each retailer's own public
hostname); emails fall back to relative URLs if that field is missing.

If GAS needs redeployment: Manage Deployments → pencil icon → New version.
The GAS script builds email HTML server-side to avoid payload size limits.

---

## iPad / Touch Event Rules

The app runs on iPads in showrooms. These rules must be preserved in all deployments:
- `touch-action: manipulation` on all interactive elements
- Dynamic elements (mattress cards, buttons) need both `touchend` and `pointerdown` listeners
- `event.preventDefault()` on touchend handlers to prevent ghost clicks
- `location.reload()` must never be used — always call `window.startOver()` to reset

IMPORTANT: Do not change touch handling without confirming with Blake — this required
significant debugging to get right.

---

## Key App Flows (Don't Break These)

- **Quiz → Results**: 10 questions (solo sleepers see 9 — `partner_disturbance` has a `skipIf` for solo; was 12 until the 2026-08-12 owner-ruled removal of the two zero-scoring questions `sleep_quality` and `current_mattress_age`) → scoring engine → Gold/Silver/Bronze tier tabs → top pick badge
- **Mattress drawer**: Opens on card tap. Prev/next navigation between results. Firmness bar, match reasons, features.
- **Accessories / Sleep System**: Framed as "Build Your Sleep System" (not add-ons).
  Conditional adjustable base hero (shown when quiz flags snoring, reflux, or back pain)
  with animated SVG and personalized benefit cards. Featured top pillow with "Matched to
  Your Profile" badge. "Did You Know?" educational callout for protectors. Sticky cart bar.
  Cart persists to handoff screen.
- **Discount reveal**: Dramatic animation — DREAM + 3-digit code. 10rem gold glow font.
- **Handoff screen**: Customer marks "I'm Interested" on mattresses/accessories. Salesperson sees saved picks.
- **Idle timeout (Gate 1B)**: warning → explicit recovery or wipe. Ordinary
  inactivity never resets destructively. After `SESSION_POLICY.idleWarningMs` a
  modal safety dialog obscures the session ("Still comparing?"); the customer
  can Continue (repeatable, grants a full new window) or Start new customer.
  Only expiry of `SESSION_POLICY.graceMs` wipes. Absolute `Date.now()`
  deadlines, reconciled on `visibilitychange` / `pageshow`, so an iPad waking
  from sleep behaves correctly. Timing values are **provisional preview
  defaults** and live only in `SESSION_POLICY` — see
  `docs/kiosk-device-hardening.md`.
- **Restart is destructive and confirms first**: the persistent Restart control
  opens the same safety dialog in restart mode. `window.startOver()` is the
  unconfirmed wipe and delegates to `resetSessionState()`.

---

## Image Format Convention

**MUST:** all mattress and accessory images are `.jpg`, lowercase
kebab-case, no spaces, no underscores.

- ✅ `copper-ice-regular.jpg`, `kimber-firm.jpg`, `adjustable-4150.jpg`
- ❌ `Copper Ice Regular.png`, `kimber_firm.webp`, `AdjustableBase.PNG`

**Why:** Outlook desktop's Word render engine doesn't support `.webp`
at all, handles `.png` unreliably (especially with URL-encoded spaces
in the filename), and iOS Mail's Mail Privacy Protection is stricter
still. Customer results emails routinely ship product images, so any
image outside the jpg-kebab-case convention shows as a broken link.

**When adding a new mattress or accessory image:**
1. Save as `.jpg` at quality 85–90.
2. Filename lowercase, kebab-case, no spaces. Must match the
   mattress `name` column in CSV (lowercased, spaces kept in CSV but
   use kebab-case in the filename if you're adding a new product —
   the build script tolerates spaces for legacy files, prefers
   kebab-case going forward).
3. Drop into `images/mattresses/` or `images/accessories/`.
4. For accessories, reference the filename in `index.html`'s
   `ACCESSORIES` array.

**Converting existing webp or png assets:**
```python
from PIL import Image
Image.open('source.webp').convert('RGB').save('target.jpg', 'JPEG', quality=88, optimize=True)
```

`build-data.ps1` resolves extensions in order `jpg, png, webp`, so a
leftover `.webp` won't break anything — but new images should be jpg
from the start to avoid the email rendering gap.

---

## Deployment

The repository uses a pull-request deployment workflow. GitHub Pages still
publishes from `main`; merging an approved PR to `main` triggers the deployment.

```
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c <owner>/<short-description>
# edit, test, commit
git push -u origin HEAD
# open a PR targeting main, wait for Full suite (18 checks), then merge
```

Do not push directly to `main`, and do not use `--force` or the legacy
`git ship` alias. The versioned pre-push hook rejects direct pushes to `main`;
server-side branch protection is the authoritative control. See
`docs/deployment-workflow.md` for the exact protection settings, recovery
procedure, and post-merge Pages verification.

### IMPORTANT: Claude Code on the Web creates feature branches automatically
If this session is running in Claude Code on the web (claude.ai/code),
pushes default to a `claude/<name>-<id>` branch. That is the correct place for
the change, but pushing the branch alone does not deploy it.

**At the start of every session and before any commit/push, Claude MUST:**
1. Check the current branch with `git branch --show-current`
2. Confirm the branch is not `main`; create a feature branch if necessary.
3. Push only the feature branch and open or update its pull request.
4. Report the PR and CI state separately from the deployment state.

Never describe a branch push as a deployment. A change is live only after its
PR is merged and the Pages `build` and `deploy` checks succeed on the resulting
`main` commit.

---

## Don't touch without checking with Blake first

- Modify scoring weights or logic in the quiz engine
- Change touch event handling
- Hardcode any store-specific content into `index.html`
- Copy mattress data or config between retailer repos
- Edit `data/mattresses.json` directly (always regenerate from CSV)
- Add store names, colors, or branding anywhere except
  `store-config.json`
