#!/usr/bin/env bash
# Scan the source tree for likely real secrets.
# This script never prints the secret value, only the file path and line number.
# Exits non-zero if a critical match is found.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXCLUDES='--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage --exclude-dir=public --exclude-dir=scripts --exclude=*.lock --exclude=README.md --exclude=*.md --exclude=.env.example'

CRITICAL_PATTERNS=(
  'sk_live_[A-Za-z0-9]{20,}'
  'rk_live_[A-Za-z0-9]{20,}'
  'AIza[0-9A-Za-z_-]{32,}'
  'ghp_[A-Za-z0-9]{32,}'
  'ya29\.[A-Za-z0-9_-]{32,}'
  'AKIA[0-9A-Z]{16,}'
  'BEGIN RSA PRIVATE KEY'
  'BEGIN OPENSSH PRIVATE KEY'
  'BEGIN EC PRIVATE KEY'
  'BEGIN PRIVATE KEY'
)

found=0
for pattern in "${CRITICAL_PATTERNS[@]}"; do

  matches="$(grep -RInE $EXCLUDES -- "$pattern" . || true)"
  if [[ -n "$matches" ]]; then
    while IFS= read -r line; do
      file_and_loc="${line%%:*:*}"
      echo "secret pattern matched in: $file_and_loc"
      found=1
    done <<< "$matches"
  fi
done

if [[ "$found" -ne 0 ]]; then
  echo "scan-secrets: critical match detected. Failing." >&2
  exit 2
fi

echo "scan-secrets: clean."
