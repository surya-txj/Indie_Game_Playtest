import mongoose from 'mongoose';
import { Build, Invitation, Report, Session, Studio } from '../models/index.js';
import { ApiError } from './ApiError.js';

const isId = (id) => mongoose.isValidObjectId(id);
const sameId = (a, b) => String(a) === String(b);

/** The caller's member role in a studio, or null. */
export function membershipRole(studio, userId) {
  const member = studio?.members?.find((m) => sameId(m.userId, userId));
  return member ? member.role : null;
}

/** Ids of every studio the user belongs to. */
export async function memberStudioIds(userId) {
  const studios = await Studio.find({ 'members.userId': userId }).select('_id').lean();
  return studios.map((s) => s._id);
}

/**
 * Loads a studio and checks membership. Not a member → 404 (no probing).
 * Member with the wrong member role → 403.
 */
export async function requireStudioMember(studioId, user, roles = null) {
  if (!isId(studioId)) throw ApiError.notFound('Studio');
  const studio = await Studio.findById(studioId);
  const role = membershipRole(studio, user._id);
  if (!studio || !role) throw ApiError.notFound('Studio');
  if (roles && !roles.includes(role)) {
    throw ApiError.forbidden(`Requires studio role: ${roles.join(' or ')}`);
  }
  return { studio, memberRole: role };
}

/** Testers only see an embargoed build when they are on its allow-list. */
export function testerCanSeeBuild(build, userId) {
  return !build.embargoed || build.allowedViewers.some((v) => sameId(v, userId));
}

/**
 * Loads a session for any caller. Studio members always pass. A tester needs an
 * invitation they accepted for this session and must be able to see the build.
 * `forSubmission` additionally requires the invitation to still be `accepted`
 * (a revoked tester keeps read access to their own reports, not new submissions).
 */
export async function loadSessionAccess(sessionId, user, { memberRoles = null } = {}) {
  if (!isId(sessionId)) throw ApiError.notFound('Session');
  const session = await Session.findById(sessionId);
  if (!session) throw ApiError.notFound('Session');
  const [studio, build] = await Promise.all([Studio.findById(session.studioId), Build.findById(session.buildId)]);
  if (!studio || !build) throw ApiError.notFound('Session');

  const memberRole = membershipRole(studio, user._id);
  if (memberRole) {
    if (memberRoles && !memberRoles.includes(memberRole)) {
      throw ApiError.forbidden(`Requires studio role: ${memberRoles.join(' or ')}`);
    }
    return { session, build, studio, memberRole, invitation: null };
  }
  if (memberRoles || user.role !== 'tester') throw ApiError.notFound('Session');

  const invitation = await Invitation.findOne({ sessionId: session._id, acceptedBy: user._id });
  if (!invitation || invitation.status !== 'accepted' || !testerCanSeeBuild(build, user._id)) {
    throw ApiError.notFound('Session');
  }
  return { session, build, studio, memberRole: null, invitation };
}

/**
 * Loads a non-deleted report. The owning tester and members of its studio pass;
 * everyone else gets 404.
 */
export async function loadReportAccess(reportId, user, { ownerOnly = false, memberRoles = null } = {}) {
  if (!isId(reportId)) throw ApiError.notFound('Report');
  const report = await Report.findOne({ _id: reportId, deletedAt: null });
  if (!report) throw ApiError.notFound('Report');

  const isOwner = sameId(report.testerId, user._id);
  if (ownerOnly) {
    if (!isOwner) throw ApiError.notFound('Report');
    return { report, isOwner, memberRole: null, studio: null };
  }

  const studio = await Studio.findById(report.studioId);
  const memberRole = membershipRole(studio, user._id);
  if (memberRoles) {
    if (!memberRole) throw ApiError.notFound('Report');
    if (!memberRoles.includes(memberRole)) throw ApiError.forbidden(`Requires studio role: ${memberRoles.join(' or ')}`);
  }
  if (!isOwner && !memberRole) throw ApiError.notFound('Report');
  return { report, isOwner, memberRole, studio };
}
