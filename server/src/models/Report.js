import mongoose from 'mongoose';
import { AI_STATUSES, MAX_SCREENSHOTS, MAX_STEPS, REPORT_CATEGORIES, SEVERITIES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const screenshotSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const editSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    steps: [String],
    editedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const reportSchema = new mongoose.Schema(
  {
    sessionId: { type: ObjectId, ref: 'Session', required: true },
    buildId: { type: ObjectId, ref: 'Build', required: true },
    gameId: { type: ObjectId, ref: 'Game', required: true },
    studioId: { type: ObjectId, ref: 'Studio', required: true },
    testerId: { type: ObjectId, ref: 'User', required: true },
    category: { type: String, enum: REPORT_CATEGORIES, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    steps: {
      type: [{ type: String, trim: true, maxlength: 500 }],
      default: [],
      validate: { validator: (v) => v.length <= MAX_STEPS, message: `At most ${MAX_STEPS} steps` },
    },
    screenshots: {
      type: [screenshotSchema],
      default: [],
      validate: { validator: (v) => v.length <= MAX_SCREENSHOTS, message: `At most ${MAX_SCREENSHOTS} screenshots` },
    },
    // What the tester first wrote. Never changes, even through edits or triage.
    originalText: { type: String, required: true, immutable: true },
    editHistory: { type: [editSchema], default: [] },
    lockedAt: { type: Date, default: null },
    lockedReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: 'User', default: null },
    deleteReason: { type: String, default: null },
    embedding: { type: [Number], default: undefined, select: false },
    embeddingModel: { type: String, default: null },
    embeddedAt: { type: Date, default: null },
    aiStatus: { type: String, enum: AI_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

reportSchema.index({ sessionId: 1, createdAt: -1 });
reportSchema.index({ studioId: 1, buildId: 1 });
reportSchema.index({ testerId: 1 });
reportSchema.plugin(cleanJSON);

export const Report = mongoose.model('Report', reportSchema);
