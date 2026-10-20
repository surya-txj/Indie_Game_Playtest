import mongoose from 'mongoose';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const buildSchema = new mongoose.Schema(
  {
    gameId: { type: ObjectId, ref: 'Game', required: true },
    studioId: { type: ObjectId, ref: 'Studio', required: true, index: true },
    version: { type: String, required: true, trim: true, maxlength: 50 },
    notes: { type: String, default: '', maxlength: 5000 },
    embargoed: { type: Boolean, default: false },
    allowedViewers: [{ type: ObjectId, ref: 'User' }],
    releasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

buildSchema.index({ gameId: 1, version: 1 }, { unique: true });
buildSchema.plugin(cleanJSON);

export const Build = mongoose.model('Build', buildSchema);
