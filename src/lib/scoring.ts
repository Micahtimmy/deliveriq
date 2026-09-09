import {
  ACTIVE_STATUSES, REVIEW_STATUSES, DONE_STATUSES,
  ISSUE_TYPE_WEIGHTS, WEIGHTS, QUALITY_BANDS,
  DELIVERY_CAP, COLLAB_CAP, MIN_DATED_ISSUES, TIERS
} from './constants';
import { JiraIssue } from '../types/jira';
import {
  CategoryScores, PerformanceTier, DimensionWeights
} from '../types/scoring';

// ─── HELPER: extract plain text from Jira comment body ───────────────────────
export function extractCommentText(
  body: string | { content: Array<{ content: Array<{ text?: string }> }> }
): string {
  if (typeof body === 'string') return body;
  try {
    return body.content
      .flatMap(block => block.content)
      .map(node => node.text || '')
      .join('');
  } catch {
    return '';
  }
}

// ─── HELPER: get story points with fallback ───────────────────────────────────
export function getIssuePoints(issue: JiraIssue, storyPointsField: string): number {
  const directPoints =
    (issue.fields as Record<string, unknown>)[storyPointsField] as number | null;
  if (directPoints && directPoints > 0) return directPoints;

  const typeName = issue.fields.issuetype?.name || 'Task';
  return ISSUE_TYPE_WEIGHTS[typeName] ?? 2;
}

// ─── HELPER: normalize status to category ────────────────────────────────────
export function getStatusCategory(statusName: string): 'active' | 'review' | 'done' | 'unknown' {
  const name = statusName.toLowerCase();
  if (DONE_STATUSES.some(s => s.toLowerCase() === name)) return 'done';
  if (REVIEW_STATUSES.some(s => s.toLowerCase() === name)) return 'review';
  if (ACTIVE_STATUSES.some(s => s.toLowerCase() === name)) return 'active';
  return 'unknown';
}

// ─── 1. ON-TIME SCORE ─────────────────────────────────────────────────────────
// Returns null if fewer than MIN_DATED_ISSUES eligible issues
export function computeOnTimeScore(
  issues: JiraIssue[],
  accountId: string
): { score: number | null; onTimeCount: number; eligible: number; lateKeys: string[] } {
  const assigned = issues.filter(i => i.fields.assignee?.accountId === accountId);
  const eligible = assigned.filter(
    i => i.fields.duedate && i.fields.resolutiondate
  );

  if (eligible.length < MIN_DATED_ISSUES) {
    return { score: null, onTimeCount: 0, eligible: eligible.length, lateKeys: [] };
  }

  const lateKeys: string[] = [];
  const onTimeIssues = eligible.filter(i => {
    // Compare date strings directly (YYYY-MM-DD format) — no timezone issues
    const resDate = i.fields.resolutiondate!.substring(0, 10);
    const dueDate = i.fields.duedate!;
    const onTime = resDate <= dueDate;
    if (!onTime) lateKeys.push(i.key);
    return onTime;
  });

  const rate = onTimeIssues.length / eligible.length;
  return {
    score: Math.min(Math.round(rate * 100), 100),
    onTimeCount: onTimeIssues.length,
    eligible: eligible.length,
    lateKeys,
  };
}

// ─── 2. DELIVERED SCORE ───────────────────────────────────────────────────────
export function computeDeliveredScore(
  personPoints: number,
  teamAvgPoints: number
): number {
  if (teamAvgPoints === 0) return 50; // neutral if team has no data
  return Math.min(Math.round((personPoints / teamAvgPoints) * 100), DELIVERY_CAP);
}

export function computePersonPoints(
  issues: JiraIssue[],
  accountId: string,
  storyPointsField: string
): number {
  return issues
    .filter(i => i.fields.assignee?.accountId === accountId)
    .reduce((sum, i) => sum + getIssuePoints(i, storyPointsField), 0);
}

export function computeTeamAvgPoints(
  issues: JiraIssue[],
  allAccountIds: string[],
  storyPointsField: string
): number {
  const totals = allAccountIds.map(id => computePersonPoints(issues, id, storyPointsField));
  const nonZero = totals.filter(t => t > 0);
  if (nonZero.length === 0) return 0;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
}

// ─── 3. QUALITY SCORE ─────────────────────────────────────────────────────────
export function computeQualityScore(
  issues: JiraIssue[],
  accountId: string
): {
  score: number;
  incidents: number;
  reopenedKeys: string[];
  regressionKeys: Array<{ key: string; count: number }>;
  linkedBugCount: number;
} {
  const assigned = issues.filter(i => i.fields.assignee?.accountId === accountId);

  // A. Count reopened tickets (Done → active transition in changelog)
  const reopenedKeys: string[] = [];
  assigned.forEach(issue => {
    const histories = issue.changelog?.histories || [];
    let wasEverDone = false;
    histories.forEach(h => {
      h.items.forEach(item => {
        if (item.field === 'status') {
          const fromCat = getStatusCategory(item.fromString || '');
          const toCat = getStatusCategory(item.toString || '');
          if (fromCat === 'done') wasEverDone = true;
          if (wasEverDone && (toCat === 'active' || toCat === 'review')) {
            if (!reopenedKeys.includes(issue.key)) reopenedKeys.push(issue.key);
          }
        }
      });
    });
  });

  // B. Count review regression events (review → active)
  const regressionMap = new Map<string, number>();
  assigned.forEach(issue => {
    const histories = issue.changelog?.histories || [];
    histories.forEach(h => {
      h.items.forEach(item => {
        if (item.field === 'status') {
          const fromCat = getStatusCategory(item.fromString || '');
          const toCat = getStatusCategory(item.toString || '');
          if (fromCat === 'review' && toCat === 'active') {
            regressionMap.set(issue.key, (regressionMap.get(issue.key) || 0) + 1);
          }
        }
      });
    });
  });
  const regressionKeys = Array.from(regressionMap.entries()).map(([key, count]) => ({ key, count }));
  const totalRegressions = regressionKeys.reduce((sum, r) => sum + r.count, 0);

  // C. Count linked bugs (caused by this person's resolved work)
  let linkedBugCount = 0;
  assigned.forEach(issue => {
    const links = issue.fields.issuelinks || [];
    links.forEach(link => {
      const linked = link.inwardIssue || link.outwardIssue;
      const linkTypeName = link.type.name.toLowerCase();
      const isCausation = ['causes', 'is caused by', 'caused by', 'relates to'].some(
        t => linkTypeName.includes(t)
      );
      if (isCausation && linked?.fields.issuetype.name === 'Bug') {
        linkedBugCount++;
      }
    });
  });

  // Total incidents: reopens + regressions + (bugs at half weight)
  const totalIncidents = reopenedKeys.length + totalRegressions + Math.ceil(linkedBugCount / 2);

  // Score from band
  const band = QUALITY_BANDS.find(b => totalIncidents <= b.max);
  const score = band?.score ?? 30;

  return { score, incidents: totalIncidents, reopenedKeys, regressionKeys, linkedBugCount };
}

// ─── 4. COLLABORATION SCORE ───────────────────────────────────────────────────
export function computeCollaborationScore(
  issues: JiraIssue[],
  accountId: string,
  teamAvgCollab: number
): { score: number; commentCount: number } {
  const commentCount = issues
    .filter(i => i.fields.assignee?.accountId !== accountId) // not their own issue
    .reduce((sum, issue) => {
      const comments = issue.fields.comment?.comments || [];
      const qualifying = comments.filter(c => {
        if (c.author.accountId !== accountId) return false;
        const text = extractCommentText(c.body);
        return text.length > 20;
      });
      return sum + qualifying.length;
    }, 0);

  if (teamAvgCollab === 0) return { score: 50, commentCount };
  return {
    score: Math.min(Math.round((commentCount / teamAvgCollab) * 100), COLLAB_CAP),
    commentCount,
  };
}

export function computeTeamAvgCollab(
  issues: JiraIssue[],
  allAccountIds: string[]
): number {
  const counts = allAccountIds.map(id => {
    return issues
      .filter(i => i.fields.assignee?.accountId !== id)
      .reduce((sum, issue) => {
        const comments = issue.fields.comment?.comments || [];
        return sum + comments.filter(c => {
          if (c.author.accountId !== id) return false;
          const text = extractCommentText(c.body);
          return text.length > 20;
        }).length;
      }, 0);
  });
  const nonZero = counts.filter(c => c > 0);
  if (nonZero.length === 0) return 0;
  return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
}

// ─── 5. ICI COMPOSITE ────────────────────────────────────────────────────────
export function computeICI(categories: CategoryScores, customWeights?: DimensionWeights): number {
  // If on-time is null (insufficient data), use 60 as neutral placeholder
  const onTime = categories.onTime ?? 60;
  const w = customWeights
    ? {
        onTime: customWeights.onTime / 100,
        delivered: customWeights.delivered / 100,
        quality: customWeights.quality / 100,
        collaboration: customWeights.collaboration / 100,
      }
    : WEIGHTS;

  return Math.round(
    onTime * w.onTime +
    categories.delivered * w.delivered +
    categories.quality * w.quality +
    categories.collaboration * w.collaboration
  );
}

// ─── 6. PERFORMANCE TIER ─────────────────────────────────────────────────────
export function getTier(ici: number): PerformanceTier {
  if (ici >= TIERS.strong) return 'Strong Contributor';
  if (ici >= TIERS.onTrack) return 'On Track';
  if (ici >= TIERS.belowTarget) return 'Below Target';
  return 'Needs Attention';
}
