import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import publicRoutes from './public.routes.js';
import gamesRoutes from './games.routes.js';
import sessionsRoutes from './sessions.routes.js';
import invitationsRoutes from './invitations.routes.js';
import reportsRoutes from './reports.routes.js';
import issuesRoutes from './issues.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// Routers share the /api prefix, so each one attaches its guards per route.
router.use(healthRoutes);
router.use(authRoutes);
router.use(publicRoutes);
router.use(workspaceRoutes);
router.use(gamesRoutes);
router.use(sessionsRoutes);
router.use(invitationsRoutes);
router.use(reportsRoutes);
router.use(issuesRoutes);
router.use(aiRoutes);

export default router;
