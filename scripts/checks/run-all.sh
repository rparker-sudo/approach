#!/bin/sh
# Logic checks for v2.2 acceptance criteria (no app or database needed). Run from the repo root:
#   sh scripts/checks/run-all.sh
cd "$(dirname "$0")" || exit 1
fail=0
for f in *.ts; do
  out=$(npx --yes tsx "$f" 2>&1)
  if echo "$out" | grep -q "FAIL"; then echo "✗ $f"; echo "$out" | grep FAIL; fail=1; else echo "✓ $f"; fi
done
exit $fail
