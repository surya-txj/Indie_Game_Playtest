import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

/** Verifies the Bearer JWT and loads `req.user`. */
export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthenticated();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthenticated('Invalid or expired token');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthenticated('Invalid or expired token');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Checks the caller's global role. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
