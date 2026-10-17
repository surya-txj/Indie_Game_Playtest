import mongoose from 'mongoose';
import { AI_LABEL } from '../constants.js';
import { ChatThread, Report } from '../models/index.js';
import { chatMessages } from '../prompts/chat.js';
import { ChatAnswerSchema } from '../schemas/ai.js';
import { ApiError } from '../utils/ApiError.js';
import { embedText } from './embedding.js';
import { invokeStructured } from './structuredOutput.js';
import { searchSimilar } from './vectorSearch.js';

const TOP_K = 6;
const HISTORY = 6;
// Below this score a report is too far from the question to count as evidence.
const MIN_RELEVANCE = 0.55;

async function loadThread({ threadId, studioId, gameId, user }) {
  if (!threadId) return new ChatThread({ studioId, gameId, userId: user._id, messages: [] });
  const thread = await ChatThread.findOne({ _id: threadId, studioId, gameId, userId: user._id });
  if (!thread) throw ApiError.notFound('Thread');
  return thread;
}

/**
 * RAG over the studio's reports for one game. Retrieval is filtered server-side
 * by studio and game, and only retrieved ids survive as citations.
 */
export async function askAssistant({ user, studioId, gameId, threadId, message }) {
  const thread = await loadThread({ threadId, studioId, gameId, user });

  const vector = await embedText(message, 'query');
  const hits = await searchSimilar({ vector, scope: { studioId, gameId }, limit: TOP_K, minScore: MIN_RELEVANCE });
  const reports = await Report.find({ _id: { $in: hits.map((h) => h._id) }, deletedAt: null }).lean();
  const ordered = hits.map((h) => reports.find((r) => String(r._id) === String(h._id))).filter(Boolean);

  let answer;
  let citations = [];
  if (ordered.length === 0) {
    answer = 'I could not find any reports for this game that relate to that question, so I cannot answer it from playtest feedback.';
  } else {
    const result = await invokeStructured({
      schema: ChatAnswerSchema,
      name: 'investigation_answer',
      messages: chatMessages({ question: message, reports: ordered, history: thread.messages.slice(-HISTORY) }),
      label: 'Investigation assistant',
    });
    answer = result.answer;
    const retrieved = new Set(ordered.map((r) => String(r._id)));
    // Drop any id the model invented.
    citations = [...new Set(result.citations.map((c) => String(c).trim()))].filter(
      (c) => retrieved.has(c) && mongoose.isValidObjectId(c),
    );
  }

  thread.messages.push({ role: 'user', content: message, at: new Date() });
  thread.messages.push({ role: 'assistant', content: answer, citations, at: new Date() });
  await thread.save();

  const titleById = new Map(ordered.map((r) => [String(r._id), r.title]));
  return {
    label: AI_LABEL,
    threadId: thread._id,
    answer,
    citations: citations.map((id) => ({ reportId: id, title: titleById.get(id) })),
    retrieved: ordered.map((r) => ({ reportId: r._id, title: r.title })),
  };
}

export async function listThreads(user, { studioId, gameId }) {
  return ChatThread.find({ studioId, gameId, userId: user._id }).sort({ updatedAt: -1 }).limit(20).lean();
}
