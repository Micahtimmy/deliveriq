import React, { useEffect, useState } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button';
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
  const [selectedBoard, setSelectedBoard] = useState<SelectOption | null>(null);

  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [fromSprint, setFromSprint] = useState<SelectOption | null>(null);
  const [toSprint, setToSprint] = useState<SelectOption | null>(null);

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

      // Pre-select first board in standalone mode
      if (fetchedBoards.length > 0) {
        const firstBoardOpt = { label: fetchedBoards[0].name, value: fetchedBoards[0].id };
        setSelectedBoard(firstBoardOpt);
        handleBoardChange(firstBoardOpt);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleBoardChange(option: SelectOption | null) {
    setSelectedBoard(option);
    setSprints([]);
    setFromSprint(null);
    setToSprint(null);
    setError(null);

    if (!option) return;

    setLoadingSprints(true);
    try {
      const sprintsRes = (await invoke('getSprints', { boardId: option.value })) as {
        success: boolean;
        data?: JiraSprint[];
        error?: string;
      };
      if (!sprintsRes.success || !sprintsRes.data) {
        throw new Error(sprintsRes.error || 'Failed to fetch closed sprints');
      }

      const fetchedSprints = sprintsRes.data || [];
      setSprints(fetchedSprints);

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
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingSprints(false);
    }
  }

  async function handleLoadScores() {
    if (!selectedBoard || !fromSprint || !toSprint) return;

    setFetchingScores(true);
    setError(null);

    try {
      const fromIdx = sprints.findIndex(s => s.id === fromSprint.value);
      const toIdx = sprints.findIndex(s => s.id === toSprint.value);

      const start = Math.min(fromIdx >= 0 ? fromIdx : 0, toIdx >= 0 ? toIdx : 0);
      const end = Math.max(fromIdx >= 0 ? fromIdx : 0, toIdx >= 0 ? toIdx : 0);
      const selectedSprintObjs = sprints.slice(start, end + 1);

      const sprintIds = selectedSprintObjs.map(s => s.id);
      const sprintNames = selectedSprintObjs.map(s => s.name);

      const scoresRes = (await invoke('getTeamScores', {
        boardId: selectedBoard.value,
        boardName: selectedBoard.label,
        sprintIds,
        sprintNames,
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
    } catch (e) {
      setError(String(e));
    } finally {
      setFetchingScores(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading Jira boards and configuration..." />;
  }

  if (fetchingScores) {
    return (
      <LoadingSpinner message="Computing ICI scores — analyzing Jira issues, changelogs, and team velocity..." />
    );
  }

  const boardOptions: SelectOption[] = [...boards]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => ({
      label: b.location?.projectName
        ? `[${b.location.projectKey}] ${b.name} (${b.location.projectName})`
        : b.location?.projectKey
        ? `[${b.location.projectKey}] ${b.name}`
        : b.name,
      value: b.id
    }));

  const sprintOptions: SelectOption[] = sprints.map(s => ({
    label: s.name,
    value: s.id,
  }));

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Hero Header */}
        <div className="hero-header">
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            Select Team &amp; Sprint Range
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: 400 }}>
            Choose an agile board and closed sprint evaluation period to calculate contributor ICI scores.
          </p>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadInitialData} />}

        {!authorizedApproverId && !dismissedApproverWarning && (
          <div style={{ marginBottom: '8px' }}>
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
          <div>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#172B4D', fontSize: '13px' }}>
              Select Jira Board
            </label>
            <Select
              options={boardOptions}
              value={selectedBoard}
              onChange={opt => handleBoardChange(opt as SelectOption | null)}
              placeholder="Search and select a board..."
              isDisabled={loading}
            />
          </div>

          {selectedBoard && (
            <>
              {loadingSprints ? (
                <LoadingSpinner message="Loading board sprints from Jira..." />
              ) : sprints.length === 0 ? (
                <SectionMessage title="No Sprints Found for this Board" appearance="information">
                  <p style={{ margin: '4px 0' }}>
                    This board does not have active or closed sprints (e.g. Kanban board or a new project without sprints).
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    For Kanban projects, use the <strong>Epic Tracker</strong> or <strong>Delivery Insights</strong> tabs to monitor program progress. To compute individual ICI scores, select a Scrum board with sprint history.
                  </p>
                </SectionMessage>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#172B4D', fontSize: '13px' }}>
                      From Sprint
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
                      To Sprint
                    </label>
                    <Select
                      options={sprintOptions}
                      value={toSprint}
                      onChange={opt => setToSprint(opt as SelectOption | null)}
                      placeholder="Select end sprint..."
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: '8px' }}>
            <button
              className="btn-primary-gradient"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: !selectedBoard || !fromSprint || !toSprint || fetchingScores ? 0.6 : 1,
                cursor: !selectedBoard || !fromSprint || !toSprint || fetchingScores ? 'not-allowed' : 'pointer',
              }}
              disabled={!selectedBoard || !fromSprint || !toSprint || fetchingScores}
              onClick={handleLoadScores}
            >
              Load Team Contribution Scores
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
