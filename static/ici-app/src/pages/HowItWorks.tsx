import React, { useState } from 'react';
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
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px 0', color: '#172B4D' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#172B4D' }}>
        How ICI Dashboard Modules Work
      </h1>
      <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#42526E', marginBottom: '24px' }}>
        Complete guide and methodology reference for both the <strong>Individual Contribution Index (ICI)</strong> and the <strong>Portfolio & Program Management Hub</strong>.
      </p>

      <Tabs id="how-it-works-tabs">
        <TabList>
          <Tab>ICI Scoring Methodology</Tab>
          <Tab>Portfolio & Program Management</Tab>
          <Tab>AI Executive Intelligence</Tab>
        </TabList>

        {/* TAB 1: ICI SCORING */}
        <TabPanel>
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#42526E', marginBottom: '32px' }}>
              The <strong>Individual Contribution Index (ICI)</strong> is an objective delivery analytics framework
              that measures four dimensions of engineering delivery using raw data from Jira.
              Every calculation is deterministic and transparent — no guesswork or manual entry.
            </p>

            {/* 4 Category Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              {/* On-Time */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0052CC' }}>
                    1. On-Time Delivery — 35% Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0052CC' }}>35 Points Max Contribution</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: '#0052CC' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E' }}>
                  Measures the percentage of committed due-dated tasks resolved on or before their due date.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                  On-Time Score = Min(Round((OnTimeIssues / EligibleIssues) * 100), 100)
                </pre>
              </div>

              {/* Delivered */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#00875A' }}>
                    2. Delivered Work — 25% Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#00875A' }}>30 Points Max Contribution (120% Cap)</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#00875A' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E' }}>
                  Measures story points resolved relative to the team average across the selected sprint range.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                  Delivered Score = Min(Round((PersonPoints / TeamAvgPoints) * 100), 120)
                </pre>
              </div>

              {/* Quality */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#FF5630' }}>
                    3. Quality Index — 25% Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#FF5630' }}>25 Points Max Contribution</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#FF5630' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E' }}>
                  Evaluates delivery quality by deducting score points for quality incidents (reopened tickets, review regressions, linked bugs).
                </p>
                <pre style={{ background: '#F4F5F7', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                  Incidents = ReopenedCount + ReviewRegressions + Ceil(LinkedBugs / 2)
                  Score Band: [0-1 inc = 100] [2-3 inc = 85] [4-5 inc = 70] [6-8 inc = 50] [9+ inc = 30]
                </pre>
              </div>

              {/* Collaboration */}
              <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#6554C0' }}>
                    4. Collaboration — 15% Weight
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6554C0' }}>18 Points Max Contribution (120% Cap)</span>
                </div>
                <div style={{ height: '6px', background: '#DFE1E6', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: '#6554C0' }}></div>
                </div>
                <p style={{ fontSize: '14px', color: '#42526E' }}>
                  Measures active engagement on colleagues' tasks by counting substantive comments (&gt;20 characters) left on other engineers' tickets.
                </p>
                <pre style={{ background: '#F4F5F7', padding: '12px', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}>
                  Collaboration Score = Min(Round((QualifyingComments / TeamAvgComments) * 100), 120)
                </pre>
              </div>
            </div>

            {/* Visual Chart */}
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px', color: '#172B4D' }}>
              Composite Formula Visual Model
            </h2>
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '24px', marginBottom: '32px' }}>
              <pre style={{ background: '#0747A6', color: '#FFFFFF', padding: '16px', borderRadius: '6px', fontSize: '15px', fontWeight: 700, textAlign: 'center' }}>
                ICI = (OnTime × 0.35) + (Delivered × 0.25) + (Quality × 0.25) + (Collaboration × 0.15)
              </pre>
              <div style={{ height: '240px', marginTop: '24px' }}>
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

            <SectionMessage title="What this score is NOT for" appearance="warning">
              <p style={{ margin: '4px 0 0 0', lineHeight: '1.5' }}>
                This score is a delivery analytics tool based strictly on Jira data. It does not capture mentoring,
                architectural guidance, or incident response outside of tickets.
              </p>
            </SectionMessage>
          </div>
        </TabPanel>

        {/* TAB 2: PORTFOLIO & PROGRAM MANAGEMENT */}
        <TabPanel>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0052CC', marginTop: 0 }}>
                1. Dual Epic Rollup Methodology
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E' }}>
                Program Managers and Product Managers can measure Epic completion using two complementary dimensions:
              </p>
              <ul>
                <li><strong>Story Point Completion %:</strong> <code>(Completed SP / Total SP) * 100</code> — Measures actual volume of delivered complexity.</li>
                <li><strong>Issue Count Completion %:</strong> <code>(Completed Child Issues / Total Child Issues) * 100</code> — Tracks task resolution cadence regardless of point sizing.</li>
              </ul>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#00875A', marginTop: 0 }}>
                2. Automated Risk Level Rules
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E' }}>
                Epics are algorithmically evaluated and assigned a risk status:
              </p>
              <ul>
                <li><strong style={{ color: '#00875A' }}>ON TRACK:</strong> Completion rate aligns with velocity, zero child issues blocked.</li>
                <li><strong style={{ color: '#FFAB00' }}>AT RISK:</strong> Has 1+ blocked child issue or &lt;40% SP completed despite high child issue count.</li>
                <li><strong style={{ color: '#FF5630' }}>CRITICAL:</strong> High WIP spillover (more items in progress than done) combined with multiple blocked dependencies.</li>
              </ul>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#6554C0', marginTop: 0 }}>
                3. Investment Distribution (Work Allocation)
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E' }}>
                Inspired by the DX & SPACE frameworks, work across selected teams is automatically categorized into 4 investment buckets:
              </p>
              <ul>
                <li><strong>Features (Value Creation):</strong> User stories, new product functionality.</li>
                <li><strong>Tech Debt (Sustainability):</strong> Refactoring, architecture upgrades, tech debt labels.</li>
                <li><strong>Bugs & Incidents (Friction):</strong> Production bugs, defects, and hotfixes.</li>
                <li><strong>Maintenance (Ops):</strong> System updates, CI/CD pipelines, and maintenance chores.</li>
              </ul>
            </div>
          </div>
        </TabPanel>

        {/* TAB 3: AI EXECUTIVE INTELLIGENCE */}
        <TabPanel>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0747A6', marginTop: 0 }}>
                AI Executive Digest Architecture
              </h3>
              <p style={{ fontSize: '14px', color: '#42526E', lineHeight: '1.6' }}>
                The <strong>ICI AI Executive Intelligence</strong> engine synthesizes raw multi-team Epic metrics, work allocation percentages, and blocker alerts into natural-language status briefings formatted specifically for executive leadership (VP of Engineering, CTO, CPO).
              </p>
              <div style={{ background: '#F4F5F7', padding: '16px', borderRadius: '6px', marginTop: '12px' }}>
                <strong>Key Output Structure:</strong>
                <ol style={{ marginTop: '8px', paddingLeft: '20px', color: '#172B4D', fontSize: '14px' }}>
                  <li><strong>Overall Health Banner:</strong> Instant visual rating (HEALTHY, NEEDS ATTENTION, AT RISK).</li>
                  <li><strong>Executive Summary Narrative:</strong> High-level progress description for Slack/Email updates.</li>
                  <li><strong>Key Highlights & Top Risks:</strong> Bulleted breakdown of major wins and active bottlenecks.</li>
                  <li><strong>Recommended Action Items:</strong> Strategic recommendations to unblock critical Epics.</li>
                </ol>
              </div>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};
