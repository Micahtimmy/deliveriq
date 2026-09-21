import React, { useState } from 'react';
import DynamicTable from '@atlaskit/dynamic-table';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import EmptyState from '@atlaskit/empty-state';
import Tooltip from '@atlaskit/tooltip';
import Badge from '@atlaskit/badge';
import { safeInvoke as invoke } from '../utils/bridge';
import { TierBadge } from '../components/TierBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { PersonScore, TeamScoreResult } from '../types/scoring';
import { PaginationControls } from '../components/PaginationControls';
import { KPITraceabilityModal, TraceableIssue } from '../components/KPITraceabilityModal';
import { exportTeamScoresToCSV } from '../utils/csvExport';

interface TeamDashboardProps {
  data: TeamScoreResult;
  onSelectPerson: (person: PersonScore) => void;
  onRefreshData: (updated: TeamScoreResult) => void;
  onChangeBoard?: () => void;
  storyPointsField: string;
  authorizedApproverId: string;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  data,
  onSelectPerson,
  onRefreshData,
  onChangeBoard,
  storyPointsField,
  authorizedApproverId,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Traceability State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [traceModalData, setTraceModalData] = useState<{
    title: string;
    subtitle?: string;
    issues: TraceableIssue[];
  } | null>(null);

  const scores: PersonScore[] = data.scores || [];
  const weights = data.weights;

  // Calculate Team-Wide Aggregates
  const totalEngineers = scores.length;
  const teamAvgICI =
    totalEngineers > 0
      ? Math.round(scores.reduce((sum: number, p: PersonScore) => sum + p.ici, 0) / totalEngineers)
      : 0;

  const totalPoints = scores.reduce((sum: number, p: PersonScore) => sum + p.rawData.storyPoints, 0);
  const totalResolved = scores.reduce((sum: number, p: PersonScore) => sum + p.rawData.totalResolved, 0);

  const totalOnTimeEligible = scores.reduce((sum: number, p: PersonScore) => sum + p.rawData.eligibleForOnTime, 0);
  const totalOnTimeCount = scores.reduce((sum: number, p: PersonScore) => sum + p.rawData.onTimeCount, 0);
  const teamOnTimeRate =
    totalOnTimeEligible > 0 ? Math.round((totalOnTimeCount / totalOnTimeEligible) * 100) : null;

  const totalQualityIncidents = scores.reduce((sum: number, p: PersonScore) => sum + p.rawData.qualityIncidents, 0);

  // Tier Counts
  const tierCounts = {
    strong: scores.filter((p: PersonScore) => p.tier === 'Strong Contributor').length,
    onTrack: scores.filter((p: PersonScore) => p.tier === 'On Track').length,
    belowTarget: scores.filter((p: PersonScore) => p.tier === 'Below Target').length,
    needsAttention: scores.filter((p: PersonScore) => p.tier === 'Needs Attention').length,
  };

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const bId = data.boardId || 0;
      const sIds = data.sprintIds || [];

      await invoke('clearCache', {
        boardId: bId,
        sprintIds: sIds,
        dateRange: data.dateRange,
      });

      const res = (await invoke('getTeamScores', {
        boardId: bId,
        boardName: data.boardName,
        boardType: data.boardType,
        sprintIds: sIds,
        sprintNames: data.sprintNames,
        dateRange: data.dateRange,
        evaluationPeriod: data.evaluationPeriod,
        storyPointsField,
        authorizedApproverId,
        weights,
      })) as { success: boolean; data?: TeamScoreResult; error?: string };

      if (res.success && res.data) {
        onRefreshData(res.data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  if (refreshing) {
    return <LoadingSpinner message="Refreshing live Jira metrics..." />;
  }

  const onTimeW = weights?.onTime ?? 35;
  const delivW = weights?.delivered ?? 25;
  const qualW = weights?.quality ?? 25;
  const collabW = weights?.collaboration ?? 15;

  const head = {
    cells: [
      { key: 'rank', content: 'Rank', isSortable: true, width: 6 },
      { key: 'name', content: 'Engineer', isSortable: true, width: 22 },
      { key: 'ici', content: 'ICI Score', isSortable: true, width: 10 },
      { key: 'tier', content: 'Performance Tier', isSortable: true, width: 15 },
      { key: 'onTime', content: `On-Time (${onTimeW}%)`, isSortable: true, width: 12 },
      { key: 'delivered', content: `Delivered (${delivW}%)`, isSortable: true, width: 12 },
      { key: 'quality', content: `Quality (${qualW}%)`, isSortable: true, width: 11 },
      { key: 'collaboration', content: `Collab (${collabW}%)`, isSortable: true, width: 10 },
      { key: 'signals', content: 'Signals', isSortable: false, width: 8 },
    ],
  };

  const rows = scores.map((person: PersonScore) => {
    const hasCarryOverSignal = person.signals.carryOver.rate > 40;
    const hasRegressionSignal = person.signals.regression.totalRegressions >= 3;
    const hasDateSignal = person.signals.dateChanges.unauthorized.length > 0;

    const rankDisplay = `#${person.rank}`;

    return {
      key: person.accountId,
      onClick: () => onSelectPerson(person),
      cells: [
        {
          key: 'rank',
          content: <strong style={{ color: person.rank <= 3 ? '#0052CC' : '#172B4D', fontSize: '14px' }}>{rankDisplay}</strong>,
        },
        {
          key: 'name',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Avatar src={person.avatarUrl} name={person.displayName} size="medium" />
              <span style={{ fontWeight: 700, color: '#0747A6', fontSize: '14px' }}>{person.displayName}</span>
            </div>
          ),
        },
        {
          key: 'ici',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0052CC' }}>{person.ici}</span>
              <span style={{ fontSize: '11px', color: '#5E6C84' }}>/ 108</span>
            </div>
          ),
        },
        {
          key: 'tier',
          content: <TierBadge tier={person.tier} />,
        },
        {
          key: 'onTime',
          content:
            person.categories.onTime !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, color: '#172B4D' }}>{person.categories.onTime}%</span>
                <span style={{ fontSize: '11px', color: '#5E6C84' }}>
                  {person.rawData.onTimeCount}/{person.rawData.eligibleForOnTime} on schedule
                </span>
              </div>
            ) : (
              <span style={{ color: '#6B778C', fontStyle: 'italic', fontSize: '12px' }}>N/A (&lt;3 tasks)</span>
            ),
        },
        {
          key: 'delivered',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, color: '#172B4D' }}>{person.categories.delivered}%</span>
              <span style={{ fontSize: '11px', color: '#5E6C84' }}>{person.rawData.storyPoints} pts</span>
            </div>
          ),
        },
        {
          key: 'quality',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, color: '#172B4D' }}>{person.categories.quality}%</span>
              <span style={{ fontSize: '11px', color: '#5E6C84' }}>{person.rawData.qualityIncidents} incidents</span>
            </div>
          ),
        },
        {
          key: 'collaboration',
          content: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, color: '#172B4D' }}>{person.categories.collaboration}%</span>
              <span style={{ fontSize: '11px', color: '#5E6C84' }}>{person.rawData.collabComments} comments</span>
            </div>
          ),
        },
        {
          key: 'signals',
          content: (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {hasCarryOverSignal && (
                <Tooltip content={`Carry-over rate: ${person.signals.carryOver.rate}%`}>
                  <Badge appearance="removed">Carry-Over</Badge>
                </Tooltip>
              )}
              {hasRegressionSignal && (
                <Tooltip content={`Review Regressions: ${person.signals.regression.totalRegressions}`}>
                  <Badge appearance="primary">Regression</Badge>
                </Tooltip>
              )}
              {hasDateSignal && (
                <Tooltip content={`Unauthorized Due Date Changes: ${person.signals.dateChanges.unauthorized.length}`}>
                  <Badge appearance="important">Date Change</Badge>
                </Tooltip>
              )}
              {!hasCarryOverSignal && !hasRegressionSignal && !hasDateSignal && (
                <span style={{ color: '#006644', fontWeight: 600, fontSize: '12px' }}>Clean</span>
              )}
            </div>
          ),
        },
      ],
    };
  });

  const isKanban = data.boardType === 'kanban' || data.boardType === 'space' || (data.sprintNames.length === 0 && Boolean(data.dateRange));
  const boardTypeBadge = data.boardType === 'space' ? 'Space / Project' : isKanban ? 'Kanban Board' : 'Scrum Board';
  const periodText = data.evaluationPeriod || (isKanban && data.dateRange ? `${data.dateRange.startDate} to ${data.dateRange.endDate}` : data.sprintNames.join(', '));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && <ErrorBanner message={error} />}

      {/* Header & Control Bar */}
      <div className="hero-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                {data.boardName}
              </h1>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {boardTypeBadge}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 400 }}>
              Period: <strong>{periodText}</strong> &bull; {totalEngineers} team members ranked
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
              Computed: {new Date(data.computedAt).toLocaleTimeString()}
            </span>
            {onChangeBoard && (
              <button
                className="btn-secondary-glass"
                onClick={onChangeBoard}
                title="Change active Jira board or timeline range"
              >
                Change Board / Period
              </button>
            )}
            <button
              className="btn-secondary-glass"
              onClick={() => exportTeamScoresToCSV(scores, data.boardName, weights)}
              title="Export all ranked engineer delivery metrics to CSV"
            >
              Export CSV
            </button>
            <button className="btn-secondary-glass" onClick={handleRefresh}>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Team Performance Aggregates Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = scores.map(p => ({
              key: p.displayName,
              summary: `Developer Score breakdown: ${p.ici} pts (${p.tier})`,
              projectName: data.boardName,
              status: p.tier,
              storyPoints: p.rawData.storyPoints,
              assigneeName: p.displayName,
              assigneeAvatarUrl: p.avatarUrl,
            }));
            setTraceModalData({
              title: 'Team ICI Score Breakdown',
              subtitle: `Average Composite ICI Score: ${teamAvgICI} across ${totalEngineers} engineers`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Team Avg ICI Score
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#0052CC', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
            {teamAvgICI}
          </div>
          <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 400 }}>Out of 108 Max Composite Score</div>
        </div>

        <div
          className="metric-card success"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = [];
            scores.forEach(p => {
              issues.push({
                key: p.displayName,
                summary: `Delivered ${p.rawData.storyPoints} SP (${p.rawData.totalResolved} tasks resolved)`,
                projectName: data.boardName,
                status: 'Done',
                statusCategory: 'Done',
                storyPoints: p.rawData.storyPoints,
                assigneeName: p.displayName,
                assigneeAvatarUrl: p.avatarUrl,
              });
            });
            setTraceModalData({
              title: 'Team Work Delivered Traceability',
              subtitle: `${totalPoints} total story points delivered across ${totalResolved} resolved tasks`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Work Delivered
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#00875A', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
            {totalPoints} <span style={{ fontSize: '16px', fontWeight: 500 }}>pts</span>
          </div>
          <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 400 }}>{totalResolved} resolved Jira tasks</div>
        </div>

        <div
          className="metric-card warning"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = [];
            scores.forEach(p => {
              (p.lateIssues || []).forEach(k => {
                issues.push({
                  key: k,
                  summary: `Delivered past sprint due date (Assigned: ${p.displayName})`,
                  projectName: data.boardName,
                  status: 'Late',
                  assigneeName: p.displayName,
                  assigneeAvatarUrl: p.avatarUrl,
                });
              });
            });
            setTraceModalData({
              title: 'On-Time Schedule Performance Traceability',
              subtitle: `Team schedule compliance: ${teamOnTimeRate}% (${totalOnTimeCount}/${totalOnTimeEligible} tasks on time)`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Team On-Time Rate
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#FF8B00', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
            {teamOnTimeRate !== null ? `${teamOnTimeRate}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 400 }}>
            {totalOnTimeCount}/{totalOnTimeEligible} tasks on schedule
          </div>
        </div>

        <div
          className="metric-card danger"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = [];
            scores.forEach(p => {
              (p.reopenedIssues || []).forEach(k => {
                issues.push({
                  key: k,
                  summary: `Reopened / Regressed task (Assigned: ${p.displayName})`,
                  projectName: data.boardName,
                  status: 'Reopened',
                  assigneeName: p.displayName,
                  assigneeAvatarUrl: p.avatarUrl,
                });
              });
            });
            setTraceModalData({
              title: 'Quality Incidents & Regressions Traceability',
              subtitle: `${totalQualityIncidents} total code reopens and review regressions`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Quality Incidents (Click to trace)
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#DE350B', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
            {totalQualityIncidents}
          </div>
          <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 500 }}>Reopens &amp; Review regressions</div>
        </div>
      </div>

      {/* Tier Distribution Bar */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#172B4D', marginBottom: '12px' }}>
          Team Performance Tier Distribution
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot green" />
            <span><strong>Strong Contributor:</strong> {tierCounts.strong}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot yellow" />
            <span><strong>On Track:</strong> {tierCounts.onTrack}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot yellow" />
            <span><strong>Below Target:</strong> {tierCounts.belowTarget}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot red" />
            <span><strong>Needs Attention:</strong> {tierCounts.needsAttention}</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {scores.length === 0 ? (
        <EmptyState
          header="No resolved issues found"
          description="Try selecting a different board or sprint range with resolved work."
        />
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', overflow: 'hidden' }}>
          <DynamicTable
            head={head}
            rows={rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            defaultSortKey="ici"
            defaultSortOrder="DESC"
            isFixedSize
          />
          <PaginationControls
            currentPage={currentPage}
            totalItems={scores.length}
            pageSize={pageSize}
            onPageChange={p => setCurrentPage(p)}
            onPageSizeChange={s => setPageSize(s)}
          />
        </div>
      )}

      {/* KPITraceabilityModal */}
      {traceModalData && (
        <KPITraceabilityModal
          title={traceModalData.title}
          subtitle={traceModalData.subtitle}
          issues={traceModalData.issues}
          onClose={() => setTraceModalData(null)}
        />
      )}
    </div>
  );
};
