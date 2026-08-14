// Central runtime configuration. Reads only environment variables.
// All integrations support a disabled-safe mode when their env vars are not set.

export type AutonomyPublishMode = 'private' | 'unlisted' | 'public';

export interface RuntimeConfig {
  appUrl: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  ai: {
    provider: string;
    apiKey: string;
    enabled: boolean;
    model: string;
    imageModel: string;
    ttsModel: string;
    ttsVoice: string;
    videoModel: string;
  };
  autonomy: {
    enabled: boolean;
    targetHandle: string;
    targetChannelId: string;
    publishMode: AutonomyPublishMode;
    intervalMinutes: number;
    maxUploadsPerDay: number;
    minHoursBetweenUploads: number;
    minOpportunityScore: number;
    minSourceCount: number;
    minConfidence: number;
    maxVisuals: number;
    shortsPerVideo: number;
    uploadShorts: boolean;
    shortsSpacingHours: number;
    soraEnabled: boolean;
    maxSoraClips: number;
  };
  stripe: {
    enabled: boolean;
    secretKey: string;
    webhookSecret: string;
    priceIds: { creator: string; studio: string; agency: string };
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

function readBool(name: string, fallback = false): boolean {
  const value = read(name);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(read(name, String(fallback)), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function publishMode(value: string): AutonomyPublishMode {
  return value === 'private' || value === 'unlisted' || value === 'public' ? value : 'private';
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
      enabled: aiKey.length > 0,
      model: read('OPENAI_AUTONOMY_MODEL', 'gpt-5.1'),
      imageModel: read('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
      ttsModel: read('OPENAI_TTS_MODEL', 'tts-1-hd'),
      ttsVoice: read('OPENAI_TTS_VOICE', 'onyx'),
      videoModel: read('OPENAI_VIDEO_MODEL', 'sora-2-pro')
    },
    autonomy: {
      enabled: readBool('AUTONOMY_ENABLED', false),
      targetHandle: read('YOUTUBE_TARGET_HANDLE', '@idiosynsatiable'),
      targetChannelId: read('YOUTUBE_TARGET_CHANNEL_ID'),
      publishMode: publishMode(read('AUTONOMY_PUBLISH_MODE', 'private')),
      intervalMinutes: readInt('AUTONOMY_INTERVAL_MINUTES', 60, 15, 1440),
      maxUploadsPerDay: readInt('AUTONOMY_MAX_UPLOADS_PER_DAY', 2, 1, 8),
      minHoursBetweenUploads: readInt('AUTONOMY_MIN_HOURS_BETWEEN_UPLOADS', 6, 1, 48),
      minOpportunityScore: readInt('AUTONOMY_MIN_OPPORTUNITY_SCORE', 72, 50, 100),
      minSourceCount: readInt('AUTONOMY_MIN_SOURCE_COUNT', 2, 2, 8),
      minConfidence: readInt('AUTONOMY_MIN_CONFIDENCE', 75, 50, 100),
      maxVisuals: readInt('AUTONOMY_MAX_VISUALS', 6, 3, 12),
      shortsPerVideo: readInt('AUTONOMY_SHORTS_PER_VIDEO', 2, 0, 4),
      uploadShorts: readBool('AUTONOMY_UPLOAD_SHORTS', true),
      shortsSpacingHours: readInt('AUTONOMY_SHORTS_SPACING_HOURS', 6, 1, 48),
      soraEnabled: readBool('AUTONOMY_SORA_ENABLED', false),
      maxSoraClips: readInt('AUTONOMY_MAX_SORA_CLIPS', 1, 0, 3)
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
