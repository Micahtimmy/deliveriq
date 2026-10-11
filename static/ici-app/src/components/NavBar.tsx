import React, { useEffect, useState } from 'react';

export type AppMode = 'ici' | 'deliveriq';

export type PageName =
  | 'selector'
  | 'dashboard'
  | 'individual'
  | 'how-it-works'
  | 'settings'
  | 'art-sync'
  | 'iteration-progress'
  | 'epic-tracker'
  | 'delivery-insights'
  | 'ai-briefings';

interface NavBarProps {
  appMode: AppMode;
  onSelectApp: (mode: AppMode) => void;
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  hasDashboardData: boolean;
  hasSelectedPerson: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  appMode,
  onSelectApp,
  currentPage,
  onNavigate,
  hasDashboardData,
  hasSelectedPerson,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ici-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('ici-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }

  // Pure ICI Navigation Items
  const iciNavItems: { id: PageName; label: string; condition?: boolean }[] = [
    { id: 'selector', label: 'Select Team & Sprints' },
    { id: 'dashboard', label: 'Team Leaderboard', condition: hasDashboardData },
    { id: 'individual', label: 'Individual Detail', condition: hasSelectedPerson },
    { id: 'how-it-works', label: 'Methodology & Guide' },
  ];

  // Enterprise DeliverIQ Navigation Items
  const deliveriqNavItems: { id: PageName; label: string; condition?: boolean }[] = [
    { id: 'art-sync', label: 'ART Sync' },
    { id: 'iteration-progress', label: 'Iteration Progress' },
    { id: 'epic-tracker', label: 'Epic Tracker' },
    { id: 'delivery-insights', label: 'Delivery Insights' },
    { id: 'ai-briefings', label: 'Executive Briefings' },
  ];

  const activeNavItems = appMode === 'ici' ? iciNavItems : deliveriqNavItems;

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        marginBottom: '24px',
        background: 'var(--nav-bg)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
        flexWrap: 'wrap',
        gap: '14px',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Enterprise App Workspace Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-subtle, #EBECF0)',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #DFE1E6)',
            gap: '2px',
          }}
        >
          <button
            onClick={() => onSelectApp('ici')}
            title="Switch to ICI Contributor Index"
            style={{
              background: appMode === 'ici' ? '#0052CC' : 'transparent',
              color: appMode === 'ici' ? '#FFFFFF' : 'var(--nav-text)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: appMode === 'ici' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🎯 ICI Contributor Index</span>
            {appMode === 'ici' && <span className="status-dot green" />}
          </button>

          <button
            onClick={() => onSelectApp('deliveriq')}
            title="Switch to DeliverIQ Portfolio & ART Sync"
            style={{
              background: appMode === 'deliveriq' ? '#0747A6' : 'transparent',
              color: appMode === 'deliveriq' ? '#FFFFFF' : 'var(--nav-text)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: appMode === 'deliveriq' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🚀 DeliverIQ (ART & Portfolio)</span>
            {appMode === 'deliveriq' && <span className="status-dot green" />}
          </button>
        </div>

        <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

        {/* Dynamic Navigation Items for Active App */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {activeNavItems.map(item => {
            if (item.condition === false) return null;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  background: isActive ? '#0052CC' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--nav-text)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Controls: Theme Toggle & Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            background: 'transparent',
            color: 'var(--nav-text)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>

        <button
          onClick={() => onNavigate('settings')}
          style={{
            background: currentPage === 'settings' ? '#0052CC' : 'transparent',
            color: currentPage === 'settings' ? '#FFFFFF' : 'var(--nav-text)',
            border: currentPage === 'settings' ? 'none' : '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
