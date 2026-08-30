// Status names that mean "in active development"
export const ACTIVE_STATUSES = [
  'In Progress', 'In Development', 'Development',
  'In Dev', 'To Do', 'Backlog', 'Reopened', 'Open'
];

// Status names that mean "under review"
export const REVIEW_STATUSES = [
  'In Review', 'Code Review', 'Review', 'Peer Review',
  'Testing', 'QA', 'In QA', 'UAT', 'In Testing'
];

// Status names that mean "done"
export const DONE_STATUSES = [
  'Done', 'Closed', 'Resolved', 'Complete', 'Completed',
  'Released', 'Accepted'
];

// Issue type weights for fallback scoring (when story points not used)
export const ISSUE_TYPE_WEIGHTS: Record<string, number> = {
  'Bug': 1,
  'Task': 2,
  'Sub-task': 2,
  'Story': 3,
  'Epic': 5,
};

// ICI composite weights
export const WEIGHTS = {
  onTime: 0.35,
  delivered: 0.25,
  quality: 0.25,
  collaboration: 0.15,
};

// Performance tier thresholds
export const TIERS = {
  strong: 90,
  onTrack: 75,
  belowTarget: 60,
};

// Quality scoring band
export const QUALITY_BANDS = [
  { max: 1, score: 100 },
  { max: 3, score: 85 },
  { max: 5, score: 70 },
  { max: 8, score: 50 },
  { max: Infinity, score: 30 },
];

// Cache duration in milliseconds (60 minutes)
export const CACHE_TTL_MS = 60 * 60 * 1000;

// Minimum issues required for a reliable on-time score
export const MIN_DATED_ISSUES = 3;

// Minimum issues for a reliable overall score
export const MIN_RESOLVED_ISSUES = 5;

// Delivery cap (120%)
export const DELIVERY_CAP = 120;
export const COLLAB_CAP = 120;
