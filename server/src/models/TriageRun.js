import mongoose from 'mongoose';
import { REPORT_CATEGORIES, SEVERITIES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const clusterSchema = new mongoose.Schema(
  {
    title: String,
    summary: String,
    category: { type: String, enum: REPORT_CATEGORIES },
    severityHint: { type: String, enum: SEVERITIES },
    mergedReproSteps: [String],
    confidence: { type: Number, min: 0, max: 1 },
    reportIds: [{ type: ObjectId, ref: 'Report' }],
    size: Number,
    buildsAffected: [{ type: ObjectId, ref: 'Build' }],
    firstAt: Date,
    lastAt: Date,
    fallbackUsed: { type: Boolean, default: false },
  },
  { _id: true },
);

const flaggedSchema = new mongoose.Schema(
  {
    reportId: { type: ObjectId, ref: 'Report', required: true },
    reasons: [String],
    questions: [String],
  },
  { _id: false },
);

const triageRunSchema = new mongoose.Schema(
  {
    studioId: { type: ObjectId, ref: 'Studio', required: true, index: true },
    gameId: { type: ObjectId, ref: 'Game' },
    scope: {
      sessionId: { type: ObjectId, ref: 'Session', default: null },
      buildId: { type: ObjectId, ref: 'Build', default: null },
    },
    clusters: { type: [clusterSchema], default: [] },
    flaggedReports: { type: [flaggedSchema], default: [] },
    reportCount: { type: Number, default: 0 },
    model: String,
    fallbackUsed: { type: Boolean, default: false },
    createdBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

triageRunSchema.plugin(cleanJSON);

export const TriageRun = mongoose.model('TriageRun', triageRunSchema);
