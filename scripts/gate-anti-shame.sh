#!/usr/bin/env bash
# gate-anti-shame.sh — the v1 ANTI-SHAME copy gate, carried + wired as an npm
# script (w8 M1.1; BUILD-GUIDE §3.1).
#
# No failure/loss/urgency copy in kid-facing surfaces or curated data labels.
# Word boundaries are load-bearing (\bmissed\b excludes "dismissed").
# Exclusions:
#   - comment lines (the guard comments DOCUMENT the rule; shipped copy lives
#     in string literals — same posture as the §3.1 no-egress gate);
#   - the v1-SHIPPED warm return greeting "Hi! I missed you!" (buddy.greet
#     young) — the sanctioned neglectReturn pattern (arch §4.1: neglect → a
#     warm greeting, never a scold). Reminder/NOTIFICATION copy remains fully
#     banned via BANNED_REMINDER_PATTERNS (companion-miss nags never leave the
#     app). Flagged for M6.1 human copy review; do not add new exclusions.
set -uo pipefail
cd "$(dirname "$0")/.."

TARGETS=()
for t in "apps/kid/app/(kid)" apps/kid/components apps/kid/src/i18n apps/kid/src/data; do
  [ -e "$t" ] && TARGETS+=("$t")
done

HITS=$(grep -rniE \
  "time's up|out of time|too slow|you failed|\bfailed\b|you missed|\bmissed\b|streak (lost|broken)|0[- ]day|hurry|last chance|limited time" \
  "${TARGETS[@]}" 2>/dev/null \
  | grep -viE "__tests__" \
  | grep -vE "^[^:]*:[0-9]+: *(//|\*|/\*|\{/\*)" \
  | grep -vF "I missed you!" || true)

if [ -n "$HITS" ]; then
  echo "ANTI-SHAME GATE: failure/loss/urgency copy found in a kid-facing surface:"
  echo "$HITS"
  exit 1
fi
echo "OK: anti-shame copy (no failure/loss/urgency tone in kid-facing surfaces)"
