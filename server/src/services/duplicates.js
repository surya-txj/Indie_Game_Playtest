import { env } from '../config/env.js';
import { Build } from '../models/index.js';
import { getReportVector } from './embedding.js';
import { searchSimilar } from './vectorSearch.js';

/**
 * Builds of this game whose reports may appear as duplicate hints: non-embargoed
 * builds, plus embargoed ones the viewer may see (members see all).
 */
async function visibleBuildIds(gameId, viewerId, isMember) {
  const builds = await Build.find({ gameId }).select('embargoed allowedViewers').lean();
  return builds
    .filter((b) => isMember || !b.embargoed || b.allowedViewers.some((v) => String(v) === String(viewerId)))
    .map((b) => b._id);
}

/**
 * Up to `limit` reports in the same studio and game that look like `report`.
 * Hints only: nothing is linked or changed.
 */
export async function findPossibleDuplicates(report, { viewerId, isMember = false, vector = null, limit = 3 } = {}) {
  const queryVector = vector ?? (await getReportVector(report._id));
  if (!queryVector) return null;
  const buildIds = await visibleBuildIds(report.gameId, viewerId, isMember);
  const results = await searchSimilar({
    vector: queryVector,
    scope: { studioId: report.studioId, gameId: report.gameId, buildIds },
    excludeIds: [report._id],
    limit,
    minScore: env.DUPLICATE_SIMILARITY_THRESHOLD,
  });
  return results.map((r) => ({ reportId: r._id, title: r.title, score: Number(r.score.toFixed(4)) }));
}
