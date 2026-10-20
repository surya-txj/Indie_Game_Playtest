import { z } from 'zod';
import { CLARIFICATION_SOURCES, MAX_STEPS, REPORT_CATEGORIES, SEVERITIES } from '../constants.js';
import { objectId } from './common.js';

const title = z.string().trim().min(5).max(120);
const description = z.string().trim().min(20).max(5000);
const steps = z.array(z.string().trim().min(1).max(500)).max(MAX_STEPS);

/** multipart sends `steps` as a JSON string; accept a real array too. */
const stepsField = z.preprocess((v) => {
  if (v === undefined || v === '') return [];
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}, steps);

export const createReportBody = z
  .object({
    category: z.enum(REPORT_CATEGORIES),
    severity: z.enum(SEVERITIES),
    title,
    description,
    steps: stepsField,
  })
  .strict();

// .strict(): sending originalText (or anything else) is a 400, never a silent write.
export const updateReportBody = z
  .object({ title: title.optional(), description: description.optional(), steps: steps.optional() })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one of title, description, steps' });

export const deleteReportBody = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export const screenshotParams = z.object({ id: objectId, file: z.string().regex(/^[a-f0-9]{32}\.(png|jpg|webp)$/) });

export const clarificationRequestBody = z
  .object({
    questions: z.array(z.string().trim().min(5).max(500)).min(1).max(5),
    source: z.enum(CLARIFICATION_SOURCES).default('developer'),
    triageRunId: objectId.optional(),
  })
  .strict();

export const clarificationAnswerBody = z
  .object({ clarificationId: objectId, answer: z.string().trim().min(1).max(2000) })
  .strict();
