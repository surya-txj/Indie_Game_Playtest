import mongoose from 'mongoose';
import { MEMBER_ROLES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const memberSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: MEMBER_ROLES, required: true },
  },
  { _id: false },
);

const studioSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    ownerId: { type: ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

studioSchema.index({ 'members.userId': 1 });
studioSchema.plugin(cleanJSON);

export const Studio = mongoose.model('Studio', studioSchema);
