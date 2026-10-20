import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { acceptInvitationBody } from '../schemas/sessions.js';
import { acceptInvitation } from '../services/invitations.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/invitations/accept',
  authenticate,
  requireRole('tester'),
  validate({ body: acceptInvitationBody }),
  asyncHandler(async (req, res) => {
    res.json(await acceptInvitation(req.user, req.body.token));
  }),
);

export default router;
