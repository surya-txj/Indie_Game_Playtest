import { env } from '../config/env.js';
import { AI_LABEL } from '../constants.js';
import { Report, TriageRun } from '../models/index.js';
import { clarificationMessages, clusterSummaryMessages } from '../prompts/triage.js';
import { ClarificationDraftSchema, ClusterSummarySchema } from '../schemas/ai.js';
import { ApiError } from '../utils/ApiError.js';
import { clusterByThreshold } from './clustering.js';
import { embedReport } from './embedding.js';
import { invokeStructured } from './structuredOutput.js';
import { heuristicClusterSummary, heuristicQuestions, vagueReasons, isVague } from './triageHeuristics.js';

const MAX_REPORTS = 100;
const MAX_REPORTS_PER_PROMPT = 6;
const MAX_LLM_QUESTION_DRAFTS = 10;

const verificationLabel = (n) => `${n} similar reports, unverified`;

async function loadScopedReports(scope) {
  const filter = { studioId: scope.studioId, deletedAt: null };
  if (scope.sessionId) filter.sessionId = scope.sessionId;
  if (scope.buildId) filter.buildId = scope.buildId;
  return Report.find(filter).select('+embedding').sort({ createdAt: 1 }).limit(MAX_REPORTS);
}

/**
 * Clusters reports in a session or build, summarises each cluster, flags vague
 * reports and drafts questions. Suggests only: it never links, confirms or
 * edits anything. Saves and returns a TriageRun.
 */
export async function runTriage({ user, studioId, gameId, sessionId = null, buildId = null }) {
  const reports = await loadScopedReports({ studioId, sessionId, buildId });

  // Embed any report missing a current vector.
  let ollamaDown = false;
  for (const report of reports) {
    if (report.embedding?.length && report.embeddingModel === env.OLLAMA_EMBED_MODEL) continue;
    if (ollamaDown) continue;
    const result = await embedReport(report);
    if (result.ok) report.embedding = result.vector;
    else ollamaDown = true;
  }

  const embedded = reports.filter((r) => r.embedding?.length);
  if (reports.length > 0 && embedded.length === 0) {
    throw new ApiError(503, 'AI_UNAVAILABLE', 'Ollama is unavailable and no reports in scope have embeddings yet');
  }

  let fallbackUsed = ollamaDown;
  const groups = clusterByThreshold(embedded, env.DUPLICATE_SIMILARITY_THRESHOLD);

  const clusters = [];
  for (const group of groups) {
    const members = group.items;
    let summary;
    let clusterFallback = false;
    if (!ollamaDown) {
      try {
        summary = await invokeStructured({
          schema: ClusterSummarySchema,
          name: 'cluster_summary',
          messages: clusterSummaryMessages(members.slice(0, MAX_REPORTS_PER_PROMPT)),
          label: 'Cluster summary',
        });
      } catch (err) {
        console.warn(`[triage] cluster summary fell back to heuristics: ${err.message}`);
        if (err.code === 'AI_UNAVAILABLE' && /fetch failed|ECONNREFUSED/i.test(err.message)) ollamaDown = true;
      }
    }
    if (!summary) {
      summary = heuristicClusterSummary(members, group.meanScore);
      clusterFallback = true;
      fallbackUsed = true;
    }
    const times = members.map((r) => r.createdAt.getTime());
    clusters.push({
      ...summary,
      reportIds: members.map((r) => r._id),
      size: members.length,
      buildsAffected: [...new Set(members.map((r) => String(r.buildId)))],
      firstAt: new Date(Math.min(...times)),
      lastAt: new Date(Math.max(...times)),
      fallbackUsed: clusterFallback,
    });
  }

  const flaggedReports = [];
  let drafts = 0;
  for (const report of reports.filter(isVague)) {
    const reasons = vagueReasons(report);
    let questions;
    if (!ollamaDown && drafts < MAX_LLM_QUESTION_DRAFTS) {
      drafts += 1;
      try {
        ({ questions } = await invokeStructured({
          schema: ClarificationDraftSchema,
          name: 'clarification_questions',
          messages: clarificationMessages(report, reasons),
          label: 'Clarification draft',
        }));
      } catch (err) {
        console.warn(`[triage] question draft fell back to heuristics: ${err.message}`);
      }
    }
    if (!questions) {
      questions = heuristicQuestions(reasons);
      fallbackUsed = true;
    }
    flaggedReports.push({ reportId: report._id, reasons, questions });
  }

  const run = await TriageRun.create({
    studioId,
    gameId,
    scope: { sessionId, buildId },
    clusters,
    flaggedReports,
    reportCount: reports.length,
    model: env.OLLAMA_CHAT_MODEL,
    fallbackUsed,
    createdBy: user._id,
  });
  return presentTriageRun(run);
}

/** Response shape: AI label on the run and an "unverified" note on every cluster. */
export async function presentTriageRun(run) {
  const json = run.toJSON ? run.toJSON() : run;
  const ids = [...json.clusters.flatMap((c) => c.reportIds), ...json.flaggedReports.map((f) => f.reportId)];
  const reports = await Report.find({ _id: { $in: ids } })
    .select('title category severity description steps buildId createdAt lockedAt deletedAt')
    .lean();
  const byId = new Map(reports.map((r) => [String(r._id), r]));
  return {
    label: AI_LABEL,
    triageRun: {
      _id: json._id,
      scope: json.scope,
      createdAt: json.createdAt,
      reportCount: json.reportCount,
      model: json.model,
      fallbackUsed: json.fallbackUsed,
      clusters: json.clusters.map((c) => ({
        ...c,
        verification: verificationLabel(c.size),
        reports: c.reportIds.map((id) => byId.get(String(id))).filter((r) => r && !r.deletedAt),
      })),
      flaggedReports: json.flaggedReports.map((f) => ({ ...f, report: byId.get(String(f.reportId)) ?? null })),
    },
  };
}
