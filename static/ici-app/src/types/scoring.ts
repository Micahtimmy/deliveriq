export interface CategoryScores {
  onTime: number | null;        // null = insufficient data
  delivered: number;
  quality: number;
  collaboration: number;
}

export interface CarryOverSignal {
  totalCarried: number;
  totalResolved: number;
  rate: number;
  carriedOnce: string[];        // issue keys
  repeatedlyCarried: string[];  // issue keys — 2+ sprints
}

export interface RegressionSignal {
  totalRegressions: number;
  affectedIssues: Array<{ key: string; count: number }>;
  severity: 'Clean' | 'Occasional' | 'Elevated' | 'Recurring';
}

export interface DateChangeSignal {
  unauthorized: Array<{
    key: string;
    from: string;
    to: string;
    changedOn: string;
  }>;
  authorized: number;
  unknown: number;
}

export interface ImprovementAction {
  category: string;
  observation: string;
  action: string;
  issueKeys: string[];
}

export type PerformanceTier =
  | 'Strong Contributor'
  | 'On Track'
  | 'Below Target'
  | 'Needs Attention';

export interface PersonScore {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  rank: number;
  ici: number;
  tier: PerformanceTier;
  categories: CategoryScores;
  rawData: {
    totalResolved: number;
    onTimeCount: number;
    eligibleForOnTime: number;
    storyPoints: number;
    teamAvgPoints: number;
    qualityIncidents: number;
    collabComments: number;
    teamAvgCollab: number;
  };
  signals: {
    carryOver: CarryOverSignal;
    regression: RegressionSignal;
    dateChanges: DateChangeSignal;
  };
  improvements: ImprovementAction[];
  lateIssues: string[];
  reopenedIssues: string[];
  regressedIssues: Array<{ key: string; count: number }>;
}

export interface TeamScoreResult {
  boardName: string;
  sprintNames: string[];
  computedAt: string;
  scores: PersonScore[];
}
