import React, { useState, useEffect } from 'react';
import { safeInvoke as invoke } from '../utils/bridge';
import Avatar from '@atlaskit/avatar';

export interface JiraUserOption {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

interface UserSelectProps {
  value: string; // accountId
  onChange: (accountId: string, displayName?: string) => void;
  placeholder?: string;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  placeholder = 'Search Jira user by name or email...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<JiraUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<JiraUserOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function searchUsers(q: string) {
    setLoading(true);
    try {
      const res = (await invoke('searchJiraUsers', { query: q })) as {
        success: boolean;
        data?: JiraUserOption[];
      };
      if (res.success && res.data) {
        setOptions(res.data);
        setIsOpen(true);
      }
    } catch (e) {
      console.error('User search failed:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(user: JiraUserOption) {
    setSelectedUser(user);
    onChange(user.accountId, user.displayName);
    setSearchTerm('');
    setIsOpen(false);
  }

  function handleClear() {
    setSelectedUser(null);
    onChange('', '');
    setSearchTerm('');
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {value && selectedUser ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#DEEBFF',
            border: '1px solid #0747A6',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Avatar
              src={selectedUser.avatarUrls?.['24x24'] || 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png'}
              name={selectedUser.displayName}
              size="small"
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0747A6' }}>
                {selectedUser.displayName}
              </div>
              <div style={{ fontSize: '11px', color: '#5E6C84' }}>
                ID: {selectedUser.accountId}
              </div>
            </div>
          </div>

          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#BF2600',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchTerm || value}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!selectedUser) onChange(e.target.value);
            }}
            onFocus={() => setIsOpen(options.length > 0)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #C1C7D0',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {loading && (
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
          )}

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
              {options.map((u) => (
                <div
                  key={u.accountId}
                  onClick={() => handleSelect(u)}
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #EBECF0',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  <Avatar
                    src={u.avatarUrls?.['24x24'] || 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png'}
                    name={u.displayName}
                    size="small"
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#172B4D' }}>
                      {u.displayName}
                    </div>
                    {u.emailAddress && (
                      <div style={{ fontSize: '11px', color: '#5E6C84' }}>{u.emailAddress}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
