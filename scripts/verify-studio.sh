#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT="$ROOT/artifacts/VERIFY_REPORT.md"
mkdir -p "$(dirname "$REPORT")"
echo "# Verify report" > "$REPORT"
echo "Generated: $(date -u +%FT%TZ)" >> "$REPORT"
echo "" >> "$REPORT"

step() {
  local name="$1"
  shift
  echo "## $name" >> "$REPORT"
  if "$@" >>"$REPORT" 2>&1; then
    echo "Status: pass" >> "$REPORT"
    echo "" >> "$REPORT"
  else
    echo "Status: fail" >> "$REPORT"
    echo "" >> "$REPORT"
    return 1
  fi
}

step "Install" npm ci --no-audit --no-fund
step "Lint" npm run lint
step "Typecheck" npm run typecheck
step "Tests" npm test -- --reporter=default
step "Build" npm run build
step "Scan secrets" bash scripts/scan-secrets.sh
step "Scan placeholders" bash scripts/scan-placeholders.sh

echo "## Required docs" >> "$REPORT"
required=(
  "README.md"
  "docs/ARCHITECTURE.md"
  "docs/MARKET_INTELLIGENCE.md"
  "docs/DEMOGRAPHIC_ANALYSIS.md"
  "docs/VIDEO_PRODUCTION_WORKFLOW.md"
  "docs/YOUTUBE_UPLOAD_WORKFLOW.md"
  "docs/COMPLIANCE_AND_DISCLOSURES.md"
  "docs/MONETIZATION.md"
  "docs/YOUTUBE_POLICY_SAFETY.md"
  "docs/SEO_AND_RETENTION.md"
  "docs/DEPLOYMENT.md"
  "docs/API_REFERENCE.md"
  "docs/ACCEPTANCE_CRITERIA.md"
)
missing=0
for f in "${required[@]}"; do
  if [[ -f "$f" ]]; then
    echo "- present: $f" >> "$REPORT"
  else
    echo "- missing: $f" >> "$REPORT"
    missing=1
  fi
done
echo "" >> "$REPORT"

if [[ "$missing" -eq 0 ]]; then
  echo "Required docs: all present" >> "$REPORT"
else
  echo "Required docs: missing files" >> "$REPORT"
  exit 1
fi

echo "Report written to $REPORT"
