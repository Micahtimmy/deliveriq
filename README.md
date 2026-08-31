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
  - 🟢 **Strong Contributor** (ICI ≥ 85)
  - 🔵 **On Track** (70 ≤ ICI < 85)
  - 🟡 **Below Target** (55 ≤ ICI < 70)
  - 🔴 **Needs Attention** (ICI < 55)
- **Team-Wide Health Aggregates:** Average ICI, delivered velocity, on-time delivery rate, and quality incident density.
- **One-Click Live Cache Invalidation:** Instantly refresh metrics against live Jira data.

### 3. 🔍 Individual Contributor Deep-Dive
- **Four-Pillar Radar Breakdown:**
  - ⏱️ **On-Time Delivery (35% default weight):** Resolution vs. sprint end dates and due dates.
  - 🚀 **Delivered Velocity (35% default weight):** Story points completed normalized against team average.
  - 🛡️ **Work Quality (20% default weight):** Defect density, regressions, and reopened tickets.
  - 🤝 **Collaboration & Reviews (10% default weight):** PR/code review comments and cross-ticket technical guidance.
- **Behavioral Signal Detection:**
  - **Carry-Over Analysis:** Detects sprint churn and tickets repeatedly carried across multiple sprints.
  - **Status Regression Engine:** Flags tickets moved backwards (e.g., QA → In Progress, Done → Reopened).
  - **Unauthorized Due Date Drift:** Identifies due date changes made without manager/approver authorization.
- **Automated Coaching Suggestions:** Generates targeted, positive, constructive recommendations with linked Jira keys.

### 4. 🚀 Multi-Team Portfolio Tracker & AI Executive Briefings
- **Multi-Board Preset Manager:** Save and manage multi-team groupings (e.g. *Payments Squad*, *Core Platform ART*, *Consumer Mobile*).
- **Cross-Project Epic Hierarchy:** Visual progress bars, story point rollups, and child issue completion rates across Jira projects.
- **Work Effort Allocation Breakdown:** Real-time distribution of effort across *Features*, *Tech Debt*, *Bugs*, and *Maintenance*.
- **Dependency & Blocker Radar:** Identifies cross-issue links (blocks / is blocked by) and flags critical path bottlenecks.
- **AI Executive Briefing Generator:** Synthesizes overall health, key highlights, top risks, and actionable recommendations with one-click clipboard copying.

### 5. 📖 Methodology & Mathematical Proofs ("How It Works")
- Interactive, transparent documentation explaining every formula, weight, penalty curve, and outlier capping rule.

### 6. ⚙️ Governance & Configuration
- Auto-discovery of custom story point fields (e.g. `customfield_10016`).
- Selection of Authorized Due Date Approver with Jira user typeahead search.
- Configurable caching TTLs and storage persistence via Atlassian Forge Storage.

---

## 🧮 Mathematical Scoring Methodology

$$\text{ICI} = w_{\text{onTime}} \cdot S_{\text{onTime}} + w_{\text{delivered}} \cdot S_{\text{delivered}} + w_{\text{quality}} \cdot S_{\text{quality}} + w_{\text{collab}} \cdot S_{\text{collab}}$$

### Dynamic Weight Rebalancing
When a contributor has fewer than 2 issues with valid due dates, the on-time metric is marked `insufficient_data` ($S_{\text{onTime}} = \text{null}$) and its 35% weight is automatically and proportionally redistributed among the remaining three categories:

$$w_i' = w_i \times \frac{100}{100 - w_{\text{onTime}}}$$

### Delivered Velocity Score

$$S_{\text{delivered}} = \min\left(100, \, \max\left(0, \, 50 + 50 \times \frac{P_{\text{person}} - P_{\text{avg}}}{P_{\text{avg}}}\right)\right)$$

### Quality Score & Penalty Escalation

$$S_{\text{quality}} = \max(0, \, 100 - (\text{Reopens} \times 15 + \text{Regressions} \times 10))$$

---

## 🏗️ Architecture & Technology Stack

```
ici-dashboard/
├── manifest.yml                          ← Atlassian Forge Manifest & Permissions
├── package.json                          ← Backend Dependencies & Scripts
├── tsconfig.json                         ← Backend TypeScript Config
│
├── src/                                  ← Backend Resolvers & Scoring Engine
│   ├── resolvers/
│   │   ├── index.ts                      ← Resolver function dispatcher
│   │   ├── boards.ts                     ← getBoards() & story point discovery
│   │   ├── sprints.ts                    ← getSprints()
│   │   ├── issues.ts                     ← getIssues() with pagination & changelog
│   │   ├── scores.ts                     ← getTeamScores() & score caching
│   │   ├── portfolio.ts                  ← getPortfolioData() & getARTSyncData()
│   │   └── users.ts                      ← searchJiraUsers()
│   ├── lib/
│   │   ├── scoring.ts                    ← Pure mathematical scoring functions
│   │   ├── signals.ts                    ← Behavioral signal detectors
│   │   ├── improvements.ts               ← Coaching suggestions generator
│   │   ├── portfolio.ts                  ← Portfolio aggregation & AI briefing generator
│   │   └── constants.ts                  ← Thresholds, weights, and status maps
│   └── types/
│       ├── jira.ts                       ← Jira REST API & CHANGE-2046 types
│       ├── scoring.ts                    ← Contributor score types
│       └── portfolio.ts                  ← Portfolio & ART Sync data contracts
│
└── static/
    └── ici-app/                          ← React + TypeScript Custom UI Frontend
        ├── package.json                  ← Frontend Dependencies (Vite, Atlaskit, Recharts)
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
            │   ├── TeamSelector.tsx
            │   ├── TeamDashboard.tsx
            │   ├── IndividualDetail.tsx
            │   ├── PortfolioDashboard.tsx
            │   ├── ARTSyncDashboard.tsx
            │   ├── HowItWorks.tsx
            │   └── Settings.tsx
            └── utils/
                ├── bridge.ts             ← Safe Forge invoke & mock fallback bridge
                └── jiraUrl.tsx           ← Jira deep-linking utilities
```

- **Framework:** Atlassian Forge with Custom UI
- **Backend Runtime:** TypeScript (Strict Mode) on Atlassian Forge FaaS
- **Frontend Stack:** React 18, TypeScript, Vite, `@atlaskit` UI component library, Recharts
- **API Standards:** Fully compliant with Atlassian REST API CHANGE-2046 pagination & JQL standards
- **Security:** Forge User Impersonation (`api.asUser()`), granular OAuth scopes, zero third-party telemetry

---

## 🚀 Setup, Testing & Deployment

### 1. Prerequisites
- Node.js (v18 or v20 LTS recommended)
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

### 7. Deploy to Production
Deploy the application to the production environment:
```bash
# Deploy code bundle to production environment
forge deploy -e production

# Upgrade or install on Jira production site (if prompted)
forge install --upgrade -e production --site interswitch.atlassian.net --product jira
```

---

## 🔒 Security & Compliance
- **Zero External Egress:** All calculations, aggregations, and storage occur strictly within the Atlassian Forge Cloud trust boundary.
- **Role-Based Access:** Respects native Jira project permissions, issue-level security, and board visibility automatically.
- **Privacy First:** Only metadata required for index computation (timestamps, story points, status transitions) is processed.

---

## 📄 License
Internal Enterprise License. Built for Interswitch Engineering Management and SAFe Agile Release Trains.
