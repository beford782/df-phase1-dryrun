# PR #24 motion spike — showroom-device check record

**Date:** 2026-08-08 · **Reviewed code head:** `e33bb2a` (branch
`claude/motion-spike-card-gather`, base `c8e5a95`)
**Metadata completed / post-merge reconciliation:** 2026-08-09, after PR #24 merged
to `main` as `e585d6a`.
**Scope:** the Card Table selected-card feedback and review→profile gather behind
`MOTION_POLICY.enabled = false` — nothing else.

This is a narrowly scoped device-check record for PR #24 only. It is created because
no canonical motion-device ledger exists: `docs/kiosk-device-hardening.md` is the
autofill/persistence hardening record and its per-route verification table covers
session-ending routes, not motion. Pre-merge documentation-only commits carrying
this file contained **code byte-identical to `e33bb2a`**; this post-merge
completion pass likewise changes documentation only, leaving code byte-identical
to merged `main` (`e585d6a`).

## Authoritative review results at `e33bb2a`

| Item | Result |
|---|---|
| Owner visual ruling | The enabled Card Table/gather is **preferred over the legacy staged reveal** |
| Final Codex review | **PASS** on exact code head `e33bb2a`; no remaining blocking or should-fix findings |
| Motion suite (`tests/motion_flag_check.mjs`) | **70/70** |
| `tools/validation.py --self-test` | **633/633** |
| CI `Full suite (18 checks)` | **PASS** on `e33bb2a` |
| Showroom-device experience | **Owner-attested PASS** — the motion felt preferable to the legacy reveal on the tested showroom iPad |
| Scoring / recommendation identity / ordering / copy / catalog / Spanish strings | **Unchanged** |
| Feature flag | **OFF** (`MOTION_POLICY.enabled = false`) |

## Device-check result — stated precisely

- **Functional showroom-device motion check: PASSED by owner attestation.**
- **Exact device/browser metadata: CAPTURED 2026-08-09**, supplied by the owner
  verbatim, completing the three fields this record previously listed as pending:
  1. **Device:** iPad Pro 11-inch (2nd generation, 2020), Wi-Fi + Cellular —
     hardware model **A2068**;
  2. **iPadOS version:** **26.3.1 (a)**;
  3. **Test context:** **Safari** (not the installed Home Screen/PWA experience).
  The device serial number is deliberately withheld from this repository and must
  not be added to it.
- **This iPad is the designated device for all testing.** Whether it is the actual
  *mounted* showroom device will not be determined until months from now; that
  determination is explicitly out of scope for this record.
- **The motion-performance device evaluation required by PR #24's own governance is
  now complete:** functionally passed by owner attestation, with its audit metadata
  captured above.

## Relationship to the roadmap's Phase 0.4 — an important correction

Earlier PR #24 text loosely called this evaluation "Phase 0.4 showroom-device
testing." Inspecting the canonical definition (`docs/rebuild-roadmap.md` §0.4), the
roadmap's **Phase 0.4 is a different requirement entirely**: *recovery from the
data-error overlay*, whose hardware exit is the **retry and clean-restart routes
verified on the confirmed mounted showroom device**, recorded in
`docs/kiosk-device-hardening.md`. Stated per that definition:

1. **What this owner test closes:** the showroom-device motion evaluation attached to
   PR #24's governance (the "actual showroom-iPad evaluation" condition carried by
   the motion program) — functionally, with the audit record incomplete as above.
   Nothing else.
2. **What remains open:** the roadmap's actual Phase 0.4 hardware exit — the
   data-error retry and clean-restart routes verified on the confirmed mounted
   device — plus the per-device hardening checklist in
   `docs/kiosk-device-hardening.md`, which stands deliberately unticked. This motion
   attestation says nothing about the data-error routes and does **not** advance,
   close, or partially close Phase 0.4. Phase 0 therefore still cannot close on the
   strength of this record.
3. **What still cannot be determined:** whether the designated test iPad (now
   fully identified above; browser context Safari) is the confirmed *mounted*
   showroom device — the owner states this will not be determined until months
   from now. The metadata capture therefore completes PR #24's audit record but
   contributes **nothing** to the mounted-device chain: Phase 0.4's hardware exit
   (the data-error retry and clean-restart routes on the confirmed mounted device)
   and the hardening checklist remain **fully open, not partially advanced**.

## Post-merge status and standing restrictions (reconciled 2026-08-09)

The pre-merge version of this section said PR #24 "remains draft and DO NOT MERGE"
and listed merge authorization as a pending owner action. Both statements are stale
and are replaced by this record:

- **PR #24 is MERGED:** owner-authorized normal merge to `main` as `e585d6a`
  (parents `c8e5a95`, `89465db`). CI on the merge commit passed (`Full suite
  (18 checks)`), and the GitHub Pages build and deployment succeeded. A live
  spot-check of the Pages **preview** deployment (a preview, not official
  production) confirmed the app loads and `?motion=1` fails closed.
- **`MOTION_POLICY.enabled` remains `false`.** The motion foundation is present on
  `main` but dormant.
- This record still authorizes nothing further. **Activation** (flipping
  `MOTION_POLICY.enabled`) stays a separate owner-authorized PR behind the
  standing gates: the roadmap's actual Phase 0.4 hardware exit on the confirmed
  mounted device, the kiosk hardening checklist, and native-Spanish review for any
  future user-facing strings.
- The completed **motion-device audit** (this record) and the uncompleted
  **Phase 0.4 retry/clean-restart test on the confirmed mounted device** are
  distinct items; completing the former does not advance the latter.
