export const ROLES = ['tester', 'developer', 'coordinator'];
export const REPORT_CATEGORIES = ['bug', 'confusing', 'frustration'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const SESSION_STATUSES = ['draft', 'scheduled', 'active', 'closed'];

export const ISSUE_STATUSES = [
  'open', 'triaged', 'confirmed', 'in_progress', 'fixed', 'verified', 'closed', 'cannot_reproduce', 'wont_fix',
];

// Mirror of the server table; the server is still the one that enforces it.
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

export const BOARD_COLUMNS = [
  { key: 'open', label: 'Open', statuses: ['open'] },
  { key: 'triaged', label: 'Triaged', statuses: ['triaged'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['confirmed'] },
  { key: 'in_progress', label: 'In progress', statuses: ['in_progress'] },
  { key: 'fixed', label: 'Fixed', statuses: ['fixed'] },
  { key: 'done', label: 'Verified / closed', statuses: ['verified', 'closed'] },
  { key: 'parked', label: 'Not reproducible / won’t fix', statuses: ['cannot_reproduce', 'wont_fix'] },
];

export const statusLabel = (s) => s.replace(/_/g, ' ');

export const SEVERITY_TONE = { low: 'slate', medium: 'amber', high: 'orange', critical: 'red' };
export const CATEGORY_TONE = { bug: 'red', confusing: 'blue', frustration: 'purple' };
export const STATUS_TONE = {
  open: 'slate', triaged: 'blue', confirmed: 'red', in_progress: 'amber', fixed: 'green', verified: 'green',
  closed: 'slate', cannot_reproduce: 'slate', wont_fix: 'slate',
};
