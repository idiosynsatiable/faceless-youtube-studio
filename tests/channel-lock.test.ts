import { describe, expect, it } from 'vitest';
import { channelMatchesTarget } from '@/lib/channel-lock';

describe('target channel identity lock', () => {
  it('accepts matching authenticated and target channel ids', () => {
    expect(channelMatchesTarget({ id: 'UC123', title: 'Mine' }, { id: 'UC123', title: 'Target' })).toBe(true);
  });

  it('rejects a different authenticated channel', () => {
    expect(channelMatchesTarget({ id: 'UC123', title: 'Mine' }, { id: 'UC999', title: 'Target' })).toBe(false);
  });

  it('honors an explicitly pinned channel id', () => {
    expect(channelMatchesTarget({ id: 'UC123', title: 'Mine' }, { id: 'UC123', title: 'Target' }, 'UC123')).toBe(true);
    expect(channelMatchesTarget({ id: 'UC123', title: 'Mine' }, { id: 'UC123', title: 'Target' }, 'UC456')).toBe(false);
  });
});
