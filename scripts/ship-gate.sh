#!/usr/bin/env bash
# ship-gate.sh — the aggregate v2 SHIP GATE (SCAFFOLD, w8 M1.1; finalized in
# M6.1 per BUILD-GUIDE §3.2). Any red = no ship.
#
# M1.1 scaffold scope: workspace typecheck+test, the cross-cutting w8 gates
# (evidence-honesty · crisis-review · symbol-license · no-invented-hotline ·
# neuro-golden-rule run inside the shared jest suite), the grep gates
# (evidence-honesty · symbol-license · anti-shame · provenance), and the
# crisis-review SHIP assertion — which is EXPECTED to block until the
# psychologist CRISIS_REVIEW_SIGNOFF lands (§8 #16b): a red crisis row here
# is the gate working, not a bug.
#
# Finalized in M6.1 (not yet wired): the functions emulator suite (rules/
# auth/redaction/retention/pipeline/crisis/redteam), the no-egress +
# no-ad-analytics greps' retargeted forms, and the live-provider pre-
# enablement red-team.
set -uo pipefail
cd "$(dirname "$0")/.."

FAILURES=0
step() {
  echo ""
  echo "── ship-gate: $1"
  shift
  if "$@"; then echo "   ✓ green"; else echo "   ✗ RED"; FAILURES=$((FAILURES + 1)); fi
}

# 1) every workspace: typecheck + test (shared, kid, parent, functions)
step "shared typecheck+test" bash -c "npm -w @tiny-bubbles/shared run typecheck && npm -w @tiny-bubbles/shared test"
step "kid typecheck+test" bash -c "npm -w @tiny-bubbles/kid run typecheck && npm -w @tiny-bubbles/kid test"
step "parent typecheck+test" bash -c "npm -w @tiny-bubbles/parent run typecheck && npm -w @tiny-bubbles/parent test"
step "functions build+test" bash -c "npm --prefix functions run build && npm --prefix functions test"

# 2) functions emulator suite — finalized M6.1 (w1/w2 land the functions)
echo ""
echo "── ship-gate: functions emulator suite … SKIPPED (scaffold; wired in M6.1)"

# 3) cross-cutting grep gates (the codified jest gates already ran in step 1)
step "gate: evidence-honesty" bash scripts/gate-evidence-honesty.sh
step "gate: symbol-license" bash scripts/gate-symbol-license.sh
step "gate: anti-shame (v1 carried)" bash scripts/gate-anti-shame.sh
step "gate: provenance" bash scripts/gate-provenance.sh

# 4) crisis-review SHIP assertion — BLOCKS until sign-off (§8 #16b, by design)
step "gate: crisis-review sign-off (EXPECTED RED until psychologist sign-off)" \
  node -e "
    const { assertCrisisTableReviewed, LAUNCH_LOCALES } = require('./packages/shared/lib/compliance/crisisReview.js');
    assertCrisisTableReviewed(LAUNCH_LOCALES);
    console.log('crisis table reviewed for:', LAUNCH_LOCALES.join(', '));
  "

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "SHIP GATE: $FAILURES red step(s) — NO SHIP. (A red crisis-review row means"
  echo "the required human sign-off has not landed yet — that is the gate holding.)"
  exit 1
fi
echo "SHIP GATE: all wired steps green (scaffold — M6.1 finalizes the emulator +"
echo "red-team + no-egress steps and the human sign-off checklist)."
