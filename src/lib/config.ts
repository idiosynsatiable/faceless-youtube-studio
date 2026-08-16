// Central runtime configuration. Reads only environment variables.
// Optional integrations retain disabled-safe behavior; production infrastructure
// requirements are validated explicitly by assertProductionConfig().

export interface RuntimeConfig {
  appUrl: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  oauthStateSecret: string;
  ai: {
    provider: string;
    apiKey: string;
    enabled: boolean;
  };
  stripe: {
    enabled: boolean;
    secretKey: string;
    webhookSecret: string;
    priceIds: {
      creator: string;
      studio: string;
      agency: string;
    };
  };
  youtube: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizedChannelId: string;
    authorizedChannelHandle: string;
  };
}

function read(name: string, fallback = ''): string {
  const value = process.env[name];
  return typeof value === 'string' ? value : fallback;
}

function normalizeYouTubeHandle(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

export function loadConfig(): RuntimeConfig {
  const stripeSecret = read('STRIPE_SECRET_KEY');
  const stripeWebhook = read('STRIPE_WEBHOOK_SECRET');
  const ytClientId = read('YOUTUBE_CLIENT_ID');
  const ytClientSecret = read('YOUTUBE_CLIENT_SECRET');

  return {
    appUrl: read('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    databaseUrl: read('DATABASE_URL'),
    redisUrl: read('REDIS_URL'),
    jwtSecret: read('JWT_SECRET'),
    oauthStateSecret: read('OAUTH_STATE_SECRET'),
    ai: {
      provider: read('AI_PROVIDER', 'openai'),
      apiKey: read('OPENAI_API_KEY'),
      enabled: read('OPENAI_API_KEY').length > 0
    },
    stripe: {
      enabled: stripeSecret.length > 0 && stripeWebhook.length > 0,
      secretKey: stripeSecret,
      webhookSecret: stripeWebhook,
      priceIds: {
        creator: read('STRIPE_CREATOR_PRICE_ID'),
        studio: read('STRIPE_STUDIO_PRICE_ID'),
        agency: read('STRIPE_AGENCY_PRICE_ID')
      }
    },
    youtube: {
      enabled: ytClientId.length > 0 && ytClientSecret.length > 0,
      clientId: ytClientId,
      clientSecret: ytClientSecret,
      redirectUri: read('YOUTUBE_REDIRECT_URI', 'http://localhost:3000/api/youtube/callback'),
      authorizedChannelId: read('YOUTUBE_AUTHORIZED_CHANNEL_ID').trim(),
      authorizedChannelHandle: normalizeYouTubeHandle(read('YOUTUBE_AUTHORIZED_CHANNEL_HANDLE'))
    }
  };
}

export const config = loadConfig();

export function productionConfigIssues(current: RuntimeConfig = config): string[] {
  if (process.env.NODE_ENV !== 'production') return [];

  const issues: string[] = [];
  if (!current.appUrl.startsWith('https://')) issues.push('NEXT_PUBLIC_APP_URL must use HTTPS in production');
  if (current.jwtSecret.length < 32) issues.push('JWT_SECRET must be at least 32 characters in production');
  if (current.oauthStateSecret.length < 32) issues.push('OAUTH_STATE_SECRET must be at least 32 characters in production');
  if (!current.databaseUrl) issues.push('DATABASE_URL is required in production');
  if (!current.redisUrl) issues.push('REDIS_URL is required in production');
  if (!current.youtube.enabled) issues.push('YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are required in production');
  if (!current.youtube.authorizedChannelHandle) {
    issues.push('YOUTUBE_AUTHORIZED_CHANNEL_HANDLE is required in production');
  } else if (current.youtube.authorizedChannelHandle !== 'idiosynsatiable') {
    issues.push('YOUTUBE_AUTHORIZED_CHANNEL_HANDLE must be idiosynsatiable');
  }
  if (current.youtube.enabled && !current.youtube.redirectUri.startsWith('https://')) {
    issues.push('YOUTUBE_REDIRECT_URI must use HTTPS in production');
  }
  return issues;
}

export function assertProductionConfig(): void {
  const issues = productionConfigIssues();
  if (issues.length > 0) {
    throw new Error(`Production configuration is incomplete: ${issues.join('; ')}`);
  }
}
