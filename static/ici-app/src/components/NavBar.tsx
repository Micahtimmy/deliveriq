import React, { useEffect, useState } from 'react';

export type PageName =
  | 'selector'
  | 'dashboard'
  | 'epic-tracker'
  | 'iteration-progress'
  | 'art-sync'
  | 'delivery-insights'
  | 'ai-briefings'
  | 'individual'
  | 'how-it-works'
  | 'settings';

interface NavBarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  hasDashboardData: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentPage,
  onNavigate,
  hasDashboardData,
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

  const navItems: { id: PageName; label: string; condition?: boolean }[] = [
    { id: 'selector', label: 'Select Team' },
    { id: 'dashboard', label: 'Team Dashboard', condition: hasDashboardData },
    { id: 'epic-tracker', label: 'Epic Tracker' },
    { id: 'iteration-progress', label: 'Iteration Progress' },
    { id: 'art-sync', label: 'ART Sync' },
    { id: 'delivery-insights', label: 'Delivery Insights' },
    { id: 'ai-briefings', label: 'Executive Briefings' },
    { id: 'how-it-works', label: 'User Guide & Methodology' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        marginBottom: '24px',
        background: 'var(--nav-bg)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
        flexWrap: 'wrap',
        gap: '12px',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Brand Logo Badge */}
        <div
          onClick={() => onNavigate('selector')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0747A6',
            padding: '5px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.2px' }}>
            DeliverIQ
          </span>
          <span className="status-dot green" title="System Active & Connected" />
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
          {navItems.map(item => {
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme Toggle Button */}
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
          }}
        >
          Settings
        </button>
      </div>
    </nav>
  );
};
