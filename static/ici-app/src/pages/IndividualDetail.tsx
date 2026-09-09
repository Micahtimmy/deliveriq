import React from 'react';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';
import { TierBadge } from '../components/TierBadge';
import { PersonScore, ImprovementAction, DimensionWeights } from '../types/scoring';
import { JiraIssueLink } from '../utils/jiraUrl';

interface IndividualDetailProps {
  person: PersonScore;
  totalTeamCount: number;
  onBack: () => void;
  weights?: DimensionWeights;
}

export const IndividualDetail: React.FC<IndividualDetailProps> = ({
  person,
  totalTeamCount,
  onBack,
  weights,
}) => {
  // Commitment Integrity Indicator
  let integrityLine = 'Solid Commitment Integrity';
  let integrityColor = '#0052CC';

  if (person.signals.dateChanges.unauthorized.length > 0) {
    integrityLine = 'Non-compliant: Unauthorized due date changes on record';
    integrityColor = '#DE350B';
  } else if (
    (person.categories.onTime === null || person.categories.onTime >= 85) &&
    person.signals.carryOver.rate < 20
  ) {
    integrityLine = 'High Commitment Integrity';
    integrityColor = '#00875A';
  } else if (
    (person.categories.onTime === null || person.categories.onTime >= 70) &&
    person.signals.carryOver.rate < 35
  ) {
    integrityLine = 'Solid Commitment Integrity';
    integrityColor = '#0052CC';
  } else {
    integrityLine = 'Variable Commitment Integrity';
    integrityColor = '#FFAB00';
  }

  return (
    <div style={{ padding: '8px 0', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button appearance="subtle-link" onClick={onBack}>
          ← Back to team dashboard
        </Button>
      </div>

      {/* Section 1: Header Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #DFE1E6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Avatar src={person.avatarUrl} name={person.displayName} size="xlarge" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#172B4D' }}>
                {person.displayName}
              </h1>
              <TierBadge tier={person.tier} />
            </div>

            <div style={{ fontSize: '13px', color: '#5E6C84', marginBottom: '6px' }}>
              Ranked <strong>#{person.rank}</strong> of {totalTeamCount} team members
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: integrityColor }}>
              {integrityLine}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84', textTransform: 'uppercase' }}>
            ICI Score
          </div>
          <div style={{ fontSize: '48px', fontWeight: 800, color: '#0747A6', lineHeight: '1' }}>
            {person.ici}
          </div>
          <div style={{ fontSize: '11px', color: '#6B778C', marginTop: '4px' }}>
            Weighted Composite
          </div>
        </div>
      </div>

      {/* Section 2: Category Breakdown Grid (2x2) */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', marginBottom: '16px' }}>
        Category Breakdown
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* On-Time Card */}
        <div style={{ background: '#F4F5F7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0052CC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#172B4D' }}>On-Time Delivery</span>
            <span style={{ fontSize: '12px', color: '#6B778C' }}>{weights?.onTime ?? 35}% Weight</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#172B4D', marginBottom: '8px' }}>
            {person.categories.onTime !== null ? `${person.categories.onTime}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '13px', color: '#42526E' }}>
            {person.categories.onTime !== null ? (
              <>
                {person.rawData.onTimeCount} of {person.rawData.eligibleForOnTime} tasks delivered on time.
                {person.lateIssues.length > 0 && (
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', color: '#DE350B', flexWrap: 'wrap' }}>
                    Late Issues: {person.lateIssues.map(key => <JiraIssueLink key={key} issueKey={key} style={{ color: '#DE350B' }} />)}
                  </span>
                )}
              </>
            ) : (
              `Insufficient data — only ${person.rawData.eligibleForOnTime} issues had due dates set (minimum 3 required)`
            )}
          </div>
        </div>

        {/* Delivered Card */}
        <div style={{ background: '#F4F5F7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #00875A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#172B4D' }}>Delivered Work</span>
            <span style={{ fontSize: '12px', color: '#6B778C' }}>{weights?.delivered ?? 25}% Weight</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#172B4D', marginBottom: '8px' }}>
            {person.categories.delivered}%
          </div>
          <div style={{ fontSize: '13px', color: '#42526E' }}>
            {person.rawData.storyPoints} story points vs team average of {person.rawData.teamAvgPoints} ({person.rawData.totalResolved} issues resolved).
          </div>
        </div>

        {/* Quality Card */}
        <div style={{ background: '#F4F5F7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #FF5630' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#172B4D' }}>Quality Index</span>
            <span style={{ fontSize: '12px', color: '#6B778C' }}>{weights?.quality ?? 25}% Weight</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#172B4D', marginBottom: '8px' }}>
            {person.categories.quality}
          </div>
          <div style={{ fontSize: '13px', color: '#42526E' }}>
            {person.rawData.qualityIncidents} quality incidents: {person.reopenedIssues.length} reopens, {person.regressedIssues.length} review regressions.
          </div>
        </div>

        {/* Collaboration Card */}
        <div style={{ background: '#F4F5F7', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #6554C0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: '#172B4D' }}>Collaboration</span>
            <span style={{ fontSize: '12px', color: '#6B778C' }}>{weights?.collaboration ?? 15}% Weight</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#172B4D', marginBottom: '8px' }}>
            {person.categories.collaboration}%
          </div>
          <div style={{ fontSize: '13px', color: '#42526E' }}>
            {person.rawData.collabComments} qualifying comments on teammates' tasks vs team average of {person.rawData.teamAvgCollab}.
          </div>
        </div>
      </div>

      {/* Section 3: Behavioral Signals */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', marginBottom: '16px' }}>
        Behavioral Signals
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <SectionMessage
          title={`Sprint Carry-Over Signal: ${person.signals.carryOver.rate}% Rate`}
          appearance={person.signals.carryOver.rate > 40 ? 'warning' : 'information'}
        >
          <div style={{ margin: '4px 0', fontSize: '13px' }}>
            Carried {person.signals.carryOver.totalCarried} of {person.signals.carryOver.totalResolved} tasks across sprints.
            {person.signals.carryOver.carriedOnce.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                <span>Carried once:</span>
                {person.signals.carryOver.carriedOnce.map(key => <JiraIssueLink key={key} issueKey={key} />)}
              </div>
            )}
            {person.signals.carryOver.repeatedlyCarried.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', color: '#DE350B', fontWeight: 600, flexWrap: 'wrap' }}>
                <span>Carried repeatedly (2+ sprints):</span>
                {person.signals.carryOver.repeatedlyCarried.map(key => <JiraIssueLink key={key} issueKey={key} style={{ color: '#DE350B' }} />)}
              </div>
            )}
          </div>
        </SectionMessage>

        <SectionMessage
          title={`Review Regressions: ${person.signals.regression.severity}`}
          appearance={person.signals.regression.severity !== 'Clean' ? 'warning' : 'success'}
        >
          <div style={{ margin: '4px 0', fontSize: '13px' }}>
            Total regressions (moved from Review back to Active): {person.signals.regression.totalRegressions}.
            {person.regressedIssues.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                <span>Affected issues:</span>
                {person.regressedIssues.map((r: { key: string; count: number }) => (
                  <span key={r.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <JiraIssueLink issueKey={r.key} /> ({r.count}x)
                  </span>
                ))}
              </div>
            )}
          </div>
        </SectionMessage>

        <SectionMessage
          title={`Due Date Changes`}
          appearance={person.signals.dateChanges.unauthorized.length > 0 ? 'error' : 'success'}
        >
          <div style={{ margin: '4px 0', fontSize: '13px' }}>
            {person.signals.dateChanges.unauthorized.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: '#DE350B' }}>{person.signals.dateChanges.unauthorized.length} unauthorized due date changes made by assignee:</span>
                {person.signals.dateChanges.unauthorized.map((d: { key: string; from: string; to: string }) => (
                  <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <JiraIssueLink issueKey={d.key} /> ({d.from} → {d.to})
                  </span>
                ))}
              </div>
            ) : (
              <span>No unauthorized due date modifications detected.</span>
            )}
          </div>
        </SectionMessage>
      </div>

      {/* Section 4: Focus Areas for Next Sprint */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', marginBottom: '16px' }}>
        Focus Areas & Recommendations
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {person.improvements.map((action: ImprovementAction, idx: number) => (
          <div
            key={idx}
            style={{
              background: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0747A6', textTransform: 'uppercase', marginBottom: '4px' }}>
              {action.category}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>
              Observation: {action.observation}
            </div>
            <div style={{ fontSize: '13px', color: '#42526E', lineHeight: '1.5' }}>
              <strong>Recommended Action:</strong> {action.action}
            </div>
            {action.issueKeys.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#6B778C', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>Related Jira Issues:</span>
                {action.issueKeys.map(key => <JiraIssueLink key={key} issueKey={key} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
