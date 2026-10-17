import mongoose from 'mongoose';
import { ROLES } from '../constants.js';
import { cleanJSON } from './plugins.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true },
);

userSchema.plugin(cleanJSON);

export const User = mongoose.model('User', userSchema);
