import React, { useEffect, useState } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { TeamGroup } from '../types/portfolio';
import { DimensionWeights } from '../types/scoring';
import { UserSelect } from '../components/UserSelect';

const DEFAULT_WEIGHTS: DimensionWeights = {
  onTime: 35,
  delivered: 25,
  quality: 25,
  collaboration: 15,
};

interface JiraFieldOption {
  id: string;
  name: string;
  isRecommended?: boolean;
}

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Global settings
  const [authorizedApproverId, setAuthorizedApproverId] = useState('');
  const [storyPointsField, setStoryPointsField] = useState('customfield_10016');
  const [weights, setWeights] = useState<DimensionWeights>(DEFAULT_WEIGHTS);

  // Available Story Points custom fields auto-discovery
  const [availableFields, setAvailableFields] = useState<JiraFieldOption[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Team Groups State
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newProjectKeys, setNewProjectKeys] = useState('');

  useEffect(() => {
    loadSettings();
    loadTeamGroups();
    loadStoryPointsFields();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getSettings')) as {
        success: boolean;
        data?: {
          authorizedApproverId?: string;
          storyPointsField?: string;
          weights?: DimensionWeights;
        };
        error?: string;
      };
      if (res.success && res.data) {
        if (res.data.authorizedApproverId) setAuthorizedApproverId(res.data.authorizedApproverId);
        if (res.data.storyPointsField) setStoryPointsField(res.data.storyPointsField);
        if (res.data.weights) {
          setWeights({
            onTime: Number(res.data.weights.onTime) || 35,
            delivered: Number(res.data.weights.delivered) || 25,
            quality: Number(res.data.weights.quality) || 25,
            collaboration: Number(res.data.weights.collaboration) || 15,
          });
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadStoryPointsFields() {
    setLoadingFields(true);
    try {
      const res = (await invoke('getStoryPointsFields')) as {
        success: boolean;
        data?: JiraFieldOption[];
      };
      if (res.success && res.data && res.data.length > 0) {
        setAvailableFields(res.data);
      }
    } catch (e) {
      console.warn('Could not auto-fetch Jira fields:', e);
    } finally {
      setLoadingFields(false);
    }
  }

  async function loadTeamGroups() {
    try {
      const res = (await invoke('getSavedTeamGroups')) as { success: boolean; data?: TeamGroup[] };
      if (res.success && res.data) {
        setTeamGroups(res.data);
      }
    } catch (e) {
      console.error('Failed to load team groups:', e);
    }
  }

  const totalWeight = weights.onTime + weights.delivered + weights.quality + weights.collaboration;
  const isWeightValid = totalWeight === 100;

  async function handleSaveSettings() {
    if (!isWeightValid) {
      setError(`Dimension weights must sum to exactly 100% (currently ${totalWeight}%).`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = (await invoke('saveSettings', {
        authorizedApproverId: authorizedApproverId.trim(),
        storyPointsField: storyPointsField.trim(),
        weights,
      })) as { success: boolean; error?: string };

      if (!res.success) {
        throw new Error(res.error || 'Failed to save settings');
      }

      setSuccess(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTeamGroup() {
    if (!newGroupName.trim() || !newProjectKeys.trim()) return;
    try {
      const group: TeamGroup = {
        id: `group-${Date.now()}`,
        name: newGroupName.trim(),
        boardIds: [],
        projectKeys: newProjectKeys.split(',').map(k => k.trim()).filter(Boolean),
        createdAt: new Date().toISOString()
      };
      const res = (await invoke('saveTeamGroup', group as unknown as Record<string, unknown>)) as { success: boolean };
      if (res.success) {
        setNewGroupName('');
        setNewProjectKeys('');
        loadTeamGroups();
      }
    } catch (e) {
      setError(String(e));
    }
  }

  function handleAutoDetectField() {
    const recommended = availableFields.find(f => f.isRecommended) || availableFields[0];
    if (recommended) {
      setStoryPointsField(recommended.id);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading app settings & saved portfolio team groups..." />;
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '16px 0', color: '#172B4D' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#172B4D' }}>
        DeliverIQ Settings &amp; Configuration
      </h1>
      <p style={{ color: '#5E6C84', marginBottom: '24px', fontSize: '14px' }}>
        Configure scoring dimension weights, authorized due date approvers, field mappings, and saved portfolio groups.
      </p>

      {error && <ErrorBanner message={error} />}

      {success && (
        <div style={{ marginBottom: '16px' }}>
          <SectionMessage title="Settings Saved" appearance="success">
            <p>Application policies, weights, and mappings updated successfully.</p>
          </SectionMessage>
        </div>
      )}

      {/* 1. Scoring Dimension Weights Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#172B4D', fontSize: '16px', fontWeight: 700 }}>
              Scoring Dimension Weights
            </h3>
            <p style={{ margin: '4px 0 0', color: '#5E6C84', fontSize: '13px' }}>
              Customize the relative weights for each dimension of engineering delivery. Weights must sum to exactly 100%.
            </p>
          </div>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
          >
            Reset to Industry Benchmark (35/25/25/15)
          </Button>
        </div>

        {/* Visual Allocation Preview Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#EBECF0', marginBottom: '8px' }}>
            <div style={{ width: `${Math.max(0, weights.onTime)}%`, background: '#0052CC', transition: 'width 0.2s' }} title={`On-Time: ${weights.onTime}%`} />
            <div style={{ width: `${Math.max(0, weights.delivered)}%`, background: '#00875A', transition: 'width 0.2s' }} title={`Delivered: ${weights.delivered}%`} />
            <div style={{ width: `${Math.max(0, weights.quality)}%`, background: '#FF5630', transition: 'width 0.2s' }} title={`Quality: ${weights.quality}%`} />
            <div style={{ width: `${Math.max(0, weights.collaboration)}%`, background: '#6554C0', transition: 'width 0.2s' }} title={`Collaboration: ${weights.collaboration}%`} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0052CC' }} />
                <span>On-Time: <strong>{weights.onTime}%</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#00875A' }} />
                <span>Delivered: <strong>{weights.delivered}%</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#FF5630' }} />
                <span>Quality: <strong>{weights.quality}%</strong></span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6554C0' }} />
                <span>Collaboration: <strong>{weights.collaboration}%</strong></span>
              </span>
            </div>

            <span
              style={{
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: isWeightValid ? '#E3FCEF' : '#FFEBE6',
                color: isWeightValid ? '#006644' : '#BF2600',
              }}
            >
              Total: {totalWeight}% {isWeightValid ? '(Valid)' : '(Must equal 100%)'}
            </span>
          </div>
        </div>

        {/* 4 Weight Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0052CC', display: 'block', marginBottom: '6px' }}>
              On-Time Delivery (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.onTime}
              onChange={e => setWeights({ ...weights, onTime: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DFE1E6', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#00875A', display: 'block', marginBottom: '6px' }}>
              Delivered Work (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.delivered}
              onChange={e => setWeights({ ...weights, delivered: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DFE1E6', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#BF2600', display: 'block', marginBottom: '6px' }}>
              Quality Index (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.quality}
              onChange={e => setWeights({ ...weights, quality: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DFE1E6', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#6554C0', display: 'block', marginBottom: '6px' }}>
              Collaboration (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={weights.collaboration}
              onChange={e => setWeights({ ...weights, collaboration: Number(e.target.value) || 0 })}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DFE1E6', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* 2. Global Tracking & Policy Rules Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '16px', fontWeight: 700 }}>
          Global Tracking & Policy Rules
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', color: '#172B4D' }}>
            Authorized Due Date Approver(s) (Manager / Lead Name or Search)
          </label>
          <UserSelect
            value={authorizedApproverId}
            onChange={(val) => setAuthorizedApproverId(val)}
            placeholder="Type manager name(s) (e.g. Sarah Chen, John Doe) or search Jira users..."
          />
          <p style={{ fontSize: '12px', color: '#6B778C', marginTop: '6px', lineHeight: '1.4' }}>
            Enter one or more manager/lead names or select them from Jira. Due date modifications made or approved by these individuals are marked as <strong>Authorized</strong>. Due date changes made by assignees without authorization are flagged as <strong>Unauthorized Due Date Drift</strong>.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontWeight: 600, color: '#172B4D' }}>
              Story Points Custom Field
            </label>
            {availableFields.length > 0 && (
              <Button appearance="subtle-link" spacing="compact" onClick={handleAutoDetectField}>
                Auto-Detect Recommended Field
              </Button>
            )}
          </div>

          {availableFields.length > 0 ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={storyPointsField}
                onChange={e => setStoryPointsField(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #DFE1E6',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#172B4D',
                }}
              >
                {availableFields.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.id}) {f.isRecommended ? '— Recommended' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="text"
              value={storyPointsField}
              onChange={e => setStoryPointsField(e.target.value)}
              placeholder="customfield_10016"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #DFE1E6',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          )}
          <p style={{ fontSize: '12px', color: '#6B778C', marginTop: '6px' }}>
            Auto-discovered from this Jira Cloud instance's field dictionary.
          </p>
        </div>

        <Button appearance="primary" onClick={handleSaveSettings} isDisabled={saving || !isWeightValid}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* 3. Portfolio Team Groups Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '16px', fontWeight: 700 }}>
          Portfolio Saved Team Groups
        </h3>
        <p style={{ color: '#5E6C84', fontSize: '13px', marginBottom: '16px' }}>
          Create named groups of Jira projects/teams for multi-team Epic progress measurement.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Team Group Name (e.g. Mobile Tribe)"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Project Keys (e.g. MOB, API, PAY)"
            value={newProjectKeys}
            onChange={e => setNewProjectKeys(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '4px', fontSize: '14px' }}
          />
          <Button appearance="primary" onClick={handleCreateTeamGroup}>Add Group</Button>
        </div>

        {teamGroups.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #DFE1E6', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Group Name</th>
                <th style={{ padding: '8px 12px' }}>Project Keys</th>
              </tr>
            </thead>
            <tbody>
              {teamGroups.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid #DFE1E6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{g.name}</td>
                  <td style={{ padding: '8px 12px', color: '#0052CC' }}>{g.projectKeys.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
