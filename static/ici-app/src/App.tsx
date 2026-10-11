import React, { useState, useEffect } from 'react';
import { NavBar, PageName, AppMode } from './components/NavBar';
import { TeamSelector } from './pages/TeamSelector';
import { TeamDashboard } from './pages/TeamDashboard';
import { IndividualDetail } from './pages/IndividualDetail';
import { PortfolioDashboard } from './pages/PortfolioDashboard';
import { IterationDashboard } from './pages/IterationDashboard';
import { ARTSyncDashboard } from './pages/ARTSyncDashboard';
import { HowItWorks } from './pages/HowItWorks';
import { Settings } from './pages/Settings';
import { PersonScore, TeamScoreResult } from './types/scoring';

function getInitialAppMode(): AppMode {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('deliveriq') || hash.includes('art') || hash.includes('portfolio')) {
      return 'deliveriq';
    }
    if (hash.includes('ici') || hash.includes('contributor')) {
      return 'ici';
    }
    const params = new URLSearchParams(window.location.search);
    const appParam = params.get('app')?.toLowerCase();
    if (appParam === 'deliveriq') return 'deliveriq';
    if (appParam === 'ici') return 'ici';

    const saved = localStorage.getItem('ici-active-app') as AppMode | null;
    if (saved === 'deliveriq' || saved === 'ici') return saved;
  }
  return 'ici';
}

function getInitialPage(appMode: AppMode): PageName {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('iteration')) return 'iteration-progress';
    if (hash.includes('art-sync')) return 'art-sync';
    if (hash.includes('epic')) return 'epic-tracker';
    if (hash.includes('insights')) return 'delivery-insights';
    if (hash.includes('briefing')) return 'ai-briefings';
    if (hash.includes('guide') || hash.includes('methodology')) return 'how-it-works';
    if (hash.includes('settings')) return 'settings';
    if (hash.includes('dashboard')) return 'dashboard';
    if (hash.includes('selector')) return 'selector';
  }
  return appMode === 'ici' ? 'selector' : 'art-sync';
}

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>(getInitialAppMode);
  const [currentPage, setCurrentPage] = useState<PageName>(() => getInitialPage(getInitialAppMode()));

  const [dashboardData, setDashboardData] = useState<TeamScoreResult | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonScore | null>(null);

  const [storyPointsField, setStoryPointsField] = useState<string>('customfield_10016');
  const [authorizedApproverId, setAuthorizedApproverId] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('ici-active-app', appMode);
  }, [appMode]);

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.toLowerCase();
      if (
        hash.includes('deliveriq') ||
        hash.includes('art') ||
        hash.includes('portfolio') ||
        hash.includes('iteration') ||
        hash.includes('epic') ||
        hash.includes('insight') ||
        hash.includes('briefing')
      ) {
        setAppMode('deliveriq');
        if (hash.includes('iteration')) setCurrentPage('iteration-progress');
        else if (hash.includes('epic')) setCurrentPage('epic-tracker');
        else if (hash.includes('insight')) setCurrentPage('delivery-insights');
        else if (hash.includes('briefing')) setCurrentPage('ai-briefings');
        else setCurrentPage('art-sync');
      } else if (
        hash.includes('ici') ||
        hash.includes('selector') ||
        hash.includes('dashboard') ||
        hash.includes('how-it-works') ||
        hash.includes('settings')
      ) {
        setAppMode('ici');
        if (hash.includes('how-it-works') || hash.includes('guide')) setCurrentPage('how-it-works');
        else if (hash.includes('settings')) setCurrentPage('settings');
        else if (hash.includes('dashboard')) setCurrentPage(dashboardData ? 'dashboard' : 'selector');
        else setCurrentPage('selector');
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [dashboardData]);

  function handleSelectApp(newMode: AppMode) {
    if (newMode === appMode) return;
    setAppMode(newMode);
    if (newMode === 'ici') {
      setCurrentPage(dashboardData ? 'dashboard' : 'selector');
      if (typeof window !== 'undefined') {
        window.location.hash = '#/ici';
      }
    } else {
      setCurrentPage('art-sync');
      if (typeof window !== 'undefined') {
        window.location.hash = '#/deliveriq';
      }
    }
  }

  function handleScoresLoaded(
    result: TeamScoreResult,
    spField: string,
    approverId: string
  ) {
    setDashboardData(result);
    setStoryPointsField(spField);
    setAuthorizedApproverId(approverId);
    setCurrentPage('dashboard');
  }

  function handleSelectPerson(person: PersonScore) {
    setSelectedPerson(person);
    setCurrentPage('individual');
  }

  function handleNavigate(page: PageName) {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${appMode}/${page}`;
    }
  }

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '24px 20px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      }}
    >
      <NavBar
        appMode={appMode}
        onSelectApp={handleSelectApp}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        hasDashboardData={dashboardData !== null}
        hasSelectedPerson={selectedPerson !== null}
      />

      <main>
        {/* =========================================
            APP 1: ICI CONTRIBUTOR INDEX
            ========================================= */}
        {appMode === 'ici' && (
          <>
            {currentPage === 'selector' && (
              <TeamSelector
                onScoresLoaded={handleScoresLoaded}
                onGoToSettings={() => setCurrentPage('settings')}
              />
            )}

            {currentPage === 'dashboard' && dashboardData && (
              <TeamDashboard
                data={dashboardData}
                onSelectPerson={handleSelectPerson}
                onRefreshData={updated => setDashboardData(updated)}
                onChangeBoard={() => setCurrentPage('selector')}
                storyPointsField={storyPointsField}
                authorizedApproverId={authorizedApproverId}
              />
            )}

            {currentPage === 'individual' && selectedPerson && dashboardData && (
              <IndividualDetail
                person={selectedPerson}
                totalTeamCount={dashboardData.scores.length}
                weights={dashboardData.weights}
                onBack={() => setCurrentPage('dashboard')}
              />
            )}

            {currentPage === 'how-it-works' && <HowItWorks />}

            {currentPage === 'settings' && <Settings />}
          </>
        )}

        {/* =========================================
            APP 2: DELIVERIQ PORTFOLIO & ART SYNC
            ========================================= */}
        {appMode === 'deliveriq' && (
          <>
            {currentPage === 'art-sync' && <ARTSyncDashboard />}
            {currentPage === 'iteration-progress' && <IterationDashboard />}
            {currentPage === 'epic-tracker' && <PortfolioDashboard initialTabIndex={0} />}
            {currentPage === 'delivery-insights' && <PortfolioDashboard initialTabIndex={2} />}
            {currentPage === 'ai-briefings' && <PortfolioDashboard initialTabIndex={3} />}
            {currentPage === 'settings' && <Settings />}
          </>
        )}
      </main>
    </div>
  );
}
