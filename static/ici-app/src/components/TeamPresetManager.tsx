import React, { useState, useEffect, useMemo } from 'react';
import Button from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import SectionMessage from '@atlaskit/section-message';
import { JiraBoard } from '../types/jira';
import { TeamGroup } from '../types/portfolio';

interface TeamPresetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBoards: JiraBoard[];
  savedPresets: TeamGroup[];
  selectedBoardIds: number[];
  onSelectPreset: (preset: TeamGroup) => void;
  onApplyCustomSelection: (boardIds: number[]) => void;
  onSavePreset: (name: string, description: string, boardIds: number[]) => Promise<void>;
  onDeletePreset: (presetId: string) => Promise<void>;
}

interface SpaceGroup {
  spaceKey: string;
  spaceName: string;
  boards: JiraBoard[];
}

export const TeamPresetManager: React.FC<TeamPresetManagerProps> = ({
  isOpen,
  onClose,
  availableBoards,
  savedPresets,
  selectedBoardIds,
  onSelectPreset,
  onApplyCustomSelection,
  onSavePreset,
  onDeletePreset,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedBoardIds);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>('ALL');
  const [presetName, setPresetName] = useState<string>('');
  const [presetDesc, setPresetDesc] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  useEffect(() => {
    setSelectedIds(selectedBoardIds);
  }, [selectedBoardIds]);

  // Extract all unique Spaces / Projects
  const uniqueSpaces = useMemo(() => {
    const spaceMap = new Map<string, string>();
    availableBoards.forEach(b => {
      const key = b.location?.projectKey || 'UNASSIGNED';
      const name = b.location?.projectName || 'Unassigned / Global Boards';
      spaceMap.set(key, name);
    });
    return Array.from(spaceMap.entries()).map(([key, name]) => ({ key, name }));
  }, [availableBoards]);

  // Filter boards by search query and selected space
  const filteredBoards = useMemo(() => {
    return availableBoards.filter(b => {
      const pKey = b.location?.projectKey || 'UNASSIGNED';
      if (selectedSpaceFilter !== 'ALL' && pKey !== selectedSpaceFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const bName = b.name.toLowerCase();
      const pKeyLower = pKey.toLowerCase();
      const pName = (b.location?.projectName || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      return bName.includes(query) || pKeyLower.includes(query) || pName.includes(query) || bType.includes(query);
    });
  }, [availableBoards, searchQuery, selectedSpaceFilter]);

  // Group filtered boards by Space / Project
  const spaces = useMemo<SpaceGroup[]>(() => {
    const map = new Map<string, SpaceGroup>();

    filteredBoards.forEach(b => {
      const spaceKey = b.location?.projectKey || 'UNASSIGNED';
      const spaceName = b.location?.projectName || 'Unassigned / Global Boards';

      if (!map.has(spaceKey)) {
        map.set(spaceKey, { spaceKey, spaceName, boards: [] });
      }
      map.get(spaceKey)!.boards.push(b);
    });

    return Array.from(map.values()).sort((a, b) => a.spaceName.localeCompare(b.spaceName));
  }, [filteredBoards]);

  if (!isOpen) return null;

  function handleToggleBoard(id: number) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(bId => bId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleToggleSpace(spaceBoards: JiraBoard[]) {
    const spaceBoardIds = spaceBoards.map(b => b.id);
    const allSelected = spaceBoardIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Remove all boards in this space
      setSelectedIds(selectedIds.filter(id => !spaceBoardIds.includes(id)));
    } else {
      // Add all boards in this space
      const newIds = new Set([...selectedIds, ...spaceBoardIds]);
      setSelectedIds(Array.from(newIds));
    }
  }

  function handleSelectAll() {
    setSelectedIds(availableBoards.map(b => b.id));
  }

  function handleClearAll() {
    setSelectedIds([]);
  }

  async function handleSave() {
    if (!presetName.trim()) return;
    setIsSaving(true);
    try {
      await onSavePreset(presetName.trim(), presetDesc.trim(), selectedIds);
      setPresetName('');
      setPresetDesc('');
      setIsCreatingNew(false);
    } catch (e) {
      console.error('Failed to save preset:', e);
    } finally {
      setIsSaving(false);
    }
  }

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
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 32px -8px rgba(9, 30, 66, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
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
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#172B4D' }}>
              Multi-Team & Space Filter Manager
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5E6C84' }}>
              Select teams or entire Jira Spaces, combine workstreams, and save filter presets for PM & Leadership views.
            </p>
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

        {/* Search Bar & Space Filter Bar */}
        <div style={{ padding: '16px 24px 12px', background: '#FFFFFF', borderBottom: '1px solid #EBECF0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search team boards or Jira spaces (e.g. Core, Mobile, ISW)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid #DFE1E6',
                  fontSize: '14px',
                  fontWeight: 500,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#6B778C',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Space Dropdown Selector */}
            <div style={{ minWidth: '180px' }}>
              <select
                value={selectedSpaceFilter}
                onChange={(e) => setSelectedSpaceFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid #DFE1E6',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: '#172B4D',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Jira Spaces ({uniqueSpaces.length})</option>
                {uniqueSpaces.map((sp) => (
                  <option key={sp.key} value={sp.key}>
                    [{sp.key}] {sp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Space Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#5E6C84', fontWeight: 700, textTransform: 'uppercase' }}>Filter Space:</span>
            <button
              onClick={() => setSelectedSpaceFilter('ALL')}
              style={{
                padding: '3px 8px',
                borderRadius: '12px',
                border: selectedSpaceFilter === 'ALL' ? '1px solid #0052CC' : '1px solid #DFE1E6',
                background: selectedSpaceFilter === 'ALL' ? '#DEEBFF' : '#FAFBFC',
                color: selectedSpaceFilter === 'ALL' ? '#0747A6' : '#42526E',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              All Spaces
            </button>
            {uniqueSpaces.map((sp) => (
              <button
                key={sp.key}
                onClick={() => setSelectedSpaceFilter(sp.key)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: selectedSpaceFilter === sp.key ? '1px solid #0052CC' : '1px solid #DFE1E6',
                  background: selectedSpaceFilter === sp.key ? '#DEEBFF' : '#FAFBFC',
                  color: selectedSpaceFilter === sp.key ? '#0747A6' : '#42526E',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                [{sp.key}] {sp.name}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Saved Presets Section */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#42526E', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
              Saved Team Presets ({savedPresets.length})
            </h3>

            {savedPresets.length === 0 ? (
              <SectionMessage appearance="information" title="No Saved Presets Yet">
                <p style={{ margin: '4px 0 0' }}>
                  Select boards below and click <strong>"Save Current Selection as New Named Preset"</strong> to revisit your filter every week!
                </p>
              </SectionMessage>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {savedPresets.map(preset => {
                  const isMatching =
                    preset.boardIds.length === selectedIds.length &&
                    preset.boardIds.every(id => selectedIds.includes(id));
                  return (
                    <div
                      key={preset.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: isMatching ? '2px solid #0052CC' : '1px solid #DFE1E6',
                        background: isMatching ? '#DEEBFF' : '#FAFBFC',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => onSelectPreset(preset)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#172B4D', fontSize: '14px', marginBottom: '4px' }}>
                          {preset.name}
                        </div>
                        {preset.description && (
                          <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: '8px', lineHeight: '1.3' }}>
                            {preset.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Badge appearance="primary">{preset.boardIds.length} Teams</Badge>
                          {preset.projectKeys && preset.projectKeys.length > 0 && (
                            <Badge appearance="default">{preset.projectKeys.join(', ')}</Badge>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete preset "${preset.name}"?`)) {
                              onDeletePreset(preset.id);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF5630',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #EBECF0', margin: '0' }} />

          {/* Grouped Board Selector Sections */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#42526E', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>
                Jira Spaces & Team Boards ({selectedIds.length} Selected)
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: '#0052CC', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Select All
                </button>
                <span style={{ color: '#C1C7D0' }}>|</span>
                <button
                  onClick={handleClearAll}
                  style={{ background: 'none', border: 'none', color: '#5E6C84', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {spaces.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#5E6C84', fontSize: '14px' }}>
                No teams or spaces found matching <strong>"{searchQuery}"</strong>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {spaces.map(space => {
                  const spaceBoardIds = space.boards.map(b => b.id);
                  const selectedInSpace = spaceBoardIds.filter(id => selectedIds.includes(id));
                  const isAllSpaceSelected = spaceBoardIds.length > 0 && selectedInSpace.length === spaceBoardIds.length;

                  return (
                    <div
                      key={space.spaceKey}
                      style={{
                        background: '#FAFBFC',
                        border: '1px solid #DFE1E6',
                        borderRadius: '8px',
                        padding: '14px 16px',
                      }}
                    >
                      {/* Space Header Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              background: '#0747A6',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {space.spaceKey}
                          </span>
                          <span style={{ fontWeight: 700, color: '#172B4D', fontSize: '14px' }}>
                            {space.spaceName}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6B778C' }}>
                            ({space.boards.length} board{space.boards.length !== 1 ? 's' : ''})
                          </span>
                        </div>

                        {/* Select Entire Space Button */}
                        <Button
                          appearance={isAllSpaceSelected ? 'warning' : 'primary'}
                          spacing="compact"
                          onClick={() => handleToggleSpace(space.boards)}
                        >
                          {isAllSpaceSelected
                            ? `Entire Space Selected (Click to Clear)`
                            : `+ Add Entire Space (${space.boards.length})`}
                        </Button>
                      </div>

                      {/* Board Cards Grid for this Space */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                        {space.boards.map(board => {
                          const isSelected = selectedIds.includes(board.id);
                          return (
                            <div
                              key={board.id}
                              onClick={() => handleToggleBoard(board.id)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: isSelected ? '2px solid #0052CC' : '1px solid #DFE1E6',
                                background: isSelected ? '#EAE6FF' : '#FFFFFF',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                userSelect: 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ cursor: 'pointer' }}
                              />
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#172B4D' }}>
                                  {board.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B778C', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                  <span style={{ textTransform: 'capitalize', background: '#EBECF0', padding: '1px 4px', borderRadius: '3px' }}>
                                    {board.type || 'Scrum'}
                                  </span>
                                  <span>[{space.spaceKey}]</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Preset Form Toggle */}
          {isCreatingNew ? (
            <div style={{ padding: '16px', background: '#F4F5F7', borderRadius: '8px', border: '1px solid #DFE1E6' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#172B4D' }}>
                Save Selection as Named Team Filter
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Preset Name (e.g. Monday Executive Review, Mobile & Core)"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #C1C7D0',
                    fontSize: '14px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  placeholder="Optional Description (e.g. Weekly cross-workstream view for engineering sync)"
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #C1C7D0',
                    fontSize: '13px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Button onClick={() => setIsCreatingNew(false)}>Cancel</Button>
                  <Button appearance="primary" onClick={handleSave} isDisabled={!presetName.trim() || isSaving || selectedIds.length === 0}>
                    {isSaving ? 'Saving...' : 'Save Preset'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button appearance="subtle-link" onClick={() => setIsCreatingNew(true)}>
                + Save Current Selection as New Named Preset
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #DFE1E6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FAFBFC',
          }}
        >
          <div style={{ fontSize: '13px', color: '#5E6C84' }}>
            {selectedIds.length === 0 ? 'Showing all teams & projects' : `Filtered to ${selectedIds.length} team board(s)`}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={() => {
                onApplyCustomSelection(selectedIds);
                onClose();
              }}
            >
              Apply Filter Selection ({selectedIds.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
