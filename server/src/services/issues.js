import mongoose from 'mongoose';
import { Build, Issue, Report, ReportLink } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { requireStudioMember } from '../utils/access.js';
import { allowedTransitions } from './issueWorkflow.js';

/** Loads an issue and checks the caller is a member of its studio (else 404). */
export async function loadIssueAccess(issueId, user, memberRoles = null) {
  if (!mongoose.isValidObjectId(issueId)) throw ApiError.notFound('Issue');
  const issue = await Issue.findById(issueId);
  if (!issue) throw ApiError.notFound('Issue');
  try {
    const { memberRole } = await requireStudioMember(issue.studioId, user, memberRoles);
    return { issue, memberRole };
  } catch (err) {
    if (err.status === 404) throw ApiError.notFound('Issue');
    throw err;
  }
}

export async function listIssues(user, { studioId, gameId, status }) {
  await requireStudioMember(studioId, user);
  const filter = { studioId };
  if (gameId) filter.gameId = gameId;
  if (status) filter.status = status;
  const issues = await Issue.find(filter)
    .sort({ updatedAt: -1 })
    .populate('assigneeId', 'name email')
    .populate('buildId', 'version')
    .populate('fixedInBuildId', 'version')
    .lean();
  const counts = await ReportLink.aggregate([
    { $match: { issueId: { $in: issues.map((i) => i._id) } } },
    { $group: { _id: '$issueId', n: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    items: issues.map((i) => ({
      ...i,
      linkCount: countById.get(String(i._id)) ?? 0,
      allowedTransitions: allowedTransitions(i.status),
    })),
  };
}

export async function issueDetail(issue) {
  await issue.populate([
    { path: 'assigneeId', select: 'name email' },
    { path: 'buildId', select: 'version' },
    { path: 'fixedInBuildId', select: 'version' },
    { path: 'statusHistory.byUserId', select: 'name' },
  ]);
  const links = await ReportLink.find({ issueId: issue._id }).sort({ createdAt: 1 }).lean();
  const reports = await Report.find({ _id: { $in: links.map((l) => l.reportId) } })
    .select('title category severity originalText testerId buildId createdAt deletedAt lockedAt')
    .populate('testerId', 'name')
    .lean();
  const builds = await Build.find({ _id: { $in: reports.map((r) => r.buildId) } }).select('version').lean();
  const version = new Map(builds.map((b) => [String(b._id), b.version]));
  const reportById = new Map(reports.map((r) => [String(r._id), { ...r, buildVersion: version.get(String(r.buildId)) }]));
  return {
    issue: { ...issue.toJSON(), allowedTransitions: allowedTransitions(issue.status) },
    links: links.map((l) => ({
      report: reportById.get(String(l.reportId)) ?? { _id: l.reportId },
      linkType: l.linkType,
      source: l.source,
      similarity: l.similarity,
    })),
  };
}
