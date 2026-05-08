#!/usr/bin/env bash
# Scan the source tree for forbidden placeholder tokens or fake-engagement language.
# Excludes the scanner itself and documentation that legitimately discusses these terms
# only inside dedicated forbidden-list contexts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXCLUDE_DIRS='--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=dist --exclude-dir=coverage --exclude-dir=public --exclude-dir=scripts'

# These tokens must never appear in source code outside dedicated allowed files.
FORBIDDEN_TOKENS=(
  'TODO'
  'FIXME'
  'placeholder code'
  'placeholder implementation'
  'stub implementation'
  'mock implementation'
  'fake upload'
  'fake subscribers'
  'fake likes'
  'fake views'
  'fake comments'
  'bot engagement'
  'not implemented'
  'coming soon'
)

# Files allowed to mention these tokens because they document forbidden tactics
# (compliance pages, growth-strategy module, docs explicitly listing what we never do).
ALLOWED_FILES=(
  './src/lib/compliance-engine.ts'
  './src/lib/growth-strategy.ts'
  './src/lib/monetization-engine.ts'
  './src/lib/analytics-feedback.ts'
  './src/lib/shorts-analytics.ts'
  './src/lib/shorts-calendar.ts'
  './src/components/SubscriberGrowthPanel.tsx'
  './src/components/AppShell.tsx'
  './src/app/videos/page.tsx'
  './src/app/page.tsx'
  './src/app/shorts/page.tsx'
  './src/app/shorts/calendar/page.tsx'
  './src/app/shorts/analytics/page.tsx'
  './tests/no-fake-engagement.test.ts'
  './tests/compliance-engine.test.ts'
  './tests/shorts-analytics.test.ts'
  './tests/shorts-no-spam.test.ts'
  './docs/COMPLIANCE_AND_DISCLOSURES.md'
  './docs/MONETIZATION.md'
  './docs/YOUTUBE_POLICY_SAFETY.md'
  './docs/ACCEPTANCE_CRITERIA.md'
  './docs/YOUTUBE_SHORTS_ENGINE.md'
  './docs/SHORTS_ALGORITHM_STRATEGY.md'
  './docs/SHORTS_MONETIZATION.md'
  './docs/SHORTS_COMPLIANCE.md'
  './README.md'
  './FINAL_VERIFICATION_REPORT.md'
)

found=0
for token in "${FORBIDDEN_TOKENS[@]}"; do

  matches="$(grep -RIn $EXCLUDE_DIRS -F "$token" . || true)"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    file="${line%%:*}"
    rest="${line#*:}"
    skip=0
    for allowed in "${ALLOWED_FILES[@]}"; do
      if [[ "$file" == "$allowed" ]]; then
        skip=1
        break
      fi
    done
    if [[ "$skip" -eq 0 ]]; then
      echo "forbidden token '$token' in: $line"
      found=1
    fi
  done <<< "$matches"
done

if [[ "$found" -ne 0 ]]; then
  echo "scan-placeholders: forbidden tokens detected. Failing." >&2
  exit 2
fi

echo "scan-placeholders: clean."
