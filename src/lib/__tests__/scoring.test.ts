import { describe, it, expect } from 'vitest';
import {
  computeOnTimeScore,
  computeDeliveredScore,
  computeQualityScore,
  computeCollaborationScore,
  computeICI,
  getTier,
  extractCommentText,
  getIssuePoints,
  getStatusCategory,
} from '../scoring';
import { detectCarryOver, detectRegressions, detectDateChanges } from '../signals';
import { generateImprovements } from '../improvements';
import { JiraIssue } from '../../types/jira';

describe('Scoring Engine - Helper Functions', () => {
  it('extracts plain text from string comment body', () => {
    expect(extractCommentText('Hello world')).toBe('Hello world');
  });

  it('extracts plain text from ADF structure', () => {
    const adf = {
      content: [
        { content: [{ text: 'Part 1 ' }] },
        { content: [{ text: 'Part 2' }] },
      ],
    };
    expect(extractCommentText(adf)).toBe('Part 1 Part 2');
  });

  it('calculates story points from issue direct field or fallback weight', () => {
    const issueWithPoints: JiraIssue = {
      id: '1',
      key: 'TEST-1',
      fields: {
        summary: 'Test',
        assignee: null,
        status: { name: 'Done', statusCategory: { name: 'Done' } },
        resolution: { name: 'Done' },
        resolutiondate: '2026-08-01T10:00:00.000Z',
        duedate: '2026-08-05',
        issuetype: { name: 'Story' },
        story_points: 8,
      },
    };
    expect(getIssuePoints(issueWithPoints, 'story_points')).toBe(8);

    const issueWithoutPoints: JiraIssue = { ...issueWithPoints, fields: { ...issueWithPoints.fields, story_points: null } };
    expect(getIssuePoints(issueWithoutPoints, 'story_points')).toBe(3); // Story weight fallback = 3
  });

  it('correctly maps status categories', () => {
    expect(getStatusCategory('Done')).toBe('done');
    expect(getStatusCategory('Closed')).toBe('done');
    expect(getStatusCategory('In Review')).toBe('review');
    expect(getStatusCategory('In Progress')).toBe('active');
    expect(getStatusCategory('Unknown Custom Status')).toBe('unknown');
  });
});

describe('Scoring Engine - Core Categories', () => {
  it('computeOnTimeScore returns null when < 3 eligible issues exist', () => {
    const issues: JiraIssue[] = [
      {
        id: '1',
        key: 'TEST-1',
        fields: {
          summary: 'Task 1',
          assignee: { accountId: 'user1', displayName: 'Alice' },
          status: { name: 'Done', statusCategory: { name: 'Done' } },
          resolution: { name: 'Done' },
          resolutiondate: '2026-08-01T10:00:00.000Z',
          duedate: '2026-08-05',
          issuetype: { name: 'Task' },
        },
      },
    ];
    const result = computeOnTimeScore(issues, 'user1');
    expect(result.score).toBeNull();
    expect(result.eligible).toBe(1);
  });

  it('computeOnTimeScore calculates rate accurately when >= 3 eligible issues exist', () => {
    const makeIssue = (key: string, resDate: string, dueDate: string): JiraIssue => ({
      id: key,
      key,
      fields: {
        summary: key,
        assignee: { accountId: 'user1', displayName: 'Alice' },
        status: { name: 'Done', statusCategory: { name: 'Done' } },
        resolution: { name: 'Done' },
        resolutiondate: resDate,
        duedate: dueDate,
        issuetype: { name: 'Task' },
      },
    });

    const issues: JiraIssue[] = [
      makeIssue('TEST-1', '2026-08-01T10:00:00.000Z', '2026-08-05'), // On-time
      makeIssue('TEST-2', '2026-08-03T10:00:00.000Z', '2026-08-03'), // On-time
      makeIssue('TEST-3', '2026-08-10T10:00:00.000Z', '2026-08-05'), // Late
    ];

    const result = computeOnTimeScore(issues, 'user1');
    expect(result.eligible).toBe(3);
    expect(result.onTimeCount).toBe(2);
    expect(result.score).toBe(67); // 2/3 = 66.66% -> 67%
    expect(result.lateKeys).toEqual(['TEST-3']);
  });

  it('computeDeliveredScore caps at 120%', () => {
    expect(computeDeliveredScore(50, 20)).toBe(120); // 250% raw -> capped at 120
    expect(computeDeliveredScore(10, 20)).toBe(50);  // 50%
    expect(computeDeliveredScore(10, 0)).toBe(50);   // neutral fallback
  });

  it('computeQualityScore maps incident counts to quality bands', () => {
    const issue: JiraIssue = {
      id: '1',
      key: 'TEST-1',
      fields: {
        summary: 'Quality Test',
        assignee: { accountId: 'user1', displayName: 'Alice' },
        status: { name: 'Done', statusCategory: { name: 'Done' } },
        resolution: { name: 'Done' },
        resolutiondate: '2026-08-01T10:00:00.000Z',
        duedate: null,
        issuetype: { name: 'Task' },
      },
    };
    const result = computeQualityScore([issue], 'user1');
    expect(result.incidents).toBe(0);
    expect(result.score).toBe(100); // 0-1 incidents = 100
  });

  it('computeICI computes weighted score accurately', () => {
    const categories = {
      onTime: 100,
      delivered: 80,
      quality: 100,
      collaboration: 100,
    };
    // 100*0.35 + 80*0.25 + 100*0.25 + 100*0.15 = 35 + 20 + 25 + 15 = 95
    expect(computeICI(categories)).toBe(95);
  });

  it('getTier assigns correct performance tier', () => {
    expect(getTier(95)).toBe('Strong Contributor');
    expect(getTier(80)).toBe('On Track');
    expect(getTier(65)).toBe('Below Target');
    expect(getTier(50)).toBe('Needs Attention');
  });
});

describe('Behavioral Signals & Improvements', () => {
  it('detectCarryOver identifies sprint transitions', () => {
    const issue: JiraIssue = {
      id: '1',
      key: 'TEST-1',
      fields: {
        summary: 'Carryover test',
        assignee: { accountId: 'user1', displayName: 'Alice' },
        status: { name: 'Done', statusCategory: { name: 'Done' } },
        resolution: { name: 'Done' },
        resolutiondate: '2026-08-01T10:00:00.000Z',
        duedate: null,
        issuetype: { name: 'Task' },
      },
      changelog: {
        histories: [
          {
            id: 'h1',
            author: { accountId: 'admin', displayName: 'Admin' },
            created: '2026-08-01T10:00:00.000Z',
            items: [{ field: 'sprint', fromString: 'Sprint 1', toString: 'Sprint 2', from: '1', to: '2' }],
          },
        ],
      },
    };
    const result = detectCarryOver([issue], 'user1');
    expect(result.totalCarried).toBe(1);
    expect(result.carriedOnce).toEqual(['TEST-1']);
  });

  it('generateImprovements creates actionable coaching guidance', () => {
    const dateChanges = {
      unauthorized: [{ key: 'TEST-1', from: '2026-08-01', to: '2026-08-10', changedOn: '2026-08-02' }],
      authorized: 0,
      unknown: 0,
    };
    const actions = generateImprovements(
      60, 0.6, 5, ['TEST-1', 'TEST-2'],
      2, [{ key: 'TEST-3', count: 2 }],
      40, ['TEST-4'],
      dateChanges,
      40, 1, 5
    );
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(a => a.category === 'Due Date Policy')).toBe(true);
  });
});
