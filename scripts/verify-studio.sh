#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT="$ROOT/VERIFY_REPORT.md"
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

step "Install" npm install --no-audit --no-fund || true
step "Typecheck" npm run typecheck || true
step "Tests" npm test -- --reporter=default || true
step "Scan secrets" bash scripts/scan-secrets.sh || true
step "Scan placeholders" bash scripts/scan-placeholders.sh || true

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
fi

echo "Report written to $REPORT"
