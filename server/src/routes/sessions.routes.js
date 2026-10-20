import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams, pagination } from '../schemas/common.js';
import { createInvitationsBody, createSessionBody, publishBody, updateSessionStatusBody } from '../schemas/sessions.js';
import { createInvitations } from '../services/invitations.js';
import * as sessions from '../services/sessions.js';
import { loadSessionAccess } from '../utils/access.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/sessions',
  authenticate,
  requireRole('coordinator'),
  validate({ body: createSessionBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await sessions.createSession(req.user, req.body));
  }),
);

router.get(
  '/sessions/:id',
  authenticate,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const access = await loadSessionAccess(req.params.id, req.user);
    res.json(await sessions.sessionDetail(access));
  }),
);

router.get(
  '/sessions/:id/reports',
  authenticate,
  validate({ params: idParams, query: pagination }),
  asyncHandler(async (req, res) => {
    const access = await loadSessionAccess(req.params.id, req.user);
    res.json(await sessions.listSessionReports(access, req.user, req.query));
  }),
);

router.patch(
  '/sessions/:id/status',
  authenticate,
  requireRole('coordinator'),
  validate({ params: idParams, body: updateSessionStatusBody }),
  asyncHandler(async (req, res) => {
    const { session } = await loadSessionAccess(req.params.id, req.user, { memberRoles: ['coordinator'] });
    session.status = req.body.status;
    await session.save();
    res.json(session);
  }),
);

router.post(
  '/sessions/:id/invitations',
  authenticate,
  requireRole('coordinator'),
  validate({ params: idParams, body: createInvitationsBody }),
  asyncHandler(async (req, res) => {
    const { session, build } = await loadSessionAccess(req.params.id, req.user, { memberRoles: ['coordinator'] });
    res.status(201).json(await createInvitations({ session, build, user: req.user, ...req.body }));
  }),
);

router.patch(
  '/sessions/:id/publish',
  authenticate,
  requireRole('coordinator'),
  validate({ params: idParams, body: publishBody }),
  asyncHandler(async (req, res) => {
    const access = await loadSessionAccess(req.params.id, req.user, { memberRoles: ['coordinator'] });
    res.json(await sessions.publishSummary(access, req.body));
  }),
);

export default router;
