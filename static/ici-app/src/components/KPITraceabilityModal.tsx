import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Avatar from '@atlaskit/avatar';
import { JiraIssueLink } from '../utils/jiraUrl';
import { PaginationControls } from './PaginationControls';

export interface TraceableIssue {
  key: string;
  summary: string;
  projectName?: string;
  status: string;
  statusCategory?: 'To Do' | 'In Progress' | 'Done' | 'active' | 'review' | 'done';
  storyPoints?: number;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  createdAt?: string;
  dueDate?: string;
}

interface KPITraceabilityModalProps {
  title: string;
  subtitle?: string;
  issues: TraceableIssue[];
  onClose: () => void;
}

export const KPITraceabilityModal: React.FC<KPITraceabilityModalProps> = ({
  title,
  subtitle,
  issues,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredIssues = issues.filter(
    (i) =>
      i.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.assigneeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.projectName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedIssues = filteredIssues.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBg = (cat?: string, name?: string) => {
    const s = (cat || name || '').toLowerCase();
    if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return '#E3FCEF';
    if (s.includes('progress') || s.includes('review') || s.includes('active')) return '#DEEBFF';
    if (s.includes('blocked') || s.includes('risk')) return '#FFEBE6';
    return '#EAE6FF';
  };

  const getStatusColor = (cat?: string, name?: string) => {
    const s = (cat || name || '').toLowerCase();
    if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return '#006644';
    if (s.includes('progress') || s.includes('review') || s.includes('active')) return '#0747A6';
    if (s.includes('blocked') || s.includes('risk')) return '#BF2600';
    return '#403294';
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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(9, 30, 66, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #DFE1E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAFBFC',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#172B4D' }}>{title}</h2>
              <span
                style={{
                  fontSize: '12px',
                  background: '#DEEBFF',
                  color: '#0747A6',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                }}
              >
                {filteredIssues.length} Items
              </span>
            </div>
            {subtitle && <p style={{ margin: '4px 0 0', color: '#5E6C84', fontSize: '13px' }}>{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#5E6C84',
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            placeholder="Filter issues by key, summary, assignee..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #C1C7D0',
              fontSize: '13px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          {filteredIssues.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#5E6C84', fontSize: '14px' }}>
              No matching issues found for this metric.
            </div>
          ) : (
            <div style={{ border: '1px solid #DFE1E6', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: '2px solid #DFE1E6' }}>
                    <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Issue Key</th>
                    <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Summary</th>
                    <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Assignee</th>
                    <th style={{ padding: '10px 12px', color: '#5E6C84' }}>Status</th>
                    <th style={{ padding: '10px 12px', color: '#5E6C84', textAlign: 'right' }}>SP</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIssues.map((issue) => (
                    <tr key={issue.key} style={{ borderBottom: '1px solid #EBECF0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        <JiraIssueLink issueKey={issue.key} />
                      </td>
                      <td style={{ padding: '10px 12px', color: '#172B4D', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600 }}>{issue.summary}</div>
                        {issue.projectName && (
                          <span style={{ fontSize: '11px', color: '#5E6C84' }}>{issue.projectName}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {issue.assigneeAvatarUrl && (
                            <Avatar src={issue.assigneeAvatarUrl} name={issue.assigneeName || 'User'} size="xsmall" />
                          )}
                          <span style={{ fontSize: '12px', color: '#42526E' }}>{issue.assigneeName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: getStatusBg(issue.statusCategory, issue.status),
                            color: getStatusColor(issue.statusCategory, issue.status),
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0747A6' }}>
                        {issue.storyPoints || 0} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <PaginationControls
                currentPage={currentPage}
                totalItems={filteredIssues.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => setPageSize(s)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #DFE1E6',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#FAFBFC',
          }}
        >
          <Button appearance="primary" onClick={onClose}>
            Close Drill-Down
          </Button>
        </div>
      </div>
    </div>
  );
};
