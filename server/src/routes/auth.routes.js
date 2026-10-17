import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { validate } from '../middleware/validate.js';
import { loginBody, registerBody } from '../schemas/auth.js';
import * as auth from '../services/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/auth/register',
  authLimiter,
  validate({ body: registerBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await auth.register(req.body));
  }),
);

router.post(
  '/auth/login',
  authLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    res.json(await auth.login(req.body));
  }),
);

router.get(
  '/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user, studios: await auth.userStudios(req.user._id) });
  }),
);

export default router;
