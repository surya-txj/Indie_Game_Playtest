import mongoose from 'mongoose';
import { CLARIFICATION_SOURCES, CLARIFICATION_STATUSES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const clarificationSchema = new mongoose.Schema(
  {
    reportId: { type: ObjectId, ref: 'Report', required: true, index: true },
    studioId: { type: ObjectId, ref: 'Studio', required: true },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    askedBy: { type: String, enum: CLARIFICATION_SOURCES, required: true },
    askedByUserId: { type: ObjectId, ref: 'User', required: true },
    answer: { type: String, default: null, maxlength: 2000 },
    answeredAt: { type: Date, default: null },
    status: { type: String, enum: CLARIFICATION_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

clarificationSchema.plugin(cleanJSON);

export const Clarification = mongoose.model('Clarification', clarificationSchema);
