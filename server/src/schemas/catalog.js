import { z } from 'zod';
import { MEMBER_ROLES } from '../constants.js';
import { objectId, pagination } from './common.js';

export const createStudioBody = z.object({ name: z.string().trim().min(2).max(120) }).strict();

export const addMemberBody = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(MEMBER_ROLES),
  })
  .strict();

export const createGameBody = z
  .object({
    studioId: objectId,
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).optional().default(''),
    publicRecruitment: z.boolean().optional().default(false),
  })
  .strict();

// .strict() rejects any unexpected field, including attempts to attach a build file.
export const createBuildBody = z
  .object({
    gameId: objectId,
    version: z.string().trim().min(1).max(50),
    notes: z.string().trim().max(5000).optional().default(''),
    embargoed: z.boolean().optional().default(false),
    allowedViewers: z.array(objectId).max(200).optional().default([]),
  })
  .strict();

export const embargoBody = z
  .object({
    embargoed: z.boolean(),
    allowedViewers: z.array(objectId).max(200).default([]),
  })
  .strict();

export const publicGamesQuery = pagination.extend({
  q: z.string().trim().max(100).optional(),
});

export const slugParams = z.object({ slug: z.string().trim().toLowerCase().max(80) });
