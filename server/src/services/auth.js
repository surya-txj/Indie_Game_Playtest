import bcrypt from 'bcryptjs';
import { Studio, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken } from '../utils/tokens.js';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function register({ name, email, password, role }) {
  if (await User.exists({ email })) throw ApiError.conflict('Email already registered');
  const user = await User.create({ name, email, role, passwordHash: await hashPassword(password) });
  return { token: signAccessToken(user), user };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts cannot be enumerated.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthenticated('Invalid email or password');
  return { token: signAccessToken(user), user };
}

export async function userStudios(userId) {
  const studios = await Studio.find({ 'members.userId': userId }).lean();
  return studios.map((s) => ({
    _id: s._id,
    name: s.name,
    role: s.members.find((m) => String(m.userId) === String(userId)).role,
  }));
}
