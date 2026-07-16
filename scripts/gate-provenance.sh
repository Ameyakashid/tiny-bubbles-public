#!/usr/bin/env bash
# gate-provenance.sh — the PROVENANCE discipline gate (v1 carried; w8 M1.1;
# BUILD-GUIDE §7).
#
# Every milestone records its created/modified surface + license posture in
# the root PROVENANCE.md, and every bundled dep/asset in
# THIRD_PARTY_NOTICES.md. This gate asserts the registers exist, are
# non-trivial, and carry the M1.1 shared-module rows; it then prints the
# human sign-off checklist (the mechanical half of BUILD-GUIDE §3.2 step 6).
set -uo pipefail
cd "$(dirname "$0")/.."

fail() { echo "PROVENANCE GATE: $1"; exit 1; }

[ -s PROVENANCE.md ] || fail "root PROVENANCE.md missing or empty"
[ -s THIRD_PARTY_NOTICES.md ] || fail "root THIRD_PARTY_NOTICES.md missing or empty"

# The M1.1 shared safety/compliance surface must be recorded as original work.
grep -qiE "compliance" PROVENANCE.md || fail "PROVENANCE.md has no row for the shared compliance modules (M1.1)"
grep -qiE "neuroProfile|resolveNeuroPreset" PROVENANCE.md || fail "PROVENANCE.md has no row for the neuroProfile axis (M1.1)"

# License line: no GPL/AGPL/non-commercial ORIGIN may be recorded for a shipped
# file in the per-file manifest. (THIRD_PARTY_NOTICES.md is prose that
# DOCUMENTS the exclusion rules — its gate lives in the symbol-license +
# dependency reviews, not in a line grep.)
BAD=$(grep -niE "(AGPL|GPL-3|CC-?BY-?NC)" PROVENANCE.md 2>/dev/null \
  | grep -viE "reference-only|excluded|banned|never|gate|prohibit" || true)
if [ -n "$BAD" ]; then
  echo "PROVENANCE GATE: copyleft/non-commercial rows not marked reference-only/excluded:"
  echo "$BAD"
  exit 1
fi

echo "OK: provenance registers present + M1.1 rows recorded + license line clean"
echo ""
echo "Human sign-off checklist (SHIP-GATE, finalized M6.1):"
echo "  [ ] psychologist — crisis copy + abuse/CSAM differentiation (CRISIS_REVIEW_SIGNOFF)"
echo "  [ ] legal        — consent/DPA + marketing/store copy"
echo "  [ ] license      — symbol-set manifest review (apps/kid/assets/symbols/manifest.json)"
