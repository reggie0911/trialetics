# Recording 02: Budget Template Flow

## Overview

| Field | Value |
|-------|-------|
| **File** | `02_budget_template_flow.mp4` |
| **Duration** | 3–5 minutes |
| **Purpose** | Demonstrate Visit Templates and Financial Forecasting as the "budget template" workflow |

> **Note:** The codebase does not have a dedicated "Budget Templates" feature. This recording covers the two closest features: **Visit Templates** (defines visit schedules with payment amounts per activity) and **Financial Forecasting** (budget line items, actuals, forecasts, variance reports).

---

## Exact Commands

```bash
# Ensure dev server is running
npm run dev

# Navigate in browser to:
#   Visit Templates:      http://localhost:3000/protected/visit-templates
#   Template Detail:      http://localhost:3000/protected/visit-templates/<id>
#   Financial Forecasting: http://localhost:3000/protected/financial-forecasting
#   Rate Lists:           http://localhost:3000/protected/clinical-trials/rate-lists
```

---

## Expected Outcome

### Visit Templates Section
- Template list page shows seeded templates with protocol association, version, and active status
- Clicking a template opens the detail page with visits and activities (each activity has a payment amount)
- "Create Template" dialog allows defining a new template tied to a protocol
- "Copy Version" creates a new version of an existing template
- "Activate" makes a template the active version for its protocol

### Financial Forecasting Section
- Budget Line Items tab shows budget entries by protocol and category (site_costs, personnel, travel, vendor, other)
- "Add Budget Line Item" dialog creates a new budget entry with amount, category, period
- Spend Actuals tab shows recorded actual spend
- Variance Reports tab shows budget vs. actual analysis
- Summary card at top shows total budgeted, total actual, remaining, and variance %

---

## Timestamped Step List

| Timestamp | Action |
|-----------|--------|
| `00:00` | Open browser; navigate to CTMS dropdown in top nav |
| `00:10` | Click "Visit Templates" in the module navbar |
| `00:20` | Show template list — point out protocol filter, active/inactive filter, search |
| `00:40` | Click on a seeded template to open detail view |
| `00:55` | Show visits list and activity table with payment amounts |
| `01:15` | Click "Create Template" button to open the create dialog |
| `01:30` | Fill in template name, select a protocol, set version, click Save |
| `01:50` | Show the newly created template in the list |
| `02:00` | Open an existing template, click the three-dot menu, select "Copy Version" |
| `02:15` | Fill in new version number, confirm copy |
| `02:30` | Show both versions in the template list |
| `02:45` | Navigate to Analytics > Financial Forecasting |
| `03:00` | Show Budget Line Items tab with existing entries |
| `03:15` | Click "Add Budget Line Item"; fill in protocol, category = site_costs, amount = 50000, period dates |
| `03:35` | Save and show the new item in the table |
| `03:50` | Switch to Spend Actuals tab; show actual spend records |
| `04:05` | Switch to Variance Reports tab; show budget vs. actual comparison |
| `04:20` | Point out summary card (total budgeted, actual, remaining, variance %) |
| `04:40` | End recording |

---

## Troubleshooting Notes

| Issue | Resolution |
|-------|------------|
| Template list is empty | Ensure seed migration `20260208000000_seed_clinical_trials_data.sql` was applied; it creates `subject_visit_templates`, `template_visits`, and `template_activities` |
| "No protocols available" in create dialog | Protocols are seeded by the same migration; verify `clinical_protocols` table has data |
| Financial Forecasting shows no data | Budget line items are not seeded by default; manually create entries during the recording as shown above |
| Copy Version fails | Ensure the source template has visits and activities; the copy operation duplicates all child records |
| Rate Lists page is empty | Rate lists are not seeded by default; navigate to `/protected/clinical-trials/rate-lists` and use "Add Position Type" / "Create Rate List" to populate |
