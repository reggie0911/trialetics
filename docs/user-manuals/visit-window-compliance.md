---
title: Visit Window Compliance — User Manual
description: Per-study Visit Window Compliance tab (study and site detail pages)
---

# Visit Window Compliance — User Manual

> Not to be confused with the legacy `/protected/vw` **Visit Window** tracker
> (CSV-import based). This document covers the in-app **Visit Window
> Compliance** tab on a study or site detail page (`?tab=visit-window-compliance`).

## Table of Contents

- [1. Overview](#1-overview)
- [2. Page Layout](#2-page-layout)
- [3. KPI Strip](#3-kpi-strip)
- [4. Alerts Banner](#4-alerts-banner)
- [5. Toolbar and Filters](#5-toolbar-and-filters)
- [6. Tables (By Site / By Visit / By Subject)](#6-tables-by-site--by-visit--by-subject)
- [7. Analytics Row](#7-analytics-row)
- [8. Tips and Drill-downs](#8-tips-and-drill-downs)
- [9. Exporting and Refreshing](#9-exporting-and-refreshing)

---

## 1. Overview

The **Visit Window Compliance** tab shows how well subject visits are tracking
against their protocol windows. The page is read-only: every count comes from
the live `subject_visits` table via the `v_subject_visit_schedule_summary`,
`v_visit_schedule_summary`, `v_site_visit_schedule_summary`, and
`v_visit_window_daily_trend` views.

It replaces the older "Visit Schedule" tab. Legacy
`?tab=visit-schedule` URLs redirect to `?tab=visit-window-compliance` so deep
links from emails, exports, or older browser bookmarks keep working.

## 2. Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Visit Window Compliance                  [Export CSV][PDF][Refresh]    │
│ Track visit timeliness and window adherence …  Last updated: …          │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overall][In window][Out][Overdue][Due now][Upcoming][Pending]   ← KPI │
├─────────────────────────────────────────────────────────────────────────┤
│ ⚠ Needs attention | inline alerts …               [View all alerts (N)] │
├─────────────────────────────────────────────────────────────────────────┤
│ ( By Site | By Visit | By Subject )                                     │
│ [search][country][status][due][Filters][Clear all][Columns][▦/☰]        │
│ ┌─ Table ────────────────────────────────────────────────────────────┐  │
│ │ Site#  Name  Country  Subjects  Priority  buckets…  Last Activity  │ │
│ │ Totals row                                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘  │
│ Tip banner …                                                            │
│ [Compliance Trend]                  [Top Visit Types Overdue]           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. KPI Strip

Seven cards at the top of the page:

- **Overall Summary** — donut showing `done / total` plus a sparkline of the
  done % over the last 7 days.
- **In Window**, **Out of Window**, **Overdue**, **Due Now**, **Upcoming**,
  **Pending** — each card shows the count, its share of total visits, a 7-day
  sparkline, and a `vs last 7 days` delta.

Clicking any card filters the active table by that bucket. Click the same
card again (or click **Overall Summary**) to clear the filter.

## 4. Alerts Banner

Surfaces the most pressing visit-window issues — overdue counts, due-now
counts, sites with open overdue visits, and high-risk subjects. Up to three
alerts are shown inline; the rest open in the **View all alerts** sheet
ordered by severity (`critical` → `warn` → `info`). Where possible the alert
links straight to the affected site or subject.

The banner hides itself when there are no active alerts.

## 5. Toolbar and Filters

Each tab has its own toolbar:

| Control | Notes |
| --- | --- |
| Search | Per-tab text search across the visible columns. |
| Country (By Site only) | Country dropdown derived from the rollup. |
| Status (By Subject only) | Subject status (active, screening, …). |
| Due status | All / In window / Out / Overdue / Due now / Upcoming / Pending. |
| Filters | Popover for advanced filters (date range, anchor) — coming soon. |
| Clear all | Resets every filter except the view toggle. |
| Columns | Toggle column visibility (when the column menu is enabled). |
| List / Grid | View toggle for the By Site tab. |

Toolbar state is local per tab so a search in **By Subject** doesn't bleed
into **By Visit**.

## 6. Tables (By Site / By Visit / By Subject)

All three tables share the same dense layout — bucket cells stack the count
on top of the percentage, and a **Totals** row sums every bucket at the
bottom.

- **By Site** (study scope only): site number / name / country / subjects /
  priority / bucket counts / last activity / Open button.
- **By Visit**: visit number / name / timepoint / window (`± N days`) /
  priority / bucket counts / next action / last activity.
- **By Subject**: subject number / status / risk level / anchor / last
  actual / done % progress / bucket counts / next action / Open button.

Priority and risk levels are derived from the bucket ratios:

- `critical` / `high` — overdue / open ≥ 50%.
- `at_risk` / `medium` — overdue / open ≥ 20%.
- `on_track` / `low` — below the at-risk threshold.

## 7. Analytics Row

Visible only on the **By Site** tab (study scope):

- **Visit Compliance Trend (Last 7 Days)** — overlaid line chart of in-window %
  vs overdue % for the last seven days, derived from `v_visit_window_daily_trend`.
- **Top Visit Types Overdue** — horizontal bar list of the visit names
  contributing the most overdue visits.

## 8. Tips and Drill-downs

A blue **Tip** banner appears under each table. The copy is scope-aware so
the suggested next step matches what you just scanned (drill into a site, a
visit, or a subject's editable Visits panel).

- Open a **Site** row to see only that site's compliance and resolve overdue
  visits site-by-site.
- Open a **Subject** row to jump straight into the editable Visits panel.

## 9. Exporting and Refreshing

The header bar exposes:

- **Export CSV** — downloads the current rollup as CSV.
- **Export PDF** — opens a printable PDF in a new tab.
- **Refresh Data** — re-fetches the server-rendered bundle without a full
  page reload (preserves the active sub-tab and the toolbar URL state).

The "Last updated" timestamp under the header reflects when the bundle was
assembled server-side.
