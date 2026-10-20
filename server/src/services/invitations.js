import { env } from '../config/env.js';
import { Build, Invitation, Session, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { randomToken, sha256 } from '../utils/tokens.js';

/**
 * Creates one invitation per new email. Only the SHA-256 of each token is
 * stored; the raw token appears once, in the returned link. Email sending is
 * simulated by logging the link.
 */
export async function createInvitations({ session, build, user, emails, expiresAt, addToEmbargoAllowList }) {
  const unique = [...new Set(emails)];
  const existing = await Invitation.find({ sessionId: session._id, email: { $in: unique } }).select('email').lean();
  const already = new Set(existing.map((i) => i.email));

  const created = [];
  for (const email of unique) {
    if (already.has(email)) continue;
    const token = randomToken(32);
    try {
      await Invitation.create({
        sessionId: session._id,
        studioId: session.studioId,
        email,
        tokenHash: sha256(token),
        expiresAt,
        invitedBy: user._id,
      });
    } catch (err) {
      if (err?.code === 11000) {
        already.add(email);
        continue;
      }
      throw err;
    }
    const inviteUrl = `${env.CLIENT_ORIGIN}/invite/${token}`;
    console.log(`[invite] to=${email} session=${session._id} link=${inviteUrl}`);
    created.push({ email, inviteUrl });
  }

  // The coordinator explicitly asked to let invitees see an embargoed build.
  if (build.embargoed && addToEmbargoAllowList) {
    const users = await User.find({ email: { $in: unique } }).select('_id').lean();
    if (users.length) {
      await Build.updateOne({ _id: build._id }, { $addToSet: { allowedViewers: { $each: users.map((u) => u._id) } } });
    }
  }

  return { created, alreadyInvited: unique.filter((e) => already.has(e)) };
}

export async function acceptInvitation(user, token) {
  const invitation = await Invitation.findOne({ tokenHash: sha256(token) });
  if (!invitation) throw ApiError.gone('Invitation is invalid or has already been used');

  if (invitation.status === 'accepted') {
    // Re-opening your own accepted link is harmless; anyone else gets 410.
    if (String(invitation.acceptedBy) === String(user._id)) return { sessionId: invitation.sessionId };
    throw ApiError.gone('Invitation has already been used');
  }
  if (invitation.status !== 'pending') throw ApiError.gone(`Invitation is ${invitation.status}`);
  if (invitation.expiresAt <= new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw ApiError.gone('Invitation has expired');
  }
  if (invitation.email !== user.email) {
    throw ApiError.forbidden('This invitation was sent to a different email address');
  }

  const session = await Session.exists({ _id: invitation.sessionId });
  if (!session) throw ApiError.gone('The session for this invitation no longer exists');

  invitation.status = 'accepted';
  invitation.acceptedBy = user._id;
  invitation.acceptedAt = new Date();
  await invitation.save();
  return { sessionId: invitation.sessionId };
}
