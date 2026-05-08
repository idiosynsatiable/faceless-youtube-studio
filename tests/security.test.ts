import { describe, expect, it } from 'vitest';
import { safeFilename, constantTimeEqual } from '@/lib/security';

describe('security helpers', () => {
  it('produces safe filenames stripped of unsafe characters', () => {
    expect(safeFilename('Index funds!? & (final) v2.mp4')).toMatch(/^[a-z0-9._-]+$/);
  });

  it('falls back to default when filename becomes empty', () => {
    expect(safeFilename('???')).toBe('video-package');
  });

  it('constantTimeEqual behaves correctly', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
