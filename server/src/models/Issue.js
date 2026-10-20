import mongoose from 'mongoose';
import { ISSUE_STATUSES, SEVERITIES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const historySchema = new mongoose.Schema(
  {
    from: { type: String, enum: [...ISSUE_STATUSES, null] },
    to: { type: String, enum: ISSUE_STATUSES, required: true },
    byUserId: { type: ObjectId, ref: 'User', required: true },
    note: { type: String, default: '', maxlength: 1000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const issueSchema = new mongoose.Schema(
  {
    studioId: { type: ObjectId, ref: 'Studio', required: true },
    gameId: { type: ObjectId, ref: 'Game', required: true },
    buildId: { type: ObjectId, ref: 'Build', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 5000 },
    severity: { type: String, enum: SEVERITIES, required: true },
    status: { type: String, enum: ISSUE_STATUSES, default: 'open' },
    assigneeId: { type: ObjectId, ref: 'User', default: null },
    fixedInBuildId: { type: ObjectId, ref: 'Build', default: null },
    statusHistory: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

issueSchema.index({ studioId: 1, status: 1 });
issueSchema.plugin(cleanJSON);

export const Issue = mongoose.model('Issue', issueSchema);
