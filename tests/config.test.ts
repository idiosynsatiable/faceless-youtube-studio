import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig, productionConfigIssues } from '@/lib/config';

function setProductionEnv(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv('NODE_ENV', 'production');
  Object.assign(process.env, {
    NEXT_PUBLIC_APP_URL: 'https://studio.example.com',
    DATABASE_URL: 'postgresql://db.example/faceless',
    REDIS_URL: 'redis://redis.example:6379',
    JWT_SECRET: 'j'.repeat(48),
    OAUTH_STATE_SECRET: 'o'.repeat(48),
    YOUTUBE_CLIENT_ID: 'client-id',
    YOUTUBE_CLIENT_SECRET: 'client-secret',
    YOUTUBE_REDIRECT_URI: 'https://studio.example.com/api/youtube/callback',
    YOUTUBE_AUTHORIZED_CHANNEL_HANDLE: 'idiosynsatiable',
    YOUTUBE_AUTHORIZED_CHANNEL_ID: ''
  }, overrides);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('production runtime configuration', () => {
  it('accepts infrastructure readiness while owner channel verification is pending', () => {
    setProductionEnv();
    expect(productionConfigIssues(loadConfig())).toEqual([]);
  });

  it('rejects placeholder-like or incomplete security configuration', () => {
    setProductionEnv({ JWT_SECRET: 'change_me', OAUTH_STATE_SECRET: '', YOUTUBE_AUTHORIZED_CHANNEL_HANDLE: 'another-channel' });
    const issues = productionConfigIssues(loadConfig());
    expect(issues).toContain('JWT_SECRET must be at least 32 characters in production');
    expect(issues).toContain('OAUTH_STATE_SECRET must be at least 32 characters in production');
    expect(issues).toContain('YOUTUBE_AUTHORIZED_CHANNEL_HANDLE must be idiosynsatiable');
  });
});
