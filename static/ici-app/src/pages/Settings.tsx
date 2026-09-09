import React, { useEffect, useState } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { TeamGroup } from '../types/portfolio';
import { UserSelect } from '../components/UserSelect';

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [authorizedApproverId, setAuthorizedApproverId] = useState('');
  const [storyPointsField, setStoryPointsField] = useState('customfield_10016');

  // Team Groups State
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newProjectKeys, setNewProjectKeys] = useState('');

  useEffect(() => {
    loadSettings();
    loadTeamGroups();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getSettings')) as {
        success: boolean;
        data?: { authorizedApproverId?: string; storyPointsField?: string };
        error?: string;
      };
      if (res.success && res.data) {
        if (res.data.authorizedApproverId) setAuthorizedApproverId(res.data.authorizedApproverId);
        if (res.data.storyPointsField) setStoryPointsField(res.data.storyPointsField);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
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

  async function handleSaveSettings() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = (await invoke('saveSettings', {
        authorizedApproverId: authorizedApproverId.trim(),
        storyPointsField: storyPointsField.trim()
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

  if (loading) {
    return <LoadingSpinner message="Loading app settings & saved portfolio team groups..." />;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 0', color: '#172B4D' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#172B4D' }}>
        ICI Dashboard & Portfolio Settings
      </h1>
      <p style={{ color: '#5E6C84', marginBottom: '24px', fontSize: '14px' }}>
        Configure application policies, authorized approvers, multi-team groups, and Jira field mappings.
      </p>

      {error && <ErrorBanner message={error} />}

      {success && (
        <div style={{ marginBottom: '16px' }}>
          <SectionMessage title="Settings Saved" appearance="success">
            <p>Application policies updated successfully.</p>
          </SectionMessage>
        </div>
      )}

      {/* Global Settings Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '16px' }}>Global Tracking & Policy Rules</h3>

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
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', color: '#172B4D' }}>
            Story Points Custom Field Key
          </label>
          <input
            type="text"
            value={storyPointsField}
            onChange={e => setStoryPointsField(e.target.value)}
            placeholder="customfield_10016"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '3px',
              border: '1px solid #DFE1E6',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Button appearance="primary" onClick={handleSaveSettings} isDisabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Portfolio Team Groups Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: '#172B4D', fontSize: '16px' }}>Portfolio Saved Team Groups</h3>
        <p style={{ color: '#5E6C84', fontSize: '13px', marginBottom: '16px' }}>
          Create named groups of Jira projects/teams for multi-team Epic progress measurement.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Team Group Name (e.g. Mobile Tribe)"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '3px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Project Keys (e.g. MOB, API, PAY)"
            value={newProjectKeys}
            onChange={e => setNewProjectKeys(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DFE1E6', borderRadius: '3px', fontSize: '14px' }}
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
