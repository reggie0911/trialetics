# Dashboard — User Guide (Quick overview)

**Product:** Trialetics  
**Module:** Dashboard (Home) — `/protected`  
**Audience:** New and everyday users  
**Last updated:** *(Set the date when you publish.)*

> **In-app documentation:** For the **CTMS Dashboard (Home)** (summary counts, Recent Studies, Quick Actions), see **[Dashboard (Home)](/protected/docs/dashboard-home)** in Trialetics or **[`DASHBOARD_HOME_USER_MANUAL.md`](./DASHBOARD_HOME_USER_MANUAL.md)** in the repo. Use this file for a quick overview; use that manual for the landing page in depth.

---

This guide explains the **Dashboard** — the first screen you see after signing in (when you land on the app home). It gives a friendly summary of your work and shortcuts to common tasks.

> **Note:** What you see depends on how your organization is set up. If your company uses the full **studies and sites** experience, you get numbers and a study list. If your company only uses **specific modules** (for example eTMF or study trackers), you may see a simpler home page with module tiles instead. Both experiences are covered below.

---

## How to use this guide with screenshots

For **annotated screenshot placeholders** and **navbar menus**, align captions with the **live app** and **[`DASHBOARD_HOME_USER_MANUAL.md`](./DASHBOARD_HOME_USER_MANUAL.md)**. For **PDF branding**, use your Markdown or docs export tool’s options (headers/footers, logo).

Quick rules for any image you add here:

1. **Capture** the real Trialetics screen at each step.
2. **Annotate** with circles/arrows and short labels on key clicks.
3. **Save** under `docs/images/dashboard/` and link from Markdown.

---

## Part A — Full Dashboard (studies & sites)

*You see this when your organization has the main clinical operations experience enabled.*

### Feature 1: Welcome message

#### Overview

- **What it does:** The top of the Dashboard greets you by time of day and, when available, by your first name. A short line explains that this page is an **overview of your clinical trial operations**.
- **Why it’s important:** It confirms you’re in the right place and sets context before you look at numbers or lists.

#### When to use

- Every time you sign in, to orient yourself.
- When you’re showing a new colleague how the app opens.

#### Step-by-step

1. Sign in to Trialetics.
2. If your role takes you to the app home, you’ll land on the Dashboard.
3. Read the **large heading** at the top (for example “Good Afternoon, Alex”).
4. Read the **subtitle** under it (“Here’s an overview of your clinical trial operations.”).

#### Fields and controls

| What you see | What it means |
|--------------|----------------|
| **Greeting + name** | Pulled from your profile. If your name is missing, only the time-based greeting shows. |
| **Subtitle** | Fixed helper text; it does not change when you click elsewhere. |

**Screenshot:** `01-welcome-banner.png` — Top of the page; **annotate** the greeting and the subtitle.

#### Real-world example

*Sam signs in after lunch. The page says “Good Afternoon, Sam” and the subtitle reminds them this is their operations overview. Sam knows they’re on the home screen and can scroll down for numbers.*

---

### Feature 2: Operations snapshot (the four summary links)

#### Overview

- **What it does:** A single row shows **four key counts**: Total Studies, Total Sites, Enrolling Sites, and Active Studies. Each item is **clickable** and takes you to the right area of the app (studies or sites). Small **colored markers** next to some items give a visual hint; hovering (or long-press on tablet) can show **extra detail** in a tooltip.
- **Why it’s important:** You see at a glance how big your portfolio is and how much is actively running—without opening multiple pages.

#### When to use

- **Morning check-in** — Quick sense of scale before meetings.
- **Before a status call** — Confirm how many studies are active or how many sites are enrolling.
- **Jumping to work** — Click straight into **Studies** or **Sites** from the number you care about.

#### Step-by-step

1. Locate the **horizontal band** below the welcome message (inside a light card-style area).
2. Find **Total Studies (n)** — the number in parentheses is your count.
3. **Click** “Total Studies” to open the **Studies** list.
4. Go back to the Dashboard (use the app navigation or browser back, depending on your workflow).
5. **Click** **Total Sites** or **Enrolling Sites** to open **Sites** (enrolling sites still live under Sites).
6. **Click** **Active Studies** to open **Studies** again, focused from the same entry point.
7. **Hover** over a link (where supported) to read the **tooltip** (for example “2 active” or “of 5 total”).

#### Fields and controls

| Label | What it shows | Where it goes when clicked |
|--------|----------------|----------------------------|
| **Total Studies** | All studies in your workspace | Studies list |
| **Total Sites** | All study sites | Sites list; tooltip may mention **activated** sites |
| **Enrolling Sites** | Sites currently in **enrolling** status | Sites list |
| **Active Studies** | Studies in **active** status | Studies list; tooltip may compare to total studies |

**Colored dashes** (green, amber, violet) are visual cues only—they do not open menus by themselves.

**Screenshot:** `02-operations-snapshot.png` — All four links; **annotate** one link with “Click to open” and show a **tooltip** in a second crop if needed.

**Screenshot:** `02b-after-click-studies.png` — After clicking Total Studies, show the Studies page header.

#### Real-world example

*Priya needs to confirm how many sites are enrolling. On the Dashboard she reads **Enrolling Sites (4)** and clicks it. The Sites page opens and she scans the list for details.*

#### Tips / best practices

- Tooltip text matches the live app; verify wording on the running product.

---

### Feature 3: Recent Studies

#### Overview

- **What it does:** Lists up to **five** studies that were **updated most recently**. Each row shows the **study title**, **status badge**, **protocol number**, **phase**, and **how long ago** it was updated (for example “Today” or “3 days ago”).
- **Why it’s important:** You can resume work on what changed lately without searching the full studies list.

#### When to use

- Returning to a study you edited yesterday.
- Spot-checking which trials had recent activity.
- **If there are no studies yet** — the card invites you to create the first one.

#### Step-by-step

1. Scroll to the **Recent Studies** card (large card on the left on wide screens).
2. Read the **title** “Recent Studies” and the description “Latest updated clinical studies.”
3. **Click** **View all** (top right of the card) to open the full **Studies** list.
4. To open **one** study, **click** anywhere on that study’s row (not only the title).
5. If you see **No studies yet**:
   - Read the short message.
   - **Click** **Create Study** to start the new-study flow.

#### Fields and controls

| Control | What it does |
|---------|----------------|
| **View all** | Goes to `/protected/studies` (full list). |
| **Study row** | Opens that study’s **detail** page. |
| **Status badge** | Shows the study’s current status (for example active, planned). |
| **Protocol number · Phase** | Second line of text for quick identification. |
| **Time text** (right side) | Relative time since last update. |

**Screenshot:** `03-recent-studies-card.png` — Whole card; **annotate** “View all” and one row “Click to open study”.

**Screenshot:** `03b-recent-studies-empty.png` — Empty state with **Create Study**.

#### Real-world example

*Jordan sees their feasibility study at the top with “Yesterday.” They click the row, land on the study page, and continue editing the timeline.*

#### Tips / best practices

- Need more than five? Use **View all** or the full guide’s **Quick reference**.

---

### Feature 4: Quick Actions

#### Overview

- **What it does:** A second card lists **three shortcuts**: **Create New Study**, **Manage Sites**, and **View Reports**. Each is a **clickable block** with an icon, title, and one-line description.
- **Why it’s important:** Common tasks are one click from home—no need to remember which menu they live under.

#### When to use

- Starting a **new trial** in the system.
- Reviewing or updating **sites**.
- Opening **reports and analytics** (portfolio overview, KRIs, saved reports—depending on your setup).

#### Step-by-step

1. Find the **Quick Actions** card (to the right of Recent Studies on a large screen; below on small screens).
2. **Click** **Create New Study** to go to the new study form.
3. **Click** **Manage Sites** to open the **Sites** area.
4. **Click** **View Reports** to open **Reports**.

#### Fields and controls

| Action | Subtext shown | Destination (typical) |
|--------|----------------|------------------------|
| **Create New Study** | “Set up a new clinical trial” | New study |
| **Manage Sites** | “View and manage clinical sites” | Sites |
| **View Reports** | “Analytics and KRI dashboards” | Reports |

**Screenshot:** `04-quick-actions.png` — All three rows; **annotate** each with a short label (Create / Sites / Reports).

#### Real-world example

*A coordinator needs to add a site. From the Dashboard they click **Manage Sites** under Quick Actions instead of hunting through the top menu.*

#### Tips / best practices

- **Reports** may require a **Pro** plan; locked items may send you to **Billing** — confirm with your administrator.

---

## Part B — Modules home (when CTMS overview is not shown)

Some organizations **do not** show the studies-and-sites Dashboard. Instead, you see a **simple home** that focuses on the modules your company uses.

### Feature 5: Module tiles (eTMF, study trackers, custom trackers)

#### Overview

- **What it does:** The page greets you and explains that you can **open a module below** or use the **top navigation** anytime. You see **cards** for each available module—for example **eTMF**, named **study trackers** (such as trackers your admin enabled), and **custom trackers** your company built.
- **Why it’s important:** You still have a clear starting point even when the full trial operations dashboard isn’t part of your subscription.

#### When to use

- First login when your role is **module-focused** only.
- Jumping straight into **eTMF** or a **specific tracker**.

#### Step-by-step

1. Read the greeting and subtitle (“Open a module below…”).
2. **Click** a **card** (for example **eTMF**) to open that module.
3. For a **custom tracker**, click the tracker **name** you need—or **All custom trackers** to browse every definition.

#### If you see “No modules visible”

- Your organization may not have eTMF or trackers turned on. **Contact your Trialetics administrator** inside your company to request access.

**Screenshot:** `05-modules-home.png` — Full page with visible module cards; **annotate** one card as “Click to open”.

**Screenshot:** `05b-no-modules.png` — Empty message and “contact administrator.”

#### Real-world example

*Lee’s company only uses eTMF. They click the **eTMF** tile from home and land in the trial master file area.*

#### Tips / best practices

- The **Custom** menu in the top bar lists the same trackers as on **Modules home**.

---

## Quick reference — Where things live

| I want to… | From full Dashboard, I can… |
|------------|------------------------------|
| See all studies | Click **Total Studies**, **Active Studies**, **View all**, or a **Recent Studies** row |
| See all sites | Click **Total Sites** or **Enrolling Sites**, or **Manage Sites** |
| Create a study | **Create New Study** (Quick Actions) or **Create Study** (empty state) |
| Open reports | **View Reports** (Quick Actions) |
| Open eTMF / trackers | Use **module tiles** (Part B) or the **top navigation** |
| CTMS Dashboard (home) in depth | **[`DASHBOARD_HOME_USER_MANUAL.md`](./DASHBOARD_HOME_USER_MANUAL.md)** or **[/protected/docs/dashboard-home](/protected/docs/dashboard-home)** |

---

## Appendix — Exporting to PDF (short)

This file is **Markdown**. For **header/footer, page numbers, logo placement**, and PDF polish, use your chosen export tool’s documentation.

Use the same structure for **other modules** (Studies, Sites, etc.): title block → screenshot how-to → features → quick reference → appendices.

---

## Glossary (simple)

| Term | Plain meaning |
|------|----------------|
| **Dashboard / Home** | The main landing page after sign-in at `/protected`. |
| **Study** | A clinical trial (or protocol) record you manage in the system. |
| **Site** | A location (hospital, clinic, etc.) participating in a study. |
| **Enrolling** | The site is actively recruiting participants (status). |
| **Active study** | The study is marked as currently active in the system. |
| **eTMF** | Electronic trial master file—digital filing for trial documents. |
| **Tracker** | A focused tool for a specific workflow (built-in or custom). |

---

*End of Dashboard User Guide (quick overview). For the CTMS Dashboard (Home) manual, see [`DASHBOARD_HOME_USER_MANUAL.md`](./DASHBOARD_HOME_USER_MANUAL.md) or in-app **Documentation → Dashboard (Home)**.*
