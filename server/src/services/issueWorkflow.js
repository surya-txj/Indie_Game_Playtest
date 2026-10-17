import { ISSUE_TRANSITIONS } from '../constants.js';
import { Build, Issue, Report, ReportLink, Studio } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export function allowedTransitions(from) {
  return ISSUE_TRANSITIONS[from] ?? [];
}

export function canTransition(from, to) {
  return allowedTransitions(from).includes(to);
}

async function checkAssignee(studioId, assigneeId) {
  if (!assigneeId) return null;
  const studio = await Studio.findById(studioId).lean();
  const member = studio?.members.find((m) => String(m.userId) === String(assigneeId));
  if (!member || member.role !== 'developer') {
    throw ApiError.badRequest('Assignee must be a developer in this studio', [{ path: 'assigneeId', message: 'not a studio developer' }]);
  }
  return assigneeId;
}

/**
 * The only writer of `Issue.status`. Checks the transition table, the
 * `fixedInBuildId` rule, and appends to `statusHistory`.
 */
export async function transitionIssue(issue, { to, user, note = '', fixedInBuildId }) {
  const from = issue.status;
  if (!canTransition(from, to)) {
    throw ApiError.conflict(`Cannot move an issue from ${from} to ${to}`, { allowed: allowedTransitions(from) });
  }
  if (to === 'fixed') {
    if (!fixedInBuildId) {
      throw ApiError.badRequest('fixedInBuildId is required when marking an issue fixed', [
        { path: 'fixedInBuildId', message: 'required for status fixed' },
      ]);
    }
    const build = await Build.findById(fixedInBuildId).lean();
    if (!build || String(build.gameId) !== String(issue.gameId)) {
      throw ApiError.badRequest('fixedInBuildId must be a build of the same game', [
        { path: 'fixedInBuildId', message: 'build not found in this game' },
      ]);
    }
    issue.fixedInBuildId = build._id;
  }
  issue.status = to;
  issue.statusHistory.push({ from, to, byUserId: user._id, note, at: new Date() });
  await issue.save();
  return issue;
}

/**
 * Links reports to an issue one by one and returns a result per item, so one
 * bad id does not sink the batch. Each linked report is locked against edits;
 * nothing else about the report changes.
 */
export async function linkReports(issue, links, user) {
  const results = [];
  for (const link of links) {
    const reportId = link.reportId;
    try {
      const report = await Report.findOne({ _id: reportId, studioId: issue.studioId, deletedAt: null });
      if (!report) throw ApiError.notFound('Report');
      if (String(report.gameId) !== String(issue.gameId)) {
        throw ApiError.badRequest('Report belongs to a different game');
      }
      await ReportLink.create({
        issueId: issue._id,
        reportId: report._id,
        linkType: link.linkType ?? 'duplicate',
        source: link.source ?? 'manual',
        similarity: link.similarity ?? null,
        linkedBy: user._id,
      });
      if (!report.lockedAt) {
        await Report.updateOne(
          { _id: report._id },
          { $set: { lockedAt: new Date(), lockedReason: `Linked to issue "${issue.title}"` } },
        );
      }
      results.push({ reportId, ok: true });
    } catch (err) {
      const error = err?.code === 11000 ? 'CONFLICT' : err.code ?? 'ERROR';
      const message = err?.code === 11000 ? 'Report is already linked to this issue' : err.message;
      results.push({ reportId, ok: false, error, message });
    }
  }
  return results;
}

export async function createIssue(user, studioId, body) {
  const build = await Build.findOne({ _id: body.buildId, studioId }).lean();
  if (!build) throw ApiError.notFound('Build');
  const assigneeId = await checkAssignee(studioId, body.assigneeId);
  const issue = await Issue.create({
    studioId,
    gameId: build.gameId,
    buildId: build._id,
    title: body.title,
    description: body.description,
    severity: body.severity,
    assigneeId,
    status: 'open',
    statusHistory: [{ from: null, to: 'open', byUserId: user._id, note: 'Created' }],
  });
  let linkResults = [];
  if (body.reportIds.length) {
    linkResults = await linkReports(
      issue,
      body.reportIds.map((reportId) => ({ reportId, linkType: 'duplicate', source: body.source })),
      user,
    );
  }
  return { issue, linkResults };
}

export async function assignIssue(issue, assigneeId) {
  issue.assigneeId = await checkAssignee(issue.studioId, assigneeId);
  await issue.save();
  return issue;
}
