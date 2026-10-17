import { Build, Game, Invitation, Session, Studio, User } from '../models/index.js';
import { testerCanSeeBuild } from '../utils/access.js';

/**
 * Everything the caller can see, in one call. Members get their studios with
 * member details plus all games, builds and sessions in them. Testers get only
 * the sessions they accepted invitations for (and whose build they may see).
 */
export async function getWorkspace(user) {
  if (user.role === 'tester') return testerWorkspace(user);

  const studios = await Studio.find({ 'members.userId': user._id }).lean();
  const studioIds = studios.map((s) => s._id);
  const [games, builds, sessions] = await Promise.all([
    Game.find({ studioId: { $in: studioIds } }).sort({ createdAt: 1 }).lean(),
    Build.find({ studioId: { $in: studioIds } }).sort({ releasedAt: -1 }).lean(),
    Session.find({ studioId: { $in: studioIds } }).sort({ startsAt: -1 }).lean(),
  ]);

  const userIds = [...new Set(studios.flatMap((s) => s.members.map((m) => String(m.userId))))];
  const users = await User.find({ _id: { $in: userIds } }).select('name email role').lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return {
    studios: studios.map((s) => ({
      _id: s._id,
      name: s.name,
      ownerId: s.ownerId,
      myRole: s.members.find((m) => String(m.userId) === String(user._id)).role,
      members: s.members.map((m) => {
        const u = userById.get(String(m.userId));
        return { userId: m.userId, role: m.role, name: u?.name, email: u?.email };
      }),
    })),
    games,
    builds,
    sessions,
  };
}

async function testerWorkspace(user) {
  const invitations = await Invitation.find({ acceptedBy: user._id, status: 'accepted' }).lean();
  const sessions = await Session.find({ _id: { $in: invitations.map((i) => i.sessionId) } })
    .sort({ startsAt: -1 })
    .lean();
  const builds = await Build.find({ _id: { $in: sessions.map((s) => s.buildId) } }).lean();
  const visibleBuilds = builds.filter((b) => testerCanSeeBuild(b, user._id));
  const visibleBuildIds = new Set(visibleBuilds.map((b) => String(b._id)));
  const visibleSessions = sessions.filter((s) => visibleBuildIds.has(String(s.buildId)));

  const games = await Game.find({ _id: { $in: visibleSessions.map((s) => s.gameId) } })
    .select('title slug description studioId')
    .lean();
  const studios = await Studio.find({ _id: { $in: games.map((g) => g.studioId) } }).select('name').lean();

  return {
    studios: studios.map((s) => ({ _id: s._id, name: s.name, myRole: 'tester', members: [] })),
    games,
    builds: visibleBuilds.map(({ allowedViewers, ...b }) => b),
    sessions: visibleSessions,
  };
}
