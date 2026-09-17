import { PersonScore, DimensionWeights } from '../types/scoring';
import { EpicSummary } from '../types/portfolio';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function downloadBlob(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Team Leaderboard & Individual Breakdown to CSV
 */
export function exportTeamScoresToCSV(
  scores: PersonScore[],
  boardName: string,
  weights?: DimensionWeights
) {
  const onTimeW = weights?.onTime ?? 35;
  const delivW = weights?.delivered ?? 25;
  const qualW = weights?.quality ?? 25;
  const collabW = weights?.collaboration ?? 15;

  const headers = [
    'Rank',
    'Engineer Name',
    'Performance Tier',
    'ICI Composite Score',
    `On-Time Score (${onTimeW}%)`,
    'On-Time Eligible Tasks',
    'On-Time Delivered Count',
    `Delivered Score (${delivW}%)`,
    'Story Points Delivered',
    'Total Resolved Issues',
    `Quality Index (${qualW}%)`,
    'Quality Incidents Count',
    'Reopened Issues Count',
    'Review Regressions Count',
    `Collaboration Score (${collabW}%)`,
    'Teammate Qualifying Comments',
    'Carry-Over Rate (%)',
    'Carry-Over Severity',
    'Review Regressions Severity',
    'Unauthorized Due Date Changes',
  ];

  const rows = scores.map(p => [
    p.rank,
    p.displayName,
    p.tier,
    p.ici,
    p.categories.onTime !== null ? `${p.categories.onTime}%` : 'Insufficient Data',
    p.rawData.eligibleForOnTime,
    p.rawData.onTimeCount,
    `${p.categories.delivered}%`,
    p.rawData.storyPoints,
    p.rawData.totalResolved,
    p.categories.quality,
    p.rawData.qualityIncidents,
    p.reopenedIssues.length,
    p.regressedIssues.reduce((sum, r) => sum + r.count, 0),
    `${p.categories.collaboration}%`,
    p.rawData.collabComments,
    `${p.signals.carryOver.rate}%`,
    p.signals.carryOver.rate > 40 ? 'High Risk' : p.signals.carryOver.rate > 20 ? 'Moderate' : 'Healthy',
    p.signals.regression.severity,
    p.signals.dateChanges.unauthorized.length,
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\r\n');

  const cleanBoardName = boardName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `DeliverIQ_Team_Delivery_${cleanBoardName}_${new Date().toISOString().substring(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
}

/**
 * Export Portfolio Epics & Milestones to CSV
 */
export function exportPortfolioEpicsToCSV(
  epics: EpicSummary[],
  filterName: string = 'Portfolio'
) {
  const headers = [
    'Epic Key',
    'Summary',
    'Project / Workstream',
    'Delivery Status',
    'Status Category',
    'Story Points Shipped',
    'Total Story Points',
    'Story Point Completion (%)',
    'Total Child Tasks',
    'Completed Tasks',
    'In Progress Tasks',
    'To Do Tasks',
    'Risk Level',
    'Risk Reasons',
    'Last Updated Date',
  ];

  const rows = epics.map(e => {
    const inProgressCount = e.childStatusCounts?.inProgress ?? 0;
    const toDoCount = e.childStatusCounts?.toDo ?? 0;

    return [
      e.key,
      e.summary,
      e.projectName,
      e.statusCategory === 'Done' ? 'Delivered' : e.spCompletionPercentage > 0 ? 'In Progress' : 'Planned',
      e.statusCategory,
      e.completedStoryPoints,
      e.totalStoryPoints,
      `${e.spCompletionPercentage}%`,
      e.totalChildIssues,
      e.completedChildIssues,
      inProgressCount,
      toDoCount,
      e.riskLevel,
      e.riskReasons.join('; ') || 'None',
      e.updatedAt ? e.updatedAt.substring(0, 10) : '',
    ];
  });

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\r\n');

  const cleanFilter = filterName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Portfolio_Epics_${cleanFilter}_${new Date().toISOString().substring(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
}
