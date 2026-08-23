#!/usr/bin/env python3
"""DreamFinder onboarding validation (V1) - structure + Store Info / store-config.

Hard validation so a bad workbook cannot silently produce a broken DreamFinder
deployment. V1 covers the highest-value gates:

  * workbook structure: required tabs, required headers, duplicate headers,
    Store Info exactly one data row, schema-required cells non-empty.
  * store-config values: storeName, slug-safe storeKey, languages, hex colors,
    HTTPS publicAssetRoot with trailing slash, allowedHosts hygiene, discount
    digits, manifest.start_url, gasUrl placeholder policy.

Deep per-row mattress/accessory/SalesNotes checks, image-existence checks, and
post-emit output validation are LATER phases (V2/V3) - not implemented here.

"Required" is derived from `tools/workbook_schema.py` `required` flags (the curated
source of truth), NOT a broad wishlist - fields like price / quizTags / pitchKey /
subBrand / topPickReason are legitimately blank in real data and are not required.

Dependency-light: stdlib + workbook_schema only. No openpyxl, no app imports. It
validates already-parsed structures (the converter's read rows + assembled config),
so it is unit-testable with plain dicts. ASCII console output. Run `--self-test`.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# Shared schema lives alongside this file in tools/.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import workbook_schema as schema  # noqa: E402
import financing_headline as fin_headline  # noqa: E402


SUPPORTED_LANGUAGES = (["en"], ["en", "es"])
CODE_DIGITS_MIN, CODE_DIGITS_MAX = 3, 10
_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


# -- Report -------------------------------------------------------------------

@dataclass
class ValidationReport:
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors

    def __bool__(self) -> bool:
        return self.ok

    def merge(self, other: "ValidationReport") -> "ValidationReport":
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)
        return self

    def blocking(self, warnings_as_errors: bool = False) -> bool:
        """True if the converter should abort: any error, or (under
        --warnings-as-errors) any warning."""
        return bool(self.errors) or (warnings_as_errors and bool(self.warnings))

    def summary(self) -> str:
        if not self.errors and not self.warnings:
            return "[validate] OK - no issues."
        lines = []
        if self.errors:
            lines.append(f"[validate] {len(self.errors)} error(s):")
            lines += [f"  ERROR: {e}" for e in self.errors]
        if self.warnings:
            lines.append(f"[validate] {len(self.warnings)} warning(s):")
            lines += [f"  WARN:  {w}" for w in self.warnings]
        return "\n".join(lines)


# -- Helpers ------------------------------------------------------------------

# Author-supplied JSON reaches these helpers, and str() is not total over it:
# CPython refuses int->str beyond sys.get_int_max_str_digits() (4300 digits by
# default) and raises ValueError, which a validator must never do. Strings pass
# through verbatim so validation still inspects real content; every other type
# is converted defensively and length-capped, because a converted non-string
# only ever feeds a blank/equality test or a diagnostic.
_NONSTR_TEXT_CAP = 120


def _safe_str(v) -> str:
    """str(v) that cannot raise and cannot be unbounded. Strings are returned
    unchanged; other types are described rather than rendered when they cannot
    be printed cheaply."""
    if isinstance(v, str):
        return v
    try:
        if isinstance(v, int) and not isinstance(v, bool) and v.bit_length() > 128:
            return f"<{v.bit_length()}-bit integer>"
        text = str(v)
    except Exception:                       # noqa: BLE001 - hostile __str__
        try:
            return f"<unprintable {type(v).__name__}>"
        except Exception:                   # noqa: BLE001 - hostile metaclass
            return "<unprintable value>"
    if len(text) > _NONSTR_TEXT_CAP:
        return text[:_NONSTR_TEXT_CAP] + f"...({len(text)} chars)"
    return text


_JSON_TYPE_NAMES = {type(None): "null", bool: "boolean", int: "number",
                    float: "number", str: "string", list: "array", dict: "object"}


def _type_name(v) -> str:
    """The JSON type name of a value, for error text an author can act on —
    they wrote JSON, so 'array' is more use to them than 'list'."""
    return _JSON_TYPE_NAMES.get(type(v), type(v).__name__)


# Single numeric-sanity authority for every financing number (see Commit I):
# exact int/float, not a boolean, not NaN and not ±Infinity. Each field adds
# only its own range on top.
_finite_number = fin_headline.finite_number


def _runtime_truthy(v) -> bool:
    """JavaScript truthiness of a config value as index.html reads it RAW
    (`(STORE_CONFIG && STORE_CONFIG.gasUrl) || ''` then `!!gasUrl` /
    `if (gasUrl && ...)`): a whitespace-only string is TRUE there. Mirrors JS
    for the JSON-representable types (strings, numbers, booleans, null,
    objects, arrays); used for admission decisions that must match the kiosk."""
    if v is None or v is False:
        return False
    if isinstance(v, str):
        return v != ""
    if isinstance(v, (int, float)):
        return v != 0 and v == v  # 0 and NaN are falsy in JS
    return True  # objects/arrays are truthy in JS even when empty


def _blank(v) -> bool:
    return v is None or _safe_str(v).strip() == ""


def _is_hex(v) -> bool:
    return isinstance(v, str) and bool(_HEX_RE.match(v.strip()))


def _is_slug(v) -> bool:
    return isinstance(v, str) and bool(_SLUG_RE.match(v.strip()))


def _host_from_url(url: str) -> str:
    """Extract the host from an https URL (no scheme, no path). '' if unparseable."""
    s = _safe_str(url).strip()
    if "://" in s:
        s = s.split("://", 1)[1]
    return s.split("/", 1)[0]


def _s(v) -> str:
    return "" if v is None else _safe_str(v).strip()


# Live accessory categories (the real enum the app/template use - NOT a generic
# lowercase list). matchScores are non-negative integers (Bel uses values up to
# 10 for the featured "default" weight, so there is no 0-5 upper bound).
ACCESSORY_CATEGORIES = {"Foundations & Support", "Pillows", "Protectors"}
# G1: the Accessories "Image File Name" cell must be the FULL relative path the live
# app renders verbatim (index.html uses accessories.json `image` as-is). A bare
# filename (or a non-jpg / extra-path value) builds clean but 404s on the deployed
# host - the live image is always normalized to <prefix><file>.jpg (TFM migration lesson).
ACCESSORY_IMAGE_PREFIX = "images/accessories/"
SOURCE_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")
MATTRESS_TIERS = {"gold", "silver", "bronze"}
SALESNOTE_TYPES = {"subBrand", "brand", "consultation"}
SALESNOTE_FORMATS = {"full", "coaching"}

# Quiz questions whose answers the Consultation Summary resolves through
# salesNotes.consultationImplications (0.6). MIRRORS index.html's
# resolveConsultationSummary() — change the two together. mattress_size is
# deliberately absent (the neutral size identity renders as its own label) and
# firmness renders as the computed score; neither goes through this mapping.
CONSULTATION_QUESTIONS = ("trigger", "sleep_issues",
                          "sleep_position", "health_conditions", "temperature")


def _source_stems(src_dir: str):
    """Lowercased stems of supported images in src_dir, or None if dir missing."""
    if not os.path.isdir(src_dir):
        return None
    stems = set()
    for fn in os.listdir(src_dir):
        stem, ext = os.path.splitext(fn)
        if ext.lower() in SOURCE_IMAGE_EXTS:
            stems.add(stem.lower())
    return stems


def _source_names(src_dir: str):
    """Lowercased full filenames of supported images in src_dir, or None if the
    dir is missing. Brand logos are matched by exact filename (not stem) because
    the workbook's Logo File Name is copied verbatim into store-config, so the
    source extension must match what ships (e.g. a transparent .png logo)."""
    if not os.path.isdir(src_dir):
        return None
    names = set()
    for fn in os.listdir(src_dir):
        if os.path.splitext(fn)[1].lower() in SOURCE_IMAGE_EXTS:
            names.add(fn.lower())
    return names


def _png_dimensions(path: str):
    """Return (width, height) of a PNG by reading its IHDR header, or None if the
    file is not a valid PNG. Stdlib only - keeps validation.py Pillow-free so it
    runs in --validate-only without the imaging dependency."""
    try:
        with open(path, "rb") as f:
            header = f.read(24)
    except OSError:
        return None
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        return None
    return int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big")


def _brands_from(raw_tabs) -> set:
    if "Brands" not in raw_tabs:
        return set()
    _, rows = raw_tabs["Brands"]
    return {_s(r.get("Brand Name")) for r in rows if _s(r.get("Brand Name"))}


# -- Structure validation (raw tabs) ------------------------------------------
# raw_tabs maps PRESENT tab name -> (headers: list[str], rows: list[dict]).
# A required tab absent from raw_tabs is reported as missing.

def validate_structure(raw_tabs: Dict[str, Tuple[List[str], List[dict]]]) -> ValidationReport:
    r = ValidationReport()
    for tab in schema.get_tab_names():
        if tab not in raw_tabs:
            r.add_error(f"missing required tab: {tab!r}")
            continue
        headers, rows = raw_tabs[tab]

        # duplicate headers
        seen = set()
        for h in headers:
            if h in seen:
                r.add_error(f"{tab}: duplicate header {h!r}")
            seen.add(h)

        # required headers present
        required = schema.required_columns(tab)
        for col in required:
            if col.name not in headers:
                r.add_error(f"{tab}: missing required header {col.name!r}")

        # Store Info: exactly one data row
        if tab == "Store Info" and len(rows) != 1:
            r.add_error(f"Store Info: expected exactly 1 data row, found {len(rows)}")

        # schema-required cells non-empty (only for headers that are present)
        for col in required:
            if col.name not in headers:
                continue
            for i, row in enumerate(rows, start=1):
                if _blank(row.get(col.name)):
                    r.add_error(f"{tab} row {i}: required {col.name!r} is empty")
    return r


# -- Store-config value validation (assembled config dict) --------------------

# Retailer privacy prose keys (both language blocks) that the mode rule reads.
PRIVACY_PROSE_KEYS = ("emailPrivacy", "privacyBody", "privacyDraftNotice",
                      "privacyPolicyContact", "disclaimerBody")
# Preview-mode signal phrases: wording that is only true while nothing leaves
# the tablet. Lower-cased substring match in either language. These fire
# unconditionally: each one is a claim about the kiosk's own behaviour.
PREVIEW_MODE_SIGNALS = (
    "preview mode", "preview deployment", "in this preview",
    "modo de vista previa", "en esta vista previa",
    "stays on this tablet", "stay on this tablet", "permanecen en esta tableta",
    "permanece en esta tableta", "se queda en esta tableta", "se quedan en esta tableta",
    "isn't connected", "is not connected", "no está conectada", "no esta conectada",
    "nothing is sent", "nothing leaves", "never leaves", "not sent anywhere",
    "never sent anywhere", "aren't sent anywhere", "are not sent anywhere",
    "is not sent anywhere", "isn't sent anywhere", "not sent or stored",
    "no email is sent", "no email was sent",
    "does not send or store", "doesn't send or store",
    "no se envía nada", "no se envia nada", "nada sale", "no se envía a ning",
    "no se envia a ning", "no se envía ning", "no se envia ning",
)
# Transmission negations ("not transmitted", "no se envían") are NOT in the
# unconditional list: "Your answers are not transmitted to lenders" is true
# under a live endpoint. They live in the grammatical family below and are
# rejected only when ABSOLUTE (no destination or a universal one such as
# "anywhere" / "to anyone") and bound to governed data.
# Storage negations. Bare, these are not preview signals: a retailer may
# truthfully write "Payment card details are not stored by this application"
# under a live endpoint. They become a false promise only when bound to
# governed data — the customer's answers, contact values, session or results,
# which a live gasUrl does send and Code.gs does store. Matched as a
# GRAMMATICAL FAMILY (external review threads 2, 7, 8, 2026-08-22), not an
# enumerated phrase list, after apostrophes and quotes are normalized — so
# "aren't", "weren’t" (typographic), "won't be", "cannot be", past tenses and
# the keep/retain verbs are all one rule. Each match is then bound to the
# noun phrase it is about (_storage_claim_is_governed).
_NEG = r"(?:n't|\bnot\b|\bnever\b|\bcannot\b|\bno longer\b)"
# Up to three MODIFIERS may sit between the negation and the verb: auxiliaries
# ("won't BE stored", "not GOING TO BE stored"), adverbs ("not PERMANENTLY
# stored", "do not EVER store") — external review thread 9 (2026-08-22).
# Restricted to those token classes (thread 12): an unrestricted gap turned
# "we do not ASK LENDERS TO store your answers" — a claim about lenders, not
# about the kiosk — into a storage negation.
_GAP_TOKEN = (r"(?:be|being|been|get|gets|got|gotten|going\s+to|ever|even|also|still|yet|just|"
              r"simply|again|anywhere|elsewhere|at\s+all|in\s+any\s+way|in\s+any\s+form|"
              r"[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc]+ly|[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc]+mente)")
_GAP = r"\s+(?:" + _GAP_TOKEN + r"\s+){0,3}?"
_ES_NEG = r"\b(?:no|nunca|jam[a\u00e1]s)\s+"
_ES_OBJ = r"(?:(?:lo|la|los|las|le|les|te|nos)\s+)?"
STORAGE_NEGATION_PATTERNS = (
    # passive: "X is/are/was/were/won't be/cannot be ... not|never [adv] stored|saved|kept|retained"
    ("passive", re.compile(_NEG + _GAP + r"(?:stored|saved|kept|retained)\b")),
    # active: "we do not|don't|never|won't|cannot [adv] store|save|keep|retain X"
    ("active", re.compile(_NEG + _GAP + r"(?:store|save|keep|retain)\b")),
    # transmission, passive: "X is not [adv] transmitted|sent|shared|uploaded|forwarded|submitted"
    ("passive_transmit", re.compile(_NEG + _GAP + r"(?:transmitted|sent|shared|uploaded|forwarded|submitted)\b")),
    # transmission, active: "we do not [adv] transmit|send|share|upload|forward|submit X"
    ("active_transmit", re.compile(_NEG + _GAP + r"(?:transmit|send|share|upload|forward|submit)\b")),
    # Spanish reflexive: "X no|nunca se guarda(n)..." / "no se guardan X"
    ("es_reflexive", re.compile(_ES_NEG + r"se\s+" + _ES_OBJ + r"(?:guarda|guardan|guardar[a\u00e1]n?|almacena|almacenan|"
                                r"almacenar[a\u00e1]n?|conserva|conservan|conservar[a\u00e1]n?|retiene|retienen|retendr[a\u00e1]n?)\b")),
    # Spanish active: "no|nunca [las] guardamos X"
    ("es_active", re.compile(_ES_NEG + _ES_OBJ + r"(?:guardamos|guardaremos|almacenamos|almacenaremos|"
                             r"conservamos|conservaremos|retenemos|retendremos)\b")),
    # Spanish transmission, reflexive: "X no se transmite(n)|env\u00eda(n)|comparte(n)"
    ("es_reflexive_transmit", re.compile(_ES_NEG + r"se\s+" + _ES_OBJ + r"(?:transmite|transmiten|transmitir[a\u00e1]n?|env[i\u00ed]a|env[i\u00ed]an|"
                                         r"enviar[a\u00e1]n?|comparte|comparten|compartir[a\u00e1]n?)\b")),
    # Spanish transmission, active: "no [las] transmitimos|enviamos|compartimos"
    ("es_active_transmit", re.compile(_ES_NEG + _ES_OBJ + r"(?:transmitimos|transmitiremos|enviamos|enviaremos|"
                                      r"compartimos|compartiremos)\b")),
)
_TRANSMIT_KINDS = ("passive_transmit", "active_transmit", "es_reflexive_transmit", "es_active_transmit")
# A transmission negation is a PREVIEW claim only when absolute. A
# destination qualifier after the verb ("to lenders", "a prestamistas") or a
# condition ("unless you choose to email") makes it a qualified claim the
# business owns, not a statement that nothing leaves the tablet — external
# review thread 10 (2026-08-22). Universal destinations keep it absolute.
# The destination runs from the preposition to the END of the clause, so a
# coordinated destination ("with our service providers OR ANYONE ELSE") is
# scanned whole — external review thread 13 (2026-08-22).
_DESTINATION_RE = re.compile(r"\b(?:to|with|a|al|hacia|con|para)\s+(.+)$")
_CONDITION_RE = re.compile(r"\b(?:unless|until|except|only if|only when|a menos que|hasta que|salvo|solo si|s\u00f3lo si|excepto)\b")
# Universal-destination words. Checked on EVERY word of the captured
# destination, not only the first, so an intensifier ("to ABSOLUTELY anyone",
# "with literally anybody else") does not turn an absolute promise into a
# qualified one \u2014 external review thread 11 (2026-08-22). Universal means
# a PRONOUN ("anyone", "nadie") or a universal phrase ("any other party",
# "ning\u00fan sitio"); the bare determiner "any" / "ning\u00fan" before a noun ("any
# lender", "ning\u00fan prestamista") is SCOPED \u2014 the quantified form of "to
# lenders" \u2014 and stays a qualified claim (thread 14).
_UNIVERSAL_DESTINATIONS = ("anyone", "anybody", "anything", "anywhere", "elsewhere", "outside",
                           "beyond", "nobody", "none", "nothing", "nadie", "fuera")
_UNIVERSAL_PHRASES = ("any other", "anyone else", "anybody else", "other place", "otro sitio",
                      "otro lugar", "otra parte", "ning\u00fan sitio", "ningun sitio", "ning\u00fan lugar",
                      "ningun lugar", "ning\u00fan lado", "ningun lado", "ninguna parte", "ning\u00fan otro",
                      "ningun otro", "ninguna otra")


def _is_universal(text: str) -> bool:
    return (any(w.startswith(_UNIVERSAL_DESTINATIONS) for w in text.split())
            or any(p in text for p in _UNIVERSAL_PHRASES))


# Tokens that mark a comma segment as a NEW CLAUSE rather than a coordinated
# continuation of the destination list ("..., but anyone can ask us
# questions" is not part of "with lenders"). A segment with one of these is
# where the destination scan stops — external review thread 15 (2026-08-22).
_CLAUSE_STARTERS = frozenset((
    "but", "while", "whereas", "although", "though", "yet", "so", "because", "since",
    "if", "when", "unless", "then", "which", "who", "that", "pero", "aunque",
    "mientras", "porque", "si", "cuando", "que", "sino", "entonces",
))
_VERB_LIKE = frozenset((
    "is", "are", "was", "were", "be", "been", "being", "can", "could", "will", "would",
    "may", "might", "must", "shall", "should", "do", "does", "did", "has", "have", "had",
    "es", "son", "está", "están", "puede", "pueden", "hay", "será", "serán",
))


_COORDINATORS = frozenset(("and", "or", "nor", "y", "e", "o", "u", "ni"))
_RELATIVE_PRONOUNS = frozenset(("who", "whom", "whose", "which", "that", "quien", "quienes", "que", "cual", "cuales"))
_LIST_ITEM_MAX_WORDS = 4


def _destination_continuation(clause_after: str, rest_after: str) -> str:
    """The destination text plus the COMMA-joined segments that continue it
    as a coordinated list ("with lenders, partners, advertisers or anybody
    else"). A segment continues only on structural evidence of coordination
    (threads 15–17): it is joined by a comma (a dash, colon, parenthesis or
    quote ends the destination), it opens with no clause starter and carries
    no verb-like token, and it either contains a coordinator ("… and cloud
    infrastructure service providers or anyone else", any length) or is a
    short list item of at most four words ("partners"). A comma-spliced
    clause with a lexical verb ("…, anyone needing help receives support")
    is longer than a list item and has no coordinator, so it stops the scan."""
    out = [clause_after]
    tail = rest_after[len(clause_after):]
    for sep, segment in _split_clauses_with_separators(tail):
        tokens = segment.split()
        if sep != ",":
            # an emphatic dash may continue the list ("— or anyone else");
            # a colon, parenthesis, quote or a dash opening a new clause ends it
            if not (sep in ("—", "–") and tokens and tokens[0] in _COORDINATORS):
                break
        if not tokens:
            continue
        if tokens[0] in _CLAUSE_STARTERS or any(t in _VERB_LIKE for t in tokens):
            break
        if any(t in _RELATIVE_PRONOUNS for t in tokens):
            break  # "anyone WHO asks receives support" is a clause, not an item
        if tokens[0] in _COORDINATORS:
            # ", and X": a clause-level coordinator unless X is itself a short
            # list item ("and to anyone else") — thread 18
            if len(tokens) - 1 > _LIST_ITEM_MAX_WORDS:
                break
        elif not (any(t in _COORDINATORS for t in tokens) or len(tokens) <= _LIST_ITEM_MAX_WORDS):
            break
        out.append(segment)
    return " ".join(out)


def _split_clauses_with_separators(text: str):
    """(separator, segment) pairs for the text after a clause; the first
    separator is the break that ended the previous clause."""
    pairs, cur, sep = [], [], ""
    for ch in text:
        if ch in _CLAUSE_BREAKS:
            pairs.append((sep, "".join(cur)))
            cur, sep = [], ch
        else:
            cur.append(ch)
    pairs.append((sep, "".join(cur)))
    return pairs[1:] if pairs and pairs[0][0] == "" and not pairs[0][1].strip() else pairs


def _transmission_is_absolute(clause_after: str, rest_after: str = None) -> bool:
    """True when nothing after the verb qualifies the negation.

    `clause_after` is the in-clause text after the verb (qualifying
    destinations and conditions live there); `rest_after` is everything after
    the verb to the end of the SENTENCE, from which only the coordinated
    continuation of the destination is scanned for a universal — so a list
    that ends in "… or anybody else" is seen even though commas are clause
    breaks (thread 13), while an unrelated following clause ("…, but anyone
    can ask us questions") is not (thread 15)."""
    if rest_after is None:
        rest_after = clause_after
    if _CONDITION_RE.search(clause_after):
        return False
    destination_text = _destination_continuation(clause_after, rest_after)
    if _is_universal(destination_text):
        return True
    m = _DESTINATION_RE.search(clause_after)
    if not m:
        return True
    return _is_universal(m.group(1).strip())
# Typographic apostrophes and quotes fold to ASCII before any matching, so a
# retailer's "weren’t stored" is the same claim as "weren't stored".
_PROSE_FOLD = str.maketrans({"\u2019": "'", "\u2018": "'", "\u02bc": "'", "`": "'",
                             "\u201c": '"', "\u201d": '"'})


def _normalize_prose(text: str) -> str:
    return text.lower().translate(_PROSE_FOLD)


def _storage_matches(sentence: str):
    """Every storage-negation match in a normalized sentence as
    (kind, start, end, display) — start/end span the negation + verb;
    display adds the preceding word so an error reads "aren't stored"."""
    out = []
    for kind, pat in STORAGE_NEGATION_PATTERNS:
        for m in pat.finditer(sentence):
            start, end = m.start(), m.end()
            disp_start = start
            if m.group(0).startswith("n't"):
                disp_start = sentence.rfind(" ", 0, start) + 1
            out.append((kind, start, end, sentence[disp_start:end]))
    out.sort(key=lambda t: t[1])
    return out


# Governed-data context terms (lower-cased substrings). Deliberately the
# customer-facing nouns for what the kiosk collects — answers, results,
# session, contact values, "your/personal/customer information|data" — and
# NOT generic nouns such as "details", "information" or "data" on their own,
# so that a truthful sentence about unrelated data is not rejected.
GOVERNED_DATA_TERMS = (
    "answer", "response", "quiz", "result", "sleep brief", "sleep profile",
    "session", "email", "e-mail", "phone", "contact", "your name",
    "your information", "your info", "personal information", "customer information",
    "contact information", "your data", "personal data", "customer data",
    "respuesta", "cuestionario", "resultado", "sesión", "sesion", "correo",
    "teléfono", "telefono", "contacto", "tu nombre", "tu información",
    "tu informacion", "tus datos", "información personal", "informacion personal",
    "datos personales", "datos del cliente", "información del cliente",
    "informacion del cliente",
)
_SENTENCE_BREAKS = (".", "!", "?", ";", "\n", "\r")


def _sentences(text: str):
    """Split lower-cased prose into sentences on . ! ? ; and line breaks."""
    out, cur = [], []
    for ch in text:
        if ch in _SENTENCE_BREAKS:
            if cur:
                out.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    if cur:
        out.append("".join(cur))
    return out


# Clause boundaries inside a sentence: commas, dashes, colons, parentheses,
# quotes. The storage negation binds to the noun phrase in ITS clause.
_CLAUSE_BREAKS = (",", "(", ")", "\u2014", "\u2013", ":", "\"", "\u201c", "\u201d", "\u00ab", "\u00bb")
# Active-voice storage negations take their object AFTER the verb ("we do not
# store X"); passive ones take their subject BEFORE ("X is not stored"); the
# Spanish reflexive ("X no se guarda") takes the subject before but also
# allows the object after ("no se almacenan X"). The kind comes from the
# pattern that matched.
# Conjunctions that open a new CLAUSE ("your answers are emailed but card
# details are not stored") and so delimit the noun phrase a negation binds
# to. Deliberately NOT "and" / "or" / "y" / "o": those also coordinate subject
# noun phrases ("your email and card numbers are not stored"), and splitting
# there would bind the negation to the last conjunct only and admit a false
# promise about the first. Fail closed: a coordinated clause on "and" is
# rejected and can be rephrased with "but" or a comma.
_CLAUSE_CONJUNCTIONS = (" but ", " while ", " whereas ", " although ", " though ", " yet ",
                        " pero ", " sino ", " aunque ", " mientras ")
# After a Spanish reflexive negation, text that opens with a preposition or
# adverb is an adverbial ("en este quiosco", "después de la sesión"), not the
# object; the object, when it follows, opens with a noun phrase.
_ES_ADVERBIAL_OPENERS = ("en ", "de ", "del ", "por ", "para ", "con ", "sin ", "desde ",
                         "hasta ", "durante ", "después", "despues", "antes ", "aquí", "aqui",
                         "ahí", "ahi", "nunca", "jamás", "jamas", "ni ", "tampoco", "más ", "mas ")
# English adverbials that can follow an active verb in place of its object
# ("we do not keep it ON any server", "we never store ANYWHERE").
_EN_ADVERBIAL_OPENERS = ("on ", "in ", "at ", "by ", "for ", "after ", "before ", "beyond ",
                         "outside ", "anywhere", "elsewhere", "here", "there", "once ", "when ",
                         "unless ", "until ", "again", "permanently", "ever ", "to ", "with ")
_ADVERBIAL_OPENERS = _ES_ADVERBIAL_OPENERS + _EN_ADVERBIAL_OPENERS
# Tokens that do not name anything on their own; a fragment made only of
# these has no noun to bind to, so the search widens (fail closed).
_NON_CONTENT_TOKENS = frozenset((
    "it", "its", "they", "them", "this", "that", "these", "those", "which", "who",
    "what", "and", "but", "or", "nor", "also", "so", "then", "there", "here",
    "we", "you", "i", "he", "she", "is", "are", "was", "were", "be", "been",
    "will", "would", "can", "may", "a", "an", "the", "of", "to", "in", "on",
    "by", "for", "at", "from", "with", "ever", "never", "not", "only",
    "do", "does", "did", "don't", "doesn't", "didn't", "won't", "wouldn't",
    "can't", "cannot", "couldn't", "shouldn't", "isn't", "aren't", "wasn't",
    "weren't", "have", "has", "had", "haven't", "hasn't", "hadn't", "get", "gets",
    "got", "shall", "should", "could", "might", "must", "being",
    "esto", "eso", "esta", "este", "estos", "estas", "ese", "esa", "esos",
    "esas", "ellos", "ellas", "que", "y", "o", "pero", "tampoco", "también",
    "tambien", "se", "no", "nunca", "jamás", "jamas", "ni", "el", "la", "los",
    "las", "le", "les", "lo", "te", "nos", "me", "os", "un", "una", "de", "del",
    "en", "por", "para", "con", "a", "al", "es", "son", "está", "están", "esta",
))
# Object pronouns that may stand where a noun object would ("keep IT on any
# server", the clitics "lo / las"); skipped before the adverbial test.
_OBJECT_PRONOUNS = frozenset(("it", "them", "this", "that", "these", "those",
                              "lo", "la", "los", "las", "le", "les", "te", "nos", "me", "os"))


def _has_content(fragment: str) -> bool:
    tok = []
    for ch in fragment:
        if ch.isalpha() or ch == "'":
            tok.append(ch)
        else:
            if tok:
                if "".join(tok) not in _NON_CONTENT_TOKENS:
                    return True
                tok = []
    return bool(tok) and "".join(tok) not in _NON_CONTENT_TOKENS


def _governed_in(fragment: str) -> bool:
    return any(term in fragment for term in GOVERNED_DATA_TERMS)


def _storage_claim_is_governed(sentence: str, prev_sentence: str, kind: str, pos: int, end_pos: int) -> bool:
    """Bind a storage-negation phrase to the noun phrase it is about and say
    whether that phrase names governed data.

    Passive / reflexive ("X is not stored", "X no se guarda"): the subject is
    the in-clause text BEFORE the phrase. Active ("we do not store X"): the
    object is the in-clause text AFTER it; the Spanish reflexive ("no se
    guardan X") takes the object after the verb when that text opens with a
    noun phrase rather than a preposition. When the bound fragment has no
    noun of its own (a bare pronoun, an interjected aside, a Spanish
    object-after construction), the search widens in the fail-closed
    direction: the rest of the sentence, then the previous sentence — so
    "Your answers, like everything else, are not stored" and
    "We use your email to send results. It is not stored." are still caught,
    while "During your showroom session, payment card details are not stored
    by this application" binds to "payment card details" and passes.

    `pos`/`end_pos` span the occurrence to bind; every occurrence in a
    sentence is inspected by the caller, so "card details are not stored, but
    your answers are not stored" is caught on its second clause. `kind` is
    the matching pattern's: passive, active, es_reflexive or es_active."""
    if pos < 0 or end_pos <= pos or end_pos > len(sentence):
        return False
    starts = [sentence.rfind(b, 0, pos) + 1 for b in _CLAUSE_BREAKS]
    starts += [i + len(c) for i, c in ((sentence.rfind(c, 0, pos), c) for c in _CLAUSE_CONJUNCTIONS) if i >= 0]
    start = max(starts + [0])
    ends = [i for i in (sentence.find(b, end_pos) for b in _CLAUSE_BREAKS + _CLAUSE_CONJUNCTIONS) if i >= 0]
    end = min(ends) if ends else len(sentence)
    clause_before = sentence[start:pos]
    clause_after = sentence[end_pos:end]
    if kind in _TRANSMIT_KINDS and not _transmission_is_absolute(clause_after, sentence[end_pos:]):
        return False
    # No fallback fragment includes the matched negation+verb itself: the verb
    # is a content word, and counting it would stop the search before the
    # previous sentence ("We use your answers ... . No las guardamos.").
    if kind in ("active", "es_active", "active_transmit", "es_active_transmit"):
        # The object follows the verb unless what follows opens with an
        # adverbial ("we do not keep it ON any server", "nunca lo almacenamos
        # EN ningún servidor" — the clitic object is inside the match); then
        # the object is a pronoun or absent and the search widens.
        tokens = clause_after.split()
        while tokens and tokens[0] in _OBJECT_PRONOUNS:
            tokens.pop(0)  # a pronoun object ("keep IT on any server") is not a noun
        remainder = " ".join(tokens)
        object_after = clause_after if (remainder and not remainder.startswith(_ADVERBIAL_OPENERS)
                                        and _has_content(remainder)) else ""
        # trailing adverbial text is consulted last, only as a fail-closed net
        order = (object_after, sentence[:pos], prev_sentence, clause_after)
    elif kind in ("es_reflexive", "es_reflexive_transmit"):
        after = clause_after.strip()
        object_after = clause_after if (after and not after.startswith(_ES_ADVERBIAL_OPENERS)) else ""
        order = (clause_before, object_after, sentence[:pos], clause_after, prev_sentence)
    else:
        order = (clause_before, sentence[:pos], clause_after, prev_sentence)
    for fragment in order:
        if _has_content(fragment):
            return _governed_in(fragment)
    return False


def _preview_signal_hit(low: str):
    """Return the offending phrase when lower-cased prose carries a
    preview-mode claim under a live endpoint, else None.

    Unconditional signals match anywhere. Storage-negation phrases match only
    when bound to governed data (_storage_claim_is_governed), so "Payment
    card details are not stored by this application" passes while "Your
    answers are not stored" and "We do not store your information" fail."""
    low = _normalize_prose(low)
    hit = next((sig for sig in PREVIEW_MODE_SIGNALS if sig in low), None)
    if hit:
        return hit
    sentences = _sentences(low)
    for idx, sentence in enumerate(sentences):
        prev_sentence = sentences[idx - 1] if idx else ""
        for kind, start, end, display in _storage_matches(sentence):
            if _storage_claim_is_governed(sentence, prev_sentence, kind, start, end):
                return display
    return None


def _check_privacy_prose_present(r: ValidationReport, config: dict) -> None:
    """Warn when a retailer that authors a text block leaves the two privacy
    prose keys the template now renders config-or-nothing blank in English
    (the Spanish block falls back to English through localizedConfigBlock).
    A blank emailPrivacy shows no line on the email screen; a blank
    privacyBody shows an empty Privacy section under its heading."""
    text = config.get("text")
    if not isinstance(text, dict):
        return
    for key, surface in (("emailPrivacy", "the email screen's privacy line"),
                         ("privacyBody", "the Privacy & Terms overlay body")):
        if _blank(text.get(key)):
            r.add_warning(f"text.{key} is blank: {surface} renders nothing (the template "
                          "carries no fallback promise of its own)")


def _check_privacy_prose_mode(r: ValidationReport, config: dict) -> None:
    """With a live gasUrl, reject preview-only wording in retailer privacy prose."""
    for block in ("text", "text_es"):
        prose = config.get(block)
        if not isinstance(prose, dict):
            continue
        for key in PRIVACY_PROSE_KEYS:
            value = prose.get(key)
            if not isinstance(value, str) or not value.strip():
                continue
            hit = _preview_signal_hit(value)
            if hit:
                r.add_error(f"{block}.{key} carries preview-mode wording ({hit!r}) but "
                            "gasUrl is live - a statement that nothing leaves the tablet "
                            "is false once live email is enabled; author the live-mode "
                            "wording or blank gasUrl")


def validate_store_config(config: dict, manifest: Optional[dict] = None, *,
                          require_gas_url: bool = False) -> ValidationReport:
    r = ValidationReport()

    if _blank(config.get("storeName")):
        r.add_error("storeName is empty")

    sk = config.get("storeKey")
    if _blank(sk):
        r.add_error("storeKey is empty")
    elif not _is_slug(sk):
        r.add_error(f"storeKey {sk!r} is not slug-safe (lowercase letters/digits/hyphens)")

    langs = config.get("languages")
    if langs not in SUPPORTED_LANGUAGES:
        r.add_error(f"languages must be ['en'] or ['en','es'], got {langs!r}")

    colors = config.get("colors") or {}
    if not _is_hex(colors.get("storePrimary")):
        r.add_error(f"colors.storePrimary missing or not a #hex color: {colors.get('storePrimary')!r}")
    for k in ("storePrimaryLight", "accent"):
        v = colors.get(k)
        if not _blank(v) and not _is_hex(v):
            r.add_error(f"colors.{k} is not a valid #hex color: {v!r}")

    par = config.get("publicAssetRoot")
    if _blank(par):
        r.add_error("publicAssetRoot is empty")
    else:
        par = str(par).strip()
        if not par.startswith("https://"):
            r.add_error(f"publicAssetRoot must be an HTTPS URL: {par!r}")
        if not par.endswith("/"):
            r.add_error(f"publicAssetRoot must end with a trailing slash: {par!r}")

    ah = config.get("allowedHosts")
    if not isinstance(ah, list) or not ah:
        r.add_error("allowedHosts is empty (the M1 domain lock requires at least the Pages host)")
    else:
        for h in ah:
            hs = str(h)
            if "://" in hs:
                r.add_error(f"allowedHosts entry {hs!r} must not include a protocol")
            if "/" in hs:
                r.add_error(f"allowedHosts entry {hs!r} must not include a path/slash")
            if hs in ("localhost", "127.0.0.1"):
                r.add_error(f"allowedHosts must not include {hs!r} (localhost/127.0.0.1 are a built-in fallback)")
        host = _host_from_url(par) if not _blank(par) else ""
        if host and host not in ah:
            r.add_warning(f"allowedHosts {ah} does not include the publicAssetRoot host {host!r} - "
                          f"the live site will blank on that host")

    disc = config.get("discount") or {}
    cd = disc.get("codeDigits")
    if isinstance(cd, bool) or not isinstance(cd, int) or not (CODE_DIGITS_MIN <= cd <= CODE_DIGITS_MAX):
        r.add_error(f"discount.codeDigits must be an integer {CODE_DIGITS_MIN}-{CODE_DIGITS_MAX}, got {cd!r}")

    raw_gas = config.get("gasUrl")
    gas = str(raw_gas or "").strip()
    is_placeholder = _blank(gas) or "example" in gas.lower() or gas.upper() in ("TODO", "PLACEHOLDER")
    # Build admission treats ANY non-blank gasUrl as LIVE-CAPABLE. The runtime
    # (index.html emailDeliveryLive() and the sendResults() gate) speaks the
    # live-mode data-use copy and POSTs the customer's contact values and
    # derived summary whenever gasUrl is non-blank AND no active promotion
    # scenario sets disableEmailSubmission. That scenario clause is a
    # date-windowed runtime state: the moment the scenario expires, the same
    # configured bytes go live without another build. The validator therefore
    # deliberately does NOT follow the runtime's momentary scenario state —
    # a config must be true in every state it can reach, so a non-blank gasUrl
    # is judged live here even while a temporary scenario suppresses delivery
    # (external review P2, 2026-08-22: preserved as intentional). A non-blank
    # placeholder is likewise not "not yet configured"; it is a live-capable
    # endpoint pointing at a sentinel, refused regardless of --require-gas-url.
    # Keyed on the RAW value's JavaScript truthiness, never on the stripped
    # string: the kiosk reads STORE_CONFIG.gasUrl raw, so a whitespace-only
    # gasUrl is live there (live-mode copy, a real fetch to "   ") and must be
    # refused here (external review P2 at `aa08e7e`, 2026-08-22).
    live_at_runtime = _runtime_truthy(raw_gas)
    if live_at_runtime and is_placeholder:
        r.add_error(f"gasUrl {raw_gas!r} is a non-blank placeholder: the kiosk treats any "
                    "non-empty gasUrl as live (live-mode copy, real POST) - whitespace "
                    "counts - blank it for preview or set the deployed endpoint")
    if is_placeholder:
        msg = "gasUrl is blank/placeholder (set it after the Google Apps Script deploy)"
        if require_gas_url:
            r.add_error(msg)
        else:
            # Blank-until-GAS-deploy is the documented pre-launch state (demo /
            # preview deployments run with gasUrl intentionally blank), so this
            # is operator information, not an escalatable defect — otherwise
            # --warnings-as-errors gates (the golden test) could never pass on
            # a demo-mode repo. Enforcement lives behind --require-gas-url.
            print(f"[validate] note: {msg}")

    if manifest is not None and _blank(manifest.get("start_url")):
        r.add_error("manifest.start_url is empty")

    # Trust integrity gate (2026-08-21): retailer privacy prose must be true for
    # the deployment mode it ships in. The app's own data-use sentence is
    # dictionary copy selected at runtime by gasUrl, so it can never say
    # "nothing is sent" under a live endpoint — but the retailer-authored
    # privacy text (text / text_es) is free prose, and a preview-only promise
    # left in it while a live GAS endpoint is configured would be a false
    # representation the moment the first email goes out. The build refuses
    # that combination: with a live-capable gasUrl, no retailer privacy key
    # may carry a preview-mode signal phrase. With gasUrl blank the same prose
    # is true and passes. Phrases, not semantics — the validator cannot judge
    # intent; it catches the sentences this repo has shipped or proposed so
    # far, and storage-negation phrases only when the sentence is about
    # governed data (_preview_signal_hit). Keyed on live-CAPABLE (any
    # non-blank gasUrl), never on the placeholder heuristic and never on a
    # temporary scenario, so the gate can only be stricter than the kiosk.
    if live_at_runtime:
        _check_privacy_prose_mode(r, config)
    _check_privacy_prose_present(r, config)

    # Consultation implications (0.6): structural + cross-language checks on the
    # EMITTED maps. Completeness against the quiz definition lives in
    # validate_sales_notes, where the Quiz tab is in hand; here the contract is
    # shape (dict of dict of strings), mirrored key sets, and emptiness parity —
    # the runtime resolver never falls back across languages, so a key present
    # in one language and absent (or lopsided-empty) in the other would make the
    # two surfaces silently disagree.
    def _impl_of(field):
        block = config.get(field)
        if not isinstance(block, dict):
            return None
        return block.get("consultationImplications")

    impl_maps = {}
    for field in ("salesNotes", "salesNotes_es"):
        impl = _impl_of(field)
        if impl is None:
            continue  # pre-0.6 config: no consultation block at all
        if not isinstance(impl, dict):
            r.add_error(f"{field}.consultationImplications must be an object")
            continue
        shape_ok = True
        for qid, opts in impl.items():
            if not isinstance(opts, dict):
                r.add_error(f"{field}.consultationImplications[{qid!r}] must be an object")
                shape_ok = False
                continue
            for oid, v in opts.items():
                if not isinstance(v, str):
                    r.add_error(f"{field}.consultationImplications[{qid!r}][{oid!r}] "
                                "must be a string")
                    shape_ok = False
        if shape_ok:
            impl_maps[field] = impl
    if len(impl_maps) == 1:
        present = next(iter(impl_maps))
        other = "salesNotes_es" if present == "salesNotes" else "salesNotes"
        r.add_error(f"{present}.consultationImplications present but "
                    f"{other}.consultationImplications is missing/invalid")
    elif len(impl_maps) == 2:
        keys_en = {(q, o) for q, opts in impl_maps["salesNotes"].items() for o in opts}
        keys_es = {(q, o) for q, opts in impl_maps["salesNotes_es"].items() for o in opts}
        if keys_en != keys_es:
            diff = sorted(".".join(k) for k in keys_en.symmetric_difference(keys_es))
            r.add_error("salesNotes/salesNotes_es consultationImplications key sets "
                        f"differ: {diff}")
        else:
            for (q, o) in sorted(keys_en):
                en_v = impl_maps["salesNotes"][q][o]
                es_v = impl_maps["salesNotes_es"][q][o]
                if (en_v.strip() == "") != (es_v.strip() == ""):
                    r.add_error(f"consultationImplications[{q}][{o}]: EN and ES must be "
                                "both filled or both empty (empty = intentional omission)")

    return r


# -- Promotions validation (scenario-aware, retailer-neutral) ------------------

# Accepted evidence-status values for promotion items (provenance ladder).
# Retailer-neutral: "retailer-*" statuses assert the offer was seen on the
# active retailer's own site; "lender-current-page" asserts a lender/partner
# source (e.g. Synchrony). Legacy "wgr-*" names remain accepted as deprecated
# aliases so historical WGR-era configs keep validating.
PROMO_EVIDENCE_STATUSES = {
    "retailer-current-page",
    "retailer-product-page",
    "retailer-full-page-archive",
    "retailer-indexed-historical",
    "operator-reported-retailer-indexed-historical",
    "lender-current-page",
    "prior-research-observation",
}
LEGACY_EVIDENCE_ALIASES = {
    "wgr-current-page": "retailer-current-page",
    "wgr-product-page": "retailer-product-page",
    "wgr-full-page-archive": "retailer-full-page-archive",
    "wgr-indexed-historical": "retailer-indexed-historical",
    "operator-reported-wgr-indexed-historical":
        "operator-reported-retailer-indexed-historical",
}
# Statuses that assert an offer was seen on an official source -> a non-empty
# sourceUrl must resolve to an explicitly configured allowed host (or a
# web.archive.org capture whose embedded target is an allowed host). The
# allowlist comes from tools/source_hosts.json — never a hardcoded retailer.
SOURCE_BACKED_STATUSES = {
    "retailer-current-page", "retailer-product-page", "retailer-full-page-archive",
    "retailer-indexed-historical", "operator-reported-retailer-indexed-historical",
    "lender-current-page",
}

# Default allowlist config location (repo-relative): explicit per-retailer
# source hosts. Shape: {"promotionSourceHosts": [...], "financingSourceHosts": [...]}
SOURCE_HOSTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "source_hosts.json")


def load_source_hosts(path: str = None) -> dict:
    """Load the explicit source-host allowlist config. Returns {} when the file
    is absent — validators then fail closed (source-backed claims error)."""
    p = path or SOURCE_HOSTS_FILE
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _archive_embedded_host(url: str) -> str:
    """For a web.archive.org capture URL, return the embedded target host (''
    when not an archive URL / unparseable)."""
    m = re.search(r"web\.archive\.org/web/[^/]+/(https?://\S+)", str(url))
    return _host_from_url(m.group(1)) if m else ""


def _split_safe_https(url: str):
    """urlsplit the URL and return the parse ONLY when it is a safe absolute
    https URL: scheme exactly https, hostname present, no username/password,
    port absent or exactly 443. Returns None otherwise — including relative,
    protocol-relative, http, javascript:/data:, credentialed, odd-port, and
    malformed URLs."""
    from urllib.parse import urlsplit
    try:
        parts = urlsplit(str(url).strip())
    except ValueError:
        return None
    if parts.scheme != "https" or not parts.hostname:
        return None
    if parts.username is not None or parts.password is not None:
        return None
    try:
        port = parts.port
    except ValueError:
        return None
    if port not in (None, 443):
        return None
    return parts


_PCT_RE = re.compile(r"%([0-9A-Fa-f]{2})")


def _normalize_percent(s: str) -> str:
    """RFC 3986 §6.2.2.1/§6.2.2.2 syntax-based normalization: percent-encoded
    UNRESERVED characters (ALPHA / DIGIT / '-' '.' '_' '~') are equivalent to
    their decoded form, and the hex digits of whatever stays encoded are
    case-normalized. RESERVED separators (%2F, %3F, %23, ...) are deliberately
    left encoded — decoding those would merge genuinely different paths."""
    def sub(m):
        ch = chr(int(m.group(1), 16))
        if ch.isascii() and (ch.isalnum() or ch in "-._~"):
            return ch
        return "%" + m.group(1).upper()
    return _PCT_RE.sub(sub, s)


def _remove_dot_segments(path: str) -> str:
    """RFC 3986 §5.2.4 dot-segment removal, matching how browsers resolve a
    path before navigating. '..' pops the previous segment and clamps at the
    root (it can never escape above it); '.' is dropped. Empty segments are
    preserved ('//a' stays distinct from '/a'), matching WHATWG."""
    if not path:
        return ""
    lead = "/" if path.startswith("/") else ""
    segs = path.split("/")
    if lead:
        segs = segs[1:]
    out = []
    for seg in segs:
        if seg == ".":
            continue
        if seg == "..":
            if out:
                out.pop()
            continue
        out.append(seg)
    return lead + "/".join(out)


def _url_identity(url: str) -> str:
    """Normalized URL identity for anti-conflation comparisons — deliberately
    aligned with how a BROWSER resolves a URL before navigating, because the
    threat is a config edit that reuses a known-unverified target in a
    syntactically different but navigationally identical form.

    Normalizes: lowercased scheme and hostname; default port dropped;
    backslashes treated as path separators (WHATWG does this for special
    schemes); percent-encoded unreserved characters decoded (so %2e reads as
    a dot and participates in dot-segment removal, exactly as browsers treat
    it); dot segments removed; insignificant trailing slashes dropped. Query
    and fragment are ignored — that is this policy's choice, since neither
    changes which document the dead path serves.

    Deliberately PRESERVED as significant: path case (paths are
    case-sensitive per RFC 3986), reserved percent-encodings such as %2F, and
    empty segments. Returns '' on malformed input so callers fail closed."""
    from urllib.parse import urlsplit
    try:
        # urlsplit already strips ASCII tab/newline/CR like the URL spec does.
        parts = urlsplit(str(url).strip())
    except ValueError:
        return ""
    if not parts.scheme or not parts.hostname:
        return ""
    try:
        port = parts.port
    except ValueError:
        return ""
    scheme = parts.scheme.lower()
    default = {"https": 443, "http": 80}.get(scheme)
    portpart = "" if port in (None, default) else f":{port}"
    path = (parts.path or "").replace("\\", "/")
    path = _remove_dot_segments(_normalize_percent(path))
    while path.endswith("/"):
        path = path[:-1]
    return f"{scheme}://{parts.hostname.lower()}{portpart}{path}"


def _is_allowed_source(url: str, allowed_hosts) -> bool:
    """True when url is a safe absolute https URL (no credentials, default
    port — see _split_safe_https) whose host is one of the explicitly allowed
    hosts (exact match or a dot-boundary subdomain), or a safe https
    web.archive.org capture whose embedded target host is allowed. Empty
    allowlist allows nothing (fail closed)."""
    # The allowlist is itself author-editable JSON (tools/source_hosts.json),
    # so it is type-guarded here too and fails CLOSED: a malformed allowlist,
    # or one whose entries are not host strings, allows nothing rather than
    # raising. `h.lower()` on a non-string entry used to be an AttributeError.
    if not isinstance(allowed_hosts, (list, tuple, set, frozenset)):
        return False
    hosts = [h.strip().lower() for h in allowed_hosts
             if isinstance(h, str) and h.strip()]
    if not hosts:
        return False
    parts = _split_safe_https(url)
    if parts is None:
        return False
    host = parts.hostname.lower()
    if host == "web.archive.org" or host.endswith(".web.archive.org"):
        host = _archive_embedded_host(url).lower()
        if not host:
            return False
    return any(host == h or host.endswith("." + h) for h in hosts)


def _runtime_financing_host_allowed(url, declared_hosts) -> bool:
    """EXACT mirror of index.html's financingSourceAllowed() (index.html:9981).

    The build and the browser police financing URLs against DIFFERENT lists:
    the build uses tools/source_hosts.json financingSourceHosts, the browser
    uses the shipped financing.allowedSourceHosts. A URL the build accepts is
    therefore not automatically one the browser will render, and when the
    browser refuses it the failure is SILENT — the anchor loses its href, the
    QR continuation and email URL disappear, and financingTermsFresh() goes
    false so exact terms stay hidden even when they are authorized. Nothing
    reports it. validate_financing uses this mirror to demand that the two
    boundaries agree before the bundle can ship.

    Deliberately reproduces the JS semantics rather than improving on them,
    because agreement is the property under test:
      * entries are lowercased but NOT trimmed (JS: String(x).toLowerCase()),
        so a padded "  lacks.com  " really does fail in the browser and must
        be reported here rather than silently tolerated;
      * a non-default port is refused, and an EXPLICIT :443 is accepted —
        the JS reads `if (u.port) return false`, and the URL parser normalises
        the default port away, so `u.port` is '' for both "absent" and
        ":443". python's urlsplit does NOT normalise, so mirroring the JS
        means comparing against 443 rather than testing truthiness;
      * matching is exact host or dot-boundary suffix;
      * there is NO web.archive.org branch in the browser — see
        _is_allowed_source, which has one for PROMOTIONS EVIDENCE URLs. An
        archive capture is a legitimate evidence source and an illegitimate
        customer destination, and validate_financing enforces that split."""
    from urllib.parse import urlsplit
    hosts = declared_hosts if isinstance(declared_hosts, list) else []
    if not url or not hosts:
        return False
    try:
        parts = urlsplit(_safe_str(url))
        if parts.scheme != "https" or not parts.hostname:
            return False
        if parts.username or parts.password:
            return False
        if parts.port is not None and parts.port != 443:
            return False
    except ValueError:
        return False
    host = parts.hostname.lower()
    for entry in hosts:
        if not isinstance(entry, str):
            continue
        x = entry.lower()                   # NO .strip() — mirrors the JS
        if host == x or host[-(len(x) + 1):] == "." + x:
            return True
    return False


def _is_archive_capture(url) -> bool:
    """True for a web.archive.org capture URL. Legitimate as promotions
    EVIDENCE (see _is_allowed_source), never as a customer destination: the
    browser's financingSourceAllowed() has no archive branch, so such a URL
    would validate at build time and render as nothing."""
    parts = _split_safe_https(url)
    if parts is None:
        return False
    host = (parts.hostname or "").lower()
    return host == "web.archive.org" or host.endswith(".web.archive.org")


def _valid_ends_at(s: str) -> bool:
    """A promotion `endsAt` must be an ISO-8601 datetime carrying an explicit
    timezone offset, so it is an absolute instant the client can compare without
    depending on the tablet's local timezone (e.g. 2026-06-16T23:59:59-05:00).
    A bare date or an offset-less timestamp is rejected."""
    from datetime import datetime
    try:
        d = datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return False
    return d.tzinfo is not None


def validate_promotions(config: dict, *, mattress_ids=None, accessory_ids=None,
                        accessory_categories=None,
                        allowed_source_hosts=None,
                        mattress_brands=None,
                        allow_illustrative=False) -> ValidationReport:
    """Validate the optional promotions block (scenario-aware or flat back-compat).

    Pure: takes the assembled config dict plus the known mattress/accessory id and
    accessory-category sets, the known mattress brand set, plus the explicit
    source-host allowlist for source-backed evidence statuses. No-op when there
    is no promotions block.

    Daybreak (PR 2): scenarios whose kind is "current-event" or
    "illustrative-demo" are governed by the strict contracts below; every other
    shape (legacy flat, historical-demo, pre-Daybreak scenarios) keeps its
    existing validation unchanged. allow_illustrative defaults to False so the
    production build path rejects any illustrative-demo scenario; only the demo
    tools (localhost server / static demo-bundle builder) validate with
    allow_illustrative=True."""
    r = ValidationReport()
    promos = config.get("promotions")
    if not promos:
        return r
    mids = set(mattress_ids or [])
    aids = set(accessory_ids or [])
    acats = set(c for c in (accessory_categories or []) if c)
    hosts = list(allowed_source_hosts or [])
    brands = set(b for b in (mattress_brands or []) if b)

    scenarios = promos.get("scenarios")
    if scenarios is None:
        _validate_promo_scenario(r, "(flat)", promos, True, mids, aids, acats, hosts)
        return r
    if not isinstance(scenarios, dict):
        r.add_error("promotions.scenarios must be an object")
        return r
    active = promos.get("activeScenario")
    if active and active not in scenarios:
        r.add_error(f"promotions.activeScenario {active!r} is not a defined scenario "
                    f"{sorted(scenarios)}")
    for sid, sc in scenarios.items():
        if not isinstance(sc, dict):
            r.add_error(f"promotions.scenarios[{sid!r}] must be an object")
            continue
        kind = sc.get("kind")
        if kind == "current-event":
            _validate_current_event_scenario(r, sid, sc, mids, brands)
        elif kind == "illustrative-demo":
            if not allow_illustrative:
                r.add_error(
                    f"promotions.scenarios[{sid!r}]: illustrative-demo scenarios "
                    f"must never ship in production configuration (demo fixtures "
                    f"are validated separately with allow_illustrative=True)")
            _validate_illustrative_scenario(r, sid, sc, mids, brands)
        else:
            _validate_promo_scenario(r, sid, sc, sid == active, mids, aids, acats, hosts)

    _validate_governed_promotions(r, promos, scenarios, active, hosts)
    return r


def _validate_promo_scenario(r, sid, sc, is_active, mids, aids, acats, hosts):
    kind = sc.get("kind")
    items = sc.get("items") or []
    storewide = sc.get("storewide") or []

    # duplicate promotion ids within a scenario (items + storewide share an id space)
    seen = set()
    for it in list(items) + list(storewide):
        iid = it.get("id")
        if iid in seen:
            r.add_error(f"promotions[{sid}]: duplicate promotion id {iid!r}")
        else:
            seen.add(iid)

    # historical-demo guardrails
    if kind == "historical-demo":
        if sc.get("disableEmailSubmission") is not True:
            r.add_error(f"promotions[{sid}]: historical-demo scenario must set "
                        f"disableEmailSubmission=true")
        if is_active:
            disc = sc.get("disclosure") or {}
            if not (_s(disc.get("en")) and _s(disc.get("es"))):
                r.add_error(f"promotions[{sid}]: active historical-demo scenario must "
                            f"have a disclosure in EN and ES")

    for it in items:
        _validate_promo_item(r, sid, it, mids, aids, acats, hosts)
    for it in storewide:
        _validate_promo_item(r, sid, it, mids, aids, acats, hosts)


def _validate_promo_item(r, sid, it, mids, aids, acats, hosts):
    iid = it.get("id", "?")
    tag = f"promotions[{sid}].{iid}"

    # eligibility references resolve to real catalog entries
    for mid in (it.get("eligibleMattressIds") or []):
        if mids and mid not in mids:
            r.add_error(f"{tag}: eligibleMattressIds {mid!r} not in mattresses")
    for aid in (it.get("eligibleAccessoryIds") or []):
        if aids and aid not in aids:
            r.add_error(f"{tag}: eligibleAccessoryIds {aid!r} not in accessories")
    for cat in (it.get("eligibleAccessoryCategories") or []):
        if acats and cat not in acats:
            r.add_error(f"{tag}: eligibleAccessoryCategories {cat!r} not a known accessory category")

    # customer-visible bilingual copy: badge + headline must carry EN and ES
    for field in ("badge", "headline"):
        obj = it.get(field)
        if not isinstance(obj, dict) or not _s(obj.get("en")) or not _s(obj.get("es")):
            r.add_error(f"{tag}: {field} missing EN or ES")
    # detail/disclosure: if one language is present the other must be too
    for field in ("detail", "disclosure"):
        obj = it.get(field)
        if isinstance(obj, dict) and (bool(_s(obj.get("en"))) != bool(_s(obj.get("es")))):
            r.add_error(f"{tag}: {field} has one language but not the other")

    # evidence status enum + source rules (legacy wgr-* names normalize to the
    # retailer-neutral statuses; source-backed statuses require an explicitly
    # allowlisted host — fail closed when no allowlist is configured)
    ev = it.get("evidenceStatus")
    if ev in LEGACY_EVIDENCE_ALIASES:
        ev = LEGACY_EVIDENCE_ALIASES[ev]
    if ev is not None and ev not in PROMO_EVIDENCE_STATUSES:
        r.add_error(f"{tag}: evidenceStatus {it.get('evidenceStatus')!r} not in "
                    f"{sorted(PROMO_EVIDENCE_STATUSES)} (or a legacy wgr-* alias)")
    src = _s(it.get("sourceUrl"))
    if ev in SOURCE_BACKED_STATUSES and src:
        if not hosts:
            r.add_error(f"{tag}: evidenceStatus {ev!r} carries a sourceUrl but no "
                        f"source-host allowlist is configured (tools/source_hosts.json)")
        elif not _is_allowed_source(src, hosts):
            r.add_error(f"{tag}: sourceUrl {src!r} host is not in the configured "
                        f"source-host allowlist (required for evidenceStatus {ev!r})")
    if ev == "retailer-full-page-archive" and src and not _is_allowed_source(src, hosts):
        r.add_error(f"{tag}: retailer-full-page-archive sourceUrl must be a "
                    f"web.archive.org capture of an allowlisted host")
    if ev == "prior-research-observation" and not _s(it.get("evidenceProvenance")):
        r.add_error(f"{tag}: evidenceStatus prior-research-observation requires evidenceProvenance")

    # time-limited offers: endsAt must be an absolute ISO-8601 instant (with a
    # timezone offset) so the client can hide expired offers without depending
    # on the tablet's local timezone.
    ends = _s(it.get("endsAt"))
    if ends and not _valid_ends_at(ends):
        r.add_error(f"{tag}: endsAt {ends!r} must be an ISO-8601 datetime with a "
                    f"timezone offset (e.g. 2026-06-16T23:59:59-05:00)")

    # the reconstructed 20% storewide event must not target individual products
    # unless explicitly marked eligible
    if it.get("type") == "reconstructed-storewide" or "storewide-20" in str(iid):
        targets_products = bool(it.get("eligibleMattressIds") or it.get("eligibleAccessoryIds")
                                or it.get("eligibleAccessoryCategories"))
        if targets_products and it.get("eligibleForStorewide20") is not True:
            r.add_error(f"{tag}: 20% storewide event applied to individual products "
                        f"without eligibleForStorewide20=true")


# -- Daybreak governed scenarios (PR 2) ----------------------------------------
# Two governed scenario kinds exist beyond the legacy/back-compat shapes:
#   * "current-event"     — the production Daybreak contract: strict key
#     allowlists, activation coupling, evidence-when-operational. Production
#     ships the machinery with scenarios {} until a real campaign is approved.
#   * "illustrative-demo" — demonstration-only content (the Black Friday demo
#     fixture). Never permitted in production generated configuration; the demo
#     tools validate with allow_illustrative=True.
# Legacy flat promotions, "historical-demo", and every other pre-Daybreak shape
# keep their existing validation and rendering semantics untouched.

PROMO_SCHEMA_VERSION = 1

GOVERNED_SCENARIO_KINDS = {"current-event", "illustrative-demo"}

CURRENT_EVENT_SCENARIO_KEYS = {
    "kind", "enabledByOwner", "authority", "startAt", "endsAt", "verifiedAt",
    "maxAgeDays", "sourceUrl", "esReviewStatus", "name", "whyItEnds",
    "disclosure", "items", "storewide",
}
# V1 current-event items inherit the scenario's governance, evidence, and
# window — item-level timestamps/authority/review fields are forbidden.
CURRENT_EVENT_ITEM_KEYS = {
    "id", "badge", "headline", "detail", "disclosure",
    "eligibleMattressIds", "eligibleBrands",
}
# Storewide entries must not carry mattress-specific eligibility selectors.
CURRENT_EVENT_STOREWIDE_KEYS = {"id", "badge", "headline", "detail", "disclosure"}

# Illustrative demos may carry the runtime-injected window fields (the demo
# server / demo page stamp startAt/endsAt/expiration at serve or load time), but
# never evidence, authority, authorization, or authoring helpers.
ILLUSTRATIVE_SCENARIO_KEYS = {
    "kind", "demoOnly", "disableEmailSubmission", "verified", "name",
    "disclosure", "items", "storewide", "startAt", "endsAt",
}
ILLUSTRATIVE_ITEM_KEYS = CURRENT_EVENT_ITEM_KEYS | {"endsAt", "expiration"}
ILLUSTRATIVE_STOREWIDE_KEYS = CURRENT_EVENT_STOREWIDE_KEYS | {"endsAt", "expiration"}

PROMO_ES_REVIEW_STATUSES = {"pending-native-legal-review",
                            "approved-native-legal-review"}
PROMO_ES_REVIEW_APPROVED = "approved-native-legal-review"

# Explicitly forbidden keys plus a substring classifier for equivalent quiz-,
# answer-, score-, inventory-, activity-, countdown-, or behavior-shaped keys.
# The scan is recursive so a forbidden shape cannot hide inside a nested
# eligibility object.
_GOVERNED_FORBIDDEN_KEYS = {
    "campaigns", "campaign", "eligibleQuizTags", "eligibleAnswers", "answers",
    "answerIds", "quizAnswers", "recommendationScores", "scoreThreshold",
    "customerSegment", "inferredUrgency", "inventoryCount", "stockCount",
    "customersViewing", "purchaseCount", "countdownSeconds", "countdownMinutes",
    "rollingDeadline", "resetAtMidnight",
}
_GOVERNED_FORBIDDEN_KEY_STEMS = (
    "quiz", "answer", "score", "inventory", "stock", "countdown", "viewing",
    "purchase", "segment", "urgency", "rolling", "midnight", "behavior",
    "activity",
)


def _governed_key_forbidden(key):
    """Reason string when a key is forbidden inside a governed scenario, else
    None. Keys only — copy values are never scanned by this classifier."""
    if not isinstance(key, str):
        return "non-string key"
    if key in _GOVERNED_FORBIDDEN_KEYS:
        return "explicitly forbidden"
    low = key.lower()
    for stem in _GOVERNED_FORBIDDEN_KEY_STEMS:
        if stem in low:
            return f"matches the forbidden key pattern '{stem}'"
    return None


def _scan_governed_forbidden_keys(r, tag, obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            why = _governed_key_forbidden(k)
            if why:
                r.add_error(f"{tag}: key {k!r} is not permitted in a governed "
                            f"scenario ({why})")
            _scan_governed_forbidden_keys(r, tag, v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            _scan_governed_forbidden_keys(r, tag, v)


def _normalized_host_entry_error(h):
    """Reason string when an allowedSourceHosts entry is not a normalized bare
    host, else None."""
    if not isinstance(h, str) or not h.strip():
        return "blank or non-string"
    if h != h.strip():
        return "padded whitespace"
    if h != h.lower():
        return "not lowercase"
    if "*" in h:
        return "wildcard"
    if "://" in h or "/" in h:
        return "scheme or path"
    if ":" in h:
        return "port"
    if h.startswith(".") or h.endswith(".") or ".." in h:
        return "malformed"
    return None


def _host_covered(host, allowed_hosts):
    """Exact-or-dot-boundary-subdomain coverage, mirroring the browser/build
    source predicates, over bare host strings."""
    for a in (allowed_hosts or []):
        if not isinstance(a, str) or not a:
            continue
        if host == a or host.endswith("." + a):
            return True
    return False


def _bilingual_nonblank(obj):
    return isinstance(obj, dict) and bool(_s(obj.get("en"))) and bool(_s(obj.get("es")))


def _verified_age_exceeds(verified_at, max_age_days):
    """Build-time freshness: True when verifiedAt is older than maxAgeDays (or
    unparseable/offset-less, which fails closed)."""
    from datetime import datetime, timezone
    try:
        d = datetime.fromisoformat(verified_at)
    except (ValueError, TypeError):
        return True
    if d.tzinfo is None:
        return True
    return (datetime.now(timezone.utc) - d).total_seconds() > max_age_days * 86400


def _window_order_error(start, end):
    """Error text when endsAt is not strictly later than startAt, else None.
    Both inputs are already format-validated offset-bearing instants."""
    from datetime import datetime
    try:
        s = datetime.fromisoformat(start)
        e = datetime.fromisoformat(end)
    except (ValueError, TypeError):
        return None  # format errors are reported separately
    if e <= s:
        return ("endsAt must be strictly later than startAt "
                f"(startAt {start!r}, endsAt {end!r})")
    return None


def _governed_item_ids(r, tag, sc):
    """Shared duplicate-id check across items + storewide for governed kinds.
    Non-list containers are reported by _governed_lists; skipped here so
    malformed content errors instead of crashing."""
    entries = []
    for field in ("items", "storewide"):
        val = sc.get(field)
        if isinstance(val, list):
            entries.extend(val)
    seen = set()
    for it in entries:
        if not isinstance(it, dict):
            continue
        iid = _s(it.get("id"))
        if not iid:
            r.add_error(f"{tag}: every item needs a nonblank id")
        elif iid in seen:
            r.add_error(f"{tag}: duplicate promotion id {iid!r}")
        else:
            seen.add(iid)


def _governed_entry_checks(r, tag, it, allowed_keys, mids, brands, *,
                           require_eligibility):
    """Per-entry checks shared by current-event and illustrative items."""
    unknown = set(it) - allowed_keys
    for k in sorted(unknown, key=str):
        if _governed_key_forbidden(k):
            continue  # already reported by the recursive scan
        r.add_error(f"{tag}: item key {k!r} is not permitted here")
    for field in ("badge", "headline"):
        if not _bilingual_nonblank(it.get(field)):
            r.add_error(f"{tag}: {field} must carry nonblank EN and ES")
    for field in ("detail", "disclosure"):
        obj = it.get(field)
        if obj is not None and not _bilingual_nonblank(obj):
            r.add_error(f"{tag}: {field}, when present, must carry nonblank EN and ES")
    emi = it.get("eligibleMattressIds")
    if emi is not None:
        if not isinstance(emi, list):
            r.add_error(f"{tag}: eligibleMattressIds must be an array")
            emi = []
        seen = set()
        for mid in emi:
            if not isinstance(mid, str) or not mid.strip():
                r.add_error(f"{tag}: eligibleMattressIds entries must be nonblank strings")
            elif mid in seen:
                r.add_error(f"{tag}: duplicate eligibleMattressIds entry {mid!r}")
            else:
                seen.add(mid)
                if mids and mid not in mids:
                    r.add_error(f"{tag}: eligibleMattressIds {mid!r} not in mattresses")
    ebr = it.get("eligibleBrands")
    if ebr is not None:
        if not isinstance(ebr, list):
            r.add_error(f"{tag}: eligibleBrands must be an array")
            ebr = []
        seen = set()
        for b in ebr:
            if not isinstance(b, str) or not b.strip():
                r.add_error(f"{tag}: eligibleBrands entries must be nonblank strings")
            elif b in seen:
                r.add_error(f"{tag}: duplicate eligibleBrands entry {b!r}")
            else:
                seen.add(b)
                if brands and b not in brands:
                    r.add_error(f"{tag}: eligibleBrands {b!r} does not exactly match "
                                f"any brand in the mattress catalog — a misspelled "
                                f"brand would render on zero products")
    if require_eligibility:
        has_ids = isinstance(emi, list) and len(emi) > 0
        has_brands = isinstance(ebr, list) and len(ebr) > 0
        if not (has_ids or has_brands):
            r.add_error(f"{tag}: a product item needs at least one catalog "
                        f"eligibility selector (eligibleMattressIds or eligibleBrands)")
    ends = it.get("endsAt")
    if ends is not None and not _valid_ends_at(_s(ends)):
        r.add_error(f"{tag}: endsAt {ends!r} must be an ISO-8601 datetime with a "
                    f"timezone offset")


def _governed_lists(r, tag, sc):
    """items/storewide must be arrays of objects; returns (items, storewide)
    with non-objects filtered after reporting, so later checks cannot crash."""
    out = []
    for field in ("items", "storewide"):
        val = sc.get(field, [])
        if val is None:
            val = []
        if not isinstance(val, list):
            r.add_error(f"{tag}: {field} must be an array")
            out.append([])
            continue
        entries = []
        for i, it in enumerate(val):
            if not isinstance(it, dict):
                r.add_error(f"{tag}: {field}[{i}] must be an object")
            else:
                entries.append(it)
        out.append(entries)
    return out[0], out[1]


def _validate_current_event_scenario(r, sid, sc, mids, brands):
    tag = f"promotions[{sid}]"
    _scan_governed_forbidden_keys(r, tag, sc)
    for k in sorted(set(sc) - CURRENT_EVENT_SCENARIO_KEYS, key=str):
        if _governed_key_forbidden(k):
            continue
        r.add_error(f"{tag}: key {k!r} is not a recognized current-event scenario key")

    if type(sc.get("enabledByOwner")) is not bool:
        r.add_error(f"{tag}: enabledByOwner must be present as a real JSON boolean "
                    f"(got {sc.get('enabledByOwner')!r})")

    auth = sc.get("authority")
    if auth is not None:
        if not isinstance(auth, dict):
            r.add_error(f"{tag}: authority must be an object")
        else:
            for k in sorted(set(auth) - {"owner", "role"}, key=str):
                r.add_error(f"{tag}: authority may contain only owner and role "
                            f"(got {k!r})")
            for k in ("owner", "role"):
                if k in auth and not isinstance(auth[k], str):
                    r.add_error(f"{tag}: authority.{k} must be a string")

    start = _s(sc.get("startAt"))
    end = _s(sc.get("endsAt"))
    for field, val in (("startAt", start), ("endsAt", end)):
        if not val:
            r.add_error(f"{tag}: {field} is required for a current-event scenario")
        elif not _valid_ends_at(val):
            r.add_error(f"{tag}: {field} {val!r} must be an ISO-8601 datetime with "
                        f"an explicit timezone offset")
    if start and end and _valid_ends_at(start) and _valid_ends_at(end):
        order_err = _window_order_error(start, end)
        if order_err:
            r.add_error(f"{tag}: {order_err}")

    mad = sc.get("maxAgeDays")
    if mad is not None and (type(mad) is not int or not (1 <= mad <= 60)):
        r.add_error(f"{tag}: maxAgeDays must be a non-bool integer in 1..60 "
                    f"(got {mad!r})")

    esr = sc.get("esReviewStatus")
    if esr is not None and esr not in PROMO_ES_REVIEW_STATUSES:
        r.add_error(f"{tag}: esReviewStatus {esr!r} not in "
                    f"{sorted(PROMO_ES_REVIEW_STATUSES)}")

    va = sc.get("verifiedAt")
    if va is not None and _s(va) and not _valid_ends_at(_s(va)):
        r.add_error(f"{tag}: verifiedAt {va!r} must be an ISO-8601 datetime with "
                    f"an explicit timezone offset")

    src = sc.get("sourceUrl")
    if src is not None and not isinstance(src, str):
        r.add_error(f"{tag}: sourceUrl must be a string")

    for field in ("name", "whyItEnds", "disclosure"):
        if not _bilingual_nonblank(sc.get(field)):
            r.add_error(f"{tag}: {field} must carry nonblank EN and ES")

    items, storewide = _governed_lists(r, tag, sc)
    _governed_item_ids(r, tag, sc)
    for it in items:
        itag = f"{tag}.{_s(it.get('id')) or '?'}"
        _governed_entry_checks(r, itag, it, CURRENT_EVENT_ITEM_KEYS, mids, brands,
                               require_eligibility=True)
        if it.get("endsAt") is not None:
            r.add_error(f"{itag}: item-level endsAt is not permitted — V1 "
                        f"current-event items inherit the scenario window")
    for it in storewide:
        itag = f"{tag}.{_s(it.get('id')) or '?'}"
        _governed_entry_checks(r, itag, it, CURRENT_EVENT_STOREWIDE_KEYS, mids,
                               brands, require_eligibility=False)
        for k in ("eligibleMattressIds", "eligibleBrands"):
            if k in it:
                r.add_error(f"{itag}: storewide entries must not carry "
                            f"mattress-specific eligibility ({k})")


# Deliberately narrow claim-copy bans for illustrative demos. Structured fields
# carry the strong rules (no sourceUrl, no evidence, no authorization); these
# regexes only catch the most direct savings/inventory/activity/delivery claim
# phrasings in each language and are NOT a general claim classifier. Both
# languages are tested in the self-test.
_ILLUSTRATIVE_COPY_BANS = (
    ("dollar-savings claim", r"\$\s*\d", r"\$\s*\d"),
    ("percentage-savings claim", r"\d\s*%", r"\d\s*%"),
    ('"free" claim', r"\bfree\b", r"\bgratis\b"),
    ("inventory claim", r"\bin stock\b|\bonly\s+\d+\s+left\b",
     r"\bexistencias\b|\bquedan\s+\d+\b"),
    ("customer-activity claim",
     r"\b(customers|people|shoppers)\s+(are|have)\b|\bviewing\b",
     r"\bviendo\b|\bpersonas\s+están\b"),
    ("delivery-availability claim",
     r"\bdeliver(?:y|ed)?\s+(?:today|tomorrow|by\b)|\bsame-?day\b",
     r"\bentrega\s+(?:hoy|mañana|inmediata)\b"),
)


def _scan_illustrative_copy(r, tag, obj):
    import re

    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}")
        elif isinstance(o, (list, tuple)):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]")
        elif isinstance(o, str):
            es = path.endswith(".es")
            for label, en_re, es_re in _ILLUSTRATIVE_COPY_BANS:
                if re.search(es_re if es else en_re, o, re.IGNORECASE):
                    r.add_error(f"{tag}: {path} carries a {label} — forbidden in "
                                f"illustrative demo copy")
    walk(obj, tag)


def _validate_illustrative_scenario(r, sid, sc, mids, brands):
    tag = f"promotions[{sid}]"
    _scan_governed_forbidden_keys(r, tag, sc)
    for k in sorted(set(sc) - ILLUSTRATIVE_SCENARIO_KEYS, key=str):
        if _governed_key_forbidden(k):
            continue
        extra = ""
        if k in ("sourceUrl", "verifiedAt", "maxAgeDays", "authority",
                 "enabledByOwner", "evidenceStatus", "evidenceProvenance",
                 "esReviewStatus", "durationHours", "whyItEnds"):
            extra = (" — illustrative demos may not carry evidence, authority, "
                     "authorization, review status, or authoring helpers")
        r.add_error(f"{tag}: key {k!r} is not permitted on an illustrative-demo "
                    f"scenario{extra}")

    if sc.get("demoOnly") is not True:
        r.add_error(f"{tag}: illustrative-demo requires demoOnly exactly true")
    if sc.get("disableEmailSubmission") is not True:
        r.add_error(f"{tag}: illustrative-demo requires disableEmailSubmission "
                    f"exactly true")
    if sc.get("verified") is True:
        r.add_error(f"{tag}: an illustrative-demo scenario must not claim "
                    f"verified true")

    if not _bilingual_nonblank(sc.get("name")):
        r.add_error(f"{tag}: name must carry nonblank EN and ES")
    disc = sc.get("disclosure")
    if not _bilingual_nonblank(disc):
        r.add_error(f"{tag}: disclosure must carry nonblank EN and ES")
    else:
        en_d = _s(disc.get("en")).lower()
        es_d = _s(disc.get("es")).lower()
        # Narrow-by-design content floor: the disclosure must self-identify as
        # illustrative/demo AND deny being a current offer, in each language.
        if not (("illustrative" in en_d or "demo" in en_d)
                and "not current" in en_d):
            r.add_error(f"{tag}: EN disclosure must clearly say the offers are "
                        f"illustrative/demo and are not current offers")
        if not (("ilustrativ" in es_d or "demostraci" in es_d)
                and "no son promociones vigentes" in es_d):
            r.add_error(f"{tag}: ES disclosure must clearly say the offers are "
                        f"illustrative and not current promotions "
                        f"('no son promociones vigentes')")

    for field, val in (("startAt", sc.get("startAt")), ("endsAt", sc.get("endsAt"))):
        if val is not None and not _valid_ends_at(_s(val)):
            r.add_error(f"{tag}: {field} {val!r} must be an ISO-8601 datetime "
                        f"with a timezone offset")

    items, storewide = _governed_lists(r, tag, sc)
    _governed_item_ids(r, tag, sc)
    for it in items:
        itag = f"{tag}.{_s(it.get('id')) or '?'}"
        _governed_entry_checks(r, itag, it, ILLUSTRATIVE_ITEM_KEYS, mids, brands,
                               require_eligibility=True)
    for it in storewide:
        itag = f"{tag}.{_s(it.get('id')) or '?'}"
        _governed_entry_checks(r, itag, it, ILLUSTRATIVE_STOREWIDE_KEYS, mids,
                               brands, require_eligibility=False)
    _scan_illustrative_copy(r, tag, {
        "name": sc.get("name"), "disclosure": sc.get("disclosure"),
        "items": items, "storewide": storewide,
    })


def _validate_governed_promotions(r, promos, scenarios, active, canonical_hosts):
    """Top-level rules + activation coupling, applied when any governed
    (current-event / illustrative-demo) scenario is present."""
    governed = {sid: sc for sid, sc in scenarios.items()
                if isinstance(sc, dict) and sc.get("kind") in GOVERNED_SCENARIO_KINDS}
    if not governed:
        return

    sv = promos.get("schemaVersion")
    if type(sv) is not int or sv != PROMO_SCHEMA_VERSION:
        r.add_error(f"promotions.schemaVersion must be the integer "
                    f"{PROMO_SCHEMA_VERSION} when governed scenarios are present "
                    f"(got {sv!r})")

    if active is not None and not isinstance(active, str):
        r.add_error(f"promotions.activeScenario must be null or a scenario id "
                    f"string (got {active!r})")

    shipped = promos.get("allowedSourceHosts")
    if not isinstance(shipped, list) or not shipped:
        r.add_error("promotions.allowedSourceHosts must be a nonempty array of "
                    "normalized host strings when governed scenarios are present")
        shipped = []
    else:
        for h in shipped:
            err = _normalized_host_entry_error(h)
            if err:
                r.add_error(f"promotions.allowedSourceHosts entry {h!r}: {err}")
        valid_shipped = [h for h in shipped
                         if isinstance(h, str) and not _normalized_host_entry_error(h)]
        if not canonical_hosts:
            r.add_error("promotions.allowedSourceHosts: no canonical promotion "
                        "source-host allowlist is configured "
                        "(tools/source_hosts.json) — failing closed")
        else:
            for h in valid_shipped:
                if not _host_covered(h, canonical_hosts):
                    r.add_error(f"promotions.allowedSourceHosts entry {h!r} "
                                f"widens the canonical allowlist "
                                f"(tools/source_hosts.json promotionSourceHosts)")

    # Activation coupling — current-event only. An enabled scenario must be the
    # selected activeScenario and vice versa, so partial activation is
    # unrepresentable and at most one current-event scenario is operational.
    ce = {sid: sc for sid, sc in governed.items()
          if sc.get("kind") == "current-event"}
    for sid, sc in ce.items():
        if sc.get("enabledByOwner") is True and active != sid:
            r.add_error(f"promotions[{sid}]: enabledByOwner is true but "
                        f"activeScenario is {active!r} — an enabled current-event "
                        f"scenario must be the selected activeScenario")
    if isinstance(active, str) and active in ce:
        if ce[active].get("enabledByOwner") is not True:
            r.add_error(f"promotions.activeScenario selects current-event "
                        f"scenario {active!r} whose enabledByOwner is not true")

    # Evidence-when-operational: enabled OR selected requires the full record.
    for sid, sc in ce.items():
        operational = sc.get("enabledByOwner") is True or active == sid
        if not operational:
            continue
        tag = f"promotions[{sid}]"
        auth = sc.get("authority") if isinstance(sc.get("authority"), dict) else {}
        if _blank(auth.get("owner")):
            r.add_error(f"{tag}: an operational current-event scenario requires a "
                        f"nonblank authority.owner")
        if _blank(auth.get("role")):
            r.add_error(f"{tag}: an operational current-event scenario requires a "
                        f"nonblank authority.role")
        va = _s(sc.get("verifiedAt"))
        mad = sc.get("maxAgeDays")
        if not va or not _valid_ends_at(va):
            r.add_error(f"{tag}: an operational current-event scenario requires a "
                        f"valid offset-bearing verifiedAt")
        elif _materially_future(va):
            r.add_error(f"{tag}: verifiedAt {va!r} is materially in the future")
        elif type(mad) is not int:
            r.add_error(f"{tag}: an operational current-event scenario requires "
                        f"an integer maxAgeDays")
        elif _verified_age_exceeds(va, mad):
            r.add_error(f"{tag}: verifiedAt {va!r} is older than maxAgeDays "
                        f"({mad}) — re-verify before activation")
        src = _s(sc.get("sourceUrl"))
        if not src:
            r.add_error(f"{tag}: an operational current-event scenario requires a "
                        f"sourceUrl")
        else:
            if not _is_allowed_source(src, canonical_hosts):
                r.add_error(f"{tag}: sourceUrl {src!r} is not allowed by the "
                            f"canonical promotion source-host allowlist")
            shipped_hosts = [h for h in (promos.get("allowedSourceHosts") or [])
                             if isinstance(h, str)]
            if not _is_allowed_source(src, shipped_hosts):
                r.add_error(f"{tag}: sourceUrl {src!r} is not allowed by the "
                            f"shipped promotions.allowedSourceHosts — build and "
                            f"runtime allowlists must agree")
        if sc.get("esReviewStatus") != PROMO_ES_REVIEW_APPROVED:
            r.add_error(f"{tag}: an operational current-event scenario requires "
                        f"esReviewStatus {PROMO_ES_REVIEW_APPROVED!r} — the "
                        f"whole-campaign bilingual review gate (the event never "
                        f"renders in EN while hidden in ES)")


# -- Financing validation (Lacks Payment Choice) -------------------------------

FINANCING_PLAN_KINDS = {
    "open-end-promotional-credit",   # e.g. Synchrony HOME card promos (Reg Z open-end)
    "closed-end-installment",        # e.g. Lacks In-House / Mexico contracts
    "lease-to-own",                  # not credit — never describe as financing terms
    "credit-builder",                # Build My Credit — availability only
    "informational",
}
SAVINGS_PASS_POLICIES = {"alternative", "stackable", "specialist_confirm"}

# ===== Financing experience + Spanish review status ==========================
# `experience` selects which financing runtime a deployment ships. Only one
# exists, and the app renders Payment Choice unconditionally, so an unknown
# value would silently promise a presentation nobody built. Validated when
# PRESENT rather than required: a retailer whose financing block predates the
# field must not be broken by a validator upgrade, and financing itself is
# never required globally.
FINANCING_EXPERIENCES = {"payment-choice"}

# The Spanish financing copy carries a review status. Both states are legal.
# 'pending-native-legal-review' is the SHIPPED state and must keep validating:
# it is an honest declaration that native/legal review has not happened yet, and
# turning it into an error would only pressure an editor to write the approved
# value before the review it names.
FINANCING_ES_REVIEW_STATUSES = {
    "pending-native-legal-review",
    "approved-native-legal-review",
}

# ===== Per-surface financing placement (item 1.5) ============================
# `financing.surfaces` config-DISABLES a duplicate financing placement without
# deleting it. Exactly two surfaces are addressable, because exactly two exist
# as duplicates of content the Results module and the handoff already carry.
#
# An unknown key is an ERROR, not a no-op: `{"drawer": false, "sleepsystem":
# false}` would read as a policy that turns two surfaces off while turning one
# off, and the runtime's `surfaces[name] !== false` test cannot tell the
# difference. So can a typo like "sleepSystems". Fail the build instead.
#
# Values must be JSON booleans. The runtime gate is `!== false`, so a string
# "false" would read as ENABLED while looking disabled to a human — the same
# class of trap exactPromotionsEnabled guards against.
#
# A MISSING key means ENABLED, and that is a contract, not an accident: another
# retailer's financing block that predates this field must keep both surfaces.
FINANCING_SURFACES = {"drawer", "sleepSystem"}

# ===== The D4 Payment Choice copy contract ===================================
# Keys the Payment Choice runtime reads by literal name and renders to a
# customer. FC() returns '' for a key that is not there, so a missing one is not
# an error anywhere at runtime — it is a BLANK button, a blank row label, or a
# silent live region. Requiring them here is what makes that impossible.
#
# Scoped to `enabled` ALONE, not to `experience`. The browser gates Payment
# Choice on financingEnabled() and nothing else — it never reads `experience` —
# so enabled financing renders these controls whether or not the field is
# declared, and the requirement has to follow what renders rather than what is
# declared. `experience` remains optional and enum-checked when present; a
# deployment predating it keeps validating, but does not thereby become exempt
# from the copy its customers will see.
#
# Full bilingual objects, both languages non-blank: every one of these is a
# customer-facing string on a bilingual kiosk, and a half-translated control is
# worse than an untranslated one because only some of the row changes language.
PAYMENT_CHOICE_REQUIRED_COPY = (
    # The nine strings adopted with D4.
    "paymentPreferenceLabel",
    "optionsExploredLabel",
    "reviewOption",
    "hideDetails",
    "considerOption",
    "currentlyConsidering",
    "clearPreference",
    "exploreConsequence",
    "preferenceNone",
    # The four governed keys renamed into the D4 vocabulary.
    "preferenceNotNow",
    "preferenceNotNowAnnounce",
    "preferenceClearedAnnounce",
    "sheetDone",
    # The email packet's ONLY financing body. D4 excludes payment state from
    # email entirely, so this neutral availability line is what every customer
    # receives in every state; without it the email's payment row renders empty.
    "emailBodyAvailable",
)

# Superseded by D4. Each of these either names the retired salesperson-marked
# discussion agenda, or is the state-specific email body whose whole purpose was
# to tell an explorer from a non-explorer — which the model no longer permits.
# Present in a payment-choice config, they are dead weight at best and a
# resurrection hazard at worst: a renderer could be pointed back at one without
# any other file changing.
PAYMENT_CHOICE_RETIRED_COPY = {
    "agendaPrompt": "the agenda prompt (no options are 'marked' any more)",
    "agendaMark": "the agenda mark control (replaced by Consider)",
    "agendaMarked": "the agenda marked state (replaced by the considering marker)",
    "agendaEmpty": "the empty-agenda line (replaced by preferenceNone)",
    "agendaConsequence": "the agenda consequence line (replaced by exploreConsequence)",
    "agendaChange": "the change-agenda control (the handoff has one governed cta)",
    "agendaDismissed": "the dismissed-agenda line (not_now now suppresses a row)",
    "resultsAsk": "the duplicate Results agenda CTA (Results keeps one cta)",
    "drawerMark": "the drawer agenda CTA (the drawer keeps one cta)",
    "emailBody": "the state-specific email body (D4 excludes payment state from email)",
}


def _fin_path_encode(value):
    """Mirror of finPathEncode() in index.html: every character outside
    [A-Za-z0-9-] becomes '_' plus its UTF-8 bytes in lowercase hex.

    Injective, and therefore collision-free — which is the entire point. The
    previous runtime slugifier lower-cased and collapsed unsupported runs, so
    "Synchrony Bank"/"Synchrony-Bank", "Synchrony"/"SYNCHRONY" and a provider
    literally named "General"/a promotional group with no provider all shared
    one identity.

    Returns None — never raises — for a value with no canonical identity:

      * a NON-STRING. Identity values are strings; a dict, list, number or
        boolean has no canonical path id. This previously str()-serialised them,
        so `{"toString": None}` became the id `plan-_7b_27toString_27...` here
        while the JS runtime THREW on the same input — the two mirrors
        disagreed on exactly the value that broke the browser. The specific
        "id must be a string" error is raised separately by validate_financing
        and is what an author actually needs to read.
      * a string holding an UNPAIRED SURROGATE, on which `.encode("utf-8")`
        raises UnicodeEncodeError. That was uncaught, and it broke this module's
        own stated contract ("TOTAL over JSON … It never raises … Malformed
        author input is a VERDICT, not a crash"): validate_financing produced a
        traceback instead of a report, so the build could not refuse the one
        config shape that also breaks the runtime encoder.

    None/absent maps to the empty encoding rather than the sentinel, mirroring
    the runtime: a promotional group with no provider is identified by the empty
    string and keeps a usable id."""
    if value is None:
        return ""
    if not isinstance(value, str):
        return None
    out = []
    for ch in value:
        if ch.isascii() and (ch.isalnum() or ch == "-") and not ch.isspace():
            out.append(ch)
        else:
            try:
                out.extend("_%02x" % b for b in ch.encode("utf-8"))
            except UnicodeEncodeError:
                return None
    return "".join(out)


def _fin_path_id(kind: str, value):
    """Mirror of finPathId(). KIND contains no '-', so splitting on the first
    '-' recovers it unambiguously.

    Returns None when the value cannot be encoded, propagating the encoder's
    refusal rather than raising, AND when an empty encoding is not a legitimate
    identity for that kind.

    An empty encoding identifies exactly one real path: the promotional group
    whose provider is missing or blank, which renders as the generic
    "Promotional financing" card. A plan or scenario identity is required to be
    present and non-blank, so an empty one means the config bypassed that gate —
    and admitting it yields a TRUTHY id ("plan-") that the runtime would treat
    as a selectable path. Mirrors finPathId() in index.html."""
    enc = _fin_path_encode(value)
    if enc is None:
        return None
    if enc == "" and kind != "promo":
        return None
    return kind + "-" + enc

# -- Exact-claim detection for UNGATED financing copy --------------------------
# financing.exactPromotionsEnabled and financingTermsFresh()/financingPlanFresh()
# gate the exact OFFER BODIES, but a large amount of financing text renders
# outside those gates in every operating state: all of financing.copy, the
# promotional card's provider name, and the non-promotional plans' headlines and
# disclosures. Nothing stopped an editor from putting an APR, term, minimum, or
# payment example into one of those strings, which would put an unverified,
# never-freshness-checked exact claim in front of a customer while the policy
# switch reads "off".
#
# WHAT THIS ACTUALLY ENFORCES — and what it does not.
# This is a lexical deny-list over an enumerated vocabulary of value, unit,
# count, cadence, down-payment and deferral markers, plus one structural rule
# for the payment noun (below). It raises the cost of shipping an exact claim
# in an ungated field and catches every construction we have adversarially
# tested, but it CANNOT prove the absence of an exact claim in arbitrary prose:
# a paraphrase that avoids the whole marker vocabulary still passes. Known
# survivors from the adversarial set include "Take it home now and settle up
# later", "Split the cost over time", "Zero upfront" and "Nada por adelantado".
# Treat this as a high-confidence filter and a forcing function for review, not
# as a proof. Human copy review (Gate B/C) remains the authority.
#
# Posture: CONSERVATIVE and MARKER-oriented. Some markers are rejected with no
# numeric value attached at all — `duration-unit` rejects a bare "month(s)",
# "meses", "week", "year"; `proportion` rejects a bare "half"/"mitad" — because
# "twelve months" and "half at pickup" state exact terms without a digit and no
# numeral list can be relied on to catch them. That bias is intentional: it
# sends borderline wording to review rather than letting it ship. It does NOT
# mean the copy contained an exact claim, only that it used a marker reserved
# for gated fields. Generic vocabulary the approved copy relies on — "rates",
# "terms", "plazos", "payment options", "opciones de pago" — carries no marker
# and passes. Each signal is separately named so an error tells the editor
# exactly what tripped and whether it is a real claim or a rewording job.
#
# Three false-positive traps the shipped copy proves are real:
#   * "apr" is a substring of "aprobacion"/"aprobados"  -> \bAPR\b is word-bounded
#   * "interes" is a substring of "interested"/"me interesa" -> only explicit
#     zero-interest constructions match, never the bare stem
#   * "payment"/"pago" appears in 28 approved ungated strings ("payment options",
#     "Payment Choices", "opciones de pago", "forma de pago") -> the payment noun
#     is handled structurally, not by a plain ban (see _bare_payment_noun)
_EXACT_CLAIM_SIGNALS = (
    ("numeral", re.compile(r"\d")),
    ("percent", re.compile(r"%")),
    ("currency", re.compile(r"[$€£]|\bUSD\b|\bMXN\b", re.I)),
    ("apr", re.compile(r"\bAPR\b", re.I)),
    ("zero-interest", re.compile(
        r"\bno interest\b|\binterest[-\s]free\b|\bzero interest\b|\bdeferred interest\b"
        r"|\bsin\s+inter[eé]s(?:es)?\b|\bcero\s+inter[eé]s(?:es)?\b", re.I)),
    ("payment-cadence", re.compile(
        r"\bper month\b|\ba month\b|\bmonthly payments?\b|\bequal payments?\b"
        r"|\bal mes\b|\bpor mes\b|\bpagos?\s+mensual(?:es)?\b|\bmensualidades\b", re.I)),
    # UNIT signals. An exact claim does not need digits — "twelve months",
    # "doce meses", "nine percent" and "fifty dollars" are exact terms written
    # with number words. Banning the UNIT catches those without enumerating
    # every English and Spanish numeral (an enumeration would be endless and
    # would still miss "a dozen"). Ungated copy may still discuss generic
    # "rates", "terms", "plazos", "payment options" and "opciones de pago" —
    # none of those is a unit.
    ("duration-unit", re.compile(
        r"\bmonths?\b|\bmonthly\b|\bweeks?\b|\bweekly\b|\byears?\b|\byearly\b|\bannual(?:ly)?\b"
        r"|\bmes\b|\bmeses\b|\bmensual(?:es|mente)?\b|\bsemanas?\b|\bsemanal(?:es)?\b"
        r"|\ba[ñn]os?\b|\banual(?:es|mente)?\b", re.I)),
    ("percent-word", re.compile(r"\bpercent(?:age)?\b|\bpor\s+ciento\b|\bporcentaje\b", re.I)),
    ("currency-unit", re.compile(r"\bdollars?\b|\bd[oó]lar(?:es)?\b|\bpesos?\b|\beuros?\b", re.I)),
    ("installment-count", re.compile(
        r"\binstallments?\b|\bmensualidades?\b|\bcuotas?\b|\babonos?\b", re.I)),
    # Repetition counts ("Pay twelve times" / "Paga doce veces"). Neither word
    # appears in any approved ungated string.
    ("repetition-count", re.compile(r"\btimes\b|\bveces\b", re.I)),
    # Down payment / minimum-at-purchase claims.
    ("down-payment", re.compile(
        r"\b(?:no|nothing|zero)\s+(?:money\s+)?down\b|\bmoney\s+down\b"
        r"|\bdown\s+payment\b|\benganche\b|\bpago\s+inicial\b", re.I)),
    # Deferral / "pay later" claims — time-sensitive by nature.
    ("deferral", re.compile(
        r"\bdefer(?:red|ral|s|ring)?\b|\bpay\s+later\b|\bno\s+payments?\s+until\b"
        r"|\bsin\s+pagos?\s+hasta\b|\bpag(?:a|ue|ar)\s+(?:despu[eé]s|luego|m[aá]s\s+tarde)\b",
        re.I)),
    # Proportional split ("Half now and half at pickup"). Heuristic, but neither
    # word appears in approved ungated copy and a fraction of the price in an
    # ungated field is a payment example.
    ("proportion", re.compile(r"\bhalf\b|\bmitad\b", re.I)),
)

# The payment noun needs a STRUCTURAL rule, not a ban: "payment"/"pago" occurs
# in 28 approved ungated strings, always inside a neutral collocation naming the
# CONCEPT ("payment options", "Payment Choices", "payment method", "opciones de
# pago", "forma de pago").
#
# The contract is DEFAULT-DENY against a REVIEWED ALLOWLIST: the collocations
# below are the wordings that have been reviewed and cleared for ungated
# surfaces. A payment noun that survives their removal is rejected because it
# falls OUTSIDE that allowlist and therefore needs review — NOT because the
# prose has been shown to contain an exact claim. Benign-but-unreviewed
# phrasings are rejected too, by design: "Payment information is available in
# store.", "Ask your specialist about payment." and "Choose a payment program."
# all fail, and they are false positives in the semantic sense. The remedy is to
# reword to an allowlisted collocation, or to review the phrase and add it here.
#
# This is why banning "installments"/"cuotas" alone did not close the
# payment-count class: ordinary "payments"/"pagos" carries it just as well.
#
# 2026-08-17 (Slice 4 / D4, owner-adopted copy). One collocation added, exactly
# as narrow as the ones above: "payment preference" / "preferencia de pago".
# The D4 handoff row is labelled with that phrase by owner ruling and the phrase
# is not to be reworded, so the guard had to learn it rather than the copy learn
# the guard. It names the CONCEPT ("which way of paying is being considered")
# in the same manner as "payment options" and states nothing about an amount, a
# rate, a term or a count.
#
# It is deliberately not generalised. `preference` alone is not allowed to
# neutralise a payment noun in any other position, so every near-miss still
# fails: "preferencia del pago" (a different collocation), "Payment-preference"
# (not the reviewed two-word phrase), "Preferencia de pago mensual" (which
# additionally trips payment-cadence and duration-unit), and any wording that
# leaves a second, uncollocated payment noun behind.
_NEUTRAL_PAYMENT_PHRASES = re.compile(
    r"\bpayment\s+(?:options?|choices?|methods?|preferences?)\b"
    r"|\b(?:opciones?|formas?|m[eé]todos?|maneras?|preferencias?)\s+de\s+pago\b", re.I)
_PAYMENT_NOUN = re.compile(r"\bpayments?\b|\bpagos?\b", re.I)


def _bare_payment_noun(text: str) -> bool:
    """True when a payment noun survives removal of the reviewed neutral
    collocations — i.e. the wording falls outside the cleared allowlist and
    needs review. True does NOT establish that the text states an actual
    payment; benign phrasings outside the allowlist are rejected by design."""
    return bool(_PAYMENT_NOUN.search(_NEUTRAL_PAYMENT_PHRASES.sub(" ", text or "")))

# ===== Financing presentation taxonomy (mirrors index.html) ==================
# Every plan maps to exactly ONE presentation group, decided by `kind` and the
# explicit `presentationScenario` field and NOTHING else — never by plan id,
# array position, language, provider, headline text, source URL, or the
# presence of exact terms. A retailer may rename every plan id without changing
# which card a plan lands in. index.html carries the identical partition in
# finPlanGroup(); the taxonomy test pins the two in step.
#
# A plan that matches NO group is a validation error, never a silent drop: that
# is what stops a newly-allowed kind from vanishing from the sheet.
FINANCING_SCENARIOS = {"mexico-delivery"}

# Scenario -> the financing kind its product semantics require.
FINANCING_SCENARIO_KINDS = {"mexico-delivery": "closed-end-installment"}

# Scenarios the renderer can present only once (it renders a single card).
FINANCING_SINGLETON_SCENARIOS = {"mexico-delivery"}

FINANCING_EVERGREEN_KINDS = {"lease-to-own", "credit-builder", "informational"}

# Fields each group renders OUTSIDE its freshness gate (Commit F's guard):
#   promotional   -> headline/detail/disclosure all sit inside the gate
#   installment   -> title + disclosure ungated; `detail` gated
#   evergreen     -> availability-only card, never freshness-gated
#   scenario      -> title + disclosure ungated; detail/example gated
_GROUP_UNGATED_FIELDS = {
    "promotional": (),
    "installment": ("headline", "disclosure"),
    "evergreen": ("headline", "detail", "disclosure"),
    "scenario": ("headline", "disclosure"),
}


def _plan_scenario(plan) -> str:
    """TOTAL over any JSON value: a non-object plan, or a non-string scenario,
    reads as no declared scenario. The malformed value is reported separately
    by validate_financing; classification must not raise on it."""
    if not isinstance(plan, dict):
        return ""
    v = plan.get("presentationScenario")
    return v if isinstance(v, str) else ""


def _plan_group(plan) -> str:
    """'promotional' | 'installment' | 'evergreen' | 'scenario' | '' (no match).

    TOTAL over any JSON value. `kind` is screened with isinstance(str) BEFORE
    the set-membership tests below, because `x in <set>` HASHES x and a JSON
    array or object as `kind` therefore raised TypeError — a malformed kind now
    yields the unclassified '' that validate_financing reports as an error.
    Classification of valid plans is unchanged: a non-string kind was already
    unclassified whenever it happened to be hashable."""
    if not isinstance(plan, dict):
        return ""
    scenario = _plan_scenario(plan)
    if scenario:
        return "scenario" if scenario in FINANCING_SCENARIOS else ""
    kind = plan.get("kind")
    if not isinstance(kind, str):
        return ""
    if kind == "open-end-promotional-credit":
        return "promotional"
    if kind == "closed-end-installment":
        return "installment"
    if kind in FINANCING_EVERGREEN_KINDS:
        return "evergreen"
    return ""


def _exact_claim_signals(text) -> list:
    """Names of exact-claim signals present in text ([] when clean). See the
    block comment above for what this does and does not prove."""
    s = "" if text is None else _safe_str(text)
    names = [name for name, rx in _EXACT_CLAIM_SIGNALS if rx.search(s)]
    if _bare_payment_noun(s):
        names.append("payment-noun")
    return names


def _is_gated_offer_plan(plan) -> bool:
    """True for plans whose headline/detail/disclosure render ONLY inside the
    exact-terms gate — i.e. the promotional group. Classification is semantic
    (kind + presentationScenario); a plan id has no effect on it."""
    return _plan_group(plan) == "promotional"


def _ungated_plan_fields(plan) -> tuple:
    """Plan fields that reach a customer OUTSIDE the exact-terms gate, derived
    from the plan's presentation group (see _plan_group) so that renaming a
    plan id cannot move wording out of Commit F's guard.

      * provider  — always: the promotional card title renders it even on the
                    stale/fail-closed path.
      * headline / disclosure — every non-promotional group: the installment
                    and scenario card titles, the evergreen entries and the
                    handoff chips render them ungated, and a disclosure keeps
                    rendering after its adjacent exact detail has been swapped
                    for staleNotice.
      * detail    — evergreen only: the "More paths" card is availability-only
                    and is never freshness-gated.

    Promotional detail/disclosure and the scenario card's detail /
    representativeExample are NOT listed: those render only inside the gate and
    keep their existing exact validation. An unclassified plan is treated as
    fully ungated (maximally protective) — validation errors on it separately."""
    group = _plan_group(plan)
    return ("provider",) + _GROUP_UNGATED_FIELDS.get(
        group, ("headline", "detail", "disclosure"))



def _check_ungated_text(r, label: str, value) -> None:
    """Error when an ungated financing string trips a guarded signal. A hit is
    one of TWO things, and the error must not conflate them:

      1. a likely exact/time-sensitive financing marker — a rate, a duration or
         currency unit, a payment cadence, a count, a down payment, a deferral;
      2. a payment-noun phrase outside the reviewed neutral allowlist, which is
         rejected by default-deny even when the prose is benign.

    So a hit means the wording is reserved for gated fields or has not been
    reviewed for ungated use. It does NOT by itself prove the text states an
    exact claim. Accepts a bilingual dict or a plain string."""
    items = []
    if isinstance(value, dict):
        items = [(f"{label}.{lang}", value.get(lang)) for lang in ("en", "es")]
    elif isinstance(value, str):
        items = [(label, value)]
    for tag, text in items:
        if _blank(text):
            continue
        hit = _exact_claim_signals(text)
        if hit:
            r.add_error(
                f"{tag} renders outside the exact-terms gate and uses reserved or "
                f"unreviewed financing language ({', '.join(hit)}): "
                f"{fin_headline.short_repr(text, 80)}. Either reword it using reviewed generic "
                f"orientation language, or move genuine verified terms into a "
                f"freshness-gated plan field. A signal marks wording reserved for "
                f"gated fields or outside the reviewed neutral allowlist — it does "
                f"not by itself establish that this text states an exact claim.")


def _valid_iso_instant(s: str) -> bool:
    """ISO-8601 datetime with explicit timezone offset (absolute instant)."""
    from datetime import datetime
    try:
        d = datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return False
    return d.tzinfo is not None


# verifiedAt is an OBSERVATION timestamp, so a materially future instant can
# only be a typo (e.g. year 2062) or clock error — and a future date would
# otherwise defeat the max-age freshness rule for decades (age goes negative).
# A small skew tolerance covers legitimate clock drift between the verifying
# machine and this one. Mirrors FINANCING_CLOCK_SKEW_MS in index.html.
FINANCING_CLOCK_SKEW_SECONDS = 5 * 60  # 5 minutes, deliberate


def _materially_future(s: str) -> bool:
    """True when s parses to a timezone-aware instant more than the allowed
    clock skew ahead of now. Comparison is instant-based, never string-based."""
    from datetime import datetime, timezone, timedelta
    try:
        d = datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return False  # unparseable is reported by _valid_iso_instant instead
    if d.tzinfo is None:
        return False
    return d > datetime.now(timezone.utc) + timedelta(seconds=FINANCING_CLOCK_SKEW_SECONDS)


def _bilingual_ok(obj) -> bool:
    """A bilingual leaf is an object carrying non-blank EN and ES TEXT.

    The language values must be real strings. They were previously coerced
    through _s(), so a JSON number, boolean, array or object passed the check
    and then reached the customer through L() as '7' or '[object Object]' —
    customer-visible copy silently invented from a malformed field."""
    if not isinstance(obj, dict):
        return False
    return all(isinstance(obj.get(lang), str) and obj[lang].strip()
               for lang in ("en", "es"))


def validate_financing(config: dict, *, allowed_source_hosts=None) -> ValidationReport:
    """Validate the optional financing block (V1 'payment choice' rules).

    Fail-closed posture: exact credit claims (APR / term / minimum) must be
    verified, timestamped, freshness-bounded, disclosure-carrying, and sourced
    from an explicitly allowlisted host. Payment calculation must be disabled
    in V1. No-op when there is no financing block.

    TOTAL over JSON: for any value python's json.loads can produce — at the top
    level or anywhere inside the financing subtree — this returns a
    ValidationReport with bounded, named errors. It never raises and never
    mutates its argument. Malformed author input is a VERDICT, not a crash:
    the converter has to be able to refuse a bad workbook and say why, and a
    traceback is neither a refusal an operator can act on nor something the
    build can distinguish from a validator defect. Every structure is therefore
    type-guarded at the point it is consumed rather than rescued by `x or {}`,
    which only covers FALSY wrong types and leaves every truthy one to crash."""
    r = ValidationReport()
    if not isinstance(config, dict):
        r.add_error(f"config must be an object, got "
                    f"{_type_name(config)} ({fin_headline.short_repr(config)})")
        return r
    fin = config.get("financing")
    if fin is None:
        return r
    if not isinstance(fin, dict):
        r.add_error(f"financing must be an object, got {_type_name(fin)} "
                    f"({fin_headline.short_repr(fin)})")
        return r
    # The allowlist argument is JSON too — load_source_hosts() reads it from
    # the editable tools/source_hosts.json — so it gets the same treatment as
    # the config: guarded, reported, and failing CLOSED. `list(x or [])` raised
    # TypeError on a number or boolean, and a list carrying a non-string entry
    # raised AttributeError downstream in _is_allowed_source.
    if allowed_source_hosts is None:
        hosts = []
    elif isinstance(allowed_source_hosts, (list, tuple, set, frozenset)):
        entries = list(allowed_source_hosts)
        hosts = [h for h in entries if isinstance(h, str)]
        if len(hosts) != len(entries):
            r.add_error(f"allowed_source_hosts contains "
                        f"{len(entries) - len(hosts)} non-string entr"
                        f"{'y' if len(entries) - len(hosts) == 1 else 'ies'} — "
                        f"see tools/source_hosts.json financingSourceHosts; "
                        f"they are ignored, so those hosts allow nothing")
    else:
        r.add_error(f"allowed_source_hosts must be a list of host strings, got "
                    f"{_type_name(allowed_source_hosts)} "
                    f"({fin_headline.short_repr(allowed_source_hosts)}) — "
                    f"treating the allowlist as empty, which allows no host")
        hosts = []
    enabled = fin.get("enabled") is True

    # Experience + Spanish review status. Both are validated WHENEVER PRESENT,
    # enabled or not: a malformed value is wrong either way, and a config that
    # is switched on later should not discover it then. Neither is required —
    # financing is optional per deployment, and a financing block that predates
    # these fields must keep validating.
    _exp = fin.get("experience")
    if _exp is not None and (not isinstance(_exp, str)
                             or _exp not in FINANCING_EXPERIENCES):
        r.add_error(
            f"financing.experience {fin_headline.short_repr(_exp)} must be one of "
            f"{sorted(FINANCING_EXPERIENCES)} — an unknown value names a "
            f"presentation the app does not implement, and the runtime would "
            f"render Payment Choice regardless")
    _esr = fin.get("esReviewStatus")
    if _esr is not None and (not isinstance(_esr, str)
                             or _esr not in FINANCING_ES_REVIEW_STATUSES):
        r.add_error(
            f"financing.esReviewStatus {fin_headline.short_repr(_esr)} must be one of "
            f"{sorted(FINANCING_ES_REVIEW_STATUSES)} — 'pending-native-legal-review' "
            f"is a legal shipped state and is deliberately not an error")

    # Optional per-surface placement policy. Absent = every surface enabled.
    _surfaces = fin.get("surfaces")
    if _surfaces is not None:
        if not isinstance(_surfaces, dict):
            r.add_error(
                f"financing.surfaces must be an object mapping surface names to "
                f"booleans, got {_type_name(_surfaces)} "
                f"({fin_headline.short_repr(_surfaces)}) — a missing surfaces block "
                f"already means every surface is enabled, so there is no reason "
                f"to write anything else here")
        else:
            for _sk in sorted(_surfaces):
                if _sk not in FINANCING_SURFACES:
                    r.add_error(
                        f"financing.surfaces.{_sk} is not an addressable surface "
                        f"(expected one of {sorted(FINANCING_SURFACES)}) — the "
                        f"runtime reads surfaces[name] !== false, so an unknown or "
                        f"misspelled key silently disables nothing while reading "
                        f"like a policy that does")
                elif not isinstance(_surfaces[_sk], bool):
                    r.add_error(
                        f"financing.surfaces.{_sk} "
                        f"{fin_headline.short_repr(_surfaces[_sk])} must be a JSON "
                        f"boolean — the runtime gate is `!== false`, so a string "
                        f"\"false\" reads as ENABLED while looking disabled to a "
                        f"human")

    # `plans` is iterated in FOUR places. Normalise it ONCE, here, so no loop
    # can iterate a non-list: `for x in (fin.get("plans") or [])` walked the
    # CHARACTERS of plans="bad" and raised on a plain int. A malformed value is
    # reported once and then treated as an empty list, so every later rule
    # still runs and the operator gets the whole verdict in one pass instead of
    # one error per attempt. The shipped list is used as-is, never copied back:
    # this function must not mutate its argument.
    plans_raw = fin.get("plans")
    if plans_raw is None:
        plan_list = []
    elif isinstance(plans_raw, list):
        plan_list = plans_raw
    else:
        r.add_error(f"financing.plans must be an array of plan objects, got "
                    f"{_type_name(plans_raw)} "
                    f"({fin_headline.short_repr(plans_raw)})")
        plan_list = []

    def _plan_tag(plan, index):
        """Bounded diagnostic label. Falls back to the array INDEX when the id
        is absent or is not usable text, so a 5,000-digit integer id cannot
        blow up (or become) the error message."""
        pid = plan.get("id") if isinstance(plan, dict) else None
        if isinstance(pid, str) and pid.strip():
            return f"financing.plans[{fin_headline.short_repr(pid)}]"
        return f"financing.plans[{index}]"

    if enabled:
        for key in ("verifiedAt", "maxAgeDays", "sourceUrl"):
            if _blank(fin.get(key)):
                r.add_error(f"financing.{key} is required when financing is enabled")
        if fin.get("verifiedAt") and not _valid_iso_instant(fin["verifiedAt"]):
            r.add_error(f"financing.verifiedAt {fin_headline.short_repr(fin.get('verifiedAt'))} must be ISO-8601 "
                        f"with a timezone offset")
        if fin.get("verifiedAt") and _materially_future(fin["verifiedAt"]):
            r.add_error(f"financing.verifiedAt {fin_headline.short_repr(fin.get('verifiedAt'))} is materially in "
                        f"the future (beyond {FINANCING_CLOCK_SKEW_SECONDS}s clock skew) — "
                        f"verification is an observation and cannot postdate now")
        mad = fin.get("maxAgeDays")
        # `type(mad) is int`, not isinstance: bool is an int subclass, so
        # maxAgeDays=true read as 1 and passed the 1..60 range silently.
        if mad is not None and (type(mad) is not int or not 1 <= mad <= 60):
            r.add_error(f"financing.maxAgeDays {fin_headline.short_repr(mad)} must be "
                        f"an integer between 1 and 60 (not a boolean)")
        if fin.get("sourceUrl") and not _is_allowed_source(fin["sourceUrl"], hosts):
            r.add_error(f"financing.sourceUrl {fin_headline.short_repr(fin.get('sourceUrl'))} must be a safe https "
                        f"URL on an allowlisted host (no credentials, default port) — "
                        f"see tools/source_hosts.json financingSourceHosts")
        # `fin.get("copy") or {}` was NOT a type guard: it rescues only falsy
        # wrong types, so copy="bad" reached copy.get() and raised.
        copy = fin.get("copy")
        if copy is None:
            copy = {}
        elif not isinstance(copy, dict):
            r.add_error(f"financing.copy must be an object, got {_type_name(copy)} "
                        f"({fin_headline.short_repr(copy)})")
            copy = {}
        for key in ("eyebrow", "headline"):
            if not _bilingual_ok(copy.get(key)):
                r.add_error(f"financing.copy.{key} missing EN or ES")
        # Every copy value is customer-visible text rendered through L(): a
        # bilingual object, or a plain string for single-language copy. A
        # number, boolean, array or foreign object is neither, and used to pass
        # unexamined — L() would render '7' or '[object Object]' to a shopper.
        for key in sorted(copy) if isinstance(copy, dict) else []:
            val = copy.get(key)
            if isinstance(val, str) or _bilingual_ok(val):
                continue
            r.add_error(
                f"financing.copy.{key} must be a bilingual object with EN and ES "
                f"text (or a plain string), got {_type_name(val)} "
                f"({fin_headline.short_repr(val)}) — it renders to the customer "
                f"exactly as stored")
        # EVERY financing.copy string renders outside the exact-terms gate —
        # results, drawer, sheet chrome, handoff, the live-region announcements
        # and the email body all render whatever the policy switch says. Checking
        # the whole block (rather than a listed subset) means a copy key added
        # later is protected by default.
        if isinstance(copy, dict):
            for key in sorted(copy):
                _check_ungated_text(r, f"financing.copy.{key}", copy.get(key))
        if copy.get("emailBody") and not copy.get("emailBodyAvailable"):
            r.add_warning(
                "financing.copy.emailBody present without emailBodyAvailable — "
                "the email packet row will use 'explored' wording even for "
                "customers who never opened Payment Choice content (COPY-15); "
                "add the neutral availability variant")
        # ---- the D4 Payment Choice copy contract --------------------------
        # REQUIRED copy is scoped to `enabled` (the enclosing branch) and NOT
        # to `experience`, because `experience` selects nothing at runtime.
        # index.html never reads it — the only gate the browser applies is
        # financingEnabled(), i.e. `enabled === true` plus a non-empty plans
        # array — so an enabled deployment whose financing block predates the
        # field still renders every Payment Choice control and still reads
        # these keys by literal name. Requiring them only when the field
        # happens to be declared made the validator green for a configuration
        # that ships blank buttons, blank row labels and silent live regions,
        # which is the exact outcome this contract exists to prevent. The
        # field stays OPTIONAL for backward compatibility and is enum-checked
        # when present; what it must never do is buy an exemption from the
        # requirements of UI the runtime renders anyway.
        if _exp is None or _exp == "payment-choice":
            _for_exp = ("for experience='payment-choice'" if _exp
                        else "for enabled financing (no `experience` declared, "
                             "which the runtime ignores)")
            for key in PAYMENT_CHOICE_REQUIRED_COPY:
                if key not in copy:
                    r.add_error(
                        f"financing.copy.{key} is required {_for_exp} — the "
                        f"Payment Choice runtime "
                        f"reads it by name and FC() renders '' for a missing key, so "
                        f"its absence is a BLANK control or row rather than an error")
                elif not _bilingual_ok(copy.get(key)):
                    r.add_error(
                        f"financing.copy.{key} must be a bilingual object with "
                        f"non-blank EN and ES text {_for_exp} "
                        f"(got {fin_headline.short_repr(copy.get(key))}) — a "
                        f"half-translated control changes language only in part")
        # RETIRED copy is deliberately NARROWER, and the asymmetry is the same
        # principle read the other way: a retired key is rendered by nothing,
        # so its presence is inert rather than customer-visible. An agenda-era
        # block predating `experience` legitimately still carries `agendaMark`
        # and friends; erroring on those would break precisely the backward
        # compatibility the field was left optional to preserve, and would buy
        # a customer nothing. Retirement therefore needs an EXPLICIT
        # payment-choice declaration.
        if _exp == "payment-choice":
            for key, why in sorted(PAYMENT_CHOICE_RETIRED_COPY.items()):
                if key in copy:
                    r.add_error(
                        f"financing.copy.{key} is retired under "
                        f"experience='payment-choice': {why}. Nothing renders it, "
                        f"so shipping it leaves copy a renderer could be pointed "
                        f"back at without any other file changing — remove it from "
                        f"incoming/lacks_financing.json and rebuild")
        # isinstance(str) FIRST: `x not in <set>` hashes x, so a JSON array or
        # object here raised TypeError before the error could be reported.
        policy = fin.get("savingsPassPolicy")
        if not isinstance(policy, str) or policy not in SAVINGS_PASS_POLICIES:
            r.add_error(f"financing.savingsPassPolicy "
                        f"{fin_headline.short_repr(policy)} must be one of "
                        f"{sorted(SAVINGS_PASS_POLICIES)}")
        # Operational authorization for EXACT rate/term claims. Required and
        # explicitly boolean when financing is enabled: the retailer must
        # state the operating decision rather than leave it inferred, and the
        # client gate is strict === true, so a string "true" or a 1 here would
        # silently hide exact terms while reading as enabled to a human.
        # false is valid and is the expected initial state — it means "no
        # owner has accepted the re-verification obligation yet", NOT that the
        # verified facts are stale (those keep their full validation below).
        if "exactPromotionsEnabled" not in fin:
            r.add_error(
                "financing.exactPromotionsEnabled is required when financing is "
                "enabled — state the operating decision explicitly (false until a "
                "named owner accepts weekly re-verification and emergency takedown)")
        elif not isinstance(fin.get("exactPromotionsEnabled"), bool):
            r.add_error(
                f"financing.exactPromotionsEnabled "
                f"{fin_headline.short_repr(fin.get('exactPromotionsEnabled'))} must be a JSON boolean "
                f"(true/false), not a string or number — the client gate is a "
                f"strict identity test and anything else fails closed")
        # Same non-guard as copy: `(config.get("discount") or {})` rescues only
        # falsy wrong types. financing reads discount.mode to police the
        # savings-pass interaction, so it must guard the shape it reads and say
        # so under its own name rather than crash on another block's typo.
        discount = config.get("discount")
        if discount is None or discount == {}:
            discount = {}
        elif not isinstance(discount, dict):
            r.add_error(f"discount must be an object for financing to check the "
                        f"savings-pass interaction, got {_type_name(discount)} "
                        f"({fin_headline.short_repr(discount)})")
            discount = {}
        discount_mode = _s(discount.get("mode"))
        if discount_mode and discount_mode != "disabled" and policy != "stackable":
            r.add_error(
                f"financing is enabled while discount.mode={fin_headline.short_repr(discount_mode)}; either "
                f"set discount.mode='disabled' or declare an explicit stackable policy")
        # Operational staleness warning — ONLY when exact promotions are
        # explicitly operationally enabled (field lands in Commit E). An
        # intentionally disabled/absent policy must not nag about a
        # historical stamp aging out; malformed/future stamps keep their
        # existing errors above regardless of enablement.
        if (fin.get("exactPromotionsEnabled") is True
                and fin.get("verifiedAt") and _valid_iso_instant(fin["verifiedAt"])
                and not _materially_future(fin["verifiedAt"])
                and isinstance(mad, int) and 1 <= mad <= 60):
            from datetime import datetime, timezone, timedelta
            _ts = datetime.fromisoformat(fin["verifiedAt"])
            if datetime.now(timezone.utc) - _ts > timedelta(days=mad):
                r.add_warning(
                    f"financing.verifiedAt {fin_headline.short_repr(fin.get('verifiedAt'))} is older than "
                    f"maxAgeDays={mad} while exactPromotionsEnabled is true — the "
                    f"client will render the generic staleNotice; re-verify the "
                    f"source or disable exact promotions")

    # When financing is DISABLED the policy field is not required (a
    # backward-compatible disabled block need not carry it), but a present
    # value must still be a real boolean so it cannot rot into a string that
    # would read as authorization to a human reviewer.
    if not enabled and "exactPromotionsEnabled" in fin \
            and not isinstance(fin.get("exactPromotionsEnabled"), bool):
        r.add_error(f"financing.exactPromotionsEnabled "
                    f"{fin_headline.short_repr(fin.get('exactPromotionsEnabled'))} must be a JSON boolean")

    # Customer-reachable / future-risk URL fields: validated whenever present
    # (enabled or not) — every URL that could reach a customer must be a safe
    # https URL on an allowlisted host.
    for _key in ("applicationUrl", "mexicoInfoUrl"):
        _val = fin.get(_key)
        if _val is not None and not _blank(_val) and not _is_allowed_source(_val, hosts):
            r.add_error(f"financing.{_key} {fin_headline.short_repr(_val)} must be a safe https URL on an "
                        f"allowlisted host (no credentials, default port)")

    mxa = fin.get("mexicoApplicationUrl")
    if mxa is not None:
        if not isinstance(mxa, dict):
            r.add_error("financing.mexicoApplicationUrl must be an object")
        else:
            _mxu = mxa.get("url")
            if _mxu is not None and not _blank(_mxu) and not _is_allowed_source(_mxu, hosts):
                r.add_error(f"financing.mexicoApplicationUrl.url {fin_headline.short_repr(_mxu)} must be a safe "
                            f"https URL on an allowlisted host")
            _ver = mxa.get("verified")
            if _ver is not None and not isinstance(_ver, bool):
                r.add_error("financing.mexicoApplicationUrl.verified must be a boolean")
            # Anti-conflation: an unverified application URL must not be
            # reused as any customer-facing or evidence URL. An allowlisted
            # host does not make a dead URL available — verified:false means
            # exactly that. Identity is normalized (case, default port,
            # trailing slash, query/fragment) so variants of the dead path
            # still collide, while different paths on the same host do not.
            if mxa.get("verified") is not True and not _blank(mxa.get("url")):
                _dead = _url_identity(mxa.get("url"))
                if _dead:
                    _reuse = [("financing.sourceUrl", fin.get("sourceUrl")),
                              ("financing.applicationUrl", fin.get("applicationUrl")),
                              ("financing.mexicoInfoUrl", fin.get("mexicoInfoUrl"))]
                    for _i, _plan in enumerate(plan_list):
                        if isinstance(_plan, dict):
                            _reuse.append((f"{_plan_tag(_plan, _i)}.sourceUrl",
                                           _plan.get("sourceUrl")))
                    for _label, _val in _reuse:
                        if _val is not None and _url_identity(_val) == _dead:
                            r.add_error(
                                f"{_label} reuses the unverified mexicoApplicationUrl "
                                f"target {fin_headline.short_repr(mxa.get('url'))} — that URL is not verified "
                                f"available and must never become customer-visible")

    # financing.allowedSourceHosts is the BROWSER's allowlist. It must not
    # widen the build-time list (below), and — new — it must be SUFFICIENT:
    # every customer-reachable URL this validator accepts has to survive the
    # browser's own predicate too. Checking only for widening let an absent,
    # empty, padded or wrong-subset list pass the build while the runtime
    # refused every financing URL, hiding the links, the QR continuation, the
    # email URL and (via financingTermsFresh) the exact terms — with no error
    # anywhere. A build that ships a silently dead surface is worse than one
    # that refuses to build.
    declared = fin.get("allowedSourceHosts")
    if declared is not None:
        if not isinstance(declared, list):
            r.add_error(f"financing.allowedSourceHosts must be an array, got "
                        f"{_type_name(declared)} "
                        f"({fin_headline.short_repr(declared)})")
        else:
            for _hi, h in enumerate(declared):
                if not isinstance(h, str):
                    r.add_error(f"financing.allowedSourceHosts[{_hi}] must be a "
                                f"host string, got {_type_name(h)} "
                                f"({fin_headline.short_repr(h)})")
                    continue
                if not h.strip():
                    r.add_error(f"financing.allowedSourceHosts[{_hi}] is blank — "
                                f"a blank entry matches no host and is never useful")
                    continue
                # The browser lowercases entries but does NOT trim them, so a
                # padded entry silently matches nothing there. Store it trimmed.
                if h != h.strip():
                    r.add_error(
                        f"financing.allowedSourceHosts[{_hi}] "
                        f"{fin_headline.short_repr(h)} has leading/trailing "
                        f"whitespace — index.html's financingSourceAllowed() "
                        f"lowercases entries but does not trim them, so this "
                        f"entry matches nothing in the browser; store it trimmed")
                hs = h.strip().lower()
                if hosts and hs not in [_s(x).lower() for x in hosts]:
                    r.add_error(f"financing.allowedSourceHosts entry "
                                f"{fin_headline.short_repr(h)} is not in "
                                f"tools/source_hosts.json financingSourceHosts")

    if enabled:
        if declared is None:
            r.add_error(
                "financing.allowedSourceHosts is required when financing is "
                "enabled — it is the allowlist the BROWSER uses, and without it "
                "index.html's financingSourceAllowed() refuses every URL, "
                "silently hiding the financing links, the QR continuation, the "
                "email URL and the exact terms")
        elif isinstance(declared, list) and not declared:
            r.add_error(
                "financing.allowedSourceHosts is empty — the browser allows no "
                "host at all, so every customer-reachable financing URL is "
                "silently refused at runtime")
        # RUNTIME PARITY. Every customer-reachable financing URL that this
        # validator accepts must also pass the browser's predicate against the
        # SHIPPED allowlist. applicationUrl is included even though nothing
        # renders it today: it is validated here as customer-reachable, so it
        # must work the moment it is wired up.
        _reachable = [("financing.sourceUrl", fin.get("sourceUrl")),
                      ("financing.applicationUrl", fin.get("applicationUrl")),
                      ("financing.mexicoInfoUrl", fin.get("mexicoInfoUrl"))]
        for _i, _plan in enumerate(plan_list):
            if isinstance(_plan, dict) and _plan.get("sourceUrl") is not None:
                _reachable.append((f"{_plan_tag(_plan, _i)}.sourceUrl",
                                   _plan.get("sourceUrl")))
        for _label, _url in _reachable:
            if _url is None or _blank(_url):
                continue
            if _is_archive_capture(_url):
                r.add_error(
                    f"{_label} {fin_headline.short_repr(_url)} is a "
                    f"web.archive.org capture. Archive captures are valid "
                    f"promotions EVIDENCE but never customer destinations: "
                    f"index.html's financingSourceAllowed() has no archive "
                    f"branch, so this URL passes the build and renders as "
                    f"nothing. Point the customer-facing field at the live page")
                continue
            if not _is_allowed_source(_url, hosts):
                continue        # already reported by that field's own rule
            if not _runtime_financing_host_allowed(_url, declared):
                r.add_error(
                    f"{_label} {fin_headline.short_repr(_url)} passes build "
                    f"validation but is REFUSED by index.html's "
                    f"financingSourceAllowed() against the shipped "
                    f"financing.allowedSourceHosts "
                    f"{fin_headline.short_repr(declared)} — the browser would "
                    f"silently drop this link. Add its host to "
                    f"financing.allowedSourceHosts")

    if enabled and not (isinstance(plans_raw, list) and plans_raw):
        r.add_error("financing.plans must be a non-empty list when enabled")
    for i, plan in enumerate(plan_list):
        # The object guard comes FIRST. Building the diagnostic tag from
        # plan.get('id') before it meant a non-object entry raised
        # AttributeError, and the "must be an object" error below was
        # unreachable for every value JSON can express.
        if not isinstance(plan, dict):
            r.add_error(f"financing.plans[{i}]: must be an object, got "
                        f"{_type_name(plan)} ({fin_headline.short_repr(plan)})")
            continue
        tag = _plan_tag(plan, i)
        if _blank(plan.get("id")):
            r.add_error(f"{tag}: id is required")
        elif not isinstance(plan.get("id"), str):
            r.add_error(f"{tag}: id {fin_headline.short_repr(plan.get('id'))} must be "
                        f"a string — ids key the runtime's lookup maps")
        # isinstance(str) FIRST: `kind not in <set>` hashes kind, so a JSON
        # array or object here raised TypeError before this error could fire.
        kind = plan.get("kind")
        if not isinstance(kind, str) or kind not in FINANCING_PLAN_KINDS:
            r.add_error(f"{tag}: kind {fin_headline.short_repr(kind)} not in "
                        f"{sorted(FINANCING_PLAN_KINDS)}")
        # provider is rendered in the promotional card title, so it must be a
        # real, trimmed, non-blank string. Without this a number, boolean,
        # object or blank string reached the title as
        # "123 promotional financing" / "[object Object] promotional financing"
        # / " promotional financing". The runtime degrades such a value to the
        # generic label rather than coercing it, but the build must reject it.
        if "provider" in plan:
            _prov = plan.get("provider")
            if not isinstance(_prov, str):
                r.add_error(
                    f"{tag}: provider {fin_headline.short_repr(_prov)} must be a string — it is rendered "
                    f"in the promotional card title and must not be coerced")
            elif not _prov.strip():
                r.add_error(f"{tag}: provider must not be blank")
            elif _prov != _prov.strip():
                r.add_error(
                    f"{tag}: provider {fin_headline.short_repr(_prov)} has leading/trailing whitespace — "
                    f"store it trimmed so the rendered title is exact")
        elif enabled:
            r.add_error(f"{tag}: provider is required when financing is enabled")

        # presentationScenario: the ONLY way a plan reaches a scenario card.
        # Absent, or a recognised non-blank string. Every other shape is
        # rejected so a scenario can never be inferred from an id, a kind, a
        # provider, a language or an array position.
        if "presentationScenario" in plan:
            _sc = plan.get("presentationScenario")
            if not isinstance(_sc, str) or not _sc.strip():
                r.add_error(
                    f"{tag}: presentationScenario {fin_headline.short_repr(_sc)} must be a non-blank string "
                    f"naming a supported scenario ({sorted(FINANCING_SCENARIOS)}), "
                    f"or be omitted entirely")
            elif _sc not in FINANCING_SCENARIOS:
                r.add_error(
                    f"{tag}: presentationScenario {fin_headline.short_repr(_sc)} is not a supported scenario "
                    f"{sorted(FINANCING_SCENARIOS)} — the renderer has no card for it, "
                    f"so the plan would not be presented at all")
            else:
                _want_kind = FINANCING_SCENARIO_KINDS.get(_sc)
                if _want_kind and kind != _want_kind:
                    r.add_error(
                        f"{tag}: presentationScenario {fin_headline.short_repr(_sc)} requires kind "
                        f"{_want_kind!r} by its product semantics, but kind is {fin_headline.short_repr(kind)}")
        # The legacy presentation flag is retired: two overlapping sources of
        # truth for 'is this a separate path' is exactly how a plan ended up
        # classified one way by validation and another way by the renderer.
        if "separatePath" in plan:
            r.add_error(
                f"{tag}: separatePath is retired — use "
                f"presentationScenario (one of {sorted(FINANCING_SCENARIOS)}) so the "
                f"renderer and this validator classify the plan the same way")
        # V1 hard invariant: no payment calculation anywhere.
        if plan.get("paymentCalculationEnabled"):
            r.add_error(f"{tag}: paymentCalculationEnabled must be false in V1 — "
                        f"product-level payment math is not approved")
        if not _bilingual_ok(plan.get("headline")):
            r.add_error(f"{tag}: headline missing EN or ES")
        # PROMOTIONAL HEADLINES ARE DERIVED, NOT AUTHORED.
        # apr and termMonths are authoritative; tools/financing_headline.py owns
        # the single EN/ES template that restates them, and the workbook builder
        # generates the shipped string from it. So what shipped must equal what
        # those fields produce — string for string, both languages.
        #
        # Bilingual PRESENCE was the only rule before, and presence is not
        # agreement: a hand-edited "4.99% APR for 12 months" shipped happily over
        # apr=9.99 / termMonths=72. Nor is numeric coincidence enough — prose that
        # merely mentions 9.99 and 72 ("Ask about 9.99 and 72.") is still not the
        # approved sentence, so the test is exact equality rather than a
        # substring or number-extraction match.
        #
        # Non-promotional plans are untouched here: their headlines are authored
        # orientation/scenario language and keep the bilingual + ungated-language
        # rules above (which is what stops a rate appearing in THEIR titles).
        if _plan_group(plan) == "promotional":
            try:
                want_headline = fin_headline.headline_for_plan(plan)
            except fin_headline.HeadlineError as exc:
                r.add_error(
                    f"{tag}: promotional plan cannot generate its headline — {exc}. "
                    f"apr and termMonths are the authoritative source of the "
                    f"customer-visible headline, so both must be present and "
                    f"valid on a promotional plan")
            else:
                got_headline = plan.get("headline")
                if isinstance(got_headline, dict):
                    for lang in fin_headline.LANGS:
                        if got_headline.get(lang) != want_headline[lang]:
                            r.add_error(
                                f"{tag}: headline.{lang} "
                                f"{fin_headline.short_repr(got_headline.get(lang), 80)} "
                                f"does not equal the value generated from apr="
                                f"{fin_headline.short_repr(plan.get('apr'))} / termMonths="
                                f"{fin_headline.short_repr(plan.get('termMonths'))}, which is "
                                f"{want_headline[lang]!r}. Promotional headlines are "
                                f"generated at build time — edit apr/termMonths in the "
                                f"canonical source and rebuild; never hand-edit the "
                                f"shipped prose")
                    extra_langs = sorted(set(got_headline) - set(fin_headline.LANGS))
                    if extra_langs:
                        r.add_error(
                            f"{tag}: headline carries unexpected keys {extra_langs} — a "
                            f"generated promotional headline has exactly "
                            f"{list(fin_headline.LANGS)}, so these were hand-added")
                # a non-dict headline is already reported by the bilingual check
        # Plan strings that reach a customer outside the exact-terms gate must
        # stay within reviewed generic orientation language. Applies in every
        # operating state: turning exactPromotionsEnabled on cannot make an
        # ungated surface an appropriate place for exact terms. A rejection
        # here means the wording is reserved or unreviewed — not that an exact
        # claim has been proven (see _check_ungated_text).
        if enabled:
            for _uf in _ungated_plan_fields(plan):
                _check_ungated_text(r, f"{tag}.{_uf}", plan.get(_uf))
        for field_name in ("detail", "disclosure"):
            obj = plan.get(field_name)
            if isinstance(obj, dict) and (bool(_s(obj.get("en"))) != bool(_s(obj.get("es")))):
                r.add_error(f"{tag}: {field_name} has one language but not the other")
        # EVERY present plan sourceUrl is an evidence/freshness input — the
        # client feeds it to financingSourceAllowed() — so all of them must
        # be safe allowlisted https URLs, not only exact-term plans'.
        _src_any = plan.get("sourceUrl")
        if _src_any is not None and not _blank(_src_any) \
                and not _is_allowed_source(_src_any, hosts):
            r.add_error(f"{tag}: sourceUrl {fin_headline.short_repr(_src_any)} must be a safe https URL on "
                        f"an allowlisted host (no credentials, default port)")
        # Exact credit claims: APR/term/minimum require verification, source,
        # adjacent conditions (detail) and a disclosure — all bilingual.
        exact = any(plan.get(k) is not None
                    for k in ("apr", "termMonths", "minimumPurchase"))
        if exact:
            if plan.get("verified") is not True:
                r.add_error(f"{tag}: exact terms present but verified is not true")
            if not _valid_iso_instant(plan.get("verifiedAt", "")):
                r.add_error(f"{tag}: exact terms require a valid verifiedAt "
                            f"(ISO-8601 with offset)")
            elif _materially_future(plan.get("verifiedAt", "")):
                r.add_error(f"{tag}: verifiedAt {fin_headline.short_repr(plan.get('verifiedAt'))} is materially "
                            f"in the future (beyond {FINANCING_CLOCK_SKEW_SECONDS}s clock "
                            f"skew) — exact terms cannot be verified at a future instant")
            src = _s(plan.get("sourceUrl"))
            if not src:
                r.add_error(f"{tag}: exact terms require sourceUrl")
            # (host/scheme safety of a present sourceUrl is enforced for
            # every plan by the general check above)
            if not _bilingual_ok(plan.get("detail")):
                r.add_error(f"{tag}: exact terms require adjacent conditions "
                            f"(detail) in EN and ES")
            if not _bilingual_ok(plan.get("disclosure")):
                r.add_error(f"{tag}: exact terms require a disclosure in EN and ES")
        # Supported numeric range. The bounds and the type rules live in
        # tools/financing_headline.py (APR_MIN/APR_MAX, TERM_MIN/TERM_MAX and
        # the two domain predicates) so the range this validator accepts and
        # the range the headline generator will format are one authority
        # rather than two copies that can drift. The predicates are TOTAL:
        # they answer for any object, including a JSON integer too large to
        # become a C double, which previously escaped this function as an
        # uncaught OverflowError before either check could run.
        apr = plan.get("apr")
        if apr is not None and not fin_headline.apr_in_domain(apr):
            r.add_error(f"{tag}: apr {fin_headline.short_repr(apr)} out of range "
                        f"({fin_headline.APR_MIN}-{fin_headline.APR_MAX} inclusive, "
                        f"finite, not a boolean)")
        tm = plan.get("termMonths")
        if tm is not None and not fin_headline.term_in_domain(tm):
            r.add_error(f"{tag}: termMonths {fin_headline.short_repr(tm)} out of range "
                        f"(whole months {fin_headline.TERM_MIN}-"
                        f"{fin_headline.TERM_MAX} inclusive)")
        # minimumPurchase is a customer-facing currency fact, so it must be a
        # real finite JSON number. `isinstance(mp, (int, float)) or mp < 0`
        # accepted true (bool is an int subclass, and True < 0 is False) and
        # accepted NaN/±inf (every comparison with NaN is False). NaN and
        # Infinity matter beyond tidiness: json.dumps writes them as the bare
        # tokens NaN / Infinity, which are NOT JSON, so such a value in
        # data/store-config.json yields a config the browser's JSON.parse
        # refuses — the app would fail to load at all. No upper bound is
        # imposed: a business maximum is Blake's call, not this validator's.
        mp = plan.get("minimumPurchase")
        if mp is not None and not _finite_number(mp):
            r.add_error(f"{tag}: minimumPurchase {fin_headline.short_repr(mp)} must be "
                        f"a finite number (not a boolean, NaN or Infinity)")
        elif mp is not None and mp < 0:
            r.add_error(f"{tag}: minimumPurchase {fin_headline.short_repr(mp)} "
                        f"out of range (must not be negative)")
        ppf = plan.get("publishedPaymentFactor")
        if ppf is not None and (not _finite_number(ppf) or not 0 < ppf < 1):
            r.add_error(f"{tag}: publishedPaymentFactor "
                        f"{fin_headline.short_repr(ppf)} must be a finite fraction "
                        f"between 0 and 1 (not a boolean, NaN or Infinity)")
        # lease-to-own / credit-builder must never carry credit terms
        # Evergreen kinds are the availability-only card ("More paths"): the
        # renderer never freshness-gates them, so credit terms there would
        # render outside the exact-terms gate permanently. One semantic set,
        # not a scattered kind list.
        if isinstance(kind, str) and kind in FINANCING_EVERGREEN_KINDS and exact:
            r.add_error(f"{tag}: {kind} plans must not state APR/term/minimum — "
                        f"availability only, details confirmed in store")

    # ---- collection-level taxonomy checks --------------------------------
    # Plan ids are opaque to presentation now, but they must still be unique:
    # the runtime builds lookup maps from them and a duplicate silently wins.
    _seen_ids = {}
    for i, plan in enumerate(plan_list):
        if not isinstance(plan, dict):
            continue
        pid = _s(plan.get("id"))
        if pid:
            _seen_ids.setdefault(pid, []).append(i)
    for pid, idxs in sorted(_seen_ids.items()):
        if len(idxs) > 1:
            r.add_error(f"financing.plans: duplicate plan id {fin_headline.short_repr(pid)} at positions "
                        f"{idxs} — plan ids must be unique")

    if enabled:
        # TOTAL PARTITION: every plan must land in exactly one renderer group.
        # A plan matching none would be silently absent from the sheet, which is
        # precisely the failure mode the id lookups used to hide.
        _scenario_counts = {}
        for i, plan in enumerate(plan_list):
            if not isinstance(plan, dict):
                continue
            tag = _plan_tag(plan, i)
            group = _plan_group(plan)
            if not group:
                r.add_error(
                    f"{tag}: matches no renderer presentation group "
                    f"(kind={fin_headline.short_repr(plan.get('kind'))}, "
                    f"presentationScenario="
                    f"{fin_headline.short_repr(plan.get('presentationScenario'))}) — it "
                    f"would never be presented. Give it a supported kind, or a supported "
                    f"presentationScenario, or define the missing group in both "
                    f"tools/validation.py and index.html")
            if group == "scenario":
                _sc = _plan_scenario(plan)
                _pid = plan.get("id")
                _scenario_counts.setdefault(_sc, []).append(
                    _pid if isinstance(_pid, str) else i)
        # Cardinality: the renderer draws a single card per singleton scenario,
        # so two claimants would mean one is silently dropped.
        for _sc, owners in sorted(_scenario_counts.items()):
            if _sc in FINANCING_SINGLETON_SCENARIOS and len(owners) > 1:
                r.add_error(
                    f"financing.plans: {len(owners)} plans declare "
                    f"presentationScenario={fin_headline.short_repr(_sc)} ({owners}) but the renderer presents "
                    f"exactly one — the others would be dropped silently")

        # ---- canonical Payment Choice path identity is UNIQUE --------------
        # The runtime derives one path per promotional PROVIDER, one per
        # installment/evergreen plan and one per presentation scenario, and
        # identifies each by finPathId(kind, value) — mirrored by
        # _fin_path_id() above. Two paths sharing an id means one preference
        # row, one explored entry and one set of DOM ids for both, so a
        # customer's Consider lands on a path they did not choose and the
        # salesperson reads the wrong one off the handoff.
        #
        # The encoding is injective, so a collision here can only come from two
        # sources genuinely carrying the same identifying value (duplicate plan
        # ids are caught above; this catches the cross-group and provider
        # cases). It is checked rather than assumed because the derivation is
        # what the customer's choice is keyed on.
        _path_owners = {}
        _seen_providers = []
        for i, plan in enumerate(plan_list):
            if not isinstance(plan, dict):
                continue
            group = _plan_group(plan)
            if group == "promotional":
                prov = plan.get("provider")
                prov = prov.strip() if isinstance(prov, str) else ""
                if prov in _seen_providers:
                    continue          # one path per provider, by construction
                _seen_providers.append(prov)
                _raw = prov
                _pid = _fin_path_id("promo", prov)
                _owner = f"promotional provider {fin_headline.short_repr(prov)}"
            elif group in ("installment", "evergreen"):
                _raw = plan.get("id")
                _pid = _fin_path_id("plan", _raw)
                _owner = _plan_tag(plan, i)
            elif group == "scenario":
                _raw = _plan_scenario(plan)
                _pid = _fin_path_id("scenario", _raw)
                _owner = (f"scenario "
                          f"{fin_headline.short_repr(_plan_scenario(plan))}")
            else:
                continue
            if _pid is None:
                # No canonical identity. TWO causes, and only ONE of them needs
                # a message here: a NON-STRING identity value already has its
                # own specific error ("id must be a string"), and repeating it
                # in different words would tell the author less, not more. A
                # STRING that cannot be encoded has no other reporter, so it is
                # named here — the runtime cannot form an id for it either, the
                # path would silently vanish from the sheet and the handoff, and
                # a preference on it could never be cleared.
                # A BLANK identity is reported by the required-id rule, and a
                # NON-STRING by the must-be-a-string rule. Only a non-empty
                # string that fails to ENCODE has no other reporter, so only
                # that case is named here — otherwise an empty id would be
                # described to the author as an unpaired surrogate, which it is
                # not.
                if isinstance(_raw, str) and _raw != "":
                    r.add_error(
                        f"{_owner}: the value identifying this Payment Choice "
                        f"path contains an unpaired surrogate and cannot be "
                        f"encoded, so no canonical path id exists for it - the "
                        f"runtime would drop the path entirely. Fix the source "
                        f"text.")
                continue
            _path_owners.setdefault(_pid, []).append(_owner)
        for _pid, owners in sorted(_path_owners.items()):
            if len(owners) > 1:
                r.add_error(
                    f"financing: {len(owners)} Payment Choice paths derive the same "
                    f"canonical id {fin_headline.short_repr(_pid)} ({', '.join(owners)}) — one "
                    f"preference and one explored entry would stand for both, so a "
                    f"customer's choice would land on a path they did not pick")
    return r


# -- Quiz definition (data/quiz.json payload) ---------------------------------
# The quiz structure is an app-level contract: ~15 code sites consume question
# and option ids by name (profile assignment, Sleep Brief, adjustable-base
# hero, results narratives, handoff labels, email packet), and option `scores`
# keys must land in the mattress feature-tag vocabulary to affect ranking. So
# V1 pins ids, types, order, and option ids exactly — retailers vary COPY
# (question/helpText/category/label/sublabel/copyVariants text), never
# structure. Loosening any part of this contract requires an app-code review
# of the id consumers first.

# (id, type, option ids in display order). None = slider (no options).
# 2026-08-12 (owner ruling, Blake): sleep_quality and current_mattress_age
# removed — both carried zero score tags, and the consumer audit found
# current_mattress_age consumed by nothing at all while sleep_quality fed
# only the consultation context row (which now builds from trigger alone).
# 12 -> 10 questions; recommendations provably unchanged (the Phase 1
# output-regression fixture is byte-identical across the change).
QUIZ_CANONICAL = (
    ("trigger", "single", ("pain", "worn_out", "moving", "upgrade", "browsing")),
    ("mattress_size", "single",
     ("twin", "twin_xl", "full", "queen", "king", "cal_king")),
    ("partner_sleep", "single", ("solo", "partner", "family")),
    ("partner_disturbance", "single",
     ("yes_often", "sometimes", "rarely", "not_applicable")),
    ("sleep_position", "single", ("side", "back", "stomach", "combo", "no_idea")),
    ("body_type", "single", ("petite", "average", "athletic", "plus", "different")),
    ("temperature", "single", ("hot", "comfortable", "cold", "opposite")),
    ("firmness", "slider", None),
    ("sleep_issues", "multiple",
     ("back_pain", "hip_pain", "hot", "tossing", "stiff", "sagging",
      "too_soft", "none")),
    ("health_conditions", "multiple",
     ("nerve_pain", "allergies", "snoring", "reflux", "extra_support",
      "getting_older", "none")),
)

# Feature tags the scoring engine may award points for. Must stay a superset
# of every option's scores keys; matches the app's quizTags vocabulary. An
# unknown tag is an error (a typo'd tag silently awards nothing).
QUIZ_SCORE_TAGS = frozenset((
    "adjustable", "comfort", "cooling", "durability", "durable", "firm",
    "hybrid", "hypoallergenic", "medium", "memory", "motionIsolation",
    "plush", "pressureRelief", "quality", "responsive", "soft", "support",
    "zoned",
))

# The scoring engine caps per-mattress-per-feature accumulation at 5
# (FEATURE_CAP in index.html); a single-option award beyond the cap is
# unreachable and therefore a config mistake.
QUIZ_FEATURE_CAP = 5

_QUIZ_QUESTION_KEYS = frozenset((
    "id", "category", "question", "helpText", "type", "options", "skipIf",
    "copyVariants", "min", "max", "defaultValue", "labels",
))
_QUIZ_OPTION_KEYS = frozenset(
    ("id", "label", "icon", "sublabel", "scores", "hideIf"))


def _quiz_condition_ok(r, tag, cond, earlier_options):
    """Validate a {question, answer} condition against EARLIER questions only
    (forward references could never fire: answers arrive in question order)."""
    if not isinstance(cond, dict) or set(cond) != {"question", "answer"}:
        r.add_error(f"{tag} must be an object {{question, answer}}")
        return
    qid = cond.get("question")
    if qid not in earlier_options:
        r.add_error(f"{tag} references {qid!r}, which is not an earlier question")
        return
    if cond.get("answer") not in earlier_options[qid]:
        r.add_error(f"{tag} answer {cond.get('answer')!r} is not an option of "
                    f"{qid!r}")


def validate_quiz(quiz) -> ValidationReport:
    """Validate the quiz payload (structure contract + copy + scores).

    No-op when quiz is None (workbooks without a Quiz payload)."""
    r = ValidationReport()
    if quiz is None:
        return r
    if not isinstance(quiz, dict) or not isinstance(quiz.get("questions"), list):
        r.add_error("quiz must be an object with a questions list")
        return r
    questions = quiz["questions"]

    got = [(q.get("id"), q.get("type")) for q in questions
           if isinstance(q, dict)]
    want = [(qid, qtype) for qid, qtype, _ in QUIZ_CANONICAL]
    if got != want:
        r.add_error(f"quiz questions must match the canonical id/type sequence "
                    f"exactly (structure is an app contract); got {got}, "
                    f"expected {want}")
        return r  # id-keyed checks below assume the canonical sequence

    earlier_options = {}  # question id -> set of option ids, filled in order
    for (qid, qtype, opt_ids), q in zip(QUIZ_CANONICAL, questions):
        tag = f"quiz.{qid}"
        unknown = set(q) - _QUIZ_QUESTION_KEYS
        if unknown:
            r.add_error(f"{tag}: unknown keys {sorted(unknown)}")
        for key in ("category", "question", "helpText"):
            if not _bilingual_ok(q.get(key)):
                r.add_error(f"{tag}: {key} missing EN or ES")
        if q.get("skipIf") is not None:
            _quiz_condition_ok(r, f"{tag}.skipIf", q["skipIf"], earlier_options)

        if qtype == "slider":
            mn, mx, dv = q.get("min"), q.get("max"), q.get("defaultValue")
            if not all(isinstance(v, int) for v in (mn, mx, dv)) \
                    or not mn < mx or not mn <= dv <= mx:
                r.add_error(f"{tag}: slider needs integer min < max with "
                            f"defaultValue in range (got min={mn!r}, max={mx!r}, "
                            f"defaultValue={dv!r})")
            labels = q.get("labels")
            if not (isinstance(labels, list) and len(labels) == 3
                    and all(_bilingual_ok(x) for x in labels)):
                r.add_error(f"{tag}: slider needs exactly 3 bilingual labels")
            earlier_options[qid] = set()
            continue

        opts = q.get("options")
        got_opts = tuple(o.get("id") for o in (opts or [])
                         if isinstance(o, dict))
        if got_opts != opt_ids:
            r.add_error(f"{tag}: option ids must be exactly {list(opt_ids)} in "
                        f"order (structure is an app contract); got "
                        f"{list(got_opts)}")
            earlier_options[qid] = set(opt_ids)
            continue
        for o in opts:
            otag = f"{tag}.{o.get('id')}"
            unknown = set(o) - _QUIZ_OPTION_KEYS
            if unknown:
                r.add_error(f"{otag}: unknown keys {sorted(unknown)}")
            if not _bilingual_ok(o.get("label")):
                r.add_error(f"{otag}: label missing EN or ES")
            if o.get("sublabel") is not None and not _bilingual_ok(o["sublabel"]):
                r.add_error(f"{otag}: sublabel missing EN or ES")
            if _blank(o.get("icon")):
                r.add_error(f"{otag}: icon is required")
            scores = o.get("scores")
            if not isinstance(scores, dict):
                r.add_error(f"{otag}: scores must be an object (may be empty)")
            else:
                for feat, pts in scores.items():
                    if feat not in QUIZ_SCORE_TAGS:
                        r.add_error(f"{otag}: unknown score tag {feat!r} — a "
                                    f"typo'd tag silently awards nothing")
                    if not isinstance(pts, int) or not 1 <= pts <= QUIZ_FEATURE_CAP:
                        r.add_error(f"{otag}: score {feat}={pts!r} must be an "
                                    f"integer in 1..{QUIZ_FEATURE_CAP}")
            if o.get("hideIf") is not None:
                _quiz_condition_ok(r, f"{otag}.hideIf", o["hideIf"],
                                   earlier_options)

        for i, cv in enumerate(q.get("copyVariants") or []):
            ctag = f"{tag}.copyVariants[{i}]"
            if not isinstance(cv, dict) or "when" not in cv:
                r.add_error(f"{ctag}: must be an object with a 'when' condition")
                continue
            when = cv["when"]
            if not isinstance(when, dict) or set(when) != {"question", "answerIn"}:
                r.add_error(f"{ctag}.when must be {{question, answerIn}}")
            else:
                wq = when.get("question")
                if wq not in earlier_options:
                    r.add_error(f"{ctag}.when references {wq!r}, which is not an "
                                f"earlier question")
                elif not (isinstance(when.get("answerIn"), list)
                          and when["answerIn"]
                          and set(when["answerIn"]) <= earlier_options[wq]):
                    r.add_error(f"{ctag}.when.answerIn must be a non-empty "
                                f"subset of {wq!r}'s option ids")
            for key in set(cv) - {"when"}:
                if key not in ("question", "helpText"):
                    r.add_error(f"{ctag}: unknown key {key!r}")
                elif not _bilingual_ok(cv[key]):
                    r.add_error(f"{ctag}: {key} missing EN or ES")

        earlier_options[qid] = set(opt_ids)
    return r


# -- V2: catalog validation (raw tabs) ----------------------------------------

def validate_mattresses(raw_tabs, *, source_images=None, skip_images=False,
                        languages=None) -> ValidationReport:
    r = ValidationReport()
    if "Mattresses" not in raw_tabs:
        return r  # missing tab already reported by validate_structure
    headers, rows = raw_tabs["Mattresses"]
    brands = _brands_from(raw_tabs)
    es_cols = [h for h in headers if h.endswith(" (ES)")]
    check_images = bool(source_images) and not skip_images
    src_stems = None
    if check_images:
        d = os.path.join(source_images, "mattresses")
        src_stems = _source_stems(d)
        if src_stems is None:
            r.add_error(f"Mattresses: source image folder not found: {d}")

    seen_ids = {}
    seen_names = {}
    for i, row in enumerate(rows, start=1):
        mid, name, brand = _s(row.get("id")), _s(row.get("name")), _s(row.get("brand"))
        tier, fs = _s(row.get("tier")), _s(row.get("firmnessScore"))
        tag = mid or name or f"row {i}"

        if tier and tier not in MATTRESS_TIERS:
            r.add_error(f"Mattresses {tag}: tier {tier!r} not gold/silver/bronze")
        if mid:
            if mid in seen_ids:
                r.add_error(f"Mattresses: duplicate id {mid!r} (rows {seen_ids[mid]} & {i})")
            else:
                seen_ids[mid] = i
            if not _is_slug(mid):
                r.add_error(f"Mattresses {tag}: id {mid!r} is not slug-safe")
        if brand and brands and brand not in brands:
            r.add_error(f"Mattresses {tag}: brand {brand!r} is not in the Brands tab {sorted(brands)}")
        if fs:
            try:
                n = int(float(fs)) if isinstance(fs, str) else int(fs)
                if not (1 <= n <= 10):
                    r.add_error(f"Mattresses {tag}: firmnessScore {fs!r} not in 1-10")
            except (ValueError, TypeError):
                r.add_error(f"Mattresses {tag}: firmnessScore {fs!r} is not an integer")
        if name:
            key = name.lower()
            if key in seen_names:
                r.add_error(f"Mattresses: duplicate name {name!r} -> image filename "
                            f"collision (rows {seen_names[key]} & {i})")
            else:
                seen_names[key] = i
            if check_images and src_stems is not None and key not in src_stems:
                r.add_error(f"Mattresses {tag}: no source image for "
                            f"{key}.[jpg|jpeg|png|webp] in {os.path.join(source_images, 'mattresses')}")
        # ES policy — per-component fail-closed parity (claim-retirement
        # slice, owner ruling 2026-08-12). The previous row-level rule warned
        # only when EVERY (ES) cell was blank, so a one-sided component
        # passed silently and the app rendered its other-language fallback
        # to customers (EN into Spanish sessions via L() and
        # topPickReasonText). Now: an optional bilingual display component
        # may be absent only when BOTH languages are absent — an omission is
        # never a claim — and one-sided presence is an ERROR. Each
        # differentiator title/detail pair counts as ONE component.
        if languages and "es" in languages and es_cols:
            def _has(*cols):
                return any(not _blank(row.get(c)) for c in cols)
            for col in ("highlight", "topPickReason", "reason_cooling",
                        "reason_pressureRelief", "reason_motionIsolation",
                        "reason_support", "reason_plush", "reason_medium",
                        "reason_firm", "reason_durability", "reason_default"):
                en_p, es_p = _has(col), _has(f"{col} (ES)")
                if en_p != es_p:
                    r.add_error(f"Mattresses {tag}: {col} present in "
                                f"{'EN' if en_p else 'ES'} only — an optional "
                                f"component needs both languages or neither")
            for label, pair in (("differentiator1",
                                 ("differentiator1Title", "differentiator1Detail")),
                                ("differentiator2",
                                 ("differentiator2Title", "differentiator2Detail"))):
                en_p = _has(*pair)
                es_p = _has(*(f"{c} (ES)" for c in pair))
                if en_p != es_p:
                    r.add_error(f"Mattresses {tag}: {label} pair present in "
                                f"{'EN' if en_p else 'ES'} only — the pair is one "
                                f"component and needs both languages or neither")
            def _badge_count(col):
                raw = row.get(col)
                raw = "" if raw is None else str(raw)
                return len([x for x in raw.split("|") if x.strip()]) if raw.strip() else 0
            en_n, es_n = _badge_count("displayBadges"), _badge_count("displayBadges (ES)")
            if (en_n == 0) != (es_n == 0):
                r.add_error(f"Mattresses {tag}: displayBadges present in "
                            f"{'EN' if en_n else 'ES'} only — badges need both "
                            f"languages or neither")
            elif en_n and en_n != es_n:
                r.add_error(f"Mattresses {tag}: displayBadges has {en_n} EN "
                            f"badge(s) but {es_n} ES — counts must match "
                            f"positionally")
        elif languages and "es" not in languages and es_cols:
            if any(not _blank(row.get(h)) for h in es_cols):
                r.add_warning(f"Mattresses {tag}: Spanish (ES) copy present but languages excludes 'es'")
    return r


def validate_accessories(raw_tabs, *, source_images=None, skip_images=False,
                         languages=None) -> ValidationReport:
    r = ValidationReport()
    if "Accessories" not in raw_tabs:
        return r
    headers, rows = raw_tabs["Accessories"]
    score_headers = [h for h in headers if h.startswith("Score:")]
    check_images = bool(source_images) and not skip_images
    src_stems = None
    if check_images:
        d = os.path.join(source_images, "accessories")
        src_stems = _source_stems(d)
        if src_stems is None:
            r.add_error(f"Accessories: source image folder not found: {d}")

    seen_ids = {}
    seen_basenames = {}
    es_pairs = (("Name", "Name (ES)"), ("Category", "Category (ES)"),
                ("Description", "Description (ES)"))
    for i, row in enumerate(rows, start=1):
        aid, cat, img = _s(row.get("ID")), _s(row.get("Category")), _s(row.get("Image File Name"))
        tag = aid or _s(row.get("Name")) or f"row {i}"

        if aid:
            if aid in seen_ids:
                r.add_error(f"Accessories: duplicate id {aid!r} (rows {seen_ids[aid]} & {i})")
            else:
                seen_ids[aid] = i
            if not _is_slug(aid):
                r.add_error(f"Accessories {tag}: id {aid!r} is not slug-safe")
        if cat and cat not in ACCESSORY_CATEGORIES:
            r.add_error(f"Accessories {tag}: category {cat!r} not in {sorted(ACCESSORY_CATEGORIES)}")
        price = row.get("Price")
        if not _blank(price):
            try:
                float(str(price))
            except ValueError:
                r.add_error(f"Accessories {tag}: price {price!r} is not numeric")
        if _blank(img):
            r.add_error(f"Accessories {tag}: Image File Name is empty")
        else:
            img_s = str(img).strip()
            # G1: the cell must be the full relative path images/accessories/<file>.jpg.
            # index.html renders accessories.json `image` verbatim, so a bare filename,
            # a non-jpg extension, or an extra sub-path builds clean but 404s on the
            # live host. The normalized live file is always <prefix><basename>.jpg.
            rest = (img_s[len(ACCESSORY_IMAGE_PREFIX):]
                    if img_s.startswith(ACCESSORY_IMAGE_PREFIX) else None)
            if rest is None or not rest or "/" in rest or not rest.lower().endswith(".jpg"):
                r.add_error(f"Accessories {tag}: Image File Name {img!r} must be a full "
                            f"relative path of the form '{ACCESSORY_IMAGE_PREFIX}<file>.jpg' "
                            f"- a bare filename builds clean but 404s live (index.html "
                            f"renders it verbatim)")
            base = os.path.splitext(os.path.basename(img_s))[0].lower()
            if base in seen_basenames:
                r.add_warning(f"Accessories: duplicate image basename {base!r} "
                              f"(rows {seen_basenames[base]} & {i})")
            else:
                seen_basenames[base] = i
            if check_images and src_stems is not None and base not in src_stems:
                r.add_error(f"Accessories {tag}: no source image for "
                            f"{base}.[jpg|jpeg|png|webp] in {os.path.join(source_images, 'accessories')}")
        for h in score_headers:
            v = row.get(h)
            if _blank(v):
                continue
            try:
                n = int(str(v).strip()) if isinstance(v, str) else int(v)
                if n < 0:
                    r.add_error(f"Accessories {tag}: {h} {v!r} is negative")
            except (ValueError, TypeError):
                r.add_error(f"Accessories {tag}: {h} {v!r} is not an integer")
        # ES policy (warnings only)
        if languages and "es" in languages:
            for en_h, es_h in es_pairs:
                if not _blank(row.get(en_h)) and _blank(row.get(es_h)):
                    r.add_warning(f"Accessories {tag}: {es_h} missing (languages includes 'es')")
        elif languages and "es" not in languages:
            for _, es_h in es_pairs:
                if not _blank(row.get(es_h)):
                    r.add_warning(f"Accessories {tag}: {es_h} present but languages excludes 'es'")
    return r


def validate_brands(raw_tabs, *, source_images=None, skip_images=False) -> ValidationReport:
    """V2: Brands tab. When a brand sets a Logo File Name and --source-images is
    provided, require a matching source logo in <source-images>/brands/ (matched by
    exact filename, case-insensitive - brand logos are copied verbatim, preserving
    format/transparency). A blank Logo File Name is allowed: the app then shows the
    brand name only."""
    r = ValidationReport()
    if "Brands" not in raw_tabs:
        return r  # missing tab already reported by validate_structure
    _, rows = raw_tabs["Brands"]
    check_images = bool(source_images) and not skip_images
    src_names = None
    if check_images:
        d = os.path.join(source_images, "brands")
        src_names = _source_names(d)
        if src_names is None:
            r.add_error(f"Brands: source logo folder not found: {d}")

    seen = {}
    for i, row in enumerate(rows, start=1):
        name = _s(row.get("Brand Name"))
        logo = _s(row.get("Logo File Name"))
        tag = name or f"row {i}"
        if not logo:
            continue  # optional - app renders the brand name without a logo
        key = logo.lower()
        if key in seen:
            r.add_warning(f"Brands: duplicate Logo File Name {logo!r} "
                          f"(rows {seen[key]} & {i})")
        else:
            seen[key] = i
        if check_images and src_names is not None and key not in src_names:
            r.add_error(f"Brands {tag}: no source logo {logo!r} in "
                        f"{os.path.join(source_images, 'brands')}")
    return r


def validate_app_icon(raw_tabs, *, source_images=None, skip_images=False) -> ValidationReport:
    """V2: optional PWA app icon (Store Info "App Icon File"). Blank = no icons
    (allowed - the converter emits no manifest.icons). When set, the file must be a
    .png; and when --source-images is provided it must exist at <source-images>/
    logos/<file> and be a square PNG >= 512px (read via stdlib PNG header, no
    Pillow). Errors block the build before any icons are generated."""
    r = ValidationReport()
    if "Store Info" not in raw_tabs:
        return r
    _, rows = raw_tabs["Store Info"]
    if not rows:
        return r
    icon = _s(rows[0].get("App Icon File"))
    if not icon:
        return r  # optional - no PWA icons for this store
    # M2: icons are generated only when --source-images is provided AND image
    # normalization is not skipped. If the workbook requests an app icon but the run
    # cannot generate it, block: writing the bundle anyway would emit manifest.json
    # WITHOUT its icons array, silently stripping a deployed PWA icon set.
    if not source_images or skip_images:
        r.add_error(f"Store Info: App Icon File {icon!r} is set but PWA icons cannot "
                    f"be generated - re-run with --source-images and without "
                    f"--skip-image-normalization (otherwise manifest.json is written "
                    f"without its icons).")
    if not icon.lower().endswith(".png"):
        r.add_error(f"Store Info: App Icon File {icon!r} must be a .png")
    if bool(source_images) and not skip_images:
        src = os.path.join(source_images, "logos", icon)
        if not os.path.isfile(src):
            r.add_error(f"Store Info: App Icon File {icon!r} not found in "
                        f"{os.path.join(source_images, 'logos')}")
        else:
            dims = _png_dimensions(src)
            if dims is None:
                r.add_error(f"Store Info: App Icon File {icon!r} is not a readable PNG")
            else:
                w, h = dims
                if w != h:
                    r.add_error(f"Store Info: App Icon File {icon!r} must be square "
                                f"(got {w}x{h})")
                elif w < 512:
                    r.add_error(f"Store Info: App Icon File {icon!r} must be >= 512px "
                                f"(got {w}x{h})")
    return r


def _quiz_from_tabs(raw_tabs):
    """Parse the Quiz tab's chunked JSON envelope out of raw_tabs.

    Returns the quiz dict, or None when the tab is absent, empty, unparseable,
    or not the {"quiz": {...}} envelope — those states are the quiz channel's
    own validators' to report; callers here only need the option inventory.
    The INNER value must itself be an object: {"quiz": []} / {"quiz": "x"} /
    {"quiz": null} all return None, so callers may .get() the result without
    guarding — a malformed envelope becomes a controlled validation error
    (consultation rows with no parseable quiz), never a traceback."""
    if "Quiz" not in raw_tabs:
        return None
    _, rows = raw_tabs["Quiz"]
    payload = "".join(_s(r.get("Quiz JSON")) for r in rows).strip()
    if not payload:
        return None
    try:
        parsed = json.loads(payload)
    except ValueError:
        return None
    if not (isinstance(parsed, dict) and set(parsed) == {"quiz"}):
        return None
    inner = parsed["quiz"]
    return inner if isinstance(inner, dict) else None


def validate_sales_notes(raw_tabs, *, languages=None) -> ValidationReport:
    r = ValidationReport()
    if "SalesNotes" not in raw_tabs:
        return r
    headers, rows = raw_tabs["SalesNotes"]
    brands = _brands_from(raw_tabs)
    consult_seen = {}
    consult_all_empty = True
    for i, row in enumerate(rows, start=1):
        typ, key = _s(row.get("Type")), _s(row.get("Key"))
        tag = key or f"row {i}"
        if typ and typ not in SALESNOTE_TYPES:
            r.add_error(f"SalesNotes {tag}: Type {typ!r} not subBrand/brand/consultation")
        elif typ == "consultation":
            dot = key.find(".")
            if dot <= 0 or dot == len(key) - 1:
                r.add_error(f"SalesNotes {tag}: consultation Key must be "
                            "'<questionId>.<optionId>'")
                continue
            qid, oid = key[:dot], key[dot + 1:]
            if qid not in CONSULTATION_QUESTIONS:
                r.add_error(f"SalesNotes {tag}: {qid!r} is not a Consultation Summary "
                            f"question {sorted(CONSULTATION_QUESTIONS)}")
                continue
            if (qid, oid) in consult_seen:
                r.add_error(f"SalesNotes {tag}: duplicate consultation key")
                continue
            en, es = _s(row.get("Implication")).strip(), _s(row.get("Implication (ES)")).strip()
            # Empty-empty is an INTENTIONAL omission (e.g. the "none" options).
            # One language filled with the other blank would make the two
            # surfaces disagree, and the runtime never falls back across
            # languages — so a lopsided pair is an authoring error.
            if (en == "") != (es == ""):
                r.add_error(f"SalesNotes {tag}: Implication and Implication (ES) must be "
                            "both filled or both empty (both empty = intentional omission)")
            if en or es:
                consult_all_empty = False
            consult_seen[(qid, oid)] = True
        elif typ == "subBrand":
            fmt = _s(row.get("Format"))
            if fmt not in SALESNOTE_FORMATS:
                r.add_error(f"SalesNotes {tag}: Format {fmt!r} must be full/coaching")
            elif fmt == "full":
                for f in ("Lead", "Demo", "Close"):
                    if _blank(row.get(f)):
                        r.add_error(f"SalesNotes {tag} (full): {f} is required")
            elif fmt == "coaching":
                if _blank(row.get("RSA Note")):
                    r.add_error(f"SalesNotes {tag} (coaching): RSA Note is required")
        elif typ == "brand":
            if _blank(row.get("Story")):
                r.add_error(f"SalesNotes {tag} (brand): Story is required")
            if key and brands and key not in brands:
                r.add_warning(f"SalesNotes brand note {key!r} is not a known brand {sorted(brands)}")
        # subBrand-key cross-ref intentionally NOT validated (real data has
        # pitchKey-mapped / aspirational keys that are not literal mattress
        # subBrands). ES sales-notes intentionally NOT validated (optional,
        # generated-later block).

    # Consultation implications (0.6): completeness against the quiz definition.
    # The runtime fails closed by OMITTING any unmapped fragment, so a hole here
    # never leaks a label or an id — but it silently thins the Consultation
    # Summary, which is exactly the state this check exists to catch at build
    # time. Intentional omissions are rows with both Implication cells empty;
    # a MISSING row is always an error.
    quiz = _quiz_from_tabs(raw_tabs)
    # A row with both cells blank is an intentional omission — but a MISSING
    # COLUMN silently turns EVERY row into one at once (r.get() of an absent
    # header is None -> ""), which is a deleted/renamed column in the
    # human-editable workbook, never an authoring choice. Same for all rows
    # arriving empty: no deployment authors nothing but omissions.
    if consult_seen:
        for h in ("Implication", "Implication (ES)"):
            if h not in headers:
                r.add_error(f"SalesNotes: consultation rows present but the {h!r} "
                            "column is missing — every implication would silently "
                            "read as an intentional omission")
        if consult_all_empty and all(h in headers for h in ("Implication", "Implication (ES)")):
            r.add_error("SalesNotes: every consultation implication is empty — the "
                        "Consultation Summary would render no answer-derived copy; "
                        "author the copy or remove the rows")
    if consult_seen and quiz is None:
        r.add_error("SalesNotes: consultation implication rows are present but the "
                    "workbook has no parseable Quiz tab to validate them against")
    elif quiz is not None:
        quiz_options = {}
        for q in (quiz.get("questions") or []):
            if isinstance(q, dict) and q.get("id") in CONSULTATION_QUESTIONS:
                quiz_options[q["id"]] = [o.get("id") for o in (q.get("options") or [])
                                         if isinstance(o, dict) and o.get("id")]
        if not consult_seen:
            r.add_warning("SalesNotes: no consultation implication rows — the "
                          "Consultation Summary renders no answer-derived copy (0.6)")
        else:
            for qid in CONSULTATION_QUESTIONS:
                for oid in quiz_options.get(qid, []):
                    if (qid, oid) not in consult_seen:
                        r.add_error(f"SalesNotes: consultation implication missing for "
                                    f"{qid}.{oid} (author a row with both Implication "
                                    "cells empty to record an intentional omission)")
            for (qid, oid) in consult_seen:
                if oid not in (quiz_options.get(qid) or []):
                    r.add_error(f"SalesNotes: consultation key {qid}.{oid} matches no "
                                "quiz option id")
    return r


# -- V3: post-emit output validation ------------------------------------------

def _parse_allowed_hosts_js(path: str):
    text = open(path, encoding="utf-8").read()
    m = re.search(r"__DF_ALLOWED_HOSTS\s*=\s*(\[.*?\])\s*;", text, re.DOTALL)
    if not m:
        raise ValueError("no __DF_ALLOWED_HOSTS assignment found")
    return json.loads(m.group(1))


def _csv_header(path: str):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return next(csv.reader(f), [])


def validate_generated_outputs(output_dir: str, *, build_json: bool = True,
                               languages=None) -> ValidationReport:
    """Validate the bundle the converter just wrote. `build_json` should reflect
    whether build-data.ps1 actually ran (and thus mattresses.json should exist)."""
    r = ValidationReport()
    data = os.path.join(output_dir, "data")

    def load_json(path, label):
        if not os.path.exists(path):
            r.add_error(f"{label}: missing ({path})")
            return None
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except (ValueError, OSError) as e:
            r.add_error(f"{label}: invalid JSON ({e})")
            return None

    config = load_json(os.path.join(data, "store-config.json"), "store-config.json")

    # allowed-hosts.js array must equal store-config.allowedHosts
    ah_path = os.path.join(data, "allowed-hosts.js")
    if not os.path.exists(ah_path):
        r.add_error(f"allowed-hosts.js: missing ({ah_path})")
    else:
        try:
            arr = _parse_allowed_hosts_js(ah_path)
        except (ValueError, OSError) as e:
            r.add_error(f"allowed-hosts.js: parse failure ({e})")
        else:
            if config is not None and arr != config.get("allowedHosts"):
                r.add_error(f"allowed-hosts.js array {arr} != store-config.allowedHosts "
                            f"{config.get('allowedHosts')}")

    # mattresses.csv header == live EN contract
    en_path = os.path.join(data, "mattresses.csv")
    if not os.path.exists(en_path):
        r.add_error(f"mattresses.csv: missing ({en_path})")
    else:
        exp = schema.get_column_headers("Mattresses", lang="")
        if _csv_header(en_path) != exp:
            r.add_error("mattresses.csv: header does not match the live schema contract")

    # mattresses-es.csv: validate header if present (the converter omits it when
    # there is no Spanish copy, so absence is not an error).
    es_path = os.path.join(data, "mattresses-es.csv")
    if os.path.exists(es_path):
        if _csv_header(es_path) != list(schema.MATTRESSES_ES_CSV_COLUMNS):
            r.add_error("mattresses-es.csv: header does not match the ES schema contract")
    elif languages and "es" in languages:
        r.add_warning("mattresses-es.csv absent (languages includes 'es'; ok if no "
                      "Spanish mattress copy was provided)")

    # accessories.json: top-level array, each item has id/name/category/image
    acc = load_json(os.path.join(data, "accessories.json"), "accessories.json")
    if acc is not None:
        if not isinstance(acc, list):
            r.add_error("accessories.json: top-level is not a JSON array")
        else:
            for i, a in enumerate(acc):
                if not isinstance(a, dict):
                    r.add_error(f"accessories.json[{i}]: not an object")
                    continue
                for k in ("id", "name", "category", "image"):
                    if k not in a:
                        r.add_error(f"accessories.json[{i}]: missing {k!r}")
                if _blank(a.get("image")):
                    r.add_error(f"accessories.json[{i}] ({a.get('id')}): image is empty")

    # manifest.json: required keys
    man = load_json(os.path.join(output_dir, "manifest.json"), "manifest.json")
    if man is not None:
        for k in ("name", "short_name", "description", "start_url",
                  "display", "orientation", "background_color", "theme_color"):
            if k not in man:
                r.add_error(f"manifest.json: missing key {k!r}")
        # When the manifest declares icons, each referenced file must exist at the
        # output root (icon src is relative to the manifest URL).
        if isinstance(man.get("icons"), list) and man["icons"]:
            for ic in man["icons"]:
                src = ic.get("src") if isinstance(ic, dict) else None
                if src and not os.path.exists(os.path.join(output_dir, src)):
                    r.add_error(f"manifest.json: icon {src!r} not found on disk")
            # M3: icon generation always emits apple-touch-icon.png alongside the
            # manifest icons (index.html references it via <link rel=apple-touch-icon>),
            # but it is not listed in manifest.icons, so verify it explicitly here.
            if not os.path.exists(os.path.join(output_dir, "apple-touch-icon.png")):
                r.add_error("manifest.json declares icons but apple-touch-icon.png is "
                            "missing at the output root (index.html references it)")

    # brand logos referenced by store-config must exist on disk. Only checked when
    # the brands image folder was emitted (mirrors the mattress-image guard below):
    # a no-image build has nothing to verify.
    if config is not None and os.path.isdir(os.path.join(output_dir, "images", "brands")):
        for b in (config.get("brands") or []):
            logo = b.get("logo")
            if logo and not os.path.exists(os.path.join(output_dir, logo)):
                r.add_error(f"store-config brand {b.get('name')!r}: logo file "
                            f"{logo!r} not found on disk")

    # mattresses.json: structural sanity (only when build-json actually produced it)
    if build_json:
        mj = load_json(os.path.join(data, "mattresses.json"), "mattresses.json")
        if mj is not None:
            images_dir = os.path.join(output_dir, "images", "mattresses")
            check_imgs = os.path.isdir(images_dir)
            for tier in ("gold", "silver", "bronze"):
                if tier not in mj:
                    r.add_error(f"mattresses.json: missing tier {tier!r}")
                elif not isinstance(mj[tier], list):
                    r.add_error(f"mattresses.json: tier {tier!r} is not a list")
                else:
                    for m in mj[tier]:
                        for k in ("id", "name", "imageUrl"):
                            if k not in m:
                                r.add_error(f"mattresses.json {tier} item missing {k!r}")
                        if _blank(m.get("imageUrl")):
                            r.add_error(f"mattresses.json ({m.get('id')}): imageUrl is empty")
                        elif check_imgs and not os.path.exists(os.path.join(output_dir, m.get("imageUrl"))):
                            r.add_warning(f"mattresses.json ({m.get('id')}): imageUrl "
                                          f"{m.get('imageUrl')!r} not found on disk")
    return r


# -- Entrypoint ---------------------------------------------------------------

def validate_bundle_inputs(raw_tabs, store_config, manifest=None, *,
                           source_images=None, skip_images=False,
                           require_gas_url: bool = False) -> ValidationReport:
    """Full input validation: workbook structure (V1), store-config values (V1),
    and catalog checks for mattresses/accessories/SalesNotes (V2), plus source-image
    existence when `source_images` is provided and not skipped. Caller passes the
    converter's parsed tabs and the assembled config/manifest."""
    langs = store_config.get("languages")
    r = ValidationReport()
    r.merge(validate_structure(raw_tabs))
    r.merge(validate_store_config(store_config, manifest, require_gas_url=require_gas_url))
    r.merge(validate_mattresses(raw_tabs, source_images=source_images,
                                skip_images=skip_images, languages=langs))
    r.merge(validate_accessories(raw_tabs, source_images=source_images,
                                 skip_images=skip_images, languages=langs))
    r.merge(validate_brands(raw_tabs, source_images=source_images,
                            skip_images=skip_images))
    r.merge(validate_app_icon(raw_tabs, source_images=source_images,
                              skip_images=skip_images))
    r.merge(validate_sales_notes(raw_tabs, languages=langs))
    return r


# -- Self-test (no pytest; stdlib only) ---------------------------------------

def _good_tabs():
    """A fully-valid raw_tabs (structure + catalog) for every schema tab - passes
    with zero errors and zero warnings under _good_config (languages en+es)."""
    tabs = {}
    for tab in schema.get_tab_names():
        headers = schema.get_column_headers(tab)
        req = [c.name for c in schema.required_columns(tab)]
        row = {h: ("x" if h in req else "") for h in headers}
        tabs[tab] = (headers, [row])
    tabs["Brands"][1][0].update({"Brand Name": "Acme"})
    tabs["Mattresses"][1][0].update({
        "tier": "gold", "id": "m1", "name": "Athena", "brand": "Acme",
        "firmnessScore": "5", "features": "hybrid",
        # Parity-clean under the per-component EN<->ES rule: every optional
        # component is either bilateral or absent in both languages.
        "reason_default": "Great bed", "reason_default (ES)": "Gran cama",
        "highlight": "en-copy", "highlight (ES)": "es-copy",
    })
    tabs["Accessories"][1][0].update({
        "ID": "a1", "Name": "Pillow", "Name (ES)": "Almohada",
        "Category": "Pillows", "Category (ES)": "Almohadas", "Price": 100,
        "Description": "Soft", "Description (ES)": "Suave",
        "Image File Name": "images/accessories/a1.jpg", "Match Tags": "all",
    })
    tabs["SalesNotes"][1][0].update({
        "Type": "brand", "Key": "Acme", "Story": "Family-owned since 1900",
    })
    return tabs


def _good_config():
    return {
        "storeName": "Acme Mattress",
        "storeKey": "acme",
        "languages": ["en", "es"],
        "logo": {"main": "acme", "sub": "mattress"},
        "colors": {"storePrimary": "#123abc", "storePrimaryLight": "#2244cc",
                   "storePrimaryGlow": "rgba(1,2,3,0.15)", "accent": "#b8935d"},
        "gasUrl": "https://script.google.com/macros/s/AKxyz/exec",
        "publicAssetRoot": "https://acme.github.io/DreamFinder/",
        "allowedHosts": ["acme.github.io"],
        "discount": {"codePrefix": "DREAM", "codeDigits": 3},
    }


def _good_manifest():
    return {"name": "DreamFinder - Acme", "start_url": "/DreamFinder/"}


def _self_test() -> int:
    passed = failed = 0

    def check(name, cond):
        nonlocal passed, failed
        if cond:
            passed += 1
            print(f"  [ok]   {name}")
        else:
            failed += 1
            print(f"  [FAIL] {name}")

    # minimal valid sample passes
    r = validate_bundle_inputs(_good_tabs(), _good_config(), _good_manifest())
    check("valid sample passes", r.ok and not r.warnings)

    # missing required tab
    t = _good_tabs(); del t["SalesNotes"]
    check("missing required tab -> error",
          any("missing required tab" in e for e in validate_structure(t).errors))

    # duplicate header
    t = _good_tabs()
    h, rows = t["Brands"]; t["Brands"] = (h + [h[0]], rows)
    check("duplicate header -> error",
          any("duplicate header" in e for e in validate_structure(t).errors))

    # Store Info multiple rows
    t = _good_tabs(); h, rows = t["Store Info"]; t["Store Info"] = (h, rows + [dict(rows[0])])
    check("Store Info multiple rows -> error",
          any("expected exactly 1 data row" in e for e in validate_structure(t).errors))

    # missing schema-required value (reason_default became optional in the
    # 2026-08-08 claim-governance retirement pass; 'features' is still required)
    t = _good_tabs(); h, rows = t["Mattresses"]; rows[0]["features"] = ""
    check("missing required cell -> error",
          any("features" in e for e in validate_structure(t).errors))

    # invalid hex color
    c = _good_config(); c["colors"]["storePrimary"] = "8B1A1A"
    check("invalid hex color -> error",
          any("storePrimary" in e for e in validate_store_config(c).errors))

    # missing allowedHosts
    c = _good_config(); c["allowedHosts"] = []
    check("missing allowedHosts -> error",
          any("allowedHosts is empty" in e for e in validate_store_config(c).errors))

    # allowedHosts with protocol
    c = _good_config(); c["allowedHosts"] = ["https://acme.github.io"]
    check("allowedHosts with protocol -> error",
          any("must not include a protocol" in e for e in validate_store_config(c).errors))

    # allowedHosts with localhost
    c = _good_config(); c["allowedHosts"] = ["acme.github.io", "localhost"]
    check("allowedHosts with localhost -> error",
          any("localhost" in e for e in validate_store_config(c).errors))

    # publicAssetRoot missing trailing slash
    c = _good_config(); c["publicAssetRoot"] = "https://acme.github.io/DreamFinder"
    check("publicAssetRoot no trailing slash -> error",
          any("trailing slash" in e for e in validate_store_config(c).errors))

    # blank gasUrl -> informational note only by default (documented pre-launch
    # state; must not block --warnings-as-errors gates), error under require_gas_url
    c = _good_config(); c["gasUrl"] = ""
    r = validate_store_config(c)
    check("blank gasUrl -> no error/warning by default",
          r.ok and not any("gasUrl" in w for w in r.warnings))
    r = validate_store_config(c, require_gas_url=True)
    check("blank gasUrl -> error under require_gas_url",
          not r.ok and any("gasUrl" in e for e in r.errors))

    # --require-gas-url promotes gasUrl to error
    c = _good_config(); c["gasUrl"] = ""
    r = validate_store_config(c, require_gas_url=True)
    check("require_gas_url promotes gasUrl to error",
          any("gasUrl" in e for e in r.errors))

    # Trust gate: preview-only privacy wording is rejected under a LIVE gasUrl
    # (_good_config's gasUrl is live), accepted under a blank one, and live-mode
    # wording passes either way. Both language blocks and every prose key.
    c = _good_config(); c["text"] = {"emailPrivacy": "Preview mode: nothing is sent from this tablet."}
    r = validate_store_config(c)
    check("preview-mode privacy wording under a live gasUrl -> error",
          not r.ok and any("preview-mode wording" in e and "text.emailPrivacy" in e for e in r.errors))
    c = _good_config(); c["text_es"] = {"privacyBody": "Tus respuestas permanecen en esta tableta."}
    r = validate_store_config(c)
    check("preview-mode wording in the ES block under a live gasUrl -> error",
          not r.ok and any("text_es.privacyBody" in e for e in r.errors))
    for key in PRIVACY_PROSE_KEYS:
        c = _good_config(); c["text"] = {key: "Nothing leaves this tablet."}
        check(f"preview-mode wording in text.{key} under a live gasUrl -> error",
              any(f"text.{key}" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["gasUrl"] = ""
    c["text"] = {"emailPrivacy": "Preview mode: nothing is sent from this tablet."}
    r = validate_store_config(c)
    check("the same preview-mode wording under a BLANK gasUrl -> accepted (it is true there)",
          r.ok)
    c = _good_config(); c["text"] = {"emailPrivacy": "We'll only use your email to send your results."}
    c["text_es"] = {"emailPrivacy": "Solo usaremos tu correo para enviarte tus resultados."}
    check("live-mode privacy wording under a live gasUrl -> accepted",
          validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"heritage": "nothing is sent"}
    check("the rule reads only privacy prose keys (other text keys are not privacy statements)",
          validate_store_config(c).ok)
    # The gate keys on the RUNTIME's notion of live (any non-blank gasUrl), and
    # a non-blank placeholder is itself an error: the kiosk would speak
    # live-mode copy and POST to the sentinel.
    for sentinel in ("TODO", "PLACEHOLDER", "https://example.com/exec", "todo"):
        c = _good_config(); c["gasUrl"] = sentinel
        c["text"] = {"privacyBody": "Your answers stay on this tablet."}
        r = validate_store_config(c)
        check(f"non-blank placeholder gasUrl {sentinel!r} -> error, and preview wording under it -> error",
              not r.ok and any("non-blank placeholder" in e for e in r.errors)
              and any("preview-mode wording" in e for e in r.errors))
    c = _good_config(); c["gasUrl"] = "TODO"
    check("a non-blank placeholder gasUrl is an error even with nothing else wrong",
          any("non-blank placeholder" in e for e in validate_store_config(c).errors))
    # External review P2 at `aa08e7e` (2026-08-22): the kiosk reads gasUrl RAW
    # (`!!gasUrl`, `if (gasUrl && ...)` before fetch), so a whitespace-only
    # value is LIVE there. Admission keys on that same raw truthiness: the
    # value is refused as a non-blank placeholder, and preview prose under it
    # is refused too — never admitted as "blank".
    c = _good_config(); c["gasUrl"] = "   "
    r = validate_store_config(c)
    check("a whitespace-only gasUrl is live at runtime -> non-blank placeholder error (whitespace counts)",
          not r.ok and any("non-blank placeholder" in e and "whitespace counts" in e for e in r.errors))
    c = _good_config(); c["gasUrl"] = "  \t "; c["text"] = {"privacyBody": "Nothing leaves this tablet."}
    r = validate_store_config(c)
    check("whitespace-only gasUrl + preview prose -> BOTH the placeholder error and the preview-wording error",
          any("non-blank placeholder" in e for e in r.errors)
          and any("preview-mode wording" in e for e in r.errors))
    for blank_like in ("", None):
        c = _good_config(); c["gasUrl"] = blank_like; c["text"] = {"privacyBody": "Nothing leaves this tablet."}
        check(f"gasUrl {blank_like!r} is falsy at runtime -> preview prose accepted",
              validate_store_config(c).ok)
    c = _good_config(); c["gasUrl"] = "  https://script.google.com/macros/s/AKxyz/exec  "
    c["text"] = {"privacyBody": "Nothing leaves this tablet."}
    check("a padded real endpoint is live-capable -> preview prose rejected (strip never hides a live value)",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    check("_runtime_truthy mirrors JS: '' None False 0 -> False; '   ' 'x' True 1 {} [] -> True",
          not any(_runtime_truthy(v) for v in ("", None, False, 0))
          and all(_runtime_truthy(v) for v in ("   ", "x", True, 1, {}, [])))
    # The proposed preview sentences from the investigation and the audits are
    # all caught; live-appropriate wording is not.
    for phrase in ("Your answers aren't saved or sent anywhere.",
                   "This kiosk does not send or store your answers.",
                   "We don't store your answers.",
                   "Your answers are not stored or transmitted.",
                   "No email is sent in this preview.",
                   "Tus respuestas no se guardan ni se envían a ningún lado."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"proposed preview sentence is caught under a live gasUrl: {phrase[:40]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"privacyBody": "DreamFinder does not send your information to lenders. "
                                                    "Your answers are never sent to lenders."}
    check("live-appropriate wording about lenders is not mis-rejected",
          validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"privacyBody": "Your answers are not sent to lenders.",
                                     "emailPrivacy": "We use your email to send your results."}
    check("'are not sent to lenders' (live-appropriate) is not mis-rejected, and the 'sent' family needs 'anywhere'",
          validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"privacyBody": "Your answers are not sent anywhere."}
    check("'are not sent anywhere' under a live gasUrl -> error",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    # External review (2026-08-22) thread 1, preserved as intentional: a
    # non-blank gasUrl is LIVE-CAPABLE for admission even while an active,
    # date-windowed scenario disables email at runtime — the scenario expires
    # without another build, and the preview promise would turn false on its
    # own. A temporary scenario must not relax the rule.
    def _blocking_scenario_config():
        c = _good_config()
        c["promotions"] = {"activeScenario": "demo",
                           "scenarios": {"demo": {"kind": "historical-demo",
                                                  "disableEmailSubmission": True}}}
        return c
    c = _blocking_scenario_config(); c["text"] = {"privacyBody": "Your answers stay on this tablet."}
    r = validate_store_config(c)
    check("live gasUrl + active scenario with disableEmailSubmission=true: preview wording is STILL rejected",
          any("preview-mode wording" in e for e in r.errors))
    c = _blocking_scenario_config(); c["text_es"] = {"emailPrivacy": "No se envía nada desde esta tableta."}
    check("the same under the ES block: a temporary scenario does not relax admission",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _blocking_scenario_config(); c["gasUrl"] = "TODO"; c["text"] = {"privacyBody": "Nothing leaves this tablet."}
    check("a placeholder gasUrl under a blocking scenario is still a non-blank placeholder error",
          any("non-blank placeholder" in e for e in validate_store_config(c).errors))
    c = _blocking_scenario_config(); c["gasUrl"] = ""; c["text"] = {"privacyBody": "Your answers stay on this tablet."}
    check("blank gasUrl under a blocking scenario: preview wording accepted (blank is the only preview-true state)",
          validate_store_config(c).ok)
    # External review (2026-08-22) thread 2, fixed: storage-negation phrases
    # are rejected only when the sentence is about governed data. Harmful
    # answer/contact storage claims still fail; an unrelated truthful storage
    # statement is not rejected.
    for phrase in ("Your answers are not stored.",
                   "We do not store your information.",
                   "We don't store your answers or your email.",
                   "Your contact information is never saved.",
                   "Quiz responses aren't saved by this kiosk.",
                   "Session data is not stored after you finish.",
                   "Tus respuestas no se guardan.",
                   "Tu información no se almacena en ningún servidor.",
                   "Tus datos no se guardan después de la sesión."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"governed-data storage claim under a live gasUrl -> error: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Payment card details are not stored by this application.",
                   "Card numbers are never stored here; financing is handled on lacks.com.",
                   "This kiosk does not store cookies.",
                   "Los datos de la tarjeta de pago no se guardan en esta aplicación.",
                   "No se almacenan números de tarjeta en este quiosco."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        c["text_es"] = {"privacyBody": phrase}
        check(f"unrelated truthful storage statement under a live gasUrl -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"privacyBody": "Payment card details are not stored by this application. "
                                                    "Your answers are not stored either."}
    check("sentence-scoped: an unrelated storage sentence does not launder a governed one in the same key",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"privacyBody": "Payment card details are not stored. "
                                                    "Nothing leaves this tablet."}
    check("unconditional signals still fire regardless of sentence context",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"disclaimerBody": "Your email is not stored; we do not keep a copy."}
    check("the storage rule reads every privacy prose key, not only privacyBody",
          any("text.disclaimerBody" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["gasUrl"] = ""; c["text"] = {"privacyBody": "Your answers are not stored."}
    check("a governed-data storage claim under a BLANK gasUrl is accepted (true in preview)",
          validate_store_config(c).ok)
    check("_preview_signal_hit: unconditional phrase wins even without governed context",
          _preview_signal_hit("nothing is sent from here") == "nothing is sent")
    check("_preview_signal_hit: bare storage phrase without governed context -> None",
          _preview_signal_hit("card details are not stored") is None)
    check("_preview_signal_hit: storage phrase with governed context -> the phrase",
          _preview_signal_hit("your answers are not stored") == "not stored")
    # External review thread 4 (2026-08-22): the negation binds to the noun
    # phrase in ITS clause, not to any governed word elsewhere in the sentence.
    for phrase in ("During your showroom session, payment card details are not stored by this application.",
                   "To keep your session quick, card numbers are never stored here.",
                   "After your quiz, financing details are not saved on this kiosk.",
                   "Durante tu sesión en la tienda, los datos de la tarjeta no se guardan en esta aplicación.",
                   "Para agilizar tu sesión, no se almacenan números de tarjeta en este quiosco.",
                   "We do not store card numbers, even during your session."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"clause-bound: governed word elsewhere in the sentence does not reject an unrelated claim: {phrase[:44]!r}",
              validate_store_config(c).ok)
    for phrase in ("During your showroom session, your answers are not stored by this application.",
                   "Your answers, like everything else, are not stored.",
                   "Your answers (and your email) are not stored.",
                   "We use your email to send results. It is not stored.",
                   "We do not store anything about your session.",
                   "No se guardan tus respuestas en este quiosco.",
                   "Usamos tu correo para enviarte resultados. No se guarda."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"clause-bound, fail closed: a governed subject/object still rejects: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Tus respuestas, como todo lo demás, no se guardan en este quiosco.",
                   "Durante tu sesión, tus respuestas no se almacenan en ningún servidor."):
        c = _good_config(); c["text_es"] = {"privacyBody": phrase}
        check(f"ES reflexive: an adverbial after the verb is not the object, so the subject still binds: {phrase[:40]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"privacyBody": "Card numbers go to lacks.com. They are not stored here."}
    check("a pronoun subject binds to the previous sentence: unrelated antecedent -> accepted",
          validate_store_config(c).ok)
    # External review threads 5 and 6 (2026-08-22): every occurrence of a
    # signal is inspected, and clause conjunctions delimit the bound phrase.
    for phrase in ("Payment card details are not stored, but your answers are not stored.",
                   "Card numbers are never stored; your email is never stored either.",
                   "Los números de tarjeta no se guardan, pero tus respuestas no se guardan tampoco."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"every occurrence is inspected: a later governed clause still rejects: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Your answers are emailed but payment card details are not stored.",
                   "Your answers build your matches while card numbers are never stored here.",
                   "Although your answers are used for your matches, card details are not saved.",
                   "Tus respuestas se envían por correo pero los números de tarjeta no se guardan.",
                   "Aunque tus respuestas crean tus resultados, los datos de la tarjeta no se almacenan."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"conjunction-delimited clause: the unrelated claim binds to its own clause -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    for phrase in ("Your email and card numbers are not stored.",
                   "Your answers are emailed and payment card details are not stored."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"deliberately fail closed: 'and' coordinates noun phrases, so it does not delimit -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    # External review thread 7 (2026-08-22): contractions, "won't be", the
    # keep/retain verbs and the Spanish active forms are in the family.
    for phrase in ("Your answers aren't stored.", "Your email isn't saved.",
                   "Your answers won't be stored after this session.",
                   "We won't keep your answers.", "We do not keep your information.",
                   "We never retain your contact information.", "Your responses aren't kept.",
                   "No guardamos tus respuestas.", "No conservamos tu correo.",
                   "Nunca se guardan tus respuestas.", "Tus datos no se conservan.",
                   "No retenemos tu información."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"storage family covers contractions/keep/retain/ES active forms -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Card numbers aren't stored here.", "We won't keep card numbers.",
                   "Cookies are never kept by this kiosk.", "No guardamos números de tarjeta.",
                   "No se conservan los datos de la tarjeta."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"the wider family is still clause-bound: unrelated claim accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    # External review thread 8 (2026-08-22): the family is grammatical, not
    # enumerated — typographic apostrophes fold to ASCII and every tense /
    # auxiliary of the negation is one rule.
    for phrase in ("Your answers weren\u2019t stored.", "Your answers weren't stored.",
                   "Your email wasn\u2019t saved.", "Your answers cannot be stored.",
                   "Your responses will not be kept.", "Your answers are no longer stored.",
                   "Your answers can\u2019t be retained.", "We didn't store your answers.",
                   "We\u2019ll never save your email.", "Tus respuestas jam\u00e1s se guardan.",
                   "No se guardar\u00e1n tus respuestas.", "Nunca almacenaremos tu informaci\u00f3n."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"grammatical family + apostrophe folding -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Card numbers weren\u2019t stored.", "Cookies can\u2019t be retained by this kiosk.",
                   "Los n\u00fameros de tarjeta jam\u00e1s se guardan."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"the grammatical family is still clause-bound: unrelated claim accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"emailPrivacy": "Nothing is sent from this tablet \u2014 it isn\u2019t connected."}
    check("apostrophe folding applies to the unconditional signals too (\u2019isn\u2019t connected\u2019)",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    # External review thread 9 (2026-08-22): adverbs and auxiliaries between
    # the negation and the verb.
    for phrase in ("Your answers are not permanently stored.", "We do not permanently store your answers.",
                   "Your answers won't be permanently kept.", "We will never store your answers.",
                   "We do not ever retain your email.",
                   "Usamos tus respuestas para crear tus resultados. No las guardamos.",
                   "Tus respuestas no se guardan permanentemente.",
                   "Tu correo solo sirve para enviarte resultados. Nunca lo almacenamos en ning\u00fan servidor."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"adverb/auxiliary between negation and verb -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"privacyBody": "Card numbers are not permanently stored."}
    check("adverb gap is still clause-bound: unrelated subject accepted", validate_store_config(c).ok)
    c = _good_config(); c["text_es"] = {"privacyBody": "No las guardamos."}
    check("an object pronoun with no antecedent binds to nothing (consistent with 'It is not stored.' alone)",
          validate_store_config(c).ok)
    c = _good_config(); c["text"] = {"privacyBody": "We use your email to send results. We do not keep it on any server."}
    check("a pronoun object followed by an adverbial widens to the previous sentence (governed antecedent -> rejected)",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    c = _good_config(); c["text"] = {"privacyBody": "Card numbers go to lacks.com. We do not keep them on any server."}
    check("the same with an unrelated antecedent -> accepted", validate_store_config(c).ok)
    # External review thread 10 (2026-08-22): transmission negations are in
    # the family, rejected only when absolute and about governed data.
    for phrase in ("Your answers are not transmitted.", "Your answers are never transmitted anywhere.",
                   "Your answers are not sent.", "We do not share your information with anyone.",
                   "Your email is not transmitted to any other party.", "Your answers are not uploaded elsewhere.",
                   "Tus respuestas no se env\u00edan.", "Tus respuestas nunca se transmiten a nadie.",
                   "No compartimos tu informaci\u00f3n con nadie."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"absolute transmission negation about governed data -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Your answers are not transmitted to lenders.", "Payment card details are not transmitted.",
                   "Your answers are not sent unless you choose to email them.",
                   "Your answers are not shared with lenders or advertisers.",
                   "DreamFinder does not send your information to lenders.",
                   "Tus respuestas no se transmiten a prestamistas.", "Tus respuestas no se env\u00edan a prestamistas.",
                   "No enviamos tu informaci\u00f3n a prestamistas.",
                   "Los datos de la tarjeta no se transmiten."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"qualified or unrelated transmission negation -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    check("_transmission_is_absolute: bare, universal, qualified, conditional",
          _transmission_is_absolute(" by this kiosk") and _transmission_is_absolute(" to anyone")
          and _transmission_is_absolute(" anywhere") and not _transmission_is_absolute(" to lenders")
          and not _transmission_is_absolute(" unless you choose to email them")
          and _transmission_is_absolute(" a nadie") and not _transmission_is_absolute(" a prestamistas"))
    # External review thread 11 (2026-08-22): an intensifier before a
    # universal destination does not make the claim qualified.
    for phrase in ("Your answers are not sent to absolutely anyone.",
                   "Your email is never shared with literally anybody else.",
                   "Your answers are not transmitted to any other party or system.",
                   "Tus respuestas no se envían absolutamente a nadie.",
                   "Tus respuestas nunca se comparten con ningún otro sitio."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"intensified universal destination stays absolute -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    check("_transmission_is_absolute: universal words anywhere in the destination",
          _transmission_is_absolute(" to absolutely anyone") and _transmission_is_absolute(" with literally anybody else")
          and _transmission_is_absolute(" a otro sitio") and not _transmission_is_absolute(" to our delivery partner"))
    # External review thread 13 (2026-08-22): the destination is scanned to
    # the end of its clause, so a coordinated universal is seen.
    for phrase in ("Your answers are not shared with our service providers or anyone else.",
                   "Your email is never sent to lenders, partners, advertisers or anybody else.",
                   "Your answers are not transmitted to our delivery partner or to any other company.",
                   "Tus respuestas no se comparten con nuestros proveedores ni con nadie más."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"coordinated destination ending in a universal stays absolute -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    check("_transmission_is_absolute: a universal late in a long coordinated destination is seen",
          _transmission_is_absolute(" with our service providers or anyone else")
          and not _transmission_is_absolute(" with our service providers or our delivery partner"))
    # External review thread 15 (2026-08-22): only the coordinated
    # continuation of the destination is scanned, not an unrelated clause.
    for phrase in ("Your answers are not shared with lenders, but anyone can ask us questions.",
                   "Your answers are not sent to lenders; anyone on our team can explain why.",
                   "Your email is not shared with advertisers, which is something anyone can verify.",
                   "Tus respuestas no se comparten con prestamistas, pero cualquiera puede preguntarnos."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"a universal in an unrelated following clause does not make the claim absolute -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    check("_destination_continuation: list items continue, a new clause stops",
          _destination_continuation(" with lenders", " with lenders, partners, advertisers or anybody else")
          == " with lenders  partners  advertisers or anybody else"
          and _destination_continuation(" with lenders", " with lenders, but anyone can ask us questions") == " with lenders"
          and _destination_continuation(" to lenders", " to lenders, and to anyone else") == " to lenders  and to anyone else")
    # External review threads 16 and 17 (2026-08-22): no length cap on a
    # coordinated segment; only comma-joined list items continue.
    for phrase in ("Your answers are not shared with lenders, our customer communication and cloud infrastructure service providers or anyone else.",
                   "Your email is never sent to lenders, our delivery partner, our customer communication and cloud infrastructure service providers, or anybody else.",
                   "Tus respuestas no se comparten con prestamistas, nuestros proveedores de comunicación y de infraestructura en la nube ni con nadie más."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"a long coordinated segment is still scanned to its universal -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    for phrase in ("Your answers are not sent to lenders — anyone needing help receives support.",
                   "Your answers are not sent to lenders: anyone needing help receives support.",
                   "Your answers are not sent to lenders (anyone needing help receives support).",
                   "Your answers are not sent to lenders, anyone needing help receives support from our team.",
                   "Tus respuestas no se envían a prestamistas — cualquiera que necesite ayuda recibe apoyo."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"a following clause (dash/colon/parenthesis, or a comma splice with a lexical verb) is not a destination -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    check("_destination_continuation: comma list items of any length with a coordinator continue; other separators stop",
          "anyone else" in _destination_continuation(" with lenders", " with lenders, our customer communication and cloud infrastructure service providers or anyone else")
          and _destination_continuation(" to lenders", " to lenders — anyone needing help receives support") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders, anyone needing help receives support from our team") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders, anyone") == " to lenders  anyone")
    check("_destination_continuation: separator semantics — colon/parenthesis stop, a coordinator-led dash continues",
          _destination_continuation(" to lenders", " to lenders: anyone") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders (anyone)") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders — or anyone else") == " to lenders  or anyone else"
          and _destination_continuation(" to lenders", " to lenders — anyone") == " to lenders")
    c = _good_config(); c["text"] = {"privacyBody": "Your answers are not sent to lenders — or anyone else."}
    check("an emphatic dash continuation ('— or anyone else') is still absolute -> rejected",
          any("preview-mode wording" in e for e in validate_store_config(c).errors))
    # External review thread 18 (2026-08-22): a coordinated CLAUSE (", and
    # anyone who asks receives support") is not a destination continuation.
    for phrase in ("Your answers are not sent to lenders, and anyone who asks receives support.",
                   "Your answers are not sent to lenders, and anyone needing help receives support.",
                   "Your answers are not shared with advertisers, or anyone on our team explains why.",
                   "Tus respuestas no se envían a prestamistas, y cualquiera que pregunte recibe ayuda."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"a coordinated clause after ', and' is not a destination -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    for phrase in ("Your answers are not sent to lenders, and to anyone else.",
                   "Your answers are not sent to lenders, or anyone else.",
                   "Your answers are not sent to lenders, and nobody else."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"', and/or' + a short universal item still continues the destination -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    check("_destination_continuation: a leading coordinator needs a short item after it; a relative pronoun stops",
          _destination_continuation(" to lenders", " to lenders, and anyone who asks receives support") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders, and anyone needing help receives support") == " to lenders"
          and _destination_continuation(" to lenders", " to lenders, and to anyone else") == " to lenders  and to anyone else")
    # External review thread 14 (2026-08-22): the determiner "any" / "ningún"
    # before a noun is SCOPED (the quantified form of "to lenders"), not
    # universal; only pronouns and universal phrases are absolute.
    for phrase in ("Your answers are not sent to absolutely any lender.",
                   "Your email is not transmitted to any third party.",
                   "Your answers are never shared with any advertiser.",
                   "Tus respuestas no se envían a ningún prestamista.",
                   "Tu correo nunca se comparte con ninguna empresa de publicidad."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"scoped determiner destination is a qualified claim -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    check("_transmission_is_absolute: determiner + noun is scoped; pronoun and 'any other' are universal",
          not _transmission_is_absolute(" to any lender") and not _transmission_is_absolute(" a ningún prestamista")
          and _transmission_is_absolute(" to any other party") and _transmission_is_absolute(" to anything else")
          and _transmission_is_absolute(" a ningún sitio"))
    # External review thread 12 (2026-08-22): the gap admits only auxiliaries
    # and adverbs, so a claim about what lenders are asked to do is not a
    # claim about the kiosk.
    for phrase in ("We do not ask lenders to store your answers.",
                   "We do not allow lenders to keep your answers.",
                   "We do not require partners to retain your email.",
                   "No pedimos a los prestamistas que guarden tus respuestas."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}; c["text_es"] = {"privacyBody": phrase}
        check(f"gap restricted to modifiers: a claim about lenders is not a kiosk storage claim -> accepted: {phrase[:44]!r}",
              validate_store_config(c).ok)
    for phrase in ("Your answers are not going to be stored.", "Your answers will not ever be stored.",
                   "Your answers are not at all stored.", "We do not simply store your answers."):
        c = _good_config(); c["text"] = {"privacyBody": phrase}
        check(f"gap still admits auxiliaries and adverbs -> rejected: {phrase[:44]!r}",
              any("preview-mode wording" in e for e in validate_store_config(c).errors))
    kinds = {k for k, *_ in _storage_matches("your answers aren't stored; we won't keep them; no se guardan; no guardamos; "
                                             "not transmitted; do not send; no se env\u00edan; no enviamos")}
    check("_storage_matches: every pattern kind is represented and sorted by position",
          kinds == {"passive", "active", "es_reflexive", "es_active",
                    "passive_transmit", "active_transmit", "es_reflexive_transmit", "es_active_transmit"}
          and [t[1] for t in _storage_matches("a not stored b not saved")] == sorted(t[1] for t in _storage_matches("a not stored b not saved")))
    check("_storage_matches: display carries the preceding word for a contraction",
          _storage_matches("your answers aren't stored")[0][3] == "aren't stored"
          and _storage_matches("your answers are not stored")[0][3] == "not stored")
    def _bind(sentence, which=0, prev=""):
        kind, start, end, _ = _storage_matches(sentence)[which]
        return _storage_claim_is_governed(sentence, prev, kind, start, end)
    check("_storage_claim_is_governed: binds the occurrence given, not the first",
          _bind("card details are not stored, but your answers are not stored", 0) is False
          and _bind("card details are not stored, but your answers are not stored", 1) is True)
    check("_storage_claim_is_governed: subject before the verb, in clause",
          _bind("during your session, card details are not stored") is False
          and _bind("during your session, your answers are not stored") is True)
    check("_storage_claim_is_governed: active object after the verb",
          _bind("we do not store card numbers") is False and _bind("we do not store your answers") is True)
    check("_has_content: pronouns and function words alone are not content",
          not _has_content(" it is ") and not _has_content("se") and _has_content("card details"))
    # Config-or-nothing consequence: a text block that leaves the two prose
    # keys blank is warned (the surfaces render nothing), never errored.
    c = _good_config(); c["text"] = {"heritage": "x"}
    r = validate_store_config(c)
    check("blank text.emailPrivacy / text.privacyBody -> two warnings naming the surfaces, no error",
          r.ok and sum(1 for w in r.warnings if "renders nothing" in w) == 2
          and any("emailPrivacy" in w for w in r.warnings) and any("privacyBody" in w for w in r.warnings))
    c = _good_config()
    check("a config with no text block at all is not warned (nothing was authored)",
          not any("renders nothing" in w for w in validate_store_config(c).warnings))

    # warnings_as_errors promotes allowedHosts-missing-Pages-host warning to blocking
    c = _good_config(); c["allowedHosts"] = ["someoneelse.github.io"]
    r = validate_store_config(c)
    check("allowedHosts missing Pages host -> warning",
          r.ok and any("does not include the publicAssetRoot host" in w for w in r.warnings))
    check("warnings_as_errors makes that warning blocking",
          r.blocking(warnings_as_errors=True) and not r.blocking(warnings_as_errors=False))

    # discount.codeDigits out of range
    c = _good_config(); c["discount"]["codeDigits"] = 2
    check("codeDigits out of range -> error",
          any("codeDigits" in e for e in validate_store_config(c).errors))

    # manifest.start_url empty
    m = dict(_good_manifest()); m["start_url"] = ""
    check("manifest.start_url empty -> error",
          any("manifest.start_url" in e for e in validate_store_config(_good_config(), m).errors))

    # ---- V2: catalog ----
    langs = ["en", "es"]

    # duplicate mattress id
    t = _good_tabs(); h, rows = t["Mattresses"]; t["Mattresses"] = (h, [rows[0], dict(rows[0])])
    check("duplicate mattress id -> error",
          any("duplicate id" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid tier
    t = _good_tabs(); t["Mattresses"][1][0]["tier"] = "platinum"
    check("invalid tier -> error",
          any("tier 'platinum'" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid mattress id slug
    t = _good_tabs(); t["Mattresses"][1][0]["id"] = "M 1"
    check("invalid mattress id slug -> error",
          any("not slug-safe" in e for e in validate_mattresses(t, languages=langs).errors))

    # firmness out of range
    t = _good_tabs(); t["Mattresses"][1][0]["firmnessScore"] = "11"
    check("firmness out of range -> error",
          any("firmnessScore" in e for e in validate_mattresses(t, languages=langs).errors))

    # brand not in Brands tab
    t = _good_tabs(); t["Mattresses"][1][0]["brand"] = "Nope"
    check("brand not in Brands tab -> error",
          any("not in the Brands tab" in e for e in validate_mattresses(t, languages=langs).errors))

    # duplicate lower(name) image collision
    t = _good_tabs(); h, rows = t["Mattresses"]
    r2 = dict(rows[0]); r2["id"] = "m2"; r2["name"] = "athena"
    t["Mattresses"] = (h, [rows[0], r2])
    check("duplicate lower(name) collision -> error",
          any("image filename collision" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid accessory score (negative)
    t = _good_tabs(); t["Accessories"][1][0]["Score: Cooling"] = "-1"
    check("negative accessory score -> error",
          any("Score: Cooling" in e for e in validate_accessories(t, languages=langs).errors))

    # accessory score 10 is allowed (Bel uses high 'default' weights)
    t = _good_tabs(); t["Accessories"][1][0]["Score: Default"] = 10
    check("accessory score 10 allowed (not 0-5 capped)",
          validate_accessories(t, languages=langs).ok)

    # duplicate accessory id
    t = _good_tabs(); h, rows = t["Accessories"]; t["Accessories"] = (h, [rows[0], dict(rows[0])])
    check("duplicate accessory id -> error",
          any("duplicate id" in e for e in validate_accessories(t, languages=langs).errors))

    # invalid accessory category
    t = _good_tabs(); t["Accessories"][1][0]["Category"] = "widgets"
    check("invalid accessory category -> error",
          any("category 'widgets'" in e for e in validate_accessories(t, languages=langs).errors))

    # accessory image basename != id is accepted when the cell is a full
    # images/accessories/<file>.jpg path
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/copper-ice.jpg"
    check("accessory full path, basename != id accepted",
          validate_accessories(t, languages=langs).ok)

    # G1: bare accessory image filename (no images/accessories/ prefix) -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "copper-ice.jpg"
    check("G1 bare accessory image path -> error",
          any("must be a full" in e and "images/accessories/" in e
              for e in validate_accessories(t, languages=langs).errors))

    # G1: full path but non-jpg extension -> error (live file is normalized to .jpg)
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/copper-ice.png"
    check("G1 accessory full path, wrong extension -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # G1: wrong directory prefix -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/mattresses/copper-ice.jpg"
    check("G1 accessory wrong directory prefix -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # G1: extra sub-path under images/accessories/ -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/sub/copper-ice.jpg"
    check("G1 accessory extra sub-path -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # invalid salesNote Type
    t = _good_tabs(); t["SalesNotes"][1][0] = {"Type": "vendor", "Key": "X"}
    check("invalid salesNote Type -> error",
          any("Type 'vendor'" in e for e in validate_sales_notes(t).errors))

    # subBrand full missing Lead/Demo/Close
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "subBrand", "Key": "Copper", "Format": "full",
                             "Lead": "", "Demo": "d", "Close": "c"}
    check("salesNote full missing Lead -> error",
          any("Lead is required" in e for e in validate_sales_notes(t).errors))

    # subBrand coaching missing RSA Note
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "subBrand", "Key": "Charcoal", "Format": "coaching",
                             "RSA Note": ""}
    check("salesNote coaching missing RSA Note -> error",
          any("RSA Note is required" in e for e in validate_sales_notes(t).errors))

    # brand salesNote missing Story
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "brand", "Key": "Acme", "Story": ""}
    check("brand salesNote missing Story -> error",
          any("Story is required" in e for e in validate_sales_notes(t).errors))

    # Malformed INNER quiz envelope: {"quiz": <array|scalar|null>} must become
    # a controlled "no parseable Quiz tab" error when consultation rows need
    # it - never an AttributeError from .get() on a non-dict (Codex, PR #17).
    def _consult_tabs(quiz_payload):
        tc = _good_tabs()
        tc["SalesNotes"][1].append({
            "Type": "consultation", "Key": "trigger.pain",
            "Implication": "copy", "Implication (ES)": "copia"})
        tc["Quiz"] = (tc["Quiz"][0], [{"Quiz JSON": quiz_payload}])
        return tc
    for label, inner in (("array", "[]"), ("string", "\"quiz\""), ("null", "null")):
        rep = validate_sales_notes(_consult_tabs('{"quiz": %s}' % inner))
        check(f"inner quiz envelope as {label} -> controlled error, no throw",
              any("no parseable Quiz tab" in e for e in rep.errors))
    rep = validate_sales_notes(_consult_tabs(
        '{"quiz": {"questions": [{"id": "trigger", '
        '"options": [{"id": "pain"}]}]}}'))
    check("inner quiz envelope as a real object -> completeness engages, 0 errors",
          rep.ok)

    # missing mattress source image when source-images provided
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "mattresses"))
        os.makedirs(os.path.join(d, "accessories"))
        t = _good_tabs()  # name "Athena" -> needs athena.* in d/mattresses (absent)
        check("missing mattress source image -> error",
              any("no source image" in e and "Mattresses" in e
                  for e in validate_mattresses(t, source_images=d, languages=langs).errors))
        check("missing accessory source image -> error",
              any("no source image" in e and "Accessories" in e
                  for e in validate_accessories(t, source_images=d, languages=langs).errors))

        # Brands: logo source existence (brands/ subdir of --source-images)
        os.makedirs(os.path.join(d, "brands"))
        tb = _good_tabs(); tb["Brands"][1][0]["Logo File Name"] = "acme.png"
        check("missing brand source logo -> error",
              any("no source logo" in e and "Brands" in e
                  for e in validate_brands(tb, source_images=d).errors))
        open(os.path.join(d, "brands", "acme.png"), "w").close()
        check("present brand source logo -> ok",
              validate_brands(tb, source_images=d).ok)
        check("blank brand logo -> ok (no source needed)",
              validate_brands(_good_tabs(), source_images=d).ok)
        check("brands source folder missing -> error",
              any("source logo folder not found" in e
                  for e in validate_brands(tb, source_images=os.path.join(d, "nope")).errors))

        # App icon (Store Info "App Icon File") - optional PWA icon source in logos/
        os.makedirs(os.path.join(d, "logos"))

        def _png(w, h):
            return (b"\x89PNG\r\n\x1a\n" + (13).to_bytes(4, "big") + b"IHDR"
                    + w.to_bytes(4, "big") + h.to_bytes(4, "big") + b"\x08\x06\x00\x00\x00")

        def _put_icon(w, h, name="app-icon.png"):
            with open(os.path.join(d, "logos", name), "wb") as f:
                f.write(_png(w, h))

        ti = _good_tabs(); ti["Store Info"][1][0]["App Icon File"] = "app-icon.png"
        check("app icon: blank -> ok (no source needed)",
              validate_app_icon(_good_tabs(), source_images=d).ok)
        check("app icon: missing source -> error",
              any("not found" in e and "App Icon File" in e
                  for e in validate_app_icon(ti, source_images=d).errors))
        _put_icon(512, 512)
        check("app icon: square >=512 png -> ok", validate_app_icon(ti, source_images=d).ok)
        _put_icon(400, 400)
        check("app icon: under 512px -> error",
              any(">= 512px" in e for e in validate_app_icon(ti, source_images=d).errors))
        _put_icon(512, 256)
        check("app icon: non-square -> error",
              any("must be square" in e for e in validate_app_icon(ti, source_images=d).errors))
        tj = _good_tabs(); tj["Store Info"][1][0]["App Icon File"] = "icon.jpg"
        check("app icon: non-png -> error",
              any("must be a .png" in e for e in validate_app_icon(tj).errors))
        # M2: App Icon File set but the run cannot generate icons -> blocking error.
        check("app icon: set but no --source-images -> error",
              any("cannot be generated" in e for e in validate_app_icon(ti).errors))
        check("app icon: set with --skip-image-normalization -> error",
              any("cannot be generated" in e
                  for e in validate_app_icon(ti, source_images=d, skip_images=True).errors))
        # ...and a valid run (source images, not skipped) does NOT trip the M2 gate.
        _put_icon(512, 512)
        check("app icon: source provided, not skipped -> no M2 error",
              not any("cannot be generated" in e
                      for e in validate_app_icon(ti, source_images=d).errors))

    # Per-component EN<->ES parity (claim-retirement slice, 2026-08-12).
    # One-sided EN: blanking every ES cell strands the fixture's EN
    # highlight and reason_default -> errors, not the old row-level warning.
    t = _good_tabs()
    for hh in [c for c in t["Mattresses"][0] if c.endswith(" (ES)")]:
        t["Mattresses"][1][0][hh] = ""
    rr = validate_mattresses(t, languages=langs)
    check("one-sided EN components -> errors (fallback laundering barred)",
          not rr.ok
          and any("highlight present in EN only" in e for e in rr.errors)
          and any("reason_default present in EN only" in e for e in rr.errors))
    # One-sided ES: copy present only in Spanish is equally barred.
    t = _good_tabs()
    t["Mattresses"][1][0]["topPickReason (ES)"] = "solo espanol"
    rr = validate_mattresses(t, languages=langs)
    check("one-sided ES component -> error",
          any("topPickReason present in ES only" in e for e in rr.errors))
    # Bilateral absence is VALID: retire every optional component in both
    # languages and the row passes clean (an omission is never a claim).
    t = _good_tabs()
    t["Mattresses"][1][0].update({
        "highlight": "", "highlight (ES)": "",
        "reason_default": "", "reason_default (ES)": "",
    })
    rr = validate_mattresses(t, languages=langs)
    check("bilateral absence of optional components -> valid, no warning",
          rr.ok and not rr.warnings)
    # Differentiator pair is ONE component: EN title with a fully blank ES
    # pair is one-sided; EN title + ES detail is bilateral and fine.
    t = _good_tabs()
    t["Mattresses"][1][0]["differentiator1Title"] = "Something"
    rr = validate_mattresses(t, languages=langs)
    check("differentiator pair one-sided (EN only) -> error",
          any("differentiator1 pair present in EN only" in e for e in rr.errors))
    t["Mattresses"][1][0]["differentiator1Detail (ES)"] = "Algo"
    rr = validate_mattresses(t, languages=langs)
    check("differentiator pair present on both sides -> valid",
          not any("differentiator1 pair" in e for e in rr.errors))
    # Badges: one-sided and count-mismatch are both errors; equal counts pass.
    t = _good_tabs()
    t["Mattresses"][1][0]["displayBadges"] = "Only EN"
    rr = validate_mattresses(t, languages=langs)
    check("badges one-sided -> error",
          any("displayBadges present in EN only" in e for e in rr.errors))
    t["Mattresses"][1][0]["displayBadges (ES)"] = "Uno|Dos"
    rr = validate_mattresses(t, languages=langs)
    check("badge count mismatch -> error",
          any("1 EN badge(s) but 2 ES" in e for e in rr.errors))
    t["Mattresses"][1][0]["displayBadges"] = "One|Two"
    rr = validate_mattresses(t, languages=langs)
    check("badge counts match -> valid",
          not any("displayBadges" in e for e in rr.errors))

    # ---- V3: post-emit output validation ----
    import tempfile

    def _write(path, text):
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)

    def _write_good_output(d, *, with_es=True, with_mj=False):
        data = os.path.join(d, "data")
        os.makedirs(data, exist_ok=True)
        _write(os.path.join(data, "store-config.json"),
               json.dumps({"storeName": "Acme", "allowedHosts": ["acme.github.io"]}))
        _write(os.path.join(data, "allowed-hosts.js"),
               'window.__DF_ALLOWED_HOSTS = ["acme.github.io"];\n')
        with open(os.path.join(data, "mattresses.csv"), "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(schema.get_column_headers("Mattresses", lang=""))
        if with_es:
            with open(os.path.join(data, "mattresses-es.csv"), "w", encoding="utf-8", newline="") as f:
                csv.writer(f).writerow(list(schema.MATTRESSES_ES_CSV_COLUMNS))
        _write(os.path.join(data, "accessories.json"), json.dumps(
            [{"id": "a1", "name": {"en": "P"}, "category": {"en": "Pillows"},
              "image": "images/accessories/a1.jpg"}]))
        _write(os.path.join(d, "manifest.json"), json.dumps(
            {"name": "n", "short_name": "s", "description": "d", "start_url": "/x/",
             "display": "standalone", "orientation": "landscape",
             "background_color": "#000", "theme_color": "#000"}))
        if with_mj:
            _write(os.path.join(data, "mattresses.json"), json.dumps(
                {"gold": [{"id": "g1", "name": "A", "imageUrl": "images/mattresses/a.jpg"}],
                 "silver": [], "bronze": []}))
        return d

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        check("post-emit valid output passes (build_json=False)",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        os.remove(os.path.join(d, "data", "store-config.json"))
        check("post-emit missing store-config -> error",
              any("store-config.json: missing" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "store-config.json"), "{not valid json")
        check("post-emit invalid JSON -> error",
              any("invalid JSON" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "allowed-hosts.js"),
               'window.__DF_ALLOWED_HOSTS = ["other.github.io"];\n')
        check("post-emit allowed-hosts mismatch -> error",
              any("allowed-hosts.js array" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "allowed-hosts.js"), "// no assignment here\n")
        check("post-emit allowed-hosts parse failure -> error",
              any("parse failure" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        with open(os.path.join(d, "data", "mattresses.csv"), "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(["wrong", "header"])
        check("post-emit mattresses.csv header mismatch -> error",
              any("mattresses.csv: header" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        man = json.load(open(os.path.join(d, "manifest.json"), encoding="utf-8"))
        del man["theme_color"]
        _write(os.path.join(d, "manifest.json"), json.dumps(man))
        check("post-emit manifest missing key -> error",
              any("manifest.json: missing key" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d, with_mj=False)
        check("post-emit mattresses.json missing when build_json=True -> error",
              any("mattresses.json: missing" in e
                  for e in validate_generated_outputs(d, build_json=True).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d, with_mj=False)
        check("post-emit mattresses.json not required when build_json=False",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "accessories.json"), json.dumps({"not": "array"}))
        check("post-emit accessories.json wrong shape -> error",
              any("top-level is not a JSON array" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        cfgp = os.path.join(d, "data", "store-config.json")
        cfg = json.load(open(cfgp, encoding="utf-8"))
        cfg["brands"] = [{"name": "Acme", "logo": "images/brands/acme.jpg"}]
        _write(cfgp, json.dumps(cfg))
        bdir = os.path.join(d, "images", "brands"); os.makedirs(bdir, exist_ok=True)
        _write(os.path.join(bdir, "acme.jpg"), "x")
        check("post-emit brand logo present -> ok",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)
        os.remove(os.path.join(bdir, "acme.jpg"))
        check("post-emit brand logo missing -> error",
              any("not found on disk" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        man = json.load(open(os.path.join(d, "manifest.json"), encoding="utf-8"))
        man["icons"] = [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]
        _write(os.path.join(d, "manifest.json"), json.dumps(man))
        _write(os.path.join(d, "icon-192.png"), "x")
        _write(os.path.join(d, "icon-512.png"), "x")
        _write(os.path.join(d, "apple-touch-icon.png"), "x")
        check("post-emit manifest icons present -> ok",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)
        # M3: apple-touch-icon.png must exist when the manifest declares icons.
        os.remove(os.path.join(d, "apple-touch-icon.png"))
        check("post-emit apple-touch-icon missing -> error",
              any("apple-touch-icon.png" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))
        _write(os.path.join(d, "apple-touch-icon.png"), "x")  # restore
        os.remove(os.path.join(d, "icon-512.png"))
        check("post-emit manifest icon missing -> error",
              any("icon 'icon-512.png' not found" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    # ---- promotions (scenario-aware) validation ----
    MIDS = {"g7", "s1", "s2", "g1"}

    def _pc(promos):
        return {"promotions": promos}

    good_promo = {
        "activeScenario": "demo",
        "scenarios": {"demo": {
            "kind": "historical-demo", "disableEmailSubmission": True,
            "disclosure": {"en": "Historical demo", "es": "Demo historica"},
            "items": [{"id": "p1", "eligibleMattressIds": ["g7"],
                       "badge": {"en": "B", "es": "B"}, "headline": {"en": "H", "es": "H"},
                       "evidenceStatus": "prior-research-observation",
                       "evidenceProvenance": "seen prior",
                       "sourceUrl": "https://www.wgrfurniture.com/x"}],
            "storewide": [{"id": "s20", "type": "reconstructed-storewide",
                           "badge": {"en": "E", "es": "E"}, "headline": {"en": "H", "es": "H"},
                           "evidenceStatus": "prior-research-observation", "evidenceProvenance": "x"}]}},
    }
    check("promotions valid scenario -> ok",
          validate_promotions(_pc(good_promo), mattress_ids=MIDS).ok)

    def _mut(**path_set):
        return json.loads(json.dumps(good_promo))

    dup = _mut(); dup["scenarios"]["demo"]["storewide"][0]["id"] = "p1"
    check("promotions duplicate id -> error",
          any("duplicate promotion id" in e for e in validate_promotions(_pc(dup), mattress_ids=MIDS).errors))

    badm = _mut(); badm["scenarios"]["demo"]["items"][0]["eligibleMattressIds"] = ["zzz"]
    check("promotions invalid mattress id -> error",
          any("not in mattresses" in e for e in validate_promotions(_pc(badm), mattress_ids=MIDS).errors))

    badacc = _mut(); badacc["scenarios"]["demo"]["items"][0]["eligibleAccessoryIds"] = ["nope"]
    check("promotions invalid accessory id -> error",
          any("not in accessories" in e
              for e in validate_promotions(_pc(badacc), mattress_ids=MIDS, accessory_ids={"base-x"}).errors))

    mes = _mut(); mes["scenarios"]["demo"]["items"][0]["headline"] = {"en": "H", "es": ""}
    check("promotions missing ES headline -> error",
          any("headline missing EN or ES" in e for e in validate_promotions(_pc(mes), mattress_ids=MIDS).errors))

    ua = _mut(); ua["activeScenario"] = "nope"
    check("promotions unknown activeScenario -> error",
          any("activeScenario" in e for e in validate_promotions(_pc(ua), mattress_ids=MIDS).errors))

    bev = _mut(); bev["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "bogus"
    check("promotions bad evidenceStatus -> error",
          any("evidenceStatus" in e for e in validate_promotions(_pc(bev), mattress_ids=MIDS).errors))

    _HOSTS = ["wgrfurniture.com", "www.wgrfurniture.com"]

    nws = _mut()
    nws["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "wgr-product-page"
    nws["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://purple.com/x"
    check("promotions non-allowlisted source -> error",
          any("allowlist" in e for e in validate_promotions(
              _pc(nws), mattress_ids=MIDS, allowed_source_hosts=_HOSTS).errors))
    check("promotions source-backed status without allowlist -> error (fail closed)",
          any("allowlist" in e for e in validate_promotions(
              _pc(nws), mattress_ids=MIDS).errors))
    ok_src = _mut()
    ok_src["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "retailer-product-page"
    ok_src["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://www.wgrfurniture.com/x"
    check("promotions allowlisted source (neutral status) -> ok",
          validate_promotions(_pc(ok_src), mattress_ids=MIDS,
                              allowed_source_hosts=_HOSTS).ok)

    arc = _mut()
    arc["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "wgr-full-page-archive"
    arc["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://web.archive.org/web/20260525/https://www.wgrfurniture.com/x"
    check("promotions archive of allowlisted host (legacy alias) -> ok",
          validate_promotions(_pc(arc), mattress_ids=MIDS,
                              allowed_source_hosts=_HOSTS).ok)

    nde = _mut(); nde["scenarios"]["demo"]["disableEmailSubmission"] = False
    check("promotions historical-demo without disableEmailSubmission -> error",
          any("disableEmailSubmission" in e for e in validate_promotions(_pc(nde), mattress_ids=MIDS).errors))

    ndd = _mut(); ndd["scenarios"]["demo"]["disclosure"] = {"en": "x", "es": ""}
    check("promotions active demo missing ES disclosure -> error",
          any("disclosure in EN and ES" in e for e in validate_promotions(_pc(ndd), mattress_ids=MIDS).errors))

    t20 = _mut(); t20["scenarios"]["demo"]["storewide"][0]["eligibleMattressIds"] = ["g7"]
    check("promotions 20% on product without eligibility -> error",
          any("eligibleForStorewide20" in e for e in validate_promotions(_pc(t20), mattress_ids=MIDS).errors))

    npp = _mut(); del npp["scenarios"]["demo"]["items"][0]["evidenceProvenance"]
    check("promotions prior-research-observation without provenance -> error",
          any("requires evidenceProvenance" in e for e in validate_promotions(_pc(npp), mattress_ids=MIDS).errors))

    eok = _mut(); eok["scenarios"]["demo"]["items"][0]["endsAt"] = "2026-06-16T23:59:59-05:00"
    check("promotions valid endsAt (ISO + offset) -> ok",
          not any("endsAt" in e for e in validate_promotions(_pc(eok), mattress_ids=MIDS).errors))

    enoff = _mut(); enoff["scenarios"]["demo"]["items"][0]["endsAt"] = "2026-06-16T23:59:59"
    check("promotions endsAt without timezone offset -> error",
          any("endsAt" in e for e in validate_promotions(_pc(enoff), mattress_ids=MIDS).errors))

    ebad = _mut(); ebad["scenarios"]["demo"]["items"][0]["endsAt"] = "soon"
    check("promotions malformed endsAt -> error",
          any("endsAt" in e for e in validate_promotions(_pc(ebad), mattress_ids=MIDS).errors))

    # ---- financing (Lacks Payment Choice) ------------------------------------
    _FHOSTS = ["lacks.com", "www.lacks.com", "synchrony.com"]

    def _fc(fin):
        return {"financing": fin, "discount": {"mode": "disabled"}}

    good_fin = {
        "enabled": True, "experience": "payment-choice",
        "verifiedAt": "2026-07-30T10:53:32-05:00", "maxAgeDays": 7,
        "sourceUrl": "https://www.lacks.com/financing",
        "savingsPassPolicy": "specialist_confirm",
        "exactPromotionsEnabled": False,
        # The BROWSER's allowlist. Required (and required to be sufficient for
        # every customer-reachable URL) whenever financing is enabled, so the
        # baseline fixture carries it exactly as a shipped config must.
        "allowedSourceHosts": ["lacks.com", "www.lacks.com"],
        # The baseline fixture declares experience='payment-choice', so it
        # carries the full D4 copy contract — every required key as a
        # non-blank bilingual object. Short placeholders on purpose: the
        # SHAPE is what this fixture pins, and the real wording is pinned
        # against the shipped config by tests/financing_totality_check.py and
        # tests/financing_copy_policy_check.mjs.
        "copy": dict(
            {"eyebrow": {"en": "E", "es": "E"}, "headline": {"en": "H", "es": "H"}},
            **{k: {"en": k, "es": k} for k in PAYMENT_CHOICE_REQUIRED_COPY}
        ),
        "plans": [{
            "id": "syn-9-99-72", "kind": "open-end-promotional-credit",
            "provider": "Synchrony",
            "verified": True, "verifiedAt": "2026-07-30T10:53:32-05:00",
            "sourceUrl": "https://www.lacks.com/financing",
            "apr": 9.99, "termMonths": 72, "minimumPurchase": 500,
            "paymentCalculationEnabled": False,
            # Promotional headlines are generated from apr/termMonths, so the
            # fixture carries the LITERAL generated strings rather than calling
            # the generator: a template change has to break these cases loudly
            # instead of moving in lockstep with them.
            "headline": {"en": "9.99% APR for 72 months",
                         "es": "9.99% APR por 72 meses"},
            "detail": {"en": "D", "es": "D"},
            "disclosure": {"en": "X", "es": "X"},
        }],
    }

    def _fmut():
        return json.loads(json.dumps(good_fin))

    check("financing absent -> ok (no-op)",
          validate_financing({}, allowed_source_hosts=_FHOSTS).ok)
    check("financing valid -> ok",
          validate_financing(_fc(good_fin), allowed_source_hosts=_FHOSTS).ok)

    fen = _fmut(); del fen["verifiedAt"]
    check("financing enabled without verifiedAt -> error",
          any("verifiedAt" in e for e in
              validate_financing(_fc(fen), allowed_source_hosts=_FHOSTS).errors))

    fbad = _fmut(); fbad["verifiedAt"] = "2026-07-30"  # no offset
    check("financing verifiedAt without offset -> error",
          any("verifiedAt" in e for e in
              validate_financing(_fc(fbad), allowed_source_hosts=_FHOSTS).errors))

    fhost = _fmut(); fhost["plans"][0]["sourceUrl"] = "https://evil.example.com/x"
    check("financing plan non-allowlisted source -> error",
          any("allowlist" in e for e in
              validate_financing(_fc(fhost), allowed_source_hosts=_FHOSTS).errors))

    fes = _fmut(); fes["plans"][0]["disclosure"] = {"en": "X", "es": ""}
    check("financing exact terms missing ES disclosure -> error",
          any("disclosure" in e for e in
              validate_financing(_fc(fes), allowed_source_hosts=_FHOSTS).errors))

    # COPY-15 is legacy guidance for a financing block that is NOT the D4
    # Payment Choice experience. Under payment-choice, emailBodyAvailable is
    # REQUIRED and emailBody is RETIRED, so neither half of the warning can
    # arise there — the fixture therefore drops `experience` for these two.
    fmail = _fmut(); del fmail["experience"]
    fmail["copy"]["emailBody"] = {"en": "B", "es": "B"}
    del fmail["copy"]["emailBodyAvailable"]
    check("financing emailBody without emailBodyAvailable -> warning (COPY-15)",
          any("emailBodyAvailable" in w for w in
              validate_financing(_fc(fmail), allowed_source_hosts=_FHOSTS).warnings))
    fmail["copy"]["emailBodyAvailable"] = {"en": "N", "es": "N"}
    check("financing emailBody with emailBodyAvailable -> no warning",
          not any("emailBodyAvailable" in w for w in
              validate_financing(_fc(fmail), allowed_source_hosts=_FHOSTS).warnings))

    # ---- the D4 Payment Choice copy contract --------------------------------
    check("D4: the baseline payment-choice fixture is valid as shipped",
          validate_financing(_fc(_fmut()), allowed_source_hosts=_FHOSTS).ok)
    for _rq in PAYMENT_CHOICE_REQUIRED_COPY:
        _miss = _fmut(); del _miss["copy"][_rq]
        check(f"D4: missing financing.copy.{_rq} -> error under payment-choice",
              any(f"copy.{_rq}" in e and "required" in e for e in
                  validate_financing(_fc(_miss), allowed_source_hosts=_FHOSTS).errors))
        _half = _fmut(); _half["copy"][_rq] = {"en": "X", "es": "   "}
        check(f"D4: blank ES on financing.copy.{_rq} -> error (half-translated control)",
              any(f"copy.{_rq}" in e for e in
                  validate_financing(_fc(_half), allowed_source_hosts=_FHOSTS).errors))
        _str = _fmut(); _str["copy"][_rq] = "single-language"
        check(f"D4: a plain string for financing.copy.{_rq} -> error (bilingual required)",
              any(f"copy.{_rq}" in e for e in
                  validate_financing(_fc(_str), allowed_source_hosts=_FHOSTS).errors))
        # ...and the SAME key is required when `experience` is ABSENT, because
        # the runtime does not read `experience` at all. This assertion used to
        # say the opposite ("not required without experience") and that is the
        # defect it now pins: an enabled config predating the field renders
        # every Payment Choice control regardless, reads this key by name, and
        # FC() returns '' for a key that is not there — so the validator was
        # passing configurations that ship a BLANK control to a customer.
        _noexp = _fmut(); del _noexp["experience"]; del _noexp["copy"][_rq]
        check(f"D4: financing.copy.{_rq} is required for ENABLED financing even "
              f"without `experience` (runtime parity)",
              any(f"copy.{_rq}" in e and "required" in e for e in
                  validate_financing(_fc(_noexp), allowed_source_hosts=_FHOSTS).errors))
    for _rt in sorted(PAYMENT_CHOICE_RETIRED_COPY):
        _res = _fmut(); _res["copy"][_rt] = {"en": "back", "es": "back"}
        check(f"D4: retired financing.copy.{_rt} -> error under payment-choice",
              any(f"copy.{_rt}" in e and "retired" in e for e in
                  validate_financing(_fc(_res), allowed_source_hosts=_FHOSTS).errors))
        # RETIRED copy is deliberately NOT widened the way required copy was.
        # The two are asymmetric because the runtime is asymmetric: a required
        # key is read by name and rendered, so its absence is a blank control a
        # customer sees; a retired key is read by nothing, so its presence is
        # inert. An agenda-era config predating `experience` legitimately still
        # carries `agendaMark` and friends, and erroring on them would break
        # exactly the backward compatibility `experience` was left optional to
        # preserve — for zero customer benefit. Retirement stays scoped to an
        # EXPLICIT payment-choice declaration.
        _res2 = _fmut(); del _res2["experience"]
        _res2["copy"][_rt] = {"en": "back", "es": "back"}
        check(f"D4: retired financing.copy.{_rt} is tolerated without the experience",
              not any(f"copy.{_rt}" in e and "retired" in e for e in
                      validate_financing(_fc(_res2), allowed_source_hosts=_FHOSTS).errors))
    check("D4: required and retired copy sets are disjoint",
          not (set(PAYMENT_CHOICE_REQUIRED_COPY) & set(PAYMENT_CHOICE_RETIRED_COPY)))

    # ---- runtime parity: the three states, as whole-config verdicts ---------
    # Stated once at config level rather than per key, so a future change that
    # widens or narrows the gate has to move all three at the same time.
    #
    # The rule being pinned: what the RUNTIME renders decides what the
    # validator requires. `financing.experience` selects nothing at runtime —
    # index.html never reads it — so it cannot be what decides whether the
    # copy those controls render is required.
    _rp_ok = _fmut(); del _rp_ok["experience"]
    check("D4 parity: enabled + NO experience + complete required copy -> valid",
          validate_financing(_fc(_rp_ok), allowed_source_hosts=_FHOSTS).ok)

    _rp_gap = _fmut(); del _rp_gap["experience"]; del _rp_gap["copy"]["reviewOption"]
    check("D4 parity: enabled + NO experience + a missing required key -> named error",
          any("copy.reviewOption" in e and "required" in e for e in
              validate_financing(_fc(_rp_gap), allowed_source_hosts=_FHOSTS).errors))

    _rp_off = _fmut(); del _rp_off["experience"]; _rp_off["enabled"] = False
    for _k in PAYMENT_CHOICE_REQUIRED_COPY:
        _rp_off["copy"].pop(_k, None)
    check("D4 parity: DISABLED + NO experience -> acquires NO required-copy obligation",
          not any(f"copy.{_k}" in e
                  for _k in PAYMENT_CHOICE_REQUIRED_COPY
                  for e in validate_financing(
                      _fc(_rp_off), allowed_source_hosts=_FHOSTS).errors))

    _rp_off2 = _fmut(); _rp_off2["enabled"] = False
    for _k in PAYMENT_CHOICE_REQUIRED_COPY:
        _rp_off2["copy"].pop(_k, None)
    check("D4 parity: DISABLED + explicit payment-choice -> still no copy obligation",
          not any(f"copy.{_k}" in e
                  for _k in PAYMENT_CHOICE_REQUIRED_COPY
                  for e in validate_financing(
                      _fc(_rp_off2), allowed_source_hosts=_FHOSTS).errors))

    # ---- experience + esReviewStatus ---------------------------------------
    _xp = _fmut(); _xp["experience"] = "sleep-plan"
    check("financing.experience outside the enum -> error",
          any("experience" in e for e in
              validate_financing(_fc(_xp), allowed_source_hosts=_FHOSTS).errors))
    _xp2 = _fmut(); _xp2["experience"] = ["payment-choice"]
    check("financing.experience of the wrong TYPE -> error (no hashing crash)",
          any("experience" in e for e in
              validate_financing(_fc(_xp2), allowed_source_hosts=_FHOSTS).errors))
    _xp3 = _fmut(); del _xp3["experience"]
    check("financing.experience absent -> no experience error (never required)",
          not any("experience" in e for e in
                  validate_financing(_fc(_xp3), allowed_source_hosts=_FHOSTS).errors))
    for _ok_status in sorted(FINANCING_ES_REVIEW_STATUSES):
        _rs = _fmut(); _rs["esReviewStatus"] = _ok_status
        check(f"financing.esReviewStatus '{_ok_status}' validates (shipped state stays legal)",
              not any("esReviewStatus" in e for e in
                      validate_financing(_fc(_rs), allowed_source_hosts=_FHOSTS).errors))
    _rs2 = _fmut(); _rs2["esReviewStatus"] = "approved"
    check("financing.esReviewStatus outside the enum -> error",
          any("esReviewStatus" in e for e in
              validate_financing(_fc(_rs2), allowed_source_hosts=_FHOSTS).errors))
    _rs3 = _fmut(); _rs3["esReviewStatus"] = 7
    check("financing.esReviewStatus of the wrong TYPE -> error",
          any("esReviewStatus" in e for e in
              validate_financing(_fc(_rs3), allowed_source_hosts=_FHOSTS).errors))

    # ---- canonical path identity: injective, and uniqueness is enforced -----
    check("path encoding keeps [A-Za-z0-9-] and hex-escapes everything else",
          _fin_path_id("promo", "Synchrony") == "promo-Synchrony"
          and _fin_path_id("plan", "lacks-in-house") == "plan-lacks-in-house"
          and _fin_path_id("promo", "Synchrony Bank") == "promo-Synchrony_20Bank"
          and _fin_path_id("promo", "Café") == "promo-Caf_c3_a9"
          and _fin_path_id("promo", "a_b") == "promo-a_5fb")
    # Values that COLLIDED under the retired slugifier must stay distinct.
    for _a, _b, _why in [
        ("Synchrony Bank", "Synchrony-Bank", "space vs hyphen"),
        ("Synchrony", "SYNCHRONY", "case (two distinct provider groups)"),
        ("Café", "Caf!", "non-ASCII vs punctuation"),
        ("General", "", "a real provider vs the no-provider fallback"),
        ("a b", "a-b", "space vs hyphen, again"),
        ("x_y", "x-y", "underscore vs hyphen"),
    ]:
        check(f"path ids stay distinct where the old slugifier collided: {_why}",
              _fin_path_id("promo", _a) != _fin_path_id("promo", _b))
    # TOTALITY. The module's own contract says validate_financing "never
    # raises" and turns malformed author input into a VERDICT. An unpaired
    # surrogate broke that: .encode("utf-8") raised, so the build produced a
    # traceback instead of a report -- and could not refuse the one config
    # shape that also breaks the runtime encoder. Found by adversarial review.
    _LONE = "a" + chr(0xD800) + "b"
    check("path encoding REFUSES an unpaired surrogate instead of raising",
          _fin_path_encode(_LONE) is None and _fin_path_id("plan", _LONE) is None)
    check("...and a well-formed astral character still encodes",
          _fin_path_encode("a" + chr(0x1F6CF) + "b") == "a_f0_9f_9b_8fb")
    # An INSTALLMENT plan, because that is the arm whose path id derives from
    # the plan id (the promotional arm derives from the provider, covered below).
    _sur = _fmut()
    _sur["plans"].append({
        "id": "lease" + _LONE + "own", "kind": "closed-end-installment",
        "provider": "Retailer", "verified": True,
        "verifiedAt": _sur["verifiedAt"],
        "sourceUrl": "https://www.lacks.com/financing",
        "headline": {"en": "In-House Credit", "es": "Credito Interno"},
        "detail": {"en": "D", "es": "D"},
        "disclosure": {"en": "X", "es": "X"}})
    _sur_rep = validate_financing(_fc(_sur), allowed_source_hosts=_FHOSTS)
    check("an unencodable plan id is a named ERROR, not a traceback",
          any("unpaired surrogate" in e for e in _sur_rep.errors))
    check("...and the report is still a report (validate_financing stayed total)",
          isinstance(_sur_rep.errors, list) and not _sur_rep.ok)
    _sur2 = _fmut(); _sur2["plans"][0]["provider"] = "Prov" + chr(0xDFFF)
    check("an unencodable PROVIDER is refused the same way",
          any("unpaired surrogate" in e for e in
              validate_financing(_fc(_sur2), allowed_source_hosts=_FHOSTS).errors))

    # NON-STRING IDENTITY VALUES. The mirror used to str()-serialise these, so
    # {"toString": None} became a valid-looking id HERE while the JS runtime
    # THREW on the same input — the two mirrors disagreed on exactly the value
    # that broke the browser. Both now refuse it, and the author still gets the
    # specific "id must be a string" error rather than a second message about
    # canonical ids.
    for _label, _bad in (("dict", {"toString": None}), ("list", [1, 2]),
                         ("int", 7), ("float", 1.5), ("bool", True),
                         ("dict-with-callable-looking-key", {"a": 1})):
        check(f"path encoding refuses a non-string identity value ({_label})",
              _fin_path_encode(_bad) is None and _fin_path_id("plan", _bad) is None)
    # AN EMPTY ENCODING IS AN IDENTITY ONLY FOR THE PROMOTIONAL GROUP. Refusing
    # non-strings while still admitting a blank one closed half the hole: a plan
    # with a null or blank id produced the TRUTHY stub id "plan-", which the
    # runtime treated as a selectable path.
    check("None/'' still map to the LEGITIMATE empty encoding at the encoder",
          _fin_path_encode(None) == "" and _fin_path_encode("") == "")
    check("a providerless promotional group keeps its identity",
          _fin_path_id("promo", None) == "promo-"
          and _fin_path_id("promo", "") == "promo-")
    for _kind in ("plan", "scenario"):
        check(f"a blank {_kind} identity is REFUSED, not turned into the stub '{_kind}-'",
              _fin_path_id(_kind, None) is None and _fin_path_id(_kind, "") is None)
    check("ordinary non-empty strings are unaffected for every kind",
          _fin_path_id("plan", "lacks-in-house") == "plan-lacks-in-house"
          and _fin_path_id("scenario", "mexico-delivery") == "scenario-mexico-delivery"
          and _fin_path_id("promo", "Synchrony") == "promo-Synchrony")
    for _blank_label, _blank in (("null", None), ("empty string", "")):
        _bl = _fmut()
        _bl["plans"].append({
            "id": _blank, "kind": "lease-to-own", "provider": "Retailer",
            "verified": True, "verifiedAt": _bl["verifiedAt"],
            "sourceUrl": "https://www.lacks.com/financing",
            "headline": {"en": "B", "es": "B"}, "detail": {"en": "D", "es": "D"}})
        _bl_rep = validate_financing(_fc(_bl), allowed_source_hosts=_FHOSTS)
        check(f"a {_blank_label} plan id keeps the required-id error",
              any("id is required" in e for e in _bl_rep.errors))
        check(f"...and a {_blank_label} id is NOT mis-reported as an unpaired surrogate",
              not any("unpaired surrogate" in e for e in _bl_rep.errors))
        check(f"...and validate_financing stays total for a {_blank_label} id",
              isinstance(_bl_rep.errors, list) and not _bl_rep.ok)
    _obj = _fmut()
    _obj["plans"].append({
        "id": {"toString": None}, "kind": "lease-to-own", "provider": "Retailer",
        "verified": True, "verifiedAt": _obj["verifiedAt"],
        "sourceUrl": "https://www.lacks.com/financing",
        "headline": {"en": "M", "es": "M"}, "detail": {"en": "D", "es": "D"}})
    _obj_rep = validate_financing(_fc(_obj), allowed_source_hosts=_FHOSTS)
    check("a non-string plan id keeps its own specific 'must be a string' error",
          any("must be a string" in e for e in _obj_rep.errors))
    check("...and is NOT also reported as an unpaired surrogate (one clear message)",
          not any("unpaired surrogate" in e for e in _obj_rep.errors))
    check("...and validate_financing stayed total (a report, not a traceback)",
          isinstance(_obj_rep.errors, list) and not _obj_rep.ok)

    check("a path id is safe as a DOM/CSS identifier (no colon, no space)",
          all(re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*",
                           _fin_path_id(_k, "Synchrony Bank / Café #1"))
              for _k in ("promo", "plan", "scenario")))
    # ---- per-surface placement policy (item 1.5) ---------------------------
    check("financing.surfaces absent -> valid (every surface enabled)",
          "surfaces" not in _fmut()
          and validate_financing(_fc(_fmut()), allowed_source_hosts=_FHOSTS).ok)
    for _combo in ({"drawer": False}, {"sleepSystem": False},
                   {"drawer": False, "sleepSystem": False},
                   {"drawer": True, "sleepSystem": True},
                   {"drawer": True, "sleepSystem": False}, {}):
        _sf = _fmut(); _sf["surfaces"] = dict(_combo)
        check(f"financing.surfaces {sorted(_combo.items())} -> valid",
              validate_financing(_fc(_sf), allowed_source_hosts=_FHOSTS).ok)
    for _bad_key in ("sleepsystem", "sleepSystems", "Drawer", "handoff",
                     "results", "sheet", ""):
        _sf = _fmut(); _sf["surfaces"] = {"drawer": False, _bad_key: False}
        check(f"financing.surfaces unknown key {_bad_key!r} -> error",
              any("addressable surface" in e for e in
                  validate_financing(_fc(_sf), allowed_source_hosts=_FHOSTS).errors))
    for _bad_val in ("false", "true", 0, 1, None, [], {}):
        _sf = _fmut(); _sf["surfaces"] = {"drawer": _bad_val}
        check(f"financing.surfaces.drawer {_bad_val!r} -> error (JSON boolean only)",
              any("surfaces.drawer" in e and "JSON boolean" in e for e in
                  validate_financing(_fc(_sf), allowed_source_hosts=_FHOSTS).errors))
    for _bad_shape in ("drawer", 7, True, [], 0.5):
        _sf = _fmut(); _sf["surfaces"] = _bad_shape
        check(f"financing.surfaces of the wrong TYPE ({_type_name(_bad_shape)}) -> error",
              any("surfaces must be an object" in e for e in
                  validate_financing(_fc(_sf), allowed_source_hosts=_FHOSTS).errors))
    check("the addressable surface set is exactly drawer + sleepSystem",
          FINANCING_SURFACES == {"drawer", "sleepSystem"})

    _dup = _fmut()
    _dup["plans"].append(json.loads(json.dumps(_dup["plans"][0])))
    _dup["plans"][1]["id"] = "syn-second"
    check("two promotional plans from ONE provider stay one path (no false collision)",
          not any("canonical id" in e for e in
                  validate_financing(_fc(_dup), allowed_source_hosts=_FHOSTS).errors))

    fdet = _fmut(); del fdet["plans"][0]["detail"]
    check("financing exact terms without adjacent conditions -> error",
          any("adjacent conditions" in e for e in
              validate_financing(_fc(fdet), allowed_source_hosts=_FHOSTS).errors))

    fcalc = _fmut(); fcalc["plans"][0]["paymentCalculationEnabled"] = True
    check("financing paymentCalculationEnabled=true -> error (V1 invariant)",
          any("paymentCalculationEnabled" in e for e in
              validate_financing(_fc(fcalc), allowed_source_hosts=_FHOSTS).errors))

    flto = _fmut()
    flto["plans"].append({"id": "lto", "kind": "lease-to-own", "apr": 99,
                          "headline": {"en": "H", "es": "H"}})
    check("financing lease-to-own with credit terms -> error",
          any("lease-to-own" in e for e in
              validate_financing(_fc(flto), allowed_source_hosts=_FHOSTS).errors))

    fwid = _fmut(); fwid["allowedSourceHosts"] = ["lacks.com", "sketchy.example"]
    check("financing allowedSourceHosts widening -> error",
          any("allowedSourceHosts" in e for e in
              validate_financing(_fc(fwid), allowed_source_hosts=_FHOSTS).errors))

    fstack = _fc(_fmut()); fstack["discount"]["mode"] = "illustrative"
    check("financing enabled + discount not disabled + no stackable policy -> error",
          any("discount.mode" in e for e in
              validate_financing(fstack, allowed_source_hosts=_FHOSTS).errors))

    fpol = _fmut(); fpol["savingsPassPolicy"] = "whatever"
    check("financing bad savingsPassPolicy -> error",
          any("savingsPassPolicy" in e for e in
              validate_financing(_fc(fpol), allowed_source_hosts=_FHOSTS).errors))

    fnoplans = _fmut(); fnoplans["plans"] = []
    check("financing enabled with no plans -> error",
          any("plans" in e for e in
              validate_financing(_fc(fnoplans), allowed_source_hosts=_FHOSTS).errors))

    fdis = _fmut(); fdis["enabled"] = False; del fdis["verifiedAt"]
    check("financing disabled -> light checks only, ok",
          validate_financing(_fc(fdis), allowed_source_hosts=_FHOSTS).ok)

    # future-verifiedAt rejection (observation timestamps cannot postdate now;
    # timestamps computed dynamically so the cases stay valid forever)
    from datetime import datetime, timezone, timedelta

    def _iso(delta_seconds):
        return (datetime.now(timezone.utc) + timedelta(seconds=delta_seconds)) \
            .isoformat(timespec="seconds")

    ffut = _fmut(); ffut["verifiedAt"] = _iso(3600)  # 1h in the future
    check("financing future top-level verifiedAt -> error",
          any("materially in" in e and "future" in e for e in
              validate_financing(_fc(ffut), allowed_source_hosts=_FHOSTS).errors))

    ffar = _fmut(); ffar["verifiedAt"] = "2062-07-30T10:00:00-05:00"  # typo year
    check("financing far-future (typo year) top-level verifiedAt -> error",
          any("future" in e for e in
              validate_financing(_fc(ffar), allowed_source_hosts=_FHOSTS).errors))

    fplanfut = _fmut()
    fplanfut["verifiedAt"] = _iso(-60)          # top-level fine (1 min ago)
    fplanfut["maxAgeDays"] = 7
    fplanfut["plans"][0]["verifiedAt"] = _iso(3600)  # plan 1h in the future
    check("financing future plan verifiedAt -> error",
          any("plans" in e and "future" in e for e in
              validate_financing(_fc(fplanfut), allowed_source_hosts=_FHOSTS).errors))

    fskew = _fmut()
    fskew["verifiedAt"] = _iso(120)             # +2 min: inside 5-min skew
    fskew["plans"][0]["verifiedAt"] = _iso(120)
    check("financing verifiedAt within clock skew -> ok",
          validate_financing(_fc(fskew), allowed_source_hosts=_FHOSTS).ok)

    # ---- URL safety: scheme / credentials / port / host (Commit D) -----------
    _DEAD_MX = "https://www.lacks.com/mexican-credit-application"

    def _url_err(field, url):
        m = _fmut()
        m[field] = url
        return any(f"financing.{field}" in e and "allowlisted host" in e for e in
                   validate_financing(_fc(m), allowed_source_hosts=_FHOSTS).errors)

    check("financing mexicoInfoUrl non-allowlisted host -> error",
          _url_err("mexicoInfoUrl", "https://evil.example.com/faq"))
    check("financing applicationUrl non-allowlisted host -> error",
          _url_err("applicationUrl", "https://evil.example.com/apply"))
    check("financing mexicoInfoUrl allowlisted https -> ok",
          validate_financing(_fc(dict(_fmut(), mexicoInfoUrl="https://www.lacks.com/faq")),
                             allowed_source_hosts=_FHOSTS).ok)

    fnonexact = _fmut()
    fnonexact["plans"].append({"id": "lto", "kind": "lease-to-own",
                               "sourceUrl": "https://evil.example.com/lto",
                               "headline": {"en": "H", "es": "H"}})
    check("financing NON-exact plan sourceUrl non-allowlisted -> error",
          any("lto" in e and "allowlisted host" in e for e in
              validate_financing(_fc(fnonexact), allowed_source_hosts=_FHOSTS).errors))

    for _label, _bad in (
            ("http scheme", "http://www.lacks.com/financing"),
            ("protocol-relative", "//www.lacks.com/financing"),
            ("relative path", "/financing"),
            ("javascript:", "javascript:alert(1)"),
            ("data:", "data:text/html,hi"),
            ("embedded credentials", "https://user@www.lacks.com/financing"),
            ("credentials with password", "https://u:p@www.lacks.com/financing"),
            ("non-default port", "https://www.lacks.com:8443/financing"),
            ("lookalike suffix host", "https://www.lacks.com.evil.example/financing"),
            ("lookalike prefix host", "https://wwwlacks.com/financing"),
            ("malformed", "https://"),
    ):
        check(f"financing sourceUrl {_label} -> error", _url_err("sourceUrl", _bad))

    check("financing sourceUrl explicit default port 443 -> ok",
          validate_financing(_fc(dict(_fmut(), sourceUrl="https://www.lacks.com:443/financing")),
                             allowed_source_hosts=_FHOSTS).ok)
    check("_is_allowed_source: https archive capture of allowlisted host -> True",
          _is_allowed_source("https://web.archive.org/web/20260525/https://www.lacks.com/x",
                             _FHOSTS))
    check("_is_allowed_source: http archive capture -> False (scheme)",
          not _is_allowed_source("http://web.archive.org/web/20260525/https://www.lacks.com/x",
                                 _FHOSTS))
    check("_is_allowed_source: archive of NON-allowlisted target -> False",
          not _is_allowed_source("https://web.archive.org/web/20260525/https://evil.example.com/x",
                                 _FHOSTS))

    # ---- mexicoApplicationUrl shape + anti-conflation (Commit D) -------------
    fmxobj = _fmut(); fmxobj["mexicoApplicationUrl"] = "https://www.lacks.com/x"
    check("financing mexicoApplicationUrl non-object -> error",
          any("must be an object" in e for e in
              validate_financing(_fc(fmxobj), allowed_source_hosts=_FHOSTS).errors))

    fmxver = _fmut()
    fmxver["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": "false"}
    check("financing mexicoApplicationUrl non-boolean verified -> error",
          any("verified must be a boolean" in e for e in
              validate_financing(_fc(fmxver), allowed_source_hosts=_FHOSTS).errors))

    fmxok = _fmut()
    fmxok["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
    check("financing unverified mexicoApplicationUrl stored but unused -> ok "
          "(allowlisted host does not imply availability)",
          validate_financing(_fc(fmxok), allowed_source_hosts=_FHOSTS).ok)

    # Variants a BROWSER normalizes onto the dead target must all collide.
    # Truth table verified against real Chrome and Node (same URL spec).
    _BS = chr(92)
    for _label, _variant in (
            ("exact", _DEAD_MX),
            ("trailing slash", _DEAD_MX + "/"),
            ("double trailing slash", _DEAD_MX + "//"),
            ("query string", _DEAD_MX + "?lang=es"),
            ("fragment", _DEAD_MX + "#form"),
            ("host case", "https://WWW.LACKS.COM/mexican-credit-application"),
            ("explicit default port", "https://www.lacks.com:443/mexican-credit-application"),
            ("dot-dot segment", "https://www.lacks.com/x/../mexican-credit-application"),
            ("single-dot segment", "https://www.lacks.com/./mexican-credit-application"),
            ("nested dot-dot", "https://www.lacks.com/a/b/../../mexican-credit-application"),
            ("dot-dot past root", "https://www.lacks.com/../mexican-credit-application"),
            ("percent-encoded dot-dot", "https://www.lacks.com/x/%2e%2e/mexican-credit-application"),
            ("percent-encoded dot-dot upper", "https://www.lacks.com/x/%2E%2E/mexican-credit-application"),
            ("trailing dot segment", _DEAD_MX + "/."),
            ("backslash separators",
             "https://www.lacks.com/x" + _BS + ".." + _BS + "mexican-credit-application"),
            ("embedded tab", "https://www.lacks.com/mexican-credit-app\tlication"),
            ("percent-encoded unreserved", "https://www.lacks.com/%6dexican-credit-application"),
    ):
        fconf = _fmut()
        fconf["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
        fconf["mexicoInfoUrl"] = _variant
        check(f"financing anti-conflation: dead URL reused as mexicoInfoUrl "
              f"({_label}) -> error",
              any("reuses the unverified mexicoApplicationUrl" in e for e in
                  validate_financing(_fc(fconf), allowed_source_hosts=_FHOSTS).errors))

    fplanconf = _fmut()
    fplanconf["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
    fplanconf["plans"][0]["sourceUrl"] = _DEAD_MX
    check("financing anti-conflation: dead URL reused as a plan sourceUrl -> error",
          any("reuses the unverified mexicoApplicationUrl" in e for e in
              validate_financing(_fc(fplanconf), allowed_source_hosts=_FHOSTS).errors))

    # Genuinely different paths must NEVER collide (no over-normalization).
    for _label, _distinct in (
            ("plain sibling path", "https://www.lacks.com/faq"),
            ("dead name nested under another path",
             "https://www.lacks.com/x/mexican-credit-application"),
            ("dot-dot resolving to a different path",
             "https://www.lacks.com/a/b/../mexican-credit-application"),
            ("path case differs", "https://www.lacks.com/Mexican-Credit-Application"),
            ("reserved %2F stays encoded (not a separator)",
             "https://www.lacks.com/x%2F..%2Fmexican-credit-application"),
            ("empty path segment", "https://www.lacks.com//mexican-credit-application"),
    ):
        fnocollide = _fmut()
        fnocollide["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
        fnocollide["mexicoInfoUrl"] = _distinct
        check(f"financing anti-conflation: NO false collision ({_label})",
              validate_financing(_fc(fnocollide), allowed_source_hosts=_FHOSTS).ok)

    # Malformed stored/candidate URLs must fail closed without crashing.
    for _label, _bad_pair in (
            ("malformed stored URL", {"url": "not a url", "verified": False}),
            ("empty stored URL", {"url": "", "verified": False}),
            ("stored URL missing", {"verified": False}),
    ):
        fmalconf = _fmut()
        fmalconf["mexicoApplicationUrl"] = _bad_pair
        _rep = validate_financing(_fc(fmalconf), allowed_source_hosts=_FHOSTS)
        check(f"financing anti-conflation: {_label} does not crash validation",
              isinstance(_rep.errors, list))

    check("_url_identity: malformed inputs return '' (fail closed)",
          all(_url_identity(_x) == "" for _x in
              ("", "not a url", "https://", "///", None, 42, "javascript:alert(1)")))

    fverified = _fmut()
    fverified["mexicoApplicationUrl"] = {"url": "https://www.lacks.com/faq", "verified": True}
    fverified["mexicoInfoUrl"] = "https://www.lacks.com/faq"
    check("financing anti-conflation applies only while verified is not true",
          validate_financing(_fc(fverified), allowed_source_hosts=_FHOSTS).ok)

    fnosrc = _fmut(); del fnosrc["plans"][0]["sourceUrl"]
    check("financing exact terms still require sourceUrl",
          any("exact terms require sourceUrl" in e for e in
              validate_financing(_fc(fnosrc), allowed_source_hosts=_FHOSTS).errors))

    # ---- staleness warning gated on operational enablement (Commit D) --------
    # Deterministic past stamp — never becomes date-sensitive.
    _OLD = "2020-01-01T00:00:00-05:00"
    fstale_on = _fmut()
    fstale_on["verifiedAt"] = _OLD
    fstale_on["plans"][0]["verifiedAt"] = _OLD
    fstale_on["exactPromotionsEnabled"] = True
    check("financing expired verifiedAt + exactPromotionsEnabled true -> warning",
          any("older than maxAgeDays" in w for w in
              validate_financing(_fc(fstale_on), allowed_source_hosts=_FHOSTS).warnings))

    for _label, _policy in (("absent", "__DEL__"), ("false", False),
                            ("malformed string", "true")):
        fstale_off = _fmut()
        fstale_off["verifiedAt"] = _OLD
        fstale_off["plans"][0]["verifiedAt"] = _OLD
        if _policy == "__DEL__":
            del fstale_off["exactPromotionsEnabled"]
        else:
            fstale_off["exactPromotionsEnabled"] = _policy
        _rep_off = validate_financing(_fc(fstale_off), allowed_source_hosts=_FHOSTS)
        check(f"financing expired verifiedAt + exactPromotions {_label} -> NO warning",
              not any("older than maxAgeDays" in w for w in _rep_off.warnings))
        if _policy != False:  # noqa: E712 — absent/malformed are also schema errors
            check(f"financing exactPromotions {_label} -> schema error",
                  any("exactPromotionsEnabled" in e for e in _rep_off.errors))

    # ---- exactPromotionsEnabled field-shape matrix (Commit E) ---------------
    check("financing exactPromotionsEnabled false (shipped initial state) -> ok",
          validate_financing(_fc(_fmut()), allowed_source_hosts=_FHOSTS).ok)

    ftrue = _fmut(); ftrue["exactPromotionsEnabled"] = True
    ftrue["verifiedAt"] = _iso(-60); ftrue["plans"][0]["verifiedAt"] = _iso(-60)
    check("financing exactPromotionsEnabled true + fresh evidence -> ok",
          validate_financing(_fc(ftrue), allowed_source_hosts=_FHOSTS).ok)

    fmissing = _fmut(); del fmissing["exactPromotionsEnabled"]
    check("financing exactPromotionsEnabled missing while enabled -> error",
          any("exactPromotionsEnabled is required" in e for e in
              validate_financing(_fc(fmissing), allowed_source_hosts=_FHOSTS).errors))

    for _label, _bad in (("null", None), ("string 'true'", "true"),
                         ("string 'false'", "false"), ("int 1", 1), ("int 0", 0),
                         ("float", 1.0), ("empty string", ""),
                         ("object", {"enabled": True}), ("array", [True])):
        fshape = _fmut(); fshape["exactPromotionsEnabled"] = _bad
        check(f"financing exactPromotionsEnabled {_label} -> error",
              any("exactPromotionsEnabled" in e for e in
                  validate_financing(_fc(fshape), allowed_source_hosts=_FHOSTS).errors))

    fdis_ok = _fmut(); fdis_ok["enabled"] = False
    del fdis_ok["verifiedAt"]; del fdis_ok["exactPromotionsEnabled"]
    check("financing disabled without the policy field -> ok (not required)",
          validate_financing(_fc(fdis_ok), allowed_source_hosts=_FHOSTS).ok)

    fdis_bad = _fmut(); fdis_bad["enabled"] = False
    del fdis_bad["verifiedAt"]; fdis_bad["exactPromotionsEnabled"] = "true"
    check("financing disabled with a non-boolean policy field -> error",
          any("exactPromotionsEnabled" in e for e in
              validate_financing(_fc(fdis_bad), allowed_source_hosts=_FHOSTS).errors))

    # Exact plan data keeps its full validation while the switch is false —
    # the source must not be allowed to rot structurally just because
    # presentation is disabled.
    for _label, _mutate, _expect in (
            ("unverified exact plan", lambda d: d["plans"][0].__setitem__("verified", False), "verified"),
            ("missing plan disclosure", lambda d: d["plans"][0].pop("disclosure"), "disclosure"),
            ("non-allowlisted plan source",
             lambda d: d["plans"][0].__setitem__("sourceUrl", "https://evil.example.com/x"), "allowlisted"),
            ("payment calculation enabled",
             lambda d: d["plans"][0].__setitem__("paymentCalculationEnabled", True), "paymentCalculationEnabled"),
            ("future plan stamp",
             lambda d: d["plans"][0].__setitem__("verifiedAt", _iso(3600)), "future"),
    ):
        frot = _fmut()          # exactPromotionsEnabled is False here
        _mutate(frot)
        check(f"financing exact-plan validation still applies while policy is false "
              f"({_label})",
              any(_expect in e for e in
                  validate_financing(_fc(frot), allowed_source_hosts=_FHOSTS).errors))

    ffut_on = _fmut()
    ffut_on["verifiedAt"] = _iso(3600)
    ffut_on["exactPromotionsEnabled"] = True
    check("financing future verifiedAt still errors regardless of enablement",
          any("future" in e for e in
              validate_financing(_fc(ffut_on), allowed_source_hosts=_FHOSTS).errors))

    fmal_on = _fmut()
    fmal_on["verifiedAt"] = "not-a-timestamp"
    fmal_on["exactPromotionsEnabled"] = True
    check("financing malformed verifiedAt still errors regardless of enablement",
          any("ISO-8601" in e for e in
              validate_financing(_fc(fmal_on), allowed_source_hosts=_FHOSTS).errors))

    # ---- ungated-copy exact-claim guard (Commit F) --------------------------
    # Fields rendered OUTSIDE financingTermsFresh()/financingPlanFresh() must
    # never state an exact claim, in EITHER operating state.
    _UNGATED_ERR = "renders outside the exact-terms gate"

    def _fin_with(mutate, policy=False):
        m = _fmut()
        m["exactPromotionsEnabled"] = policy
        if policy is True:
            m["verifiedAt"] = _iso(-60)
            for _p in m["plans"]:
                if _p.get("verifiedAt"):
                    _p["verifiedAt"] = _iso(-60)
        mutate(m)
        return validate_financing(_fc(m), allowed_source_hosts=_FHOSTS)

    def _ungated_rejected(label, mutate, policy=False):
        rep = _fin_with(mutate, policy)
        return any(_UNGATED_ERR in e and label in e for e in rep.errors)

    # Signal unit tests (detector behavior, independent of config plumbing)
    for _lbl, _txt, _want in (
            ("digits", "Get 0 percent for 48", True),
            ("percent", "Save 0% today", True),
            ("currency", "Only $52.82", True),
            ("APR word", "Ask about our APR", True),
            ("EN no-interest", "No interest if paid in full", True),
            ("EN interest-free", "Interest-free for a while", True),
            ("ES sin intereses", "Llevatelo sin intereses", True),
            ("ES cero interes", "Cero interes por tiempo limitado", True),
            ("EN per month", "Just ask per month", True),
            ("ES pagos mensuales", "Pregunta por pagos mensuales", True),
            ("ES al mes", "Desde al mes", True),
            # boundary: approved copy and retailer/product names stay clean
            ("Build My Credit", "Build My Credit", False),
            ("in-house title", "Lacks In-House Credit", False),
            ("lease-to-own title", "Lease-to-own", False),
            ("ES lease title", "Arrendamiento con opcion a compra", False),
            ("Mexico scenario", "Purchasing for delivery to Mexico?", False),
            ("ES Mexico scenario", "¿Compras para entrega en México?", False),
            ("provider Synchrony", "Synchrony", False),
            ("EN stale guidance", "Exact rates and terms are not shown right now.", False),
            ("ES stale guidance", "Las tasas y los plazos exactos no se muestran.", False),
            ("ES aprobacion (not APR)", "sujetas a términos y aprobación", False),
            ("EN interested (not interest-free)", "Yes, I'm interested", False),
            ("ES me interesa", "Sí, me interesa", False),
            ("EN external notice", "Opens lacks.com — a separate site governed by its own terms.", False),
    ):
        check(f"exact-claim signal: {_lbl} -> {'flagged' if _want else 'clean'}",
              bool(_exact_claim_signals(_txt)) is _want)

    # Generic financing.copy — every key, both languages, both policy states
    for _policy in (False, True):
        _st = "policy false" if _policy is False else "policy true"
        check(f"ungated copy.body EN exact claim -> error ({_st})",
              _ungated_rejected("financing.copy.body.en",
                                lambda m: m["copy"].__setitem__(
                                    "body", {"en": "Get 0% APR for 48 months", "es": "Generico"}),
                                _policy))
        check(f"ungated copy.body ES exact claim -> error ({_st})",
              _ungated_rejected("financing.copy.body.es",
                                lambda m: m["copy"].__setitem__(
                                    "body", {"en": "Generic", "es": "0% APR por 48 meses"}),
                                _policy))
    check("ungated copy.emailBody exact claim -> error",
          _ungated_rejected("financing.copy.emailBody.en",
                            lambda m: m["copy"].__setitem__(
                                "emailBody", {"en": "Pay $52.82 per month.", "es": "Generico"})))
    check("ungated copy.staleNotice exact claim -> error",
          _ungated_rejected("financing.copy.staleNotice.en",
                            lambda m: m["copy"].__setitem__(
                                "staleNotice", {"en": "Ask about 0% APR.", "es": "Generico"})))
    check("a newly added copy key is guarded by default",
          _ungated_rejected("financing.copy.someNewKey.en",
                            lambda m: m["copy"].__setitem__(
                                "someNewKey", {"en": "Only $999 down", "es": "Generico"})))

    # provider is rendered in the promotional card title on the stale path
    check("provider 'Synchrony' passes",
          validate_financing(_fc(_fmut()), allowed_source_hosts=_FHOSTS).ok)
    for _bad_provider in ("Synchrony 0% APR", "Synchrony 72-month financing"):
        check(f"provider {_bad_provider!r} -> error",
              _ungated_rejected("provider",
                                lambda m, v=_bad_provider: m["plans"][0].__setitem__("provider", v)))

    # Non-promotional headlines / disclosures / evergreen details
    def _add_plan(m, **kw):
        base = {"id": "extra", "kind": "closed-end-installment", "provider": "Lacks",
                "verified": True, "verifiedAt": m["verifiedAt"],
                "sourceUrl": "https://www.lacks.com/financing",
                "headline": {"en": "In-House Credit", "es": "Credito Interno"},
                "disclosure": {"en": "Confirmed in store.", "es": "Se confirma en tienda."}}
        base.update(kw)
        m["plans"].append(base)

    check("non-promotional headline with a rate -> error",
          _ungated_rejected("headline",
                            lambda m: _add_plan(m, headline={"en": "6-36 month financing",
                                                             "es": "Financiamiento de 6-36 meses"})))
    check("scenario headline with a rate -> error",
          _ungated_rejected("headline",
                            lambda m: _add_plan(m, presentationScenario="mexico-delivery",
                                                headline={"en": "24% APR for 24 months",
                                                          "es": "24% APR por 24 meses"})))
    check("ungated disclosure with a dated account rate -> error",
          _ungated_rejected("disclosure",
                            lambda m: _add_plan(m, disclosure={
                                "en": "As of 07/31/2025 the purchase APR is 34.99%.",
                                "es": "Al 07/31/2025 la APR es 34.99%."})))
    check("lease-to-own detail with a payment -> error",
          _ungated_rejected("detail",
                            lambda m: _add_plan(m, id="lto2", kind="lease-to-own",
                                                headline={"en": "Lease-to-own", "es": "Arrendamiento"},
                                                detail={"en": "Own it for $99 per month.",
                                                        "es": "Tuyo por $99 al mes."})))
    check("credit-builder detail with zero-interest wording -> error",
          _ungated_rejected("detail",
                            lambda m: _add_plan(m, id="bmc2", kind="credit-builder",
                                                headline={"en": "Build My Credit", "es": "Build My Credit"},
                                                detail={"en": "No interest ever.",
                                                        "es": "Sin intereses."})))
    check("generic non-promotional plan (approved shape) passes",
          _fin_with(lambda m: _add_plan(m, id="ok-plan")).ok)

    # GATED content keeps its numbers — the guard must not reach inside the gate
    check("promotional headline/detail/disclosure may state exact terms",
          _fin_with(lambda m: None).ok)
    check("promotional plan with exact headline+detail+disclosure still passes",
          _fin_with(lambda m: m["plans"][0].update({
              "headline": {"en": "9.99% APR for 72 months", "es": "9.99% APR por 72 meses"},
              "detail": {"en": "On purchases of $500 or more. Fixed monthly payments required.",
                         "es": "En compras de $500 o mas. Se requieren pagos mensuales fijos."},
              "disclosure": {"en": "As of 07/31/2025 the purchase APR is 34.99%.",
                             "es": "Al 07/31/2025 la APR de compra es 34.99%."}})).ok)
    check("scenario plan's GATED detail + representativeExample may state exact terms",
          _fin_with(lambda m: _add_plan(
              m, id="mx2", presentationScenario="mexico-delivery", apr=24, termMonths=24,
              headline={"en": "Purchasing for delivery to Mexico?",
                        "es": "¿Compras para entrega en México?"},
              detail={"en": "Up to 24 months at a maximum 24% APR.",
                      "es": "Hasta 24 meses con un maximo de 24% APR."},
              representativeExample={"en": "$999 for 24 months equals 24 payments of $52.82.",
                                     "es": "$999 por 24 meses son 24 pagos de $52.82."})).ok)

    # ---- allowedSourceHosts must be SUFFICIENT, not merely non-widening ----
    # The build and the browser police financing URLs against different lists.
    # Checking only for widening let an absent/empty/padded/wrong-subset list
    # ship a bundle whose every financing link, QR continuation, email URL and
    # exact-terms gate was dead at runtime, with no error anywhere.
    _PARITY = "financingSourceAllowed"

    def _ash(value, drop=False):
        def mutate(m):
            if drop:
                m.pop("allowedSourceHosts", None)
            else:
                m["allowedSourceHosts"] = value
        return mutate

    check("allowedSourceHosts MISSING while enabled -> error",
          any("allowedSourceHosts is required" in e
              for e in _fin_with(_ash(None, drop=True)).errors))
    check("allowedSourceHosts EMPTY while enabled -> error",
          any("allowedSourceHosts is empty" in e
              for e in _fin_with(_ash([])).errors))
    check("allowedSourceHosts PADDED entry -> error (browser does not trim)",
          any("does not trim" in e
              for e in _fin_with(_ash(["  www.lacks.com  "])).errors))
    check("allowedSourceHosts BLANK entry -> error",
          any("is blank" in e for e in _fin_with(_ash(["www.lacks.com", "   "])).errors))
    check("allowedSourceHosts WRONG SUBSET -> runtime-parity error",
          any(_PARITY in e for e in _fin_with(_ash(["synchrony.com"])).errors))
    check("wrong subset names the field the browser would drop",
          any(_PARITY in e and "financing.sourceUrl" in e
              for e in _fin_with(_ash(["synchrony.com"])).errors))
    check("sufficient allowlist -> no parity error",
          not any(_PARITY in e
                  for e in _fin_with(_ash(["lacks.com", "www.lacks.com"])).errors))
    check("apex-only allowlist still covers the www subdomain (dot-boundary)",
          not any(_PARITY in e for e in _fin_with(_ash(["lacks.com"])).errors))
    # Archive captures: legitimate promotions EVIDENCE, never a customer link.
    _ARCHIVE = "https://web.archive.org/web/20260525/https://www.lacks.com/financing"
    check("archive capture as customer-reachable sourceUrl -> error",
          any("web.archive.org capture" in e for e in
              _fin_with(lambda m: m.__setitem__("sourceUrl", _ARCHIVE)).errors))
    check("archive capture as a PLAN sourceUrl -> error",
          any("web.archive.org capture" in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__("sourceUrl", _ARCHIVE)).errors))
    check("archive capture stays valid for PROMOTIONS evidence (unchanged)",
          _is_allowed_source(_ARCHIVE, _FHOSTS))
    check("the runtime mirror rejects an archive capture (no archive branch)",
          not _runtime_financing_host_allowed(_ARCHIVE, ["lacks.com", "www.lacks.com"]))
    # The mirror must agree with the JS on the cases that actually differ.
    check("runtime mirror: explicit :443 accepted (URL normalises it away)",
          _runtime_financing_host_allowed("https://www.lacks.com:443/x", ["www.lacks.com"]))
    check("runtime mirror: non-default port refused",
          not _runtime_financing_host_allowed("https://www.lacks.com:8443/x", ["www.lacks.com"]))
    check("runtime mirror: padded entry matches nothing (as in the browser)",
          not _runtime_financing_host_allowed("https://www.lacks.com/x", ["  www.lacks.com  "]))
    check("runtime mirror: dot-boundary suffix, not bare suffix",
          _runtime_financing_host_allowed("https://www.lacks.com/x", ["lacks.com"])
          and not _runtime_financing_host_allowed("https://evil-lacks.com/x", ["lacks.com"]))
    check("runtime mirror: http refused",
          not _runtime_financing_host_allowed("http://www.lacks.com/x", ["www.lacks.com"]))
    check("runtime mirror: credentials refused",
          not _runtime_financing_host_allowed("https://u:p@www.lacks.com/x", ["www.lacks.com"]))
    check("runtime mirror is total over JSON shapes",
          all(_runtime_financing_host_allowed(u, h) in (True, False)
              for u in (None, "", 7, [], {}, "x", "https://www.lacks.com/x")
              for h in (None, [], "x", 7, {}, ["www.lacks.com"], [None, 7])))
    check("allowedSourceHosts not required when financing is DISABLED",
          validate_financing(_fc(dict(_fmut(), enabled=False)),
                             allowed_source_hosts=_FHOSTS).ok)

    # ---- generated promotional headlines (Commit I) -------------------------
    # apr/termMonths are AUTHORITATIVE; the promotional headline is derived from
    # them by tools/financing_headline.py and pinned here by exact equality.
    # Before this rule, bilingual presence was the only headline check and a
    # hand-edited "4.99% APR for 12 months" shipped unchallenged over apr=9.99 /
    # termMonths=72 — customer-visible prose contradicting the verified facts.
    _FH = fin_headline

    def _hl_raises(fn):
        try:
            fn()
        except _FH.HeadlineError:
            return True
        return False

    def _hl_msg(fn):
        """The HeadlineError text a call produces ('' when it does not raise)."""
        try:
            fn()
        except _FH.HeadlineError as exc:
            return str(exc)
        return ""

    def _hl_len(fn):
        return len(_hl_msg(fn))

    # Template pins — these ARE the customer-visible strings.
    check("generated headline: the shipped 9.99 / 72 promotion",
          _FH.promotional_headline(9.99, 72)
          == {"en": "9.99% APR for 72 months", "es": "9.99% APR por 72 meses"})
    check("generated headline: the shipped 0 / 48 promotion",
          _FH.promotional_headline(0, 48)
          == {"en": "0% APR for 48 months", "es": "0% APR por 48 meses"})
    check("generated headline: termMonths 1 is singular in BOTH languages",
          _FH.promotional_headline(0, 1)
          == {"en": "0% APR for 1 month", "es": "0% APR por 1 mes"})
    check("generated headline: termMonths 2 is plural in both languages",
          _FH.promotional_headline(0, 2)
          == {"en": "0% APR for 2 months", "es": "0% APR por 2 meses"})
    check("generated headline: 'APR' stays 'APR' in Spanish (shipped terminology)",
          "APR" in _FH.promotional_headline(9.99, 72)["es"])
    check("generated headline: rate and term only — never minimum or provider",
          all(x not in _FH.promotional_headline(9.99, 72)["en"]
              for x in ("$", "500", "Synchrony", "minimum")))
    # Formatting policy: print exactly what JSON carried, invent no precision.
    for _val, _want in ((0, "0"), (0.0, "0"), (9.99, "9.99"), (12.5, "12.5"),
                        (24, "24"), (48.0, "48"), (1.005, "1.005"), (100, "100")):
        check(f"APR formatting pinned: {_val!r} -> {_want!r}",
              _FH.format_rate(_val) == _want)
    for _lbl, _bad in (("missing", None), ("boolean True", True),
                       ("boolean False", False), ("string", "9.99"),
                       ("NaN", float("nan")), ("+inf", float("inf")),
                       ("-inf", float("-inf")), ("negative", -1), ("object", {})):
        check(f"APR {_lbl} rejected by the generator",
              _hl_raises(lambda v=_bad: _FH.format_rate(v)))
    for _lbl, _bad in (("missing", None), ("boolean", True), ("float 48.0", 48.0),
                       ("string '72'", "72"), ("zero", 0), ("negative", -6)):
        check(f"termMonths {_lbl} rejected by the generator",
              _hl_raises(lambda v=_bad: _FH.format_term(v)))

    # The predicate the BUILDER generates by and the group the VALIDATOR gates
    # on must name the same set of plans, or a plan could end up generated but
    # ungated (or gated but authored). Pinned across every kind/scenario shape,
    # including the malformed ones validation separately rejects.
    for _kind in sorted(FINANCING_PLAN_KINDS):
        for _sc in ("<absent>", "mexico-delivery", "not-a-scenario", "", "   ",
                    1, None, True, []):
            _pp = {"kind": _kind}
            if _sc != "<absent>":
                _pp["presentationScenario"] = _sc
            check(f"generation predicate == _plan_group promotional "
                  f"({_kind}, scenario={_sc!r})",
                  _FH.is_promotional_presentation(_pp)
                  == (_plan_group(_pp) == "promotional"))

    # Builder-side contract: authored prose may never override or coexist with
    # the generated value, and placement is deterministic so the shipped
    # artifact stays diff-clean.
    check("insert_generated_headline REFUSES an authored promotional headline",
          _hl_raises(lambda: _FH.insert_generated_headline(
              {"id": "p", "kind": _FH.PROMOTIONAL_KIND, "apr": 0, "termMonths": 48,
               "headline": {"en": "x", "es": "y"}})))
    check("insert_generated_headline places the headline immediately before detail",
          list(_FH.insert_generated_headline(
              {"id": "p", "kind": _FH.PROMOTIONAL_KIND, "apr": 0, "termMonths": 48,
               "detail": {"en": "d", "es": "d"},
               "disclosure": {"en": "x", "es": "x"}}))
          == ["id", "kind", "apr", "termMonths", "headline", "detail", "disclosure"])
    _apply_src = {"plans": [
        {"id": "promo", "kind": _FH.PROMOTIONAL_KIND, "apr": 0, "termMonths": 48,
         "detail": {"en": "d", "es": "d"}},
        {"id": "inh", "kind": "closed-end-installment",
         "headline": {"en": "In-House", "es": "Interno"}},
        {"id": "mx", "kind": "closed-end-installment",
         "presentationScenario": "mexico-delivery", "apr": 24, "termMonths": 24,
         "headline": {"en": "Delivery to Mexico?", "es": "Entrega en Mexico?"}},
    ]}
    _FH.apply_to_financing(_apply_src)
    check("apply_to_financing generates for the promotional plan ONLY",
          _apply_src["plans"][0]["headline"] == {"en": "0% APR for 48 months",
                                                 "es": "0% APR por 48 meses"}
          and _apply_src["plans"][1]["headline"] == {"en": "In-House", "es": "Interno"}
          and _apply_src["plans"][2]["headline"] == {"en": "Delivery to Mexico?",
                                                     "es": "Entrega en Mexico?"})

    # Validator side: what shipped must equal what the fields generate.
    check("shipped-shape promotional plan passes the generated-headline rule",
          _fin_with(lambda m: None).ok)
    _HL_DRIFT = "does not equal the value generated"
    for _lbl, _drift in (
            ("wrong rate", {"en": "4.99% APR for 72 months",
                            "es": "4.99% APR por 72 meses"}),
            ("wrong term", {"en": "9.99% APR for 60 months",
                            "es": "9.99% APR por 60 meses"}),
            ("right numbers, different sentence", {"en": "Ask about 9.99 and 72.",
                                                   "es": "Pregunta por 9.99 y 72."}),
            ("EN drifted, ES correct", {"en": "9.99% APR for 12 months",
                                        "es": "9.99% APR por 72 meses"}),
            ("ES drifted, EN correct", {"en": "9.99% APR for 72 months",
                                        "es": "9.99% APR por 12 meses"}),
            ("trailing whitespace", {"en": "9.99% APR for 72 months ",
                                     "es": "9.99% APR por 72 meses"}),
            ("invented trailing zero", {"en": "9.990% APR for 72 months",
                                        "es": "9.990% APR por 72 meses"}),
            ("APR translated in ES", {"en": "9.99% APR for 72 months",
                                      "es": "9.99% TAE por 72 meses"}),
            ("minimum smuggled in", {"en": "9.99% APR for 72 months on $500+",
                                     "es": "9.99% APR por 72 meses desde $500"}),
    ):
        check(f"drifted promotional headline rejected: {_lbl}",
              any(_HL_DRIFT in e for e in _fin_with(
                  lambda m, h=_drift: m["plans"][0].__setitem__("headline", h)).errors))
    # NON-VACUITY: the rejection above comes from the NEW equality rule, not
    # from the pre-existing bilingual-presence rule (which these all satisfy).
    check("a bilingual-but-drifted headline is not caught by the bilingual rule",
          not any("headline missing EN or ES" in e for e in _fin_with(
              lambda m: m["plans"][0].__setitem__(
                  "headline", {"en": "4.99% APR for 12 months",
                               "es": "4.99% APR por 12 meses"})).errors))
    check("changing apr WITHOUT regenerating the headline -> error",
          any(_HL_DRIFT in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__("apr", 4.99)).errors))
    check("changing termMonths WITHOUT regenerating the headline -> error",
          any(_HL_DRIFT in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__("termMonths", 36)).errors))
    check("the error names both languages independently",
          all(any(f"headline.{_lang}" in e for e in _fin_with(
              lambda m: m["plans"][0].__setitem__(
                  "headline", {"en": "wrong one", "es": "otro"})).errors)
              for _lang in ("en", "es")))
    check("hand-added extra language key on a promotional headline -> error",
          any("unexpected keys" in e for e in _fin_with(
              lambda m: m["plans"][0]["headline"].__setitem__("fr", "x")).errors))
    _HL_NOGEN = "cannot generate its headline"
    for _missing in ("apr", "termMonths"):
        check(f"promotional plan missing {_missing} -> error",
              any(_HL_NOGEN in e for e in
                  _fin_with(lambda m, k=_missing: m["plans"][0].pop(k)).errors))
    for _lbl, _bad in (("boolean apr", True), ("string apr", "9.99"),
                       ("null apr", None), ("non-finite apr", float("inf"))):
        check(f"promotional plan with {_lbl} -> error",
              any(_HL_NOGEN in e for e in
                  _fin_with(lambda m, v=_bad: m["plans"][0].__setitem__("apr", v)).errors))
    for _lbl, _bad in (("boolean termMonths", True), ("float termMonths", 72.0),
                       ("null termMonths", None)):
        check(f"promotional plan with {_lbl} -> error",
              any(_HL_NOGEN in e for e in _fin_with(
                  lambda m, v=_bad: m["plans"][0].__setitem__("termMonths", v)).errors))
    # A boolean apr used to slip past the range check entirely (bool is a
    # subclass of int, and True is neither < 0 nor > 100). Both layers reject
    # it now that the range check IS the helper's domain predicate.
    check("boolean apr is rejected by the generation rule",
          any(_HL_NOGEN in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__("apr", True)).errors))
    check("boolean apr is ALSO rejected by the range check (former gap closed)",
          any("out of range" in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__("apr", True)).errors))

    # ---- numeric domain is TOTAL and single-authority (Commit I amend) ------
    # A JSON integer can be arbitrarily large. math.isfinite(10**400) and
    # float(10**400) BOTH raise OverflowError, so asking either of an int let an
    # uncaught OverflowError escape validate_financing: no ValidationReport, no
    # named error, and the builder's HeadlineError -> SystemExit contract
    # bypassed with a raw traceback. The helper now answers for every object
    # JSON can supply, and every rejection is a HeadlineError.
    _HUGE = 10 ** 400
    check("apr_in_domain is TOTAL: huge positive integer -> False, no raise",
          _FH.apr_in_domain(_HUGE) is False)
    check("apr_in_domain is TOTAL: huge negative integer -> False, no raise",
          _FH.apr_in_domain(-_HUGE) is False)
    check("term_in_domain is TOTAL: huge integer -> False, no raise",
          _FH.term_in_domain(_HUGE) is False)
    for _lbl, _v in (("huge positive int", _HUGE), ("huge negative int", -_HUGE)):
        check(f"format_rate({_lbl}) raises HeadlineError, not OverflowError",
              _hl_raises(lambda v=_v: _FH.format_rate(v)))
    check("format_term(huge int) raises HeadlineError, not OverflowError",
          _hl_raises(lambda: _FH.format_term(_HUGE)))
    check("a rejected 400-digit APR does not BECOME the error message",
          len(_FH.short_repr(_HUGE)) < 80)
    # short_repr sits INSIDE the rejection path, so it must be total too.
    # repr(10**100000) raises ValueError under CPython's int->str digit limit
    # (sys.get_int_max_str_digits), which would have escaped format_rate as a
    # non-HeadlineError from within the code that formats the refusal.
    _VAST = 10 ** 100000
    check("short_repr describes a vast integer instead of rendering it",
          _FH.short_repr(_VAST) == f"<{_VAST.bit_length()}-bit integer>")
    check("format_rate(10**100000) raises HeadlineError, not ValueError",
          _hl_raises(lambda: _FH.format_rate(_VAST)))
    check("format_term(10**100000) raises HeadlineError, not ValueError",
          _hl_raises(lambda: _FH.format_term(_VAST)))
    check("apr_in_domain(10**100000) answers without raising",
          _FH.apr_in_domain(_VAST) is False)

    class _Hostile:
        def __repr__(self):
            raise RuntimeError("repr exploded")

    class _HostileFloat(float):
        def __repr__(self):
            raise RuntimeError("repr exploded")

    check("short_repr survives an object whose __repr__ raises",
          _FH.short_repr(_Hostile()) == "<unprintable _Hostile>")
    check("format_rate survives an object whose __repr__ raises",
          _hl_raises(lambda: _FH.format_rate(_Hostile())))
    check("apr_in_domain survives an object whose __repr__ raises",
          _FH.apr_in_domain(_Hostile()) is False)
    # WRAPPED errors must be bounded too. headline_for_plan() and
    # insert_generated_headline() add an author-supplied id (and, for the
    # authored-headline refusal, the rejected headline itself) to a message
    # that is already bounded — and both used a bare !r, so a 100,000-character
    # id produced a 100,059-character diagnostic. The claim that "every
    # rejection site routes through short_repr" was true of the raising sites
    # and false of the wrapping ones.
    _LONG_ID = "x" * 100000
    _BOUND = 400
    check("headline_for_plan bounds a huge plan id in its wrapped error",
          _hl_len(lambda: _FH.headline_for_plan(
              {"id": _LONG_ID, "apr": None, "termMonths": 72})) < _BOUND)
    check("insert_generated_headline bounds a huge plan id",
          _hl_len(lambda: _FH.insert_generated_headline(
              {"id": _LONG_ID, "kind": _FH.PROMOTIONAL_KIND, "apr": 0,
               "termMonths": 48, "headline": {"en": "a", "es": "b"}})) < _BOUND)
    check("insert_generated_headline bounds a huge authored headline",
          _hl_len(lambda: _FH.insert_generated_headline(
              {"id": "p", "kind": _FH.PROMOTIONAL_KIND, "apr": 0,
               "termMonths": 48,
               "headline": {"en": "y" * 100000, "es": "z"}})) < _BOUND)
    check("wrapped errors survive a huge INTEGER id (int->str digit limit)",
          _hl_len(lambda: _FH.headline_for_plan(
              {"id": 10 ** 100000, "apr": None, "termMonths": 72})) < _BOUND)
    check("a bounded wrapped error still names the plan and the cause",
          all(s in _hl_msg(lambda: _FH.headline_for_plan(
              {"id": "syn-9-99-72", "apr": None, "termMonths": 72}))
              for s in ("syn-9-99-72", "apr is required")))
    # Structural pin, so a NEW raise cannot reintroduce the same class: no
    # author-supplied value may be interpolated with a bare !r anywhere in the
    # helper. (`value!r` on an already-screened float is fine and is excluded
    # by name; `plan.get(...)!r` never is.)
    _FH_SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "financing_headline.py"), encoding="utf-8").read()
    check("no bare !r on a plan-supplied value remains in financing_headline",
          not re.search(r"\{plan\.get\([^)]*\)!r\}", _FH_SRC))

    check("short_repr leaves ordinary values fully readable",
          _FH.short_repr(9.99) == "9.99" and _FH.short_repr(72) == "72"
          and _FH.short_repr(None) == "None")

    check("format_rate survives a value whose __repr__ raises, at EVERY "
          "rejection site (the refusal text must not be what crashes)",
          all(_hl_raises(lambda v=_v: _FH.format_rate(v))
              for _v in (_Hostile(), _HostileFloat("nan"), _HostileFloat(1e-05))))

    # Subclasses of int/float are refused OUTRIGHT rather than trusted, because
    # a subclass can lie about its own value: __float__ can return inf from an
    # instance that passes a finiteness test ("inf% APR for 48 months"), __int__
    # can format a different number than the one range-checked, and __ge__ /
    # __repr__ can raise from inside the check or inside the refusal. json.loads
    # never produces one, so refusing them costs nothing and removes the whole
    # class. Every case below WOULD have been a wrong answer or a leaked
    # exception under isinstance-based typing.
    class _LyingFloat(float):
        def __float__(self):
            return float("inf")

    class _LyingInt(int):
        def __int__(self):
            return 999

    class _BadCmpInt(int):
        def __ge__(self, other):
            raise RuntimeError("__ge__ exploded")

    class _HostileBitLength(int):
        def bit_length(self):
            raise RuntimeError("bit_length exploded")

    for _lbl, _v in (("float subclass lying via __float__", _LyingFloat(9.99)),
                     ("int subclass lying via __int__", _LyingInt(9)),
                     ("int subclass with exploding __ge__", _BadCmpInt(50)),
                     ("int subclass with exploding bit_length",
                      _HostileBitLength(10 ** 400))):
        check(f"apr_in_domain refuses a {_lbl} without raising",
              _FH.apr_in_domain(_v) is False)
        check(f"format_rate refuses a {_lbl} with HeadlineError",
              _hl_raises(lambda v=_v: _FH.format_rate(v)))
    for _lbl, _v in (("int subclass lying via __int__", _LyingInt(48)),
                     ("int subclass with exploding __ge__", _BadCmpInt(72))):
        check(f"term_in_domain refuses a {_lbl} without raising",
              _FH.term_in_domain(_v) is False)
        check(f"format_term refuses a {_lbl} with HeadlineError",
              _hl_raises(lambda v=_v: _FH.format_term(v)))
    check("no subclass can reach the templates: a lying float never prints 'inf'",
          _hl_raises(lambda: _FH.promotional_headline(_LyingFloat(9.99), 48)))
    check("exact ints and floats are still accepted (the shipped shapes)",
          _FH.format_rate(9.99) == "9.99" and _FH.format_rate(0) == "0"
          and _FH.format_term(72) == "72")

    # Boundaries, inclusive on both ends.
    for _v in (0, 0.0, 100, 100.0, 9.99, 24, 0.01):
        check(f"APR {_v!r} is in domain", _FH.apr_in_domain(_v))
    for _v in (-1, -0.001, 101, 100.001, _HUGE, -_HUGE, True, False, None,
               "9.99", float("nan"), float("inf"), float("-inf"), [], {}):
        check(f"APR {_FH.short_repr(_v)} is OUT of domain",
              not _FH.apr_in_domain(_v))
    check("APR boundary 0 formats", _FH.format_rate(0) == "0")
    check("APR boundary 100 formats", _FH.format_rate(100) == "100")
    for _v in (1, 2, 72, 120):
        check(f"termMonths {_v} is in domain", _FH.term_in_domain(_v))
    for _v in (0, -1, 121, _HUGE, -_HUGE, True, False, None, 48.0, "72", [], {}):
        check(f"termMonths {_FH.short_repr(_v)} is OUT of domain",
              not _FH.term_in_domain(_v))
    check("termMonths boundary 1 formats singular",
          _FH.promotional_headline(0, 1) == {"en": "0% APR for 1 month",
                                             "es": "0% APR por 1 mes"})
    check("termMonths boundary 120 formats plural",
          _FH.promotional_headline(0, 120) == {"en": "0% APR for 120 months",
                                               "es": "0% APR por 120 meses"})

    # DOMAIN and PRESENTATION stay separate concerns: 1e-05 is a legitimate APR
    # this repository declines to PRINT, so it fails generation, not range.
    check("exponent-form fractional APR still refused by the formatter",
          _hl_raises(lambda: _FH.format_rate(1e-05)))
    check("1e-05 is in domain (it is a real rate, merely unpresentable)",
          _FH.apr_in_domain(1e-05))
    check("in-domain-but-unpresentable APR -> generation error, NOT range error",
          any(_HL_NOGEN in e for e in _fin_with(
              lambda m: m["plans"][0].__setitem__("apr", 1e-05)).errors)
          and not any("out of range" in e for e in _fin_with(
              lambda m: m["plans"][0].__setitem__("apr", 1e-05)).errors))

    # validate_financing must RETURN a verdict for the value that used to
    # crash it — that is the whole fail-closed guarantee.
    _huge_rep = _fin_with(lambda m: m["plans"][0].__setitem__("apr", _HUGE))
    check("validate_financing RETURNS a report for a huge integer apr",
          isinstance(_huge_rep, ValidationReport))
    check("that report names the generation failure",
          any(_HL_NOGEN in e for e in _huge_rep.errors))
    check("that report ALSO names the range violation",
          any("out of range" in e for e in _huge_rep.errors))
    check("no error text embeds the 400-digit value",
          all(len(e) < 400 for e in _huge_rep.errors))

    # ONE authority for the range: validate_financing's check IS the helper's
    # domain predicate, so the accepted range and the formattable range cannot
    # drift. Proven by verdict-for-verdict agreement, not by reading the code.
    check("the bounds live in the helper (APR)",
          (fin_headline.APR_MIN, fin_headline.APR_MAX) == (0, 100))
    check("the bounds live in the helper (term)",
          (fin_headline.TERM_MIN, fin_headline.TERM_MAX) == (1, 120))
    # The predicate must name the FIELD. "out of range" alone is shared
    # verbatim by minimumPurchase's error, so a bare substring test would let
    # another field's rejection stand in for the one under test.
    def _ranged(rep, field):
        return any("out of range" in e and f"{field} " in e for e in rep.errors)

    check("the field-specific predicate does not accept a sibling's error",
          not _ranged(_fin_with(lambda m: m["plans"][0].__setitem__(
              "minimumPurchase", -1)), "apr")
          and _ranged(_fin_with(lambda m: m["plans"][0].__setitem__(
              "minimumPurchase", -1)), "minimumPurchase"))
    for _v in (0, 100, 9.99, 24, -1, 101, _HUGE, -_HUGE, True, False,
               float("nan"), float("inf"), "9.99", None):
        _rep = _fin_with(lambda m, x=_v: m["plans"][0].__setitem__("apr", x))
        check(f"validator range verdict == helper domain, apr {_FH.short_repr(_v)}",
              _ranged(_rep, "apr")
              == (_v is not None and not _FH.apr_in_domain(_v)))
    for _v in (1, 120, 72, 0, 121, _HUGE, -_HUGE, True, 48.0, "72", None):
        _rep = _fin_with(lambda m, x=_v: m["plans"][0].__setitem__("termMonths", x))
        check(f"validator range verdict == helper domain, termMonths "
              f"{_FH.short_repr(_v)}",
              _ranged(_rep, "termMonths")
              == (_v is not None and not _FH.term_in_domain(_v)))

    # Fields that must NOT influence the headline.
    check("minimumPurchase changes do not affect the generated headline",
          _fin_with(lambda m: m["plans"][0].__setitem__("minimumPurchase", 999)).ok)
    check("provider changes do not affect the generated headline",
          _fin_with(lambda m: m["plans"][0].__setitem__("provider", "Another Bank")).ok)

    # Authored headlines elsewhere are untouched by the rule.
    check("non-promotional (installment) headline stays authored",
          _fin_with(lambda m: _add_plan(m, id="inhouse-ok")).ok)
    check("evergreen headline stays authored",
          _fin_with(lambda m: _add_plan(m, id="lto3", kind="lease-to-own",
                                        headline={"en": "Lease-to-own",
                                                  "es": "Arrendamiento"})).ok)
    check("scenario plan carrying apr/termMonths KEEPS its authored headline",
          _fin_with(lambda m: _add_plan(
              m, id="mx3", presentationScenario="mexico-delivery", apr=24, termMonths=24,
              headline={"en": "Purchasing for delivery to Mexico?",
                        "es": "¿Compras para entrega en México?"},
              detail={"en": "Up to 24 months at a maximum 24% APR.",
                      "es": "Hasta 24 meses con un maximo de 24% APR."})).ok)
    check("a scenario plan is NOT required to match the generated template",
          not any(_HL_DRIFT in e or _HL_NOGEN in e for e in _fin_with(
              lambda m: _add_plan(
                  m, id="mx4", presentationScenario="mexico-delivery",
                  apr=24, termMonths=24,
                  headline={"en": "Purchasing for delivery to Mexico?",
                            "es": "¿Compras para entrega en México?"},
                  detail={"en": "Up to 24 months at a maximum 24% APR.",
                          "es": "Hasta 24 meses con un maximo de 24% APR."})).errors))

    # Disabled financing keeps the light-validation convention
    fdis_copy = _fmut(); fdis_copy["enabled"] = False
    del fdis_copy["verifiedAt"]
    fdis_copy["copy"]["body"] = {"en": "Get 0% APR", "es": "0% APR"}
    check("disabled financing: ungated-copy rule not applied (light validation)",
          not any(_UNGATED_ERR in e for e in
                  validate_financing(_fc(fdis_copy), allowed_source_hosts=_FHOSTS).errors))

    # The new rule must not have displaced any existing structural check
    check("existing structural validation still active alongside the guard",
          any("paymentCalculationEnabled" in e for e in
              _fin_with(lambda m: m["plans"][0].__setitem__(
                  "paymentCalculationEnabled", True)).errors))

    # ---- written-out (digit-free) exact claims (Commit F amend) -------------
    # An exact claim does not need digits: unit words carry it just as well.
    for _lbl, _txt in (
            ("EN twelve months", "Choose twelve months for repayment."),
            ("ES doce meses", "Elige doce meses para pagar."),
            ("EN nine percent", "Only nine percent interest."),
            ("ES nueve por ciento", "Solo nueve por ciento."),
            ("EN fifty dollars", "Just fifty dollars down."),
            ("ES cincuenta dolares", "Solo cincuenta dolares."),
            ("ES cincuenta pesos", "Solo cincuenta pesos."),
            ("EN twelve installments", "Pay in twelve installments."),
            ("ES doce mensualidades", "Paga en doce mensualidades."),
            ("EN weekly cadence", "Make one payment every week."),
            ("EN two years", "Take up to two years to pay."),
            ("ES pagos semanales", "Pagos semanales disponibles."),
            ("EN annual rate", "Ask about our annual rate."),
    ):
        check(f"written-out exact claim rejected in ungated copy: {_lbl}",
              _ungated_rejected("financing.copy.body.en",
                                lambda m, t=_txt: m["copy"].__setitem__(
                                    "body", {"en": t, "es": "Generico"})))
    for _lbl, _ok in (
            ("EN stale guidance", "Exact rates and terms are not shown right now."),
            ("ES stale guidance", "Las tasas y los plazos exactos no se muestran."),
            ("EN payment options", "Current payment options are available from your specialist."),
            ("ES opciones de pago", "Tu especialista tiene las opciones de pago actuales."),
            ("ES momento (not 'mes')", "pueden cambiar o terminar en cualquier momento"),
    ):
        check(f"generic phrasing still passes: {_lbl}",
              not _exact_claim_signals(_ok))

    # ---- ordinary-word payment counts (Commit F amend 2) --------------------
    # Banning "installments"/"cuotas" did not close the payment-count class:
    # ordinary "payments"/"pagos" carries it too, and cannot simply be banned
    # because 28 approved ungated strings use it inside a neutral collocation.
    # These assertions run the real validate_financing(), not the detector.
    _PAY_BLOCK = (
        ("EN payment count", "Make twelve payments."),
        ("ES payment count", "Haz doce pagos."),
        ("EN repay-in count", "Repay in twelve payments."),
        ("EN single payment", "Only one payment required."),
        ("ES single payment", "Un solo pago requerido."),
        ("EN repetition count", "Pay twelve times."),
        ("ES repetition count", "Paga doce veces."),
        ("EN money down", "No money down."),
        ("EN nothing down", "Nothing down."),
        ("ES enganche", "Sin enganche."),
        ("ES pago inicial", "Sin pago inicial."),
        ("EN deferral", "No payments until next spring."),
        ("ES deferral", "Sin pagos hasta la primavera."),
        ("EN defer verb", "Defer your first payment."),
        ("ES pay-later", "Llevatelo hoy y paga despues."),
        ("EN proportion", "Half now and half at pickup."),
        ("ES proportion", "Mitad ahora y mitad al recoger."),
    )
    for _policy in (False, True):
        _st = "policy false" if _policy is False else "policy true"
        for _lbl, _txt in _PAY_BLOCK:
            check(f"ungated copy rejects {_lbl} ({_st})",
                  _ungated_rejected("financing.copy.body.en",
                                    lambda m, t=_txt: m["copy"].__setitem__(
                                        "body", {"en": t, "es": "Generico"}),
                                    _policy))
    # ES side of a bilingual field, and an ID-driven ungated PLAN surface.
    check("ungated copy rejects an ES payment count in the .es slot",
          _ungated_rejected("financing.copy.body.es",
                            lambda m: m["copy"].__setitem__(
                                "body", {"en": "Generic", "es": "Haz doce pagos."})))
    check("ID-driven plan headline rejects an ordinary-word payment count",
          _ungated_rejected("headline",
                            lambda m: _add_plan(
                                m, id="lease-to-own", kind="lease-to-own",
                                headline={"en": "Make twelve payments.",
                                          "es": "Haz doce pagos."})))
    check("ID-driven plan detail rejects a deferral claim",
          _ungated_rejected("detail",
                            lambda m: _add_plan(
                                m, id="build-my-credit", kind="credit-builder",
                                detail={"en": "No payments until next spring.",
                                        "es": "Sin pagos hasta la primavera."})))
    check("provider rejects an ordinary-word payment count",
          _ungated_rejected("provider",
                            lambda m: m["plans"][0].__setitem__(
                                "provider", "Synchrony twelve payments")))
    # FALSE-POSITIVE CONTROLS: the neutral payment concept must stay legal.
    for _lbl, _ok in (
            ("EN payment options", "Explore payment options"),
            ("EN payment choices", "Your Sleep Plan. Your Payment Choices."),
            ("EN payment method", "Your matches are based on sleep fit — never on payment method."),
            ("EN brand 'Payment Choice'", "Lacks Payment Choice offers more than one way to bring it home."),
            ("ES opciones de pago", "Explora opciones de pago"),
            ("ES forma de pago", "Tus opciones se basan en tu descanso — nunca en la forma de pago."),
            ("ES formas de pago", "Hay varias formas de pago disponibles."),
            ("ES metodos de pago", "Consulta los metodos de pago."),
            ("EN stale guidance", "Current payment options are available from your Lacks specialist."),
            ("ES stale guidance", "Tu especialista de Lacks tiene las opciones de pago actuales."),
    ):
        check(f"neutral payment orientation still passes: {_lbl}",
              not _exact_claim_signals(_ok))
        check(f"neutral payment orientation validates clean: {_lbl}",
              _fin_with(lambda m, t=_ok: m["copy"].__setitem__(
                  "body", {"en": t, "es": t})).ok)
    # ---- the D4 collocation, and every near miss ----------------------------
    # "Payment preference" / "Preferencia de pago" is owner-adopted copy that
    # must not be reworded, so the reviewed allowlist gained exactly that
    # collocation. The point of these cases is that it gained NOTHING else:
    # `preference` does not become a general licence to use a payment noun.
    for _lbl, _adopted in (
            ("EN adopted label", "Payment preference"),
            ("ES adopted label", "Preferencia de pago"),
            ("EN plural form", "Payment preferences"),
            ("ES plural form", "Preferencias de pago"),
            ("EN in a sentence", "Your payment preference is recorded for the specialist."),
            ("ES in a sentence", "Tu preferencia de pago queda anotada."),
    ):
        check(f"D4 adopted payment collocation passes: {_lbl}",
              not _exact_claim_signals(_adopted))
        check(f"D4 adopted payment collocation validates clean: {_lbl}",
              _fin_with(lambda m, t=_adopted: m["copy"].__setitem__(
                  "body", {"en": t, "es": t})).ok)
    for _lbl, _near in (
            ("hyphenated, not the reviewed two-word phrase", "Payment-preference"),
            ("ES 'del pago', a different collocation", "Preferencia del pago"),
            ("reversed word order", "Preference of payment"),
            ("ES reversed word order", "Pago de preferencia"),
            ("a second, uncollocated payment noun survives",
             "Payment preference: ask about payment."),
            ("ES second, uncollocated payment noun",
             "Preferencia de pago: pregunta por el pago."),
            ("the noun alone is still bare", "Preference"
             " and payment"),
    ):
        check(f"D4 near miss is still REJECTED: {_lbl}",
              "payment-noun" in _exact_claim_signals(_near))
    # A cadence or duration marker is unaffected by the collocation: the
    # allowlist neutralises the payment NOUN, never the exact-term markers.
    for _lbl, _bad in (
            ("ES monthly payment preference", "Preferencia de pago mensual"),
            ("EN payment preference with a term", "Payment preference: 12 months"),
    ):
        _sig = _exact_claim_signals(_bad)
        check(f"D4: the collocation does not neutralise exact-term markers: {_lbl}",
              len(_sig) > 0 and "duration-unit" in _sig)
    check("D4: the allowlist addition is the only one (the guard was not broadened)",
          _bare_payment_noun("Payment information is available in store.")
          and _bare_payment_noun("Ask your specialist about payment.")
          and _bare_payment_noun("Choose a payment program.")
          and not _bare_payment_noun("Payment preference"))
    # The adopted D4 strings themselves, verbatim, must all validate clean.
    for _k, _en, _es in (
            ("paymentPreferenceLabel", "Payment preference", "Preferencia de pago"),
            ("optionsExploredLabel", "Options explored", "Opciones exploradas"),
            ("reviewOption", "Review this option", "Revisar esta opción"),
            ("hideDetails", "Hide details", "Ocultar detalles"),
            ("considerOption", "Consider this option", "Considerar esta opción"),
            ("currentlyConsidering", "Currently considering ✓", "En consideración ✓"),
            ("clearPreference", "Clear preference", "Quitar preferencia"),
            ("preferenceNone", "Not selected", "Sin seleccionar"),
            ("exploreConsequence",
             "Explore options together. Nothing is submitted and no application is started.",
             "Exploren las opciones juntos. No se envía nada y no se inicia ninguna solicitud."),
    ):
        check(f"D4 adopted copy trips no guarded signal: {_k}",
              not _exact_claim_signals(_en) and not _exact_claim_signals(_es))
        check(f"D4 adopted copy validates in place: {_k}",
              _fin_with(lambda m, k=_k, e=_en, s=_es: m["copy"].__setitem__(
                  k, {"en": e, "es": s})).ok)
    # The governed no-submission sentence, character-for-character, IN THE
    # SHIPPED SOURCE.
    #
    # These two were tautologies — `"<literal>" in "<literal>"` with both
    # operands written here — so they could not fail and said nothing about
    # what ships. Found in review. They now read the canonical financing source
    # off disk, which is the only file an author edits, and a precondition
    # proves the read actually produced the key rather than an empty default.
    _canon_path = os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "incoming", "lacks_financing.json")
    if os.path.exists(_canon_path):
        with open(_canon_path, encoding="utf-8") as _fh:
            _canon_copy = (json.load(_fh).get("financing") or {}).get("copy") or {}
        _consequence = _canon_copy.get("exploreConsequence") or {}
        check("D4 precondition: exploreConsequence was actually read from the "
              "canonical source (so the two pins below are not vacuous)",
              isinstance(_consequence, dict)
              and bool(_consequence.get("en")) and bool(_consequence.get("es")))
        check("D4: the shipped EN no-submission sentence is preserved verbatim",
              "Nothing is submitted and no application is started."
              in _consequence.get("en", ""))
        check("D4: the shipped ES no-submission sentence is preserved verbatim",
              "No se envía nada y no se inicia ninguna solicitud."
              in _consequence.get("es", ""))
        check("D4: the shipped payment-preference label is exact, both languages",
              (_canon_copy.get("paymentPreferenceLabel") or {}).get("en")
              == "Payment preference"
              and (_canon_copy.get("paymentPreferenceLabel") or {}).get("es")
              == "Preferencia de pago")

    # HONESTY PINS (behavioural). These document the detector's real posture so
    # a future edit cannot quietly restore a description that contradicts it.
    check("posture: a BARE duration unit is rejected with no numeral attached",
          _exact_claim_signals("Choose the right months") == ["duration-unit"])
    check("posture: a BARE proportion word is rejected with no numeral attached",
          "proportion" in _exact_claim_signals("Half of it is yours"))
    for _lbl, _benign in (
            ("Payment information is available in store.",
             "Payment information is available in store."),
            ("Ask your specialist about payment.", "Ask your specialist about payment."),
            ("Choose a payment program.", "Choose a payment program."),
    ):
        check(f"posture: benign-but-unreviewed payment wording is rejected by "
              f"default-deny ({_lbl})",
              _exact_claim_signals(_benign) == ["payment-noun"])
    check("posture: rejection means 'outside the reviewed allowlist', not "
          "'contains an exact claim'",
          _bare_payment_noun("Ask your specialist about payment.")
          and not _bare_payment_noun("Ask your specialist about payment options."))
    # AUTHORITATIVE: the real validate_financing() response for the documented
    # benign case must be rejected AND must not misdiagnose the prose.
    _benign_txt = "Payment information is available in store."
    _benign_errs = [e for e in _fin_with(
        lambda m: m["copy"].__setitem__("body", {"en": _benign_txt, "es": "Generico"})).errors
        if "financing.copy.body.en" in e]
    check("benign unreviewed wording is still REJECTED by validate_financing()",
          len(_benign_errs) == 1)
    check("its error names the reserved/unreviewed marker that fired",
          any("payment-noun" in e for e in _benign_errs))
    check("its error describes reserved-or-unreviewed language, not a proven claim",
          any("reserved or unreviewed financing language" in e for e in _benign_errs))
    check("its error does NOT assert the prose 'states an exact claim'",
          not any("states an exact claim" in e and "does not by itself" not in e
                  for e in _benign_errs))
    check("its error offers both remedies (reword, or move to a gated field)",
          any("reword it using reviewed generic orientation language" in e
              and "freshness-gated plan field" in e for e in _benign_errs))
    check("the stable error substring is preserved for downstream matchers",
          all(_UNGATED_ERR in e for e in _benign_errs))
    check("shipped configuration still passes the payment-noun rule unchanged",
          all(not _exact_claim_signals(v.get(lang, ""))
              for v in (json.loads(json.dumps(_fmut()))["copy"] or {}).values()
              if isinstance(v, dict) for lang in ("en", "es")))

    # ---- presentationScenario contract (Commit G) ---------------------------
    check("presentationScenario absent is valid (ordinary plan)",
          _fin_with(lambda m: _add_plan(m, id="ordinary")).ok)
    check("presentationScenario 'mexico-delivery' with its required kind is valid",
          _fin_with(lambda m: _add_plan(
              m, id="mx-ok", kind="closed-end-installment",
              presentationScenario="mexico-delivery")).ok)
    for _lbl, _bad in (("null", None), ("true", True), ("false", False), ("int", 1),
                       ("float", 1.0), ("array", []), ("object", {}),
                       ("empty string", ""), ("blank string", "   ")):
        check(f"presentationScenario {_lbl} -> error (must be a supported string)",
              any("presentationScenario" in e for e in
                  _fin_with(lambda m, v=_bad: _add_plan(
                      m, id="bad-sc", presentationScenario=v)).errors))
    check("presentationScenario unknown string -> error (renderer has no card)",
          any("not a supported scenario" in e for e in
              _fin_with(lambda m: _add_plan(
                  m, id="unknown-sc", presentationScenario="brazil-delivery")).errors))
    check("mexico-delivery with an incompatible kind -> error",
          any("requires kind" in e for e in
              _fin_with(lambda m: _add_plan(
                  m, id="mx-badkind", kind="lease-to-own",
                  presentationScenario="mexico-delivery")).errors))
    check("two mexico-delivery scenarios -> cardinality error",
          any("exactly one" in e for e in
              _fin_with(lambda m: [
                  _add_plan(m, id="mx-a", presentationScenario="mexico-delivery"),
                  _add_plan(m, id="mx-b", presentationScenario="mexico-delivery")]).errors))
    for _lbl, _v in (("true", True), ("false", False)):
        check(f"legacy separatePath {_lbl} is retired -> error",
              any("separatePath is retired" in e for e in
                  _fin_with(lambda m, v=_v: m["plans"][0].__setitem__("separatePath", v)).errors))

    # ---- provider contract (Commit G amend) ---------------------------------
    for _lbl, _bad, _frag in (
            ("empty string", "", "must not be blank"),
            ("blank string", "   ", "must not be blank"),
            ("untrimmed", " Synchrony ", "leading/trailing whitespace"),
            ("number", 123, "must be a string"),
            ("boolean", True, "must be a string"),
            ("null", None, "must be a string"),
            ("bilingual object", {"en": "A", "es": "A"}, "must be a string"),
            ("array", ["A"], "must be a string"),
    ):
        check(f"provider {_lbl} -> error ({_frag})",
              any("provider" in e and _frag in e for e in
                  _fin_with(lambda m, v=_bad: m["plans"][0].__setitem__("provider", v)).errors))
    check("provider missing on an enabled plan -> error",
          any("provider is required" in e for e in
              _fin_with(lambda m: m["plans"][0].pop("provider", None)).errors))
    for _ok_prov in ("Synchrony", "constructor", "toString", "__proto__", "valueOf"):
        check(f"provider {_ok_prov!r} is a valid identity string",
              _fin_with(lambda m, v=_ok_prov: m["plans"][0].__setitem__("provider", v)).ok)

    # ---- evergreen (incl. informational) is availability-only ---------------
    def _informational(m, **kw):
        base = dict(id="info-1", kind="informational", provider="Lacks",
                    headline={"en": "Learn about credit", "es": "Conoce el credito"},
                    detail={"en": "Ask a specialist in store.",
                            "es": "Consulta en tienda."})
        base.update(kw)
        _add_plan(m, **base)
    check("generic informational availability copy passes",
          _fin_with(_informational).ok)
    for _field, _val in (("apr", 19.99), ("termMonths", 36), ("minimumPurchase", 750)):
        check(f"informational plan carrying {_field} -> error (availability only)",
              any("availability only" in e for e in
                  _fin_with(lambda m, f=_field, v=_val: _informational(m, **{f: v})).errors))
    check("every evergreen kind is availability-only in one semantic set",
          FINANCING_EVERGREEN_KINDS == {"lease-to-own", "credit-builder", "informational"})

    # ---- total partition + duplicate ids (Commit G) -------------------------
    check("every shipped-shape plan classifies into exactly one group",
          all(_plan_group(_p) for _p in _fmut()["plans"]))
    for _kind, _group in (("open-end-promotional-credit", "promotional"),
                          ("closed-end-installment", "installment"),
                          ("lease-to-own", "evergreen"),
                          ("credit-builder", "evergreen"),
                          ("informational", "evergreen")):
        check(f"kind {_kind!r} maps to group {_group!r}",
              _plan_group({"kind": _kind}) == _group)
    check("every allowed FINANCING_PLAN_KINDS value is classified (no silent drop)",
          all(_plan_group({"kind": _k}) for _k in FINANCING_PLAN_KINDS))
    check("scenario overrides kind for classification",
          _plan_group({"kind": "closed-end-installment",
                       "presentationScenario": "mexico-delivery"}) == "scenario")
    check("unclassifiable plan -> validation error (never silently dropped)",
          any("matches no renderer presentation group" in e for e in
              _fin_with(lambda m: _add_plan(m, id="ghost", kind="informational",
                                            presentationScenario="nope")).errors))
    check("duplicate plan ids -> error",
          any("duplicate plan id" in e for e in
              _fin_with(lambda m: _add_plan(m, id=m["plans"][0]["id"])).errors))
    check("unique plan ids -> no duplicate error",
          not any("duplicate plan id" in e for e in
                  _fin_with(lambda m: _add_plan(m, id="unique-one")).errors))

    # ---- classification drives the ungated guard; plan ids do not -----------
    check("promotional group: only provider is ungated",
          _ungated_plan_fields({"kind": "open-end-promotional-credit"}) == ("provider",))
    check("installment group: headline+disclosure ungated, detail gated",
          _ungated_plan_fields({"kind": "closed-end-installment"})
          == ("provider", "headline", "disclosure"))
    check("evergreen group: headline+detail+disclosure ungated",
          _ungated_plan_fields({"kind": "lease-to-own"})
          == ("provider", "headline", "detail", "disclosure"))
    check("scenario group: headline+disclosure ungated, detail/example gated",
          _ungated_plan_fields({"kind": "closed-end-installment",
                                "presentationScenario": "mexico-delivery"})
          == ("provider", "headline", "disclosure"))
    check("renaming a plan id does not change its classification",
          _plan_group({"id": "anything-at-all", "kind": "closed-end-installment"})
          == _plan_group({"id": "lacks-in-house", "kind": "closed-end-installment"}))
    check("an evergreen plan re-declared promotional is GATED by both layers "
          "(the old id-driven table let it render ungated)",
          _plan_group({"id": "lease-to-own", "kind": "open-end-promotional-credit"})
          == "promotional"
          and _ungated_plan_fields({"id": "lease-to-own",
                                    "kind": "open-end-promotional-credit"}) == ("provider",))
    check("scenario plan headline stays guarded whatever its id",
          _ungated_rejected("headline",
                            lambda m: _add_plan(
                                m, id="whatever-id",
                                presentationScenario="mexico-delivery",
                                headline={"en": "24% APR for 24 months",
                                          "es": "24% APR por 24 meses"})))

    # ---- quiz definition (structure contract) --------------------------------
    def _bl(s):
        return {"en": s, "es": s + " (es)"}

    def _gq():
        """Canonical-shaped quiz that passes with zero errors/warnings."""
        questions = []
        for qid, qtype, opt_ids in QUIZ_CANONICAL:
            q = {"id": qid, "category": _bl("Cat"), "question": _bl("Q?"),
                 "helpText": _bl("Help"), "type": qtype}
            if qtype == "slider":
                q.update({"min": 1, "max": 10, "defaultValue": 5,
                          "labels": [_bl("Soft"), _bl("Medium"), _bl("Firm")]})
            else:
                q["options"] = [
                    {"id": oid, "label": _bl(oid), "icon": "check",
                     "sublabel": _bl("sub"), "scores": {}}
                    for oid in opt_ids]
            questions.append(q)
        return {"questions": questions}

    def _q(quiz, qid):
        return next(x for x in quiz["questions"] if x["id"] == qid)

    check("quiz absent -> ok (no-op)", validate_quiz(None).ok)
    check("quiz canonical shape -> ok", validate_quiz(_gq()).ok)
    check("quiz non-object -> error", not validate_quiz(["x"]).ok)

    qdel = _gq(); qdel["questions"].pop(0)
    check("quiz missing question -> canonical-sequence error",
          any("canonical id/type sequence" in e for e in
              validate_quiz(qdel).errors))

    qswap = _gq()
    qswap["questions"][0], qswap["questions"][1] = \
        qswap["questions"][1], qswap["questions"][0]
    check("quiz reordered questions -> canonical-sequence error",
          any("canonical id/type sequence" in e for e in
              validate_quiz(qswap).errors))

    qopt = _gq(); _q(qopt, "trigger")["options"][0]["id"] = "renamed"
    check("quiz renamed option id -> error",
          any("option ids must be exactly" in e for e in
              validate_quiz(qopt).errors))

    qtag = _gq(); _q(qtag, "sleep_position")["options"][0]["scores"] = {"plushh": 2}
    check("quiz unknown score tag -> error (typo protection)",
          any("unknown score tag" in e for e in validate_quiz(qtag).errors))

    qpts = _gq(); _q(qpts, "sleep_position")["options"][0]["scores"] = {"plush": 9}
    check("quiz score beyond FEATURE_CAP -> error",
          any("1..5" in e for e in validate_quiz(qpts).errors))

    qes = _gq(); _q(qes, "trigger")["options"][0]["label"] = {"en": "only-EN"}
    check("quiz option label missing ES -> error",
          any("label missing EN or ES" in e for e in validate_quiz(qes).errors))

    qskip = _gq()
    _q(qskip, "partner_disturbance")["skipIf"] = \
        {"question": "partner_sleep", "answer": "solo"}
    check("quiz valid skipIf (earlier question) -> ok", validate_quiz(qskip).ok)

    qfwd = _gq()
    _q(qfwd, "partner_sleep")["skipIf"] = \
        {"question": "sleep_position", "answer": "side"}
    check("quiz skipIf forward reference -> error",
          any("not an earlier question" in e for e in validate_quiz(qfwd).errors))

    qhide = _gq()
    _q(qhide, "temperature")["options"][3]["hideIf"] = \
        {"question": "partner_sleep", "answer": "nope"}
    check("quiz hideIf unknown answer -> error",
          any("is not an option of" in e for e in validate_quiz(qhide).errors))

    qcv = _gq()
    _q(qcv, "body_type")["copyVariants"] = [{
        "when": {"question": "partner_sleep", "answerIn": ["partner", "family"]},
        "question": _bl("Alt?"), "helpText": _bl("Alt help")}]
    check("quiz valid copyVariants -> ok", validate_quiz(qcv).ok)

    qcvbad = _gq()
    _q(qcvbad, "body_type")["copyVariants"] = [{
        "when": {"question": "partner_sleep", "answerIn": ["nope"]},
        "question": _bl("Alt?")}]
    check("quiz copyVariants bad answerIn -> error",
          any("answerIn" in e for e in validate_quiz(qcvbad).errors))

    qkey = _gq(); _q(qkey, "body_type")["dynamicCopy"] = "leftover"
    check("quiz unknown question key (e.g. dynamicCopy) -> error",
          any("unknown keys" in e for e in validate_quiz(qkey).errors))

    qsl = _gq(); _q(qsl, "firmness")["defaultValue"] = 42
    check("quiz slider defaultValue out of range -> error",
          any("slider needs integer" in e for e in validate_quiz(qsl).errors))

    # ---- Daybreak governed scenarios (PR 2) ---------------------------------
    print("Daybreak governed scenarios:")
    from datetime import datetime, timedelta, timezone

    def _iso(delta_minutes):
        return (datetime.now(timezone.utc)
                + timedelta(minutes=delta_minutes)).isoformat()

    def _ce(**over):
        sc = {
            "kind": "current-event",
            "enabledByOwner": False,
            "authority": {"owner": "", "role": "merchandising"},
            "startAt": "2026-08-31T00:00:00-05:00",
            "endsAt": "2026-09-09T23:59:59-05:00",
            "maxAgeDays": 7,
            "esReviewStatus": "pending-native-legal-review",
            "name": {"en": "Event", "es": "Evento"},
            "whyItEnds": {"en": "Advertised event closes.",
                          "es": "El evento anunciado termina."},
            "disclosure": {"en": "Terms confirmed in store.",
                           "es": "Términos confirmados en tienda."},
            "items": [],
            "storewide": [],
        }
        sc.update(over)
        return sc

    def _ce_enabled(**over):
        base = _ce(enabledByOwner=True,
                   authority={"owner": "M. Example", "role": "merchandising"},
                   verifiedAt=_iso(-30),
                   sourceUrl="https://www.lacks.com/promotions",
                   esReviewStatus="approved-native-legal-review")
        base.update(over)
        return base

    def _pb(sc=None, **over):
        p = {"schemaVersion": 1, "activeScenario": None,
             "allowedSourceHosts": ["lacks.com"],
             "scenarios": {} if sc is None else {"ev": sc}}
        p.update(over)
        return p

    def _vp(promos, **kw):
        kw.setdefault("mattress_ids", {"g1", "g2", "b3"})
        kw.setdefault("mattress_brands", {"Restonic", "Chattam & Wells", "Genesis"})
        kw.setdefault("allowed_source_hosts", ["lacks.com", "www.lacks.com"])
        return validate_promotions({"promotions": promos}, **kw)

    def _err(promos, needle, **kw):
        return any(needle in e for e in _vp(promos, **kw).errors)

    # -- positives ------------------------------------------------------------
    check("inert production block (empty scenarios) passes", _vp(_pb()).ok)
    check("valid disabled current-event draft passes", _vp(_pb(_ce())).ok)
    check("valid enabled + selected current-event passes",
          _vp(_pb(_ce_enabled(), activeScenario="ev")).ok)
    good_item = {"id": "i1", "badge": {"en": "B", "es": "B"},
                 "headline": {"en": "H", "es": "H"},
                 "eligibleBrands": ["Restonic"]}
    check("valid disabled draft with a product item passes",
          _vp(_pb(_ce(items=[dict(good_item)]))).ok)
    check("legacy flat promotions unaffected by governed rules",
          _vp({"items": [{"id": "x", "badge": {"en": "B", "es": "B"},
                          "headline": {"en": "H", "es": "H"}}]}).ok)

    # -- top level ------------------------------------------------------------
    check("schemaVersion missing -> error", _err(_pb(_ce(), schemaVersion=None), "schemaVersion"))
    check("schemaVersion 2 -> error", _err(_pb(_ce(), schemaVersion=2), "schemaVersion"))
    check("schemaVersion bool True (bool masquerading as int) -> error",
          _err(_pb(_ce(), schemaVersion=True), "schemaVersion"))
    check("activeScenario non-string -> error",
          _err(_pb(_ce(), activeScenario=7), "null or a scenario id"))
    check("activeScenario naming an undefined scenario -> error",
          _err(_pb(_ce(), activeScenario="ghost"), "not a defined scenario"))
    check("scenarios non-object -> error",
          any("scenarios must be an object" in e
              for e in validate_promotions({"promotions": {"scenarios": 3}}).errors))
    check("non-object scenario -> error, no crash",
          any("must be an object" in e
              for e in _vp(_pb(**{"scenarios": {"ev": "nope"}})).errors))
    check("allowedSourceHosts empty -> error",
          _err(_pb(_ce(), allowedSourceHosts=[]), "allowedSourceHosts"))
    for bad_host, why in [(" lacks.com", "padded"), ("LACKS.com", "lowercase"),
                          ("https://lacks.com", "scheme"), ("lacks.com/promo", "scheme or path"),
                          ("lacks.com:8443", "port"), ("*.lacks.com", "wildcard"),
                          ("", "blank")]:
        check(f"allowedSourceHosts entry {bad_host!r} -> error",
              _err(_pb(_ce(), allowedSourceHosts=[bad_host]), "allowedSourceHosts"))
    check("allowedSourceHosts widening the canonical list -> error",
          _err(_pb(_ce(), allowedSourceHosts=["evil.example.com"]), "widens"))
    check("subdomain of a canonical host does not widen",
          not _err(_pb(_ce(), allowedSourceHosts=["shop.lacks.com"]), "widens"))
    check("no canonical allowlist configured -> fail closed",
          _err(_pb(_ce()), "failing closed", allowed_source_hosts=[]))

    # -- scenario keys / forbidden shapes ------------------------------------
    check("unknown scenario key -> error", _err(_pb(_ce(surprise=1)), "surprise"))
    for bad_key in ["campaigns", "eligibleQuizTags", "quizAnswers",
                    "recommendationScores", "customerSegment", "inferredUrgency",
                    "inventoryCount", "customersViewing", "countdownSeconds",
                    "rollingDeadline", "resetAtMidnight"]:
        check(f"forbidden key {bad_key} -> error",
              _err(_pb(_ce(**{bad_key: 1})), "not permitted"))
    check("forbidden shape nested inside an item eligibility object -> error",
          _err(_pb(_ce(items=[dict(good_item,
                                   eligibleMattressIds={"quizTagFilter": "hot"})])),
               "not permitted"))
    check("answer-shaped key variant (answerBasedEligibility) -> error",
          _err(_pb(_ce(answerBasedEligibility=[])), "not permitted"))
    check("stock-shaped key variant (liveStockFeed) -> error",
          _err(_pb(_ce(liveStockFeed=True)), "not permitted"))

    # -- scenario fields ------------------------------------------------------
    for val in ["true", "false", 0, 1, None]:
        check(f"enabledByOwner {val!r} -> error",
              _err(_pb(_ce(enabledByOwner=val)), "real JSON boolean"))
    sc_no = _ce(); del sc_no["enabledByOwner"]
    check("enabledByOwner missing -> error", _err(_pb(sc_no), "real JSON boolean"))
    check("authority non-object -> error", _err(_pb(_ce(authority="me")), "authority"))
    check("authority with extra key -> error",
          _err(_pb(_ce(authority={"owner": "x", "role": "y", "phone": "z"})),
               "only owner and role"))
    sc_no = _ce(); del sc_no["startAt"]
    check("startAt missing -> error", _err(_pb(sc_no), "startAt is required"))
    sc_no = _ce(); del sc_no["endsAt"]
    check("endsAt missing -> error", _err(_pb(sc_no), "endsAt is required"))
    check("bare-date startAt -> error",
          _err(_pb(_ce(startAt="2026-08-31")), "timezone offset"))
    check("offset-less endsAt -> error",
          _err(_pb(_ce(endsAt="2026-09-09T23:59:59")), "timezone offset"))
    check("inverted window -> error",
          _err(_pb(_ce(startAt="2026-09-10T00:00:00-05:00")), "strictly later"))
    check("equal start/end -> error",
          _err(_pb(_ce(startAt="2026-09-09T23:59:59-05:00")), "strictly later"))
    check("maxAgeDays bool -> error", _err(_pb(_ce(maxAgeDays=True)), "maxAgeDays"))
    check("maxAgeDays 0 -> error", _err(_pb(_ce(maxAgeDays=0)), "maxAgeDays"))
    check("maxAgeDays 90 -> error", _err(_pb(_ce(maxAgeDays=90)), "maxAgeDays"))
    check("esReviewStatus outside enum -> error",
          _err(_pb(_ce(esReviewStatus="approved")), "esReviewStatus"))
    for field in ("name", "whyItEnds", "disclosure"):
        sc_bad = _ce(**{field: {"en": "only english"}})
        check(f"{field} missing ES -> error", _err(_pb(sc_bad), field))
        sc_bad = _ce(**{field: {"es": "solo español"}})
        check(f"{field} missing EN -> error", _err(_pb(sc_bad), field))
    check("items non-array -> error", _err(_pb(_ce(items="x")), "must be an array"))
    check("storewide non-array -> error", _err(_pb(_ce(storewide=7)), "must be an array"))
    check("non-object item -> error, no crash",
          _err(_pb(_ce(items=["oops"])), "must be an object"))

    # -- activation coupling / evidence --------------------------------------
    check("enabled but not selected -> error",
          _err(_pb(_ce_enabled()), "must be the selected activeScenario"))
    check("selected but not enabled -> error",
          _err(_pb(_ce(), activeScenario="ev"), "enabledByOwner is not true"))
    check("enabled without owner -> error",
          _err(_pb(_ce_enabled(authority={"owner": "", "role": "r"}),
                   activeScenario="ev"), "authority.owner"))
    check("enabled without role -> error",
          _err(_pb(_ce_enabled(authority={"owner": "o", "role": ""}),
                   activeScenario="ev"), "authority.role"))
    sc_bad = _ce_enabled(); del sc_bad["verifiedAt"]
    check("enabled without verifiedAt -> error",
          _err(_pb(sc_bad, activeScenario="ev"), "verifiedAt"))
    check("enabled with future verifiedAt -> error",
          _err(_pb(_ce_enabled(verifiedAt=_iso(60)), activeScenario="ev"),
               "materially in the future"))
    check("enabled with verifiedAt 2 min ahead (inside skew) passes",
          _vp(_pb(_ce_enabled(verifiedAt=_iso(2)), activeScenario="ev")).ok)
    check("enabled with stale verifiedAt -> error",
          _err(_pb(_ce_enabled(verifiedAt=_iso(-60 * 24 * 8)), activeScenario="ev"),
               "older than maxAgeDays"))
    sc_bad = _ce_enabled(); del sc_bad["sourceUrl"]
    check("enabled without sourceUrl -> error",
          _err(_pb(sc_bad, activeScenario="ev"), "sourceUrl"))
    check("enabled with http source -> error",
          _err(_pb(_ce_enabled(sourceUrl="http://www.lacks.com/x"),
                   activeScenario="ev"), "sourceUrl"))
    check("enabled with credentialed source -> error",
          _err(_pb(_ce_enabled(sourceUrl="https://u:p@www.lacks.com/x"),
                   activeScenario="ev"), "sourceUrl"))
    check("enabled with non-default port -> error",
          _err(_pb(_ce_enabled(sourceUrl="https://www.lacks.com:8443/x"),
                   activeScenario="ev"), "sourceUrl"))
    check("enabled with non-allowlisted host -> error",
          _err(_pb(_ce_enabled(sourceUrl="https://evil.example.com/x"),
                   activeScenario="ev"), "canonical promotion source-host"))
    check("build/shipped allowlist disagreement -> error",
          _err(_pb(_ce_enabled(sourceUrl="https://www.synchrony.com/x"),
                   activeScenario="ev"),
               "must agree",
               allowed_source_hosts=["lacks.com", "www.lacks.com",
                                     "www.synchrony.com"]))
    check("enabled without approved ES review -> error (whole-campaign gate)",
          _err(_pb(_ce_enabled(esReviewStatus="pending-native-legal-review"),
                   activeScenario="ev"), "bilingual review gate"))

    # -- items ---------------------------------------------------------------
    check("item unknown key -> error",
          _err(_pb(_ce(items=[dict(good_item, sparkle=1)])), "sparkle"))
    check("item-level endsAt -> error",
          _err(_pb(_ce(items=[dict(good_item, endsAt="2026-09-01T00:00:00-05:00")])),
               "item-level endsAt"))
    for gov_key in ("verifiedAt", "maxAgeDays", "authority", "esReviewStatus"):
        check(f"item-level {gov_key} -> error",
              _err(_pb(_ce(items=[dict(good_item, **{gov_key: "x"})])),
                   "not permitted" if gov_key == "esReviewStatus" else gov_key))
    check("duplicate item ids -> error",
          _err(_pb(_ce(items=[dict(good_item), dict(good_item)])), "duplicate"))
    check("item missing id -> error",
          _err(_pb(_ce(items=[{k: v for k, v in good_item.items() if k != "id"}])),
               "nonblank id"))
    check("item without any eligibility selector -> error",
          _err(_pb(_ce(items=[{"id": "i1", "badge": {"en": "B", "es": "B"},
                               "headline": {"en": "H", "es": "H"}}])),
               "eligibility selector"))
    check("unresolved mattress id -> error",
          _err(_pb(_ce(items=[dict(good_item, eligibleBrands=None,
                                   eligibleMattressIds=["zz9"])])),
               "not in mattresses"))
    check("unresolved brand -> error",
          _err(_pb(_ce(items=[dict(good_item, eligibleBrands=["Restonic Inc"])])),
               "does not exactly match"))
    check("duplicate brand entries -> error",
          _err(_pb(_ce(items=[dict(good_item,
                                   eligibleBrands=["Restonic", "Restonic"])])),
               "duplicate eligibleBrands"))
    check("item badge missing ES -> error",
          _err(_pb(_ce(items=[dict(good_item, badge={"en": "B"})])), "badge"))
    check("storewide entry with mattress eligibility -> error",
          _err(_pb(_ce(storewide=[{"id": "s1", "badge": {"en": "B", "es": "B"},
                                   "headline": {"en": "H", "es": "H"},
                                   "eligibleBrands": ["Restonic"]}])),
               "storewide"))

    # -- illustrative-demo ----------------------------------------------------
    def _ill(**over):
        sc = {
            "kind": "illustrative-demo",
            "demoOnly": True,
            "disableEmailSubmission": True,
            "verified": False,
            "name": {"en": "Preview", "es": "Vista Previa"},
            "disclosure": {
                "en": "DEMO — Illustrative offers only. These are not current "
                      "Lacks promotions.",
                "es": "DEMOSTRACIÓN — Ofertas ilustrativas. No son promociones "
                      "vigentes de Lacks.",
            },
            "items": [dict(good_item)],
            "storewide": [],
        }
        sc.update(over)
        return sc

    check("valid illustrative demo passes with allow_illustrative=True",
          _vp(_pb(_ill(), activeScenario="ev"), allow_illustrative=True).ok)
    check("illustrative demo in production path -> error",
          _err(_pb(_ill()), "must never ship in production"))
    check("demoOnly false -> error",
          _err(_pb(_ill(demoOnly=False)), "demoOnly", allow_illustrative=True))
    check("disableEmailSubmission missing -> error",
          _err(_pb(_ill(disableEmailSubmission=None)), "disableEmailSubmission",
               allow_illustrative=True))
    check("verified true -> error",
          _err(_pb(_ill(verified=True)), "verified", allow_illustrative=True))
    check("illustrative sourceUrl -> error",
          _err(_pb(_ill(sourceUrl="https://www.lacks.com/x")), "sourceUrl",
               allow_illustrative=True))
    check("illustrative authority -> error",
          _err(_pb(_ill(authority={"owner": "x"})), "authority",
               allow_illustrative=True))
    check("illustrative enabledByOwner -> error",
          _err(_pb(_ill(enabledByOwner=True)), "enabledByOwner",
               allow_illustrative=True))
    check("illustrative verifiedAt -> error",
          _err(_pb(_ill(verifiedAt="2026-01-01T00:00:00-05:00")), "verifiedAt",
               allow_illustrative=True))
    check("illustrative durationHours inside scenario -> error",
          _err(_pb(_ill(durationHours=72)), "durationHours",
               allow_illustrative=True))
    check("missing disclosure -> error",
          _err(_pb(_ill(disclosure=None)), "disclosure", allow_illustrative=True))
    check("disclosure missing ES -> error",
          _err(_pb(_ill(disclosure={"en": "DEMO — not current offers."})),
               "disclosure", allow_illustrative=True))
    check("EN disclosure without 'not current' denial -> error",
          _err(_pb(_ill(disclosure={"en": "Great illustrative offers!",
                                    "es": "DEMOSTRACIÓN — No son promociones "
                                          "vigentes de Lacks."})),
               "EN disclosure", allow_illustrative=True))
    check("ES disclosure without the denial -> error",
          _err(_pb(_ill(disclosure={"en": "DEMO — these are not current offers.",
                                    "es": "¡Grandes ofertas!"})),
               "ES disclosure", allow_illustrative=True))
    check("dollar claim in EN copy -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    headline={"en": "Save $400 now",
                                              "es": "Ahorra ahora"})])),
               "dollar-savings", allow_illustrative=True))
    check("percentage claim in ES copy -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    headline={"en": "Big event",
                                              "es": "Ahorra 20 % hoy"})])),
               "percentage-savings", allow_illustrative=True))
    check('"free" claim in EN copy -> error',
          _err(_pb(_ill(items=[dict(good_item,
                                    headline={"en": "Free pillow included",
                                              "es": "Almohada incluida"})])),
               '"free" claim', allow_illustrative=True))
    check("'gratis' claim in ES copy -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    headline={"en": "Pillow included",
                                              "es": "Almohada gratis"})])),
               '"free" claim', allow_illustrative=True))
    check("inventory claim -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    detail={"en": "Only 3 left today",
                                            "es": "Pocas unidades"})])),
               "inventory claim", allow_illustrative=True))
    check("customer-activity claim -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    detail={"en": "12 customers are considering "
                                                  "this", "es": "Muy popular"})])),
               "customer-activity", allow_illustrative=True))
    check("delivery-availability claim -> error",
          _err(_pb(_ill(items=[dict(good_item,
                                    detail={"en": "Delivered tomorrow",
                                            "es": "Llega pronto"})])),
               "delivery-availability", allow_illustrative=True))
    check("illustrative unresolved brand -> error",
          _err(_pb(_ill(items=[dict(good_item, eligibleBrands=["Bel-O-Pedic"])])),
               "does not exactly match", allow_illustrative=True))
    check("illustrative malformed item -> error, no crash",
          _err(_pb(_ill(items=[42])), "must be an object", allow_illustrative=True))

    print(f"\nSelf-test: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


def main(argv=None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true",
                        help="Run built-in validation checks and exit.")
    args = parser.parse_args(argv)
    if args.self_test:
        print("validation.py self-test:")
        return _self_test()
    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
