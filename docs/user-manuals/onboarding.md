---
title: Guided setup — User Manual
description: In-app tour for administrators and standard users (coach marks and dialogs, not a separate onboarding URL)
---

# Guided setup — User Manual

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Who sees which tour](#2-who-sees-which-tour)
- [3. How it works in the app](#3-how-it-works-in-the-app)
- [4. Turning tips off or starting again](#4-turning-tips-off-or-starting-again)
- [5. Support and privacy notes](#5-support-and-privacy-notes)

---

## 1. Introduction

**Guided setup** is an **in-app tour**. It uses a short welcome dialog on the **main dashboard** (`/protected`), then **small floating panels** that point to real parts of the product (for example Studies, Trip reports, or your profile menu). There is **no separate “Onboarding” page** and **no automatic redirect** away from your dashboard.

**Trialetics** is a clinical trial management system. **Company administrators** set up studies, templates, and team access. **Standard users** focus on tasks, visits, and trip reports according to what your organization enabled.

---

## 2. Who sees which tour

| Role | What the tour covers (when **Clinical operations / CTMS** is enabled) |
|------|------------------------------------------------------------------------|
| **Company administrator** | Company settings (profile menu → Settings → Company), **Studies**, **Trip reports**, **Team** |
| **Standard user** | **My tasks**, **Monitoring visits**, **Trip reports** |

If your organization does **not** have the CTMS module, the tour stays shorter and explains **your workspace** and top navigation instead of study-specific areas.

**Platform operators** (internal Trialetics staff) do not see this product tour.

---

## 3. How it works in the app

### First welcome

1. Sign in and open the **main dashboard** (`/protected`).
2. If tips are enabled for your account and you have not finished or skipped the tour, a **welcome** dialog appears.
3. Choose **Continue** to step through hints, **Maybe later** to hide the welcome until your next browser session on this device, or **Do not show tips again** to stop automatic prompts (saved to your account).

Deep links (for example opening a specific study URL shared by a colleague) **do not** auto-open the welcome dialog, so your work is not covered unexpectedly.

### Coach steps

After the welcome step, a **floating panel** can appear near a highlighted area (for example the page title on **Studies**). Use **Next** to advance (the app may navigate to the right screen for you). **Do not show tips again** stops all guided prompts for your account.

On **small screens**, use the **menu** icon in the top bar if the tour mentions navigation that is inside the sliding menu.

### Main menu paths mentioned in the tour

- **Profile photo** (top right) → **Settings** → tabs: Personal, Company, Security, **Guided setup**
- **CTMS** menu (desktop) or **CTMS** section in the mobile menu: Studies, Sites, Trip reports, etc.

---

## 4. Turning tips off or starting again

1. Click your **profile** in the top-right → **Settings**.
2. Open the **Guided setup** tab.

There you can:

- **Turn off guided tips** — stops automatic dialogs and coach steps (per user, synced across devices once saved).
- **Restart guided tour** — clears progress so the tour can start again from the welcome step the next time conditions apply (for example when you return to the main dashboard and automatic start is on).

Administrators who complete the full admin tour also get **Completed setup** timestamp used internally; replay clears that so reporting stays accurate.

---

## 5. Support and privacy notes

- **Automatic start** can be turned off for an entire deployment by setting environment variable `NEXT_PUBLIC_ONBOARDING_AUTO_START` to `false`. Manual replay from **Profile settings → Guided setup** still works for users who choose it.
- Guided setup **does not** replace the legal **Privacy policy** or contractual terms. If your organization adds analytics for product usage, ensure step tracking is described there before enabling it.

For detailed feature documentation, use **Docs** in the top navigation or your internal SOPs.
