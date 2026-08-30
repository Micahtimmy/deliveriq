import {
  EpicSummary,
  ChildStatusCounts,
  RiskLevel,
  PortfolioDataResult,
  WorkAllocationBreakdown,
  DependencyBlocker,
  AIExecutiveBriefing
} from '../types/portfolio';

/**
 * Calculates child issue metrics and risk score for a single Epic.
 */
export function processEpicSummary(
  epicIssue: {
    key: string;
    fields: {
      summary: string;
      project?: { key: string; name: string };
      status?: { name: string; statusCategory?: { key: string; name: string } };
      assignee?: { displayName: string; avatarUrls?: Record<string, string> };
      updated?: string;
      created?: string;
      labels?: string[];
      duedate?: string;
    };
  },
  childIssues: Array<{
    key: string;
    fields: {
      summary: string;
      status?: { name: string; statusCategory?: { key: string; name: string } };
      customfield_10016?: number; // Story points default fallback
      issuetype?: { name: string };
      labels?: string[];
      components?: Array<{ name: string }>;
      assignee?: { displayName: string };
    };
  }>,
  storyPointsFieldKey: string = 'customfield_10016'
): EpicSummary {
  let totalChildIssues = childIssues.length;
  let completedChildIssues = 0;
  let totalStoryPoints = 0;
  let completedStoryPoints = 0;

  const childStatusCounts: ChildStatusCounts = {
    toDo: 0,
    inProgress: 0,
    done: 0,
    blocked: 0,
  };

  const teamsSet = new Set<string>();
  if (epicIssue.fields.project?.name) {
    teamsSet.add(epicIssue.fields.project.name);
  }

  for (const child of childIssues) {
    const statusName = child.fields.status?.name || '';
    const categoryKey = child.fields.status?.statusCategory?.key || '';
    
    // Extract story points dynamically
    const fieldsRecord = child.fields as unknown as Record<string, unknown>;
    const spVal = Number(fieldsRecord[storyPointsFieldKey] || child.fields.customfield_10016 || 0);
    const points = isNaN(spVal) ? 0 : spVal;

    totalStoryPoints += points;

    if (categoryKey === 'done' || statusName.toLowerCase() === 'closed' || statusName.toLowerCase() === 'resolved') {
      completedChildIssues++;
      completedStoryPoints += points;
      childStatusCounts.done++;
    } else if (statusName.toLowerCase().includes('block')) {
      childStatusCounts.blocked++;
    } else if (categoryKey === 'indeterminate' || statusName.toLowerCase().includes('progress') || statusName.toLowerCase().includes('review')) {
      childStatusCounts.inProgress++;
    } else {
      childStatusCounts.toDo++;
    }

    if (child.fields.components && child.fields.components.length > 0) {
      child.fields.components.forEach(c => teamsSet.add(c.name));
    }
  }

  const completionPercentage = totalChildIssues > 0
    ? Math.round((completedChildIssues / totalChildIssues) * 100)
    : 0;

  const spCompletionPercentage = totalStoryPoints > 0
    ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
    : completionPercentage;

  // Determine Risk Level
  const riskReasons: string[] = [];
  let riskLevel: RiskLevel = 'ON_TRACK';

  const overdueChildTasks = childIssues.filter(c => {
    const fields = c.fields as unknown as { duedate?: string; status?: { statusCategory?: { key: string } } };
    if (!fields.duedate || fields.status?.statusCategory?.key === 'done') return false;
    const today = new Date().toISOString().substring(0, 10);
    return fields.duedate < today;
  });

  if (childStatusCounts.blocked > 0) {
    riskReasons.push(`${childStatusCounts.blocked} child task(s) explicitly blocked`);
    riskLevel = 'AT_RISK';
  }

  if (overdueChildTasks.length > 0) {
    riskReasons.push(`${overdueChildTasks.length} child task(s) overdue beyond target due date`);
    riskLevel = 'AT_RISK';
  }

  if (spCompletionPercentage < 40 && totalChildIssues > 5) {
    riskReasons.push('Less than 40% Story Points completed despite high issue count');
    if (riskLevel === 'AT_RISK') riskLevel = 'CRITICAL';
    else riskLevel = 'AT_RISK';
  }

  if (childStatusCounts.inProgress > childStatusCounts.done && totalChildIssues > 8) {
    riskReasons.push('WIP spillover: More items in progress than completed');
    if (riskLevel === 'AT_RISK') riskLevel = 'CRITICAL';
    else riskLevel = 'AT_RISK';
  }

  const categoryName = epicIssue.fields.status?.statusCategory?.name || '';
  const epicCategoryKey = categoryName.toLowerCase().includes('done') ? 'Done' :
    categoryName.toLowerCase().includes('progress') ? 'In Progress' : 'To Do';

  return {
    key: epicIssue.key,
    summary: epicIssue.fields.summary,
    projectKey: epicIssue.fields.project?.key || '',
    projectName: epicIssue.fields.project?.name || 'Default Project',
    status: epicIssue.fields.status?.name || 'To Do',
    statusCategory: epicCategoryKey,
    assignee: epicIssue.fields.assignee ? {
      displayName: epicIssue.fields.assignee.displayName,
      avatarUrl: epicIssue.fields.assignee.avatarUrls?.['48x48'] || ''
    } : undefined,
    totalChildIssues,
    completedChildIssues,
    totalStoryPoints,
    completedStoryPoints,
    completionPercentage,
    spCompletionPercentage,
    childStatusCounts,
    teamsInvolved: Array.from(teamsSet),
    riskLevel,
    riskReasons,
    updatedAt: epicIssue.fields.updated || new Date().toISOString(),
    createdAt: epicIssue.fields.created || new Date().toISOString(),
    labels: epicIssue.fields.labels || [],
    dueDate: epicIssue.fields.duedate
  };
}

/**
 * Aggregates all Epics into overall portfolio metrics.
 */
export function calculatePortfolioOverall(epics: EpicSummary[]) {
  const totalEpics = epics.length;
  const completedEpics = epics.filter(e => e.statusCategory === 'Done').length;
  const epicCompletionPercentage = totalEpics > 0 ? Math.round((completedEpics / totalEpics) * 100) : 0;

  let totalChildIssues = 0;
  let completedChildIssues = 0;
  let totalStoryPoints = 0;
  let completedStoryPoints = 0;

  epics.forEach(e => {
    totalChildIssues += e.totalChildIssues;
    completedChildIssues += e.completedChildIssues;
    totalStoryPoints += e.totalStoryPoints;
    completedStoryPoints += e.completedStoryPoints;
  });

  const issueCompletionPercentage = totalChildIssues > 0
    ? Math.round((completedChildIssues / totalChildIssues) * 100)
    : 0;

  const spCompletionPercentage = totalStoryPoints > 0
    ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
    : issueCompletionPercentage;

  return {
    totalEpics,
    completedEpics,
    epicCompletionPercentage,
    totalChildIssues,
    completedChildIssues,
    issueCompletionPercentage,
    totalStoryPoints,
    completedStoryPoints,
    spCompletionPercentage
  };
}

/**
 * Calculates Work Allocation breakdown (Features vs Debt vs Bugs vs Maintenance).
 */
export function calculateWorkAllocation(
  childIssues: Array<{
    fields: {
      issuetype?: { name: string };
      labels?: string[];
      components?: Array<{ name: string }>;
      customfield_10016?: number;
    };
  }>,
  storyPointsFieldKey: string = 'customfield_10016'
): WorkAllocationBreakdown {
  const result: WorkAllocationBreakdown = {
    totalIssues: childIssues.length,
    totalPoints: 0,
    features: { count: 0, points: 0, percentage: 0 },
    techDebt: { count: 0, points: 0, percentage: 0 },
    bugs: { count: 0, points: 0, percentage: 0 },
    maintenance: { count: 0, points: 0, percentage: 0 },
  };

  childIssues.forEach(issue => {
    const fieldsRecord = issue.fields as unknown as Record<string, unknown>;
    const spVal = Number(fieldsRecord[storyPointsFieldKey] || issue.fields.customfield_10016 || 0);
    const points = isNaN(spVal) ? 0 : spVal;
    result.totalPoints += points;

    const issueTypeName = (issue.fields.issuetype?.name || '').toLowerCase();
    const labels = (issue.fields.labels || []).map(l => l.toLowerCase());

    const isBug = issueTypeName.includes('bug') || labels.includes('bug') || labels.includes('defect');
    const isDebt = labels.includes('tech-debt') || labels.includes('refactor') || labels.includes('debt') || issueTypeName.includes('debt');
    const isMaint = labels.includes('ops') || labels.includes('maintenance') || labels.includes('chore');

    if (isBug) {
      result.bugs.count++;
      result.bugs.points += points;
    } else if (isDebt) {
      result.techDebt.count++;
      result.techDebt.points += points;
    } else if (isMaint) {
      result.maintenance.count++;
      result.maintenance.points += points;
    } else {
      result.features.count++;
      result.features.points += points;
    }
  });

  const totalPts = result.totalPoints > 0 ? result.totalPoints : result.totalIssues;

  if (totalPts > 0) {
    const ptsOrCount = (cat: { count: number; points: number }) => result.totalPoints > 0 ? cat.points : cat.count;
    result.features.percentage = Math.round((ptsOrCount(result.features) / totalPts) * 100);
    result.techDebt.percentage = Math.round((ptsOrCount(result.techDebt) / totalPts) * 100);
    result.bugs.percentage = Math.round((ptsOrCount(result.bugs) / totalPts) * 100);
    result.maintenance.percentage = Math.round((ptsOrCount(result.maintenance) / totalPts) * 100);
  }

  return result;
}

/**
 * Generates an automated AI Executive Digest based on portfolio data.
 */
export function generateAIBriefing(data: PortfolioDataResult): AIExecutiveBriefing {
  const { epics, overallProgress, workAllocation } = data;
  const criticalEpics = epics.filter(e => e.riskLevel === 'CRITICAL');
  const atRiskEpics = epics.filter(e => e.riskLevel === 'AT_RISK');

  let overallHealth: 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK' = 'HEALTHY';
  if (criticalEpics.length > 0 || overallProgress.spCompletionPercentage < 50) {
    overallHealth = 'AT_RISK';
  } else if (atRiskEpics.length > 0 || workAllocation.bugs.percentage > 35) {
    overallHealth = 'NEEDS_ATTENTION';
  }

  const keyHighlights: string[] = [
    `Overall Epic completion rate across selected teams stands at ${overallProgress.epicCompletionPercentage}% (${overallProgress.completedEpics}/${overallProgress.totalEpics} Epics Done).`,
    `${overallProgress.spCompletionPercentage}% of total Story Points (${overallProgress.completedStoryPoints}/${overallProgress.totalStoryPoints} SP) have been delivered.`,
    `Investment Distribution: ${workAllocation.features.percentage}% Features, ${workAllocation.bugs.percentage}% Bugs, ${workAllocation.techDebt.percentage}% Tech Debt, ${workAllocation.maintenance.percentage}% Maintenance.`
  ];

  const topRisks: string[] = [];
  if (criticalEpics.length > 0) {
    topRisks.push(`Critical delays on ${criticalEpics.length} Epic(s): ${criticalEpics.map(e => e.key).join(', ')}.`);
  }
  if (workAllocation.bugs.percentage > 30) {
    topRisks.push(`High bug allocation (${workAllocation.bugs.percentage}% of effort), indicating quality friction.`);
  }
  if (topRisks.length === 0) {
    topRisks.push('No immediate critical risks identified across active Epics.');
  }

  const actionItems: string[] = [];
  if (criticalEpics.length > 0) {
    actionItems.push(`Conduct immediate triage on critical Epics: ${criticalEpics.map(e => e.summary).slice(0, 2).join('; ')}.`);
  }
  if (workAllocation.techDebt.percentage < 10) {
    actionItems.push('Tech Debt allocation is below 10%. Consider scheduling refactoring sprints to prevent future velocity drops.');
  }
  if (actionItems.length === 0) {
    actionItems.push('Maintain current team velocity and monitor cross-team dependencies in sprint reviews.');
  }

  const summaryNarrative = `Across ${epics.length} active Epics, teams have completed ${overallProgress.spCompletionPercentage}% of total planned Story Points. ` +
    (overallHealth === 'HEALTHY'
      ? 'Execution velocity is steady and aligned with release commitments.'
      : `Portfolio status is currently marked as ${overallHealth.replace('_', ' ')} due to bottlenecks in ${atRiskEpics.length + criticalEpics.length} Epic(s).`);

  return {
    overallHealth,
    summaryNarrative,
    keyHighlights,
    topRisks,
    actionItems,
    generatedAt: new Date().toISOString()
  };
}
