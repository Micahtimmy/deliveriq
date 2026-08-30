import { ImprovementAction, PersonScore } from '../types/scoring';

export function generateImprovements(
  onTimeScore: number | null,
  onTimeRate: number,
  eligibleForOnTime: number,
  lateKeys: string[],
  regressionCount: number,
  regressionKeys: Array<{ key: string; count: number }>,
  carryOverRate: number,
  carriedKeys: string[],
  dateChanges: PersonScore['signals']['dateChanges'],
  collabScore: number,
  collabCount: number,
  teamAvgCollab: number
): ImprovementAction[] {
  const actions: ImprovementAction[] = [];

  if (onTimeScore !== null && onTimeScore < 80 && lateKeys.length > 0) {
    actions.push({
      category: 'On-Time Delivery',
      observation: `${lateKeys.length} of ${eligibleForOnTime} due-dated tasks were delivered late.`,
      action: 'At sprint planning, flag any task over 5 story points for splitting before committing to a due date. Raise blockers in standup within 24 hours of identifying them rather than carrying them silently.',
      issueKeys: lateKeys,
    });
  }

  if (regressionCount >= 3 && regressionKeys.length > 0) {
    const worstKey = [...regressionKeys].sort((a, b) => b.count - a.count)[0];
    actions.push({
      category: 'Quality — Review Readiness',
      observation: `${regressionCount} review regressions across ${regressionKeys.length} tasks. ${worstKey.key} regressed ${worstKey.count} time(s).`,
      action: 'Before moving any task to In Review, verify it against the team definition-of-done checklist. For tasks that regressed multiple times, schedule a quick alignment call with the reviewer on acceptance criteria before resubmitting.',
      issueKeys: regressionKeys.map(r => r.key),
    });
  }

  if (carryOverRate > 40 && carriedKeys.length > 0) {
    actions.push({
      category: 'Sprint Commitment',
      observation: `${carryOverRate}% of tasks carried past their committed sprint.`,
      action: 'At sprint planning, only commit to tasks that can be completed end-to-end within the sprint. Any task blocked for more than one day should be flagged in standup immediately rather than waiting for it to carry over.',
      issueKeys: carriedKeys,
    });
  }

  if (dateChanges.unauthorized.length > 0) {
    actions.push({
      category: 'Due Date Policy',
      observation: `${dateChanges.unauthorized.length} due date change(s) were made by the assignee without PM authorization.`,
      action: 'Due dates are set by the PM and represent team commitments. If a due date needs to move, add a Jira comment tagging the PM to request approval before changing the field. Unauthorized changes are tracked.',
      issueKeys: dateChanges.unauthorized.map(d => d.key),
    });
  }

  if (collabScore < 60 && teamAvgCollab > 0) {
    actions.push({
      category: 'Collaboration',
      observation: `${collabCount} qualifying comments on colleagues' tasks vs team average of ${Math.round(teamAvgCollab)}.`,
      action: 'Aim to leave at least one substantive comment per sprint on a blocked or in-review task belonging to a colleague. This does not mean more meetings — it means engaging with 1–2 issues outside your own queue each sprint.',
      issueKeys: [],
    });
  }

  if (actions.length === 0) {
    actions.push({
      category: 'All Areas',
      observation: 'No specific gaps identified this period.',
      action: 'Strong delivery across all measured dimensions. Continue current habits.',
      issueKeys: [],
    });
  }

  return actions;
}
