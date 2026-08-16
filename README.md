# DreamFinder — Lacks Furniture

Personalized mattress finder kiosk for Lacks Furniture showrooms (South Texas / Rio Grande Valley, EN+ES). A single-page
tablet web app: customers take a 9–12 question sleep quiz, get personalized
mattress recommendations across Gold/Silver/Bronze tiers, browse accessories,
and receive their results plus a discount code by email. Salespeople get a
handoff screen showing the customer's saved picks.

DreamFinder is a **white-label** product — each retailer gets its own repo and
deployment. This repo is Lacks Furniture's instance, deployed as a preview at:

  https://beford782.github.io/LacksFurniture

> **⚠️ PREVIEW DEPLOYMENT — not for production use.** No live email or lead
> capture (`gasUrl` is intentionally blank), and the brand palette and Spanish
> copy are pending Lacks Furniture review.

## Lacks Payment Choice

The Lacks experience replaces the illustrative Savings Pass with **Lacks
Payment Choice** — a financing-visibility experience ("Better sleep. More ways
to bring it home."). Sleep fit always comes first: financing never affects
mattress scoring, tiers, or the Sleep Brief. The kiosk presents Lacks'
published financing paths (Synchrony promotional financing, Lacks In-House
Credit, lease-to-own, Build My Credit, and a separate optional
Mexico-delivery program) with their conditions adjacent, calculates **no**
monthly payments, and collects **no** financial data — live financing
applications happen only on approved external Lacks/lender pages
(lacks.com/financing), reached by link or the committed QR code. Exact
rate/term claims are freshness-gated and fail closed to generic guidance when
stale. Canonical editable source: `incoming/lacks_financing.json`; verification
record: `docs/financing-verification-2026-07-30.md`.

## Daybreak promotions contract (inert)

The generated configuration carries a governed promotions contract
(`store-config.promotions`) that ships **inert**: `activeScenario` is null and
`scenarios` is empty, so the ordinary application renders exactly as it did
without the key. Canonical editable source: `incoming/lacks_promotions.json`.
Real campaigns require owner authorization, fresh allowlisted evidence, and
approved bilingual review through `tools/validation.py`'s current-event
contract before anything can activate — CI locks the shipped state until the
governed runtime exists.

## Local Black Friday promotion demo

Two clearly separated URLs exist once deployed:

- Ordinary preview (no promotions): https://beford782.github.io/LacksFurniture/
- Illustrative Black Friday demo: https://beford782.github.io/LacksFurniture/demo/black-friday/

The demo URL is designed for prospect demonstrations — it runs the complete
application (quiz, recommendations, Payment Choice, comparison, Sleep System,
handoff, EN/ES) with two **illustrative** Black Friday promotions injected. The
offers are **not current Lacks promotions** and every promotion surface says so
in both languages. A 72-hour demonstration deadline is computed when the page
loads; no countdown ticks. The demo sends no lead or email data: its
configuration ships a blank `gasUrl` and the scenario forces email into
preview mode, so nothing a prospect types leaves the browser. It works in iPad
Safari from a tapped link and is marked `noindex,nofollow,noarchive` where
crawlers honor it.

Local development preview (never changes production configuration; stop with
Ctrl+C):

    python tools/serve_daybreak_demo.py --port 8000
    # then open http://127.0.0.1:8000/

The hosted bundle under `demo/black-friday/` is **generated** — never edit it
by hand. Regenerate with:

    python tools/build_black_friday_demo.py

Demo content lives only in `demo/daybreak-black-friday.json`; the production
pipeline (`incoming/` → workbook → `data/store-config.json`) never consumes it,
and CI proves it.

## Repo orientation

- `index.html` — the entire kiosk app (single-file SPA, no build step). Domain-locked to the configured GitHub Pages host.
- `Code.gs` — Google Apps Script backend for email send + Sheet logging. Deployed separately via the Apps Script editor.
- `data/store-config.json` — Lacks-specific branding, copy, GAS endpoint, public asset root, languages, and discount config. Generated from the build inputs in `incoming/` — edit those and re-run the converter rather than editing this file.
- `data/mattresses.csv` — source-of-truth mattress lineup. Edit here.
- `data/mattresses.json` — generated. **Never edit by hand.** Regenerate with `.\build-data.ps1` from the repo root.
- `data/dict-en.json` / `data/dict-es.json` — generic UI strings, shared across all retailer deployments.
- `images/mattresses/` and `images/accessories/` — JPG product images (lowercase kebab-case filenames, no spaces).

## Day-to-day workflow

1. Create a feature branch from the latest `main`.
2. Make the change and run the relevant local checks. If mattress CSV data
   changed, run `.\build-data.ps1` and commit the regenerated JSON with it.
3. Push the feature branch and open a pull request targeting `main`.
4. Wait for the required `Full suite (18 checks)` status check to pass.
5. Merge the pull request. GitHub Pages deploys the merged `main` branch
   automatically; verify the Pages `build` and `deploy` checks afterward.

Direct and force pushes to `main` are not part of the release workflow. See
[`docs/deployment-workflow.md`](docs/deployment-workflow.md) for branch-protection
settings, verification, and recovery guidance.

For local development, serve the repo over HTTP — `python -m http.server 8000`
or VS Code Live Server. `file://` is not supported (CORS + domain lock).

## Deeper docs

- **Project guide & development conventions** — see [`CLAUDE.md`](CLAUDE.md). Covers app architecture, scoring engine, white-label boundaries, iPad/touch rules, image format conventions, and what not to touch without checking first.
- **Deployment and branch governance** — see [`docs/deployment-workflow.md`](docs/deployment-workflow.md). Covers the PR-only release path, required CI check, branch-protection settings, and post-merge Pages verification.
- **New retailer onboarding** — see [`onboarding/Build_Runbook.md`](onboarding/Build_Runbook.md). A workbook → validated bundle pipeline: generate the blank template (`tools/create_template.py`), fill it, then `tools/convert_store_data.py` emits the data bundle (store-config, mattresses, accessories, manifest, normalized images, allowed-hosts). The retailer-facing template and the converter share one schema (`tools/workbook_schema.py`).

## Updating the Apps Script backend

Changes to `Code.gs` in this repo do **not** auto-deploy. After editing, paste
the new contents into the bound Apps Script project, then:

  Manage Deployments → pencil → New version → Deploy

Without the new-version step, the live web app keeps serving the previous
code.
