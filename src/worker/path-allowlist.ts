// Path allowlist + safe-join helpers. Used by the FFmpeg worker to validate
// every input path before any spawn happens.
//
// Security model:
// - All input paths must resolve INSIDE one of the allowlisted prefixes.
// - Path traversal (`..`), absolute escapes, and null-byte payloads are rejected.
// - Symlink resolution is the worker's responsibility at execution time
//   (call fs.realpathSync after this validation; if the realpath escapes the
//   allowlist, refuse the job).

import path from 'node:path';

export interface PathValidationResult {
  ok: boolean;
  reason?: 'empty' | 'null_byte' | 'absolute_outside_allowlist' | 'traversal' | 'unsafe_character';
  resolved?: string;
  matchedPrefix?: string;
}

const FORBIDDEN_CHARS = /[\x00\n\r]/;

export function validateInputPath(absPath: string, allowlist: string[]): PathValidationResult {
  if (!absPath || absPath.length === 0) return { ok: false, reason: 'empty' };
  if (FORBIDDEN_CHARS.test(absPath)) return { ok: false, reason: 'null_byte' };
  // Reject control-char chunks like CR/LF embedded in the string.
  if (absPath.includes('..')) {
    // Only reject if the literal traversal segment survives normalization.
    const segments = absPath.split(/[\\/]+/);
    if (segments.includes('..')) return { ok: false, reason: 'traversal' };
  }
  const resolved = path.resolve(absPath);
  for (const prefix of allowlist) {
    const normalizedPrefix = path.resolve(prefix);
    if (resolved === normalizedPrefix) {
      return { ok: true, resolved, matchedPrefix: normalizedPrefix };
    }
    const withSep = normalizedPrefix.endsWith(path.sep) ? normalizedPrefix : normalizedPrefix + path.sep;
    if (resolved.startsWith(withSep)) {
      return { ok: true, resolved, matchedPrefix: normalizedPrefix };
    }
  }
  return { ok: false, reason: 'absolute_outside_allowlist', resolved };
}

export function safeJoinUnderRoot(root: string, ...parts: string[]): { ok: boolean; resolved?: string; reason?: PathValidationResult['reason'] } {
  for (const part of parts) {
    if (FORBIDDEN_CHARS.test(part)) return { ok: false, reason: 'null_byte' };
    if (part.includes('..') && part.split(/[\\/]+/).includes('..')) {
      return { ok: false, reason: 'traversal' };
    }
    if (path.isAbsolute(part)) {
      return { ok: false, reason: 'absolute_outside_allowlist' };
    }
  }
  const candidate = path.resolve(root, ...parts);
  const normalizedRoot = path.resolve(root);
  const withSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
  if (candidate !== normalizedRoot && !candidate.startsWith(withSep)) {
    return { ok: false, reason: 'absolute_outside_allowlist', resolved: candidate };
  }
  return { ok: true, resolved: candidate };
}
