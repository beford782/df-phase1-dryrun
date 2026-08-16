#!/usr/bin/env python3
"""Generate and VERIFY the financing QR committed at images/qr-financing.svg.

The QR encodes the retailer's official financing page ONLY — no PII, no
parameters, no session value, no third-party QR service and no network request:
the image is generated locally at build time and committed, so nothing about a
customer's session ever reaches a QR vendor and the payload can be decoded and
tested offline.

SOURCE OF TRUTH is data/store-config.json -> financing.sourceUrl, because that
is the exact artifact the runtime consumes: the printed destination, the email
URL and this QR then provably come from one value. The canonical
incoming/lacks_financing.json stays authoritative through the existing
canonical -> workbook -> shipped pipeline, whose parity tests already assert
the two agree. Required order when the financing URL changes:

    1. edit incoming/lacks_financing.json
    2. python incoming/build_lacks_workbook.py
       python tools/convert_store_data.py incoming/Lacks_Store_Data.xlsx \
           --output-dir . --skip-image-normalization
    3. python incoming/generate_financing_qr.py          (regenerate)
       python incoming/generate_financing_qr.py --check  (verify)

Reading the shipped config rather than the canonical source is deliberate: the
QR must never encode a destination the runtime is not yet serving.

Usage:
    python incoming/generate_financing_qr.py            # write the SVG
    python incoming/generate_financing_qr.py --check    # read-only verify
    [--config PATH] [--output PATH]                     # for isolated tests

The encoded target must be a bare official page URL: any query string, URL
parameter or fragment is refused, so no tracking, session or customer value
can ride along in the QR.

WHAT --check PROVES, stated precisely:

  * the file CONFORMS TO the one accepted canonical document grammar — an XML
    declaration, one default SVG namespace declaration, an svg root and a single
    path, each carrying exactly its required unqualified attributes with their
    required values; no processing instructions, comments, DTDs, entities, extra
    namespaces, namespace-qualified attributes, or text content.
  * every rendered module forms a valid version 1-3, level M symbol: all three
    finder patterns, their separators, both timing patterns, the version's
    alignment pattern and the fixed dark module match the specification exactly,
    and both format-information copies are valid BCH codewords that agree.
  * the encoded region is fully accounted for — data codewords, Reed-Solomon
    error-correction codewords recomputed and compared byte for byte, and the
    remainder bits verified zero. No traversal bit is left unexamined.
  * it carries exactly ONE byte-mode segment, with a valid terminator, zero-fill
    and standard 0xEC/0x11 padding. (A QR may hold several segments and a scanner
    reads their CONCATENATION, so stopping at the first would certify a symbol
    whose first segment was the configured URL and whose second sent the customer
    elsewhere.)
  * the complete decoded payload equals the configured, allowlisted
    financing.sourceUrl.

WHAT IT DOES NOT PROVE. It is NOT a byte-identity check against this generator's
output: serialization order, whitespace and the generator's mask choice are not
compared, so a differently-serialized but conforming file passes. It does not
prove the destination is reachable, and it cannot speak for how any particular
renderer or scanner behaves. A real phone-camera scan of the printed kiosk QR
over the live network remains a separate manual pre-pilot check.

A decoded payload is UNTRUSTED input. Diagnostics identify it by digest and
length and never echo it, so a mismatching asset cannot republish its contents
into a terminal or a log.

--check and the decoder are stdlib-only. GENERATION needs the pinned qrcode
package: python -m pip install -r incoming/requirements-qr.txt
"""
import argparse
import hashlib
import io
import json
import os
import re
import sys
import xml.parsers.expat
from urllib.parse import urlsplit

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402

DEFAULT_CONFIG = os.path.join(REPO, "data", "store-config.json")
DEFAULT_OUTPUT = os.path.join(REPO, "images", "qr-financing.svg")

QR_BORDER = 2
QR_EC_NAME = "M"

# The decoder deliberately supports a BOUNDED subset and ENFORCES it:
# QR versions 1-3, error-correction level M, byte mode. Versions 1-3 carry a
# single EC block and one alignment pattern, so no codeword de-interleaving is
# needed; level M is what build_svg() always emits, and other levels are
# refused rather than assumed. A longer financing URL would reach version 4+,
# where interleaving applies — that raises QrUnsupportedError rather than
# silently mis-decoding.
MAX_SUPPORTED_VERSION = 3
SUPPORTED_EC_FIELD = 0          # format-info field 0 == level M
_EC_FIELD_NAMES = {0: 'M', 1: 'L', 2: 'H', 3: 'Q'}


class QrTargetError(Exception):
    """The configured target is missing or fails the financing URL contract."""


class QrUnsupportedError(Exception):
    """The committed symbol is outside this decoder's supported subset."""


class QrPayloadMismatch(Exception):
    """The committed SVG does not encode the configured target."""


# ---------------------------------------------------------------- target ----

def load_target(config_path=DEFAULT_CONFIG):
    """Return (config, sourceUrl) from the shipped store config."""
    try:
        with io.open(config_path, encoding="utf-8") as f:
            config = json.load(f)
    except OSError as e:
        raise QrTargetError(f"cannot read config {config_path}: {e}")
    except ValueError as e:
        raise QrTargetError(f"config {config_path} is not valid JSON: {e}")
    fin = config.get("financing")
    if not isinstance(fin, dict):
        raise QrTargetError("config has no financing block — nothing to encode")
    if fin.get("enabled") is not True:
        raise QrTargetError("financing.enabled is not true — refusing to generate a QR "
                            "for a disabled financing experience")
    target = fin.get("sourceUrl")
    if not isinstance(target, str):
        raise QrTargetError(f"financing.sourceUrl must be a string, got {type(target).__name__}")
    if not target.strip():
        raise QrTargetError("financing.sourceUrl is blank")
    if target != target.strip():
        raise QrTargetError("financing.sourceUrl has leading/trailing whitespace")
    return config, target


def sanitize_url_for_error(url):
    """scheme://host[:port]/path only — userinfo, query and fragment removed, so
    a diagnostic can never leak a credential, token or tracking value."""
    try:
        p = urlsplit(str(url))
        host = p.hostname or ""
        if not p.scheme or not host:
            return "<unparseable url>"
        port = f":{p.port}" if p.port else ""
        return f"{p.scheme}://{host}{port}{p.path}"
    except ValueError:
        return "<unparseable url>"


def validate_target(config, target):
    """Apply the repository's own financing URL contract. No second allowlist
    lives here: the hosts and the safety rules come from tools/source_hosts.json
    and tools/validation.py so there is exactly one authority."""
    hosts = validation.load_source_hosts().get("financingSourceHosts") or []
    if not hosts:
        raise QrTargetError("tools/source_hosts.json has no financingSourceHosts — "
                            "failing closed rather than encoding an unvetted host")
    if not validation._is_allowed_source(target, hosts):
        raise QrTargetError(
            f"financing.sourceUrl {sanitize_url_for_error(target)!r} is not a safe "
            f"allowlisted financing URL — it must be https, carry no credentials, use "
            f"the default port, and sit on an allowlisted host (see "
            f"tools/source_hosts.json financingSourceHosts)")
    # PRIVACY CONTRACT: the QR must encode a bare official page URL. Reject the
    # whole query/parameter/fragment class rather than guessing at sensitive
    # parameter names — no tracking, session or customer value may ride along.
    parts = urlsplit(target)
    if parts.query:
        raise QrTargetError(
            f"financing.sourceUrl carries a query string; the QR must encode a bare "
            f"page URL so no tracking, session or customer value is embedded "
            f"(offending field sanitised: {sanitize_url_for_error(target)!r})")
    if parts.fragment:
        raise QrTargetError(
            f"financing.sourceUrl carries a fragment; the QR must encode a bare page "
            f"URL (sanitised: {sanitize_url_for_error(target)!r})")
    if ";" in parts.path:
        raise QrTargetError(
            f"financing.sourceUrl carries URL path parameters (';'); the QR must "
            f"encode a bare page URL (sanitised: {sanitize_url_for_error(target)!r})")
    # Never encode a destination that is on file as NOT verified available.
    mxa = (config.get("financing") or {}).get("mexicoApplicationUrl")
    if isinstance(mxa, dict) and mxa.get("verified") is not True and mxa.get("url"):
        if validation._url_identity(target) == validation._url_identity(mxa["url"]):
            raise QrTargetError(
                f"financing.sourceUrl {sanitize_url_for_error(target)!r} resolves to "
                f"the unverified mexicoApplicationUrl target — an allowlisted host "
                f"does not make a 404 destination scannable")
    return target


# ------------------------------------------------------------- generation ----

def build_svg(target):
    """Deterministic local SVG for `target`, as EXACTLY ONE byte-mode segment.

    GENERATOR GUARANTEE (distinct from what the verifier proves): every SVG this
    returns, for a target inside the supported version range, carries the whole
    UTF-8 target in a single byte-mode segment.

    `qr.add_data(str)` would run qrcode's optimizer, which splits a string into
    several segments whenever a run compresses better in another mode — e.g.
    "https://www.lacks.com/SUPERSECRET-MISMATCH" became byte
    "https://www.lacks.com" plus alphanumeric "/SUPERSECRET-MISMATCH". That is a
    legal QR, but the verifier refuses multi-segment symbols by design, so the
    generator could emit an asset its own --check rejected. Passing a QRData
    instance appends it verbatim and bypasses the optimizer entirely, which is
    a structural guarantee rather than a tuned threshold.
    """
    try:
        import qrcode
        import qrcode.image.svg
        from qrcode.util import QRData, MODE_8BIT_BYTE
    except ImportError as e:
        raise QrTargetError(f"generation needs the pinned qrcode package "
                            f"(`python -m pip install -r incoming/requirements-qr.txt`): {e}")
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=QR_BORDER)
    qr.add_data(QRData(target.encode("utf-8"), mode=MODE_8BIT_BYTE))
    qr.make(fit=True)
    # Defensive invariant, not a test-covered branch: while the QRData path
    # above is used this can never fire, since add_data() appends a QRData
    # instance verbatim. It guards a future edit that reintroduces the optimizer.
    if len(qr.data_list) != 1:
        raise QrTargetError("internal: generation produced %d segments, expected 1"
                            % len(qr.data_list))
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")


def write_svg(svg, output_path=DEFAULT_OUTPUT):
    """Atomic: write a sibling temp file, fsync, then os.replace(). An I/O
    failure part way through can therefore never leave a previously valid
    committed asset truncated."""
    d = os.path.dirname(os.path.abspath(output_path)) or "."
    tmp = os.path.join(d, "." + os.path.basename(output_path) + ".tmp")
    try:
        with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(svg)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, output_path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# ---------------------------------------------------------------- decoder ----
# Recovers the payload from the SVG's own module grid. It never reads a TARGET
# constant, the filename, a comment, or the config — the answer comes only from
# the committed bytes.

_SUBPATH = re.compile(r"^M(\d+),(\d+)H(\d+)V(\d+)H(\d+)$")

SVG_NS = "http://www.w3.org/2000/svg"
# The ONLY document shape this checker accepts — exactly what the pinned local
# generator emits. Anything else (a second path, an overlay rect, an external
# image, a script, a use/foreignObject, an event handler, a transform) is
# refused, because "the first path decodes correctly" does not prove the asset
# RENDERS as only that QR.
# The EXACT document the pinned generator emits (qrcode 8.2 SvgPathImage), not
# a denylist of bad values. Only the path data and the size-derived dimensions
# vary. Restricting attribute NAMES is not enough: fill-opacity="0",
# fill="#ffffff" or width="0mm" keep the document "structurally valid" while
# rendering nothing scannable, so presence AND value are both required.
_QR_PATH_ID = "qr-path"
_ROOT_FIXED = {"version": "1.1"}
# width/height/viewBox are checked against the RECOVERED symbol size instead of
# a literal, because they legitimately vary with the payload's QR version.
_ROOT_SIZED = ("width", "height", "viewBox")
_REQUIRED_ROOT_ATTRS = set(_ROOT_FIXED) | set(_ROOT_SIZED)
_PATH_FIXED = {
    "id": _QR_PATH_ID,
    "fill": "#000000",
    "fill-opacity": "1",
    "fill-rule": "nonzero",
    "stroke": "none",
}
_REQUIRED_PATH_ATTRS = set(_PATH_FIXED) | {"d"}
# Data codewords at error-correction level M for the supported versions. Used to
# bound the data region so trailing segments and padding can be verified.
_DATA_CODEWORDS_M = {1: 16, 2: 28, 3: 44}


def _payload_fingerprint(payload):
    """Identify an UNTRUSTED decoded payload without reproducing it.

    A decoded payload is attacker-controlled bytes that merely happen to parse
    as UTF-8. Echoing it into an error, a log or a terminal would republish
    whatever it contains, so diagnostics get a digest and a length instead."""
    if isinstance(payload, bytes):
        raw = payload
    else:
        raw = str(payload).encode("utf-8", "replace")
    return "sha256:%s, %d bytes" % (hashlib.sha256(raw).hexdigest()[:12], len(raw))


def _format_codeword(ec_field, mask):
    """Valid 15-bit format string: BCH(15,5) then the 0x5412 mask."""
    data = (ec_field << 3) | mask
    rem = data << 10
    for i in range(4, -1, -1):
        if rem & (1 << (i + 10)):
            rem ^= 0b10100110111 << i
    return ((data << 10) | rem) ^ 0b101010000010010


_VALID_FORMATS = {_format_codeword(ec, m): (ec, m) for ec in range(4) for m in range(8)}

# All eight data-mask formulas remain supported; the generator may pick any.
_MASKS = {
    0: lambda i, j: (i + j) % 2 == 0,
    1: lambda i, j: i % 2 == 0,
    2: lambda i, j: j % 3 == 0,
    3: lambda i, j: (i + j) % 3 == 0,
    4: lambda i, j: (i // 2 + j // 3) % 2 == 0,
    5: lambda i, j: (i * j) % 2 + (i * j) % 3 == 0,
    6: lambda i, j: ((i * j) % 2 + (i * j) % 3) % 2 == 0,
    7: lambda i, j: ((i + j) % 2 + (i * j) % 3) % 2 == 0,
}


class _CanonicalSvgReader:
    """Parse the asset with expat so namespace declarations, processing
    instructions, DTDs and entities are OBSERVED rather than silently dropped.

    ElementTree was the wrong tool for a security boundary here twice over.
    It discards prologue constructs (a stylesheet PI vanished), and it folds a
    namespace-qualified attribute into the same dict as its unqualified
    namesake, so `width="0mm" x:width="33mm"` collapsed to one entry and the
    LAST value won. A browser renders the unqualified 0mm; the verifier read
    the qualified 33mm. Every required attribute was smugglable that way,
    including `d` itself — the browser drew a decoy while the verifier decoded
    the real QR from `x:d`.
    """

    SEP = "\x01"          # cannot occur in a URI or an XML name

    def __init__(self):
        self.elements = []          # [(expanded_name, {attr: value})]
        self.stack = []
        self.ns_decls = []          # [(prefix, uri)]
        self.problems = []
        self.xml_decl = None        # (version, encoding, standalone) or None

    def _reject(self, why):
        self.problems.append(why)

    def parse(self, text):
        p = xml.parsers.expat.ParserCreate(namespace_separator=self.SEP)
        p.buffer_text = True
        # Entity expansion is refused outright; nothing in the canonical asset
        # needs it, and it is the classic amplification vector.
        try:
            p.DefaultHandler = None
        except AttributeError:
            pass

        def start(name, attrs):
            self.elements.append((name, dict(attrs)))
            self.stack.append(name)

        def end(name):
            if self.stack:
                self.stack.pop()

        def chars(data):
            if data.strip():
                self._reject("document contains text content %r" % data.strip()[:30])

        def xml_decl(version, encoding, standalone):
            self.xml_decl = (version, encoding, standalone)

        def cdata_start():
            # Rejected unconditionally, INCLUDING an empty section. The character
            # handler alone only catches non-whitespace, so `<![CDATA[]]>` and
            # `<![CDATA[ ]]>` would otherwise pass while still not being the
            # canonical document.
            self._reject("document contains a CDATA section; the canonical asset "
                         "has none")

        def pi(target, data):
            self._reject("document contains a processing instruction %r — the "
                         "canonical asset has none, and PI syntax can reference "
                         "external resources (e.g. xml-stylesheet)" % target)

        def comment(data):
            self._reject("document contains an XML comment; the canonical asset "
                         "has none")

        def doctype(name, sysid, pubid, has_internal):
            self._reject("document contains a DOCTYPE declaration")

        def entity(*args):
            self._reject("document declares an entity")

        def unparsed(*args):
            self._reject("document declares an unparsed entity")

        def notation(*args):
            self._reject("document declares a notation")

        def start_ns(prefix, uri):
            self.ns_decls.append((prefix, uri))

        def ext_ref(*args):
            self._reject("document references an external entity")
            return 0

        p.StartElementHandler = start
        p.EndElementHandler = end
        p.CharacterDataHandler = chars
        p.ProcessingInstructionHandler = pi
        p.CommentHandler = comment
        p.StartDoctypeDeclHandler = doctype
        p.EntityDeclHandler = entity
        p.UnparsedEntityDeclHandler = unparsed
        p.NotationDeclHandler = notation
        p.StartNamespaceDeclHandler = start_ns
        p.ExternalEntityRefHandler = ext_ref
        p.XmlDeclHandler = xml_decl
        p.StartCdataSectionHandler = cdata_start
        try:
            p.Parse(text.encode("utf-8") if isinstance(text, str) else text, True)
        except xml.parsers.expat.ExpatError as e:
            raise QrUnsupportedError("asset is not well-formed XML: %s" % e)
        return self


def _split_expanded(name, sep):
    """('uri', 'local') for a namespaced name, (None, 'local') otherwise."""
    if sep in name:
        uri, local = name.rsplit(sep, 1)
        return uri, local
    return None, name


def parse_svg_document(svg_text):
    """Validate the WHOLE document against the one canonical grammar and return
    (path d, root attributes). Raises QrUnsupportedError on anything else."""
    reader = _CanonicalSvgReader().parse(svg_text)
    # The prologue is checked AFTER parsing so malformed input reports as
    # malformed rather than as a bad declaration.
    #
    # POLICY: the declaration is enforced SEMANTICALLY \u2014 XML 1.0, UTF-8, no
    # standalone declaration \u2014 via expat's XmlDeclHandler, not by matching
    # leading text. Quote style, spacing and attribute formatting are NOT
    # constrained: this is a grammar checker, not a byte-identity checker.
    if svg_text.startswith("\ufeff"):
        raise QrUnsupportedError(
            "document begins with a byte-order mark; the canonical asset does not")
    if reader.xml_decl is None:
        raise QrUnsupportedError("document has no XML declaration")
    version, encoding, standalone = reader.xml_decl
    if version != "1.0":
        raise QrUnsupportedError("XML declaration version is %r, expected '1.0'" % version)
    if (encoding or "").upper() != "UTF-8":
        raise QrUnsupportedError(
            "XML declaration encoding is %r, expected 'UTF-8'" % encoding)
    if standalone != -1:
        raise QrUnsupportedError(
            "XML declaration carries standalone=%r; the canonical asset declares none"
            % ("yes" if standalone == 1 else "no"))
    sep = reader.SEP
    if reader.problems:
        raise QrUnsupportedError(reader.problems[0])

    # Exactly one namespace declaration: the DEFAULT SVG namespace. A second
    # declaration is what makes qualified-attribute smuggling expressible, and
    # the prefixed form (svg:svg) is not what the generator emits.
    if len(reader.ns_decls) != 1:
        raise QrUnsupportedError(
            "document declares %d namespaces; the canonical asset declares "
            "exactly one (the default SVG namespace)" % len(reader.ns_decls))
    prefix, uri = reader.ns_decls[0]
    if prefix is not None:
        raise QrUnsupportedError(
            "the SVG namespace is bound to prefix %r; the canonical asset uses "
            "the default (unprefixed) declaration" % prefix)
    if uri != SVG_NS:
        raise QrUnsupportedError("default namespace is %r, not the SVG namespace" % uri)

    if len(reader.elements) != 2:
        kinds = [_split_expanded(n, sep)[1] for n, _ in reader.elements]
        raise QrUnsupportedError(
            "document contains %d elements %s; the canonical asset is exactly "
            "one svg root and one path" % (len(reader.elements), kinds[:6]))

    (root_name, root_raw), (path_name, path_raw) = reader.elements
    if _split_expanded(root_name, sep) != (SVG_NS, "svg"):
        raise QrUnsupportedError("root element is not an SVG svg in the SVG namespace")
    if _split_expanded(path_name, sep) != (SVG_NS, "path"):
        raise QrUnsupportedError("the single child is not an SVG path in the SVG namespace")

    def unqualified(raw, where):
        """Reject every namespace-qualified attribute. A qualified attribute
        must NEVER satisfy an unqualified requirement: browsers apply the
        unqualified presentation attribute, so accepting the qualified twin
        lets the rendered and verified documents disagree."""
        out = {}
        for name, value in raw.items():
            ns, local = _split_expanded(name, sep)
            if ns is not None:
                raise QrUnsupportedError(
                    "%s carries namespace-qualified attribute %r (namespace %r); "
                    "a qualified attribute never satisfies an unqualified "
                    "requirement and browsers ignore it for presentation"
                    % (where, local, ns))
            if local.lower().startswith("on"):
                raise QrUnsupportedError("%s carries event-handler attribute %r"
                                         % (where, local))
            out[local] = value
        return out

    root_attrs = unqualified(root_raw, "root")
    path_attrs = unqualified(path_raw, "path")

    for attrs, required, where in ((root_attrs, _REQUIRED_ROOT_ATTRS, "root"),
                                   (path_attrs, _REQUIRED_PATH_ATTRS, "path")):
        extra = sorted(set(attrs) - required)
        if extra:
            raise QrUnsupportedError(
                "%s carries unexpected attribute(s) %s; the accepted grammar is "
                "exactly %s" % (where, extra, sorted(required)))
        missing = sorted(required - set(attrs))
        if missing:
            raise QrUnsupportedError(
                "%s is missing required attribute(s) %s" % (where, missing))

    for name, expected in _ROOT_FIXED.items():
        if root_attrs[name] != expected:
            raise QrUnsupportedError("root %s is %r, expected %r"
                                     % (name, root_attrs[name], expected))
    for name, expected in _PATH_FIXED.items():
        if path_attrs[name] != expected:
            raise QrUnsupportedError(
                "path %s is %r, expected %r — the modules must render as an "
                "opaque black QR, and this value does not guarantee that"
                % (name, path_attrs[name], expected))
    if not path_attrs["d"].strip():
        raise QrUnsupportedError("QR path has an empty d attribute")

    # Defence in depth, NOT the boundary: the structural checks above already
    # enumerate every attribute and value, so no URI can hide. This only makes
    # an accidental future loosening loud.
    refs = [t for t in re.findall(r"[A-Za-z][A-Za-z0-9+.-]*://[^\s\"'<>]*", svg_text)
            if t != SVG_NS]
    if refs:
        raise QrUnsupportedError("document contains external reference syntax %r" % refs[0])
    return path_attrs["d"], root_attrs


def _validate_root_geometry(root_attrs, size):
    """Compare the declared rendered size against the size RECOVERED from the
    module grid. Runs after path parsing because the expected dimensions are
    derived from the symbol itself, never from a literal in the file."""
    total = size + 2 * QR_BORDER
    expected_len = "%dmm" % total
    expected_box = "0 0 %d %d" % (total, total)
    for name in ("width", "height"):
        if root_attrs[name] != expected_len:
            raise QrUnsupportedError(
                "root %s is %r but the decoded symbol is %d modules plus a "
                "%d-module quiet zone, which the generator emits as %r — a "
                "mis-sized or zero-sized asset does not scan"
                % (name, root_attrs[name], size, QR_BORDER, expected_len))
    if root_attrs["viewBox"] != expected_box:
        raise QrUnsupportedError(
            "root viewBox is %r, expected %r for a %d-module symbol with border %d"
            % (root_attrs["viewBox"], expected_box, size, QR_BORDER))


def svg_to_matrix(svg_text):
    """Parse the validated SVG into a dark-module matrix. Every element and
    every subpath must be understood; nothing is skipped."""
    d, root_attrs = parse_svg_document(svg_text)
    cells, unparsed = set(), []
    for sub in d.split("z"):
        sub = sub.strip()
        if not sub:
            continue
        g = _SUBPATH.match(sub)
        if not g:
            unparsed.append(sub[:40])
            continue
        x, y, x1, y1, x0 = (int(v) for v in g.groups())
        if not (x1 == x + 1 and y1 == y + 1 and x0 == x):
            unparsed.append(sub[:40])
            continue
        if (x, y) in cells:
            raise QrUnsupportedError("duplicate module at (%d,%d)" % (x, y))
        cells.add((x, y))
    if unparsed:
        raise QrUnsupportedError("%d SVG subpath(s) were not 1x1 QR modules, e.g. %r"
                                 % (len(unparsed), unparsed[0]))
    if not cells:
        raise QrUnsupportedError("the SVG contains no QR modules")
    span = max(max(x for x, _ in cells), max(y for _, y in cells))
    size = span - QR_BORDER + 1
    if (size - 17) % 4 or not (21 <= size <= 177):
        raise QrUnsupportedError("module grid of %s is not a valid QR size" % size)
    _validate_root_geometry(root_attrs, size)
    if min(x for x, _ in cells) < QR_BORDER or min(y for _, y in cells) < QR_BORDER:
        raise QrUnsupportedError("a module lies inside the quiet zone")
    return [[1 if (x + QR_BORDER, y + QR_BORDER) in cells else 0
             for x in range(size)] for y in range(size)], size


# --------------------------------------------------- complete symbol model ----
# Every rendered module must be accounted for by exactly one of: a fixed
# function pattern, format information, a data codeword, an EC codeword, or a
# remainder bit. Before this, only the data codewords were ever examined — a
# finder, timing or alignment module could be deleted and the payload still
# "verified", certifying a visibly broken symbol.
_EC_CODEWORDS_M = {1: 10, 2: 16, 3: 26}
_REMAINDER_BITS = {1: 0, 2: 7, 3: 7}


def _format_positions(size):
    """The 2x15 format-information modules. Their VALUES are variable and are
    validated by the BCH check, so they are excluded from the fixed model."""
    a = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
         (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
    b = [(size - 1 - i, 8) for i in range(7)] + [(8, size - 8 + i) for i in range(8)]
    return set(a) | set(b)


def _expected_fixed_modules(size):
    """(r, c) -> required module value for every FIXED function pattern."""
    version = (size - 17) // 4
    exp = {}

    def finder(fr, fc):
        for dr in range(7):
            for dc in range(7):
                dark = dr in (0, 6) or dc in (0, 6) or (2 <= dr <= 4 and 2 <= dc <= 4)
                exp[(fr + dr, fc + dc)] = 1 if dark else 0

    finder(0, 0)
    finder(0, size - 7)
    finder(size - 7, 0)
    for i in range(8):                          # separators are all light
        exp[(7, i)] = 0
        exp[(i, 7)] = 0
        exp[(7, size - 1 - i)] = 0
        exp[(i, size - 8)] = 0
        exp[(size - 8, i)] = 0
        exp[(size - 1 - i, 7)] = 0
    for c in range(8, size - 8):                # horizontal timing
        exp[(6, c)] = 1 if c % 2 == 0 else 0
    for r in range(8, size - 8):                # vertical timing
        exp[(r, 6)] = 1 if r % 2 == 0 else 0
    if version >= 2:                            # exactly one alignment pattern
        ac = size - 7
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                exp[(ac + dr, ac + dc)] = 1 if max(abs(dr), abs(dc)) != 1 else 0
    exp[(size - 8, 8)] = 1                      # fixed dark module
    for pos in _format_positions(size):
        exp.pop(pos, None)
    return exp


def _validate_function_patterns(matrix, size):
    exp = _expected_fixed_modules(size)
    fn = {(r, c) for r in range(size) for c in range(size)
          if _is_function_module(r, c, size)}
    unaccounted = fn - (set(exp) | _format_positions(size))
    if unaccounted:
        raise QrUnsupportedError(
            "internal: %d function modules have no model (e.g. %s)"
            % (len(unaccounted), sorted(unaccounted)[:3]))
    for (r, c), want in exp.items():
        if matrix[r][c] != want:
            raise QrUnsupportedError(
                "function pattern is corrupt at module (row %d, col %d): expected "
                "%s, found %s — finder, separator, timing, alignment and the fixed "
                "dark module are what a scanner locks onto, so a symbol damaged "
                "there is refused even when its data still decodes"
                % (r, c, "dark" if want else "light",
                   "dark" if matrix[r][c] else "light"))


# ------------------------------------------- Reed-Solomon over QR's GF(256) ----
_GF_EXP = [0] * 512
_GF_LOG = [0] * 256
_x = 1
for _i in range(255):
    _GF_EXP[_i] = _x
    _GF_LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D                             # QR primitive polynomial
for _i in range(255, 512):
    _GF_EXP[_i] = _GF_EXP[_i - 255]


def _gf_mul(a, b):
    return 0 if a == 0 or b == 0 else _GF_EXP[_GF_LOG[a] + _GF_LOG[b]]


def _rs_generator(n):
    g = [1]
    for i in range(n):
        g = [(g[j] if j < len(g) else 0) ^ _gf_mul(g[j - 1] if j > 0 else 0, _GF_EXP[i])
             for j in range(len(g) + 1)]
    return g


def _rs_encode(data, n):
    """The n error-correction codewords for `data` (single block)."""
    g = _rs_generator(n)
    res = list(data) + [0] * n
    for i in range(len(data)):
        coef = res[i]
        if coef:
            for j in range(1, len(g)):
                res[i + j] ^= _gf_mul(g[j], coef)
    return res[len(data):]


def _is_function_module(r, c, size):
    if r < 9 and c < 9:
        return True                                   # top-left finder + format
    if r < 9 and c >= size - 8:
        return True                                   # top-right
    if r >= size - 8 and c < 9:
        return True                                   # bottom-left
    if r == 6 or c == 6:
        return True                                   # timing
    if size >= 25:                                    # version >= 2: one alignment
        ac = size - 7
        if abs(r - ac) <= 2 and abs(c - ac) <= 2:
            return True
    return False


def decode_svg(svg_text):
    """Return the byte-mode payload encoded by the committed SVG."""
    matrix, size = svg_to_matrix(svg_text)
    version = (size - 17) // 4
    if version > MAX_SUPPORTED_VERSION:
        raise QrUnsupportedError(
            f"QR version {version} is beyond this decoder's supported subset "
            f"(1-{MAX_SUPPORTED_VERSION}: single EC block, one alignment pattern). "
            f"A longer financing URL needs decoder support for codeword "
            f"de-interleaving before it can be verified.")
    # Format information: read BOTH copies, require each to be a valid BCH
    # codeword and require them to agree, so damaged or forged format bits fail
    # explicitly instead of being trusted after a bare XOR.
    fmt_pos_a = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
                 (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
    raw_a = int("".join(str(matrix[r][c]) for r, c in fmt_pos_a), 2)
    fmt_pos_b = [(size - 1 - i, 8) for i in range(7)] + \
                [(8, size - 8 + i) for i in range(8)]
    raw_b = int("".join(str(matrix[r][c]) for r, c in fmt_pos_b), 2)
    if raw_a not in _VALID_FORMATS:
        raise QrUnsupportedError("format information failed its BCH check "
                                 "(damaged or forged format bits)")
    if raw_b not in _VALID_FORMATS:
        raise QrUnsupportedError("the second format-information copy failed its BCH check")
    if _VALID_FORMATS[raw_a] != _VALID_FORMATS[raw_b]:
        raise QrUnsupportedError("the two format-information copies disagree")
    ec_field, mask = _VALID_FORMATS[raw_a]
    if ec_field != SUPPORTED_EC_FIELD:
        raise QrUnsupportedError(
            "error-correction level %s is outside this decoder's supported subset "
            "(level %s only, which is what the generator emits); its block layout is "
            "not implemented" % (_EC_FIELD_NAMES.get(ec_field, ec_field),
                                 _EC_FIELD_NAMES[SUPPORTED_EC_FIELD]))
    if mask not in _MASKS:
        raise QrUnsupportedError("unknown data mask %s" % mask)
    # Function patterns are mask-independent, so they can be checked as soon as
    # the symbol size is known.
    _validate_function_patterns(matrix, size)
    bits = []
    col, upward = size - 1, True
    while col > 0:
        if col == 6:
            col -= 1
        for r in (range(size - 1, -1, -1) if upward else range(size)):
            for c in (col, col - 1):
                if _is_function_module(r, c, size):
                    continue
                v = matrix[r][c]
                if _MASKS[mask](r, c):
                    v ^= 1
                bits.append(str(v))
        upward = not upward
        col -= 2
    bs = "".join(bits)
    # Account for EVERY traversal bit: data codewords, EC codewords, remainder.
    n_data = _DATA_CODEWORDS_M[version]
    n_ec = _EC_CODEWORDS_M[version]
    n_rem = _REMAINDER_BITS[version]
    expected_bits = 8 * (n_data + n_ec) + n_rem
    # Internal invariant, not a defence layer: the traversal length is fully
    # determined by the grid size, so for any size this decoder accepts it is
    # already correct. It is kept as a cheap assertion guarding future edits to
    # _is_function_module or the traversal, and no test can force it to fire.
    if len(bs) != expected_bits:
        raise QrUnsupportedError(
            "encoding region holds %d bits but version %d level M defines exactly "
            "%d (%d data + %d EC codewords + %d remainder) — the symbol has extra, "
            "missing or unexplained modules"
            % (len(bs), version, expected_bits, n_data, n_ec, n_rem))
    capacity = 8 * n_data
    data_bits = bs[:capacity]

    codewords = [int(bs[i * 8:(i + 1) * 8], 2) for i in range(n_data + n_ec)]
    computed_ec = _rs_encode(codewords[:n_data], n_ec)
    if computed_ec != codewords[n_data:]:
        wrong = next(i for i in range(n_ec) if computed_ec[i] != codewords[n_data + i])
        raise QrUnsupportedError(
            "error-correction codewords do not match the data: EC codeword %d of %d "
            "differs. The symbol is damaged or hand-edited; a scanner would either "
            "silently repair it to different content or fail to read it"
            % (wrong + 1, n_ec))
    remainder = bs[8 * (n_data + n_ec):]
    if "1" in remainder:
        raise QrUnsupportedError(
            "remainder bits are not all zero — the symbol carries %d undeclared "
            "bit(s) outside its codewords" % remainder.count("1"))

    mode = data_bits[0:4]
    if mode != "0100":
        raise QrUnsupportedError(
            f"encoding mode {mode} is not byte mode (0100); this decoder verifies "
            f"byte-mode URL payloads only")
    length = int(data_bits[4:12], 2)
    need = 12 + 8 * length
    if need > capacity:
        raise QrUnsupportedError(
            "declared byte-mode length %d exceeds the %d-byte data capacity of "
            "version %d level M" % (length, _DATA_CODEWORDS_M[version], version))
    try:
        payload = bytes(int(data_bits[12 + 8 * i:20 + 8 * i], 2)
                        for i in range(length)).decode("utf-8")
    except UnicodeDecodeError as e:
        raise QrUnsupportedError(f"payload is not valid UTF-8: {e}")

    # EVERYTHING after the first segment must be terminator + standard padding.
    #
    # This is not pedantry. A QR may carry several segments in different modes,
    # and a scanner reads their CONCATENATION. Decoding only the first segment
    # and stopping meant a symbol whose first segment was exactly the configured
    # URL, followed by an alphanumeric segment, was certified as "encodes the
    # configured URL" while a phone camera read a longer, different URL.
    rest = data_bits[need:]
    term_len = min(4, len(rest))
    if "1" in rest[:term_len]:
        raise QrUnsupportedError(
            "the symbol carries a further data segment after the byte-mode payload; "
            "a scanner reads the concatenation of all segments, so this asset is "
            "refused rather than certified on its first segment alone")
    pos = need + term_len
    fill = (8 - (pos % 8)) % 8
    if "1" in data_bits[pos:pos + fill]:
        raise QrUnsupportedError(
            "non-zero bits between the terminator and the byte boundary — the "
            "symbol carries undeclared data")
    pos += fill
    tail = data_bits[pos:]
    expected = ""
    while len(expected) < len(tail):
        expected += "11101100" if (len(expected) // 8) % 2 == 0 else "00010001"
    if tail != expected[:len(tail)]:
        raise QrUnsupportedError(
            "pad codewords are not the standard 0xEC/0x11 alternation — the symbol "
            "carries undeclared data after its payload")

    return payload, {"version": version, "size": size, "ec_field": ec_field,
                     "mask": mask, "mode": mode, "length": length,
                     "segments": 1}


def check_svg(config_path=DEFAULT_CONFIG, output_path=DEFAULT_OUTPUT):
    """Read-only: decode the committed SVG and require it to equal the
    configured, validated target. Never writes and never touches mtime."""
    config, target = load_target(config_path)
    validate_target(config, target)
    try:
        with io.open(output_path, encoding="utf-8") as f:
            svg = f.read()
    except OSError as e:
        raise QrPayloadMismatch(f"cannot read committed QR {output_path}: {e}")
    payload, info = decode_svg(svg)
    if payload != target:
        # The decoded payload is UNTRUSTED and is deliberately not echoed: it is
        # attacker-controlled bytes that merely parsed as UTF-8, and printing it
        # would republish whatever it contains into logs and terminals.
        raise QrPayloadMismatch(
            "committed QR payload differs from the configured financing.sourceUrl "
            "(decoded payload withheld; %s) — regenerate with "
            "`python incoming/generate_financing_qr.py`. Configured target: %s"
            % (_payload_fingerprint(payload), sanitize_url_for_error(target)))
    return payload, info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true",
                    help="verify the committed SVG without writing anything")
    ap.add_argument("--config", default=DEFAULT_CONFIG)
    ap.add_argument("--output", default=DEFAULT_OUTPUT)
    args = ap.parse_args(argv)
    try:
        if args.check:
            payload, info = check_svg(args.config, args.output)
            # Safe to name on success only because the payload is byte-identical
            # to the configured target, which validate_target already allowlisted.
            print(f"OK  {os.path.relpath(args.output, REPO)} encodes "
                  f"{sanitize_url_for_error(payload)} "
                  f"(version {info['version']}, mask {info['mask']}, byte mode)")
            return 0
        config, target = load_target(args.config)
        validate_target(config, target)
        svg = build_svg(target)                 # nothing is written until here
        decoded, _ = decode_svg(svg)            # prove what we are about to commit
        if decoded != target:
            raise QrTargetError(
                "the SVG just generated does not decode back to the configured "
                "target (decoded payload withheld; %s); nothing was written. "
                "Configured target: %s"
                % (_payload_fingerprint(decoded), sanitize_url_for_error(target)))
        write_svg(svg, args.output)
        print(f"Wrote {args.output} -> {target} ({len(svg)} bytes)")
        return 0
    except (QrTargetError, QrUnsupportedError, QrPayloadMismatch) as e:
        print(f"FAIL {type(e).__name__}: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
