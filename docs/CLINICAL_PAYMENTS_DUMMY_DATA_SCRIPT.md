---
title: Clinical Payments Dummy Data Walkthrough Script
description: Step-by-step script with exact sample values for every form and dialog in the Clinical Payments module, using an oncology trial context (ONCO-001).
---

# Clinical Payments Dummy Data Walkthrough Script

## Trial Context

All sample data in this script uses the following oncology trial entities from the seed data.

| Entity | Value |
|--------|-------|
| Program | Oncology Research Program |
| Protocol Number | ONCO-001 |
| Protocol Title | Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer |
| Region | North America |
| Site 001 | Mercy General Hospital -- PI: Dr. Sarah Mitchell |
| Site 002 | University Medical Center -- PI: Dr. Maria Rodriguez |
| Site 003 | Coastal Research Institute -- PI: Dr. Thomas Wright |
| Primary Currency | USD |

---

## Table of Contents

**Project-Level Workflows**
- [P1. Add Budget Line Item](#p1-add-budget-line-item)
- [P2. Add Spend Actual](#p2-add-spend-actual)
- [P3. Add Spend Forecast](#p3-add-spend-forecast)
- [P4. Generate Variance Report](#p4-generate-variance-report)
- [P5. Configure Exchange Rates](#p5-configure-exchange-rates)
- [P6. Create Budget Template](#p6-create-budget-template)
- [P7. Configure Payment Approval Workflow](#p7-configure-payment-approval-workflow)

**Site-Level Workflows**
- [S1. Add Payment Exception](#s1-add-payment-exception)
- [S2. Add Unplanned Payment](#s2-add-unplanned-payment)
- [S3. Mark Payment Activities Complete](#s3-mark-payment-activities-complete)
- [S4. Enter Deviation Amount](#s4-enter-deviation-amount)
- [S5. Configure Payment Splits](#s5-configure-payment-splits)
- [S6. Generate Payment Records](#s6-generate-payment-records)
- [S7. Edit Payment Record](#s7-edit-payment-record)
- [S8. Site Portal -- Site Staff Tasks](#s8-site-portal----site-staff-tasks)

---

## Project-Level Workflows

---

### P1. Add Budget Line Item

**Navigation:** Financial Forecasting > click "Add Budget" button

**Dialog:** Add Budget Line Item

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Category | Site Costs | Select from dropdown (options: Site Costs, Personnel, Travel, Vendor, Other) |
| Budgeted Amount | 450000.00 | Type the number; represents total site costs budget for ONCO-001 |
| Description (optional) | Investigator payments for all NSCLC sites in North America | Free text |
| Period Start | 2026-01-01 | Date picker |
| Period End | 2026-12-31 | Date picker |

**Click:** Add

**Expected Outcome:** Toast message "Budget item added". The new line item appears in the Budget table showing $450,000.00 under Site Costs for ONCO-001.

**Second entry (for a different category):**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Category | Travel | Select from dropdown |
| Budgeted Amount | 85000.00 | Travel reimbursements for monitoring visits |
| Description (optional) | CRA monitoring visit travel for ONCO-001 sites | Free text |
| Period Start | 2026-01-01 | Date picker |
| Period End | 2026-12-31 | Date picker |

**Click:** Add

---

### P2. Add Spend Actual

**Navigation:** Financial Forecasting > click "Add Spend" button

**Dialog:** Add Spend Actual

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Amount | 12500.00 | Five screening visits at $2,500 each |
| Spend Date | 2026-02-15 | Date picker; the date the spend was recorded |
| Description (optional) | Site 001 Mercy General - 5 screening visit payments processed | Free text |

**Click:** Add

**Expected Outcome:** Toast message "Spend actual added". The entry appears in the Actuals table.

**Second entry:**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Amount | 7500.00 | Three treatment cycle visits at $2,500 each |
| Spend Date | 2026-02-28 | Date picker |
| Description (optional) | Site 002 University Medical - 3 treatment cycle payments | Free text |

**Click:** Add

---

### P3. Add Spend Forecast

**Navigation:** Financial Forecasting > click "Add Forecast" button

**Dialog:** Add Spend Forecast

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Forecast Name (optional) | Q1 2026 Oncology Enrollment Ramp-Up | Free text; descriptive label for the forecast period |
| Forecast Date | 2026-03-01 | Date picker; the date the forecast was created |
| Period Start | 2026-01-01 | Date picker |
| Period End | 2026-03-31 | Date picker |
| Total Forecasted Spend | 125000.00 | Projected site payment spend for Q1 |

**Click:** Add

**Expected Outcome:** Toast message "Forecast added". The forecast appears in the Forecasts table.

**Second entry (Q2):**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Forecast Name (optional) | Q2 2026 Oncology Full Enrollment | Free text |
| Forecast Date | 2026-03-01 | Date picker |
| Period Start | 2026-04-01 | Date picker |
| Period End | 2026-06-30 | Date picker |
| Total Forecasted Spend | 175000.00 | Higher spend expected as enrollment ramps up |

**Click:** Add

---

### P4. Generate Variance Report

**Navigation:** Financial Forecasting > click "Variance Report" button

**Dialog:** Generate Variance Report

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 -- Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer | Select from dropdown |
| Report Date | 2026-02-28 | Date picker; the reporting cut-off date |
| Period Start | 2026-01-01 | Date picker |
| Period End | 2026-03-31 | Date picker |
| Notes (optional) | Q1 2026 variance analysis - enrollment slightly behind target, expect catch-up in March | Free text |

**Click:** Generate

**Expected Outcome:** Toast message "Variance report generated". The report compares budgeted vs. actual amounts for the period.

---

### P5. Configure Exchange Rates

Exchange rates are managed via server actions. The following values should be used when calling the exchange rate API or if a UI is built for exchange rate entry.

**Entry 1: USD to EUR**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Source Currency | USD | US Dollar |
| Target Currency | EUR | Euro |
| Rate | 0.92150000 | 1 USD = 0.9215 EUR |
| Effective Date | 2026-03-01 | Date the rate takes effect |

**Entry 2: USD to GBP**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Source Currency | USD | US Dollar |
| Target Currency | GBP | British Pound |
| Rate | 0.79340000 | 1 USD = 0.7934 GBP |
| Effective Date | 2026-03-01 | Date the rate takes effect |

**Entry 3: USD to JPY**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Source Currency | USD | US Dollar |
| Target Currency | JPY | Japanese Yen |
| Rate | 149.85000000 | 1 USD = 149.85 JPY |
| Effective Date | 2026-03-01 | Date the rate takes effect |

---

### P6. Create Budget Template

Budget templates are managed via server actions. The following values should be used to create an oncology-specific budget template.

**Template Header:**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 | Optional; link to specific protocol |
| Name | ONCO-001 Standard Site Budget | Required; descriptive template name |
| Description | Standard budget template for Phase III NSCLC immunotherapy sites covering all visit types and pass-through costs | Optional |
| Is Default | true | Marks as the default template for this protocol |

**Template Line Items:**

| # | Category | Subcategory | Description | Amount | Currency |
|---|----------|-------------|-------------|--------|----------|
| 1 | screening | visit_fee | Screening Visit - includes informed consent, eligibility assessment, baseline labs | 750.00 | USD |
| 2 | treatment | cycle_1 | Treatment Cycle 1 - drug administration, vitals, AE assessment | 2500.00 | USD |
| 3 | treatment | cycle_2_plus | Treatment Cycles 2+ - subsequent drug administrations | 2000.00 | USD |
| 4 | treatment | end_of_treatment | End of Treatment Visit - final assessment, imaging review | 1800.00 | USD |
| 5 | follow_up | follow_up_30day | 30-Day Follow-Up Visit - safety assessment | 500.00 | USD |
| 6 | follow_up | follow_up_90day | 90-Day Survival Follow-Up - phone contact | 200.00 | USD |
| 7 | lab | central_lab | Central Laboratory Assessments - per sample shipment | 350.00 | USD |
| 8 | lab | local_lab | Local Laboratory Processing - per draw | 125.00 | USD |
| 9 | imaging | ct_scan | CT Scan - tumor assessment imaging | 450.00 | USD |
| 10 | imaging | pet_scan | PET/CT Scan - per protocol-required scan | 1200.00 | USD |
| 11 | pass_through | irb_fees | IRB/Ethics Committee Fees - annual review | 3500.00 | USD |
| 12 | pass_through | pharmacy | Pharmacy Setup and Dispensing Fees | 2000.00 | USD |
| 13 | pass_through | regulatory | Regulatory Document Preparation | 1500.00 | USD |
| 14 | startup | site_initiation | Site Initiation Activities - training, system setup | 5000.00 | USD |
| 15 | closeout | site_closeout | Site Close-Out Visit - final monitoring, archival | 3000.00 | USD |

---

### P7. Configure Payment Approval Workflow

Payment approval configurations are managed via server actions. The following values should be used to set up approval rules.

**Configuration 1: Interim Payments (auto-approve under threshold)**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 | Optional; protocol-specific config |
| Payment Type | interim | Applies to interim payment records |
| Auto Approve | true | Payments under threshold are auto-approved |
| Auto Approve Threshold | 5000.00 | Payments at or below $5,000 skip manual approval |
| Required Approvers | 1 | One approver needed for payments above threshold |

**Configuration 2: Final Payments (always require approval)**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 | Protocol-specific config |
| Payment Type | final | Applies to final/close-out payment records |
| Auto Approve | false | All final payments require manual approval |
| Auto Approve Threshold | (leave empty) | Not applicable when auto-approve is off |
| Required Approvers | 2 | Two-level approval for final payments |

**Configuration 3: Unplanned Payments**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol | ONCO-001 | Protocol-specific config |
| Payment Type | unplanned | Applies to unplanned payment records |
| Auto Approve | false | All unplanned payments require manual approval |
| Auto Approve Threshold | (leave empty) | Not applicable |
| Required Approvers | 1 | One approver needed |

---

## Site-Level Workflows

---

### S1. Add Payment Exception

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Exceptions tab > click "Add Exception" button

**Dialog:** Add Payment Exception

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Activity | Screening Visit (Screening Visit) - Standard: $750 | Select from dropdown; the dropdown shows activity name, visit name, and standard amount |
| Exception Amount | 2800.00 | Overrides the standard $750 to $2,800 for this site due to specialized imaging requirements |

**Click:** Create Exception

**Expected Outcome:** Toast message "Payment exception created". The Exceptions tab now shows Screening Visit with an exception amount of $2,800.00 instead of the standard $750.00.

**Second exception (Site 002):**

Navigate to Site 002 (University Medical Center) and add:

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Activity | Treatment Cycle 1 (Treatment Visit 1) - Standard: $2500 | Select from dropdown |
| Exception Amount | 3200.00 | University Medical Center charges higher due to specialized oncology pharmacy services |

**Click:** Create Exception

---

### S2. Add Unplanned Payment

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Activities tab > click "Unplanned Payment" button

**Dialog:** Add Unplanned Payment

**Entry 1: IRB Fees**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Amount | 1200.00 | Annual IRB continuing review fee |
| Contract | (Select the first available contract from dropdown) | Optional; select the contract associated with this site |
| Payee | Sarah Mitchell | Optional; select the PI as the payee |

**Click:** Create Activity

**Expected Outcome:** Toast message "Unplanned payment activity created". A new row appears in the Activities table marked as "Unplanned" with amount $1,200.00.

**Entry 2: Equipment Costs**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Amount | 3500.00 | Calibrated temperature monitoring equipment for drug storage |
| Contract | (Select from dropdown) | Optional |
| Payee | Sarah Mitchell | Optional |

**Click:** Create Activity

**Entry 3: Advertising for patient recruitment (Site 002)**

Navigate to Site 002 and add:

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Amount | 2750.00 | Patient recruitment advertising materials and placement |
| Contract | (Select from dropdown) | Optional |
| Payee | Maria Rodriguez | Optional |

**Click:** Create Activity

---

### S3. Mark Payment Activities Complete

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Activities tab

In the Activities table, locate each pending activity and check the checkbox in the leftmost column.

**Activities to mark complete for Site 001:**

| Activity Name | Standard Amount | Action |
|---------------|----------------|--------|
| Screening Visit (Subject 001-001) | $750.00 | Check the checkbox |
| Screening Visit (Subject 001-002) | $750.00 | Check the checkbox |
| Treatment Cycle 1 (Subject 001-001) | $2,500.00 | Check the checkbox |
| Lab Draw (Subject 001-001, Screening Visit) | $350.00 | Check the checkbox |
| IRB Fees (Unplanned) | $1,200.00 | Check the checkbox |

**Expected Outcome:** Each checked activity's `is_completed` flag toggles to true. The activity rows update to show a completed state. These activities become eligible for payment record generation.

---

### S4. Enter Deviation Amount

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Activities tab

In the Activities table, locate a completed activity and click on the Deviation amount cell (inline editable input).

**Deviations to enter for Site 001:**

| Activity Name | Deviation Amount | Reason |
|---------------|-----------------|--------|
| Screening Visit (Subject 001-001) | 125.00 | Additional pre-screening tests required by local IRB |
| Treatment Cycle 1 (Subject 001-001) | -200.00 | Patient missed pharmacokinetic blood draw, reducing procedure cost |
| Lab Draw (Subject 001-001, Screening Visit) | 50.00 | Overnight courier required for sample shipment |

**How to enter:** Click the Deviation input field for the row, type the value (e.g., `125`), then click outside the field or press Tab. The value saves automatically on blur.

**Expected Outcome:** The "Actual Amount" column updates to reflect Standard Amount + Deviation Amount:
- Screening Visit: $750.00 + $125.00 = $875.00
- Treatment Cycle 1: $2,500.00 + (-$200.00) = $2,300.00
- Lab Draw: $350.00 + $50.00 = $400.00

---

### S5. Configure Payment Splits

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Activities tab > click the split icon on a completed activity row

**Dialog:** Payment Splits

**Scenario:** Split the Screening Visit (Subject 001-001) payment of $875.00 between two contracts.

**Split 1:**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Contract | (Select the primary site contract from dropdown) | Required; first contract |
| Payee | Sarah Mitchell | Optional; select PI |
| % | 70 | 70% of $875.00 = $612.50 |

**Click:** Add

**Split 2:**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Contract | (Select a second contract from dropdown) | Required; second contract for pass-through costs |
| Payee | (leave as "-") | Optional; no specific payee |
| % | 30 | 30% of $875.00 = $262.50 |

**Click:** Add

**Expected Outcome:** The dialog shows "Splits complete (100%)" in green text. The current splits section displays:
- Contract A - Sarah Mitchell: 70% ($612.50)
- Contract B: 30% ($262.50)

**Optional:** Click "Apply Split to Other" to apply the same 70/30 split to all other unpaid activities at this site.

---

### S6. Generate Payment Records

**Navigation:** Clinical Payments > Sites tab > click "Site 001" card > Activities tab > click "Generate Payment" button

**Dialog:** Generate Payment Records

This is a confirmation dialog with no form fields to fill in.

**Pre-conditions:** At least one activity must be marked as complete and not yet associated with a payment record.

**Display shows:**
- Number of completed activities ready for payment generation
- Total earned amount across those activities

**Click:** Generate

**Expected Outcome:** Toast message confirms payment records generated. A new payment record appears in the Records tab with:
- Payment Type: Interim
- Status: To Be Processed
- Earned Amount: Sum of all completed activity actual amounts (e.g., $875.00 + $2,300.00 + $400.00 + $1,200.00 = $4,775.00)
- Each completed activity is now linked to this payment record

---

### S7. Edit Payment Record

**Navigation:** Clinical Payments > Records tab (or Sites tab > Site 001 > switch to Records section) > click on a payment record row to open the edit dialog

**Dialog:** Edit Payment Record

**Scenario 1: Process a payment with check details**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Status | In Progress | Select from dropdown (options: To Be Processed, In Progress, Processed) |
| Check Amount | 4587.50 | Check amount after withholding; less than earned amount |
| Check Date | 2026-03-15 | Date picker; the date the check is issued |
| Check Number | CHK-20260315-001 | Free text; unique check identifier |
| VAT Amount | 187.50 | Value-added tax amount applied to this payment |

**Click:** Update Record

**Expected Outcome:** Toast message "Payment record updated". The record now shows status "In Progress" with the check details populated.

**Scenario 2: Mark as fully processed**

Open the same record again:

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Status | Processed | Select from dropdown; final status |
| Check Amount | 4587.50 | Keep the same |
| Check Date | 2026-03-15 | Keep the same |
| Check Number | CHK-20260315-001 | Keep the same |
| VAT Amount | 187.50 | Keep the same |

**Click:** Update Record

**Expected Outcome:** The record status changes to "Processed". The payment is considered complete.

**Scenario 3: Process payment for Site 002**

Navigate to a payment record for Site 002:

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Status | In Progress | Select from dropdown |
| Check Amount | 7350.00 | Check amount for University Medical Center |
| Check Date | 2026-03-20 | Date picker |
| Check Number | CHK-20260320-002 | Free text |
| VAT Amount | 0.00 | No VAT for this payment |

**Click:** Update Record

---

### S8. Site Portal -- Site Staff Tasks

**Navigation:** Site Portal (from the top navigation bar)

**Step 1: Select Your Site**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Site selector | Site 001 | Select from the dropdown; shows all sites in your organization |

**Expected Outcome:** The page loads four summary cards (Earned, Paid, Remaining, VAT) and two tables (Pending Activities, Completed Activities).

**Step 2: Review Financial Summary**

The summary cards display (read-only, no entry needed):

| Card | Expected Value | Description |
|------|---------------|-------------|
| Earned | $4,775.00 | Total earned from completed activities |
| Paid | $4,587.50 | Total check amounts from processed payment records |
| Remaining | $187.50 | Earned minus Paid |
| VAT | $187.50 | Total VAT amount across payment records |

**Step 3: Mark Activities Complete**

In the "Pending Activities" table, check the checkbox for each activity to mark it complete:

| Activity | Amount | Type | Action |
|----------|--------|------|--------|
| Screening Visit (Subject 001-003) | $750.00 | Scheduled | Check the checkbox |
| Treatment Cycle 1 (Subject 001-002) | $2,500.00 | Scheduled | Check the checkbox |
| Equipment (Unplanned) | $3,500.00 | Unplanned | Check the checkbox |

**Expected Outcome:** Each activity moves from the "Pending Activities" table to the "Completed Activities" table. The Completed Activities table shows the activity with a status badge of "Awaiting Payment" until a payment record is generated and processed.

**Step 4: Review Completed Activities**

The "Completed Activities" table now shows (read-only):

| Activity | Amount | Payment Status |
|----------|--------|---------------|
| Screening Visit (Subject 001-001) | $875.00 | Paid (green badge) |
| Treatment Cycle 1 (Subject 001-001) | $2,300.00 | Paid (green badge) |
| Lab Draw (Subject 001-001) | $400.00 | Paid (green badge) |
| IRB Fees (Unplanned) | $1,200.00 | Paid (green badge) |
| Screening Visit (Subject 001-003) | $750.00 | Awaiting Payment (gray badge) |
| Treatment Cycle 1 (Subject 001-002) | $2,500.00 | Awaiting Payment (gray badge) |
| Equipment (Unplanned) | $3,500.00 | Awaiting Payment (gray badge) |

---

## Additional Server-Action Workflows

The following workflows do not yet have dedicated UI forms but are available via server actions. The sample data below is provided for API-level testing or for use when UI components are built.

---

### A1. Create Invoice from Payment Records

**Server Action:** `createInvoiceFromPaymentRecords`

**Invoice Header:**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Site ID | (Site 001 UUID) | Mercy General Hospital |
| Protocol ID | (ONCO-001 UUID) | Optional; links invoice to protocol |
| Contract ID | (Primary contract UUID) | Optional; links to site contract |
| Invoice Date | 2026-03-01 | Date the invoice is created |
| Due Date | 2026-03-31 | Net 30 payment terms |
| Currency Code | USD | US Dollars |
| Payment Terms | Net 30 | Free text |
| Notes | Invoice for Q1 2026 investigator payments - Mercy General Hospital, ONCO-001 NSCLC Phase III | Free text |

**Invoice Line Items (auto-generated from payment records):**

| Description | Quantity | Unit Amount | Total Amount |
|-------------|----------|------------|--------------|
| Screening Visit - Subject 001-001 (with deviation) | 1 | 875.00 | 875.00 |
| Treatment Cycle 1 - Subject 001-001 (with deviation) | 1 | 2300.00 | 2300.00 |
| Central Lab Draw - Subject 001-001 (with deviation) | 1 | 400.00 | 400.00 |
| IRB Continuing Review Fee (Unplanned) | 1 | 1200.00 | 1200.00 |
| **Total** | | | **4775.00** |

**Invoice Payment (recording the check):**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Payment Date | 2026-03-15 | Date the payment was made |
| Payment Amount | 4587.50 | Check amount (earned minus withholding) |
| Payment Method | check | Free text: check, wire, ACH |
| Reference Number | CHK-20260315-001 | Check number |
| Notes | Payment processed via check to Dr. Sarah Mitchell, Mercy General Hospital | Free text |

---

### A2. Create Payment Accrual

**Server Action:** `createPaymentAccrual`

**Accrual Entry 1: Site Costs Accrual**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol ID | (ONCO-001 UUID) | Required |
| Site ID | (Site 001 UUID) | Optional; site-specific accrual |
| Period Start | 2026-01-01 | Start of accrual period |
| Period End | 2026-03-31 | End of accrual period (Q1) |
| Accrued Amount | 15000.00 | Estimated payment obligation for Q1 |
| Actual Amount | 4775.00 | Actual payments processed in Q1 |
| Category | site_payments | Accrual category |
| Calculation Basis | Based on 18 planned subjects, 6 enrolled, average $2,500 per visit, 1 visit per subject completed | Free text explaining the calculation |
| Notes | Q1 2026 accrual for Mercy General Hospital - ONCO-001. Enrollment tracking below target. | Free text |

**Accrual Entry 2: Pass-Through Costs Accrual**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Protocol ID | (ONCO-001 UUID) | Required |
| Site ID | (leave empty) | Protocol-wide accrual |
| Period Start | 2026-01-01 | Start of accrual period |
| Period End | 2026-03-31 | End of accrual period (Q1) |
| Accrued Amount | 21000.00 | Estimated pass-through costs across all 3 NA sites (3 x $7,000) |
| Actual Amount | 4700.00 | Actual pass-through costs paid (IRB fees for Site 001 only) |
| Category | pass_through | Accrual category |
| Calculation Basis | 3 active NA sites x estimated $7,000 per site per quarter in pass-through (IRB, pharmacy, regulatory) | Free text |
| Notes | Q1 2026 pass-through accrual for ONCO-001 North America region. Sites 002 and 003 IRB renewals expected in Q2. | Free text |

---

### A3. Create Site Budget from Template

**Server Action:** `cloneTemplateToSiteBudget`

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Template ID | (ONCO-001 Standard Site Budget UUID) | The budget template created in P6 |
| Site ID | (Site 001 UUID) | Mercy General Hospital |
| Protocol ID | (ONCO-001 UUID) | Required |
| Name | Site 001 Mercy General - ONCO-001 Budget | Optional; defaults to template name if not provided |
| Currency Code | USD | Currency for this site budget |
| Notes | Budget based on 18 planned subjects with standard oncology visit schedule. Screening exception applied ($2,800 vs $750 standard). | Free text |

**Expected Outcome:** A new site budget is created with all 15 line items from the template copied over. The total budgeted amount should equal the sum of all template items. The site budget status is set to "Draft" and can be updated to "Approved" after review.

**Adjust the cloned budget items for site-specific exceptions:**

| Item | Original Amount | Adjusted Amount | Reason |
|------|----------------|----------------|--------|
| Screening Visit | $750.00 | $2,800.00 | Payment exception for specialized imaging |
| PET/CT Scan | $1,200.00 | $1,500.00 | Site charges premium for PET/CT |

---

### A4. Create Payment Notification

**Server Action:** `createNotification`

**Notification 1: Payment Generated**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Recipient ID | (Dr. Sarah Mitchell's profile UUID) | The PI for Site 001 |
| Notification Type | payment_generated | Enum value |
| Title | Payment Record Generated - Site 001 | Short title |
| Message | An interim payment record of $4,775.00 has been generated for Mercy General Hospital (Site 001) on protocol ONCO-001. This covers 4 completed activities including screening visits, treatment cycles, and IRB fees. | Full message text |
| Payment Record ID | (Payment record UUID) | Links to the generated payment record |

**Notification 2: Approval Required**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Recipient ID | (Finance Manager's profile UUID) | The designated approver |
| Notification Type | approval_required | Enum value |
| Title | Approval Required - Final Payment Site 003 | Short title |
| Message | A final close-out payment of $8,250.00 for Coastal Research Institute (Site 003) on protocol ONCO-001 requires your approval. This is a final payment requiring 2-level approval per protocol configuration. | Full message text |
| Payment Record ID | (Payment record UUID) | Links to the payment record awaiting approval |

**Notification 3: Payment Processed**

| Field | Value to Enter | Notes |
|-------|---------------|-------|
| Recipient ID | (Dr. Maria Rodriguez's profile UUID) | The PI for Site 002 |
| Notification Type | payment_processed | Enum value |
| Title | Payment Processed - Site 002 Check Issued | Short title |
| Message | Check CHK-20260320-002 for $7,350.00 has been issued to University Medical Center (Site 002) on protocol ONCO-001. The check was mailed on 2026-03-20. Please allow 5-7 business days for delivery. | Full message text |
| Payment Record ID | (Payment record UUID) | Links to the processed payment record |

---

## Payment Records Filter Values

When using the filter controls on the Records tab:

### Filter Scenario 1: View all pending payments

| Filter | Value |
|--------|-------|
| Status | To Be Processed |
| Type | All |

### Filter Scenario 2: View processed interim payments

| Filter | Value |
|--------|-------|
| Status | Processed |
| Type | Interim |

### Filter Scenario 3: View unplanned payments awaiting approval

| Filter | Value |
|--------|-------|
| Status | Pending Approval |
| Type | Unplanned |

---

## Quick Reference: All Dummy Values

| Data Point | Value |
|------------|-------|
| Protocol | ONCO-001 |
| Protocol Title | Phase III Study of Immunotherapy in Advanced Non-Small Cell Lung Cancer |
| Program | Oncology Research Program |
| Region | North America |
| Site 001 | Mercy General Hospital |
| Site 001 PI | Dr. Sarah Mitchell (sarah.mitchell@mercygeneral.org) |
| Site 001 Site Number | 001 |
| Site 002 | University Medical Center |
| Site 002 PI | Dr. Maria Rodriguez (maria.rodriguez@umc.edu) |
| Site 002 Site Number | 002 |
| Site 003 | Coastal Research Institute |
| Site 003 PI | Dr. Thomas Wright (thomas.wright@coastalresearch.com) |
| Site 003 Site Number | 003 |
| Currency (Primary) | USD |
| Currency (Secondary) | EUR, GBP |
| Screening Visit Standard | $750.00 |
| Screening Visit Exception (Site 001) | $2,800.00 |
| Treatment Cycle 1 Standard | $2,500.00 |
| Treatment Cycle 1 Exception (Site 002) | $3,200.00 |
| Treatment Cycle 2+ Standard | $2,000.00 |
| End of Treatment Visit | $1,800.00 |
| 30-Day Follow-Up | $500.00 |
| 90-Day Survival Follow-Up | $200.00 |
| Central Lab Draw | $350.00 |
| Local Lab Processing | $125.00 |
| CT Scan | $450.00 |
| PET/CT Scan | $1,200.00 |
| IRB Fee (Unplanned) | $1,200.00 |
| Equipment (Unplanned) | $3,500.00 |
| Recruitment Advertising (Unplanned) | $2,750.00 |
| Pharmacy Setup | $2,000.00 |
| Regulatory Doc Prep | $1,500.00 |
| Site Initiation | $5,000.00 |
| Site Close-Out | $3,000.00 |
| Deviation: Extra screening tests | +$125.00 |
| Deviation: Missed PK draw | -$200.00 |
| Deviation: Overnight courier | +$50.00 |
| Check Number (Site 001) | CHK-20260315-001 |
| Check Date (Site 001) | 2026-03-15 |
| Check Amount (Site 001) | $4,587.50 |
| VAT Amount (Site 001) | $187.50 |
| Check Number (Site 002) | CHK-20260320-002 |
| Check Date (Site 002) | 2026-03-20 |
| Check Amount (Site 002) | $7,350.00 |
| Exchange Rate USD/EUR | 0.92150000 |
| Exchange Rate USD/GBP | 0.79340000 |
| Exchange Rate USD/JPY | 149.85000000 |
| Budget Total (Site Costs) | $450,000.00 |
| Budget Total (Travel) | $85,000.00 |
| Q1 2026 Forecast | $125,000.00 |
| Q2 2026 Forecast | $175,000.00 |
| Accrual Q1 (Site Payments) | $15,000.00 accrued / $4,775.00 actual |
| Accrual Q1 (Pass-Through) | $21,000.00 accrued / $4,700.00 actual |
| Approval Threshold (Interim) | $5,000.00 |
| Payment Terms | Net 30 |
| Split Ratio | 70% / 30% |

---

*This script uses realistic oncology clinical trial values aligned with the ONCO-001 seed data. All amounts, dates, and identifiers are designed to be internally consistent across workflows.*
