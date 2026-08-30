import React, { useEffect, useState } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import Tooltip from '@atlaskit/tooltip';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  PortfolioDataResult,
  TeamGroup,
  EpicSummary,
  RiskLevel,
  TeamIterationSummary
} from '../types/portfolio';
import { JiraBoard } from '../types/jira';
import { TeamPresetManager } from '../components/TeamPresetManager';
import { EpicChildIssuesModal } from '../components/EpicChildIssuesModal';
import { openJiraIssue, JiraIssueLink } from '../utils/jiraUrl';
import { PaginationControls } from '../components/PaginationControls';
import { KPITraceabilityModal, TraceableIssue } from '../components/KPITraceabilityModal';

interface PortfolioDashboardProps {
  initialTabIndex?: number;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ initialTabIndex = 0 }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortfolioDataResult | null>(null);

  // Available Boards & Presets State
  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);

  // UI Modals & Filtering State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [activeEpicModal, setActiveEpicModal] = useState<EpicSummary | null>(null);
  const [epicSearchTerm, setEpicSearchTerm] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [selectedLabel, setSelectedLabel] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');

  // Pagination State
  const [epicCurrentPage, setEpicCurrentPage] = useState<number>(1);
  const [epicPageSize, setEpicPageSize] = useState<number>(10);

  // Traceability Modal State
  const [traceModalData, setTraceModalData] = useState<{
    title: string;
    subtitle?: string;
    issues: TraceableIssue[];
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<number>(initialTabIndex);

  useEffect(() => {
    setSelectedTab(initialTabIndex);
  }, [initialTabIndex]);

  useEffect(() => {
    loadBoardsAndPresets();
    loadPortfolioData();
  }, []);

  async function loadBoardsAndPresets() {
    try {
      const boardsRes = await invoke<{ boards: JiraBoard[] }>('getBoards');
      if (boardsRes.success && boardsRes.data?.boards) {
        setBoards(boardsRes.data.boards);
      }
      const groupsRes = await invoke<TeamGroup[]>('getSavedTeamGroups');
      if (groupsRes.success && groupsRes.data) {
        setTeamGroups(groupsRes.data);
      }
    } catch (e) {
      console.error('Failed to load boards/presets:', e);
    }
  }

  async function loadPortfolioData(
    boardIds: number[] = selectedBoardIds,
    projectKeys?: string[],
    labels: string[] = selectedLabel !== 'ALL' ? [selectedLabel] : [],
    dateRange: string = selectedDateRange
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<PortfolioDataResult>(
        'getPortfolioData',
        { boardIds, projectKeys, labels, dateRange }
      );
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load portfolio data from Jira.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleSelectPreset(group: TeamGroup) {
    setSelectedGroup(group.id);
    setSelectedBoardIds(group.boardIds);
    loadPortfolioData(group.boardIds, group.projectKeys);
  }

  function handleApplyCustomSelection(ids: number[]) {
    setSelectedGroup('');
    setSelectedBoardIds(ids);
    const keys = Array.from(new Set(
      boards
        .filter(b => ids.includes(b.id) && b.location?.projectKey)
        .map(b => b.location!.projectKey)
    ));
    loadPortfolioData(ids, keys);
  }

  async function handleSavePreset(name: string, description: string, boardIds: number[]) {
    const keys = Array.from(new Set(
      boards
        .filter(b => boardIds.includes(b.id) && b.location?.projectKey)
        .map(b => b.location!.projectKey)
    ));

    const newGroup: TeamGroup = {
      id: `group-${Date.now()}`,
      name,
      description,
      boardIds,
      projectKeys: keys,
      createdAt: new Date().toISOString(),
    };
    const res = await invoke('saveTeamGroup', newGroup as unknown as Record<string, unknown>);
    if (res.success) {

      await loadBoardsAndPresets();
      handleSelectPreset(newGroup);
    }
  }

  async function handleDeletePreset(presetId: string) {
    const res = await invoke('deleteTeamGroup', { id: presetId });
    if (res.success) {
      if (selectedGroup === presetId) {
        setSelectedGroup('');
        setSelectedBoardIds([]);
        loadPortfolioData([]);
      }
      await loadBoardsAndPresets();
    }
  }

  function handleCopyBriefing() {
    if (!data?.aiBriefing) return;
    const briefing = data.aiBriefing;
    const text = `📊 **ICI Executive Briefing - ${new Date().toLocaleDateString()}**\n\n` +
      `**Overall Health:** ${briefing.overallHealth}\n\n` +
      `**Summary:**\n${briefing.summaryNarrative}\n\n` +
      `**Key Highlights:**\n${briefing.keyHighlights.map(h => `- ${h}`).join('\n')}\n\n` +
      `**Top Risks:**\n${briefing.topRisks.map(r => `- ${r}`).join('\n')}\n\n` +
      `**Action Items:**\n${briefing.actionItems.map(a => `- ${a}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const getRiskBadgeAppearance = (level: RiskLevel) => {
    switch (level) {
      case 'ON_TRACK': return 'added';
      case 'AT_RISK': return 'primary';
      case 'CRITICAL': return 'removed';
      default: return 'default';
    }
  };

  const getIterationHealthBadge = (health: string) => {
    switch (health) {
      case 'ON_TRACK': return <Badge appearance="added">ON TRACK</Badge>;
      case 'AT_RISK': return <Badge appearance="primary">AT RISK</Badge>;
      case 'CRITICAL': return <Badge appearance="removed">CRITICAL</Badge>;
      default: return <Badge appearance="default">KANBAN / NO SPRINT</Badge>;
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spinner size="large" />
        <p style={{ marginTop: '16px', color: '#5E6C84', fontWeight: 500 }}>
          Analyzing multi-team Epics, Child Issues & Iteration Progress...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '20px 0' }}>
        <SectionMessage appearance="error" title="Error Loading Portfolio Data">
          <p style={{ margin: '8px 0' }}>{error}</p>
          <div style={{ marginTop: '12px' }}>
            <Button appearance="warning" onClick={() => loadPortfolioData()}>Retry Query</Button>
          </div>
        </SectionMessage>
      </div>
    );
  }

  const epics = data?.epics || [];
  const allocation = data?.workAllocation;
  const briefing = data?.aiBriefing;
  const dependencies = data?.dependencies || [];
  const teamIterations: TeamIterationSummary[] = data?.teamIterations || [];

  // Available Labels from Epics
  const availableLabels = Array.from(new Set(epics.flatMap(e => e.labels || []))).sort();

  // Filter Epics dynamically based on search, risk level, label, and date created
  const filteredEpics = epics.filter(epic => {
    const matchesSearch =
      !epicSearchTerm ||
      epic.key.toLowerCase().includes(epicSearchTerm.toLowerCase()) ||
      epic.summary.toLowerCase().includes(epicSearchTerm.toLowerCase()) ||
      epic.projectName.toLowerCase().includes(epicSearchTerm.toLowerCase()) ||
      (epic.labels || []).some(l => l.toLowerCase().includes(epicSearchTerm.toLowerCase()));

    const matchesRisk = riskFilter === 'ALL' || epic.riskLevel === riskFilter;
    const matchesLabel = selectedLabel === 'ALL' || (epic.labels || []).includes(selectedLabel);

    let matchesDate = true;
    if (selectedDateRange !== 'all') {
      const days = parseInt(selectedDateRange.replace('d', ''), 10) || 30;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const createdTime = new Date(epic.createdAt || epic.updatedAt || 0).getTime();
      matchesDate = createdTime >= cutoff;
    }

    return matchesSearch && matchesRisk && matchesLabel && matchesDate;
  });

  // Dynamically compute overall progress KPI metrics based on filteredEpics
  const overall = (() => {
    const totalEpics = filteredEpics.length;
    const completedEpics = filteredEpics.filter(e => e.statusCategory === 'Done').length;
    const epicCompletionPercentage = totalEpics > 0 ? Math.round((completedEpics / totalEpics) * 100) : 0;

    let totalChildIssues = 0;
    let completedChildIssues = 0;
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;

    filteredEpics.forEach(e => {
      totalChildIssues += e.totalChildIssues;
      completedChildIssues += e.completedChildIssues;
      totalStoryPoints += e.totalStoryPoints;
      completedStoryPoints += e.completedStoryPoints;
    });

    const issueCompletionPercentage = totalChildIssues > 0
      ? Math.round((completedChildIssues / totalChildIssues) * 100)
      : 0;

    const spCompletionPercentage = totalStoryPoints > 0
      ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
      : issueCompletionPercentage;

    return {
      totalEpics,
      completedEpics,
      epicCompletionPercentage,
      totalChildIssues,
      completedChildIssues,
      issueCompletionPercentage,
      totalStoryPoints,
      completedStoryPoints,
      spCompletionPercentage
    };
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header Bar & Multi-Team Preset Controls */}
      <div className="hero-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
              🚀 Program & Portfolio Management
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 500 }}>
              Multi-team Epic tracking, cross-team iteration velocity, effort allocation, and AI executive digests.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Presets Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#42526E' }}>Filter Preset:</span>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  const gId = e.target.value;
                  if (!gId) {
                    setSelectedGroup('');
                    setSelectedBoardIds([]);
                    loadPortfolioData([]);
                  } else {
                    const group = teamGroups.find(g => g.id === gId);
                    if (group) handleSelectPreset(group);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #C1C7D0',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#172B4D',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <option value="">🌐 All Teams & Projects ({boards.length} Boards)</option>
                {teamGroups.map(g => (
                  <option key={g.id} value={g.id}>📁 {g.name} ({g.boardIds.length} Teams)</option>
                ))}
              </select>
            </div>

            <Button appearance="subtle" onClick={() => setIsPresetModalOpen(true)}>
              ⚙️ Manage Presets & Teams ({selectedBoardIds.length || 'All'})
            </Button>

            <Button appearance="primary" onClick={() => loadPortfolioData()}>
              Refresh View
            </Button>
          </div>
        </div>

        {/* Selected Filter Pills */}
        {(selectedBoardIds.length > 0 || selectedLabel !== 'ALL' || selectedDateRange !== 'all' || riskFilter !== 'ALL') && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px dashed #DFE1E6' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>Active Filters:</span>
            
            {/* Team Board Pills */}
            {selectedBoardIds.map(bId => {
              const b = boards.find(board => board.id === bId);
              const pKey = b?.location?.projectKey;
              return (
                <span
                  key={bId}
                  style={{
                    background: '#DEEBFF',
                    color: '#0747A6',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(9, 30, 66, 0.08)',
                  }}
                >
                  {pKey && (
                    <span style={{ background: '#0747A6', color: '#FFFFFF', fontSize: '10px', padding: '1px 4px', borderRadius: '3px' }}>
                      {pKey}
                    </span>
                  )}
                  {b?.name || `Board #${bId}`}
                  <span
                    onClick={() => {
                      const updated = selectedBoardIds.filter(id => id !== bId);
                      setSelectedGroup('');
                      setSelectedBoardIds(updated);
                      loadPortfolioData(updated);
                    }}
                    style={{ cursor: 'pointer', marginLeft: '2px', color: '#0052CC', fontWeight: 700 }}
                  >
                    ×
                  </span>
                </span>
              );
            })}

            {/* Label Pill */}
            {selectedLabel !== 'ALL' && (
              <span
                style={{
                  background: '#EAE6FF',
                  color: '#403294',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🏷️ Label: {selectedLabel}
                <span
                  onClick={() => {
                    setSelectedLabel('ALL');
                    loadPortfolioData(selectedBoardIds, undefined, [], selectedDateRange);
                  }}
                  style={{ cursor: 'pointer', marginLeft: '4px', color: '#403294', fontWeight: 700 }}
                >
                  ×
                </span>
              </span>
            )}

            {/* Date Range Pill */}
            {selectedDateRange !== 'all' && (
              <span
                style={{
                  background: '#E3FCEF',
                  color: '#006644',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📅 Created: Last {selectedDateRange.replace('d', ' Days')}
                <span
                  onClick={() => {
                    setSelectedDateRange('all');
                    loadPortfolioData(selectedBoardIds, undefined, selectedLabel !== 'ALL' ? [selectedLabel] : [], 'all');
                  }}
                  style={{ cursor: 'pointer', marginLeft: '4px', color: '#006644', fontWeight: 700 }}
                >
                  ×
                </span>
              </span>
            )}

            {/* Risk Pill */}
            {riskFilter !== 'ALL' && (
              <span
                style={{
                  background: '#FFEBE6',
                  color: '#BF2600',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚠️ Risk: {riskFilter.replace('_', ' ')}
                <span
                  onClick={() => setRiskFilter('ALL')}
                  style={{ cursor: 'pointer', marginLeft: '4px', color: '#BF2600', fontWeight: 700 }}
                >
                  ×
                </span>
              </span>
            )}

            <button
              onClick={() => {
                setSelectedGroup('');
                setSelectedBoardIds([]);
                setSelectedLabel('ALL');
                setSelectedDateRange('all');
                setRiskFilter('ALL');
                setEpicSearchTerm('');
                loadPortfolioData([], undefined, [], 'all');
              }}
              style={{ background: 'none', border: 'none', color: '#5E6C84', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Overview KPI Cards */}
      {overall && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div
            className="metric-card"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const issues: TraceableIssue[] = filteredEpics.map(e => ({
                key: e.key,
                summary: e.summary,
                projectName: e.projectName,
                status: e.status,
                statusCategory: e.statusCategory,
                storyPoints: e.totalStoryPoints,
              }));
              setTraceModalData({
                title: 'Traceability: Epics Overview',
                subtitle: `${filteredEpics.length} Epics currently filtered across active projects`,
                issues,
              });
            }}
          >
            <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              🎯 Epic Completion Rate (Click to trace)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0052CC', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
              {overall.epicCompletionPercentage}%
            </div>
            <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 500 }}>
              {overall.completedEpics} of {overall.totalEpics} Epics Done
            </div>
            <div style={{ background: '#EBECF0', borderRadius: '6px', height: '8px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--primary-gradient)', height: '100%', width: `${overall.epicCompletionPercentage}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <div
            className="metric-card success"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const issues: TraceableIssue[] = [];
              filteredEpics.forEach(e => {
                (e.childIssues || []).forEach(c => {
                  if (c.statusCategory === 'Done') {
                    issues.push({
                      key: c.key,
                      summary: `${c.summary} (${e.summary})`,
                      projectName: e.projectName,
                      status: c.status,
                      statusCategory: c.statusCategory,
                      storyPoints: c.storyPoints,
                      assigneeName: c.assigneeName,
                    });
                  }
                });
              });
              setTraceModalData({
                title: 'Traceability: Story Points Delivered',
                subtitle: `${overall.completedStoryPoints} Story Points delivered across completed child tasks`,
                issues,
              });
            }}
          >
            <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              ⚡ Story Points Delivered (Click to trace)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#00875A', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
              {overall.spCompletionPercentage}%
            </div>
            <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 500 }}>
              {overall.completedStoryPoints} of {overall.totalStoryPoints} SP Done
            </div>
            <div style={{ background: '#EBECF0', borderRadius: '6px', height: '8px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--success-gradient)', height: '100%', width: `${overall.spCompletionPercentage}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <div
            className="metric-card purple"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const issues: TraceableIssue[] = [];
              filteredEpics.forEach(e => {
                (e.childIssues || []).forEach(c => {
                  issues.push({
                    key: c.key,
                    summary: `${c.summary} (${e.summary})`,
                    projectName: e.projectName,
                    status: c.status,
                    statusCategory: c.statusCategory,
                    storyPoints: c.storyPoints,
                    assigneeName: c.assigneeName,
                  });
                });
              });
              setTraceModalData({
                title: 'Traceability: Active Workstream Tasks',
                subtitle: `${issues.length} total child issues across active iteration workstreams`,
                issues,
              });
            }}
          >
            <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              📊 Iteration Progress (Click to trace)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#6554C0', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
              {teamIterations.length > 0
                ? `${Math.round(teamIterations.reduce((acc, t) => acc + t.completionPercentage, 0) / teamIterations.length)}%`
                : `${overall.issueCompletionPercentage}%`}
            </div>
            <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 500 }}>
              {teamIterations.length || selectedBoardIds.length || boards.length} Active Workstreams
            </div>
            <div style={{ background: '#EBECF0', borderRadius: '6px', height: '8px', marginTop: '12px', overflow: 'hidden' }}>
              <div
                style={{
                  background: 'var(--accent-gradient)',
                  height: '100%',
                  width: `${teamIterations.length > 0 ? Math.round(teamIterations.reduce((acc, t) => acc + t.completionPercentage, 0) / teamIterations.length) : overall.issueCompletionPercentage}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          <div
            className={`metric-card ${dependencies.length > 0 ? 'warning' : 'success'}`}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const issues: TraceableIssue[] = dependencies.map(d => ({
                key: d.blockedIssueKey,
                summary: `${d.blockedIssueSummary} (Blocked on ${d.epicKey})`,
                projectName: d.teamName || 'Cross-Team',
                status: d.blockedStatus,
                assigneeName: d.assigneeName,
              }));
              setTraceModalData({
                title: 'Traceability: Dependency Links',
                subtitle: `${dependencies.length} cross-team dependency links identified`,
                issues,
              });
            }}
          >
            <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              ⚠️ Dependency Links (Click to trace)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: dependencies.length > 0 ? '#FF8B00' : '#00875A', margin: '6px 0 2px', letterSpacing: '-0.5px' }}>
              {dependencies.length}
            </div>
            <div style={{ fontSize: '13px', color: '#42526E', fontWeight: 500 }}>
              Cross-Team Dependencies Tracked
            </div>
            <div style={{ background: '#EBECF0', borderRadius: '6px', height: '8px', marginTop: '12px', overflow: 'hidden' }}>
              <div
                style={{
                  background: dependencies.length > 0 ? 'var(--warning-gradient)' : 'var(--success-gradient)',
                  height: '100%',
                  width: '100%',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs
        id="portfolio-tabs"
        selected={selectedTab}
        onChange={(index) => setSelectedTab(index)}
      >
        <TabList>
          <Tab>Epic Progress Tracker</Tab>
          <Tab>Cross-Team Iteration Progress</Tab>
          <Tab>Leadership & Delivery Insights</Tab>
          <Tab>AI Executive Intelligence</Tab>
        </TabList>

        {/* TAB 0: EPIC PROGRESS TRACKER */}
        <TabPanel>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#FAFBFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #DFE1E6' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Risk Filter */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>Risk:</span>
                  {['ALL', 'ON_TRACK', 'AT_RISK', 'CRITICAL'].map(level => (
                    <button
                      key={level}
                      onClick={() => setRiskFilter(level)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: riskFilter === level ? '1px solid #0052CC' : '1px solid #DFE1E6',
                        background: riskFilter === level ? '#DEEBFF' : '#FFFFFF',
                        color: riskFilter === level ? '#0747A6' : '#42526E',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {level.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Label Filter */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>🏷️ Label:</span>
                  <select
                    value={selectedLabel}
                    onChange={(e) => {
                      const l = e.target.value;
                      setSelectedLabel(l);
                      loadPortfolioData(selectedBoardIds, undefined, l !== 'ALL' ? [l] : [], selectedDateRange);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #C1C7D0',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#172B4D',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL">All Labels ({availableLabels.length})</option>
                    {availableLabels.map(l => (
                      <option key={l} value={l}>🏷️ {l}</option>
                    ))}
                  </select>
                </div>

                {/* Date Created Filter */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>📅 Created:</span>
                  <select
                    value={selectedDateRange}
                    onChange={(e) => {
                      const d = e.target.value;
                      setSelectedDateRange(d);
                      loadPortfolioData(selectedBoardIds, undefined, selectedLabel !== 'ALL' ? [selectedLabel] : [], d);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #C1C7D0',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#172B4D',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="14d">Last 14 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="365d">This Year (365d)</option>
                  </select>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search Epics by key, summary, label..."
                value={epicSearchTerm}
                onChange={e => setEpicSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #C1C7D0',
                  fontSize: '13px',
                  width: '240px',
                }}
              />
            </div>

            {/* Epics Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #DFE1E6', borderRadius: '8px', background: '#FFFFFF' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: '2px solid #DFE1E6' }}>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Epic Key & Summary</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Project / Teams</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Completion %</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Story Points</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Child Statuses</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84' }}>Risk Level</th>
                    <th style={{ padding: '12px 16px', color: '#5E6C84', textAlign: 'center' }}>Child Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEpics.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#5E6C84' }}>
                        No Epics found for the selected view or filter criteria. Try adjusting team selection or search.
                      </td>
                    </tr>
                  ) : (
                    filteredEpics.map(epic => (
                      <tr key={epic.key} style={{ borderBottom: '1px solid #DFE1E6' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          <JiraIssueLink issueKey={epic.key} label={epic.key} style={{ marginRight: '8px' }} />
                          <span
                            onClick={(e) => openJiraIssue(epic.key, e)}
                            style={{ cursor: 'pointer', color: '#172B4D' }}
                            title={`Open ${epic.key} in Jira`}
                          >
                            {epic.summary}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#EBECF0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                            {epic.projectName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', width: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, width: '36px' }}>{epic.spCompletionPercentage}%</span>
                            <div style={{ flex: 1, background: '#EBECF0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${epic.spCompletionPercentage}%`,
                                  background: epic.spCompletionPercentage >= 75 ? '#36B37E' : epic.spCompletionPercentage >= 40 ? '#FFAB00' : '#FF5630'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {epic.completedStoryPoints} / {epic.totalStoryPoints} SP
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <Badge appearance="added">{epic.childStatusCounts.done} Done</Badge>
                            <Badge appearance="primary">{epic.childStatusCounts.inProgress} In Prog</Badge>
                            {epic.childStatusCounts.blocked > 0 && (
                              <Badge appearance="removed">{epic.childStatusCounts.blocked} Blocked</Badge>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Tooltip content={epic.riskReasons.join(', ') || 'Epic is progressing normally'}>
                            <Badge appearance={getRiskBadgeAppearance(epic.riskLevel)}>
                              {epic.riskLevel.replace('_', ' ')}
                            </Badge>
                          </Tooltip>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Button
                            appearance="subtle"
                            spacing="compact"
                            onClick={() => setActiveEpicModal(epic)}
                          >
                            🔍 View Issues ({epic.totalChildIssues})
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <PaginationControls
                currentPage={epicCurrentPage}
                totalItems={filteredEpics.length}
                pageSize={epicPageSize}
                onPageChange={p => setEpicCurrentPage(p)}
                onPageSizeChange={s => setEpicPageSize(s)}
              />
            </div>
          </div>
        </TabPanel>

        {/* TAB 1: CROSS-TEAM ITERATION PROGRESS */}
        <TabPanel>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '20px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 8px', color: '#172B4D', fontSize: '18px' }}>
                🚀 Cross-Team Active Iteration Progress
              </h3>
              <p style={{ margin: 0, color: '#5E6C84', fontSize: '14px' }}>
                Real-time active sprint status, committed vs delivered story points, and health indicators across all selected teams.
              </p>
            </div>

            {teamIterations.length === 0 ? (
              <SectionMessage appearance="information" title="No Active Sprints Found">
                <p style={{ margin: '4px 0 0' }}>
                  No active sprints were detected for the selected teams or projects. Verify board sprint configurations or switch saved presets.
                </p>
              </SectionMessage>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {teamIterations.map(ti => (
                  <div
                    key={ti.boardId}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '10px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase' }}>
                            {ti.projectKey && (
                              <span style={{ background: '#0747A6', color: '#FFFFFF', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>
                                {ti.projectKey}
                              </span>
                            )}
                            <span>{ti.boardName}</span>
                          </div>
                          <h4 style={{ margin: '4px 0 0', fontSize: '16px', color: '#172B4D', fontWeight: 700 }}>
                            {ti.sprintName || 'No Active Sprint'}
                          </h4>
                        </div>
                        {getIterationHealthBadge(ti.health)}
                      </div>

                      {/* Dates */}
                      {ti.startDate && ti.endDate && (
                        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '16px' }}>
                          📅 {new Date(ti.startDate).toLocaleDateString()} — {new Date(ti.endDate).toLocaleDateString()}
                        </div>
                      )}

                      {/* Story Point Progress Bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#172B4D' }}>Sprint Completion</span>
                          <span style={{ fontWeight: 700, color: '#0052CC' }}>{ti.completionPercentage}%</span>
                        </div>
                        <div style={{ background: '#EBECF0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${ti.completionPercentage}%`,
                              background: ti.health === 'ON_TRACK' ? '#36B37E' : ti.health === 'AT_RISK' ? '#FFAB00' : '#FF5630',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </div>

                      {/* Metric Breakdown Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', background: '#FAFBFC', padding: '12px', borderRadius: '6px', border: '1px solid #EBECF0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600 }}>DELIVERED</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#36B37E' }}>{ti.completedStoryPoints} SP</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600 }}>IN PROGRESS</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0052CC' }}>{ti.inProgressStoryPoints} SP</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 600 }}>TOTAL COMMITTED</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D' }}>{ti.totalStoryPoints} SP</div>
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
        </TabPanel>

        {/* TAB 2: LEADERSHIP & DELIVERY INSIGHTS */}
        <TabPanel>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Leadership Executive Summary & Delivery Report */}
            <div style={{ padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: 800 }}>
                    📊 Leadership Executive Summary & Delivery Highlights
                  </h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Executive report of accomplishments, delivered milestones, active risk callouts, and key delivery timelines for the filtered period ({selectedDateRange === 'all' ? 'All Time' : `Last ${selectedDateRange}`}).
                  </p>
                </div>
                <div style={{ background: '#E3FCEF', color: '#006644', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  Report Generated: 📅 {new Date().toISOString().substring(0, 10)}
                </div>
              </div>

              {/* Accomplishment Metrics Highlights Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--table-header-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed Epics</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#36B37E', margin: '4px 0' }}>
                    {filteredEpics.filter(e => e.statusCategory === 'Done').length} / {filteredEpics.length}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Delivered across active teams</div>
                </div>

                <div style={{ background: 'var(--table-header-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Story Points Shipped</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0052CC', margin: '4px 0' }}>
                    {overall?.completedStoryPoints || 0} SP
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Out of {overall?.totalStoryPoints || 0} total committed SP</div>
                </div>

                <div style={{ background: 'var(--table-header-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Risk Callouts</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: filteredEpics.filter(e => e.riskLevel !== 'ON_TRACK').length > 0 ? '#DE350B' : '#36B37E', margin: '4px 0' }}>
                    {filteredEpics.filter(e => e.riskLevel !== 'ON_TRACK').length} Epics
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Requiring leadership review</div>
                </div>
              </div>

              {/* Key Accomplishments & Delivery Timelines Table */}
              <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>
                🎯 Key Delivered Highlights & Milestones (With Completion Timelines)
              </h4>
              <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Epic Key & Summary</th>
                      <th>Team / Workstream</th>
                      <th>Story Points Shipped</th>
                      <th>Delivery / Resolution Date</th>
                      <th>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEpics.filter(e => e.statusCategory === 'Done' || e.spCompletionPercentage > 0).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                          No completed Epics or delivered story points recorded for the selected filter period.
                        </td>
                      </tr>
                    ) : (
                      filteredEpics
                        .filter(e => e.statusCategory === 'Done' || e.spCompletionPercentage > 0)
                        .slice(0, 8)
                        .map(epic => (
                          <tr key={epic.key}>
                            <td style={{ fontWeight: 600 }}>
                              <JiraIssueLink issueKey={epic.key} label={epic.key} style={{ marginRight: '8px' }} />
                              <span>{epic.summary}</span>
                            </td>
                            <td><Badge appearance="default">{epic.projectName}</Badge></td>
                            <td style={{ fontWeight: 700, color: '#0052CC' }}>{epic.completedStoryPoints} / {epic.totalStoryPoints} SP</td>
                            <td style={{ fontWeight: 600, color: '#006644' }}>
                              📅 {epic.updatedAt ? epic.updatedAt.substring(0, 10) : new Date().toISOString().substring(0, 10)}
                            </td>
                            <td>
                              <Badge appearance={epic.statusCategory === 'Done' ? 'added' : 'primary'}>
                                {epic.statusCategory === 'Done' ? 'DELIVERED' : 'IN PROGRESS'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Identified Risks & Timeline Callouts */}
              <h4 style={{ margin: '0 0 12px', color: '#DE350B', fontSize: '15px', fontWeight: 700 }}>
                ⚠️ Delivery Risks & Blocker Audit Log (Callout for Leadership)
              </h4>
              {filteredEpics.filter(e => e.riskLevel !== 'ON_TRACK').length === 0 && dependencies.length === 0 ? (
                <div style={{ padding: '14px', background: '#E3FCEF', borderRadius: '6px', color: '#006644', fontSize: '13px', fontWeight: 600 }}>
                  ✓ Clean Delivery Record: No active blockers, unauthorized date changes, or critical risks detected across selected workstreams.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredEpics.filter(e => e.riskLevel !== 'ON_TRACK').map(epic => (
                    <div key={epic.key} style={{ padding: '12px 16px', background: '#FFEBE6', borderLeft: '4px solid #FF5630', borderRadius: '6px', fontSize: '13px', color: '#172B4D' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#BF2600' }}>
                          <JiraIssueLink issueKey={epic.key} label={epic.key} /> — {epic.summary}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#5E6C84', fontWeight: 600 }}>
                          Logged: 📅 {epic.updatedAt ? epic.updatedAt.substring(0, 10) : new Date().toISOString().substring(0, 10)}
                        </span>
                      </div>
                      <div style={{ color: '#42526E' }}>
                        <strong>Identified Risks:</strong> {epic.riskReasons.join('; ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {allocation && (
              <div style={{ padding: '24px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '18px' }}>
                  Investment Distribution (Work Allocation)
                </h3>
                <p style={{ color: '#5E6C84', fontSize: '14px', marginBottom: '20px' }}>
                  Distribution of engineering effort across Features, Tech Debt, Bugs, and Maintenance across selected teams.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#DEEBFF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#0052CC', fontWeight: 600 }}>FEATURES</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0747A6' }}>{allocation.features.percentage}%</div>
                    <div style={{ fontSize: '12px', color: '#172B4D' }}>{allocation.features.count} issues ({allocation.features.points} SP)</div>
                  </div>

                  <div style={{ padding: '16px', background: '#EAE6FF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#5243AA', fontWeight: 600 }}>TECH DEBT</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#403294' }}>{allocation.techDebt.percentage}%</div>
                    <div style={{ fontSize: '12px', color: '#172B4D' }}>{allocation.techDebt.count} issues ({allocation.techDebt.points} SP)</div>
                  </div>

                  <div style={{ padding: '16px', background: '#FFEBE6', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#DE350B', fontWeight: 600 }}>BUGS & INCIDENTS</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#BF2600' }}>{allocation.bugs.percentage}%</div>
                    <div style={{ fontSize: '12px', color: '#172B4D' }}>{allocation.bugs.count} issues ({allocation.bugs.points} SP)</div>
                  </div>

                  <div style={{ padding: '16px', background: '#E3FCEF', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#006644', fontWeight: 600 }}>MAINTENANCE</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#004B2D' }}>{allocation.maintenance.percentage}%</div>
                    <div style={{ fontSize: '12px', color: '#172B4D' }}>{allocation.maintenance.count} issues ({allocation.maintenance.points} SP)</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '24px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '18px' }}>
                Cross-Team Dependency & Blocker Radar
              </h3>

              {dependencies.length === 0 ? (
                <p style={{ color: '#5E6C84', fontSize: '14px', margin: 0 }}>
                  No active blockers or cross-team issue dependencies identified across selected Epics.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#EBECF0' }}>
                        <th style={{ padding: '10px 12px' }}>Epic / Context</th>
                        <th style={{ padding: '10px 12px' }}>Blocked Issue</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                        <th style={{ padding: '10px 12px' }}>Assignee</th>
                        <th style={{ padding: '10px 12px' }}>Dependency Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dependencies.map((dep, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #DFE1E6' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                            <JiraIssueLink issueKey={dep.epicKey} label={dep.epicKey} />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <JiraIssueLink issueKey={dep.blockedIssueKey} label={dep.blockedIssueKey} style={{ color: '#FF5630', marginRight: '6px' }} />
                            <span>: {dep.blockedIssueSummary}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}><Badge appearance="primary">{dep.blockedStatus}</Badge></td>
                          <td style={{ padding: '10px 12px' }}>{dep.assigneeName || 'Unassigned'}</td>
                          <td style={{ padding: '10px 12px', color: '#5E6C84' }}>{dep.blockReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabPanel>

        {/* TAB 3: AI EXECUTIVE INTELLIGENCE */}
        <TabPanel>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {briefing && (
              <div style={{ padding: '24px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#172B4D' }}>🤖 AI Executive Briefing</h3>
                    <Badge appearance={briefing.overallHealth === 'HEALTHY' ? 'added' : briefing.overallHealth === 'NEEDS_ATTENTION' ? 'primary' : 'removed'}>
                      {briefing.overallHealth.replace('_', ' ')}
                    </Badge>
                  </div>

                  <Button appearance="primary" onClick={handleCopyBriefing}>
                    {copied ? 'Copied to Clipboard! ✓' : 'Copy Briefing for Slack / Email'}
                  </Button>
                </div>

                <div style={{ padding: '16px', background: '#DEEBFF', borderRadius: '6px', fontSize: '15px', lineHeight: '1.6', color: '#0747A6', marginBottom: '20px' }}>
                  {briefing.summaryNarrative}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#006644', fontSize: '14px', textTransform: 'uppercase' }}>Key Highlights</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#172B4D', fontSize: '14px' }}>
                      {briefing.keyHighlights.map((h, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{h}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#BF2600', fontSize: '14px', textTransform: 'uppercase' }}>Top Identified Risks</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#172B4D', fontSize: '14px' }}>
                      {briefing.topRisks.map((r, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '6px' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#0747A6', fontSize: '14px', textTransform: 'uppercase' }}>Recommended Actions</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#172B4D', fontSize: '14px' }}>
                      {briefing.actionItems.map((a, i) => (
                        <li key={i} style={{ marginBottom: '8px' }}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabPanel>
      </Tabs>

      {/* Preset Filter Manager Modal */}
      <TeamPresetManager
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        availableBoards={boards}
        savedPresets={teamGroups}
        selectedBoardIds={selectedBoardIds}
        onSelectPreset={handleSelectPreset}
        onApplyCustomSelection={handleApplyCustomSelection}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
      />

      {/* Child Issues Drilldown Modal */}
      <EpicChildIssuesModal
        epic={activeEpicModal}
        onClose={() => setActiveEpicModal(null)}
      />

      {/* KPI Traceability Modal */}
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
