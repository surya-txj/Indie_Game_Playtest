import { EMBEDDING_DIMENSIONS, env } from '../config/env.js';
import { aiCall, embeddings } from '../config/ollama.js';
import { Clarification, Report } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildEmbeddingText } from '../utils/reportText.js';

// nomic-embed-text is trained with task prefixes; documents and queries use different ones.
const PREFIX = { document: 'search_document: ', query: 'search_query: ' };

export async function embedText(text, kind = 'document') {
  const vector = await aiCall(() => embeddings.embedQuery(`${PREFIX[kind]}${text}`), { label: 'Embedding' });
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new ApiError(
      503,
      'AI_UNAVAILABLE',
      `Embedding model returned ${vector?.length ?? 0} dimensions, expected ${EMBEDDING_DIMENSIONS}`,
    );
  }
  return vector;
}

/**
 * Embeds a report (including answered clarifications) and stores the vector.
 * Never throws: on failure the report keeps `aiStatus: pending` (or `failed` for
 * a wrong-sized vector) so the backfill script can retry later.
 */
export async function embedReport(reportOrId) {
  const report = typeof reportOrId === 'object' && reportOrId._id ? reportOrId : await Report.findById(reportOrId);
  if (!report) return { ok: false, error: 'not found' };
  try {
    const clarifications = await Clarification.find({ reportId: report._id, status: 'answered' }).lean();
    const vector = await embedText(buildEmbeddingText(report, clarifications), 'document');
    const update = { embedding: vector, embeddingModel: env.OLLAMA_EMBED_MODEL, embeddedAt: new Date(), aiStatus: 'ready' };
    await Report.updateOne({ _id: report._id }, { $set: update });
    Object.assign(report, { embeddingModel: update.embeddingModel, embeddedAt: update.embeddedAt, aiStatus: 'ready' });
    return { ok: true, vector };
  } catch (err) {
    const aiStatus = /dimensions/.test(err.message) ? 'failed' : 'pending';
    console.warn(`[embedding] report ${report._id}: ${err.message}`);
    await Report.updateOne({ _id: report._id }, { $set: { aiStatus } });
    report.aiStatus = aiStatus;
    return { ok: false, error: err.message };
  }
}

/** Loads a stored vector, if the report has a current one. */
export async function getReportVector(reportId) {
  const doc = await Report.findById(reportId).select('+embedding embeddingModel').lean();
  if (!doc?.embedding?.length || doc.embeddingModel !== env.OLLAMA_EMBED_MODEL) return null;
  return doc.embedding;
}
