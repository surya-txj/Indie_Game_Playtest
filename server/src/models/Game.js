import mongoose from 'mongoose';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const gameSchema = new mongoose.Schema(
  {
    studioId: { type: ObjectId, ref: 'Studio', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    publicRecruitment: { type: Boolean, default: false },
  },
  { timestamps: true },
);

gameSchema.index({ publicRecruitment: 1 });
gameSchema.plugin(cleanJSON);

export const Game = mongoose.model('Game', gameSchema);
