import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import * as models from '../src/models/index.js';
import { hashPassword } from '../src/services/auth.js';
import { embedReport } from '../src/services/embedding.js';
import { linkReports } from '../src/services/issueWorkflow.js';
import { buildOriginalText } from '../src/utils/reportText.js';
import { randomToken, sha256 } from '../src/utils/tokens.js';
import { DUPLICATE_GROUPS, INJECTION_REPORT, PASSWORD, USERS, VAGUE_REPORTS } from './seedData.js';

const { User, Studio, Game, Build, Session, Invitation, Report, Clarification, Issue, TriageRun } = models;
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

async function clearAll() {
  // deleteMany (not drop) keeps the collections, so the Atlas vector index survives reseeding.
  await Promise.all(Object.values(models).map((m) => m.deleteMany({})));
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));
}

async function main() {
  await connectDB();
  await clearAll();

  const passwordHash = await hashPassword(PASSWORD);
  const users = {};
  for (const u of USERS) {
    users[u.key] = await User.create({ name: u.name, email: u.email, role: u.role, passwordHash });
  }

  const studio = await Studio.create({
    name: 'Lantern Fox Games',
    ownerId: users.dev1._id,
    members: [
      ...['dev1', 'dev2', 'dev3'].map((k) => ({ userId: users[k]._id, role: 'developer' })),
      ...['coord1', 'coord2', 'coord3'].map((k) => ({ userId: users[k]._id, role: 'coordinator' })),
    ],
  });

  const moss = await Game.create({
    studioId: studio._id,
    title: 'Moss Run',
    slug: 'moss-run',
    description: 'A cosy 2D platformer about a mossy fox climbing through caverns and villages.',
    publicRecruitment: true,
  });
  const ember = await Game.create({
    studioId: studio._id,
    title: 'Ember Hollow',
    slug: 'ember-hollow',
    description: 'An unannounced atmospheric exploration game.',
    publicRecruitment: false,
  });

  const moss09 = await Build.create({
    gameId: moss._id, studioId: studio._id, version: '0.9.0', notes: 'Closed beta: caverns, village, Thornback boss.',
    releasedAt: new Date(now - 10 * DAY),
  });
  const moss10 = await Build.create({
    gameId: moss._id, studioId: studio._id, version: '1.0.0', notes: 'Release candidate with collision and save fixes.',
    releasedAt: new Date(now - 1 * DAY),
  });
  const ember03 = await Build.create({
    gameId: ember._id, studioId: studio._id, version: '0.3.0-alpha', notes: 'Embargoed alpha. Do not share.',
    embargoed: true, allowedViewers: [users.tester1._id], releasedAt: new Date(now - 5 * DAY),
  });

  const mossSession = await Session.create({
    gameId: moss._id, buildId: moss09._id, studioId: studio._id,
    title: 'Moss Run weekend closed beta',
    instructions: 'Play from the start through the Thornback boss. Report anything broken, confusing or frustrating. Screenshots welcome.',
    startsAt: new Date(now - 7 * DAY), endsAt: new Date(now + 7 * DAY), status: 'active',
    consent: { screenshots: true, publicSummary: true },
    publicSummary: 'Thanks to everyone who played the closed beta! Testers loved the caverns and found the Thornback boss tough. We are improving checkpoints and crafting tutorial clarity.',
    publishedAt: new Date(now - 1 * DAY),
  });
  const emberSession = await Session.create({
    gameId: ember._id, buildId: ember03._id, studioId: studio._id,
    title: 'Ember Hollow embargoed alpha',
    instructions: 'Explore freely for 30 minutes. This build is under embargo.',
    startsAt: new Date(now - 3 * DAY), endsAt: new Date(now + 10 * DAY), status: 'active',
    consent: { screenshots: false, publicSummary: false },
  });

  const expiresAt = new Date(now + 30 * DAY);
  const accepted = async (session, tester) => Invitation.create({
    sessionId: session._id, studioId: studio._id, email: tester.email, tokenHash: sha256(randomToken()),
    status: 'accepted', expiresAt, invitedBy: users.coord1._id, acceptedBy: tester._id, acceptedAt: new Date(now - 6 * DAY),
  });
  for (const k of ['tester1', 'tester2', 'tester3']) await accepted(mossSession, users[k]);
  await accepted(emberSession, users.tester1);

  // A pending invitation for an account that does not exist yet, to demo register → accept.
  const pendingToken = randomToken();
  await Invitation.create({
    sessionId: mossSession._id, studioId: studio._id, email: 'newtester@playtest.dev', tokenHash: sha256(pendingToken),
    status: 'pending', expiresAt, invitedBy: users.coord1._id,
  });

  const sessions = { moss: mossSession, ember: emberSession };
  const reportsByGroup = {};
  let createdCount = 0;
  const createReport = async ([testerKey, category, severity, title, description, steps], session) => {
    const report = await Report.create({
      sessionId: session._id, buildId: session.buildId, gameId: session.gameId, studioId: studio._id,
      testerId: users[testerKey]._id, category, severity, title, description, steps,
      originalText: buildOriginalText({ title, description, steps }), aiStatus: 'pending',
    });
    // Spread submissions over the last few days for realistic first/last dates.
    const createdAt = new Date(now - (6 - (createdCount % 6)) * DAY + createdCount * 60 * 1000);
    await Report.collection.updateOne({ _id: report._id }, { $set: { createdAt, updatedAt: createdAt } });
    report.createdAt = createdAt;
    createdCount += 1;
    return report;
  };

  for (const group of DUPLICATE_GROUPS) {
    reportsByGroup[group.name] = [];
    for (const r of group.reports) reportsByGroup[group.name].push(await createReport(r, sessions[group.session]));
  }
  const vague = [];
  for (const r of VAGUE_REPORTS) vague.push(await createReport(r, mossSession));
  const injection = await createReport(INJECTION_REPORT, mossSession);

  // One issue already in progress, so the board and locking are visible right away.
  const fallGroup = reportsByGroup[DUPLICATE_GROUPS[0].name];
  const issue = await Issue.create({
    studioId: studio._id, gameId: moss._id, buildId: moss09._id,
    title: 'Player falls through the rope bridge in Mossy Caverns',
    description: 'Missing collision on the rope bridge planks. Reported by several testers in different words.',
    severity: 'high', status: 'triaged', assigneeId: users.dev2._id,
    statusHistory: [
      { from: null, to: 'open', byUserId: users.dev1._id, note: 'Created from triage cluster', at: new Date(now - 2 * DAY) },
      { from: 'open', to: 'triaged', byUserId: users.dev1._id, note: 'Assigned to Diego', at: new Date(now - 1 * DAY) },
    ],
  });
  await linkReports(issue, fallGroup.slice(0, 2).map((r) => ({ reportId: r._id, linkType: 'duplicate', source: 'ai', similarity: 0.9 })), users.dev1);

  // A pending developer question on a vague report, for the tester to answer.
  await Clarification.create({
    reportId: vague[1]._id, studioId: studio._id, askedBy: 'developer', askedByUserId: users.dev1._id,
    question: 'Where in the game were you when it felt slow, and roughly how long had you been playing?',
  });

  // Embeddings are best-effort: without Ollama, run `npm run backfill` later.
  const all = await Report.find({});
  let embedded = 0;
  for (const report of all) {
    const result = await embedReport(report);
    if (result.ok) embedded += 1;
    else if (embedded === 0) break;
  }

  console.log('\nSeed complete.');
  console.table({
    users: await User.countDocuments(), studios: await Studio.countDocuments(), games: await Game.countDocuments(),
    builds: await Build.countDocuments(), sessions: await Session.countDocuments(), reports: await Report.countDocuments(),
    issues: await Issue.countDocuments(), embedded, triageRuns: await TriageRun.countDocuments(),
  });
  if (embedded < all.length) {
    console.log(`Only ${embedded}/${all.length} reports embedded (is Ollama running with ${env.OLLAMA_EMBED_MODEL}?). Run "npm run backfill" once it is.`);
  }
  console.log('\nIDs:');
  console.table({
    studio: String(studio._id), mossRun: String(moss._id), emberHollow: String(ember._id),
    'build moss 0.9.0': String(moss09._id), 'build moss 1.0.0': String(moss10._id), 'build ember 0.3.0-alpha (embargoed)': String(ember03._id),
    'session moss beta': String(mossSession._id), 'session ember alpha': String(emberSession._id),
    'issue (triaged)': String(issue._id), 'vague report w/ question': String(vague[1]._id), 'prompt-injection report': String(injection._id),
  });
  console.log(`\nLogin credentials (password for every account: ${PASSWORD})`);
  console.table(USERS.map((u) => ({ role: u.role, name: u.name, email: u.email })));
  console.log('Notes: tester1 can see the embargoed Ember Hollow session; tester2/tester3 cannot.');
  console.log(`Pending invite for newtester@playtest.dev (register that email, then open):\n  ${env.CLIENT_ORIGIN}/invite/${pendingToken}\n`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => mongoose.disconnect()));
