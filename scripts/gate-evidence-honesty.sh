#!/usr/bin/env bash
# gate-evidence-honesty.sh — the EVIDENCE-HONESTY grep gate (w8 M1.1;
# BUILD-GUIDE §3.1; 02-architecture §8 #23).
#
# THE STANDARD IS THE ONE FUNCTION in
# packages/shared/src/compliance/evidenceHonesty.ts (§8 #23: every downstream
# grep matches IT). This grep mirrors that standard:
#   - word boundaries are load-bearing (\bcure\b spares secure/procure;
#     "therap(y|ies) (for|that|works)" spares bare "occupational therapy");
#   - the BARE trademarks "zones of regulation" / "social stor(y|ies)" are
#     hits INDEPENDENT of any efficacy word;
#   - "treat" is banned as a CLAIM (treat/treatment + a condition word), NOT
#     as the shipped v1 reward noun ("a small treat" — anti-shame reward copy);
#   - comment lines are stripped: the gate targets SHIPPED copy/code, not the
#     guard comments that document these rules (same posture as the §3.1
#     no-egress gate's comment exclusion).
#
# The codified authoritative gate also runs in CI as
# packages/shared/__tests__/gates/evidence-honesty.test.ts.
set -uo pipefail
cd "$(dirname "$0")/.."

TARGETS=()
for t in apps packages functions docs/store-listing.md; do
  [ -e "$t" ] && TARGETS+=("$t")
done

HITS=$(grep -rniE \
  "\bcure(s|d)?\b|\btreat(s|ment|ing|ed)?\b[^.]{0,24}\b(adhd|autism|asd|anxiety|depression|meltdowns?|symptoms?|disorders?|conditions?)\b|\btreatment for\b|therap(y|ies) (for|that|works)|\b(is|as|provides?|delivers?|replaces?) therap(y|ies)\b|clinically (proven|validated|effective)|zones of regulation|social stor(y|ies)\b|speech gain|learn to (talk|speak)\b|will (talk|speak)\b|may (increase|improve|help)[a-z' ]*speech|does not inhibit speech|\btalk more\b|sensory integration (therap(y|ies)|delivered|treatment|protocol)" \
  "${TARGETS[@]}" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=lib --exclude-dir=.expo --exclude-dir=deploy-web 2>/dev/null \
  | grep -viE "__tests__|__mocks__|compliance/evidenceHonesty|assertNarrativeCopyClean|assertAacCopyClean|not a doctor|not therapy|occupational therap(y|ist)|CITED-EVIDENCE" \
  | grep -vE "^[^:]*:[0-9]+: *(//|\*|/\*|\{/\*)" || true)

if [ -n "$HITS" ]; then
  echo "EVIDENCE-HONESTY GATE: banned claim(s) found (scaffolds, not therapy — §8 #23):"
  echo "$HITS"
  exit 1
fi
echo "OK: evidence-honest (no cure/therapy/efficacy/speech-gain claim, no bare trademark)"
