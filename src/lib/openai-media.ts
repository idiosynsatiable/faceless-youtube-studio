import { config } from './config';

export type OpenAIFetch = typeof fetch;
const API = 'https://api.openai.com/v1';

function auth(extra: Record<string, string> = {}): Record<string, string> {
  if (!config.ai.enabled) throw new Error('OPENAI_API_KEY is not configured');
  return { Authorization: `Bearer ${config.ai.apiKey}`, ...extra };
}

export async function generateNarration(text: string, fetchImpl: OpenAIFetch = fetch): Promise<Buffer> {
  if (text.length > 4096) throw new Error('narration segment exceeds 4096 characters');
  const res = await fetchImpl(`${API}/audio/speech`, {
    method: 'POST',
    headers: auth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ model: config.ai.ttsModel, voice: config.ai.ttsVoice, input: text, response_format: 'wav' })
  });
  if (!res.ok) throw new Error(`speech generation failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function generateEditorialImage(prompt: string, fetchImpl: OpenAIFetch = fetch): Promise<Buffer> {
  const res = await fetchImpl(`${API}/images/generations`, {
    method: 'POST',
    headers: auth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      model: config.ai.imageModel,
      prompt: `${prompt}. Premium editorial composition, faceless, no watermarks, no embedded text.`,
      size: '1536x1024',
      quality: 'medium',
      output_format: 'png'
    })
  });
  const payload = await res.json().catch(() => null) as { data?: { b64_json?: string }[] } | null;
  const encoded = payload?.data?.[0]?.b64_json;
  if (!res.ok || !encoded) throw new Error(`image generation failed (${res.status})`);
  return Buffer.from(encoded, 'base64');
}

export async function generateHeroClip(prompt: string, fetchImpl: OpenAIFetch = fetch): Promise<Buffer> {
  const form = new FormData();
  form.set('model', config.ai.videoModel);
  form.set('prompt', `${prompt}. Cinematic informational b-roll, faceless, no logos, no watermarks.`);
  form.set('seconds', '8');
  form.set('size', '1280x720');
  const create = await fetchImpl(`${API}/videos`, { method: 'POST', headers: auth(), body: form });
  const job = await create.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!create.ok || !job?.id) throw new Error(`video generation start failed (${create.status})`);
  let status = job.status ?? 'queued';
  const deadline = Date.now() + 12 * 60_000;
  while (status !== 'completed' && Date.now() < deadline) {
    if (status === 'failed' || status === 'cancelled') throw new Error(`video generation ended with ${status}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const poll = await fetchImpl(`${API}/videos/${encodeURIComponent(job.id)}`, { headers: auth() });
    const state = await poll.json().catch(() => null) as { status?: string } | null;
    if (!poll.ok || !state) throw new Error(`video generation poll failed (${poll.status})`);
    status = state.status ?? status;
  }
  if (status !== 'completed') throw new Error('video generation timed out');
  const content = await fetchImpl(`${API}/videos/${encodeURIComponent(job.id)}/content`, { headers: auth() });
  if (!content.ok) throw new Error(`video download failed (${content.status})`);
  return Buffer.from(await content.arrayBuffer());
}
