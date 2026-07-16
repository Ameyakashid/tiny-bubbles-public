#!/usr/bin/env bash
# gate-symbol-license.sh — the LICENSE-CLEAN symbol-set grep gate (w8 M1.1;
# BUILD-GUIDE §3.1; 02-architecture §8 #22).
#
# No non-commercial / copyleft symbol art in the shipped tree: ARASAAC
# (CC-BY-NC-SA) + Sclera (CC-BY-NC) + any *-NC* + GPL/AGPL are banned. The
# ONE canonical per-asset manifest is apps/kid/assets/symbols/manifest.json;
# assertSymbolManifestClean (packages/shared/src/compliance/symbolLicense*.ts)
# ALSO enforces completeness in CI via
# packages/shared/__tests__/gates/symbol-license.test.ts. This grep is the
# fast mechanical backstop over asset provenance text.
set -uo pipefail
cd "$(dirname "$0")/.."

TARGETS=()
for t in apps/kid/assets packages/shared/src/aac apps/kid/PROVENANCE.md; do
  [ -e "$t" ] && TARGETS+=("$t")
done

if [ ${#TARGETS[@]} -eq 0 ]; then
  echo "OK: symbol art is license-clean (vacuous — no symbol assets landed yet, §9 #7)"
  exit 0
fi

HITS=$(grep -rniE "ARASAAC|Sclera|CC-?BY-?NC|-NC-|AGPL|GPL-3" "${TARGETS[@]}" 2>/dev/null \
  | grep -viE "__tests__|reference-only|excluded|banned" || true)

if [ -n "$HITS" ]; then
  echo "SYMBOL-LICENSE GATE: non-commercial/copyleft marker(s) in a shipping context (§8 #22):"
  echo "$HITS"
  exit 1
fi
echo "OK: symbol art is license-clean (no ARASAAC/Sclera/NC/GPL marker)"
