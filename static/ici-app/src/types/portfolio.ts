export type RiskLevel = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';

export interface ChildStatusCounts {
  toDo: number;
  inProgress: number;
  done: number;
  blocked: number;
}

export interface EpicChildIssueDetail {
  key: string;
  summary: string;
  status: string;
  statusCategory: 'To Do' | 'In Progress' | 'Done';
  issueType: string;
  storyPoints: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  sprintName?: string;
  teamOrProject: string;
}

export interface EpicSummary {
  key: string;
  summary: string;
  projectKey: string;
  projectName: string;
  status: string;
  statusCategory: 'To Do' | 'In Progress' | 'Done';
  assignee?: {
    displayName: string;
    avatarUrl?: string;
  };
  totalChildIssues: number;
  completedChildIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  completionPercentage: number;
  spCompletionPercentage: number;
  childStatusCounts: ChildStatusCounts;
  teamsInvolved: string[];
  riskLevel: RiskLevel;
  riskReasons: string[];
  updatedAt: string;
  createdAt?: string;
  labels?: string[];
  dueDate?: string;
  childIssues?: EpicChildIssueDetail[];
}

export interface TeamGroup {
  id: string;
  name: string;
  boardIds: number[];
  projectKeys: string[];
  description?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface TeamIterationSummary {
  boardId: number;
  boardName: string;
  projectKey?: string;
  sprintId?: number;
  sprintName?: string;
  sprintState?: 'active' | 'future' | 'closed' | 'none';
  startDate?: string;
  endDate?: string;
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  blockedIssues: number;
  toDoIssues: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  inProgressStoryPoints: number;
  completionPercentage: number;
  health: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'NO_ACTIVE_SPRINT';
}

export interface AllocationCategory {
  count: number;
  points: number;
  percentage: number;
}

export interface WorkAllocationBreakdown {
  totalIssues: number;
  totalPoints: number;
  features: AllocationCategory;
  techDebt: AllocationCategory;
  bugs: AllocationCategory;
  maintenance: AllocationCategory;
}

export interface DependencyBlocker {
  epicKey: string;
  epicSummary: string;
  blockedIssueKey: string;
  blockedIssueSummary: string;
  blockedStatus: string;
  assigneeName?: string;
  teamName?: string;
  blockReason?: string;
}

export interface AIExecutiveBriefing {
  overallHealth: 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK';
  summaryNarrative: string;
  keyHighlights: string[];
  topRisks: string[];
  actionItems: string[];
  generatedAt: string;
}

export interface PortfolioDataResult {
  epics: EpicSummary[];
  overallProgress: {
    totalEpics: number;
    completedEpics: number;
    epicCompletionPercentage: number;
    totalChildIssues: number;
    completedChildIssues: number;
    issueCompletionPercentage: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    spCompletionPercentage: number;
  };
  workAllocation: WorkAllocationBreakdown;
  dependencies: DependencyBlocker[];
  teamIterations: TeamIterationSummary[];
  aiBriefing: AIExecutiveBriefing;
}

export interface ARTSyncTask {
  epicKey: string;
  epicSummary: string;
  taskKey: string;
  taskSummary: string;
  acceptanceCriteria: string;
  status: string;
  statusCategory: 'To Do' | 'In Progress' | 'Done';
  teamName: string;
  storyPoints: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  fiscalYear?: string;
  quarter?: string;
  iterationName?: string;
  sprintState?: string;
}

export interface FeatureItem {
  key: string;
  summary: string;
  projectName?: string;
  taskCount?: number;
  storyPoints?: number;
}

export interface RiskItem {
  issueKey: string;
  summary: string;
  issueType: string;
  status: string;
  teamName?: string;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal?: number;
}

export interface IterationPerformancePoint {
  iteration: string;
  performance: number;
}

export interface VelocityTrendPoint {
  iteration: string;
  committed: number;
  completed: number;
}

export interface TeamPerformanceItem {
  code: string;
  name: string;
  performance: number;
}

export interface ARTSyncData {
  teamName: string;
  fiscalYear: string;
  quarter: string;
  iteration: string;
  sprintState: string;
  epicsCommitted: number;
  tasksCommitted: number;
  tasksCompleted: number;
  iterationPerformance: number;
  storyPointsCommitted: number;
  storyPointsCompleted: number;
  iterationObjective: string;
  tasks: ARTSyncTask[];
  allTeams: string[];
  features?: FeatureItem[];
  selectedFeatureKey?: string;
  riskRegister?: RiskItem[];
  burndownData?: BurndownPoint[];
  iterationPerformanceHistory?: IterationPerformancePoint[];
  velocityTrend?: VelocityTrendPoint[];
  teamPerformanceList?: TeamPerformanceItem[];
  emptyReason?: string;
  isSampleData?: boolean;
}

