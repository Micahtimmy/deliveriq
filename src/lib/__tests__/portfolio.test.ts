import { describe, it, expect } from 'vitest';
import {
  processEpicSummary,
  calculatePortfolioOverall,
  calculateWorkAllocation,
  generateAIBriefing,
} from '../portfolio';

describe('Portfolio Processing Engine', () => {
  const mockEpic = {
    key: 'EPIC-1',
    fields: {
      summary: 'Mobile Banking Redesign',
      project: { key: 'BANK', name: 'Digital Banking' },
      status: { name: 'In Progress' },
      assignee: { displayName: 'Sarah Chen' },
      updated: '2026-08-01',
    },
  };

  const mockChildren = [
    {
      key: 'BANK-101',
      fields: {
        summary: 'Login UI',
        status: { name: 'Done', statusCategory: { key: 'done', name: 'Done' } },
        issuetype: { name: 'Story' },
        customfield_10016: 5,
        parent: { key: 'EPIC-1' },
      },
    },
    {
      key: 'BANK-102',
      fields: {
        summary: 'Auth API',
        status: { name: 'In Progress', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
        issuetype: { name: 'Task' },
        customfield_10016: 8,
        parent: { key: 'EPIC-1' },
      },
    },
    {
      key: 'BANK-103',
      fields: {
        summary: 'Token Refresh Bug',
        status: { name: 'In Progress', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
        issuetype: { name: 'Bug' },
        customfield_10016: 3,
        parent: { key: 'EPIC-1' },
      },
    },
  ];

  it('processes individual epic summary metrics correctly', () => {
    const summary = processEpicSummary(mockEpic, mockChildren, 'customfield_10016');

    expect(summary.key).toBe('EPIC-1');
    expect(summary.summary).toBe('Mobile Banking Redesign');
    expect(summary.projectName).toBe('Digital Banking');
    expect(summary.totalChildIssues).toBe(3);
    expect(summary.completedChildIssues).toBe(1);
    expect(summary.totalStoryPoints).toBe(16);
    expect(summary.completedStoryPoints).toBe(5);
    expect(summary.spCompletionPercentage).toBe(31);
    expect(summary.riskLevel).toBe('ON_TRACK');
  });

  it('calculates overall portfolio progress across multiple epics', () => {
    const epic1 = processEpicSummary(mockEpic, mockChildren, 'customfield_10016');
    const overall = calculatePortfolioOverall([epic1]);

    expect(overall.totalEpics).toBe(1);
    expect(overall.completedEpics).toBe(0);
    expect(overall.totalChildIssues).toBe(3);
    expect(overall.completedChildIssues).toBe(1);
    expect(overall.totalStoryPoints).toBe(16);
    expect(overall.completedStoryPoints).toBe(5);
  });

  it('calculates work allocation across features, tech debt, and bugs', () => {
    const allocation = calculateWorkAllocation(mockChildren, 'customfield_10016');

    expect(allocation.totalIssues).toBe(3);
    expect(allocation.totalPoints).toBe(16);
    expect(allocation.bugs.count).toBe(1);
    expect(allocation.bugs.points).toBe(3);
    expect(allocation.features.count).toBe(2);
    expect(allocation.features.points).toBe(13);
  });

  it('generates executive briefing digest', () => {
    const epic1 = processEpicSummary(mockEpic, mockChildren, 'customfield_10016');
    const overall = calculatePortfolioOverall([epic1]);
    const allocation = calculateWorkAllocation(mockChildren, 'customfield_10016');

    const briefing = generateAIBriefing({
      epics: [epic1],
      overallProgress: overall,
      workAllocation: allocation,
      dependencies: [],
      teamIterations: [],
    });


    expect(briefing.overallHealth).toBeDefined();
    expect(briefing.summaryNarrative).toContain('Across 1 active Epics');
    expect(briefing.keyHighlights.length).toBeGreaterThan(0);
  });
});
