import fs from 'node:fs';
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { screenshotPath, uploadScreenshots } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../schemas/common.js';
import {
  clarificationAnswerBody,
  clarificationRequestBody,
  createReportBody,
  deleteReportBody,
  screenshotParams,
  updateReportBody,
} from '../schemas/reports.js';
import { answerClarification, requestClarifications } from '../services/clarifications.js';
import { findPossibleDuplicates } from '../services/duplicates.js';
import { embedReport } from '../services/embedding.js';
import * as reports from '../services/reports.js';
import { Session } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { loadReportAccess, loadSessionAccess } from '../utils/access.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/sessions/:id/reports',
  authenticate,
  requireRole('tester'),
  validate({ params: idParams }),
  // Access is checked before multer so files from strangers never touch disk.
  asyncHandler(async (req, res, next) => {
    req.access = await loadSessionAccess(req.params.id, req.user);
    next();
  }),
  uploadScreenshots,
  validate({ body: createReportBody }),
  asyncHandler(async (req, res) => {
    const result = await reports.createReport({
      session: req.access.session,
      user: req.user,
      body: req.body,
      files: req.files ?? [],
    });
    res.status(201).json(result);
  }),
);

router.get(
  '/reports/:id',
  authenticate,
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const access = await loadReportAccess(req.params.id, req.user);
    res.json(await reports.reportDetail(access));
  }),
);

router.patch(
  '/reports/:id',
  authenticate,
  requireRole('tester'),
  validate({ params: idParams, body: updateReportBody }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user, { ownerOnly: true });
    res.json(await reports.updateReport(report, req.body));
  }),
);

router.delete(
  '/reports/:id',
  authenticate,
  requireRole('coordinator'),
  validate({ params: idParams, body: deleteReportBody }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user, { memberRoles: ['coordinator'] });
    res.json(await reports.softDeleteReport(report, req.user, req.body.reason));
  }),
);

router.get(
  '/reports/:id/screenshots/:file',
  authenticate,
  validate({ params: screenshotParams }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user);
    const shot = report.screenshots.find((s) => s.filename === req.params.file);
    if (!shot) throw ApiError.notFound('Screenshot');
    const session = await Session.findById(report.sessionId).select('consent').lean();
    if (!session?.consent?.screenshots) throw ApiError.forbidden('Screenshot consent is not enabled for this session');
    const file = screenshotPath(shot.filename);
    if (!file || !fs.existsSync(file)) throw ApiError.notFound('Screenshot');
    res.set('Cache-Control', 'private, max-age=300');
    res.type(shot.mimeType).sendFile(file);
  }),
);

router.get(
  '/reports/:id/duplicates',
  authenticate,
  requireRole('developer', 'coordinator'),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user, { memberRoles: ['developer', 'coordinator'] });
    let items = await findPossibleDuplicates(report, { viewerId: req.user._id, isMember: true, limit: 5 });
    if (items === null) {
      const embedded = await embedReport(report);
      if (!embedded.ok) throw new ApiError(503, 'AI_UNAVAILABLE', 'This report has no embedding yet and Ollama is unavailable');
      items = await findPossibleDuplicates(report, { viewerId: req.user._id, isMember: true, vector: embedded.vector, limit: 5 });
    }
    res.json({ items });
  }),
);

router.post(
  '/reports/:id/clarification-requests',
  authenticate,
  requireRole('developer'),
  validate({ params: idParams, body: clarificationRequestBody }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user, { memberRoles: ['developer'] });
    res.status(201).json(await requestClarifications(report, req.user, req.body));
  }),
);

router.post(
  '/reports/:id/clarifications',
  authenticate,
  requireRole('tester'),
  validate({ params: idParams, body: clarificationAnswerBody }),
  asyncHandler(async (req, res) => {
    const { report } = await loadReportAccess(req.params.id, req.user, { ownerOnly: true });
    res.json(await answerClarification(report, req.body));
  }),
);

export default router;
