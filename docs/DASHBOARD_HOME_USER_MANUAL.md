# Trialetics — Dashboard (Home) User Manual

**Page:** Clinical trial operations overview (CTMS home)  
**URL:** `/protected` (after sign-in)  
**App component:** `DashboardContent`  
**Audience:** Study coordinators, CRAs, data managers, and site teams using the full CTMS experience  

> **Related:** **Top navigation** and **Modules home** (tile layout when CTMS is off) follow the labels in the live app—use **CTMS**, **Custom**, and your profile menu. This manual focuses on the **full CTMS Dashboard**; ask your **Trialetics administrator** if your home layout differs.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Who sees this page](#2-who-sees-this-page)
3. [Opening the Dashboard](#3-opening-the-dashboard)
4. [Welcome header](#4-welcome-header)
5. [Summary statistics](#5-summary-statistics)
6. [Recent Studies](#6-recent-studies)
7. [Quick Actions](#7-quick-actions)
8. [Common workflows](#8-common-workflows)
9. [Troubleshooting](#9-troubleshooting)
10. [Quick reference](#10-quick-reference)
11. [Glossary](#11-glossary)

---

## 1. Introduction

### 1.1 What is this page?

The **Dashboard (home)** is your **landing page** after you sign in. It gives a **high-level snapshot** of your organization’s clinical trial work in Trialetics:

- **Counts** of studies and sites (with shortcuts to the Studies and Sites areas).
- **Up to five** of the most recently updated studies.
- **Quick Actions** to create a study, open Sites, or open Reports.

It is a **summary screen**. Detailed editing happens on **Studies**, **Sites**, and other CTMS pages (use the top menu or the links on this page).

### 1.2 What this manual covers

This document describes only the **full CTMS Dashboard** (greeting, four summary links, Recent Studies, Quick Actions). It does **not** replace training on Studies, Sites, or Reports.

---

## 2. Who sees this page?

| You see this Dashboard | When |
|------------------------|------|
| **Yes** | Your company has **CTMS access** enabled (`has_ctms_access` is on). |
| **No** — different home | CTMS is off for your org; you may see **Modules home** (eTMF / study tracker tiles). Open modules from the tiles or **Custom → Study trackers**. |

If your screen doesn’t match this manual, ask your **Trialetics administrator** how your company is configured.

---

## 3. Opening the Dashboard

1. Sign in at your Trialetics URL.
2. You land on **`/protected`** (home).
3. Any time you are elsewhere in the app, click the **Trialetics logo** (top left) to return here.

---

## 4. Welcome header

### 4.1 Greeting

The main heading uses the **time of day** on your device:

| Time (local) | Greeting |
|--------------|----------|
| Before noon | **Good Morning** |
| Noon – before 5 PM | **Good Afternoon** |
| 5 PM onward | **Good Evening** |

If your profile has a **first name**, it appears after the greeting (for example, **Good Evening, Reggie**).

### 4.2 Subtitle

Below the greeting:

> *Here’s an overview of your clinical trial operations.*

This is static help text; it does not change with your data.

---

## 5. Summary statistics

### 5.1 Where they appear

The four items sit in a **single horizontal band** (they wrap on smaller screens). Each item shows a **label** and a **number in parentheses**, for example: **Total Studies (3)**.

### 5.2 What each number means

Numbers come from your company’s data in Trialetics (studies and study–site records).

| Label | Meaning | Source (technical) |
|-------|---------|---------------------|
| **Total Studies** | How many **studies** exist for your company. | Count of rows in **Studies**. |
| **Total Sites** | How many **study site** records exist (sites linked to studies). | Count of rows in **Study sites**. |
| **Enrolling Sites** | Study sites whose status is **enrolling**. | Study sites filtered by `status = enrolling`. |
| **Active Studies** | Studies whose status is **active**. | Studies filtered by `status = active`. |

### 5.3 Colored dots

Some items have a small **colored bar** beside the text (green, amber, or violet). These are **visual markers** only; hover (or your assistive technology’s description) still uses the labels above.

### 5.4 Hover tooltips (extra context)

When you **point** at a summary link, a short tooltip may appear:

| Item | Typical tooltip |
|------|-----------------|
| Total Studies | How many studies are **active** (among all studies). |
| Total Sites | How many sites are **activated** (counts sites in **activated** or **enrolling** status). |
| Enrolling Sites | *Currently enrolling* |
| Active Studies | *of X total* (active count vs. total studies). |

### 5.5 Click behavior — navigation

Each summary item is a **link**:

| Click | Goes to |
|-------|---------|
| **Total Studies** or **Active Studies** | **Studies** list — `/protected/studies` |
| **Total Sites** or **Enrolling Sites** | **Sites** list — `/protected/sites` |

Use these when you want to **drill into** the full list, not only the snapshot.

---

## 6. Recent Studies

### 6.1 Purpose

The **Recent Studies** card lists up to **five** studies that were **updated most recently** (by `updated_at`). It helps you jump back into work you or your team touched lately.

### 6.2 Card header

- **Title:** Recent Studies  
- **Description:** *Latest updated clinical studies*  
- **View all** — opens the full **Studies** list (`/protected/studies`).

### 6.3 Each row (when studies exist)

For each study you may see:

- **Title** (main line; long titles may truncate).
- **Status badge** (study workflow status).
- **Protocol number** and **phase** on a second line.
- **Relative time** on the right (for example *Today*, *Yesterday*, *3 days ago*, or a calendar date for older updates).

**Click anywhere on the row** to open that study’s detail page:

`/protected/studies/[study-id]`

### 6.4 Empty state (no studies yet)

If there are **no studies**:

- A short message explains that there are no studies yet.
- **Create Study** sends you to **`/protected/studies/new`** to start the first study.

---

## 7. Quick Actions

The **Quick Actions** card lists **three** shortcuts:

| Action | Description | Destination |
|--------|-------------|-------------|
| **Create New Study** | Set up a new clinical trial | `/protected/studies/new` |
| **Manage Sites** | View and manage clinical sites | `/protected/sites` |
| **View Reports** | Analytics and KRI dashboards | `/protected/reports` |

Click the **whole row** (icon + text) to navigate.

> **Note:** Some features elsewhere in the app may be **plan-gated** (for example, a lock icon routing to Billing). If Reports or other areas behave differently than expected, check with your admin.

---

## 8. Common workflows

### 8.1 “I want to open the study I was just editing”

1. Check **Recent Studies** for the title or protocol.  
2. Click the row → study detail.

### 8.2 “I need the full studies list or filters”

1. Click **View all** in Recent Studies, **or**  
2. Click **Total Studies** / **Active Studies** in the summary row.

### 8.3 “I need to see enrolling sites”

1. Click **Enrolling Sites** (or **Total Sites**) → **Sites** list.  
2. Use filters and columns on the Sites page as needed.

### 8.4 “I’m starting a new trial”

1. Use **Create New Study** under Quick Actions, **or**  
2. From Recent Studies empty state, **Create Study**.

### 8.5 “I need dashboards / KRIs”

1. **Quick Actions → View Reports**, or use **CTMS** in the top menu if your role includes **Reports**.

---

## 9. Troubleshooting

| Issue | What to try |
|-------|-------------|
| I see **tiles** (eTMF / trackers), not numbers | Your org may not use the full CTMS home. See [§2](#2-who-sees-this-page); use tiles or **Custom** to open trackers and modules. |
| **Recent Studies** is empty but we have studies | Studies might exist in another company/workspace, or your account may lack access. Confirm company and role with your admin. |
| Counts look wrong | Counts are **automatic** from current data. Verify study/site **status** values on the Studies and Sites pages. |
| **Good Morning** at night | Greeting uses your **browser/device clock**. Fix the device time zone or clock. |
| Link goes to **Billing** or locked page | Your subscription or role may limit that module; see admin or billing owner. |

---

## 10. Quick reference

| Element | Action |
|---------|--------|
| Logo (top bar) | Home (`/protected`) |
| Greeting + subtitle | Informational |
| Total Studies / Active Studies | → Studies list |
| Total Sites / Enrolling Sites | → Sites list |
| Recent Studies row | → Study detail |
| View all | → Studies list |
| Create New Study | → New study |
| Manage Sites | → Sites list |
| View Reports | → Reports |

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **CTMS** | Clinical Trial Management System — core Trialetics area for studies, sites, subjects, visits, etc. |
| **Study site** | A site (location) associated with a specific study, with its own status (e.g. enrolling). |
| **Protocol number** | Identifier for the study protocol. |
| **Phase** | Clinical development phase (e.g. Phase I–IV) as stored on the study. |
| **KRI** | Key risk indicator — often visualized in Reports. |
| **Modules home** | Alternate home layout when full CTMS dashboard is not used for the company. |

---

*Last updated: March 2026 — aligned with `components/ctms/dashboard-content.tsx`, `app/protected/page.tsx`, and `lib/actions/dashboard.ts`.*
