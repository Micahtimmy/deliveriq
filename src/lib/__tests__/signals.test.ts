import { describe, it, expect } from 'vitest';
import { detectCarryOver, detectRegressions, detectDateChanges } from '../signals';
import { JiraIssue } from '../../types/jira';

function createMockIssue(key: string, overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    id: '1',
    key,
    fields: {
      summary: 'Task 1',
      assignee: { accountId: 'user-123', displayName: 'Alex' },
      status: { name: 'Done', statusCategory: { name: 'Done' } },
      resolution: { name: 'Done' },
      resolutiondate: '2026-07-10T12:00:00.000Z',
      duedate: '2026-07-12',
      issuetype: { name: 'Story' },
      ...overrides.fields,
    },
    changelog: overrides.changelog,
  };
}

describe('Behavioral Signals Engine', () => {
  const mockAccountId = 'user-123';

  it('detects carry-over rate and carried tasks', () => {
    const issues: JiraIssue[] = [
      createMockIssue('ENG-101', {
        changelog: {
          histories: [
            {
              id: 'h1',
              author: { accountId: 'user-123', displayName: 'Alex' },
              created: '2026-07-01',
              items: [{ field: 'Sprint', fromString: 'Sprint 1', toString: 'Sprint 2', from: '1', to: '2' }],
            },
          ],
        },
      }),
      createMockIssue('ENG-102', {
        changelog: { histories: [] },
      }),
    ];

    const carryOver = detectCarryOver(issues, mockAccountId);
    expect(carryOver.totalCarried).toBe(1);
    expect(carryOver.totalResolved).toBe(2);
    expect(carryOver.rate).toBe(50);
    expect(carryOver.carriedOnce).toContain('ENG-101');
  });

  it('detects review regressions', () => {
    const issues: JiraIssue[] = [
      createMockIssue('ENG-201', {
        changelog: {
          histories: [
            {
              id: 'h1',
              author: { accountId: 'user-456', displayName: 'Reviewer' },
              created: '2026-07-05',
              items: [{ field: 'status', fromString: 'In Review', toString: 'In Progress', from: 'review', to: 'active' }],
            },
          ],
        },
      }),
    ];

    const regression = detectRegressions(issues, mockAccountId);
    expect(regression.totalRegressions).toBe(1);
    expect(regression.affectedIssues[0].key).toBe('ENG-201');
    expect(regression.severity).toBe('Occasional');
  });

  it('detects authorized and unauthorized due date changes', () => {
    const authorizedApproverId = 'manager-999';
    const issues: JiraIssue[] = [
      createMockIssue('ENG-301', {
        changelog: {
          histories: [
            {
              id: 'h1',
              author: { accountId: mockAccountId, displayName: 'Alex' },
              created: '2026-07-02',
              items: [{ field: 'duedate', fromString: '2026-07-10', toString: '2026-07-15', from: '2026-07-10', to: '2026-07-15' }],
            },
            {
              id: 'h2',
              author: { accountId: authorizedApproverId, displayName: 'Manager' },
              created: '2026-07-03',
              items: [{ field: 'duedate', fromString: '2026-07-15', toString: '2026-07-20', from: '2026-07-15', to: '2026-07-20' }],
            },
          ],
        },
      }),
    ];

    const dateChanges = detectDateChanges(issues, mockAccountId, authorizedApproverId);
    expect(dateChanges.unauthorized.length).toBe(1);
    expect(dateChanges.unauthorized[0].key).toBe('ENG-301');
    expect(dateChanges.authorized).toBe(1);
  });
});
