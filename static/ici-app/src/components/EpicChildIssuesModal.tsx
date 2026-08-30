import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import { EpicSummary, EpicChildIssueDetail } from '../types/portfolio';
import { openJiraIssue, JiraIssueLink } from '../utils/jiraUrl';

interface EpicChildIssuesModalProps {
  epic: EpicSummary | null;
  onClose: () => void;
}

export const EpicChildIssuesModal: React.FC<EpicChildIssuesModalProps> = ({ epic, onClose }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!epic) return null;

  const childIssues: EpicChildIssueDetail[] = epic.childIssues || [];

  const filteredIssues = childIssues.filter(issue => {
    const matchesSearch =
      issue.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.assigneeName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'BLOCKED') return matchesSearch && issue.status.toLowerCase().includes('block');
    return matchesSearch && issue.statusCategory.toUpperCase() === filterStatus.toUpperCase();
  });

  const getStatusBadgeAppearance = (category: string, status: string) => {
    if (status.toLowerCase().includes('block')) return 'removed';
    switch (category) {
      case 'Done': return 'added';
      case 'In Progress': return 'primary';
      default: return 'default';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 30, 66, 0.54)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 32px -8px rgba(9, 30, 66, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FAFBFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <JiraIssueLink issueKey={epic.key} label={epic.key} />
              <span
                onClick={(e) => openJiraIssue(epic.key, e)}
                style={{ fontSize: '18px', fontWeight: 700, color: '#172B4D', cursor: 'pointer' }}
                title={`Open ${epic.key} in Jira`}
              >
                {epic.summary}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#5E6C84' }}>
              Project / Team: <strong>{epic.projectName}</strong> &bull; Completion: <strong>{epic.spCompletionPercentage}% ({epic.completedStoryPoints}/{epic.totalStoryPoints} SP)</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6B778C',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filters & Controls */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #EBECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#5E6C84' }}>Filter by Status:</span>
            {['ALL', 'IN PROGRESS', 'BLOCKED', 'DONE', 'TO DO'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: filterStatus === status ? '1px solid #0052CC' : '1px solid #DFE1E6',
                  background: filterStatus === status ? '#DEEBFF' : '#FFFFFF',
                  color: filterStatus === status ? '#0747A6' : '#42526E',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search child issues or assignee..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #C1C7D0',
              fontSize: '13px',
              width: '220px',
            }}
          />
        </div>

        {/* Table Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {filteredIssues.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#5E6C84' }}>
              No child issues match the current filter criteria.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAFBFC', borderBottom: '2px solid #DFE1E6' }}>
                  <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Issue Key & Summary</th>
                  <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Type</th>
                  <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Status</th>
                  <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Assignee</th>
                  <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Sprint / Location</th>
                  <th style={{ padding: '10px 12px', color: '#5E6C84', textAlign: 'right' }}>SP</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map(child => (
                  <tr key={child.key} style={{ borderBottom: '1px solid #DFE1E6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      <JiraIssueLink issueKey={child.key} label={child.key} style={{ marginRight: '8px' }} />
                      <span
                        onClick={(e) => openJiraIssue(child.key, e)}
                        style={{ cursor: 'pointer', color: '#172B4D' }}
                        title={`Open ${child.key} in Jira`}
                      >
                        {child.summary}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#42526E' }}>{child.issueType || 'Story'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge appearance={getStatusBadgeAppearance(child.statusCategory, child.status)}>
                        {child.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#172B4D' }}>
                      {child.assigneeName || 'Unassigned'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#5E6C84', fontSize: '12px' }}>
                      {child.sprintName || child.teamOrProject || epic.projectName}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                      {child.storyPoints > 0 ? child.storyPoints : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #DFE1E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFC' }}>
          <div style={{ fontSize: '13px', color: '#5E6C84' }}>
            Showing {filteredIssues.length} of {childIssues.length} child issues
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
