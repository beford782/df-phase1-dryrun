#!/usr/bin/env python3
"""Download Lacks product images from linqcdn (AVB Portal CDN) for the DreamFinder build.

Source of truth: incoming/lacks_catalog_selection.json (scraped from the lacks.com
browser-session API 2026-07-30 — see that file's _meta). The lacks.com pages and
/api/rest/* sit behind PerimeterX, but linqcdn.avbportal.com is unprotected, so
plain HTTP GETs work here. Image URLs carry random UUIDs and cannot be derived
from product slugs — they must come from the API records in the selection file.

Mattress images are saved as <lower(name)>.jpg so tools/convert_store_data.py's
stem index matches the workbook `name` column. Accessory images are saved under
the kebab-case file names referenced by build_lacks_workbook.py's Accessories
tab (Image File Name column).
"""
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SEL = os.path.join(HERE, "lacks_catalog_selection.json")
IMG = os.path.join(HERE, "images")

# accessory sku -> kebab file stem (must match Accessories tab Image File Name)
ACC_FILES = {
    "284920": "base-bt2000",
    "284927": "base-bt3000",
    "1283106": "base-tempur-ergo",
    "833804": "protector-dritec",
    "833806": "protector-iprotect",
    "1266110": "protector-vertex",
    "1212402": "protector-tempur",
    "747070": "pillow-flow",
    "1269280": "pillow-gel-memory",
    "943597": "sheets-hyper-cotton",
    "718365": "sheets-dritec",
    "1212339": "protector-tempur-breeze",
}

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 10_000:
        print(f"  skip (exists) {os.path.basename(dest)}")
        return True
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except Exception as e:  # noqa: BLE001 — report and continue; converter hard-fails on missing
        print(f"  FAIL {os.path.basename(dest)}: {e}")
        return False
    if len(data) < 5_000:
        print(f"  FAIL {os.path.basename(dest)}: suspiciously small ({len(data)} bytes)")
        return False
    with open(dest, "wb") as f:
        f.write(data)
    print(f"  ok   {os.path.basename(dest)} ({len(data)//1024} KB)")
    return True


def main():
    with open(SEL, encoding="utf-8") as f:
        sel = json.load(f)
    for sub in ("mattresses", "accessories", "logos", "brands"):
        os.makedirs(os.path.join(IMG, sub), exist_ok=True)

    failures = []
    print("Mattresses:")
    for m in sel["mattresses"]:
        dest = os.path.join(IMG, "mattresses", m["name"].lower() + ".jpg")
        if not fetch(m["img"], dest):
            failures.append(m["name"])
    print("Accessories:")
    for a in sel["accessories"]:
        stem = ACC_FILES.get(a["sku"])
        if not stem:
            print(f"  WARN no file mapping for accessory sku {a['sku']} ({a['name']})")
            continue
        dest = os.path.join(IMG, "accessories", stem + ".jpg")
        if not fetch(a["img"], dest):
            failures.append(stem)

    if failures:
        print(f"\n{len(failures)} FAILURES: {failures}")
        sys.exit(1)
    print("\nAll images downloaded.")


if __name__ == "__main__":
    main()
