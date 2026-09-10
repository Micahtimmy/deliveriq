import React from 'react';
import SectionMessage from '@atlaskit/section-message';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

export const HowItWorks: React.FC = () => {
  const chartData = [
    { name: 'On-Time (35%)', score: 82, weight: 0.35, weighted: 28.7, color: '#0052CC' },
    { name: 'Delivered (25%)', score: 112, weight: 0.25, weighted: 28.0, color: '#00875A' },
    { name: 'Quality (25%)', score: 85, weight: 0.25, weighted: 21.25, color: '#FF5630' },
    { name: 'Collab (15%)', score: 95, weight: 0.15, weighted: 14.25, color: '#6554C0' },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 0', color: '#172B4D' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#172B4D' }}>
          DeliverIQ User Guide & Methodology Hub
        </h1>
        <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#42526E', margin: 0 }}>
          Comprehensive operating instructions, mathematical scoring models, and best practice playbooks for Engineering Leaders, Release Train Engineers (RTEs), and Scrum Masters.
        </p>
      </div>

      <Tabs id="how-it-works-tabs">
        <TabList>
          <Tab>📖 Quick Start & User Guide</Tab>
          <Tab>🧮 DeliverIQ Scoring Engine</Tab>
          <Tab>🎯 ART Sync & Portfolio Hub</Tab>
          <Tab>🤝 1-on-1 Coaching Playbook</Tab>
        </TabList>

        {/* TAB 1: QUICK START & USER GUIDE */}
        <TabPanel>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionMessage appearance="information" title="Welcome to DeliverIQ">
              <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                DeliverIQ connects directly to Jira Software Cloud to deliver deterministic, objective engineering delivery metrics, team performance rankings, Agile Release Train synchronization, and AI executive briefings.
              </p>
            </SectionMessage>

            {/* Step 1 */}
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: '#0052CC', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>1</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#172B4D' }}>
                  Select Board & Sprints (Team Selector)
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                Navigate to <strong>Select Team</strong>, pick any Scrum board, and choose one or more completed or active sprints. Click <strong>Generate Team Dashboard</strong> to compute live metrics.
              </p>
              <div style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#42526E' }}>
                💡 <strong>Tip:</strong> Selecting 2 to 4 consecutive sprints provides the most accurate normalized velocity and on-time baseline.
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: '#00875A', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>2</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#172B4D' }}>
                  Review Team Contributor Rankings
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                The <strong>Team Dashboard</strong> displays team-wide aggregates and ranks every engineer by their composite DeliverIQ score. Contributors are grouped into 4 clear performance tiers:
              </p>
              <ul style={{ fontSize: '14px', color: '#42526E', margin: '0 0 8px 20px', lineHeight: '1.6' }}>
                <li><strong style={{ color: '#00875A' }}>Strong Contributor (Score ≥ 90):</strong> Consistently delivers above average velocity with high on-time delivery and clean quality.</li>
                <li><strong style={{ color: '#0052CC' }}>On Track (Score 75 – 89):</strong> Reliable delivery meeting all core sprint commitments.</li>
                <li><strong style={{ color: '#FFAB00' }}>Below Target (Score 60 – 74):</strong> Notable friction in either due date drift, story point throughput, or review rejections.</li>
                <li><strong style={{ color: '#FF5630' }}>Needs Attention (Score &lt; 60):</strong> Requires immediate manager support or blockers resolution.</li>
              </ul>
              <div style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#42526E' }}>
                📊 <strong>CSV Export:</strong> Click <em>Export CSV</em> to download a spreadsheet of all team metrics and raw issue counts.
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: '#6554C0', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>3</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#172B4D' }}>
                  Drill Down into Contributor Deep-Dives
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                Click on any team member's row to open their <strong>Individual Contributor Radar</strong>. Inspect their 4-pillar breakdown, sprint carry-over rate, review regressions, unauthorized due date changes, and automated coaching recommendations.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ background: '#0747A6', color: '#FFFFFF', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>4</span>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#172B4D' }}>
                  Track Portfolio Epics & Multi-Team ART Sync
                </h3>
              </div>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6', margin: '0 0 8px 0' }}>
                Use <strong>ART Sync</strong> and <strong>Portfolio Dashboard</strong> to synchronize Agile Release Trains across multiple engineering squads. Click any KPI card (Committed Epics, Delivered SP, Iteration Performance) to open the interactive issue drill-down modal.
              </p>
            </div>
          </div>
        </TabPanel>

        {/* TAB 2: DELIVERIQ SCORING METHODOLOGY */}
        <TabPanel>
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#42526E', marginBottom: '24px' }}>
              DeliverIQ calculates an objective delivery composite using raw Jira Software events. Every formula is deterministic, transparent, and auditable.
            </p>

            {/* 4 Category Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              {/* On-Time */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0052CC' }}>
                    1. On-Time Delivery — 35% Default Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0052CC' }}>35 Max Composite Points</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: '#0052CC' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E', margin: '0 0 8px 0' }}>
                  Evaluates the percentage of due-dated tasks completed on or before their due date. Requires at least 3 eligible dated issues (<code>MIN_DATED_ISSUES = 3</code>); otherwise defaults to a neutral 60 baseline.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
                  On-Time Score = Min(Round((OnTimeIssues / EligibleIssues) * 100), 100)
                </pre>
              </div>

              {/* Delivered */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#00875A' }}>
                    2. Delivered Velocity — 25% Default Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00875A' }}>30 Max Composite Points (120% Cap)</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#00875A' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E', margin: '0 0 8px 0' }}>
                  Measures story points resolved relative to the team average across selected sprints. High-velocity contributors can earn up to 120% to reward outsized contributions without distorting peer benchmarks.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
                  Delivered Score = Min(Round((PersonPoints / TeamAvgPoints) * 100), 120)
                </pre>
              </div>

              {/* Quality */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#FF5630' }}>
                    3. Quality Index — 25% Default Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#FF5630' }}>25 Max Composite Points</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#FF5630' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E', margin: '0 0 8px 0' }}>
                  Measures defect density, reopens (Done $\to$ Active), and review regressions (In Review $\to$ In Progress) using calibrated incident tiers:
                </p>
                <pre style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
                  Incidents = ReopenedTasks + ReviewRegressions + Ceil(LinkedBugs / 2)
                  Bands: [0-1 Incidents = 100] [2-3 = 85] [4-5 = 70] [6-8 = 50] [9+ = 30]
                </pre>
              </div>

              {/* Collaboration */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#6554C0' }}>
                    4. Collaboration & Reviews — 15% Default Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6554C0' }}>18 Max Composite Points (120% Cap)</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: '#6554C0' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E', margin: '0 0 8px 0' }}>
                  Rewards active peer assistance and thorough code review discussions. Counts substantive comments (&gt;20 characters) authored on tickets assigned to teammates.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', margin: 0 }}>
                  Collaboration Score = Min(Round((QualifyingComments / TeamAvgComments) * 100), 120)
                </pre>
              </div>
            </div>

            {/* Composite Visual Chart */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '14px', color: '#172B4D' }}>
              DeliverIQ Composite Score Visual Model
            </h2>
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
              <pre style={{ background: '#0747A6', color: '#FFFFFF', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                DeliverIQ = (OnTime × 0.35) + (Delivered × 0.25) + (Quality × 0.25) + (Collab × 0.15)
              </pre>
              <div style={{ height: '220px', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 120]} />
                    <RechartsTooltip />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* TAB 3: ART SYNC & PORTFOLIO */}
        <TabPanel>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0052CC', marginTop: 0 }}>
                1. Dual Epic Rollup Methodology
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                Program Managers and Product Managers can measure Epic completion across two complementary dimensions:
              </p>
              <ul style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                <li><strong>Story Point Completion %:</strong> <code>(Delivered SP / Total SP) * 100</code> — Measures actual volume of delivered complexity.</li>
                <li><strong>Task Count Completion %:</strong> <code>(Resolved Tasks / Total Tasks) * 100</code> — Tracks task resolution cadence regardless of point sizing.</li>
              </ul>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#00875A', marginTop: 0 }}>
                2. Automated Risk Level Engine
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                Epics are algorithmically evaluated and assigned an actionable health status:
              </p>
              <ul style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                <li><strong style={{ color: '#00875A' }}>ON TRACK:</strong> Completion rate aligns with velocity, zero child issues blocked.</li>
                <li><strong style={{ color: '#FFAB00' }}>AT RISK:</strong> Has 1+ blocked child issue or &lt;40% SP completed despite high child issue count.</li>
                <li><strong style={{ color: '#FF5630' }}>CRITICAL:</strong> High WIP spillover (more items in progress than done) combined with multiple blocked dependencies.</li>
              </ul>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#6554C0', marginTop: 0 }}>
                3. Work Effort Allocation Breakdown
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                Categorizes all sprint work into 4 investment buckets:
              </p>
              <ul style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                <li><strong>Features (Value Creation):</strong> User stories and new product functionality.</li>
                <li><strong>Tech Debt (Sustainability):</strong> Architecture refactoring, framework upgrades, tech debt tickets.</li>
                <li><strong>Bugs & Incidents (Friction):</strong> Production defects, bug fixes, and hotfixes.</li>
                <li><strong>Maintenance (Ops):</strong> Infrastructure updates, build pipelines, and maintenance chores.</li>
              </ul>
            </div>
          </div>
        </TabPanel>

        {/* TAB 4: 1-ON-1 COACHING PLAYBOOK */}
        <TabPanel>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionMessage appearance="success" title="Coaching with Empathy and Data">
              <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                DeliverIQ metrics are designed to facilitate constructive conversations, unblock bottlenecks, and highlight high performers. Never use metrics in isolation without qualitative context.
              </p>
            </SectionMessage>

            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0747A6', marginTop: 0 }}>
                1-on-1 Discussion Guides by Signal
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <div style={{ borderLeft: '4px solid #0052CC', paddingLeft: '12px' }}>
                  <strong style={{ color: '#172B4D', fontSize: '14px' }}>Signal: High Carry-Over Rate (&gt;40%)</strong>
                  <p style={{ fontSize: '13px', color: '#42526E', margin: '4px 0' }}>
                    <em>Manager Prompt:</em> "I noticed several tasks carried across sprints. Were acceptance criteria unclear at kickoff, or did unexpected dependencies arise mid-sprint?"
                  </p>
                  <span style={{ fontSize: '12px', color: '#0052CC', fontWeight: 600 }}>Action: Encourage breaking 5+ SP stories into smaller independent tasks.</span>
                </div>

                <div style={{ borderLeft: '4px solid #FF5630', paddingLeft: '12px' }}>
                  <strong style={{ color: '#172B4D', fontSize: '14px' }}>Signal: Elevated Review Regressions (In Review $\to$ Active)</strong>
                  <p style={{ fontSize: '13px', color: '#42526E', margin: '4px 0' }}>
                    <em>Manager Prompt:</em> "Let's review the definition-of-done checklist together. Would a quick alignment call with the code reviewer before submission help streamline reviews?"
                  </p>
                  <span style={{ fontSize: '12px', color: '#FF5630', fontWeight: 600 }}>Action: Establish pre-PR automated test verification.</span>
                </div>

                <div style={{ borderLeft: '4px solid #00875A', paddingLeft: '12px' }}>
                  <strong style={{ color: '#172B4D', fontSize: '14px' }}>Signal: High Collaboration (&gt;100% Score)</strong>
                  <p style={{ fontSize: '13px', color: '#42526E', margin: '4px 0' }}>
                    <em>Manager Prompt:</em> "Your active code reviews and technical guidance on teammates' tickets have been outstanding. Thank you for elevating the team's delivery."
                  </p>
                  <span style={{ fontSize: '12px', color: '#00875A', fontWeight: 600 }}>Action: Highlight contributor during sprint retrospectives.</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};
