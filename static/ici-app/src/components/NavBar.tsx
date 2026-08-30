import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button';

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

  const navItems: { id: PageName; label: string; icon: string; condition?: boolean }[] = [
    { id: 'selector', label: 'Select Team', icon: '🎯' },
    { id: 'dashboard', label: 'Team ICI Leaderboard', icon: '📊', condition: hasDashboardData },
    { id: 'epic-tracker', label: 'Epic Tracker', icon: '🚀' },
    { id: 'iteration-progress', label: 'Iteration Progress', icon: '⚡' },
    { id: 'art-sync', label: 'ART Sync', icon: '🚂' },
    { id: 'delivery-insights', label: 'Delivery Insights', icon: '📈' },
    { id: 'ai-briefings', label: 'AI Briefings', icon: '✨' },
    { id: 'how-it-works', label: 'How It Works', icon: '📖' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        marginBottom: '28px',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 16px rgba(9, 30, 66, 0.06)',
        flexWrap: 'wrap',
        gap: '12px',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Brand Logo Badge */}
        <div
          onClick={() => onNavigate('selector')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #0747A6 0%, #0052CC 100%)',
            padding: '6px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(7, 71, 166, 0.25)',
            transition: 'transform 0.2s ease',
          }}
        >
          <span style={{ fontSize: '15px' }}>⚡</span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            ICI <span style={{ fontWeight: 400, opacity: 0.85 }}>Portfolio</span>
          </span>
          <span className="status-dot green" title="System Active & Connected" />
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {navItems.map(item => {
            if (item.condition === false) return null;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--nav-text)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 82, 204, 0.3)' : 'none',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            background: theme === 'dark' ? '#334155' : '#EBECF0',
            color: theme === 'dark' ? '#F8FAFC' : '#172B4D',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{theme === 'light' ? '🌙 Dark' : '☀️ Light'}</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          style={{
            background: currentPage === 'settings' ? 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)' : 'var(--card-bg)',
            color: currentPage === 'settings' ? '#FFFFFF' : 'var(--nav-text)',
            border: currentPage === 'settings' ? 'none' : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
