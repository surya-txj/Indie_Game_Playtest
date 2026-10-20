import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (req, res) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down and try again shortly' } });
};

const skip = () => env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip,
});

/** Keyed by user after `authenticate`, so one user cannot drain the shared IP budget. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `user:${req.user._id}` : req.ip),
  handler,
  skip,
});
