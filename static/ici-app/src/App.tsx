import React, { useState } from 'react';
import { NavBar, PageName } from './components/NavBar';
import { TeamSelector } from './pages/TeamSelector';
import { TeamDashboard } from './pages/TeamDashboard';
import { IndividualDetail } from './pages/IndividualDetail';
import { PortfolioDashboard } from './pages/PortfolioDashboard';
import { ARTSyncDashboard } from './pages/ARTSyncDashboard';
import { HowItWorks } from './pages/HowItWorks';
import { Settings } from './pages/Settings';
import { PersonScore, TeamScoreResult } from './types/scoring';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageName>('selector');
  const [dashboardData, setDashboardData] = useState<TeamScoreResult | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonScore | null>(null);

  const [storyPointsField, setStoryPointsField] = useState<string>('customfield_10016');
  const [authorizedApproverId, setAuthorizedApproverId] = useState<string>('');

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
  }

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      }}
    >
      <NavBar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        hasDashboardData={dashboardData !== null}
      />

      <main>
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
            storyPointsField={storyPointsField}
            authorizedApproverId={authorizedApproverId}
          />
        )}

        {/* 4 Dedicated Portfolio Sub-Module Routes + ART Sync */}
        {currentPage === 'epic-tracker' && <PortfolioDashboard initialTabIndex={0} />}
        {currentPage === 'iteration-progress' && <PortfolioDashboard initialTabIndex={1} />}
        {currentPage === 'art-sync' && <ARTSyncDashboard />}
        {currentPage === 'delivery-insights' && <PortfolioDashboard initialTabIndex={2} />}
        {currentPage === 'ai-briefings' && <PortfolioDashboard initialTabIndex={3} />}


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
      </main>
    </div>
  );
}
