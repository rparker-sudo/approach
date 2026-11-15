#!/bin/sh
# Logic checks for the acceptance criteria (no app or database needed). Run from the repo root:
#   sh scripts/checks/run-all.sh
# 2.2.1 §7.2: a check that fails to RUN (non-zero exit, missing runner, no output) counts as FAIL, not just one
# that prints "FAIL". The legal-pages check needs the site folder (../approachstrength-site); without it, it fails.
cd "$(dirname "$0")" || exit 1
fail=0
run() {
  name=$1
  shift
  out=$("$@" 2>&1)
  code=$?
  if [ $code -ne 0 ]; then
    echo "✗ $name (exit $code)"
    echo "$out" | grep -E "FAIL|Error|error|not found" | head -5
    fail=1
  elif [ -z "$out" ]; then
    echo "✗ $name (no output: the check didn't run)"
    fail=1
  elif echo "$out" | grep -q "FAIL"; then
    echo "✗ $name"
    echo "$out" | grep FAIL
    fail=1
  else
    echo "✓ $name"
  fi
}
for f in *.ts; do
  run "$f" npx --yes tsx "$f"
done
for f in *.py; do
  run "$f" python3 "$f"
done
exit $fail
