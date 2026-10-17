import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

export const embeddings = new OllamaEmbeddings({
  model: env.OLLAMA_EMBED_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
});

export function chatModel(options = {}) {
  return new ChatOllama({
    model: env.OLLAMA_CHAT_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    temperature: 0.2,
    ...options,
  });
}

/**
 * Runs an Ollama call with a timeout. Any failure (connection refused, timeout,
 * model missing) becomes a 503 AI_UNAVAILABLE so callers can degrade gracefully.
 */
export async function aiCall(fn, { timeoutMs = env.AI_TIMEOUT_MS, label = 'AI call' } = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(503, 'AI_UNAVAILABLE', `${label} failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Lightweight reachability probe used by /api/health. */
export async function ollamaStatus() {
  try {
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return 'unavailable';
    const body = await res.json();
    const names = (body.models ?? []).map((m) => m.name);
    const hasEmbed = names.some((n) => n.startsWith(env.OLLAMA_EMBED_MODEL));
    const hasChat = names.some((n) => n.startsWith(env.OLLAMA_CHAT_MODEL));
    return hasEmbed && hasChat ? 'ready' : 'missing-models';
  } catch {
    return 'unavailable';
  }
}
