import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../schemas/common.js';
import { assignBody, createIssueBody, listIssuesQuery, reportLinksBody, statusBody } from '../schemas/issues.js';
import { assignIssue, createIssue, linkReports, transitionIssue } from '../services/issueWorkflow.js';
import { issueDetail, listIssues, loadIssueAccess } from '../services/issues.js';
import { Build } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { requireStudioMember } from '../utils/access.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const MEMBERS = ['developer', 'coordinator'];

router.get(
  '/issues',
  authenticate,
  requireRole(...MEMBERS),
  validate({ query: listIssuesQuery }),
  asyncHandler(async (req, res) => {
    res.json(await listIssues(req.user, req.query));
  }),
);

router.get(
  '/issues/:id',
  authenticate,
  requireRole(...MEMBERS),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const { issue } = await loadIssueAccess(req.params.id, req.user);
    res.json(await issueDetail(issue));
  }),
);

router.post(
  '/issues',
  authenticate,
  requireRole('developer'),
  validate({ body: createIssueBody }),
  asyncHandler(async (req, res) => {
    // The studio comes from the build, never from the client.
    const build = await Build.findById(req.body.buildId).select('studioId').lean();
    if (!build) throw ApiError.notFound('Build');
    await requireStudioMember(build.studioId, req.user, ['developer']);
    const { issue, linkResults } = await createIssue(req.user, build.studioId, req.body);
    res.status(201).json({ ...issue.toJSON(), linkResults });
  }),
);

router.post(
  '/issues/:id/report-links',
  authenticate,
  requireRole('developer'),
  validate({ params: idParams, body: reportLinksBody }),
  asyncHandler(async (req, res) => {
    const { issue } = await loadIssueAccess(req.params.id, req.user, ['developer']);
    res.status(201).json({ results: await linkReports(issue, req.body.links, req.user) });
  }),
);

router.patch(
  '/issues/:id/status',
  authenticate,
  requireRole('developer'),
  validate({ params: idParams, body: statusBody }),
  asyncHandler(async (req, res) => {
    const { issue } = await loadIssueAccess(req.params.id, req.user, ['developer']);
    const { status, note, fixedInBuildId } = req.body;
    res.json(await transitionIssue(issue, { to: status, user: req.user, note, fixedInBuildId }));
  }),
);

router.patch(
  '/issues/:id/assignee',
  authenticate,
  requireRole('developer'),
  validate({ params: idParams, body: assignBody }),
  asyncHandler(async (req, res) => {
    const { issue } = await loadIssueAccess(req.params.id, req.user, ['developer']);
    res.json(await assignIssue(issue, req.body.assigneeId));
  }),
);

export default router;
