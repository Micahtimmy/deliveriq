import React, { useState, useMemo, useRef, useEffect } from 'react';
import { JiraBoard } from '../types/jira';

interface SearchableBoardSelectProps {
  boards: JiraBoard[];
  selectedBoardId: number | null;
  onChange: (board: JiraBoard | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

type BoardTypeFilter = 'ALL' | 'SCRUM' | 'KANBAN' | 'SPACE';

export const SearchableBoardSelect: React.FC<SearchableBoardSelectProps> = ({
  boards,
  selectedBoardId,
  onChange,
  disabled = false,
  placeholder = 'Search by board name, project name, or key (e.g., ABP, CORE, Switching)...',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<BoardTypeFilter>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const safeBoards = Array.isArray(boards) ? boards : [];

  const counts = useMemo(() => {
    let scrum = 0;
    let kanban = 0;
    let space = 0;
    safeBoards.forEach(b => {
      const type = (b.type || '').toLowerCase();
      if (b.id < 0 || type === 'project' || type === 'space') space++;
      else if (type === 'kanban') kanban++;
      else scrum++;
    });
    return { all: safeBoards.length, scrum, kanban, space };
  }, [safeBoards]);

  const selectedBoard = useMemo(() => {
    if (selectedBoardId === null) return null;
    return safeBoards.find(b => b.id === selectedBoardId) || null;
  }, [safeBoards, selectedBoardId]);

  const filteredBoards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return safeBoards.filter(b => {
      const type = (b.type || '').toLowerCase();
      const isSpace = b.id < 0 || type === 'project' || type === 'space';
      const isKanban = !isSpace && type === 'kanban';
      const isScrum = !isSpace && !isKanban;

      if (typeFilter === 'SCRUM' && !isScrum) return false;
      if (typeFilter === 'KANBAN' && !isKanban) return false;
      if (typeFilter === 'SPACE' && !isSpace) return false;

      if (!q) return true;

      const nameMatch = b.name.toLowerCase().includes(q);
      const projKeyMatch = b.location?.projectKey?.toLowerCase().includes(q);
      const projNameMatch = b.location?.projectName?.toLowerCase().includes(q);
      const idMatch = String(b.id).includes(q);

      return nameMatch || projKeyMatch || projNameMatch || idMatch;
    });
  }, [boards, searchQuery, typeFilter]);

  const getBoardTypeBadge = (b: JiraBoard) => {
    const type = (b.type || '').toLowerCase();
    if (b.id < 0 || type === 'project' || type === 'space') {
      return (
        <span
          style={{
            background: '#E6FCFF',
            color: '#008DA6',
            border: '1px solid #B2F5EA',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          SPACE
        </span>
      );
    }
    if (type === 'kanban') {
      return (
        <span
          style={{
            background: '#EAE6FF',
            color: '#403294',
            border: '1px solid #DED7FC',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          KANBAN
        </span>
      );
    }
    return (
      <span
        style={{
          background: '#DEEBFF',
          color: '#0747A6',
          border: '1px solid #B3D4FF',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.3px',
        }}
      >
        SCRUM
      </span>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Selected Board Display Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: disabled ? '#F4F5F7' : 'var(--card-bg, #FFFFFF)',
          border: isOpen ? '2px solid #0052CC' : '1px solid var(--border-color, #C1C7D0)',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '44px',
          boxShadow: isOpen ? '0 0 0 2px rgba(0, 82, 204, 0.2)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {selectedBoard ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {getBoardTypeBadge(selectedBoard)}
            {selectedBoard.location?.projectKey && (
              <span
                style={{
                  background: '#091E42',
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {selectedBoard.location.projectKey}
              </span>
            )}
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary, #172B4D)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedBoard.name}
            </span>
          </div>
        ) : (
          <span style={{ color: '#6B778C', fontSize: '13px' }}>
            {placeholder}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6B778C', fontWeight: 600 }}>
            {boards.length} available
          </span>
          <span style={{ color: '#6B778C', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--card-bg, #FFFFFF)',
            border: '1px solid var(--border-color, #C1C7D0)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(9, 30, 66, 0.18)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '420px',
          }}
        >
          {/* Search Input Bar */}
          <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-color, #DFE1E6)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type to filter boards (e.g., 'Core', 'Switching', 'ABP')..."
                style={{
                  width: '100%',
                  padding: '9px 32px 9px 12px',
                  borderRadius: '5px',
                  border: '1px solid #0052CC',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#6B778C',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Quick-Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All (${counts.all})` },
                { id: 'SCRUM', label: `Scrum (${counts.scrum})` },
                { id: 'KANBAN', label: `Kanban (${counts.kanban})` },
                { id: 'SPACE', label: `Spaces (${counts.space})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as BoardTypeFilter)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: typeFilter === tab.id ? '1px solid #0052CC' : '1px solid #DFE1E6',
                    background: typeFilter === tab.id ? '#0052CC' : '#F4F5F7',
                    color: typeFilter === tab.id ? '#FFFFFF' : '#42526E',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Boards List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '6px 0',
              maxHeight: '280px',
            }}
          >
            {filteredBoards.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: '#6B778C', fontSize: '13px' }}>
                <p style={{ margin: '0 0 10px' }}>No pre-indexed boards match "{searchQuery}".</p>
                {searchQuery.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const cleanKey = searchQuery.trim().toUpperCase();
                      const numId = Math.abs(cleanKey.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
                      const customBoard: JiraBoard = {
                        id: -numId,
                        name: `Project Space (${cleanKey})`,
                        type: 'project',
                        location: {
                          projectKey: cleanKey,
                          projectName: `Project ${cleanKey}`,
                          displayName: `Project ${cleanKey}`,
                        },
                      };
                      onChange(customBoard);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#0052CC',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ➕ Evaluate Project Space [{searchQuery.trim().toUpperCase()}]
                  </button>
                )}
              </div>
            ) : (
              <>
                {searchQuery.trim().length >= 2 && !boards.some(b => b.location?.projectKey?.toUpperCase() === searchQuery.trim().toUpperCase()) && (
                  <div
                    onClick={() => {
                      const cleanKey = searchQuery.trim().toUpperCase();
                      const numId = Math.abs(cleanKey.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
                      const customBoard: JiraBoard = {
                        id: -numId,
                        name: `Project Space (${cleanKey})`,
                        type: 'project',
                        location: {
                          projectKey: cleanKey,
                          projectName: `Project ${cleanKey}`,
                          displayName: `Project ${cleanKey}`,
                        },
                      };
                      onChange(customBoard);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: '#E6FCFF',
                      borderBottom: '1px dashed #B2F5EA',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#008DA6',
                    }}
                  >
                    <span>➕</span>
                    <span>Evaluate any unlisted project by key: <strong>[{searchQuery.trim().toUpperCase()}]</strong></span>
                  </div>
                )}
                {filteredBoards.map(board => {
                  const isSelected = selectedBoardId === board.id;
                  return (
                    <div
                      key={board.id}
                      onClick={() => {
                        onChange(board);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        background: isSelected ? '#DEEBFF' : 'transparent',
                        borderLeft: isSelected ? '3px solid #0052CC' : '3px solid transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = '#F4F5F7';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        {getBoardTypeBadge(board)}
                        {board.location?.projectKey && (
                          <span
                            style={{
                              background: '#091E42',
                              color: '#FFFFFF',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                            }}
                          >
                            {board.location.projectKey}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#0052CC' : '#172B4D',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {board.name}
                        </span>
                      </div>

                      {isSelected && (
                        <span style={{ color: '#0052CC', fontWeight: 700, fontSize: '14px', marginLeft: '8px' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer bar with total results */}
          <div
            style={{
              padding: '6px 12px',
              background: '#FAFBFC',
              borderTop: '1px solid #DFE1E6',
              fontSize: '11px',
              color: '#6B778C',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Showing {filteredBoards.length} of {boards.length} items</span>
            <span style={{ fontSize: '10px' }}>Click to select</span>
          </div>
        </div>
      )}
    </div>
  );
};
