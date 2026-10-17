import mongoose from 'mongoose';
import { LINK_SOURCES, LINK_TYPES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const reportLinkSchema = new mongoose.Schema(
  {
    issueId: { type: ObjectId, ref: 'Issue', required: true },
    reportId: { type: ObjectId, ref: 'Report', required: true },
    linkType: { type: String, enum: LINK_TYPES, required: true },
    // `ai` means the AI suggested it; a human still created the link.
    source: { type: String, enum: LINK_SOURCES, required: true },
    similarity: { type: Number, min: 0, max: 1, default: null },
    linkedBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

reportLinkSchema.index({ issueId: 1, reportId: 1 }, { unique: true });
reportLinkSchema.index({ reportId: 1 });
reportLinkSchema.plugin(cleanJSON);

export const ReportLink = mongoose.model('ReportLink', reportLinkSchema);
