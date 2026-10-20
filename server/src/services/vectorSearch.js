import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Report } from '../models/index.js';
import { similarityScore } from '../utils/cosine.js';

let atlasAvailable = true;
let warned = false;

const toId = (v) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));

/**
 * Scope → a filter both `$vectorSearch` and a plain `find` understand.
 * Always excludes soft-deleted reports.
 */
function buildFilter({ studioId, gameId, buildIds, sessionId }) {
  const filter = { studioId: toId(studioId), deletedAt: null };
  if (gameId) filter.gameId = toId(gameId);
  if (sessionId) filter.sessionId = toId(sessionId);
  if (buildIds) filter.buildId = { $in: buildIds.map(toId) };
  return filter;
}

async function atlasSearch({ vector, filter, excludeIds, limit }) {
  const exclude = excludeIds.map(toId);
  return Report.aggregate([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: vector,
        numCandidates: Math.max(100, (limit + exclude.length) * 20),
        limit: limit + exclude.length,
        filter,
      },
    },
    { $project: { title: 1, category: 1, severity: 1, buildId: 1, createdAt: 1, score: { $meta: 'vectorSearchScore' } } },
    ...(exclude.length ? [{ $match: { _id: { $nin: exclude } } }] : []),
    { $limit: limit },
  ]);
}

/** Node fallback: cosine over every embedded report in scope. Fine for demo-sized data. */
async function nodeSearch({ vector, filter, excludeIds, limit }) {
  const exclude = new Set(excludeIds.map(String));
  const docs = await Report.find({ ...filter, embeddingModel: env.OLLAMA_EMBED_MODEL })
    .select('+embedding title category severity buildId createdAt')
    .lean();
  return docs
    .filter((d) => !exclude.has(String(d._id)) && d.embedding?.length === vector.length)
    .map(({ embedding, ...d }) => ({ ...d, score: similarityScore(vector, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Nearest reports to `vector` inside a studio scope. Uses Atlas Vector Search
 * when the index exists, otherwise falls back to Node. Scores use the Atlas
 * cosine scale (1 + cos) / 2 either way.
 */
export async function searchSimilar({ vector, scope, excludeIds = [], limit = 5, minScore = 0 }) {
  const filter = buildFilter(scope);
  let results;
  if (atlasAvailable) {
    try {
      results = await atlasSearch({ vector, filter, excludeIds, limit });
    } catch (err) {
      atlasAvailable = false;
      if (!warned) {
        warned = true;
        console.warn(`[vectorSearch] $vectorSearch unavailable (${err.message.split('\n')[0]}); using Node cosine fallback`);
      }
    }
  }
  if (!results) results = await nodeSearch({ vector, filter, excludeIds, limit });
  return results.filter((r) => r.score >= minScore);
}

/** Lets a long-running process retry Atlas after the index finishes building. */
export function resetVectorSearchMode() {
  atlasAvailable = true;
}
