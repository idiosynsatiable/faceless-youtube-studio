// Central runtime configuration. Reads only environment variables.
// All integrations support a disabled-safe mode when their env vars are not set.

export interface RuntimeConfig {
  appUrl: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
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
  };
}

function read(name: string, fallback = ''): string {
  const value = process.env[name];
  return typeof value === 'string' ? value : fallback;
}

export function loadConfig(): RuntimeConfig {
  const stripeSecret = read('STRIPE_SECRET_KEY');
  const stripeWebhook = read('STRIPE_WEBHOOK_SECRET');
  const ytClientId = read('YOUTUBE_CLIENT_ID');
  const ytClientSecret = read('YOUTUBE_CLIENT_SECRET');
  const aiKey = read('OPENAI_API_KEY');

  return {
    appUrl: read('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    databaseUrl: read('DATABASE_URL'),
    redisUrl: read('REDIS_URL'),
    jwtSecret: read('JWT_SECRET', 'change_me_with_secure_local_secret'),
    ai: {
      provider: read('AI_PROVIDER', 'openai'),
      apiKey: aiKey,
      enabled: aiKey.length > 0
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
      redirectUri: read('YOUTUBE_REDIRECT_URI', 'http://localhost:3000/api/youtube/callback')
    }
  };
}

export const config = loadConfig();
