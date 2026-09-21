import { storage } from '@forge/api';
import { JiraIssue } from '../types/jira';
import { PersonScore, TeamScoreResult, DimensionWeights } from '../types/scoring';
import {
  computeOnTimeScore, computePersonPoints, computeTeamAvgPoints,
  computeDeliveredScore, computeQualityScore, computeCollaborationScore,
  computeTeamAvgCollab, computeICI, getTier
} from '../lib/scoring';
import { detectCarryOver, detectRegressions, detectDateChanges } from '../lib/signals';
import { generateImprovements } from '../lib/improvements';
import { CACHE_TTL_MS, MIN_RESOLVED_ISSUES } from '../lib/constants';

export async function getTeamScores(
  boardId: number,
  boardName: string,
  sprintIds: number[],
  sprintNames: string[],
  issues: JiraIssue[],
  storyPointsField: string,
  authorizedApproverId: string,
  weights?: DimensionWeights,
  dateRange?: { startDate: string; endDate: string },
  boardType?: 'scrum' | 'kanban' | 'space' | string,
  evaluationPeriod?: string
): Promise<TeamScoreResult> {
  const weightsKey = weights ? `${weights.onTime}-${weights.delivered}-${weights.quality}-${weights.collaboration}` : 'default';
  const dateKey = dateRange ? `${dateRange.startDate}_${dateRange.endDate}` : 'all';
  const cacheKey = `scores-${boardId}-${[...sprintIds].sort().join('-')}-${dateKey}-${weightsKey}`;

  // Check cache
  try {
    const cached = await storage.get(cacheKey) as { data: TeamScoreResult; timestamp: number } | undefined;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  } catch {}

  // Get unique assignees
  const assigneeMap = new Map<string, { accountId: string; displayName: string; avatarUrl: string }>();
  issues.forEach(issue => {
    const a = issue.fields.assignee;
    if (a && !assigneeMap.has(a.accountId)) {
      assigneeMap.set(a.accountId, {
        accountId: a.accountId,
        displayName: a.displayName,
        avatarUrl: a.avatarUrls?.['48x48'] || '',
      });
    }
  });

  const allAccountIds = Array.from(assigneeMap.keys());

  // Pre-compute team averages
  const teamAvgPoints = computeTeamAvgPoints(issues, allAccountIds, storyPointsField);
  const teamAvgCollab = computeTeamAvgCollab(issues, allAccountIds);

  const scores: PersonScore[] = allAccountIds
    .map(accountId => {
      const person = assigneeMap.get(accountId)!;
      const personIssues = issues.filter(i => i.fields.assignee?.accountId === accountId);

      const onTimeResult = computeOnTimeScore(issues, accountId);
      const personPoints = computePersonPoints(issues, accountId, storyPointsField);
      const deliveredScore = computeDeliveredScore(personPoints, teamAvgPoints);
      const qualityResult = computeQualityScore(issues, accountId);
      const collabResult = computeCollaborationScore(issues, accountId, teamAvgCollab);

      const categories = {
        onTime: onTimeResult.score,
        delivered: deliveredScore,
        quality: qualityResult.score,
        collaboration: collabResult.score,
      };

      const ici = computeICI(categories, weights);
      const tier = getTier(ici);

      const carryOver = detectCarryOver(issues, accountId);
      const regression = detectRegressions(issues, accountId);
      const dateChanges = detectDateChanges(issues, accountId, authorizedApproverId);

      const improvements = generateImprovements(
        onTimeResult.score,
        onTimeResult.eligible > 0 ? onTimeResult.onTimeCount / onTimeResult.eligible : 0,
        onTimeResult.eligible,
        onTimeResult.lateKeys,
        regression.totalRegressions,
        regression.affectedIssues,
        carryOver.rate,
        [...carryOver.carriedOnce, ...carryOver.repeatedlyCarried],
        dateChanges,
        collabResult.score,
        collabResult.commentCount,
        teamAvgCollab
      );

      return {
        accountId,
        displayName: person.displayName,
        avatarUrl: person.avatarUrl,
        rank: 0, // set after sorting
        ici,
        tier,
        categories,
        rawData: {
          totalResolved: personIssues.length,
          onTimeCount: onTimeResult.onTimeCount,
          eligibleForOnTime: onTimeResult.eligible,
          storyPoints: personPoints,
          teamAvgPoints: Math.round(teamAvgPoints),
          qualityIncidents: qualityResult.incidents,
          collabComments: collabResult.commentCount,
          teamAvgCollab: Math.round(teamAvgCollab),
        },
        signals: { carryOver, regression, dateChanges },
        improvements,
        lateIssues: onTimeResult.lateKeys,
        reopenedIssues: qualityResult.reopenedKeys,
        regressedIssues: qualityResult.regressionKeys,
      } as PersonScore;
    })
    .sort((a, b) => b.ici - a.ici)
    .map((person, i) => ({ ...person, rank: i + 1 }));

  // Formulate clear evaluation period string
  let resolvedEvaluationPeriod = evaluationPeriod;
  if (!resolvedEvaluationPeriod) {
    if (sprintNames && sprintNames.length > 0) {
      resolvedEvaluationPeriod = sprintNames.length === 1
        ? sprintNames[0]
        : `${sprintNames[0]} – ${sprintNames[sprintNames.length - 1]}`;
    } else if (dateRange?.startDate && dateRange?.endDate) {
      resolvedEvaluationPeriod = `${dateRange.startDate} to ${dateRange.endDate}`;
    } else {
      resolvedEvaluationPeriod = 'Last 30 Days (Rolling)';
    }
  }

  const result: TeamScoreResult = {
    boardId,
    boardName,
    boardType,
    sprintIds,
    sprintNames,
    dateRange,
    evaluationPeriod: resolvedEvaluationPeriod,
    computedAt: new Date().toISOString(),
    scores,
    weights,
  };

  // Write to cache
  try {
    await storage.set(cacheKey, { data: result, timestamp: Date.now() });
  } catch {}

  return result;
}
