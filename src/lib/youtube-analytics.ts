// YouTube analytics retrieval shim. Disabled-safe by default.
// Real network access happens only in a worker process when integration is enabled.

import { config } from './config';

export interface AnalyticsAvailability {
  enabled: boolean;
  reason?: 'integration_disabled';
  detail: string;
}

export function analyticsAvailability(): AnalyticsAvailability {
  if (!config.youtube.enabled) {
    return {
      enabled: false,
      reason: 'integration_disabled',
      detail: 'YouTube Analytics is disabled because YOUTUBE_CLIENT_ID/SECRET is not configured.'
    };
  }
  return {
    enabled: true,
    detail: 'Analytics available through the official YouTube Analytics API once the channel completes OAuth.'
  };
}
