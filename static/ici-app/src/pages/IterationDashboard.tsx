import React, { useEffect, useState, useMemo } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import Tooltip from '@atlaskit/tooltip';
import { JiraBoard } from '../types/jira';
import { TeamGroup, TeamIterationSummary, PortfolioDataResult } from '../types/portfolio';
import { JiraIssueLink, openJiraIssue } from '../utils/jiraUrl';
import { KPITraceabilityModal, TraceableIssue } from '../components/KPITraceabilityModal';
import { SearchableBoardSelect } from '../components/SearchableBoardSelect';
import { PaginationControls } from '../components/PaginationControls';

export const IterationDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioDataResult | null>(null);

  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  // Issues Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'TO_DO'>('ALL');
  const [searchIssueQuery, setSearchIssueQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Traceability Modal
  const [traceModalData, setTraceModalData] = useState<{
    title: string;
    subtitle?: string;
    issues: TraceableIssue[];
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [boardsRes, groupsRes, portfolioRes] = await Promise.all([
        invoke<{ boards: JiraBoard[] }>('getBoards'),
        invoke<TeamGroup[]>('getSavedTeamGroups'),
        invoke<PortfolioDataResult>('getPortfolioData', { forceRefresh: false }),
      ]);

      if (boardsRes.success && boardsRes.data?.boards) {
        setBoards(boardsRes.data.boards);
      }
      if (groupsRes.success && groupsRes.data) {
        setTeamGroups(groupsRes.data);
      }
      if (portfolioRes.success && portfolioRes.data) {
        setPortfolioData(portfolioRes.data);
      } else {
        setError(portfolioRes.error || 'Failed to load iteration data.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchFilteredIterationData(boardIds: number[], forceRefresh: boolean = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<PortfolioDataResult>('getPortfolioData', {
        boardIds,
        forceRefresh,
      });
      if (res.success && res.data) {
        setPortfolioData(res.data);
      } else {
        setError(res.error || 'Failed to refresh iteration metrics.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const teamIterations = portfolioData?.teamIterations || [];

  // Filter iterations based on selected board or preset
  const filteredIterations = useMemo(() => {
    if (selectedBoardId !== null) {
      return teamIterations.filter(ti => ti.boardId === selectedBoardId);
    }
    return teamIterations;
  }, [teamIterations, selectedBoardId]);

  // Aggregate all child issues in active iterations
  const allActiveIterationIssues: TraceableIssue[] = useMemo(() => {
    const issuesList: TraceableIssue[] = [];

    (portfolioData?.epics || []).forEach(epic => {
      (epic.childIssues || []).forEach(child => {
        const sName = (child.status || '').toLowerCase();
        const isBlocked = sName.includes('block');
        const cat = child.statusCategory === 'Done' ? 'Done' : child.statusCategory === 'In Progress' ? 'In Progress' : 'To Do';
        issuesList.push({
          key: child.key,
          summary: child.summary,
          projectName: epic.projectName,
          status: child.status,
          statusCategory: cat,
          storyPoints: child.storyPoints || 2,
          assigneeName: child.assigneeName || 'Unassigned',
        });
      });
    });

    return issuesList;
  }, [portfolioData]);

  // Filter issues based on tab and search
  const filteredIssues = useMemo(() => {
    const q = searchIssueQuery.toLowerCase().trim();
    return allActiveIterationIssues.filter(issue => {
      const isBlocked = (issue.status || '').toLowerCase().includes('block');
      if (statusFilter === 'IN_PROGRESS' && issue.statusCategory !== 'In Progress' && !(issue.status || '').toLowerCase().includes('progress')) return false;
      if (statusFilter === 'BLOCKED' && !isBlocked) return false;
      if (statusFilter === 'DONE' && issue.statusCategory !== 'Done') return false;
      if (statusFilter === 'TO_DO' && issue.statusCategory !== 'To Do') return false;

      if (!q) return true;
      return (
        issue.key.toLowerCase().includes(q) ||
        issue.summary.toLowerCase().includes(q) ||
        (issue.assigneeName || '').toLowerCase().includes(q) ||
        (issue.projectName || '').toLowerCase().includes(q)
      );
    });
  }, [allActiveIterationIssues, statusFilter, searchIssueQuery]);

  // Paginated issues
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage, pageSize]);

  // Dynamic Overall Iteration KPIs
  const iterationKPIs = useMemo(() => {
    let totalCommittedSP = 0;
    let totalDeliveredSP = 0;
    let totalInProgressSP = 0;
    let totalDoneIssues = 0;
    let totalInProgressIssues = 0;
    let totalBlockedIssues = 0;
    let totalIssues = 0;

    filteredIterations.forEach(ti => {
      totalCommittedSP += ti.totalStoryPoints;
      totalDeliveredSP += ti.completedStoryPoints;
      totalInProgressSP += ti.inProgressStoryPoints;
      totalDoneIssues += ti.completedIssues;
      totalInProgressIssues += ti.inProgressIssues;
      totalBlockedIssues += ti.blockedIssues;
      totalIssues += (ti.completedIssues + ti.inProgressIssues + ti.blockedIssues + ti.toDoIssues);
    });

    const completionRate = totalCommittedSP > 0
      ? Math.round((totalDeliveredSP / totalCommittedSP) * 100)
      : totalIssues > 0 ? Math.round((totalDoneIssues / totalIssues) * 100) : 0;

    return {
      activeSprintsCount: filteredIterations.length,
      totalCommittedSP,
      totalDeliveredSP,
      totalInProgressSP,
      completionRate,
      totalDoneIssues,
      totalInProgressIssues,
      totalBlockedIssues,
      totalIssues,
    };
  }, [filteredIterations]);

  const getDaysRemainingBadge = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span style={{ background: '#FFEBE6', color: '#DE350B', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
          Ended {Math.abs(diffDays)}d ago
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span style={{ background: '#FFFAE6', color: '#FF8B00', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
          Ends Today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span style={{ background: '#FFFAE6', color: '#FF8B00', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
          {diffDays} Days Left
        </span>
      );
    }
    return (
      <span style={{ background: '#E3FCEF', color: '#006644', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
        {diffDays} Days Left
      </span>
    );
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'ON_TRACK':
        return <Badge appearance="added">ON TRACK</Badge>;
      case 'AT_RISK':
        return <Badge appearance="primary">AT RISK</Badge>;
      case 'CRITICAL':
        return <Badge appearance="removed">CRITICAL</Badge>;
      default:
        return <Badge appearance="default">{health || 'ACTIVE'}</Badge>;
    }
  };

  if (loading && !portfolioData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#5E6C84', fontWeight: 500 }}>
          Analyzing live Scrum Sprints, Iteration Velocity &amp; Team Workstreams...
        </p>
      </div>
    );
  }

  if (error && !portfolioData) {
    return (
      <div style={{ padding: '20px 0' }}>
        <SectionMessage appearance="error" title="Error Loading Iteration Data">
          <p style={{ margin: '8px 0' }}>{error}</p>
          <div style={{ marginTop: '12px' }}>
            <Button appearance="warning" onClick={() => loadInitialData()}>Retry Query</Button>
          </div>
        </SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header Bar */}
      <div className="hero-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#0052CC', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
                SPRINT TELEMETRY
              </span>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                Cross-Team Iteration &amp; Sprint Intelligence
              </h1>
            </div>
            <p style={{ margin: '6px 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 400 }}>
              Live sprint execution, delivery velocity, burn-up progress, and blocker radar across active squads.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Multi-Team Preset Quick Selector */}
            {teamGroups.length > 0 && (
              <select
                value={selectedGroup}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedGroup(val);
                  setSelectedBoardId(null);
                  if (val === '') {
                    fetchFilteredIterationData([]);
                  } else {
                    const g = teamGroups.find(group => group.id === val);
                    if (g) fetchFilteredIterationData(g.boardIds);
                  }
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '4px',
                  border: '1px solid #C1C7D0',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#172B4D',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Saved Squad Presets</option>
                {teamGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    Preset: {g.name} ({g.boardIds.length} Teams)
                  </option>
                ))}
              </select>
            )}

            <Button
              appearance="primary"
              onClick={() => {
                const ids = selectedBoardId ? [selectedBoardId] : selectedGroup ? (teamGroups.find(g => g.id === selectedGroup)?.boardIds || []) : [];
                fetchFilteredIterationData(ids, true);
              }}
            >
              Refresh Sprint Data
            </Button>
          </div>
        </div>

        {/* Board Search Filter Bar */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ maxWidth: '500px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Filter by Specific Scrum/Kanban Board ({boards.length} available):
            </span>
            <SearchableBoardSelect
              boards={boards}
              selectedBoardId={selectedBoardId}
              onChange={board => {
                if (board) {
                  setSelectedBoardId(board.id);
                  setSelectedGroup('');
                  fetchFilteredIterationData([board.id]);
                } else {
                  setSelectedBoardId(null);
                  fetchFilteredIterationData([]);
                }
              }}
              placeholder="Search and select any board to isolate sprint..."
            />
          </div>
        </div>
      </div>

      {/* 6 Key Iteration Delivery KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {/* Active Sprints */}
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = filteredIterations.map(ti => ({
              key: `SPRINT-${ti.sprintId || ti.boardId}`,
              summary: `${ti.sprintName || 'Active Sprint'} (${ti.boardName})`,
              projectName: ti.projectKey || 'Cross-Team',
              status: ti.health,
              storyPoints: ti.totalStoryPoints,
            }));
            setTraceModalData({
              title: 'Active Sprints Overview',
              subtitle: `${filteredIterations.length} active sprint workstreams currently executing`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            Active Sprints
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0052CC', margin: '4px 0 2px' }}>
            {iterationKPIs.activeSprintsCount}
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            Executing workstreams
          </div>
        </div>

        {/* Iteration Performance % */}
        <div
          className="metric-card success"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = allActiveIterationIssues.filter(i => i.statusCategory === 'Done');
            setTraceModalData({
              title: 'Completed Iteration Issues',
              subtitle: `${issues.length} issues completed in current sprint iterations`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            Sprint Delivery %
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#00875A', margin: '4px 0 2px' }}>
            {iterationKPIs.completionRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            {iterationKPIs.totalDeliveredSP} of {iterationKPIs.totalCommittedSP} SP Done
          </div>
        </div>

        {/* Delivered Story Points */}
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            Story Points Delivered
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#36B37E', margin: '4px 0 2px' }}>
            {iterationKPIs.totalDeliveredSP} SP
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            {iterationKPIs.totalDoneIssues} completed tickets
          </div>
        </div>

        {/* In-Progress Story Points */}
        <div
          className="metric-card purple"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = allActiveIterationIssues.filter(i => i.statusCategory === 'In Progress' || i.status.toLowerCase().includes('progress'));
            setTraceModalData({
              title: 'In-Progress Iteration Issues',
              subtitle: `${issues.length} issues currently in active development or code review`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            In-Progress Workload
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6554C0', margin: '4px 0 2px' }}>
            {iterationKPIs.totalInProgressSP} SP
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            {iterationKPIs.totalInProgressIssues} active tickets
          </div>
        </div>

        {/* Blocked Issues */}
        <div
          className={`metric-card ${iterationKPIs.totalBlockedIssues > 0 ? 'warning' : 'success'}`}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            const issues: TraceableIssue[] = allActiveIterationIssues.filter(i => (i.status || '').toLowerCase().includes('block'));
            setTraceModalData({
              title: 'Blocked Iteration Issues',
              subtitle: `${issues.length} issues flagged as blocked or impeded in current sprints`,
              issues,
            });
          }}
        >
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            Blocked Issues
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: iterationKPIs.totalBlockedIssues > 0 ? '#FF8B00' : '#00875A', margin: '4px 0 2px' }}>
            {iterationKPIs.totalBlockedIssues}
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            {iterationKPIs.totalBlockedIssues === 0 ? 'No bottlenecks detected' : 'Requires unblocking'}
          </div>
        </div>

        {/* Total Committed */}
        <div className="metric-card">
          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>
            Committed SP
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#172B4D', margin: '4px 0 2px' }}>
            {iterationKPIs.totalCommittedSP} SP
          </div>
          <div style={{ fontSize: '12px', color: '#42526E' }}>
            Across {iterationKPIs.totalIssues} total tasks
          </div>
        </div>
      </div>

      {/* Cross-Team Active Sprint Health Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #172B4D)' }}>
              Active Squad Sprints &amp; Velocity Cards
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5E6C84' }}>
              Real-time progress, velocity status, and time remaining per squad.
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>
            {filteredIterations.length} Squad Sprints Active
          </span>
        </div>

        {filteredIterations.length === 0 ? (
          <SectionMessage appearance="information" title="No Active Sprints Found">
            <p style={{ margin: '4px 0 0' }}>
              No active sprints were detected for the selected filter. Try selecting a different board or preset.
            </p>
          </SectionMessage>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredIterations.map(ti => (
              <div
                key={`${ti.boardId}-${ti.sprintId}`}
                style={{
                  background: 'var(--card-bg, #FFFFFF)',
                  border: '1px solid var(--border-color, #DFE1E6)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Squad & Sprint Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                        {ti.projectKey && (
                          <span style={{ background: '#0747A6', color: '#FFFFFF', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>
                            {ti.projectKey}
                          </span>
                        )}
                        <span>{ti.boardName}</span>
                      </div>
                      <h4 style={{ margin: '4px 0 0', fontSize: '16px', color: 'var(--text-primary, #172B4D)', fontWeight: 700 }}>
                        {ti.sprintName || 'Active Sprint'}
                      </h4>
                    </div>
                    {getHealthBadge(ti.health)}
                  </div>

                  {/* Dates & Days Remaining */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6B778C', marginBottom: '16px', background: '#FAFBFC', padding: '6px 10px', borderRadius: '6px' }}>
                    <span>
                      {ti.startDate && ti.endDate ? `${new Date(ti.startDate).toLocaleDateString()} — ${new Date(ti.endDate).toLocaleDateString()}` : 'Sprint in progress'}
                    </span>
                    {getDaysRemainingBadge(ti.endDate)}
                  </div>

                  {/* Sprint Completion Progress Bar */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary, #172B4D)' }}>Sprint Completion</span>
                      <span style={{ fontWeight: 700, color: '#0052CC' }}>{ti.completionPercentage}%</span>
                    </div>
                    <div style={{ background: '#EBECF0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${ti.completionPercentage}%`,
                          background: ti.health === 'ON_TRACK' ? '#36B37E' : ti.health === 'AT_RISK' ? '#FFAB00' : '#FF5630',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Metric Breakdown Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', background: '#FAFBFC', padding: '12px', borderRadius: '6px', border: '1px solid #EBECF0' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#5E6C84', fontWeight: 700 }}>DELIVERED</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#36B37E' }}>{ti.completedStoryPoints} SP</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#5E6C84', fontWeight: 700 }}>IN PROGRESS</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0052CC' }}>{ti.inProgressStoryPoints} SP</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#5E6C84', fontWeight: 700 }}>COMMITTED</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#172B4D' }}>{ti.totalStoryPoints} SP</div>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '16px', flexWrap: 'wrap', borderTop: '1px solid #F4F5F7', paddingTop: '12px' }}>
                  <Badge appearance="added">{ti.completedIssues} Done</Badge>
                  <Badge appearance="primary">{ti.inProgressIssues} In Progress</Badge>
                  {ti.blockedIssues > 0 && <Badge appearance="removed">{ti.blockedIssues} Blocked</Badge>}
                  <Badge appearance="default">{ti.toDoIssues} To Do</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Iteration Issue Explorer Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #DFE1E6)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #172B4D)' }}>
              Active Iteration Issue Explorer
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5E6C84' }}>
              Inspect and track all tasks, assignees, story points, and blockers in active sprint workstreams.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchIssueQuery}
              onChange={e => {
                setSearchIssueQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by key, task name, or assignee..."
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #C1C7D0',
                fontSize: '13px',
                minWidth: '260px',
              }}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All Tasks (${allActiveIterationIssues.length})` },
            { id: 'IN_PROGRESS', label: `In Progress (${allActiveIterationIssues.filter(i => i.statusCategory === 'In Progress' || (i.status || '').toLowerCase().includes('progress')).length})` },
            { id: 'BLOCKED', label: `Blocked (${allActiveIterationIssues.filter(i => (i.status || '').toLowerCase().includes('block')).length})` },
            { id: 'DONE', label: `Done (${allActiveIterationIssues.filter(i => i.statusCategory === 'Done').length})` },
            { id: 'TO_DO', label: `To Do (${allActiveIterationIssues.filter(i => i.statusCategory === 'To Do').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                setCurrentPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                border: statusFilter === tab.id ? '1px solid #0052CC' : '1px solid #DFE1E6',
                background: statusFilter === tab.id ? '#0052CC' : '#F4F5F7',
                color: statusFilter === tab.id ? '#FFFFFF' : '#42526E',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Issues Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Issue Key &amp; Summary</th>
                <th>Project / Squad</th>
                <th>Assignee</th>
                <th>Story Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#6B778C' }}>
                    No iteration issues match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map(issue => (
                  <tr key={issue.key}>
                    <td style={{ fontWeight: 600 }}>
                      <JiraIssueLink issueKey={issue.key} label={issue.key} style={{ marginRight: '8px' }} />
                      <span
                        onClick={e => openJiraIssue(issue.key, e)}
                        style={{ cursor: 'pointer', color: 'var(--text-primary, #172B4D)' }}
                        title={`Open ${issue.key} in Jira`}
                      >
                        {issue.summary}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: '#EBECF0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        {issue.projectName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#172B4D' }}>
                        {issue.assigneeName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0747A6' }}>
                        {issue.storyPoints} SP
                      </span>
                    </td>
                    <td>
                      <Badge
                        appearance={
                          issue.statusCategory === 'Done'
                            ? 'added'
                            : (issue.status || '').toLowerCase().includes('block')
                            ? 'removed'
                            : 'primary'
                        }
                      >
                        {issue.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredIssues.length}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
          onPageSizeChange={s => setPageSize(s)}
        />
      </div>

      {/* Traceability Modal */}
      {traceModalData && (
        <KPITraceabilityModal
          onClose={() => setTraceModalData(null)}
          title={traceModalData.title}
          subtitle={traceModalData.subtitle}
          issues={traceModalData.issues}
        />
      )}
    </div>
  );
};
