# ICI Dashboard — Program & Portfolio Management Platform
> **Atlassian Forge Custom UI App for Jira Cloud**  
> *Objective, transparent engineering contributor intelligence, multi-team portfolio tracking, and Agile Release Train (ART) iteration synchronization.*

---

## 📌 Executive Summary

The **Individual Contribution Index (ICI) Dashboard** is a production-grade Atlassian Forge application designed for Engineering Directors, Program Managers (RTEs), and Scrum Masters. It transforms raw Jira Software telemetry into actionable engineering insights, equitable individual contributor assessments, and multi-team release train visibility.

ICI eliminates subjectivity in performance reviews and sprint retrospectives by evaluating engineers across four foundational pillars while providing real-time Agile Release Train synchronization across complex multi-project portfolios.

---

## 🌟 Core Modules

### 1. 🎯 Agile Release Train (ART) Sync & Iteration Overview
*Direct alignment with SAFe (Scaled Agile Framework) and multi-team program increment execution.*
- **Cross-Team & Workstream Tracking:** Monitor execution velocity, commitment reliability, and completion across teams (e.g., Workplace Productivity, Core Platform, Mobile Experience, Security & Infrastructure).
- **Dynamic Feature & Epic Filtering:** Select any Feature/Epic in the train to instantly isolate and populate its underlying child tasks, acceptance criteria, story point estimates, assignees, and real-time status.
- **6 Key Synchronized KPI Cards:**
  - **Epics Committed in Iteration** (Cyan Badge)
  - **Tasks Committed in Iteration** (Magenta Badge)
  - **Tasks Completed in Iteration** (Blue Badge)
  - **Iteration Performance %** (Green Badge)
  - **Story Points Committed** (Navy Badge)
  - **Story Points Completed / Delivered Velocity** (Amber Badge)
- **Collapsible Iteration Objectives:** Track program increment goals and hardware/software milestones.
- **Interactive Traceability Modals:** Click any KPI card to drill down into the underlying Jira issues with direct hyperlinks.

### 2. 📊 Team Dashboard & Performance Ranking
- **Objective Contributor Ranking:** Ranks all team members by composite ICI score across selected sprints.
- **Performance Tiers:** Categorizes contributors into:
  - 🟢 **Strong Contributor** ($\text{ICI} \ge 90$)
  - 🔵 **On Track** ($75 \le \text{ICI} < 90$)
  - 🟡 **Below Target** ($60 \le \text{ICI} < 75$)
  - 🔴 **Needs Attention** ($\text{ICI} < 60$)
- **Team-Wide Health Aggregates:** Average ICI, delivered velocity, on-time delivery rate, and quality incident density.
- **CSV Data Export:** Export full contributor performance summaries and raw telemetry for enterprise reporting.
- **One-Click Live Cache Invalidation:** Instantly refresh metrics against live Jira data.

### 3. 🔍 Individual Contributor Deep-Dive
- **Four-Pillar Radar Breakdown:**
  - ⏱️ **On-Time Delivery (35% default weight):** Resolution vs. committed due dates for due-dated tasks.
  - 🚀 **Delivered Velocity (25% default weight):** Story points resolved normalized against team average (capped at 120%).
  - 🛡️ **Work Quality (25% default weight):** Incident-banded penalty evaluation (reopened tickets, review regressions, and linked defect density).
  - 🤝 **Collaboration & Reviews (15% default weight):** Substantive comments ($>20$ chars) on colleagues' tickets normalized against team average (capped at 120%).
- **Behavioral Signal Detection:**
  - **Carry-Over Analysis:** Detects sprint churn and tickets repeatedly carried across multiple sprints.
  - **Status Regression Engine:** Flags tickets moved backwards (e.g., In Review $\to$ In Progress / Active).
  - **Unauthorized Due Date Drift:** Identifies due date changes made without manager/approver authorization.
- **Automated Coaching Suggestions:** Generates targeted, constructive recommendations linked to specific Jira keys.

### 4. 🚀 Multi-Team Portfolio Tracker & AI Executive Briefings
- **Multi-Board Preset Manager:** Save and manage multi-team groupings (e.g., *Payments Squad*, *Core Platform ART*, *Consumer Mobile*).
- **Cross-Project Epic Hierarchy:** Visual progress bars, story point rollups, and child issue completion rates across Jira projects.
- **Work Effort Allocation Breakdown:** Real-time distribution of effort across *Features*, *Tech Debt*, *Bugs*, and *Maintenance*.
- **Dependency & Blocker Radar:** Identifies cross-issue links (*blocks* / *is blocked by*) and flags critical path bottlenecks.
- **AI Executive Briefing Generator:** Synthesizes overall health, key highlights, top risks, and actionable recommendations with one-click clipboard copying.

### 5. 📖 Methodology & Mathematical Proofs ("How It Works")
- Interactive, transparent in-app documentation explaining every formula, weight, penalty band, and outlier capping rule.

### 6. ⚙️ Governance & Configuration
- **Custom Dimension Weights:** Customise the 4 scoring weights to match organizational priorities (must sum to 100%).
- **Story Points Field Auto-Discovery:** Automatically scans Jira fields for custom story point IDs (e.g. `customfield_10016`, `customfield_10028`).
- **Authorized Approver Configuration:** Search and designate authorized managers for due date modifications.
- **Configurable Caching:** Forge Storage persistence with 60-minute default TTL and manual purge options.

---

## 🧮 Mathematical Scoring Methodology

$$\text{ICI} = w_{\text{onTime}} \cdot S_{\text{onTime}} + w_{\text{delivered}} \cdot S_{\text{delivered}} + w_{\text{quality}} \cdot S_{\text{quality}} + w_{\text{collab}} \cdot S_{\text{collab}}$$

### 1. On-Time Delivery Score ($S_{\text{onTime}}$)
Evaluates resolution date ($R$) against the issue due date ($D$):

$$S_{\text{onTime}} = \min\left(\text{Round}\left(\frac{\text{OnTimeIssues}}{\text{EligibleIssues}} \times 100\right), \, 100\right)$$

*Requirement:* Contributor must have $\ge 3$ eligible due-dated tasks (`MIN_DATED_ISSUES = 3`). If fewer than 3 tasks exist, $S_{\text{onTime}} = \text{null}$ and a neutral baseline of 60 is applied in standard scoring.

### 2. Delivered Velocity Score ($S_{\text{delivered}}$)
Measures story points completed relative to the team's average delivery:

$$S_{\text{delivered}} = \min\left(\text{Round}\left(\frac{P_{\text{person}}}{P_{\text{teamAvg}}} \times 100\right), \, 120\right)$$

- High-velocity contributors can earn up to a **120% cap** (up to 30 composite index points under standard 25% weighting).
- If team points are zero, a neutral score of 50 is assigned.
- If story points are unpopulated on an issue, deterministic issue-type fallback weights apply (*Bug: 1, Task: 2, Story: 3, Epic: 5*).

### 3. Work Quality Score ($S_{\text{quality}}$)
Quality incidents are evaluated across three dimensions:

$$\text{Incidents} = \text{ReopenedCount} + \text{ReviewRegressions} + \left\lceil\frac{\text{LinkedBugs}}{2}\right\rceil$$

Scores are determined by calibrated incident thresholds:

| Total Incidents | Quality Score | Evaluation |
| :--- | :---: | :--- |
| **0 – 1** | **100** | Exceptional delivery quality |
| **2 – 3** | **85** | Minor acceptable churn |
| **4 – 5** | **70** | Moderate quality friction |
| **6 – 8** | **50** | Elevated defect density |
| **9+** | **30** | Critical stability intervention required |

### 4. Collaboration Score ($S_{\text{collab}}$)
Evaluates code review and technical support on tickets assigned to teammates:

$$S_{\text{collab}} = \min\left(\text{Round}\left(\frac{C_{\text{person}}}{C_{\text{teamAvg}}} \times 100\right), \, 120\right)$$

- Counts comments $>20$ characters on issues where assignee $\ne$ contributor.
- Capped at **120%** (up to 18 composite index points under standard 15% weighting).
- If team collaboration average is zero, a neutral score of 50 is assigned.

---

## 🏗️ Architecture & Technology Stack

```
ici-dashboard/
├── manifest.yml                          ← Atlassian Forge Manifest & Scopes
├── package.json                          ← Backend Dependencies & Test Scripts
├── tsconfig.json                         ← Backend TypeScript Config
│
├── src/                                  ← Backend Resolvers & Scoring Engine
│   ├── resolvers/
│   │   ├── index.ts                      ← Resolver function dispatcher
│   │   ├── boards.ts                     ← getBoards() & story point auto-discovery
│   │   ├── sprints.ts                    ← getSprints()
│   │   ├── issues.ts                     ← getIssues() with pagination & changelog
│   │   ├── scores.ts                     ← getTeamScores() & score caching
│   │   ├── portfolio.ts                  ← getPortfolioData() & getARTSyncData()
│   │   └── users.ts                      ← searchJiraUsers()
│   ├── lib/
│   │   ├── __tests__/                    ← Vitest Unit Test Suites
│   │   │   ├── scoring.test.ts
│   │   │   ├── signals.test.ts
│   │   │   ├── improvements.test.ts
│   │   │   └── portfolio.test.ts
│   │   ├── scoring.ts                    ← Pure mathematical scoring functions
│   │   ├── signals.ts                    ← Behavioral signal detectors
│   │   ├── improvements.ts               ← Coaching suggestions generator
│   │   ├── portfolio.ts                  ← Portfolio aggregation & AI briefing generator
│   │   └── constants.ts                  ← Thresholds, weights, bands, and status maps
│   └── types/
│       ├── jira.ts                       ← Jira REST API & CHANGE-2046 types
│       ├── scoring.ts                    ← Contributor score types
│       └── portfolio.ts                  ← Portfolio & ART Sync data contracts
│
└── static/
    └── ici-app/                          ← React + TypeScript Custom UI Frontend
        ├── package.json                  ← Frontend Dependencies (Vite, Atlaskit, Recharts)
        ├── tsconfig.json                 ← Frontend TypeScript Config
        ├── vite.config.ts                ← Build & Bundle Configuration
        └── src/
            ├── App.tsx                   ← Primary Layout & Navigation Router
            ├── components/               ← Atlaskit UI Components & Modals
            │   ├── NavBar.tsx
            │   ├── TierBadge.tsx
            │   ├── LoadingSpinner.tsx
            │   ├── ErrorBanner.tsx
            │   ├── PaginationControls.tsx
            │   ├── KPITraceabilityModal.tsx
            │   ├── EpicChildIssuesModal.tsx
            │   ├── TeamPresetManager.tsx
            │   └── UserSelect.tsx
            ├── pages/                    ← Core Application Views
            │   ├── TeamSelector.tsx      ← Screen 1: Board & Sprint Picker
            │   ├── TeamDashboard.tsx     ← Screen 2: Ranked Contributor Table
            │   ├── IndividualDetail.tsx  ← Screen 3: Individual Contributor Radar
            │   ├── PortfolioDashboard.tsx← Screen 4: Multi-Team Portfolio Tracker
            │   ├── ARTSyncDashboard.tsx  ← Screen 5: Agile Release Train Sync
            │   ├── HowItWorks.tsx        ← Screen 6: Calculation Methodology
            │   └── Settings.tsx          ← Screen 7: Governance & Configuration
            └── utils/
                ├── bridge.ts             ← Safe Forge invoke bridge
                └── jiraUrl.tsx           ← Jira deep-linking utilities
```

- **Framework:** Atlassian Forge with Custom UI
- **Backend Runtime:** Node.js (`nodejs22.x`) TypeScript on Atlassian Forge FaaS
- **Frontend Stack:** React 18, TypeScript, Vite, `@atlaskit` design system, Recharts
- **API Standards:** Compliant with Atlassian REST API CHANGE-2046 pagination & JQL standards
- **Security:** Forge User Impersonation (`api.asUser()`), granular OAuth scopes, zero third-party telemetry

---

## 🚀 Setup, Testing & Deployment

### 1. Prerequisites
- Node.js (v18, v20, or v22 LTS)
- Atlassian Forge CLI:
  ```bash
  npm install -g @forge/cli
  forge login
  ```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd ici-dashboard
npm install

# Install frontend dependencies
cd static/ici-app
npm install
cd ../..
```

### 3. Run Automated Tests
Execute the backend Vitest test suites (scoring, signals, improvements, portfolio):
```bash
npm test
```

### 4. Build Frontend Custom UI
```bash
cd static/ici-app
npm run build
cd ../..
```

### 5. Validate Forge Manifest
```bash
forge lint
```

### 6. Local Development Tunnel
To test live against a connected Jira site:
```bash
forge tunnel
```

### 7. Deploy to Jira Cloud
Deploy the application to the development or production environment:
```bash
# Deploy code bundle to production environment
forge deploy -e production

# Upgrade or install on Jira site
forge install --upgrade -e production --site your-site.atlassian.net --product jira
```

---

## 🔒 Security & Compliance
- **Zero External Egress:** All calculations, aggregations, and storage occur strictly within the Atlassian Forge Cloud trust boundary.
- **Role-Based Access:** Respects native Jira project permissions, issue-level security, and board visibility automatically.
- **Privacy First:** Only metadata required for index computation (timestamps, story points, status transitions) is processed.

---

## 📄 License
Internal Enterprise License. Built for Engineering Management and SAFe Agile Release Trains.
