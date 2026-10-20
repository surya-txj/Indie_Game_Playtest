import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBuildBody, createGameBody, embargoBody } from '../schemas/catalog.js';
import { idParams } from '../schemas/common.js';
import * as catalog from '../services/catalog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/games',
  authenticate,
  requireRole('developer'),
  validate({ body: createGameBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await catalog.createGame(req.user, req.body));
  }),
);

router.post(
  '/builds',
  authenticate,
  requireRole('developer'),
  validate({ body: createBuildBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await catalog.createBuild(req.user, req.body));
  }),
);

router.patch(
  '/builds/:id/embargo',
  authenticate,
  requireRole('coordinator'),
  validate({ params: idParams, body: embargoBody }),
  asyncHandler(async (req, res) => {
    res.json(await catalog.setEmbargo(req.user, req.params.id, req.body));
  }),
);

export default router;
