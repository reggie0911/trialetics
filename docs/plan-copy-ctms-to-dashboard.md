# Plan: Copy CTMS Home Components to Dashboard Page

**Date:** 2026-03-04

## Summary

Copy the stats grid, search/New Project bar, and project tabs/table from the CTMS Home Page (`/protected/clinical-trials`) to the Dashboard Page (`/protected/dashboard`).

---

## Source Components (CTMS Home Page)

| Component | Location | Description |
|-----------|----------|-------------|
| **Stats Grid** | `ctms-home-page.tsx` lines 72–114 | 4 cards: Total Projects, Total Countries, Total Sites, Project Groups |
| **Action Bar** | `ctms-home-page.tsx` lines 116–134 | Search input + New Project button |
| **Project Tabs** | `ctms-home-page.tsx` lines 136–215 | My Projects, My Test Projects, Recent, Favorites + project table |

**Source file:** `components/clinical-trials/ctms-home-page.tsx`  
**Dependencies:** `useCTMS()`, `getClinicalTrialsStats`, `getClinicalProtocols`, `CreateProjectForm`, `CTMSPageHeader`

---

## Target Page

**File:** `app/protected/dashboard/page.tsx`  
**Route:** `/protected/dashboard?protocolId={id}`  

**Current structure:**
1. Greeting + ModuleNavbar
2. Protocol info banner (“You are now viewing study data for…”)
3. Module Metrics (tracker cards, or “All modules are hidden”)

**Layout:** `min-h-screen bg-background` (different from CTMS `bg-[#E9E9E9]`)

---

## Architecture Constraints

### Dashboard vs CTMS

| Aspect | CTMS Home | Dashboard |
|--------|-----------|-----------|
| Scope | Company-wide (all protocols) | Protocol-scoped (one study) |
| Context | `CTMSProvider` (client) | Server component, no CTMS |
| Required params | `companyId` only | `protocolId` (required) |
| Data | `getClinicalTrialsStats`, `getClinicalProtocols` | `getDashboardTrackerMetrics`, protocol metadata |

### Context and Data Needs

- **Stats:** `getClinicalTrialsStats(companyId)` – company-wide.
- **Protocols:** `getClinicalProtocols(companyId, { search })` – company-wide.
- **CreateProjectForm:** Needs `companyId`, `profileId`, `email` (available from server).
- **Project click:** Navigate to `/protected/clinical-trials/project/{id}` or update dashboard `protocolId`.

---

## Implementation Plan

### Phase 1: Extract Reusable Components

Create standalone components that can be used in both CTMS Home and Dashboard.

| Component | File | Props | Notes |
|-----------|------|-------|-------|
| `CTMSStatsCards` | `components/clinical-trials/ctms-stats-cards.tsx` | `stats: ClinicalTrialsStats \| null` | Renders 4 stat cards |
| `CTMSProjectSearchBar` | `components/clinical-trials/ctms-project-search-bar.tsx` | `search`, `onSearch`, `onNewProject` | Search + New Project |
| `CTMSProjectTabs` | `components/clinical-trials/ctms-project-tabs.tsx` | `protocols`, `companyId`, `onProjectClick`, `loading` | Tabs + table |

**Alternative:** Skip extraction and add a shared `CTMSOverviewSection` that composes all three.

### Phase 2: Add CTMSProvider to Dashboard Route

**Option A – Layout**
- Add `app/protected/dashboard/layout.tsx` that wraps children in `CTMSProvider`.
- Requires `companyId`, `profileId`, `email` from parent (layout is server-rendered; would need a wrapper or data-fetching layout).

**Option B – Client wrapper**
- Create `DashboardPageClient` that:
  - Accepts `companyId`, `profileId`, `email`, `protocolId`, `protocol`, `moduleMetrics` from the server page.
  - Wraps content in `CTMSProvider`.
  - Renders: Greeting + Protocol banner + **Stats** + **Search/New Project** + **Project Tabs** + Module Metrics.

### Phase 3: Integrate into Dashboard

1. **Refactor dashboard page**
   - Keep server-side auth, protocol fetch, and metrics.
   - Pass `companyId`, `profileId`, `email`, `protocol`, `moduleMetrics` to a new client component.

2. **Create `DashboardPageClient`**
   - Wrap in `CTMSProvider` (or equivalent).
   - Render existing sections plus the three CTMS blocks.
   - Place stats, search bar, and tabs **above** Module Metrics.

3. **Handle project selection**
   - When a row is clicked, either:
     - Navigate to `/protected/clinical-trials/project/{id}`, or
     - Update `protocolId` (e.g. `/protected/dashboard?protocolId={id}`) and refresh.

### Phase 4: Refactor CTMS Home (Optional)

- Replace inline JSX with `CTMSStatsCards`, `CTMSProjectSearchBar`, `CTMSProjectTabs` (if extracted).
- Keeps CTMS Home and Dashboard in sync.

---

## Recommended Order of Work

1. **Extract components** – `CTMSStatsCards`, `CTMSProjectSearchBar`, `CTMSProjectTabs` from `ctms-home-page.tsx`.
2. **Create `DashboardPageClient`** – Client component that takes server data and uses the extracted components.
3. **Update dashboard page** – Fetch `profileId` and `email`, pass into `DashboardPageClient`.
4. **Wrap with CTMSProvider** – Inside `DashboardPageClient` (or a layout) so extracted components can use `useCTMS` if needed.
5. **Adjust layout/background** – Decide whether dashboard keeps `bg-background` or matches CTMS (`bg-[#E9E9E9]`).
6. **Refactor CTMS Home** – Switch to extracted components for consistency.

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `components/clinical-trials/ctms-stats-cards.tsx` |
| Create | `components/clinical-trials/ctms-project-search-bar.tsx` |
| Create | `components/clinical-trials/ctms-project-tabs.tsx` |
| Create | `components/dashboard/dashboard-page-client.tsx` |
| Modify | `app/protected/dashboard/page.tsx` |
| Modify | `components/clinical-trials/ctms-home-page.tsx` (optional refactor) |

---

## Data Flow (Dashboard)

```
Dashboard Page (server)
  ├── Auth + protocolId validation
  ├── Fetch: profile, protocol, trackerMetrics, moduleMetrics
  └── Render DashboardPageClient
        ├── CTMSProvider(companyId, profileId, email)
        ├── Greeting
        ├── Protocol banner
        ├── CTMSStatsCards(stats) ← getClinicalTrialsStats in client or pass from server
        ├── CTMSProjectSearchBar
        ├── CTMSProjectTabs
        └── ModuleMetrics
```

**Note:** Stats can be fetched:
- **Server:** Add `getClinicalTrialsStats(companyId)` to the dashboard page and pass `stats` as a prop.
- **Client:** Call `getClinicalTrialsStats` in `DashboardPageClient` (requires `companyId` from props or CTMSProvider).

---

## Open Questions

1. **Project click behavior:** Navigate to CTMS project page, or stay on dashboard and change `protocolId`?
2. **Stats scope:** Keep company-wide stats, or show protocol-filtered stats?
3. **Create Project:** Should New Project be available from the dashboard, or only from CTMS?
4. **Background:** Keep dashboard `bg-background` or switch to `bg-[#E9E9E9]` for consistency?
