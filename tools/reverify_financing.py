#!/usr/bin/env python3
"""Financing re-verification helper (DEC-13 cadence support).

Makes the weekly exact-terms re-verification repeatable. Two modes:

  1. Checklist (default):
         python tools/reverify_financing.py
     Prints, per configured plan, the official source URL and every fact that
     must be confirmed in a REAL browser session (lacks.com blocks
     non-interactive fetches, so curl/scripted checks do not count).

  2. Stamp after a real check:
         python tools/reverify_financing.py --mark-verified --at <ISO-8601> \
             --attest "real Chrome session, all checks matched" \
             [--also-confirm mexico-in-house | --skip-plan mexico-in-house] \
             [--dry-run]
     Updates financing.verifiedAt and each confirmed plan's verifiedAt in
     incoming/lacks_financing.json, appends an audit entry to
     _meta.verificationLog, and reminds you to rebuild the pipeline.
     Skipped plans keep their old stamp and fail closed independently once
     they age out (the app gates per plan under the top-level gate).

     Plans citing a DIFFERENT official source than financing.sourceUrl
     (today: mexico-in-house, sourced from the FAQ) are NEVER stamped
     implicitly — one attestation cannot cover a page you did not check.
     Each such plan must be explicitly listed: --also-confirm <id> if that
     source was also verified in the same session, or --skip-plan <id> if
     it was not (e.g. the FAQ is access-blocked again).

This tool NEVER invents a verification: --mark-verified refuses to run
without an explicit --at timestamp and a non-empty --attest note, refuses
future timestamps (beyond the app's 5-minute skew tolerance), and refuses
timestamps older than the stamp already in the file. The human attestation
is the verification; this script only records it consistently.
"""
import argparse
import io
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "incoming", "lacks_financing.json")
CLOCK_SKEW = timedelta(minutes=5)  # matches FINANCING_CLOCK_SKEW_MS in the app


def load():
    with io.open(SRC, encoding="utf-8") as f:
        return json.load(f)


def parse_iso(value: str) -> datetime:
    ts = datetime.fromisoformat(value)
    if ts.tzinfo is None:
        raise SystemExit(f"error: {value!r} has no timezone offset — verifiedAt "
                         f"must be ISO-8601 with an explicit offset")
    return ts


def plan_facts(plan: dict) -> list:
    """The facts a human must confirm on the official page for one plan."""
    facts = []
    if plan.get("apr") is not None:
        facts.append(f"APR {plan['apr']}%")
    if plan.get("termMonths") is not None:
        facts.append(f"term {plan['termMonths']} months")
    if plan.get("minimumPurchase") is not None:
        facts.append(f"minimum purchase ${plan['minimumPurchase']:,}")
    if plan.get("channel") == "in-store":
        facts.append("in-store-only channel")
    for key, label in (("detail", "conditions text"),
                       ("disclosure", "disclosure text"),
                       ("representativeExample", "published example")):
        block = plan.get(key)
        if isinstance(block, dict) and block.get("en"):
            facts.append(f"{label}: “{block['en'][:90]}…”"
                         if len(block["en"]) > 90 else f"{label}: “{block['en']}”")
    return facts


def cmd_checklist(data: dict) -> int:
    fin = data["financing"]
    print("FINANCING RE-VERIFICATION CHECKLIST")
    print(f"  current verifiedAt: {fin.get('verifiedAt')}")
    exp = parse_iso(fin["verifiedAt"]) + timedelta(days=fin.get("maxAgeDays", 7))
    print(f"  exact terms auto-hide after: {exp.isoformat()}")
    print(f"  rule: every fact below must be confirmed in a REAL browser session")
    print(f"        on the listed official page, on the date you stamp.\n")
    for plan in fin.get("plans", []):
        print(f"[{plan['id']}]  source: {plan.get('sourceUrl')}")
        print(f"  plan verifiedAt: {plan.get('verifiedAt')}")
        for fact in plan_facts(plan):
            print(f"  ☐ {fact}")
        print()
    print("After confirming, stamp with:")
    print("  python tools/reverify_financing.py --mark-verified --at <ISO> "
          "--attest \"<how you verified>\" [--also-confirm <id> | --skip-plan <id>]")
    print("Plans on a different source than financing.sourceUrl (marked above by "
          "their source line) REQUIRE --also-confirm or --skip-plan explicitly.")
    print("Then rebuild: python incoming/build_lacks_workbook.py && "
          "python tools/convert_store_data.py incoming/Lacks_Store_Data.xlsx "
          "--output-dir . --skip-image-normalization")
    return 0


def cmd_mark(data: dict, args) -> int:
    fin = data["financing"]
    when = parse_iso(args.at)
    now = datetime.now(timezone.utc)
    if when - now > CLOCK_SKEW:
        raise SystemExit(f"error: --at {args.at} is in the future — verification "
                         f"is an observation and cannot postdate now")
    current = parse_iso(fin["verifiedAt"])
    if when <= current:
        raise SystemExit(f"error: --at {args.at} is not newer than the existing "
                         f"verifiedAt {fin['verifiedAt']} — nothing to record")
    if not args.attest or not args.attest.strip():
        raise SystemExit("error: --attest must describe the real verification "
                         "session (who/how); it may not be empty")

    plan_ids = [p["id"] for p in fin.get("plans", [])]
    for flag, ids in (("--skip-plan", args.skip_plan),
                      ("--also-confirm", args.also_confirm)):
        for pid in ids:
            if pid not in plan_ids:
                raise SystemExit(f"error: {flag} {pid!r} is not a configured "
                                 f"plan id (known: {', '.join(plan_ids)})")
    both = set(args.skip_plan) & set(args.also_confirm)
    if both:
        raise SystemExit(f"error: {', '.join(sorted(both))} passed as both "
                         f"--skip-plan and --also-confirm — pick one")

    # F1 guard: a plan citing a different official source than the top-level
    # financing.sourceUrl is never stamped implicitly. The attestation covers
    # the page(s) the human actually checked; a second source requires its own
    # explicit acknowledgment (--also-confirm) or an explicit skip.
    base_src = fin.get("sourceUrl")
    divergent = [p for p in fin.get("plans", [])
                 if p["id"] not in args.skip_plan
                 and p["id"] not in args.also_confirm
                 and p.get("sourceUrl") and p["sourceUrl"] != base_src]
    if divergent:
        lines = "\n".join(f"  {p['id']}: {p['sourceUrl']}" for p in divergent)
        raise SystemExit(
            "error: these plans cite a DIFFERENT official source than "
            f"financing.sourceUrl ({base_src}):\n{lines}\n"
            "One attestation cannot cover a source you did not check. If you "
            "verified that source in the same real session, pass "
            "--also-confirm <plan-id>; if you could not (e.g. access-blocked), "
            "pass --skip-plan <plan-id> to leave its old stamp — it will fail "
            "closed on its own schedule.")

    stamped, skipped, unstamped = [], [], []
    fin["verifiedAt"] = args.at
    for plan in fin.get("plans", []):
        if plan["id"] in args.skip_plan:
            skipped.append(plan["id"])
            continue
        if plan.get("verifiedAt"):
            plan["verifiedAt"] = args.at
            stamped.append(plan["id"])
        else:
            # F2: never report a plan as confirmed when nothing was written.
            unstamped.append(plan["id"])

    log = data["_meta"].setdefault("verificationLog", [])
    entry = {
        "verifiedAt": args.at,
        # F3: when this recording was made, independent of the claimed
        # observation instant — lets an auditor spot backdated recordings.
        "recordedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "attestation": args.attest.strip(),
        "plansConfirmed": stamped,
        "plansSkipped": skipped,
    }
    if unstamped:
        entry["plansNotStamped"] = unstamped
    log.append(entry)

    if args.dry_run:
        print("DRY RUN — no file written. Would record:")
    else:
        with io.open(SRC, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"wrote {os.path.relpath(SRC, REPO)}")
    print(f"  verifiedAt -> {args.at}")
    print(f"  plans stamped: {', '.join(stamped)}")
    if skipped:
        print(f"  plans SKIPPED (will fail closed on their own): {', '.join(skipped)}")
    if unstamped:
        print(f"  WARNING — plans with no verifiedAt key were NOT stamped and are "
              f"NOT recorded as confirmed: {', '.join(unstamped)}")
    print(f"  attestation: {args.attest.strip()}")
    print("NEXT: rebuild the workbook + store-config, run the test suite, "
          "browser-verify, then commit — the stamp is not deployed until then. "
          "tests/smoke_check.py FAILS until the shipped config matches this file.")
    return 0


# ---- Self-test --------------------------------------------------------------
# Exercises the refusal paths and the stamping/audit-log semantics against
# fabricated data (never the real incoming file). Run:
#     python tools/reverify_financing.py --self-test

def _fab_data(now):
    """Minimal financing data: one base-source plan, one divergent-source
    plan (F1), one plan with no verifiedAt key (F2)."""
    base = (now - timedelta(days=2)).isoformat(timespec="seconds")
    return {
        "_meta": {},
        "financing": {
            "verifiedAt": base,
            "maxAgeDays": 7,
            # Operating-state policy. This tool must NEVER read or write it:
            # re-verifying evidence is not authorization to publish exact
            # terms. The self-test below pins that it survives every path.
            "exactPromotionsEnabled": False,
            "sourceUrl": "https://example.com/financing",
            "plans": [
                {"id": "main-plan", "verifiedAt": base, "apr": 9.99,
                 "termMonths": 72, "minimumPurchase": 500,
                 "sourceUrl": "https://example.com/financing"},
                {"id": "faq-plan", "verifiedAt": base,
                 "sourceUrl": "https://example.com/faq"},
                {"id": "no-stamp-plan",
                 "sourceUrl": "https://example.com/financing"},
            ],
        },
    }


def _ns(**kw):
    d = dict(at=None, attest="self-test attestation", skip_plan=[],
             also_confirm=[], dry_run=True, mark_verified=True)
    d.update(kw)
    return argparse.Namespace(**d)


def self_test() -> int:
    import contextlib
    import tempfile
    global SRC

    passed = failed = 0

    def check(label, ok, detail=""):
        nonlocal passed, failed
        if ok:
            passed += 1
            print(f"  [ok] {label}")
        else:
            failed += 1
            print(f"  [FAIL] {label}" + (f" — {detail}" if detail else ""))

    def refuses(label, fragment, fn):
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                fn()
            check(label, False, "no SystemExit raised")
        except SystemExit as e:
            check(label, fragment in str(e), f"got: {e}")

    def mark(data, args):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            cmd_mark(data, args)
        return buf.getvalue()

    now = datetime.now(timezone.utc)
    fresh = (now - timedelta(days=1)).isoformat(timespec="seconds")
    base = _fab_data(now)["financing"]["verifiedAt"]

    print("Refusal paths:")
    refuses("timestamp without offset refused", "no timezone offset",
            lambda: parse_iso("2026-07-31T12:00:00"))
    refuses("future --at refused (beyond clock skew)", "in the future",
            lambda: cmd_mark(_fab_data(now), _ns(
                at=(now + timedelta(minutes=30)).isoformat(timespec="seconds"))))
    refuses("--at not newer than existing stamp refused", "not newer",
            lambda: cmd_mark(_fab_data(now), _ns(at=base,
                                                 also_confirm=["faq-plan"])))
    refuses("empty --attest refused", "--attest",
            lambda: cmd_mark(_fab_data(now), _ns(at=fresh, attest="   ",
                                                 also_confirm=["faq-plan"])))
    refuses("unknown plan id refused", "not a configured",
            lambda: cmd_mark(_fab_data(now), _ns(at=fresh,
                                                 skip_plan=["nope"])))
    refuses("same id in --skip-plan and --also-confirm refused", "pick one",
            lambda: cmd_mark(_fab_data(now), _ns(at=fresh,
                                                 skip_plan=["faq-plan"],
                                                 also_confirm=["faq-plan"])))
    refuses("divergent-source plan without explicit flag refused (F1)",
            "faq-plan",
            lambda: cmd_mark(_fab_data(now), _ns(at=fresh)))

    print("Stamping semantics (dry run):")
    d = _fab_data(now)
    mark(d, _ns(at=fresh, also_confirm=["faq-plan"]))
    entry = d["_meta"]["verificationLog"][-1]
    plan = {p["id"]: p for p in d["financing"]["plans"]}
    check("top-level verifiedAt stamped", d["financing"]["verifiedAt"] == fresh)
    check("--also-confirm stamps the divergent plan",
          plan["faq-plan"]["verifiedAt"] == fresh)
    check("confirmed plans recorded in the audit entry",
          entry["plansConfirmed"] == ["main-plan", "faq-plan"])
    check("plan without verifiedAt key NOT stamped (F2)",
          "verifiedAt" not in plan["no-stamp-plan"]
          and entry.get("plansNotStamped") == ["no-stamp-plan"])
    check("recordedAt present and distinct from verifiedAt (F3)",
          bool(entry.get("recordedAt")) and entry["recordedAt"] != entry["verifiedAt"])
    check("attestation recorded", entry["attestation"] == "self-test attestation")
    check("exactPromotionsEnabled unchanged by top-level stamping + --also-confirm",
          d["financing"]["exactPromotionsEnabled"] is False)

    d = _fab_data(now)
    out = mark(d, _ns(at=fresh, skip_plan=["faq-plan"]))
    plan = {p["id"]: p for p in d["financing"]["plans"]}
    check("--skip-plan keeps the old stamp",
          plan["faq-plan"]["verifiedAt"] == base)
    check("skipped plans recorded in the audit entry",
          d["_meta"]["verificationLog"][-1]["plansSkipped"] == ["faq-plan"])
    check("skip reported as failing closed on its own", "SKIPPED" in out)
    check("exactPromotionsEnabled unchanged by --skip-plan runs",
          d["financing"]["exactPromotionsEnabled"] is False)

    # A re-verification run must never grant authorization: even a config that
    # already has the switch ON is left exactly as found (the tool neither
    # enables nor disables it), and no CLI flag exists to toggle it.
    d_on = _fab_data(now)
    d_on["financing"]["exactPromotionsEnabled"] = True
    mark(d_on, _ns(at=fresh, also_confirm=["faq-plan"]))
    check("exactPromotionsEnabled=true is also left untouched",
          d_on["financing"]["exactPromotionsEnabled"] is True)
    import inspect
    check("cmd_mark never reads or writes the policy field",
          "exactPromotionsEnabled" not in inspect.getsource(cmd_mark))
    check("no CLI option can toggle the exact-promotions policy",
          "exactPromotionsEnabled" not in inspect.getsource(main))

    print("File writes:")
    src_backup = SRC
    tmp = tempfile.mkdtemp()
    try:
        SRC = os.path.join(tmp, "financing.json")
        mark(_fab_data(now), _ns(at=fresh, also_confirm=["faq-plan"],
                                 dry_run=True))
        check("--dry-run writes nothing", not os.path.exists(SRC))
        mark(_fab_data(now), _ns(at=fresh, also_confirm=["faq-plan"],
                                 dry_run=False))
        check("real run writes the file", os.path.exists(SRC))
        if os.path.exists(SRC):
            with io.open(SRC, encoding="utf-8") as f:
                written = json.load(f)
            check("written file carries the stamp and one audit entry",
                  written["financing"]["verifiedAt"] == fresh
                  and len(written["_meta"]["verificationLog"]) == 1)
            check("written file preserves exactPromotionsEnabled unchanged",
                  written["financing"]["exactPromotionsEnabled"] is False)
            os.remove(SRC)
    finally:
        SRC = src_backup
        os.rmdir(tmp)

    print(f"\nSelf-test: {passed} passed, {failed} failed")
    return 1 if failed else 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--self-test", action="store_true",
                   help="Run the built-in unit tests (no real files touched)")
    p.add_argument("--mark-verified", action="store_true",
                   help="Record a completed real-browser verification")
    p.add_argument("--at", help="ISO-8601 instant (with offset) of the real check")
    p.add_argument("--attest", help="How the verification was performed (required)")
    p.add_argument("--skip-plan", action="append", default=[], metavar="PLAN_ID",
                   help="Plan id that could NOT be re-verified this session "
                        "(keeps its old stamp; may repeat)")
    p.add_argument("--also-confirm", action="append", default=[], metavar="PLAN_ID",
                   help="Plan id whose DIFFERENT official source was also "
                        "verified in the same session (required for any plan "
                        "not sourced from financing.sourceUrl; may repeat)")
    p.add_argument("--dry-run", action="store_true",
                   help="Show what would be recorded without writing")
    args = p.parse_args(argv)
    if args.self_test:
        return self_test()
    data = load()
    if args.mark_verified:
        if not args.at:
            raise SystemExit("error: --mark-verified requires --at <ISO-8601>")
        return cmd_mark(data, args)
    return cmd_checklist(data)


if __name__ == "__main__":
    sys.exit(main())
