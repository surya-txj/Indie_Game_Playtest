import { z } from 'zod';
import { ROLES } from '../constants.js';

const email = z.string().trim().toLowerCase().email().max(254);

export const registerBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    email,
    password: z.string().min(8).max(128),
    role: z.enum(ROLES),
  })
  .strict();

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(128),
});
