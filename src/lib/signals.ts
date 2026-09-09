import { JiraIssue } from '../types/jira';
import { CarryOverSignal, RegressionSignal, DateChangeSignal } from '../types/scoring';
import { getStatusCategory } from './scoring';

export function detectCarryOver(
  issues: JiraIssue[],
  accountId: string
): CarryOverSignal {
  const assigned = issues.filter(i => i.fields.assignee?.accountId === accountId);
  const carriedOnce: string[] = [];
  const repeatedlyCarried: string[] = [];

  assigned.forEach(issue => {
    const histories = issue.changelog?.histories || [];
    const sprintChanges = histories.filter(h =>
      h.items.some(item => item.field.toLowerCase() === 'sprint')
    );
    if (sprintChanges.length === 1) carriedOnce.push(issue.key);
    if (sprintChanges.length >= 2) repeatedlyCarried.push(issue.key);
  });

  const totalCarried = carriedOnce.length + repeatedlyCarried.length;
  const rate = assigned.length > 0 ? totalCarried / assigned.length : 0;

  return {
    totalCarried,
    totalResolved: assigned.length,
    rate: Math.round(rate * 100),
    carriedOnce,
    repeatedlyCarried,
  };
}

export function detectRegressions(
  issues: JiraIssue[],
  accountId: string
): RegressionSignal {
  const assigned = issues.filter(i => i.fields.assignee?.accountId === accountId);
  let totalRegressions = 0;
  const affectedMap = new Map<string, number>();

  assigned.forEach(issue => {
    const histories = issue.changelog?.histories || [];
    histories.forEach(h => {
      h.items.forEach(item => {
        if (item.field === 'status') {
          const fromCat = getStatusCategory(item.fromString || '');
          const toCat = getStatusCategory(item.toString || '');
          if (fromCat === 'review' && toCat === 'active') {
            totalRegressions++;
            affectedMap.set(issue.key, (affectedMap.get(issue.key) || 0) + 1);
          }
        }
      });
    });
  });

  const affectedIssues = Array.from(affectedMap.entries()).map(([key, count]) => ({ key, count }));
  let severity: RegressionSignal['severity'] = 'Clean';
  if (totalRegressions >= 6) severity = 'Recurring';
  else if (totalRegressions >= 3) severity = 'Elevated';
  else if (totalRegressions >= 1) severity = 'Occasional';

  return { totalRegressions, affectedIssues, severity };
}

export function detectDateChanges(
  issues: JiraIssue[],
  accountId: string,
  authorizedApproverId: string
): DateChangeSignal {
  const assigned = issues.filter(i => i.fields.assignee?.accountId === accountId);
  const unauthorized: DateChangeSignal['unauthorized'] = [];
  let authorized = 0;
  let unknown = 0;

  // Support multiple comma- or semicolon-separated approver names or IDs
  const approverTokens = (authorizedApproverId || '')
    .split(/[,;]/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const isApprover = (authorId?: string, authorName?: string): boolean => {
    if (approverTokens.length === 0) return false;
    const aId = (authorId || '').toLowerCase().trim();
    const aName = (authorName || '').toLowerCase().trim();

    return approverTokens.some(token => {
      if (!token) return false;
      // Match by exact or partial account ID
      if (aId && (aId === token || aId.includes(token))) return true;
      // Match by exact or partial display name
      if (aName && (aName === token || aName.includes(token) || token.includes(aName))) return true;
      return false;
    });
  };

  assigned.forEach(issue => {
    const histories = issue.changelog?.histories || [];
    let initialSetupDone = false;

    histories.forEach(h => {
      h.items.forEach(item => {
        if (item.field === 'duedate' && item.toString) {
          const authorId = h.author?.accountId;
          const authorName = h.author?.displayName;
          const hasPriorDate = Boolean(item.fromString && item.fromString !== 'not set');
          const authorIsApprover = isApprover(authorId, authorName);

          if (!initialSetupDone && !hasPriorDate) {
            // First time due date is set (initial setup)
            initialSetupDone = true;
            if (authorIsApprover) {
              authorized++;
            } else if (approverTokens.length === 0) {
              unknown++;
            }
          } else {
            // Due date was changed AFTER initial setup
            initialSetupDone = true;
            if (authorIsApprover) {
              authorized++;
            } else if (authorId === accountId || (authorName && authorName.toLowerCase() === (issue.fields.assignee?.displayName || '').toLowerCase())) {
              // Changed by assigned engineer themselves after initial setup
              unauthorized.push({
                key: issue.key,
                from: item.fromString || 'not set',
                to: item.toString,
                changedOn: h.created ? h.created.substring(0, 10) : new Date().toISOString().substring(0, 10),
              });
            } else if (authorId && !authorIsApprover && approverTokens.length > 0) {
              // Changed by an unauthorized person
              unauthorized.push({
                key: issue.key,
                from: item.fromString || 'not set',
                to: item.toString,
                changedOn: h.created ? h.created.substring(0, 10) : new Date().toISOString().substring(0, 10),
              });
            } else {
              unknown++;
            }
          }
        }
      });
    });
  });

  return { unauthorized, authorized, unknown };
}
