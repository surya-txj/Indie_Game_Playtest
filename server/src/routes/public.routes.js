import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { publicGamesQuery, slugParams } from '../schemas/catalog.js';
import * as catalog from '../services/catalog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/games',
  validate({ query: publicGamesQuery }),
  asyncHandler(async (req, res) => {
    res.json(await catalog.listPublicGames(req.query));
  }),
);

router.get(
  '/games/:slug/playtests',
  validate({ params: slugParams }),
  asyncHandler(async (req, res) => {
    res.json(await catalog.publicPlaytests(req.params.slug));
  }),
);

export default router;
