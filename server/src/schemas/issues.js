import { z } from 'zod';
import { ISSUE_STATUSES, LINK_SOURCES, LINK_TYPES, SEVERITIES } from '../constants.js';
import { objectId } from './common.js';

export const createIssueBody = z
  .object({
    buildId: objectId,
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(5000).optional().default(''),
    severity: z.enum(SEVERITIES),
    assigneeId: objectId.optional(),
    reportIds: z.array(objectId).max(100).optional().default([]),
    source: z.enum(LINK_SOURCES).optional().default('manual'),
  })
  .strict();

export const reportLinksBody = z
  .object({
    links: z
      .array(
        z
          .object({
            reportId: objectId,
            linkType: z.enum(LINK_TYPES).default('duplicate'),
            source: z.enum(LINK_SOURCES).default('manual'),
            similarity: z.number().min(0).max(1).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const statusBody = z
  .object({
    status: z.enum(ISSUE_STATUSES),
    note: z.string().trim().max(1000).optional().default(''),
    fixedInBuildId: objectId.optional(),
  })
  .strict();

export const assignBody = z.object({ assigneeId: objectId.nullable() }).strict();

export const listIssuesQuery = z.object({
  studioId: objectId,
  gameId: objectId.optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
});
