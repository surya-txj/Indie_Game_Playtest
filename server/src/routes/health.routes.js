import { Router } from 'express';
import { dbStatus } from '../config/db.js';
import { ollamaStatus } from '../config/ollama.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    res.json({ status: 'ok', db: dbStatus(), ollama: await ollamaStatus() });
  }),
);

export default router;
