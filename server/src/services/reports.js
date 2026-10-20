import { REPORTABLE_SESSION_STATUSES } from '../constants.js';
import { Clarification, Issue, Report, ReportLink } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { buildOriginalText } from '../utils/reportText.js';
import { findPossibleDuplicates } from './duplicates.js';
import { embedReport } from './embedding.js';

export async function createReport({ session, user, body, files }) {
  if (!REPORTABLE_SESSION_STATUSES.includes(session.status)) {
    throw ApiError.forbidden(`Session is ${session.status}; reports are accepted while scheduled or active`);
  }
  if (files.length && !session.consent?.screenshots) {
    throw ApiError.badRequest('This session does not allow screenshots', [
      { path: 'screenshots', message: 'consent.screenshots is false for this session' },
    ]);
  }

  const report = await Report.create({
    sessionId: session._id,
    buildId: session.buildId,
    gameId: session.gameId,
    studioId: session.studioId,
    testerId: user._id,
    ...body,
    screenshots: files.map((f) => ({ filename: f.filename, mimeType: f.mimetype, size: f.size })),
    originalText: buildOriginalText(body),
    aiStatus: 'pending',
  });

  // Saved first; AI is best-effort and never blocks the submission.
  const embedded = await embedReport(report);
  let possibleDuplicates = [];
  if (embedded.ok) {
    possibleDuplicates = (await findPossibleDuplicates(report, { viewerId: user._id, vector: embedded.vector })) ?? [];
  }
  return { report, possibleDuplicates, aiStatus: report.aiStatus };
}

export async function reportDetail({ report, memberRole }) {
  const clarifications = await Clarification.find({ reportId: report._id }).sort({ createdAt: 1 }).lean();
  const out = { report: (await report.populate('testerId', 'name')).toJSON(), clarifications };
  if (memberRole) {
    const links = await ReportLink.find({ reportId: report._id }).lean();
    const issues = await Issue.find({ _id: { $in: links.map((l) => l.issueId) } }).select('title status severity').lean();
    const issueById = new Map(issues.map((i) => [String(i._id), i]));
    out.links = links.map((l) => ({
      issue: issueById.get(String(l.issueId)) ?? { _id: l.issueId },
      linkType: l.linkType,
      source: l.source,
      similarity: l.similarity,
    }));
  }
  return out;
}

export async function updateReport(report, changes) {
  if (report.lockedAt) {
    throw ApiError.locked(`Report is locked${report.lockedReason ? `: ${report.lockedReason}` : ''}`);
  }
  report.editHistory.push({
    title: report.title,
    description: report.description,
    steps: [...report.steps],
    editedAt: new Date(),
  });
  Object.assign(report, changes);
  report.aiStatus = 'pending';
  await report.save();
  await embedReport(report);
  return report;
}

export async function softDeleteReport(report, user, reason) {
  report.deletedAt = new Date();
  report.deletedBy = user._id;
  report.deleteReason = reason;
  await report.save();
  return { deleted: true };
}
