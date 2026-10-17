import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addMemberBody, createStudioBody } from '../schemas/catalog.js';
import { idParams } from '../schemas/common.js';
import * as catalog from '../services/catalog.js';
import { getWorkspace } from '../services/workspace.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/workspace',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getWorkspace(req.user));
  }),
);

router.post(
  '/studios',
  authenticate,
  requireRole('developer'),
  validate({ body: createStudioBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await catalog.createStudio(req.user, req.body));
  }),
);

router.post(
  '/studios/:id/members',
  authenticate,
  requireRole('developer'),
  validate({ params: idParams, body: addMemberBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await catalog.addMember(req.user, req.params.id, req.body));
  }),
);

export default router;
