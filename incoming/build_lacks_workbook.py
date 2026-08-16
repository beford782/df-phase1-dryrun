#!/usr/bin/env python3
"""Generate the Lacks Furniture onboarding workbook.

Mirrors incoming/build_household_workbook.py but for the Lacks Furniture
deployment (South Texas / Rio Grande Valley; family-owned since 1935).

Builds an .xlsx whose tab/column headers come from the repo's shared
tools/workbook_schema.py (so they cannot drift from what the converter reads).

SOURCE OF TRUTH — self-contained, does NOT read data/store-config.json.
Unlike the Household script (all content inline), authored content lives in
three sibling build-input JSON files so it stays editable as data:
  incoming/lacks_store_values.json  — text/voice/discount/privacy leaves
  incoming/lacks_mattresses.json    — 26 models (EN CSV contract + es block)
  incoming/lacks_accessories.json   — 10 accessories (bilingual)
Catalog provenance (prices, image UUIDs, scrape notes) is documented in
incoming/lacks_catalog_selection.json; images come from fetch_lacks_images.py.

Output: incoming/Lacks_Store_Data.xlsx

Locally-made: Blake confirmed (2026-07-30) Restonic is made locally in Texas;
Chattam & Wells is manufactured by Restonic, so both carry locally-made = yes.
Spring Air / Tempur-Pedic / Genesis (Kingdom, USA but not Texas) = no. The
per-model value is authored in lacks_mattresses.json ("locallyMade").
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(REPO, "tools"))
import workbook_schema as schema  # noqa: E402
import financing_headline as fin_headline  # noqa: E402
import openpyxl  # noqa: E402

OUT = os.path.join(HERE, "Lacks_Store_Data.xlsx")


def _load(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return json.load(f)


# ---- Store Info (one row): identity / colors / hosting / manifest -----------
# Text / voice / discount / privacy leaves come from lacks_store_values.json
# (applied below, overriding any literal here). Colors come from lacks.com's
# AVB-platform CSS custom properties (--avb-primary/secondary etc., 2025
# snapshot): black + gold-yellow #FABD0F with orange #FF5C36 hover accent.
# UNCONFIRMED as official brand values — confirm with Lacks before launch.
STORE = {
    "Store Name": "Lacks Furniture",
    "Store Key": "lacks",
    "Languages": "en,es",
    "Logo Line 1": "Lacks",
    "Logo Line 2": "furniture",
    "Primary Color (hex)": "#FABD0F",
    "Primary Color Light (hex)": "#FFD24D",
    "Primary Color Glow (rgba)": "rgba(250,189,15,0.15)",
    "Accent Color (hex)": "#FF5C36",
    "GAS URL": "",
    "Public Asset Root": "https://beford782.github.io/LacksFurniture/",
    "Allowed Hosts": "beford782.github.io",
    "Manifest Name": "DreamFinder - Lacks Furniture",
    "Manifest Short Name": "DreamFinder",
    "Manifest Description": "Personalized sleep consultation for Lacks Furniture",
    "Manifest Start URL": "/LacksFurniture/",
    "Manifest Theme Color": "#000000",
    "Manifest Background Color": "#000000",
    "App Icon File": "",
}

# ---- Brands (logo file name blank -> text fallback for the demo) ------------
BRANDS = ["Restonic", "Chattam & Wells", "Spring Air", "Tempur-Pedic", "Genesis"]

# ---- Mattresses (26: 9 gold / 10 silver / 7 bronze) --------------------------
M = _load("lacks_mattresses.json")

# Live CSV column order (EN). Per-feature reason_* + price/quizTags stay blank
# (matches the template live contract: only reason_default + topPick + differentiators).
MATT_EN_COLS = [
    "tier", "id", "name", "brand", "subBrand", "pitchKey", "archetype", "displayPriority",
    "firmnessScore", "firmnessLabel", "price", "quizTags", "displayBadges", "highlight",
    "locally-made", "features", "reason_cooling", "reason_pressureRelief",
    "reason_motionIsolation", "reason_support", "reason_plush", "reason_medium",
    "reason_firm", "reason_durability", "reason_default", "topPickReason",
    "differentiator1Title", "differentiator1Detail", "differentiator2Title", "differentiator2Detail",
]
MATT_ES_KEYS = [
    "displayBadges", "highlight", "reason_default", "topPickReason",
    "differentiator1Title", "differentiator1Detail", "differentiator2Title", "differentiator2Detail",
]


def mattress_row(m):
    row = {c: "" for c in MATT_EN_COLS}
    for c in MATT_EN_COLS:
        if c in m:
            row[c] = m[c]
    row["locally-made"] = m.get("locallyMade", "no")
    es = m.get("es", {})
    for k in MATT_ES_KEYS:
        row[k + " (ES)"] = es.get(k, "")
    return row


# ---- Accessories (10) --------------------------------------------------------
A = _load("lacks_accessories.json")


def accessory_row(a):
    row = {"ID": a["id"], "Name": a["name"], "Category": a["cat"],
           "Sub-Type": a.get("subType", ""), "Price": a["price"],
           "Description": a["desc"], "Image File Name": a["image"],
           "Match Tags": a.get("tags", "")}
    es = a.get("es", {})
    row["Name (ES)"] = es.get("name", "")
    row["Category (ES)"] = es.get("cat", "")
    row["Description (ES)"] = es.get("desc", "")
    row.update(a.get("scores", {}))
    return row


# ---- SalesNotes (brand stories, bilingual) ----------------------------------
SALES = [
 ("brand", "Restonic", "", "", "", "", "",
  "Made locally in Texas and named a Consumers Digest Best Buy year after year, Restonic's Marvelous Middle builds 25% more support into the center third of every bed — where support matters most.",
  "", "", "", "",
  "Fabricado localmente en Texas y nombrado Best Buy por Consumers Digest año tras año, el Marvelous Middle de Restonic construye 25% más soporte en el tercio central de cada cama — donde el soporte más importa."),
 ("brand", "Chattam & Wells", "", "", "", "", "",
  "Chattam & Wells is hand-crafted luxury built by Restonic's finest craftspeople — Merino wool, cashmere, and graphite latex layered over precision coils for heirloom-quality sleep.",
  "", "", "", "",
  "Chattam & Wells es lujo artesanal construido por los mejores artesanos de Restonic — lana Merino, cachemira y látex de grafito sobre resortes de precisión para un descanso de calidad heredable."),
 ("brand", "Spring Air", "", "", "", "", "",
  "Spring Air's patented Copper collection pairs NatuVerex copper fabric with copper-infused foams for a cooler, fresher, health-forward sleep experience.",
  "", "", "", "",
  "La colección Copper patentada de Spring Air combina la tela de cobre NatuVerex con espumas infundidas de cobre para un descanso más fresco y saludable."),
 ("brand", "Tempur-Pedic", "", "", "", "", "",
  "Developed from NASA-engineered pressure-relieving material, Tempur-Pedic is the benchmark for adaptive memory-foam comfort, cooling innovation, and zero motion transfer.",
  "", "", "", "",
  "Desarrollado a partir del material de alivio de presión diseñado por la NASA, Tempur-Pedic es el referente del confort adaptable, la innovación en frescura y la cero transferencia de movimiento."),
 ("brand", "Genesis", "", "", "", "", "",
  "Genesis by Kingdom Mattress is engineered entirely in the USA by a 30-year family company — honest, durable comfort built for real family life.",
  "", "", "", "",
  "Genesis de Kingdom Mattress está diseñado completamente en EE. UU. por una empresa familiar de 30 años — confort honesto y duradero hecho para la vida familiar real."),
]
SALES_COLS = ["Type", "Key", "Format", "Lead", "Demo", "Close", "RSA Note", "Story",
              "Lead (ES)", "Demo (ES)", "Close (ES)", "RSA Note (ES)", "Story (ES)"]


def sales_row(s):
    return dict(zip(SALES_COLS, s))


# ---- Consultation implications (0.6) -> SalesNotes consultation rows --------
# Bilingual Consultation Summary implication copy, keyed structurally by quiz
# question id + option id (NEVER by label text, so a future relabel cannot
# break it). Authored in lacks_store_values.json under
# "salesNotes.consultationImplications"; one SalesNotes row per option with
# Key "<questionId>.<optionId>". Both Implication cells empty = intentional
# omission (e.g. the "none" options). A missing or empty source block stops
# the build: the runtime fails closed by omitting fragments, so silently
# building without this copy would blank the Consultation Summary rows.
def consultation_sales_rows():
    values = _load("lacks_store_values.json")
    impl = values.get("salesNotes.consultationImplications")
    if not isinstance(impl, dict) or not impl:
        raise SystemExit("build_lacks_workbook: lacks_store_values.json is missing "
                         "\"salesNotes.consultationImplications\" (required since 0.6)")
    rows = []
    for qid, options in impl.items():
        if not isinstance(options, dict) or not options:
            raise SystemExit(f"build_lacks_workbook: consultationImplications[{qid!r}] "
                             "must be a non-empty object of option ids")
        for oid, pair in options.items():
            if not isinstance(pair, dict) or set(pair) != {"en", "es"} \
               or not all(isinstance(pair[k], str) for k in ("en", "es")):
                raise SystemExit(f"build_lacks_workbook: consultationImplications"
                                 f"[{qid!r}][{oid!r}] must be {{\"en\": str, \"es\": str}}")
            rows.append({
                "Type": "consultation",
                "Key": f"{qid}.{oid}",
                "Implication": pair["en"],
                "Implication (ES)": pair["es"],
            })
    return rows


# ---- apply migrated build-input values onto Store Info ----------------------
def _apply_build_values(store):
    values = _load("lacks_store_values.json")  # {dotted schema col.key: value}
    by_key = {c.key: c.name for c in schema.get_columns("Store Info")}
    for key, val in values.items():
        if key in by_key:
            store[by_key[key]] = val


_apply_build_values(STORE)


# ---- Promotions tab: promotions + financing envelope -------------------------
# The canonical Promotions-tab JSON channel carries the two-key envelope
# {"promotions": {...}, "financing": {...}} (Daybreak PR 2). Canonical editable
# sources: incoming/lacks_promotions.json (the "promotions" key — the inert
# Daybreak contract; illustrative demo campaigns live ONLY in demo/ fixtures and
# must never enter this envelope) and incoming/lacks_financing.json (the
# "financing" key). Each source's sibling "_meta" is documentation and is NOT
# shipped. Chunked to stay under Excel's 32,767-char cell limit. The converter
# refuses any third top-level envelope key (PR 1), so financing can never be
# silently reclassified as legacy bare promotions.
_PROMO_CHUNK = 30000


def promotions_rows():
    promo_src = _load("lacks_promotions.json")
    promotions = json.loads(json.dumps(promo_src["promotions"]))  # deep copy
    src = _load("lacks_financing.json")
    financing = json.loads(json.dumps(src["financing"]))  # deep copy
    # V1 ships no payment-math inputs: the published Synchrony payment factor
    # stays in the editable source (documentation of what Lacks publishes) but
    # is stripped from the runtime config so no client code can multiply it.
    for plan in financing.get("plans", []):
        plan.pop("publishedPaymentFactor", None)
    # Promotional headlines are DERIVED, never authored: apr + termMonths are
    # authoritative and tools/financing_headline.py owns the one EN/ES template
    # that restates them. This is the second (and last) transform between the
    # canonical source and the shipped envelope; tests/smoke_check.py applies
    # exactly these two and then demands deep equality, so a canonical edit that
    # is never rebuilt cannot ship silently. Failure is fatal by design — an
    # authored headline on a promotional plan, or a plan that cannot state its
    # own terms, must stop the build rather than reach a customer.
    try:
        fin_headline.apply_to_financing(financing)
    except fin_headline.HeadlineError as exc:
        raise SystemExit(f"build_lacks_workbook: {exc}")
    envelope = {"promotions": promotions, "financing": financing}
    payload = json.dumps(envelope, ensure_ascii=False, separators=(",", ":"))
    return [{"Promotions JSON": payload[i:i + _PROMO_CHUNK]}
            for i in range(0, len(payload), _PROMO_CHUNK)]


# ---- Quiz tab: quiz envelope ------------------------------------------------
# The quiz definition rides its own canonical-JSON tab as an envelope
# {"quiz": {...}} -> data/quiz.json. Canonical editable source:
# incoming/dreamfinder_quiz.json (the "quiz" key; "_meta" is documentation and
# is NOT shipped). Same chunking as Promotions.
def quiz_rows():
    src = _load("dreamfinder_quiz.json")
    envelope = {"quiz": src["quiz"]}
    payload = json.dumps(envelope, ensure_ascii=False, separators=(",", ":"))
    return [{"Quiz JSON": payload[i:i + _PROMO_CHUNK]}
            for i in range(0, len(payload), _PROMO_CHUNK)]


# ---- write workbook ---------------------------------------------------------
def write_sheet(wb, tab, rows):
    ws = wb.create_sheet(title=tab)
    headers = schema.get_column_headers(tab)  # all columns (EN+ES), in order
    ws.append(headers)
    for r in rows:
        ws.append([r.get(h, "") for h in headers])


def main(argv=None):
    # --out exists for VERIFICATION (the lineage check rebuilds the workbook
    # into a temporary location and compares it against the committed one).
    # The default is unchanged: a plain run still writes the committed path.
    import argparse
    parser = argparse.ArgumentParser(
        description="Generate the Lacks Furniture onboarding workbook.")
    parser.add_argument("--out", default=OUT,
                        help="Output .xlsx path (default: %(default)s)")
    args = parser.parse_args(argv)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    write_sheet(wb, "Store Info", [STORE])
    write_sheet(wb, "Brands", [{"Brand Name": b, "Logo File Name": ""} for b in BRANDS])
    write_sheet(wb, "Mattresses", [mattress_row(m) for m in M])
    write_sheet(wb, "Accessories", [accessory_row(a) for a in A])
    consult_rows = consultation_sales_rows()
    write_sheet(wb, "SalesNotes", [sales_row(s) for s in SALES] + consult_rows)
    write_sheet(wb, "Promotions", promotions_rows())
    write_sheet(wb, "Quiz", quiz_rows())
    wb.save(args.out)
    from collections import Counter
    c = Counter(m["tier"] for m in M)
    print(f"Wrote {args.out}")
    print(f"  Brands: {len(BRANDS)}  Mattresses: {len(M)}  Accessories: {len(A)}  "
          f"SalesNotes: {len(SALES)} (+{len(consult_rows)} consultation)")
    print(f"  tiers: gold={c['gold']} silver={c['silver']} bronze={c['bronze']}")


if __name__ == "__main__":
    main()
