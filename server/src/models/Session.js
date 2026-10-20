import mongoose from 'mongoose';
import { SESSION_STATUSES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const sessionSchema = new mongoose.Schema(
  {
    gameId: { type: ObjectId, ref: 'Game', required: true },
    buildId: { type: ObjectId, ref: 'Build', required: true, index: true },
    studioId: { type: ObjectId, ref: 'Studio', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    instructions: { type: String, default: '', maxlength: 5000 },
    startsAt: { type: Date, required: true },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startsAt || value > this.startsAt;
        },
        message: 'endsAt must be after startsAt',
      },
    },
    status: { type: String, enum: SESSION_STATUSES, default: 'scheduled' },
    consent: {
      screenshots: { type: Boolean, default: false },
      publicSummary: { type: Boolean, default: false },
    },
    publicSummary: { type: String, default: '', maxlength: 2000 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ gameId: 1, startsAt: -1 });
sessionSchema.plugin(cleanJSON);

export const Session = mongoose.model('Session', sessionSchema);
