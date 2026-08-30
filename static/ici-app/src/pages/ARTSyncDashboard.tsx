import React, { useEffect, useState } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { JiraIssueLink } from '../utils/jiraUrl';
import { PaginationControls } from '../components/PaginationControls';
import { KPITraceabilityModal, TraceableIssue } from '../components/KPITraceabilityModal';
import { TeamPresetManager } from '../components/TeamPresetManager';
import { ARTSyncData, ARTSyncTask, TeamGroup } from '../types/portfolio';
import { JiraBoard } from '../types/jira';

export const ARTSyncDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ARTSyncData | null>(null);

  // Boards & Presets State for Multi-Team Manager
  const [availableBoards, setAvailableBoards] = useState<JiraBoard[]>([]);
  const [savedPresets, setSavedPresets] = useState<TeamGroup[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState<boolean>(false);

  // Filters State
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedFY, setSelectedFY] = useState('FY27');
  const [selectedQuarter, setSelectedQuarter] = useState('Q2');
  const [selectedIteration, setSelectedIteration] = useState('Iteration 3');
  const [selectedSprintState, setSelectedSprintState] = useState('All');
  const [selectedLabel, setSelectedLabel] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Objectives Banner Expanded State
  const [isObjectiveExpanded, setIsObjectiveExpanded] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Traceability Modal State
  const [traceModalData, setTraceModalData] = useState<{
    title: string;
    subtitle?: string;
    issues: TraceableIssue[];
  } | null>(null);

  useEffect(() => {
    loadBoardsAndPresets();
  }, []);

  useEffect(() => {
    loadARTSyncData();
  }, [selectedTeam, selectedFY, selectedQuarter, selectedIteration, selectedSprintState, selectedBoardIds, selectedLabel, riskFilter, selectedDateRange]);

  async function loadBoardsAndPresets() {
    try {
      const boardsRes = (await invoke('getBoards')) as { success: boolean; data?: { boards: JiraBoard[] } };
      if (boardsRes.success && boardsRes.data?.boards) {
        setAvailableBoards(boardsRes.data.boards);
      }

      const presetsRes = (await invoke('getSavedTeamGroups')) as { success: boolean; data?: TeamGroup[] };
      if (presetsRes.success && presetsRes.data) {
        setSavedPresets(presetsRes.data);
      }
    } catch (e) {
      console.error('Failed to load boards/presets for ART Sync:', e);
    }
  }

  async function loadARTSyncData() {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getARTSyncData', {
        teamName: selectedTeam,
        fiscalYear: selectedFY,
        quarter: selectedQuarter,
        iteration: selectedIteration,
        sprintState: selectedSprintState,
        boardIds: selectedBoardIds,
        labels: selectedLabel !== 'ALL' ? [selectedLabel] : [],
        dateRange: selectedDateRange,
      })) as { success: boolean; data?: ARTSyncData; error?: string };

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load ART Sync iteration data.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePreset(name: string, description: string, boardIds: number[]) {
    try {
      const newPreset: TeamGroup = {
        id: `preset-${Date.now()}`,
        name,
        description,
        boardIds,
        projectKeys: Array.from(
          new Set(
            availableBoards
              .filter((b) => boardIds.includes(b.id))
              .map((b) => b.location?.projectKey)
              .filter((k): k is string => Boolean(k))
          )
        ),
        createdAt: new Date().toISOString(),
      };
      await invoke('saveTeamGroup', newPreset as unknown as Record<string, unknown>);
      const presetsRes = (await invoke('getSavedTeamGroups')) as { success: boolean; data?: TeamGroup[] };
      if (presetsRes.success && presetsRes.data) {
        setSavedPresets(presetsRes.data);
      }
    } catch (e) {
      console.error('Failed to save preset:', e);
    }
  }

  async function handleDeletePreset(presetId: string) {
    try {
      await invoke('deleteTeamGroup', { id: presetId });
      setSavedPresets(savedPresets.filter((p) => p.id !== presetId));
    } catch (e) {
      console.error('Failed to delete preset:', e);
    }
  }

  if (loading && !data) {
    return <LoadingSpinner message="Loading ART Sync Iteration Overview..." />;
  }

  const tasks = data?.tasks || [];

  // Build full team dropdown options dynamically
  const dynamicTeams = Array.from(
    new Set([
      'All',
      ...(data?.allTeams || []),
      ...availableBoards.map((b) => b.location?.projectName || b.name),
      ...savedPresets.map((p) => `Preset: ${p.name}`),
    ])
  ).sort();

  // Client-side search & team filtering
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.taskKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.taskSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.epicSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.acceptanceCriteria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.teamName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTeam =
      selectedTeam === 'All' ||
      t.teamName === selectedTeam ||
      selectedTeam.includes(t.teamName) ||
      (selectedTeam.startsWith('Preset: ') &&
        savedPresets.some((p) => selectedTeam.endsWith(p.name)));

    return matchesSearch && matchesTeam;
  });

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Dynamic KPI Calculations strictly derived from filteredTasks
  const uniqueEpics = Array.from(new Set(filteredTasks.map((t) => t.epicKey)));
  const epicsCommittedCount = uniqueEpics.length;
  const tasksCommittedCount = filteredTasks.length;
  const tasksCompletedCount = filteredTasks.filter((t) => t.statusCategory === 'Done').length;
  const iterationPerformancePct =
    tasksCommittedCount > 0 ? Math.round((tasksCompletedCount / tasksCommittedCount) * 100) : 0;

  const spCommittedCount = filteredTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const spCompletedCount = filteredTasks
    .filter((t) => t.statusCategory === 'Done')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Click Handlers for KPI Traceability
  const openKPITraceability = (metricType: string) => {
    let title = '';
    let subtitle = '';
    let matchingTasks: ARTSyncTask[] = [];

    switch (metricType) {
      case 'epics':
        title = 'Committed Epics Traceability';
        subtitle = `Epics currently committed in ${selectedIteration} (${selectedQuarter} ${selectedFY})`;
        matchingTasks = filteredTasks;
        break;
      case 'committed_tasks':
        title = 'Committed Tasks Traceability';
        subtitle = `All ${tasksCommittedCount} tasks committed in current selection`;
        matchingTasks = filteredTasks;
        break;
      case 'completed_tasks':
        title = 'Completed Tasks Traceability';
        subtitle = `${tasksCompletedCount} completed tasks in current selection`;
        matchingTasks = filteredTasks.filter((t) => t.statusCategory === 'Done');
        break;
      case 'sp_committed':
        title = 'Committed Story Points Traceability';
        subtitle = `Total ${spCommittedCount} story points committed across workstreams`;
        matchingTasks = filteredTasks;
        break;
      case 'sp_completed':
        title = 'Completed Story Points (Velocity) Traceability';
        subtitle = `${spCompletedCount} story points successfully delivered`;
        matchingTasks = filteredTasks.filter((t) => t.statusCategory === 'Done');
        break;
      default:
        return;
    }

    const traceable: TraceableIssue[] = matchingTasks.map((t) => ({
      key: t.taskKey,
      summary: `${t.taskSummary} (${t.epicSummary})`,
      projectName: t.teamName,
      status: t.status,
      statusCategory: t.statusCategory,
      storyPoints: t.storyPoints,
      assigneeName: t.assigneeName || 'Assigned Engineer',
    }));

    setTraceModalData({ title, subtitle, issues: traceable });
  };

  return (
    <div style={{ background: '#071828', minHeight: '100vh', padding: '24px', color: '#FFFFFF', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>ITERATION OVERVIEW &amp; ART SYNC</span>
              <span style={{ fontSize: '12px', background: '#0052CC', padding: '3px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {selectedFY} {selectedQuarter} • {selectedIteration}
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8796A5' }}>
              Real-time cross-team Agile Release Train performance, iteration objective tracking, and execution metrics.
            </p>
          </div>

          <button
            onClick={() => setIsPresetManagerOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #0052CC',
              background: '#0052CC',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 82, 204, 0.4)',
            }}
          >
            <span>🎯</span>
            <span>Filter Teams &amp; Spaces ({selectedBoardIds.length > 0 ? selectedBoardIds.length : 'All'})</span>
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Top Control Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', background: 'rgba(255, 255, 255, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid #203A58' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              TEAM / ART
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
            >
              {dynamicTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              FISCAL YEAR
            </label>
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="FY27">FY27</option>
              <option value="FY26">FY26</option>
              <option value="FY25">FY25</option>
              <option value="FY24">FY24</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              QUARTER
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              ITERATION
            </label>
            <select
              value={selectedIteration}
              onChange={(e) => setSelectedIteration(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="Iteration 1">Iteration 1</option>
              <option value="Iteration 2">Iteration 2</option>
              <option value="Iteration 3">Iteration 3</option>
              <option value="Iteration 4">Iteration 4</option>
              <option value="Iteration 5">Iteration 5</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              SPRINT STATE
            </label>
            <select
              value={selectedSprintState}
              onChange={(e) => setSelectedSprintState(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
            >
              <option value="All">All States</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Future">Future</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8796A5', display: 'block', marginBottom: '4px' }}>
              SEARCH ALL TASKS &amp; EPICS
            </label>
            <input
              type="text"
              placeholder="Search by summary, key, criteria..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #203A58', background: '#0A2540', color: '#FFFFFF', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* 6 Badged Summary Cards (Dynamically recalculated and clickable) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Card 1: Epics Committed */}
          <div
            onClick={() => openKPITraceability('epics')}
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#00B8D9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#1B3E68';
            }}
          >
            <div style={{ background: '#00B8D9', color: '#003846', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              EPICS COMMITTED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>{epicsCommittedCount}</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Click to view Epics 🔍</div>
            </div>
          </div>

          {/* Card 2: Tasks Committed */}
          <div
            onClick={() => openKPITraceability('committed_tasks')}
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#E1824A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#1B3E68';
            }}
          >
            <div style={{ background: '#E1824A', color: '#FFFFFF', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TASKS COMMITTED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>{tasksCommittedCount}</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Click to view Tasks 🔍</div>
            </div>
          </div>

          {/* Card 3: Tasks Completed */}
          <div
            onClick={() => openKPITraceability('completed_tasks')}
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#2684FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#1B3E68';
            }}
          >
            <div style={{ background: '#2684FF', color: '#FFFFFF', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TASKS COMPLETED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>{tasksCompletedCount}</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Click to view Completed 🔍</div>
            </div>
          </div>

          {/* Card 4: Iteration Performance % */}
          <div
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden' }}
          >
            <div style={{ background: '#36B37E', color: '#073823', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ITERATION PERFORMANCE %
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#57D9A3' }}>{iterationPerformancePct}%</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Completion Rate</div>
            </div>
          </div>

          {/* Card 5: Story Points Committed */}
          <div
            onClick={() => openKPITraceability('sp_committed')}
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#4C6B8B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#1B3E68';
            }}
          >
            <div style={{ background: '#4C6B8B', color: '#FFFFFF', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              STORY POINTS COMMITTED
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF' }}>{spCommittedCount}</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Click to view SP breakdown 🔍</div>
            </div>
          </div>

          {/* Card 6: Story Points Completed */}
          <div
            onClick={() => openKPITraceability('sp_completed')}
            style={{ background: '#0E2A47', borderRadius: '8px', border: '1px solid #1B3E68', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#FFAB00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#1B3E68';
            }}
          >
            <div style={{ background: '#FFAB00', color: '#3A2600', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              STORY POINTS COMPLETED (VELOCITY)
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#FFD700' }}>{spCompletedCount}</div>
              <div style={{ fontSize: '11px', color: '#8796A5', marginTop: '4px' }}>Click to view Velocity 🔍</div>
            </div>
          </div>
        </div>

        {/* Collapsible Iteration Objective Banner */}
        <div style={{ background: '#0A2540', border: '1px solid #1D3A5C', borderRadius: '8px', overflow: 'hidden' }}>
          <div
            onClick={() => setIsObjectiveExpanded(!isObjectiveExpanded)}
            style={{
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: '#0D3153',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ITERATION OBJECTIVES
              </span>
            </div>
            <span style={{ color: '#8796A5', fontSize: '14px' }}>{isObjectiveExpanded ? '▲ Collapse' : '▼ Expand'}</span>
          </div>

          {isObjectiveExpanded && (
            <div style={{ padding: '16px 20px', color: '#B3C1D1', fontSize: '14px', lineHeight: '1.6', borderTop: '1px solid #1D3A5C' }}>
              {data?.iterationObjective ||
                'Deliver enterprise collaboration hardware integration, end-to-end testing, and civil works room alterations across all active workplace productivity workstreams.'}
            </div>
          )}
        </div>

        {/* Iteration Summary Table */}
        <div style={{ background: '#0A2540', border: '1px solid #1D3A5C', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1D3A5C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
              📋 Iteration Task &amp; Acceptance Criteria Breakdown ({filteredTasks.length} Items)
            </h3>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#8796A5', fontSize: '14px' }}>
              No tasks found matching your filter selection. Try adjusting the search term or Team/ART selector.
            </div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0D3153', color: '#8796A5', borderBottom: '1px solid #1D3A5C', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px' }}>Epic Name</th>
                    <th style={{ padding: '12px 16px' }}>Task &amp; Summary</th>
                    <th style={{ padding: '12px 16px' }}>Acceptance Criteria</th>
                    <th style={{ padding: '12px 16px' }}>Team / Workstream</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>SP</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task) => (
                    <tr key={task.taskKey} style={{ borderBottom: '1px solid #143252' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#00B8D9', maxWidth: '200px' }}>
                        <div>{task.epicKey}</div>
                        <div style={{ fontSize: '11px', color: '#8796A5', fontWeight: 400 }}>{task.epicSummary}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: 600, maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <JiraIssueLink issueKey={task.taskKey} />
                          <span>{task.taskSummary}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#B3C1D1', maxWidth: '320px', lineHeight: '1.4' }}>
                        {task.acceptanceCriteria}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#1D3A5C', color: '#DEEBFF', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {task.teamName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#57D9A3' }}>
                        {task.storyPoints || 0} pts
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            background: task.statusCategory === 'Done' ? '#006644' : task.statusCategory === 'In Progress' ? '#0747A6' : '#403294',
                            color: '#FFFFFF',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-block',
                          }}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '12px 16px', background: '#0A2540' }}>
                <PaginationControls
                  currentPage={currentPage}
                  totalItems={filteredTasks.length}
                  pageSize={pageSize}
                  onPageChange={(p) => setCurrentPage(p)}
                  onPageSizeChange={(s) => setPageSize(s)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Traceability Modal */}
      {traceModalData && (
        <KPITraceabilityModal
          title={traceModalData.title}
          subtitle={traceModalData.subtitle}
          issues={traceModalData.issues}
          onClose={() => setTraceModalData(null)}
        />
      )}

      {/* Multi-Team & Space Manager Modal */}
      <TeamPresetManager
        isOpen={isPresetManagerOpen}
        onClose={() => setIsPresetManagerOpen(false)}
        availableBoards={availableBoards}
        savedPresets={savedPresets}
        selectedBoardIds={selectedBoardIds}
        onSelectPreset={(preset) => {
          setSelectedBoardIds(preset.boardIds);
          setSelectedTeam(`Preset: ${preset.name}`);
        }}
        onApplyCustomSelection={(boardIds) => {
          setSelectedBoardIds(boardIds);
          if (boardIds.length > 0) {
            setSelectedTeam(`Custom Selection (${boardIds.length} Teams)`);
          } else {
            setSelectedTeam('All');
          }
        }}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
      />
    </div>
  );
};
