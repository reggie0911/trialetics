# SDV Tracker User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Report Management](#report-management)
4. [Uploading Data](#uploading-data)
5. [Understanding the Dashboard](#understanding-the-dashboard)
6. [Filtering and Navigation](#filtering-and-navigation)
7. [Hierarchical Data Table](#hierarchical-data-table)
8. [Data Source Types](#data-source-types)
9. [Time Estimates](#time-estimates)
10. [Best Practices](#best-practices)
11. [Common Workflows](#common-workflows)
12. [Troubleshooting](#troubleshooting)
13. [Technical Notes](#technical-notes)
14. [Frequently Asked Questions](#frequently-asked-questions)
15. [Glossary](#glossary)

---

## 1. Introduction

### What is the SDV Tracker?

The SDV (Source Data Verification) Tracker is a comprehensive reporting tool designed for clinical trial data management. It enables you to monitor SDV completion rates across clinical trials with real-time percentage dashboards, helping you track verification progress and identify areas requiring attention.

### Key Features Overview

- **Report Management**: Create, manage, and organize multiple SDV reports with draft and complete statuses
- **CSV Data Upload**: Streamlined wizard for uploading Site Data Entry and SDV Data files
- **Real-Time KPIs**: Dashboard showing completion percentages, total items, verified items, and more
- **Hierarchical Drill-Down**: Navigate from site-level summaries down to individual data items
- **Advanced Filtering**: Filter by site, subject, event, form, and data source with cascading options
- **Automatic Verification Tracking**: System automatically matches and verifies data between files
- **Time Estimates**: Calculate estimated hours and days needed to complete remaining SDV work

---

## 2. Getting Started

### 2.1 Accessing the SDV Tracker

1. Log in to your account (authentication required)
2. Navigate to the **Source Data Verification Report** section from the main navigation
3. The system automatically associates your account with your company's data

**Note**: The SDV Tracker is currently in **Beta** status, indicated by the orange badge on the page header.

### 2.2 Understanding the Interface

The main interface consists of:

- **Page Header**: Shows "Source Data Verification Report" title with Beta badge
- **Module Navigation Bar**: Quick access to other modules
- **Report Selector**: Dropdown to create, select, or delete reports
- **KPI Cards**: Key metrics displayed at the top (when a complete report is selected)
- **Filters Section**: Filter controls and active filter badges
- **Hierarchical Table**: Main data view with expandable rows

---

## 3. Report Management

### 3.1 Creating a New Report

1. Click the **Report Selector** dropdown at the top of the page
2. Click **"Create New Report"** or the "+" button
3. Enter a descriptive report name (e.g., "Q1 2026 SDV Report")
4. Optionally add a description to clarify the report's purpose
5. Click **Create** or press Enter

**Important**: New reports start in **"draft"** status and require data uploads before they can display metrics.

### 3.2 Report Selector

The report selector allows you to:

- **View All Reports**: See all reports associated with your company
- **Switch Reports**: Select any report from the dropdown to view its data
- **Auto-Selection**: The system automatically selects the first complete report, or the first draft if no complete reports exist
- **Delete Reports**: Remove reports you no longer need (use with caution)

**Note**: Reports are listed in reverse chronological order (newest first).

### 3.3 Report Statuses

Reports have two possible statuses:

- **Draft**: Report exists but is missing one or both data files
  - Shows upload wizard interface
  - Cannot display metrics until both files are uploaded
  - Can be edited or deleted
  
- **Complete**: Both Site Data Entry and SDV Data files have been uploaded and processed
  - Shows full dashboard with KPIs and data table
  - Data is ready for analysis
  - Report becomes read-only (create new report for updates)

---

## 4. Uploading Data

### 4.1 Required File Types

The SDV Tracker requires two CSV files to function:

#### Site Data Entry File
Contains the original data entry records from clinical sites. Required columns:

- `SiteName`: Name of the clinical site
- `SubjectId`: Unique identifier for the subject/patient
- `EventName`: Name of the clinical event (visit, assessment, etc.)
- `FormName`: Name of the data collection form
- `ItemExportLabel`: Label for the data item
- `EditBy`: User who made the edit
- `EditDateTime`: Date and time of the edit
- `EditReason`: Reason for the edit (e.g., "Initial Data Entry")

#### SDV Data File
Contains verification records showing which items have been verified. Required columns:

- `SiteName`: Name of the clinical site
- `SubjectId`: Unique identifier for the subject/patient
- `EventName`: Name of the clinical event
- `FormName`: Name of the data collection form
- `ItemName`: Name of the data item (matches ItemExportLabel from Site Data)
- `SdvBy`: User who performed the SDV
- `SdvDate`: Date when SDV was completed

### 4.2 Upload Wizard Process

1. **Select a Draft Report**: Choose a report in draft status from the report selector
2. **Upload Area Appears**: The upload wizard displays showing which file type is needed
3. **Choose File Type**: 
   - If no files uploaded: Start with Site Data Entry
   - If Site Data uploaded: Upload SDV Data
   - If SDV Data uploaded: Upload Site Data Entry
4. **Drag and Drop or Browse**: 
   - Drag CSV file onto the upload area, or
   - Click to browse and select file
5. **File Validation**: System validates the file format and column headers
6. **Parsing**: File is parsed (first row with human-readable headers is skipped)
7. **Batch Upload**: Data is uploaded in batches of 1,000 records
8. **Progress Tracking**: Real-time progress bar shows upload status
9. **Completion**: Upload completes and status updates

### 4.3 Upload Requirements

- **File Format**: CSV (Comma-Separated Values) only
- **File Size Limit**: 50MB per file
- **Header Format**: 
  - First row: Human-readable headers (displayed but skipped during processing)
  - Second row: Machine-readable column names (used for data mapping)
- **Encoding**: UTF-8 recommended
- **Column Names**: Must match exactly (case-sensitive)

### 4.4 Two-File Upload Process

The SDV Tracker requires both files to calculate completion percentages:

1. **Upload First File**: Upload either Site Data Entry or SDV Data
   - System tracks which file type is present
   - Report remains in draft status
   - Upload area shows which file is still needed

2. **Upload Second File**: Upload the remaining file type
   - System processes and matches data between files
   - Materialized view is refreshed automatically
   - Report status changes from "draft" to "complete"
   - Dashboard becomes available with full metrics

**Note**: You can upload files in any order, but both are required for a complete report.

### 4.5 Troubleshooting Stuck Reports

If a report appears stuck or uploads aren't completing properly:

1. **Check Upload Status**: Look for error messages in the upload area
2. **Use Fix Report Button**: Click the "Fix Report" button (wrench icon) in the upload area
3. **What Fix Report Does**:
   - Finds orphaned uploads that weren't properly linked
   - Links uploads to the report
   - Checks for data in both tables
   - Refreshes the materialized view
   - Marks report as complete if both data types exist
4. **Review Fix Message**: Success or error message will display

**Common Issues**:
- Upload completed but report still shows draft → Use Fix Report
- Both files uploaded but no data showing → Use Fix Report
- Upload failed → Check file format and try uploading again

---

## 5. Understanding the Dashboard

### 5.1 KPI Cards (Key Performance Indicators)

When a complete report is selected, three KPI cards display at the top:

#### % SDV Complete (Primary Metric)
- **Display**: Large percentage number with color coding
- **Color Coding**:
  - 🟢 Green: ≥80% complete (good progress)
  - 🟡 Yellow: 50-79% complete (moderate progress)
  - 🔴 Red: <50% complete (needs attention)
- **Calculation**: (Verified Items ÷ Data Expected) × 100
- **Sub-text**: Shows "X of Y items verified"

#### Total Items
- **Display**: Total count of all data items
- **Scope**: Across all sites and subjects in the report
- **Sub-text**: Shows number of sites and subjects

#### Verified Items
- **Display**: Count of items with SDV completion
- **Color**: Green text to indicate positive metric
- **Sub-text**: "Items with SDV completed"

### 5.2 KPI Calculations Explained

Understanding how metrics are calculated helps you interpret the dashboard:

- **Data Expected**: Count of items where `EditReason = 'Initial Data Entry'`
  - This is the baseline - items that require SDV verification
  - Only initial entries count toward the denominator
  
- **Verified Items**: Count of items that have an SDV date
  - Items are matched between Site Data and SDV Data files
  - Matching is based on SiteName, SubjectId, EventName, FormName, and ItemName/ItemExportLabel
  
- **SDV Percent**: (Verified Items ÷ Data Expected) × 100
  - Rounded to nearest integer
  - Only items marked as "Initial Data Entry" count toward the denominator
  - This ensures accurate completion percentages

- **Total Sites**: Unique count of site names in the data
- **Total Subjects**: Unique count of subject IDs in the data

---

## 6. Filtering and Navigation

### 6.1 Available Filters

The filter bar provides five filter types:

#### Site Filter
- **Options**: All sites or specific site name
- **Effect**: Filters all data to show only selected site
- **Cascading**: Selecting a site updates available subjects

#### Subject Filter
- **Options**: All subjects or specific subject ID
- **Effect**: Filters data to selected subject(s)
- **Cascading**: 
  - Updates based on site selection (if site is selected)
  - Updates available events when subject is selected

#### Event Filter
- **Options**: All events or specific event name
- **Effect**: Filters data to selected event(s)
- **Cascading**: Updates available forms when event is selected

#### Form Filter
- **Options**: All forms or specific form name
- **Effect**: Filters data to selected form(s)
- **Cascading**: Updates based on event selection

#### Data Source Filter
- **Options**: 
  - "All Sources": Shows all items regardless of source
  - "Site Data Only": Items only present in Site Data Entry file
  - "Both Files": Items present in both Site Data and SDV Data files
- **Effect**: Filters to show items from specific source type
- **Use Case**: Identify items missing from SDV file or sync issues

### 6.2 Cascading Filters

Filters are "cascading" - selecting a parent filter updates child filter options:

- **Site → Subject**: Selecting a site shows only subjects from that site
- **Subject → Event**: Selecting a subject shows only events for that subject
- **Event → Form**: Selecting an event shows only forms for that event

**Behavior**:
- When you select a parent filter, child filters are automatically cleared
- Child filter dropdowns update to show only relevant options
- This prevents invalid filter combinations

### 6.3 Active Filters Display

Active filters appear as badges below the filter bar:

- **Display Format**: "Filter Name: Value" with an X button
- **Remove Individual Filter**: Click the X on any badge
- **Cascading Removal**: Removing a parent filter also removes dependent filters
- **Clear All**: Click the "Clear" button in the filter bar

**Example Badges**:
- `Site: Site A`
- `Subject: 001-001`
- `Source: Site Data Only`

### 6.4 Refresh Data

The refresh button manually updates the data:

- **Location**: Right side of filter bar
- **Icon**: Circular arrow (spins while refreshing)
- **When to Use**: 
  - After data updates in the database
  - If metrics seem outdated
  - After fixing a stuck report
- **Auto-Refresh**: Data automatically refreshes when filters change

---

## 7. Hierarchical Data Table

### 7.1 Five-Level Hierarchy

The main data table uses a hierarchical structure allowing you to drill down from high-level summaries to detailed item information:

#### Level 1: Site
- **Icon**: 🏢 Building icon
- **Shows**: Aggregate metrics for each clinical site
- **Metrics**: Total items, verified items, SDV %, estimates
- **Action**: Click chevron to expand and see subjects

#### Level 2: Subject
- **Icon**: 👤 User icon
- **Shows**: Metrics for each subject within a site
- **Metrics**: Site-level metrics filtered to specific subject
- **Action**: Click chevron to expand and see events

#### Level 3: Event
- **Icon**: 📅 Calendar icon
- **Shows**: Metrics for each clinical event/visit
- **Metrics**: Subject-level metrics filtered to specific event
- **Action**: Click chevron to expand and see forms

#### Level 4: Form
- **Icon**: 📄 FileText icon
- **Shows**: Metrics for each data collection form
- **Metrics**: Event-level metrics filtered to specific form
- **Action**: Click chevron to expand and see items

#### Level 5: Item
- **Icon**: ✅ FileCheck icon
- **Shows**: Individual data items with detailed information
- **Details**: Verification status, edit info, SDV info, data source

### 7.2 Column Explanations

Each row in the table displays these columns:

#### Name
- **Site Level**: Site name
- **Subject Level**: Subject ID
- **Event Level**: Event name
- **Form Level**: Form name
- **Item Level**: Item display name/label

#### Data Expected
- **Definition**: Count of items marked as "Initial Data Entry"
- **Purpose**: Baseline count of items requiring SDV
- **Calculation**: Items where `EditReason = 'Initial Data Entry'`

#### Verified
- **Definition**: Count of items with SDV completion
- **Purpose**: Shows how many items have been verified
- **Calculation**: Items with matching SDV date in SDV Data file

#### Needs Review
- **Definition**: Items requiring SDV attention
- **Calculation**: Data Expected - Verified
- **Purpose**: Identifies remaining work

#### SDV %
- **Definition**: Percentage of items verified
- **Calculation**: (Verified ÷ Data Expected) × 100
- **Color Coding**: Green (≥80%), Yellow (50-79%), Red (<50%)
- **Rounded**: To nearest integer

#### Est. Hours
- **Definition**: Estimated hours needed to complete remaining SDV
- **Calculation**: Needs Review ÷ 60 (assuming 1 minute per item)
- **Purpose**: Resource planning

#### Est. Days
- **Definition**: Estimated workdays needed
- **Calculation**: Est. Hours ÷ 8 (assuming 8-hour workdays)
- **Purpose**: Timeline planning

#### Data Source
- **Definition**: Breakdown of item sources
- **Values**: 
  - "Both": Items in both files
  - "Site Only": Items only in Site Data file
- **Display**: Shows count for each type

### 7.3 Navigation

#### Expanding Rows
- **Method**: Click the chevron icon (▶ or ▼) on the left
- **Loading**: Spinner appears while fetching child data
- **State**: Chevron rotates to indicate expanded state

#### Collapsing Rows
- **Method**: Click the chevron again to collapse
- **Effect**: Child rows are hidden but data remains cached

#### Loading Indicators
- **Icon**: Spinning loader appears while fetching data
- **Location**: Replaces chevron during load
- **Duration**: Depends on data size and network speed

#### Performance Tips
- Collapse unused sections to improve performance
- Use filters to reduce data scope before expanding
- Large datasets may take time to load - be patient

### 7.4 Item-Level Details

When you expand to the item level, you see detailed information for each data item:

#### Item Information
- **Item Display**: Human-readable item name/label
- **Item Export Label**: Machine-readable identifier
- **Item Name**: Alternative identifier (from SDV file)

#### Verification Status
- **Is Verified**: Boolean indicating if SDV is complete
- **Is Initial Entry**: Boolean indicating if this is initial data entry

#### Edit Information (from Site Data)
- **Edit Date/Time**: When the edit was made
- **Edit By**: User who made the edit
- **Edit Reason**: Reason for edit (e.g., "Initial Data Entry")

#### SDV Information (from SDV Data)
- **SDV Date**: Date when verification was completed
- **SDV By**: User who performed the verification

#### Data Source
- **Site Data Only**: Item only exists in Site Data file
- **Both Files**: Item exists in both files (can be verified)

---

## 8. Data Source Types

### 8.1 "Both Files" Items

Items categorized as "Both Files" are present in both the Site Data Entry and SDV Data files.

**Characteristics**:
- Can show verification status (verified/unverified)
- Full tracking capability with edit and SDV information
- These are the primary items used for SDV percentage calculations
- Ideal for tracking verification progress

**Use Cases**:
- Filter by "Both Files" to see items in the verification pipeline
- Focus on these items for accurate completion tracking
- Identify verification patterns and trends

### 8.2 "Site Data Only" Items

Items categorized as "Site Data Only" exist only in the Site Data Entry file and are not yet present in the SDV Data file.

**Characteristics**:
- Not yet uploaded to SDV system
- Cannot show verification status
- May indicate data sync issues
- Not included in SDV percentage calculations

**Use Cases**:
- Filter by "Site Data Only" to find missing data
- Identify items that need to be added to SDV system
- Troubleshoot data synchronization issues
- Plan for future SDV uploads

### 8.3 Why This Matters

Understanding data source types helps you:

- **Identify Sync Issues**: Find items missing from SDV file
- **Plan Work**: Know which items are ready for verification
- **Troubleshoot**: Understand why certain items don't show verification status
- **Improve Processes**: Identify gaps in data collection workflows

**Best Practice**: Regularly check "Site Data Only" items to ensure data is being properly synchronized between systems.

---

## 9. Time Estimates

### 9.1 Calculation Methodology

The SDV Tracker provides time estimates to help with resource planning:

**Assumptions**:
- **1 minute per item**: Average time to verify one data item
- **8 hours per workday**: Standard workday length

**Formulas**:
- **Needs Review** = Data Expected - Verified
- **Est. Hours** = Needs Review ÷ 60
- **Est. Days** = Est. Hours ÷ 8

**Example**:
- Data Expected: 1,200 items
- Verified: 800 items
- Needs Review: 400 items
- Est. Hours: 400 ÷ 60 = 6.67 hours
- Est. Days: 6.67 ÷ 8 = 0.83 days (approximately 1 day)

### 9.2 Using Estimates

Time estimates are displayed at every hierarchy level:

- **Site Level**: Total estimate for all subjects at that site
- **Subject Level**: Estimate for all events for that subject
- **Event Level**: Estimate for all forms in that event
- **Form Level**: Estimate for all items in that form

**Planning Applications**:
- **Resource Allocation**: Determine how many staff members needed
- **Timeline Setting**: Set realistic completion deadlines
- **Progress Tracking**: Compare estimates to actual completion times
- **Budget Planning**: Estimate costs based on hourly rates

**Important Notes**:
- Estimates are approximations based on standard assumptions
- Actual times may vary based on data complexity
- Use estimates as guidelines, not exact predictions
- Adjust assumptions based on your organization's experience

---

## 10. Best Practices

### 10.1 Data Upload

**Before Uploading**:
- Verify CSV file format and column headers
- Check file size (must be under 50MB)
- Ensure data completeness and accuracy
- Use descriptive file names

**During Upload**:
- Don't close browser during upload
- Monitor progress bar for completion
- Wait for confirmation before uploading second file
- Note any error messages

**After Upload**:
- Verify report status changed to "complete"
- Check KPI cards show expected values
- Review data table for accuracy
- Use "Fix Report" if issues occur

### 10.2 Report Organization

**Naming Conventions**:
- Use descriptive names: "Q1 2026 SDV Report"
- Include date ranges: "Jan-Mar 2026 SDV"
- Add study identifiers: "Study ABC - Site SDV Report"
- Avoid generic names: "Report 1", "Test Report"

**Report Management**:
- Create separate reports for different time periods
- Archive completed reports (don't delete unless necessary)
- Use descriptions to clarify report purpose
- Delete draft reports that are no longer needed

**Version Control**:
- Create new reports for updated data (reports are immutable)
- Keep historical reports for comparison
- Document report purposes in descriptions

### 10.3 Using Filters

**Start Broad, Then Narrow**:
1. Begin with site-level view for overall picture
2. Identify sites below target percentage
3. Filter to problem sites
4. Drill down to specific subjects/events

**Filter Strategies**:
- Use "Site Data Only" filter to find missing data
- Filter by low SDV % sites to focus efforts
- Use subject filter to track individual progress
- Combine filters for precise analysis

**Filter Management**:
- Clear filters regularly to see full picture
- Use active filter badges to track current view
- Remember filters persist until cleared
- Refresh data after changing filters

### 10.4 Monitoring Progress

**Regular Reviews**:
- Check % SDV Complete KPI weekly
- Review site-level summaries monthly
- Drill down to item level for detailed investigation
- Compare current metrics to previous periods

**Focus Areas**:
- Sites/subjects below target percentages (e.g., <80%)
- High "Needs Review" counts
- Items with "Site Data Only" status
- Sites with large time estimates

**Documentation**:
- Export or screenshot key metrics
- Document findings and action items
- Track progress over time
- Share reports with stakeholders

---

## 11. Common Workflows

### 11.1 Creating Your First Report

**Step-by-Step Process**:

1. **Navigate to SDV Tracker**
   - Log in to your account
   - Click on "Source Data Verification Report" in navigation

2. **Create New Report**
   - Click report selector dropdown
   - Click "Create New Report"
   - Enter name: "Q1 2026 SDV Report"
   - Add description: "First quarter SDV tracking for Study ABC"
   - Click Create

3. **Upload Site Data Entry File**
   - Report appears in draft status
   - Upload area shows "Upload Site Data Entry"
   - Drag and drop CSV file or click to browse
   - Wait for upload to complete (progress bar shows status)

4. **Upload SDV Data File**
   - Upload area updates to show "Upload SDV Data"
   - Drag and drop SDV CSV file
   - Wait for upload to complete
   - Report automatically changes to "complete" status

5. **Review Dashboard**
   - KPI cards appear showing overall metrics
   - Hierarchical table shows site-level data
   - Verify data looks correct
   - Begin analysis

**Expected Time**: 5-10 minutes (depending on file sizes)

### 11.2 Weekly Progress Review

**Weekly Workflow**:

1. **Open Active Report**
   - Select current reporting period report
   - Review KPI cards for overall status
   - Note % SDV Complete percentage

2. **Site-Level Analysis**
   - Review site summary rows in table
   - Identify sites below target (e.g., <80%)
   - Note sites with high "Needs Review" counts

3. **Drill Down to Problem Sites**
   - Expand sites below target
   - Review subject-level metrics
   - Identify subjects needing attention

4. **Filter and Focus**
   - Apply site filter to problem sites
   - Review detailed metrics
   - Use "Site Data Only" filter to find missing data

5. **Document Findings**
   - Screenshot key metrics
   - Note sites/subjects requiring follow-up
   - Create action items
   - Share with data management team

**Frequency**: Weekly or bi-weekly

### 11.3 Investigating Discrepancies

**Investigation Workflow**:

1. **Identify Issue**
   - Notice unexpected SDV percentage
   - See discrepancy in item counts
   - Receive report of missing data

2. **Apply "Site Data Only" Filter**
   - Filter by "Site Data Only" data source
   - Identify items missing from SDV file
   - Count how many items are affected

3. **Drill Down to Item Level**
   - Expand hierarchy to item level
   - Review individual item details
   - Check edit dates and editors

4. **Review Edit Information**
   - Check EditDateTime for timing
   - Review EditBy for data entry patterns
   - Note EditReason values

5. **Coordinate Resolution**
   - Document findings
   - Contact data management team
   - Request SDV file updates if needed
   - Follow up to verify resolution

**Use Case**: When SDV percentage seems incorrect or items are missing

### 11.4 Monthly Reporting

**Monthly Summary Workflow**:

1. **Generate Report**
   - Create new report for the month
   - Upload both data files
   - Verify report is complete

2. **Overall Metrics**
   - Review KPI cards
   - Note overall SDV percentage
   - Compare to previous month

3. **Site Comparison**
   - Review all sites in table
   - Identify top and bottom performers
   - Note trends and changes

4. **Time Estimates**
   - Review estimated hours/days
   - Plan resource allocation
   - Set goals for next month

5. **Export and Share**
   - Screenshot dashboard
   - Document key findings
   - Share with stakeholders
   - Archive report

**Frequency**: Monthly

---

## 12. Troubleshooting

### 12.1 Upload Issues

#### Error: Invalid Column Headers

**Symptoms**: Upload fails with column validation error

**Solutions**:
- Check CSV file has correct column names (case-sensitive)
- Verify first row contains human-readable headers
- Ensure second row contains machine-readable column names
- Review required columns list in section 4.1
- Try re-exporting CSV from source system

#### Upload Stuck in Processing

**Symptoms**: Upload shows "processing" status but never completes

**Solutions**:
1. Wait a few minutes (large files take time)
2. Check browser console for errors
3. Refresh the page
4. Use "Fix Report" button
5. Try uploading file again
6. Contact support if issue persists

#### File Too Large

**Symptoms**: Upload fails with size limit error

**Solutions**:
- Split CSV file into smaller chunks
- Create separate reports for different time periods
- Contact support to discuss file size limits
- Consider data archiving strategies

#### Upload Progress Stops

**Symptoms**: Progress bar stops moving during upload

**Solutions**:
- Check internet connection
- Don't close browser tab
- Wait for timeout (may take several minutes)
- Refresh page and check upload status
- Try uploading again if needed

### 12.2 Report Issues

#### Report Stuck in Draft Status

**Symptoms**: Both files uploaded but report still shows "draft"

**Solutions**:
1. Click "Fix Report" button (wrench icon)
2. Wait for fix process to complete
3. Check fix message for details
4. Verify both uploads show "completed" status
5. Refresh page
6. Contact support if issue persists

#### No Data Showing

**Symptoms**: Report is complete but table is empty

**Solutions**:
- Check filters aren't hiding all data
- Clear all filters
- Verify both files uploaded successfully
- Check upload record counts
- Use "Fix Report" button
- Refresh materialized view
- Contact support

#### Incorrect Metrics

**Symptoms**: SDV percentage or counts seem wrong

**Solutions**:
- Verify "Data Expected" count (only initial entries count)
- Check for data quality issues in CSV files
- Review filter settings
- Refresh data manually
- Compare to source data files
- Contact support with specific examples

### 12.3 Performance Issues

#### Slow Loading

**Symptoms**: Page takes long time to load or expand rows

**Solutions**:
- Use filters to reduce data scope
- Collapse unused hierarchy levels
- Check internet connection speed
- Wait for initial load to complete
- Refresh page if stuck
- Contact support if consistently slow

#### Browser Freezing

**Symptoms**: Browser becomes unresponsive

**Solutions**:
- Close other browser tabs
- Use filters before expanding large sections
- Refresh page
- Try different browser
- Clear browser cache
- Contact support

#### Timeout Errors

**Symptoms**: Error messages about timeouts

**Solutions**:
- Reduce data scope with filters
- Try again (may be temporary)
- Contact support to investigate
- Consider splitting reports

### 12.4 Data Quality Issues

#### Missing Items

**Symptoms**: Expected items don't appear in table

**Solutions**:
- Check filters aren't hiding items
- Verify items exist in uploaded CSV files
- Check for matching issues (column names, values)
- Review "Site Data Only" filter
- Contact support with specific examples

#### Duplicate Items

**Symptoms**: Same item appears multiple times

**Solutions**:
- Check source CSV files for duplicates
- Verify data quality in source system
- Contact data management team
- Report issue to support

#### Incorrect Matching

**Symptoms**: Items not matching between files correctly

**Solutions**:
- Verify column names match exactly
- Check SiteName, SubjectId, EventName, FormName values match
- Review ItemName vs ItemExportLabel matching
- Contact support with examples

---

## 13. Technical Notes

### 13.1 Data Processing

**CSV Parsing**:
- Uses PapaParse library for CSV parsing
- First row (human-readable headers) is skipped
- Second row (machine-readable headers) is used for mapping
- Data is processed in batches of 1,000 records

**Upload Process**:
- Files are uploaded to secure storage
- Data is inserted into database tables
- Materialized views are refreshed for performance
- Progress is tracked in real-time

**Matching Logic**:
- Items matched on: SiteName, SubjectId, EventName, FormName
- ItemExportLabel (Site Data) matched to ItemName (SDV Data)
- Case-sensitive matching
- Exact value matching required

### 13.2 Calculations

**SDV Percentage**:
- Formula: (Verified Items ÷ Data Expected) × 100
- Data Expected: Items where EditReason = 'Initial Data Entry'
- Verified Items: Items with matching SDV date
- Rounded to nearest integer

**Time Estimates**:
- Needs Review = Data Expected - Verified
- Est. Hours = Needs Review ÷ 60 (1 min per item)
- Est. Days = Est. Hours ÷ 8 (8-hour workday)

**Aggregations**:
- Calculated at database level for performance
- Uses materialized views for speed
- Refreshed automatically after uploads
- Can be manually refreshed

### 13.3 Performance Optimizations

**Materialized Views**:
- Pre-calculated views for fast queries
- Refreshed after data uploads
- Can be manually refreshed
- Significantly improves query performance

**Cascading Filters**:
- Filters optimize queries by reducing data scope
- Child filters only show relevant options
- Reduces database load
- Improves user experience

**Lazy Loading**:
- Child data loaded only when expanded
- Reduces initial page load time
- Improves performance for large datasets
- Data cached after first load

### 13.4 Data Privacy and Security

**Company Scoping**:
- Data is scoped to company_id
- Users only see their company's data
- Cross-company data access prevented

**Authentication**:
- User authentication required
- Session-based access control
- Profile-based permissions

**File Storage**:
- Files stored securely
- Access controlled by company_id
- Files linked to specific reports

---

## 14. Frequently Asked Questions

### Q: Why do I need to upload two files?

**A**: SDV tracking requires both the original data entry records (Site Data Entry) and the verification records (SDV Data) to calculate completion percentages. The system matches items between files to determine which items have been verified.

### Q: What happens if files don't match perfectly?

**A**: The system handles mismatches by categorizing items as "Site Data Only" (only in Site Data file) or "Both Files" (in both files). This allows you to identify synchronization issues and track items that haven't been uploaded to the SDV system yet.

### Q: Can I update a report after it's complete?

**A**: Reports are immutable after completion to maintain data integrity. To update data, create a new report with the updated files. This preserves historical data for comparison.

### Q: How are "Initial Data Entry" items identified?

**A**: Items where `EditReason = 'Initial Data Entry'` are counted as the baseline for SDV calculations. Only these items count toward the "Data Expected" denominator, ensuring accurate completion percentages.

### Q: Why is my SDV percentage different from expected?

**A**: Check the "Data Expected" count - only items marked as "Initial Data Entry" count toward the denominator. Items with other edit reasons (corrections, updates, etc.) are not included in the calculation.

### Q: Can I export data from the SDV Tracker?

**A**: Currently, the SDV Tracker is a viewing and analysis tool. For data export, use screenshots or contact support for export capabilities.

### Q: How often should I refresh the data?

**A**: Data automatically refreshes when filters change. Use the manual refresh button if you've updated data in the database or if metrics seem outdated.

### Q: What if I upload the wrong file?

**A**: If you upload the wrong file, you can delete the report and create a new one, or contact support for assistance. Files cannot be replaced individually - you'll need to create a new report.

### Q: How do I know if my upload was successful?

**A**: Successful uploads show "completed" status and the report changes from "draft" to "complete" status. You'll see KPI cards and data table appear. Check the upload progress bar and status messages.

### Q: Can multiple users work on the same report?

**A**: Yes, multiple users from the same company can view the same reports. However, only one user can upload files at a time. Reports are shared across the company.

### Q: What's the difference between "Site Data Only" and "Both Files"?

**A**: "Site Data Only" items exist only in the Site Data Entry file and haven't been uploaded to the SDV system yet. "Both Files" items exist in both files and can show verification status.

### Q: How accurate are the time estimates?

**A**: Time estimates are approximations based on standard assumptions (1 minute per item, 8-hour workdays). Actual times may vary based on data complexity, staff experience, and other factors. Use estimates as guidelines.

### Q: Why does the report say "Beta"?

**A**: The SDV Tracker is currently in Beta status, meaning it's actively being developed and improved. Features may change, and feedback is welcome.

---

## 15. Glossary

**SDV (Source Data Verification)**: The process of verifying clinical trial data accuracy by comparing source documents to entered data.

**Data Expected**: Count of items requiring SDV verification, specifically items marked as "Initial Data Entry" in the Site Data Entry file.

**Verified Items**: Items that have been verified through SDV, indicated by the presence of an SDV date in the SDV Data file.

**Needs Review**: Count of items that require SDV attention, calculated as Data Expected minus Verified Items.

**SDV Percent**: Percentage of items verified, calculated as (Verified Items ÷ Data Expected) × 100.

**Site Data Entry**: Original data entry records from clinical sites, containing edit information and reasons.

**SDV Data**: Verification records showing which items have been verified, including SDV date and verifier information.

**Cascading Filters**: Filter system where selecting a parent filter (e.g., Site) automatically updates available options for child filters (e.g., Subject).

**Hierarchical Drill-Down**: Navigation method allowing expansion from aggregate levels (Site) to detailed levels (Item).

**Materialized View**: Pre-calculated database view that stores query results for improved performance.

**Draft Status**: Report status indicating one or both data files are missing; report cannot display metrics.

**Complete Status**: Report status indicating both data files have been uploaded and processed; full dashboard available.

**Data Source**: Categorization of items as "Site Data Only" (only in Site Data file) or "Both Files" (in both files).

**Item Export Label**: Machine-readable identifier for data items in the Site Data Entry file.

**Item Name**: Identifier for data items in the SDV Data file, matched to Item Export Label.

**Initial Data Entry**: Edit reason indicating the first entry of data for an item; used as baseline for SDV calculations.

**Batch Upload**: Process of uploading data in chunks (typically 1,000 records) rather than all at once.

**Fix Report**: Function that attempts to resolve stuck reports by finding orphaned uploads and refreshing data.

**KPI (Key Performance Indicator)**: Metrics displayed on dashboard cards showing overall SDV progress and statistics.

**Refresh**: Manual or automatic update of data calculations and materialized views.

---

## Support and Feedback

### Getting Help

If you encounter issues or have questions:

1. **Check This Manual**: Review relevant sections for guidance
2. **Troubleshooting Section**: See section 12 for common issues
3. **Contact Support**: Reach out to your system administrator or support team
4. **Report Bugs**: Document issues with screenshots and details

### Providing Feedback

The SDV Tracker is in Beta - your feedback helps improve the tool:

- **Feature Requests**: Suggest new features or improvements
- **Bug Reports**: Report issues with detailed descriptions
- **Usability Feedback**: Share your experience and suggestions
- **Documentation Feedback**: Help improve this manual

### Version Information

- **Current Version**: Beta
- **Last Updated**: February 2026
- **Status**: Active Development

---

**End of User Manual**
