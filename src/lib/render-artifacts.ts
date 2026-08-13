import path from 'node:path';
import { safeJoinUnderRoot, validateInputPath } from '@/worker/path-allowlist';
import type { JobOutcome } from '@/worker/types';

export function completedOutputPath(outcome: JobOutcome, root: string, relativePath: string): string | null {
  if (outcome.status !== 'completed') return null;
  const requested = safeJoinUnderRoot(root, relativePath);
  if (!requested.ok || !requested.resolved) return null;
  const rootRelativePath = path.relative(root, requested.resolved);
  if (rootRelativePath === '_work' || rootRelativePath.startsWith(`_work${path.sep}`)) return null;

  const isRecordedOutput = outcome.outputs.some((output) => {
    const validated = validateInputPath(output.absolutePath, [root]);
    return validated.ok && validated.resolved === requested.resolved;
  });

  return isRecordedOutput ? requested.resolved : null;
}
