import React, { useEffect, useState, useMemo } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import SectionMessage from '@atlaskit/section-message';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { JiraBoard, JiraSprint } from '../types/jira';
import { DimensionWeights, TeamScoreResult } from '../types/scoring';

interface TeamSelectorProps {
  onScoresLoaded: (result: TeamScoreResult, storyPointsField: string, approverId: string) => void;
  onGoToSettings: () => void;
}

interface SelectOption {
  label: string;
  value: number;
}

type TimelinePreset = '14d' | '30d' | '60d' | '90d' | '180d' | 'custom';

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  onScoresLoaded,
  onGoToSettings,
}) => {
  const [loading, setLoading] = useState(true);
  const [fetchingScores, setFetchingScores] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [storyPointsField, setStoryPointsField] = useState<string>('customfield_10016');
  const [weights, setWeights] = useState<DimensionWeights | undefined>(undefined);
  const [selectedBoardOpt, setSelectedBoardOpt] = useState<SelectOption | null>(null);

  // Scrum Sprint Range State
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [fromSprint, setFromSprint] = useState<SelectOption | null>(null);
  const [toSprint, setToSprint] = useState<SelectOption | null>(null);

  // Evaluation Mode: 'sprint' or 'timeline'
  const [evalMode, setEvalMode] = useState<'sprint' | 'timeline'>('sprint');

  // Kanban / Timeline Date Range State
  const [timelinePreset, setTimelinePreset] = useState<TimelinePreset>('30d');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [authorizedApproverId, setAuthorizedApproverId] = useState<string>('');
  const [dismissedApproverWarning, setDismissedApproverWarning] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Concurrently load Settings & Boards
      const [settingsRes, boardsRes] = await Promise.all([
        invoke('getSettings') as Promise<{
          success: boolean;
          data?: { authorizedApproverId?: string; storyPointsField?: string; weights?: DimensionWeights };
          error?: string;
        }>,
        invoke('getBoards') as Promise<{
          success: boolean;
          data?: { boards: JiraBoard[]; storyPointsField: string };
          error?: string;
        }>,
      ]);

      if (settingsRes.success && settingsRes.data) {
        if (settingsRes.data.authorizedApproverId) {
          setAuthorizedApproverId(settingsRes.data.authorizedApproverId);
        }
        if (settingsRes.data.weights) {
          setWeights(settingsRes.data.weights);
        }
      }

      if (!boardsRes.success || !boardsRes.data) {
        throw new Error(boardsRes.error || 'Failed to fetch Jira boards');
      }

      const fetchedBoards = boardsRes.data.boards || [];
      setBoards(fetchedBoards);
      setStoryPointsField(settingsRes.data?.storyPointsField || boardsRes.data.storyPointsField || 'customfield_10016');

      // Pre-select first board
      if (fetchedBoards.length > 0) {
        const firstBoard = fetchedBoards[0];
        const firstBoardOpt = { label: firstBoard.name, value: firstBoard.id };
        setSelectedBoardOpt(firstBoardOpt);
        handleBoardChange(firstBoardOpt, fetchedBoards);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // Selected board object lookup
  const currentBoardObj = useMemo(() => {
    if (!selectedBoardOpt) return null;
    return boards.find(b => b.id === selectedBoardOpt.value) || null;
  }, [boards, selectedBoardOpt]);

  const isKanbanOrSpace = useMemo(() => {
    if (!currentBoardObj) return false;
    const type = (currentBoardObj.type || '').toLowerCase();
    return currentBoardObj.id < 0 || type === 'kanban' || type === 'project' || type === 'simple';
  }, [currentBoardObj]);

  function handlePresetChange(preset: TimelinePreset) {
    setTimelinePreset(preset);
    const today = new Date().toISOString().split('T')[0];
    setEndDate(today);

    if (preset === '14d') {
      const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (preset === '30d') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (preset === '60d') {
      const d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (preset === '90d') {
      const d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(d);
    } else if (preset === '180d') {
      const d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(d);
    }
  }

  async function handleBoardChange(option: SelectOption | null, allBoards: JiraBoard[] = boards) {
    setSelectedBoardOpt(option);
    setSprints([]);
    setFromSprint(null);
    setToSprint(null);
    setError(null);

    if (!option) return;

    const boardObj = allBoards.find(b => b.id === option.value);
    const bType = (boardObj?.type || '').toLowerCase();
    const isKanban = option.value < 0 || bType === 'kanban' || bType === 'project' || bType === 'simple';

    if (isKanban) {
      setEvalMode('timeline');
      return;
    }

    setLoadingSprints(true);
    try {
      const sprintsRes = (await invoke('getSprints', { boardId: option.value })) as {
        success: boolean;
        data?: JiraSprint[];
        error?: string;
      };

      const fetchedSprints = sprintsRes.data || [];
      setSprints(fetchedSprints);

      if (fetchedSprints.length === 0) {
        // Fall back to timeline mode if board has no closed/active sprints
        setEvalMode('timeline');
      } else {
        setEvalMode('sprint');
        const sprintOptions: SelectOption[] = fetchedSprints.map(s => ({
          label: s.name,
          value: s.id,
        }));

        if (sprintOptions.length > 0) {
          const defaultTo = sprintOptions[0];
          const defaultFrom =
            sprintOptions.length >= 3 ? sprintOptions[2] : sprintOptions[sprintOptions.length - 1];
          setToSprint(defaultTo);
          setFromSprint(defaultFrom);
        }
      }
    } catch (e) {
      console.warn('Could not load sprints for board:', e);
      setEvalMode('timeline');
    } finally {
      setLoadingSprints(false);
    }
  }

  async function handleLoadScores() {
    if (!selectedBoardOpt) return;

    setFetchingScores(true);
    setError(null);

    try {
      const boardObj = currentBoardObj;
      const bType = (boardObj?.type || '').toLowerCase();
      const isSpace = boardObj?.id ? boardObj.id < 0 : false;
      const boardType = isSpace ? 'space' : bType === 'kanban' ? 'kanban' : 'scrum';
      const pKey = boardObj?.location?.projectKey;

      if (evalMode === 'sprint' && fromSprint && toSprint) {
        const fromIdx = sprints.findIndex(s => s.id === fromSprint.value);
        const toIdx = sprints.findIndex(s => s.id === toSprint.value);

        const start = Math.min(fromIdx >= 0 ? fromIdx : 0, toIdx >= 0 ? toIdx : 0);
        const end = Math.max(fromIdx >= 0 ? fromIdx : 0, toIdx >= 0 ? toIdx : 0);
        const selectedSprintObjs = sprints.slice(start, end + 1);

        const sprintIds = selectedSprintObjs.map(s => s.id);
        const sprintNames = selectedSprintObjs.map(s => s.name);
        const evalPeriod = sprintNames.length === 1 ? sprintNames[0] : `${sprintNames[0]} – ${sprintNames[sprintNames.length - 1]}`;

        const scoresRes = (await invoke('getTeamScores', {
          boardId: selectedBoardOpt.value,
          boardName: selectedBoardOpt.label,
          boardType,
          sprintIds,
          sprintNames,
          evaluationPeriod: evalPeriod,
          projectKey: pKey,
          storyPointsField,
          authorizedApproverId,
          weights,
        })) as {
          success: boolean;
          data?: TeamScoreResult;
          error?: string;
        };

        if (!scoresRes.success || !scoresRes.data) {
          throw new Error(scoresRes.error || 'Failed to compute team scores');
        }

        onScoresLoaded(scoresRes.data, storyPointsField, authorizedApproverId);
      } else {
        // Timeline & Calendar Date Range Mode (Kanban or Space or Custom Scrum Date Range)
        const dateRangeObj = { startDate, endDate };
        const evalPeriod = `${startDate} to ${endDate}`;

        const scoresRes = (await invoke('getTeamScores', {
          boardId: selectedBoardOpt.value,
          boardName: selectedBoardOpt.label,
          boardType,
          sprintIds: [],
          sprintNames: [],
          dateRange: dateRangeObj,
          evaluationPeriod: evalPeriod,
          projectKey: pKey,
          storyPointsField,
          authorizedApproverId,
          weights,
        })) as {
          success: boolean;
          data?: TeamScoreResult;
          error?: string;
        };

        if (!scoresRes.success || !scoresRes.data) {
          throw new Error(scoresRes.error || 'Failed to compute team scores for date range');
        }

        onScoresLoaded(scoresRes.data, storyPointsField, authorizedApproverId);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setFetchingScores(false);
    }
  }

  // Calculate day difference for display
  const totalDaysSelected = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  if (loading) {
    return <LoadingSpinner message="Loading Jira boards and spaces..." />;
  }

  if (fetchingScores) {
    return (
      <LoadingSpinner message="Computing ICI scores — analyzing Jira issues, changelogs, delivery velocity, and code quality..." />
    );
  }

  const boardOptions: SelectOption[] = [...boards]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => {
      const typeLabel = b.id < 0 ? '[Space]' : b.type === 'kanban' ? '[Kanban]' : '[Scrum]';
      const projectLabel = b.location?.projectKey ? `[${b.location.projectKey}]` : '';
      return {
        label: `${typeLabel} ${projectLabel} ${b.name}`,
        value: b.id,
      };
    });

  const sprintOptions: SelectOption[] = sprints.map(s => ({
    label: s.name,
    value: s.id,
  }));

  const isFormValid =
    selectedBoardOpt &&
    (evalMode === 'sprint' ? fromSprint && toSprint : startDate && endDate && startDate <= endDate);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Hero Header */}
        <div className="hero-header">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            Individual Contributor Index (ICI)
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 400 }}>
            Select any Scrum board, Kanban board, or Jira Space to evaluate engineer on-time delivery, quality, throughput, and collaboration.
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadInitialData} />}

        {!authorizedApproverId && !dismissedApproverWarning && (
          <div>
            <SectionMessage title="Approver Configuration Optional" appearance="information">
              <p style={{ margin: '4px 0 8px 0' }}>
                Authorized approver is not set. Due date changes will default to non-blocking evaluation mode.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button appearance="primary" onClick={onGoToSettings}>
                  Configure Settings
                </Button>
                <Button appearance="subtle" onClick={() => setDismissedApproverWarning(true)}>
                  Dismiss Warning
                </Button>
              </div>
            </SectionMessage>
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Board Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 600, color: '#172B4D', fontSize: '13px' }}>
                Select Jira Board or Space ({boards.length} Available)
              </label>
              {currentBoardObj && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0052CC' }}>
                  Type: {currentBoardObj.id < 0 ? 'Space / Project' : (currentBoardObj.type || 'Board').toUpperCase()}
                </span>
              )}
            </div>
            <Select
              options={boardOptions}
              value={selectedBoardOpt}
              onChange={opt => handleBoardChange(opt as SelectOption | null)}
              placeholder="Search and select any Agile Board or Space..."
              isDisabled={loading}
            />
          </div>

          {/* Evaluation Mode Toggle (If Scrum Board has Sprints) */}
          {selectedBoardOpt && sprints.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F4F5F7', borderRadius: '6px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>Evaluation Range Mode:</span>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#5E6C84' }}>
                  {evalMode === 'sprint' ? 'Evaluate specific closed sprints' : 'Evaluate a custom date/calendar range'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEvalMode('sprint')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #DFE1E6',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: evalMode === 'sprint' ? '#0052CC' : '#FFFFFF',
                    color: evalMode === 'sprint' ? '#FFFFFF' : '#172B4D',
                  }}
                >
                  Sprints ({sprints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEvalMode('timeline')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #DFE1E6',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: evalMode === 'timeline' ? '#0052CC' : '#FFFFFF',
                    color: evalMode === 'timeline' ? '#FFFFFF' : '#172B4D',
                  }}
                >
                  Calendar Timeline
                </button>
              </div>
            </div>
          )}

          {/* Scrum Sprint Range Selection */}
          {selectedBoardOpt && evalMode === 'sprint' && (
            <>
              {loadingSprints ? (
                <LoadingSpinner message="Loading sprints from Jira Agile..." />
              ) : sprints.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#172B4D', fontSize: '13px' }}>
                      From Sprint (Start)
                    </label>
                    <Select
                      options={sprintOptions}
                      value={fromSprint}
                      onChange={opt => setFromSprint(opt as SelectOption | null)}
                      placeholder="Select start sprint..."
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#172B4D', fontSize: '13px' }}>
                      To Sprint (End)
                    </label>
                    <Select
                      options={sprintOptions}
                      value={toSprint}
                      onChange={opt => setToSprint(opt as SelectOption | null)}
                      placeholder="Select end sprint..."
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Kanban / Space / Calendar Range Selection */}
          {selectedBoardOpt && evalMode === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isKanbanOrSpace && (
                <div style={{ padding: '10px 14px', background: '#E3FCEF', borderRadius: '6px', border: '1px solid #ABF5D1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>⚡</span>
                  <span style={{ fontSize: '12px', color: '#006644', fontWeight: 600 }}>
                    Kanban / Continuous Flow Mode Active: Select a rolling timeline preset or specify custom calendar dates below.
                  </span>
                </div>
              )}

              {/* Quick Presets Bar */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#172B4D', fontSize: '13px' }}>
                  Quick Timeline Presets:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: '14d', label: 'Last 14 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: '60d', label: 'Last 60 Days' },
                    { id: '90d', label: 'Last 90 Days' },
                    { id: '180d', label: 'Last 180 Days' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetChange(p.id as TimelinePreset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #DFE1E6',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: timelinePreset === p.id ? '#0052CC' : '#FAFBFC',
                        color: timelinePreset === p.id ? '#FFFFFF' : '#172B4D',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar Date Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: '#F4F5F7', borderRadius: '6px', border: '1px solid #DFE1E6' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', color: '#172B4D', fontSize: '12px' }}>
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setTimelinePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #C1C7D0',
                      fontSize: '13px',
                      color: '#172B4D',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', color: '#172B4D', fontSize: '12px' }}>
                    End Date (To)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setTimelinePreset('custom');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #C1C7D0',
                      fontSize: '13px',
                      color: '#172B4D',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Date Window Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#5E6C84' }}>
                  Evaluating issues resolved between <strong>{startDate}</strong> and <strong>{endDate}</strong>
                </span>
                <Badge appearance="primary">{totalDaysSelected} Days Window</Badge>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div style={{ marginTop: '8px' }}>
            <button
              className="btn-primary-gradient"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: !isFormValid || fetchingScores ? 0.6 : 1,
                cursor: !isFormValid || fetchingScores ? 'not-allowed' : 'pointer',
              }}
              disabled={!isFormValid || fetchingScores}
              onClick={handleLoadScores}
            >
              {fetchingScores
                ? 'Analyzing Jira Issues & Changelogs...'
                : `Calculate ICI Scores (${evalMode === 'sprint' ? 'Sprint Evaluation' : `${totalDaysSelected}-Day Timeline`})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
