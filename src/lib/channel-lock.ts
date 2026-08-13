export interface ChannelIdentity { id: string; title: string }

export function channelMatchesTarget(authenticated: ChannelIdentity, target: ChannelIdentity, expectedChannelId = ''): boolean {
  if (authenticated.id !== target.id) return false;
  return expectedChannelId.length === 0 || authenticated.id === expectedChannelId;
}
