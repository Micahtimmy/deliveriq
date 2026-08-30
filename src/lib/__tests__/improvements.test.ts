import { describe, it, expect } from 'vitest';
import { generateImprovements } from '../improvements';

describe('Improvements & Coaching Engine', () => {
  it('generates coaching feedback when delivery is late', () => {
    const feedback = generateImprovements(
      60, // onTimeScore
      0.6, // onTimeRate
      10, // eligibleForOnTime
      ['ENG-1', 'ENG-2', 'ENG-3', 'ENG-4'], // lateKeys
      0, // totalRegressions
      [], // regressedIssues
      10, // carryOverRate
      [], // carriedKeys
      { unauthorized: [], authorized: 0, unknown: 0 },
      90, // collabScore
      12, // collabComments
      10 // teamAvgCollab
    );

    expect(feedback.some(f => f.category.includes('On-Time Delivery'))).toBe(true);
  });

  it('generates coaching feedback when carry-over rate is high', () => {
    const feedback = generateImprovements(
      90,
      0.9,
      10,
      [],
      0,
      [],
      45, // high carryover rate (45%)
      ['ENG-10', 'ENG-11', 'ENG-12'],
      { unauthorized: [], authorized: 0, unknown: 0 },
      90,
      12,
      10
    );

    expect(feedback.some(f => f.category.includes('Sprint Commitment'))).toBe(true);
  });

  it('returns positive praise when all metrics are high', () => {
    const feedback = generateImprovements(
      95,
      0.95,
      10,
      [],
      0,
      [],
      5,
      [],
      { unauthorized: [], authorized: 0, unknown: 0 },
      100,
      15,
      10
    );

    expect(feedback[0].category).toBe('All Areas');
    expect(feedback[0].observation).toContain('No specific gaps identified');
  });
});
