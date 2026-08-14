import { config } from './config';

export type OpenAIFetch = typeof fetch;
const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export function extractOpenAIText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === 'string') return direct;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return '';
  const parts: string[] = [];
  for (const item of output) {
    const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : undefined;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const text = block && typeof block === 'object' ? (block as { text?: unknown }).text : undefined;
      if (typeof text === 'string') parts.push(text);
    }
  }
  return parts.join('\n').trim();
}

export function parseJsonObject<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('response did not contain a JSON object');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function requestJson<T>(prompt: string, options: { webSearch?: boolean; fetchImpl?: OpenAIFetch } = {}): Promise<T> {
  if (!config.ai.enabled) throw new Error('OPENAI_API_KEY is not configured');
  const fetchImpl = options.fetchImpl ?? fetch;
  const body: Record<string, unknown> = { model: config.ai.model, input: prompt };
  if (options.webSearch) body.tools = [{ type: 'web_search', search_context_size: 'high' }];
  const res = await fetchImpl(RESPONSES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ai.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) throw new Error(`OpenAI Responses request failed (${res.status})`);
  return parseJsonObject<T>(extractOpenAIText(payload));
}
