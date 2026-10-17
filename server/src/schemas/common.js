import mongoose from 'mongoose';
import { z } from 'zod';

export const objectId = z
  .string()
  .trim()
  .refine((v) => mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v), { message: 'Invalid id' });

export const idParams = z.object({ id: objectId });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
