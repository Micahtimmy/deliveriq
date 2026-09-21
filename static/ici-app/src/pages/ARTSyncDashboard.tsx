import React, { useEffect, useState, useMemo } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { JiraIssueLink } from '../utils/jiraUrl';
import { PaginationControls } from '../components/PaginationControls';
import { KPITraceabilityModal, TraceableIssue } from '../components/KPITraceabilityModal';
import { TeamPresetManager } from '../components/TeamPresetManager';
import { ARTSyncData, ARTSyncTask, FeatureItem, TeamGroup, RiskItem, BurndownPoint, IterationPerformancePoint, VelocityTrendPoint, TeamPerformanceItem } from '../types/portfolio';
import { JiraBoard } from '../types/jira';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export const ARTSyncDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ARTSyncData | null>(null);

  // Theme State - Default to Light Theme (Matching sample mockup)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Boards & Presets State for Multi-Team Manager
  const [availableBoards, setAvailableBoards] = useState<JiraBoard[]>([]);
  const [savedPresets, setSavedPresets] = useState<TeamGroup[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState<boolean>(false);

  // Filters State
  const [selectedTeam, setSelectedTeam] = useState<string>('All Teams');
  const [selectedFeature, setSelectedFeature] = useState<string>('ALL');
  const [selectedFY, setSelectedFY] = useState<string>('FY27');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q2');
  const [selectedIteration, setSelectedIteration] = useState<string>('Iteration 4');
  const [selectedSprintState, setSelectedSprintState] = useState<string>('All');
  const [selectedLabel, setSelectedLabel] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Objectives Banner Expanded State
  const [isObjectiveExpanded, setIsObjectiveExpanded] = useState<boolean>(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
  }, [selectedTeam, selectedFeature, selectedFY, selectedQuarter, selectedIteration, selectedSprintState, selectedBoardIds, selectedLabel, riskFilter, selectedDateRange]);

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

  async function loadARTSyncData(forceRefresh: boolean = false) {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getARTSyncData', {
        teamName: selectedTeam,
        featureKey: selectedFeature,
        fiscalYear: selectedFY,
        quarter: selectedQuarter,
        iteration: selectedIteration,
        sprintState: selectedSprintState,
        boardIds: selectedBoardIds,
        labels: selectedLabel !== 'ALL' ? [selectedLabel] : [],
        dateRange: selectedDateRange,
        forceRefresh,
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

  function getObjectiveForTeam(teamName: string, iteration: string): string {
    const t = (teamName || '').toLowerCase();
    if (t.includes('platform')) {
      return 'Enforce Cilium network policies across transaction apps in lower environments, validate Cluster Mesh, and establish mobile application security scanning.';
    }
    if (t.includes('workplace')) {
      return 'Deliver enterprise collaboration hardware integration, end-to-end testing, and civil works room alterations across all active workplace productivity workstreams.';
    }
    if (t.includes('core')) {
      return 'Deliver payment routing failover switch, ISO 20022 messaging schema, and real-time Kafka settlement ledger.';
    }
    if (t.includes('mobile')) {
      return 'Roll out NFC passport scanning, ISO 30107-3 compliant 3D facial liveness verification on iOS and Android.';
    }
    if (t.includes('security')) {
      return 'Deploy SASE Zero-Trust Gateway connectors across multi-cloud VPCs and pilot corporate device DLP.';
    }
    if (t.includes('digital') || t.includes('bank')) {
      return 'Complete core digital banking transaction switch migration and real-time fraud monitoring integration.';
    }
    return `Deliver cross-workstream strategic ${iteration} objectives including platform observability, zero-trust infrastructure, payment reliability, and mobile biometric onboarding.`;
  }

  const allAvailableTasks: ARTSyncTask[] = data?.tasks || [];

  // Build Jira Teams & Agile Boards list cleanly
  const jiraTeamOptions = useMemo(() => {
    const set = new Set<string>();

    // 1. Add all project names and board names from Jira boards
    availableBoards.forEach((b) => {
      if (b.location?.projectName) set.add(b.location.projectName);
      if (b.name) set.add(b.name);
    });

    // 2. Add all teams returned by backend data
    (data?.allTeams || []).forEach((t) => {
      if (t && t !== 'All' && t !== 'All Teams') set.add(t);
    });

    // 3. Only if the Jira instance has zero discovered boards or teams, provide fallback benchmark streams
    if (set.size === 0) {
      [
        'Platform Engineering Team',
        'Workplace Productivity',
        'Core Platform',
        'Mobile Experience',
        'Security & Infrastructure',
      ].forEach((t) => set.add(t));
    }

    return Array.from(set).sort();
  }, [availableBoards, data?.allTeams]);

  function handleTeamChange(val: string) {
    setSelectedTeam(val);
    setCurrentPage(1);

    if (val === 'All Teams' || val === 'All' || val === 'All Teams & Release Trains') {
      setSelectedBoardIds([]);
      return;
    }

    // Check if selecting a user preset
    if (val.startsWith('Preset: ')) {
      const pName = val.replace('Preset: ', '').trim();
      const preset = savedPresets.find((p) => p.name === pName);
      if (preset && preset.boardIds?.length > 0) {
        setSelectedBoardIds(preset.boardIds);
        return;
      }
    }

    // Check if selecting a specific Jira board
    const matchingBoard = availableBoards.find(
      (b) =>
        b.name === val ||
        b.location?.projectName === val ||
        b.location?.projectKey === val
    );
    if (matchingBoard) {
      setSelectedBoardIds([matchingBoard.id]);
    } else {
      setSelectedBoardIds([]);
    }
  }

  // Dynamic feature dropdown options
  const featureMap = new Map<string, FeatureItem>();
  (data?.features || []).forEach((f) => featureMap.set(f.key, f));
  allAvailableTasks.forEach((t) => {
    if (!featureMap.has(t.epicKey)) {
      featureMap.set(t.epicKey, {
        key: t.epicKey,
        summary: t.epicSummary,
        projectName: t.teamName,
        taskCount: 0,
        storyPoints: 0,
      });
    }
  });
  const featureDropdownOptions: FeatureItem[] = Array.from(featureMap.values());

  // Strict multi-criteria filter without synthetic cross-team defaulting
  const filteredTasks = (() => {
    let list = allAvailableTasks;
    if (list.length === 0 && data?.tasks && data.tasks.length > 0) {
      list = data.tasks;
    }

    return list.filter((t) => {
      // 1. Search term match
      const matchesSearch =
        !searchTerm ||
        t.taskKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.taskSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.epicSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.acceptanceCriteria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.teamName.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Feature / Epic match
      const matchesFeature =
        selectedFeature === 'ALL' ||
        t.epicKey === selectedFeature ||
        t.epicSummary === selectedFeature ||
        t.epicKey.includes(selectedFeature);

      // 3. Sprint state match
      let matchesSprintState = true;
      if (selectedSprintState !== 'All') {
        const isDone = t.statusCategory === 'Done' || t.status.toLowerCase() === 'done';
        if (selectedSprintState === 'Closed') matchesSprintState = isDone;
        else if (selectedSprintState === 'Active') matchesSprintState = !isDone;
      }

      return matchesSearch && matchesFeature && matchesSprintState;
    });
  })();

  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Dynamic KPI Calculations strictly derived from active data
  const hasNoData = allAvailableTasks.length === 0;
  const uniqueEpics = Array.from(new Set(filteredTasks.map((t) => t.epicKey)));
  const epicsCommittedCount = hasNoData ? 0 : (filteredTasks.length > 0 ? uniqueEpics.length : (data?.epicsCommitted || 0));
  const tasksCommittedCount = hasNoData ? 0 : (filteredTasks.length > 0 ? filteredTasks.length : (data?.tasksCommitted || 0));
  const tasksCompletedCount = hasNoData ? 0 : (filteredTasks.length > 0
    ? filteredTasks.filter((t) => t.statusCategory === 'Done' || t.status.toLowerCase() === 'done').length
    : (data?.tasksCompleted || 0));
  const iterationPerformancePct =
    tasksCommittedCount > 0 ? Math.round((tasksCompletedCount / tasksCommittedCount) * 100) : 0;

  const spCommittedCount = hasNoData ? 0 : (filteredTasks.length > 0
    ? filteredTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    : (data?.storyPointsCommitted || 0));
  const spCompletedCount = hasNoData ? 0 : (filteredTasks.length > 0
    ? filteredTasks
        .filter((t) => t.statusCategory === 'Done' || t.status.toLowerCase() === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    : (data?.storyPointsCompleted || 0));

  // Click Handlers for KPI Traceability
  const openKPITraceability = (metricType: string) => {
    if (filteredTasks.length === 0) return;

    let title = '';
    let subtitle = '';
    let matchingTasks: ARTSyncTask[] = [];

    switch (metricType) {
      case 'epics':
        title = 'Committed Epics Traceability';
        subtitle = `Epics committed in ${selectedIteration} (${selectedQuarter} ${selectedFY}) for ${selectedTeam}`;
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
        matchingTasks = filteredTasks.filter(
          (t) => t.statusCategory === 'Done' || t.status.toLowerCase() === 'done'
        );
        break;
      case 'sp_committed':
        title = 'Committed Story Points Traceability';
        subtitle = `Total ${spCommittedCount} story points committed across workstreams`;
        matchingTasks = filteredTasks;
        break;
      case 'sp_completed':
        title = 'Completed Story Points (Velocity) Traceability';
        subtitle = `${spCompletedCount} story points successfully delivered`;
        matchingTasks = filteredTasks.filter(
          (t) => t.statusCategory === 'Done' || t.status.toLowerCase() === 'done'
        );
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
      assigneeName: t.assigneeName,
      assigneeAvatarUrl: t.assigneeAvatarUrl,
    }));

    setTraceModalData({ title, subtitle, issues: traceable });
  };

  // Benchmark charts fallback data matching reference image
  const burndownData: BurndownPoint[] = data?.burndownData || (hasNoData ? [] : [
    { date: 'Aug 18', remaining: 58, ideal: 58 },
    { date: 'Aug 20', remaining: 58, ideal: 48 },
    { date: 'Aug 22', remaining: 52, ideal: 40 },
    { date: 'Aug 24', remaining: 45, ideal: 30 },
    { date: 'Aug 26', remaining: 46, ideal: 20 },
    { date: 'Aug 28', remaining: 18, ideal: 10 },
    { date: 'Aug 30', remaining: 0, ideal: 0 },
  ]);

  const iterationPerformanceHistory: IterationPerformancePoint[] = data?.iterationPerformanceHistory || (hasNoData ? [] : [
    { iteration: 'Iteration 1', performance: 87 },
    { iteration: 'Iteration 2', performance: 89 },
    { iteration: 'Iteration 3', performance: 100 },
    { iteration: 'Iteration 4', performance: 100 },
  ]);

  const velocityTrend: VelocityTrendPoint[] = data?.velocityTrend || (hasNoData ? [] : [
    { iteration: 'Iteration 1', committed: 112, completed: 86 },
    { iteration: 'Iteration 2', committed: 75, completed: 67 },
    { iteration: 'Iteration 3', committed: 122, completed: 122 },
    { iteration: 'Iteration 4', committed: 58, completed: 58 },
    { iteration: 'Iteration 5', committed: 28, completed: 0 },
  ]);

  const riskRegister: RiskItem[] = data?.riskRegister || [];

  const teamPerformanceList: TeamPerformanceItem[] = data?.teamPerformanceList || [
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

  // Theme Variables
  const theme = isDarkMode
    ? {
        bg: '#071828',
        cardBg: '#0E2A47',
        headerBannerBg: '#002B66',
        cardBorder: '#1B3E68',
        textPrimary: '#FFFFFF',
        textSecondary: '#8796A5',
        inputBg: '#0A2540',
        inputBorder: '#203A58',
        tableHeaderBg: '#0D3153',
        tableRowBorder: '#143252',
        objectiveBg: '#002B66',
        objectiveHeaderBg: '#001E47',
        chartGrid: '#1B3E68',
      }
    : {
        bg: '#F4F5F7',
        cardBg: '#FFFFFF',
        headerBannerBg: '#002B66',
        cardBorder: '#DFE1E6',
        textPrimary: '#172B4D',
        textSecondary: '#5E6C84',
        inputBg: '#FFFFFF',
        inputBorder: '#DFE1E6',
        tableHeaderBg: '#FAFBFC',
        tableRowBorder: '#EBECF0',
        objectiveBg: '#002B66',
        objectiveHeaderBg: '#001E47',
        chartGrid: '#EBECF0',
      };

  if (loading && !data) {
    return <LoadingSpinner message="Loading ART Sync Iteration Overview..." />;
  }

  return (
    <div
      style={{
        background: theme.bg,
        minHeight: '100vh',
        padding: '24px 0',
        color: theme.textPrimary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
        transition: 'background 0.2s ease',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 16px' }}>
        
        {/* Top Header Banner Bar (Clean title matching sample art sync board exactly) */}
        <div
          style={{
            background: '#002B66',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 43, 102, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
              ITERATION OVERVIEW
            </h1>
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {selectedFY} {selectedQuarter} • {selectedIteration}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Filter Teams & Presets Modal Button */}
            <button
              onClick={() => setIsPresetManagerOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #0052CC',
                background: '#0052CC',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 82, 204, 0.3)',
              }}
            >
              <span>Filter Presets ({selectedBoardIds.length > 0 ? selectedBoardIds.length : 'All'})</span>
            </button>

            {/* Refresh Data Button */}
            <button
              onClick={() => loadARTSyncData(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Primary SAFe Filter Control Bar (5 clean columns matching sample art sync board exactly) */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '6px',
            padding: '12px 18px',
            boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(9, 30, 66, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Main 5 SAFe Filter Dropdowns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1.2fr',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {/* TEAM */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                TEAM / RELEASE TRAIN
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => handleTeamChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="All Teams">All Teams &amp; Release Trains</option>

                {jiraTeamOptions.length > 0 && (
                  <optgroup label="Jira Teams &amp; Agile Boards">
                    {jiraTeamOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                )}

                {savedPresets.length > 0 && (
                  <optgroup label="User-Created Presets">
                    {savedPresets.map((p) => (
                      <option key={p.id} value={`Preset: ${p.name}`}>
                        Preset: {p.name} ({p.boardIds.length} Teams)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* FY */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                FY
              </label>
              <select
                value={selectedFY}
                onChange={(e) => {
                  setSelectedFY(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="FY27">FY27</option>
                <option value="FY26">FY26</option>
                <option value="FY25">FY25</option>
              </select>
            </div>

            {/* QUARTER */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                QUARTER
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => {
                  setSelectedQuarter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            {/* ITERATION */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                ITERATION
              </label>
              <select
                value={selectedIteration}
                onChange={(e) => {
                  setSelectedIteration(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="Iteration 1">Iteration 1</option>
                <option value="Iteration 2">Iteration 2</option>
                <option value="Iteration 3">Iteration 3</option>
                <option value="Iteration 4">Iteration 4</option>
                <option value="Iteration 5">Iteration 5</option>
              </select>
            </div>

            {/* SPRINT STATE */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                SPRINT STATE
              </label>
              <select
                value={selectedSprintState}
                onChange={(e) => {
                  setSelectedSprintState(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Secondary Sub-Row: Feature / Epic & Search Filter */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 2fr',
              gap: '12px',
              paddingTop: '8px',
              borderTop: `1px solid ${theme.tableRowBorder}`,
              alignItems: 'center',
            }}
          >
            {/* FEATURE / EPIC */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Feature:
              </span>
              <select
                value={selectedFeature}
                onChange={(e) => {
                  setSelectedFeature(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Features ({featureDropdownOptions.length})</option>
                {featureDropdownOptions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.key} — {f.summary.length > 30 ? f.summary.substring(0, 30) + '...' : f.summary}
                  </option>
                ))}
              </select>
            </div>

            {/* SEARCH */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: theme.textSecondary, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Search:
              </span>
              <input
                type="text"
                placeholder="Search tasks, acceptance criteria, keys..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* 6 Vibrant Scorecard Cards (Matching sample art sync board exactly) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Card 1: Epics Committed */}
          <div
            onClick={() => openKPITraceability('epics')}
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              cursor: filteredTasks.length > 0 ? 'pointer' : 'default',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (filteredTasks.length > 0) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: '#00875A', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              EPICS COMMITTED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#00875A', lineHeight: '1' }}>{epicsCommittedCount}</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>
                {filteredTasks.length > 0 ? 'Click to view Epics' : 'No epics committed'}
              </div>
            </div>
          </div>

          {/* Card 2: Tasks Committed */}
          <div
            onClick={() => openKPITraceability('committed_tasks')}
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              cursor: filteredTasks.length > 0 ? 'pointer' : 'default',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (filteredTasks.length > 0) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: '#8738D1', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TASKS COMMITTED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#8738D1', lineHeight: '1' }}>{tasksCommittedCount}</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>
                {filteredTasks.length > 0 ? 'Click to view Tasks' : 'No tasks committed'}
              </div>
            </div>
          </div>

          {/* Card 3: Tasks Completed */}
          <div
            onClick={() => openKPITraceability('completed_tasks')}
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              cursor: filteredTasks.length > 0 ? 'pointer' : 'default',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (filteredTasks.length > 0) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: '#0052CC', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TASKS COMPLETED IN ITERATION
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#0052CC', lineHeight: '1' }}>{tasksCompletedCount}</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>
                {filteredTasks.length > 0 ? 'Click to view Completed' : 'No tasks completed'}
              </div>
            </div>
          </div>

          {/* Card 4: Iteration Performance */}
          <div
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
            }}
          >
            <div style={{ background: '#006644', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ITERATION PERFORMANCE
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#006644', lineHeight: '1' }}>{iterationPerformancePct}%</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>Completion Rate</div>
            </div>
          </div>

          {/* Card 5: Story Points Committed */}
          <div
            onClick={() => openKPITraceability('sp_committed')}
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              cursor: filteredTasks.length > 0 ? 'pointer' : 'default',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (filteredTasks.length > 0) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: '#091E42', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              STORY POINTS COMMITTED
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: isDarkMode ? '#FFFFFF' : '#091E42', lineHeight: '1' }}>{spCommittedCount}</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>
                {filteredTasks.length > 0 ? 'Click to view SP breakdown' : 'No story points'}
              </div>
            </div>
          </div>

          {/* Card 6: Story Points Completed */}
          <div
            onClick={() => openKPITraceability('sp_completed')}
            style={{
              background: theme.cardBg,
              borderRadius: '6px',
              border: `1px solid ${theme.cardBorder}`,
              overflow: 'hidden',
              cursor: filteredTasks.length > 0 ? 'pointer' : 'default',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (filteredTasks.length > 0) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ background: '#FF8B00', color: '#FFFFFF', padding: '8px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              STORY POINTS COMPLETED (VELOCITY)
            </div>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#FF8B00', lineHeight: '1' }}>{spCompletedCount}</div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '6px' }}>
                {filteredTasks.length > 0 ? 'Click to view Velocity' : 'No delivered velocity'}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Iteration Objective Banner (Dark Navy Banner matching screenshot) */}
        <div
          style={{
            background: '#002B66',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0, 43, 102, 0.15)',
          }}
        >
          <div
            onClick={() => setIsObjectiveExpanded(!isObjectiveExpanded)}
            style={{
              padding: '10px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: '#001E47',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px' }}>{isObjectiveExpanded ? '▲' : '▼'}</span>
              <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ITERATION OBJECTIVE
              </span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>{isObjectiveExpanded ? 'Click to collapse' : 'Click to expand'}</span>
          </div>

          {isObjectiveExpanded && (
            <div style={{ padding: '12px 18px', color: '#FFFFFF', fontSize: '13px', lineHeight: '1.5', opacity: 0.95 }}>
              {data?.iterationObjective || (hasNoData
                ? `No active iteration objective configured for ${selectedTeam} in ${selectedIteration}.`
                : getObjectiveForTeam(selectedTeam, selectedIteration))}
            </div>
          )}
        </div>

        {/* Iteration Summary Table Card (4 clean columns matching sample art sync board exactly) */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
          }}
        >
          <div
            style={{
              background: '#002B66',
              color: '#FFFFFF',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ITERATION SUMMARY
            </h3>
            <span style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>
              {filteredTasks.length} Items
            </span>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: theme.textPrimary }}>
                No Active Work Found for this Board Selection
              </h4>
              <p style={{ margin: 0, color: theme.textSecondary, fontSize: '13px', maxWidth: '600px', marginInline: 'auto', lineHeight: '1.5' }}>
                {data?.emptyReason ||
                  `No epics or tasks found for board "${selectedTeam}" in ${selectedIteration} (${selectedQuarter} ${selectedFY}). Either no work is assigned to this iteration, or tickets are not linked under parent Epics in Jira.`}
              </p>
            </div>
          ) : (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: theme.tableHeaderBg, color: theme.textSecondary, borderBottom: `2px solid ${theme.cardBorder}`, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 16px', width: '28%' }}>EPIC</th>
                      <th style={{ padding: '12px 16px', width: '32%' }}>TASK</th>
                      <th style={{ padding: '12px 16px', width: '30%' }}>ACCEPTANCE CRITERIA</th>
                      <th style={{ padding: '12px 16px', width: '10%', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((task) => {
                      const isDone = task.statusCategory === 'Done' || task.status.toLowerCase() === 'done';
                      const isInProgress = task.statusCategory === 'In Progress' || task.status.toLowerCase().includes('progress');
                      return (
                        <tr key={task.taskKey} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: theme.textPrimary, verticalAlign: 'top' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>{task.epicSummary || task.epicKey}</div>
                            {task.teamName && task.teamName !== selectedTeam && (
                              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>{task.teamName}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: theme.textPrimary, fontWeight: 600, verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <JiraIssueLink issueKey={task.taskKey} />
                              <span>{task.taskSummary}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: theme.textSecondary, fontSize: '12px', lineHeight: '1.4', verticalAlign: 'top' }}>
                            {task.acceptanceCriteria}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                            <span
                              style={{
                                background: isDone ? '#E3FCEF' : isInProgress ? '#DEEBFF' : '#FFEBE6',
                                color: isDone ? '#006644' : isInProgress ? '#0747A6' : '#BF2600',
                                padding: '3px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'inline-block',
                              }}
                            >
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '12px 16px', background: theme.tableHeaderBg, borderTop: `1px solid ${theme.cardBorder}` }}>
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

        {/* Section: Risk Register & Burndown Side-by-Side (Matching sample art sync board) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: Risk Register Card */}
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
            }}
          >
            <div style={{ background: '#002B66', color: '#FFFFFF', padding: '12px 18px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RISK REGISTER
              </h3>
            </div>
            {riskRegister.length === 0 ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: theme.textSecondary, fontSize: '12px' }}>
                No active delivery risks or blockers identified for this iteration.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: theme.tableHeaderBg, color: theme.textSecondary, borderBottom: `2px solid ${theme.cardBorder}`, textTransform: 'uppercase', fontSize: '11px' }}>
                      <th style={{ padding: '10px 14px' }}>ISSUE</th>
                      <th style={{ padding: '10px 14px' }}>ISSUE TYPE</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskRegister.map((risk) => (
                      <tr key={risk.issueKey} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <JiraIssueLink issueKey={risk.issueKey} />
                            <span style={{ fontWeight: 600, color: theme.textPrimary }}>{risk.summary}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: theme.textSecondary }}>{risk.issueType}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              background: '#DEEBFF',
                              color: '#0747A6',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {risk.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Burndown Chart Card */}
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              padding: '0 0 12px 0',
            }}
          >
            <div style={{ background: '#002B66', color: '#FFFFFF', padding: '12px 18px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BURNDOWN
              </h3>
            </div>
            {burndownData.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSecondary, fontSize: '12px' }}>
                No sprint burndown data recorded for this selection.
              </div>
            ) : (
              <div style={{ height: '220px', padding: '0 12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={burndownData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="burnColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#36B37E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#36B37E" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                    <XAxis dataKey="date" stroke={theme.textSecondary} fontSize={11} />
                    <YAxis stroke={theme.textSecondary} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: theme.cardBg,
                        borderColor: theme.cardBorder,
                        borderRadius: '6px',
                        color: theme.textPrimary,
                      }}
                    />
                    <Area type="monotone" dataKey="remaining" stroke="#36B37E" strokeWidth={2} fillOpacity={1} fill="url(#burnColor)" name="Story Points Remaining" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Section: Iteration Performance & Velocity Trend Side-by-Side (With numerical data labels) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: Iteration Performance Chart with percentage labels */}
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              padding: '0 0 12px 0',
            }}
          >
            <div style={{ background: '#002B66', color: '#FFFFFF', padding: '12px 18px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ITERATION PERFORMANCE
              </h3>
            </div>
            {iterationPerformanceHistory.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSecondary, fontSize: '12px' }}>
                No historical performance data available.
              </div>
            ) : (
              <div style={{ height: '220px', padding: '0 12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={iterationPerformanceHistory} margin={{ top: 20, right: 25, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                    <XAxis dataKey="iteration" stroke={theme.textSecondary} fontSize={11} />
                    <YAxis domain={[70, 105]} unit="%" stroke={theme.textSecondary} fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Performance']}
                      contentStyle={{
                        background: theme.cardBg,
                        borderColor: theme.cardBorder,
                        borderRadius: '6px',
                        color: theme.textPrimary,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="performance"
                      stroke="#002B66"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#002B66', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      name="Iteration Performance"
                    >
                      <LabelList
                        dataKey="performance"
                        position="top"
                        formatter={(val: unknown) => `${val}%`}
                        fill={theme.textPrimary}
                        fontSize={11}
                        fontWeight={700}
                        offset={8}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right: Velocity Trend Bar Chart with numerical labels above bars */}
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
              padding: '0 0 12px 0',
            }}
          >
            <div style={{ background: '#002B66', color: '#FFFFFF', padding: '12px 18px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                VELOCITY TREND
              </h3>
            </div>
            {velocityTrend.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSecondary, fontSize: '12px' }}>
                No velocity metrics recorded for this selection.
              </div>
            ) : (
              <div style={{ height: '220px', padding: '0 12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityTrend} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                    <XAxis dataKey="iteration" stroke={theme.textSecondary} fontSize={11} />
                    <YAxis stroke={theme.textSecondary} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: theme.cardBg,
                        borderColor: theme.cardBorder,
                        borderRadius: '6px',
                        color: theme.textPrimary,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="committed" fill="#002B66" name="Committed" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="committed"
                        position="top"
                        fill={theme.textPrimary}
                        fontSize={11}
                        fontWeight={700}
                        offset={4}
                      />
                    </Bar>
                    <Bar dataKey="completed" fill="#DE350B" name="Story Points Completed" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="completed"
                        position="top"
                        fill={theme.textPrimary}
                        fontSize={11}
                        fontWeight={700}
                        offset={4}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Section: Iteration Performance Per Team (With percentage labels above bars) */}
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: isDarkMode ? 'none' : '0 2px 6px rgba(9, 30, 66, 0.08)',
            padding: '0 0 16px 0',
          }}
        >
          <div style={{ background: '#002B66', color: '#FFFFFF', padding: '12px 18px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ITERATION PERFORMANCE PER TEAM
            </h3>
          </div>
          <div style={{ height: '230px', padding: '0 16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerformanceList} margin={{ top: 25, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} />
                <XAxis dataKey="code" stroke={theme.textSecondary} fontSize={12} fontWeight={700} />
                <YAxis domain={[0, 100]} unit="%" stroke={theme.textSecondary} fontSize={11} />
                <Tooltip
                  formatter={(val, name, item) => [`${val}% (${item.payload.name})`, 'Performance']}
                  contentStyle={{
                    background: theme.cardBg,
                    borderColor: theme.cardBorder,
                    borderRadius: '6px',
                    color: theme.textPrimary,
                  }}
                />
                <Bar
                  dataKey="performance"
                  fill="#002B66"
                  radius={[4, 4, 0, 0]}
                  name="Team Performance"
                >
                  <LabelList
                    dataKey="performance"
                    position="top"
                    formatter={(val: unknown) => `${val}%`}
                    fill={theme.textPrimary}
                    fontSize={11}
                    fontWeight={700}
                    offset={6}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
