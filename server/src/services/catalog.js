import { Build, Game, Session, Studio, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { requireStudioMember } from '../utils/access.js';
import { uniqueGameSlug } from '../utils/slug.js';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function createStudio(user, { name }) {
  return Studio.create({ name, ownerId: user._id, members: [{ userId: user._id, role: 'developer' }] });
}

export async function addMember(user, studioId, { email, role }) {
  const { studio } = await requireStudioMember(studioId, user, ['developer']);
  const target = await User.findOne({ email });
  if (!target) throw ApiError.notFound('User');
  if (target.role !== role) {
    throw ApiError.badRequest(`User's account role is ${target.role}; studio role must match`, [
      { path: 'role', message: 'must match the account role' },
    ]);
  }
  if (studio.members.some((m) => String(m.userId) === String(target._id))) {
    throw ApiError.conflict('User is already a member of this studio');
  }
  studio.members.push({ userId: target._id, role });
  await studio.save();
  return studio;
}

export async function createGame(user, { studioId, title, description, publicRecruitment }) {
  await requireStudioMember(studioId, user, ['developer']);
  const slug = await uniqueGameSlug(title);
  return Game.create({ studioId, title, slug, description, publicRecruitment });
}

/** Every allowed viewer must be an existing user; returns the de-duplicated id list. */
async function checkViewers(ids) {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return [];
  const count = await User.countDocuments({ _id: { $in: unique } });
  if (count !== unique.length) {
    throw ApiError.badRequest('Unknown user in allowedViewers', [{ path: 'allowedViewers', message: 'unknown user' }]);
  }
  return unique;
}

export async function createBuild(user, { gameId, version, notes, embargoed, allowedViewers }) {
  const game = await Game.findById(gameId);
  if (!game) throw ApiError.notFound('Game');
  await requireStudioMember(game.studioId, user, ['developer']);
  if (await Build.exists({ gameId, version })) throw ApiError.conflict(`Version ${version} already exists for this game`);
  return Build.create({
    gameId,
    studioId: game.studioId,
    version,
    notes,
    embargoed,
    allowedViewers: await checkViewers(allowedViewers),
    releasedAt: new Date(),
  });
}

export async function setEmbargo(user, buildId, { embargoed, allowedViewers }) {
  const build = await Build.findById(buildId);
  if (!build) throw ApiError.notFound('Build');
  await requireStudioMember(build.studioId, user, ['coordinator']);
  build.embargoed = embargoed;
  build.allowedViewers = await checkViewers(allowedViewers);
  await build.save();
  return build;
}

// ---------- Public catalogue ----------

export async function listPublicGames({ q, page, limit }) {
  const filter = { publicRecruitment: true };
  if (q) {
    const rx = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  const [games, total] = await Promise.all([
    Game.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Game.countDocuments(filter),
  ]);
  const studios = await Studio.find({ _id: { $in: games.map((g) => g.studioId) } }).select('name').lean();
  const studioName = new Map(studios.map((s) => [String(s._id), s.name]));
  return {
    items: games.map((g) => ({
      title: g.title,
      slug: g.slug,
      description: g.description,
      studioName: studioName.get(String(g.studioId)) ?? null,
    })),
    page,
    limit,
    total,
  };
}

export async function publicPlaytests(slug) {
  const game = await Game.findOne({ slug, publicRecruitment: true }).lean();
  if (!game) throw ApiError.notFound('Game');

  const openBuildIds = await Build.find({ gameId: game._id, embargoed: false }).distinct('_id');
  const sessions = await Session.find({
    gameId: game._id,
    buildId: { $in: openBuildIds },
    status: { $ne: 'draft' },
    publishedAt: { $ne: null },
    'consent.publicSummary': true,
  })
    .sort({ startsAt: -1 })
    .lean();

  return {
    game: { title: game.title, slug: game.slug, description: game.description },
    sessions: sessions.map((s) => ({
      _id: s._id,
      title: s.title,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      publicSummary: s.publicSummary,
    })),
  };
}
