import mongoose from 'mongoose';
import { INVITATION_STATUSES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const invitationSchema = new mongoose.Schema(
  {
    sessionId: { type: ObjectId, ref: 'Session', required: true },
    studioId: { type: ObjectId, ref: 'Studio', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Only the SHA-256 of the one-time token is stored; the raw token lives in the invite link.
    tokenHash: { type: String, required: true },
    status: { type: String, enum: INVITATION_STATUSES, default: 'pending' },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: ObjectId, ref: 'User' },
    acceptedBy: { type: ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invitationSchema.index({ sessionId: 1, email: 1 }, { unique: true });
invitationSchema.index({ tokenHash: 1 });
invitationSchema.index({ acceptedBy: 1, status: 1 });
invitationSchema.plugin(cleanJSON);

export const Invitation = mongoose.model('Invitation', invitationSchema);
