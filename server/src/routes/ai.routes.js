import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimits.js';
import { validate } from '../middleware/validate.js';
import { Build, Game, Session, TriageRun } from '../models/index.js';
import { chatBody, latestTriageQuery, triageBody } from '../schemas/ai.js';
import { askAssistant } from '../services/chatAgent.js';
import { presentTriageRun, runTriage } from '../services/triageAgent.js';
import { ApiError } from '../utils/ApiError.js';
import { requireStudioMember } from '../utils/access.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const MEMBERS = ['developer', 'coordinator'];

/** Resolves a session or build to its studio and game, then checks membership. */
async function resolveScope({ sessionId, buildId }, user) {
  const doc = sessionId ? await Session.findById(sessionId).lean() : await Build.findById(buildId).lean();
  if (!doc) throw ApiError.notFound(sessionId ? 'Session' : 'Build');
  try {
    await requireStudioMember(doc.studioId, user, MEMBERS);
  } catch (err) {
    if (err.status === 404) throw ApiError.notFound(sessionId ? 'Session' : 'Build');
    throw err;
  }
  return { studioId: doc.studioId, gameId: doc.gameId, sessionId: sessionId ?? null, buildId: buildId ?? null };
}

router.post(
  '/triage-agent',
  authenticate,
  requireRole(...MEMBERS),
  aiLimiter,
  validate({ body: triageBody }),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req.body, req.user);
    res.status(201).json(await runTriage({ user: req.user, ...scope }));
  }),
);

router.get(
  '/triage-runs/latest',
  authenticate,
  requireRole(...MEMBERS),
  validate({ query: latestTriageQuery }),
  asyncHandler(async (req, res) => {
    const scope = await resolveScope(req.query, req.user);
    const filter = { studioId: scope.studioId };
    if (scope.sessionId) filter['scope.sessionId'] = scope.sessionId;
    else filter['scope.buildId'] = scope.buildId;
    const run = await TriageRun.findOne(filter).sort({ createdAt: -1 });
    res.json(run ? await presentTriageRun(run) : { label: 'AI-suggested', triageRun: null });
  }),
);

router.post(
  '/playtest-chat',
  authenticate,
  requireRole(...MEMBERS),
  aiLimiter,
  validate({ body: chatBody }),
  asyncHandler(async (req, res) => {
    const { studioId, gameId } = req.body;
    await requireStudioMember(studioId, req.user, MEMBERS);
    if (!(await Game.exists({ _id: gameId, studioId }))) throw ApiError.notFound('Game');
    res.json(await askAssistant({ user: req.user, ...req.body }));
  }),
);

export default router;
