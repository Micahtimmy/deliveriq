import { TeamScoreResult } from '../types/scoring';
import { JiraBoard, JiraSprint } from '../types/jira';
import { EpicSummary, TeamGroup } from '../types/portfolio';
import { getCacheKey, getClientCache, setClientCache, invalidateClientCache } from './cache';

// Detect if running in a standalone browser window (outside Forge iframe)
const isStandalone = typeof window !== 'undefined' && (window.parent === window || !('__forge_bridge__' in window));

const CACHEABLE_COMMANDS = new Set([
  'getBoards',
  'getSprints',
  'getSettings',
  'getSavedTeamGroups',
  'getPortfolioData',
  'getARTSyncData',
  'getTeamScores',
]);

export async function safeInvoke<T = unknown>(
  command: string,
  payload?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const forceRefresh = Boolean(payload?.forceRefresh);
  const cacheKey = getCacheKey(command, payload);

  // Invalidate on mutations
  if (command === 'saveTeamGroup' || command === 'deleteTeamGroup') {
    invalidateClientCache('getSavedTeamGroups');
    invalidateClientCache('getPortfolioData');
  } else if (command === 'saveSettings') {
    invalidateClientCache('getSettings');
  } else if (command === 'clearCache') {
    invalidateClientCache();
  }

  // Check client cache if cacheable and not forceRefresh
  if (!forceRefresh && CACHEABLE_COMMANDS.has(command)) {
    const cachedData = getClientCache<T>(cacheKey);
    if (cachedData !== null) {
      return { success: true, data: cachedData };
    }
  }

  let response: { success: boolean; data?: T; error?: string };

  if (isStandalone) {
    response = mockInvoke(command, payload) as { success: boolean; data?: T; error?: string };
  } else {
    try {
      const { invoke: forgeInvoke } = await import('@forge/bridge');
      const result = await forgeInvoke<T>(command, payload);
      response = result as { success: boolean; data?: T; error?: string };
    } catch (e) {
      console.warn(`[Forge Bridge Error] Falling back to mock for '${command}':`, e);
      response = mockInvoke(command, payload) as { success: boolean; data?: T; error?: string };
    }
  }

  // Cache successful responses for cacheable queries
  if (response.success && response.data !== undefined && CACHEABLE_COMMANDS.has(command)) {
    setClientCache(cacheKey, response.data);
  }

  return response;
}


// In-memory mock storage for standalone dev/demo
let mockSavedTeamGroups: TeamGroup[] = [
  {
    id: 'preset-core-squad',
    name: 'Core Platform Squad',
    description: 'Core Engineering & Infrastructure Boards',
    boardIds: [101, 104],
    projectKeys: ['CORE'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-mobile-squad',
    name: 'Mobile & Frontline Squad',
    description: 'Mobile App Revamp and Cross-Platform Experience',
    boardIds: [102],
    projectKeys: ['MOB'],
    createdAt: new Date().toISOString(),
  },
];

let mockSettings = {
  authorizedApproverId: 'Sarah Chen (Lead Engineer)',
  storyPointsField: 'customfield_10016',
  weights: {
    onTime: 35,
    delivered: 25,
    quality: 25,
    collaboration: 15,
  },
};

function mockInvoke(command: string, payload?: Record<string, unknown>): { success: boolean; data?: unknown; error?: string } {
  switch (command) {
    case 'getBoards':
      return {
        success: true,
        data: {
          boards: [
            { id: 101, name: 'Core Engineering Board', type: 'scrum', location: { projectKey: 'CORE', projectName: 'Core Platform' } },
            { id: 104, name: 'Core Infrastructure Board', type: 'kanban', location: { projectKey: 'CORE', projectName: 'Core Platform' } },
            { id: 102, name: 'Mobile App Revamp Board', type: 'scrum', location: { projectKey: 'MOB', projectName: 'Mobile App' } },
            { id: 103, name: 'Platform API & Cloud Board', type: 'kanban', location: { projectKey: 'PLAT', projectName: 'Platform API & Security' } },
            { id: 105, name: 'Data Pipeline & AI Board', type: 'scrum', location: { projectKey: 'DATA', projectName: 'Data & Analytics' } },
          ] as JiraBoard[],
          storyPointsField: 'customfield_10016',
        },
      };

    case 'getSprints':
      return {
        success: true,
        data: [
          { id: 501, name: 'Sprint 43 — Core Platform', state: 'closed', startDate: '2026-07-01', endDate: '2026-07-14' },
          { id: 502, name: 'Sprint 42 — API Refactor', state: 'closed', startDate: '2026-06-15', endDate: '2026-06-30' },
          { id: 503, name: 'Sprint 41 — Microservices Migration', state: 'closed', startDate: '2026-06-01', endDate: '2026-06-14' },
        ] as JiraSprint[],
      };

    case 'getTeamScores': {
      const mockResult: TeamScoreResult = {
        boardName: (payload?.boardName as string) || 'Core Engineering Board',
        sprintNames: (payload?.sprintNames as string[]) || ['Sprint 41', 'Sprint 42', 'Sprint 43'],
        computedAt: new Date().toISOString(),
        scores: [
          {
            accountId: 'usr-1',
            displayName: 'Sarah Chen (Lead Engineer)',
            avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png',
            rank: 1,
            ici: 96,
            tier: 'Strong Contributor',
            categories: { onTime: 92, delivered: 115, quality: 85, collaboration: 105 },
            rawData: {
              totalResolved: 14,
              onTimeCount: 11,
              eligibleForOnTime: 12,
              storyPoints: 42,
              teamAvgPoints: 32,
              qualityIncidents: 1,
              collabComments: 18,
              teamAvgCollab: 12,
            },
            signals: {
              carryOver: { totalCarried: 1, totalResolved: 14, rate: 7, carriedOnce: ['ENG-402'], repeatedlyCarried: [] },
              regression: { totalRegressions: 0, affectedIssues: [], severity: 'Clean' },
              dateChanges: { unauthorized: [], authorized: 2, unknown: 0 },
            },
            improvements: [
              {
                category: 'All Areas',
                observation: 'No specific gaps identified this period.',
                action: 'Strong delivery across all measured dimensions. Continue current habits.',
                issueKeys: [],
              },
            ],
            lateIssues: ['ENG-410'],
            reopenedIssues: [],
            regressedIssues: [],
          },
          {
            accountId: 'usr-2',
            displayName: 'Alex Rivera (Backend Dev)',
            avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png',
            rank: 2,
            ici: 88,
            tier: 'On Track',
            categories: { onTime: 85, delivered: 100, quality: 85, collaboration: 90 },
            rawData: {
              totalResolved: 11,
              onTimeCount: 8,
              eligibleForOnTime: 9,
              storyPoints: 32,
              teamAvgPoints: 32,
              qualityIncidents: 2,
              collabComments: 11,
              teamAvgCollab: 12,
            },
            signals: {
              carryOver: { totalCarried: 2, totalResolved: 11, rate: 18, carriedOnce: ['ENG-388', 'ENG-394'], repeatedlyCarried: [] },
              regression: { totalRegressions: 1, affectedIssues: [{ key: 'ENG-388', count: 1 }], severity: 'Occasional' },
              dateChanges: { unauthorized: [], authorized: 1, unknown: 0 },
            },
            improvements: [
              {
                category: 'Quality — Review Readiness',
                observation: '1 review regression event on task ENG-388.',
                action: 'Verify code against definition-of-done checklist before submitting for peer review.',
                issueKeys: ['ENG-388'],
              },
            ],
            lateIssues: ['ENG-399'],
            reopenedIssues: ['ENG-388'],
            regressedIssues: [{ key: 'ENG-388', count: 1 }],
          },
          {
            accountId: 'usr-3',
            displayName: 'Marcus Vance (Fullstack)',
            avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png',
            rank: 3,
            ici: 78,
            tier: 'On Track',
            categories: { onTime: 75, delivered: 88, quality: 70, collaboration: 80 },
            rawData: {
              totalResolved: 9,
              onTimeCount: 6,
              eligibleForOnTime: 8,
              storyPoints: 28,
              teamAvgPoints: 32,
              qualityIncidents: 4,
              collabComments: 9,
              teamAvgCollab: 12,
            },
            signals: {
              carryOver: { totalCarried: 4, totalResolved: 9, rate: 44, carriedOnce: ['ENG-310', 'ENG-315'], repeatedlyCarried: ['ENG-320'] },
              regression: { totalRegressions: 3, affectedIssues: [{ key: 'ENG-320', count: 3 }], severity: 'Elevated' },
              dateChanges: { unauthorized: [{ key: 'ENG-315', from: '2026-06-10', to: '2026-06-18', changedOn: '2026-06-11' }], authorized: 0, unknown: 0 },
            },
            improvements: [
              {
                category: 'Sprint Commitment',
                observation: '44% of tasks carried past committed sprint (ENG-320 carried repeatedly).',
                action: 'Flag task blockers in standup within 24 hours rather than letting work carry over silently.',
                issueKeys: ['ENG-320', 'ENG-315'],
              },
              {
                category: 'Due Date Policy',
                observation: '1 unauthorized due date change on ENG-315 without PM approval.',
                action: 'Tag PM in Jira comment to request due date changes.',
                issueKeys: ['ENG-315'],
              },
            ],
            lateIssues: ['ENG-310', 'ENG-320'],
            reopenedIssues: ['ENG-315', 'ENG-320'],
            regressedIssues: [{ key: 'ENG-320', count: 3 }],
          },
          {
            accountId: 'usr-4',
            displayName: 'Elena Rostova (Frontend Engineer)',
            avatarUrl: 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png',
            rank: 4,
            ici: 64,
            tier: 'Below Target',
            categories: { onTime: 55, delivered: 75, quality: 70, collaboration: 50 },
            rawData: {
              totalResolved: 7,
              onTimeCount: 4,
              eligibleForOnTime: 7,
              storyPoints: 24,
              teamAvgPoints: 32,
              qualityIncidents: 4,
              collabComments: 4,
              teamAvgCollab: 12,
            },
            signals: {
              carryOver: { totalCarried: 3, totalResolved: 7, rate: 42, carriedOnce: ['ENG-299'], repeatedlyCarried: ['ENG-305'] },
              regression: { totalRegressions: 2, affectedIssues: [{ key: 'ENG-305', count: 2 }], severity: 'Occasional' },
              dateChanges: { unauthorized: [], authorized: 0, unknown: 1 },
            },
            improvements: [
              {
                category: 'On-Time Delivery',
                observation: '3 of 7 tasks delivered late.',
                action: 'Split tasks larger than 5 story points before committing to a sprint due date.',
                issueKeys: ['ENG-299', 'ENG-305', 'ENG-312'],
              },
              {
                category: 'Collaboration',
                observation: '4 qualifying comments on colleagues tasks vs team average of 12.',
                action: 'Aim to review and leave substantive feedback on 1-2 peer pull requests per sprint.',
                issueKeys: [],
              },
            ],
            lateIssues: ['ENG-299', 'ENG-305', 'ENG-312'],
            reopenedIssues: ['ENG-305'],
            regressedIssues: [{ key: 'ENG-305', count: 2 }],
          },
        ],
      };

      return { success: true, data: mockResult };
    }

    case 'getPortfolioData': {
      const selectedBoardIds = (payload?.boardIds as number[]) || [];
      const selectedProjectKeys = (payload?.projectKeys as string[]) || [];
      const selectedLabels = (payload?.labels as string[]) || [];
      const dateRange = (payload?.dateRange as string) || 'all';

      const allEpics: EpicSummary[] = [
        {
          key: 'CORE-101',
          summary: 'Next-Gen Microservices Migration',
          projectKey: 'CORE',
          projectName: 'Core Engineering',
          status: 'In Progress',
          statusCategory: 'In Progress',

          totalChildIssues: 8,
          completedChildIssues: 6,
          totalStoryPoints: 48,
          completedStoryPoints: 38,
          completionPercentage: 75,
          spCompletionPercentage: 79,
          riskLevel: 'ON_TRACK' as const,
          riskReasons: ['Progression on schedule'],
          childStatusCounts: { done: 6, inProgress: 2, toDo: 0, blocked: 0 },
          teamsInvolved: ['Core Engineering'],
          updatedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
          labels: ['q3-roadmap', 'architecture', 'backend'],
          dueDate: '2026-09-30',
          childIssues: [
            { key: 'CORE-102', summary: 'Containerize auth service', status: 'Done', statusCategory: 'Done' as const, issueType: 'Task', storyPoints: 8, assigneeName: 'Sarah Chen', sprintName: 'Sprint 43 — Core Platform', teamOrProject: 'Core Engineering' },
            { key: 'CORE-105', summary: 'gRPC endpoints setup', status: 'Done', statusCategory: 'Done' as const, issueType: 'Sub-task', storyPoints: 5, assigneeName: 'Alex Rivera', sprintName: 'Sprint 43 — Core Platform', teamOrProject: 'Core Engineering' },
            { key: 'CORE-108', summary: 'API gateway routing migration', status: 'In Progress', statusCategory: 'In Progress' as const, issueType: 'Story', storyPoints: 10, assigneeName: 'Marcus Vance', sprintName: 'Sprint 43 — Core Platform', teamOrProject: 'Core Engineering' },
            { key: 'CORE-112', summary: 'Database read-replica clustering', status: 'Done', statusCategory: 'Done' as const, issueType: 'Task', storyPoints: 13, assigneeName: 'Sarah Chen', sprintName: 'Sprint 42 — API Refactor', teamOrProject: 'Core Engineering' },
          ]
        },
        {
          key: 'MOB-204',
          summary: 'iOS/Android Biometric Auth Rollout',
          projectKey: 'MOB',
          projectName: 'Mobile App',
          status: 'In Progress',
          statusCategory: 'In Progress' as const,
          totalChildIssues: 6,
          completedChildIssues: 3,
          totalStoryPoints: 36,
          completedStoryPoints: 16,
          completionPercentage: 50,
          spCompletionPercentage: 45,
          riskLevel: 'AT_RISK' as const,
          riskReasons: ['Dependency bottleneck in Auth API endpoint'],
          childStatusCounts: { done: 3, inProgress: 2, toDo: 0, blocked: 1 },
          teamsInvolved: ['Mobile Team'],
          updatedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 days ago
          labels: ['mobile', 'security', 'q3-roadmap'],
          dueDate: '2026-10-15',
          childIssues: [
            { key: 'MOB-210', summary: 'Biometric SDK wrapper integration', status: 'Blocked', statusCategory: 'In Progress' as const, issueType: 'Story', storyPoints: 8, assigneeName: 'Elena Rostova', sprintName: 'Sprint 14 — Mobile Biometrics', teamOrProject: 'Mobile App' },
            { key: 'MOB-211', summary: 'FaceID fallback passcode UI', status: 'Done', statusCategory: 'Done' as const, issueType: 'Task', storyPoints: 5, assigneeName: 'Elena Rostova', sprintName: 'Sprint 14 — Mobile Biometrics', teamOrProject: 'Mobile App' },
            { key: 'MOB-215', summary: 'Keychain encryption store', status: 'In Progress', statusCategory: 'In Progress' as const, issueType: 'Story', storyPoints: 13, assigneeName: 'Marcus Vance', sprintName: 'Sprint 14 — Mobile Biometrics', teamOrProject: 'Mobile App' },
          ]
        },
        {
          key: 'PLAT-309',
          summary: 'SOC2 Type II Compliance & Cloud Hardening',
          projectKey: 'PLAT',
          projectName: 'Platform API',
          status: 'In Progress',
          statusCategory: 'In Progress' as const,
          totalChildIssues: 5,
          completedChildIssues: 1,
          totalStoryPoints: 30,
          completedStoryPoints: 6,
          completionPercentage: 20,
          spCompletionPercentage: 20,
          riskLevel: 'CRITICAL' as const,
          riskReasons: ['Multiple overdue compliance audit items'],
          childStatusCounts: { done: 1, inProgress: 2, toDo: 1, blocked: 1 },
          teamsInvolved: ['Platform API'],
          updatedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
          labels: ['infrastructure', 'compliance', 'security'],
          dueDate: '2026-09-15',
          childIssues: [
            { key: 'PLAT-310', summary: 'Audit log hashing pipeline', status: 'In Progress', statusCategory: 'In Progress' as const, issueType: 'Task', storyPoints: 8, assigneeName: 'Alex Rivera', sprintName: 'Sprint 8 — Platform Security', teamOrProject: 'Platform API' },
            { key: 'PLAT-312', summary: 'TLS 1.3 enforcement on load balancers', status: 'Blocked', statusCategory: 'In Progress' as const, issueType: 'Bug', storyPoints: 5, assigneeName: 'Unassigned', sprintName: 'Sprint 8 — Platform Security', teamOrProject: 'Platform API' },
          ]
        }
      ];

      // Map boardIds to projectKeys for mock filtering
      const boardKeyMap: Record<number, string> = {
        101: 'CORE',
        104: 'CORE',
        102: 'MOB',
        103: 'PLAT',
        105: 'DATA'
      };

      const derivedProjectKeys = new Set<string>(selectedProjectKeys);
      selectedBoardIds.forEach(id => {
        if (boardKeyMap[id]) derivedProjectKeys.add(boardKeyMap[id]);
      });

      // Filter epics if specific boards or project keys selected
      let epics = allEpics;
      if (derivedProjectKeys.size > 0) {
        epics = allEpics.filter(e => derivedProjectKeys.has(e.projectKey));
      }

      if (selectedLabels.length > 0) {
        epics = epics.filter(e => (e.labels || []).some(l => selectedLabels.includes(l)));
      }

      if (dateRange && dateRange !== 'all') {
        const days = parseInt(dateRange.replace('d', ''), 10) || 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        epics = epics.filter(e => new Date(e.createdAt || 0).getTime() >= cutoff);
      }

      const teamIterations = [
        {
          boardId: 101,
          boardName: 'Core Engineering Board',
          projectKey: 'CORE',
          sprintId: 501,
          sprintName: 'Sprint 43 — Core Platform',
          sprintState: 'active' as const,
          startDate: '2026-08-15',
          endDate: '2026-08-29',
          totalIssues: 14,
          completedIssues: 9,
          inProgressIssues: 4,
          blockedIssues: 0,
          toDoIssues: 1,
          totalStoryPoints: 64,
          completedStoryPoints: 46,
          inProgressStoryPoints: 14,
          completionPercentage: 72,
          health: 'ON_TRACK' as const,
        },
        {
          boardId: 102,
          boardName: 'Mobile App Revamp Board',
          projectKey: 'MOB',
          sprintId: 504,
          sprintName: 'Sprint 14 — Mobile Biometrics',
          sprintState: 'active' as const,
          startDate: '2026-08-18',
          endDate: '2026-09-01',
          totalIssues: 10,
          completedIssues: 4,
          inProgressIssues: 4,
          blockedIssues: 1,
          toDoIssues: 1,
          totalStoryPoints: 42,
          completedStoryPoints: 18,
          inProgressStoryPoints: 16,
          completionPercentage: 43,
          health: 'AT_RISK' as const,
        },
        {
          boardId: 103,
          boardName: 'Platform API & Cloud Board',
          projectKey: 'PLAT',
          sprintId: 505,
          sprintName: 'Sprint 8 — Platform Security',
          sprintState: 'active' as const,
          startDate: '2026-08-10',
          endDate: '2026-08-24',
          totalIssues: 8,
          completedIssues: 2,
          inProgressIssues: 4,
          blockedIssues: 1,
          toDoIssues: 1,
          totalStoryPoints: 34,
          completedStoryPoints: 8,
          inProgressStoryPoints: 18,
          completionPercentage: 24,
          health: 'CRITICAL' as const,
        }
      ].filter(ti => selectedBoardIds.length === 0 || selectedBoardIds.includes(ti.boardId));

      return {
        success: true,
        data: {
          epics,
          overallProgress: {
            totalEpics: epics.length,
            completedEpics: epics.filter(e => e.statusCategory === 'Done').length,
            epicCompletionPercentage: epics.length > 0 ? Math.round((epics.filter(e => e.statusCategory === 'Done').length / epics.length) * 100) : 0,
            totalChildIssues: epics.reduce((sum, e) => sum + e.totalChildIssues, 0),
            completedChildIssues: epics.reduce((sum, e) => sum + e.completedChildIssues, 0),
            issueCompletionPercentage: Math.round((epics.reduce((sum, e) => sum + e.completedChildIssues, 0) / (epics.reduce((sum, e) => sum + e.totalChildIssues, 0) || 1)) * 100),
            totalStoryPoints: epics.reduce((sum, e) => sum + e.totalStoryPoints, 0),
            completedStoryPoints: epics.reduce((sum, e) => sum + e.completedStoryPoints, 0),
            spCompletionPercentage: Math.round((epics.reduce((sum, e) => sum + e.completedStoryPoints, 0) / (epics.reduce((sum, e) => sum + e.totalStoryPoints, 0) || 1)) * 100),
          },
          workAllocation: {
            totalIssues: 52,
            totalPoints: 260,
            features: { count: 30, points: 160, percentage: 62 },
            techDebt: { count: 12, points: 60, percentage: 23 },
            bugs: { count: 6, points: 25, percentage: 10 },
            maintenance: { count: 4, points: 15, percentage: 5 },
          },
          dependencies: [
            {
              epicKey: 'MOB-204',
              epicSummary: 'Biometric Auth',
              blockedIssueKey: 'MOB-210',
              blockedIssueSummary: 'Biometric SDK wrapper',
              blockedStatus: 'Blocked',
              assigneeName: 'Elena Rostova',
              blockReason: 'Blocked by Core Platform API endpoint',
            },
          ],
          teamIterations,
          aiBriefing: {
            overallHealth: 'AT_RISK',
            summaryNarrative:
              'Portfolio status is currently marked as AT RISK due to dependency bottlenecks in Mobile Auth (MOB-204) and compliance audit delays in Platform API (PLAT-309). Core Engineering delivery remains on track.',
            keyHighlights: [
              'Core Microservices Migration (CORE-101) is 79% complete with 38 Story Points delivered in current iteration.',
              'Cross-team feature investment accounts for 62% of engineering effort.',
            ],
            topRisks: [
              'Platform Security Compliance (PLAT-309) is at 20% completion with 1 blocked TLS configuration task.',
              'Mobile Biometric Auth is blocked on Core API endpoint integration.',
            ],
            actionItems: [
              'Unblock Core API team dependency to resume Mobile Biometrics integration.',
              'Reallocate senior backend support to unblock TLS 1.3 audit tasks.',
            ],
            generatedAt: new Date().toISOString(),
          },
        },
      };
    }

    case 'getSavedTeamGroups': {
      const stored = localStorage.getItem('ici-mock-team-groups');
      if (stored) {
        try { return { success: true, data: JSON.parse(stored) }; } catch (e) {}
      }
      return {
        success: true,
        data: [
          {
            id: 'group-1',
            name: 'Monday Executive Review',
            boardIds: [101, 102],
            projectKeys: ['CORE', 'MOB'],
            description: 'Core Engineering & Mobile App cross-team view for Monday leadership check-ins.',
            createdAt: '2026-08-01T00:00:00.000Z',
          },
          {
            id: 'group-2',
            name: 'Platform & Security Workstream',
            boardIds: [103],
            projectKeys: ['PLAT'],
            description: 'Cloud infrastructure & SOC2 compliance projects.',
            createdAt: '2026-08-10T00:00:00.000Z',
          }
        ],
      };
    }

    case 'saveTeamGroup': {
      const stored = localStorage.getItem('ici-mock-team-groups');
      let groups = stored ? JSON.parse(stored) : [
        { id: 'group-1', name: 'Monday Executive Review', boardIds: [101, 102], projectKeys: ['CORE', 'MOB'], createdAt: '2026-08-01T00:00:00.000Z' },
        { id: 'group-2', name: 'Platform & Security Workstream', boardIds: [103], projectKeys: ['PLAT'], createdAt: '2026-08-10T00:00:00.000Z' }
      ];
      const newGroup = payload as { id?: string; name: string; boardIds: number[]; projectKeys: string[]; description?: string };
      const id = newGroup.id || `group-${Date.now()}`;
      const groupObj = { ...newGroup, id, createdAt: new Date().toISOString() };
      const idx = groups.findIndex((g: { id: string }) => g.id === id);
      if (idx >= 0) groups[idx] = groupObj;
      else groups.push(groupObj);
      localStorage.setItem('ici-mock-team-groups', JSON.stringify(groups));
      return { success: true, data: groupObj };
    }

    case 'deleteTeamGroup': {
      const stored = localStorage.getItem('ici-mock-team-groups');
      let groups = stored ? JSON.parse(stored) : [
        { id: 'group-1', name: 'Monday Executive Review', boardIds: [101, 102], projectKeys: ['CORE', 'MOB'], createdAt: '2026-08-01T00:00:00.000Z' },
        { id: 'group-2', name: 'Platform & Security Workstream', boardIds: [103], projectKeys: ['PLAT'], createdAt: '2026-08-10T00:00:00.000Z' }
      ];
      const targetId = (payload as { id: string })?.id;
      groups = groups.filter((g: { id: string }) => g.id !== targetId);
      localStorage.setItem('ici-mock-team-groups', JSON.stringify(groups));
      return { success: true };
    }

    case 'searchJiraUsers': {
      const q = ((payload?.query as string) || '').toLowerCase();
      const mockUsers = [
        { accountId: '5b10ac8d82e05b22cc7d4ef5', displayName: 'Sarah Chen (Lead Engineer)', emailAddress: 'sarah.chen@company.com' },
        { accountId: '5b10ac8d82e05b22cc7d4ef6', displayName: 'Alex Rivera (Backend Dev)', emailAddress: 'alex.rivera@company.com' },
        { accountId: '5b10ac8d82e05b22cc7d4ef7', displayName: 'Marcus Vance (Fullstack)', emailAddress: 'marcus.vance@company.com' },
        { accountId: '5b10ac8d82e05b22cc7d4ef8', displayName: 'Elena Rostova (Frontend Engineer)', emailAddress: 'elena.rostova@company.com' },
        { accountId: '5b10ac8d82e05b22cc7d4ef9', displayName: 'Micah Apabiekun (Engineering Director / PM)', emailAddress: 'micah.apabiekun@company.com' },
      ];
      const matched = mockUsers.filter(u => u.displayName.toLowerCase().includes(q) || u.emailAddress.toLowerCase().includes(q));
      return { success: true, data: matched };
    }

    case 'getARTSyncData': {
      const teamName = (payload?.teamName as string) || 'All';
      const fiscalYear = (payload?.fiscalYear as string) || 'FY27';
      const quarter = (payload?.quarter as string) || 'Q2';
      const iteration = (payload?.iteration as string) || 'Iteration 4';
      const sprintState = (payload?.sprintState as string) || 'All';
      const selectedFeatureKey = (payload?.featureKey as string) || 'ALL';

      const mockTaskPool = [
        // Feature 1: Platform Engineering Team (Matching sample art sync board)
        {
          epicKey: 'Improve Security Observability & Respond Proactively to Security Incidents',
          epicSummary: 'Improve Security Observability & Respond Proactively to Security Incidents',
          taskKey: 'FINCH-201',
          taskSummary: 'Rollout Service to Service Communications from Non-Transaction Apps to Finch Transaction Apps',
          acceptanceCriteria: 'All Finch transaction applications should communicate with other Kubernetes applications via direct service to service calls',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 8,
          assigneeName: 'Marcus Vance',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Improve Security Observability & Respond Proactively to Security Incidents',
          epicSummary: 'Improve Security Observability & Respond Proactively to Security Incidents',
          taskKey: 'AWAF-102',
          taskSummary: 'Setup Paydirect online VS AWAF policy for Blocking mode',
          acceptanceCriteria: 'Have a final review of the policy\'s learning. Engage all relevant stakeholders before transitioning to blocking Enforcement mode',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 5,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Improve Security Observability & Respond Proactively to Security Incidents',
          epicSummary: 'Improve Security Observability & Respond Proactively to Security Incidents',
          taskKey: 'WEBPAY-301',
          taskSummary: 'Transition WebPay VS AWAF policy to Blocking mode',
          acceptanceCriteria: 'Have a final review of the policy\'s learning. Engage all relevant stakeholders before transitioning to blocking Enforcement mode',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 8,
          assigneeName: 'Alex Rivera',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          epicSummary: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          taskKey: 'JIRA-401',
          taskSummary: 'Conduct POC for Jira Deployment Tracking',
          acceptanceCriteria: 'Integrate Jira Deployment Tracking into our pipelines as a pilot test and document its features and capabilities',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 13,
          assigneeName: 'Elena Rostova',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          epicSummary: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          taskKey: 'MOB-502',
          taskSummary: 'Conduct POC for mobile security scanning (App Knox)',
          acceptanceCriteria: 'Integrate AppKnox Security Scanning into one mobile pipeline',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 8,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          epicSummary: 'Improve Software Delivery Velocity, Quality & Governance Across Engineering Teams',
          taskKey: 'ING-603',
          taskSummary: 'Create Internet-Facing Ingress Domain for UAT (uat.isw.la)',
          acceptanceCriteria: 'The ingress class for this domain would be our previous nginx-controller (nginx)',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 8,
          assigneeName: 'David Kim',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Cloud Native Infrastructure & Zero-Trust Mesh Deployment',
          epicSummary: 'Cloud Native Infrastructure & Zero-Trust Mesh Deployment',
          taskKey: 'CIL-701',
          taskSummary: 'Enforce Cilium Network Policies across transaction microservices',
          acceptanceCriteria: 'Validate L3/L4 & L7 network policies across transaction microservices in lower environments',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 5,
          assigneeName: 'Marcus Vance',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'Cloud Native Infrastructure & Zero-Trust Mesh Deployment',
          epicSummary: 'Cloud Native Infrastructure & Zero-Trust Mesh Deployment',
          taskKey: 'CIL-702',
          taskSummary: 'Validate Multi-Region Kubernetes Cluster Mesh peering',
          acceptanceCriteria: 'Establish encrypted wireguard mesh tunnel across AWS & Azure primary clusters',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Platform Engineering Team',
          storyPoints: 3,
          assigneeName: 'David Kim',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },

        // Feature 2: TELEPRESENCE (ISW ACADEMY) (Workplace Productivity)
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-101',
          taskSummary: 'Mount Webex interactive screen',
          acceptanceCriteria: 'Mount Webex interactive screen on conference wall',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 5,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-102',
          taskSummary: 'Capture feedback and resolve issues',
          acceptanceCriteria: 'Capture feedback and resolve issues from pilot users',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 8,
          assigneeName: 'Alex Rivera',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-103',
          taskSummary: 'Conduct end-to-end testing (audio, video, touch interface)',
          acceptanceCriteria: 'Conduct end-to-end testing (audio, video, touch interface)',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 13,
          assigneeName: 'Marcus Vance',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-104',
          taskSummary: 'Configure device settings',
          acceptanceCriteria: 'Configure device settings and network policies',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 5,
          assigneeName: 'Elena Rostova',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-105',
          taskSummary: 'Integrate with corporate collaboration platform',
          acceptanceCriteria: 'Integrate with corporate collaboration platform and single sign-on',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 8,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-106',
          taskSummary: 'Monitor and confirm completion of Civil works/alteration of meeting room',
          acceptanceCriteria: 'Monitor and confirm completion of Civil works/alteration of meeting room',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 13,
          assigneeName: 'Alex Rivera',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-107',
          taskSummary: 'Perform physical setup and cable management',
          acceptanceCriteria: 'Perform physical setup and cable management',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 8,
          assigneeName: 'Marcus Vance',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },
        {
          epicKey: 'TELEPRESENCE (ISW ACADEMY)',
          epicSummary: 'Collaboration Experience Transformation TELEPRESENCE (ISW ACADEMY)',
          taskKey: 'WEBOX-108',
          taskSummary: 'Plan for and set Timeframe for installation',
          acceptanceCriteria: 'Plan for and set Timeframe for installation',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Workplace Productivity',
          storyPoints: 13,
          assigneeName: 'Elena Rostova',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 3',
          sprintState: 'Active',
        },

        // Feature 3: SASE-SEC-200 (Security & Infrastructure)
        {
          epicKey: 'SASE-SEC-200',
          epicSummary: 'Secure Access Service Edge (SASE) Zero-Trust Gateway Deployment',
          taskKey: 'SASE-201',
          taskSummary: 'Provision SASE Connector nodes in AWS & Azure',
          acceptanceCriteria: 'Verify connector latency under 15ms with redundant tunnels across multi-region VPCs',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Security & Infrastructure',
          storyPoints: 8,
          assigneeName: 'David Kim',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'SASE-SEC-200',
          epicSummary: 'Secure Access Service Edge (SASE) Zero-Trust Gateway Deployment',
          taskKey: 'SASE-202',
          taskSummary: 'Configure DLP & Threat Prevention Profiles',
          acceptanceCriteria: 'Block PII data egress and enforce real-time antivirus deep-packet inspection',
          status: 'In-Progress',
          statusCategory: 'In Progress' as const,
          teamName: 'Security & Infrastructure',
          storyPoints: 5,
          assigneeName: 'David Kim',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'SASE-SEC-200',
          epicSummary: 'Secure Access Service Edge (SASE) Zero-Trust Gateway Deployment',
          taskKey: 'SASE-203',
          taskSummary: 'Pilot Zero-Trust Client on Executive and Engineering Devices',
          acceptanceCriteria: 'Ensure seamless SAML 2.0 authentication with zero VPN connection drops',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Security & Infrastructure',
          storyPoints: 13,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },

        // Feature 4: PAY-ROUTER-300 (Core Platform)
        {
          epicKey: 'PAY-ROUTER-300',
          epicSummary: 'Enterprise Multi-Channel Payment Routing Engine & Settlement',
          taskKey: 'PAY-301',
          taskSummary: 'Implement Dynamic Bank Switch Failover Routing',
          acceptanceCriteria: 'Route around banking outages in under 500ms with 99.999% transaction reliability',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Core Platform',
          storyPoints: 13,
          assigneeName: 'Alex Rivera',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'PAY-ROUTER-300',
          epicSummary: 'Enterprise Multi-Channel Payment Routing Engine & Settlement',
          taskKey: 'PAY-302',
          taskSummary: 'ISO 8583 to ISO 20022 Financial Messaging Converter',
          acceptanceCriteria: 'Full bidirectional translation and schema compliance validation for inter-bank transfers',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Core Platform',
          storyPoints: 8,
          assigneeName: 'Marcus Vance',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'PAY-ROUTER-300',
          epicSummary: 'Enterprise Multi-Channel Payment Routing Engine & Settlement',
          taskKey: 'PAY-303',
          taskSummary: 'Kafka-driven Real-Time Settlement Reconciliation Ledger',
          acceptanceCriteria: 'Reconcile 10,000 TPS transaction stream with zero drift against database balance',
          status: 'In-Progress',
          statusCategory: 'In Progress' as const,
          teamName: 'Core Platform',
          storyPoints: 13,
          assigneeName: 'Elena Rostova',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },

        // Feature 5: MOB-BIO-400 (Mobile Experience)
        {
          epicKey: 'MOB-BIO-400',
          epicSummary: 'Customer Mobile Experience & Biometric ID Onboarding',
          taskKey: 'MOB-401',
          taskSummary: 'NFC Passport & National ID Chip Reading Engine',
          acceptanceCriteria: 'Read and decrypt e-Passport NFC chip within 3 seconds on iOS and Android',
          status: 'Done',
          statusCategory: 'Done' as const,
          teamName: 'Mobile Experience',
          storyPoints: 8,
          assigneeName: 'Elena Rostova',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        },
        {
          epicKey: 'MOB-BIO-400',
          epicSummary: 'Customer Mobile Experience & Biometric ID Onboarding',
          taskKey: 'MOB-402',
          taskSummary: 'Liveness Detection 3D Facial Verification',
          acceptanceCriteria: 'ISO 30107-3 compliant anti-spoofing liveness check with <0.1% false acceptance',
          status: 'To-Do',
          statusCategory: 'To Do' as const,
          teamName: 'Mobile Experience',
          storyPoints: 8,
          assigneeName: 'Sarah Chen',
          fiscalYear: 'FY27',
          quarter: 'Q2',
          iterationName: 'Iteration 4',
          sprintState: 'Active',
        }
      ];

      // Build features list
      const featureMap = new Map<string, { key: string; summary: string; projectName?: string; taskCount: number; storyPoints: number }>();
      mockTaskPool.forEach(t => {
        if (!featureMap.has(t.epicKey)) {
          featureMap.set(t.epicKey, {
            key: t.epicKey,
            summary: t.epicSummary,
            projectName: t.teamName,
            taskCount: 0,
            storyPoints: 0
          });
        }
        const item = featureMap.get(t.epicKey)!;
        item.taskCount += 1;
        item.storyPoints += t.storyPoints;
      });
      const features = Array.from(featureMap.values());

      const sampleTeamNames = [
        'Platform Engineering Team',
        'Workplace Productivity',
        'Core Platform',
        'Mobile Experience',
        'Security & Infrastructure',
      ];

      const isLiveOrCustomBoard = Boolean(teamName) && teamName !== 'All' && teamName !== 'All Teams' && !sampleTeamNames.includes(teamName);

      let tasks = mockTaskPool;
      if (isLiveOrCustomBoard) {
        // If a non-sample custom board has no mock data defined, return empty state with clear emptyReason
        const tLower = teamName.toLowerCase().replace(/team|board|preset:?/gi, '').trim();
        const matched = mockTaskPool.filter(t => {
          const itemTeam = (t.teamName || '').toLowerCase().replace(/team|board/gi, '').trim();
          return itemTeam === tLower || itemTeam.includes(tLower) || tLower.includes(itemTeam);
        });

        if (matched.length === 0) {
          return {
            success: true,
            data: {
              teamName,
              fiscalYear,
              quarter,
              iteration,
              sprintState,
              epicsCommitted: 0,
              tasksCommitted: 0,
              tasksCompleted: 0,
              iterationPerformance: 0,
              storyPointsCommitted: 0,
              storyPointsCompleted: 0,
              iterationObjective: `No active iteration objective configured for ${teamName} in ${iteration}.`,
              tasks: [],
              features: [],
              selectedFeatureKey,
              allTeams: [
                'Platform Engineering Team',
                'Workplace Productivity',
                'Core Platform',
                'Mobile Experience',
                'Security & Infrastructure',
                teamName,
              ],
              emptyReason: `No active Epics or child tasks found for "${teamName}" in ${iteration} (${quarter} ${fiscalYear}). Please verify that tickets are assigned to active sprints and properly linked under parent Epics in this board's project.`,
              burndownData: [],
              iterationPerformanceHistory: [],
              velocityTrend: [],
              riskRegister: [],
              teamPerformanceList: [],
              isSampleData: false,
            },
          };
        }
        tasks = matched;
      } else if (teamName && teamName !== 'All' && teamName !== 'All Teams') {
        const tLower = teamName.toLowerCase().replace(/team|board|preset:?/gi, '').trim();
        tasks = tasks.filter(t => {
          const itemTeam = (t.teamName || '').toLowerCase().replace(/team|board/gi, '').trim();
          return itemTeam === tLower || itemTeam.includes(tLower) || tLower.includes(itemTeam);
        });
      }

      if (selectedFeatureKey && selectedFeatureKey !== 'ALL') {
        tasks = tasks.filter(t => t.epicKey === selectedFeatureKey || t.epicSummary.includes(selectedFeatureKey));
      }
      if (sprintState && sprintState !== 'All') {
        tasks = tasks.filter(t => (t.status === sprintState || (sprintState === 'Active' && t.status !== 'Done') || (sprintState === 'Closed' && t.status === 'Done')));
      }

      const uniqueEpics = Array.from(new Set(tasks.map(t => t.epicKey)));
      const tasksCommitted = tasks.length;
      const tasksCompleted = tasks.filter(t => t.statusCategory === 'Done').length;
      const storyPointsCommitted = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
      const storyPointsCompleted = tasks.filter(t => t.statusCategory === 'Done').reduce((sum, t) => sum + t.storyPoints, 0);
      const iterationPerformance = tasksCommitted > 0 ? Math.round((tasksCompleted / tasksCommitted) * 100) : 0;

      let iterationObjective = 'Enforce Cilium network policies across transaction apps in lower environments, validate Cluster Mesh, and establish mobile application security scanning.';
      if (teamName.toLowerCase().includes('workplace')) {
        iterationObjective = 'Deliver enterprise collaboration hardware integration, end-to-end testing, and civil works room alterations across all active workplace productivity workstreams.';
      } else if (teamName.toLowerCase().includes('core')) {
        iterationObjective = 'Deliver payment routing failover switch, ISO 20022 messaging schema, and real-time Kafka settlement ledger.';
      } else if (teamName.toLowerCase().includes('mobile')) {
        iterationObjective = 'Roll out NFC passport scanning, ISO 30107-3 compliant 3D facial liveness verification on iOS and Android.';
      } else if (teamName.toLowerCase().includes('security')) {
        iterationObjective = 'Deploy SASE Zero-Trust Gateway connectors across multi-cloud VPCs and pilot corporate device DLP.';
      } else if (tasks.length === 0) {
        iterationObjective = `No active iteration objective configured for ${teamName} in ${iteration}.`;
      }

      const burndownData = tasks.length > 0 ? [
        { date: 'Aug 18', remaining: 58, ideal: 58 },
        { date: 'Aug 20', remaining: 58, ideal: 48 },
        { date: 'Aug 22', remaining: 52, ideal: 40 },
        { date: 'Aug 24', remaining: 45, ideal: 30 },
        { date: 'Aug 26', remaining: 46, ideal: 20 },
        { date: 'Aug 28', remaining: 18, ideal: 10 },
        { date: 'Aug 30', remaining: 0, ideal: 0 },
      ] : [];

      const iterationPerformanceHistory = tasks.length > 0 ? [
        { iteration: 'Iteration 1', performance: 87 },
        { iteration: 'Iteration 2', performance: 89 },
        { iteration: 'Iteration 3', performance: 100 },
        { iteration: 'Iteration 4', performance: 100 },
      ] : [];

      const velocityTrend = tasks.length > 0 ? [
        { iteration: 'Iteration 1', committed: 112, completed: 86 },
        { iteration: 'Iteration 2', committed: 75, completed: 67 },
        { iteration: 'Iteration 3', committed: 122, completed: 122 },
        { iteration: 'Iteration 4', committed: 58, completed: 58 },
        { iteration: 'Iteration 5', committed: 28, completed: 0 },
      ] : [];

      const riskRegister = tasks.length > 0 ? [
        { issueKey: 'PLAT-401', summary: 'Firewall NAT rule conflict on egress proxy', issueType: 'Task', status: 'In Progress', teamName: 'Platform Engineering Team' },
        { issueKey: 'SEC-302', summary: 'Certificate rotation delay in secondary cluster', issueType: 'Bug', status: 'In Progress', teamName: 'Security & Infrastructure' },
        { issueKey: 'NET-109', summary: 'Latency degradation on inter-region VPC peering', issueType: 'Risk', status: 'Under Investigation', teamName: 'Platform Engineering Team' },
      ] : [];

      const teamPerformanceList = [
        { code: 'DB', name: 'Digital Banking', performance: 100 },
        { code: 'DWP', name: 'Digital Workplace', performance: 100 },
        { code: 'EAM', name: 'Enterprise Architecture', performance: 100 },
        { code: 'IEP', name: 'Identity & Enterprise', performance: 100 },
        { code: 'ADP', name: 'App Delivery & Platform', performance: 94 },
        { code: 'COR', name: 'Core Platform', performance: 89 },
        { code: 'RPA', name: 'Robotic Process Automation', performance: 88 },
        { code: 'SAAP', name: 'Security & Access', performance: 82 },
        { code: 'IAAP', name: 'Infrastructure & Cloud', performance: 80 },
        { code: 'DAAP', name: 'Data & Analytics', performance: 57 },
      ];

      return {
        success: true,
        data: {
          teamName,
          fiscalYear,
          quarter,
          iteration,
          sprintState,
          epicsCommitted: uniqueEpics.length,
          tasksCommitted,
          tasksCompleted,
          iterationPerformance,
          storyPointsCommitted,
          storyPointsCompleted,
          iterationObjective,
          tasks,
          features,
          selectedFeatureKey,
          allTeams: [
            'Platform Engineering Team',
            'Workplace Productivity',
            'Core Platform',
            'Mobile Experience',
            'Security & Infrastructure',
          ],
          burndownData,
          iterationPerformanceHistory,
          velocityTrend,
          riskRegister,
          teamPerformanceList,
          emptyReason: tasks.length === 0 ? `No tasks found matching your filter selection for "${teamName}".` : undefined,
          isSampleData: !isLiveOrCustomBoard,
        },
      };
    }

    case 'getStoryPointsFields':
      return {
        success: true,
        data: [
          { id: 'customfield_10016', name: 'Story Points', isRecommended: true },
          { id: 'customfield_10028', name: 'Story point estimate', isRecommended: false },
          { id: 'customfield_10034', name: 'Estimation (SP)', isRecommended: false },
        ],
      };

    case 'getSettings':
      return {
        success: true,
        data: { ...mockSettings },
      };

    case 'saveSettings': {
      if (payload) {
        mockSettings = {
          ...mockSettings,
          authorizedApproverId: (payload.authorizedApproverId as string) ?? mockSettings.authorizedApproverId,
          storyPointsField: (payload.storyPointsField as string) ?? mockSettings.storyPointsField,
          weights: (payload.weights as typeof mockSettings.weights) ?? mockSettings.weights,
        };
      }
      return { success: true, data: { success: true } };
    }

    case 'clearCache':
      return { success: true };

    default:
      return { success: false, error: `Unknown command: ${command}` };
  }
}


