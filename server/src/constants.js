export const ROLES = ['tester', 'developer', 'coordinator'];
export const MEMBER_ROLES = ['developer', 'coordinator'];
export const SESSION_STATUSES = ['draft', 'scheduled', 'active', 'closed'];
export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'];
export const REPORT_CATEGORIES = ['bug', 'confusing', 'frustration'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const AI_STATUSES = ['pending', 'ready', 'failed'];
export const CLARIFICATION_STATUSES = ['pending', 'answered', 'dismissed'];
export const CLARIFICATION_SOURCES = ['developer', 'agent'];
export const LINK_TYPES = ['duplicate', 'related'];
export const LINK_SOURCES = ['manual', 'ai'];

export const ISSUE_STATUSES = [
  'open',
  'triaged',
  'confirmed',
  'in_progress',
  'fixed',
  'verified',
  'closed',
  'cannot_reproduce',
  'wont_fix',
];

/** The issue state machine. `transitionIssue` is the only code that reads it. */
export const ISSUE_TRANSITIONS = {
  open: ['triaged', 'cannot_reproduce', 'wont_fix'],
  triaged: ['confirmed', 'cannot_reproduce', 'wont_fix'],
  confirmed: ['in_progress', 'wont_fix'],
  in_progress: ['fixed'],
  fixed: ['verified', 'in_progress'],
  verified: ['closed'],
  closed: [],
  cannot_reproduce: ['triaged'],
  wont_fix: ['triaged'],
};

/** Sessions in these states accept new reports (scheduled is allowed for the demo). */
export const REPORTABLE_SESSION_STATUSES = ['scheduled', 'active'];

export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const MAX_STEPS = 20;
export const AI_LABEL = 'AI-suggested';
