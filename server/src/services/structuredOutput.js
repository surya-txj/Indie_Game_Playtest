import { chatModel } from '../config/ollama.js';
import { aiCall } from '../config/ollama.js';

/**
 * Asks the chat model for JSON matching `schema` via LangChain's
 * `withStructuredOutput`, then re-checks it with Zod. On an invalid result it
 * retries once with a correction message. Throws if both attempts fail, so the
 * caller can fall back to heuristics.
 */
export async function invokeStructured({ schema, name, messages, label = 'LLM call' }) {
  const model = chatModel().withStructuredOutput(schema, { name });
  let lastError;
  let attemptMessages = messages;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await aiCall(() => model.invoke(attemptMessages), { label });
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      lastError = new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    } catch (err) {
      // Ollama itself is down: retrying will not help.
      if (err.code === 'AI_UNAVAILABLE' && !/parse|json|schema/i.test(err.message)) throw err;
      lastError = err;
    }
    attemptMessages = [
      ...messages,
      [
        'human',
        `Your previous answer was not valid (${lastError.message.slice(0, 300)}). ` +
          'Reply again with only a JSON object that matches the requested schema exactly.',
      ],
    ];
  }
  throw lastError;
}
