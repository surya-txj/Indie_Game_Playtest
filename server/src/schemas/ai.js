import { z } from 'zod';
import { REPORT_CATEGORIES, SEVERITIES } from '../constants.js';
import { objectId } from './common.js';

export const triageBody = z
  .object({ sessionId: objectId.optional(), buildId: objectId.optional() })
  .strict()
  .refine((b) => Boolean(b.sessionId) !== Boolean(b.buildId), { message: 'Provide exactly one of sessionId or buildId' });

export const latestTriageQuery = z
  .object({ sessionId: objectId.optional(), buildId: objectId.optional() })
  .refine((b) => Boolean(b.sessionId) !== Boolean(b.buildId), { message: 'Provide exactly one of sessionId or buildId' });

export const chatBody = z
  .object({
    studioId: objectId,
    gameId: objectId,
    threadId: objectId.optional(),
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

// ---------- LLM output schemas ----------

export const ClusterSummarySchema = z.object({
  title: z.string().min(3).max(120).describe('Short neutral name for the shared problem'),
  summary: z.string().min(10).max(800).describe('2-3 sentences describing what the reports have in common'),
  category: z.enum(REPORT_CATEGORIES),
  severityHint: z.enum(SEVERITIES),
  mergedReproSteps: z.array(z.string().min(1).max(300)).max(10).describe('Best combined reproduction steps'),
  confidence: z.number().min(0).max(1).describe('How sure you are these reports describe the same problem'),
});

export const ClarificationDraftSchema = z.object({
  questions: z.array(z.string().min(5).max(300)).min(1).max(3),
});

export const ChatAnswerSchema = z.object({
  answer: z.string().min(1).max(4000),
  citations: z.array(z.string()).max(6).describe('ids of the <report> blocks the answer relies on'),
});
