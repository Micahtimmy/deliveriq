import React from 'react';
import { router } from '@forge/bridge';

/**
 * Open a Jira issue or page directly in host window (inside Forge) or new browser tab (standalone).
 */
export function openJiraIssue(issueKey: string, e?: React.MouseEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!issueKey) return;

  const url = `/browse/${issueKey}`;
  try {
    if (router && typeof router.navigate === 'function') {
      router.navigate(url);
      return;
    }
  } catch (err) {
    // Fallback if running outside Forge iframe
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Returns a URL string for an issue key
 */
export function getJiraIssueUrl(issueKey: string): string {
  return `/browse/${issueKey}`;
}

interface JiraIssueLinkProps {
  issueKey: string;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

export const JiraIssueLink: React.FC<JiraIssueLinkProps> = ({
  issueKey,
  label,
  style,
  className,
  title,
}) => {
  return (
    <a
      href={`/browse/${issueKey}`}
      title={title || `Open ${issueKey} in Jira`}
      onClick={(e) => openJiraIssue(issueKey, e)}
      className={className}
      style={{
        color: '#0052CC',
        fontWeight: 600,
        textDecoration: 'none',
        cursor: 'pointer',
        borderBottom: '1px dotted #0052CC',
        transition: 'color 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#0747A6')}
      onMouseLeave={(e) => (e.currentTarget.style.color = (style?.color as string) || '#0052CC')}
    >
      {label || issueKey} 🔗
    </a>
  );
};
