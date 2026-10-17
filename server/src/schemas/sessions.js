import { z } from 'zod';
import { SESSION_STATUSES } from '../constants.js';
import { objectId } from './common.js';

export const createSessionBody = z
  .object({
    buildId: objectId,
    title: z.string().trim().min(3).max(120),
    instructions: z.string().trim().max(5000).optional().default(''),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    status: z.enum(SESSION_STATUSES).optional().default('scheduled'),
    consent: z
      .object({
        screenshots: z.boolean().default(false),
        publicSummary: z.boolean().default(false),
      })
      .strict()
      .default({}),
  })
  .strict()
  .refine((b) => b.endsAt > b.startsAt, { path: ['endsAt'], message: 'endsAt must be after startsAt' });

export const updateSessionStatusBody = z.object({ status: z.enum(SESSION_STATUSES) }).strict();

export const createInvitationsBody = z
  .object({
    emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(50),
    expiresAt: z.coerce.date().refine((d) => d > new Date(), { message: 'expiresAt must be in the future' }),
    addToEmbargoAllowList: z.boolean().optional().default(false),
  })
  .strict();

export const acceptInvitationBody = z.object({ token: z.string().trim().min(20).max(200) }).strict();

export const publishBody = z.object({ publicSummary: z.string().max(2000) }).strict();
