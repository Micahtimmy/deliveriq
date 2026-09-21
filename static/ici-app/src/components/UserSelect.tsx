import React, { useState, useEffect, useRef } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Avatar from '@atlaskit/avatar';

export interface JiraUserOption {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

interface UserSelectProps {
  value: string; // Comma-separated names or IDs
  onChange: (value: string, displayName?: string) => void;
  placeholder?: string;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  placeholder = 'Type approver name(s) (e.g. Sarah Chen, John Doe) or search Jira users...',
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [options, setOptions] = useState<JiraUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Search Jira users when user types
  useEffect(() => {
    const lastTerm = inputValue.split(/[,;]/).pop()?.trim() || '';

    const timer = setTimeout(() => {
      searchUsers(lastTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function searchUsers(q: string) {
    setLoading(true);
    try {
      const res = (await invoke('searchJiraUsers', { query: q })) as {
        success: boolean;
        data?: JiraUserOption[];
      };
      if (res.success && res.data && res.data.length > 0) {
        setOptions(res.data);
        setIsOpen(true);
      } else {
        setOptions([]);
      }
    } catch (e) {
      console.error('User search failed:', e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFocus() {
    const lastTerm = inputValue.split(/[,;]/).pop()?.trim() || '';
    searchUsers(lastTerm);
    setIsOpen(true);
  }

  function handleSelectOption(user: JiraUserOption) {
    // If input already has names, append or replace the active token
    const parts = inputValue.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Replace the last typed term with the selected user's display name
      parts[parts.length - 1] = user.displayName;
    } else {
      parts.push(user.displayName);
    }
    const newValue = parts.join(', ');
    setInputValue(newValue);
    onChange(newValue, user.displayName);
    setIsOpen(false);
    setOptions([]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    onChange(val, val);
  }

  function handleClear() {
    setInputValue('');
    onChange('', '');
    setIsOpen(false);
    setOptions([]);
  }

  const parsedNames = inputValue
    .split(/[,;]/)
    .map(n => n.trim())
    .filter(Boolean);

  function handleRemoveName(indexToRemove: number) {
    const updated = parsedNames.filter((_, idx) => idx !== indexToRemove).join(', ');
    setInputValue(updated);
    onChange(updated, updated);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Visual Chips for configured approver names */}
      {parsedNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {parsedNames.map((name, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: '#DEEBFF',
                color: '#0747A6',
                border: '1px solid #B3D4FF',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {name}
              <button
                type="button"
                onClick={() => handleRemoveName(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#BF2600',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: '12px',
                  lineHeight: '1',
                }}
                title={`Remove ${name}`}
              >
                ✕
              </button>
            </span>
          ))}
          {parsedNames.length > 1 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B778C',
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px',
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Input box */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 36px 10px 12px',
            borderRadius: '6px',
            border: '1px solid #C1C7D0',
            fontSize: '13px',
            boxSizing: 'border-box',
            outline: 'none',
            background: '#FFFFFF',
            color: '#172B4D',
          }}
        />

        {loading ? (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              color: '#0747A6',
              fontWeight: 600,
            }}
          >
            Searching...
          </span>
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#6B778C',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
            }}
            title="Clear"
          >
            ✕
          </button>
        ) : null}

        {/* Dropdown Suggestions */}
        {isOpen && options.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#FFFFFF',
              border: '1px solid #DFE1E6',
              borderRadius: '6px',
              marginTop: '4px',
              boxShadow: '0 8px 16px rgba(9, 30, 66, 0.15)',
              zIndex: 100,
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', background: '#FAFBFC', borderBottom: '1px solid #EBECF0' }}>
              Suggested Jira Approvers (Click to Add)
            </div>
            {options.map((u) => (
              <div
                key={u.accountId}
                onClick={() => handleSelectOption(u)}
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #EBECF0',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
              >
                <Avatar
                  src={
                    u.avatarUrls?.['24x24'] ||
                    'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png'
                  }
                  name={u.displayName}
                  size="small"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>
                    {u.displayName}
                  </div>
                  {u.emailAddress && (
                    <div style={{ fontSize: '11px', color: '#5E6C84' }}>{u.emailAddress}</div>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#0052CC', fontWeight: 600 }}>+ Select</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
