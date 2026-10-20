import mongoose from 'mongoose';
import { cleanJSON } from './plugins.js';

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: [{ type: ObjectId, ref: 'Report' }],
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatThreadSchema = new mongoose.Schema(
  {
    studioId: { type: ObjectId, ref: 'Studio', required: true },
    gameId: { type: ObjectId, ref: 'Game', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

chatThreadSchema.index({ studioId: 1, userId: 1 });
chatThreadSchema.plugin(cleanJSON);

export const ChatThread = mongoose.model('ChatThread', chatThreadSchema);
