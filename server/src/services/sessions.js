import { Build, Invitation, Report, Session, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { requireStudioMember } from '../utils/access.js';
import { sanitizePublicText } from '../utils/sanitize.js';

export async function createSession(user, body) {
  const build = await Build.findById(body.buildId);
  if (!build) throw ApiError.notFound('Build');
  await requireStudioMember(build.studioId, user, ['coordinator']);
  return Session.create({ ...body, gameId: build.gameId, studioId: build.studioId });
}

export async function invitationSummary(sessionId) {
  return Invitation.find({ sessionId })
    .select('email status expiresAt acceptedAt createdAt')
    .sort({ createdAt: 1 })
    .lean();
}

/** Session detail with build info. Members also get the invitation list. */
export async function sessionDetail({ session, build, memberRole }) {
  const out = {
    ...session.toJSON(),
    build: { _id: build._id, version: build.version, notes: build.notes, embargoed: build.embargoed },
  };
  if (memberRole) out.invitations = await invitationSummary(session._id);
  return out;
}

/** Members see every live report; a tester sees only their own. */
export async function listSessionReports({ session, memberRole }, user, { page, limit }) {
  const filter = { sessionId: session._id, deletedAt: null };
  if (!memberRole) filter.testerId = user._id;
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('testerId', 'name')
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { items: items.map(({ embedding, ...r }) => r), page, limit, total };
}

export async function publishSummary({ session }, { publicSummary }) {
  if (!session.consent?.publicSummary) {
    throw ApiError.forbidden('Testers did not consent to a public summary for this session');
  }
  const testerIds = await Report.distinct('testerId', { sessionId: session._id });
  const invited = await Invitation.find({ sessionId: session._id }).select('acceptedBy').lean();
  const ids = [...testerIds, ...invited.map((i) => i.acceptedBy).filter(Boolean)];
  const testers = await User.find({ _id: { $in: ids } }).select('name').lean();

  session.publicSummary = sanitizePublicText(publicSummary, { names: testers.map((t) => t.name) });
  session.publishedAt = new Date();
  await session.save();
  return session;
}
